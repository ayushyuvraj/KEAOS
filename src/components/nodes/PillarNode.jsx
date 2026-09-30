import React from 'react';
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
  Type
} from 'lucide-react';
import { PILLARS } from '../../constants/pillars';
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
  } else if (pillarType === 'tools' || pillarType === 'gateway') {
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
  }

  // Strategic zero-overlap placement based on handle orientation and text position:
  // - Pillars with TOP handles (memory, skills, policies): Wire comes from above.
  //   Place toolbar on right side (top-1 -right-14) to completely avoid wires and text.
  // - Pillars with BOTTOM handle (model): Top is 100% free. Place toolbar at -top-8,
  //   with dropdown opening UPWARDS (top) so it never covers the node disc or label below.
  // - Pillars with SIDE handles (tools, mcp, gateway): Top is 100% free.
  //   Place toolbar at -top-8, with dropdown opening UPWARDS (top).
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
      {/* Floating Micro-Toolbar on Hover: Strategically placed to guarantee zero text/wire overlap */}
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
        className={`w-15 h-15 rounded-full flex items-center justify-center border-2 transition-all duration-200 relative shadow-lg ${
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

        {/* Diamond Output Handle positioned anatomically */}
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
        {/* Pillar Category/Brand Icon */}
        <IconComponent 
          className={`w-7 h-7 transition-transform group-hover:scale-110 ${isExecuting ? 'scale-115' : ''}`} 
          style={{ color: isDeactivated ? '#94A3B8' : (pillarDef.color || '#0091DA') }}
        />
      </div>

      {/* Clean Succinct Label Below Node */}
      <div className="mt-2 text-center max-w-[130px]">
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
      </div>
    </div>
  );
}
