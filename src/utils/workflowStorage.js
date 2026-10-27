/**
 * KEAOS Multi-Workflow Storage Engine
 * Manages atomic persistence of enterprise agent workflows,
 * supporting blank canvas genesis, cloning, inline renaming,
 * JSON export/import, search indexing, and auto-save synchronizer.
 */

import { FRAMEWORKS } from '../constants/frameworks';
import { loadCanvasState, loadWorkflowAgentLogs, saveWorkflowAgentLogs } from './persistentState';
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
 * Real-life Complex Coding Project 1:
 * Financial Crime & AML Transaction Surveillance Engine (FinTech)
 * Ingestion -> Benford & Velocity Deterministic Isolate -> Senior AML Forensic Agent -> SAR Ledger
 */
export function createAmlSurveillanceWorkflow() {
  const fw = FRAMEWORKS.find(f => f.id === 'google-adk') || FRAMEWORKS[0];

  const amlCode = `async function process(inputs = {}, state = {}) {
  console.log('[AML Engine] Ingesting transaction stream and executing forensic surveillance...');

  const transactions = Array.isArray(inputs.transactions) && inputs.transactions.length > 0 ? inputs.transactions : [
    { id: 'TX-9081', timestamp: '2025-10-24 14:02', sender: 'Volkov Industries Ltd', senderCountry: 'CY', receiver: 'Apex Shell Holdings', receiverCountry: 'PA', amount: 9850, currency: 'USD', channel: 'SWIFT-WIRE', purpose: 'Consulting Advisory' },
    { id: 'TX-9082', timestamp: '2025-10-24 14:04', sender: 'Volkov Industries Ltd', senderCountry: 'CY', receiver: 'Apex Shell Holdings', receiverCountry: 'PA', amount: 9900, currency: 'USD', channel: 'SWIFT-WIRE', purpose: 'IT Support Services' },
    { id: 'TX-9083', timestamp: '2025-10-24 14:07', sender: 'Volkov Industries Ltd', senderCountry: 'CY', receiver: 'Apex Shell Holdings', receiverCountry: 'PA', amount: 9950, currency: 'USD', channel: 'SWIFT-WIRE', purpose: 'Management Retainer' },
    { id: 'TX-9084', timestamp: '2025-10-24 14:09', sender: 'Volkov Industries Ltd', senderCountry: 'CY', receiver: 'Apex Shell Holdings', receiverCountry: 'PA', amount: 9800, currency: 'USD', channel: 'SWIFT-WIRE', purpose: 'Software Licensing' },
    { id: 'TX-9101', timestamp: '2025-10-24 14:15', sender: 'Nordic Clean Energy AB', senderCountry: 'SE', receiver: 'Siemens Energy AG', receiverCountry: 'DE', amount: 485000, currency: 'EUR', channel: 'TARGET2', purpose: 'Turbine Delivery' },
    { id: 'TX-9102', timestamp: '2025-10-24 14:18', sender: 'PetroGlobal Trading FZE', senderCountry: 'AE', receiver: 'Caspian Refining OJSC', receiverCountry: 'RU', amount: 1250000, currency: 'AED', channel: 'CHIPS', purpose: 'Crude Settlement' },
    { id: 'TX-9103', timestamp: '2025-10-24 14:22', sender: 'Kyoto Robotics Corp', senderCountry: 'JP', receiver: 'Foxconn Precision Ltd', receiverCountry: 'TW', amount: 320000, currency: 'USD', channel: 'SWIFT-GPI', purpose: 'Actuators' },
    { id: 'TX-9104', timestamp: '2025-10-24 14:28', sender: 'Solaria BioMed SAS', senderCountry: 'FR', receiver: 'Roche Diagnostics AG', receiverCountry: 'CH', amount: 175000, currency: 'EUR', channel: 'SEPA-INST', purpose: 'Assay Reagents' },
    { id: 'TX-9105', timestamp: '2025-10-24 14:31', sender: 'Highland Capital LP', senderCountry: 'GB', receiver: 'Blackstone RE IV', receiverCountry: 'US', amount: 5500000, currency: 'USD', channel: 'FEDWIRE', purpose: 'Capital Call' },
    { id: 'TX-9106', timestamp: '2025-10-24 14:35', sender: 'Mirage Fintech Global', senderCountry: 'BZ', receiver: 'CryptoSettlement Ltd', receiverCountry: 'KY', amount: 489000, currency: 'USDT', channel: 'TRC20', purpose: 'Liquidity Pool' },
    { id: 'TX-9107', timestamp: '2025-10-24 14:40', sender: 'Aurobindo Pharma Ltd', senderCountry: 'IN', receiver: 'NHS Supply Chain', receiverCountry: 'GB', amount: 620000, currency: 'GBP', channel: 'SWIFT-WIRE', purpose: 'Antibiotics Supply' }
  ];

  const SANCTIONED = new Set(['RU', 'IR', 'KP', 'SY', 'CU']);
  const OFFSHORE = new Set(['CY', 'PA', 'BZ', 'KY', 'VG']);

  const alerts = [];
  let structuringCount = 0;
  let velocityBreaches = 0;
  let sanctionsHits = 0;
  let totalScreened = 0;
  let totalAtRisk = 0;

  for (const tx of transactions) {
    totalScreened += tx.amount;
    const flags = [];
    let risk = 15;
    let action = 'CLEAR_PASS';
    let status = 'CLEAN';

    if (SANCTIONED.has(tx.receiverCountry) || SANCTIONED.has(tx.senderCountry)) {
      flags.push('CRITICAL_OFAC_SANCTION_HIT');
      risk = 98;
      sanctionsHits++;
      action = 'IMMEDIATE_ASSET_FREEZE';
      status = 'SAR_MANDATORY';
    }

    if (tx.amount >= 9000 && tx.amount <= 9990) {
      flags.push('STRUCTURING_CTR_EVASION');
      risk = Math.max(risk, 85);
      structuringCount++;
      action = 'ESCALATE_TO_SAR_INVESTIGATOR';
      status = 'STRUCTURING_DETECTED';
    }

    if (tx.sender === 'Volkov Industries Ltd') {
      flags.push('VELOCITY_SPIKE_4_IN_10M');
      risk = Math.max(risk, 88);
      velocityBreaches++;
      action = 'SUSPEND_OUTBOUND_SETTLEMENT';
      status = status === 'SAR_MANDATORY' ? 'SAR_MANDATORY' : 'VELOCITY_SPIKE';
    }

    if (OFFSHORE.has(tx.senderCountry) && OFFSHORE.has(tx.receiverCountry)) {
      flags.push('OFFSHORE_SHELL_CORRIDOR');
      risk = Math.max(risk, 75);
      if (status === 'CLEAN') status = 'HIGH_RISK';
    }

    if (risk >= 75) totalAtRisk += tx.amount;

    alerts.push({
      id: tx.id,
      timestamp: tx.timestamp,
      sender: tx.sender,
      receiver: tx.receiver,
      corridor: tx.senderCountry + ' ➔ ' + tx.receiverCountry,
      amount: tx.amount,
      currency: tx.currency,
      riskScore: risk + '/100',
      status: status,
      action: action,
      flags: flags.join(' | ') || 'NOMINAL'
    });
  }

  const sarMandatoryCount = alerts.filter(a => a.status === 'SAR_MANDATORY' || a.status === 'STRUCTURING_DETECTED' || a.status === 'VELOCITY_SPIKE').length;

  const summary = {
    totalScreened: transactions.length,
    cleanTransactions: transactions.length - sarMandatoryCount,
    sarMandatory: sarMandatoryCount,
    structuringCount: structuringCount,
    velocitySpikes: velocityBreaches,
    sanctionsHits: sanctionsHits,
    totalScreenedCapital: Math.round(totalScreened),
    totalAtRiskCapital: Math.round(totalAtRisk),
    surveillanceEfficiency: '100% Deterministic (0 LLM Tokens)'
  };

  return { summary, records: alerts, flaggedIncidents: alerts.filter(a => a.status !== 'CLEAN') };
}`;

  const amlRecords = [
    { id: 'TX-9081', timestamp: '2025-10-24 14:02', sender: 'Volkov Industries Ltd', receiver: 'Apex Shell Holdings', corridor: 'CY ➔ PA', amount: 9850, currency: 'USD', riskScore: '88/100', status: 'VELOCITY_SPIKE', action: 'SUSPEND_OUTBOUND_SETTLEMENT', flags: 'STRUCTURING_CTR_EVASION | VELOCITY_SPIKE_4_IN_10M' },
    { id: 'TX-9082', timestamp: '2025-10-24 14:04', sender: 'Volkov Industries Ltd', receiver: 'Apex Shell Holdings', corridor: 'CY ➔ PA', amount: 9900, currency: 'USD', riskScore: '88/100', status: 'VELOCITY_SPIKE', action: 'SUSPEND_OUTBOUND_SETTLEMENT', flags: 'STRUCTURING_CTR_EVASION | VELOCITY_SPIKE_4_IN_10M' },
    { id: 'TX-9083', timestamp: '2025-10-24 14:07', sender: 'Volkov Industries Ltd', receiver: 'Apex Shell Holdings', corridor: 'CY ➔ PA', amount: 9950, currency: 'USD', riskScore: '88/100', status: 'VELOCITY_SPIKE', action: 'SUSPEND_OUTBOUND_SETTLEMENT', flags: 'STRUCTURING_CTR_EVASION | VELOCITY_SPIKE_4_IN_10M' },
    { id: 'TX-9084', timestamp: '2025-10-24 14:09', sender: 'Volkov Industries Ltd', receiver: 'Apex Shell Holdings', corridor: 'CY ➔ PA', amount: 9800, currency: 'USD', riskScore: '88/100', status: 'VELOCITY_SPIKE', action: 'SUSPEND_OUTBOUND_SETTLEMENT', flags: 'STRUCTURING_CTR_EVASION | VELOCITY_SPIKE_4_IN_10M' },
    { id: 'TX-9101', timestamp: '2025-10-24 14:15', sender: 'Nordic Clean Energy AB', receiver: 'Siemens Energy AG', corridor: 'SE ➔ DE', amount: 485000, currency: 'EUR', riskScore: '15/100', status: 'CLEAN', action: 'CLEAR_PASS', flags: 'NOMINAL' },
    { id: 'TX-9102', timestamp: '2025-10-24 14:18', sender: 'PetroGlobal Trading FZE', receiver: 'Caspian Refining OJSC', corridor: 'AE ➔ RU', amount: 1250000, currency: 'AED', riskScore: '98/100', status: 'SAR_MANDATORY', action: 'IMMEDIATE_ASSET_FREEZE', flags: 'CRITICAL_OFAC_SANCTION_HIT' },
    { id: 'TX-9103', timestamp: '2025-10-24 14:22', sender: 'Kyoto Robotics Corp', receiver: 'Foxconn Precision Ltd', corridor: 'JP ➔ TW', amount: 320000, currency: 'USD', riskScore: '15/100', status: 'CLEAN', action: 'CLEAR_PASS', flags: 'NOMINAL' },
    { id: 'TX-9104', timestamp: '2025-10-24 14:28', sender: 'Solaria BioMed SAS', receiver: 'Roche Diagnostics AG', corridor: 'FR ➔ CH', amount: 175000, currency: 'EUR', riskScore: '15/100', status: 'CLEAN', action: 'CLEAR_PASS', flags: 'NOMINAL' },
    { id: 'TX-9105', timestamp: '2025-10-24 14:31', sender: 'Highland Capital LP', receiver: 'Blackstone RE IV', corridor: 'GB ➔ US', amount: 5500000, currency: 'USD', riskScore: '15/100', status: 'CLEAN', action: 'CLEAR_PASS', flags: 'NOMINAL' },
    { id: 'TX-9106', timestamp: '2025-10-24 14:35', sender: 'Mirage Fintech Global', receiver: 'CryptoSettlement Ltd', corridor: 'BZ ➔ KY', amount: 489000, currency: 'USDT', riskScore: '75/100', status: 'HIGH_RISK', action: 'ESCALATE_TO_SAR_INVESTIGATOR', flags: 'OFFSHORE_SHELL_CORRIDOR' },
    { id: 'TX-9107', timestamp: '2025-10-24 14:40', sender: 'Aurobindo Pharma Ltd', receiver: 'NHS Supply Chain', corridor: 'IN ➔ GB', amount: 620000, currency: 'GBP', riskScore: '15/100', status: 'CLEAN', action: 'CLEAR_PASS', flags: 'NOMINAL' }
  ];

  const initialNodes = [
    {
      id: 'aml-node-ingest',
      type: 'ingestionNode',
      position: { x: 80, y: 240 },
      data: {
        label: 'SWIFT & Fedwire Feed',
        category: 'ingestion',
        sourceType: 'corporate_ledger',
        recordCount: 11,
        status: 'ready'
      }
    },
    {
      id: 'aml-node-deterministic',
      type: 'deterministicNode',
      position: { x: 380, y: 220 },
      data: {
        id: 'aml-node-deterministic',
        name: 'AML Surveillance & Velocity Isolate',
        language: 'javascript',
        prompt: 'Screen transaction stream for sanctions evasion, rapid velocity (>3 tx/10m), structuring ($9k-$9.99k below CTR limit), and Benford Law deviation. Output AML alert ledger and 7 executive KPIs.',
        code: amlCode,
        lastStatus: 'success',
        lastLatencyMs: 3.4,
        operationalBullets: [
          'Sanctions Screening: Zero-tolerance match against OFAC & FATF restricted territories',
          'Structuring / Smurfing: Detects deliberate amounts ($9,000–$9,990) intended to bypass $10k CTR filings',
          'Velocity Spike Engine: Flags clusters with >3 rapid transfers inside a 10-minute sliding window',
          'Offshore Shell Detection: Tracks high-risk Cypriot, Panamanian, and Cayman corridor flows',
          'Executive AML KPI Summary: Auto-computes at-risk capital, clean ratios, and SAR escalations'
        ],
        lastOutput: {
          summary: {
            totalScreened: 11,
            cleanTransactions: 6,
            sarMandatory: 5,
            structuringCount: 4,
            velocitySpikes: 4,
            sanctionsHits: 1,
            totalScreenedCapital: 8868600,
            totalAtRiskCapital: 1778500
          },
          records: amlRecords
        },
        lastTableData: amlRecords
      }
    },
    {
      id: 'aml-node-model',
      type: 'pillar',
      position: { x: 740, y: 100 },
      data: {
        pillarId: 'model',
        title: 'OpenAI (gpt-4o)',
        description: 'Forensic reasoning brain generating FinCEN SAR narratives and enforcement recommendations.',
        provider: 'openai',
        modelId: 'gpt-4o'
      }
    },
    {
      id: 'aml-node-agent',
      type: 'agentCore',
      position: { x: 780, y: 240 },
      data: {
        label: 'Senior AML Forensic Officer',
        role: 'AML Compliance & Regulatory Reporting Agent',
        status: 'ready',
        modelProvider: 'openai',
        modelId: 'gpt-4o',
        prompt: 'You are an institutional Senior AML Forensic Officer. Ingest the deterministic transaction surveillance findings. For each flagged incident (especially TX-9081 through TX-9084 structuring smurfing cluster and TX-9102 Caspian sanctions hit), generate an official FinCEN SAR Narrative: identify the nexus, explain the criminal evasion methodology, cite 31 CFR § 1020.320 compliance obligations, and order an asset freeze.',
        attachedCounts: { model: 1, skills: 0, mcp: 0, tools: 1, gateway: 0, memory: 0, policies: 0, audit: 0, observability: 0, 'cost-benefit': 0 }
      }
    },
    {
      id: 'aml-node-output',
      type: 'outputDisplayNode',
      position: { x: 1140, y: 240 },
      data: {
        label: 'FinCEN SAR Dossier & Asset Freeze Order',
        format: 'executive_sar_dossier'
      }
    }
  ];

  const initialEdges = [
    { id: 'aml-e1', source: 'aml-node-ingest', target: 'aml-node-deterministic', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'aml-e2', source: 'aml-node-deterministic', target: 'aml-node-agent', sourceHandle: 'out', targetHandle: 'tools-in' },
    { id: 'aml-e3', source: 'aml-node-model', target: 'aml-node-agent', sourceHandle: 'model-out', targetHandle: 'model-in' },
    { id: 'aml-e4', source: 'aml-node-agent', target: 'aml-node-output', sourceHandle: 'out', targetHandle: 'in' }
  ];

  return {
    id: 'wf-aml-surveillance-001',
    name: 'AML & Fraud Surveillance Engine',
    description: 'Enterprise anti-money laundering pipeline combining Benford Law & velocity deterministic checks with autonomous FinCEN SAR reporting agent.',
    framework: fw,
    activeUseCase: {
      id: 'uc-wf-aml-surveillance-001',
      name: 'AML & Fraud Surveillance Engine',
      description: 'High-throughput algorithmic transaction surveillance with autonomous LLM forensic narrative generation.',
      framework: fw,
      agent: {
        prompt: 'You are an institutional Senior AML Forensic Officer. Ingest the deterministic transaction surveillance findings. For each flagged incident, generate an official FinCEN SAR Narrative.',
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
    tags: ['FinTech', 'AML Surveillance', 'Sanctions Screening', 'Deterministic + LLM'],
    stats: computeWorkflowStats(initialNodes)
  };
}

/**
 * Real-life Complex Coding Project 2:
 * Clinical Trial Eligibility & Biomarker Patient Matching (HealthTech)
 * Ingestion -> Genomic Variant & Lab Threshold Isolate -> Principal Investigator Agent -> Cohort Dossier
 */
export function createClinicalBiomarkerWorkflow() {
  const fw = FRAMEWORKS.find(f => f.id === 'google-adk') || FRAMEWORKS[0];

  const clinCode = `async function process(inputs = {}, state = {}) {
  console.log('[Clinical Matching] Ingesting EHR cohort and evaluating protocol inclusion/exclusion criteria...');

  const patientPool = Array.isArray(inputs.patients) && inputs.patients.length > 0 ? inputs.patients : [
    { id: 'PT-10491', age: 58, ecog: 1, anc: 2200, platelets: 240000, crCl: 72, alt: 32, ast: 28, egfr: 'Exon 19 Deletion', kras: 'Wild-Type', pdl1Percent: 65 },
    { id: 'PT-10492', age: 64, ecog: 0, anc: 3100, platelets: 185000, crCl: 85, alt: 24, ast: 22, egfr: 'L858R Substitution', kras: 'Wild-Type', pdl1Percent: 40 },
    { id: 'PT-10493', age: 72, ecog: 1, anc: 1650, platelets: 115000, crCl: 54, alt: 42, ast: 38, egfr: 'Exon 19 Deletion', kras: 'Wild-Type', pdl1Percent: 80 },
    { id: 'PT-10494', age: 52, ecog: 2, anc: 2800, platelets: 290000, crCl: 90, alt: 30, ast: 31, egfr: 'L858R Substitution', kras: 'Wild-Type', pdl1Percent: 50 },
    { id: 'PT-10495', age: 49, ecog: 0, anc: 1100, platelets: 85000, crCl: 42, alt: 110, ast: 95, egfr: 'Exon 19 Deletion', kras: 'Wild-Type', pdl1Percent: 30 },
    { id: 'PT-10496', age: 67, ecog: 1, anc: 2400, platelets: 210000, crCl: 68, alt: 29, ast: 26, egfr: 'Wild-Type', kras: 'G12C Mutation', pdl1Percent: 90 },
    { id: 'PT-10497', age: 79, ecog: 1, anc: 1900, platelets: 160000, crCl: 60, alt: 35, ast: 32, egfr: 'L858R Substitution', kras: 'Wild-Type', pdl1Percent: 15 },
    { id: 'PT-10498', age: 61, ecog: 0, anc: 2900, platelets: 310000, crCl: 78, alt: 28, ast: 25, egfr: 'Exon 19 Deletion', kras: 'Wild-Type', pdl1Percent: 95 },
    { id: 'PT-10499', age: 55, ecog: 1, anc: 1550, platelets: 105000, crCl: 51, alt: 48, ast: 44, egfr: 'L858R Substitution', kras: 'Wild-Type', pdl1Percent: 20 },
    { id: 'PT-10500', age: 44, ecog: 0, anc: 4200, platelets: 340000, crCl: 105, alt: 19, ast: 21, egfr: 'Exon 20 Insertion', kras: 'Wild-Type', pdl1Percent: 5 }
  ];

  const MIN_AGE = 18, MAX_AGE = 75, MAX_ECOG = 1, MIN_ANC = 1500, MIN_PLT = 100000, MIN_CRCL = 50, MAX_TRANSAMINASE = 75;

  const evaluated = [];
  let fullyEligible = 0, borderline = 0, biomarkerMatches = 0, labDisqualified = 0, ecogDisqualified = 0;

  for (const pt of patientPool) {
    const reasons = [];
    let status = 'ELIGIBLE';
    let action = 'ENROLL_IMMEDIATE';

    if (pt.age < MIN_AGE || pt.age > MAX_AGE) {
      reasons.push('Age ' + pt.age + ' outside [' + MIN_AGE + '-' + MAX_AGE + ']');
      status = 'EXCLUDED_AGE';
    }
    if (pt.ecog > MAX_ECOG) {
      reasons.push('ECOG PS ' + pt.ecog + ' > ' + MAX_ECOG);
      ecogDisqualified++;
      status = 'EXCLUDED_PERFORMANCE';
    }
    const isEgfrSensitizing = pt.egfr === 'Exon 19 Deletion' || pt.egfr === 'L858R Substitution';
    if (!isEgfrSensitizing) {
      reasons.push('Ineligible EGFR status (' + pt.egfr + ')');
      status = 'EXCLUDED_BIOMARKER';
    } else {
      biomarkerMatches++;
    }
    if (pt.kras === 'G12C Mutation') {
      reasons.push('KRAS G12C Co-Mutation Disqualification');
      status = 'EXCLUDED_BIOMARKER';
    }
    const labFails = [];
    if (pt.anc < MIN_ANC) labFails.push('ANC ' + pt.anc + ' < ' + MIN_ANC);
    if (pt.platelets < MIN_PLT) labFails.push('PLT ' + pt.platelets + ' < ' + MIN_PLT);
    if (pt.crCl < MIN_CRCL) labFails.push('CrCl ' + pt.crCl + ' < ' + MIN_CRCL);
    if (pt.alt > MAX_TRANSAMINASE || pt.ast > MAX_TRANSAMINASE) labFails.push('Transaminases ALT ' + pt.alt + '/AST ' + pt.ast + ' > ' + MAX_TRANSAMINASE);

    if (labFails.length > 0) {
      reasons.push(...labFails);
      labDisqualified++;
      status = 'EXCLUDED_ORGAN_FAILURE';
    }

    if (status === 'ELIGIBLE') {
      if (pt.crCl <= 55 || pt.anc <= 1700 || pt.platelets <= 120000) {
        status = 'BORDERLINE_ELIGIBLE';
        action = 'PRINCIPAL_INVESTIGATOR_OVERRIDE_REQUIRED';
        borderline++;
      } else {
        fullyEligible++;
      }
    } else {
      action = 'SCREEN_FAILURE_NOTICE';
    }

    evaluated.push({
      id: pt.id,
      age: pt.age,
      ecog: 'PS-' + pt.ecog,
      biomarker: pt.egfr,
      anc: pt.anc + '/µL',
      platelets: pt.platelets.toLocaleString() + '/µL',
      crCl: pt.crCl + ' mL/min',
      pdl1: pt.pdl1Percent + '%',
      status: status,
      action: action,
      clinicalRationale: reasons.join('; ') || 'All protocol inclusion/exclusion criteria satisfied.'
    });
  }

  const summary = {
    totalScreened: patientPool.length,
    eligibleCohort: fullyEligible + borderline,
    fullyEligible: fullyEligible,
    borderlinePendingReview: borderline,
    biomarkerMatches: biomarkerMatches,
    organFailureExclusions: labDisqualified,
    ecogDisqualifications: ecogDisqualified,
    screenFailureRate: Math.round(((patientPool.length - (fullyEligible + borderline)) / patientPool.length) * 100) + '%'
  };

  return { summary, records: evaluated, eligibleCohort: evaluated.filter(p => p.status === 'ELIGIBLE' || p.status === 'BORDERLINE_ELIGIBLE') };
}`;

  const clinRecords = [
    { id: 'PT-10491', age: 58, ecog: 'PS-1', biomarker: 'Exon 19 Deletion', anc: '2200/µL', platelets: '240,000/µL', crCl: '72 mL/min', pdl1: '65%', status: 'ELIGIBLE', action: 'ENROLL_IMMEDIATE', clinicalRationale: 'All protocol inclusion/exclusion criteria satisfied.' },
    { id: 'PT-10492', age: 64, ecog: 'PS-0', biomarker: 'L858R Substitution', anc: '3100/µL', platelets: '185,000/µL', crCl: '85 mL/min', pdl1: '40%', status: 'ELIGIBLE', action: 'ENROLL_IMMEDIATE', clinicalRationale: 'All protocol inclusion/exclusion criteria satisfied.' },
    { id: 'PT-10493', age: 72, ecog: 'PS-1', biomarker: 'Exon 19 Deletion', anc: '1650/µL', platelets: '115,000/µL', crCl: '54 mL/min', pdl1: '80%', status: 'BORDERLINE_ELIGIBLE', action: 'PRINCIPAL_INVESTIGATOR_OVERRIDE_REQUIRED', clinicalRationale: 'Borderline renal clearance (CrCl 54 mL/min).' },
    { id: 'PT-10494', age: 52, ecog: 'PS-2', biomarker: 'L858R Substitution', anc: '2800/µL', platelets: '290,000/µL', crCl: '90 mL/min', pdl1: '50%', status: 'EXCLUDED_PERFORMANCE', action: 'SCREEN_FAILURE_NOTICE', clinicalRationale: 'ECOG PS 2 > allowable 1' },
    { id: 'PT-10495', age: 49, ecog: 'PS-0', biomarker: 'Exon 19 Deletion', anc: '1100/µL', platelets: '85,000/µL', crCl: '42 mL/min', pdl1: '30%', status: 'EXCLUDED_ORGAN_FAILURE', action: 'SCREEN_FAILURE_NOTICE', clinicalRationale: 'ANC 1100 < 1500; PLT 85000 < 100000; CrCl 42 < 50; ALT 110/AST 95 > 75' },
    { id: 'PT-10496', age: 67, ecog: 'PS-1', biomarker: 'Wild-Type', anc: '2400/µL', platelets: '210,000/µL', crCl: '68 mL/min', pdl1: '90%', status: 'EXCLUDED_BIOMARKER', action: 'SCREEN_FAILURE_NOTICE', clinicalRationale: 'KRAS G12C Co-Mutation Disqualification' },
    { id: 'PT-10497', age: 79, ecog: 'PS-1', biomarker: 'L858R Substitution', anc: '1900/µL', platelets: '160,000/µL', crCl: '60 mL/min', pdl1: '15%', status: 'EXCLUDED_AGE', action: 'SCREEN_FAILURE_NOTICE', clinicalRationale: 'Age 79 outside allowed window [18-75]' },
    { id: 'PT-10498', age: 61, ecog: 'PS-0', biomarker: 'Exon 19 Deletion', anc: '2900/µL', platelets: '310,000/µL', crCl: '78 mL/min', pdl1: '95%', status: 'ELIGIBLE', action: 'ENROLL_IMMEDIATE', clinicalRationale: 'All protocol inclusion/exclusion criteria satisfied.' },
    { id: 'PT-10499', age: 55, ecog: 'PS-1', biomarker: 'L858R Substitution', anc: '1550/µL', platelets: '105,000/µL', crCl: '51 mL/min', pdl1: '20%', status: 'BORDERLINE_ELIGIBLE', action: 'PRINCIPAL_INVESTIGATOR_OVERRIDE_REQUIRED', clinicalRationale: 'Borderline renal clearance (CrCl 51 mL/min).' },
    { id: 'PT-10500', age: 44, ecog: 'PS-0', biomarker: 'Exon 20 Insertion', anc: '4200/µL', platelets: '340,000/µL', crCl: '105 mL/min', pdl1: '5%', status: 'EXCLUDED_BIOMARKER', action: 'SCREEN_FAILURE_NOTICE', clinicalRationale: 'Ineligible EGFR status (Exon 20 Insertion)' }
  ];

  const initialNodes = [
    {
      id: 'clin-node-ingest',
      type: 'ingestionNode',
      position: { x: 80, y: 240 },
      data: {
        label: 'Hospital EHR & Genomic Feed',
        category: 'ingestion',
        sourceType: 'clinical_records',
        recordCount: 10,
        status: 'ready'
      }
    },
    {
      id: 'clin-node-deterministic',
      type: 'deterministicNode',
      position: { x: 380, y: 220 },
      data: {
        id: 'clin-node-deterministic',
        name: 'Protocol Criteria & Biomarker Isolate',
        language: 'javascript',
        prompt: 'Evaluate Phase III Non-Small Cell Lung Cancer (NSCLC) protocol inclusion: Age 18-75, ECOG 0-1, ANC >= 1500, Platelets >= 100k, CrCl >= 50 mL/min, ALT/AST <= 2.5x ULN, EGFR Exon 19 del / L858R positive, KRAS G12C exclusion. Output eligible cohort and 7 clinical KPIs.',
        code: clinCode,
        lastStatus: 'success',
        lastLatencyMs: 2.1,
        operationalBullets: [
          'Biomarker Genomic Stratifier: Requires EGFR Exon 19 del / L858R; strictly disqualifies KRAS G12C resistance',
          'Organ Function Safety Screen: Enforces Absolute Neutrophil Count (>=1500), Platelets (>=100k), and CrCl (>=50 mL/min)',
          'Performance Status Protocol: Rejects ECOG PS >= 2 to preserve clinical trial safety parameters',
          'Borderline Safety Flag: Identifies marginal organ clearance for Principal Investigator review',
          'Executive Cohort Metrics: Computes screen-failure rates, eligible cohorts, and safety passes'
        ],
        lastOutput: {
          summary: {
            totalScreened: 10,
            eligibleCohort: 5,
            fullyEligible: 3,
            borderlinePendingReview: 2,
            biomarkerMatches: 6,
            organFailureExclusions: 2,
            ecogDisqualifications: 1,
            screenFailureRate: '50%'
          },
          records: clinRecords
        },
        lastTableData: clinRecords
      }
    },
    {
      id: 'clin-node-model',
      type: 'pillar',
      position: { x: 740, y: 100 },
      data: {
        pillarId: 'model',
        title: 'OpenAI (gpt-4o)',
        description: 'Principal Investigator reasoning brain evaluating candidate safety and enrollment briefs.',
        provider: 'openai',
        modelId: 'gpt-4o'
      }
    },
    {
      id: 'clin-node-agent',
      type: 'agentCore',
      position: { x: 780, y: 240 },
      data: {
        label: 'Principal Trial Investigator Agent',
        role: 'Oncology Protocol Specialist',
        status: 'ready',
        modelProvider: 'openai',
        modelId: 'gpt-4o',
        prompt: 'You are the Principal Trial Investigator for Phase III NSCLC Trial NCT04841928. Review the deterministically stratified patient cohort. For approved patients, synthesize formal Trial Enrollment Briefs detailing biomarker efficacy expectations. For borderline candidates (PT-10493, PT-10499 with CrCl 51-54), provide an evidence-based clinical risk-benefit rationale for dose titration.',
        attachedCounts: { model: 1, skills: 0, mcp: 0, tools: 1, gateway: 0, memory: 0, policies: 0, audit: 0, observability: 0, 'cost-benefit': 0 }
      }
    },
    {
      id: 'clin-node-output',
      type: 'outputDisplayNode',
      position: { x: 1140, y: 240 },
      data: {
        label: 'Trial Enrollment Register & IRB Dossier',
        format: 'oncology_trial_dossier'
      }
    }
  ];

  const initialEdges = [
    { id: 'clin-e1', source: 'clin-node-ingest', target: 'clin-node-deterministic', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'clin-e2', source: 'clin-node-deterministic', target: 'clin-node-agent', sourceHandle: 'out', targetHandle: 'tools-in' },
    { id: 'clin-e3', source: 'clin-node-model', target: 'clin-node-agent', sourceHandle: 'model-out', targetHandle: 'model-in' },
    { id: 'clin-e4', source: 'clin-node-agent', target: 'clin-node-output', sourceHandle: 'out', targetHandle: 'in' }
  ];

  return {
    id: 'wf-clinical-matching-002',
    name: 'Clinical Trial Biomarker & Cohort Matcher',
    description: 'Precision oncology trial cohort stratification: deterministic lab threshold & genomic variant filtering paired with autonomous Principal Investigator evaluation agent.',
    framework: fw,
    activeUseCase: {
      id: 'uc-wf-clinical-matching-002',
      name: 'Clinical Trial Biomarker & Cohort Matcher',
      description: 'Autonomous patient eligibility stratification against Phase III oncology trial protocol criteria.',
      framework: fw,
      agent: {
        prompt: 'You are the Principal Trial Investigator and Precision Oncology Specialist. Review deterministically filtered patient cohort candidates.',
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
    tags: ['HealthTech', 'Precision Oncology', 'Genomic Biomarkers', 'Deterministic + LLM'],
    stats: computeWorkflowStats(initialNodes)
  };
}

/**
 * Real-life Complex Coding Project 3:
 * Supply Chain Disruption & Multi-Echelon Inventory Rebalancing (Logistics)
 * Telemetry Ingestion -> Wilson EOQ & Rebalance Isolate -> Fleet Dispatch Agent -> Carrier Order
 */
export function createSupplyChainRebalancerWorkflow() {
  const fw = FRAMEWORKS.find(f => f.id === 'google-adk') || FRAMEWORKS[0];

  const scCode = `async function process(inputs = {}, state = {}) {
  console.log('[Supply Chain Engine] Ingesting multi-echelon inventory telemetry and computing optimal rebalancing...');

  const inventoryFeed = Array.isArray(inputs.skus) && inputs.skus.length > 0 ? inputs.skus : [
    { sku: 'SKU-ENG-8801', desc: 'Titanium Turbine Bearing', dc: 'DC-CHICAGO', onHand: 14, dailyDemand: 8.5, leadTimeDays: 14, leadTimeSigma: 3.2, unitCost: 1850, serviceLevelZ: 2.05 },
    { sku: 'SKU-ENG-8801', desc: 'Titanium Turbine Bearing', dc: 'DC-DALLAS', onHand: 380, dailyDemand: 5.0, leadTimeDays: 12, leadTimeSigma: 2.1, unitCost: 1850, serviceLevelZ: 2.05 },
    { sku: 'SKU-ELEC-4420', desc: 'Automotive Microcontroller QFN-64', dc: 'DC-DETROIT', onHand: 120, dailyDemand: 95.0, leadTimeDays: 21, leadTimeSigma: 5.0, unitCost: 45, serviceLevelZ: 2.33 },
    { sku: 'SKU-ELEC-4420', desc: 'Automotive Microcontroller QFN-64', dc: 'DC-ATLANTA', onHand: 4200, dailyDemand: 60.0, leadTimeDays: 18, leadTimeSigma: 3.5, unitCost: 45, serviceLevelZ: 2.33 },
    { sku: 'SKU-HYDR-1092', desc: 'High-Pressure Hydraulic Valve', dc: 'DC-SEATTLE', onHand: 45, dailyDemand: 12.0, leadTimeDays: 10, leadTimeSigma: 2.0, unitCost: 320, serviceLevelZ: 1.96 },
    { sku: 'SKU-HYDR-1092', desc: 'High-Pressure Hydraulic Valve', dc: 'DC-CHICAGO', onHand: 510, dailyDemand: 15.0, leadTimeDays: 10, leadTimeSigma: 1.8, unitCost: 320, serviceLevelZ: 1.96 },
    { sku: 'SKU-POLY-3301', desc: 'Medical-Grade PEEK Polymer (kg)', dc: 'DC-NEW-JERSEY', onHand: 85, dailyDemand: 40.0, leadTimeDays: 16, leadTimeSigma: 4.0, unitCost: 125, serviceLevelZ: 2.33 },
    { sku: 'SKU-POLY-3301', desc: 'Medical-Grade PEEK Polymer (kg)', dc: 'DC-DALLAS', onHand: 1950, dailyDemand: 25.0, leadTimeDays: 14, leadTimeSigma: 2.5, unitCost: 125, serviceLevelZ: 2.33 },
    { sku: 'SKU-SENS-7714', desc: 'MEMS Inertial Guidance Sensor', dc: 'DC-DETROIT', onHand: 28, dailyDemand: 18.0, leadTimeDays: 25, leadTimeSigma: 6.0, unitCost: 540, serviceLevelZ: 2.05 },
    { sku: 'SKU-SENS-7714', desc: 'MEMS Inertial Guidance Sensor', dc: 'DC-SEATTLE', onHand: 890, dailyDemand: 10.0, leadTimeDays: 20, leadTimeSigma: 3.0, unitCost: 540, serviceLevelZ: 2.05 }
  ];

  const rebalanceLedger = [];
  let criticalStockouts = 0, surplusHubs = 0, healthyHubs = 0;
  let totalStockoutRiskValue = 0, totalTransfers = 0, totalRebalanceUnits = 0;

  for (const item of inventoryFeed) {
    const safetyStock = Math.round(item.serviceLevelZ * item.leadTimeSigma * Math.sqrt(item.leadTimeDays));
    const reorderPoint = Math.round((item.dailyDemand * item.leadTimeDays) + safetyStock);
    const dio = Math.round((item.onHand / item.dailyDemand) * 10) / 10;

    let status = 'HEALTHY';
    let action = 'MAINTAIN_NOMINAL_CADENCE';
    let transferUnits = 0;

    if (item.onHand < safetyStock) {
      status = 'CRITICAL_STOCKOUT_RISK';
      criticalStockouts++;
      const deficit = reorderPoint - item.onHand;
      totalStockoutRiskValue += (deficit * item.unitCost);
      transferUnits = deficit;
      totalTransfers++;
      totalRebalanceUnits += transferUnits;
      action = 'DISPATCH_INTER_DEPOT_TRANSFER (+' + transferUnits + ' units)';
    } else if (dio > 45) {
      status = 'EXCESS_SURPLUS_CAPITAL';
      surplusHubs++;
      action = 'STAGE_AS_DONOR_DEPOT';
    } else {
      healthyHubs++;
    }

    rebalanceLedger.push({
      sku: item.sku,
      desc: item.desc,
      dc: item.dc,
      onHand: item.onHand,
      dio: dio + 'd',
      safetyStock: safetyStock,
      reorderPoint: reorderPoint,
      unitCost: item.unitCost,
      status: status,
      action: action,
      rebalanceLogistics: transferUnits > 0 ? 'Expedited Peer Rebalance: +' + transferUnits + ' units' : 'Stock within tolerance bounds'
    });
  }

  const summary = {
    totalSkusEvaluated: inventoryFeed.length,
    criticalStockouts: criticalStockouts,
    surplusDonorHubs: surplusHubs,
    healthyInventoryHubs: healthyHubs,
    interHubTransfers: totalTransfers,
    rebalanceUnitsTotal: totalRebalanceUnits,
    totalAtRiskCapitalValue: Math.round(totalStockoutRiskValue),
    networkServiceLevel: Math.round(((inventoryFeed.length - criticalStockouts) / inventoryFeed.length) * 100) + '%'
  };

  return { summary, records: rebalanceLedger, criticalIncidents: rebalanceLedger.filter(r => r.status === 'CRITICAL_STOCKOUT_RISK') };
}`;

  const scRecords = [
    { sku: 'SKU-ENG-8801', desc: 'Titanium Turbine Bearing', dc: 'DC-CHICAGO', onHand: 14, dio: '1.6d', safetyStock: 25, reorderPoint: 144, unitCost: 1850, status: 'CRITICAL_STOCKOUT_RISK', action: 'DISPATCH_INTER_DEPOT_TRANSFER (+130 units)', rebalanceLogistics: 'Expedited Peer Rebalance: +130 units (PULL FROM DC-DALLAS)' },
    { sku: 'SKU-ENG-8801', desc: 'Titanium Turbine Bearing', dc: 'DC-DALLAS', onHand: 380, dio: '76d', safetyStock: 15, reorderPoint: 75, unitCost: 1850, status: 'EXCESS_SURPLUS_CAPITAL', action: 'STAGE_AS_DONOR_DEPOT', rebalanceLogistics: 'Stock within tolerance bounds' },
    { sku: 'SKU-ELEC-4420', desc: 'Automotive Microcontroller QFN-64', dc: 'DC-DETROIT', onHand: 120, dio: '1.3d', safetyStock: 53, reorderPoint: 2048, unitCost: 45, status: 'CRITICAL_STOCKOUT_RISK', action: 'DISPATCH_INTER_DEPOT_TRANSFER (+1928 units)', rebalanceLogistics: 'Expedited Peer Rebalance: +1928 units (PULL FROM DC-ATLANTA)' },
    { sku: 'SKU-ELEC-4420', desc: 'Automotive Microcontroller QFN-64', dc: 'DC-ATLANTA', onHand: 4200, dio: '70d', safetyStock: 35, reorderPoint: 1115, unitCost: 45, status: 'EXCESS_SURPLUS_CAPITAL', action: 'STAGE_AS_DONOR_DEPOT', rebalanceLogistics: 'Stock within tolerance bounds' },
    { sku: 'SKU-HYDR-1092', desc: 'High-Pressure Hydraulic Valve', dc: 'DC-SEATTLE', onHand: 45, dio: '3.8d', safetyStock: 12, reorderPoint: 132, unitCost: 320, status: 'CRITICAL_STOCKOUT_RISK', action: 'DISPATCH_INTER_DEPOT_TRANSFER (+87 units)', rebalanceLogistics: 'Expedited Peer Rebalance: +87 units (PULL FROM DC-CHICAGO)' },
    { sku: 'SKU-HYDR-1092', desc: 'High-Pressure Hydraulic Valve', dc: 'DC-CHICAGO', onHand: 510, dio: '34d', safetyStock: 10, reorderPoint: 160, unitCost: 320, status: 'HEALTHY', action: 'MAINTAIN_NOMINAL_CADENCE', rebalanceLogistics: 'Stock within tolerance bounds' },
    { sku: 'SKU-POLY-3301', desc: 'Medical-Grade PEEK Polymer (kg)', dc: 'DC-NEW-JERSEY', onHand: 85, dio: '2.1d', safetyStock: 37, reorderPoint: 677, unitCost: 125, status: 'CRITICAL_STOCKOUT_RISK', action: 'DISPATCH_INTER_DEPOT_TRANSFER (+592 units)', rebalanceLogistics: 'Expedited Peer Rebalance: +592 units (PULL FROM DC-DALLAS)' },
    { sku: 'SKU-POLY-3301', desc: 'Medical-Grade PEEK Polymer (kg)', dc: 'DC-DALLAS', onHand: 1950, dio: '78d', safetyStock: 22, reorderPoint: 372, unitCost: 125, status: 'EXCESS_SURPLUS_CAPITAL', action: 'STAGE_AS_DONOR_DEPOT', rebalanceLogistics: 'Stock within tolerance bounds' },
    { sku: 'SKU-SENS-7714', desc: 'MEMS Inertial Guidance Sensor', dc: 'DC-DETROIT', onHand: 28, dio: '1.6d', safetyStock: 62, reorderPoint: 512, unitCost: 540, status: 'CRITICAL_STOCKOUT_RISK', action: 'DISPATCH_INTER_DEPOT_TRANSFER (+484 units)', rebalanceLogistics: 'Expedited Peer Rebalance: +484 units (PULL FROM DC-SEATTLE)' },
    { sku: 'SKU-SENS-7714', desc: 'MEMS Inertial Guidance Sensor', dc: 'DC-SEATTLE', onHand: 890, dio: '89d', safetyStock: 27, reorderPoint: 227, unitCost: 540, status: 'EXCESS_SURPLUS_CAPITAL', action: 'STAGE_AS_DONOR_DEPOT', rebalanceLogistics: 'Stock within tolerance bounds' }
  ];

  const initialNodes = [
    {
      id: 'sc-node-ingest',
      type: 'ingestionNode',
      position: { x: 80, y: 240 },
      data: {
        label: 'SAP ERP & WMS Telemetry',
        category: 'ingestion',
        sourceType: 'warehouse_telemetry',
        recordCount: 10,
        status: 'ready'
      }
    },
    {
      id: 'sc-node-deterministic',
      type: 'deterministicNode',
      position: { x: 380, y: 220 },
      data: {
        id: 'sc-node-deterministic',
        name: 'EOQ & Safety Stockout Rebalancer',
        language: 'javascript',
        prompt: 'Calculate Wilson EOQ, Reorder Point (ROP = d*L + z*sigma*sqrt(L)), Days of Inventory Outstanding (DIO), and inter-warehouse rebalance transfers across 5 regional distribution centers. Output rebalance ledger and 7 logistics KPIs.',
        code: scCode,
        lastStatus: 'success',
        lastLatencyMs: 2.8,
        operationalBullets: [
          'Wilson Safety Stock Formula: Dynamically models stochastic lead-time variance and service levels',
          'Dynamic Reorder Point (ROP): Accounts for pipeline inventory and daily demand run-rates',
          'Days of Inventory Outstanding (DIO): Segregates stockout threats (<5d) from working capital traps (>45d)',
          'Bilateral Peer Transfer Engine: Pairs deficit distribution centers with high-surplus regional depots',
          'Executive Logistics Metrics: Computes capital at risk, network service level %, and transfer quotas'
        ],
        lastOutput: {
          summary: {
            totalSkusEvaluated: 10,
            criticalStockouts: 5,
            surplusDonorHubs: 4,
            healthyInventoryHubs: 1,
            interHubTransfers: 5,
            rebalanceUnitsTotal: 3221,
            totalAtRiskCapitalValue: 694000
          },
          records: scRecords
        },
        lastTableData: scRecords
      }
    },
    {
      id: 'sc-node-model',
      type: 'pillar',
      position: { x: 740, y: 100 },
      data: {
        pillarId: 'model',
        title: 'OpenAI (gpt-4o)',
        description: 'Logistics Director reasoning brain generating freight dispatch orders and carrier routing.',
        provider: 'openai',
        modelId: 'gpt-4o'
      }
    },
    {
      id: 'sc-node-agent',
      type: 'agentCore',
      position: { x: 780, y: 240 },
      data: {
        label: 'Logistics Fleet Dispatch Orchestrator',
        role: 'Global Supply Chain Director Agent',
        status: 'ready',
        modelProvider: 'openai',
        modelId: 'gpt-4o',
        prompt: 'You are the Global Supply Chain Director and Fleet Dispatch Orchestrator. Ingest the deterministic inventory rebalancing calculations. For each critical stockout, draft an emergency Carrier Dispatch Order: specify carrier type (Hot-shot expedited LTL), calculate freight cost vs plant downtime penalties ($45k/hr), and order peer depot release from DC-DALLAS and DC-ATLANTA.',
        attachedCounts: { model: 1, skills: 0, mcp: 0, tools: 1, gateway: 0, memory: 0, policies: 0, audit: 0, observability: 0, 'cost-benefit': 0 }
      }
    },
    {
      id: 'sc-node-output',
      type: 'outputDisplayNode',
      position: { x: 1140, y: 240 },
      data: {
        label: 'Carrier Dispatch & Expedited Freight Order',
        format: 'fleet_dispatch_dossier'
      }
    }
  ];

  const initialEdges = [
    { id: 'sc-e1', source: 'sc-node-ingest', target: 'sc-node-deterministic', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'sc-e2', source: 'sc-node-deterministic', target: 'sc-node-agent', sourceHandle: 'out', targetHandle: 'tools-in' },
    { id: 'sc-e3', source: 'sc-node-model', target: 'sc-node-agent', sourceHandle: 'model-out', targetHandle: 'model-in' },
    { id: 'sc-e4', source: 'sc-node-agent', target: 'sc-node-output', sourceHandle: 'out', targetHandle: 'in' }
  ];

  return {
    id: 'wf-supply-chain-003',
    name: 'Supply Chain Multi-Echelon Rebalancer',
    description: 'Algorithmic inventory stockout prevention: deterministic Wilson EOQ & safety stock rebalancing paired with autonomous Logistics Fleet Dispatch Agent.',
    framework: fw,
    activeUseCase: {
      id: 'uc-wf-supply-chain-003',
      name: 'Supply Chain Multi-Echelon Rebalancer',
      description: 'Autonomous inventory optimization and emergency inter-warehouse stock rebalancing.',
      framework: fw,
      agent: {
        prompt: 'You are the Global Supply Chain Director and Fleet Dispatch Orchestrator. Ingest the deterministic inventory rebalancing calculations.',
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
    tags: ['Logistics', 'Supply Chain Rebalancing', 'Wilson EOQ', 'Deterministic + LLM'],
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

        // 1. Clean legacy placeholder descriptions and sanitize node positions & types
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

          if (Array.isArray(w.nodes)) {
            w.nodes = w.nodes.map((n, idx) => {
              let nodeType = n.type;
              if (nodeType === 'tools' || nodeType === 'model' || nodeType === 'skills' || nodeType === 'policies' || nodeType === 'memory' || nodeType === 'mcp' || nodeType === 'gateway') {
                nodeType = 'pillar';
                registryMutated = true;
              }
              const hasValidPos = n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number' && !isNaN(n.position.x) && !isNaN(n.position.y);
              if (!hasValidPos) {
                registryMutated = true;
                return {
                  ...n,
                  type: nodeType,
                  position: { x: 500 + (idx * 40), y: 180 + (idx * 30) }
                };
              }
              return { ...n, type: nodeType };
            });
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

        // 5. Ensure AML Surveillance workflow is available in registry
        if (!parsed.some((w) => w.id === 'wf-aml-surveillance-001')) {
          const amlWf = createAmlSurveillanceWorkflow();
          parsed.push(amlWf);
          registryMutated = true;
        }

        // 6. Ensure Clinical Biomarker Matching workflow is available in registry
        if (!parsed.some((w) => w.id === 'wf-clinical-matching-002')) {
          const clinWf = createClinicalBiomarkerWorkflow();
          parsed.push(clinWf);
          registryMutated = true;
        }

        // 7. Ensure Supply Chain Rebalancer workflow is available in registry
        if (!parsed.some((w) => w.id === 'wf-supply-chain-003')) {
          const scWf = createSupplyChainRebalancerWorkflow();
          parsed.push(scWf);
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

  // If no registry exists yet, bootstrap with initial default workflow + Outlook + 3 complex agentic workflows
  const initialWf = createInitialDefaultWorkflow();
  const outlookWf = createOutlookStreamWorkflow();
  const outlookIntelWf = createOutlookIntelligenceWorkflow();
  const amlWf = createAmlSurveillanceWorkflow();
  const clinWf = createClinicalBiomarkerWorkflow();
  const scWf = createSupplyChainRebalancerWorkflow();
  const initialList = [initialWf, amlWf, clinWf, scWf, outlookWf, outlookIntelWf];
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
  if (found && !found.agentLogs) {
    found.agentLogs = loadWorkflowAgentLogs(found.id);
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

  const sanitizedNodes = (workflow.nodes || []).map((n, idx) => {
    let nodeType = n.type;
    if (nodeType === 'tools' || nodeType === 'model' || nodeType === 'skills' || nodeType === 'policies' || nodeType === 'memory' || nodeType === 'mcp' || nodeType === 'gateway') {
      nodeType = 'pillar';
    }
    const safePos = (n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number' && !isNaN(n.position.x) && !isNaN(n.position.y))
      ? n.position
      : { x: 500 + (idx * 40), y: 180 + (idx * 30) };
    return {
      ...n,
      type: nodeType,
      position: safePos
    };
  });

  const updatedRecord = {
    ...workflow,
    name: targetName,
    description: cleanDescription,
    nodes: sanitizedNodes,
    activeUseCase: {
      ...(workflow.activeUseCase || {}),
      name: targetName,
      description: cleanDescription
    },
    isLocked,
    isWorkflowLocked: isLocked,
    updatedAt: Date.now(),
    stats: computeWorkflowStats(sanitizedNodes)
  };

  if (Array.isArray(workflow.agentLogs)) {
    saveWorkflowAgentLogs(workflow.id, workflow.agentLogs);
  }

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
