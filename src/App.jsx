// KEAOS Studio Main Orchestrator
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Inspector from './components/Inspector';
import NodeCatalogPanel from './components/NodeCatalogPanel';
import MakeUseCaseModal from './components/MakeUseCaseModal';
import MeetingSimulator from './components/MeetingSimulator';
import EvaluationView from './components/EvaluationView';
import CodeExportView from './components/CodeExportView';
import ApiSettingsModal from './components/ApiSettingsModal';
import ClusterDiagnosticsModal from './components/ClusterDiagnosticsModal';
import ConnectMcpModal from './components/ConnectMcpModal';
import DeterministicWorkspaceModal from './components/DeterministicWorkspaceModal';
import AuditExplorerView from './components/screens/AuditExplorerView';
import ObservabilityView from './components/screens/ObservabilityView';
import UnifiedAuditView from './components/screens/UnifiedAuditView';
import FrontendShowroomView from './components/screens/FrontendShowroomView';
import HomeWorkflowsView from './components/screens/HomeWorkflowsView';
import {
  loadAllWorkflows,
  getActiveWorkflowId,
  setActiveWorkflowId,
  getWorkflowById,
  saveWorkflow,
  setWorkflowLock
} from './utils/workflowStorage';
import { initWorkspaceSync, initAuditLedgerSync } from './services/workspaceSyncService';
import { getActiveApiKey } from './services/geminiService';
import { getAllConfiguredProviders } from './services/llmService';
import { FRAMEWORKS } from './constants/frameworks';
import { PILLARS } from './constants/pillars';
import { DEFAULT_THRESHOLDS } from './constants/goldenDataset';
import { disarmScheduleTrigger, disarmPollingWatcher } from './services/triggerEngine';
import { getRegisteredMcpServers, saveRegisteredMcpServer } from './services/mcpClientService';
import {
  identifyMcpService,
  getOfficialMcpTools,
  SLACK_OFFICIAL_ACTIONS,
  GITHUB_OFFICIAL_ACTIONS,
  JIRA_OFFICIAL_ACTIONS,
  OUTLOOK_OFFICIAL_ACTIONS,
  NEO4J_OFFICIAL_ACTIONS
} from './constants/mcpOfficialCatalogs';
import {
  loadUIState,
  saveUIState,
  loadCanvasState,
  saveCanvasState,
  clearCanvasState
} from './utils/persistentState';

// Initial Template Builder with clean architectural spacing (zero overlap)
function getInitialNodesAndEdges(framework = FRAMEWORKS[0]) {
  const initialNodes = [
    // 1. Central Robot AI Agent (Command Node)
    {
      id: 'agent-core',
      type: 'agentCore',
      position: { x: 520, y: 165 },
      data: {
        name: 'Meeting Intelligence Agent',
        framework,
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: {
          model: 1,
          skills: 1,
          mcp: 0,
          tools: 1,
          gateway: 1,
          memory: 1,
          policies: 1
        }
      }
    },
    // 2. Brain / Model Node (Positioned snugly right above the center Model socket)
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
    // 3. Hands / Ingestion Node (Positioned snugly right above the top-left Tools socket)
    {
      id: 'node-ingest-1',
      type: 'ingestionNode',
      position: { x: 474, y: 55 },
      data: {
        title: 'Universal File & Audio Ingest',
        content: '',
        status: 'idle',
        fileType: 'auto',
        isExpanded: false
      }
    },
    // 4. Reach / MCP Egress Gateway Node (Positioned directly above the top-right MCP socket)
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
    // 5. Left Stance / Guardrails Policy Node (Positioned below the Left Foot)
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
    // 6. Center Stance / Episodic Memory Node (Positioned below the Center Core Foot)
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
    // 7. Right Stance / Specialized Skills Node (Positioned below the Right Foot)
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
    // 8. Output Component Node (Positioned snugly right of the centered Output Arm)
    {
      id: 'node-output-1',
      type: 'outputNode',
      position: { x: 790, y: 207 },
      data: {
        title: 'Agent Intelligence Output',
        content: '',
        status: 'idle',
        format: 'markdown',
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
    // MCP Egress Gateway -> Agent Core
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
      targetHandle: 'policy-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#470A68', strokeWidth: 1.8, strokeDasharray: '4 4' }
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
      id: 'edge-skill-1',
      source: 'node-skill-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-output-1',
      source: 'agent-core',
      sourceHandle: 'out',
      target: 'node-output-1',
      targetHandle: 'data-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
    }
  ];

  return { initialNodes, initialEdges };
}

// Pre-configured Triad Multi-Agent Fleet template
function getMultiAgentTriadNodesAndEdges() {
  const fwGoogle = FRAMEWORKS.find(f => f.id === 'google-adk') || FRAMEWORKS[0];
  const fwMicrosoft = FRAMEWORKS.find(f => f.id === 'microsoft-adk') || FRAMEWORKS[6] || FRAMEWORKS[0];
  const fwLangGraph = FRAMEWORKS.find(f => f.id === 'langgraph') || FRAMEWORKS[1] || FRAMEWORKS[0];

  const initialNodes = [
    // -------------------------------------------------------------
    // STAGE 1: Scribe Agent (Google ADK)
    // -------------------------------------------------------------
    {
      id: 'agent-scribe',
      type: 'agentCore',
      position: { x: 220, y: 190 },
      data: {
        name: 'Meeting Scribe',
        agentRole: 'Scribe',
        framework: fwGoogle,
        prompt: 'You are an institutional Meeting Scribe. Ingest raw multi-speaker transcripts, sanitize noise, extract verbatim discussion points, agenda topics, and initial draft notes.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: { model: 1, tools: 1, policies: 1 }
      }
    },
    {
      id: 'node-model-scribe',
      type: 'pillar',
      position: { x: 295, y: 15 },
      data: {
        pillarType: 'model',
        name: 'GPT-4o',
        description: 'Flagship omni reasoning, structured outputs, and precision tool calling.',
        config: { provider: 'openai', modelId: 'gpt-4o', temperature: 0.2, topP: 1.0 }
      }
    },
    {
      id: 'node-tool-scribe',
      type: 'pillar',
      position: { x: 40, y: 245 },
      data: {
        pillarType: 'tools',
        toolId: 'tool-audio-transcribe',
        name: 'Audio Transcriber',
        description: 'Accepts MP3 audio, runs Whisper/Speech-to-Text with speaker diarization.',
        config: { format: 'mp3', diarization: true }
      }
    },
    {
      id: 'node-policy-scribe',
      type: 'pillar',
      position: { x: 220, y: 465 },
      data: {
        pillarType: 'policies',
        name: 'PII Redactor',
        description: 'Detects and redacts confidential credentials, personal emails, and salary figures.',
        config: { redactSalaries: true, maskEmails: true }
      }
    },

    // -------------------------------------------------------------
    // STAGE 2: Executive Task Orchestrator (Microsoft ADK)
    // -------------------------------------------------------------
    {
      id: 'agent-orchestrator',
      type: 'agentCore',
      position: { x: 740, y: 190 },
      data: {
        name: 'Task Orchestrator',
        agentRole: 'Orchestrator',
        framework: fwMicrosoft,
        prompt: 'You are an Executive Task Orchestrator. Ingest structured notes from upstream Scribes, resolve ownership of all deliverables, compute project timelines, and synthesize executive summaries.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: { model: 1, skills: 1 }
      }
    },
    {
      id: 'node-model-orchestrator',
      type: 'pillar',
      position: { x: 815, y: 15 },
      data: {
        pillarType: 'model',
        name: 'Claude 3.5 Sonnet',
        description: 'Deep reasoning, institutional judgment, and complex instruction following.',
        config: { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022', temperature: 0.2, topP: 0.95 }
      }
    },
    {
      id: 'node-skill-orchestrator',
      type: 'pillar',
      position: { x: 830, y: 465 },
      data: {
        pillarType: 'skills',
        name: 'Action Extractor',
        description: 'Extracts clear tasks, assignees, deadlines, and urgency ratings.',
        config: { strictAssignee: true }
      }
    },

    // -------------------------------------------------------------
    // STAGE 3: Governance & Risk Auditor (LangGraph)
    // -------------------------------------------------------------
    {
      id: 'agent-auditor',
      type: 'agentCore',
      position: { x: 1280, y: 190 },
      data: {
        name: 'Risk & Audit Specialist',
        agentRole: 'Auditor',
        framework: fwLangGraph,
        prompt: 'You are an Institutional Governance & Risk Specialist. Validate upstream decisions against enterprise risk guardrails, audit regulatory compliance, and compute cryptographic audit manifests.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: { model: 1, memory: 1, skills: 1 }
      }
    },
    {
      id: 'node-model-auditor',
      type: 'pillar',
      position: { x: 1355, y: 15 },
      data: {
        pillarType: 'model',
        name: 'GPT-4o',
        description: 'Versatile multimodal intelligence with native structured JSON guarantees.',
        config: { provider: 'openai', modelId: 'gpt-4o', temperature: 0.2, topP: 0.95 }
      }
    },
    {
      id: 'node-memory-auditor',
      type: 'pillar',
      position: { x: 1260, y: 465 },
      data: {
        pillarType: 'memory',
        name: 'Episodic Sync Memory',
        description: 'Remembers past meeting action items to verify resolution across weeks.',
        config: { ttlDays: 90, store: 'vector-sqlite' }
      }
    },
    {
      id: 'node-skill-auditor',
      type: 'pillar',
      position: { x: 1450, y: 465 },
      data: {
        pillarType: 'skills',
        name: 'Decision Extractor',
        description: 'Captures architectural and budget decisions along with rationales and dissenting opinions.',
        config: { includeRationale: true }
      }
    },
    {
      id: 'node-output-triad',
      type: 'outputDisplayNode',
      position: { x: 1540, y: 210 },
      data: {
        title: 'Fleet Deliverable',
        result: null,
        isRunning: false
      }
    }
  ];

  const initialEdges = [
    // Agent 1 Pillar Wires
    {
      id: 'edge-scribe-model',
      source: 'node-model-scribe',
      sourceHandle: 'out',
      target: 'agent-scribe',
      targetHandle: 'model-in',
      type: 'deletable',
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-scribe-tool',
      source: 'node-tool-scribe',
      sourceHandle: 'out',
      target: 'agent-scribe',
      targetHandle: 'tools-in',
      type: 'deletable',
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-scribe-policy',
      source: 'node-policy-scribe',
      sourceHandle: 'out',
      target: 'agent-scribe',
      targetHandle: 'policy-in',
      type: 'deletable',
      style: { stroke: '#470A68', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },

    // Agent 2 Pillar Wires
    {
      id: 'edge-orchestrator-model',
      source: 'node-model-orchestrator',
      sourceHandle: 'out',
      target: 'agent-orchestrator',
      targetHandle: 'model-in',
      type: 'deletable',
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-orchestrator-skill',
      source: 'node-skill-orchestrator',
      sourceHandle: 'out',
      target: 'agent-orchestrator',
      targetHandle: 'skill-in',
      type: 'deletable',
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },

    // Agent 3 Pillar Wires
    {
      id: 'edge-auditor-model',
      source: 'node-model-auditor',
      sourceHandle: 'out',
      target: 'agent-auditor',
      targetHandle: 'model-in',
      type: 'deletable',
      style: { stroke: '#00338D', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-auditor-memory',
      source: 'node-memory-auditor',
      sourceHandle: 'out',
      target: 'agent-auditor',
      targetHandle: 'memory-in',
      type: 'deletable',
      style: { stroke: '#483698', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-auditor-skill',
      source: 'node-skill-auditor',
      sourceHandle: 'out',
      target: 'agent-auditor',
      targetHandle: 'skill-in',
      type: 'deletable',
      style: { stroke: '#6D2077', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-auditor-output',
      source: 'agent-auditor',
      sourceHandle: 'output-stream',
      target: 'node-output-triad',
      targetHandle: 'data-in',
      type: 'deletable',
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },

    // =============================================================
    // Typed A2A Inter-Agent DAG Channels
    // =============================================================
    {
      id: 'a2a-scribe-to-orchestrator',
      source: 'agent-scribe',
      target: 'agent-orchestrator',
      sourceHandle: 'output-stream',
      targetHandle: 'agent-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2.2, strokeDasharray: '6 4' }
    },
    {
      id: 'a2a-orchestrator-to-auditor',
      source: 'agent-orchestrator',
      target: 'agent-auditor',
      sourceHandle: 'output-stream',
      targetHandle: 'agent-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2.2, strokeDasharray: '6 4' }
    }
  ];

  return { initialNodes, initialEdges };
}

// Pre-configured Outlook Stream & Attachment Intelligence workflow template
function getOutlookStreamWorkflowNodesAndEdges(framework) {
  const fw = framework || FRAMEWORKS.find(f => f.id === 'microsoft-adk') || FRAMEWORKS[6] || FRAMEWORKS[0];

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
      position: { x: 595, y: -20 },
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
      position: { x: 780, y: 440 },
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
    // Trigger -> Agent Core tools-in
    {
      id: 'edge-trigger-to-agent',
      source: 'node-trigger-outlook',
      sourceHandle: 'trigger-out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    // Model -> Agent Core model-in
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
    // Gateway -> Agent Core mcp-in
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
    // Outlook MCP Server -> Gateway mcp-in
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
    // Skill -> Agent Core skill-in
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
    // Agent Core -> Deterministic Box
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
    // Deterministic Box -> Output Node
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

  return { initialNodes, initialEdges };
}

export default function App() {
  // Load persistent UI state & Canvas topology state from localStorage
  const initialUI = useMemo(() => loadUIState(), []);
  const initialCanvas = useMemo(() => loadCanvasState(), []);
  const initialActiveWorkflow = useMemo(() => {
    const activeId = getActiveWorkflowId();
    return getWorkflowById(activeId);
  }, []);

  const [activeUseCase, setActiveUseCase] = useState(() => {
    const fromWf = initialActiveWorkflow?.activeUseCase;
    const fromCanvas = initialCanvas?.activeUseCase;
    const candidate = fromWf || fromCanvas;
    if (candidate && candidate.name && candidate.name !== 'Enterprise Autonomous Agent') {
      return candidate;
    }
    return {
      id: 'uc-meeting-intel',
      name: 'Meeting Intelligence Agent',
      description: 'Autonomous multi-speaker synthesis, action items with owners, and task sync.',
      framework: FRAMEWORKS[0], // Google ADK
      agent: {
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95
      }
    };
  });

  const { initialNodes, initialEdges } = useMemo(
    () => getInitialNodesAndEdges(activeUseCase.framework),
    [activeUseCase.framework]
  );

  // Sanitize initial nodes to ensure MCP nodes upgrade, and preserve Meeting Intelligence prompts
  const sanitizedInitialNodes = useMemo(() => {
    let rawNodes = (initialActiveWorkflow?.nodes && initialActiveWorkflow.nodes.length > 0)
      ? initialActiveWorkflow.nodes
      : ((initialCanvas?.nodes && initialCanvas.nodes.length > 0) ? initialCanvas.nodes : initialNodes);

    if (!rawNodes || rawNodes.length === 0) {
      rawNodes = initialNodes;
    }

    return (rawNodes || []).map(n => {
      let nodeData = n.data || {};
      let prompt = nodeData.prompt;
      let name = nodeData.name;

      // Preserve and restore Meeting Intelligence Agent
      if (n.type === 'agentCore') {
        if (!name || name === 'Enterprise Autonomous Agent' || name === 'Meeting Intelligence Agent') {
          name = 'Meeting Intelligence Agent';
          prompt = (prompt && prompt.includes('Analyze meeting transcripts'))
            ? prompt
            : 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.';
          nodeData = { ...nodeData, prompt, name };
        }
      }

      if (n.type === 'ingestionNode' || n.type === 'outputNode') {
        nodeData = { ...nodeData, isExpanded: false };
      }

      if (n.type === 'deterministicNode') {
        if (prompt && (prompt.includes('I am okay with') || prompt.includes('implement now') || prompt.includes('proceed with'))) {
          const cleanSummary = nodeData.ruleSummary || 'Appends incoming records into stateful Excel workbook';
          nodeData = { ...nodeData, prompt: cleanSummary, ruleSummary: cleanSummary, summary: cleanSummary };
        }
      }

      // Auto-upgrade persisted MCP nodes to full official tool catalogs
      if (n.type === 'pillar' && nodeData.pillarType === 'mcp') {
        const srv = identifyMcpService(nodeData, n.id);
        const currentTools = nodeData.tools || [];
        if (srv === 'outlook' && currentTools.length < OUTLOOK_OFFICIAL_ACTIONS.length) {
          nodeData = {
            ...nodeData,
            serviceName: 'Outlook',
            tools: OUTLOOK_OFFICIAL_ACTIONS,
            description: `Official Enterprise Microsoft Outlook MCP with ${OUTLOOK_OFFICIAL_ACTIONS.length} categorized tools.`
          };
        } else if (srv === 'slack' && currentTools.length < SLACK_OFFICIAL_ACTIONS.length) {
          nodeData = {
            ...nodeData,
            serviceName: 'Slack',
            tools: SLACK_OFFICIAL_ACTIONS,
            description: `Official Enterprise Slack MCP with ${SLACK_OFFICIAL_ACTIONS.length} categorized tools.`
          };
        } else if (srv === 'github' && currentTools.length < GITHUB_OFFICIAL_ACTIONS.length) {
          nodeData = {
            ...nodeData,
            serviceName: 'GitHub',
            tools: GITHUB_OFFICIAL_ACTIONS,
            description: `Official Enterprise GitHub MCP with ${GITHUB_OFFICIAL_ACTIONS.length} categorized tools.`
          };
        } else if (srv === 'jira' && currentTools.length < JIRA_OFFICIAL_ACTIONS.length) {
          nodeData = {
            ...nodeData,
            serviceName: 'Jira',
            tools: JIRA_OFFICIAL_ACTIONS,
            description: `Official Enterprise Jira MCP with ${JIRA_OFFICIAL_ACTIONS.length} categorized tools.`
          };
        } else if (srv === 'neo4j' && currentTools.length < NEO4J_OFFICIAL_ACTIONS.length) {
          nodeData = {
            ...nodeData,
            serviceName: 'Neo4j',
            tools: NEO4J_OFFICIAL_ACTIONS,
            description: `Official Enterprise Neo4j Graph Database MCP with ${NEO4J_OFFICIAL_ACTIONS.length} categorized tools.`
          };
        }
      }

      return { ...n, data: nodeData };
    });
  }, [initialCanvas, initialNodes, initialActiveWorkflow]);

  // Nodes & Edges (restore from persistent storage if available)
  const [nodes, setNodes, onNodesChange] = useNodesState(sanitizedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (initialActiveWorkflow?.edges && initialActiveWorkflow.edges.length > 0)
      ? initialActiveWorkflow.edges
      : ((initialCanvas?.edges && initialCanvas.edges.length > 0) ? initialCanvas.edges : initialEdges)
  );

  // Auto-heal empty Meeting Intelligence workflow
  useEffect(() => {
    if (nodes.length === 0 && (!activeUseCase?.name || activeUseCase?.name.includes('Meeting Intelligence') || activeUseCase?.id === 'uc-meeting-intel' || activeUseCase?.id === 'wf-meeting-intelligence')) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [nodes.length, activeUseCase, initialNodes, initialEdges, setNodes, setEdges]);

  // Persistent UI States
  const [isDarkMode, setIsDarkModeState] = useState(initialUI.isDarkMode);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(initialUI.isSidebarCollapsed);
  const [isSidebarClosed, setIsSidebarClosedState] = useState(initialUI.isSidebarClosed);
  const [isDrawerExpanded, setIsDrawerExpandedState] = useState(initialUI.isDrawerExpanded);
  const [showMiniMap, setShowMiniMapState] = useState(initialUI.showMiniMap);
  const [miniMapPos, setMiniMapPosState] = useState(initialUI.miniMapPos);
  const [isInspectorOpen, setIsInspectorOpenState] = useState(initialUI.isInspectorOpen);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const activeSlotTargetRef = useRef(null);
  const [isEnforcerActive, setIsEnforcerActiveState] = useState(initialUI.isEnforcerActive);
  const [viewMode, setViewModeState] = useState('home');
  const [isWorkflowLocked, setIsWorkflowLockedState] = useState(() => {
    return Boolean(initialActiveWorkflow?.isLocked ?? initialActiveWorkflow?.isWorkflowLocked ?? false);
  });

  // Listen for slot click / wire release from AgentCoreNode or Canvas to remember originating slot
  useEffect(() => {
    const handleOpenSlotCatalog = (e) => {
      activeSlotTargetRef.current = e.detail; // { agentId, agentName, slotId, categoryId }
      setIsAddMenuOpen(true);
      setIsInspectorOpenState(false);
    };
    window.addEventListener('keaos:open-slot-catalog', handleOpenSlotCatalog);
    return () => window.removeEventListener('keaos:open-slot-catalog', handleOpenSlotCatalog);
  }, []);

  // Initialize two-way disk synchronization and listen for external updates
  useEffect(() => {
    initWorkspaceSync();
    initAuditLedgerSync();

    const handleSynced = (e) => {
      const detail = e.detail;
      if (detail?.uiState) {
        if (typeof detail.uiState.isSidebarCollapsed === 'boolean') {
          setIsSidebarCollapsedState(detail.uiState.isSidebarCollapsed);
        }
        if (typeof detail.uiState.isDarkMode === 'boolean') {
          setIsDarkModeState(detail.uiState.isDarkMode);
        }
      }
      if (detail?.activeWorkflowId) {
        const wf = getWorkflowById(detail.activeWorkflowId);
        if (wf) {
          setIsWorkflowLockedState(Boolean(wf.isLocked ?? wf.isWorkflowLocked ?? false));
          if (wf.activeUseCase) {
            setActiveUseCase(wf.activeUseCase);
            if (wf.nodes && wf.nodes.length > 0) {
              setNodes(wf.nodes);
              setEdges(wf.edges || []);
            }
          }
        }
      }
    };

    window.addEventListener('keaos:workspace-synced', handleSynced);
    return () => window.removeEventListener('keaos:workspace-synced', handleSynced);
  }, [setNodes, setEdges, setActiveUseCase]);

  // Wrapped State Setters with localStorage Persistence
  const setIsWorkflowLocked = useCallback((val) => {
    setIsWorkflowLockedState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const activeId = getActiveWorkflowId();
      if (activeId) {
        setWorkflowLock(activeId, next);
      }
      return next;
    });
  }, []);
  const setIsDarkMode = useCallback((val) => {
    setIsDarkModeState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ isDarkMode: next });
      return next;
    });
  }, []);

  const setIsSidebarCollapsed = useCallback((val) => {
    setIsSidebarCollapsedState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ isSidebarCollapsed: next });
      return next;
    });
  }, []);

  const setIsSidebarClosed = useCallback((val) => {
    setIsSidebarClosedState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ isSidebarClosed: next });
      return next;
    });
  }, []);

  const setIsDrawerExpanded = useCallback((val) => {
    setIsDrawerExpandedState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ isDrawerExpanded: next });
      return next;
    });
  }, []);

  const setShowMiniMap = useCallback((val) => {
    setShowMiniMapState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ showMiniMap: next });
      return next;
    });
  }, []);

  const setMiniMapPos = useCallback((val) => {
    setMiniMapPosState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ miniMapPos: next });
      return next;
    });
  }, []);

  const setIsInspectorOpen = useCallback((val) => {
    setIsInspectorOpenState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ isInspectorOpen: next });
      return next;
    });
  }, []);

  const setIsEnforcerActive = useCallback((val) => {
    setIsEnforcerActiveState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ isEnforcerActive: next });
      return next;
    });
  }, []);

  const setViewMode = useCallback((val) => {
    setViewModeState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveUIState({ viewMode: next });
      return next;
    });
  }, []);

  // Seamlessly upgrade any active canvas MCP nodes to official tool catalogs
  useEffect(() => {
    setNodes((prevNodes) => {
      let changed = false;
      const updated = prevNodes.map((n) => {
        if (n.type === 'pillar' && n.data?.pillarType === 'mcp') {
          const srv = identifyMcpService(n.data, n.id);
          const currentTools = n.data?.tools || [];
          if (srv === 'outlook' && currentTools.length < OUTLOOK_OFFICIAL_ACTIONS.length) {
            changed = true;
            return {
              ...n,
              data: {
                ...n.data,
                serviceName: 'Outlook',
                tools: OUTLOOK_OFFICIAL_ACTIONS,
                description: `Official Enterprise Microsoft Outlook MCP with ${OUTLOOK_OFFICIAL_ACTIONS.length} categorized tools.`
              }
            };
          }
          if (srv === 'slack' && currentTools.length < SLACK_OFFICIAL_ACTIONS.length) {
            changed = true;
            return {
              ...n,
              data: {
                ...n.data,
                serviceName: 'Slack',
                tools: SLACK_OFFICIAL_ACTIONS,
                description: `Official Enterprise Slack MCP with ${SLACK_OFFICIAL_ACTIONS.length} categorized tools.`
              }
            };
          }
          if (srv === 'github' && currentTools.length < GITHUB_OFFICIAL_ACTIONS.length) {
            changed = true;
            return {
              ...n,
              data: {
                ...n.data,
                serviceName: 'GitHub',
                tools: GITHUB_OFFICIAL_ACTIONS,
                description: `Official Enterprise GitHub MCP with ${GITHUB_OFFICIAL_ACTIONS.length} categorized tools.`
              }
            };
          }
          if (srv === 'jira' && currentTools.length < JIRA_OFFICIAL_ACTIONS.length) {
            changed = true;
            return {
              ...n,
              data: {
                ...n.data,
                serviceName: 'Jira',
                tools: JIRA_OFFICIAL_ACTIONS,
                description: `Official Enterprise Jira MCP with ${JIRA_OFFICIAL_ACTIONS.length} categorized tools.`
              }
            };
          }
          if (srv === 'neo4j' && currentTools.length < NEO4J_OFFICIAL_ACTIONS.length) {
            changed = true;
            return {
              ...n,
              data: {
                ...n.data,
                serviceName: 'Neo4j',
                tools: NEO4J_OFFICIAL_ACTIONS,
                description: `Official Enterprise Neo4j Graph Database MCP with ${NEO4J_OFFICIAL_ACTIONS.length} categorized tools.`
              }
            };
          }
        }
        return n;
      });
      return changed ? updated : prevNodes;
    });
  }, [setNodes]);

  // Auto-sync genuine canvas MCP nodes into registered MCP servers store
  useEffect(() => {
    const canvasMcps = (nodes || []).filter(
      (n) => n.type === 'pillar' && (n.data?.pillarType === 'mcp' || n.data?.isRealMcp === true) && n.data?.pillarType !== 'model' && n.data?.pillarType !== 'skills' && n.data?.pillarType !== 'gateway' && n.data?.pillarType !== 'tools'
    );
    if (canvasMcps.length > 0) {
      const registered = getRegisteredMcpServers();
      canvasMcps.forEach((node) => {
        const srv = identifyMcpService(node.data, node.id);
        const name = node.data?.displayName || node.data?.name || node.data?.title || `${srv ? srv.toUpperCase() : 'External'} MCP`;
        const already = registered.some(
          (r) => r.id === node.id || r.id === node.data?.toolId || r.name === name || (srv && identifyMcpService(r, r.id) === srv)
        );
        if (!already) {
          saveRegisteredMcpServer({
            id: node.id,
            name,
            displayName: name,
            serviceName: node.data?.serviceName || (srv ? srv.charAt(0).toUpperCase() + srv.slice(1) : 'External MCP'),
            description: node.data?.description || `Exposes ${node.data?.tools?.length || 0} tools.`,
            tools: node.data?.tools || getOfficialMcpTools(srv),
            config: node.data?.config || {},
            basis: node.data?.basis || null,
            transport: node.data?.transport || 'sse',
            url: node.data?.serverUrl || '',
            isRealMcp: true,
            verifiedAt: new Date().toISOString()
          });
        }
      });
    }
  }, [nodes]);

  // Save Canvas Topology automatically to localStorage on change and sync to active workflow record
  useEffect(() => {
    saveCanvasState({ nodes, edges, activeUseCase });
    const activeId = getActiveWorkflowId();
    if (activeId) {
      const currentWf = getWorkflowById(activeId);
      if (currentWf) {
        saveWorkflow({
          ...currentWf,
          name: activeUseCase?.name || currentWf.name,
          description: activeUseCase?.description || currentWf.description,
          framework: activeUseCase?.framework || currentWf.framework,
          nodes,
          edges,
          isLocked: isWorkflowLocked,
          isWorkflowLocked: isWorkflowLocked,
          activeUseCase: {
            ...currentWf.activeUseCase,
            ...activeUseCase
          }
        });
      }
    }
  }, [nodes, edges, activeUseCase, isWorkflowLocked]);

  // Synchronize document dark class & propagate isDarkMode to node datasets
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    setNodes((prevNodes) => {
      let changed = false;
      const updated = prevNodes.map((n) => {
        if (n.data?.isDarkMode !== isDarkMode) {
          changed = true;
          return {
            ...n,
            data: {
              ...n.data,
              isDarkMode
            }
          };
        }
        return n;
      });
      return changed ? updated : prevNodes;
    });
  }, [isDarkMode, setNodes]);

  // Open Node Catalog Panel via custom event
  useEffect(() => {
    const handleOpenCatalog = () => setIsAddMenuOpen(true);
    window.addEventListener('keaos:open-node-catalog', handleOpenCatalog);
    return () => window.removeEventListener('keaos:open-node-catalog', handleOpenCatalog);
  }, []);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const setSelectedNode = useCallback((nodeOrFn) => {
    if (typeof nodeOrFn === 'function') {
      setSelectedNodeId((prevId) => {
        const prevNode = nodes.find((n) => n.id === prevId) || null;
        const next = nodeOrFn(prevNode);
        return next?.id || null;
      });
    } else {
      setSelectedNodeId(nodeOrFn?.id || null);
    }
  }, [nodes]);
  const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isClusterModalOpen, setIsClusterModalOpen] = useState(false);
  const [isConnectMcpModalOpen, setIsConnectMcpModalOpen] = useState(false);
  const [connectMcpInitialTab, setConnectMcpInitialTab] = useState('github');
  const [apiSettingsTab, setApiSettingsTab] = useState('openai');
  const [configuredCount, setConfiguredCount] = useState(getAllConfiguredProviders().length);
  const [hasApiKey, setHasApiKey] = useState(getAllConfiguredProviders().length > 0 || Boolean(getActiveApiKey()));
  const [invalidConnectionAlert, setInvalidConnectionAlert] = useState(null);

  // Deterministic Logic & Sandbox Workspace Modal State
  const [isDeterministicModalOpen, setIsDeterministicModalOpen] = useState(false);
  const [activeDeterministicNodeId, setActiveDeterministicNodeId] = useState(null);
  const activeDeterministicNode = useMemo(() => {
    return nodes.find(n => n.id === activeDeterministicNodeId) || null;
  }, [nodes, activeDeterministicNodeId]);

  // Global event listener for opening the Universal MCP connector modal
  useEffect(() => {
    const handleOpenConnectMcp = (e) => {
      if (e?.detail?.tab) {
        setConnectMcpInitialTab(e.detail.tab);
      } else {
        setConnectMcpInitialTab('github');
      }
      setIsConnectMcpModalOpen(true);
    };
    window.addEventListener('keaos:open-connect-mcp', handleOpenConnectMcp);
    return () => window.removeEventListener('keaos:open-connect-mcp', handleOpenConnectMcp);
  }, []);

  // Event listener for opening the Deterministic Logic Workspace Modal
  useEffect(() => {
    const handleOpenDeterministic = (e) => {
      const targetId = e.detail?.nodeId;
      if (targetId) {
        setActiveDeterministicNodeId(targetId);
        setIsDeterministicModalOpen(true);
      }
    };
    window.addEventListener('keaos:open-deterministic-workspace', handleOpenDeterministic);
    return () => window.removeEventListener('keaos:open-deterministic-workspace', handleOpenDeterministic);
  }, []);

  // Global event listener to update node data across canvas
  useEffect(() => {
    const handleUpdateNode = (e) => {
      const { nodeId, data } = e.detail || {};
      if (nodeId && data) {
        setNodes((nds) => nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...data
              }
            };
          }
          return n;
        }));
      }
    };
    window.addEventListener('keaos:update-node-data', handleUpdateNode);
    return () => window.removeEventListener('keaos:update-node-data', handleUpdateNode);
  }, [setNodes]);

  // Update deterministic node data from modal
  const handleUpdateDeterministicNode = useCallback((nodeId, updatedData) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            ...updatedData
          }
        };
      }
      return n;
    }));
  }, [setNodes]);

  // Evaluation & Gatekeeper
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Handle deleting a node
  const handleDeleteNode = useCallback((nodeId) => {
    disarmScheduleTrigger(nodeId);
    disarmPollingWatcher(nodeId);
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode((curr) => (curr?.id === nodeId ? null : curr));
  }, [setNodes, setEdges]);

  // Deploy a verified real MCP server to the Canvas and auto-wire to Gateway or Agent
  const handleAddRealMcpToCanvas = useCallback((mcpData) => {
    const mcpId = `node-mcp-${Date.now().toString().slice(-4)}`;
    const targetSlot = activeSlotTargetRef.current;
    const targetAgentId = targetSlot?.agentId;
    let targetGwNodeId = null;

    setNodes((nds) => {
      const agentNode = targetAgentId 
        ? nds.find(n => n.id === targetAgentId) 
        : nds.find(n => n.type === 'agentCore');

      const gwNode = nds.find(n => n.type === 'pillar' && n.data?.pillarType === 'gateway');
      if (gwNode) targetGwNodeId = gwNode.id;

      let xPos = 1060;
      let yPos = 165;
      if (gwNode) {
        xPos = gwNode.position.x + 280;
        yPos = gwNode.position.y;
      } else if (agentNode) {
        xPos = agentNode.position.x + 280;
        yPos = agentNode.position.y - 120;
      }

      const srv = identifyMcpService(mcpData, mcpData.id);
      let effectiveTools = mcpData.tools || [];
      if (srv === 'outlook' && effectiveTools.length < OUTLOOK_OFFICIAL_ACTIONS.length) {
        effectiveTools = OUTLOOK_OFFICIAL_ACTIONS;
      } else if (srv === 'slack' && effectiveTools.length < SLACK_OFFICIAL_ACTIONS.length) {
        effectiveTools = SLACK_OFFICIAL_ACTIONS;
      } else if (srv === 'github' && effectiveTools.length < GITHUB_OFFICIAL_ACTIONS.length) {
        effectiveTools = GITHUB_OFFICIAL_ACTIONS;
      } else if (srv === 'jira' && effectiveTools.length < JIRA_OFFICIAL_ACTIONS.length) {
        effectiveTools = JIRA_OFFICIAL_ACTIONS;
      } else if (srv === 'neo4j' && effectiveTools.length < NEO4J_OFFICIAL_ACTIONS.length) {
        effectiveTools = NEO4J_OFFICIAL_ACTIONS;
      }

      const serviceName = mcpData.serviceName || (srv ? (srv.charAt(0).toUpperCase() + srv.slice(1)) : 'External MCP');

      // Persist to registered MCP servers store immediately
      saveRegisteredMcpServer({
        ...mcpData,
        id: mcpId,
        name: mcpData.displayName || mcpData.name || `${serviceName} MCP`,
        displayName: mcpData.displayName || mcpData.name || `${serviceName} MCP`,
        serviceName,
        tools: effectiveTools,
        config: mcpData.config || {},
        basis: mcpData.basis || null,
        transport: mcpData.transport || 'sse',
        url: mcpData.url || '',
        isRealMcp: true,
        verifiedAt: new Date().toISOString()
      });

      const newNode = {
        id: mcpId,
        type: 'pillar',
        position: { x: xPos, y: yPos },
        data: {
          pillarType: 'mcp',
          title: mcpData.name || 'Model Context Protocol',
          name: mcpData.name || 'MCP Server',
          displayName: mcpData.displayName || mcpData.name || 'MCP Server',
          subtitle: mcpData.transport?.toUpperCase() || 'HTTP/SSE',
          description: mcpData.description || `Exposes ${effectiveTools.length} real verified MCP tools to the gateway.`,
          config: mcpData.config || {},
          tools: effectiveTools,
          basis: mcpData.basis || null,
          serviceName,
          transport: mcpData.transport || 'sse',
          serverUrl: mcpData.url || '',
          isRealMcp: true,
          isDarkMode,
          onDelete: handleDeleteNode
        }
      };

      return [...nds, newNode];
    });

    // Auto-wire to gateway or target agent
    setTimeout(() => {
      setEdges((eds) => {
        const already = eds.some(e => e.source === mcpId || e.target === mcpId);
        if (already) return eds;
        if (targetGwNodeId) {
          return [
            ...eds,
            {
              id: `edge-${mcpId}-to-${targetGwNodeId}`,
              source: mcpId,
              sourceHandle: 'out',
              target: targetGwNodeId,
              targetHandle: 'mcp-in',
              type: 'deletable',
              animated: true,
              style: { stroke: '#00A3A6', strokeWidth: 2, strokeDasharray: '4 4' }
            }
          ];
        } else {
          const targetAgent = targetAgentId || eds.find(e => e.target?.startsWith('agent-core') || e.source?.startsWith('agent-core'))?.target || (nodes.find(n => n.type === 'agentCore')?.id || 'agent-core');
          return [
            ...eds,
            {
              id: `edge-${mcpId}-to-${targetAgent}`,
              source: mcpId,
              sourceHandle: 'out',
              target: targetAgent,
              targetHandle: 'mcp-in',
              type: 'deletable',
              animated: true,
              style: { stroke: '#00A3A6', strokeWidth: 2, strokeDasharray: '4 4' }
            }
          ];
        }
      });
      activeSlotTargetRef.current = null;
    }, 50);

    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `🔌 Deployed ${mcpData.name} (${mcpData.tools?.length || 0} tools) to Gateway` }
    }));
  }, [isDarkMode, handleDeleteNode, setNodes, setEdges, nodes]);

  // Add node from Palette / Catalog with slot context awareness & auto-wiring
  const handleAddNode = useCallback((pillarKey, item) => {
    const targetSlot = activeSlotTargetRef.current; // { agentId, agentName, slotId, categoryId }
    const targetAgentId = targetSlot?.agentId;

    if (pillarKey === 'mcp') {
      handleAddRealMcpToCanvas(item);
      setIsAddMenuOpen(false);
      return;
    }

    if (pillarKey === 'agentCore') {
      const newNodeId = `agent-core-${Date.now().toString().slice(-4)}`;
      let agentCount = 1;
      setNodes((nds) => {
        const existingAgents = nds.filter(n => n.type === 'agentCore');
        agentCount = existingAgents.length + 1;
        const xPos = 280 + (existingAgents.length * 300);
        const yPos = 200 + ((existingAgents.length % 2) * 60);

        const newNode = {
          id: newNodeId,
          type: 'agentCore',
          position: { x: xPos, y: yPos },
          data: {
            name: item.name && item.name !== 'Autonomous Agent' && item.name !== 'Autonomous Agent Core'
              ? `${item.name} #${agentCount}`
              : `Autonomous Agent #${agentCount}`,
            framework: activeUseCase?.framework || { id: 'google-adk', name: 'Google ADK' },
            prompt: activeUseCase?.agent?.prompt || 'You are an autonomous enterprise agent...',
            temperature: 0.2,
            topP: 0.95
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      if (targetAgentId) {
        setEdges((eds) => [
          ...eds,
          {
            id: `edge-${targetAgentId}-to-${newNodeId}`,
            source: targetAgentId,
            sourceHandle: 'out',
            target: newNodeId,
            targetHandle: 'agent-in',
            type: 'deletable',
            animated: true,
            style: { stroke: '#6366F1', strokeWidth: 2.2, strokeDasharray: '6 4' }
          }
        ]);
      }

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `🤖 Deployed AI Agent to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'outputNode') {
      const newNodeId = `node-output-${Date.now().toString().slice(-4)}`;
      setNodes((nds) => {
        const agentNode = targetAgentId 
          ? nds.find(n => n.id === targetAgentId) 
          : nds.find(n => n.type === 'agentCore');
        const existingOuts = nds.filter(n => n.type === 'outputNode');
        const xPos = agentNode ? agentNode.position.x + 270 + (existingOuts.length * 40) : 790;
        const yPos = agentNode ? agentNode.position.y + 42 : 207;

        const newNode = {
          id: newNodeId,
          type: 'outputNode',
          position: { x: xPos, y: yPos },
          data: {
            name: item.name || 'Output Viewer',
            title: item.name || 'Output Viewer',
            outputContent: '',
            content: '',
            status: 'idle',
            format: 'markdown',
            runsHistory: [],
            sourceNodeType: null,
            sourceNodeId: null,
            sourceNodeName: null,
            isExpanded: false
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      // Auto-wire from target agent's out handle
      setEdges((eds) => {
        const sourceAgent = targetAgentId || eds.find(e => e.source?.startsWith('agent-core') || e.target?.startsWith('agent-core'))?.source || (nodes.find(n => n.type === 'agentCore')?.id || 'agent-core');
        return [
          ...eds,
          {
            id: `edge-output-${Date.now().toString().slice(-4)}`,
            source: sourceAgent,
            sourceHandle: 'out',
            target: newNodeId,
            targetHandle: 'data-in',
            type: 'deletable',
            animated: false,
            style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
          }
        ];
      });

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `✨ Added Output Component to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'ingestionNode' || item?.isIngestionNode || item?.id?.startsWith('ingest-')) {
      const newNodeId = `node-ingest-${Date.now().toString().slice(-4)}`;
      const fileType = item?.config?.fileType || (item?.id === 'ingest-audio-stream' ? 'audio' : item?.id === 'ingest-raw-text' ? 'text' : 'auto');

      setNodes((nds) => {
        const agentNode = targetAgentId 
          ? nds.find(n => n.id === targetAgentId) 
          : nds.find(n => n.type === 'agentCore');
        const existingIngests = nds.filter(n => n.type === 'ingestionNode');
        const xPos = agentNode ? agentNode.position.x - 46 - (existingIngests.length * 30) : 474;
        const yPos = agentNode ? agentNode.position.y - 110 : 55;

        const newNode = {
          id: newNodeId,
          type: 'ingestionNode',
          position: { x: xPos, y: yPos },
          data: {
            title: item.name || 'Data & Audio Ingestion',
            fileName: '',
            fileSize: '',
            fileType,
            content: '',
            status: 'idle',
            isExpanded: false
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      // Auto-wire to target agent's tools-in
      setEdges((eds) => {
        const destAgent = targetAgentId || eds.find(e => e.target?.startsWith('agent-core'))?.target || (nodes.find(n => n.type === 'agentCore')?.id || 'agent-core');
        return [
          ...eds,
          {
            id: `edge-ingest-${Date.now().toString().slice(-4)}`,
            source: newNodeId,
            sourceHandle: 'data-out',
            target: destAgent,
            targetHandle: 'tools-in',
            type: 'deletable',
            animated: false,
            style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
          }
        ];
      });

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `📥 Added Ingestion Component (${item.name || 'Ingestion'}) to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'deterministicNode' || pillarKey === 'deterministic' || item?.isDeterministicNode) {
      const newNodeId = `node-deterministic-${Date.now().toString().slice(-4)}`;
      let count = 1;
      setNodes((nds) => {
        const existing = nds.filter(n => n.type === 'deterministicNode');
        count = existing.length + 1;
        const agentNode = targetAgentId ? nds.find(n => n.id === targetAgentId) : nds.find(n => n.type === 'agentCore');
        const xPos = agentNode ? agentNode.position.x + 280 : 480 + (existing.length * 40);
        const yPos = agentNode ? agentNode.position.y + 120 + (existing.length * 60) : 300 + (existing.length * 40);

        const newNode = {
          id: newNodeId,
          type: 'deterministicNode',
          position: { x: xPos, y: yPos },
          data: {
            name: item.name && item.name !== 'Deterministic Logic Box'
              ? `${item.name} #${count}`
              : `Deterministic Box #${count}`,
            prompt: '',
            language: item.config?.language || 'python',
            code: 'def process(inputs):\n    # Write deterministic Python logic here\n    result = inputs\n    return result',
            engine: 'auto',
            lastStatus: 'idle'
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      if (targetAgentId) {
        setEdges((eds) => [
          ...eds,
          {
            id: `edge-${targetAgentId}-to-${newNodeId}`,
            source: targetAgentId,
            sourceHandle: 'out',
            target: newNodeId,
            targetHandle: 'in',
            type: 'deletable',
            animated: false,
            style: { stroke: '#EAAA00', strokeWidth: 2.0, strokeDasharray: '4 4' }
          }
        ]);
      }

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `⚡ Added Deterministic Logic Box to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'logics' || pillarKey === 'routerNode' || item?.isRouterNode) {
      const newNodeId = `node-router-${Date.now().toString().slice(-4)}`;
      let count = 1;
      setNodes((nds) => {
        const existing = nds.filter(n => n.type === 'routerNode');
        count = existing.length + 1;
        const agentNode = targetAgentId ? nds.find(n => n.id === targetAgentId) : nds.find(n => n.type === 'agentCore');
        const xPos = agentNode ? agentNode.position.x - 220 : 360;
        const yPos = agentNode 
          ? agentNode.position.y + 140 + (existing.length * 80)
          : 300 + (existing.length * 80);

        const newNode = {
          id: newNodeId,
          type: 'routerNode',
          position: { x: xPos, y: yPos },
          data: {
            name: item.name && item.name !== 'Conditional Router'
              ? `${item.name} #${count}`
              : `Conditional Router #${count}`,
            description: item.description || 'Evaluates incoming payload against configured condition and directs flow to True or False branches.',
            targetField: item.config?.targetField || 'status',
            operator: item.config?.operator || '==',
            comparisonValue: item.config?.comparisonValue || 'approved',
            trueLabel: item.config?.trueLabel || 'True / Match',
            falseLabel: item.config?.falseLabel || 'False / Default',
            lastEvaluatedBranch: null,
            status: 'idle',
            isDarkMode
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `⚡ Added Conditional Router to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'governance' || pillarKey === 'approvalNode' || item?.isApprovalNode) {
      const newNodeId = `node-approval-${Date.now().toString().slice(-4)}`;
      let count = 1;
      setNodes((nds) => {
        const existing = nds.filter(n => n.type === 'approvalNode');
        count = existing.length + 1;
        const agentNode = targetAgentId ? nds.find(n => n.id === targetAgentId) : nds.find(n => n.type === 'agentCore');
        const xPos = agentNode ? agentNode.position.x + 240 : 540;
        const yPos = agentNode 
          ? agentNode.position.y + 140 + (existing.length * 80)
          : 320 + (existing.length * 80);

        const newNode = {
          id: newNodeId,
          type: 'approvalNode',
          position: { x: xPos, y: yPos },
          data: {
            name: item.name && item.name !== 'Approval Gate'
              ? `${item.name} #${count}`
              : `Approval Gate #${count}`,
            description: item.description || 'Human-in-the-Loop checkpoint. Pauses execution for explicit human review, sign-off, or rejection.',
            reviewerRole: item.config?.reviewerRole || 'Compliance Officer',
            instructions: item.config?.instructions || 'Verify that payload meets compliance and audit criteria before releasing downstream.',
            requireReasonOnReject: item.config?.requireReasonOnReject ?? true,
            timeoutPolicy: item.config?.timeoutPolicy || 'manual',
            approvalStatus: 'idle',
            lastEvaluatedBranch: null,
            isDarkMode
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `🛡️ Added Approval Gate to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'triggers' || pillarKey === 'triggerNode' || item?.isTriggerNode) {
      const newNodeId = `node-trigger-${Date.now().toString().slice(-4)}`;
      let count = 1;
      setNodes((nds) => {
        const trgType = item.config?.triggerType || 'manual';
        const existingSameType = nds.filter(n => n.type === 'triggerNode' && (n.data?.triggerType === trgType));
        count = existingSameType.length + 1;
        const existingAllTriggers = nds.filter(n => n.type === 'triggerNode');
        const agentNode = targetAgentId ? nds.find(n => n.id === targetAgentId) : nds.find(n => n.type === 'agentCore');
        const xPos = agentNode ? agentNode.position.x - 320 : 180;
        const yPos = agentNode 
          ? agentNode.position.y + (existingAllTriggers.length * 90) 
          : 220 + (existingAllTriggers.length * 90);

        const newNode = {
          id: newNodeId,
          type: 'triggerNode',
          position: { x: xPos, y: yPos },
          data: {
            name: `${item.name || 'Trigger'} #${count}`,
            triggerType: trgType,
            description: item.description,
            config: { ...(item.config || {}) },
            lastFired: null,
            lastStatus: 'idle',
            status: 'idle',
            payloadText: item.config?.defaultPayload || '{\n  "source": "manual_dispatch",\n  "test": true\n}'
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      activeSlotTargetRef.current = null;
      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `⚡ Added Trigger (${item.name}) to Canvas` }
      }));
      return;
    }

    // Standard Pillars: model, tools, gateway, memory, policies, skills, etc.
    const newNodeId = `node-${pillarKey}-${Date.now().toString().slice(-4)}`;
    let targetHandleId = targetSlot?.slotId;

    if (!targetHandleId) {
      if (pillarKey === 'model') targetHandleId = 'model-in';
      else if (pillarKey === 'tools') targetHandleId = 'tools-in';
      else if (pillarKey === 'gateway') targetHandleId = 'mcp-in';
      else if (pillarKey === 'policies') targetHandleId = 'policy-in';
      else if (pillarKey === 'memory') targetHandleId = 'memory-in';
      else if (pillarKey === 'skills') targetHandleId = 'skill-in';
    }

    setNodes((nds) => {
      const targetAgent = targetAgentId 
        ? nds.find(n => n.id === targetAgentId) 
        : nds.find(n => n.type === 'agentCore');

      let xPos = 400 + Math.random() * 200;
      let yPos = 150 + Math.random() * 250;

      if (targetAgent) {
        if (pillarKey === 'model') {
          const modelCount = nds.filter(n => n.data?.pillarType === 'model').length;
          xPos = targetAgent.position.x + 44 + (modelCount * 30);
          yPos = targetAgent.position.y - 110;
        } else if (pillarKey === 'tools') {
          const toolCount = nds.filter(n => n.data?.pillarType === 'tools' || n.type === 'ingestionNode').length;
          xPos = targetAgent.position.x - 46 - (toolCount * 30);
          yPos = targetAgent.position.y - 110;
        } else if (pillarKey === 'gateway') {
          xPos = targetAgent.position.x + 134;
          yPos = targetAgent.position.y - 110;
        } else if (pillarKey === 'policies') {
          const policyCount = nds.filter(n => n.data?.pillarType === 'policies').length;
          xPos = targetAgent.position.x - 46 - (policyCount * 30);
          yPos = targetAgent.position.y + 160;
        } else if (pillarKey === 'memory') {
          xPos = targetAgent.position.x + 44;
          yPos = targetAgent.position.y + 160;
        } else if (pillarKey === 'skills') {
          const skillCount = nds.filter(n => n.data?.pillarType === 'skills').length;
          xPos = targetAgent.position.x + 134 + (skillCount * 30);
          yPos = targetAgent.position.y + 160;
        }
      }

      const newNode = {
        id: newNodeId,
        type: 'pillar',
        position: { x: xPos, y: yPos },
        data: {
          pillarType: pillarKey,
          toolId: item.id,
          name: item.name,
          description: item.description,
          customDirective: item.customDirective || null,
          referenceDoc: item.referenceDoc || null,
          config: item.config || {},
          tools: item.tools || null,
          itemId: item.id,
          onDelete: handleDeleteNode
        }
      };

      setSelectedNode(newNode);
      return [...nds, newNode];
    });

    // Auto-wire to designated or first agent
    setEdges((eds) => {
      const destAgentId = targetAgentId || eds.find(e => e.target?.startsWith('agent-core') || e.source?.startsWith('agent-core'))?.target || (nodes.find(n => n.type === 'agentCore')?.id || 'agent-core');
      if (!destAgentId || !targetHandleId) return eds;

      // Single-connection socket enforcement (model, gateway, memory)
      const isSingleConn = ['model-in', 'mcp-in', 'memory-in'].includes(targetHandleId);
      const filteredEds = isSingleConn
        ? eds.filter(e => !(e.target === destAgentId && e.targetHandle === targetHandleId))
        : eds;

      let strokeColor = '#00338D';
      if (pillarKey === 'tools') strokeColor = '#0091DA';
      else if (pillarKey === 'gateway') strokeColor = '#00A3A6';
      else if (pillarKey === 'policies') strokeColor = '#470A68';
      else if (pillarKey === 'memory') strokeColor = '#483698';
      else if (pillarKey === 'skills') strokeColor = '#6D2077';

      return [
        ...filteredEds,
        {
          id: `edge-${pillarKey}-${Date.now().toString().slice(-4)}`,
          source: newNodeId,
          sourceHandle: 'out',
          target: destAgentId,
          targetHandle: targetHandleId,
          type: 'deletable',
          animated: false,
          style: { stroke: strokeColor, strokeWidth: 1.8, strokeDasharray: '4 4' }
        }
      ];
    });

    activeSlotTargetRef.current = null;
    setIsInspectorOpen(true);
    setIsAddMenuOpen(false);
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `➕ Added "${item.name}" & connected to agent` }
    }));
  }, [setNodes, activeUseCase, handleDeleteNode, setIsInspectorOpen, handleAddRealMcpToCanvas, setEdges, nodes, isDarkMode]);

  // Update Agent Config
  const handleUpdateAgentConfig = (updates) => {
    setActiveUseCase((prev) => ({
      ...prev,
      agent: { ...prev.agent, ...updates }
    }));

    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'agentCore') {
          return {
            ...n,
            data: {
              ...n.data,
              prompt: updates.prompt !== undefined ? updates.prompt : n.data.prompt,
              temperature: updates.temperature !== undefined ? updates.temperature : n.data.temperature,
              topP: updates.topP !== undefined ? updates.topP : n.data.topP
            }
          };
        }
        return n;
      })
    );
  };

  // Handle Target Platform / Framework switch
  const handleSelectFramework = useCallback((newFramework) => {
    setActiveUseCase((prev) => ({
      ...prev,
      framework: newFramework
    }));
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'agentCore') {
          return {
            ...n,
            data: {
              ...n.data,
              framework: newFramework
            }
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  // Update Node Data
  const handleUpdateNodeData = (nodeId, updates) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, ...updates } };
        }
        return n;
      })
    );
  };

  // Create New Use Case from Modal
  const handleCreateUseCase = ({ name, description, framework, template }) => {
    const newUseCase = {
      id: `uc-${Date.now().toString().slice(-4)}`,
      name,
      description,
      framework,
      agent: {
        prompt: 'You are an enterprise AI agent configured to execute domain workflows.',
        temperature: 0.2,
        topP: 0.95
      }
    };
    setActiveUseCase(newUseCase);
    setIsWorkflowLockedState(false);
    setEvaluationResult(null); // Reset evaluation for new use case

    if (template === 'meeting-pilot') {
      const { initialNodes: newNodes, initialEdges: newEdges } = getInitialNodesAndEdges(framework);
      setNodes(newNodes);
      setEdges(newEdges);
    } else if (template === 'multi-agent-triad') {
      const { initialNodes: newNodes, initialEdges: newEdges } = getMultiAgentTriadNodesAndEdges();
      setNodes(newNodes);
      setEdges(newEdges);
    } else if (template === 'outlook-stream-intelligence') {
      const { initialNodes: newNodes, initialEdges: newEdges } = getOutlookStreamWorkflowNodesAndEdges(framework);
      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      // Blank canvas with just the agent core
      setNodes([
        {
          id: 'agent-core',
          type: 'agentCore',
          position: { x: 500, y: 250 },
          data: {
            name,
            framework,
            prompt: 'You are an enterprise AI agent configured to execute domain workflows.',
            temperature: 0.2,
            topP: 0.95,
            attachedCounts: {}
          }
        }
      ]);
      setEdges([]);
    }
    setViewMode('canvas');
  };

  // Reset to Pilot Template
  const handleResetTemplate = () => {
    clearCanvasState();
    const { initialNodes: newNodes, initialEdges: newEdges } = getInitialNodesAndEdges(activeUseCase.framework);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
    setEvaluationResult(null);
  };

  // Add tool to canvas from simulator
  const handleAddToolToCanvas = (toolId) => {
    const toolItem = PILLARS.tools.items.find(t => t.id === toolId);
    if (toolItem) {
      handleAddNode('tools', toolItem);
      setViewMode('canvas');
    }
  };

  const handleDeployClick = () => {
    if (evaluationResult?.allPassed) {
      alert(`🚀 Agent Successfully Deployed to Production Registry!\n\nUse Case: ${activeUseCase.name}\nFramework: ${activeUseCase.framework.name}\nAlignment Score: Passed (${evaluationResult.aggregates.faithfulness}% Faithfulness, ${evaluationResult.aggregates.actionItemF1}% Action F1)`);
    } else {
      alert(`⚠️ Deployment Locked!\n\nAgent has not passed the Golden Dataset Alignment Gate. Go to the "Evaluation & Gate" tab and run the benchmark suite to verify the agent meets required thresholds.`);
    }
  };

  // Handle Open Saved Workflow from Home Dashboard
  const handleOpenWorkflow = useCallback((workflow) => {
    if (!workflow) return;
    setActiveWorkflowId(workflow.id);
    setIsWorkflowLockedState(Boolean(workflow.isLocked ?? workflow.isWorkflowLocked ?? false));
    setActiveUseCase(workflow.activeUseCase || {
      id: `uc-${workflow.id}`,
      name: workflow.name,
      description: workflow.description,
      framework: workflow.framework,
      agent: {
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95
      }
    });
    const isMeetingIntel = workflow.id === 'wf-meeting-intelligence' || workflow.name?.toLowerCase().includes('meeting intelligence');
    const rawTargetNodes = (workflow.nodes && workflow.nodes.length > 0)
      ? workflow.nodes
      : isMeetingIntel
        ? initialNodes
        : (workflow.nodes || []);
    const targetNodes = rawTargetNodes.map(n => {
      if (n.type === 'ingestionNode' || n.type === 'outputNode') {
        return { ...n, data: { ...n.data, isExpanded: false } };
      }
      return n;
    });
    const targetEdges = (workflow.edges && workflow.edges.length > 0)
      ? workflow.edges
      : isMeetingIntel
        ? initialEdges
        : (workflow.edges || []);
    setNodes(targetNodes);
    setEdges(targetEdges);
    setSelectedNode(null);
    setViewMode('canvas');
  }, [setViewMode, setNodes, setEdges, setSelectedNode, initialNodes, initialEdges]);

  // Handle Create Blank Workflow from Home Dashboard
  const handleCreateBlankWorkflow = useCallback((newWf) => {
    if (!newWf) return;
    setActiveWorkflowId(newWf.id);
    setIsWorkflowLockedState(false);
    setActiveUseCase(newWf.activeUseCase);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setViewMode('canvas');
  }, [setViewMode, setNodes, setEdges, setSelectedNode]);

  return (
    <div className={`w-screen h-screen flex ${isDarkMode ? 'bg-[#0D111A] text-white' : 'bg-[#F5F6F8] text-[#0B0F19]'} overflow-hidden select-none transition-colors duration-200`}>
      {/* Unified Left Collapsible Sidebar */}
      <Sidebar
        activeUseCase={activeUseCase}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenMakeModal={() => setIsMakeModalOpen(true)}
        onResetTemplate={handleResetTemplate}
        evaluationPassed={evaluationResult?.allPassed}
        onDeployClick={handleDeployClick}
        hasApiKey={hasApiKey}
        configuredCount={configuredCount}
        onOpenApiSettings={() => {
          setApiSettingsTab('openai');
          setIsApiSettingsOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isClosed={isSidebarClosed}
        setIsClosed={setIsSidebarClosed}
        isDarkMode={isDarkMode}
      />

      {/* Main Right Area: Top Header + View Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeUseCase={activeUseCase}
          onUpdateUseCase={(updates) => {
            setActiveUseCase((prev) => ({
              ...prev,
              ...updates
            }));
          }}
          onSelectFramework={handleSelectFramework}
          hasApiKey={hasApiKey}
          configuredCount={configuredCount}
          onOpenClusterModal={() => setIsClusterModalOpen(true)}
          isSidebarClosed={isSidebarClosed}
          onToggleSidebarClosed={() => setIsSidebarClosed(!isSidebarClosed)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          isWorkflowLocked={isWorkflowLocked}
          onToggleWorkflowLock={() => setIsWorkflowLocked((prev) => !prev)}
        />

        <main className="flex-1 flex overflow-hidden relative">
          {viewMode === 'canvas' && (
            <>
              {/* Center Canvas with Strict Socket Connections & Floating Toolbars */}
              <div className="flex-1 h-full relative">
                <Canvas
                  activeUseCase={activeUseCase}
                  nodes={nodes}
                  setNodes={setNodes}
                  onNodesChange={onNodesChange}
                  edges={edges}
                  setEdges={setEdges}
                  onEdgesChange={onEdgesChange}
                  onSelectNode={(node) => {
                    setSelectedNode(node);
                  }}
                  invalidConnectionAlert={invalidConnectionAlert}
                  setInvalidConnectionAlert={setInvalidConnectionAlert}
                  onAddNode={handleAddNode}
                  isInspectorOpen={isInspectorOpen}
                  setIsInspectorOpen={setIsInspectorOpen}
                  isAddMenuOpen={isAddMenuOpen}
                  setIsAddMenuOpen={setIsAddMenuOpen}
                  selectedNode={selectedNode}
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  isEnforcerActive={isEnforcerActive}
                  setIsEnforcerActive={setIsEnforcerActive}
                  showMiniMap={showMiniMap}
                  setShowMiniMap={setShowMiniMap}
                  miniMapPos={miniMapPos}
                  setMiniMapPos={setMiniMapPos}
                  isDrawerExpanded={isDrawerExpanded}
                  setIsDrawerExpanded={setIsDrawerExpanded}
                  onUpdateNodeData={handleUpdateNodeData}
                  isWorkflowLocked={isWorkflowLocked}
                  onToggleWorkflowLock={() => setIsWorkflowLocked((prev) => !prev)}
                />
              </div>

              {/* Single Unified Right Sidebar (Identical width w-96, flawless smooth transition between Inspector & Catalog) */}
              {((isInspectorOpen && selectedNode) || isAddMenuOpen) && (
                <aside 
                  className={`w-96 h-full border-l shrink-0 flex flex-col overflow-hidden select-none z-20 animate-swift-slide-in transition-all ${
                    isDarkMode ? 'bg-[#0D0F17] border-white/[0.08] shadow-2xl' : 'bg-white border-slate-200/80 shadow-xl'
                  }`}
                >
                  <div className="relative w-full h-full overflow-hidden flex-1">
                    {/* View 1: Node & Capability Catalog */}
                    <div
                      className={`absolute inset-0 w-full h-full flex flex-col transition-all duration-250 ease-out ${
                        isAddMenuOpen
                          ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
                          : 'opacity-0 translate-x-4 pointer-events-none z-0'
                      }`}
                    >
                      <NodeCatalogPanel
                        isOpen={true}
                        onClose={() => setIsAddMenuOpen(false)}
                        onAddNode={(category, item) => {
                          handleAddNode(category, item);
                        }}
                        nodes={nodes}
                        edges={edges}
                        onSelectNode={setSelectedNode}
                        onDeleteNode={handleDeleteNode}
                        isDarkMode={isDarkMode}
                        isEmbedded={true}
                      />
                    </div>

                    {/* View 2: Node & Foundation Model Inspector */}
                    {selectedNode && (
                      <div
                        className={`absolute inset-0 w-full h-full flex flex-col transition-all duration-250 ease-out ${
                          !isAddMenuOpen && isInspectorOpen
                            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
                            : 'opacity-0 -translate-x-4 pointer-events-none z-0'
                        }`}
                      >
                        <Inspector
                          selectedNode={selectedNode}
                          nodes={nodes}
                          edges={edges}
                          activeUseCase={activeUseCase}
                          onSelectFramework={handleSelectFramework}
                          agentConfig={activeUseCase.agent}
                          onUpdateAgentConfig={handleUpdateAgentConfig}
                          onUpdateNodeData={handleUpdateNodeData}
                          onDeleteNode={handleDeleteNode}
                          isWorkflowLocked={isWorkflowLocked}
                          onClose={() => {
                            setSelectedNode(null);
                            setIsInspectorOpen(false);
                          }}
                          onCollapse={() => setIsInspectorOpen(false)}
                          onOpenApiSettings={(providerId) => {
                            setApiSettingsTab(providerId || 'openai');
                            setIsApiSettingsOpen(true);
                          }}
                          isDarkMode={isDarkMode}
                          isEmbedded={true}
                        />
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </>
          )}

          {viewMode === 'simulator' && (
            <MeetingSimulator
              activeUseCase={activeUseCase}
              nodes={nodes}
              edges={edges}
              onAddToolToCanvas={handleAddToolToCanvas}
            />
          )}

          {viewMode === 'evaluation' && (
            <EvaluationView
              activeUseCase={activeUseCase}
              nodes={nodes}
              thresholds={thresholds}
              setThresholds={setThresholds}
              evaluationResult={evaluationResult}
              setEvaluationResult={setEvaluationResult}
              setViewMode={setViewMode}
              isDarkMode={isDarkMode}
            />
          )}

          {viewMode === 'frontend' && (
            <FrontendShowroomView
              activeUseCase={activeUseCase}
              nodes={nodes}
              edges={edges}
              isDarkMode={isDarkMode}
            />
          )}

          {viewMode === 'code' && (
            <CodeExportView
              activeUseCase={activeUseCase}
              nodes={nodes}
              edges={edges}
            />
          )}

          {viewMode === 'unified-audit' && (
            <UnifiedAuditView
              activeUseCase={activeUseCase}
              nodes={nodes}
              edges={edges}
              isDarkMode={isDarkMode}
              onNavigateHome={() => setViewMode('canvas')}
            />
          )}

          {viewMode === 'audit' && (
            <AuditExplorerView
              activeUseCase={activeUseCase}
            />
          )}

          {viewMode === 'observability' && (
            <ObservabilityView
              activeUseCase={activeUseCase}
              nodes={nodes}
            />
          )}

          {viewMode === 'home' && (
            <HomeWorkflowsView
              activeUseCase={activeUseCase}
              onOpenWorkflow={handleOpenWorkflow}
              onCreateBlankWorkflow={handleCreateBlankWorkflow}
              isDarkMode={isDarkMode}
            />
          )}
        </main>
      </div>

      {/* Make Use Case Modal */}
      <MakeUseCaseModal
        isOpen={isMakeModalOpen}
        onClose={() => setIsMakeModalOpen(false)}
        onCreateUseCase={handleCreateUseCase}
      />

      {/* Production API Credentials Modal */}
      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        initialTab={apiSettingsTab}
        onClose={() => setIsApiSettingsOpen(false)}
        onKeyUpdated={() => {
          const count = getAllConfiguredProviders().length;
          setConfiguredCount(count);
          setHasApiKey(count > 0 || Boolean(getActiveApiKey()));
        }}
      />

      {/* Cluster Diagnostics & Sandbox Fleet Modal */}
      <ClusterDiagnosticsModal
        isOpen={isClusterModalOpen}
        onClose={() => setIsClusterModalOpen(false)}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Claude Code-style Universal MCP Connection Engine */}
      <ConnectMcpModal
        isOpen={isConnectMcpModalOpen}
        initialTab={connectMcpInitialTab}
        onClose={() => setIsConnectMcpModalOpen(false)}
        onAddMcpNodeToCanvas={handleAddRealMcpToCanvas}
        isDarkMode={isDarkMode}
      />

      {/* Universal Deterministic Logic & Sandbox Workspace Modal */}
      <DeterministicWorkspaceModal
        isOpen={isDeterministicModalOpen}
        nodeId={activeDeterministicNodeId}
        nodeData={activeDeterministicNode?.data || {}}
        nodes={nodes}
        edges={edges}
        onClose={() => setIsDeterministicModalOpen(false)}
        onUpdateNode={handleUpdateDeterministicNode}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
    </div>
  );
}
