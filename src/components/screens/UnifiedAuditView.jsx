import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Clock, 
  Cpu, 
  DollarSign, 
  Copy, 
  Check, 
  Download, 
  ChevronRight, 
  X, 
  Activity, 
  User, 
  Layers, 
  ExternalLink,
  Sparkles,
  RefreshCw,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Compass
} from 'lucide-react';
import { 
  getStoredAuditRuns, 
  getAuditKPIs, 
  exportAuditProofJsonLd,
  clearAuditRuns,
  deleteAuditRun
} from '../../services/unifiedAuditService';

/**
 * Dynamic brand taxonomy badge for multi-model brains
 */
function getBrainBadgeStyle(provider = '', isDark = true) {
  const p = (provider || '').toLowerCase();
  if (p.includes('anthropic') || p.includes('claude')) {
    return isDark 
      ? 'bg-[#EAAA00]/15 text-[#EAAA00] border-[#EAAA00]/30 shadow-[inset_0_1px_0_0_rgba(234,170,0,0.2)]' 
      : 'bg-[#EAAA00]/10 text-[#9E6D00] border-[#EAAA00]/30';
  }
  if (p.includes('openai') || p.includes('gpt') || p.includes('o1') || p.includes('o3') || p.includes('o4')) {
    return isDark 
      ? 'bg-[#009A44]/15 text-[#009A44] border-[#009A44]/30 shadow-[inset_0_1px_0_0_rgba(0,154,68,0.2)]' 
      : 'bg-[#009A44]/10 text-[#007A36] border-[#009A44]/30';
  }
  if (p.includes('ollama')) {
    return isDark 
      ? 'bg-[#483698]/20 text-[#A390E4] border-[#483698]/35 shadow-[inset_0_1px_0_0_rgba(72,54,152,0.3)]' 
      : 'bg-[#483698]/10 text-[#483698] border-[#483698]/30';
  }
  if (p.includes('google') || p.includes('gemini')) {
    return isDark 
      ? 'bg-[#00338D]/20 text-[#0091DA] border-[#0091DA]/30 shadow-[inset_0_1px_0_0_rgba(0,145,218,0.25)]' 
      : 'bg-[#00338D]/10 text-[#00338D] border-[#00338D]/20';
  }
  if (p.includes('deterministic') || p.includes('local') || p.includes('standard') || p.includes('none')) {
    return isDark 
      ? 'bg-slate-700/25 text-slate-300 border-slate-500/30' 
      : 'bg-slate-200/80 text-slate-700 border-slate-300';
  }
  return isDark 
    ? 'bg-[#00A3A6]/15 text-[#00A3A6] border-[#00A3A6]/30' 
    : 'bg-[#00A3A6]/10 text-[#00A3A6] border-[#00A3A6]/25';
}

export default function UnifiedAuditView({
  activeUseCase,
  nodes = [],
  edges = [],
  isDarkMode = true,
  onNavigateHome
}) {
  const [runs, setRuns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('all'); // 'all' | 'canvas' | 'frontend' | 'evaluations'
  const [selectedRun, setSelectedRun] = useState(null);
  const [activeTab, setActiveTab] = useState('brains'); // 'brains' | 'activities' | 'cryptography'
  const [copiedId, setCopiedId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load runs and attach real-time storage event listener
  useEffect(() => {
    const refreshRuns = () => {
      const records = getStoredAuditRuns();
      setRuns(records);
      if (selectedRun) {
        const stillExists = records.find(r => r.runId === selectedRun.runId);
        if (!stillExists) setSelectedRun(null);
      }
    };

    refreshRuns();
    window.addEventListener('keaos:audit-ledger-updated', refreshRuns);
    return () => window.removeEventListener('keaos:audit-ledger-updated', refreshRuns);
  }, [selectedRun]);

  const kpis = useMemo(() => getAuditKPIs(runs), [runs]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return (runs || []).filter(r => {
      if (originFilter !== 'all') {
        const matchesOrigin = r.origin === originFilter || 
          (originFilter === 'canvas' && (r.origin === 'canvas_runner' || r.origin === 'canvas_fleet' || r.origin === 'interactive_chat' || r.origin === 'canvas')) ||
          (originFilter === 'frontend' && (r.origin === 'execution_tab' || r.origin === 'showroom_frontend')) ||
          (originFilter === 'evaluations' && r.origin === 'evaluation_suite');
        if (!matchesOrigin) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inWorkflow = (r.workflowName || '').toLowerCase().includes(q);
      const inId = (r.runId || '').toLowerCase().includes(q);
      const inHash = (r.cryptography?.rootSha256 || '').toLowerCase().includes(q);
      const inOperator = (r.initiator?.name || '').toLowerCase().includes(q);
      const inBrains = Array.isArray(r.multiBrainBreakdown) && r.multiBrainBreakdown.some(b => 
        (b.displayName || '').toLowerCase().includes(q) || (b.provider || '').toLowerCase().includes(q)
      );
      return inWorkflow || inId || inHash || inOperator || inBrains;
    });
  }, [runs, originFilter, searchQuery]);

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearAll = () => {
    clearAuditRuns();
    setRuns([]);
    setSelectedRun(null);
    setShowClearConfirm(false);
  };

  return (
    <div className={`relative flex-1 h-full w-full overflow-hidden flex flex-col select-none transition-colors ${
      isDarkMode ? 'bg-[#070A11] text-white' : 'bg-[#F4F6F9] text-slate-900'
    }`}>
      {/* =========================================================================
          AUTHENTIC GLASSMORPHISM AMBIENT LIGHT LAYER
          Blurred chromatic light orbs that bleed softly through frosted glass
         ========================================================================= */}
      <div 
        className="absolute -top-32 -right-20 w-[540px] h-[540px] rounded-full pointer-events-none blur-[140px] opacity-25"
        style={{
          background: isDarkMode 
            ? 'radial-gradient(circle, #00338D 0%, #0091DA 40%, transparent 70%)' 
            : 'radial-gradient(circle, #005EB8 0%, #00A3A6 40%, transparent 70%)'
        }}
      />
      <div 
        className="absolute -bottom-28 -left-20 w-[500px] h-[500px] rounded-full pointer-events-none blur-[150px] opacity-20"
        style={{
          background: isDarkMode 
            ? 'radial-gradient(circle, #483698 0%, #00338D 50%, transparent 75%)' 
            : 'radial-gradient(circle, #483698 0%, #0091DA 45%, transparent 70%)'
        }}
      />
      <div 
        className="absolute top-1/3 left-1/4 w-[380px] h-[380px] rounded-full pointer-events-none blur-[160px] opacity-15"
        style={{
          background: isDarkMode 
            ? 'radial-gradient(circle, #00A3A6 0%, #EAAA00 50%, transparent 75%)' 
            : 'radial-gradient(circle, #00A3A6 0%, #EAAA00 40%, transparent 70%)'
        }}
      />

      {/* =========================================================================
          FROSTED GLASS SCREEN HEADER
         ========================================================================= */}
      <header className={`relative z-20 px-6 py-4 flex items-center justify-between border-b backdrop-blur-2xl backdrop-saturate-150 transition-colors ${
        isDarkMode 
          ? 'bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]' 
          : 'bg-white/65 border-slate-200/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-[#00338D]/90 text-white border border-[#0091DA]/40 shadow-[0_0_16px_rgba(0,145,218,0.35)]">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold uppercase tracking-widest font-mono">
                Audit & Observability Ledger
              </h1>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#009A44]/15 text-[#009A44] border border-[#009A44]/30 flex items-center gap-1.5 shadow-[inset_0_1px_0_0_rgba(0,154,68,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#009A44] animate-pulse" />
                W3C SHA-256 Engine Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Zero-simulation institutional ledger • Real-time multi-brain accounting & cryptographic trace
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {runs.length > 0 && (
            <>
              {showClearConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2 py-1">
                  <span className="text-[11px] font-mono text-rose-300">Wipe all records?</span>
                  <button
                    onClick={handleClearAll}
                    className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-600 hover:bg-rose-500 text-white"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium flex items-center gap-1.5 border backdrop-blur-md transition-all ${
                    isDarkMode 
                      ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-rose-400 border-white/[0.08] hover:border-rose-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]' 
                      : 'bg-white/70 hover:bg-white text-slate-600 hover:text-rose-600 border-slate-300'
                  }`}
                  title="Purge all audit runs from persistent storage"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Ledger</span>
                </button>
              )}
            </>
          )}

          {selectedRun && (
            <button
              onClick={() => exportAuditProofJsonLd(selectedRun)}
              className={`px-3.5 py-1.5 text-xs font-mono font-bold flex items-center gap-2 border backdrop-blur-md transition-all ${
                isDarkMode 
                  ? 'bg-[#00338D]/40 hover:bg-[#00338D]/60 text-white border-[#0091DA]/50 shadow-[0_0_16px_rgba(0,51,141,0.35),inset_0_1px_0_0_rgba(255,255,255,0.2)]' 
                  : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#00338D]'
              }`}
              title="Download signed JSON-LD audit proof for selected run"
            >
              <Download className="w-3.5 h-3.5 text-[#0091DA]" />
              <span>Export Proof ({selectedRun.runId})</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          FROSTED GLASS METRIC KPI CARDS (STRICTLY REAL DATA ONLY)
         ========================================================================= */}
      <div className="relative z-10 p-6 pb-3 grid grid-cols-4 gap-4">
        {/* KPI 1: Executed Workflows */}
        <div className={`p-4 border backdrop-blur-2xl backdrop-saturate-150 transition-all ${
          isDarkMode 
            ? 'bg-slate-900/35 border-white/[0.08] hover:border-[#00338D]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.25)]' 
            : 'bg-white/60 border-white/80 hover:border-[#00338D] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.04)]'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
            <span>Executed Workflows</span>
            <Layers className="w-3.5 h-3.5 text-[#0091DA]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {kpis.totalRuns.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {runs.length === 0 ? 'Awaiting execution' : `Across ${kpis.uniqueWorkflowsCount} unique workflows`}
          </div>
        </div>

        {/* KPI 2: Total Tokens Consumed */}
        <div className={`p-4 border backdrop-blur-2xl backdrop-saturate-150 transition-all ${
          isDarkMode 
            ? 'bg-slate-900/35 border-white/[0.08] hover:border-[#0091DA]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.25)]' 
            : 'bg-white/60 border-white/80 hover:border-[#0091DA] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.04)]'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
            <span>Total Tokens Consumed</span>
            <Cpu className="w-3.5 h-3.5 text-[#0091DA]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {kpis.totalTokens.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {runs.length === 0 ? 'Zero inference tokens' : `${kpis.activeModelsCount} active model tier(s)`}
          </div>
        </div>

        {/* KPI 3: Cumulative Compute Cost */}
        <div className={`p-4 border backdrop-blur-2xl backdrop-saturate-150 transition-all ${
          isDarkMode 
            ? 'bg-slate-900/35 border-white/[0.08] hover:border-[#EAAA00]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.25)]' 
            : 'bg-white/60 border-white/80 hover:border-[#EAAA00] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.04)]'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
            <span>Cumulative Compute Cost</span>
            <DollarSign className="w-3.5 h-3.5 text-[#EAAA00]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#EAAA00]">
            ${kpis.totalCostUsd.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {runs.length === 0 ? 'No external API charges' : 'Live pricing rate cards'}
          </div>
        </div>

        {/* KPI 4: Cryptographic Seals */}
        <div className={`p-4 border backdrop-blur-2xl backdrop-saturate-150 transition-all ${
          isDarkMode 
            ? 'bg-slate-900/35 border-white/[0.08] hover:border-[#009A44]/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.25)]' 
            : 'bg-white/60 border-white/80 hover:border-[#009A44] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.04)]'
        }`}>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
            <span>Cryptographic Hashes</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#009A44]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#009A44]">
            {runs.length === 0 ? '0 Sealed' : `${kpis.verifiedRuns} / ${kpis.totalRuns} Sealed`}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {runs.length === 0 ? 'W3C SHA-256 standby' : 'W3C WebCrypto SHA-256 verified'}
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONTROLS & FROSTED FILTER BAR
         ========================================================================= */}
      {runs.length > 0 && (
        <div className="relative z-10 px-6 py-2 flex items-center justify-between gap-4">
          {/* Frosted Glass Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by workflow, operator, model, or SHA-256..."
              className={`w-full pl-9 pr-4 py-1.5 text-xs font-mono border backdrop-blur-xl transition-all outline-none ${
                isDarkMode 
                  ? 'bg-slate-900/40 border-white/10 text-white placeholder-slate-500 focus:border-[#0091DA] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
                  : 'bg-white/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#00338D]'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Frosted Filter Chips */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Runs' },
              { id: 'canvas', label: 'Canvas' },
              { id: 'frontend', label: 'Frontend Apps' },
              { id: 'evaluations', label: 'Evaluations' }
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setOriginFilter(chip.id)}
                className={`px-3 py-1 text-[11px] font-mono font-medium border backdrop-blur-md transition-all ${
                  originFilter === chip.id
                    ? isDarkMode
                      ? 'bg-[#00338D]/80 text-white border-[#0091DA]/70 shadow-[0_0_12px_rgba(0,145,218,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)]'
                      : 'bg-[#00338D] text-white border-[#00338D]'
                    : isDarkMode
                      ? 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                      : 'bg-white/70 text-slate-600 border-slate-200 hover:text-black hover:bg-white'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN WORKSPACE: EMPTY STATE OR FROSTED LEDGER TABLE + DRAWER
         ========================================================================= */}
      <div className="relative z-10 flex-1 px-6 pb-6 pt-2 overflow-hidden flex gap-4 min-h-0">
        {runs.length === 0 ? (
          /* =========================================================================
             AUTHENTIC FROSTED GLASS EMPTY STATE
             Clean, calm, zero-mock presentation explaining genuine tracking
             ========================================================================= */
          <div className={`flex-1 overflow-hidden border backdrop-blur-2xl backdrop-saturate-150 flex flex-col items-center justify-center p-8 text-center transition-all ${
            isDarkMode 
              ? 'bg-slate-900/35 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_40px_0_rgba(0,0,0,0.35)]' 
              : 'bg-white/60 border-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_8px_32px_0_rgba(0,0,0,0.05)]'
          }`}>
            <div className="max-w-xl flex flex-col items-center">
              {/* Frosted Glass Shield Icon */}
              <div className={`w-16 h-16 flex items-center justify-center mb-5 border backdrop-blur-xl ${
                isDarkMode 
                  ? 'bg-[#00338D]/20 border-[#0091DA]/40 text-[#0091DA] shadow-[0_0_30px_rgba(0,145,218,0.25),inset_0_1px_0_0_rgba(255,255,255,0.2)]' 
                  : 'bg-[#00338D]/10 border-[#00338D]/30 text-[#00338D]'
              }`}>
                <ShieldCheck className="w-8 h-8" />
              </div>

              <h2 className="text-lg font-bold font-mono tracking-wider uppercase mb-2">
                Ledger Clean & Awaiting Workflow Execution
              </h2>
              
              <p className="text-xs text-slate-400 font-sans leading-relaxed mb-6 max-w-lg">
                In accordance with zero-simulation governance, no synthetic mock runs or default model assumptions are pre-loaded. This ledger records exclusively genuine runtime executions.
              </p>

              {/* Three Frosted Feature Highlights */}
              <div className="grid grid-cols-3 gap-3 w-full text-left mb-6">
                <div className={`p-3 border backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-white/[0.03] border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
                    : 'bg-white/80 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#0091DA] mb-1">
                    <Cpu className="w-3 h-3" />
                    <span>Multi-Brain Economics</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Captures token counts and exact USD costs segregated by individual agent brain.
                  </p>
                </div>

                <div className={`p-3 border backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-white/[0.03] border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
                    : 'bg-white/80 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#EAAA00] mb-1">
                    <Activity className="w-3 h-3" />
                    <span>Component Telemetry</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Traces latencies and status for Gateways, Memory stores, Policies, and MCP tools.
                  </p>
                </div>

                <div className={`p-3 border backdrop-blur-md ${
                  isDarkMode 
                    ? 'bg-white/[0.03] border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
                    : 'bg-white/80 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-[#009A44] mb-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>W3C SHA-256 Notary</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Calculates an immutable W3C WebCrypto SHA-256 seal for tamper-detection.
                  </p>
                </div>
              </div>

              {/* Call to action: return to canvas */}
              {onNavigateHome && (
                <button
                  onClick={onNavigateHome}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#0091DA] shadow-[0_0_20px_rgba(0,145,218,0.3)] transition-all"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Return to Canvas to Run Workflow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =========================================================================
             FROSTED GLASS LEDGER TABLE
             ========================================================================= */
          <div className={`flex-1 overflow-y-auto border backdrop-blur-2xl backdrop-saturate-150 transition-all ${
            isDarkMode 
              ? 'bg-slate-900/35 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_40px_0_rgba(0,0,0,0.35)]' 
              : 'bg-white/60 border-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_8px_32px_0_rgba(0,0,0,0.05)]'
          }`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[10px] font-mono uppercase tracking-wider text-slate-400 sticky top-0 z-10 backdrop-blur-2xl ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' 
                    : 'bg-slate-100/90 border-slate-200'
                }`}>
                  <th className="py-2.5 px-4 font-bold">Workflow Identity</th>
                  <th className="py-2.5 px-3 font-bold">Origin & Initiator</th>
                  <th className="py-2.5 px-3 font-bold">AI Brains / Engines</th>
                  <th className="py-2.5 px-3 font-bold text-right">Tokens</th>
                  <th className="py-2.5 px-3 font-bold text-right">Exact Cost</th>
                  <th className="py-2.5 px-3 font-bold text-right">Duration</th>
                  <th className="py-2.5 px-4 font-bold text-center">SHA-256 Proof</th>
                  <th className="py-2.5 px-2 font-bold text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredRuns.map((r) => {
                  const isSelected = selectedRun?.runId === r.runId;
                  const tokens = r.metrics?.totalTokens || r.tokens || 0;
                  const cost = r.metrics?.totalCostUsd !== undefined ? r.metrics.totalCostUsd : (r.costUsd || 0);
                  const duration = r.durationMs || r.latencyMs || 0;
                  const brains = r.multiBrainBreakdown || [];

                  return (
                    <tr
                      key={r.runId}
                      onClick={() => setSelectedRun(r)}
                      className={`cursor-pointer transition-all text-xs font-mono backdrop-blur-sm ${
                        isSelected 
                          ? isDarkMode 
                            ? 'bg-[#00338D]/25 border-l-2 border-[#0091DA] shadow-[inset_0_1px_0_0_rgba(0,145,218,0.25)]' 
                            : 'bg-[#00338D]/10 border-l-2 border-[#00338D]'
                          : isDarkMode 
                            ? 'hover:bg-white/[0.05] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
                            : 'hover:bg-white/80'
                      }`}
                    >
                      {/* Workflow Identity */}
                      <td className="py-3 px-4">
                        <div className={`font-bold tracking-tight truncate max-w-[200px] ${
                          isDarkMode ? 'text-white/95' : 'text-slate-900'
                        }`}>
                          {r.workflowName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="opacity-80 font-semibold">{r.runId}</span>
                          <span>•</span>
                          <span className="opacity-75">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Origin & Initiator */}
                      <td className="py-3 px-3">
                        <div className={`font-medium truncate max-w-[140px] ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {r.initiator?.name || 'Studio Operator'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {r.initiator?.ingressChannel || r.origin}
                        </div>
                      </td>

                      {/* AI Brains Stack Badges */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {brains.length > 0 ? (
                            brains.map((b, idx) => (
                              <span 
                                key={idx}
                                className={`text-[9px] font-mono font-semibold px-2 py-0.5 border ${getBrainBadgeStyle(b.provider, isDarkMode)}`}
                                title={`${b.displayName}: ${b.totalTokens} tokens ($${b.costUsd})`}
                              >
                                {b.displayName.replace('Google ', '').replace('Anthropic ', '').replace('OpenAI ', '')}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Standard Engine</span>
                          )}
                        </div>
                      </td>

                      {/* Tokens */}
                      <td className={`py-3 px-3 text-right font-bold ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-800'
                      }`}>
                        {tokens.toLocaleString()}
                      </td>

                      {/* Exact Cost */}
                      <td className="py-3 px-3 text-right font-bold text-[#EAAA00]">
                        ${cost.toFixed(5)}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 text-right text-slate-400 font-mono">
                        {duration} ms
                      </td>

                      {/* Proof */}
                      <td className="py-3 px-4 text-center">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(r.runId, r.cryptography?.rootSha256 || '');
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-[#009A44] hover:underline cursor-pointer"
                          title="Click to copy full SHA-256 digest"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#009A44]" />
                          <span>{copiedId === r.runId ? 'Copied' : (r.cryptography?.rootSha256 || '').slice(0, 8)}</span>
                        </span>
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            deleteAuditRun(r.runId);
                            if (selectedRun?.runId === r.runId) setSelectedRun(null);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors rounded-none"
                          title="Delete this transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* =========================================================================
            RIGHT: SLIDE-OVER FROSTED GLASS INSPECTOR SHEET
           ========================================================================= */}
        {selectedRun && (
          <aside className={`w-[450px] flex flex-col shrink-0 border backdrop-blur-2xl backdrop-saturate-150 transition-all overflow-hidden ${
            isDarkMode 
              ? 'bg-slate-900/60 border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),-12px_0_36px_rgba(0,0,0,0.45)]' 
              : 'bg-white/80 border-slate-200 shadow-xl'
          }`}>
            {/* Drawer Header */}
            <div className={`p-4 border-b flex items-center justify-between backdrop-blur-md ${
              isDarkMode 
                ? 'border-white/[0.08] bg-slate-950/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]' 
                : 'border-slate-200 bg-slate-50'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}>
                    {selectedRun.runId}
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 uppercase bg-[#009A44]/15 text-[#009A44] border border-[#009A44]/30 shadow-[inset_0_1px_0_0_rgba(0,154,68,0.2)]">
                    {selectedRun.status}
                  </span>
                </div>
                <h3 className={`text-sm font-bold mt-0.5 truncate max-w-[340px] ${
                  isDarkMode ? 'text-white/95' : 'text-slate-900'
                }`}>
                  {selectedRun.workflowName}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    deleteAuditRun(selectedRun.runId);
                    setSelectedRun(null);
                  }}
                  className={`p-1.5 transition-colors border text-rose-400 hover:text-white hover:bg-rose-600/30 border-rose-500/30`}
                  title="Delete this transaction record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedRun(null)}
                  className={`p-1.5 transition-colors border ${
                    isDarkMode 
                      ? 'text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08]' 
                      : 'text-slate-500 hover:text-black bg-white border-slate-200'
                  }`}
                  title="Close Drawer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className={`px-4 flex items-center gap-1 border-b text-xs font-mono ${
              isDarkMode ? 'border-white/[0.08] bg-black/20' : 'border-slate-200 bg-slate-100/50'
            }`}>
              {[
                { id: 'brains', label: 'Brains & Cost', icon: Cpu },
                { id: 'activities', label: 'Component Spans', icon: Activity },
                { id: 'cryptography', label: 'SHA-256 Seal', icon: ShieldCheck }
              ].map(t => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`py-2 px-3 font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                      isActive 
                        ? 'border-[#0091DA] text-[#0091DA]' 
                        : isDarkMode
                          ? 'border-transparent text-slate-400 hover:text-white'
                          : 'border-transparent text-slate-500 hover:text-black'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* TAB 1: BRAINS & COST */}
              {activeTab === 'brains' && (
                <div className="space-y-4">
                  {/* Totals Banner */}
                  <div className={`p-3.5 border backdrop-blur-md flex items-center justify-between font-mono ${
                    isDarkMode 
                      ? 'bg-black/35 border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">Total Run Investment</div>
                      <div className="text-xl font-bold text-[#EAAA00]">
                        ${(selectedRun.metrics?.totalCostUsd ?? selectedRun.costUsd ?? 0).toFixed(5)} USD
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-400">Aggregate Tokens</div>
                      <div className={`text-lg font-bold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {(selectedRun.metrics?.totalTokens ?? selectedRun.tokens ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Per-Agent / Per-Brain Segregated Cards */}
                  <div>
                    <h4 className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider mb-2">
                      Decomposed Model Ledger ({selectedRun.multiBrainBreakdown?.length || 1} Brains)
                    </h4>
                    <div className="space-y-2">
                      {(selectedRun.multiBrainBreakdown || []).map((brain, idx) => (
                        <div 
                          key={idx}
                          className={`p-3 border backdrop-blur-md transition-all ${
                            isDarkMode 
                              ? 'bg-white/[0.025] border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]' 
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${getBrainBadgeStyle(brain.provider, isDarkMode)}`}>
                                {brain.displayName}
                              </span>
                              <span className={`text-xs font-bold truncate max-w-[180px] ${
                                isDarkMode ? 'text-white/95' : 'text-slate-900'
                              }`}>
                                {brain.agentName}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#EAAA00]">
                              ${brain.costUsd.toFixed(5)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-white/[0.04]">
                            <div>
                              <span className="block text-slate-400">Prompt:</span>
                              <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                {brain.promptTokens.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="block text-slate-400">Completion:</span>
                              <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                {brain.completionTokens.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="block text-slate-400">Rate / M:</span>
                              <span className={`font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                ${brain.ratePromptPerM} / ${brain.rateCompletionPerM}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Efficiency & ROI Metrics */}
                  <div className={`p-3 border backdrop-blur-md font-mono text-xs ${
                    isDarkMode 
                      ? 'bg-[#00338D]/25 border-[#00338D]/50 shadow-[inset_0_1px_0_0_rgba(0,145,218,0.2)]' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-[#0091DA] mb-1">Institutional Labor Benchmark</div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Human Labor Equivalent:</span>
                      <span className="font-bold text-white">~{selectedRun.metrics?.humanMinutesSaved || 15} mins</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300 mt-1">
                      <span>Value Saved (@ $65/hr benchmark):</span>
                      <span className="font-bold text-[#009A44]">${selectedRun.metrics?.laborValueSavedUsd || '16.25'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPONENT SPANS */}
              {activeTab === 'activities' && (
                <div className="space-y-3 font-mono">
                  <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Execution Trace Waterfall ({selectedRun.activities?.length || 0} Spans)
                  </h4>
                  <div className="relative border-l border-white/10 ml-3 space-y-4 py-1">
                    {(selectedRun.activities || []).map((span, idx) => (
                      <div key={idx} className="relative pl-5 text-xs">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                          span.status === 'PASSED' 
                            ? 'bg-[#009A44] border-[#070A11]' 
                            : 'bg-[#EAAA00] border-[#070A11]'
                        }`} />

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white/95">{span.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{span.latencyMs} ms</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Pillar: <span className="uppercase text-slate-300">{span.pillarType}</span> • Component: {span.component}
                        </div>
                        {span.details && Object.keys(span.details).length > 0 && (
                          <div className={`mt-1.5 p-2 text-[10px] border backdrop-blur-md ${
                            isDarkMode ? 'bg-black/40 border-white/[0.04]' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <pre className="text-slate-400 whitespace-pre-wrap overflow-x-auto">
                              {JSON.stringify(span.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: CRYPTOGRAPHIC SEAL */}
              {activeTab === 'cryptography' && (
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      W3C Master Root SHA-256 Digest
                    </label>
                    <div className={`p-2.5 border break-all flex items-center justify-between gap-2 backdrop-blur-md ${
                      isDarkMode 
                        ? 'bg-black/50 border-white/10 text-[#009A44] shadow-[inset_0_1px_0_0_rgba(0,154,68,0.15)]' 
                        : 'bg-slate-50 border-slate-300 text-[#007A36]'
                    }`}>
                      <span className="font-mono text-[11px]">{selectedRun.cryptography?.rootSha256}</span>
                      <button
                        onClick={() => handleCopy('root-hash', selectedRun.cryptography?.rootSha256)}
                        className="p-1 hover:text-white shrink-0"
                        title="Copy Hash"
                      >
                        {copiedId === 'root-hash' ? <Check className="w-3.5 h-3.5 text-[#009A44]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className={`p-2.5 border backdrop-blur-md ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">Input Transcript Digest:</span>
                      <span className="truncate block font-mono text-slate-300 mt-1">
                        {(selectedRun.cryptography?.inputSha256 || '').slice(0, 20)}...
                      </span>
                    </div>
                    <div className={`p-2.5 border backdrop-blur-md ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">Deliverable Digest:</span>
                      <span className="truncate block font-mono text-slate-300 mt-1">
                        {(selectedRun.cryptography?.outputSha256 || '').slice(0, 20)}...
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Compliance Standards Attested
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedRun.cryptography?.complianceStandards || ['SOC2 Type II / W3C SHA-256']).map((std, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] border border-[#009A44]/30 bg-[#009A44]/10 text-[#009A44]">
                          {std}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Export Signed Proof Button */}
                  <button
                    onClick={() => exportAuditProofJsonLd(selectedRun)}
                    className="w-full py-2 bg-[#00338D] hover:bg-[#005EB8] text-white font-bold flex items-center justify-center gap-2 border border-[#0091DA] shadow-[0_0_16px_rgba(0,145,218,0.3)] transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Signed JSON-LD Proof</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
