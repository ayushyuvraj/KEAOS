import React from 'react';
import { 
  Layers, 
  Play, 
  FileCheck2, 
  Code2, 
  PanelLeft, 
  Sun, 
  Moon,
  Cpu,
  Share2,
  Bookmark
} from 'lucide-react';

import { FRAMEWORKS } from '../constants/frameworks';

export default function Header({
  viewMode,
  setViewMode,
  activeUseCase,
  onSelectFramework,
  hasApiKey,
  configuredCount,
  onOpenClusterModal,
  isSidebarClosed = false,
  onToggleSidebarClosed,
  isSidebarCollapsed = false,
  onToggleSidebarCollapsed,
  isDarkMode = true,
  onToggleTheme
}) {
  const tabs = [
    { id: 'canvas', label: 'Editor' },
    { id: 'simulator', label: 'Executions' },
    { id: 'evaluation', label: 'Evaluations' },
    { id: 'code', label: 'Export Code' }
  ];

  return (
    <header className={`h-12 px-5 flex items-center justify-between shrink-0 z-20 select-none border-b transition-colors ${
      isDarkMode 
        ? 'bg-[#18191E] border-[#2B2D36] text-white' 
        : 'bg-white border-[#E5E7EB] text-[#111827]'
    }`}>
      {/* Left: Minimal Breadcrumb & Framework Target Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebarClosed}
          className={`p-1.5 rounded-lg border transition-colors ${
            isSidebarClosed 
              ? 'bg-[#0091DA]/20 border-[#0091DA] text-[#0091DA]' 
              : isDarkMode
                ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                : 'border-transparent text-slate-500 hover:text-black hover:bg-black/5'
          }`}
          title={isSidebarClosed ? 'Open Left Panel' : 'Hide Left Panel'}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className={`font-mono text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Workspace</span>
          <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>/</span>
          <span className={`font-semibold tracking-tight ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {activeUseCase?.name || 'My Agent Workflow'}
          </span>
        </div>

        {/* Apple-style Target SDK Selector Pill */}
        <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-700/40">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            SDK:
          </span>
          <div className="relative group">
            <select
              value={activeUseCase?.framework?.id || 'google-adk'}
              onChange={(e) => {
                const fw = FRAMEWORKS.find(f => f.id === e.target.value);
                if (fw && onSelectFramework) onSelectFramework(fw);
              }}
              className={`px-2 py-0.5 text-xs font-mono font-bold rounded border appearance-none cursor-pointer pr-5 focus:outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-[#1E2028] border-[#383C4A] text-[#0091DA] hover:border-[#0091DA]' 
                  : 'bg-white border-[#CBD5E1] text-[#00338D] hover:border-[#00338D]'
              }`}
              title="Select Target Autonomous Agent SDK (Google ADK, LangGraph, AutoGen, CrewAI, OpenAI Swarm...)"
            >
              {FRAMEWORKS.map(fw => (
                <option key={fw.id} value={fw.id}>
                  {fw.name}
                </option>
              ))}
            </select>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Center: Segmented Pill View Switcher (Matching Reference Image) */}
      <div className={`flex items-center p-0.5 rounded-xl border ${
        isDarkMode ? 'bg-[#121316] border-[#2E313B]' : 'bg-gray-100 border-gray-200'
      }`}>
        {tabs.map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode && setViewMode(tab.id)}
              className={`px-3.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? isDarkMode 
                    ? 'bg-[#292C36] text-white shadow-sm' 
                    : 'bg-white text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right: Minimal Actions & Status (Matching Reference Image) */}
      <div className="flex items-center gap-3">
        {/* Active/Inactive Live Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Active</span>
          <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </div>

        {/* Cluster Fleet Button */}
        <button
          onClick={onOpenClusterModal}
          className={`p-1.5 rounded-lg border border-transparent transition-colors ${
            isDarkMode 
              ? 'text-slate-400 hover:text-white hover:bg-white/10' 
              : 'text-slate-500 hover:text-black hover:bg-black/5'
          }`}
          title="Cluster Fleet Diagnostics"
        >
          <Cpu className="w-4 h-4" />
        </button>

        {/* Share Button */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Workflow share link copied to clipboard!');
          }}
          className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
            isDarkMode 
              ? 'bg-[#22242B] border-[#363944] text-slate-300 hover:text-white hover:bg-[#2A2C35]' 
              : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Accent Save / Deploy Button (Coral accent matching reference) */}
        <button
          onClick={() => alert('Workflow snapshot saved successfully!')}
          className="px-3.5 py-1 text-xs font-bold rounded-lg bg-[#FF6D5A] hover:bg-[#FF5A45] text-white shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
          <span>Save</span>
        </button>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded-lg border border-transparent transition-colors ${
            isDarkMode 
              ? 'text-slate-400 hover:text-white hover:bg-white/10' 
              : 'text-slate-500 hover:text-black hover:bg-black/5'
          }`}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>
    </header>
  );
}
