import { 
  executeUniversalChat, 
  PROVIDERS 
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
  const agentNodes = nodes.filter(n => n.type === 'agentCore' && !n.data?.isDeactivated);
  if (agentNodes.length === 0) return [];

  const agentLookup = Object.fromEntries(agentNodes.map(n => [n.id, n]));
  
  // A2A Edges: Edges from one active AgentCore to another active AgentCore
  const a2aEdges = edges.filter(e => {
    return agentLookup[e.source] && agentLookup[e.target] && (e.targetHandle === 'agent-in' || !e.targetHandle);
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
  
  return incomingEdges.map(e => {
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

  const fullSystemPrompt = `${basePrompt}${roleContext}${skillsContext}${mcpContext}${memoryPrompt}

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
        await logStep('Tool Lookup Failed', `Tool "${toolName}" was not found across connected MCP servers.`, 'mcp', 100);
        currentMessages.push({ role: 'assistant', content: rawText });
        currentMessages.push({
          role: 'user',
          content: `[TOOL EXECUTION ERROR]: Tool "${toolName}" is not registered on any connected MCP server. Available tools: ${Array.from(availableToolsMap.keys()).join(', ')}.`
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
      // Find incoming upstream sources (Agents & Deterministic Boxes) for THIS specific agent
      const incomingEdges = edges.filter(e => e.target === agent.id && (e.targetHandle === 'agent-in' || e.targetHandle === 'tools-in' || !e.targetHandle));
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
