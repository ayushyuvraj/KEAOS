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
    onExecute,
    onToggleDeactivate,
    onOpenInspector,
    onDuplicate,
    onCopy
  } = data;
  const pillarDef = PILLARS[pillarType] || PILLARS.tools;
  
  let IconComponent = PILLAR_ICONS[pillarType] || Wrench;
  if (toolId === 'tool-audio-transcribe') IconComponent = Mic;
  if (toolId === 'tool-doc-parser') IconComponent = FileText;
  if (toolId === 'tool-text-box-ingest') IconComponent = Type;

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
    backgroundColor: pillarDef.color || '#0091DA',
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
      backgroundColor: pillarDef.color || '#0091DA',
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
      backgroundColor: pillarDef.color || '#0091DA',
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
      backgroundColor: pillarDef.color || '#0091DA',
      borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
      borderWidth: '2px',
      left: '-4px'
    };
  }

  return (
    <div className="relative group flex flex-col items-center select-none">
      {/* Floating Micro-Toolbar on Hover (Centered Above Node) */}
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
        isDarkMode={isDarkMode}
        className="-top-8 left-1/2 -translate-x-1/2"
      />

      {/* Circular Token Disc */}
      <div
        className={`w-15 h-15 rounded-full flex items-center justify-center border-2 transition-all duration-150 relative shadow-lg ${
          isDeactivated
            ? 'opacity-40 grayscale border-dashed border-slate-500 bg-slate-800/50'
            : isDarkMode
              ? 'bg-[#22242B] border-[#3D414D] text-white hover:border-[#0091DA]'
              : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] hover:border-[#00338D]'
        } ${
          selected
            ? 'ring-4 ring-[#0091DA]/30 border-[#0091DA] scale-105'
            : ''
        }`}
      >
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
          className="w-7 h-7 transition-transform group-hover:scale-110" 
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
