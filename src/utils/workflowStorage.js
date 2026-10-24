/**
 * KEAOS Multi-Workflow Storage Engine
 * Manages atomic persistence of enterprise agent workflows,
 * supporting blank canvas genesis, cloning, inline renaming,
 * JSON export/import, search indexing, and auto-save synchronizer.
 */

import { FRAMEWORKS } from '../constants/frameworks';
import { loadCanvasState } from './persistentState';
import { OUTLOOK_OFFICIAL_ACTIONS } from '../constants/mcpOfficialCatalogs';

export const WORKFLOWS_REGISTRY_KEY = 'keaos_workflows_registry';
export const ACTIVE_WORKFLOW_ID_KEY = 'keaos_active_workflow_id';

/**
 * Computes architectural topology stats from graph nodes.
 */
export function computeWorkflowStats(nodes = []) {
  let agentCount = 0;
  let mcpCount = 0;
  let modelCount = 0;
  let skillCount = 0;
  let toolCount = 0;
  let policyCount = 0;
  let hasAudit = false;

  (nodes || []).forEach((n) => {
    if (n.type === 'agentCore') agentCount++;
    if (n.type === 'pillar') {
      const pType = n.data?.pillarType;
      if (pType === 'mcp') mcpCount++;
      else if (pType === 'model') modelCount++;
      else if (pType === 'skills') skillCount++;
      else if (pType === 'tools') toolCount++;
      else if (pType === 'policies') policyCount++;
      else if (pType === 'audit') hasAudit = true;
    }
  });

  return {
    nodeCount: (nodes || []).length,
    agentCount,
    mcpCount,
    modelCount,
    skillCount,
    toolCount,
    policyCount,
    hasAudit
  };
}

/**
 * Canonical Meeting Intelligence Workflow definition with full multi-pillar topology
 */
export function createMeetingIntelligenceWorkflow() {
  const defaultFramework = FRAMEWORKS[0]; // Google ADK

  const defaultUseCase = {
    id: 'uc-meeting-intel',
    name: 'Meeting Intelligence Agent',
    description: 'Autonomous multi-speaker synthesis, action items with owners, and task sync.',
    framework: defaultFramework,
    agent: {
      prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
      temperature: 0.2,
      topP: 0.95
    }
  };

  const initialNodes = [
    {
      id: 'agent-core',
      type: 'agentCore',
      position: { x: 520, y: 165 },
      data: {
        name: 'Meeting Intelligence Agent',
        framework: defaultFramework,
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: {
          model: 1,
          skills: 1,
          mcp: 1,
          tools: 1,
          gateway: 1,
          memory: 1,
          policies: 1
        }
      }
    },
    {
      id: 'node-model-1',
      type: 'pillar',
      position: { x: 564, y: 55 },
      data: {
        pillarType: 'model',
        name: 'GPT-4o',
        description: 'Flagship omni reasoning, structured outputs, and precision tool calling.',
        config: { provider: 'openai', modelId: 'gpt-4o', temperature: 0.2, topP: 1.0 }
      }
    },
    {
      id: 'node-tool-1',
      type: 'pillar',
      position: { x: 230, y: -20 },
      data: {
        pillarType: 'tools',
        toolId: 'tool-audio-transcribe',
        name: 'Audio Transcriber',
        description: 'Accepts MP3 audio, runs Whisper/Speech-to-Text with speaker diarization.',
        config: { format: 'mp3', diarization: true }
      }
    },
    {
      id: 'node-mcp-gw-1',
      type: 'pillar',
      position: { x: 780, y: -20 },
      data: {
        pillarType: 'gateway',
        itemId: 'gw-mcp-controller',
        name: 'MCP Egress Gateway',
        description: 'Enforces zero-trust mediation between Agent Core and external MCP servers. Awaiting live MCP server connection.',
        config: { gatewayType: 'mcp-egress', auditAllActions: true }
      }
    },
    {
      id: 'node-policy-1',
      type: 'pillar',
      position: { x: 380, y: 440 },
      data: {
        pillarType: 'policies',
        name: 'PII Redactor',
        description: 'Detects and redacts salaries, personal phones, SSNs, and passwords.',
        config: { redactSalaries: true, maskEmails: true }
      }
    },
    {
      id: 'node-memory-1',
      type: 'pillar',
      position: { x: 564, y: 440 },
      data: {
        pillarType: 'memory',
        name: 'Episodic Sync Memory',
        description: 'Remembers past meeting action items to verify resolution across weeks.',
        config: { ttlDays: 90, store: 'vector-sqlite' }
      }
    },
    {
      id: 'node-skill-1',
      type: 'pillar',
      position: { x: 750, y: 440 },
      data: {
        pillarType: 'skills',
        name: 'Executive Summarizer',
        description: 'Generates TL;DR, high-level takeaways, and strategic themes.',
        config: { length: 'concise', focus: 'decisions' }
      }
    },
    {
      id: 'node-output-1',
      type: 'outputNode',
      position: { x: 790, y: 207 },
      data: {
        title: 'Meeting Intelligence Output',
        content: '',
        status: 'idle',
        format: 'markdown',
        isExpanded: false
      }
    },
    {
      id: 'node-ingest-1',
      type: 'ingestionNode',
      position: { x: 474, y: 55 },
      data: {
        title: 'Data & Audio Ingestion',
        content: '',
        status: 'idle',
        isExpanded: false
      }
    }
  ];

  const initialEdges = [
    {
      id: 'edge-model',
      source: 'node-model-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'model-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-ingest-1',
      source: 'node-ingest-1',
      sourceHandle: 'data-out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-tool',
      source: 'node-tool-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-mcp-gw',
      source: 'node-mcp-gw-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00A3A6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-policy',
      source: 'node-policy-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'policies-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-memory',
      source: 'node-memory-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'memory-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#483698', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-skill',
      source: 'node-skill-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#009A44', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-output',
      source: 'agent-core',
      sourceHandle: 'out',
      target: 'node-output-1',
      targetHandle: 'data-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
    }
  ];

  return {
    id: 'wf-meeting-intelligence',
    name: 'Meeting Intelligence Agent',
    description: 'Autonomous multi-speaker meeting intelligence: transcript & audio ingestion, executive summarization, action item extraction, PII redaction, and episodic sync.',
    framework: defaultFramework,
    activeUseCase: defaultUseCase,
    nodes: initialNodes,
    edges: initialEdges,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    isStarred: true,
    isLocked: false,
    isWorkflowLocked: false,
    tags: ['Meeting Intelligence', 'Audio Ingestion', 'Summarizer', 'PII Redactor'],
    stats: computeWorkflowStats(initialNodes)
  };
}

/**
 * Pre-configured Outlook Stream & Attachment Intelligence workflow
 */
export function createOutlookStreamWorkflow() {
  const fw = FRAMEWORKS.find(f => f.id === 'microsoft-adk') || FRAMEWORKS[0];

  const initialNodes = [
    // 1. Ingress Trigger Node (Outlook Stream Watcher, 60px Origin Disc)
    {
      id: 'node-trigger-outlook',
      type: 'triggerNode',
      position: { x: 140, y: 220 },
      data: {
        name: 'Outlook Ingress Watcher',
        triggerType: 'poll',
        pollSubMode: 'stream',
        streamType: 'inbox',
        pollIntervalSeconds: 300,
        maxBatchSize: 20,
        isPollingActive: false,
        lastStatus: 'idle',
        label: 'OUTLOOK STREAM'
      }
    },
    // 2. Central Robot AI Agent Core
    {
      id: 'agent-core',
      type: 'agentCore',
      position: { x: 520, y: 165 },
      data: {
        name: 'Mail & Attachment Extractor',
        framework: fw,
        prompt: 'You are an institutional Mail & Attachment Intelligence Agent. Ingest incoming emails and attachments from Outlook MCP streams. Evaluate relevance, extract structured metadata (sender, subject, invoice/deliverable items, monetary values, action owners, due dates), and output standardized records.',
        temperature: 0.1,
        topP: 0.95,
        attachedCounts: {
          model: 1,
          skills: 1,
          gateway: 1,
          tools: 1
        }
      }
    },
    // 3. Foundation Model Node (Positioned at Top-Center)
    {
      id: 'node-model-outlook',
      type: 'pillar',
      position: { x: 564, y: -20 },
      data: {
        pillarType: 'model',
        name: 'Claude 3.5 Sonnet',
        description: 'High-reasoning intelligence with strict JSON schema guarantees.',
        config: { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022', temperature: 0.1, topP: 0.95 }
      }
    },
    // 4. MCP Egress Gateway (Positioned at Top-Right)
    {
      id: 'node-mcp-gw-outlook',
      type: 'pillar',
      position: { x: 780, y: -20 },
      data: {
        pillarType: 'gateway',
        itemId: 'gw-mcp-controller',
        name: 'MCP Egress Gateway',
        description: 'Zero-trust capability mediator. Filters and permits only verified Microsoft 365 tools.',
        config: { gatewayType: 'mcp-egress', auditAllActions: true, disabledTools: [] }
      }
    },
    // 5. Official Microsoft Outlook 365 MCP Server (Positioned above/right of Gateway)
    {
      id: 'node-mcp-outlook-1',
      type: 'pillar',
      position: { x: 1060, y: -20 },
      data: {
        pillarType: 'mcp',
        title: 'Microsoft Outlook 365',
        name: 'Microsoft Outlook 365',
        displayName: 'Microsoft Outlook 365',
        subtitle: 'HTTP/SSE',
        description: `Official Microsoft 365 Outlook Mail, Calendar & Attachments integration with ${OUTLOOK_OFFICIAL_ACTIONS.length} verified actions.`,
        config: {},
        tools: OUTLOOK_OFFICIAL_ACTIONS,
        serviceName: 'Outlook',
        transport: 'sse',
        isRealMcp: true
      }
    },
    // 6. Specialized Skills Node (Bottom Right)
    {
      id: 'node-skill-outlook',
      type: 'pillar',
      position: { x: 750, y: 440 },
      data: {
        pillarType: 'skills',
        name: 'Attachment & Data Extractor',
        description: 'Decodes Base64 attachments, extracts invoice line items, and formats tabular records.',
        config: { format: 'tabular_json', extractAttachments: true }
      }
    },
    // 7. Deterministic Box / Table Normalizer (Zero-token compute)
    {
      id: 'node-deterministic-outlook',
      type: 'deterministicNode',
      position: { x: 800, y: 220 },
      data: {
        name: 'Row & Schema Normalizer',
        prompt: 'Normalizes extracted email fields into tabular columns (Sender, Subject, Amount, Due Date, Status)',
        ruleSummary: 'Normalizes extracted email fields into tabular columns (Sender, Subject, Amount, Due Date, Status)',
        language: 'javascript',
        code: `function process(inputs) {
  let data = inputs;
  if (typeof inputs === 'string') {
    try { data = JSON.parse(inputs); } catch (e) { data = { raw: inputs }; }
  }
  const item = data?.item || data || {};
  return {
    record_id: item.id || ('REC-' + Date.now().toString().slice(-4)),
    sender: item.from || item.sender || 'Direct Ingress',
    subject: item.subject || item.title || item.name || 'Ingested Message',
    received_at: item.receivedDateTime || item.timestamp || new Date().toISOString(),
    has_attachments: Boolean(item.hasAttachments || item.attachments?.length),
    attachments_count: item.attachments?.length || (item.hasAttachments ? 1 : 0),
    attachment_names: Array.isArray(item.attachments) && item.attachments.length > 0 ? item.attachments.map(a => a.name).join(', ') : (item.hasAttachments ? 'Attached Files' : 'None'),
    summary: (item.bodyPreview || item.content || item.summary || item.text || '').slice(0, 120),
    status: 'EXTRACTED'
  };
}`,
        lastStatus: 'idle'
      }
    },
    // 8. Output Component Node (Positioned at far right, in continuous append mode)
    {
      id: 'node-output-outlook',
      type: 'outputNode',
      position: { x: 1080, y: 200 },
      data: {
        title: 'Tabular Continuous Output Viewer',
        outputContent: '',
        content: '',
        status: 'idle',
        format: 'json',
        persistenceStrategy: 'append',
        runsHistory: [],
        isExpanded: false
      }
    }
  ];

  const initialEdges = [
    // Trigger -> Row & Schema Normalizer (Direct zero-token stream)
    {
      id: 'edge-trigger-to-normalizer',
      source: 'node-trigger-outlook',
      sourceHandle: 'trigger-out',
      target: 'node-deterministic-outlook',
      targetHandle: 'in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-trigger-to-agent',
      source: 'node-trigger-outlook',
      sourceHandle: 'trigger-out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-model-outlook',
      source: 'node-model-outlook',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'model-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-mcp-gw-outlook',
      source: 'node-mcp-gw-outlook',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00A3A6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-mcp-to-gw-outlook',
      source: 'node-mcp-outlook-1',
      sourceHandle: 'out',
      target: 'node-mcp-gw-outlook',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2.0, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-skill-outlook',
      source: 'node-skill-outlook',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-agent-to-deterministic',
      source: 'agent-core',
      sourceHandle: 'out',
      target: 'node-deterministic-outlook',
      targetHandle: 'in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#EAAA00', strokeWidth: 2.0, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-deterministic-to-output',
      source: 'node-deterministic-outlook',
      sourceHandle: 'out',
      target: 'node-output-outlook',
      targetHandle: 'data-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#10B981', strokeWidth: 2.2, strokeDasharray: '4 4' }
    }
  ];

  return {
    id: 'wf-outlook-stream-intelligence',
    name: 'Outlook Mail & Attachment Intelligence',
    description: 'Continuous MCP stream monitoring (Inbox, Sent Items, Calendar), attachment decoding, and discrete tabular extraction.',
    framework: fw,
    activeUseCase: {
      id: 'uc-outlook-stream',
      name: 'Outlook Mail & Attachment Intelligence',
      description: 'Continuous MCP stream monitoring (Inbox, Sent Items, Calendar), attachment decoding, and discrete tabular extraction.',
      framework: fw,
      agent: {
        prompt: 'You are an institutional Mail & Attachment Intelligence Agent. Ingest incoming emails and attachments from Outlook MCP streams. Evaluate relevance, extract structured metadata, and output standardized records.',
        temperature: 0.1,
        topP: 0.95
      }
    },
    nodes: initialNodes,
    edges: initialEdges,
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    isStarred: true,
    isLocked: false,
    isWorkflowLocked: false,
    tags: ['Outlook MCP', 'Attachment Decoding', 'Stream Ingress', 'Tabular Rows'],
    stats: computeWorkflowStats(initialNodes)
  };
}

/**
 * Pre-configured Outlook Intelligence workflow with zero-token autonomous ingress,
 * strict Zero-Trust Gateway enforcement, and ReAct tool-calling.
 */
export function createOutlookIntelligenceWorkflow() {
  const fw = FRAMEWORKS.find(f => f.id === 'microsoft-adk') || FRAMEWORKS[0];

  const initialNodes = [
    // 1. Ingress Trigger Node (Stream Watcher, 60px Origin Disc)
    {
      id: 'node-trigger-outlook-intel',
      type: 'triggerNode',
      position: { x: 140, y: 220 },
      data: {
        name: 'Outlook Stream Watcher',
        triggerType: 'poll',
        pollSubMode: 'stream',
        streamType: 'inbox',
        unreadFilter: 'unread_only',
        attachmentFilter: 'any',
        pollIntervalSeconds: 60,
        maxBatchSize: 20,
        isPollingActive: false,
        lastStatus: 'idle',
        label: 'OUTLOOK STREAM'
      }
    },
    // 2. Central AI Agent Core
    {
      id: 'agent-core',
      type: 'agentCore',
      position: { x: 520, y: 165 },
      data: {
        name: 'Mail & Attachment Extractor',
        framework: fw,
        prompt: 'You are an institutional Mail & Attachment Intelligence Agent. On each trigger pulse, query the connected Outlook MCP to inspect incoming emails and attachments. Evaluate relevance (invoice line items, financial details, obligations), decode any attached documents, and output structured records in clean JSON format.',
        temperature: 0.1,
        topP: 0.95,
        attachedCounts: {
          model: 1,
          skills: 1,
          gateway: 1,
          tools: 1
        }
      }
    },
    // 3. Foundation Model Node (Positioned at Top-Center)
    {
      id: 'node-model-outlook-intel',
      type: 'pillar',
      position: { x: 564, y: -20 },
      data: {
        pillarType: 'model',
        name: 'OpenAI (gpt-4o)',
        description: 'High-reasoning foundation model with function calling and strict schema guarantees.',
        config: { provider: 'openai', modelId: 'gpt-4o', temperature: 0.1, topP: 0.95 }
      }
    },
    // 4. MCP Egress Gateway (Positioned at Top-Right)
    {
      id: 'node-mcp-gw-intel',
      type: 'pillar',
      position: { x: 780, y: -20 },
      data: {
        pillarType: 'gateway',
        itemId: 'gw-mcp-controller',
        name: 'MCP Egress Gateway',
        description: 'Zero-trust capability mediator. Filters and permits only verified Microsoft 365 tools.',
        config: { gatewayType: 'mcp-egress', auditAllActions: true, disabledTools: [] }
      }
    },
    // 5. Official Microsoft Outlook 365 MCP Server (Positioned above/right of Gateway)
    {
      id: 'node-mcp-outlook-intel',
      type: 'pillar',
      position: { x: 1060, y: -20 },
      data: {
        pillarType: 'mcp',
        title: 'Microsoft Outlook 365',
        name: 'Microsoft Outlook 365',
        displayName: 'Microsoft Outlook 365',
        subtitle: 'HTTP/SSE',
        description: `Official Microsoft 365 Outlook Mail, Calendar & Attachments integration with ${OUTLOOK_OFFICIAL_ACTIONS.length} verified actions.`,
        config: {},
        tools: OUTLOOK_OFFICIAL_ACTIONS,
        serviceName: 'Outlook',
        transport: 'sse',
        isRealMcp: true
      }
    },
    // 6. Specialized Skills Node (Bottom Right)
    {
      id: 'node-skill-outlook-intel',
      type: 'pillar',
      position: { x: 750, y: 440 },
      data: {
        pillarType: 'skills',
        name: 'Attachment & Data Extractor',
        description: 'Decodes Base64 attachments, extracts invoice line items, and formats tabular records.',
        config: { format: 'tabular_json', extractAttachments: true }
      }
    },
    // 7. Deterministic Box / Table Normalizer (Zero-token compute)
    {
      id: 'node-deterministic-outlook-intel',
      type: 'deterministicNode',
      position: { x: 800, y: 220 },
      data: {
        name: 'Row & Schema Normalizer',
        prompt: 'Normalizes extracted email fields into tabular columns (Sender, Subject, Amount, Due Date, Status)',
        ruleSummary: 'Normalizes extracted email fields into tabular columns (Sender, Subject, Amount, Due Date, Status)',
        language: 'javascript',
        code: `function process(inputs) {
  let data = inputs;
  if (typeof inputs === 'string') {
    try { data = JSON.parse(inputs); } catch (e) { data = { raw: inputs }; }
  }
  const item = data?.item || data || {};
  return {
    record_id: item.id || ('REC-' + Date.now().toString().slice(-4)),
    sender: item.from || item.sender || 'Direct Ingress',
    subject: item.subject || item.title || item.name || 'Ingested Message',
    received_at: item.receivedDateTime || item.timestamp || new Date().toISOString(),
    has_attachments: Boolean(item.hasAttachments || item.attachments?.length),
    attachments_count: item.attachments?.length || (item.hasAttachments ? 1 : 0),
    attachment_names: Array.isArray(item.attachments) && item.attachments.length > 0 ? item.attachments.map(a => a.name).join(', ') : (item.hasAttachments ? 'Attached Files' : 'None'),
    summary: (item.bodyPreview || item.content || item.summary || item.text || '').slice(0, 120),
    status: 'EXTRACTED'
  };
}`,
        lastStatus: 'idle'
      }
    },
    // 8. Output Component Node (Positioned at far right, in continuous append mode)
    {
      id: 'node-output-outlook-intel',
      type: 'outputNode',
      position: { x: 1080, y: 200 },
      data: {
        title: 'Final Output Viewer',
        outputContent: '',
        content: '',
        status: 'idle',
        format: 'json',
        persistenceStrategy: 'append',
        runsHistory: [],
        isExpanded: false
      }
    }
  ];

  const initialEdges = [
    // Trigger -> Agent Core
    {
      id: 'edge-trigger-to-agent-intel',
      source: 'node-trigger-outlook-intel',
      sourceHandle: 'trigger-out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2, strokeDasharray: '4 4' }
    },
    // Model -> Agent Core
    {
      id: 'edge-model-outlook-intel',
      source: 'node-model-outlook-intel',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'model-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    // Gateway -> Agent Core
    {
      id: 'edge-mcp-gw-intel',
      source: 'node-mcp-gw-intel',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#00A3A6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    // MCP Server -> Gateway
    {
      id: 'edge-mcp-to-gw-intel',
      source: 'node-mcp-outlook-intel',
      sourceHandle: 'out',
      target: 'node-mcp-gw-intel',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2.0, strokeDasharray: '4 4' }
    },
    // Skill -> Agent Core
    {
      id: 'edge-skill-outlook-intel',
      source: 'node-skill-outlook-intel',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    // Agent Core -> Row & Schema Normalizer
    {
      id: 'edge-agent-to-deterministic-intel',
      source: 'agent-core',
      sourceHandle: 'out',
      target: 'node-deterministic-outlook-intel',
      targetHandle: 'in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#EAAA00', strokeWidth: 2.0, strokeDasharray: '4 4' }
    },
    // Row & Schema Normalizer -> Final Output Viewer
    {
      id: 'edge-deterministic-to-output-intel',
      source: 'node-deterministic-outlook-intel',
      sourceHandle: 'out',
      target: 'node-output-outlook-intel',
      targetHandle: 'data-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#10B981', strokeWidth: 2.2, strokeDasharray: '4 4' }
    }
  ];

  return {
    id: 'wf-outlook-intelligence',
    name: 'Outlook Intelligence',
    description: 'Autonomous MCP intelligence: periodic zero-token stream monitoring, attachment decoding, gateway policy enforcement, and structured synthesis.',
    framework: fw,
    activeUseCase: {
      id: 'uc-outlook-intelligence',
      name: 'Outlook Intelligence',
      description: 'Autonomous MCP intelligence: periodic zero-token stream monitoring, attachment decoding, gateway policy enforcement, and structured synthesis.',
      framework: fw,
      agent: {
        prompt: 'You are an institutional Mail & Attachment Intelligence Agent. On each trigger pulse, query the connected Outlook MCP to inspect incoming emails and attachments. Evaluate relevance (invoice line items, financial details, obligations), decode any attached documents, and output structured records in clean JSON format.',
        temperature: 0.1,
        topP: 0.95
      }
    },
    nodes: initialNodes,
    edges: initialEdges,
    createdAt: Date.now() - 1800000,
    updatedAt: Date.now(),
    isStarred: true,
    isLocked: false,
    isWorkflowLocked: false,
    tags: ['Outlook Intelligence', 'MCP Stream', 'Zero-Token Ingress', 'Gateway Enforced'],
    stats: computeWorkflowStats(initialNodes)
  };
}

/**
 * Creates the initial enterprise workflow from existing saved canvas state or default setup.
 */
function createInitialDefaultWorkflow() {
  const existingCanvas = loadCanvasState();
  if (existingCanvas && existingCanvas.nodes && existingCanvas.nodes.length > 0) {
    const rawUseCase = existingCanvas.activeUseCase || {};
    const ucName = rawUseCase.name && rawUseCase.name !== 'Enterprise Autonomous Agent'
      ? rawUseCase.name
      : 'Meeting Intelligence Agent';
    const ucDesc = rawUseCase.description || 'Autonomous multi-speaker synthesis, action items, and task sync.';
    const ucFramework = rawUseCase.framework || FRAMEWORKS[0];
    const initialLock = Boolean(existingCanvas.isWorkflowLocked ?? existingCanvas.isLocked ?? false);

    return {
      id: 'wf-meeting-intelligence',
      name: ucName,
      description: ucDesc,
      framework: ucFramework,
      activeUseCase: {
        ...rawUseCase,
        name: ucName,
        description: ucDesc,
        framework: ucFramework,
        agent: {
          prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
          temperature: 0.2,
          topP: 0.95,
          ...(rawUseCase.agent || {})
        }
      },
      nodes: existingCanvas.nodes,
      edges: existingCanvas.edges || [],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
      isStarred: true,
      isLocked: initialLock,
      isWorkflowLocked: initialLock,
      tags: ['Meeting Intelligence', 'Audio Ingestion', 'Summarizer'],
      stats: computeWorkflowStats(existingCanvas.nodes)
    };
  }

  return createMeetingIntelligenceWorkflow();
}

/**
 * Normalizes a workflow name for case-insensitive, whitespace-trimmed comparison.
 */
export function normalizeWorkflowName(name) {
  return (name || '').trim().toLowerCase();
}

/**
 * Checks whether a given workflow name is already taken by any existing workflow (case-insensitively).
 * @param {string} name - Prospective workflow name
 * @param {string|null} excludeId - Workflow ID to exclude from check (e.g. current editing workflow)
 * @param {Array|null} workflowsList - Optional preloaded workflows array, otherwise loads from registry
 * @returns {boolean} True if taken, false if available
 */
export function isWorkflowNameTaken(name, excludeId = null, workflowsList = null) {
  const normalized = normalizeWorkflowName(name);
  if (!normalized) return false;
  const list = Array.isArray(workflowsList) ? workflowsList : loadAllWorkflows();
  return list.some((w) => {
    if (excludeId && w.id === excludeId) return false;
    return normalizeWorkflowName(w.name) === normalized;
  });
}

/**
 * Derives the next guaranteed unique workflow name by appending an incremented number if collisions exist.
 * e.g., "Untitled Workflow" -> "Untitled Workflow 2" -> "Untitled Workflow 3"
 * Case-insensitive comparison.
 * @param {string} baseName - Desired base name
 * @param {string|null} excludeId - Workflow ID to exclude
 * @param {Array|null} workflowsList - Optional workflows array
 * @returns {string} Unique workflow name
 */
export function getNextUniqueWorkflowName(baseName = 'Untitled Workflow', excludeId = null, workflowsList = null) {
  const rawBase = (baseName || '').trim() || 'Untitled Workflow';
  const list = Array.isArray(workflowsList) ? workflowsList : loadAllWorkflows();

  const takenNames = new Set(
    list
      .filter((w) => !excludeId || w.id !== excludeId)
      .map((w) => normalizeWorkflowName(w.name))
  );

  if (!takenNames.has(normalizeWorkflowName(rawBase))) {
    return rawBase;
  }

  // Check if baseName already ends with a counter (e.g. "Untitled Workflow 2" or "Copy 2")
  const match = rawBase.match(/^(.*?)(?:\s+(\d+))$/);
  let prefix = rawBase;
  let counter = 2;
  if (match) {
    prefix = match[1];
    counter = parseInt(match[2], 10) + 1;
  }

  let candidate = `${prefix} ${counter}`;
  while (takenNames.has(normalizeWorkflowName(candidate))) {
    counter++;
    candidate = `${prefix} ${counter}`;
  }

  return candidate;
}

/**
 * Loads all saved workflows from localStorage with safe fallback and seamless migration.
 * Preserves custom workflows (e.g. MIA2) without forced renaming.
 * Cleans legacy placeholder descriptions to blank and enforces case-insensitive name uniqueness.
 */
export function loadAllWorkflows() {
  try {
    const raw = localStorage.getItem(WORKFLOWS_REGISTRY_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let registryMutated = false;

        // 1. Clean legacy placeholder descriptions to empty string
        parsed.forEach((w) => {
          if (
            w.description === 'Pristine blank canvas. Connect models, skills, tools, and gateways.' ||
            w.description === 'Autonomous enterprise agent workflow created in KEAOS Studio.'
          ) {
            w.description = '';
            if (w.activeUseCase) {
              w.activeUseCase.description = '';
            }
            registryMutated = true;
          }
        });

        // 2. Enforce case-insensitive name uniqueness across existing registry
        const seenNames = new Set();
        parsed.forEach((w) => {
          const norm = normalizeWorkflowName(w.name || 'Untitled Workflow');
          if (seenNames.has(norm)) {
            // Collision found! Disambiguate to next unique name
            const uniqueName = getNextUniqueWorkflowName(w.name || 'Untitled Workflow', w.id, parsed);
            w.name = uniqueName;
            if (w.activeUseCase) {
              w.activeUseCase.name = uniqueName;
            }
            seenNames.add(normalizeWorkflowName(uniqueName));
            registryMutated = true;
          } else {
            seenNames.add(norm);
          }
        });

        // 3. Ensure the official Outlook Stream Intelligence template workflow is available in registry
        if (!parsed.some((w) => w.id === 'wf-outlook-stream-intelligence')) {
          const outlookWf = createOutlookStreamWorkflow();
          parsed.push(outlookWf);
          registryMutated = true;
        }

        // 4. Ensure the new Outlook Intelligence workflow is available in registry
        if (!parsed.some((w) => w.id === 'wf-outlook-intelligence')) {
          const outlookIntelWf = createOutlookIntelligenceWorkflow();
          parsed.push(outlookIntelWf);
          registryMutated = true;
        }

        if (registryMutated) {
          try {
            localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(parsed));
          } catch (e) {
            // Non-blocking
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse workflows registry from localStorage:', err);
  }

  // If no registry exists yet, bootstrap with initial default workflow + Outlook workflows
  const initialWf = createInitialDefaultWorkflow();
  const outlookWf = createOutlookStreamWorkflow();
  const outlookIntelWf = createOutlookIntelligenceWorkflow();
  const initialList = [initialWf, outlookWf, outlookIntelWf];
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(initialList));
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, initialWf.id);
  } catch (err) {
    console.warn('Failed to seed initial workflow in localStorage:', err);
  }
  return initialList;
}

/**
 * Gets the current active workflow ID.
 */
export function getActiveWorkflowId() {
  try {
    const activeId = localStorage.getItem(ACTIVE_WORKFLOW_ID_KEY);
    if (activeId) return activeId;
  } catch (err) {
    console.warn('Failed to read active workflow id:', err);
  }
  const all = loadAllWorkflows();
  return all[0]?.id || 'wf-meeting-intelligence';
}

/**
 * Sets the active workflow ID.
 */
export function setActiveWorkflowId(id) {
  try {
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, id);
  } catch (err) {
    console.warn('Failed to save active workflow id:', err);
  }
}

/**
 * Retrieves a single workflow by ID.
 */
export function getWorkflowById(id) {
  const all = loadAllWorkflows();
  let found = all.find((wf) => wf.id === id) || all[0] || null;
  if (found && (!found.nodes || found.nodes.length === 0) && (found.id === 'wf-meeting-intelligence' || found.name?.toLowerCase().includes('meeting intelligence'))) {
    const canonical = createMeetingIntelligenceWorkflow();
    found = {
      ...found,
      nodes: canonical.nodes,
      edges: canonical.edges,
      stats: canonical.stats,
      activeUseCase: canonical.activeUseCase
    };
  }
  return found;
}

/**
 * Saves/updates a single workflow in the registry and syncs timestamp.
 */
export function saveWorkflow(workflow) {
  if (!workflow || !workflow.id) return;
  const all = loadAllWorkflows();
  const index = all.findIndex((w) => w.id === workflow.id);
  const isLocked = Boolean(workflow.isLocked ?? workflow.isWorkflowLocked ?? false);

  // Guarantee uniqueness of name (case-insensitive) against other workflows
  let targetName = (workflow.name || '').trim() || 'Untitled Workflow';
  if (isWorkflowNameTaken(targetName, workflow.id, all)) {
    targetName = getNextUniqueWorkflowName(targetName, workflow.id, all);
  }

  const cleanDescription = (workflow.description !== undefined ? workflow.description : (workflow.activeUseCase?.description || '')).trim();

  const updatedRecord = {
    ...workflow,
    name: targetName,
    description: cleanDescription,
    activeUseCase: {
      ...(workflow.activeUseCase || {}),
      name: targetName,
      description: cleanDescription
    },
    isLocked,
    isWorkflowLocked: isLocked,
    updatedAt: Date.now(),
    stats: computeWorkflowStats(workflow.nodes)
  };

  let newList;
  if (index >= 0) {
    newList = [...all];
    newList[index] = updatedRecord;
  } else {
    newList = [updatedRecord, ...all];
  }

  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(newList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (err) {
    console.warn('Failed to save workflows registry:', err);
  }
  return updatedRecord;
}

/**
 * Updates the lock state of a specific workflow.
 */
export function setWorkflowLock(id, isLocked) {
  if (!id) return;
  const wf = getWorkflowById(id);
  if (wf) {
    return saveWorkflow({
      ...wf,
      isLocked: Boolean(isLocked),
      isWorkflowLocked: Boolean(isLocked)
    });
  }
}

/**
 * Creates a brand new workflow. Defaults to a clean blank canvas.
 * Enforces case-insensitive name uniqueness and blank description by default.
 */
export function createWorkflow({
  name = 'Untitled Workflow',
  description = '',
  framework = FRAMEWORKS[0],
  isBlank = true,
  nodes = [],
  edges = [],
  tags = ['New']
} = {}) {
  const all = loadAllWorkflows();
  // Ensure unique name across all workflows (case-insensitive)
  const uniqueName = getNextUniqueWorkflowName(name, null, all);
  const cleanDescription = (description || '').trim();

  const newId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const useCaseObj = {
    id: `uc-${newId}`,
    name: uniqueName,
    description: cleanDescription,
    framework,
    agent: {
      prompt: 'You are an autonomous enterprise AI agent configured to execute domain workflows.',
      temperature: 0.2,
      topP: 0.95
    }
  };

  const newWorkflow = {
    id: newId,
    name: uniqueName,
    description: cleanDescription,
    framework,
    activeUseCase: useCaseObj,
    nodes: isBlank ? [] : nodes,
    edges: isBlank ? [] : edges,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isStarred: false,
    isLocked: false,
    isWorkflowLocked: false,
    tags: tags.length ? tags : ['New'],
    stats: computeWorkflowStats(isBlank ? [] : nodes)
  };

  const updatedList = [newWorkflow, ...all];

  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updatedList));
    localStorage.setItem(ACTIVE_WORKFLOW_ID_KEY, newId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (err) {
    console.warn('Failed to persist new workflow:', err);
  }

  return newWorkflow;
}

/**
 * Duplicates / clones an existing workflow.
 * Automatically derives a unique name (e.g. "Workflow (Copy 2)").
 */
export function duplicateWorkflow(sourceId) {
  const all = loadAllWorkflows();
  const source = all.find((w) => w.id === sourceId);
  if (!source) return null;

  const newId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const desiredCopyName = `${source.name} (Copy)`;
  const uniqueClonedName = getNextUniqueWorkflowName(desiredCopyName, null, all);

  const clonedUseCase = {
    ...source.activeUseCase,
    id: `uc-${newId}`,
    name: uniqueClonedName
  };

  const clonedWorkflow = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: uniqueClonedName,
    activeUseCase: clonedUseCase,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isStarred: false,
    stats: computeWorkflowStats(source.nodes)
  };

  const updatedList = [clonedWorkflow, ...all];
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updatedList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (err) {
    console.warn('Failed to duplicate workflow:', err);
  }

  return clonedWorkflow;
}

/**
 * Updates workflow metadata (title, description, tags, star status).
 * Enforces case-insensitive name uniqueness.
 */
export function updateWorkflowMetadata(id, updates = {}) {
  const all = loadAllWorkflows();
  const index = all.findIndex((w) => w.id === id);
  if (index === -1) return null;

  const existing = all[index];

  // Enforce unique name if name is being changed
  let newName = updates.name !== undefined ? (updates.name || '').trim() : existing.name;
  if (!newName) {
    newName = 'Untitled Workflow';
  }
  if (updates.name !== undefined && isWorkflowNameTaken(newName, id, all)) {
    throw new Error(`A workflow named "${newName}" already exists (case-insensitive). Names must be unique.`);
  }

  const cleanDescription = updates.description !== undefined ? (updates.description || '').trim() : (existing.description || '');

  const updatedUseCase = {
    ...existing.activeUseCase,
    name: newName,
    description: cleanDescription,
    framework: updates.framework || existing.activeUseCase?.framework
  };

  const updated = {
    ...existing,
    ...updates,
    name: newName,
    description: cleanDescription,
    activeUseCase: updatedUseCase,
    updatedAt: Date.now()
  };

  all[index] = updated;
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(all));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (err) {
    console.warn('Failed to update workflow metadata:', err);
  }
  return updated;
}

/**
 * Deletes a workflow by ID. Safely ensures at least one workflow remains.
 */
export function deleteWorkflow(id) {
  const all = loadAllWorkflows();
  const target = all.find((w) => w.id === id);
  if (target && (target.isLocked || target.isWorkflowLocked)) {
    return { 
      success: false, 
      reason: `Workflow "${target.name || id}" is locked and cannot be deleted. Unlock it first to permit deletion.` 
    };
  }

  if (all.length <= 1) {
    return { success: false, reason: 'Cannot delete the only remaining workflow.' };
  }

  const filtered = all.filter((w) => w.id !== id);
  try {
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(filtered));
    const activeId = getActiveWorkflowId();
    if (activeId === id) {
      setActiveWorkflowId(filtered[0].id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('keaos:workspace-changed'));
    }
  } catch (err) {
    console.warn('Failed to delete workflow from registry:', err);
    return { success: false, reason: err.message };
  }

  return { success: true, nextActiveId: filtered[0].id };
}

/**
 * Exports a single workflow as a clean, downloadable JSON file.
 */
export function exportWorkflowAsJson(workflow) {
  try {
    const payload = {
      keaosVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      workflow
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (workflow.name || 'workflow').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}.keaos.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export workflow JSON:', err);
    return false;
  }
}

/**
 * Imports a workflow from JSON string content.
 */
export function importWorkflowFromJson(rawString) {
  try {
    const data = JSON.parse(rawString);
    const sourceWf = data.workflow || data;

    if (!sourceWf || (!sourceWf.nodes && !sourceWf.name)) {
      throw new Error('Invalid KEAOS workflow format.');
    }

    const all = loadAllWorkflows();
    const desiredName = sourceWf.name ? `${sourceWf.name} (Imported)` : 'Imported Workflow';
    const uniqueImportedName = getNextUniqueWorkflowName(desiredName, null, all);
    const cleanDescription = (sourceWf.description || '').trim();

    const newId = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const importedWf = {
      ...sourceWf,
      id: newId,
      name: uniqueImportedName,
      description: cleanDescription,
      activeUseCase: {
        ...(sourceWf.activeUseCase || {}),
        name: uniqueImportedName,
        description: cleanDescription
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isStarred: false,
      nodes: Array.isArray(sourceWf.nodes) ? sourceWf.nodes : [],
      edges: Array.isArray(sourceWf.edges) ? sourceWf.edges : [],
      stats: computeWorkflowStats(sourceWf.nodes || [])
    };

    const updated = [importedWf, ...all];
    localStorage.setItem(WORKFLOWS_REGISTRY_KEY, JSON.stringify(updated));
    setActiveWorkflowId(newId);
    return { success: true, workflow: importedWf };
  } catch (err) {
    console.error('Failed to import workflow JSON:', err);
    return { success: false, error: err.message };
  }
}
