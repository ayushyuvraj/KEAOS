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
import AuditExplorerView from './components/screens/AuditExplorerView';
import ObservabilityView from './components/screens/ObservabilityView';
import PillarCatalogView from './components/screens/PillarCatalogView';
import { getActiveApiKey } from './services/geminiService';
import { getAllConfiguredProviders } from './services/llmService';
import { FRAMEWORKS } from './constants/frameworks';
import { PILLARS } from './constants/pillars';
import { DEFAULT_THRESHOLDS } from './constants/goldenDataset';
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
          mcp: 1,
          tools: 1,
          gateway: 0,
          memory: 1,
          policies: 1
        }
      }
    },
    // 2. Brain / Model Node (Positioned directly above the Antenna with generous zero-overlap clearance)
    {
      id: 'node-model-1',
      type: 'pillar',
      position: { x: 595, y: -10 },
      data: {
        pillarType: 'model',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, multimodal, 1M+ context window for long transcripts.',
        config: { provider: 'google', modelId: 'gemini-2.0-flash', temperature: 0.2, topP: 0.95 }
      }
    },
    // 3. Hands / Tool Ingestion Node (Positioned to the left of the Left Arm Bolt)
    {
      id: 'node-tool-1',
      type: 'pillar',
      position: { x: 260, y: 220 },
      data: {
        pillarType: 'tools',
        toolId: 'tool-audio-transcribe',
        name: 'Audio Transcriber',
        description: 'Accepts MP3 audio, runs Whisper/Speech-to-Text with speaker diarization.',
        config: { format: 'mp3', diarization: true }
      }
    },
    // 4. Reach / MCP Protocol Node (Positioned to the right of the Right Arm Bolt)
    {
      id: 'node-mcp-1',
      type: 'pillar',
      position: { x: 880, y: 220 },
      data: {
        pillarType: 'mcp',
        name: 'Calendar MCP',
        description: 'Fetches meeting metadata, attendees, scheduled start/end, and invites.',
        config: { endpoint: 'mcp://calendar.google.internal' }
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
    // 8. Output Component Node (Positioned to the right of Agent Core output stream socket)
    {
      id: 'node-output-1',
      type: 'outputNode',
      position: { x: 890, y: 190 },
      data: {
        title: 'Agent Intelligence Output',
        content: '',
        status: 'idle',
        format: 'markdown',
        isExpanded: false
      }
    },
    // 9. Input Ingestion Node (Positioned to the left of Agent Core tools-in socket)
    {
      id: 'node-ingest-1',
      type: 'ingestionNode',
      position: { x: 260, y: 180 },
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
      animated: true,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-ingest-1',
      source: 'node-ingest-1',
      sourceHandle: 'data-out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-tool',
      source: 'node-tool-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'tools-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#005EB8', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-mcp',
      source: 'node-mcp-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'mcp-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#06B6D4', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-policy',
      source: 'node-policy-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'policy-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#EC4899', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-memory',
      source: 'node-memory-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'memory-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#8B5CF6', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-skill-1',
      source: 'node-skill-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
    },
    {
      id: 'edge-output-1',
      source: 'agent-core',
      sourceHandle: 'out',
      target: 'node-output-1',
      targetHandle: 'data-in',
      type: 'deletable',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
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
      id: 'uc-meeting-intel',
      name: 'Meeting Intelligence Agent',
      description: 'Autonomous multi-speaker synthesis, action items, and task sync.',
      framework: FRAMEWORKS[0], // Google ADK
      agent: {
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95
      }
    }
  );

  const { initialNodes, initialEdges } = useMemo(
    () => getInitialNodesAndEdges(activeUseCase.framework),
    []
  );

  // Nodes & Edges (restore from persistent storage if available)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialCanvas?.nodes || initialNodes);
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
  const [viewMode, setViewModeState] = useState(initialUI.viewMode);

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

  // Save Canvas Topology automatically to localStorage on change
  useEffect(() => {
    saveCanvasState({ nodes, edges, activeUseCase });
  }, [nodes, edges, activeUseCase]);

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
  const [apiSettingsTab, setApiSettingsTab] = useState('google');
  const [configuredCount, setConfiguredCount] = useState(getAllConfiguredProviders().length);
  const [hasApiKey, setHasApiKey] = useState(getAllConfiguredProviders().length > 0 || Boolean(getActiveApiKey()));
  const [invalidConnectionAlert, setInvalidConnectionAlert] = useState(null);

  // Evaluation & Gatekeeper
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Handle deleting a node
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode((curr) => (curr?.id === nodeId ? null : curr));
  }, [setNodes, setEdges]);

  // Add node from Palette / Catalog
  const handleAddNode = useCallback((pillarKey, item) => {
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
            title: item.name || 'Agent Output',
            content: '',
            status: 'idle',
            format: 'markdown',
            isExpanded: false
          }
        };
        setSelectedNode(newNode);
        return [...nds, newNode];
      });

      // Auto-wire from agent-core if output edge not yet present
      setEdges((eds) => {
        const hasAgentOutput = eds.some(e => e.source === 'agent-core' && e.sourceHandle === 'out');
        if (!hasAgentOutput) {
          return [
            ...eds,
            {
              id: `edge-output-${Date.now().toString().slice(-4)}`,
              source: 'agent-core',
              sourceHandle: 'out',
              target: newNodeId,
              targetHandle: 'data-in',
              type: 'deletable',
              animated: true,
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
              animated: true,
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
                />
              </div>

              {/* Single Unified Right Sidebar (Identical width w-96, flawless smooth transition between Inspector & Catalog) */}
              {((isInspectorOpen && selectedNode) || isAddMenuOpen) && (
                <aside 
                  className={`w-96 h-full border-l shrink-0 flex flex-col overflow-hidden select-none z-20 animate-in slide-in-from-right-3 duration-250 ease-out transition-all ${
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

          {viewMode === 'code' && (
            <CodeExportView
              activeUseCase={activeUseCase}
              nodes={nodes}
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
      />
    </div>
  );
}
