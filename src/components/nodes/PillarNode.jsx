import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Brain, 
  Sparkles, 
  Server, 
  Wrench, 
  GitFork, 
  Database, 
  ShieldCheck, 
  Fingerprint, 
  Activity, 
  Coins, 
  X,
  Mic,
  FileText,
  Type,
  Check,
  Ban,
  ShieldAlert,
  Key,
  Search
} from 'lucide-react';
import { PILLARS } from '../../constants/pillars';
import { groupToolsByCategory } from '../../constants/mcpOfficialCatalogs';
import NodeActionToolbar from '../common/NodeActionToolbar';

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

export default function PillarNode({ id, data, selected }) {
  const { 
    pillarType, 
    name, 
    onDelete, 
    toolId, 
    isDarkMode, 
    isDeactivated,
    isExecuting,
    onExecute,
    onToggleDeactivate,
    onOpenInspector,
    onDuplicate,
    onCopy,
    onRename
  } = data;
  const pillarDef = PILLARS[pillarType] || PILLARS.tools;
  
  const [showGatewayFlyout, setShowGatewayFlyout] = useState(false);
  const [showMcpFlyout, setShowMcpFlyout] = useState(false);

  const [gatewaySearchQuery, setGatewaySearchQuery] = useState('');
  const [mcpSearchQuery, setMcpSearchQuery] = useState('');

  // Refs for wheel and scroll isolation (ensures touchpad scroll never zooms canvas)
  const gatewayFlyoutRef = useRef(null);
  const gatewayScrollRef = useRef(null);
  const mcpFlyoutRef = useRef(null);
  const mcpScrollRef = useRef(null);

  const routedTools = data.routedTools || [];
  const disabledTools = data.disabledTools || [];
  const onToggleTool = data.onToggleTool;
  const basis = data.basis;
  const tools = data.tools || [];
  const allowedCount = routedTools.filter(t => !disabledTools.includes(t.name)).length;

  // Filter and categorize Gateway routed tools
  const filteredRoutedTools = routedTools.filter(t => {
    if (!gatewaySearchQuery.trim()) return true;
    const q = gatewaySearchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || 
           (t.displayName && t.displayName.toLowerCase().includes(q)) || 
           (t.category && t.category.toLowerCase().includes(q)) ||
           (t.description && t.description.toLowerCase().includes(q));
  });
  const categorizedRouted = groupToolsByCategory(filteredRoutedTools);

  // Filter and categorize MCP tools
  const filteredMcpTools = tools.filter(t => {
    if (!mcpSearchQuery.trim()) return true;
    const q = mcpSearchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || 
           (t.displayName && t.displayName.toLowerCase().includes(q)) || 
           (t.category && t.category.toLowerCase().includes(q)) ||
           (t.description && t.description.toLowerCase().includes(q));
  });
  const categorizedMcp = groupToolsByCategory(filteredMcpTools);

  // Global listener to dismiss popups on canvas click
  useEffect(() => {
    const handleClose = () => {
      setShowGatewayFlyout(false);
      setShowMcpFlyout(false);
    };
    window.addEventListener('keaos:close-popups', handleClose);
    return () => window.removeEventListener('keaos:close-popups', handleClose);
  }, []);

  // Wheel listeners to strictly isolate touchpad & mouse wheel from zooming the ReactFlow canvas
  useEffect(() => {
    if (!showGatewayFlyout) return;
    const flyout = gatewayFlyoutRef.current;
    const scrollList = gatewayScrollRef.current;

    const stopWheelZoom = (e) => {
      e.stopPropagation();
    };

    if (flyout) flyout.addEventListener('wheel', stopWheelZoom, { passive: true });
    if (scrollList) scrollList.addEventListener('wheel', stopWheelZoom, { passive: true });

    return () => {
      if (flyout) flyout.removeEventListener('wheel', stopWheelZoom);
      if (scrollList) scrollList.removeEventListener('wheel', stopWheelZoom);
    };
  }, [showGatewayFlyout]);

  useEffect(() => {
    if (!showMcpFlyout) return;
    const flyout = mcpFlyoutRef.current;
    const scrollList = mcpScrollRef.current;

    const stopWheelZoom = (e) => {
      e.stopPropagation();
    };

    if (flyout) flyout.addEventListener('wheel', stopWheelZoom, { passive: true });
    if (scrollList) scrollList.addEventListener('wheel', stopWheelZoom, { passive: true });

    return () => {
      if (flyout) flyout.removeEventListener('wheel', stopWheelZoom);
      if (scrollList) scrollList.removeEventListener('wheel', stopWheelZoom);
    };
  }, [showMcpFlyout]);

  let IconComponent = PILLAR_ICONS[pillarType] || Wrench;
  if (toolId === 'tool-audio-transcribe') IconComponent = Mic;
  if (toolId === 'tool-doc-parser') IconComponent = FileText;
  if (toolId === 'tool-text-box-ingest') IconComponent = Type;

  const handleBgColor = isDeactivated
    ? (isDarkMode ? '#475569' : '#94A3B8')
    : (pillarDef.color || '#0091DA');

  // Smart anatomical handle orientation:
  // - Model (above robot) -> handle at Bottom pointing down
  // - Tools / Gateway (left of robot) -> handle at Right pointing right
  // - MCP (right of robot) -> handle at Left pointing left
  // - Memory, Skills, Policies (below robot) -> handle at Top pointing up
  let handlePosition = Position.Top;
  let handleStyle = {
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
    width: '9px',
    height: '9px',
    borderRadius: '1.5px',
    backgroundColor: handleBgColor,
    borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
    borderWidth: '2px',
    top: '-4px'
  };

  if (pillarType === 'model') {
    handlePosition = Position.Bottom;
    handleStyle = {
      left: '50%',
      transform: 'translateX(-50%) rotate(45deg)',
      width: '9px',
      height: '9px',
      borderRadius: '1.5px',
      backgroundColor: handleBgColor,
      borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
      borderWidth: '2px',
      bottom: '-4px'
    };
  } else if (pillarType === 'tools') {
    handlePosition = Position.Right;
    handleStyle = {
      top: '50%',
      transform: 'translateY(-50%) rotate(45deg)',
      width: '9px',
      height: '9px',
      borderRadius: '1.5px',
      backgroundColor: handleBgColor,
      borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
      borderWidth: '2px',
      right: '-4px'
    };
  } else if (pillarType === 'mcp') {
    handlePosition = Position.Left;
    handleStyle = {
      top: '50%',
      transform: 'translateY(-50%) rotate(45deg)',
      width: '9px',
      height: '9px',
      borderRadius: '1.5px',
      backgroundColor: handleBgColor,
      borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
      borderWidth: '2px',
      left: '-4px'
    };
  } else if (pillarType === 'gateway') {
    // Gateway uses dual handles rendered conditionally below
    handlePosition = Position.Left;
  }

  let toolbarPlacement = '-top-8 left-1/2 -translate-x-1/2';
  let dropdownPlacement = 'top';

  if (pillarType === 'memory' || pillarType === 'skills' || pillarType === 'policies') {
    toolbarPlacement = 'top-1 -right-14';
    dropdownPlacement = 'bottom';
  } else {
    toolbarPlacement = '-top-8 left-1/2 -translate-x-1/2';
    dropdownPlacement = 'top';
  }

  return (
    <div className="relative group flex flex-col items-center select-none">
      {/* Floating Micro-Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={name}
        isDeactivated={isDeactivated}
        onExecute={onExecute}
        onToggleDeactivate={onToggleDeactivate}
        onDelete={onDelete}
        onOpenInspector={onOpenInspector}
        onDuplicate={onDuplicate}
        onCopy={onCopy}
        onRename={onRename}
        isDarkMode={isDarkMode}
        className={toolbarPlacement}
        dropdownPlacement={dropdownPlacement}
      />

      {/* Active Component Floating Status Beacon */}
      {isExecuting && (
        <div 
          className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full text-[8.5px] font-mono tracking-wider font-bold uppercase shadow-lg z-30 flex items-center gap-1.5 text-white animate-bounce pointer-events-none"
          style={{ backgroundColor: pillarDef.color || '#0091DA' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>{pillarDef.label || 'ACTIVE'}</span>
        </div>
      )}

      {/* Circular Token Disc */}
      <div
        onClick={() => {
          if (pillarType === 'gateway') {
            setShowGatewayFlyout(!showGatewayFlyout);
          } else if (pillarType === 'mcp') {
            setShowMcpFlyout(!showMcpFlyout);
          }
        }}
        className={`w-15 h-15 rounded-full flex items-center justify-center border-2 transition-all duration-200 relative shadow-lg cursor-pointer ${
          isExecuting
            ? 'scale-110 ring-4'
            : isDeactivated
              ? 'opacity-40 grayscale border-dashed border-slate-500 bg-slate-800/50'
              : isDarkMode
                ? 'bg-[#22242B] border-[#3D414D] text-white hover:border-[#0091DA]'
                : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] hover:border-[#00338D]'
        } ${
          selected && !isExecuting
            ? 'ring-4 ring-[#0091DA]/30 border-[#0091DA] scale-105'
            : ''
        }`}
        style={isExecuting ? {
          borderColor: pillarDef.color || '#0091DA',
          boxShadow: `0 0 28px ${pillarDef.color || '#0091DA'}B0, inset 0 0 12px ${pillarDef.color || '#0091DA'}40`
        } : {}}
      >
        {/* Animated Concentric Radar Wave when Active */}
        {isExecuting && (
          <>
            <span 
              className="absolute -inset-3 rounded-full animate-ping opacity-50 pointer-events-none"
              style={{ backgroundColor: pillarDef.color || '#0091DA' }}
            />
            <span 
              className="absolute -inset-1.5 rounded-full animate-pulse opacity-40 pointer-events-none"
              style={{ backgroundColor: pillarDef.color || '#0091DA' }}
            />
          </>
        )}

        {/* Handle Positioning: Dual handles for Gateway; single handle for other pillars */}
        {pillarType === 'gateway' ? (
          <>
            {/* Output to Agent Core (Left handle) */}
            <Handle
              type="source"
              position={Position.Left}
              id="out"
              style={{
                top: '50%',
                transform: 'translateY(-50%) rotate(45deg)',
                width: '9px',
                height: '9px',
                borderRadius: '1.5px',
                backgroundColor: handleBgColor,
                borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
                borderWidth: '2px',
                left: '-4px',
                opacity: isDeactivated ? 0.3 : 1
              }}
              title="Gateway Egress: Connect to Agent Core"
            />
            {/* Circular Ingress Socket for MCP Server (Right handle) */}
            <Handle
              type="target"
              position={Position.Right}
              id="mcp-in"
              style={{
                top: '50%',
                transform: 'translateY(-50%)',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#00A3A6',
                borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
                borderWidth: '2px',
                right: '-5px',
                boxShadow: '0 0 8px rgba(0,163,166,0.7)',
                opacity: isDeactivated ? 0.3 : 1
              }}
              title="MCP Server Ingress Socket: Connect verified live MCP Server (Universal Link, Slack, Jira, GitHub)"
            />
          </>
        ) : (
          /* Diamond Output Handle positioned anatomically */
          <Handle
            type="source"
            position={handlePosition}
            id="out"
            style={{
              ...handleStyle,
              opacity: isDeactivated ? 0.3 : 1
            }}
            title={`Connect ${pillarDef.label}`}
          />
        )}
        {/* Pillar Category/Brand Icon */}
        <IconComponent 
          className={`w-7 h-7 transition-transform group-hover:scale-110 ${isExecuting ? 'scale-115' : ''}`} 
          style={{ color: isDeactivated ? '#94A3B8' : (pillarDef.color || '#0091DA') }}
        />
      </div>

      {/* Clean Succinct Label Below Node */}
      <div className="mt-2 text-center max-w-[140px]">
        <span className={`text-[11px] font-semibold tracking-tight block truncate ${
          isDeactivated
            ? 'line-through text-slate-500'
            : isDarkMode ? 'text-white' : 'text-[#111827]'
        }`}>
          {name}
        </span>
        <span className={`text-[9px] font-mono block -mt-0.5 uppercase tracking-wider ${
          isDeactivated
            ? 'text-amber-500'
            : isDarkMode ? 'text-slate-400' : 'text-slate-600'
        }`}>
          {isDeactivated ? 'Deactivated' : pillarDef.label}
        </span>

        {/* Gateway Capabilities Toggle Pill */}
        {pillarType === 'gateway' && routedTools.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowGatewayFlyout(!showGatewayFlyout);
            }}
            className={`mt-1.5 px-2 py-0.5 text-[8.5px] font-mono font-bold rounded-none flex items-center justify-center gap-1 mx-auto cursor-pointer transition-all border ${
              disabledTools.length > 0
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/40 hover:bg-amber-500/25 shadow-xs'
                : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/25 shadow-xs'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${disabledTools.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>{allowedCount}/{routedTools.length} Features</span>
          </button>
        )}

        {/* MCP Capabilities Discovery Pill */}
        {pillarType === 'mcp' && tools.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMcpFlyout(!showMcpFlyout);
            }}
            className="mt-1.5 px-2 py-0.5 text-[8.5px] font-mono font-bold bg-[#00A3A6]/15 text-[#00A3A6] border border-[#00A3A6]/40 hover:bg-[#00A3A6]/25 rounded-none flex items-center justify-center gap-1 mx-auto cursor-pointer transition-all shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A3A6]" />
            <span>{tools.length} Features</span>
          </button>
        )}
      </div>

      {/* GATEWAY ON-CANVAS CAPABILITY & POLICY FLYOUT */}
      {pillarType === 'gateway' && showGatewayFlyout && routedTools.length > 0 && (
        <div 
          ref={gatewayFlyoutRef}
          className={`nowheel nodrag nopan absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-96 p-3.5 shadow-2xl border rounded-none text-left animate-in fade-in duration-150 ${
            isDarkMode 
              ? 'bg-[#0B0F19] border-[#EAAA00] text-white shadow-[0_16px_48px_rgba(0,0,0,0.9)]' 
              : 'bg-white border-[#EAAA00] text-[#0B0F19] shadow-[0_16px_48px_rgba(0,30,80,0.2)]'
          }`}
          style={{ borderTop: '4px solid #EAAA00' }}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-2 border-b ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#EAAA00] text-slate-900 flex items-center justify-center font-bold text-xs">
                <GitFork className="w-3 h-3" />
              </div>
              <div>
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider block ${
                  isDarkMode ? 'text-[#EAAA00]' : 'text-amber-700'
                }`}>
                  Gateway Control Plane
                </span>
                <span className={`text-[9px] font-sans block -mt-0.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Zero-Trust Policy & Feature Interceptor
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGatewayFlyout(false)}
              className={`p-1 transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Bar matching n8n / enterprise UX */}
          <div className="relative my-2">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-400'
            }`} />
            <input
              type="text"
              placeholder={`Search ${routedTools[0]?.serverName || 'MCP'} Actions...`}
              value={gatewaySearchQuery}
              onChange={(e) => setGatewaySearchQuery(e.target.value)}
              className={`w-full pl-8 pr-7 py-1.5 text-xs font-sans rounded-none transition-colors focus:outline-none ${
                isDarkMode 
                  ? 'bg-black/60 border border-slate-700/70 text-white placeholder:text-slate-500 focus:border-[#EAAA00]' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#EAAA00] focus:bg-white'
              }`}
            />
            {gatewaySearchQuery && (
              <button
                type="button"
                onClick={() => setGatewaySearchQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status summary */}
          <div className="flex items-center justify-between mb-2 text-[10px] font-mono">
            <span className={`font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              Actions ({routedTools.length})
            </span>
            <span className={`font-bold px-1.5 py-0.5 border ${
              disabledTools.length > 0
                ? isDarkMode 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                  : 'bg-amber-50 text-amber-800 border-amber-300'
                : isDarkMode 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}>
              {allowedCount} Allowed • {disabledTools.length} Blocked
            </span>
          </div>

          {/* Categorized Tools List (Touchpad / Scroll isolated from canvas) */}
          <div 
            ref={gatewayScrollRef}
            className="nowheel nodrag overscroll-contain space-y-2.5 max-h-64 overflow-y-auto pr-1 my-1"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {Object.keys(categorizedRouted).length === 0 ? (
              <div className={`text-center py-4 text-xs font-mono ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                No actions match "{gatewaySearchQuery}"
              </div>
            ) : (
              Object.entries(categorizedRouted).map(([category, catTools]) => (
                <div key={category} className="space-y-1">
                  <div className={`flex items-center justify-between px-1.5 py-1 border-y text-[9.5px] font-mono font-bold uppercase tracking-wider ${
                    isDarkMode 
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' 
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <span>{category}</span>
                    <span className={`text-[8.5px] px-1.5 py-0.2 font-normal ${
                      isDarkMode ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {catTools.length}
                    </span>
                  </div>
                  {catTools.map((tool) => {
                    const isBlocked = disabledTools.includes(tool.name);
                    const isDestructive = tool.type === 'destructive';
                    const isRead = tool.type === 'read';

                    return (
                      <div 
                        key={tool.name}
                        className={`p-2 border transition-all ${
                          isBlocked
                            ? isDarkMode 
                              ? 'bg-rose-950/20 border-rose-800/40' 
                              : 'bg-rose-50/80 border-rose-200'
                            : isDarkMode 
                              ? 'bg-[#141822] border-slate-700/60 hover:border-slate-600' 
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[11px] font-sans font-semibold truncate ${
                                isBlocked 
                                  ? (isDarkMode ? 'line-through text-rose-400' : 'line-through text-rose-600') 
                                  : (isDarkMode ? 'text-white' : 'text-slate-900')
                              }`}>
                                {tool.displayName || tool.name}
                              </span>
                              <span className={`text-[7px] font-mono font-bold px-1 py-0.2 rounded-none border ${
                                isDestructive 
                                  ? isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-rose-100 text-rose-700 border-rose-300'
                                  : isRead 
                                    ? isDarkMode ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' : 'bg-teal-100 text-teal-700 border-teal-300'
                                    : isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {tool.type?.toUpperCase() || 'TOOL'}
                              </span>
                            </div>
                            <span className={`text-[9px] font-mono block truncate ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                            }`}>
                              {tool.name}
                            </span>
                            {tool.description && (
                              <p className={`text-[9px] line-clamp-1 mt-0.5 ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                {tool.description}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onToggleTool) {
                                onToggleTool(tool.name, isBlocked ? true : false);
                              }
                            }}
                            className={`shrink-0 px-2 py-1 text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer rounded-none border ${
                              isBlocked
                                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-700 shadow-xs'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 shadow-xs'
                            }`}
                            title={isBlocked ? `Click to enable ${tool.name}` : `Click to disable ${tool.name}`}
                          >
                            {isBlocked ? (
                              <>
                                <Ban className="w-2.5 h-2.5" />
                                <span>BLOCKED</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-2.5 h-2.5" />
                                <span>PERMITTED</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className={`pt-2 border-t flex items-center justify-between text-[9px] font-mono ${
            isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
            <span>Server: {routedTools[0]?.serverName || 'MCP'}</span>
            <span className={isDarkMode ? 'text-amber-400 font-semibold' : 'text-amber-700 font-bold'}>
              Zero-Trust Perimeter Drop
            </span>
          </div>
        </div>
      )}

      {/* MCP BASIS & EXPOSED CAPABILITIES FLYOUT */}
      {pillarType === 'mcp' && showMcpFlyout && (
        <div 
          ref={mcpFlyoutRef}
          className={`nowheel nodrag nopan absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-96 p-3.5 shadow-2xl border rounded-none text-left animate-in fade-in duration-150 ${
            isDarkMode 
              ? 'bg-[#0B0F19] border-[#00A3A6] text-white shadow-[0_16px_48px_rgba(0,0,0,0.9)]' 
              : 'bg-white border-[#00A3A6] text-[#0B0F19] shadow-[0_16px_48px_rgba(0,30,80,0.2)]'
          }`}
          style={{ borderTop: '4px solid #00A3A6' }}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${
            isDarkMode ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#00A3A6] text-white flex items-center justify-center font-bold text-xs">
                <Server className="w-3 h-3" />
              </div>
              <div>
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider block truncate max-w-[200px] ${
                  isDarkMode ? 'text-[#00A3A6]' : 'text-teal-700'
                }`}>
                  {name}
                </span>
                <span className={`text-[9px] font-sans block -mt-0.5 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Official MCP Catalog ({tools.length} Actions)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMcpFlyout(false)}
              className={`p-1 transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {basis && (
            <div className={`my-2 p-2 border space-y-1 text-[10px] font-mono ${
              isDarkMode ? 'bg-[#121620] border-slate-700/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`flex justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>Provider:</span>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{basis.provider || 'Live API'}</span>
              </div>
              {basis.authenticatedAs && (
                <div className={`flex justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Identity:</span>
                  <span className={`font-bold ${isDarkMode ? 'text-[#00A3A6]' : 'text-teal-700'}`}>@{basis.username || basis.authenticatedAs}</span>
                </div>
              )}
              {basis.repository && (
                <div className={`flex justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Target:</span>
                  <span className={`font-bold truncate max-w-[170px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{basis.repository}</span>
                </div>
              )}
              {basis.tokenMasked && (
                <div className={`flex justify-between ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Token:</span>
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>{basis.tokenMasked}</span>
                </div>
              )}
            </div>
          )}

          {/* Search Bar for MCP Tools */}
          <div className="relative my-2">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-400'
            }`} />
            <input
              type="text"
              placeholder={`Search ${name || 'MCP'} Actions...`}
              value={mcpSearchQuery}
              onChange={(e) => setMcpSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-7 py-1.5 text-xs font-sans rounded-none transition-colors focus:outline-none ${
                isDarkMode 
                  ? 'bg-black/60 border border-slate-700/70 text-white placeholder:text-slate-500 focus:border-[#00A3A6]' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-[#00A3A6] focus:bg-white'
              }`}
            />
            {mcpSearchQuery && (
              <button
                type="button"
                onClick={() => setMcpSearchQuery('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Categorized Tools List (Touchpad / Scroll isolated from canvas) */}
          <div 
            ref={mcpScrollRef}
            className="nowheel nodrag overscroll-contain space-y-2 max-h-52 overflow-y-auto pr-1"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {Object.keys(categorizedMcp).length === 0 ? (
              <div className={`text-center py-3 text-xs font-mono ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                No tools match "{mcpSearchQuery}"
              </div>
            ) : (
              Object.entries(categorizedMcp).map(([category, catTools]) => (
                <div key={category} className="space-y-1">
                  <div className={`flex items-center justify-between px-1.5 py-0.5 border-y text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isDarkMode 
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' 
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <span>{category}</span>
                    <span className={`text-[8px] px-1.5 py-0.2 font-normal ${
                      isDarkMode ? 'bg-slate-700/60 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {catTools.length}
                    </span>
                  </div>
                  {catTools.map((t) => (
                    <div 
                      key={t.name} 
                      className={`p-1.5 border flex items-center justify-between gap-2 ${
                        isDarkMode ? 'bg-[#141822] border-slate-700/50' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10.5px] font-sans font-medium truncate ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {t.displayName || t.name}
                          </span>
                          <span className={`text-[7.5px] font-mono font-bold px-1 py-0.2 rounded-none border ${
                            t.type === 'destructive' 
                              ? isDarkMode ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-300' 
                              : t.type === 'read'
                                ? isDarkMode ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100 text-teal-700 border-teal-300' 
                                : isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {t.type?.toUpperCase()}
                          </span>
                        </div>
                        <span className={`text-[8.5px] font-mono truncate block ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium'
                        }`}>
                          {t.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[9px] font-mono ${
            isDarkMode ? 'border-slate-800 text-[#EAAA00]' : 'border-slate-200 text-amber-700'
          }`}>
            <div className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              <span>Controlled at Gateway</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMcpFlyout(false);
                if (onOpenInspector) onOpenInspector(id);
              }}
              className={`hover:underline ${isDarkMode ? 'text-[#00A3A6]' : 'text-teal-700 font-semibold'}`}
            >
              Open Inspector →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
