import { executeUniversalChat, getProviderCredential } from './llmService';
import { PILLARS } from '../constants/pillars';
import { FRAMEWORKS } from '../constants/frameworks';
import { resolveCatalogItem, getCatalogManifestForPrompt, getAllRegisteredCatalogItems } from './catalogResolver';

/**
 * Authoritative Graph Repair & Normalization Engine for KEAOS
 * - Fixes socket handle mismatches (policies-in -> policy-in, skills-in -> skill-in, etc.)
 * - Auto-wires any unconnected orphan pillars/tools to the primary agent core
 * - Strictly resolves and hydates nodes against official catalog items (never empty or imaginary)
 * - Guarantees 100% valid ReactFlow edge endpoints
 */
export function normalizeAndRepairWorkflow(nodes = [], edges = [], options = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return { nodes: [], edges: edges || [] };

  const { existingNodeIds, autoWireExisting = false } = options;

  // 1. Normalize all nodes, pillar types, and hydrate from official catalog
  const normalizedNodes = nodes.map((node, i) => {
    let type = node.type || 'pillar';
    let data = { ...(node.data || {}) };

    if (type === 'outputDisplayNode' || type === 'outputDisplayNodeV2' || type === 'output') {
      type = 'outputNodeV2';
    } else if (type === 'modelNode') {
      type = 'pillar';
      data.pillarType = 'model';
    } else if (type === 'skillNode') {
      type = 'pillar';
      data.pillarType = 'skills';
    } else if (type === 'mcpNode') {
      type = 'pillar';
      data.pillarType = 'mcp';
    } else if (type === 'policyNode') {
      type = 'pillar';
      data.pillarType = 'policies';
    }

    // Infer pillarType if missing on pillar nodes
    if (type === 'pillar' && !data.pillarType) {
      const lower = `${node.id || ''} ${data.name || ''} ${data.title || ''}`.toLowerCase();
      if (lower.includes('gpt') || lower.includes('claude') || lower.includes('gemini') || lower.includes('model') || lower.includes('ollama') || lower.includes('llama') || lower.includes('deepseek')) {
        data.pillarType = 'model';
      } else if (lower.includes('pii') || lower.includes('guard') || lower.includes('policy') || lower.includes('nda') || lower.includes('masker')) {
        data.pillarType = 'policies';
      } else if (lower.includes('summar') || lower.includes('action') || lower.includes('skill') || lower.includes('sentiment') || lower.includes('decision') || lower.includes('mom')) {
        data.pillarType = 'skills';
      } else if (lower.includes('memory') || lower.includes('vector') || lower.includes('chroma') || lower.includes('episodic')) {
        data.pillarType = 'memory';
      } else if (lower.includes('slack') || lower.includes('jira') || lower.includes('mcp') || lower.includes('neo4j') || lower.includes('outlook') || lower.includes('github')) {
        data.pillarType = 'mcp';
      } else if (lower.includes('gateway') || lower.includes('router') || lower.includes('rate')) {
        data.pillarType = 'gateway';
      } else {
        data.pillarType = 'skills';
      }
    }

    // STRICT CATALOG HYDRATION: Ensure official name, description, config, and itemId from right panel catalog
    if (type === 'pillar') {
      const hint = data.pillarType;
      const searchKey = data.itemId || data.name || data.modelName || data.skillName || data.policyName || data.toolName || data.title || data.modelId || data.model || data.config?.modelId || node.id;
      let matched = resolveCatalogItem(searchKey, hint);

      // If searchKey was generic (e.g. name was "policies" or "skills"), match by node.id or hint
      if (!matched || (data.name && data.name.toLowerCase() === hint?.toLowerCase())) {
        matched = resolveCatalogItem(node.id, hint) || matched;
      }

      // If still not matched, fall back to canonical registered item for that pillar category
      if (!matched && hint) {
        if (hint === 'model') matched = resolveCatalogItem('model-gpt-4o', 'model');
        else if (hint === 'policies') matched = resolveCatalogItem('pol-pii-masker', 'policies');
        else if (hint === 'skills') matched = resolveCatalogItem('skill-summarizer', 'skills');
        else if (hint === 'memory') matched = resolveCatalogItem('mem-episodic-sync', 'memory');
        else if (hint === 'gateway') matched = resolveCatalogItem('gw-mcp-controller', 'gateway');
        else if (hint === 'mcp') matched = resolveCatalogItem('mcp-outlook', 'mcp');
        else if (hint === 'audit') matched = resolveCatalogItem('audit-tamper-proof', 'audit');
        else if (hint === 'observability') matched = resolveCatalogItem('obs-opentelemetry', 'observability');
        else if (hint === 'cost_benefit') matched = resolveCatalogItem('roi-tracker', 'cost_benefit');
      }

      if (matched) {
        data = {
          ...data,
          pillarType: matched.pillarType || data.pillarType,
          itemId: matched.id || data.itemId,
          name: matched.name,
          description: matched.description || data.description,
          config: { ...(matched.config || {}), ...(data.config || {}) }
        };
        if (matched.tools) data.tools = matched.tools;
        if (matched.serviceName) data.serviceName = matched.serviceName;
        if (matched.customDirective) data.customDirective = matched.customDirective;
        if (matched.referenceDoc) data.referenceDoc = matched.referenceDoc;
      } else {
        // Fallback: Ensure name is NEVER blank
        if (!data.name) {
          data.name = data.modelName || data.skillName || data.policyName || data.toolName || data.title || (data.config?.modelId ? String(data.config.modelId) : null) || (hint === 'model' ? 'GPT-4o' : 'Component');
        }
      }
    }

    return {
      ...node,
      type,
      data
    };
  });

  const nodeMap = new Map(normalizedNodes.map(n => [n.id, n]));
  const primaryAgent = normalizedNodes.find(n => n.type === 'agentCore');

  // 2. Canonical Socket Normalization for all existing edges
  const repairedEdges = [];
  const existingEdgeSet = new Set();

  (edges || []).forEach(edge => {
    if (!edge || !edge.source || !edge.target) return;
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return;

    let sourceHandle = edge.sourceHandle || 'out';
    let targetHandle = edge.targetHandle;

    // Direct connections pointing to an Agent Core node
    if (targetNode.type === 'agentCore') {
      const pt = sourceNode.data?.pillarType;
      if (pt === 'model' || targetHandle === 'model-in') {
        targetHandle = 'model-in';
        sourceHandle = 'out';
      } else if (pt === 'policies' || targetHandle === 'policies-in' || targetHandle === 'policy-in') {
        targetHandle = 'policy-in';
        sourceHandle = 'out';
      } else if (pt === 'skills' || targetHandle === 'skill-in' || targetHandle === 'skills-in') {
        targetHandle = 'skill-in';
        sourceHandle = 'out';
      } else if (pt === 'memory' || targetHandle === 'memory-in') {
        targetHandle = 'memory-in';
        sourceHandle = 'out';
      } else if (pt === 'mcp' || pt === 'gateway' || targetHandle === 'mcp-in' || targetHandle === 'gateway-in') {
        targetHandle = 'mcp-in';
        sourceHandle = 'out';
      } else if (pt === 'tools' || targetHandle === 'tools-in' || targetHandle === 'tool-in') {
        targetHandle = 'tools-in';
        sourceHandle = 'out';
      } else if (sourceNode.type === 'ingestionNode') {
        targetHandle = 'tools-in';
        sourceHandle = 'data-out';
      } else if (sourceNode.type === 'triggerNode') {
        targetHandle = 'agent-in';
        sourceHandle = 'trigger-out';
      } else if (sourceNode.type === 'agentCore' || sourceNode.type === 'deterministicNode') {
        targetHandle = 'agent-in';
        sourceHandle = 'out';
      }
    } else if (sourceNode.type === 'agentCore') {
      sourceHandle = 'out';
      if (targetNode.type === 'outputNode' || targetNode.type === 'outputNodeV2') {
        targetHandle = 'data-in';
      } else if (targetNode.type === 'approvalNode' || targetNode.type === 'routerNode' || targetNode.type === 'deterministicNode') {
        targetHandle = 'in';
      } else if (targetNode.type === 'agentCore') {
        targetHandle = 'agent-in';
      }
    } else if (sourceNode.type === 'approvalNode') {
      sourceHandle = edge.sourceHandle || 'approved-out';
      if (targetNode.type === 'outputNode' || targetNode.type === 'outputNodeV2') targetHandle = 'data-in';
    } else if (sourceNode.type === 'routerNode') {
      sourceHandle = edge.sourceHandle || 'true-out';
      if (targetNode.type === 'outputNode' || targetNode.type === 'outputNodeV2') targetHandle = 'data-in';
    } else if (sourceNode.type === 'deterministicNode') {
      sourceHandle = 'out';
      if (targetNode.type === 'outputNode' || targetNode.type === 'outputNodeV2') targetHandle = 'data-in';
      else if (targetNode.type === 'agentCore') targetHandle = 'agent-in';
    }

    const edgeKey = `${edge.source}->${edge.target}:${targetHandle}`;
    if (!existingEdgeSet.has(edgeKey)) {
      existingEdgeSet.add(edgeKey);
      repairedEdges.push({
        ...edge,
        sourceHandle,
        targetHandle,
        type: 'deletable',
        animated: true
      });
    }
  });

  // 3. Auto-Wire Orphan Peripheral Nodes to Primary Agent Core
  if (primaryAgent) {
    normalizedNodes.forEach(node => {
      if (node.id === primaryAgent.id) return;

      // If this node already existed on canvas prior to this operation and was disconnected,
      // do not auto-wire it unless explicitly allowed (preserves user's manual wire deletions).
      if (existingNodeIds && existingNodeIds.has(node.id) && !autoWireExisting) {
        return;
      }

      // Check if node is already connected to the primary agent
      const isConnected = repairedEdges.some(e => 
        (e.source === node.id && e.target === primaryAgent.id) ||
        (e.source === primaryAgent.id && e.target === node.id)
      );

      if (!isConnected) {
        if (node.type === 'pillar') {
          const pt = node.data?.pillarType;
          let targetHandle = 'skill-in';
          if (pt === 'model') targetHandle = 'model-in';
          else if (pt === 'policies') targetHandle = 'policy-in';
          else if (pt === 'memory') targetHandle = 'memory-in';
          else if (pt === 'mcp' || pt === 'gateway') targetHandle = 'mcp-in';
          else if (pt === 'tools') targetHandle = 'tools-in';
          else if (pt === 'audit') targetHandle = 'audit-in';
          else if (pt === 'observability') targetHandle = 'observability-in';
          else if (pt === 'cost-benefit' || pt === 'cost_benefit') targetHandle = 'cost-benefit-in';

          const edgeKey = `${node.id}->${primaryAgent.id}:${targetHandle}`;
          if (!existingEdgeSet.has(edgeKey)) {
            existingEdgeSet.add(edgeKey);
            repairedEdges.push({
              id: `edge-${node.id}-to-${primaryAgent.id}`,
              source: node.id,
              sourceHandle: 'out',
              target: primaryAgent.id,
              targetHandle,
              type: 'deletable',
              animated: true
            });
          }
        } else if (node.type === 'ingestionNode') {
          const edgeKey = `${node.id}->${primaryAgent.id}:tools-in`;
          if (!existingEdgeSet.has(edgeKey)) {
            existingEdgeSet.add(edgeKey);
            repairedEdges.push({
              id: `edge-${node.id}-to-${primaryAgent.id}`,
              source: node.id,
              sourceHandle: 'data-out',
              target: primaryAgent.id,
              targetHandle: 'tools-in',
              type: 'deletable',
              animated: true
            });
          }
        } else if (node.type === 'triggerNode') {
          const edgeKey = `${node.id}->${primaryAgent.id}:agent-in`;
          if (!existingEdgeSet.has(edgeKey)) {
            existingEdgeSet.add(edgeKey);
            repairedEdges.push({
              id: `edge-${node.id}-to-${primaryAgent.id}`,
              source: node.id,
              sourceHandle: 'trigger-out',
              target: primaryAgent.id,
              targetHandle: 'agent-in',
              type: 'deletable',
              animated: true
            });
          }
        } else if (node.type === 'outputNode' || node.type === 'outputNodeV2') {
          const edgeKey = `${primaryAgent.id}->${node.id}:data-in`;
          if (!existingEdgeSet.has(edgeKey)) {
            existingEdgeSet.add(edgeKey);
            repairedEdges.push({
              id: `edge-${primaryAgent.id}-to-${node.id}`,
              source: primaryAgent.id,
              sourceHandle: 'out',
              target: node.id,
              targetHandle: 'data-in',
              type: 'deletable',
              animated: true
            });
          }
        }
      }
    });

    // Update primary agent attachedCounts accurately
    const counts = { model: 0, skills: 0, mcp: 0, tools: 0, gateway: 0, memory: 0, policies: 0, audit: 0, observability: 0, cost_benefit: 0, agent: 0 };
    repairedEdges.forEach(e => {
      if (e.target === primaryAgent.id) {
        if (e.targetHandle === 'model-in') counts.model += 1;
        else if (e.targetHandle === 'skill-in' || e.targetHandle === 'skills-in') counts.skills += 1;
        else if (e.targetHandle === 'policy-in' || e.targetHandle === 'policies-in') counts.policies += 1;
        else if (e.targetHandle === 'memory-in') counts.memory += 1;
        else if (e.targetHandle === 'mcp-in' || e.targetHandle === 'gateway-in') counts.mcp += 1;
        else if (e.targetHandle === 'tools-in' || e.targetHandle === 'tool-in') counts.tools += 1;
        else if (e.targetHandle === 'audit-in') counts.audit = (counts.audit || 0) + 1;
        else if (e.targetHandle === 'observability-in') counts.observability = (counts.observability || 0) + 1;
        else if (e.targetHandle === 'cost-benefit-in') counts.cost_benefit = (counts.cost_benefit || 0) + 1;
        else if (e.targetHandle === 'agent-in' || e.targetHandle === 'input-in') counts.agent += 1;
      }
    });
    primaryAgent.data = {
      ...primaryAgent.data,
      attachedCounts: counts
    };
  }

  return { nodes: normalizedNodes, edges: repairedEdges };
}

/**
 * Standard spatial placement coordinates for KEAOS architectural layout
 * Avoids any node overlaps and aligns precisely with typed socket locations.
 */
export function computeArchitectLayout(nodes, edges, options = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return { nodes: [], edges: edges || [] };

  // Run graph normalization and orphan healing first
  const repaired = normalizeAndRepairWorkflow(nodes, edges, options);
  const safeNodes = repaired.nodes;
  const activeEdges = repaired.edges;

  const agentNodes = safeNodes.filter(n => n.type === 'agentCore');
  const triggerNodes = safeNodes.filter(n => n.type === 'triggerNode');
  const ingestionNodes = safeNodes.filter(n => n.type === 'ingestionNode');
  const deterministicNodes = safeNodes.filter(n => n.type === 'deterministicNode');
  const approvalNodes = safeNodes.filter(n => n.type === 'approvalNode');
  const routerNodes = safeNodes.filter(n => n.type === 'routerNode');
  const outputNodes = safeNodes.filter(n => n.type === 'outputNode' || n.type === 'outputNodeV2');
  const pillarNodes = safeNodes.filter(n => n.type === 'pillar');

  // Single Agent Layout (Classical KEAOS Star Architecture)
  if (agentNodes.length <= 1) {
    const primaryAgentId = agentNodes[0]?.id || 'agent-core';
    const centerX = 540;
    const centerY = 180;

    let skillIndex = 0;
    let policyIndex = 0;
    let mcpIndex = 0;
    let modelIndex = 0;
    let toolIndex = 0;
    let gateIndex = 0;
    let triggerIndex = 0;
    let ingestIndex = 0;

    const positionedNodes = safeNodes.map(node => {
      // 1. Agent Core
      if (node.id === primaryAgentId || (agentNodes.length === 0 && node.type === 'agentCore')) {
        return { ...node, position: { x: centerX, y: centerY } };
      }

      // 2. Triggers
      if (node.type === 'triggerNode') {
        const pos = { x: centerX - 380 - (triggerIndex * 140), y: centerY + (triggerIndex * 80) };
        triggerIndex++;
        return { ...node, position: pos };
      }

      // 3. Ingestion Nodes
      if (node.type === 'ingestionNode') {
        const pos = { x: centerX - 140 - (ingestIndex * 180), y: centerY - 120 };
        ingestIndex++;
        return { ...node, position: pos };
      }

      // 4. Pillars attached to primary agent
      if (node.type === 'pillar') {
        const pillarType = node.data?.pillarType;
        switch (pillarType) {
          case 'model': {
            const pos = { x: centerX + 44 + (modelIndex * 160), y: centerY - 120 };
            modelIndex++;
            return { ...node, position: pos };
          }
          case 'gateway': {
            const pos = { x: centerX + 260 + (mcpIndex * 180), y: centerY - 180 };
            mcpIndex++;
            return { ...node, position: pos };
          }
          case 'mcp': {
            const pos = { x: centerX + 260 + (mcpIndex * 180), y: centerY - 60 };
            mcpIndex++;
            return { ...node, position: pos };
          }
          case 'policies': {
            const pos = { x: centerX - 160 - (policyIndex * 180), y: centerY + 270 };
            policyIndex++;
            return { ...node, position: pos };
          }
          case 'memory': {
            return { ...node, position: { x: centerX + 24, y: centerY + 270 } };
          }
          case 'skills': {
            const pos = { x: centerX + 180 + (skillIndex * 180), y: centerY + 270 };
            skillIndex++;
            return { ...node, position: pos };
          }
          case 'audit':
            return { ...node, position: { x: centerX - 260, y: centerY + 130 } };
          case 'observability':
            return { ...node, position: { x: centerX - 260, y: centerY + 230 } };
          case 'cost_benefit':
            return { ...node, position: { x: centerX + 360, y: centerY + 180 } };
          case 'tools': {
            const pos = { x: centerX - 140 - (toolIndex * 180), y: centerY - 120 };
            toolIndex++;
            return { ...node, position: pos };
          }
          default: {
            return { ...node, position: { x: centerX + 180 + (toolIndex * 120), y: centerY + 120 } };
          }
        }
      }

      // 5. Approvals / Routers (Mid-pipeline)
      if (node.type === 'approvalNode' || node.type === 'routerNode') {
        const pos = { x: centerX + 320 + (gateIndex * 220), y: centerY };
        gateIndex++;
        return { ...node, position: pos };
      }

      // 6. Output Studio
      if (node.type === 'outputNode' || node.type === 'outputNodeV2') {
        const hasGate = approvalNodes.length > 0 || routerNodes.length > 0;
        return { ...node, position: { x: centerX + (hasGate ? 620 : 340) + (gateIndex > 1 ? (gateIndex - 1) * 200 : 0), y: centerY } };
      }

      // 7. Deterministic Nodes
      if (node.type === 'deterministicNode') {
        return { ...node, position: { x: centerX + 320, y: centerY + 140 } };
      }

      // Fallback: guaranteed valid position
      return {
        ...node,
        position: node.position || { x: centerX + 300, y: centerY + 200 }
      };
    });

    return { nodes: positionedNodes, edges: activeEdges || [] };
  }

  // Multi-Agent Pipeline Layout (Chained horizontal agents with localized pillar orbits)
  const spacingX = 640;
  const agentPositions = {};
  agentNodes.forEach((ag, idx) => {
    agentPositions[ag.id] = { x: 300 + idx * spacingX, y: 220 };
  });

  const positionedNodes = safeNodes.map((node, i) => {
    if (node.type === 'agentCore') {
      return { ...node, position: agentPositions[node.id] || { x: 300 + i * spacingX, y: 220 } };
    }

    // Find which agent this node connects to (via edges)
    const connectedEdge = (activeEdges || []).find(e => e.source === node.id || e.target === node.id);
    const targetAgentId = connectedEdge 
      ? (agentPositions[connectedEdge.target] ? connectedEdge.target : (agentPositions[connectedEdge.source] ? connectedEdge.source : agentNodes[0]?.id))
      : agentNodes[0]?.id;

    const baseAgentPos = agentPositions[targetAgentId] || { x: 300, y: 220 };
    const ax = baseAgentPos.x;
    const ay = baseAgentPos.y;

    if (node.type === 'pillar') {
      const pt = node.data?.pillarType;
      switch (pt) {
        case 'model': return { ...node, position: { x: ax + 44, y: ay - 120 } };
        case 'tools': return { ...node, position: { x: ax - 140, y: ay - 120 } };
        case 'memory': return { ...node, position: { x: ax + 24, y: ay + 260 } };
        case 'policies': return { ...node, position: { x: ax - 160, y: ay + 260 } };
        case 'skills': return { ...node, position: { x: ax + 180, y: ay + 260 } };
        case 'mcp': return { ...node, position: { x: ax + 260, y: ay - 60 } };
        case 'gateway': return { ...node, position: { x: ax + 260, y: ay - 160 } };
        default: return { ...node, position: { x: ax + 120, y: ay + 140 } };
      }
    }

    if (node.type === 'ingestionNode') {
      return { ...node, position: { x: ax - 180, y: ay - 120 } };
    }

    if (node.type === 'triggerNode') {
      return { ...node, position: { x: ax - 360, y: ay } };
    }

    if (node.type === 'approvalNode' || node.type === 'routerNode') {
      return { ...node, position: { x: ax + 340, y: ay } };
    }

    if (node.type === 'outputNode' || node.type === 'outputNodeV2') {
      const lastAgent = agentNodes[agentNodes.length - 1];
      const lastPos = agentPositions[lastAgent?.id] || baseAgentPos;
      return { ...node, position: { x: lastPos.x + 360, y: lastPos.y } };
    }

    if (node.type === 'deterministicNode') {
      return { ...node, position: { x: ax + 300, y: ay + 140 } };
    }

    return {
      ...node,
      position: (node.position && typeof node.position.x === 'number') ? node.position : { x: ax + 200, y: ay + 100 }
    };
  });

  return { nodes: positionedNodes, edges: activeEdges || [] };
}

/**
 * System prompt instructing LLM how to parse user intent and construct KEAOS graphs
 */
export function getCanvasArchitectSystemPrompt() {
  const catalogManifest = getCatalogManifestForPrompt();
  return `You are the KEAOS Enterprise Agent Canvas Architect.
Your mission is to translate natural language user directives into fully-formed, valid KEAOS agent graph workflows.

### AUTHORITATIVE COMPONENT CATALOG (STRICT INSTITUTIONAL MANDATE):
Every peripheral node (pillar: model, skills, policies, mcp, gateway, memory, tools, audit, observability, cost_benefit) MUST originate directly from the official right-panel catalog below.
ABSOLUTELY FORBIDDEN: NEVER hallucinate, guess, or create imaginary nodes or generic placeholders (e.g. NEVER emit an empty name or a generic description like "Specialized reasoning capability attached to the agent workflow").
Every "pillar" node in your output MUST specify:
- data.pillarType: The pillar category ('model', 'skills', 'policies', 'mcp', 'gateway', 'memory', 'tools', 'audit', 'observability', 'cost_benefit')
- data.itemId: The exact catalog item ID from the manifest below (e.g. 'pol-pii-masker', 'skill-summarizer', 'model-gpt-4o', 'mcp-outlook', 'mcp-jira', 'mem-episodic-sync')
- data.name: The exact catalog item name (e.g. 'PII & Confidentiality Redactor', 'Executive Summarizer')
- data.description: The exact catalog item description from the manifest
- data.config: The component configuration object matching the catalog

${catalogManifest}

### KEAOS Architectural Rules & Node Types:
1. "agentCore": Central autonomous reasoning agent.
   - Sockets available on agentCore:
     - "model-in": connects from a "pillar" with data.pillarType="model" (max 1)
     - "skill-in": connects from a "pillar" with data.pillarType="skills" (unlimited)
     - "policy-in": connects from a "pillar" with data.pillarType="policies" (unlimited, also accepts "policies-in")
     - "mcp-in": connects from a "pillar" with data.pillarType="mcp" or "gateway" (unlimited, also accepts "gateway-in")
     - "tools-in": connects from a "pillar" with data.pillarType="tools" or "ingestionNode" (also accepts "tool-in")
     - "memory-in": connects from a "pillar" with data.pillarType="memory" (max 1)
     - "agent-in": connects from "triggerNode" (trigger-out) or upstream agent ("out")
     - "out": emits reasoning output to "outputNodeV2" ("data-in"), "approvalNode" ("in"), "routerNode" ("in"), "deterministicNode" ("in"), or downstream agents ("agent-in")
2. "pillar": Peripheral capability block strictly chosen from the catalog manifest above.
3. "ingestionNode": Data ingest for audio files, PDFs, or raw text. Connects to "tools-in" with sourceHandle="data-out".
4. "outputNodeV2": Output Viewer v2.0 (Artifact Studio). Connects to targetHandle="data-in" from sourceHandle="out".
5. "approvalNode": Human-in-the-loop sign-off gate. Connects to "in" from "out", emits from "approved-out".
6. "routerNode": Conditional branch. Connects to "in" from "out", emits from "true-out" / "false-out".
7. "deterministicNode": Python/JS code script execution. Connects to "in" from "out", emits from "out".
8. "triggerNode": Schedule Cron or Webhook trigger. Connects to "agent-in" from "trigger-out".

### CRITICAL CONNECTION INVARIANT:
- EVERY peripheral pillar or tool created MUST have an edge connecting it to the agentCore node.
- Do not leave any pillar or policy node unconnected.
- Always generate the corresponding edge in the "edges" array for every node created.

### Response Protocol:
1. IF the user asks for a capability that does NOT exist in the catalog, or if their prompt is ambiguous, DO NOT invent an imaginary node. Return JSON with:
   {
     "needsClarification": true,
     "clarificationQuestion": "Component '[requested]' is not found in the institutional catalog. Which of these available components would you like to use?",
     "clarificationOptions": [
       { "id": "pol-pii-masker", "label": "PII & Confidentiality Redactor", "description": "Detects and masks salaries, personal emails, phone numbers" },
       { "id": "pol-trade-secret", "label": "Enterprise NDA & Trade Secret Guard", "description": "Enforces strict IP boundary protection" }
     ],
     "steps": ["Analyzing user prompt", "Requested component not found in catalog; requesting selection from available institutional items"]
   }

2. IF the prompt is clear (or clarification answer is provided), return the complete synthesized workflow in JSON:
   {
     "needsClarification": false,
     "action": "create" | "edit" | "append",
     "summary": "1-sentence executive summary of the architecture",
     "steps": [
       "Identified pipeline goal",
       "Instantiated Agent Core with tailored system prompt",
       "Configured Foundation Model & Specialized Skills from catalog",
       "Attached Policy Guardrails & MCP integrations from catalog",
       "Connected Output Studio & verified typed socket rules"
     ],
     "nodes": [
       {
         "id": "agent-core-1",
         "type": "agentCore",
         "data": {
           "name": "Specific Agent Name",
           "prompt": "Detailed system instruction for the agent",
           "temperature": 0.2,
           "topP": 0.95,
           "attachedCounts": { "model": 1, "skills": 1, "mcp": 1, "tools": 1, "gateway": 0, "memory": 1, "policies": 1 }
         }
       },
       {
         "id": "node-model-1",
         "type": "pillar",
         "data": {
           "pillarType": "model",
           "itemId": "model-gpt-4o",
           "name": "GPT-4o",
           "description": "High-intelligence flagship foundation model for deep reasoning.",
           "config": { "provider": "openai", "modelId": "gpt-4o", "temperature": 0.2 }
         }
       },
       {
         "id": "node-policy-1",
         "type": "pillar",
         "data": {
           "pillarType": "policies",
           "itemId": "pol-pii-masker",
           "name": "PII & Confidentiality Redactor",
           "description": "Detects and masks personal data, salaries, phone numbers, and NDA terms.",
           "config": { "redactSalaries": true, "maskEmails": true }
         }
       },
       {
         "id": "node-skill-1",
         "type": "pillar",
         "data": {
           "pillarType": "skills",
           "itemId": "skill-summarizer",
           "name": "Executive Summarizer",
           "description": "Generates concise, bulleted executive synopses with key outcomes.",
           "config": { "conciseness": "high", "focus": "executive" }
         }
       }
     ],
     "edges": [
       {
         "id": "edge-model-to-agent",
         "source": "node-model-1",
         "sourceHandle": "out",
         "target": "agent-core-1",
         "targetHandle": "model-in",
         "type": "deletable",
         "animated": true
       },
       {
         "id": "edge-policy-to-agent",
         "source": "node-policy-1",
         "sourceHandle": "out",
         "target": "agent-core-1",
         "targetHandle": "policy-in",
         "type": "deletable",
         "animated": true
       },
       {
         "id": "edge-skill-to-agent",
         "source": "node-skill-1",
         "sourceHandle": "out",
         "target": "agent-core-1",
         "targetHandle": "skill-in",
         "type": "deletable",
         "animated": true
       }
     ]
   }

Always return STRICT valid JSON without markdown wrapping or conversational commentary.`;
}

export const CANVAS_ARCHITECT_SYSTEM_PROMPT = getCanvasArchitectSystemPrompt();

/**
 * Intelligent Semantic Intent Engine (Local Fallback & Rapid Intent Extractor)
 * Generates rich, authentic KEAOS workflows when offline or as robust baseline.
 */
export function buildDynamicWorkflowLocally({ prompt, existingNodes = [], existingEdges = [], clarificationAnswer = null }) {
  const text = (prompt || '').toLowerCase();
  const answer = (clarificationAnswer || '').toLowerCase();
  const fullText = `${text} ${answer}`;

  // Incremental Branch: If existing canvas has an AgentCore and user directive is adding/wiring/replacing
  const existingAgent = existingNodes.find(n => n.type === 'agentCore');
  const isIncrementalDirective = Boolean(
    existingAgent &&
    /\b(add|connect|attach|wire|link|append|also|now|replace|update|change|include|memory|skill|policy|guardrail|mcp|tool|model)\b/i.test(text)
  );

  if (isIncrementalDirective) {
    // Resolve which component the user wants to add or replace
    let matchedItem = null;
    let pillarType = 'skills';
    let targetHandle = 'skill-in';

    if (text.includes('memory') || text.includes('vector') || text.includes('episodic') || text.includes('sync')) {
      pillarType = 'memory';
      targetHandle = 'memory-in';
      matchedItem = resolveCatalogItem('mem-episodic-sync', 'memory') || resolveCatalogItem('memory', 'memory');
    } else if (text.includes('pii') || text.includes('mask') || text.includes('redact') || text.includes('confidential')) {
      pillarType = 'policies';
      targetHandle = 'policy-in';
      matchedItem = resolveCatalogItem('pol-pii-masker', 'policies');
    } else if (text.includes('nda') || text.includes('trade secret') || text.includes('secret')) {
      pillarType = 'policies';
      targetHandle = 'policy-in';
      matchedItem = resolveCatalogItem('pol-trade-secret', 'policies');
    } else if (text.includes('guardrail') || text.includes('policy') || text.includes('compliance')) {
      pillarType = 'policies';
      targetHandle = 'policy-in';
      matchedItem = resolveCatalogItem('pol-pii-masker', 'policies');
    } else if (text.includes('summariz') || text.includes('summary') || text.includes('tldr')) {
      pillarType = 'skills';
      targetHandle = 'skill-in';
      matchedItem = resolveCatalogItem('skill-summarizer', 'skills');
    } else if (text.includes('action') || text.includes('task') || text.includes('owner')) {
      pillarType = 'skills';
      targetHandle = 'skill-in';
      matchedItem = resolveCatalogItem('skill-action-extractor', 'skills');
    } else if (text.includes('decision')) {
      pillarType = 'skills';
      targetHandle = 'skill-in';
      matchedItem = resolveCatalogItem('skill-decisions', 'skills');
    } else if (text.includes('mom') || text.includes('minute')) {
      pillarType = 'skills';
      targetHandle = 'skill-in';
      matchedItem = resolveCatalogItem('skill-mom', 'skills');
    } else if (text.includes('sentiment') || text.includes('conflict')) {
      pillarType = 'skills';
      targetHandle = 'skill-in';
      matchedItem = resolveCatalogItem('skill-sentiment', 'skills');
    } else if (text.includes('slack')) {
      pillarType = 'mcp';
      targetHandle = 'mcp-in';
      matchedItem = resolveCatalogItem('mcp-slack', 'mcp');
    } else if (text.includes('jira')) {
      pillarType = 'mcp';
      targetHandle = 'mcp-in';
      matchedItem = resolveCatalogItem('mcp-jira', 'mcp');
    } else if (text.includes('outlook') || text.includes('email') || text.includes('mail')) {
      pillarType = 'mcp';
      targetHandle = 'mcp-in';
      matchedItem = resolveCatalogItem('mcp-outlook', 'mcp');
    } else if (text.includes('github') || text.includes('git')) {
      pillarType = 'mcp';
      targetHandle = 'mcp-in';
      matchedItem = resolveCatalogItem('mcp-github', 'mcp');
    } else if (text.includes('gpt-4') || text.includes('openai')) {
      pillarType = 'model';
      targetHandle = 'model-in';
      matchedItem = resolveCatalogItem('model-gpt-4o', 'model');
    } else if (text.includes('claude') || text.includes('sonnet') || text.includes('anthropic')) {
      pillarType = 'model';
      targetHandle = 'model-in';
      matchedItem = resolveCatalogItem('model-claude-3-5-sonnet', 'model');
    } else if (text.includes('gemini') || text.includes('google')) {
      pillarType = 'model';
      targetHandle = 'model-in';
      matchedItem = resolveCatalogItem('model-gemini-2-flash', 'model');
    } else if (text.includes('audio') || text.includes('voice') || text.includes('transcript')) {
      const ingestNodeId = `node-ingest-${Date.now().toString().slice(-4)}`;
      const newNode = {
        id: ingestNodeId,
        type: 'ingestionNode',
        position: { x: (existingAgent.position?.x || 540) - 140, y: (existingAgent.position?.y || 180) - 120 },
        data: {
          title: 'Audio & Call Transcriber',
          content: '',
          status: 'idle',
          fileType: 'audio',
          isExpanded: false
        }
      };
      const newEdge = {
        id: `edge-${ingestNodeId}-to-${existingAgent.id}`,
        source: ingestNodeId,
        sourceHandle: 'data-out',
        target: existingAgent.id,
        targetHandle: 'tools-in',
        type: 'deletable',
        animated: true,
        style: { stroke: '#0091DA', strokeWidth: 2 }
      };
      return {
        needsClarification: false,
        action: 'append',
        summary: `Attached Audio & Call Transcriber to ${existingAgent.data?.name || 'Agent'}.`,
        steps: ['Resolved Ingestion Node from catalog', `Wired to tools-in socket on ${existingAgent.id}`],
        nodes: [newNode],
        edges: [newEdge]
      };
    } else {
      matchedItem = resolveCatalogItem(text);
      if (matchedItem) {
        pillarType = matchedItem.pillarType || 'skills';
        targetHandle = pillarType === 'model' ? 'model-in'
          : pillarType === 'policies' ? 'policy-in'
          : pillarType === 'memory' ? 'memory-in'
          : pillarType === 'mcp' || pillarType === 'gateway' ? 'mcp-in'
          : pillarType === 'tools' ? 'tools-in'
          : 'skill-in';
      }
    }

    if (matchedItem) {
      const isExplicitConnect = /\b(connect|wire|link|attach|reconnect)\b/i.test(text);
      const existingMatchingNode = existingNodes.find(n => 
        n.id !== existingAgent.id && 
        (n.data?.pillarType === pillarType || n.data?.itemId === matchedItem.id || (n.data?.name && n.data.name.toLowerCase().includes(matchedItem.name.toLowerCase())))
      );

      // If user is explicitly reconnecting an existing node already present on canvas, reuse it instead of duplicating
      if (existingMatchingNode && isExplicitConnect && !text.includes('add') && !text.includes('new')) {
        const reconnectEdge = {
          id: `edge-${existingMatchingNode.id}-to-${existingAgent.id}`,
          source: existingMatchingNode.id,
          sourceHandle: 'out',
          target: existingAgent.id,
          targetHandle,
          type: 'deletable',
          animated: true
        };
        return {
          needsClarification: false,
          action: 'append',
          summary: `Connected ${existingMatchingNode.data?.name || matchedItem.name} to ${existingAgent.data?.name || 'Agent'}.`,
          steps: [`Identified existing component: "${existingMatchingNode.data?.name || matchedItem.name}" on canvas`, `Wired to ${targetHandle} socket on ${existingAgent.id}`],
          nodes: [existingMatchingNode],
          edges: [reconnectEdge]
        };
      }

      const newNodeId = `node-${pillarType}-${Date.now().toString().slice(-4)}`;
      const newNode = {
        id: newNodeId,
        type: 'pillar',
        position: { x: (existingAgent.position?.x || 540) + 24, y: (existingAgent.position?.y || 180) + 270 },
        data: {
          pillarType,
          itemId: matchedItem.id,
          name: matchedItem.name,
          description: matchedItem.description,
          config: { ...(matchedItem.config || {}) }
        }
      };
      const newEdge = {
        id: `edge-${newNodeId}-to-${existingAgent.id}`,
        source: newNodeId,
        sourceHandle: 'out',
        target: existingAgent.id,
        targetHandle,
        type: 'deletable',
        animated: true
      };
      return {
        needsClarification: false,
        action: 'append',
        summary: `Attached ${matchedItem.name} to ${existingAgent.data?.name || 'Agent'}.`,
        steps: [`Identified institutional component: "${matchedItem.name}"`, `Wired to ${targetHandle} socket on ${existingAgent.id}`],
        nodes: [newNode],
        edges: [newEdge]
      };
    }
  }

  // Check if ambiguous input requires clarification
  const isVague = text.length < 15 && !text.includes('meeting') && !text.includes('support') && !text.includes('review') && !text.includes('jira') && !text.includes('slack');
  if (isVague && !clarificationAnswer) {
    return {
      needsClarification: true,
      clarificationQuestion: 'What primary task should this enterprise agent execute?',
      clarificationOptions: [
        { id: 'meeting-intel', label: 'Meeting Intelligence', description: 'Transcribe audio, extract action items & draft follow-ups' },
        { id: 'customer-support', label: 'Support & Jira Triage', description: 'Analyze tickets, check policy, query Jira & notify Slack' },
        { id: 'code-review', label: 'Code Review & Security', description: 'Audit GitHub pull requests & enforce security compliance' },
        { id: 'document-rag', label: 'Document Q&A & Search', description: 'Parse enterprise documents with episodic vector memory' }
      ],
      steps: [
        'Analyzing request intent',
        'Identified broad enterprise scope; presenting architectural use cases'
      ],
      nodes: [],
      edges: []
    };
  }

  // Derive specialized agent attributes based on semantic tokens
  let agentName = 'Autonomous Enterprise Agent';
  let agentPrompt = 'Execute enterprise multi-step workflow with analytical fidelity and compliance enforcement.';
  let isMeeting = fullText.includes('meeting') || fullText.includes('transcript') || fullText.includes('call') || fullText.includes('audio');
  let isSupport = fullText.includes('support') || fullText.includes('customer') || fullText.includes('ticket') || fullText.includes('helpdesk');
  let isCode = fullText.includes('code') || fullText.includes('github') || fullText.includes('pr') || fullText.includes('review') || fullText.includes('repo');
  let isApprovalNeeded = fullText.includes('approv') || fullText.includes('human') || fullText.includes('review') || fullText.includes('gate');
  let hasJira = fullText.includes('jira');
  let hasSlack = fullText.includes('slack');
  let hasOutlook = fullText.includes('email') || fullText.includes('mail') || fullText.includes('outlook');
  let hasAudio = fullText.includes('audio') || fullText.includes('voice') || fullText.includes('recording') || fullText.includes('speech');

  // Foundation Model Choice from Official Catalog
  let selectedProvider = 'google';
  let selectedModelId = 'gemini-2.0-flash';
  let modelSearchKey = 'gemini-2.0-flash';
  if (fullText.includes('gpt-4') || fullText.includes('openai')) {
    selectedProvider = 'openai';
    selectedModelId = 'gpt-4o';
    modelSearchKey = 'model-gpt-4o';
  } else if (fullText.includes('claude') || fullText.includes('anthropic') || fullText.includes('sonnet')) {
    selectedProvider = 'anthropic';
    selectedModelId = 'claude-3-5-sonnet-20241022';
    modelSearchKey = 'model-claude-3-5-sonnet';
  } else if (fullText.includes('ollama') || fullText.includes('llama') || fullText.includes('local')) {
    selectedProvider = 'ollama';
    selectedModelId = 'llama3.3';
    modelSearchKey = 'model-ollama-llama-3-3';
  }

  const matchedModel = resolveCatalogItem(modelSearchKey, 'model') || resolveCatalogItem('model-gpt-4o', 'model');
  const modelName = matchedModel?.name || 'GPT-4o';
  const modelDesc = matchedModel?.description || `${modelName} foundation reasoning model with structured JSON outputs.`;
  const modelConfig = { ...(matchedModel?.config || {}), provider: selectedProvider, modelId: selectedModelId, temperature: 0.2, topP: 0.95 };

  if (isMeeting) {
    agentName = 'Meeting Intelligence Agent';
    agentPrompt = 'Analyze multi-speaker transcripts, extract decisions, action items with owners, and draft follow-up communications.';
  } else if (isSupport) {
    agentName = 'Customer Support & Triage Agent';
    agentPrompt = 'Analyze incoming customer support tickets, classify severity, check compliance policies, and dispatch resolutions.';
  } else if (isCode) {
    agentName = 'Autonomous Code Reviewer';
    agentPrompt = 'Perform deep static analysis on GitHub PR diffs, detect anti-patterns, check security policies, and recommend fixes.';
  }

  const nodes = [];
  const edges = [];
  const steps = [];

  // 1. Agent Core
  const agentId = `agent-core-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: agentId,
    type: 'agentCore',
    position: { x: 540, y: 180 },
    data: {
      name: agentName,
      framework: FRAMEWORKS[0],
      prompt: agentPrompt,
      temperature: 0.2,
      topP: 0.95,
      attachedCounts: { model: 1, skills: 1, mcp: (hasJira || hasSlack ? 1 : 0), tools: 1, gateway: 0, memory: 1, policies: 1 }
    }
  });
  steps.push(`Configured Agent Core: "${agentName}" with analytical system prompt`);

  // 2. Foundation Model (Hydrated strictly from Catalog)
  const modelNodeId = `node-model-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: modelNodeId,
    type: 'pillar',
    position: { x: 584, y: 60 },
    data: {
      pillarType: 'model',
      itemId: matchedModel?.id || 'model-gpt-4o',
      name: modelName,
      description: modelDesc,
      config: modelConfig
    }
  });
  edges.push({
    id: `edge-${modelNodeId}-to-${agentId}`,
    source: modelNodeId,
    sourceHandle: 'out',
    target: agentId,
    targetHandle: 'model-in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#00338D', strokeWidth: 2 }
  });
  steps.push(`Attached Foundation Model: ${modelName} to model-in socket`);

  // 3. Ingestion Node
  const ingestNodeId = `node-ingest-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: ingestNodeId,
    type: 'ingestionNode',
    position: { x: 420, y: 60 },
    data: {
      title: hasAudio ? 'Audio & Call Transcriber' : 'Universal Document & Text Ingest',
      content: '',
      status: 'idle',
      fileType: hasAudio ? 'audio' : 'auto',
      isExpanded: false
    }
  });
  edges.push({
    id: `edge-${ingestNodeId}-to-${agentId}`,
    source: ingestNodeId,
    sourceHandle: 'data-out',
    target: agentId,
    targetHandle: 'tools-in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#0091DA', strokeWidth: 2 }
  });
  steps.push(`Wired Ingestion Node: ${hasAudio ? 'Audio Transcriber' : 'Document Ingest'} to tools-in socket`);

  // 4. Memory Node (Hydrated strictly from Catalog)
  const matchedMemory = resolveCatalogItem('mem-episodic-sync', 'memory');
  const memoryNodeId = `node-memory-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: memoryNodeId,
    type: 'pillar',
    position: { x: 564, y: 450 },
    data: {
      pillarType: 'memory',
      itemId: matchedMemory?.id || 'mem-episodic-sync',
      name: matchedMemory?.name || 'Episodic Sync Memory',
      description: matchedMemory?.description || 'Maintains cross-session commitments and vector search.',
      config: matchedMemory?.config || { ttlDays: 90, store: 'vector-sqlite' }
    }
  });
  edges.push({
    id: `edge-${memoryNodeId}-to-${agentId}`,
    source: memoryNodeId,
    sourceHandle: 'out',
    target: agentId,
    targetHandle: 'memory-in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#483698', strokeWidth: 2 }
  });
  steps.push('Connected Episodic Memory to memory-in socket');

  // 5. Policy Guardrail Node (Hydrated strictly from Catalog)
  let policySearchKey = 'pol-pii-masker';
  if (fullText.includes('nda') || fullText.includes('trade secret')) {
    policySearchKey = 'pol-trade-secret';
  }
  const matchedPolicy = resolveCatalogItem(policySearchKey, 'policies') || resolveCatalogItem('pol-pii-masker', 'policies');
  const policyNodeId = `node-policy-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: policyNodeId,
    type: 'pillar',
    position: { x: 380, y: 450 },
    data: {
      pillarType: 'policies',
      itemId: matchedPolicy?.id || 'pol-pii-masker',
      name: matchedPolicy?.name || 'PII & Confidentiality Redactor',
      description: matchedPolicy?.description || 'Detects and masks personal data, salaries, phone numbers, and NDA terms.',
      config: matchedPolicy?.config || { redactSalaries: true, maskEmails: true }
    }
  });
  edges.push({
    id: `edge-${policyNodeId}-to-${agentId}`,
    source: policyNodeId,
    sourceHandle: 'out',
    target: agentId,
    targetHandle: 'policy-in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#6D2077', strokeWidth: 2 }
  });
  steps.push(`Enforced Policy Guardrail: ${matchedPolicy?.name || 'PII Redactor'} on policy-in socket`);

  // 6. Skill Nodes (Hydrated strictly from Catalog: Summarizer, Action Items, MoM, Sentiment, Decisions)
  const skillsToAttach = [];
  if (fullText.includes('sentiment') || fullText.includes('conflict')) {
    const item = resolveCatalogItem('skill-sentiment', 'skills');
    if (item) skillsToAttach.push(item);
  }
  if (fullText.includes('action') || isSupport || isMeeting) {
    const item = resolveCatalogItem('skill-action-extractor', 'skills');
    if (item) skillsToAttach.push(item);
  }
  if (fullText.includes('mom') || fullText.includes('minutes')) {
    const item = resolveCatalogItem('skill-mom', 'skills');
    if (item) skillsToAttach.push(item);
  }
  if (fullText.includes('decision')) {
    const item = resolveCatalogItem('skill-decisions', 'skills');
    if (item) skillsToAttach.push(item);
  }
  if (fullText.includes('summar') || fullText.includes('executive') || skillsToAttach.length === 0) {
    const item = resolveCatalogItem('skill-summarizer', 'skills');
    if (item && !skillsToAttach.some(s => s.id === item.id)) skillsToAttach.unshift(item);
  }

  skillsToAttach.forEach((sk, idx) => {
    const skillNodeId = `node-skill-${sk.id}-${Date.now().toString().slice(-4)}`;
    nodes.push({
      id: skillNodeId,
      type: 'pillar',
      position: { x: 750 + (idx * 160), y: 450 },
      data: {
        pillarType: 'skills',
        itemId: sk.id,
        name: sk.name,
        description: sk.description,
        config: sk.config || {}
      }
    });
    edges.push({
      id: `edge-${skillNodeId}-to-${agentId}`,
      source: skillNodeId,
      sourceHandle: 'out',
      target: agentId,
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#009A44', strokeWidth: 2 }
    });
    steps.push(`Loaded Specialized Skill: ${sk.name} on skill-in socket`);
  });

  // 7. MCP Integrations (Hydrated strictly from Catalog: Slack / Jira / Outlook / GitHub / Neo4j)
  if (hasSlack || hasJira || hasOutlook || isSupport || isCode || fullText.includes('neo4j') || fullText.includes('graph')) {
    let mcpSearchKey = 'mcp-outlook';
    if (hasSlack) mcpSearchKey = 'mcp-slack';
    else if (hasJira) mcpSearchKey = 'mcp-jira';
    else if (isCode || fullText.includes('github')) mcpSearchKey = 'mcp-github';
    else if (fullText.includes('neo4j') || fullText.includes('graph')) mcpSearchKey = 'mcp-neo4j';

    const matchedMcp = resolveCatalogItem(mcpSearchKey, 'mcp') || resolveCatalogItem('mcp-outlook', 'mcp');
    const mcpNodeId = `node-mcp-${Date.now().toString().slice(-4)}`;
    nodes.push({
      id: mcpNodeId,
      type: 'pillar',
      position: { x: 800, y: -20 },
      data: {
        pillarType: 'mcp',
        itemId: matchedMcp?.id || 'mcp-outlook',
        name: matchedMcp?.name || 'Microsoft Outlook MCP',
        description: matchedMcp?.description || 'Enterprise email and calendar integration.',
        tools: matchedMcp?.tools || [],
        config: matchedMcp?.config || { transport: 'sse' }
      }
    });
    edges.push({
      id: `edge-${mcpNodeId}-to-${agentId}`,
      source: mcpNodeId,
      sourceHandle: 'out',
      target: agentId,
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2 }
    });
    steps.push(`Integrated Live MCP Server: ${matchedMcp?.name || 'MCP Server'} to mcp-in socket`);
  }

  // 8. Human-in-the-loop Approval Gate (if requested)
  let lastDownstreamId = agentId;
  let lastSourceHandle = 'output-out';
  if (isApprovalNeeded) {
    const approvalNodeId = `node-approval-${Date.now().toString().slice(-4)}`;
    nodes.push({
      id: approvalNodeId,
      type: 'approvalNode',
      position: { x: 860, y: 180 },
      data: {
        title: 'Executive Approval Gate',
        approvalStatus: 'idle',
        thresholds: { autoApproveBelowScore: 0.8 }
      }
    });
    edges.push({
      id: `edge-${agentId}-to-${approvalNodeId}`,
      source: agentId,
      sourceHandle: 'output-out',
      target: approvalNodeId,
      targetHandle: 'in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#EAAA00', strokeWidth: 2 }
    });
    lastDownstreamId = approvalNodeId;
    lastSourceHandle = 'approved-out';
    steps.push('Inserted Human-in-the-Loop Approval Gate before final output');
  }

  // 9. Output Viewer v2.0 (Artifact Studio)
  const outputNodeId = `node-output-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: outputNodeId,
    type: 'outputNodeV2',
    position: { x: isApprovalNeeded ? 1160 : 880, y: 180 },
    data: {
      title: 'Agent Intelligence Output',
      outputContent: '',
      status: 'idle',
      runsHistory: []
    }
  });
  edges.push({
    id: `edge-${lastDownstreamId}-to-${outputNodeId}`,
    source: lastDownstreamId,
    sourceHandle: lastSourceHandle,
    target: outputNodeId,
    targetHandle: 'in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#00338D', strokeWidth: 2 }
  });
  steps.push('Connected Output Viewer v2.0 (Artifact Studio) for live results & export');

  const layout = computeArchitectLayout(nodes, edges);

  return {
    needsClarification: false,
    action: 'create',
    summary: `Synthesized "${agentName}" with ${modelName}, policy guardrails, skills, and Output Viewer v2.0.`,
    steps,
    nodes: layout.nodes,
    edges: layout.edges
  };
}

/**
 * Universal Synthesize Function
 * Calls live LLM if available, otherwise seamlessly uses local semantic intent synthesis.
 */
export async function synthesizeCanvasWorkflow({
  prompt,
  existingNodes = [],
  existingEdges = [],
  clarificationAnswer = null,
  provider = 'google',
  modelId = 'gemini-2.0-flash',
  isEditMode = false
}) {
  const credential = getProviderCredential(provider);
  const hasLiveApi = Boolean(credential) || provider === 'ollama';

  // 1. If no live API is available, immediately run intelligent local synthesis
  if (!hasLiveApi) {
    return buildDynamicWorkflowLocally({
      prompt,
      existingNodes,
      existingEdges,
      clarificationAnswer
    });
  }

  // 2. Build live Multi-LLM prompt
  const primaryAgent = existingNodes.find(n => n.type === 'agentCore');
  const existingSummary = existingNodes.length > 0
    ? `Current canvas has ${existingNodes.length} nodes:
${existingNodes.map(n => `- Node ID: "${n.id}", Type: "${n.type}", Name: "${n.data?.name || n.data?.title || n.id}", PillarType: "${n.data?.pillarType || ''}"`).join('\n')}
Existing connections:
${existingEdges.map(e => `- ${e.source} (${e.sourceHandle || 'out'}) -> ${e.target} (${e.targetHandle})`).join('\n')}
Primary Agent Core ID: "${primaryAgent ? primaryAgent.id : 'agent-core-1'}"`
    : 'Canvas is currently blank.';

  const userQuery = `User Directive: "${prompt}"
${clarificationAnswer ? `Clarification Provided by User: "${clarificationAnswer}"` : ''}
${existingSummary}
Instruction: ${isEditMode 
  ? `Modify or append to the existing canvas. IMPORTANT: When adding components, use action="append" and connect them directly to the primary agentCore ID "${primaryAgent ? primaryAgent.id : 'agent-core-1'}". Keep all existing node IDs stable and ensure every new node has a corresponding edge in "edges".` 
  : 'Generate a complete, optimal workflow graph for this directive.'}
Respond strictly in JSON matching the protocol.`;

  try {
    const res = await executeUniversalChat({
      provider,
      modelId,
      systemPrompt: getCanvasArchitectSystemPrompt(),
      messages: [{ role: 'user', content: userQuery }],
      temperature: 0.2
    });

    const raw = res.text || '';
    let parsed = null;

    // Extract JSON block if surrounded by markdown fences
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = jsonMatch ? jsonMatch[1].trim() : raw.trim();

    try {
      parsed = JSON.parse(candidate);
    } catch {
      // Fallback: search for first '{' and last '}'
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      }
    }

    if (parsed && typeof parsed === 'object') {
      if (parsed.needsClarification) {
        return {
          needsClarification: true,
          clarificationQuestion: parsed.clarificationQuestion || 'Please clarify your requirement:',
          clarificationOptions: Array.isArray(parsed.clarificationOptions) ? parsed.clarificationOptions : [],
          steps: parsed.steps || ['Analyzing request', 'Clarification requested'],
          nodes: [],
          edges: []
        };
      }

      if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
        const layout = computeArchitectLayout(parsed.nodes, parsed.edges || []);
        return {
          needsClarification: false,
          action: parsed.action || (isEditMode ? 'append' : 'create'),
          summary: parsed.summary || 'Constructed workflow topology successfully.',
          steps: Array.isArray(parsed.steps) ? parsed.steps : ['Graph synthesized and verified'],
          nodes: layout.nodes,
          edges: layout.edges
        };
      }
    }

    // If LLM returned text but not valid graph structure, use local synthesis
    return buildDynamicWorkflowLocally({
      prompt,
      existingNodes,
      existingEdges,
      clarificationAnswer
    });
  } catch (err) {
    console.warn('Live LLM Canvas Architect synthesis encountered error; using local synthesis engine:', err);
    return buildDynamicWorkflowLocally({
      prompt,
      existingNodes,
      existingEdges,
      clarificationAnswer
    });
  }
}
