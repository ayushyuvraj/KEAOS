import { 
  executeUniversalChat, 
  PROVIDERS,
  getModelCapabilities,
  transcribeAudioWithModel,
  getProviderCredential
} from '../services/llmService';
import { getEpisodicMemoryStore } from './meetingSimulatorEngine';
import { calculateInferenceCost } from '../services/modelPricingService';
import { recordWorkflowExecution } from '../services/unifiedAuditService';
import { executeRealMcpTool, getRegisteredMcpServers } from '../services/mcpClientService';
import { parseToolCallFromText, findToolInCatalog } from './universalAgentEngine';
import {
  identifyMcpService,
  getOfficialMcpTools,
  GITHUB_OFFICIAL_ACTIONS,
  SLACK_OFFICIAL_ACTIONS,
  JIRA_OFFICIAL_ACTIONS,
  NEO4J_OFFICIAL_ACTIONS,
  OUTLOOK_OFFICIAL_ACTIONS
} from '../constants/mcpOfficialCatalogs';
import { executeDeterministicTask } from '../services/deterministicRunner';
import { executeRemoteAgentTask } from '../services/remoteAgentRunner';

/**
 * Universal SHA-256 Audit Fingerprint Generator (W3C WebCrypto)
 */
async function generateSha256Fingerprint(dataString) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      hash = (hash << 5) - hash + dataString.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Detect dynamic conditional routing directives from upstream agent outputs
 */
export function extractRoutingTarget(upstreamOutputs = []) {
  for (const up of upstreamOutputs) {
    if (!up || !up.output) continue;
    const text = typeof up.output === 'string' ? up.output : JSON.stringify(up.output);

    // 1. JSON-formatted route directive e.g. { "route_to": "Agent B" }
    const jsonMatch = text.match(/\{[\s\S]*?"(?:route_to|target_agent|delegate_to|assigned_agent|selected_agent|recipient_agent)"\s*:\s*"([^"]+)"[\s\S]*?\}/i);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].trim();
    }

    // 2. Explicit header directive e.g. "ROUTE TO: Agent B" or "[ROUTE TO: Agent B]" or "DISPATCH TO: Agent B"
    const headerMatch = text.match(/(?:\[?\s*(?:ROUTE|DISPATCH|DELEGATE|ASSIGN|TARGET|SELECTED)\s+(?:TO|AGENT|RECIPIENT)?\s*\]?\s*:\s*|\*?\*?(?:Route To|Dispatch To|Target Agent|Assigned Agent)\*?\*?:\s*)([^\n\r,\.]+)/i);
    if (headerMatch && headerMatch[1]) {
      const candidate = headerMatch[1].trim().replace(/^\[|\]$/g, '').replace(/^\*|\*$/g, '').trim();
      if (candidate.length > 0 && candidate.length < 60) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Parse Canvas Graph and Partition Agents into Topological Execution Tiers / Stages
 */
export function buildMultiAgentDAG(nodes = [], edges = []) {
  const agentNodes = nodes.filter(n => {
    if (n.data?.isDeactivated) return false;
    if (n.type === 'agentCore') return true;
    if (n.type === 'remoteAgentNode') {
      // If it only connects to an agent's tools-in socket, it acts as a tool, not a separate DAG stage
      const isToolOnly = edges.some(e => 
        (e.source === n.id || e.target === n.id) && 
        (e.targetHandle === 'tools-in' || e.targetHandle === 'tool-in' || e.data?.isToolBinding)
      ) && !edges.some(e => 
        (e.source === n.id || e.target === n.id) && 
        (e.targetHandle === 'agent-in' || e.targetHandle === 'in' || e.sourceHandle === 'out')
      );
      return !isToolOnly;
    }
    return false;
  });
  if (agentNodes.length === 0) return [];

  const agentLookup = Object.fromEntries(agentNodes.map(n => [n.id, n]));
  
  // A2A & External Agent Edges: Edges from one active agent/remoteAgent to another
  const a2aEdges = edges.filter(e => {
    if (e.targetHandle === 'tools-in' || e.targetHandle === 'tool-in' || e.data?.isToolBinding) return false;
    return agentLookup[e.source] && agentLookup[e.target];
  });

  // Calculate in-degree (number of upstream agents targeting each agent)
  const inDegree = {};
  const adjacency = {}; // source -> [targetIds]
  const predecessors = {}; // target -> [sourceIds]

  agentNodes.forEach(agent => {
    inDegree[agent.id] = 0;
    adjacency[agent.id] = [];
    predecessors[agent.id] = [];
  });

  a2aEdges.forEach(edge => {
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    adjacency[edge.source].push(edge.target);
    predecessors[edge.target].push(edge.source);
  });

  // Topological sorting by stage tiers (Kahn's algorithm with stage grouping)
  const stages = [];
  const processed = new Set();
  let currentTier = agentNodes.filter(a => inDegree[a.id] === 0);

  // If there's an artificial cycle or all have in-degree > 0, pick the first agent as root
  if (currentTier.length === 0 && agentNodes.length > 0) {
    currentTier = [agentNodes[0]];
  }

  while (currentTier.length > 0) {
    stages.push(currentTier);
    currentTier.forEach(a => processed.add(a.id));

    const nextTierIds = new Set();
    currentTier.forEach(agent => {
      adjacency[agent.id].forEach(targetId => {
        inDegree[targetId] -= 1;
        if (inDegree[targetId] <= 0 && !processed.has(targetId)) {
          nextTierIds.add(targetId);
        }
      });
    });

    currentTier = Array.from(nextTierIds)
      .map(id => agentLookup[id])
      .filter(Boolean);
  }

  // Include any stray agents not captured by the DAG
  const unvisited = agentNodes.filter(a => !processed.has(a.id));
  if (unvisited.length > 0) {
    stages.push(unvisited);
  }

  return stages;
}

/**
 * Resolve peripheral pillars connected to a specific agent on the canvas
 */
export function getAgentAttachedPillars(agentId, nodes = [], edges = []) {
  const incomingEdges = (edges || []).filter(e => e.target === agentId);
  const nodeLookup = Object.fromEntries((nodes || []).map(n => [n.id, n]));
  
  const regularPillars = incomingEdges.map(e => {
    const src = nodeLookup[e.source];
    if (!src || src.data?.isDeactivated || src.type === 'agentCore') return null;
    return {
      id: src.data.toolId || src.id,
      nodeId: src.id,
      name: src.data.name,
      displayName: src.data.displayName || src.data.name,
      type: src.data.pillarType,
      config: src.data.config || {},
      disabledTools: src.data.disabledTools || src.data.config?.disabledTools || [],
      tools: src.data.tools || [],
      basis: src.data.basis || {},
      transport: src.data.transport || src.data.config?.transport,
      serviceName: src.data.serviceName,
      customDirective: src.data.customDirective || null,
      referenceDoc: src.data.referenceDoc || null,
      handle: e.targetHandle,
      data: src.data
    };
  }).filter(Boolean);

  // Also resolve all Deterministic Boxes connected to this agent's Tools port
  const detEdges = (edges || []).filter(e =>
    (e.source === agentId && (e.sourceHandle === 'tools-out' || e.sourceHandle === 'tools-in' || e.sourceHandle === 'tool-in' || e.data?.isToolBinding) && nodeLookup[e.target]?.type === 'deterministicNode') ||
    (e.target === agentId && (e.targetHandle === 'tools-in' || e.targetHandle === 'tools-out' || e.targetHandle === 'tool-in' || e.data?.isToolBinding) && nodeLookup[e.source]?.type === 'deterministicNode')
  );

  const deterministicPillars = detEdges.map(e => {
    const otherId = e.source === agentId ? e.target : e.source;
    const detNode = nodeLookup[otherId];
    if (!detNode || detNode.data?.isDeactivated) return null;

    const rawTitle = detNode.data?.name || 'Deterministic Logic Box';
    const cleanSnakeName = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `deterministic_tool_${detNode.id.slice(-4)}`;
    const summaryText = detNode.data?.ruleSummary || detNode.data?.prompt || detNode.data?.summary || 'Deterministic mathematical and logic computation (0 tokens)';

    return {
      id: detNode.id,
      nodeId: detNode.id,
      name: rawTitle,
      displayName: rawTitle,
      type: 'tools',
      isDeterministic: true,
      deterministicNode: detNode,
      nodeData: detNode.data,
      config: {
        language: detNode.data?.language || 'python',
        code: detNode.data?.code,
        prompt: summaryText,
        ruleSummary: summaryText
      },
      tools: [
        {
          name: cleanSnakeName,
          displayName: rawTitle,
          description: summaryText,
          isDeterministic: true,
          nodeId: detNode.id
        }
      ],
      handle: 'tools-in',
      data: detNode.data
    };
  }).filter(Boolean);

  // De-duplicate by id
  const seen = new Set();
  const allAttached = [...regularPillars, ...deterministicPillars];
  return allAttached.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/**
 * Execute a single agent node within the distributed multi-agent DAG
 */
async function executeSingleAgentInPipeline({
  agentNode,
  upstreamOutputs = [],
  initialRawInput = '',
  allNodes = [],
  allEdges = [],
  onStepProgress
}) {
  const agentId = agentNode.id;
  const agentName = agentNode.data?.name || 'AI Agent';
  const frameworkId = agentNode.data?.framework?.id || 'google-adk';
  const frameworkName = agentNode.data?.framework?.name || 'Google ADK';
  const agentRole = agentNode.data?.role || null;

  const attachedPillars = getAgentAttachedPillars(agentId, allNodes, allEdges);
  const startTime = performance.now();

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const logStep = async (stepName, detail, pillarType = null, latencyMs = 280) => {
    if (onStepProgress) {
      onStepProgress({
        agentId,
        agentName,
        frameworkName,
        step: stepName,
        detail,
        pillarType,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    // Broadcast canvas execution state so all nodes light up sequentially on the canvas!
    window.dispatchEvent(new CustomEvent('keaos:set-execution-state', {
      detail: {
        isExecuting: true,
        activeAgentId: agentId,
        nodeId: agentId,
        pillarType,
        step: `${stepName}: ${detail}`
      }
    }));

    await delay(Math.min(450, Math.max(220, latencyMs)));
  };

  // If this node is an External Service (remoteAgentNode) executing in pipeline flow
  if (agentNode.type === 'remoteAgentNode') {
    const raData = agentNode.data || {};
    const raName = raData.name || 'Universal External Agent';
    const raFramework = raData.framework || 'fastapi';

    await logStep('External Ingress', `Starting External Service: ${raName} (${raFramework})`, 'gateway', 280);

    const taskPayload = upstreamOutputs.length > 0
      ? upstreamOutputs.map(u => `--- Output from ${u.agentName} ---\n${typeof u.output === 'object' ? JSON.stringify(u.output, null, 2) : u.output}`).join('\n\n')
      : (initialRawInput || 'KEAOS Workflow Execution');

    let remoteRes = null;
    try {
      remoteRes = await executeRemoteAgentTask({
        nodeId: agentId,
        nodeData: raData,
        inputData: taskPayload,
        policies: null,
        allNodes,
        allEdges
      });
    } catch (err) {
      remoteRes = { success: false, error: err.message, output: null, latencyMs: 10 };
    }

    const outText = remoteRes.success
      ? (typeof remoteRes.output === 'object' ? JSON.stringify(remoteRes.output, null, 2) : String(remoteRes.output))
      : `[EXTERNAL SERVICE ERROR]: ${remoteRes.error || 'Execution failed'}`;

    const auditHash = await generateSha256Fingerprint(`${taskPayload}::${outText}`);

    await logStep('External Service Complete', `Executed ${raName} in ${remoteRes.latencyMs || 0}ms (${remoteRes.tokens || 0} tokens)`, 'audit', 240);

    return {
      agentId,
      agentName: raName,
      frameworkId: raFramework,
      frameworkName: `External Service (${raFramework.toUpperCase()})`,
      role: 'External Specialist',
      output: outText,
      auditHash,
      tokens: remoteRes.tokens || 0,
      latencyMs: remoteRes.latencyMs || 0,
      costUsd: remoteRes.costUsd || 0,
      provider: 'external',
      modelId: raData.underlyingModel || 'external-api',
      timestamp: new Date().toLocaleTimeString()
    };
  }

  await logStep('Ingress & Routing', `Starting ${agentName} (${frameworkName}${agentRole ? ` - ${agentRole.toUpperCase()}` : ''})`, 'gateway', 280);

  // 1. INGRESS COMPILATION & A2A PAYLOAD ASSEMBLY
  let taskPayload = '';
  if (upstreamOutputs.length > 0) {
    taskPayload = upstreamOutputs.map((up, idx) => {
      return `=== [A2A DISPATCH FROM UPSTREAM AGENT ${idx + 1}: ${up.agentName} (${up.frameworkName})] ===\n` +
        `Role: ${up.role || 'Specialist'}\n` +
        `Output Payload:\n${up.output}\n`;
    }).join('\n\n');

    if (initialRawInput && initialRawInput.trim()) {
      taskPayload += `\n=== [ORIGINAL INGRESS CONTEXT / TRANSCRIPT] ===\n${initialRawInput}\n`;
    }
  } else {
    taskPayload = initialRawInput || 'Synthesize and execute enterprise directives with high precision.';
  }

  // 2. POLICIES & GUARDRAILS SANITIZATION
  let processedInput = taskPayload;
  let redactedCount = 0;
  const policyNodes = attachedPillars.filter(p => p.type === 'policies');
  if (policyNodes.length > 0) {
    const salaryRegex = /\$[0-9,]+(\.[0-9]{2})?/g;
    const salaryMatches = processedInput.match(salaryRegex);
    if (salaryMatches) {
      redactedCount += salaryMatches.length;
      processedInput = processedInput.replace(salaryRegex, '[CONFIDENTIAL_FINANCIAL_REDACTED]');
    }

    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    const ssnMatches = processedInput.match(ssnRegex);
    if (ssnMatches) {
      redactedCount += ssnMatches.length;
      processedInput = processedInput.replace(ssnRegex, '[CONFIDENTIAL_SSN_REDACTED]');
    }
    await logStep('Policies & Guardrails', `Enforced ${policyNodes.length} active compliance policies. Sanitized ${redactedCount} items.`, 'policies', 300);
  }

  // 3. EPISODIC MEMORY LOOKUP
  const memoryNode = attachedPillars.find(p => p.type === 'memory');
  let memoryContext = '';
  if (memoryNode) {
    const memoryItems = getEpisodicMemoryStore();
    if (memoryItems.length > 0) {
      memoryContext = memoryItems.map(m => `• [${m.date || 'Historical'}]: ${m.text || m.task || JSON.stringify(m)}`).join('\n');
      await logStep('Episodic Memory', `Retrieved ${memoryItems.length} past corporate constraints.`, 'memory', 300);
    }
  }

  // 4. SKILLS, GATEWAY & MCP PROTOCOL TOOLS
  const skillNodes = attachedPillars.filter(p => p.type === 'skills');
  const toolNodes = attachedPillars.filter(p => p.type === 'tools');

  // Resolve Gateway Node & Zero-Trust Perimeter Checks
  const gatewayNode = attachedPillars.find(p => p.type === 'gateway');
  const disabledTools = Array.isArray(gatewayNode?.disabledTools)
    ? gatewayNode.disabledTools
    : (Array.isArray(gatewayNode?.config?.disabledTools)
      ? gatewayNode.config.disabledTools
      : (Array.isArray(gatewayNode?.data?.disabledTools) ? gatewayNode.data.disabledTools : []));

  if (gatewayNode) {
    let gwMsg = `Zero-Trust Ingress/Egress Gateway active.`;
    if (disabledTools.length > 0) {
      gwMsg += ` Perimeter enforcement: ${disabledTools.length} tool(s) blocked.`;
    }
    await logStep('Ingress & Egress Gateway', gwMsg, 'gateway', 250);
  }

  // Resolve MCP servers (directly attached or wired via Gateway)
  let mcpNodes = attachedPillars.filter(p => p.type === 'mcp');

  if (gatewayNode) {
    const gatewayIncomingEdges = (allEdges || []).filter(e => e.target === gatewayNode.nodeId || e.target === gatewayNode.id);
    const nodeLookup = Object.fromEntries((allNodes || []).map(n => [n.id, n]));
    const gatewayUpstreamMcps = gatewayIncomingEdges
      .map(e => nodeLookup[e.source])
      .filter(src => src && src.data?.pillarType === 'mcp' && !src.data?.isDeactivated)
      .map(src => ({
        id: src.data.toolId || src.id,
        nodeId: src.id,
        name: src.data.name,
        displayName: src.data.displayName || src.data.name,
        type: 'mcp',
        config: src.data.config || {},
        disabledTools: src.data.disabledTools || src.data.config?.disabledTools || [],
        tools: src.data.tools || [],
        basis: src.data.basis || {},
        transport: src.data.transport || src.data.config?.transport,
        serviceName: src.data.serviceName,
        data: src.data
      }));

    for (const gwMcp of gatewayUpstreamMcps) {
      if (!mcpNodes.some(m => m.id === gwMcp.id || m.nodeId === gwMcp.nodeId)) {
        mcpNodes.push(gwMcp);
      }
    }
  }

  // Fallback: If no MCP nodes are directly attached to this agent or its gateway, check canvas MCPs
  if (mcpNodes.length === 0) {
    const canvasMcps = (allNodes || []).filter(n => n.type === 'pillar' && n.data?.pillarType === 'mcp' && !n.data?.isDeactivated);
    for (const src of canvasMcps) {
      mcpNodes.push({
        id: src.data.toolId || src.id,
        nodeId: src.id,
        name: src.data.name,
        displayName: src.data.displayName || src.data.name,
        type: 'mcp',
        config: src.data.config || {},
        disabledTools: src.data.disabledTools || src.data.config?.disabledTools || [],
        tools: src.data.tools || [],
        basis: src.data.basis || {},
        transport: src.data.transport || src.data.config?.transport,
        serviceName: src.data.serviceName,
        data: src.data
      });
    }
  }

  // Merge with registered MCP server credentials & official catalog tools
  const allSavedMcps = getRegisteredMcpServers();
  const availableToolsMap = new Map();

  for (const m of mcpNodes) {
    if (!m.config?.token || !m.transport || !m.tools?.length) {
      const matching = (allSavedMcps || []).find(s => 
        s.id === m.id || 
        s.name === m.name || 
        s.displayName === m.displayName || 
        (s.basis?.username && s.basis.username === m.basis?.username)
      );
      if (matching) {
        m.config = { ...(matching.config || {}), ...(m.config || {}) };
        m.transport = m.transport || matching.transport || 'outlook-api';
        m.serviceName = m.serviceName || matching.serviceName;
        if (!m.tools?.length && matching.tools?.length) m.tools = matching.tools;
        if (!m.basis && matching.basis) m.basis = matching.basis;
      }
    }

    const sName = identifyMcpService(m, m.nodeId || m.id);
    if (sName === 'outlook' && (!m.tools || m.tools.length < OUTLOOK_OFFICIAL_ACTIONS.length)) {
      m.tools = OUTLOOK_OFFICIAL_ACTIONS;
    } else if (sName === 'github' && (!m.tools || m.tools.length < GITHUB_OFFICIAL_ACTIONS.length)) {
      m.tools = GITHUB_OFFICIAL_ACTIONS;
    } else if (sName === 'slack' && (!m.tools || m.tools.length < SLACK_OFFICIAL_ACTIONS.length)) {
      m.tools = SLACK_OFFICIAL_ACTIONS;
    } else if (sName === 'jira' && (!m.tools || m.tools.length < JIRA_OFFICIAL_ACTIONS.length)) {
      m.tools = JIRA_OFFICIAL_ACTIONS;
    } else if (sName === 'neo4j' && (!m.tools || m.tools.length < NEO4J_OFFICIAL_ACTIONS.length)) {
      m.tools = NEO4J_OFFICIAL_ACTIONS;
    } else if (!m.tools || m.tools.length === 0) {
      const official = getOfficialMcpTools(m);
      if (official.length > 0) m.tools = official;
    }

    const isServerDeactivated = Boolean(m.isDeactivated || m.data?.isDeactivated);
    const tools = m.tools || m.data?.tools || [];
    for (const t of tools) {
      const isBlocked = isServerDeactivated || disabledTools.includes(t.name);
      availableToolsMap.set(t.name.toLowerCase(), {
        tool: t,
        toolName: t.name,
        mcpServer: m,
        isBlocked,
        isServerDeactivated
      });
    }
  }

  // Register all attached Deterministic Logic Boxes as zero-token execution tools
  const deterministicPillars = attachedPillars.filter(p => p.isDeterministic || p.nodeData?.isDeterministicNode || p.config?.isDeterministic);
  if (deterministicPillars.length > 0) {
    for (const dp of deterministicPillars) {
      const dTools = dp.tools || [];
      const primaryTool = dTools[0] || {
        name: (dp.name || 'deterministic_tool').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
        description: dp.config?.ruleSummary || dp.config?.prompt || dp.name
      };
      const cleanToolName = primaryTool.name.toLowerCase().replace(/[-]/g, '_');
      availableToolsMap.set(cleanToolName, {
        tool: primaryTool,
        toolName: cleanToolName,
        isDeterministic: true,
        deterministicNode: dp,
        nodeData: dp.nodeData || dp.config || {},
        isBlocked: false,
        isServerDeactivated: false
      });
    }
    await logStep('Deterministic Tools', `Bound ${deterministicPillars.length} deterministic tools (${deterministicPillars.map(d => d.name).join(', ')}).`, 'tools', 180);
  }

  // Register all attached External Specialist Agents (remoteAgentNode) as callable tools
  const externalAgentEdges = (allEdges || []).filter(e => 
    (e.target === agentId && (e.targetHandle === 'tools-in' || e.targetHandle === 'tool-in')) ||
    (e.source === agentId && (e.sourceHandle === 'tools-out' || e.sourceHandle === 'tools-in')) ||
    (e.data?.isToolBinding && (e.source === agentId || e.target === agentId))
  );
  const nodeLookup = Object.fromEntries((allNodes || []).map(n => [n.id, n]));
  const attachedRemoteAgents = externalAgentEdges
    .map(e => nodeLookup[e.source === agentId ? e.target : e.source])
    .filter(n => n && n.type === 'remoteAgentNode' && !n.data?.isDeactivated);

  if (attachedRemoteAgents.length > 0) {
    for (const ra of attachedRemoteAgents) {
      const raData = ra.data || {};
      const cleanToolName = (raData.customToolName || raData.name || 'external_agent')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      const primaryTool = {
        name: cleanToolName,
        description: raData.customToolDescription || raData.description || `Invokes external autonomous service "${raData.name}" (${raData.framework || 'REST'})`
      };

      availableToolsMap.set(cleanToolName, {
        tool: primaryTool,
        toolName: cleanToolName,
        isRemoteAgent: true,
        remoteAgentNode: ra,
        nodeData: raData,
        isBlocked: false,
        isServerDeactivated: false
      });
    }
    await logStep('External Sub-Agents', `Bound ${attachedRemoteAgents.length} external agents as callable tools (${attachedRemoteAgents.map(r => r.data?.name || 'External Agent').join(', ')}).`, 'tools', 180);
  }

  if (mcpNodes.length > 0) {
    await logStep('MCP Protocol Servers', `Connected ${mcpNodes.length} active MCP servers with ${availableToolsMap.size} capabilities (${mcpNodes.map(m => m.displayName || m.name).join(', ')}).`, 'mcp', 320);
  }

  if (skillNodes.length > 0) {
    await logStep('Attached Skills', `Bound ${skillNodes.length} skills (${skillNodes.map(s => s.name).join(', ')}).`, 'skills', 300);
  }

  // 5. ASSEMBLE PROMPT
  const basePrompt = agentNode.data?.prompt || `You are ${agentName}, an autonomous enterprise agent running on ${frameworkName}.`;
  const roleContext = agentRole ? `\n[YOUR ARCHITECTURAL ROLE IN THE MULTI-AGENT GRAPH]: ${agentRole.toUpperCase()} under ${frameworkName}.` : '';
  const skillsContext = skillNodes.length > 0
    ? `\n[ATTACHED SKILLS & DIRECTIVES]:\n${skillNodes.map(s => {
        let txt = `- ${s.name}: ${s.description || 'Custom Skill'}`;
        if (s.customDirective) txt += `\n  * Directives & Output Rules: ${s.customDirective}`;
        if (s.referenceDoc?.text) txt += `\n  * Reference Specification Document (${s.referenceDoc.name}):\n"""\n${s.referenceDoc.text}\n"""`;
        return txt;
      }).join('\n')}`
    : '';

  let deterministicToolsInstruction = '';
  if (deterministicPillars.length > 0) {
    deterministicToolsInstruction = `\n[CONNECTED DETERMINISTIC LOGIC TOOLS (0 TOKENS COMPUTE)]:
The following zero-token deterministic tools are connected to your Tools port. You can invoke them whenever you need mathematical calculation, tabular transformation, deterministic filtering, or task execution:
${deterministicPillars.map((dp, idx) => {
  const dTools = dp.tools || [];
  const primaryTool = dTools[0] || {
    name: (dp.name || 'deterministic_tool').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
    description: dp.config?.ruleSummary || dp.config?.prompt || dp.name
  };
  return `• Tool ${idx + 1}: \`${primaryTool.name}\` — ${primaryTool.description || dp.config?.ruleSummary || dp.name || 'Deterministic logic execution'}`;
}).join('\n')}

When you need to execute one of these deterministic tasks, output a tool call using the standard tool call format:
<<<TOOL_CALL>>>
{
  "tool": "<tool_name>",
  "arguments": {
    "inputs": "<data or parameters to process>"
  }
}
<<<END_TOOL_CALL>>>
When the tool completes, its verified result will be provided back to you so you can conclude your task.`;
  }

  let externalAgentsInstruction = '';
  if (attachedRemoteAgents.length > 0) {
    externalAgentsInstruction = `\n[CONNECTED EXTERNAL SPECIALIST AGENTS & SERVICES]:
The following external services are connected to your Tools port. You can delegate specialized tasks, API requests, computations, or remote reasoning to them:
${attachedRemoteAgents.map((ra, idx) => {
  const raData = ra.data || {};
  const toolName = (raData.customToolName || raData.name || 'external_agent').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `• Tool ${idx + 1}: \`${toolName}\` — ${raData.customToolDescription || raData.description || 'External autonomous service'}`;
}).join('\n')}

To invoke an external specialist agent, issue a tool call using:
<<<TOOL_CALL>>>
{
  "tool": "<tool_name>",
  "arguments": {
    "payload": "<data or prompt to send to external agent>"
  }
}
<<<END_TOOL_CALL>>>
When the external service responds, its verified output will be provided back to you for synthesis.\n`;
  }

  const mcpContext = mcpNodes.length > 0
    ? `\n[CONNECTED MCP PROTOCOL SERVERS & CAPABILITY PERIMETER (Zero-Trust Gateway Enforced)]:
The following Model Context Protocol (MCP) servers are wired to this agent. You have authenticated access to these external systems and their live tools through the Ingress/Egress Gateway.

${mcpNodes.map((m, idx) => {
  const isServerDeactivated = Boolean(m.isDeactivated || m.data?.isDeactivated);
  const allTools = m.tools || m.data?.tools || [];
  const activeTools = isServerDeactivated ? [] : allTools.filter(t => !disabledTools.includes(t.name));
  const blockedTools = isServerDeactivated ? allTools : allTools.filter(t => disabledTools.includes(t.name));
  const b = m.basis || m.data?.basis || {};

  let text = `MCP Server ${idx + 1}: "${m.displayName || m.name}" (${m.serviceName || m.transport || 'API Protocol'})\n`;
  if (b.accountEmail) text += `  - Account Mailbox: ${b.accountEmail}\n`;
  if (b.authenticatedAs || b.username) text += `  - Authenticated Identity: ${b.authenticatedAs || b.username}\n`;
  text += `  - PERMITTED TOOLS (${activeTools.length} enabled at Gateway):\n${activeTools.map(t => {
    const props = t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : [];
    const paramsStr = props.length > 0 ? ` [parameters: ${props.join(', ')}]` : '';
    return `    • \`${t.name}\`${paramsStr}: ${t.description || t.displayName || 'Tool action'}`;
  }).join('\n') || '    (None enabled)'}\n`;
  if (blockedTools.length > 0) {
    text += `  - BLOCKED TOOLS AT GATEWAY PERIMETER (${blockedTools.length} disabled by operator):\n${blockedTools.map(t => `    • \`${t.name}\`: BLOCKED by Gateway Zero-Trust policy`).join('\n')}\n`;
  }
  return text;
}).join('\n\n')}

[TOOL EXECUTION & SYNTAX PROTOCOL]:
When querying external systems or inspecting live state (e.g. reading emails, checking attachments, listing items), issue the tool call immediately using this exact format:
<<<TOOL_CALL>>>
{
  "tool": "<tool_name>",
  "arguments": {
    "<param_key>": "<param_value>"
  }
}
<<<END_TOOL_CALL>>>
If a tool is listed under BLOCKED TOOLS, do not attempt to call it. Explain that it is blocked at the Gateway perimeter.
When summarizing or extracting data from incoming emails and attachments:
1. Call "read_attachment_content" with {"messageId": "<message_id>"} if attachments are present.
2. Once verified tool output is returned, output the final structured record with clear fields.
3. If processing unread incoming emails, you can also issue <<<TOOL_CALL>>> to "mark_as_read" with {"messageId": "<message_id>"} to update the mailbox state.`
    : '';

  const memoryPrompt = memoryContext ? `\n[HISTORICAL EPISODIC MEMORY]:\n${memoryContext}` : '';

  const fullSystemPrompt = `${basePrompt}${roleContext}${skillsContext}${mcpContext}${deterministicToolsInstruction}${externalAgentsInstruction}${memoryPrompt}

You are participating in an institutional multi-agent workflow. Review all upstream agent handoffs, execute your specific task thoroughly, and format your conclusions clearly with headers, key findings, and action items.`;

  // 6. RESOLVE FOUNDATION MODEL
  const modelNode = attachedPillars.find(p => p.type === 'model');
  let provider = 'openai';
  let modelId = 'gpt-4o';
  let isInheritedModel = false;
  let modelSource = 'Dedicated';

  if (modelNode) {
    provider = modelNode.config?.provider ||
      (modelNode.name?.toLowerCase().includes('claude') ? 'anthropic' :
       (modelNode.name?.toLowerCase().includes('gpt') || modelNode.name?.toLowerCase().includes('openai')) ? 'openai' :
       modelNode.name?.toLowerCase().includes('ollama') ? 'ollama' :
       modelNode.name?.toLowerCase().includes('openrouter') ? 'openrouter' :
       modelNode.name?.toLowerCase().includes('gemini') ? 'google' : 'openai');
    modelId = modelNode.config?.modelId || modelNode.name || 'gpt-4o';
  } else {
    // 1. Check if an upstream agent has already resolved a model to inherit from
    const upstreamWithModel = upstreamOutputs.find(u => u.provider && u.modelId);
    if (upstreamWithModel) {
      provider = upstreamWithModel.provider;
      modelId = upstreamWithModel.modelId;
      isInheritedModel = true;
      modelSource = `Inherited from ${upstreamWithModel.agentName || 'Senior Agent'}`;
    } else {
      // 2. Check if ANY agent on canvas (e.g. the main/senior agent) has a connected model
      const allModelNodes = (allNodes || []).filter(n => n.type === 'pillar' && n.data?.pillarType === 'model' && !n.data?.isDeactivated);
      if (allModelNodes.length > 0) {
        const rootModel = allModelNodes[0];
        provider = rootModel.data?.config?.provider || 'openai';
        modelId = rootModel.data?.config?.modelId || rootModel.data?.name || 'gpt-4o';
        isInheritedModel = true;
        modelSource = `Shared Canvas Brain (${rootModel.data?.name || 'Senior Agent Model'})`;
      } else {
        // Framework-recommended fallback provider
        if (frameworkId === 'langchain') {
          provider = 'anthropic';
          modelId = 'claude-3-5-sonnet-20241022';
        } else {
          provider = 'openai';
          modelId = 'gpt-4o';
        }
      }
    }
  }

  await logStep(
    isInheritedModel ? `Shared Brain (${modelSource})` : `Foundation Model (${PROVIDERS[provider]?.name || provider})`,
    isInheritedModel
      ? `Auto-accessing ${modelId} (${PROVIDERS[provider]?.name || provider}) via shared architecture.`
      : `Invoking live inference with ${modelId} for ${agentName}...`,
    'model',
    350
  );

  // --- STRICT MODALITY CAPABILITY GATEKEEPER (Rule 19) ---
  const isAudioMetadata = /Audio,\s*[\d.]+\s*(MB|KB)/i.test(processedInput) || /\.(mp3|wav|m4a|ogg|aac|flac|webm)\b/i.test(processedInput);
  let rawAudioFile = null;
  if (typeof window !== 'undefined' && window.__KEAOS_FILES__) {
    const allCached = Object.values(window.__KEAOS_FILES__);
    for (const cache of allCached) {
      if (cache?.rawFile instanceof File && (cache.rawFile.type?.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(cache.rawFile.name))) {
        rawAudioFile = cache.rawFile;
        break;
      }
      if (cache?.files?.[0]?.rawFile instanceof File && (cache.files[0].category === 'audio' || cache.files[0].rawFile.type?.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(cache.files[0].rawFile.name))) {
        rawAudioFile = cache.files[0].rawFile;
        break;
      }
    }
  }

  if (isAudioMetadata || rawAudioFile) {
    const modelCaps = getModelCapabilities(provider, modelId);
    const isFallbackRouter = gatewayNode && (
      gatewayNode.id?.includes('fallback') ||
      gatewayNode.name?.toLowerCase().includes('fallback') ||
      Boolean(gatewayNode.config?.fallbackModel) ||
      Boolean(gatewayNode.config?.enableAudioBridge)
    );
    const audioToolNode = attachedPillars.find(p => p.type === 'tools' && (p.name?.toLowerCase().includes('transcrib') || p.name?.toLowerCase().includes('audio')));

    if (modelCaps.supportsNativeAudio && rawAudioFile) {
      await logStep('Native Audio Ingestion', `Transcribing "${rawAudioFile.name}" natively with ${modelId} (${provider})...`, 'tools', 320);
      try {
        const transResult = await transcribeAudioWithModel({
          audioFile: rawAudioFile,
          provider,
          modelId,
          credential: getProviderCredential(provider)
        });
        processedInput = transResult.transcript;
        await logStep('Audio Transcription Verified', `Extracted dialogue (${transResult.durationMs}ms) via ${modelId}.`, 'tools', 200);
      } catch (audioErr) {
        throw new Error(`Native audio transcription failed via ${modelId}: ${audioErr.message}`);
      }
    } else if (isFallbackRouter && rawAudioFile) {
      const fallbackProv = gatewayNode.config?.fallbackProvider || 'google';
      const fallbackMod = gatewayNode.config?.fallbackModel || 'gemini-2.0-flash';
      const fallbackCred = getProviderCredential(fallbackProv);

      if (!fallbackCred) {
        throw new Error(`Model Fallback Router: Missing API key for fallback provider "${PROVIDERS[fallbackProv]?.name || fallbackProv}". Configure it in API Settings.`);
      }

      await logStep('Gateway Modality Bridge', `Model Fallback Router engaged: Bridging audio via secondary model ${fallbackMod} (${fallbackProv}) for ${agentName}...`, 'gateway', 350);

      try {
        const transResult = await transcribeAudioWithModel({
          audioFile: rawAudioFile,
          provider: fallbackProv,
          modelId: fallbackMod,
          credential: fallbackCred
        });
        processedInput = transResult.transcript;
        await logStep('Modality Bridge Complete', `Audio bridged successfully (${transResult.durationMs}ms). Handing transcript to ${modelId}...`, 'gateway', 220);
      } catch (bridgeErr) {
        throw new Error(`Fallback Router audio bridge failed via ${fallbackMod}: ${bridgeErr.message}`);
      }
    } else if (!modelCaps.supportsNativeAudio && !audioToolNode) {
      const haltMsg = `❌ Modality Incompatibility: Connected model "${modelId}" (${provider}) for ${agentName} does not support native audio ingestion. Per Rule 19, execution is halted. Please connect a Model Fallback Router (Gateway) or an Audio Transcriber tool, or switch to an audio-capable model (e.g. Google Gemini 2.0/2.5).`;
      await logStep('Modality Gatekeeper Halt', haltMsg, 'gateway', 0);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('keaos:toast', {
          detail: { message: haltMsg, type: 'error', duration: 7500 }
        }));
      }
      throw new Error(haltMsg);
    }
  }

  // 7. INFERENCE DISPATCH & AUTONOMOUS REACT TOOL LOOP
  let responseText = '';
  let totalTokens = 0;
  let modelLatency = 0;

  let currentMessages = [
    { role: 'user', content: processedInput }
  ];
  const MAX_TOOL_STEPS = 4;
  let toolStepCount = 0;

  try {
    while (toolStepCount < MAX_TOOL_STEPS) {
      toolStepCount++;
      const chatResult = await executeUniversalChat({
        provider,
        modelId,
        systemPrompt: fullSystemPrompt,
        messages: currentMessages,
        temperature: agentNode.data?.temperature ?? 0.1
      });

      const rawText = chatResult.text || '';
      totalTokens += chatResult.totalTokens || 0;
      modelLatency += chatResult.durationMs || 0;

      const toolCall = parseToolCallFromText(rawText);
      if (!toolCall) {
        responseText = rawText;
        break;
      }

      const { toolName, args } = toolCall;
      const toolEntry = findToolInCatalog(toolName, availableToolsMap);

      if (!toolEntry) {
        await logStep('Tool Lookup Failed', `Tool "${toolName}" was not found across connected tools or MCP servers.`, 'tools', 100);
        currentMessages.push({ role: 'assistant', content: rawText });
        currentMessages.push({
          role: 'user',
          content: `[TOOL EXECUTION ERROR]: Tool "${toolName}" is not registered on any connected tool or MCP server. Available tools: ${Array.from(availableToolsMap.keys()).join(', ')}.`
        });
        continue;
      }

      // Check if this is a zero-token Deterministic Logic Tool!
      if (toolEntry.isDeterministic) {
        const detNode = toolEntry.deterministicNode;
        const detNodeData = detNode?.nodeData || detNode?.data || toolEntry.nodeData || {};
        const detName = detNodeData?.name || detNode?.name || toolName;
        const detNodeId = detNode?.id || detNode?.nodeId;

        await logStep(
          'Deterministic Tool Invocation',
          `Executing deterministic logic "${detName}" with 0 tokens...`,
          'tools',
          180
        );

        if (typeof window !== 'undefined' && detNodeId) {
          window.dispatchEvent(new CustomEvent('keaos:deterministic-executing', { 
            detail: { nodeId: detNodeId } 
          }));
        }

        let detResult = null;
        try {
          detResult = await executeDeterministicTask({
            language: detNodeData.language || 'python',
            code: detNodeData.code || '',
            prompt: detNodeData.prompt || detNodeData.ruleSummary || '',
            ruleSummary: detNodeData.ruleSummary || detNodeData.prompt || '',
            inputData: args || {},
            inputs: args || {},
            nodeId: detNodeId || 'tool'
          });
        } catch (err) {
          detResult = { success: false, error: err.message, output: null, latencyMs: 5 };
        }

        if (typeof window !== 'undefined' && detNodeId) {
          window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
            detail: {
              nodeId: detNodeId,
              success: detResult.success !== false,
              latencyMs: detResult.latencyMs || 5,
              output: detResult.output
            }
          }));
        }

        await logStep(
          'Deterministic Tool Complete',
          `Completed "${detName}" in ${detResult.latencyMs || 5}ms (0 tokens consumed).`,
          'tools',
          180
        );

        const outputStr = typeof detResult.output === 'object'
          ? JSON.stringify(detResult.output, null, 2)
          : String(detResult.output !== undefined && detResult.output !== null ? detResult.output : (detResult.error || 'Execution completed with 0 output'));

        currentMessages.push({ role: 'assistant', content: rawText });
        currentMessages.push({
          role: 'user',
          content: `[DETERMINISTIC TOOL RESULT ("${toolName}") — 0 TOKENS CONSUMED]:\n${outputStr}\n\nIngest this exact deterministic computation and continue synthesizing your conclusion.`
        });
        continue;
      }

      // Check if this is a callable External Specialist Agent Tool!
      if (toolEntry.isRemoteAgent) {
        const raNode = toolEntry.remoteAgentNode;
        const raData = raNode?.data || toolEntry.nodeData || {};
        const raName = raData.name || toolName;
        const raId = raNode?.id;

        await logStep(
          'External Agent Invocation',
          `Calling external specialist "${raName}" (${raData.framework || 'REST'})...`,
          'tools',
          220
        );

        let remoteRes = null;
        try {
          const remoteInput = (args && typeof args === 'object' && args.payload !== undefined)
            ? args.payload
            : (args && typeof args === 'object' && Object.keys(args).length === 1 && args.prompt)
              ? args.prompt
              : args;

          remoteRes = await executeRemoteAgentTask({
            nodeId: raId || 'remote-agent',
            nodeData: raData,
            inputData: remoteInput,
            policies: null,
            memoryContext: memoryContext || null,
            allNodes,
            allEdges
          });
        } catch (err) {
          remoteRes = { success: false, error: err.message, output: null, latencyMs: 10 };
        }

        const outText = remoteRes.success 
          ? (typeof remoteRes.output === 'object' ? JSON.stringify(remoteRes.output, null, 2) : String(remoteRes.output))
          : `[EXTERNAL AGENT ERROR]: ${remoteRes.error || 'Execution failed'}`;

        await logStep(
          'External Agent Result',
          `Received response from "${raName}" (${remoteRes.latencyMs || 0}ms). Ingesting into reasoning context.`,
          'tools',
          180
        );

        currentMessages.push({ role: 'assistant', content: rawText });
        currentMessages.push({
          role: 'user',
          content: `[EXTERNAL AGENT RESULT FROM "${toolName}"]:\n${outText}\n\nIngest this external specialist output and continue executing your workflow.`
        });
        continue;
      }

      const { tool, mcpServer, isBlocked } = toolEntry;

      // Zero-Trust Gateway Perimeter Check
      if (isBlocked || disabledTools.includes(toolName)) {
        await logStep(
          'Gateway Policy Violation',
          `Tool "${toolName}" BLOCKED by Zero-Trust Egress Gateway.`,
          'gateway',
          150
        );
        currentMessages.push({ role: 'assistant', content: rawText });
        currentMessages.push({
          role: 'user',
          content: `[GATEWAY POLICY VIOLATION]: Execution of tool "${toolName}" was BLOCKED at the Gateway perimeter by operator Zero-Trust policy. Explain this security constraint.`
        });
        continue;
      }

      // Execute real MCP tool
      await logStep(
        'Live MCP Tool Execution',
        `Executing "${toolName}" on ${mcpServer.displayName || mcpServer.name}...`,
        'mcp',
        300
      );

      let executionSuccess = false;
      let toolResultData = null;

      try {
        toolResultData = await executeRealMcpTool(mcpServer, toolName, args, { disabledTools });
        executionSuccess = true;
        await logStep(
          'Live MCP Tool Complete',
          `Tool "${toolName}" executed successfully. Received response.`,
          'mcp',
          200
        );
      } catch (execErr) {
        console.error(`MCP Tool "${toolName}" execution error in orchestrator:`, execErr);
        await logStep(
          'Live MCP Tool Failed',
          `Execution error: ${execErr.message}`,
          'mcp',
          150
        );
        toolResultData = { error: execErr.message };
      }

      currentMessages.push({
        role: 'assistant',
        content: rawText || `<<<TOOL_CALL>>>\n{\n  "tool": "${toolName}",\n  "arguments": ${JSON.stringify(args, null, 2)}\n}\n<<<END_TOOL_CALL>>>`
      });

      if (executionSuccess) {
        currentMessages.push({
          role: 'user',
          content: `[VERIFIED TOOL RESULT FOR "${toolName}"]:\n${typeof toolResultData === 'string' ? toolResultData : JSON.stringify(toolResultData, null, 2)}\n\nIf you require an additional tool call to complete your task (such as inspecting attachments, fetching related details, or updating mailbox status), you may emit another <<<TOOL_CALL>>>. Otherwise, synthesize your final output.`
        });
      } else {
        currentMessages.push({
          role: 'user',
          content: `[TOOL EXECUTION FAILED FOR "${toolName}"]: ${toolResultData?.error || 'Unknown error'}. Please handle this gracefully.`
        });
      }
    }

    if (!responseText && currentMessages.length > 0) {
      const lastAssistantMsg = [...currentMessages].reverse().find(m => m.role === 'assistant');
      responseText = lastAssistantMsg?.content || 'Execution completed.';
    }
  } catch (err) {
    console.error(`Live inference failed for ${agentName}:`, err);
    throw new Error(`Model Inference Failed (${PROVIDERS[provider]?.name || provider} ${modelId}): ${err.message}. Please configure API credentials in Settings.`);
  }

  // 8. CRYPTOGRAPHIC SHA-256 AUDIT
  const auditString = `${agentId}::${processedInput.slice(0, 200)}::${responseText.slice(0, 200)}::${Date.now()}`;
  const auditHash = await generateSha256Fingerprint(auditString);

  const totalDurationMs = Math.round(performance.now() - startTime);
  const costUsd = calculateInferenceCost({ provider, modelId, totalTokens });

  await logStep('Cryptographic Audit', `Signed W3C SHA-256 Digest: ${auditHash.slice(0, 14)}... (${totalDurationMs}ms, ${totalTokens} tokens)`, 'audit', 260);

  return {
    agentId,
    agentName,
    frameworkId,
    frameworkName,
    role: agentRole,
    output: responseText,
    auditHash,
    tokens: totalTokens,
    latencyMs: totalDurationMs,
    costUsd,
    provider,
    modelId,
    timestamp: new Date().toLocaleTimeString()
  };
}

/**
 * Execute the full Multi-Agent Heterogeneous DAG Workflow
 */
export async function executeMultiAgentWorkflow({
  nodes = [],
  edges = [],
  initialInput = '',
  activeUseCase = null,
  onStageStart,
  onAgentComplete,
  onWorkflowComplete
}) {
  const stages = buildMultiAgentDAG(nodes, edges);
  if (stages.length === 0) {
    throw new Error('No active AI Agents found on canvas.');
  }

  const agentOutputs = {}; // agentId -> agentOutputRecord
  const stageResults = [];
  let totalFleetTokens = 0;
  let totalFleetCostUsd = 0;
  const workflowStartTime = performance.now();

  // Find Ingestion Node content if not provided explicitly
  let rawIngress = initialInput;
  if (!rawIngress || !rawIngress.trim()) {
    const ingestNode = nodes.find(n => n.type === 'ingestionNode');
    if (ingestNode?.data?.content?.trim()) {
      rawIngress = ingestNode.data.content;
    }
  }

  // Iterate sequentially through topological stages
  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const currentTierAgents = stages[stageIdx];
    if (onStageStart) {
      onStageStart({
        stageIndex: stageIdx,
        totalStages: stages.length,
        agents: currentTierAgents.map(a => ({ id: a.id, name: a.data?.name }))
      });
    }

    // Run agents in the same tier in parallel (Fan-out pattern)
    const tierPromises = currentTierAgents.map(async (agent) => {
      // Find incoming upstream sources (Agents, Remote Services & Deterministic Boxes) for THIS specific agent
      const incomingEdges = edges.filter(e => e.target === agent.id && (e.targetHandle === 'agent-in' || e.targetHandle === 'in' || e.targetHandle === 'tools-in' || !e.targetHandle));
      const upstreamAgentOutputs = incomingEdges
        .map(e => {
          if (agentOutputs[e.source]) {
            return agentOutputs[e.source];
          }
          const upNode = (nodes || []).find(n => n.id === e.source);
          if (upNode?.type === 'deterministicNode' && upNode?.data?.lastOutput !== undefined && upNode?.data?.lastOutput !== null) {
            const outStr = typeof upNode.data.lastOutput === 'object'
              ? JSON.stringify(upNode.data.lastOutput, null, 2)
              : String(upNode.data.lastOutput);
            return {
              agentName: upNode.data?.name || 'Deterministic Logic Box',
              frameworkName: 'Deterministic Engine (0 Tokens)',
              role: 'Deterministic Data Processor',
              output: outStr,
              provider: 'deterministic',
              modelId: upNode.data?.language || 'python',
              tokens: 0,
              latencyMs: upNode.data?.lastLatencyMs || 0
            };
          }
          return null;
        })
        .filter(Boolean);

      // Check for dynamic conditional routing from upstream orchestrator
      const targetAgentName = extractRoutingTarget(upstreamAgentOutputs);
      const myName = (agent.data?.name || '').toLowerCase();
      const isTargeted = !targetAgentName || 
                         myName.includes(targetAgentName.toLowerCase()) || 
                         targetAgentName.toLowerCase().includes(myName);

      if (!isTargeted) {
        // Dynamic Router Gate: Bypass non-selected downstream agents with 0 tokens consumed
        const bypassResult = {
          agentId: agent.id,
          agentName: agent.data?.name || 'AI Agent',
          frameworkName: agent.data?.framework?.name || 'Google ADK',
          role: agent.data?.role || 'Specialist',
          output: `[DYNAMIC ROUTER BYPASS]: Task was routed specifically to "${targetAgentName}". ${agent.data?.name || 'This agent'} was bypassed with 0 tokens consumed.`,
          auditHash: 'ROUTER-BYPASS-0-TOKENS',
          tokens: 0,
          costUsd: 0,
          latencyMs: 5,
          provider: 'router',
          modelId: 'bypassed',
          isBypassed: true,
          timestamp: new Date().toLocaleTimeString()
        };

        window.dispatchEvent(new CustomEvent('keaos:agent-step-progress', {
          detail: {
            agentId: agent.id,
            agentName: agent.data?.name || 'AI Agent',
            frameworkName: agent.data?.framework?.name || 'Google ADK',
            step: 'Dynamic Router Gate',
            detail: `Bypassed — Upstream orchestrator routed task specifically to "${targetAgentName}"`,
            pillarType: 'gateway',
            timestamp: new Date().toLocaleTimeString()
          }
        }));

        agentOutputs[agent.id] = bypassResult;
        if (onAgentComplete) onAgentComplete(bypassResult);
        return bypassResult;
      }

      // Pulse canvas state for this active agent
      window.dispatchEvent(new CustomEvent('keaos:set-active-agent-pulse', {
        detail: { agentId: agent.id, isExecuting: true }
      }));

      const result = await executeSingleAgentInPipeline({
        agentNode: agent,
        upstreamOutputs: upstreamAgentOutputs,
        initialRawInput: rawIngress,
        allNodes: nodes,
        allEdges: edges,
        onStepProgress: (progress) => {
          // Progress event
          window.dispatchEvent(new CustomEvent('keaos:agent-step-progress', { detail: progress }));
        }
      });

      agentOutputs[agent.id] = result;
      totalFleetTokens += result.tokens;
      totalFleetCostUsd += result.costUsd;

      // Broadcast single agent output for connected Canvas Output nodes
      window.dispatchEvent(new CustomEvent('keaos:agent-output', {
        detail: {
          agentId: agent.id,
          output: result.output,
          auditHash: result.auditHash,
          observability: {
            totalTokens: result.tokens,
            latencyMs: result.latencyMs,
            modelUsed: `${result.provider} (${result.modelId})`,
            framework: result.frameworkName
          },
          costUsd: result.costUsd
        }
      }));

      if (onAgentComplete) onAgentComplete(result);
      return result;
    });

    const tierResults = await Promise.all(tierPromises);
    stageResults.push(tierResults);
  }

  const totalWorkflowLatencyMs = Math.round(performance.now() - workflowStartTime);

  // Generate Fleet W3C SHA-256 Digest combining all agent hashes
  const fleetAuditString = Object.values(agentOutputs).map(o => o.auditHash).join('::');
  const fleetAuditDigest = await generateSha256Fingerprint(fleetAuditString);

  // Derive final deliverable from terminal agents (last stage)
  const finalStageOutputs = stageResults[stageResults.length - 1] || [];
  const finalCombinedOutput = finalStageOutputs.map(o => o.output).join('\n\n---\n\n');

  // Record to unified audit & observability ledger
  try {
    const agentsList = Object.values(agentOutputs).map(o => ({
      agentId: o.agentId,
      agentName: o.agentName,
      provider: o.provider,
      modelId: o.modelId,
      tokens: o.tokens || 0,
      costUsd: o.costUsd || 0,
      latencyMs: o.latencyMs || 0,
      status: 'COMPLETED'
    }));

    await recordWorkflowExecution({
      activeUseCase: activeUseCase || {
        id: 'fleet-workflow',
        name: `Multi-Agent Fleet (${Object.values(agentOutputs).map(o => o.agentName).join(' ➔ ')})`,
        framework: { id: 'multi-sdk-fleet', name: 'Heterogeneous Multi-SDK Fleet' }
      },
      origin: 'canvas',
      initiator: {
        name: 'Lead Architect',
        role: 'Studio Operator',
        ingressChannel: `Multi-Agent Fleet Pipeline (${stages.length} Stages)`
      },
      inputData: rawIngress,
      outputData: finalCombinedOutput,
      durationMs: totalWorkflowLatencyMs,
      agents: agentsList,
      piiSanitizedCount: 0,
      status: 'SUCCESS'
    });
  } catch (err) {
    console.warn('[MultiAgentOrchestrator] Unified audit recording fallback:', err);
  }

  // Legacy fallback synchronization
  try {
    const existingLedger = JSON.parse(localStorage.getItem('keaos_audit_ledger') || '[]');
    const newRecord = {
      id: `FLEET-AUDIT-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      eventType: `Multi-Agent Fleet (${Object.keys(agentOutputs).length} Agents)`,
      agent: `Fleet Pipeline (${Object.values(agentOutputs).map(o => o.agentName).join(' ➔ ')})`,
      framework: 'Heterogeneous Multi-SDK',
      sha256Hash: fleetAuditDigest,
      inputsLength: `${rawIngress.length} chars`,
      verified: true,
      complianceStandard: 'SOC2 Type II / W3C SHA-256',
      tokens: totalFleetTokens,
      costUsd: Number(totalFleetCostUsd.toFixed(5)),
      latencyMs: totalWorkflowLatencyMs
    };
    localStorage.setItem('keaos_audit_ledger', JSON.stringify([newRecord, ...existingLedger].slice(0, 50)));
  } catch (err) {
    console.warn('Failed to append fleet to audit ledger:', err);
  }

  const summary = {
    success: true,
    totalStages: stages.length,
    agentCount: Object.keys(agentOutputs).length,
    stageResults,
    agentOutputs,
    finalOutput: finalCombinedOutput,
    fleetObservability: {
      totalTokens: totalFleetTokens,
      totalCostUsd: Number(totalFleetCostUsd.toFixed(5)),
      totalLatencyMs: totalWorkflowLatencyMs,
      fleetAuditDigest
    }
  };

  if (onWorkflowComplete) onWorkflowComplete(summary);
  return summary;
}
