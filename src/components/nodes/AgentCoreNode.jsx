import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Brain, 
  Wrench, 
  Server, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Plus,
  MessageSquare 
} from 'lucide-react';
import NodeActionToolbar from '../common/NodeActionToolbar';

export default function AgentCoreNode({ id, data, selected }) {
  const { 
    name, 
    framework, 
    attachedCounts, 
    connectedModelName,
    isDarkMode, 
    isExecuting,
    isDeactivated,
    onOpenAgentChat,
    onExecute,
    onToggleDeactivate,
    onDelete,
    onOpenInspector,
    onDuplicate,
    onCopy,
    onRename
  } = data;

  const hasModel = (attachedCounts?.model || 0) > 0;
  const hasTools = (attachedCounts?.tools || 0) > 0;
  const hasMcp = (attachedCounts?.mcp || 0) > 0;
  const hasMemory = (attachedCounts?.memory || 0) > 0;
  const hasPolicies = (attachedCounts?.policies || 0) > 0;
  const hasSkills = (attachedCounts?.skills || 0) > 0;

  return (
    <div className="relative group select-none flex flex-col items-center">
      {/* ============================================================ */}
      {/* 1. ANTENNA / BRAIN (Chat Model Socket - Position.Top)         */}
      {/* ============================================================ */}
      <div className={`flex flex-col items-center z-10 -mb-1 transition-opacity ${isDeactivated ? 'opacity-40' : ''}`}>
        {/* Antenna Orb / Transmitter Dish */}
        <div
          className={`relative group w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md ${
            hasModel
              ? isDarkMode
                ? 'bg-[#0091DA]/20 border-[#0091DA] text-[#38BDF8] brain-glow-breath'
                : 'bg-[#0091DA]/15 border-[#0091DA] text-[#005EB8] brain-glow-breath'
              : isDarkMode
                ? 'bg-[#222530] border-[#444856] text-slate-400'
                : 'bg-white border-[#CBD5E1] text-slate-500'
          }`}
          title={hasModel ? `Model Connected: ${connectedModelName || 'Active Brain'}` : "Model Socket: Connect Foundation Model (Gemini, Claude, GPT, Ollama)"}
        >
          {/* Target Handle for Model at Top */}
          <Handle
            type="target"
            position={Position.Top}
            id="model-in"
            style={{
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '9px',
              height: '9px',
              borderRadius: '2px',
              backgroundColor: hasModel ? '#0091DA' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1E2028' : '#FFFFFF',
              borderWidth: '2px',
              top: '-5px'
            }}
            title="Foundation Model"
          />

          <Brain className={`w-3.5 h-3.5 transition-transform ${hasModel ? 'scale-110' : ''}`} />

          {/* Model Beacon Pulse when connected */}
          {hasModel && !isDeactivated && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0091DA] animate-ping" />
          )}

          {/* Socket Label Pill */}
          <div className={`absolute -top-6 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[8px] font-mono tracking-wider font-bold border uppercase ${
            hasModel
              ? isDarkMode
                ? 'bg-[#0091DA]/15 text-[#38BDF8] border-[#0091DA]/40'
                : 'bg-[#0091DA]/15 text-[#005EB8] border-[#0091DA]/50'
              : isDarkMode
                ? 'bg-[#222530] text-slate-400 border-[#444856]'
                : 'bg-white text-slate-600 border-[#CBD5E1]'
          }`}>
            Model
          </div>
        </div>

        {/* Antenna Stem */}
        <div className={`w-1 h-3 ${
          hasModel ? 'bg-[#0091DA]' : isDarkMode ? 'bg-[#444856]' : 'bg-[#94A3B8]'
        } transition-colors`} />
      </div>

      {/* ============================================================ */}
      {/* 2. ROBOT HEAD CHASSIS (Main Visual Container - Compact Size)  */}
      {/* ============================================================ */}
      <div
        className={`relative w-[210px] rounded-[20px] border-2 transition-all duration-200 shadow-xl ${
          isDeactivated
            ? 'opacity-45 grayscale border-dashed border-slate-500 bg-slate-800/40'
            : isDarkMode
              ? 'bg-[#1D2028] border-[#383C4A] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
              : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_12px_32px_rgba(0,30,80,0.08)]'
        } ${
          !isDeactivated && isExecuting
            ? 'border-[#0091DA] ring-4 ring-[#0091DA]/30 shadow-[0_0_36px_rgba(0,145,218,0.5)]'
            : selected
              ? 'border-[#0091DA] ring-2 ring-[#0091DA]'
              : isDarkMode ? 'hover:border-[#525769]' : 'hover:border-[#94A3B8]'
        }`}
        style={{ padding: '8px 10px' }}
      >
        {/* Floating Micro-Toolbar on Hover: Strategically placed at top-right shoulder */}
        <NodeActionToolbar
          nodeId={id}
          nodeName={name}
          isDeactivated={isDeactivated}
          onOpenChat={onOpenAgentChat}
          onExecute={onExecute}
          onToggleDeactivate={onToggleDeactivate}
          onDelete={onDelete}
          onOpenInspector={onOpenInspector}
          onDuplicate={onDuplicate}
          onCopy={onCopy}
          onRename={onRename}
          isDarkMode={isDarkMode}
          className="-top-7 right-2"
          dropdownPlacement="bottom"
        />

        {/* Subtle Corner Hardware Rivets */}
        <div className={`absolute top-2 left-2.5 w-1 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-slate-400/40'}`} />
        <div className={`absolute top-2 right-2.5 w-1 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-slate-400/40'}`} />
        <div className={`absolute bottom-2 left-2.5 w-1 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-slate-400/40'}`} />
        <div className={`absolute bottom-2 right-2.5 w-1 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-slate-400/40'}`} />

        {/* ------------------------------------------------------------ */}
        {/* LEFT ARM / EAR BOLT (Tools Socket - Position.Left)           */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute -left-[12px] top-[66px] -translate-y-1/2 w-3.5 h-8 rounded-l-md border-y border-l flex flex-col items-center justify-center transition-colors shadow-md ${
            hasTools
              ? isDarkMode
                ? 'bg-[#005EB8]/20 border-[#005EB8] text-[#38BDF8]'
                : 'bg-[#005EB8]/15 border-[#005EB8] text-[#005EB8]'
              : isDarkMode
                ? 'bg-[#252833] border-[#383C4A] text-slate-400'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-slate-600'
          }`}
          title="Hands Socket: Connect Ingestion & Execution Tools"
        >
          <Handle
            type="target"
            position={Position.Left}
            id="tools-in"
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: hasTools ? '#005EB8' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
              borderWidth: '2px',
              left: '-4px'
            }}
            title="Hands: Tools Ingestion"
          />
          <Wrench className="w-2.5 h-2.5" />
          <div 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('keaos:spawn-ingest-node', {
                detail: { agentId: id, agentPosition: { x: 595, y: 220 } }
              }));
            }}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#0091DA] hover:bg-[#005EB8] text-white flex items-center justify-center shadow-xs cursor-pointer transition-transform hover:scale-115 active:scale-95 z-20"
            title="Attach Canvas Ingestion Node to this agent"
          >
            <Plus className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT ARM / EAR BOLT (MCP Socket - Position.Right)           */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute -right-[12px] top-[66px] -translate-y-1/2 w-3.5 h-8 rounded-r-md border-y border-r flex flex-col items-center justify-center transition-colors shadow-md ${
            hasMcp
              ? isDarkMode
                ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#22D3EE]'
                : 'bg-[#06B6D4]/15 border-[#06B6D4] text-[#0891B2]'
              : isDarkMode
                ? 'bg-[#252833] border-[#383C4A] text-slate-400'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-slate-600'
          }`}
          title="Reach Socket: Connect MCP Servers"
        >
          <Handle
            type="target"
            position={Position.Right}
            id="mcp-in"
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: hasMcp ? '#06B6D4' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
              borderWidth: '2px',
              right: '-4px'
            }}
            title="Reach: MCP Protocol"
          />
          <Server className="w-2.5 h-2.5" />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* OUTPUT STREAM PORT (Workflow Out - Position.Right with [+])  */}
        {/* ------------------------------------------------------------ */}
        <div className="absolute -right-2.5 top-[96px] flex items-center">
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className={`!w-2.5 !h-2.5 !rounded-full !bg-[#0091DA] !border-2 ${isDarkMode ? '!border-[#1D2028]' : '!border-white'}`}
            title="Agent output stream"
          />
          <div 
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('keaos:spawn-output-node', { detail: { sourceAgentId: id } }));
            }}
            className={`absolute left-2.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shadow-sm active:scale-95 ${
              isDarkMode
                ? 'border-[#444856] bg-[#222530] text-slate-400 hover:text-white hover:border-[#10B981]'
                : 'border-[#CBD5E1] bg-white text-slate-600 hover:text-black hover:border-[#10B981]'
            }`}
            title="Attach Canvas Output Component to this agent"
          >
            <Plus className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* ROBOT VISOR / DIGITAL FACE SCREEN                            */}
        {/* ------------------------------------------------------------ */}
        <div className="relative w-full h-[44px] rounded-xl bg-[#0B0E14] border border-[#2B303C] flex items-center justify-center px-3 overflow-hidden shadow-inner">
          {/* Scanning Beam Overlay during execution */}
          {isExecuting && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0091DA]/30 to-transparent animate-pulse pointer-events-none" />
          )}

          {/* Two Expressive Robot Eyes */}
          <div className="flex items-center gap-5 z-10">
            {/* Left Eye */}
            <div
              className={`w-2 h-4 rounded-full transition-all duration-300 ${
                isDeactivated
                  ? 'bg-slate-700 shadow-none'
                  : isExecuting
                    ? 'bg-[#38BDF8] shadow-[0_0_16px_#38BDF8] scale-110 animate-pulse'
                    : 'bg-[#0091DA] shadow-[0_0_10px_#0091DA]'
              }`}
            />
            {/* Right Eye */}
            <div
              className={`w-2 h-4 rounded-full transition-all duration-300 ${
                isDeactivated
                  ? 'bg-slate-700 shadow-none'
                  : isExecuting
                    ? 'bg-[#38BDF8] shadow-[0_0_16px_#38BDF8] scale-110 animate-pulse'
                    : 'bg-[#0091DA] shadow-[0_0_10px_#0091DA]'
              }`}
            />
          </div>

          {/* Digital Scanline lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.08)_2px,rgba(255,255,255,0.08)_4px)]" />

          {/* Status indicator */}
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <span 
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                isDeactivated 
                  ? 'bg-slate-500' 
                  : isExecuting 
                    ? 'bg-[#0091DA] animate-ping' 
                    : hasModel 
                      ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' 
                      : 'bg-amber-400'
              }`} 
              title={isDeactivated ? 'Deactivated' : hasModel ? 'Brain Active (Model Connected)' : 'Idle (Model Disconnected)'}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* AGENT IDENTITY / AUDIO SPEAKER GRILLE                        */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-1.5 flex flex-col items-center text-center">
          {/* Mini Speaker Grille Slots */}
          <div className="flex items-center justify-center gap-1 mb-1 opacity-50">
            <span className={`w-2.5 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-400' : 'bg-slate-500'}`} />
            <span className={`w-4 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-400' : 'bg-slate-500'}`} />
            <span className={`w-2.5 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-400' : 'bg-slate-500'}`} />
          </div>

          <h3 className={`text-[11px] font-bold tracking-tight truncate max-w-[170px] transition-colors ${
            isDeactivated
              ? 'line-through text-slate-500'
              : isDarkMode ? 'text-white' : 'text-[#0B0F19]'
          }`}>
            {name || 'AI Agent'}
          </h3>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className={`text-[8px] font-mono font-medium uppercase tracking-wider transition-colors ${
              isDeactivated
                ? 'text-amber-500 font-bold'
                : isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {isDeactivated ? 'Deactivated' : (framework?.name || 'Workflow Orchestrator')}
            </span>

            {/* Compact Chat Symbol */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenAgentChat) onOpenAgentChat(id);
              }}
              className={`p-1 rounded-full transition-all cursor-pointer ${
                hasModel
                  ? isDarkMode
                    ? 'text-[#38BDF8] hover:bg-[#0091DA]/20 hover:text-white active:scale-95'
                    : 'text-[#005EB8] hover:bg-blue-100 active:scale-95'
                  : isDarkMode
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={hasModel ? `Chat with ${name} (${connectedModelName || 'Model Active'})` : `Chat with ${name} (No brain connected)`}
            >
              <MessageSquare className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. LEGS & FOOTING PEDESTALS (Guardrails, Memory, Skills)      */}
      {/* ============================================================ */}
      <div className={`relative w-[190px] flex items-center justify-between -mt-1 z-10 px-1 transition-opacity ${isDeactivated ? 'opacity-40' : ''}`}>
        {/* ------------------------------------------------------------ */}
        {/* LEFT FOOT (Policy & Guardrails - Position.Bottom)            */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col items-center">
          {/* Leg Strut */}
          <div className={`w-1 h-2 ${hasPolicies ? 'bg-[#EC4899]' : isDarkMode ? 'bg-[#383C4A]' : 'bg-[#94A3B8]'}`} />
          {/* Foot Stance Pad */}
          <div
            className={`relative group w-13 h-6 rounded-b-md border-x border-b flex items-center justify-center gap-1 px-1 transition-all ${
              hasPolicies
                ? isDarkMode
                  ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#F472B6] shadow-[0_4px_12px_rgba(236,72,153,0.3)]'
                  : 'bg-[#EC4899]/15 border-[#EC4899] text-[#BE185D] font-bold shadow-sm'
                : isDarkMode
                  ? 'bg-[#222530] border-[#383C4A] text-slate-400'
                  : 'bg-white border-[#CBD5E1] text-slate-600'
            }`}
            title="Footing: Policies & Guardrails Socket"
          >
            <Handle
              type="target"
              position={Position.Bottom}
              id="policy-in"
              style={{
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: hasPolicies ? '#EC4899' : isDarkMode ? '#4B5563' : '#9CA3AF',
                borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
                borderWidth: '2px',
                bottom: '-4px'
              }}
              title="Guard: Policies & Compliance"
            />
            <ShieldCheck className="w-2.5 h-2.5" />
            <span className="text-[7px] font-mono font-bold tracking-tighter">GUARD</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CENTER FOOT (Memory Context - Position.Bottom)               */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col items-center">
          {/* Center Leg Strut */}
          <div className={`w-1 h-2 ${hasMemory ? 'bg-[#8B5CF6]' : isDarkMode ? 'bg-[#383C4A]' : 'bg-[#94A3B8]'}`} />
          {/* Foot Stance Pad */}
          <div
            className={`relative group w-14 h-6 rounded-b-md border-x border-b flex items-center justify-center gap-1 px-1 transition-all ${
              hasMemory
                ? isDarkMode
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#A78BFA] shadow-[0_4px_12px_rgba(139,92,246,0.3)]'
                  : 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-[#6D28D9] font-bold shadow-sm'
                : isDarkMode
                  ? 'bg-[#222530] border-[#383C4A] text-slate-400'
                  : 'bg-white border-[#CBD5E1] text-slate-600'
            }`}
            title="Footing: Memory Socket"
          >
            <Handle
              type="target"
              position={Position.Bottom}
              id="memory-in"
              style={{
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: hasMemory ? '#8B5CF6' : isDarkMode ? '#4B5563' : '#9CA3AF',
                borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
                borderWidth: '2px',
                bottom: '-4px'
              }}
              title="Memory: Episodic Context"
            />
            <Database className="w-2.5 h-2.5" />
            <span className="text-[7px] font-mono font-bold tracking-tighter">MEMORY</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT FOOT (Specialized Skills - Position.Bottom)            */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col items-center">
          {/* Leg Strut */}
          <div className={`w-1 h-2 ${hasSkills ? 'bg-[#10B981]' : isDarkMode ? 'bg-[#383C4A]' : 'bg-[#94A3B8]'}`} />
          {/* Foot Stance Pad */}
          <div
            className={`relative group w-13 h-6 rounded-b-md border-x border-b flex items-center justify-center gap-1 px-1 transition-all ${
              hasSkills
                ? isDarkMode
                  ? 'bg-[#10B981]/20 border-[#10B981] text-[#34D399] shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                  : 'bg-[#10B981]/15 border-[#10B981] text-[#047857] font-bold shadow-sm'
                : isDarkMode
                  ? 'bg-[#222530] border-[#383C4A] text-slate-400'
                  : 'bg-white border-[#CBD5E1] text-slate-600'
            }`}
            title="Footing: Skills & Capabilities Socket"
          >
            <Handle
              type="target"
              position={Position.Bottom}
              id="skill-in"
              style={{
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: hasSkills ? '#10B981' : isDarkMode ? '#4B5563' : '#9CA3AF',
                borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
                borderWidth: '2px',
                bottom: '-4px'
              }}
              title="Agility: Specialized Skills"
            />
            <Sparkles className="w-2.5 h-2.5" />
            <span className="text-[7px] font-mono font-bold tracking-tighter">SKILLS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
