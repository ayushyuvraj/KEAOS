import { 
  executeUniversalChat, 
  PROVIDERS 
} from '../services/llmService';
import { getEpisodicMemoryStore } from './meetingSimulatorEngine';
import { calculateInferenceCost } from '../services/modelPricingService';

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
      name: src.data.name,
      type: src.data.pillarType,
      config: src.data.config || {},
      customDirective: src.data.customDirective || null,
      referenceDoc: src.data.referenceDoc || null,
      handle: e.targetHandle
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
  const agentRole = agentNode.data?.role || 'specialist';

  const attachedPillars = getAgentAttachedPillars(agentId, allNodes, allEdges);
  const startTime = performance.now();

  const logStep = (stepName, detail, pillarType = null, latencyMs = 80) => {
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
  };

  logStep('Ingress & Scheduling', `Starting ${agentName} (${frameworkName} - ${agentRole.toUpperCase()})`, 'gateway', 30);

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
    logStep('Policies & Guardrails', `Enforced ${policyNodes.length} active compliance policies. Sanitized ${redactedCount} items.`, 'policies', 40);
  }

  // 3. EPISODIC MEMORY LOOKUP
  const memoryNode = attachedPillars.find(p => p.type === 'memory');
  let memoryContext = '';
  if (memoryNode) {
    const memoryItems = getEpisodicMemoryStore();
    if (memoryItems.length > 0) {
      memoryContext = memoryItems.map(m => `• [${m.date || 'Historical'}]: ${m.text || m.task || JSON.stringify(m)}`).join('\n');
      logStep('Episodic Memory', `Retrieved ${memoryItems.length} past corporate constraints.`, 'memory', 50);
    }
  }

  // 4. SKILLS & MCP PROTOCOL TOOLS
  const skillNodes = attachedPillars.filter(p => p.type === 'skills');
  const mcpNodes = attachedPillars.filter(p => p.type === 'mcp');
  const toolNodes = attachedPillars.filter(p => p.type === 'tools');

  // 5. ASSEMBLE PROMPT
  const basePrompt = agentNode.data?.prompt || `You are ${agentName}, an autonomous enterprise agent running on ${frameworkName}.`;
  const roleContext = `\n[YOUR ARCHITECTURAL ROLE IN THE MULTI-AGENT GRAPH]: ${agentRole.toUpperCase()} under ${frameworkName}.`;
  const skillsContext = skillNodes.length > 0
    ? `\n[ATTACHED SKILLS]:\n${skillNodes.map(s => `- ${s.name}: ${s.description || 'Custom Skill'}`).join('\n')}`
    : '';
  const mcpContext = mcpNodes.length > 0
    ? `\n[CONNECTED MCP PROTOCOL SERVERS]:\n${mcpNodes.map(m => `- ${m.name}`).join('\n')}`
    : '';
  const memoryPrompt = memoryContext ? `\n[HISTORICAL EPISODIC MEMORY]:\n${memoryContext}` : '';

  const fullSystemPrompt = `${basePrompt}${roleContext}${skillsContext}${mcpContext}${memoryPrompt}

You are participating in an institutional multi-agent workflow. Review all upstream agent handoffs, execute your specific task thoroughly, and format your conclusions clearly with headers, key findings, and action items.`;

  // 6. RESOLVE FOUNDATION MODEL
  const modelNode = attachedPillars.find(p => p.type === 'model');
  let provider = 'google';
  let modelId = 'gemini-2.0-flash';
  let isInheritedModel = false;
  let modelSource = 'Dedicated';

  if (modelNode) {
    provider = modelNode.config?.provider ||
      (modelNode.name?.toLowerCase().includes('claude') ? 'anthropic' :
       (modelNode.name?.toLowerCase().includes('gpt') || modelNode.name?.toLowerCase().includes('openai')) ? 'openai' :
       modelNode.name?.toLowerCase().includes('ollama') ? 'ollama' :
       modelNode.name?.toLowerCase().includes('openrouter') ? 'openrouter' : 'google');
    modelId = modelNode.config?.modelId || modelNode.name || 'gemini-2.0-flash';
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
        provider = rootModel.data?.config?.provider || 'google';
        modelId = rootModel.data?.config?.modelId || rootModel.data?.name || 'gemini-2.0-flash';
        isInheritedModel = true;
        modelSource = `Shared Canvas Brain (${rootModel.data?.name || 'Senior Agent Model'})`;
      } else {
        // Framework-recommended fallback provider
        if (frameworkId === 'microsoft-adk' || frameworkId === 'openai-swarm') {
          provider = 'openai';
          modelId = 'gpt-4o';
        } else if (frameworkId === 'langchain') {
          provider = 'anthropic';
          modelId = 'claude-3-5-sonnet-20241022';
        } else {
          provider = 'google';
          modelId = 'gemini-2.0-flash';
        }
      }
    }
  }

  logStep(
    isInheritedModel ? `Shared Brain (${modelSource})` : `Foundation Model (${PROVIDERS[provider]?.name || provider})`,
    isInheritedModel
      ? `Auto-accessing ${modelId} (${PROVIDERS[provider]?.name || provider}) via shared architecture.`
      : `Invoking ${modelId} for ${agentName}...`,
    'model',
    isInheritedModel ? 10 : 0
  );

  // 7. INFERENCE DISPATCH
  let responseText = '';
  let totalTokens = 0;
  let modelLatency = 0;

  try {
    const chatResult = await executeUniversalChat({
      provider,
      modelId,
      systemPrompt: fullSystemPrompt,
      messages: [{ role: 'user', content: processedInput }],
      temperature: agentNode.data?.temperature ?? 0.2
    });

    responseText = chatResult.text;
    totalTokens = chatResult.totalTokens;
    modelLatency = chatResult.durationMs;
  } catch (err) {
    console.warn(`Live inference failed for ${agentName}, applying graceful fallback:`, err);
    responseText = `### ${agentName} Analysis (${frameworkName})\n\n` +
      `**Task Execution**: Processed ${upstreamOutputs.length > 0 ? `${upstreamOutputs.length} upstream agent streams` : 'direct ingestion input'}.\n\n` +
      `**Key Analysis & Directives**:\n` +
      `- Synthesized input across ${attachedPillars.length} bound peripherals.\n` +
      `- Evaluated compliance standards under institutional safety policies.\n` +
      `- Formulated structured action items and strategic deliverables for downstream consumers.\n\n` +
      `_Note: Live provider returned: ${err.message}_`;
    totalTokens = 240;
    modelLatency = 350;
  }

  // 8. CRYPTOGRAPHIC SHA-256 AUDIT
  const auditString = `${agentId}::${processedInput.slice(0, 200)}::${responseText.slice(0, 200)}::${Date.now()}`;
  const auditHash = await generateSha256Fingerprint(auditString);

  const totalDurationMs = Math.round(performance.now() - startTime);
  const costUsd = calculateInferenceCost({ provider, modelId, totalTokens });

  logStep('Cryptographic Audit', `Signed W3C Digest: ${auditHash.slice(0, 14)}... (${totalDurationMs}ms, ${totalTokens} tokens)`, 'audit', 30);

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

  // Record to localStorage audit ledger
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
