// Exact backup of PillarNode.jsx before minimal n8n-style refactoring
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
  Type, 
  Plug 
} from 'lucide-react';
import { PILLARS } from '../../constants/pillars';

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
  const { pillarType, name, description, config, onDelete, toolId, isDarkMode } = data;
  const pillarDef = PILLARS[pillarType] || PILLARS.tools;
  
  let IconComponent = PILLAR_ICONS[pillarType] || Wrench;
  if (toolId === 'tool-audio-transcribe') IconComponent = Mic;
  if (toolId === 'tool-doc-parser') IconComponent = FileText;
  if (toolId === 'tool-text-box-ingest') IconComponent = Type;

  const isLeftConnecting = ['model', 'tools', 'gateway', 'memory'].includes(pillarType);
  const isBottomConnecting = ['observability', 'cost_benefit'].includes(pillarType);

  let handlePosition = Position.Right;
  if (isLeftConnecting) handlePosition = Position.Right;
  else if (isBottomConnecting) handlePosition = Position.Top;
  else handlePosition = Position.Left;

  return (
    <div
      className={`relative w-[280px] border select-none transition-all duration-150 ${
        isDarkMode
          ? 'bg-[#141824] border-[#2B354B] text-white shadow-[0_12px_32px_rgba(0,0,0,0.4)]'
          : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_4px_16px_rgba(0,30,80,0.06)]'
      } ${
        selected
          ? 'border-[#0091DA] ring-2 ring-[#0091DA]'
          : isDarkMode ? 'hover:border-[#0091DA]' : 'hover:border-[#00338D]'
      }`}
      style={{
        borderTop: `4px solid ${pillarDef.color}`
      }}
    >
      {/* Unit Header */}
      <div className={`p-3 border-b flex items-center justify-between transition-colors ${
        isDarkMode ? 'bg-[#181D2A] border-[#2B354B]' : 'bg-[#FFFFFF] border-[#E0E0E0]'
      }`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 shadow-inner"
            style={{ 
              backgroundColor: pillarDef.bgColor, 
              color: pillarDef.color,
              border: `1px solid ${pillarDef.color}40`
            }}
          >
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span
              className="text-[9px] font-mono font-bold tracking-wider uppercase block"
              style={{ color: pillarDef.color }}
            >
              {pillarDef.badge}
            </span>
            <h4 className={`text-xs font-bold truncate leading-tight tracking-tight ${
              isDarkMode ? 'text-white' : 'text-[#0B0F19]'
            }`}>{name}</h4>
          </div>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(id)}
            className={`btn-tactile w-6 h-6 flex items-center justify-center transition-colors ${
              isDarkMode ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-[#F2E9F4] text-slate-400 hover:text-[#6D2077]'
            }`}
            title="Remove block"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Unit Body */}
      <div className={`p-3 space-y-2.5 transition-colors ${isDarkMode ? 'bg-[#141824]' : 'bg-[#FFFFFF]'}`}>
        <p className={`text-[11px] line-clamp-2 leading-relaxed ${
          isDarkMode ? 'text-slate-300' : 'text-[#333333]'
        }`}>
          {description}
        </p>

        {/* Configuration Properties Display */}
        {config && Object.keys(config).length > 0 && (
          <div className={`border p-2 space-y-1 transition-colors ${
            isDarkMode ? 'bg-[#0B0F19] border-[#2B354B]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
          }`}>
            {Object.entries(config).slice(0, 2).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[10px] font-mono">
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>{k}:</span>
                <span className={`font-bold truncate max-w-[150px] ${
                  isDarkMode ? 'text-slate-200' : 'text-[#0B0F19]'
                }`}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Target Socket Callout */}
        <div className={`flex items-center justify-between pt-1 border-t text-[10px] font-mono ${
          isDarkMode ? 'border-[#2B354B]' : 'border-[#F0F2F5]'
        }`}>
          <span className="text-slate-400 flex items-center gap-1">
            <Plug className="w-3 h-3 text-[#0091DA]" /> Port:
          </span>
          <span 
            className="font-bold px-1.5 py-0.5 rounded-none uppercase"
            style={{ backgroundColor: pillarDef.bgColor, color: pillarDef.color }}
          >
            {pillarDef.socketId}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={handlePosition}
        id="out"
        style={{
          width: '12px',
          height: '12px',
          background: pillarDef.color,
          borderColor: '#001E50',
          borderWidth: '2px'
        }}
      />
    </div>
  );
}
