// Exact backup of Canvas.jsx before minimal n8n-style refactoring
import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  MarkerType,
  ReactFlowProvider
} from '@xyflow/react';
import AgentCoreNode from './nodes/AgentCoreNode';
import PillarNode from './nodes/PillarNode';
import { SOCKET_RULES, PILLARS } from '../constants/pillars';
import { 
  Info, 
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
  Maximize,
  Search,
  X,
  Layers,
  Mic,
  FileText,
  Type,
  Sun,
  Moon,
  ArrowUp,
  PanelRightOpen,
  PanelRightClose,
  Map,
  GripVertical
} from 'lucide-react';

import CanvasExecutionDrawer from './CanvasExecutionDrawer';

const nodeTypes = {
  agentCore: AgentCoreNode,
  pillar: PillarNode
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
  'skills',
  'mcp',
  'tools',
  'gateway',
  'memory',
  'policies'
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
  const [selectedPillarKey, setSelectedPillarKey] = useState(null);
  const [canvasSearch, setCanvasSearch] = useState('');
  const [isDraggingMiniMap, setIsDraggingMiniMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });
  const [rfInstance, setRfInstance] = useState(null);
  const [executionState, setExecutionState] = useState({ isExecuting: false, step: '' });

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
      const pillarDef = PILLARS[sourceNode?.data?.pillarType] || PILLARS.tools;

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: pillarDef.color, strokeWidth: 2.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: pillarDef.color,
              width: 14,
              height: 14
            }
          },
          eds
        )
      );
      setInvalidConnectionAlert(null);
    },
    [nodes, setEdges, setInvalidConnectionAlert]
  );

  const handlePillarClick = (pillarKey) => {
    if (selectedPillarKey === pillarKey) {
      setSelectedPillarKey(null);
    } else {
      setSelectedPillarKey(pillarKey);
      setCanvasSearch('');
    }
  };

  const handleAddFromCanvas = (pillarKey, item) => {
    if (onAddNode) {
      onAddNode(pillarKey, item);
    }
    setSelectedPillarKey(null);
  };

  const activePillarDef = selectedPillarKey ? PILLARS[selectedPillarKey] : null;

  const nodesWithTheme = React.useMemo(() => {
    return nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        isDarkMode,
        isExecuting: n.type === 'agentCore' ? executionState.isExecuting : false,
        executionStep: n.type === 'agentCore' ? executionState.step : undefined
      }
    }));
  }, [nodes, isDarkMode, executionState]);

  const [toastNotification, setToastNotification] = useState(null);

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
      ? '🛡️ Socket Enforcer: STRICT VALIDATION ACTIVE (Incompatible connection drops blocked)'
      : '⚠️ Socket Enforcer: BYPASSED (Freeform connections allowed without type checking)';
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  return (
    <div className={`relative w-full h-full overflow-hidden select-none transition-colors duration-200 ${
      isDarkMode ? 'bg-[#0D111A] text-white' : 'bg-[#F5F6F8] text-[#0B0F19]'
    }`}>
      {/* Dynamic Toast Notification Banner for Enforcer / Canvas Actions */}
      {toastNotification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 bg-[#001438] border border-[#0091DA] text-white text-xs font-mono font-bold shadow-2xl animate-in slide-in-from-top-2 duration-200 flex items-center gap-3">
          <span>{toastNotification}</span>
          <button
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. SOCKET ENFORCER SYMBOL BUTTON (Top-Left) */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleToggleEnforcer}
          className={`btn-tactile px-3 py-2 flex items-center gap-2 border shadow-lg transition-all cursor-pointer font-mono text-xs font-bold ${
            isEnforcerActive
              ? isDarkMode
                ? 'bg-[#00338D] border-[#0091DA] text-white hover:bg-[#00478F]'
                : 'bg-[#001E50] border-[#00338D] text-white hover:bg-[#002D72]'
              : isDarkMode
                ? 'bg-[#181D28] border-[#EAAA00]/60 text-[#EAAA00] hover:bg-[#222A3A]'
                : 'bg-[#FFFFFF] border-[#EAAA00] text-[#B88600] hover:bg-[#FFFDF5]'
          }`}
          title={isEnforcerActive ? 'Click to Bypass Socket Validation Rules' : 'Click to Enable Strict Socket Enforcer'}
        >
          {isEnforcerActive ? (
            <ShieldCheck className="w-4 h-4 text-[#0091DA]" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-[#EAAA00]" />
          )}
          <span>SOCKET ENFORCER: {isEnforcerActive ? 'STRICT' : 'BYPASSED'}</span>
        </button>
      </div>

      {/* 1. LEFT 10-PILLARS FLOATING PANEL (Matching Attached SS 1) */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex items-start gap-3">
        <div className={`flex flex-col items-center gap-3.5 p-2 border shadow-2xl backdrop-blur-md transition-colors w-13 ${
          isDarkMode 
            ? 'bg-[#181D28]/95 border-[#2B354B] shadow-[0_12px_40px_rgba(0,0,0,0.6)]' 
            : 'bg-[#FFFFFF]/95 border-[#CBD5E1] shadow-[0_12px_40px_rgba(0,30,80,0.12)]'
        }`}>
          {PILLAR_ORDER.map((pillarKey) => {
            const pillar = PILLARS[pillarKey];
            const Icon = PILLAR_ICONS[pillarKey] || Layers;
            const isSelected = selectedPillarKey === pillarKey;

            return (
              <div key={pillarKey} className="relative group">
                <button
                  onClick={() => handlePillarClick(pillarKey)}
                  className={`btn-tactile w-9 h-9 flex items-center justify-center transition-all border ${
                    isSelected
                      ? 'border-[#0091DA] bg-[#0091DA]/20 text-white shadow-md'
                      : isDarkMode
                        ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/15'
                        : 'border-transparent text-slate-600 hover:text-[#00338D] hover:bg-[#F0F4FA] hover:border-[#CBD5E1]'
                  }`}
                >
                  <Icon 
                    className="w-5 h-5 transition-transform group-hover:scale-110" 
                    style={{ color: pillar.color }} 
                  />
                </button>

                <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono font-bold whitespace-nowrap shadow-xl border pointer-events-none z-30 animate-in fade-in slide-in-from-left-1 duration-100 ${
                  isDarkMode 
                    ? 'bg-[#001438] text-white border-[#00338D]' 
                    : 'bg-[#001E50] text-white border-[#00338D]'
                }`}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pillar.color }} />
                  <span>{pillar.label}</span>
                  <span className="text-[10px] text-slate-400">({pillar.items.length})</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedPillarKey && activePillarDef && (
          <div 
            className={`w-[440px] border shadow-2xl animate-in fade-in slide-in-from-left-2 duration-150 z-30 overflow-hidden ${
              isDarkMode 
                ? 'bg-[#141824] border-[#2B354B] text-white shadow-[0_20px_60px_rgba(0,0,0,0.7)]' 
                : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_20px_60px_rgba(0,30,80,0.2)]'
            }`}
            style={{ borderTop: `4px solid ${activePillarDef.color}` }}
          >
            <div className={`p-3.5 border-b flex items-center justify-between ${
              isDarkMode ? 'bg-[#181D2A] border-[#2B354B]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
            }`}>
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 flex items-center justify-center shrink-0 shadow-inner"
                  style={{ 
                    backgroundColor: activePillarDef.bgColor, 
                    color: activePillarDef.color,
                    border: `1px solid ${activePillarDef.color}40`
                  }}
                >
                  {React.createElement(PILLAR_ICONS[selectedPillarKey] || Layers, { className: 'w-4 h-4' })}
                </div>
                <div>
                  <h4 className="text-xs font-bold tracking-tight">{activePillarDef.label}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Port: {activePillarDef.socketId} • Click to instantiate</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPillarKey(null)}
                className={`btn-tactile p-1 transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-[#0B0F19] hover:bg-[#E0E0E0]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-2.5 border-b ${isDarkMode ? 'bg-[#141824] border-[#2B354B]' : 'bg-[#FFFFFF] border-[#E0E0E0]'}`}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder={`Search ${activePillarDef.label}...`}
                  value={canvasSearch}
                  onChange={(e) => setCanvasSearch(e.target.value)}
                  className={`w-full pl-8 pr-2.5 py-1.5 text-xs focus:outline-none rounded-none font-mono ${
                    isDarkMode 
                      ? 'bg-[#1E2433] border border-[#2B354B] text-white placeholder-slate-500 focus:border-[#0091DA]' 
                      : 'bg-[#FFFFFF] border border-[#CBD5E1] text-[#0B0F19] placeholder-slate-400 focus:border-[#00338D]'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            <div className={`max-h-[340px] overflow-y-auto p-2 space-y-2 ${
              isDarkMode ? 'bg-[#10131C]' : 'bg-[#F8F9FB]'
            }`}>
              {activePillarDef.items
                .filter(item => 
                  !canvasSearch || 
                  item.name.toLowerCase().includes(canvasSearch.toLowerCase()) || 
                  item.description.toLowerCase().includes(canvasSearch.toLowerCase())
                )
                .map((item) => {
                  let ItemIcon = PILLAR_ICONS[selectedPillarKey] || Layers;
                  if (item.id === 'tool-audio-transcribe') ItemIcon = Mic;
                  if (item.id === 'tool-doc-parser') ItemIcon = FileText;
                  if (item.id === 'tool-text-box-ingest') ItemIcon = Type;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleAddFromCanvas(selectedPillarKey, item)}
                      className={`group p-2.5 border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isDarkMode
                          ? 'border-[#2B354B] bg-[#181D2A] hover:border-[#0091DA] hover:bg-[#202738]'
                          : 'border-[#CBD5E1] bg-[#FFFFFF] hover:border-[#00338D] hover:bg-[#F5F8FC]'
                      }`}
                    >
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <ItemIcon className="w-3.5 h-3.5 shrink-0" style={{ color: activePillarDef.color }} />
                          <span className={`text-xs font-bold truncate ${
                            isDarkMode ? 'text-white group-hover:text-[#0091DA]' : 'text-[#0B0F19] group-hover:text-[#00338D]'
                          }`}>
                            {item.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <button
                        className="btn-tactile px-2 py-1 bg-[#00338D] text-white text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 mt-0.5 border border-[#0091DA]/40 group-hover:bg-[#005EB8]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* 2. RIGHT BOTTOM HORIZONTAL CONTROL PANEL */}
      <div className="absolute bottom-16 right-6 z-20 flex flex-row items-center">
        <div className={`flex flex-row items-center border shadow-2xl backdrop-blur-md overflow-hidden ${
          isDarkMode 
            ? 'bg-[#181D28]/95 border-[#2B354B] text-[#0091DA] divide-x divide-[#2B354B]' 
            : 'bg-[#FFFFFF]/95 border-[#CBD5E1] text-[#00338D] divide-x divide-[#CBD5E1]'
        }`}>
          <button
            onClick={() => rfInstance?.zoomIn()}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#F0F4FA] dark:hover:bg-white/10 transition-colors"
            title="Zoom In (+)"
          >
            <Plus className="w-4 h-4 font-bold" />
          </button>

          <button
            onClick={() => rfInstance?.zoomOut()}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#F0F4FA] dark:hover:bg-white/10 transition-colors"
            title="Zoom Out (-)"
          >
            <Minus className="w-4 h-4 font-bold" />
          </button>

          <button
            onClick={() => rfInstance?.setViewport({ x: 70, y: 15, zoom: 0.85 })}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#F0F4FA] dark:hover:bg-white/10 transition-colors"
            title="Fit View"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#F0F4FA] dark:hover:bg-white/10 transition-colors text-amber-500"
            title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#00338D]" strokeWidth={2.5} />}
          </button>

          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`w-10 h-10 flex items-center justify-center transition-colors ${
              showMiniMap 
                ? 'bg-[#00338D]/20 text-[#0091DA]' 
                : 'hover:bg-[#F0F4FA] dark:hover:bg-white/10 text-slate-400'
            }`}
            title={showMiniMap ? 'Hide Summary Map' : 'Show Summary Map'}
          >
            <Map className="w-4 h-4" />
          </button>

          {setIsInspectorOpen && (
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${
                isInspectorOpen 
                  ? 'bg-[#00338D] text-white' 
                  : 'hover:bg-[#F0F4FA] dark:hover:bg-white/10 text-[#00338D] dark:text-slate-300'
              }`}
              title={isInspectorOpen ? 'Collapse Studio HUD / Inspector' : 'Open Studio HUD / Inspector'}
            >
              {isInspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          )}
        </div>
      </div>

      {invalidConnectionAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-6 py-3.5 bg-[#001E50] border-l-4 border-[#6D2077] shadow-[0_16px_40px_rgba(0,30,80,0.5)] text-white animate-in slide-in-from-top-3 duration-150">
          <AlertTriangle className="w-5 h-5 text-[#EAAA00] shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white tracking-wide">Incompatible Socket Rejection: </span>
            <span className="text-slate-200">
              Cannot connect <strong className="text-white bg-white/10 px-1.5 py-0.5">{invalidConnectionAlert.sourceName}</strong> to socket <code className="px-1.5 py-0.5 bg-[#00338D] text-white font-mono text-[11px] font-bold">{invalidConnectionAlert.targetHandle}</code>.
            </span>
            <div className="text-[11px] text-[#0091DA] mt-0.5 font-semibold">
              Requires an architectural block of type: <strong className="uppercase underline">{invalidConnectionAlert.requiredType}</strong>.
            </div>
          </div>
          <button
            onClick={() => setInvalidConnectionAlert(null)}
            className="btn-tactile text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white transition-colors ml-4 font-bold border border-white/20"
          >
            Dismiss
          </button>
        </div>
      )}

      <CanvasExecutionDrawer
        activeUseCase={activeUseCase}
        nodes={nodes}
        edges={edges}
        isDarkMode={isDarkMode}
        onExecutionStateChange={setExecutionState}
        isExpanded={isDrawerExpanded}
        setIsExpanded={setIsDrawerExpanded}
      />

      {showMiniMap && (
        <div 
          className="absolute z-20 animate-in fade-in zoom-in-95 duration-150"
          style={{ 
            bottom: `${130 - miniMapPos.y}px`, 
            right: `${24 - miniMapPos.x}px` 
          }}
        >
          <div className={`border shadow-2xl backdrop-blur-md overflow-hidden w-64 ${
            isDarkMode 
              ? 'bg-[#181D28]/95 border-[#2B354B] text-white' 
              : 'bg-[#FFFFFF]/95 border-[#CBD5E1] text-[#0B0F19]'
          }`}>
            <div 
              onMouseDown={handleMouseDownMiniMap}
              className={`px-3 py-1.5 flex items-center justify-between border-b cursor-grab active:cursor-grabbing select-none ${
                isDarkMode ? 'bg-[#10141E] border-[#2B354B]' : 'bg-[#F0F4FA] border-[#CBD5E1]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-tight">
                <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                <Map className="w-3.5 h-3.5 text-[#0091DA]" />
                <span>SUMMARY MAP</span>
              </div>
              <button
                onClick={() => setShowMiniMap(false)}
                className="btn-tactile p-0.5 text-slate-400 hover:text-white transition-colors"
                title="Close Summary Map"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-36 relative bg-opacity-40">
              <MiniMap
                nodeColor={(n) => {
                  if (n.type === 'agentCore') return '#00338D';
                  return PILLARS[n.data?.pillarType]?.color || '#005EB8';
                }}
                maskColor={isDarkMode ? 'rgba(16, 19, 26, 0.75)' : 'rgba(245, 246, 248, 0.75)'}
                className="!m-0 !w-full !h-full !relative !top-0 !left-0 !border-0"
              />
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodesWithTheme}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => {
          setRfInstance(instance);
          instance.setViewport({ x: 70, y: 15, zoom: 0.85 });
        }}
        onNodeClick={(_, node) => onSelectNode(node)}
        onPaneClick={() => {
          onSelectNode(null);
          setSelectedPillarKey(null);
        }}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        minZoom={0.25}
        maxZoom={1.75}
        defaultEdgeOptions={{ animated: true }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={1.5} 
          color={isDarkMode ? '#2B354B' : '#94A3B8'} 
          style={{ backgroundColor: isDarkMode ? '#0D111A' : '#F5F6F8' }}
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
