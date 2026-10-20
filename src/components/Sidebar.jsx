import React from 'react';
import { 
  Bot, 
  ShieldCheck, 
  Key, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Rocket, 
  Lock,
  Home, 
  X,
  Sparkles
} from 'lucide-react';

export default function Sidebar({
  activeUseCase,
  viewMode,
  setViewMode,
  evaluationPassed,
  onDeployClick,
  hasApiKey,
  configuredCount,
  onOpenApiSettings,
  isCollapsed = false,
  setIsCollapsed,
  isClosed = false,
  setIsClosed,
  isDarkMode = true
}) {
  if (isClosed) {
    return null;
  }

  const isDark = Boolean(isDarkMode);

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'unified-audit', label: 'Audit & Observability', icon: ShieldCheck }
  ];

  // Theme-adaptive classes
  const themeSidebar = isDark 
    ? 'bg-[#0B0F17] text-white border-[#1E293B] shadow-xl' 
    : 'bg-white text-slate-900 border-slate-200 shadow-xs';

  const themeHeader = isDark 
    ? 'border-[#1E293B] bg-[#0B0F17]' 
    : 'border-slate-100 bg-white';

  const themeTextMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const themeLabel = isDark ? 'text-slate-400' : 'text-slate-500';

  // ========================================================
  // COLLAPSED RAIL MODE (w-16)
  // ========================================================
  if (isCollapsed) {
    return (
      <aside 
        className={`w-16 h-full border-r flex flex-col items-center justify-between py-3.5 shrink-0 z-30 select-none transition-all duration-200 ease-out ${themeSidebar}`}
      >
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Brand Icon (Click to Expand) */}
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-9 h-9 rounded-lg bg-[#00338D] hover:bg-[#005EB8] text-white flex items-center justify-center transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Expand Sidebar (KEAOS)"
          >
            <Bot className="w-4 h-4" />
          </button>

          <div className={`w-8 h-px my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {/* Navigation Icons */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-95 cursor-pointer relative ${
                    isActive
                      ? (isDark 
                          ? 'bg-white/10 text-white shadow-xs border-l-2 border-sky-400' 
                          : 'bg-blue-50 text-[#00338D] shadow-xs border-l-2 border-[#00338D]')
                      : (isDark 
                          ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {/* API Key Status Icon */}
          <button
            type="button"
            onClick={onOpenApiSettings}
            className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all active:scale-95 cursor-pointer relative ${
              hasApiKey
                ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700')
                : (isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700')
            }`}
            title={hasApiKey ? `LLM Engines (${configuredCount || 1} Connected)` : 'Configure API Keys'}
          >
            <Key className="w-3.5 h-3.5" />
            <span className={`w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5 ${hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          </button>

          {/* Expand Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed?.(false)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          {/* Close Sidebar Button */}
          <button
            type="button"
            onClick={() => setIsClosed?.(true)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-red-400 hover:bg-white/5' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
            title="Hide Sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // ========================================================
  // EXPANDED STUDIO SIDEBAR (w-64)
  // ========================================================
  return (
    <aside 
      className={`w-64 h-full border-r flex flex-col justify-between shrink-0 overflow-hidden select-none z-30 transition-all duration-200 ease-out ${themeSidebar}`}
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header: Logo, Title, Collapse & Close Controls */}
        <div className={`p-3.5 border-b flex items-center justify-between ${themeHeader}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00338D] text-white flex items-center justify-center shadow-xs shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-sm font-['Univers',sans-serif] leading-none">
                  KEAOS
                </span>
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded-full border ${
                  isDark 
                    ? 'bg-blue-950/70 text-blue-300 border-blue-800/60' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  STUDIO
                </span>
              </div>
              <p className={`text-[10px] ${themeTextMuted} font-medium mt-0.5 tracking-wide leading-none`}>
                Enterprise Agent Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsCollapsed?.(true)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsClosed?.(true)}
              className={`p-1.5 rounded-md transition-colors cursor-pointer active:scale-95 ${
                isDark ? 'text-slate-400 hover:text-red-400 hover:bg-white/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Hide Sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation & Workspace Area */}
        <div className="p-2 space-y-4 flex-1 overflow-y-auto">
          {/* Section: Studio Views */}
          <div className="space-y-1">
            <div className={`px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${themeLabel}`}>
              Studio Views
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-all active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? (isDark 
                          ? 'bg-white/[0.08] text-white font-semibold border-l-2 border-sky-400 shadow-xs' 
                          : 'bg-blue-50 text-[#00338D] font-semibold border-l-2 border-[#00338D] shadow-xs')
                      : (isDark 
                          ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70')
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Section: Active Runtime Context (Tastefully replaces empty void) */}
          <div className="pt-2">
            <div className={`px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${themeLabel}`}>
              Active Runtime
            </div>
            <div className={`p-3 mx-1 rounded-lg border space-y-2 transition-all ${
              isDark 
                ? 'bg-[#111827]/60 border-[#1E293B]' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold truncate leading-tight">
                    {activeUseCase?.name || 'Autonomous Agent'}
                  </h4>
                  <p className={`text-[11px] ${themeTextMuted} truncate mt-0.5`}>
                    {activeUseCase?.framework?.name || 'Multi-SDK Engine'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800/80 text-[10px] font-mono">
                <span className={themeTextMuted}>Model</span>
                <span className="font-semibold text-blue-600 dark:text-sky-400 truncate max-w-[110px]">
                  {activeUseCase?.framework?.defaultModel || 'gpt-4o-mini'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions: LLM Engines Status & Deploy Control */}
        <div className={`p-3 border-t space-y-2 ${themeHeader}`}>
          {/* LLM APIs Status Tile */}
          <button
            type="button"
            onClick={onOpenApiSettings}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.98] cursor-pointer ${
              hasApiKey
                ? (isDark 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/15' 
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70')
                : (isDark 
                    ? 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/15' 
                    : 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100/70')
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span>{hasApiKey ? `LLM Engines (${configuredCount || 1})` : 'Set LLM APIs'}</span>
            </div>
            <span className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded ${
              hasApiKey 
                ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800') 
                : (isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800')
            }`}>
              {hasApiKey ? 'Ready' : 'Config'}
            </span>
          </button>

          {/* Deploy Action Button */}
          <button
            type="button"
            onClick={onDeployClick}
            disabled={!evaluationPassed}
            className={`w-full py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-xs ${
              evaluationPassed
                ? 'bg-[#00338D] hover:bg-[#005EB8] text-white cursor-pointer'
                : (isDark 
                    ? 'bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed opacity-70' 
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-80')
            }`}
          >
            {evaluationPassed ? <Rocket className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{evaluationPassed ? 'Deploy Agent to Prod' : 'Deploy (Gate Locked)'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
