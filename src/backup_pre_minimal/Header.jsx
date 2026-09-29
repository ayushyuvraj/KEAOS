// Exact backup of Header.jsx before minimal n8n-style refactoring
import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Cpu, 
  CheckCircle2,
  Layers,
  Play,
  FileCheck2,
  Code2,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from 'lucide-react';

export default function Header({
  viewMode,
  activeUseCase,
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
  const VIEW_TITLES = {
    canvas: { label: 'Visual Canvas & Topology Engine', icon: Layers },
    simulator: { label: 'Multimodal Meeting Simulator & Trace', icon: Play },
    evaluation: { label: 'Golden Dataset Alignment Gatekeeper', icon: FileCheck2 },
    code: { label: 'Multi-SDK Idiomatic Python Exporter', icon: Code2 },
    audit: { label: 'Cryptographic SHA-256 Audit Ledger', icon: ShieldCheck },
    observability: { label: 'OpenTelemetry Observability & Unit ROI', icon: Activity },
    catalog: { label: 'Architectural 10-Pillars Registry', icon: Cpu }
  };

  const currentView = VIEW_TITLES[viewMode] || VIEW_TITLES.canvas;
  const ViewIcon = currentView.icon;

  return (
    <header className="h-12 px-4 bg-[#001E50] border-b border-[#00338D] flex items-center justify-between shrink-0 z-20 shadow-md select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebarClosed}
          className={`btn-tactile p-1.5 border transition-all ${
            isSidebarClosed 
              ? 'bg-[#00338D] border-[#0091DA] text-white shadow-md' 
              : 'bg-white/10 border-white/20 text-slate-300 hover:text-white hover:bg-white/20'
          }`}
          title={isSidebarClosed ? 'Open Left Panel (Sidebar)' : 'Push / Hide Left Panel (Sidebar)'}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
          <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            KEAOS Studio
          </span>
          <span className="text-slate-500">/</span>
          <div className="flex items-center gap-2 font-bold text-white tracking-tight">
            <ViewIcon className="w-3.5 h-3.5 text-[#0091DA]" />
            <span>{currentView.label}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenClusterModal}
          className="btn-tactile flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-mono font-bold rounded-none transition-all cursor-pointer"
          title="Click to view distributed execution plane diagnostics and live sandbox runner"
        >
          <Cpu className="w-3.5 h-3.5 text-[#0091DA]" />
          <span>Cluster Fleet</span>
        </button>

        <div className="h-4 w-px bg-white/20" />

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Inference:</span>
          <span className="px-2 py-0.5 rounded-full bg-[#00338D] text-white border border-[#0091DA]/40 text-[10px] font-bold flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-[#009A44] beacon-live' : 'bg-[#EAAA00]'}`} />
            <span>{hasApiKey ? `${configuredCount || 1} Providers Live` : 'Local Fallback'}</span>
          </span>
        </div>

        <div className="h-4 w-px bg-white/20" />

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Audit:</span>
          <span className="text-[10px] font-bold text-[#E6F5EC] flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-[#009A44]" />
            <span>SHA-256 Ledger</span>
          </span>
        </div>

        <div className="h-4 w-px bg-white/20" />

        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#009A44]" />
          <span className="text-[10px] font-mono font-bold text-white tracking-wider uppercase">
            100% Operational
          </span>
        </div>

        <div className="h-4 w-px bg-white/20" />

        <button
          onClick={onToggleTheme}
          className="btn-tactile p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
          title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-300" />}
        </button>
      </div>
    </header>
  );
}
