import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Brain, 
  Wrench, 
  Server, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Plus 
} from 'lucide-react';

export default function AgentCoreNode({ data, selected }) {
  const { name, framework, attachedCounts, isDarkMode, isExecuting } = data;

  const hasModel = (attachedCounts?.model || 0) > 0;
  const hasTools = (attachedCounts?.tools || 0) > 0;
  const hasMcp = (attachedCounts?.mcp || 0) > 0;
  const hasMemory = (attachedCounts?.memory || 0) > 0;
  const hasPolicies = (attachedCounts?.policies || 0) > 0;
  const hasSkills = (attachedCounts?.skills || 0) > 0;

  return (
    <div className="relative select-none flex flex-col items-center">
      {/* ============================================================ */}
      {/* 1. ANTENNA / BRAIN (Chat Model Socket - Position.Top)         */}
      {/* ============================================================ */}
      <div className="flex flex-col items-center z-10 -mb-1">
        {/* Antenna Orb / Transmitter Dish */}
        <div
          className={`relative group w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-md ${
            hasModel
              ? 'bg-[#0091DA]/20 border-[#0091DA] text-[#0091DA] shadow-[0_0_12px_rgba(0,145,218,0.5)]'
              : isDarkMode
                ? 'bg-[#222530] border-[#444856] text-slate-400'
                : 'bg-white border-[#CBD5E1] text-slate-400'
          }`}
          title="Brain Socket: Connect Foundation Model (Gemini, Claude, GPT-4o, Ollama)"
        >
          {/* Target Handle for Model at Top */}
          <Handle
            type="target"
            position={Position.Top}
            id="model-in"
            style={{
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              backgroundColor: hasModel ? '#0091DA' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1E2028' : '#FFFFFF',
              borderWidth: '2px',
              top: '-5px'
            }}
            title="Brain: Foundation Model"
          />

          <Brain className={`w-4 h-4 transition-transform ${hasModel ? 'scale-110 text-[#0091DA]' : ''}`} />

          {/* Model Beacon Pulse when connected */}
          {hasModel && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0091DA] animate-ping" />
          )}

          {/* Socket Label Pill */}
          <div className="absolute -top-6 whitespace-nowrap px-1.5 py-0.5 rounded-full text-[8px] font-mono tracking-wider font-bold bg-[#0091DA]/15 text-[#0091DA] border border-[#0091DA]/40 uppercase">
            Brain • Model
          </div>
        </div>

        {/* Antenna Stem */}
        <div className={`w-1 h-3.5 ${
          hasModel ? 'bg-[#0091DA]' : isDarkMode ? 'bg-[#444856]' : 'bg-[#CBD5E1]'
        } transition-colors`} />
      </div>

      {/* ============================================================ */}
      {/* 2. ROBOT HEAD CHASSIS (Main Visual Container)                */}
      {/* ============================================================ */}
      <div
        className={`relative w-[270px] rounded-[26px] border-2 transition-all duration-200 shadow-2xl ${
          isDarkMode
            ? 'bg-[#1D2028] border-[#383C4A] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
            : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#111827] shadow-[0_12px_32px_rgba(0,30,80,0.08)]'
        } ${
          isExecuting
            ? 'border-[#0091DA] ring-4 ring-[#0091DA]/30 shadow-[0_0_36px_rgba(0,145,218,0.5)]'
            : selected
              ? 'border-[#0091DA] ring-2 ring-[#0091DA]'
              : isDarkMode ? 'hover:border-[#525769]' : 'hover:border-[#94A3B8]'
        }`}
        style={{ padding: '12px 14px' }}
      >
        {/* Subtle Corner Hardware Rivets */}
        <div className="absolute top-2.5 left-3 w-1.5 h-1.5 rounded-full bg-white/20" />
        <div className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-white/20" />
        <div className="absolute bottom-2.5 left-3 w-1.5 h-1.5 rounded-full bg-white/20" />
        <div className="absolute bottom-2.5 right-3 w-1.5 h-1.5 rounded-full bg-white/20" />

        {/* ------------------------------------------------------------ */}
        {/* LEFT ARM / EAR BOLT (Tools Socket - Position.Left)           */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute -left-[14px] top-[95px] -translate-y-1/2 w-4 h-11 rounded-l-md border-y border-l flex flex-col items-center justify-center transition-colors shadow-md ${
            hasTools
              ? 'bg-[#005EB8]/20 border-[#005EB8] text-[#005EB8]'
              : isDarkMode
                ? 'bg-[#252833] border-[#383C4A] text-slate-400'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-slate-400'
          }`}
          title="Hands Socket: Connect Ingestion & Execution Tools (Whisper, Parser, Search)"
        >
          <Handle
            type="target"
            position={Position.Left}
            id="tools-in"
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '9px',
              height: '9px',
              borderRadius: '2px',
              backgroundColor: hasTools ? '#005EB8' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
              borderWidth: '2px',
              left: '-5px'
            }}
            title="Hands: Tools Ingestion"
          />
          <Wrench className="w-3 h-3" />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT ARM / EAR BOLT (MCP Socket - Position.Right)           */}
        {/* ------------------------------------------------------------ */}
        <div
          className={`absolute -right-[14px] top-[95px] -translate-y-1/2 w-4 h-11 rounded-r-md border-y border-r flex flex-col items-center justify-center transition-colors shadow-md ${
            hasMcp
              ? 'bg-[#06B6D4]/20 border-[#06B6D4] text-[#06B6D4]'
              : isDarkMode
                ? 'bg-[#252833] border-[#383C4A] text-slate-400'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-slate-400'
          }`}
          title="Reach Socket: Connect MCP Servers (Calendar, Slack, Jira, GitHub)"
        >
          <Handle
            type="target"
            position={Position.Right}
            id="mcp-in"
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '9px',
              height: '9px',
              borderRadius: '2px',
              backgroundColor: hasMcp ? '#06B6D4' : isDarkMode ? '#4B5563' : '#9CA3AF',
              borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
              borderWidth: '2px',
              right: '-5px'
            }}
            title="Reach: MCP Protocol"
          />
          <Server className="w-3 h-3" />
        </div>

        {/* ------------------------------------------------------------ */}
        {/* OUTPUT STREAM PORT (Workflow Out - Position.Right with [+])  */}
        {/* ------------------------------------------------------------ */}
        <div className="absolute -right-3 top-[152px] flex items-center">
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="!w-3 !h-3 !rounded-full !bg-[#0091DA] !border-2 !border-[#1D2028]"
            title="Agent output stream"
          />
          <div 
            className="absolute left-3 w-5 h-5 rounded-md border border-[#444856] bg-[#222530] flex items-center justify-center text-slate-400 hover:text-white hover:border-[#0091DA] transition-colors cursor-pointer shadow-sm"
            title="Chain next workflow step"
          >
            <Plus className="w-3 h-3" />
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* ROBOT VISOR / DIGITAL FACE SCREEN                            */}
        {/* ------------------------------------------------------------ */}
        <div className="relative w-full h-[62px] rounded-2xl bg-[#0B0E14] border border-[#2B303C] flex items-center justify-center px-4 overflow-hidden shadow-inner">
          {/* Scanning Beam Overlay during execution */}
          {isExecuting && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0091DA]/30 to-transparent animate-pulse pointer-events-none" />
          )}

          {/* Two Expressive Robot Eyes */}
          <div className="flex items-center gap-7 z-10">
            {/* Left Eye */}
            <div
              className={`w-3 h-6 rounded-full transition-all duration-300 ${
                isExecuting
                  ? 'bg-[#38BDF8] shadow-[0_0_20px_#38BDF8] scale-110 animate-pulse'
                  : 'bg-[#0091DA] shadow-[0_0_12px_#0091DA]'
              }`}
            />
            {/* Right Eye */}
            <div
              className={`w-3 h-6 rounded-full transition-all duration-300 ${
                isExecuting
                  ? 'bg-[#38BDF8] shadow-[0_0_20px_#38BDF8] scale-110 animate-pulse'
                  : 'bg-[#0091DA] shadow-[0_0_12px_#0091DA]'
              }`}
            />
          </div>

          {/* Digital Scanline lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.08)_2px,rgba(255,255,255,0.08)_4px)]" />

          {/* Idle status indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isExecuting ? 'bg-[#0091DA] animate-ping' : 'bg-[#10B981]'}`} />
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* AGENT IDENTITY / AUDIO SPEAKER GRILLE                        */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-2.5 flex flex-col items-center text-center">
          {/* Mini Speaker Grille Slots */}
          <div className="flex items-center justify-center gap-1 mb-1.5 opacity-40">
            <span className="w-3.5 h-0.5 rounded-full bg-slate-400" />
            <span className="w-5 h-0.5 rounded-full bg-slate-400" />
            <span className="w-3.5 h-0.5 rounded-full bg-slate-400" />
          </div>

          <h3 className="text-xs font-bold tracking-tight text-white dark:text-white truncate max-w-[230px]">
            {name || 'AI Agent'}
          </h3>
          <span className="text-[9px] font-mono font-medium text-slate-400 uppercase tracking-wider mt-0.5">
            {framework?.name || 'Workflow Orchestrator'}
          </span>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CHEST CORE / CONTEXT HEART (Memory Glow Indicator)           */}
        {/* ------------------------------------------------------------ */}
        <div className="mt-2 pt-2 border-t border-dashed border-white/10 flex items-center justify-center gap-2">
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-mono transition-all ${
              hasMemory
                ? 'bg-[#8B5CF6]/15 border-[#8B5CF6]/50 text-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                : 'bg-transparent border-white/10 text-slate-500'
            }`}
            title="Heart / Memory Core: Remembers cross-meeting history"
          >
            <Database className="w-2.5 h-2.5" />
            <span className="font-semibold">CORE RECALL</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. LEGS & FOOTING PEDESTALS (Guardrails, Memory, Skills)      */}
      {/* ============================================================ */}
      <div className="relative w-[240px] flex items-center justify-between -mt-1 z-10 px-2">
        {/* ------------------------------------------------------------ */}
        {/* LEFT FOOT (Policy & Guardrails - Position.Bottom)            */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col items-center">
          {/* Leg Strut */}
          <div className={`w-1.5 h-3 ${hasPolicies ? 'bg-[#EC4899]' : isDarkMode ? 'bg-[#383C4A]' : 'bg-[#CBD5E1]'}`} />
          {/* Foot Stance Pad */}
          <div
            className={`relative group w-16 h-7 rounded-b-lg border-x border-b flex items-center justify-center gap-1 px-1 transition-all ${
              hasPolicies
                ? 'bg-[#EC4899]/20 border-[#EC4899] text-[#EC4899] shadow-[0_4px_12px_rgba(236,72,153,0.3)]'
                : isDarkMode
                  ? 'bg-[#222530] border-[#383C4A] text-slate-400'
                  : 'bg-white border-[#CBD5E1] text-slate-400'
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
                width: '9px',
                height: '9px',
                borderRadius: '2px',
                backgroundColor: hasPolicies ? '#EC4899' : isDarkMode ? '#4B5563' : '#9CA3AF',
                borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
                borderWidth: '2px',
                bottom: '-5px'
              }}
              title="Guard: Policies & Compliance"
            />
            <ShieldCheck className="w-3 h-3" />
            <span className="text-[8px] font-mono font-bold tracking-tighter">GUARD</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CENTER FOOT (Memory Context - Position.Bottom)               */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col items-center">
          {/* Center Leg Strut */}
          <div className={`w-1.5 h-3 ${hasMemory ? 'bg-[#8B5CF6]' : isDarkMode ? 'bg-[#383C4A]' : 'bg-[#CBD5E1]'}`} />
          {/* Foot Stance Pad */}
          <div
            className={`relative group w-18 h-7 rounded-b-lg border-x border-b flex items-center justify-center gap-1 px-1 transition-all ${
              hasMemory
                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#8B5CF6] shadow-[0_4px_12px_rgba(139,92,246,0.3)]'
                : isDarkMode
                  ? 'bg-[#222530] border-[#383C4A] text-slate-400'
                  : 'bg-white border-[#CBD5E1] text-slate-400'
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
                width: '9px',
                height: '9px',
                borderRadius: '2px',
                backgroundColor: hasMemory ? '#8B5CF6' : isDarkMode ? '#4B5563' : '#9CA3AF',
                borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
                borderWidth: '2px',
                bottom: '-5px'
              }}
              title="Memory: Episodic Context"
            />
            <Database className="w-3 h-3" />
            <span className="text-[8px] font-mono font-bold tracking-tighter">MEMORY</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT FOOT (Specialized Skills - Position.Bottom)            */}
        {/* ------------------------------------------------------------ */}
        <div className="flex flex-col items-center">
          {/* Leg Strut */}
          <div className={`w-1.5 h-3 ${hasSkills ? 'bg-[#10B981]' : isDarkMode ? 'bg-[#383C4A]' : 'bg-[#CBD5E1]'}`} />
          {/* Foot Stance Pad */}
          <div
            className={`relative group w-16 h-7 rounded-b-lg border-x border-b flex items-center justify-center gap-1 px-1 transition-all ${
              hasSkills
                ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981] shadow-[0_4px_12px_rgba(16,185,129,0.3)]'
                : isDarkMode
                  ? 'bg-[#222530] border-[#383C4A] text-slate-400'
                  : 'bg-white border-[#CBD5E1] text-slate-400'
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
                width: '9px',
                height: '9px',
                borderRadius: '2px',
                backgroundColor: hasSkills ? '#10B981' : isDarkMode ? '#4B5563' : '#9CA3AF',
                borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
                borderWidth: '2px',
                bottom: '-5px'
              }}
              title="Agility: Specialized Skills"
            />
            <Sparkles className="w-3 h-3" />
            <span className="text-[8px] font-mono font-bold tracking-tighter">SKILLS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
