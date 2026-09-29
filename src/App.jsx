import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import Inspector from './components/Inspector';
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
      position: { x: 520, y: 160 },
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
    // 2. Brain / Model Node (Positioned directly above the Antenna)
    {
      id: 'node-model-1',
      type: 'pillar',
      position: { x: 595, y: 15 },
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

  const [selectedNode, setSelectedNode] = useState(null);
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

  // Add node from Palette
  const handleAddNode = useCallback((pillarKey, item) => {
    const newNodeId = `node-${pillarKey}-${Date.now().toString().slice(-4)}`;
    const pillarDef = PILLARS[pillarKey];

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
        config: item.config || {},
        onDelete: handleDeleteNode
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  }, [setNodes]);

  // Handle deleting a node
  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode((curr) => (curr?.id === nodeId ? null : curr));
  }, [setNodes, setEdges]);

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
                    if (node) setIsInspectorOpen(true);
                  }}
                  invalidConnectionAlert={invalidConnectionAlert}
                  setInvalidConnectionAlert={setInvalidConnectionAlert}
                  onAddNode={handleAddNode}
                  isInspectorOpen={isInspectorOpen}
                  setIsInspectorOpen={setIsInspectorOpen}
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

              {/* Right Inspector (Slides in when isInspectorOpen is true) */}
              {isInspectorOpen && (
                <Inspector
                  selectedNode={selectedNode}
                  agentConfig={activeUseCase.agent}
                  onUpdateAgentConfig={handleUpdateAgentConfig}
                  onUpdateNodeData={handleUpdateNodeData}
                  onDeleteNode={handleDeleteNode}
                  onClose={() => setSelectedNode(null)}
                  onCollapse={() => setIsInspectorOpen(false)}
                  onOpenApiSettings={(providerId) => {
                    setApiSettingsTab(providerId || 'google');
                    setIsApiSettingsOpen(true);
                  }}
                />
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
