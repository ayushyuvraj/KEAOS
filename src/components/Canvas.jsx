import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  addEdge,
  ReactFlowProvider
} from '@xyflow/react';
import AgentCoreNode from './nodes/AgentCoreNode';
import PillarNode from './nodes/PillarNode';
import { SOCKET_RULES, PILLARS } from '../constants/pillars';
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
  Play
} from 'lucide-react';

import CanvasExecutionDrawer from './CanvasExecutionDrawer';
import DeletableEdge from './edges/DeletableEdge';

const nodeTypes = {
  agentCore: AgentCoreNode,
  pillar: PillarNode
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
  setIsDrawerExpanded
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
    const clonedNode = {
      ...JSON.parse(JSON.stringify(nodeToClone)),
      id: newId,
      position: {
        x: nodeToClone.position.x + 50,
        y: nodeToClone.position.y + 50
      },
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

  // Handle execute single step
  const handleExecuteNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setExecutionState({ isExecuting: true, step: `Executing ${node.data?.name || 'step'}...` });
    const toastMsg = `⚡ Executing step: "${node.data?.name || 'Node'}"`;
    setToastNotification(toastMsg);
    setTimeout(() => {
      setExecutionState({ isExecuting: false, step: '' });
      setToastNotification((curr) => (curr === toastMsg ? null : curr));
    }, 1500);
  }, [nodes]);

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
          if (setIsDrawerExpanded) setIsDrawerExpanded(true);
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

      if (targetNode.type === 'agentCore') {
        const requiredPillar = SOCKET_RULES[targetHandle];
        const sourcePillar = sourceNode.data.pillarType;

        if (requiredPillar === sourcePillar) {
          return true;
        } else {
          setInvalidConnectionAlert({
            sourceName: sourceNode.data.name,
            sourceType: sourcePillar,
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
      const pillarDef = sourceNode ? PILLARS[sourceNode.data.pillarType] : null;
      const strokeColor = pillarDef?.color || '#0091DA';

      takeSnapshot();

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'deletable',
            animated: true,
            style: { stroke: strokeColor, strokeWidth: 1.8, strokeDasharray: '4 4' },
            data: { onDelete: handleDeleteEdge }
          },
          eds
        )
      );
      setInvalidConnectionAlert(null);
    },
    [nodes, setEdges, setInvalidConnectionAlert, takeSnapshot, handleDeleteEdge]
  );

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

  const nodesWithTheme = React.useMemo(() => {
    const nodeLookup = {};
    (nodes || []).forEach(n => {
      nodeLookup[n.id] = n;
    });

    return (nodes || []).map(n => {
      const isThisNodeActive = executionState.isExecuting && (
        n.id === executionState.nodeId || 
        (n.type === 'agentCore' && !executionState.nodeId) ||
        (n.data?.pillarType && n.data.pillarType === executionState.pillarType)
      );

      // Dynamically calculate attachedCounts and connectedModelName specifically for THIS agent node
      let agentCounts = n.data?.attachedCounts;
      let connectedModelName = null;

      if (n.type === 'agentCore') {
        agentCounts = {
          model: 0,
          skills: 0,
          mcp: 0,
          tools: 0,
          gateway: 0,
          memory: 0,
          policies: 0
        };

        (edges || []).forEach((edge) => {
          if (edge.target === n.id && edge.targetHandle) {
            const pillar = SOCKET_RULES[edge.targetHandle];
            const sourceNode = nodeLookup[edge.source];
            const isSourceDeactivated = !!sourceNode?.data?.isDeactivated;
            if (pillar && agentCounts[pillar] !== undefined && !isSourceDeactivated) {
              agentCounts[pillar] += 1;
              if (pillar === 'model' && sourceNode) {
                connectedModelName = sourceNode.data?.name || sourceNode.data?.config?.modelId || 'Foundation Model';
              }
            }
          }
        });
      }

      return {
        ...n,
        data: {
          ...n.data,
          isDarkMode,
          isExecuting: isThisNodeActive || (n.type === 'agentCore' && executionState.isExecuting),
          executionStep: executionState.step,
          attachedCounts: agentCounts,
          connectedModelName: connectedModelName,
          onOpenAgentChat: handleOpenAgentChat,
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
          onToggleDeactivate: handleToggleDeactivateNode,
          onCopy: handleCopyNode,
          onOpenInspector: handleOpenInspector,
          onExecute: handleExecuteNode,
          onRename: handleRenameNode
        }
      };
    });
  }, [
    nodes, 
    edges, 
    isDarkMode, 
    executionState, 
    handleOpenAgentChat,
    handleDeleteNode, 
    handleDuplicateNode, 
    handleToggleDeactivateNode, 
    handleCopyNode, 
    handleOpenInspector, 
    handleExecuteNode,
    handleRenameNode
  ]);

  // Edges styled dynamically: when source or target component is deactivated, disable the wire
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

      return {
        ...edge,
        animated: isDeactivated ? false : (edge.animated ?? true),
        style: {
          ...edge.style,
          stroke: isDeactivated ? deactivatedStroke : originalStroke,
          strokeWidth: isDeactivated ? 1.4 : (edge.style?.strokeWidth || 1.8),
          strokeDasharray: isDeactivated ? '3 3' : (edge.style?.strokeDasharray || '4 4'),
          opacity: isDeactivated ? 0.35 : 1,
          transition: 'stroke 0.2s ease, opacity 0.2s ease, stroke-width 0.2s ease'
        },
        data: {
          ...edge.data,
          isDeactivated,
          isDarkMode,
          onDelete: handleDeleteEdge
        }
      };
    });
  }, [edges, nodes, isDarkMode, handleDeleteEdge]);

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

      {/* Top-Left Prominent Canvas Action Overlay: Execute Workflow */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-3">
        <button
          onClick={() => {
            if (setIsDrawerExpanded) setIsDrawerExpanded(true);
            window.dispatchEvent(new CustomEvent('keaos:execute-workflow'));
          }}
          disabled={executionState.isExecuting}
          className={`btn-tactile px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2.5 shadow-2xl transition-all border cursor-pointer ${
            executionState.isExecuting
              ? 'bg-[#00338D] text-white border-[#0091DA] animate-pulse'
              : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#0091DA]/50 hover:border-[#0091DA] shadow-[0_4px_20px_rgba(0,51,141,0.35)]'
          }`}
          title="Execute complete multi-pillar agent workflow (Ctrl + Enter)"
        >
          {executionState.isExecuting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span className="font-mono tracking-tight text-white">Executing Graph...</span>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  Execute Workflow
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                    READY
                  </span>
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  {activeUseCase?.framework?.name || 'Google ADK'} • {nodes.filter(n => !n.data?.isDeactivated).length} Active Nodes
                </span>
              </div>
            </>
          )}
        </button>
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
        onInit={(instance) => {
          setRfInstance(instance);
          setTimeout(() => {
            instance.fitView({ padding: 0.2, duration: 300 });
          }, 60);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        onNodeClick={(_, node) => {
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
