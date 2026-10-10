// KEAOS Studio Main Orchestrator
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import PillarCatalogView from './components/screens/PillarCatalogView';
import FrontendShowroomView from './components/screens/FrontendShowroomView';
import { getActiveApiKey } from './services/geminiService';
import { getAllConfiguredProviders } from './services/llmService';
import { FRAMEWORKS } from './constants/frameworks';
import { PILLARS } from './constants/pillars';
import { DEFAULT_THRESHOLDS } from './constants/goldenDataset';
import {
  identifyMcpService,
  SLACK_OFFICIAL_ACTIONS,
  GITHUB_OFFICIAL_ACTIONS,
  JIRA_OFFICIAL_ACTIONS
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
        name: 'Enterprise Autonomous Agent',
        framework,
        prompt: 'You are an autonomous enterprise AI agent whose reasoning, execution, and capabilities adapt dynamically to your active brain, connected skills, protocol gateways, and live MCP tools.',
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
    // 2. Brain / Model Node (Positioned directly above the center Model socket)
    {
      id: 'node-model-1',
      type: 'pillar',
      position: { x: 595, y: -20 },
      data: {
        pillarType: 'model',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, multimodal, 1M+ context window for long transcripts.',
        config: { provider: 'google', modelId: 'gemini-2.0-flash', temperature: 0.2, topP: 0.95 }
      }
    },
    // 3. Hands / Tool Ingestion Node (Positioned to the upper left)
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
      position: { x: 410, y: 440 },
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
      position: { x: 595, y: 440 },
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
      position: { x: 780, y: 440 },
      data: {
        pillarType: 'skills',
        name: 'Executive Summarizer',
        description: 'Generates TL;DR, high-level takeaways, and strategic themes.',
        config: { length: 'concise', focus: 'decisions' }
      }
    },
    // 8. Output Component Node (Positioned directly to the right of the centered Output Arm)
    {
      id: 'node-output-1',
      type: 'outputNode',
      position: { x: 800, y: 260 },
      data: {
        title: 'Agent Intelligence Output',
        content: '',
        status: 'idle',
        format: 'markdown',
        isExpanded: false
      }
    },
    // 9. Input Ingestion Node (Positioned directly above the top-left Tools socket)
    {
      id: 'node-ingest-1',
      type: 'ingestionNode',
      position: { x: 410, y: -20 },
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
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
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
      style: { stroke: '#005EB8', strokeWidth: 1.8, strokeDasharray: '4 4' }
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
      style: { stroke: '#EAAA00', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-policy',
      source: 'node-policy-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'policy-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#EC4899', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-memory',
      source: 'node-memory-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'memory-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#8B5CF6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-skill-1',
      source: 'node-skill-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: false,
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
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
        name: 'Gemini 2.0 Flash',
        description: 'Fast, multimodal, 1M+ context window for long transcripts.',
        config: { provider: 'google', modelId: 'gemini-2.0-flash', temperature: 0.2, topP: 0.95 }
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
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-scribe-tool',
      source: 'node-tool-scribe',
      sourceHandle: 'out',
      target: 'agent-scribe',
      targetHandle: 'tools-in',
      type: 'deletable',
      style: { stroke: '#005EB8', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-scribe-policy',
      source: 'node-policy-scribe',
      sourceHandle: 'out',
      target: 'agent-scribe',
      targetHandle: 'policy-in',
      type: 'deletable',
      style: { stroke: '#EC4899', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },

    // Agent 2 Pillar Wires
    {
      id: 'edge-orchestrator-model',
      source: 'node-model-orchestrator',
      sourceHandle: 'out',
      target: 'agent-orchestrator',
      targetHandle: 'model-in',
      type: 'deletable',
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-orchestrator-skill',
      source: 'node-skill-orchestrator',
      sourceHandle: 'out',
      target: 'agent-orchestrator',
      targetHandle: 'skill-in',
      type: 'deletable',
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },

    // Agent 3 Pillar Wires
    {
      id: 'edge-auditor-model',
      source: 'node-model-auditor',
      sourceHandle: 'out',
      target: 'agent-auditor',
      targetHandle: 'model-in',
      type: 'deletable',
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-auditor-memory',
      source: 'node-memory-auditor',
      sourceHandle: 'out',
      target: 'agent-auditor',
      targetHandle: 'memory-in',
      type: 'deletable',
      style: { stroke: '#8B5CF6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-auditor-skill',
      source: 'node-skill-auditor',
      sourceHandle: 'out',
      target: 'agent-auditor',
      targetHandle: 'skill-in',
      type: 'deletable',
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
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

export default function App() {
  // Load persistent UI state & Canvas topology state from localStorage
  const initialUI = useMemo(() => loadUIState(), []);
  const initialCanvas = useMemo(() => loadCanvasState(), []);

  const [activeUseCase, setActiveUseCase] = useState(
    initialCanvas?.activeUseCase || {
      id: 'uc-autonomous-agent',
      name: 'Enterprise Autonomous Agent',
      description: 'Adaptive multi-pillar workflow orchestration with live MCP tools, model reasoning, and zero-trust policies.',
      framework: FRAMEWORKS[0], // Google ADK
      agent: {
        prompt: 'You are an autonomous enterprise AI agent whose reasoning, execution, and capabilities adapt dynamically to your active brain, connected skills, protocol gateways, and live MCP tools.',
        temperature: 0.2,
        topP: 0.95
      }
    }
  );

  const { initialNodes, initialEdges } = useMemo(
    () => getInitialNodesAndEdges(activeUseCase.framework),
    []
  );

  // Sanitize initial nodes to ensure legacy saved meeting prompts seamlessly upgrade
  const sanitizedInitialNodes = useMemo(() => {
    const rawNodes = initialCanvas?.nodes || initialNodes;
    return (rawNodes || []).map(n => {
      let nodeData = n.data || {};
      let prompt = nodeData.prompt;
      let name = nodeData.name;

      if (n.type === 'agentCore' && prompt && prompt.includes('Analyze meeting transcripts')) {
        prompt = 'You are an autonomous enterprise AI agent whose reasoning, execution, and capabilities adapt dynamically to your active brain, connected skills, protocol gateways, and live MCP tools.';
        if (name === 'Meeting Intelligence Agent') {
          name = 'Enterprise Autonomous Agent';
        }
        nodeData = { ...nodeData, prompt, name };
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
        if (srv === 'slack' && currentTools.length < SLACK_OFFICIAL_ACTIONS.length) {
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
        }
      }

      return { ...n, data: nodeData };
    });
  }, [initialCanvas, initialNodes]);

  // Nodes & Edges (restore from persistent storage if available)
  const [nodes, setNodes, onNodesChange] = useNodesState(sanitizedInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialCanvas?.edges || initialEdges);

  // Persistent UI States
  const [isDarkMode, setIsDarkModeState] = useState(initialUI.isDarkMode);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(initialUI.isSidebarCollapsed);
  const [isSidebarClosed, setIsSidebarClosedState] = useState(initialUI.isSidebarClosed);
  const [isDrawerExpanded, setIsDrawerExpandedState] = useState(initialUI.isDrawerExpanded);
  const [showMiniMap, setShowMiniMapState] = useState(initialUI.showMiniMap);
  const [miniMapPos, setMiniMapPosState] = useState(initialUI.miniMapPos);
  const [isInspectorOpen, setIsInspectorOpenState] = useState(initialUI.isInspectorOpen);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isEnforcerActive, setIsEnforcerActiveState] = useState(initialUI.isEnforcerActive);
  const [viewMode, setViewModeState] = useState(
    initialUI.viewMode === 'simulator' ? 'frontend' : initialUI.viewMode
  );

  // Wrapped State Setters with localStorage Persistence
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

  // Seamlessly upgrade any active canvas MCP nodes to official 30-tool Slack / GitHub / Jira catalogs
  useEffect(() => {
    setNodes((prevNodes) => {
      let changed = false;
      const updated = prevNodes.map((n) => {
        if (n.type === 'pillar' && n.data?.pillarType === 'mcp') {
          const srv = identifyMcpService(n.data, n.id);
          const currentTools = n.data?.tools || [];
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
        }
        return n;
      });
      return changed ? updated : prevNodes;
    });
  }, [setNodes]);

  // Save Canvas Topology automatically to localStorage on change
  useEffect(() => {
    saveCanvasState({ nodes, edges, activeUseCase });
  }, [nodes, edges, activeUseCase]);

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
  const [apiSettingsTab, setApiSettingsTab] = useState('google');
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
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode((curr) => (curr?.id === nodeId ? null : curr));
  }, [setNodes, setEdges]);

  // Deploy a verified real MCP server to the Canvas and auto-wire to Gateway
  const handleAddRealMcpToCanvas = useCallback((mcpData) => {
    const mcpId = `node-mcp-${Date.now().toString().slice(-4)}`;
    let targetGwNodeId = null;

    setNodes((nds) => {
      // Find the gateway node if present
      const gwNode = nds.find(n => n.type === 'pillar' && n.data?.pillarType === 'gateway');
      if (gwNode) targetGwNodeId = gwNode.id;
      const xPos = gwNode ? gwNode.position.x + 280 : 1060;
      const yPos = gwNode ? gwNode.position.y : 165;

      const srv = identifyMcpService(mcpData);
      let effectiveTools = mcpData.tools || [];
      if (srv === 'slack' && effectiveTools.length < SLACK_OFFICIAL_ACTIONS.length) {
        effectiveTools = SLACK_OFFICIAL_ACTIONS;
      } else if (srv === 'github' && effectiveTools.length < GITHUB_OFFICIAL_ACTIONS.length) {
        effectiveTools = GITHUB_OFFICIAL_ACTIONS;
      } else if (srv === 'jira' && effectiveTools.length < JIRA_OFFICIAL_ACTIONS.length) {
        effectiveTools = JIRA_OFFICIAL_ACTIONS;
      }

      const serviceName = mcpData.serviceName || (srv ? (srv.charAt(0).toUpperCase() + srv.slice(1)) : 'External MCP');

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

    // Auto-wire to gateway properly
    setTimeout(() => {
      setEdges((eds) => {
        const already = eds.some(e => e.source === mcpId || e.target === mcpId);
        if (already) return eds;
        const gwNodeId = targetGwNodeId || (eds.find(e => e.targetHandle === 'mcp-in')?.source);
        if (gwNodeId) {
          return [
            ...eds,
            {
              id: `edge-${mcpId}-to-${gwNodeId}`,
              source: mcpId,
              sourceHandle: 'out',
              target: gwNodeId,
              targetHandle: 'mcp-in',
              type: 'deletable',
              animated: true,
              style: { stroke: '#00A3A6', strokeWidth: 2, strokeDasharray: '4 4' }
            }
          ];
        }
        return eds;
      });
    }, 50);

    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `🔌 Deployed ${mcpData.name} (${mcpData.tools?.length || 0} tools) to Gateway` }
    }));
  }, [isDarkMode, handleDeleteNode, setNodes, setEdges]);

  // Add node from Palette / Catalog
  const handleAddNode = useCallback((pillarKey, item) => {
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

      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `🤖 Deployed AI Agent to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'outputNode') {
      const newNodeId = `node-output-${Date.now().toString().slice(-4)}`;
      setNodes((nds) => {
        const agentNode = nds.find(n => n.type === 'agentCore');
        const xPos = agentNode ? agentNode.position.x + 360 : 700;
        const yPos = agentNode ? agentNode.position.y : 220;

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

      // Auto-wire from agent-core only if this is the very first output node and no output edge exists
      setEdges((eds) => {
        const hasAnyOutputEdges = eds.some(e => e.targetHandle === 'data-in' || (e.source === 'agent-core' && e.sourceHandle === 'out'));
        if (!hasAnyOutputEdges) {
          return [
            ...eds,
            {
              id: `edge-output-${Date.now().toString().slice(-4)}`,
              source: 'agent-core',
              sourceHandle: 'out',
              target: newNodeId,
              targetHandle: 'data-in',
              type: 'deletable',
              animated: false,
              style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
            }
          ];
        }
        return eds;
      });

      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `✨ Added Output Component to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'ingestionNode') {
      const newNodeId = `node-ingest-${Date.now().toString().slice(-4)}`;
      setNodes((nds) => {
        const agentNode = nds.find(n => n.type === 'agentCore');
        const xPos = agentNode ? agentNode.position.x - 340 : 260;
        const yPos = agentNode ? agentNode.position.y : 220;

        const newNode = {
          id: newNodeId,
          type: 'ingestionNode',
          position: { x: xPos, y: yPos },
          data: {
            title: item.name || 'Data & Audio Ingestion',
            content: '',
            status: 'idle',
            isExpanded: true
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      // Auto-wire to agent-core if tools-in edge not yet present
      setEdges((eds) => {
        const hasToolsInput = eds.some(e => e.target === 'agent-core' && e.targetHandle === 'tools-in');
        if (!hasToolsInput) {
          return [
            ...eds,
            {
              id: `edge-ingest-${Date.now().toString().slice(-4)}`,
              source: newNodeId,
              sourceHandle: 'data-out',
              target: 'agent-core',
              targetHandle: 'tools-in',
              type: 'deletable',
              animated: false,
              style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
            }
          ];
        }
        return eds;
      });

      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `📥 Added Ingestion Component to Canvas` }
      }));
      return;
    }

    if (pillarKey === 'deterministicNode' || pillarKey === 'deterministic' || item?.isDeterministicNode) {
      const newNodeId = `node-deterministic-${Date.now().toString().slice(-4)}`;
      let count = 1;
      setNodes((nds) => {
        const existing = nds.filter(n => n.type === 'deterministicNode');
        count = existing.length + 1;
        const xPos = 480 + (existing.length * 40);
        const yPos = 300 + (existing.length * 40);

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

      setIsAddMenuOpen(false);
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `⚡ Added Deterministic Logic Box to Canvas` }
      }));
      return;
    }

    const newNodeId = `node-${pillarKey}-${Date.now().toString().slice(-4)}`;

    // Position staggered near center
    const xPos = 400 + Math.random() * 200;
    const yPos = 150 + Math.random() * 250;

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

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setIsInspectorOpen(true);
    setIsAddMenuOpen(false);
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `➕ Added "${item.name}" to Canvas` }
    }));
  }, [setNodes, activeUseCase, handleDeleteNode, setIsInspectorOpen]);

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
    setEvaluationResult(null); // Reset evaluation for new use case

    if (template === 'meeting-pilot') {
      const { initialNodes: newNodes, initialEdges: newEdges } = getInitialNodesAndEdges(framework);
      setNodes(newNodes);
      setEdges(newEdges);
    } else if (template === 'multi-agent-triad') {
      const { initialNodes: newNodes, initialEdges: newEdges } = getMultiAgentTriadNodesAndEdges();
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
          setApiSettingsTab('google');
          setIsApiSettingsOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isClosed={isSidebarClosed}
        setIsClosed={setIsSidebarClosed}
      />

      {/* Main Right Area: Top Header + View Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeUseCase={activeUseCase}
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
                    if (node) {
                      setIsInspectorOpen(true);
                      setIsAddMenuOpen(false);
                    }
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
                          onClose={() => {
                            setSelectedNode(null);
                            setIsInspectorOpen(false);
                          }}
                          onCollapse={() => setIsInspectorOpen(false)}
                          onOpenApiSettings={(providerId) => {
                            setApiSettingsTab(providerId || 'google');
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

          {viewMode === 'catalog' && (
            <PillarCatalogView
              onSelectPillar={() => setViewMode('canvas')}
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
