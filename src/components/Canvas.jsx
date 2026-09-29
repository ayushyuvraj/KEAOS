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
  GripVertical
} from 'lucide-react';

import CanvasExecutionDrawer from './CanvasExecutionDrawer';
import DeletableEdge from './edges/DeletableEdge';
import NodeCatalogPanel from './NodeCatalogPanel';

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
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isDraggingMiniMap, setIsDraggingMiniMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [rfInstance, setRfInstance] = useState(null);
  const [executionState, setExecutionState] = useState({ isExecuting: false, step: '' });
  const [toastNotification, setToastNotification] = useState(null);
  const hoveredNodeIdRef = useRef(null);

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
    if (onSelectNode) onSelectNode(node);
    if (setIsInspectorOpen) setIsInspectorOpen(true);
  }, [nodes, onSelectNode, setIsInspectorOpen]);

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

      // 1. Undo / Redo
      if (isCtrlOrCmd) {
        if (key === 'z' || key === 'Z') {
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
    // Dynamically calculate attachedCounts from active, non-deactivated edges connected to agent-core
    const activeCounts = {
      model: 0,
      skills: 0,
      mcp: 0,
      tools: 0,
      gateway: 0,
      memory: 0,
      policies: 0
    };

    const nodeLookup = {};
    (nodes || []).forEach(n => {
      nodeLookup[n.id] = n;
    });

    (edges || []).forEach((edge) => {
      if (edge.target === 'agent-core' && edge.targetHandle) {
        const pillar = SOCKET_RULES[edge.targetHandle];
        const sourceNode = nodeLookup[edge.source];
        const isSourceDeactivated = !!sourceNode?.data?.isDeactivated;
        if (pillar && activeCounts[pillar] !== undefined && !isSourceDeactivated) {
          activeCounts[pillar] += 1;
        }
      }
    });

    return (nodes || []).map(n => {
      const isThisNodeActive = executionState.isExecuting && (
        n.id === executionState.nodeId || 
        (n.type === 'agentCore' && !executionState.nodeId) ||
        (n.data?.pillarType && n.data.pillarType === executionState.pillarType)
      );

      return {
        ...n,
        data: {
          ...n.data,
          isDarkMode,
          isExecuting: isThisNodeActive || (n.type === 'agentCore' && executionState.isExecuting),
          executionStep: executionState.step,
          attachedCounts: n.type === 'agentCore' ? activeCounts : n.data.attachedCounts,
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

      {/* Top-Right Minimal Vertical Action Stack (Matching Reference) */}
      <div className="absolute top-4 right-6 z-20 flex flex-col items-center gap-2">
        <div className={`flex flex-col items-center border rounded-xl shadow-xl overflow-hidden backdrop-blur-md divide-y ${
          isDarkMode ? 'bg-[#22242B]/90 border-[#383B46] divide-[#383B46]' : 'bg-white/90 border-[#E5E7EB] divide-[#E5E7EB]'
        }`}>
          {/* 1. Add Node (+) */}
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
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
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${
                isInspectorOpen 
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

      {/* n8n-Style Two-Tier Right Drawer Node Catalog Panel */}
      <NodeCatalogPanel
        isOpen={isAddMenuOpen}
        onClose={() => setIsAddMenuOpen(false)}
        onAddNode={(category, item) => {
          if (onAddNode) {
            onAddNode(category, item);
          }
          const toastMsg = `➕ Added "${item.name}" to Canvas`;
          setToastNotification(toastMsg);
          setTimeout(() => {
            setToastNotification((curr) => (curr === toastMsg ? null : curr));
          }, 2000);
        }}
        isDarkMode={isDarkMode}
      />

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
        onNodeClick={(_, node) => onSelectNode(node)}
        onNodeMouseEnter={(_, node) => {
          hoveredNodeIdRef.current = node.id;
        }}
        onNodeMouseLeave={() => {
          hoveredNodeIdRef.current = null;
        }}
        onPaneClick={() => {
          onSelectNode(null);
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
