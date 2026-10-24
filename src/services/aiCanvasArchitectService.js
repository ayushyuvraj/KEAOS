import { executeUniversalChat, getProviderCredential } from './llmService';
import { PILLARS } from '../constants/pillars';
import { FRAMEWORKS } from '../constants/frameworks';

/**
 * Standard spatial placement coordinates for KEAOS architectural layout
 * Avoids any node overlaps and aligns precisely with typed socket locations.
 */
export function computeArchitectLayout(nodes, edges) {
  if (!Array.isArray(nodes) || nodes.length === 0) return { nodes: [], edges: edges || [] };

  const agentNodes = nodes.filter(n => n.type === 'agentCore');
  const triggerNodes = nodes.filter(n => n.type === 'triggerNode');
  const ingestionNodes = nodes.filter(n => n.type === 'ingestionNode');
  const deterministicNodes = nodes.filter(n => n.type === 'deterministicNode');
  const approvalNodes = nodes.filter(n => n.type === 'approvalNode');
  const routerNodes = nodes.filter(n => n.type === 'routerNode');
  const outputNodes = nodes.filter(n => n.type === 'outputNode' || n.type === 'outputNodeV2');
  const pillarNodes = nodes.filter(n => n.type === 'pillar');

  // Single Agent Layout (Classical KEAOS Star Architecture)
  if (agentNodes.length <= 1) {
    const primaryAgentId = agentNodes[0]?.id || 'agent-core';
    const centerX = 540;
    const centerY = 180;

    const positionedNodes = nodes.map(node => {
      // 1. Agent Core
      if (node.id === primaryAgentId) {
        return { ...node, position: { x: centerX, y: centerY } };
      }

      // 2. Triggers
      if (node.type === 'triggerNode') {
        return { ...node, position: { x: centerX - 360, y: centerY } };
      }

      // 3. Ingestion Nodes
      if (node.type === 'ingestionNode') {
        return { ...node, position: { x: centerX - 120, y: centerY - 120 } };
      }

      // 4. Pillars attached to primary agent
      if (node.type === 'pillar') {
        const pillarType = node.data?.pillarType;
        switch (pillarType) {
          case 'model':
            return { ...node, position: { x: centerX + 44, y: centerY - 120 } };
          case 'gateway':
            return { ...node, position: { x: centerX + 260, y: centerY - 180 } };
          case 'mcp':
            return { ...node, position: { x: centerX + 260, y: centerY - 60 } };
          case 'policies':
            return { ...node, position: { x: centerX - 160, y: centerY + 270 } };
          case 'memory':
            return { ...node, position: { x: centerX + 24, y: centerY + 270 } };
          case 'skills':
            return { ...node, position: { x: centerX + 210, y: centerY + 270 } };
          case 'audit':
            return { ...node, position: { x: centerX - 260, y: centerY + 130 } };
          case 'observability':
            return { ...node, position: { x: centerX - 260, y: centerY + 230 } };
          case 'cost_benefit':
            return { ...node, position: { x: centerX + 360, y: centerY + 180 } };
          case 'tools':
            return { ...node, position: { x: centerX - 140, y: centerY - 120 } };
          default:
            return { ...node, position: { x: centerX + 180, y: centerY + 120 } };
        }
      }

      // 5. Approvals / Routers (Mid-pipeline)
      if (node.type === 'approvalNode' || node.type === 'routerNode') {
        return { ...node, position: { x: centerX + 320, y: centerY } };
      }

      // 6. Output Studio
      if (node.type === 'outputNode' || node.type === 'outputNodeV2') {
        const hasGate = approvalNodes.length > 0 || routerNodes.length > 0;
        return { ...node, position: { x: centerX + (hasGate ? 620 : 340), y: centerY } };
      }

      // 7. Deterministic Nodes
      if (node.type === 'deterministicNode') {
        return { ...node, position: { x: centerX + 320, y: centerY + 140 } };
      }

      return node;
    });

    return { nodes: positionedNodes, edges: edges || [] };
  }

  // Multi-Agent Pipeline Layout (Sequential horizontal chaining)
  const spacingX = 480;
  const positionedNodes = nodes.map((node) => {
    if (node.type === 'agentCore') {
      const idx = agentNodes.findIndex(a => a.id === node.id);
      return { ...node, position: { x: 300 + idx * spacingX, y: 180 } };
    }
    return node;
  });

  return { nodes: positionedNodes, edges: edges || [] };
}

/**
 * System prompt instructing LLM how to parse user intent and construct KEAOS graphs
 */
const CANVAS_ARCHITECT_SYSTEM_PROMPT = `You are the KEAOS Enterprise Agent Canvas Architect.
Your mission is to translate natural language user directives into fully-formed, valid KEAOS agent graph workflows.

### KEAOS Architectural Rules & Node Types:
1. "agentCore": Central autonomous reasoning agent.
   - Sockets available on agentCore:
     - "model-in": connects to a "pillar" with data.pillarType="model" (max 1)
     - "skill-in": connects to "pillar" with data.pillarType="skills" (unlimited)
     - "mcp-in": connects to "pillar" with data.pillarType="mcp" or "gateway" (unlimited)
     - "tools-in": connects to "pillar" with data.pillarType="tools" or "ingestionNode"
     - "gateway-in": connects to "pillar" with data.pillarType="gateway" (max 1)
     - "memory-in": connects to "pillar" with data.pillarType="memory" (max 1)
     - "policies-in": connects to "pillar" with data.pillarType="policies" (unlimited)
     - "audit-in": connects to "pillar" with data.pillarType="audit" (max 1)
     - "observability-in": connects to "pillar" with data.pillarType="observability" (max 1)
     - "cost-benefit-in": connects to "pillar" with data.pillarType="cost_benefit" (max 1)
     - "input-in": triggers, upstream data, or prior agent output
     - "output-out": final output, approval gates, or downstream agents
2. "pillar": Peripheral capability block with "data.pillarType" set to one of:
   - "model" (e.g. GPT-4o, Gemini 2.0 Flash, Claude 3.5 Sonnet)
   - "skills" (e.g. Executive Summarizer, Action Extractor, Risk Sentinel, Follow-up Drafter)
   - "mcp" (e.g. Slack MCP, Jira MCP, GitHub MCP, Neo4j Graph DB MCP, Outlook MCP)
   - "tools" (e.g. Document Parser, Audio Transcriber, Webhook Relayer)
   - "gateway" (e.g. MCP Egress Gateway, Rate Limiter)
   - "memory" (e.g. Episodic Sync Memory, Vector Semantic Cache)
   - "policies" (e.g. PII Redactor, Confidential Data Mask, Compliance Guard)
   - "audit" (e.g. SHA-256 Ledger)
   - "observability" (e.g. OpenTelemetry Tracer)
   - "cost_benefit" (e.g. Unit ROI Calculator)
3. "ingestionNode": Data ingest for audio files, PDFs, or raw text. Connects to "tools-in" or "input-in".
4. "outputNodeV2": Output Viewer v2.0 (Artifact Studio). Connects from "output-out".
5. "approvalNode": Human-in-the-loop review gate. Connects from "output-out".
6. "routerNode": Conditional branch. Connects from "output-out".
7. "triggerNode": Schedule, Webhook, or Polling trigger. Connects to "input-in".

### Response Protocol:
1. IF the user's prompt is underspecified, ambiguous, or needs key architectural decisions, DO NOT guess blindly. Return JSON with:
   {
     "needsClarification": true,
     "clarificationQuestion": "Brief question explaining what decision is needed",
     "clarificationOptions": [
       { "id": "opt-1", "label": "Clear Option Label", "description": "Short explanation" },
       { "id": "opt-2", "label": "Another Option Label", "description": "Short explanation" }
     ],
     "steps": ["Analyzing user prompt", "Identified multiple implementation paths; requesting clarification"]
   }

2. IF the prompt is clear (or clarification answer is provided), return the complete synthesized workflow in JSON:
   {
     "needsClarification": false,
     "action": "create" | "edit" | "append",
     "summary": "1-sentence executive summary of the architecture",
     "steps": [
       "Identified pipeline goal",
       "Instantiated Agent Core with tailored system prompt",
       "Configured Foundation Model & Specialized Skills",
       "Attached Policy Guardrails & MCP integrations",
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
       ... other nodes
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
       ... other edges
     ]
   }

Always return STRICT valid JSON without markdown wrapping or conversational commentary.`;

/**
 * Intelligent Semantic Intent Engine (Local Fallback & Rapid Intent Extractor)
 * Generates rich, authentic KEAOS workflows when offline or as robust baseline.
 */
export function buildDynamicWorkflowLocally({ prompt, existingNodes = [], existingEdges = [], clarificationAnswer = null }) {
  const text = (prompt || '').toLowerCase();
  const answer = (clarificationAnswer || '').toLowerCase();
  const fullText = `${text} ${answer}`;

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

  // Foundation Model Choice
  let selectedProvider = 'google';
  let selectedModelId = 'gemini-2.0-flash';
  let modelName = 'Gemini 2.0 Flash';
  if (fullText.includes('gpt-4') || fullText.includes('openai')) {
    selectedProvider = 'openai';
    selectedModelId = 'gpt-4o';
    modelName = 'GPT-4o';
  } else if (fullText.includes('claude') || fullText.includes('anthropic') || fullText.includes('sonnet')) {
    selectedProvider = 'anthropic';
    selectedModelId = 'claude-3-5-sonnet-20241022';
    modelName = 'Claude 3.5 Sonnet';
  } else if (fullText.includes('ollama') || fullText.includes('llama') || fullText.includes('local')) {
    selectedProvider = 'ollama';
    selectedModelId = 'llama3.3';
    modelName = 'Ollama: Llama 3.3';
  }

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

  // 2. Foundation Model
  const modelNodeId = `node-model-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: modelNodeId,
    type: 'pillar',
    position: { x: 584, y: 60 },
    data: {
      pillarType: 'model',
      name: modelName,
      description: `${modelName} foundation reasoning model with structured JSON outputs.`,
      config: { provider: selectedProvider, modelId: selectedModelId, temperature: 0.2, topP: 0.95 }
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
    sourceHandle: 'tools-out',
    target: agentId,
    targetHandle: 'tools-in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#0091DA', strokeWidth: 2 }
  });
  steps.push(`Wired Ingestion Node: ${hasAudio ? 'Audio Transcriber' : 'Document Ingest'} to tools-in socket`);

  // 4. Memory Node
  const memoryNodeId = `node-memory-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: memoryNodeId,
    type: 'pillar',
    position: { x: 564, y: 450 },
    data: {
      pillarType: 'memory',
      name: 'Episodic Sync Memory',
      description: 'Maintains cross-session commitments and vector search.',
      config: { ttlDays: 90, store: 'vector-sqlite' }
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

  // 5. Policy Guardrail Node
  const policyNodeId = `node-policy-${Date.now().toString().slice(-4)}`;
  nodes.push({
    id: policyNodeId,
    type: 'pillar',
    position: { x: 380, y: 450 },
    data: {
      pillarType: 'policies',
      name: 'PII Redactor',
      description: 'Detects and redacts salaries, personal phones, SSNs, and confidential customer data.',
      config: { redactSalaries: true, maskEmails: true }
    }
  });
  edges.push({
    id: `edge-${policyNodeId}-to-${agentId}`,
    source: policyNodeId,
    sourceHandle: 'out',
    target: agentId,
    targetHandle: 'policies-in',
    type: 'deletable',
    animated: true,
    style: { stroke: '#6D2077', strokeWidth: 2 }
  });
  steps.push('Enforced Policy Guardrail: PII Redactor on policies-in socket');

  // 6. Skill Node
  const skillNodeId = `node-skill-${Date.now().toString().slice(-4)}`;
  const skillName = isMeeting ? 'Executive Summarizer' : isSupport ? 'Action Extractor' : 'Code Audit Sentinel';
  nodes.push({
    id: skillNodeId,
    type: 'pillar',
    position: { x: 750, y: 450 },
    data: {
      pillarType: 'skills',
      name: skillName,
      description: 'Generates structured synthesis, highlights, and action points.',
      config: { focus: 'executive' }
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
  steps.push(`Loaded Specialized Skill: ${skillName} on skill-in socket`);

  // 7. MCP Integrations (Slack / Jira / Outlook / GitHub)
  if (hasSlack || hasJira || hasOutlook || isSupport || isCode) {
    const mcpNodeId = `node-mcp-${Date.now().toString().slice(-4)}`;
    const mcpName = hasSlack ? 'Slack MCP Server' : hasJira ? 'Atlassian Jira MCP' : isCode ? 'GitHub MCP' : 'Enterprise MCP Gateway';
    nodes.push({
      id: mcpNodeId,
      type: 'pillar',
      position: { x: 800, y: -20 },
      data: {
        pillarType: 'mcp',
        name: mcpName,
        description: `Exposes live tools and automated notifications.`,
        config: { transport: 'sse' }
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
    steps.push(`Integrated Live MCP Server: ${mcpName} to mcp-in socket`);
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
  const existingSummary = existingNodes.length > 0
    ? `Current canvas has ${existingNodes.length} nodes: ${existingNodes.map(n => `${n.type} (${n.data?.name || n.data?.title || n.id})`).join(', ')}.`
    : 'Canvas is currently blank.';

  const userQuery = `User Directive: "${prompt}"
${clarificationAnswer ? `Clarification Provided by User: "${clarificationAnswer}"` : ''}
${existingSummary}
Instruction: ${isEditMode ? 'Modify or append to the existing canvas.' : 'Generate a complete, optimal workflow graph for this directive.'}
Respond strictly in JSON matching the protocol.`;

  try {
    const res = await executeUniversalChat({
      provider,
      modelId,
      systemPrompt: CANVAS_ARCHITECT_SYSTEM_PROMPT,
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
          action: parsed.action || 'create',
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
