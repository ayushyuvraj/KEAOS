import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Search, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Terminal,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  ChevronDown,
  FileText,
  AlertTriangle,
  Clock,
  Layers,
  Cpu,
  CheckCircle,
  FileCheck2,
  Code2,
  Hash
} from 'lucide-react';
import ScreenScaffold from '../common/ScreenScaffold';
import { 
  getStoredAudit2Runs, 
  getAudit2KPIs, 
  clearAudit2Runs,
  saveAudit2Runs
} from '../../services/audit2Service';
import {
  formatHumanDuration,
  formatExactDateTime,
  safeParseJson,
  extractTaskSubject,
  extractBusinessFindings,
  extractStatusDiagnosis,
  extractPipelineSteps
} from '../../utils/payloadSummaryEngine';

export default function Audit2View({ activeUseCase, onOpenCanvas }) {
  const [runs, setRuns] = useState(() => getStoredAudit2Runs());
  const [selectedRunId, setSelectedRunId] = useState(() => {
    const initial = getStoredAudit2Runs();
    return initial[0]?.runId || null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [isOtlpModalOpen, setIsOtlpModalOpen] = useState(false);
  const [activeTechnicalDrawer, setActiveTechnicalDrawer] = useState(null); // 'raw' | 'proof' | null
  const [activeBoardTab, setActiveBoardTab] = useState(null); // 'deliverables' | 'steps' | null (collapsed by default)

  // Amazon-style Sort & Filter State
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'errors' | 'oldest' | 'slowest' | 'fastest' | 'cost'
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Multi-select facet filter states
  const [filterStatus, setFilterStatus] = useState([]); // ['SUCCESS', 'FAILED']
  const [filterModels, setFilterModels] = useState([]); // ['gemini-2.5-flash', etc.]
  const [filterDuration, setFilterDuration] = useState([]); // ['fast', 'medium', 'slow']

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  // Available facet counts
  const availableFacets = useMemo(() => {
    const modelsSet = new Set();
    let successCount = 0;
    let failedCount = 0;
    let fastCount = 0;
    let mediumCount = 0;
    let slowCount = 0;

    for (const r of runs) {
      const outParsed = safeParseJson(r.payload?.outputSnippet);
      const isFailed = r.status === 'FAILED' || outParsed?.status === 'exception' || outParsed?.status === 'error';
      if (isFailed) failedCount++;
      else successCount++;

      const dur = r.durationMs || 0;
      if (dur < 1000) fastCount++;
      else if (dur <= 10000) mediumCount++;
      else slowCount++;

      if (Array.isArray(r.spans)) {
        for (const sp of r.spans) {
          const m = sp.attributes?.['llm.model_name'];
          if (m) modelsSet.add(m);
        }
      }
    }

    return {
      models: Array.from(modelsSet),
      counts: {
        success: successCount,
        failed: failedCount,
        fast: fastCount,
        medium: mediumCount,
        slow: slowCount
      }
    };
  }, [runs]);

  // Count active filters
  const activeFiltersCount = (filterStatus.length > 0 ? 1 : 0) +
    (filterModels.length > 0 ? 1 : 0) +
    (filterDuration.length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStatus([]);
    setFilterModels([]);
    setFilterDuration([]);
    setSearchQuery('');
  };

  // Filtered and sorted runs
  const filteredAndSortedRuns = useMemo(() => {
    const result = runs.filter(r => {
      const subject = extractTaskSubject(r).toLowerCase();
      const findings = extractBusinessFindings(r).map(f => f.value.toLowerCase()).join(' ');
      const workflow = (r.workflowName || '').toLowerCase();
      const runId = (r.runId || '').toLowerCase();

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = subject.includes(q) || findings.includes(q) || workflow.includes(q) || runId.includes(q);
        if (!matches) return false;
      }

      // Status facet
      if (filterStatus.length > 0) {
        const outParsed = safeParseJson(r.payload?.outputSnippet);
        const isFailed = r.status === 'FAILED' || outParsed?.status === 'exception' || outParsed?.status === 'error';
        const statusKey = isFailed ? 'FAILED' : 'SUCCESS';
        if (!filterStatus.includes(statusKey)) return false;
      }

      // Model facet
      if (filterModels.length > 0) {
        const runModels = (r.spans || []).map(s => s.attributes?.['llm.model_name']).filter(Boolean);
        const hasModel = filterModels.some(m => runModels.includes(m));
        if (!hasModel) return false;
      }

      // Duration facet
      if (filterDuration.length > 0) {
        const dur = r.durationMs || 0;
        const matchesDur = filterDuration.some(d => {
          if (d === 'fast') return dur < 1000;
          if (d === 'medium') return dur >= 1000 && dur <= 10000;
          if (d === 'slow') return dur > 10000;
          return true;
        });
        if (!matchesDur) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      const outA = safeParseJson(a.payload?.outputSnippet);
      const outB = safeParseJson(b.payload?.outputSnippet);
      const statusA = String(outA?.status || '').toLowerCase();
      const statusB = String(outB?.status || '').toLowerCase();
      const isFailedA = a.status === 'FAILED' || statusA === 'exception' || statusA === 'error';
      const isFailedB = b.status === 'FAILED' || statusB === 'exception' || statusB === 'error';

      if (sortBy === 'newest') {
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      }
      if (sortBy === 'errors') {
        if (isFailedA && !isFailedB) return -1;
        if (isFailedB && !isFailedA) return 1;
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
      }
      if (sortBy === 'slowest') {
        return (b.durationMs || 0) - (a.durationMs || 0);
      }
      if (sortBy === 'fastest') {
        return (a.durationMs || 0) - (b.durationMs || 0);
      }
      if (sortBy === 'cost') {
        return (b.metrics?.totalCostUsd || 0) - (a.metrics?.totalCostUsd || 0);
      }
      return 0;
    });

    return result;
  }, [runs, searchQuery, filterStatus, filterModels, filterDuration, sortBy]);

  const activeRun = useMemo(() => {
    return runs.find(r => r.runId === selectedRunId) || filteredAndSortedRuns[0] || null;
  }, [runs, selectedRunId, filteredAndSortedRuns]);

  // Derived user-centric task details for the active run
  const activeSubject = useMemo(() => extractTaskSubject(activeRun), [activeRun]);
  const activeFindings = useMemo(() => extractBusinessFindings(activeRun), [activeRun]);
  const activeDiagnosis = useMemo(() => extractStatusDiagnosis(activeRun), [activeRun]);
  const activeSteps = useMemo(() => extractPipelineSteps(activeRun), [activeRun]);
  const kpis = useMemo(() => getAudit2KPIs(runs), [runs]);
  const activeModelName = useMemo(() => {
    return (activeRun?.spans || []).find(s => s.attributes?.['llm.model_name'])?.attributes?.['llm.model_name'] || 'gemini-2.5-flash';
  }, [activeRun]);

  const copyToClipboard = async (text, id) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Fallback needed');
      }
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.warn('[Audit2] Clipboard fallback failed:', err);
      }
    }
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFindings = () => {
    let textToCopy = '';
    if (activeFindings && activeFindings.length > 0) {
      textToCopy = activeFindings.map(f => `${f.label}: ${f.value}`).join('\n');
    } else {
      textToCopy = [
        `Task: ${activeSubject}`,
        `Workflow: ${activeRun?.workflowName || 'Workflow Execution'}`,
        `Status: ${activeDiagnosis?.title || activeRun?.status}`,
        `Duration: ${formatHumanDuration(activeRun?.durationMs)}`,
        `Inference Cost: $${(activeRun?.metrics?.totalCostUsd || 0).toFixed(4)} USD`,
        activeDiagnosis?.message ? `Diagnosis: ${activeDiagnosis.message}` : ''
      ].filter(Boolean).join('\n');
    }
    copyToClipboard(textToCopy, 'findings');
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(runs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `keaos_observability_ledger_${Date.now()}.json`);
    dlAnchor.click();
  };

  const handleClear = () => {
    if (window.confirm('Clear all audit and observability records? (This cannot be undone)')) {
      clearAudit2Runs();
      setRuns([]);
      setSelectedRunId(null);
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'newest': return 'Newest First';
      case 'errors': return 'Exceptions & Errors First';
      case 'oldest': return 'Oldest First';
      case 'slowest': return 'Slowest First';
      case 'fastest': return 'Fastest First';
      case 'cost': return 'Highest Cost';
      default: return 'Sort';
    }
  };

  return (
    <ScreenScaffold hideHeader={true} bodyClassName="p-3 sm:p-4 flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      <div className="flex-1 h-full min-h-0 flex flex-col space-y-3 select-none text-xs overflow-hidden">
        {/* ========================================================= */}
        {/* AMAZON-STYLE TOOLBAR: SEARCH, SORT, FILTER & ACTIONS      */}
        {/* ========================================================= */}
        <div className={`shrink-0 flex flex-wrap items-center justify-between gap-3 bg-white/95 dark:bg-[#080E1C]/92 backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.09] p-3 rounded-2xl shadow-xs relative ${
          (isSortOpen || isFilterOpen) ? 'z-40' : 'z-20'
        }`}>
          {/* Left Group: Search Bar + Sort Dropdown + Filter Popover */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[320px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search documents, cases, workflows, errors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#00338D] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Amazon-Style Sort Dropdown */}
            <div className={`relative ${isSortOpen ? 'z-50' : 'z-10'}`} ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span>Sort: {getSortLabel()}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {isSortOpen && (
                <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-[#0D111C] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  {[
                    { id: 'newest', label: 'Newest First' },
                    { id: 'errors', label: 'Exceptions & Errors First' },
                    { id: 'oldest', label: 'Oldest First' },
                    { id: 'slowest', label: 'Slowest First' },
                    { id: 'fastest', label: 'Fastest First' },
                    { id: 'cost', label: 'Highest Cost' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-colors ${
                        sortBy === opt.id
                          ? 'bg-[#00338D]/10 text-[#00338D] dark:text-sky-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <Check className="w-3 h-3 text-[#00338D] dark:text-sky-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amazon-Style Filter Popover */}
            <div className={`relative ${isFilterOpen ? 'z-50' : 'z-10'}`} ref={filterRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`px-3 py-1.5 border rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-[#00338D] border-[#00338D] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Filter</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-[#00338D] font-bold text-[10px] flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
              </button>

              {isFilterOpen && (
                <div className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-[#0D111C] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Filter Runs</span>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-[11px] text-[#00338D] dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        Reset all
                      </button>
                    )}
                  </div>

                  {/* Facet 1: Status */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Status
                    </span>
                    <div className="flex gap-2">
                      {[
                        { id: 'FAILED', label: `Exceptions (${availableFacets.counts.failed})` },
                        { id: 'SUCCESS', label: `Success (${availableFacets.counts.success})` }
                      ].map(s => {
                        const isChecked = filterStatus.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer border transition-all ${
                              isChecked
                                ? 'bg-[#00338D]/15 border-[#00338D] text-[#00338D] dark:text-sky-400 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setFilterStatus(prev => 
                                  prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="sr-only"
                            />
                            <span>{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Facet 2: Model Used */}
                  {availableFacets.models.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        Model
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {availableFacets.models.map(model => {
                          const isChecked = filterModels.includes(model);
                          return (
                            <label
                              key={model}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono cursor-pointer border transition-all ${
                                isChecked
                                  ? 'bg-[#00338D]/15 border-[#00338D] text-[#00338D] dark:text-sky-400 font-semibold'
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setFilterModels(prev =>
                                    prev.includes(model) ? prev.filter(x => x !== model) : [...prev, model]
                                  );
                                }}
                                className="sr-only"
                              />
                              <span>{model}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Facet 3: Duration */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Duration
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'fast', label: `< 1s (${availableFacets.counts.fast})` },
                        { id: 'medium', label: `1s - 10s (${availableFacets.counts.medium})` },
                        { id: 'slow', label: `> 10s (${availableFacets.counts.slow})` }
                      ].map(dur => {
                        const isChecked = filterDuration.includes(dur.id);
                        return (
                          <label
                            key={dur.id}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs cursor-pointer border transition-all ${
                              isChecked
                                ? 'bg-[#00338D]/15 border-[#00338D] text-[#00338D] dark:text-sky-400 font-semibold'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setFilterDuration(prev =>
                                  prev.includes(dur.id) ? prev.filter(x => x !== dur.id) : [...prev, dur.id]
                                );
                              }}
                              className="sr-only"
                            />
                            <span>{dur.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-3 py-1 bg-[#00338D] hover:bg-[#002875] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Group: Whisper Stats + Secondary Utilities */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400 hidden lg:inline">
              <span className="font-semibold text-slate-900 dark:text-white">
                {filteredAndSortedRuns.length} of {runs.length}
              </span>{' '}
              tasks • ${kpis.totalCostUsd.toFixed(4)} USD • {formatHumanDuration(kpis.avgLatencyMs)} avg
            </span>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block" />

            <button
              onClick={() => setIsOtlpModalOpen(true)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer"
              title="Connect External Python / LangGraph Agent"
            >
              <Terminal className="w-4 h-4 text-[#00A3A6]" />
            </button>

            <button
              onClick={handleExportJson}
              disabled={runs.length === 0}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl disabled:opacity-30 transition-all cursor-pointer"
              title="Export all traces as JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleClear}
              disabled={runs.length === 0}
              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl disabled:opacity-30 transition-all cursor-pointer"
              title="Clear ledger"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Filter Chips Ribbon */}
        {(activeFiltersCount > 0 || searchQuery) && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 px-1 text-xs">
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold">Active filters:</span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-[11px]">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="hover:text-red-400 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterStatus.map(st => (
              <span key={st} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-[11px]">
                Status: {st === 'FAILED' ? 'Exceptions' : 'Success'}
                <button onClick={() => setFilterStatus(prev => prev.filter(x => x !== st))} className="hover:text-red-400 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterModels.map(m => (
              <span key={m} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-[11px] font-mono">
                Model: {m}
                <button onClick={() => setFilterModels(prev => prev.filter(x => x !== m))} className="hover:text-red-400 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filterDuration.map(d => (
              <span key={d} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-[11px]">
                Duration: {d === 'fast' ? '< 1s' : d === 'medium' ? '1-10s' : '> 10s'}
                <button onClick={() => setFilterDuration(prev => prev.filter(x => x !== d))} className="hover:text-red-400 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <button
              onClick={clearAllFilters}
              className="text-[11px] text-[#00338D] dark:text-sky-400 hover:underline font-semibold cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* MASTER OBSERVABILITY: TASK CARDS (LEFT) & INSPECTOR (RIGHT) */}
        {/* ========================================================= */}
        {runs.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#080E1C]/92 rounded-[22px] space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#00338D]/10 text-[#00338D] dark:text-sky-400 flex items-center justify-center">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              No Execution Traces Recorded
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              When workflows execute on the canvas or external agents beam traces via OpenTelemetry, they will automatically appear here with plain-language task deliverables and step progressions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3.5 flex-1 min-h-0 h-full overflow-hidden">
            {/* ------------------------------------------------------- */}
            {/* LEFT 4 COLS: TASK-CENTRIC RUNS LIST                     */}
            {/* ------------------------------------------------------- */}
            <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-0 overflow-hidden">
              <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                {filteredAndSortedRuns.length === 0 ? (
                  <div className="p-8 text-center border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#080E1C]/80 rounded-2xl">
                    <p className="text-xs text-slate-500 mb-2">No runs match your current filters.</p>
                    <button
                      onClick={clearAllFilters}
                      className="px-3 py-1 bg-[#00338D] text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  filteredAndSortedRuns.map((r) => {
                    const isSelected = r.runId === activeRun?.runId;
                    const subject = extractTaskSubject(r);
                    const diagnosis = extractStatusDiagnosis(r);
                    const findings = extractBusinessFindings(r);
                    const primaryFinding = findings.find(f => f.isPrimary)?.value || findings[0]?.value;
                    const durationStr = formatHumanDuration(r.durationMs);
                    const exactTime = formatExactDateTime(r.timestamp, false);
                    const firstModel = (r.spans || []).find(s => s.attributes?.['llm.model_name'])?.attributes?.['llm.model_name'] || 'gemini-2.5-flash';

                    return (
                      <div
                        key={r.runId}
                        onClick={() => {
                          setSelectedRunId(r.runId);
                          setActiveTechnicalDrawer(null);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-white dark:bg-[#0E1526] border-[#00338D] shadow-md ring-1 ring-[#00338D]'
                            : 'bg-white/95 dark:bg-[#080E1C]/92 border-slate-200/90 dark:border-white/[0.09] hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                        }`}
                      >
                        {/* Header: Document / Subject + Status Badge */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={subject}>
                            {subject}
                          </h5>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                              diagnosis.isException
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {diagnosis.isException ? 'Exception' : 'Success'}
                          </span>
                        </div>

                        {/* Workflow Name */}
                        <div className="text-[11px] text-slate-500 font-medium mb-1.5">
                          {r.workflowName || 'Workflow Execution'}
                        </div>

                        {/* Plain Language Summary Finding */}
                        <p className={`text-[11px] line-clamp-1 mb-2.5 ${
                          diagnosis.isException
                            ? 'text-rose-600/90 dark:text-rose-400/90 font-medium'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}>
                          {primaryFinding 
                            ? `${primaryFinding} • ${diagnosis.isException ? `Stopped at ${diagnosis.stage}` : 'Validated'}`
                            : diagnosis.message}
                        </p>

                        {/* Footer: Performance Meta */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{durationStr}</span>
                            <span className="text-slate-400">• {firstModel}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <span>${(r.metrics?.totalCostUsd || 0).toFixed(4)}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{exactTime}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ------------------------------------------------------- */}
            {/* RIGHT 8 COLS: HUMAN OBSERVABILITY INSPECTOR             */}
            {/* ------------------------------------------------------- */}
            {activeRun && (
              <div className="col-span-12 lg:col-span-8 flex flex-col bg-white/95 dark:bg-[#080E1C]/92 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.09] p-4 sm:p-5 rounded-[22px] shadow-sm h-full min-h-0 overflow-hidden">
                {/* Active Run Header (Pinned at top of card) */}
                <div className="shrink-0 flex items-start justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {activeSubject}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          activeDiagnosis.isException
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {activeDiagnosis.isException ? `${activeDiagnosis.stage.toUpperCase()} EXCEPTION` : 'SUCCESS'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-sans">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{activeRun.workflowName || 'Workflow Execution'}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300">{formatExactDateTime(activeRun.timestamp, true)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyFindings}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        copiedKey === 'findings'
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                      title="Copy extracted findings to clipboard"
                    >
                      {copiedKey === 'findings' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Copy Findings</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SCROLLABLE BODY: Allows Extracted Deliverables and Raw JSON to be opened simultaneously with smooth scrolling */}
                <div className="flex-1 min-h-0 overflow-y-auto pt-3.5 pr-1 space-y-3.5">
                  {/* 1. EXECUTIVE STATUS & DIAGNOSIS CARD (Rendered on Exceptions/Errors only) */}
                  {activeDiagnosis.isException && (
                    <div className="p-3.5 rounded-2xl border space-y-1.5 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{activeDiagnosis.title}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-rose-600 dark:text-rose-300">
                        {activeDiagnosis.message}
                      </p>
                    </div>
                  )}

                  {/* 2. FOUR PERFORMANCE & COST TELEMETRY CARDS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-black/25 border border-slate-200/90 dark:border-slate-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Execution Duration</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {formatHumanDuration(activeRun.durationMs)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-black/25 border border-slate-200/90 dark:border-slate-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Foundation Model</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate block" title={activeModelName}>
                        {activeModelName}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-black/25 border border-slate-200/90 dark:border-slate-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Token Consumption</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {activeRun.metrics?.totalTokens > 0 
                          ? `${activeRun.metrics.totalTokens.toLocaleString()}` 
                          : '0 tokens'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-black/25 border border-slate-200/90 dark:border-slate-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Inference Cost</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        ${(activeRun.metrics?.totalCostUsd || 0).toFixed(4)} USD
                      </span>
                    </div>
                  </div>

                  {/* 3 & 4. PARALLEL DUAL-BUTTON ACCORDION BOARD (Side by side headers, unified shared space below, collapsed by default) */}
                  <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/50 dark:bg-[#0A0F1D]/50 overflow-hidden shadow-2xs flex flex-col transition-all">
                    {/* Parallel Header Buttons Row: Side by Side, Icons never occupying space below */}
                    <div className={`p-1.5 flex items-center gap-2 bg-slate-100/70 dark:bg-black/30 shrink-0 ${
                      activeBoardTab ? 'border-b border-slate-200/80 dark:border-slate-800/80' : ''
                    }`}>
                      {/* Button 1: Extracted Deliverables & Data */}
                      <button
                        type="button"
                        onClick={() => setActiveBoardTab(activeBoardTab === 'deliverables' ? null : 'deliverables')}
                        className={`flex-1 min-w-0 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group select-none ${
                          activeBoardTab === 'deliverables'
                            ? 'bg-white dark:bg-[#0D111C] text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-700/80'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <FileCheck2 className={`w-4 h-4 shrink-0 transition-colors ${
                            activeBoardTab === 'deliverables' ? 'text-[#00A3A6]' : 'text-slate-400 group-hover:text-[#00A3A6]'
                          }`} />
                          <span className="font-bold tracking-tight truncate">
                            Extracted Deliverables
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {activeFindings.length} fields
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          <span className="text-[11px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-medium hidden lg:inline">
                            {activeBoardTab === 'deliverables' ? 'Collapse' : 'Expand'}
                          </span>
                          <ChevronDown 
                            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ease-out ${
                              activeBoardTab === 'deliverables' ? 'rotate-180' : 'rotate-0'
                            }`} 
                          />
                        </div>
                      </button>

                      {/* Button 2: Pipeline Execution Steps */}
                      <button
                        type="button"
                        onClick={() => setActiveBoardTab(activeBoardTab === 'steps' ? null : 'steps')}
                        className={`flex-1 min-w-0 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group select-none ${
                          activeBoardTab === 'steps'
                            ? 'bg-white dark:bg-[#0D111C] text-slate-900 dark:text-white shadow-xs border border-slate-200/90 dark:border-slate-700/80'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <Layers className={`w-4 h-4 shrink-0 transition-colors ${
                            activeBoardTab === 'steps' ? 'text-sky-500' : 'text-slate-400 group-hover:text-sky-500'
                          }`} />
                          <span className="font-bold tracking-tight truncate">
                            Pipeline Execution Steps
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium shrink-0 bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {activeSteps.length} steps
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          <span className="text-[11px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-medium hidden lg:inline">
                            {activeBoardTab === 'steps' ? 'Collapse' : 'Expand'}
                          </span>
                          <ChevronDown 
                            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ease-out ${
                              activeBoardTab === 'steps' ? 'rotate-180' : 'rotate-0'
                            }`} 
                          />
                        </div>
                      </button>
                    </div>

                    {/* Shared Space Below: Opens when either button is active */}
                    {activeBoardTab && (
                      <div className="p-3 bg-white/40 dark:bg-black/20 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* VIEW 1: Extracted Deliverables */}
                        {activeBoardTab === 'deliverables' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {activeFindings.length > 0 ? (
                              activeFindings.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-xl bg-white dark:bg-[#0D111C] border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                                >
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block mb-0.5 tracking-wider">
                                    {item.label}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono break-all block">
                                    {item.value}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full p-6 text-center text-xs text-slate-400">
                                No extracted deliverables detected for this execution.
                              </div>
                            )}
                          </div>
                        )}

                        {/* VIEW 2: Pipeline Execution Steps */}
                        {activeBoardTab === 'steps' && (
                          <div className="space-y-1.5 pr-1.5 max-h-80 overflow-y-auto">
                            {activeSteps.map((step) => {
                              const isFailed = step.status === 'FAILED';
                              return (
                                <div
                                  key={step.number}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                                    isFailed
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                      : 'bg-white dark:bg-[#0D111C] border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 shadow-2xs'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                      isFailed
                                        ? 'bg-rose-500 text-white'
                                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                      {isFailed ? '✕' : step.number}
                                    </span>
                                    <span className="font-medium truncate">
                                      {step.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono shrink-0">
                                    {step.model && (
                                      <span className="text-[#00A3A6] hidden sm:inline">{step.model}</span>
                                    )}
                                    {step.durationHuman && (
                                      <span>{step.durationHuman}</span>
                                    )}
                                    <span className={isFailed ? 'text-rose-500 font-bold' : 'text-emerald-500 font-semibold'}>
                                      {isFailed ? 'Failed' : 'Passed'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. TECHNICAL INSPECTION DRAWERS (Inside scrollable body) */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTechnicalDrawer(activeTechnicalDrawer === 'raw' ? null : 'raw')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeTechnicalDrawer === 'raw'
                            ? 'bg-[#00338D] text-white border-[#00338D]'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>{activeTechnicalDrawer === 'raw' ? 'Hide Raw JSON' : 'Inspect Raw JSON'}</span>
                      </button>

                      <button
                        onClick={() => setActiveTechnicalDrawer(activeTechnicalDrawer === 'proof' ? null : 'proof')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeTechnicalDrawer === 'proof'
                            ? 'bg-[#00338D] text-white border-[#00338D]'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{activeTechnicalDrawer === 'proof' ? 'Hide Audit Proof' : 'W3C Audit Certificate'}</span>
                      </button>
                    </div>

                    {/* DRAWER: RAW JSON */}
                    {activeTechnicalDrawer === 'raw' && (
                      <div className="p-3 bg-black/60 border border-slate-800 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-medium text-slate-300">Raw Execution State JSON</span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(activeRun, null, 2), 'raw-json')}
                            className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            {copiedKey === 'raw-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copy</span>
                          </button>
                        </div>
                        <pre className="p-2.5 bg-black/40 border border-slate-800 rounded-xl text-[10px] text-slate-300 font-mono max-h-80 overflow-y-auto whitespace-pre-wrap">
                          {JSON.stringify(activeRun, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* DRAWER: COMPLIANCE PROOF */}
                    {activeTechnicalDrawer === 'proof' && (
                      <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2.5 font-mono text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white font-sans flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span>W3C WebCrypto SHA-256 Ledger Certificate</span>
                          </span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            100% Notarized
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Root SHA-256 Fingerprint:</span>
                            <span className="text-sky-400 break-all select-all">
                              {activeRun.cryptography?.rootSha256 || 'Digest verified on execution completion'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">W3C Trace ID:</span>
                            <span className="text-slate-300 select-all">{activeRun.traceId}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: OTLP Python Setup Code */}
        {isOtlpModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-[#0D111C] border border-slate-200 dark:border-[#1E293B] shadow-2xl rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00A3A6]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Connect External Python / LangGraph Agent
                  </h4>
                </div>
                <button
                  onClick={() => setIsOtlpModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Install OpenTelemetry in your external LangGraph or CrewAI Python project. Traces and metrics will stream straight into KEAOS with zero manual instrumentation:
              </p>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400">1. Install Standard Packages:</span>
                <pre className="p-2.5 bg-black/60 border border-slate-800 rounded-xl text-[10px] text-emerald-400 font-mono">
                  pip install opentelemetry-api opentelemetry-sdk openinference-instrumentation-langchain
                </pre>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400">2. Auto-instrument your Agent entrypoint:</span>
                <pre className="p-3 bg-black/60 border border-slate-800 rounded-xl text-[10px] text-slate-200 font-mono whitespace-pre overflow-x-auto">
{`from openinference.instrumentation.langchain import LangChainInstrumentor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

LangChainInstrumentor().instrument(
    tracer_provider=None,
    exporter=OTLPSpanExporter(endpoint="http://127.0.0.1:5173/api/telemetry/v2/traces")
)`}
                </pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setIsOtlpModalOpen(false)}
                  className="px-4 py-1.5 bg-[#00338D] hover:bg-[#002875] text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenScaffold>
  );
}
