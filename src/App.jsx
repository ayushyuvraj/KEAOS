import React, { useState, useCallback, useMemo } from 'react';
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

// Initial Template Builder with clean architectural spacing (zero overlap)
function getInitialNodesAndEdges(framework = FRAMEWORKS[0]) {
  const initialNodes = [
    // 1. Central Core Agent (Command Node)
    {
      id: 'agent-core',
      type: 'agentCore',
      position: { x: 540, y: 130 },
      data: {
        name: 'Meeting Intelligence Agent',
        framework,
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        temperature: 0.2,
        topP: 0.95,
        attachedCounts: {
          model: 1,
          skills: 2,
          mcp: 1,
          tools: 1,
          gateway: 1,
          memory: 1,
          policies: 1
        }
      }
    },
    // Left Column: Model, Tools, Ingress Gateway, Memory Store
    {
      id: 'node-model-1',
      type: 'pillar',
      position: { x: 60, y: 10 },
      data: {
        pillarType: 'model',
        name: 'Gemini 2.0 Flash',
        description: 'Fast, multimodal, 1M+ context window for long transcripts.',
        config: { provider: 'google', modelId: 'gemini-2.0-flash', temperature: 0.2, topP: 0.95 }
      }
    },
    {
      id: 'node-tool-1',
      type: 'pillar',
      position: { x: 60, y: 190 },
      data: {
        pillarType: 'tools',
        toolId: 'tool-audio-transcribe',
        name: 'MP3 Audio Transcription Tool',
        description: 'Accepts MP3 audio, runs Whisper/Speech-to-Text with speaker diarization.',
        config: { format: 'mp3', diarization: true }
      }
    },
    {
      id: 'node-gateway-1',
      type: 'pillar',
      position: { x: 60, y: 370 },
      data: {
        pillarType: 'gateway',
        name: 'Ingress Rate Limiter',
        description: 'Caps execution at 60 RPM to protect API quotas.',
        config: { maxRpm: 60, burstSize: 10 }
      }
    },
    {
      id: 'node-memory-1',
      type: 'pillar',
      position: { x: 60, y: 550 },
      data: {
        pillarType: 'memory',
        name: 'Episodic Sync Memory',
        description: 'Remembers past meeting action items to verify resolution across weeks.',
        config: { ttlDays: 90, store: 'vector-sqlite' }
      }
    },
    // Right Column: Specialized Skills, MCP, Policies, Audit Trail
    {
      id: 'node-skill-1',
      type: 'pillar',
      position: { x: 1060, y: 10 },
      data: {
        pillarType: 'skills',
        name: 'Executive Summarizer',
        description: 'Generates TL;DR, high-level takeaways, and strategic themes.',
        config: { length: 'concise', focus: 'decisions' }
      }
    },
    {
      id: 'node-skill-2',
      type: 'pillar',
      position: { x: 1060, y: 190 },
      data: {
        pillarType: 'skills',
        name: 'Action Item Extractor',
        description: 'Extracts exact tasks, assignees, deadlines, and dependencies.',
        config: { strictJson: true }
      }
    },
    {
      id: 'node-mcp-1',
      type: 'pillar',
      position: { x: 1060, y: 370 },
      data: {
        pillarType: 'mcp',
        name: 'Google Calendar MCP',
        description: 'Fetches meeting metadata, attendees, scheduled start/end, and invites.',
        config: { endpoint: 'mcp://calendar.google.internal' }
      }
    },
    {
      id: 'node-policy-1',
      type: 'pillar',
      position: { x: 1060, y: 550 },
      data: {
        pillarType: 'policies',
        name: 'PII & Confidentiality Redactor',
        description: 'Detects and redacts salaries, personal phones, SSNs, and passwords.',
        config: { redactSalaries: true, maskEmails: true }
      }
    },
    {
      id: 'node-audit-1',
      type: 'pillar',
      position: { x: 1060, y: 730 },
      data: {
        pillarType: 'audit',
        name: 'Cryptographic Audit Trail',
        description: 'Generates SHA-256 hash of raw transcripts and agent outputs.',
        config: { hashingAlgorithm: 'sha256' }
      }
    },
    // Bottom Horizon: Observability & ROI Accounting
    {
      id: 'node-obs-1',
      type: 'pillar',
      position: { x: 440, y: 670 },
      data: {
        pillarType: 'observability',
        name: 'OpenTelemetry Trace Collector',
        description: 'Captures per-step execution spans, token usage, and latency waterfalls.',
        config: { exportOtlp: true }
      }
    },
    {
      id: 'node-roi-1',
      type: 'pillar',
      position: { x: 740, y: 670 },
      data: {
        pillarType: 'cost_benefit',
        name: 'ROI & Time-Saved Calculator',
        description: 'Measures agent compute cost ($0.02) vs employee manual transcription value ($45.00).',
        config: { hourlyRateUsd: 65, averageMinsSaved: 40 }
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
      animated: true,
      style: { stroke: '#00338D', strokeWidth: 2 }
    },
    {
      id: 'edge-tool',
      source: 'node-tool-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'tool-in',
      animated: true,
      style: { stroke: '#005EB8', strokeWidth: 2 }
    },
    {
      id: 'edge-gateway',
      source: 'node-gateway-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'gateway-in',
      animated: true,
      style: { stroke: '#EAAA00', strokeWidth: 2 }
    },
    {
      id: 'edge-memory',
      source: 'node-memory-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'memory-in',
      animated: true,
      style: { stroke: '#483698', strokeWidth: 2 }
    },
    {
      id: 'edge-skill-1',
      source: 'node-skill-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      animated: true,
      style: { stroke: '#009A44', strokeWidth: 2 }
    },
    {
      id: 'edge-skill-2',
      source: 'node-skill-2',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'skill-in',
      animated: true,
      style: { stroke: '#009A44', strokeWidth: 2 }
    },
    {
      id: 'edge-mcp',
      source: 'node-mcp-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'mcp-in',
      animated: true,
      style: { stroke: '#00A3A6', strokeWidth: 2 }
    },
    {
      id: 'edge-policy',
      source: 'node-policy-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'policy-in',
      animated: true,
      style: { stroke: '#6D2077', strokeWidth: 2 }
    },
    {
      id: 'edge-audit',
      source: 'node-audit-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'audit-in',
      animated: true,
      style: { stroke: '#001E50', strokeWidth: 2 }
    },
    {
      id: 'edge-obs',
      source: 'node-obs-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'observability-in',
      animated: true,
      style: { stroke: '#0091DA', strokeWidth: 2 }
    },
    {
      id: 'edge-roi',
      source: 'node-roi-1',
      sourceHandle: 'out',
      target: 'agent-core',
      targetHandle: 'cost-benefit-in',
      animated: true,
      style: { stroke: '#EAAA00', strokeWidth: 2 }
    }
  ];

  return { initialNodes, initialEdges };
}

export default function App() {
  const [activeUseCase, setActiveUseCase] = useState({
    id: 'uc-meeting-intel',
    name: 'Meeting Intelligence Agent',
    description: 'Autonomous multi-speaker synthesis, action items, and task sync.',
    framework: FRAMEWORKS[0], // Google ADK
    agent: {
      prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
      temperature: 0.2,
      topP: 0.95
    }
  });

  const { initialNodes, initialEdges } = useMemo(
    () => getInitialNodesAndEdges(activeUseCase.framework),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'simulator' | 'evaluation' | 'code'
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
    <div className="w-screen h-screen flex bg-[#F5F6F8] text-[#0B0F19] overflow-hidden select-none">
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
      />

      {/* Main Right Area: Top Header + View Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          viewMode={viewMode}
          activeUseCase={activeUseCase}
          hasApiKey={hasApiKey}
          configuredCount={configuredCount}
          onOpenClusterModal={() => setIsClusterModalOpen(true)}
        />

        <main className="flex-1 flex overflow-hidden relative">
          {viewMode === 'canvas' && (
            <>
              {/* Center Canvas with Strict Socket Connections & Floating Toolbars */}
              <div className="flex-1 h-full relative">
                <Canvas
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
