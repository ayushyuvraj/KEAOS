import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Plus, 
  MessageSquare, 
  X, 
  GitFork, 
  Bot 
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
    onRename,
    onOpenCatalog
  } = data;

  const hasModel = (attachedCounts?.model || 0) > 0;
  const inheritedModelName = data?.inheritedModelName;
  const isSharedBrain = !hasModel && Boolean(inheritedModelName);
  const hasTools = (attachedCounts?.tools || 0) > 0;
  const hasMcp = (attachedCounts?.mcp || 0) > 0;
  const hasMemory = (attachedCounts?.memory || 0) > 0;
  const hasPolicies = (attachedCounts?.policies || 0) > 0;
  const hasSkills = (attachedCounts?.skills || 0) > 0;
  const hasUpstreamA2A = (attachedCounts?.agent || 0) > 0 || (data?.upstreamAgentCount || 0) > 0;

  const handleSpawnDownstream = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    window.dispatchEvent(new CustomEvent('keaos:spawn-downstream-agent', { detail: { sourceAgentId: id } }));
  };

  return (
    <div className="relative group select-none flex flex-col items-center">
      {/* ============================================================ */}
      {/* 1. TOP PORTS: Minimalist Vertical Lines with (+) Anchors       */}
      {/* ============================================================ */}
      <div className={`relative w-[228px] flex items-end justify-between px-4 z-10 transition-opacity ${isDeactivated ? 'opacity-40' : ''}`}>
        
        {/* TOP-LEFT: TOOLS PORT (Position.Top) - Pacific Blue #0091DA */}
        <div className="flex flex-col items-center group/socket">
          <div
            className={`relative w-4 h-4 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              hasTools
                ? 'bg-[#0091DA] border-[#0091DA] text-white shadow-[0_0_8px_rgba(0,145,218,0.5)]'
                : isDarkMode
                  ? 'bg-[#181B24] border-[#0091DA]/60 text-[#0091DA] hover:bg-[#0091DA]/20 hover:border-[#0091DA]'
                  : 'bg-white border-[#0091DA] text-[#0091DA] hover:bg-[#0091DA]/10'
            }`}
            title="Tools Socket: Connect Ingestion & Execution Tools"
          >
            <Plus className="w-2.5 h-2.5 stroke-[3] pointer-events-none" />
            <Handle
              type="target"
              position={Position.Top}
              id="tools-in"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                top: 0,
                left: 0,
                transform: 'none',
                opacity: 0,
                cursor: 'crosshair',
                border: 'none',
                background: 'transparent'
              }}
              title="Hands: Tools Ingestion"
            />
          </div>
          {/* Stem line down to chassis */}
          <div className={`w-[1.5px] h-1.5 transition-colors ${
            hasTools ? 'bg-[#0091DA]' : isDarkMode ? 'bg-[#0091DA]/50' : 'bg-[#0091DA]/60'
          }`} />
        </div>

        {/* TOP-CENTER: FOUNDATION MODEL PORT (Position.Top) - Royal Brand Blue #00338D */}
        <div className="flex flex-col items-center group/model">
          <div
            className={`relative w-4 h-4 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              hasModel
                ? isExecuting
                  ? 'bg-[#00338D] border-[#0091DA] text-white ring-2 ring-[#0091DA]/50 animate-pulse shadow-[0_0_10px_#0091DA]'
                  : 'bg-[#00338D] border-[#00338D] text-white shadow-[0_0_8px_rgba(0,51,141,0.5)]'
                : isSharedBrain
                  ? 'bg-[#483698]/30 border-[#483698] text-[#A5B4FC]'
                  : isDarkMode
                    ? 'bg-[#181B24] border-[#005EB8] text-[#38BDF8] hover:bg-[#00338D]/30'
                    : 'bg-white border-[#00338D] text-[#00338D] hover:bg-blue-50'
            }`}
            title={
              hasModel
                ? `Model Connected: ${connectedModelName || 'Active Brain'}`
                : isSharedBrain
                  ? `Shared Brain: "${inheritedModelName}"`
                  : "Model Socket: Connect Foundation Model (Gemini, Claude, GPT, Ollama)"
            }
          >
            <Plus className="w-2.5 h-2.5 stroke-[3] pointer-events-none" />
            <Handle
              type="target"
              position={Position.Top}
              id="model-in"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                top: 0,
                left: 0,
                transform: 'none',
                opacity: 0,
                cursor: 'crosshair',
                border: 'none',
                background: 'transparent'
              }}
              title="Foundation Model"
            />

            {/* Disconnect hover button if model attached */}
            {hasModel && !isDeactivated && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('keaos:disconnect-model', { detail: { agentId: id } }));
                }}
                className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-600 hover:bg-red-600 hover:border-red-500 text-white flex items-center justify-center opacity-0 group-hover/model:opacity-100 transition-all cursor-pointer shadow-md z-30"
                title={`Disconnect ${connectedModelName || 'Model'}`}
              >
                <X className="w-2 h-2" />
              </button>
            )}
          </div>
          {/* Stem line down to chassis */}
          <div className={`w-[1.5px] h-1.5 transition-colors ${
            hasModel ? 'bg-[#00338D]' : isSharedBrain ? 'bg-[#483698]' : isDarkMode ? 'bg-[#005EB8]/50' : 'bg-[#00338D]/60'
          }`} />
        </div>

        {/* TOP-RIGHT: MCP SERVERS PORT (Position.Top) - Cyber Teal #00A3A6 */}
        <div className="flex flex-col items-center group/socket">
          <div
            className={`relative w-4 h-4 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              hasMcp
                ? 'bg-[#00A3A6] border-[#00A3A6] text-white shadow-[0_0_8px_rgba(0,163,166,0.5)]'
                : isDarkMode
                  ? 'bg-[#181B24] border-[#00A3A6]/60 text-[#00A3A6] hover:bg-[#00A3A6]/20 hover:border-[#00A3A6]'
                  : 'bg-white border-[#00A3A6] text-[#00A3A6] hover:bg-[#00A3A6]/10'
            }`}
            title="Reach Socket: Connect MCP Servers"
          >
            <Plus className="w-2.5 h-2.5 stroke-[3] pointer-events-none" />
            <Handle
              type="target"
              position={Position.Top}
              id="mcp-in"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                top: 0,
                left: 0,
                transform: 'none',
                opacity: 0,
                cursor: 'crosshair',
                border: 'none',
                background: 'transparent'
              }}
              title="Reach: MCP Protocol"
            />
          </div>
          {/* Stem line down to chassis */}
          <div className={`w-[1.5px] h-1.5 transition-colors ${
            hasMcp ? 'bg-[#00A3A6]' : isDarkMode ? 'bg-[#00A3A6]/50' : 'bg-[#00A3A6]/60'
          }`} />
        </div>

      </div>

      {/* ============================================================ */}
      {/* 2. MAIN CHASSIS (With Symmetrical Arms & Internal Labels)     */}
      {/* ============================================================ */}
      <div
        className={`relative w-[228px] rounded-[18px] border-2 transition-all duration-200 shadow-xl ${
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
        style={{ padding: '2px 10px 3px 10px' }}
      >
        {/* Floating Micro-Toolbar on Hover */}
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
          onAddDownstreamAgent={handleSpawnDownstream}
          isDarkMode={isDarkMode}
          className="-top-7 right-2"
          dropdownPlacement="bottom"
        />

        {/* ============================================================ */}
        {/* TOP INTERNAL LABELS (TOOLS, MODEL, GATEWAY/MCP)              */}
        {/* ============================================================ */}
        <div className="w-full flex items-center justify-between px-1.5 pt-0 pb-0.5 -mt-0.5 text-[8px] font-mono font-bold tracking-wider">
          <span className={`transition-colors ${hasTools ? 'text-[#0091DA] font-extrabold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            TOOLS
          </span>
          <span className={`transition-colors ${hasModel ? 'text-[#00338D] dark:text-[#60A5FA] font-extrabold' : isSharedBrain ? 'text-indigo-400 font-extrabold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {hasModel ? 'MODEL' : isSharedBrain ? 'SHARED' : 'MODEL'}
          </span>
          <span className={`transition-colors ${hasMcp ? 'text-[#00A3A6] font-extrabold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Gateway/MCP
          </span>
        </div>

        {/* ============================================================ */}
        {/* LEFT ARM: INPUT STREAM / A2A INGRESS (Position.Left, Centered) */}
        {/* ============================================================ */}
        <div
          className={`absolute -left-[13px] top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-l-md border-y border-l flex flex-col items-center justify-center transition-colors shadow-md ${
            hasUpstreamA2A
              ? isDarkMode
                ? 'bg-[#6366F1]/25 border-[#6366F1] text-[#A5B4FC]'
                : 'bg-indigo-100 border-indigo-500 text-indigo-700'
              : isDarkMode
                ? 'bg-[#252833] border-[#383C4A] text-slate-400'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-slate-600'
          }`}
          title="Input Arm: Receives upstream agent stream (A2A Ingress)"
        >
          <Handle
            type="target"
            position={Position.Left}
            id="agent-in"
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: hasUpstreamA2A ? '#6366F1' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
              borderWidth: '2px',
              left: '-4px'
            }}
            title="A2A Ingress: Connect upstream agent stream"
          />
          <GitFork className="w-2.5 h-2.5 rotate-90" />
        </div>

        {/* ============================================================ */}
        {/* RIGHT ARM: OUTPUT STREAM / A2A EGRESS (Position.Right, Centered)*/}
        {/* ============================================================ */}
        <div
          className={`absolute -right-[13px] top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-r-md border-y border-r flex flex-col items-center justify-center transition-colors shadow-md group/out ${
            isDarkMode
              ? 'bg-[#0091DA]/20 border-[#0091DA]/60 text-[#38BDF8]'
              : 'bg-[#0091DA]/15 border-[#0091DA]/50 text-[#005EB8]'
          }`}
          title="Output Arm: Emits agent reasoning & A2A dispatch stream"
        >
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              backgroundColor: '#0091DA',
              borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
              borderWidth: '2px',
              right: '-4px'
            }}
            title="Agent output & A2A dispatch stream"
          />
          <Bot className="w-2.5 h-2.5" />

          {/* Quick Action buttons on hover */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/out:opacity-100 transition-opacity z-30 pointer-events-none group-hover/out:pointer-events-auto">
            {/* Quick Add Downstream Connected Agent */}
            <div 
              onClick={handleSpawnDownstream}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                isDarkMode
                  ? 'border-[#4F46E5]/60 bg-[#1E1B4B] text-[#A5B4FC] hover:text-white hover:border-[#6366F1] hover:bg-[#4F46E5]'
                  : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:text-white hover:bg-indigo-600 hover:border-indigo-600'
              }`}
              title="Add connected downstream Agent (A2A)"
            >
              <Bot className="w-2.5 h-2.5" />
            </div>
            {/* Quick Add Output Component */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('keaos:spawn-output-node', { detail: { sourceAgentId: id } }));
              }}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shadow-sm active:scale-95 ${
                isDarkMode
                  ? 'border-[#444856] bg-[#222530] text-slate-400 hover:text-white hover:border-[#10B981]'
                  : 'border-[#CBD5E1] bg-white text-slate-600 hover:text-black hover:border-[#10B981]'
              }`}
              title="Attach Canvas Output Component to this agent"
            >
              <Plus className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ROBOT VISOR / DIGITAL FACE SCREEN                            */}
        {/* ============================================================ */}
        <div className="relative w-full h-[38px] rounded-xl bg-[#0B0E14] border border-[#2B303C] flex items-center justify-center px-3 overflow-hidden shadow-inner">
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

        {/* ============================================================ */}
        {/* AGENT IDENTITY / AUDIO SPEAKER GRILLE                        */}
        {/* ============================================================ */}
        <div className="mt-1 flex flex-col items-center text-center">
          {/* Mini Speaker Grille Slots */}
          <div className="flex items-center justify-center gap-1 mb-0.5 opacity-50">
            <span className={`w-2.5 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-400' : 'bg-slate-500'}`} />
            <span className={`w-4 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-400' : 'bg-slate-500'}`} />
            <span className={`w-2.5 h-0.5 rounded-full ${isDarkMode ? 'bg-slate-400' : 'bg-slate-500'}`} />
          </div>

          <h3 className={`text-[11px] font-bold tracking-tight truncate max-w-[180px] transition-colors ${
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

        {/* ============================================================ */}
        {/* BOTTOM INTERNAL LABELS (GUARD, MEMORY, SKILLS)               */}
        {/* ============================================================ */}
        <div className="w-full flex items-center justify-between px-1.5 pt-0.5 pb-0 text-[8px] font-mono font-bold tracking-wider mt-0.5 -mb-0.5">
          <span className={`transition-colors ${hasPolicies ? 'text-[#470A68] dark:text-[#E879F9] font-extrabold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            GUARDRAILS
          </span>
          <span className={`transition-colors ${hasMemory ? 'text-[#483698] dark:text-[#A78BFA] font-extrabold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            MEMORY
          </span>
          <span className={`transition-colors ${hasSkills ? 'text-[#6D2077] dark:text-[#F472B6] font-extrabold' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            SKILLS
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. BOTTOM PORTS: Minimalist Vertical Lines with (+) Anchors    */}
      {/* ============================================================ */}
      <div className={`relative w-[228px] flex items-start justify-between px-4 z-10 transition-opacity ${isDeactivated ? 'opacity-40' : ''}`}>
        
        {/* BOTTOM-LEFT: GUARD PORT (Position.Bottom) - Leadership Purple #470A68 */}
        <div className="flex flex-col items-center group/socket">
          {/* Stem line down from chassis */}
          <div className={`w-[1.5px] h-1.5 transition-colors ${
            hasPolicies ? 'bg-[#470A68]' : isDarkMode ? 'bg-[#470A68]/50' : 'bg-[#470A68]/60'
          }`} />
          <div
            className={`relative w-4 h-4 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              hasPolicies
                ? 'bg-[#470A68] border-[#470A68] text-white shadow-[0_0_8px_rgba(71,10,104,0.5)]'
                : isDarkMode
                  ? 'bg-[#181B24] border-[#470A68]/60 text-[#C084FC] hover:bg-[#470A68]/20 hover:border-[#470A68]'
                  : 'bg-white border-[#470A68] text-[#470A68] hover:bg-[#470A68]/10'
            }`}
            title="Footing: Policies & Guardrails Socket"
          >
            <Plus className="w-2.5 h-2.5 stroke-[3] pointer-events-none" />
            <Handle
              type="target"
              position={Position.Bottom}
              id="policy-in"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                top: 0,
                left: 0,
                transform: 'none',
                opacity: 0,
                cursor: 'crosshair',
                border: 'none',
                background: 'transparent'
              }}
              title="Guard: Policies & Compliance"
            />
          </div>
        </div>

        {/* BOTTOM-CENTER: MEMORY PORT (Position.Bottom) - Transformation Violet #483698 */}
        <div className="flex flex-col items-center group/socket">
          {/* Stem line down from chassis */}
          <div className={`w-[1.5px] h-1.5 transition-colors ${
            hasMemory ? 'bg-[#483698]' : isDarkMode ? 'bg-[#483698]/50' : 'bg-[#483698]/60'
          }`} />
          <div
            className={`relative w-4 h-4 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              hasMemory
                ? 'bg-[#483698] border-[#483698] text-white shadow-[0_0_8px_rgba(72,54,152,0.5)]'
                : isDarkMode
                  ? 'bg-[#181B24] border-[#483698]/60 text-[#A78BFA] hover:bg-[#483698]/20 hover:border-[#483698]'
                  : 'bg-white border-[#483698] text-[#483698] hover:bg-[#483698]/10'
            }`}
            title="Footing: Memory Socket"
          >
            <Plus className="w-2.5 h-2.5 stroke-[3] pointer-events-none" />
            <Handle
              type="target"
              position={Position.Bottom}
              id="memory-in"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                top: 0,
                left: 0,
                transform: 'none',
                opacity: 0,
                cursor: 'crosshair',
                border: 'none',
                background: 'transparent'
              }}
              title="Memory: Episodic Context"
            />
          </div>
        </div>

        {/* BOTTOM-RIGHT: SKILLS PORT (Position.Bottom) - Tech Magenta #6D2077 */}
        <div className="flex flex-col items-center group/socket">
          {/* Stem line down from chassis */}
          <div className={`w-[1.5px] h-1.5 transition-colors ${
            hasSkills ? 'bg-[#6D2077]' : isDarkMode ? 'bg-[#6D2077]/50' : 'bg-[#6D2077]/60'
          }`} />
          <div
            className={`relative w-4 h-4 rounded-full flex items-center justify-center border transition-all shadow-xs ${
              hasSkills
                ? 'bg-[#6D2077] border-[#6D2077] text-white shadow-[0_0_8px_rgba(109,32,119,0.5)]'
                : isDarkMode
                  ? 'bg-[#181B24] border-[#6D2077]/60 text-[#F472B6] hover:bg-[#6D2077]/20 hover:border-[#6D2077]'
                  : 'bg-white border-[#6D2077] text-[#6D2077] hover:bg-[#6D2077]/10'
            }`}
            title="Footing: Skills & Capabilities Socket"
          >
            <Plus className="w-2.5 h-2.5 stroke-[3] pointer-events-none" />
            <Handle
              type="target"
              position={Position.Bottom}
              id="skill-in"
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '9999px',
                top: 0,
                left: 0,
                transform: 'none',
                opacity: 0,
                cursor: 'crosshair',
                border: 'none',
                background: 'transparent'
              }}
              title="Agility: Specialized Skills"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
