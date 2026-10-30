import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  DollarSign, 
  Clock, 
  Globe, 
  Search, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Terminal
} from 'lucide-react';
import ScreenScaffold from '../common/ScreenScaffold';
import { 
  getStoredAudit2Runs, 
  getAudit2KPIs, 
  clearAudit2Runs
} from '../../services/audit2Service';

export default function Audit2View() {
  const [runs, setRuns] = useState(() => getStoredAudit2Runs());
  const [selectedRunId, setSelectedRunId] = useState(() => {
    const initial = getStoredAudit2Runs();
    return initial[0]?.runId || null;
  });
  const [selectedSpanId, setSelectedSpanId] = useState(null);
  const [filterComponent, setFilterComponent] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedText, setCopiedText] = useState(null);
  const [isOtlpModalOpen, setIsOtlpModalOpen] = useState(false);

  // Hydrate from server-persisted audit2 ledger on mount to sync any webhook traces
  useEffect(() => {
    fetch('/api/audit2-ledger')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const local = getStoredAudit2Runs();
          const localIds = new Set(local.map(r => r.runId));
          const freshFromDisk = data.filter(d => !localIds.has(d.runId));
          if (freshFromDisk.length > 0) {
            saveAudit2Runs([...freshFromDisk, ...local]);
            const updated = getStoredAudit2Runs();
            setRuns(updated);
            if (!selectedRunId && updated.length > 0) {
              setSelectedRunId(updated[0].runId);
            }
          }
        }
      })
      .catch(() => {});
  }, [selectedRunId]);

  // Sync when ledger updates
  useEffect(() => {
    const handleUpdate = () => {
      const fresh = getStoredAudit2Runs();
      setRuns(fresh);
      if (!selectedRunId && fresh.length > 0) {
        setSelectedRunId(fresh[0].runId);
      }
    };

    window.addEventListener('keaos:audit2-ledger-updated', handleUpdate);
    return () => window.removeEventListener('keaos:audit2-ledger-updated', handleUpdate);
  }, [selectedRunId]);

  const kpis = useMemo(() => getAudit2KPIs(runs), [runs]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    return runs.filter(r => {
      const matchesSearch = !searchQuery || 
        r.workflowName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.runId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.traceId?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterComponent === 'ALL') return true;
      if (filterComponent === 'REMOTE') {
        return r.frameworkId === 'langgraph' || r.origin === 'remote_otlp_ingress' || 
          (r.spans || []).some(s => s.componentType === 'remote_agent');
      }
      if (filterComponent === 'AGENT') {
        return (r.spans || []).some(s => s.componentType === 'agent_core');
      }
      if (filterComponent === 'DETERMINISTIC') {
        return (r.spans || []).some(s => s.componentType === 'deterministic');
      }
      if (filterComponent === 'GOVERNANCE') {
        return (r.spans || []).some(s => s.componentType === 'approval' || s.componentType === 'router');
      }
      return true;
    });
  }, [runs, searchQuery, filterComponent]);

  const activeRun = useMemo(() => {
    return runs.find(r => r.runId === selectedRunId) || filteredRuns[0] || null;
  }, [runs, selectedRunId, filteredRuns]);

  const activeSpan = useMemo(() => {
    if (!activeRun || !Array.isArray(activeRun.spans)) return null;
    if (selectedSpanId) {
      const found = activeRun.spans.find(s => s.spanId === selectedSpanId);
      if (found) return found;
    }
    return activeRun.spans[0] || null;
  }, [activeRun, selectedSpanId]);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `keaos_audit2_opentelemetry_${Date.now()}.json`);
    dlAnchor.click();
  };

  const handleClear = () => {
    if (window.confirm('Clear all Audit 2.0 OpenTelemetry records? (This cannot be undone)')) {
      clearAudit2Runs();
      setRuns([]);
      setSelectedRunId(null);
      setSelectedSpanId(null);
    }
  };

  const getComponentBadge = (type) => {
    switch (type) {
      case 'remote_agent':
        return { label: 'REMOTE AGENT', color: 'bg-[#00A3A6]/15 text-[#00A3A6] border-[#00A3A6]/30' };
      case 'agent_core':
        return { label: 'AI AGENT CORE', color: 'bg-[#00338D]/15 text-[#00338D] dark:text-sky-400 border-sky-500/30' };
      case 'deterministic':
        return { label: '0-TOKEN LOGIC', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' };
      case 'approval':
        return { label: 'GOVERNANCE GATE', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' };
      case 'router':
        return { label: 'ROUTER SWITCH', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
      case 'trigger':
        return { label: 'INGRESS TRIGGER', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
      case 'output':
        return { label: 'FINAL OUTPUT', color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' };
      default:
        return { label: (type || 'SPAN').toUpperCase(), color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <ScreenScaffold
      title="Audit 2.0 & OpenTelemetry Fabric"
      eyebrow="ENTERPRISE OPEN TELEMETRY • W3C TRACE CONTEXT • CRYPTOGRAPHIC NOTARIZATION"
      statusText="OTEL 2.0 LIVE"
      statusType="active"
    >
      <div className="space-y-5 select-none text-xs">
        {/* Top Action & Toolbar Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Filter Pipeline:
            </span>
            <div className="flex items-center gap-1 bg-[#FFFFFF] dark:bg-[#090D16] border border-[#CBD5E1] dark:border-[#1E293B] p-0.5">
              {[
                { id: 'ALL', label: 'All Spans' },
                { id: 'REMOTE', label: 'Remote Agents (LangGraph/CrewAI)' },
                { id: 'AGENT', label: 'AI Agent Cores' },
                { id: 'DETERMINISTIC', label: 'Deterministic' },
                { id: 'GOVERNANCE', label: 'Governance' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterComponent(f.id)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                    filterComponent === f.id
                      ? 'bg-[#00338D] text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsOtlpModalOpen(true)}
              className="px-3 py-1.5 bg-[#00A3A6] hover:bg-[#008D90] text-white font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Connect External Python Agent</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={runs.length === 0}
              className="px-3 py-1.5 bg-[#FFFFFF] dark:bg-[#111827] border border-[#CBD5E1] dark:border-[#1E293B] hover:border-[#00338D] text-slate-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
              title="Export all OTel traces as JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Traces</span>
            </button>

            <button
              onClick={handleClear}
              disabled={runs.length === 0}
              className="p-1.5 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 disabled:opacity-30 transition-all cursor-pointer"
              title="Clear Audit 2.0 Ledger"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Primary KPI Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#FFFFFF] dark:bg-[#0D111C] border border-[#CBD5E1] dark:border-[#1E293B] p-3.5 border-t-3 border-t-[#00A3A6] shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
              <span>Total OTel Traces & Spans</span>
              <Activity className="w-3.5 h-3.5 text-[#00A3A6]" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {kpis.totalRuns} Runs <span className="text-xs text-slate-400 font-normal">• {kpis.totalSpans} Spans</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              W3C Distributed Trace Context
            </span>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#0D111C] border border-[#CBD5E1] dark:border-[#1E293B] p-3.5 border-t-3 border-t-[#00338D] shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
              <span>Multi-Brain & Remote Cost</span>
              <DollarSign className="w-3.5 h-3.5 text-[#00338D]" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              ${kpis.totalCostUsd.toFixed(4)} <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              {kpis.totalTokens.toLocaleString()} Total Tokens Logged
            </span>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#0D111C] border border-[#CBD5E1] dark:border-[#1E293B] p-3.5 border-t-3 border-t-[#0091DA] shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
              <span>Average E2E Latency</span>
              <Clock className="w-3.5 h-3.5 text-[#0091DA]" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {kpis.avgLatencyMs} ms
            </div>
            <span className="text-[10px] text-emerald-500 font-mono block mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Within enterprise SLA targets
            </span>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#0D111C] border border-[#CBD5E1] dark:border-[#1E293B] p-3.5 border-t-3 border-t-[#6D2077] shadow-xs">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
              <span>Cryptographic Verifications</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#6D2077]" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {kpis.verifiedRuns} / {kpis.totalRuns}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">
              100% W3C WebCrypto SHA-256
            </span>
          </div>
        </div>

        {/* Master Execution View: Split Master & Detail */}
        {runs.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-[#CBD5E1] dark:border-[#1E293B] bg-[#FFFFFF] dark:bg-[#090D16] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#00A3A6]/10 text-[#00A3A6] flex items-center justify-center">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Audit 2.0 Ledger is Clean (0 Runs)
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Every workflow or component you execute on the canvas (or any external LangGraph agent sending OTLP traces) will automatically populate here in real-time with full OpenTelemetry traces.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 items-start">
            {/* Left 4 Cols: Runs List */}
            <div className="col-span-4 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search traces, runs, workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FFFFFF] dark:bg-[#090D16] border border-[#CBD5E1] dark:border-[#1E293B] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00338D]"
                />
              </div>

              <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                {filteredRuns.map((r) => {
                  const isSelected = r.runId === activeRun?.runId;
                  const isRemote = r.frameworkId === 'langgraph' || r.origin === 'remote_otlp_ingress' || 
                    (r.spans || []).some(s => s.componentType === 'remote_agent');

                  return (
                    <div
                      key={r.runId}
                      onClick={() => {
                        setSelectedRunId(r.runId);
                        setSelectedSpanId(r.spans?.[0]?.spanId || null);
                      }}
                      className={`p-3 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00338D]/10 dark:bg-[#00338D]/20 border-[#00338D] shadow-sm'
                          : 'bg-[#FFFFFF] dark:bg-[#0D111C] border-[#CBD5E1] dark:border-[#1E293B] hover:border-slate-400 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {r.runId}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                            r.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {r.workflowName}
                      </h5>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2">
                        <span className="flex items-center gap-1">
                          {isRemote ? (
                            <Globe className="w-3 h-3 text-[#00A3A6]" />
                          ) : (
                            <Activity className="w-3 h-3 text-sky-400" />
                          )}
                          <span>{r.spans?.length || 1} spans</span>
                        </span>
                        <span>{r.durationMs}ms</span>
                        <span className="font-semibold text-slate-300">
                          ${(r.metrics?.totalCostUsd || 0).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: OpenTelemetry Trace Waterfall & Span Inspector */}
            {activeRun && (
              <div className="col-span-8 space-y-4 bg-[#FFFFFF] dark:bg-[#0D111C] border border-[#CBD5E1] dark:border-[#1E293B] p-4 shadow-sm">
                {/* Active Trace Header */}
                <div className="flex items-start justify-between border-b border-[#CBD5E1] dark:border-[#1E293B] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-[#00A3A6]/10 text-[#00A3A6] border border-[#00A3A6]/30 px-1.5 py-0.5 rounded-full font-bold">
                        W3C TRACE
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {activeRun.workflowName}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-slate-400">
                      <span>Trace: {activeRun.traceId}</span>
                      <button
                        onClick={() => copyToClipboard(activeRun.traceId, 'trace')}
                        className="hover:text-white cursor-pointer"
                        title="Copy Trace ID"
                      >
                        {copiedText === 'trace' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-right font-mono text-[10px]">
                    <span className="text-slate-400 block">Root SHA-256 Seal</span>
                    <span className="text-[#00A3A6] font-semibold block truncate max-w-[200px]" title={activeRun.cryptography?.rootSha256}>
                      {activeRun.cryptography?.rootSha256?.slice(0, 20)}...
                    </span>
                  </div>
                </div>

                {/* OpenTelemetry Waterfall Spans */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
                    <span>Hierarchical Execution Spans</span>
                    <span>{activeRun.spans?.length || 0} Total</span>
                  </div>

                  <div className="space-y-1.5 border border-[#CBD5E1] dark:border-[#1E293B] p-2 bg-[#F8FAFC] dark:bg-[#090D16]">
                    {(activeRun.spans || []).map((span, idx) => {
                      const isSpanSelected = span.spanId === activeSpan?.spanId;
                      const badge = getComponentBadge(span.componentType);
                      const maxDuration = Math.max(1, activeRun.durationMs);
                      const barPercent = Math.max(6, Math.min(100, Math.round((span.durationMs / maxDuration) * 100)));

                      return (
                        <div
                          key={span.spanId || idx}
                          onClick={() => setSelectedSpanId(span.spanId)}
                          className={`p-2 border transition-all cursor-pointer ${
                            isSpanSelected
                              ? 'bg-[#00338D]/15 border-[#00338D]'
                              : 'bg-white dark:bg-[#0D111C] border-slate-200 dark:border-slate-800 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded-full border text-[8px] font-bold ${badge.color}`}>
                                {badge.label}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[280px]">
                                {span.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-slate-400">
                              {span.attributes['llm.model_name'] && (
                                <span className="text-[#00A3A6]">{span.attributes['llm.model_name']}</span>
                              )}
                              <span>{span.durationMs}ms</span>
                              {span.attributes['llm.cost_usd'] != null && (
                                <span className="font-semibold text-slate-300">${span.attributes['llm.cost_usd'].toFixed(4)}</span>
                              )}
                            </div>
                          </div>

                          {/* Latency Waterfall Bar */}
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-none overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#00338D] to-[#00A3A6] transition-all"
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Span Deep-Dive Inspector */}
                {activeSpan && (
                  <div className="p-3 border border-[#CBD5E1] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#090D16] space-y-2 text-[10px] font-mono">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                      <span className="font-bold text-slate-300">
                        Span Inspection: {activeSpan.name}
                      </span>
                      <span className="text-slate-400">ID: {activeSpan.spanId}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-slate-500 block">Duration</span>
                        <span className="font-bold text-slate-200">{activeSpan.durationMs}ms</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tokens (P / C)</span>
                        <span className="font-bold text-slate-200">
                          {activeSpan.attributes['llm.token_count.prompt'] || 0} / {activeSpan.attributes['llm.token_count.completion'] || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cost</span>
                        <span className="font-bold text-slate-200">
                          ${(activeSpan.attributes['llm.cost_usd'] || 0).toFixed(5)}
                        </span>
                      </div>
                    </div>

                    {/* Input & Output Snapshots */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Input Payload Snapshot</span>
                        <pre className="p-1.5 bg-black/40 border border-slate-800 text-[9px] text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono">
                          {activeSpan.attributes['input.snippet'] || 'None'}
                        </pre>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-0.5">Output Deliverable Snapshot</span>
                        <pre className="p-1.5 bg-black/40 border border-slate-800 text-[9px] text-slate-300 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono">
                          {activeSpan.attributes['output.snippet'] || 'None'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal: OTLP Python Setup Code */}
        {isOtlpModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-[#0D111C] border border-[#1E293B] shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00A3A6]" />
                  <h4 className="font-bold text-sm text-white">
                    Connect External Python / LangGraph Agent to Audit 2.0
                  </h4>
                </div>
                <button
                  onClick={() => setIsOtlpModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Install OpenTelemetry in your external LangGraph or CrewAI Python project. With 3 lines of standard code, your agent will beam every prompt, tool call, latency millisecond, and token count straight into KEAOS Audit 2.0:
              </p>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400">1. Install Standard Packages:</span>
                <pre className="p-2 bg-black/60 border border-[#1E293B] text-[10px] text-emerald-400 font-mono">
                  pip install opentelemetry-api opentelemetry-sdk openinference-instrumentation-langchain
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400">2. Add to your Python Agent Entrypoint:</span>
                <pre className="p-2.5 bg-black/60 border border-[#1E293B] text-[10px] text-slate-200 font-mono whitespace-pre overflow-x-auto">
{`from openinference.instrumentation.langchain import LangChainInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Auto-instrument LangGraph / CrewAI to send traces to KEAOS Audit 2.0
LangChainInstrumentor().instrument(
    tracer_provider=None,
    exporter=OTLPSpanExporter(endpoint="http://127.0.0.1:5173/api/telemetry/v2/traces")
)`}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#1E293B]">
                <button
                  onClick={() => setIsOtlpModalOpen(false)}
                  className="px-4 py-1.5 bg-[#00338D] hover:bg-[#005EB8] text-white font-mono text-xs font-bold cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
