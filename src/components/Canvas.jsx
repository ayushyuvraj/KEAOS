import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  ReactFlowProvider,
  ConnectionMode
} from '@xyflow/react';
import AgentCoreNode from './nodes/AgentCoreNode';
import PillarNode from './nodes/PillarNode';
import { SOCKET_RULES, PILLARS } from '../constants/pillars';
import { 
  GITHUB_OFFICIAL_ACTIONS,
  SLACK_OFFICIAL_ACTIONS,
  JIRA_OFFICIAL_ACTIONS,
  NEO4J_OFFICIAL_ACTIONS,
  OUTLOOK_OFFICIAL_ACTIONS,
  identifyMcpService
} from '../constants/mcpOfficialCatalogs';
import { 
  AlertTriangle,
  Brain, 
  Sparkles, 
  Server, 
  Wrench, 
  GitFork, 
  Database, 
  ShieldCheck, 
  ShieldAlert,
  Fingerprint, 
  Activity, 
  Coins, 
  Plus,
  Minus,
  Maximize2,
  Undo2,
  Redo2,
  Search,
  X,
  Layers,
  Mic,
  FileText,
  Type,
  Sun,
  Moon,
  PanelRight,
  Map as MapIcon,
  GripVertical,
  Play,
  Square
} from 'lucide-react';

import CanvasExecutionDrawer from './CanvasExecutionDrawer';
import DeletableEdge from './edges/DeletableEdge';
import OutputDisplayNode from './nodes/OutputDisplayNode';
import IngestionNode from './nodes/IngestionNode';
import DeterministicNode from './nodes/DeterministicNode';
import { executeDeterministicTask } from '../services/deterministicRunner';

const nodeTypes = {
  agentCore: AgentCoreNode,
  pillar: PillarNode,
  outputNode: OutputDisplayNode,
  ingestionNode: IngestionNode,
  deterministicNode: DeterministicNode
};

const edgeTypes = {
  deletable: DeletableEdge,
  default: DeletableEdge
};

const PILLAR_ICONS = {
  model: Brain,
  skills: Sparkles,
  mcp: Server,
  tools: Wrench,
  gateway: GitFork,
  memory: Database,
  policies: ShieldCheck,
  audit: Fingerprint,
  observability: Activity,
  cost_benefit: Coins
};

const PILLAR_ORDER = [
  'model',
  'memory',
  'tools',
  'skills',
  'mcp',
  'policies',
  'gateway'
];

function CanvasInner({
  activeUseCase,
  nodes,
  setNodes,
  onNodesChange,
  edges,
  setEdges,
  onEdgesChange,
  onSelectNode,
  invalidConnectionAlert,
  setInvalidConnectionAlert,
  onAddNode,
  isInspectorOpen,
  setIsInspectorOpen,
  isAddMenuOpen: isAddMenuOpenProp,
  setIsAddMenuOpen: setIsAddMenuOpenProp,
  selectedNode,
  isDarkMode = true,
  setIsDarkMode,
  isEnforcerActive = true,
  setIsEnforcerActive,
  showMiniMap = true,
  setShowMiniMap,
  miniMapPos = { x: 0, y: 0 },
  setMiniMapPos,
  isDrawerExpanded = false,
  setIsDrawerExpanded,
  onUpdateNodeData
}) {
  const [internalAddMenuOpen, setInternalAddMenuOpen] = useState(false);
  const isAddMenuOpen = setIsAddMenuOpenProp !== undefined ? isAddMenuOpenProp : internalAddMenuOpen;
  const setIsAddMenuOpen = setIsAddMenuOpenProp || setInternalAddMenuOpen;
  const [isDraggingMiniMap, setIsDraggingMiniMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [rfInstance, setRfInstance] = useState(null);
  const [executionState, setExecutionState] = useState({ isExecuting: false, step: '' });
  const [toastNotification, setToastNotification] = useState(null);
  const [activeChatAgentId, setActiveChatAgentId] = useState(null);
  const hoveredNodeIdRef = useRef(null);

  // Switch to specific agent chat and expand bottom drawer with Apple-style smooth ease
  const handleOpenAgentChat = useCallback((agentId) => {
    setActiveChatAgentId(agentId);
    if (setIsDrawerExpanded) setIsDrawerExpanded(true);
    window.dispatchEvent(new CustomEvent('keaos:set-drawer-mode', { detail: { mode: 'chat', agentId } }));
    const targetNode = (nodes || []).find(n => n.id === agentId);
    if (targetNode && onSelectNode) {
      onSelectNode(targetNode);
    }
  }, [setIsDrawerExpanded, nodes, onSelectNode]);

  // Switch to specific deterministic node Co-Pilot and expand bottom drawer (isolated from right Inspector)
  const handleOpenDeterministicChat = useCallback((nodeId) => {
    if (setIsDrawerExpanded) setIsDrawerExpanded(true);
    window.dispatchEvent(new CustomEvent('keaos:set-drawer-mode', { detail: { mode: 'deterministic-copilot', nodeId } }));
  }, [setIsDrawerExpanded]);

  // Global toast listener for canvas messages
  useEffect(() => {
    const handleToast = (e) => {
      if (e.detail?.message) {
        setToastNotification(e.detail.message);
        setTimeout(() => {
          setToastNotification((curr) => (curr === e.detail.message ? null : curr));
        }, 2200);
      }
    };
    window.addEventListener('keaos:toast', handleToast);
    return () => window.removeEventListener('keaos:toast', handleToast);
  }, []);

  // Listen for real-time Agent Output events and update connected Canvas Output Nodes & Deterministic Nodes
  useEffect(() => {
    const handleAgentOutput = (e) => {
      const detail = e.detail;
      if (!detail) return;

      const agentRawOutput = detail.output || detail.markdown || (typeof detail.result === 'string' ? detail.result : JSON.stringify(detail.result, null, 2)) || '';
      const agentTokens = detail.tokens || detail.observability?.totalTokens || 0;
      const agentLatency = detail.latencyMs || detail.observability?.latencyMs || 0;
      const richAgentPayload = {
        output: agentRawOutput,
        data: agentRawOutput,
        text: agentRawOutput,
        tokens: agentTokens,
        latencyMs: agentLatency,
        observability: detail.observability || {
          totalTokens: agentTokens,
          latencyMs: agentLatency
        },
        costUsd: detail.costUsd || 0,
        auditHash: detail.auditHash || null
      };

      setNodes((nds) => {
        // Collect prospective executing agent IDs
        const executingAgentIds = new Set();
        if (detail.agentId) {
          executingAgentIds.add(detail.agentId);
        } else {
          const allAgents = nds.filter((n) => n.type === 'agentCore' && !n.data?.isDeactivated);
          if (allAgents.length === 1) {
            executingAgentIds.add(allAgents[0].id);
          }
        }

        // 1. Identify all Output Nodes directly connected to THIS specific executing Agent
        // Strict Isolation: ONLY output nodes wired directly to this executing agent are updated.
        // Never update an output node connected to a deterministic rule or another agent!
        const outputNodeIdsToUpdate = new Set();
        nds.forEach((n) => {
          if (n.type === 'outputNode' && !n.data?.isDeactivated) {
            const isConnectedToExecutingAgent = (edges || []).some(
              (ed) => (executingAgentIds.has(ed.source) && ed.target === n.id) ||
                      (executingAgentIds.has(ed.target) && ed.source === n.id)
            );
            if (isConnectedToExecutingAgent) {
              outputNodeIdsToUpdate.add(n.id);
            }
          }
        });

        // 2. Identify all Deterministic Nodes connected directly to this executing Agent Core
        const connectedDetNodes = nds.filter((n) => {
          if (n.type !== 'deterministicNode' || n.data?.isDeactivated) return false;
          return (edges || []).some((ed) => {
            // Direct Agent -> Deterministic Rule (either drag direction)
            if (executingAgentIds.has(ed.source) && ed.target === n.id) return true;
            if (executingAgentIds.has(ed.target) && ed.source === n.id) return true;
            return false;
          });
        });

        // 3. If there are connected deterministic nodes, trigger visible activation and execution!
        if (connectedDetNodes.length > 0) {
          // Immediately notify UI that deterministic nodes are running!
          connectedDetNodes.forEach((detNode) => {
            window.dispatchEvent(new CustomEvent('keaos:deterministic-executing', {
              detail: { nodeId: detNode.id, isRunning: true }
            }));
          });

          // Also set executionState so canvas wires and glowing indicators highlight this node!
          setExecutionState({
            isExecuting: true,
            step: `Executing Deterministic Logic...`,
            nodeId: connectedDetNodes[0]?.id
          });

          setTimeout(() => {
            connectedDetNodes.forEach(async (detNode) => {
              const code = detNode.data?.code;
              const prompt = detNode.data?.prompt || detNode.data?.ruleSummary || detNode.data?.summary || '';
              const lang = detNode.data?.language || 'auto';
              try {
                // Guarantee at least 850ms visible celebration window so user actually sees the glow & bouncing beacon!
                const [res] = await Promise.all([
                  executeDeterministicTask({
                    nodeId: detNode.id,
                    language: lang,
                    code,
                    prompt,
                    inputData: richAgentPayload
                  }),
                  new Promise((r) => setTimeout(r, 850))
                ]);

                window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
                  detail: { 
                    nodeId: detNode.id, 
                    output: res.output, 
                    tableData: res.tableData,
                    latencyMs: res.latencyMs,
                    success: res.success !== false,
                    error: res.error,
                    sourceAgentName: nds.find((a) => executingAgentIds.has(a.id))?.data?.name || 'Autonomous Agent'
                  }
                }));
              } catch (err) {
                console.error(`Deterministic auto-run error for ${detNode.id}:`, err);
                window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
                  detail: { nodeId: detNode.id, output: err.message, latencyMs: 0, success: false, error: err.message }
                }));
              } finally {
                setExecutionState({ isExecuting: false, step: '' });
              }
            });
          }, 60);
        }

        return nds.map((n) => {
          // 1. Update the executing agent node itself so it records its lastOutput
          if (executingAgentIds.has(n.id)) {
            return {
              ...n,
              data: {
                ...n.data,
                lastOutput: agentRawOutput,
                auditHash: detail.auditHash || n.data?.auditHash,
                observability: detail.observability || n.data?.observability,
                costUsd: detail.costUsd || n.data?.costUsd
              }
            };
          }

          // 2. Update connected Canvas Output Nodes
          if (outputNodeIdsToUpdate.has(n.id)) {
            const strategy = n.data?.persistenceStrategy || 'append';
            const prevHistory = Array.isArray(n.data?.runsHistory) ? n.data.runsHistory : [];
            const executingAgent = nds.find(a => executingAgentIds.has(a.id));
            const agentName = executingAgent?.data?.name || 'Autonomous Agent';
            const agentId = executingAgent?.id || detail.agentId || null;

            const newRun = {
              runNumber: strategy === 'overwrite' ? 1 : prevHistory.length + 1,
              timestamp: new Date().toLocaleTimeString(),
              content: agentRawOutput,
              auditHash: detail.auditHash || null,
              tokens: agentTokens,
              latencyMs: agentLatency,
              costUsd: detail.costUsd || 0,
              source: 'agent',
              sourceNodeType: 'agent',
              sourceNodeId: agentId,
              sourceNodeName: agentName
            };
            const nextHistory = strategy === 'overwrite' ? [newRun] : [...prevHistory, newRun];

            return {
              ...n,
              data: {
                ...n.data,
                outputContent: agentRawOutput,
                runsHistory: nextHistory,
                sourceNodeType: 'agent',
                sourceNodeId: agentId,
                sourceNodeName: agentName,
                auditHash: detail.auditHash || null,
                observability: detail.observability || {
                  totalTokens: agentTokens,
                  latencyMs: agentLatency
                },
                costUsd: detail.costUsd || 0,
                status: 'ready',
                isExpanded: false // Maintain compact circle form by default; expands only on user click
              }
            };
          }

          // 3. Update connected Deterministic Nodes
          if (connectedDetNodes.some((cd) => cd.id === n.id)) {
            return {
              ...n,
              data: {
                ...n.data,
                lastUpstreamReceived: richAgentPayload,
                upstreamPayload: richAgentPayload,
                lastUpstreamTime: Date.now(),
                lastStatus: 'running',
                isRunning: true
              }
            };
          }

          return n;
        });
      });
    };

    window.addEventListener('keaos:agent-output', handleAgentOutput);
    return () => window.removeEventListener('keaos:agent-output', handleAgentOutput);
  }, [edges, setNodes]);

  // Listen for real-time Deterministic Node execution events and update connected downstream nodes
  useEffect(() => {
    const handleDeterministicExecuted = (e) => {
      const detail = e.detail;
      if (!detail || !detail.nodeId) return;

      setNodes((nds) => {
        // Chaining: find any downstream deterministic nodes connected to this deterministic node
        const downstreamDetNodes = nds.filter(
          (n) => n.type === 'deterministicNode' && !n.data?.isDeactivated && (edges || []).some((ed) => ed.source === detail.nodeId && ed.target === n.id)
        );

        if (downstreamDetNodes.length > 0) {
          downstreamDetNodes.forEach((detNode) => {
            window.dispatchEvent(new CustomEvent('keaos:deterministic-executing', {
              detail: { nodeId: detNode.id, isRunning: true }
            }));
          });

          setTimeout(() => {
            downstreamDetNodes.forEach(async (detNode) => {
              const code = detNode.data?.code || (detNode.data?.language === 'python' ? 'def process(inputs):\n    return inputs' : 'function process(inputs, state) { return inputs; }');
              const lang = detNode.data?.language || 'auto';
              try {
                const res = await executeDeterministicTask({
                  nodeId: detNode.id,
                  language: lang,
                  code,
                  inputData: detail.output
                });
                window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
                  detail: { 
                    nodeId: detNode.id, 
                    output: res.output, 
                    tableData: res.tableData,
                    latencyMs: res.latencyMs,
                    success: res.success !== false,
                    error: res.error,
                    sourceAgentName: nds.find((n) => n.id === detail.nodeId)?.data?.name || 'Deterministic Rule'
                  }
                }));
              } catch (err) {
                console.error(`Chained deterministic execution error for ${detNode.id}:`, err);
              }
            });
          }, 60);
        }

        const executingDetNode = nds.find((n) => n.id === detail.nodeId);
        const ruleName = detail.sourceAgentName || executingDetNode?.data?.name || 'Deterministic Rule';

        // Format output cleanly: If it has structured summary/tableData, format as readable Markdown for viewer
        let formattedOutput = '';
        if (typeof detail.output === 'object' && detail.output !== null) {
          if (detail.output.summary && detail.tableData && Array.isArray(detail.tableData) && detail.tableData.length > 0) {
            const headers = Object.keys(detail.tableData[0] || {});
            let tableMd = `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`;
            detail.tableData.forEach((row) => {
              tableMd += `| ${headers.map((h) => row[h] ?? '').join(' | ')} |\n`;
            });
            formattedOutput = `### ⚡ ${ruleName} Evaluation\n\n**Summary**: ${detail.output.summary}\n\n${tableMd}`;
          } else if (detail.output.summary) {
            formattedOutput = `### ⚡ ${ruleName} Result\n\n${detail.output.summary}\n\n\`\`\`json\n${JSON.stringify(detail.output, null, 2)}\n\`\`\``;
          } else {
            formattedOutput = JSON.stringify(detail.output, null, 2);
          }
        } else {
          formattedOutput = String(detail.output ?? '');
        }

        return nds.map((n) => {
          // 1. Update the executing deterministic node itself
          if (n.id === detail.nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                lastOutput: detail.output,
                lastTableData: detail.tableData || null,
                lastStatus: detail.success !== false ? 'success' : 'error',
                lastError: detail.error || null,
                lastLatencyMs: detail.latencyMs,
                isRunning: false
              }
            };
          }

          // 2. Propagate to connected Canvas Output Nodes
          if (n.type === 'outputNode') {
            const isConnected = (edges || []).some(
              (ed) => (ed.source === detail.nodeId && ed.target === n.id) || (ed.target === detail.nodeId && ed.source === n.id)
            );
            if (isConnected) {
              const strategy = n.data?.persistenceStrategy || 'append';
              const prevHistory = Array.isArray(n.data?.runsHistory) ? n.data.runsHistory : [];
              const newRun = {
                runNumber: strategy === 'overwrite' ? 1 : prevHistory.length + 1,
                timestamp: new Date().toLocaleTimeString(),
                content: formattedOutput,
                tableData: detail.tableData || null,
                auditHash: null,
                tokens: 0,
                latencyMs: detail.latencyMs || 0,
                costUsd: 0,
                source: 'deterministic',
                sourceNodeType: 'deterministic',
                sourceNodeId: detail.nodeId,
                sourceNodeName: ruleName
              };
              const nextHistory = strategy === 'overwrite' ? [newRun] : [...prevHistory, newRun];

              return {
                ...n,
                data: {
                  ...n.data,
                  outputContent: formattedOutput,
                  runsHistory: nextHistory,
                  status: 'ready',
                  isExpanded: false, // Maintain compact circle form by default; expands only on user click
                  sourceNodeType: 'deterministic',
                  sourceNodeId: detail.nodeId,
                  sourceNodeName: ruleName,
                  observability: {
                    totalTokens: 0,
                    latencyMs: detail.latencyMs || 0,
                    note: 'Deterministic 0-Token Pipeline'
                  }
                }
              };
            }
          }

          // 3. Propagate to downstream Deterministic Nodes (Chaining: Box 1 -> Box 2)
          if (n.type === 'deterministicNode') {
            const isConnected = (edges || []).some(
              (ed) => ed.source === detail.nodeId && ed.target === n.id
            );
            if (isConnected) {
              return {
                ...n,
                data: {
                  ...n.data,
                  lastUpstreamReceived: detail.output,
                  lastUpstreamTime: Date.now(),
                  lastStatus: 'running',
                  isRunning: true
                }
              };
            }
          }

          return n;
        });
      });
    };

    window.addEventListener('keaos:deterministic-executed', handleDeterministicExecuted);
    return () => window.removeEventListener('keaos:deterministic-executed', handleDeterministicExecuted);
  }, [edges, setNodes]);

  // Listen for real-time Deterministic Code update events from Co-Pilot
  useEffect(() => {
    const handleDeterministicCodeUpdated = (e) => {
      const detail = e.detail;
      if (!detail || !detail.nodeId) return;

      setNodes((nds) => {
        return nds.map((n) => {
          if (n.id === detail.nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                code: detail.code !== undefined ? detail.code : n.data?.code,
                language: detail.language !== undefined ? detail.language : n.data?.language,
                prompt: detail.prompt !== undefined ? detail.prompt : n.data?.prompt,
                ruleSummary: detail.ruleSummary || detail.summary || detail.prompt || n.data?.ruleSummary,
                summary: detail.summary || detail.ruleSummary || detail.prompt || n.data?.summary,
                lastStatus: 'ready'
              }
            };
          }
          return n;
        });
      });
    };

    window.addEventListener('keaos:deterministic-code-updated', handleDeterministicCodeUpdated);
    return () => window.removeEventListener('keaos:deterministic-code-updated', handleDeterministicCodeUpdated);
  }, [setNodes]);

  // Listen for spawn-output-node event (e.g. from agent [+] button)
  useEffect(() => {
    const handleSpawnOutput = (e) => {
      const sourceAgentId = e.detail?.sourceAgentId;
      if (!sourceAgentId) return;

      const sourceNode = (nodes || []).find((n) => n.id === sourceAgentId);
      const newOutputId = `node-output-${Date.now().toString().slice(-4)}`;
      const xPos = sourceNode ? sourceNode.position.x + 280 : 700;
      const yPos = sourceNode ? sourceNode.position.y : 220;

      const newOutputNode = {
        id: newOutputId,
        type: 'outputNode',
        position: { x: xPos, y: yPos },
        data: {
          name: 'Stage Output',
          title: `${sourceNode?.data?.name || 'Agent'} Output`,
          status: 'idle',
          outputContent: '',
          isExpanded: false
        }
      };

      const newEdge = {
        id: `edge-output-${Date.now().toString().slice(-4)}`,
        source: sourceAgentId,
        sourceHandle: 'out',
        target: newOutputId,
        targetHandle: 'data-in',
        type: 'deletable',
        animated: true,
        style: { stroke: '#10B981', strokeWidth: 1.8, strokeDasharray: '4 4' }
      };

      setNodes((nds) => [...nds, newOutputNode]);
      setEdges((eds) => [...eds, newEdge]);
      if (onSelectNode) onSelectNode(newOutputNode);
      window.dispatchEvent(
        new CustomEvent('keaos:toast', {
          detail: { message: `✨ Connected Output Component to ${sourceNode?.data?.name || 'Agent'}` }
        })
      );
    };

    window.addEventListener('keaos:spawn-output-node', handleSpawnOutput);
    return () => window.removeEventListener('keaos:spawn-output-node', handleSpawnOutput);
  }, [nodes, setNodes, setEdges, onSelectNode]);

  // Listen for quick-spawn Ingestion Node from Agent Core left arm bolt [+] button
  useEffect(() => {
    const handleSpawnIngest = (e) => {
      const { agentId, agentPosition } = e.detail || {};
      const targetAgent = nodes.find(n => n.id === agentId);
      const posX = (agentPosition?.x ?? targetAgent?.position?.x ?? 595) - 340;
      const posY = (agentPosition?.y ?? targetAgent?.position?.y ?? 220);

      const newIngestId = `node-ingest-${Date.now().toString().slice(-4)}`;
      const newIngestNode = {
        id: newIngestId,
        type: 'ingestionNode',
        position: { x: posX, y: posY },
        data: {
          title: 'Data & Audio Ingestion',
          content: '',
          status: 'idle',
          isExpanded: true
        }
      };

      const newEdge = {
        id: `edge-ingest-${Date.now().toString().slice(-4)}`,
        source: newIngestId,
        sourceHandle: 'data-out',
        target: agentId || 'agent-core',
        targetHandle: 'tools-in',
        type: 'deletable',
        animated: true,
        style: { stroke: '#0091DA', strokeWidth: 1.8, strokeDasharray: '4 4' }
      };

      setNodes((nds) => [...nds, newIngestNode]);
      setEdges((eds) => [...eds, newEdge]);
      if (onSelectNode) onSelectNode(newIngestNode);
      window.dispatchEvent(
        new CustomEvent('keaos:toast', {
          detail: { message: `📥 Attached Ingestion Component to ${targetAgent?.data?.name || 'Agent'}` }
        })
      );
    };

    window.addEventListener('keaos:spawn-ingest-node', handleSpawnIngest);
    return () => window.removeEventListener('keaos:spawn-ingest-node', handleSpawnIngest);
  }, [nodes, setNodes, setEdges, onSelectNode]);

  // Update output nodes state during execution and auto-reset when idle
  useEffect(() => {
    if (executionState.isExecuting) {
      const activeNodeId = executionState.nodeId || executionState.activeAgentId;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.type === 'outputNode') {
            // Only mark as generating if wired directly to the active executing node!
            const isConnectedToActiveNode = activeNodeId
              ? (edges || []).some(
                  (ed) => (ed.source === activeNodeId && ed.target === n.id) ||
                          (ed.target === activeNodeId && ed.source === n.id)
                )
              : false;

            if (isConnectedToActiveNode) {
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'generating'
                }
              };
            }
          }
          return n;
        })
      );
    } else {
      // When execution is false, reset any output node that was left in generating state
      setNodes((nds) =>
        nds.map((n) => {
          if (n.type === 'outputNode' && n.data?.status === 'generating') {
            return {
              ...n,
              data: {
                ...n.data,
                status: n.data?.outputContent ? 'ready' : 'idle'
              }
            };
          }
          return n;
        })
      );
    }
  }, [executionState.isExecuting, executionState.nodeId, executionState.activeAgentId, edges, setNodes]);

  // Global listener to stop streaming and cancel active execution
  useEffect(() => {
    const handleCancelExecution = () => {
      setExecutionState({ isExecuting: false, step: '' });
      setNodes((nds) =>
        nds.map((n) => {
          let updated = { ...n.data };
          if (n.type === 'outputNode' && updated.status === 'generating') {
            updated.status = updated.outputContent ? 'ready' : 'idle';
          }
          if (updated.isExecuting) {
            updated.isExecuting = false;
          }
          return { ...n, data: updated };
        })
      );
      setToastNotification('⏹ Stream & Execution Stopped');
      setTimeout(() => setToastNotification(null), 2000);
    };

    window.addEventListener('keaos:cancel-execution', handleCancelExecution);
    return () => window.removeEventListener('keaos:cancel-execution', handleCancelExecution);
  }, [setNodes]);

  // Drag handler for summary map
  const handleMouseDownMiniMap = (e) => {
    setIsDraggingMiniMap(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: miniMapPos.x,
      initialY: miniMapPos.y
    };
  };

  useEffect(() => {
    if (!isDraggingMiniMap) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setMiniMapPos({
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy
      });
    };

    const handleMouseUp = () => {
      setIsDraggingMiniMap(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingMiniMap]);

  // -------------------------------------------------------------
  // Undo / Redo History Stack (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
  // -------------------------------------------------------------
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Take snapshot of current canvas topology before mutations
  const takeSnapshot = useCallback(() => {
    pastRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    if (pastRef.current.length > 50) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [nodes, edges]);

  // Undo (Ctrl+Z)
  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current.pop();
    futureRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    setToastNotification('↩️ Undo');
    setTimeout(() => {
      setToastNotification((curr) => (curr === '↩️ Undo' ? null : curr));
    }, 1500);
  }, [nodes, edges, setNodes, setEdges]);

  // Redo (Ctrl+Y / Ctrl+Shift+Z)
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    pastRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    setNodes(next.nodes);
    setEdges(next.edges);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    setToastNotification('↪️ Redo');
    setTimeout(() => {
      setToastNotification((curr) => (curr === '↪️ Redo' ? null : curr));
    }, 1500);
  }, [nodes, edges, setNodes, setEdges]);



  // Take snapshot when node drag starts
  const handleNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  // Handle edge delete with snapshot
  const handleDeleteEdge = useCallback((edgeId) => {
    takeSnapshot();
    setEdges((eds) => eds.filter(e => e.id !== edgeId));
  }, [takeSnapshot, setEdges]);

  // Handle node delete with snapshot
  const handleDeleteNode = useCallback((nodeId) => {
    takeSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (onSelectNode) {
      onSelectNode(null);
    }
  }, [takeSnapshot, setNodes, setEdges, onSelectNode]);

  // Listener to disconnect Foundation Model from Agent
  useEffect(() => {
    const handleDisconnectModel = (e) => {
      const agentId = e.detail?.agentId;
      if (!agentId) return;
      takeSnapshot();
      setEdges((eds) => eds.filter((ed) => !(ed.target === agentId && ed.targetHandle === 'model-in')));
      setToastNotification('🔌 Disconnected Model from Agent');
      setTimeout(() => setToastNotification(null), 2000);
    };

    window.addEventListener('keaos:disconnect-model', handleDisconnectModel);
    return () => window.removeEventListener('keaos:disconnect-model', handleDisconnectModel);
  }, [takeSnapshot, setEdges]);

  // Listen for quick-spawn downstream connected Agent (A2A) from Agent Core output port [+]
  useEffect(() => {
    const handleSpawnDownstreamAgent = (e) => {
      const sourceAgentId = e.detail?.sourceAgentId;
      if (!sourceAgentId) return;

      const sourceNode = (nodes || []).find((n) => n.id === sourceAgentId);
      const newAgentId = `agent-core-${Date.now().toString().slice(-4)}`;
      const xPos = sourceNode ? sourceNode.position.x + 360 : 700;
      const yPos = sourceNode ? sourceNode.position.y : 220;

      const existingAgents = (nodes || []).filter(n => n.type === 'agentCore');
      const agentCount = existingAgents.length + 1;

      // Smart framework rotation for heterogeneous demonstration: MS ADK -> OpenAI Swarm -> LangGraph -> LangChain
      const frameworkOptions = [
        { id: 'microsoft-adk', name: 'Microsoft ADK' },
        { id: 'openai-swarm', name: 'OpenAI Swarm' },
        { id: 'langgraph', name: 'LangGraph' },
        { id: 'langchain', name: 'LangChain' },
        { id: 'crewai', name: 'CrewAI' },
        { id: 'autogen', name: 'AutoGen' }
      ];
      const selectedFw = frameworkOptions[(agentCount - 2) % frameworkOptions.length] || frameworkOptions[0];

      const newAgentNode = {
        id: newAgentId,
        type: 'agentCore',
        position: { x: xPos, y: yPos },
        data: {
          name: `Specialist Agent #${agentCount}`,
          role: 'specialist',
          framework: selectedFw,
          prompt: 'You are a specialized enterprise sub-agent. Process upstream inputs and execute domain tasks with precision.',
          temperature: 0.2,
          topP: 0.95,
          attachedCounts: {
            model: 0,
            skills: 0,
            mcp: 0,
            tools: 0,
            gateway: 0,
            memory: 0,
            policies: 0,
            agent: 1
          }
        }
      };

      const newEdge = {
        id: `edge-a2a-${Date.now().toString().slice(-4)}`,
        source: sourceAgentId,
        sourceHandle: 'out',
        target: newAgentId,
        targetHandle: 'agent-in',
        type: 'deletable',
        animated: true,
        style: { stroke: '#6366F1', strokeWidth: 2.2, strokeDasharray: '6 4' }
      };

      takeSnapshot();
      setNodes((nds) => [...nds, newAgentNode]);
      setEdges((eds) => [...eds, newEdge]);
      if (onSelectNode) onSelectNode(newAgentNode);
      window.dispatchEvent(
        new CustomEvent('keaos:toast', {
          detail: { message: `🤖 Deployed & Connected ${newAgentNode.data.name} (${selectedFw.name}) via A2A Channel` }
        })
      );
    };

    window.addEventListener('keaos:spawn-downstream-agent', handleSpawnDownstreamAgent);
    return () => window.removeEventListener('keaos:spawn-downstream-agent', handleSpawnDownstreamAgent);
  }, [nodes, setNodes, setEdges, onSelectNode, takeSnapshot]);

  // Listener to delete node via event
  useEffect(() => {
    const handleDeleteEvent = (e) => {
      const nodeId = e.detail?.nodeId;
      if (nodeId) handleDeleteNode(nodeId);
    };

    window.addEventListener('keaos:delete-node', handleDeleteEvent);
    return () => window.removeEventListener('keaos:delete-node', handleDeleteEvent);
  }, [handleDeleteNode]);

  // Global keyboard listener for Delete / Backspace node deletion
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      // Ignore keypress if focus is inside an input, textarea, select, or contentEditable element
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable
        )
      ) {
        return;
      }

      // Find target node: selectedNode prop OR any node in state marked selected
      const targetNodeId = selectedNode?.id || nodes.find(n => n.selected)?.id;
      if (targetNodeId) {
        e.preventDefault();
        const targetNode = nodes.find(n => n.id === targetNodeId);
        handleDeleteNode(targetNodeId);
        const toastMsg = `🗑️ Deleted "${targetNode?.data?.name || 'Node'}"`;
        setToastNotification(toastMsg);
        setTimeout(() => {
          setToastNotification((curr) => (curr === toastMsg ? null : curr));
        }, 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, nodes, handleDeleteNode, onSelectNode]);

  // Handle node duplicate with snapshot
  const handleDuplicateNode = useCallback((nodeId) => {
    const nodeToClone = nodes.find(n => n.id === nodeId);
    if (!nodeToClone) return;

    takeSnapshot();
    const newId = `${nodeToClone.data?.pillarType || nodeToClone.type || 'node'}-${Date.now().toString().slice(-4)}`;
    const clonedData = { ...JSON.parse(JSON.stringify(nodeToClone.data || {})) };

    // Strict Isolation: When duplicating an Output Node, ALWAYS start with a clean empty slate!
    if (nodeToClone.type === 'outputNode') {
      clonedData.runsHistory = [];
      clonedData.outputContent = '';
      clonedData.status = 'idle';
      clonedData.sourceNodeType = null;
      clonedData.sourceNodeId = null;
      clonedData.sourceNodeName = null;
      clonedData.auditHash = null;
      clonedData.observability = { totalTokens: 0, latencyMs: 0 };
      clonedData.isExpanded = false;
      clonedData.name = 'Output Viewer';
      clonedData.title = 'Output Viewer';
    }

    const clonedNode = {
      ...JSON.parse(JSON.stringify(nodeToClone)),
      id: newId,
      position: {
        x: nodeToClone.position.x + 50,
        y: nodeToClone.position.y + 50
      },
      data: clonedData,
      selected: true
    };

    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), clonedNode]);
    const toastMsg = `📋 Duplicated "${nodeToClone.data?.name || 'Node'}"`;
    setToastNotification(toastMsg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === toastMsg ? null : curr));
    }, 2000);
  }, [nodes, takeSnapshot, setNodes]);

  // Handle toggle deactivate node with snapshot
  const handleToggleDeactivateNode = useCallback((nodeId) => {
    takeSnapshot();
    let statusText = '';
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        const nextState = !n.data.isDeactivated;
        statusText = nextState 
          ? `⏸️ Deactivated "${n.data?.name || 'Node'}"` 
          : `▶️ Activated "${n.data?.name || 'Node'}"`;
        return {
          ...n,
          data: {
            ...n.data,
            isDeactivated: nextState
          }
        };
      }
      return n;
    }));

    if (statusText) {
      setToastNotification(statusText);
      setTimeout(() => {
        setToastNotification((curr) => (curr === statusText ? null : curr));
      }, 2000);
    }
  }, [takeSnapshot, setNodes]);

  // Handle copy node config to clipboard
  const handleCopyNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    try {
      const serialized = JSON.stringify(node, null, 2);
      navigator.clipboard.writeText(serialized);
      const toastMsg = `📋 Copied "${node.data?.name || 'Node'}" configuration`;
      setToastNotification(toastMsg);
      setTimeout(() => {
        setToastNotification((curr) => (curr === toastMsg ? null : curr));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy node', err);
    }
  }, [nodes]);

  // Handle open inspector for node
  const handleOpenInspector = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setIsAddMenuOpen(false);
    if (onSelectNode) onSelectNode(node);
    if (setIsInspectorOpen) setIsInspectorOpen(true);
  }, [nodes, onSelectNode, setIsInspectorOpen, setIsAddMenuOpen]);

  // Handle open node catalog for adding blocks / capabilities
  const handleOpenCatalog = useCallback(() => {
    setIsAddMenuOpen(true);
  }, [setIsAddMenuOpen]);

  // Listener to open node catalog via event
  useEffect(() => {
    const handleOpenCatalogEvent = () => setIsAddMenuOpen(true);
    window.addEventListener('keaos:open-node-catalog', handleOpenCatalogEvent);
    return () => window.removeEventListener('keaos:open-node-catalog', handleOpenCatalogEvent);
  }, [setIsAddMenuOpen]);

  // Handle execute node / step
  const handleExecuteNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (node.type === 'agentCore') {
      // Find connected Ingestion node on canvas for this agent
      const incomingEdges = (edges || []).filter(e => e.target === nodeId);
      const connectedIngestEdge = incomingEdges.find(e => {
        const src = nodes.find(n => n.id === e.source);
        return src?.type === 'ingestionNode';
      });

      if (connectedIngestEdge) {
        const ingestNode = nodes.find(n => n.id === connectedIngestEdge.source);
        if (ingestNode?.data?.content?.trim()) {
          window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
            detail: { content: ingestNode.data.content, nodeId: ingestNode.id }
          }));
        }
      }

      window.dispatchEvent(new CustomEvent('keaos:execute-workflow', { detail: { agentId: nodeId } }));
      return;
    }

    setExecutionState({ isExecuting: true, step: `Executing ${node.data?.name || 'step'}...`, pillarType: node.data?.pillarType });
    const toastMsg = `⚡ Executing step: "${node.data?.name || 'Node'}"`;
    setToastNotification(toastMsg);
    setTimeout(() => {
      setExecutionState({ isExecuting: false, step: '' });
      setToastNotification((curr) => (curr === toastMsg ? null : curr));
    }, 1500);
  }, [nodes, edges]);

  // Handle rename node with snapshot
  const handleRenameNode = useCallback((nodeId, newName) => {
    if (!newName || !newName.trim()) return;
    takeSnapshot();
    const cleanName = newName.trim();
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            name: cleanName
          }
        };
      }
      return n;
    }));
    const toastMsg = `✏️ Renamed to "${cleanName}"`;
    setToastNotification(toastMsg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === toastMsg ? null : curr));
    }, 2000);
  }, [takeSnapshot, setNodes]);

  // Handle update deterministic node data
  const handleUpdateDeterministicNode = useCallback((nodeId, updatedData) => {
    if (onUpdateNodeData) {
      onUpdateNodeData(nodeId, updatedData);
    } else {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updatedData } } : n))
      );
    }
  }, [onUpdateNodeData, setNodes]);

  // Global Keyboard Shortcuts Listener:
  // - 'D' / 'd': Toggle Deactivate / Activate on selected or hovered node
  // - 'Ctrl+D': Duplicate selected or hovered node
  // - 'Ctrl+C': Copy selected or hovered node configuration
  // - 'Enter': Open Inspector for selected or hovered node
  // - 'F2': Quick rename selected or hovered node
  // - 'Ctrl+Z': Undo canvas mutation
  // - 'Ctrl+Y' / 'Ctrl+Shift+Z': Redo canvas mutation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key;

      // 1. Undo / Redo / Execute Workflow
      if (isCtrlOrCmd) {
        if (key === 'Enter') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('keaos:execute-workflow'));
          const toastMsg = '⚡ Executing Workflow...';
          setToastNotification(toastMsg);
          setTimeout(() => {
            setToastNotification((curr) => (curr === toastMsg ? null : curr));
          }, 2000);
          return;
        } else if (key === 'z' || key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        } else if (key === 'y' || key === 'Y') {
          e.preventDefault();
          redo();
          return;
        }
      }

      // Determine active target node (selected on canvas, in inspector, or hovered)
      const targetNode = nodes.find(n => n.selected) || 
        (selectedNode ? nodes.find(n => n.id === selectedNode.id) : null) ||
        (hoveredNodeIdRef.current ? nodes.find(n => n.id === hoveredNodeIdRef.current) : null);

      if (!targetNode) return;

      // 2. Duplicate Node (Ctrl+D)
      if (isCtrlOrCmd && (key === 'd' || key === 'D')) {
        e.preventDefault();
        handleDuplicateNode(targetNode.id);
        return;
      }

      // 3. Copy Node Config (Ctrl+C)
      if (isCtrlOrCmd && (key === 'c' || key === 'C')) {
        e.preventDefault();
        handleCopyNode(targetNode.id);
        return;
      }

      // 4. Toggle Deactivate / Activate (Single key "D" or "d")
      if (!isCtrlOrCmd && !e.altKey && (key === 'd' || key === 'D')) {
        e.preventDefault();
        handleToggleDeactivateNode(targetNode.id);
        return;
      }

      // 5. Open Inspector (Enter)
      if (!isCtrlOrCmd && !e.altKey && key === 'Enter') {
        e.preventDefault();
        handleOpenInspector(targetNode.id);
        return;
      }

      // 6. Quick Rename (F2)
      if (key === 'F2') {
        e.preventDefault();
        const currentName = targetNode.data?.name || '';
        const newName = window.prompt(`Rename "${currentName}":`, currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
          handleRenameNode(targetNode.id, newName.trim());
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, 
    redo, 
    nodes, 
    selectedNode, 
    handleToggleDeactivateNode, 
    handleDuplicateNode, 
    handleCopyNode, 
    handleOpenInspector,
    handleRenameNode
  ]);

  // Handle node removals (e.g. keyboard delete)
  const handleNodesChange = useCallback((changes) => {
    if (changes.some(c => c.type === 'remove')) {
      takeSnapshot();
    }
    onNodesChange(changes);
  }, [takeSnapshot, onNodesChange]);

  // Handle edge removals (e.g. keyboard delete)
  const handleEdgesChange = useCallback((changes) => {
    if (changes.some(c => c.type === 'remove')) {
      takeSnapshot();
    }
    onEdgesChange(changes);
  }, [takeSnapshot, onEdgesChange]);

  const isValidConnection = useCallback(
    (connection) => {
      if (!isEnforcerActive) return true;

      const { source, target, targetHandle } = connection;
      const sourceNode = nodes.find(n => n.id === source);
      const targetNode = nodes.find(n => n.id === target);

      if (!sourceNode || !targetNode) return false;

      // Allow connections into Canvas Output Node from Agent Core, Tools, Deterministic Box, or another Output Node
      if (targetNode.type === 'outputNode') {
        if (sourceNode.type === 'agentCore' || sourceNode.type === 'pillar' || sourceNode.type === 'outputNode' || sourceNode.type === 'deterministicNode') {
          return true;
        }
      }

      // Allow pass-through connections from Output Node to downstream Agent Core, next Output Node, or Deterministic Box
      if (sourceNode.type === 'outputNode') {
        if (targetNode.type === 'agentCore' || targetNode.type === 'outputNode' || targetNode.type === 'deterministicNode') {
          return true;
        }
      }

      // Allow connections from Ingestion Node into Agent Core tools-in (or any agent handle) or pillar tools
      if (sourceNode.type === 'ingestionNode') {
        if (targetNode.type === 'agentCore' || targetNode.type === 'pillar' || targetNode.type === 'deterministicNode') {
          return true;
        }
      }

      // Connection between MCP Server and MCP Egress Gateway (Bidirectional: EITHER direction is fully permitted)
      const isMcpToGateway = sourceNode.data?.pillarType === 'mcp' && targetNode.data?.pillarType === 'gateway';
      const isGatewayToMcp = sourceNode.data?.pillarType === 'gateway' && targetNode.data?.pillarType === 'mcp';
      if (isMcpToGateway || isGatewayToMcp) {
        return true;
      }

      // Deterministic Box Connections (Universal DAG flow: chaining, fan-in, fan-out)
      // 1. Chaining between Deterministic boxes
      if (sourceNode.type === 'deterministicNode' && targetNode.type === 'deterministicNode') {
        return true;
      }
      // 2. Deterministic box feeding Agent Core (or reverse)
      if ((sourceNode.type === 'deterministicNode' && targetNode.type === 'agentCore') || (sourceNode.type === 'agentCore' && targetNode.type === 'deterministicNode')) {
        return true;
      }
      // 3. Ingestion Node feeding Deterministic box
      if (sourceNode.type === 'ingestionNode' && targetNode.type === 'deterministicNode') {
        return true;
      }
      // 4. Deterministic box feeding Output Node (or reverse connection drag)
      if ((sourceNode.type === 'deterministicNode' && targetNode.type === 'outputNode') || (sourceNode.type === 'outputNode' && targetNode.type === 'deterministicNode')) {
        return true;
      }

      // If user drags directly from other non-mcp nodes into gateway, show alert
      if (targetNode.type === 'pillar' && targetNode.data?.pillarType === 'gateway') {
        setInvalidConnectionAlert({
          sourceName: sourceNode.data?.name || 'Block',
          sourceType: sourceNode.data?.pillarType || sourceNode.type,
          targetHandle: targetHandle || 'mcp-in',
          requiredType: 'mcp (MCP Egress Gateway only accepts MCP Server nodes)'
        });
        return false;
      }

      if (targetNode.type === 'agentCore') {
        // Direct MCP connection to Agent Core is STRICTLY FORBIDDEN!
        if (sourceNode.data?.pillarType === 'mcp') {
          setInvalidConnectionAlert({
            sourceName: sourceNode.data?.name || 'MCP Server',
            sourceType: 'mcp',
            targetHandle: targetHandle || 'mcp-in',
            requiredType: 'Zero-Trust Policy: Direct MCP connections are forbidden. Connect into the MCP Egress Gateway socket (Right or Left), then route through it.'
          });
          return false;
        }

        // Gateway connection into Agent Core mcp-in or gateway-in is ALLOWED
        if (sourceNode.data?.pillarType === 'gateway' && (targetHandle === 'mcp-in' || targetHandle === 'gateway-in')) {
          return true;
        }

        // Allow Agent-to-Agent (A2A) connections into agent-in
        if (sourceNode.type === 'agentCore') {
          if (targetHandle === 'agent-in' || !targetHandle) {
            return true;
          }
          setInvalidConnectionAlert({
            sourceName: sourceNode.data?.name || 'Agent',
            sourceType: 'agentCore',
            targetHandle,
            requiredType: 'agent-in (A2A Stream)'
          });
          return false;
        }

        const requiredPillar = SOCKET_RULES[targetHandle];
        const sourcePillar = sourceNode.data?.pillarType;

        if (requiredPillar === sourcePillar) {
          return true;
        } else {
          setInvalidConnectionAlert({
            sourceName: sourceNode.data?.name || 'Block',
            sourceType: sourcePillar || sourceNode.type,
            targetHandle,
            requiredType: requiredPillar
          });
          return false;
        }
      }

      return false;
    },
    [nodes, isEnforcerActive, setInvalidConnectionAlert]
  );

  const onConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      const pillarDef = sourceNode ? PILLARS[sourceNode.data?.pillarType] : null;
      let strokeColor = pillarDef?.color || '#0091DA';
      let strokeWidth = 1.8;
      let strokeDasharray = '4 4';

      let edgeSource = params.source;
      let edgeTarget = params.target;
      let edgeSourceHandle = params.sourceHandle;
      let edgeTargetHandle = params.targetHandle;

      if (sourceNode?.data?.pillarType === 'gateway' && targetNode?.data?.pillarType === 'mcp') {
        // Dragged from Gateway to MCP: normalize edge so MCP is source and Gateway is target
        edgeSource = targetNode.id;
        edgeSourceHandle = 'out';
        edgeTarget = sourceNode.id;
        edgeTargetHandle = 'mcp-in';
        strokeColor = '#00A3A6';
        strokeWidth = 2.0;
        strokeDasharray = '4 4';
      } else if (sourceNode?.data?.pillarType === 'mcp' && targetNode?.data?.pillarType === 'gateway') {
        edgeSource = sourceNode.id;
        edgeSourceHandle = params.sourceHandle || 'out';
        edgeTarget = targetNode.id;
        edgeTargetHandle = params.targetHandle || 'mcp-in';
        strokeColor = '#00A3A6';
        strokeWidth = 2.0;
        strokeDasharray = '4 4';
      } else if ((sourceNode?.type === 'deterministicNode' && targetNode?.type === 'outputNode') || (sourceNode?.type === 'outputNode' && targetNode?.type === 'deterministicNode')) {
        strokeColor = '#10B981'; // Emerald accent for Deterministic to Output sink
        strokeWidth = 2.4;
        strokeDasharray = '5 4';
      } else if ((sourceNode?.type === 'agentCore' && targetNode?.type === 'deterministicNode') || (sourceNode?.type === 'deterministicNode' && targetNode?.type === 'agentCore')) {
        strokeColor = '#EAAA00'; // Amber Gold for Agent to Deterministic pipeline
        strokeWidth = 2.4;
        strokeDasharray = '5 4';
      } else if (targetNode?.type === 'outputNode' || sourceNode?.type === 'outputNode') {
        strokeColor = '#10B981'; // Emerald accent for data/output pipelines
      } else if (sourceNode?.type === 'ingestionNode') {
        strokeColor = '#0091DA'; // Pacific Blue for data ingestion stream
      } else if (sourceNode?.type === 'agentCore' && targetNode?.type === 'agentCore') {
        strokeColor = '#6366F1'; // Electric Indigo for A2A Inter-Agent channel
        strokeWidth = 2.2;
        strokeDasharray = '6 4';
      } else if (sourceNode?.data?.pillarType === 'gateway' && targetNode?.type === 'agentCore') {
        strokeColor = '#EAAA00'; // Amber for Gateway to Agent Core
        strokeWidth = 2.0;
        strokeDasharray = '4 4';
      } else if (sourceNode?.type === 'deterministicNode' || targetNode?.type === 'deterministicNode') {
        strokeColor = '#EAAA00'; // Amber Gold for Deterministic Stream
        strokeWidth = 2.0;
        strokeDasharray = '5 4';
      }

      takeSnapshot();

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            source: edgeSource,
            target: edgeTarget,
            sourceHandle: edgeSourceHandle,
            targetHandle: edgeTargetHandle,
            type: 'deletable',
            animated: true,
            style: { stroke: strokeColor, strokeWidth, strokeDasharray },
            data: { onDelete: handleDeleteEdge }
          },
          eds
        )
      );
      setInvalidConnectionAlert(null);
    },
    [nodes, setEdges, setInvalidConnectionAlert, takeSnapshot, handleDeleteEdge]
  );

  const isConnectingRef = useRef(false);

  // Triggered the instant a connector wire is dragged from any handle on any agent or circle
  const handleConnectStart = useCallback(
    (event, params) => {
      isConnectingRef.current = true;

      // 1. Immediately open the Add component panel on the right
      setIsAddMenuOpen(true);
      if (setIsInspectorOpen) {
        setIsInspectorOpen(false);
      }

      // 2. Resolve contextual category matching
      const nodeId = params?.nodeId;
      const handleId = params?.handleId;
      const sourceNode = (nodes || []).find((n) => n.id === nodeId);

      let targetCategory = null;

      if (sourceNode?.type === 'agentCore') {
        if (handleId && SOCKET_RULES[handleId]) {
          targetCategory = SOCKET_RULES[handleId];
        } else if (handleId === 'agent-out' || handleId === 'agent-upstream') {
          targetCategory = 'agentCore';
        }
      } else if (sourceNode?.type === 'pillar') {
        const pillarType = sourceNode.data?.pillarType;
        if (pillarType === 'gateway' && (handleId === 'mcp-in' || handleId === 'mcp-in-left')) {
          targetCategory = 'mcp';
        } else if (pillarType === 'mcp') {
          targetCategory = 'gateway';
        } else if (pillarType) {
          targetCategory = pillarType;
        }
      } else if (sourceNode?.type === 'ingestionNode') {
        targetCategory = 'tools';
      } else if (sourceNode?.type === 'outputNode') {
        targetCategory = 'outputNode';
      }

      // 3. Dispatch selection event so the Add Catalog jumps to the relevant category
      window.dispatchEvent(
        new CustomEvent('keaos:select-catalog-category', {
          detail: { categoryId: targetCategory }
        })
      );
    },
    [setIsAddMenuOpen, setIsInspectorOpen, nodes]
  );

  const handleConnectEnd = useCallback(() => {
    setTimeout(() => {
      isConnectingRef.current = false;
    }, 200);
  }, []);

  const handleToggleEnforcer = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const nextVal = !isEnforcerActive;
    if (setIsEnforcerActive) {
      setIsEnforcerActive(nextVal);
    }
    const msg = nextVal
      ? '🛡️ Socket Enforcer: STRICT VALIDATION ACTIVE'
      : '⚠️ Socket Enforcer: BYPASSED (Freeform connections allowed)';
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const handleToggleGatewayTool = useCallback((gatewayNodeId, toolName, enabled) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === gatewayNodeId) {
          const currentDisabled = Array.isArray(n.data?.disabledTools) ? n.data.disabledTools : [];
          const nextDisabled = enabled
            ? currentDisabled.filter((t) => t !== toolName)
            : Array.from(new Set([...currentDisabled, toolName]));
          return {
            ...n,
            data: {
              ...n.data,
              disabledTools: nextDisabled
            }
          };
        }
        return n;
      })
    );
    if (onUpdateNodeData) {
      const gw = (nodes || []).find((n) => n.id === gatewayNodeId);
      const currentDisabled = Array.isArray(gw?.data?.disabledTools) ? gw.data.disabledTools : [];
      const nextDisabled = enabled
        ? currentDisabled.filter((t) => t !== toolName)
        : Array.from(new Set([...currentDisabled, toolName]));
      onUpdateNodeData(gatewayNodeId, { disabledTools: nextDisabled });
    }
    const statusMsg = enabled
      ? `🔓 Gateway Permitted: "${toolName}"`
      : `🛡️ Gateway Blocked: "${toolName}" (Traffic restricted)`;
    setToastNotification(statusMsg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === statusMsg ? null : curr));
    }, 2500);
  }, [setNodes, nodes, onUpdateNodeData]);

  const nodesWithTheme = React.useMemo(() => {
    // 1. Pre-process and auto-upgrade any MCP node whose tools are outdated
    const upgradedNodes = (nodes || []).map(n => {
      if (n.type === 'pillar' && n.data?.pillarType === 'mcp') {
        const srv = identifyMcpService(n.data, n.id);
        const currentTools = n.data?.tools || [];
        if (srv === 'github' && currentTools.length < GITHUB_OFFICIAL_ACTIONS.length) {
          return {
            ...n,
            data: {
              ...n.data,
              serviceName: 'GitHub',
              tools: GITHUB_OFFICIAL_ACTIONS
            }
          };
        } else if (srv === 'slack' && currentTools.length < SLACK_OFFICIAL_ACTIONS.length) {
          return {
            ...n,
            data: {
              ...n.data,
              serviceName: 'Slack',
              tools: SLACK_OFFICIAL_ACTIONS
            }
          };
        } else if (srv === 'jira' && currentTools.length < JIRA_OFFICIAL_ACTIONS.length) {
          return {
            ...n,
            data: {
              ...n.data,
              serviceName: 'Jira',
              tools: JIRA_OFFICIAL_ACTIONS
            }
          };
        } else if (srv === 'neo4j' && currentTools.length < NEO4J_OFFICIAL_ACTIONS.length) {
          return {
            ...n,
            data: {
              ...n.data,
              serviceName: 'Neo4j',
              tools: NEO4J_OFFICIAL_ACTIONS
            }
          };
        } else if (srv === 'outlook' && currentTools.length < OUTLOOK_OFFICIAL_ACTIONS.length) {
          return {
            ...n,
            data: {
              ...n.data,
              serviceName: 'Outlook',
              tools: OUTLOOK_OFFICIAL_ACTIONS
            }
          };
        }
      }
      return n;
    });

    const nodeLookup = {};
    upgradedNodes.forEach(n => {
      nodeLookup[n.id] = n;
    });

    return upgradedNodes.map(n => {
      const isThisNodeActive = executionState.isExecuting && (
        n.id === executionState.nodeId || 
        n.id === executionState.activeAgentId ||
        (n.type === 'agentCore' && !executionState.nodeId && !executionState.activeAgentId) ||
        (n.type === 'ingestionNode' && (executionState.pillarType === 'tools' || executionState.step === 'Starting')) ||
        (n.data?.pillarType && n.data.pillarType === executionState.pillarType) ||
        (n.type === 'deterministicNode' && (executionState.nodeId === n.id || executionState.step?.includes('Deterministic')))
      );

      // Dynamically calculate attachedCounts and connectedModelName specifically for THIS agent node
      // Rule 1: Explicitly initialize all prospective return fields in outer iteration scope
      let isStaged = false;
      let agentCounts = n.data?.attachedCounts;
      let connectedModelName = null;
      let inheritedModelName = null;
      let upstreamAgentNames = [];
      let routedTools = [];
      let connectedMcpNodes = [];
      let disabledTools = [];
      let onToggleTool = null;
      let upstreamCount = 0;
      let upstreamPayload = null;
      let upstreamSources = [];
      let resolvedSourceNodeType = n.data?.sourceNodeType || null;
      let resolvedSourceNodeName = n.data?.sourceNodeName || null;

      if (n.type === 'pillar' && n.data?.pillarType === 'gateway') {
        disabledTools = Array.isArray(n.data?.disabledTools) ? n.data.disabledTools : [];
        const incomingMcpEdges = (edges || []).filter(e => 
          (e.target === n.id && nodeLookup[e.source]?.data?.pillarType === 'mcp') ||
          (e.source === n.id && nodeLookup[e.target]?.data?.pillarType === 'mcp')
        );
        connectedMcpNodes = incomingMcpEdges
          .map(e => e.target === n.id ? nodeLookup[e.source] : nodeLookup[e.target])
          .filter(Boolean);

        connectedMcpNodes.forEach(mcpNode => {
          const srv = identifyMcpService(mcpNode.data, mcpNode.id);
          const itemDef = PILLARS.mcp?.items?.find(it => it.id === mcpNode.data?.itemId || it.id === mcpNode.data?.toolId || it.name === mcpNode.data?.name);
          let tools = mcpNode.data?.tools || itemDef?.tools || [];

          if (srv === 'github' && tools.length < GITHUB_OFFICIAL_ACTIONS.length) {
            tools = GITHUB_OFFICIAL_ACTIONS;
          } else if (srv === 'slack' && tools.length < SLACK_OFFICIAL_ACTIONS.length) {
            tools = SLACK_OFFICIAL_ACTIONS;
          } else if (srv === 'jira' && tools.length < JIRA_OFFICIAL_ACTIONS.length) {
            tools = JIRA_OFFICIAL_ACTIONS;
          } else if (srv === 'neo4j' && tools.length < NEO4J_OFFICIAL_ACTIONS.length) {
            tools = NEO4J_OFFICIAL_ACTIONS;
          }

          tools.forEach(tool => {
            routedTools.push({
              ...tool,
              serverName: mcpNode.data?.name || 'MCP Server',
              serverId: mcpNode.id,
              isBlocked: disabledTools.includes(tool.name)
            });
          });
        });

        onToggleTool = (toolName, enabled) => handleToggleGatewayTool(n.id, toolName, enabled);
      }

      if (n.type === 'agentCore') {
        agentCounts = {
          model: 0,
          skills: 0,
          mcp: 0,
          tools: 0,
          gateway: 0,
          memory: 0,
          policies: 0,
          agent: 0
        };

        (edges || []).forEach((edge) => {
          if (edge.target === n.id) {
            const sourceNode = nodeLookup[edge.source];
            const isSourceDeactivated = !!sourceNode?.data?.isDeactivated;
            if (sourceNode?.type === 'agentCore' && !isSourceDeactivated) {
              agentCounts.agent += 1;
              if (sourceNode.data?.name) {
                upstreamAgentNames.push(sourceNode.data.name);
              }
            } else if (edge.targetHandle) {
              const pillar = SOCKET_RULES[edge.targetHandle];
              if (pillar && agentCounts[pillar] !== undefined && !isSourceDeactivated) {
                agentCounts[pillar] += 1;
                if (pillar === 'model' && sourceNode) {
                  connectedModelName = sourceNode.data?.name || sourceNode.data?.config?.modelId || 'Foundation Model';
                }
              }
              if (edge.targetHandle === 'mcp-in' && sourceNode?.data?.pillarType === 'gateway' && !isSourceDeactivated) {
                agentCounts.gateway = (agentCounts.gateway || 0) + 1;
              }
            }
          }
        });

        // Automatically detect inherited model from upstream agents or primary canvas model
        if (agentCounts.model === 0) {
          // Check upstream connected agents first
          const incomingA2AEdges = (edges || []).filter(e => e.target === n.id && (e.targetHandle === 'agent-in' || !e.targetHandle));
          for (const a2aEdge of incomingA2AEdges) {
            const upAgent = nodeLookup[a2aEdge.source];
            if (upAgent) {
              const modelEdge = (edges || []).find(e => e.target === upAgent.id && e.targetHandle === 'model-in');
              if (modelEdge && nodeLookup[modelEdge.source]) {
                inheritedModelName = nodeLookup[modelEdge.source].data?.name || 'Upstream Model';
                break;
              }
            }
          }
          // If no upstream model found, fallback to root canvas model
          if (!inheritedModelName) {
            const rootModel = (nodes || []).find(sn => sn.type === 'pillar' && sn.data?.pillarType === 'model' && !sn.data?.isDeactivated);
            if (rootModel) {
              inheritedModelName = rootModel.data?.name || 'Shared Senior Brain';
            }
          }
        }
      }

      if (n.type === 'deterministicNode') {
        const incomingEdges = (edges || []).filter(e => e.target === n.id);
        const outgoingEdges = (edges || []).filter(e => e.source === n.id);
        upstreamCount = incomingEdges.length;

        // If workflow is executing and this deterministic node is connected in the active DAG, mark as staged!
        if (executionState.isExecuting && !n.data?.isDeactivated) {
          const isConnectedToWorkflow = incomingEdges.some(e => {
            const src = nodeLookup[e.source];
            return src?.type === 'agentCore' || src?.type === 'outputNode';
          }) || outgoingEdges.some(e => {
            const tgt = nodeLookup[e.target];
            return tgt?.type === 'agentCore' || tgt?.type === 'outputNode';
          });
          isStaged = isConnectedToWorkflow;
        }

        upstreamSources = incomingEdges.map(e => {
          const srcNode = nodeLookup[e.source];
          let srcOutput = srcNode?.data?.lastOutput ?? srcNode?.data?.content ?? srcNode?.data?.outputContent ?? null;
          if (typeof srcOutput === 'string' && srcOutput.trim()) {
            const clean = srcOutput.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
            if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
              try { srcOutput = JSON.parse(clean); } catch {}
            }
          }
          return {
            id: e.source,
            name: srcNode?.data?.name || srcNode?.data?.title || e.source,
            type: srcNode?.type || 'node',
            output: srcOutput
          };
        });

        const payload = {};
        if (upstreamSources.length === 1) {
          const singleOut = upstreamSources[0].output;
          if (typeof singleOut === 'object' && singleOut !== null) {
            Object.assign(payload, singleOut);
          }
          payload['data'] = singleOut;
          payload[upstreamSources[0].name.replace(/[^a-zA-Z0-9_]/g, '_')] = singleOut;
        } else if (upstreamSources.length > 1) {
          upstreamSources.forEach(s => {
            const key = s.name.replace(/[^a-zA-Z0-9_]/g, '_');
            payload[key] = s.output;
          });
          const firstValid = upstreamSources.find(s => s.output !== null && s.output !== undefined);
          if (firstValid) {
            payload['data'] = firstValid.output;
          }
        }
        payload['sources'] = upstreamSources;
        payload['allOutputs'] = upstreamSources.map(s => s.output);
        upstreamPayload = payload;
      }

      if (n.type === 'outputNode') {
        const incomingEdge = (edges || []).find(e => e.target === n.id);
        if (incomingEdge) {
          const upNode = nodeLookup[incomingEdge.source];
          if (upNode) {
            if (upNode.type === 'deterministicNode') {
              resolvedSourceNodeType = 'deterministic';
              resolvedSourceNodeName = upNode.data?.name || upNode.data?.ruleName || 'Deterministic Rule';
            } else if (upNode.type === 'agentCore') {
              resolvedSourceNodeType = 'agent';
              resolvedSourceNodeName = upNode.data?.name || 'Autonomous Agent';
            }
          }
        } else if (!n.data?.outputContent && (!n.data?.runsHistory || n.data.runsHistory.length === 0)) {
          resolvedSourceNodeType = null;
          resolvedSourceNodeName = null;
        }
      }

      return {
        ...n,
        data: {
          ...n.data,
          isDarkMode,
          isExecuting: isThisNodeActive || (n.type === 'agentCore' && executionState.isExecuting && !executionState.activeAgentId) || (n.type === 'deterministicNode' && (isThisNodeActive || n.data?.isRunning)),
          isStaged,
          executionStep: executionState.step,
          attachedCounts: agentCounts,
          connectedModelName: connectedModelName,
          inheritedModelName: inheritedModelName,
          upstreamAgentCount: agentCounts?.agent || 0,
          upstreamAgentNames: upstreamAgentNames || [],
          upstreamCount,
          upstreamPayload,
          upstreamSources,
          sourceNodeType: resolvedSourceNodeType,
          sourceNodeName: resolvedSourceNodeName,
          onUpdateNodeData: handleUpdateDeterministicNode,
          routedTools,
          connectedMcpNodes,
          disabledTools,
          onToggleTool,
          onOpenAgentChat: handleOpenAgentChat,
          onOpenDeterministicChat: handleOpenDeterministicChat,
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
          onToggleDeactivate: handleToggleDeactivateNode,
          onCopy: handleCopyNode,
          onOpenInspector: handleOpenInspector,
          onExecute: handleExecuteNode,
          onRename: handleRenameNode,
          onOpenCatalog: handleOpenCatalog
        }
      };
    });
  }, [
    nodes, 
    edges, 
    isDarkMode, 
    executionState, 
    handleToggleGatewayTool,
    handleOpenAgentChat,
    handleOpenDeterministicChat,
    handleDeleteNode, 
    handleDuplicateNode, 
    handleToggleDeactivateNode, 
    handleCopyNode, 
    handleOpenInspector, 
    handleExecuteNode,
    handleRenameNode,
    handleUpdateDeterministicNode,
    handleOpenCatalog
  ]);

  // Edges styled dynamically: when executing, active transmitting edge glows and pulses with taxonomy color
  const edgesWithTheme = React.useMemo(() => {
    const nodeLookup = {};
    (nodes || []).forEach(n => {
      nodeLookup[n.id] = n;
    });

    return (edges || []).map((edge) => {
      const sourceNode = nodeLookup[edge.source];
      const targetNode = nodeLookup[edge.target];
      const isSourceDeactivated = !!sourceNode?.data?.isDeactivated;
      const isTargetDeactivated = !!targetNode?.data?.isDeactivated;
      const isDeactivated = isSourceDeactivated || isTargetDeactivated;

      const originalStroke = edge.style?.stroke || '#0091DA';
      const deactivatedStroke = isDarkMode ? '#475569' : '#94A3B8';

      // Deterministic Edge checks: wires connected to or from deterministicNode
      const isDetEdge = (sourceNode?.type === 'deterministicNode' || targetNode?.type === 'deterministicNode');
      const isDetActive = isDetEdge && (
        (executionState.isExecuting && (
          executionState.step?.includes('Deterministic') ||
          executionState.nodeId === edge.source ||
          executionState.nodeId === edge.target
        )) ||
        sourceNode?.data?.isRunning ||
        targetNode?.data?.isRunning ||
        (executionState.isExecuting && (sourceNode?.data?.isStaged || targetNode?.data?.isStaged))
      );

      // Live Active Wire Animation: When source pillar, ingestion node, or deterministic node is actively transmitting
      const isSourceActive = (executionState.isExecuting && (
        (sourceNode?.data?.pillarType && sourceNode.data.pillarType === executionState.pillarType) ||
        (sourceNode?.type === 'ingestionNode' && (executionState.pillarType === 'tools' || executionState.step === 'Starting')) ||
        (sourceNode?.type === 'agentCore' && targetNode?.type === 'outputNode' && (executionState.step === 'Complete' || executionState.step === 'Starting'))
      )) || Boolean(isDetActive);

      // Only animate edges when there is active execution or streaming in progress
      const isEdgeStreaming = (executionState.isExecuting && (
        isSourceActive ||
        (sourceNode?.type === 'agentCore' && targetNode?.type === 'outputNode') ||
        (sourceNode?.data?.pillarType === 'model' && targetNode?.type === 'agentCore')
      )) || Boolean(isDetActive);

      const activeColor = isDetEdge 
        ? '#EAAA00' 
        : sourceNode?.data?.pillarType 
          ? (PILLARS[sourceNode.data.pillarType]?.color || '#0091DA') 
          : (sourceNode?.type === 'outputNode' || targetNode?.type === 'outputNode') 
            ? '#10B981' 
            : '#0091DA';

      return {
        ...edge,
        animated: isDeactivated ? false : Boolean(isEdgeStreaming),
        style: {
          ...edge.style,
          stroke: isSourceActive ? activeColor : (isDeactivated ? deactivatedStroke : originalStroke),
          strokeWidth: isSourceActive ? 3.4 : (isDeactivated ? 1.4 : (edge.style?.strokeWidth || 1.8)),
          strokeDasharray: isSourceActive ? '5 5' : (isDeactivated ? '3 3' : (edge.style?.strokeDasharray || '4 4')),
          filter: isSourceActive ? `drop-shadow(0 0 8px ${activeColor})` : undefined,
          opacity: isDeactivated ? 0.35 : 1,
          transition: 'stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease'
        },
        data: {
          ...edge.data,
          isDeactivated,
          isDarkMode,
          onDelete: handleDeleteEdge
        }
      };
    });
  }, [edges, nodes, isDarkMode, handleDeleteEdge, executionState]);

  return (
    <div className={`relative w-full h-full overflow-hidden select-none transition-colors duration-200 ${
      isDarkMode ? 'bg-[#141518] text-white' : 'bg-[#F9FAFB] text-[#111827]'
    }`}>
      {/* Toast Feedback */}
      {toastNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-[#22242B] border border-[#3E424F] text-white text-xs font-mono font-bold rounded-lg shadow-2xl animate-in slide-in-from-top-2 duration-150 flex items-center gap-3">
          <span>{toastNotification}</span>
          <button onClick={() => setToastNotification(null)} className="text-slate-400 hover:text-white ml-2 text-xs">✕</button>
        </div>
      )}

      {/* Top-Left Prominent Canvas Action Overlay: Minimalist Execute Workflow & Stop */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-2">
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('keaos:execute-workflow'));
          }}
          disabled={executionState.isExecuting}
          className={`btn-tactile px-4 py-2 font-bold text-xs flex items-center gap-2 rounded-none shadow-md transition-all border cursor-pointer ${
            executionState.isExecuting
              ? 'bg-[#00338D] text-white border-[#0091DA] animate-pulse'
              : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#00338D] shadow-[0_2px_10px_rgba(0,51,141,0.3)]'
          }`}
          title="Execute workflow (Ctrl + Enter)"
        >
          {executionState.isExecuting ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span className="font-mono tracking-tight text-white">Executing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white text-white" />
              <span className="tracking-tight text-white text-xs font-bold">
                Execute Workflow
              </span>
            </>
          )}
        </button>

        {/* If executing or any output node is generating, display STOP / CLOSE STREAM button */}
        {(executionState.isExecuting || (nodes || []).some(n => n.type === 'outputNode' && n.data?.status === 'generating')) && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('keaos:cancel-execution'))}
            className="btn-tactile px-3 py-2 rounded-none font-bold text-xs flex items-center gap-1.5 shadow-md bg-red-600 hover:bg-red-700 text-white border border-red-500 cursor-pointer animate-in fade-in duration-150 active:scale-95"
            title="Stop active execution"
          >
            <Square className="w-3 h-3 fill-white" />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Top-Right Minimal Vertical Action Stack (Matching Reference) */}
      <div className="absolute top-4 right-6 z-20 flex flex-col items-center gap-2">
        <div className={`flex flex-col items-center border rounded-xl shadow-xl overflow-hidden backdrop-blur-md divide-y ${
          isDarkMode ? 'bg-[#22242B]/90 border-[#383B46] divide-[#383B46]' : 'bg-white/90 border-[#E5E7EB] divide-[#E5E7EB]'
        }`}>
          {/* 1. Add Node (+) */}
          <button
            onClick={() => {
              const next = !isAddMenuOpen;
              setIsAddMenuOpen(next);
              if (next) {
                if (setIsInspectorOpen) setIsInspectorOpen(false);
                if (onSelectNode) onSelectNode(null);
              }
            }}
            className={`w-10 h-10 flex items-center justify-center transition-colors ${
              isAddMenuOpen 
                ? 'bg-[#0091DA] text-white' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Add Node / Component (+)"
          >
            <Plus className="w-5 h-5 font-bold" />
          </button>

          {/* 2. Inspector / HUD Toggle */}
          {setIsInspectorOpen && (
            <button
              onClick={() => {
                if (isInspectorOpen && !isAddMenuOpen) {
                  setIsInspectorOpen(false);
                } else {
                  setIsAddMenuOpen(false);
                  setIsInspectorOpen(true);
                  if (!selectedNode && nodes.length > 0) {
                    const coreNode = nodes.find(n => n.type === 'agentCore') || nodes[0];
                    if (onSelectNode) onSelectNode(coreNode);
                  }
                }
              }}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${
                isInspectorOpen && !isAddMenuOpen
                  ? 'bg-white/15 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle Node Inspector"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          )}

          {/* 3. Summary Map Toggle */}
          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`w-10 h-10 flex items-center justify-center transition-colors ${
              showMiniMap 
                ? 'text-[#0091DA]' 
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle MiniMap"
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom-Left Minimal Square Controls (Matching Reference Image) */}
      <div className="absolute bottom-14 left-6 z-20 flex items-center gap-2">
        <div className={`flex items-center border rounded-xl shadow-xl overflow-hidden backdrop-blur-md divide-x ${
          isDarkMode ? 'bg-[#22242B]/90 border-[#383B46] divide-[#383B46]' : 'bg-white/90 border-[#E5E7EB] divide-[#E5E7EB]'
        }`}>
          {/* 1. Fit View [ ⛶ ] - Centers entire workflow symmetrically in viewport */}
          <button
            onClick={() => rfInstance?.fitView({ padding: 0.2, duration: 400 })}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fit View & Center Workflow"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* 2. Zoom In (+) */}
          <button
            onClick={() => rfInstance?.zoomIn()}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* 3. Zoom Out (-) */}
          <button
            onClick={() => rfInstance?.zoomOut()}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* 4. Undo (Ctrl+Z) */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${
              canUndo
                ? 'text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 opacity-30 cursor-not-allowed'
            }`}
            title={canUndo ? "Undo (Ctrl+Z)" : "Undo (Ctrl+Z) - No actions to undo"}
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* 5. Redo (Ctrl+Y / Ctrl+Shift+Z) */}
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${
              canRedo
                ? 'text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 opacity-30 cursor-not-allowed'
            }`}
            title={canRedo ? "Redo (Ctrl+Y / Ctrl+Shift+Z)" : "Redo - No actions to redo"}
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* 6. Socket Enforcer Toggle */}
          <button
            onClick={handleToggleEnforcer}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${
              isEnforcerActive ? 'text-[#0091DA]' : 'text-amber-400'
            }`}
            title={isEnforcerActive ? 'Socket Enforcer Active (Strict)' : 'Socket Enforcer Bypassed'}
          >
            {isEnforcerActive ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          </button>

          {/* 5. Light/Dark Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
        </div>
      </div>

      {/* Minimal Execution Deck / Logs Drawer */}
      <CanvasExecutionDrawer
        activeUseCase={activeUseCase}
        nodes={nodes}
        edges={edges}
        isDarkMode={isDarkMode}
        activeChatAgentId={activeChatAgentId}
        setActiveChatAgentId={setActiveChatAgentId}
        onExecutionStateChange={setExecutionState}
        isExpanded={isDrawerExpanded}
        setIsExpanded={setIsDrawerExpanded}
      />

      {/* Summary MiniMap */}
      {showMiniMap && (
        <div 
          className="absolute z-20 animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            bottom: `${90 - miniMapPos.y}px`, 
            right: `${24 - miniMapPos.x}px` 
          }}
        >
          <div className={`border rounded-xl shadow-2xl backdrop-blur-md overflow-hidden w-60 ${
            isDarkMode ? 'bg-[#1E2026]/95 border-[#383B46] text-white' : 'bg-white/95 border-[#E5E7EB] text-[#111827]'
          }`}>
            <div 
              onMouseDown={handleMouseDownMiniMap}
              className={`px-3 py-1.5 flex items-center justify-between border-b cursor-grab active:cursor-grabbing select-none text-[10px] font-mono font-bold ${
                isDarkMode ? 'bg-[#17191E] border-[#383B46]' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical className="w-3 h-3 text-slate-400" />
                <MapIcon className="w-3 h-3 text-[#0091DA]" />
                <span>OVERVIEW</span>
              </div>
              <button onClick={() => setShowMiniMap(false)} className="text-slate-400 hover:text-white p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="h-32 relative">
              <MiniMap
                nodeColor={(n) => n.type === 'agentCore' ? '#0091DA' : '#8B5CF6'}
                maskColor={isDarkMode ? 'rgba(20, 21, 24, 0.8)' : 'rgba(249, 250, 251, 0.8)'}
                className="!m-0 !w-full !h-full !relative !top-0 !left-0 !border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ReactFlow Workspace with Subtle Dot Grid */}
      <ReactFlow
        nodes={nodesWithTheme}
        edges={edgesWithTheme}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onConnect={onConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        connectionMode={ConnectionMode.Loose}
        onInit={(instance) => {
          setRfInstance(instance);
          setTimeout(() => {
            instance.fitView({ padding: 0.2, duration: 300 });
          }, 60);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        onNodeClick={(_, node) => {
          if (isConnectingRef.current) return;
          setIsAddMenuOpen(false);
          if (onSelectNode) onSelectNode(node);
        }}
        onNodeMouseEnter={(_, node) => {
          hoveredNodeIdRef.current = node.id;
        }}
        onNodeMouseLeave={() => {
          hoveredNodeIdRef.current = null;
        }}
        onPaneClick={() => {
          if (isConnectingRef.current) return;
          if (onSelectNode) onSelectNode(null);
          if (setIsInspectorOpen) setIsInspectorOpen(false);
          setIsAddMenuOpen(false);
          window.dispatchEvent(new CustomEvent('keaos:close-popups'));
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
        onNodesDelete={(deletedNodes) => {
          takeSnapshot();
          deletedNodes.forEach(n => handleDeleteNode(n.id));
          if (onSelectNode) onSelectNode(null);
        }}
        minZoom={0.25}
        maxZoom={1.75}
        defaultEdgeOptions={{ animated: true, type: 'deletable', data: { onDelete: handleDeleteEdge } }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={22} 
          size={1.2} 
          color={isDarkMode ? '#2D3039' : '#CBD5E1'} 
          style={{ backgroundColor: isDarkMode ? '#16171B' : '#F9FAFB' }}
        />
      </ReactFlow>

      {/* Blank Canvas Genesis Watermark & Starter Guide */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 select-none p-4">
          <div className={`p-8 max-w-md text-center border rounded-none pointer-events-auto shadow-2xl backdrop-blur-md transition-all ${
            isDarkMode 
              ? 'bg-[#18191E]/95 border-[#2E313C] text-white' 
              : 'bg-white/95 border-[#CBD5E1] text-[#0B0F19]'
          }`}>
            <div className="w-12 h-12 mx-auto mb-3.5 flex items-center justify-center rounded-full bg-[#00338D]/20 border border-[#0091DA]/40 text-[#0091DA]">
              <Layers className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#0091DA]">
              BLANK CANVAS GENESIS
            </span>
            <h3 className="text-base font-bold mt-1 tracking-tight">
              {activeUseCase?.name || 'Untitled Workflow'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Pristine canvas ready for orchestration. Drag a <strong>Foundation Model</strong>, <strong>Agent Core</strong>, or <strong>Skills</strong> from the left palette to begin.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  takeSnapshot();
                  const agentNode = {
                    id: `agent-core-${Date.now().toString().slice(-4)}`,
                    type: 'agentCore',
                    position: { x: 500, y: 250 },
                    data: {
                      name: activeUseCase?.name || 'Primary Agent',
                      framework: activeUseCase?.framework || { id: 'google-adk', name: 'Google ADK' },
                      prompt: 'You are an autonomous enterprise AI agent configured to execute domain workflows.',
                      temperature: 0.2,
                      topP: 0.95,
                      attachedCounts: {
                        model: 0,
                        skills: 0,
                        mcp: 0,
                        tools: 0,
                        gateway: 0,
                        memory: 0,
                        policies: 0,
                        audit: 0,
                        observability: 0,
                        'cost-benefit': 0
                      }
                    }
                  };
                  setNodes([agentNode]);
                }}
                className="btn-tactile px-3.5 py-1.5 text-xs font-bold rounded-none bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#0091DA]/50 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insert Core Agent</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Canvas(props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
