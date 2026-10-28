import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck2, 
  Upload, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  ShieldCheck, 
  Activity, 
  Award, 
  Lock, 
  ArrowRight, 
  TrendingUp, 
  Cpu, 
  Plus, 
  Database, 
  Eye, 
  Layers, 
  Clock, 
  GitCompare, 
  Check, 
  Trash2, 
  AlertTriangle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  INITIAL_GOLDEN_DATASET, 
  DEFAULT_EVALUATORS, 
  DEFAULT_THRESHOLDS,
  loadWorkflowEvalSuite,
  saveWorkflowEvalSuite 
} from '../constants/goldenDataset';
import { runEvaluationSuite } from '../utils/evaluationEngine';
import CustomEvaluatorModal from './evaluations/CustomEvaluatorModal';
import DatasetDrawer from './evaluations/DatasetDrawer';
import TestCaseDetailModal from './evaluations/TestCaseDetailModal';
import ModelRoiCard from './evaluations/ModelRoiCard';

export default function EvaluationView({
  activeUseCase,
  nodes = [],
  thresholds,
  setThresholds,
  evaluationResult,
  setEvaluationResult,
  setViewMode = null,
  isDarkMode = true
}) {
  const workflowId = activeUseCase?.id || 'default';

  // Load persisted workflow-scoped suite
  const [suite, setSuite] = useState(() => loadWorkflowEvalSuite(workflowId));
  const [dataset, setDataset] = useState(suite.dataset || INITIAL_GOLDEN_DATASET);
  const [evaluators, setEvaluators] = useState(suite.evaluators || DEFAULT_EVALUATORS);
  const [runs, setRuns] = useState(suite.runs || []);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [compareRunId, setCompareRunId] = useState(null);
  const [isCompareMode, setIsCompareMode] = useState(false);

  // Modals & Drawers
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [selectedTestCaseForDetail, setSelectedTestCaseForDetail] = useState(null);

  // Runtime State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(null);

  // Sync state whenever workflow changes
  useEffect(() => {
    const loaded = loadWorkflowEvalSuite(workflowId);
    setSuite(loaded);
    setDataset(loaded.dataset || INITIAL_GOLDEN_DATASET);
    setEvaluators(loaded.evaluators || DEFAULT_EVALUATORS);
    setRuns(loaded.runs || []);
    if (loaded.runs && loaded.runs.length > 0) {
      setSelectedRunId(loaded.runs[loaded.runs.length - 1].id);
      if (loaded.runs.length > 1) {
        setCompareRunId(loaded.runs[loaded.runs.length - 2].id);
      }
    }
  }, [workflowId]);

  // Persist suite updates
  const persistSuite = (updatedFields) => {
    const updated = {
      ...suite,
      dataset,
      evaluators,
      runs,
      thresholds,
      ...updatedFields
    };
    setSuite(updated);
    saveWorkflowEvalSuite(workflowId, updated);
  };

  const attachedPillars = useMemo(() => {
    const regular = (nodes || [])
      .filter(n => n.type === 'pillar')
      .map(n => ({
        id: n.data.toolId || n.id,
        name: n.data.name,
        type: n.data.pillarType,
        config: n.data.config
      }));

    const deterministic = (nodes || [])
      .filter(n => n.type === 'deterministicNode')
      .map(n => ({
        id: n.id,
        name: n.data?.name || 'Deterministic Logic Box',
        type: 'tools',
        isDeterministic: true,
        config: {
          language: n.data?.language || 'python',
          prompt: n.data?.ruleSummary || n.data?.prompt || ''
        }
      }));

    return [...regular, ...deterministic];
  }, [nodes]);

  // Current active run and compare run
  const activeRun = useMemo(() => {
    if (selectedRunId) {
      const found = runs.find(r => r.id === selectedRunId);
      if (found) return found;
    }
    if (runs.length > 0) return runs[runs.length - 1];
    return evaluationResult || null;
  }, [runs, selectedRunId, evaluationResult]);

  const compareRun = useMemo(() => {
    if (!isCompareMode || !compareRunId) return null;
    return runs.find(r => r.id === compareRunId) || null;
  }, [runs, compareRunId, isCompareMode]);

  const activeEvaluators = useMemo(() => {
    return evaluators.filter(e => e.isActive !== false);
  }, [evaluators]);

  const nonSlaEvaluators = useMemo(() => {
    return activeEvaluators.filter(e => e.type !== 'latency-sla');
  }, [activeEvaluators]);

  // Handle Evaluator Toggle / Update
  const handleToggleEvaluator = (evalId) => {
    const updated = evaluators.map(ev => 
      ev.id === evalId ? { ...ev, isActive: !ev.isActive } : ev
    );
    setEvaluators(updated);
    persistSuite({ evaluators: updated });
  };

  const handleUpdateEvaluatorThreshold = (evalId, newThreshold) => {
    const updated = evaluators.map(ev => 
      ev.id === evalId ? { ...ev, threshold: Number(newThreshold) } : ev
    );
    setEvaluators(updated);
    persistSuite({ evaluators: updated });
  };

  const handleDeleteEvaluator = (evalId) => {
    const updated = evaluators.filter(ev => ev.id !== evalId);
    setEvaluators(updated);
    persistSuite({ evaluators: updated });
  };

  const handleSaveCustomEvaluator = (newEvaluator) => {
    const updated = [...evaluators, newEvaluator];
    setEvaluators(updated);
    persistSuite({ evaluators: updated });
  };

  const handleUpdateDataset = (newDataset) => {
    setDataset(newDataset);
    persistSuite({ dataset: newDataset });
  };

  // Run Benchmark Suite
  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setEvalProgress({ current: 0, total: dataset.length, currentCase: 'Initializing runner...' });

    const nextRunNumber = runs.length + 1;

    try {
      const runResult = await runEvaluationSuite({
        dataset,
        thresholds,
        evaluators,
        frameworkId: activeUseCase?.framework?.id || 'google-adk',
        agentPrompt: activeUseCase?.agent?.prompt || '',
        attachedPillars,
        laborRateHr: suite.laborRateHr ?? 75,
        reviewMinsSaved: suite.reviewMinsSaved ?? 15,
        runNumber: nextRunNumber,
        activeUseCase,
        onProgress: (prog) => {
          setEvalProgress(prog);
        }
      });

      const updatedRuns = [...runs, runResult];
      setRuns(updatedRuns);
      setSelectedRunId(runResult.id);
      if (updatedRuns.length > 1) {
        setCompareRunId(updatedRuns[updatedRuns.length - 2].id);
      }
      setEvaluationResult(runResult);
      persistSuite({ runs: updatedRuns });

      if (runResult.allPassed) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.55 }
        });
      }
    } catch (err) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setIsEvaluating(false);
      setEvalProgress(null);
    }
  };

  return (
    <div className={`flex-1 h-full flex flex-col overflow-hidden select-none ${
      isDarkMode ? 'bg-[#0D111A] text-white' : 'bg-[#F5F6F8] text-[#0B0F19]'
    }`}>
      {/* Institutional Sub-Header: Active Workflow, Runs History & Roundtrip Action */}
      <div className={`h-11 px-5 border-b flex items-center justify-between shrink-0 ${
        isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-[#FFFFFF] border-[#E0E0E0]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00338D]/20 text-[#0091DA] border border-[#00338D]/30">
              ALIGNMENT LAB
            </span>
            <span className={`text-xs font-bold tracking-tight ${
              isDarkMode ? 'text-white' : 'text-[#0B0F19]'
            }`}>
              {activeUseCase?.name || 'Enterprise Autonomous Agent'}
            </span>
          </div>

          {runs.length > 0 && (
            <div className={`flex items-center gap-2 pl-3 border-l ${
              isDarkMode ? 'border-white/10' : 'border-slate-300'
            }`}>
              <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Run History:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-md">
                {runs.map((r) => {
                  const isSelected = r.id === (activeRun?.id || selectedRunId);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRunId(r.id)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-colors ${
                        isSelected
                          ? 'bg-[#00338D] border-[#0091DA] text-white'
                          : (isDarkMode ? 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-black')
                      }`}
                    >
                      Run #{r.runNumber} ({r.aggregates?.overallMatchRate ?? r.aggregates?.faithfulness}%)
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sub-Header Controls */}
        <div className="flex items-center gap-2.5">
          {runs.length > 1 && (
            <button
              onClick={() => setIsCompareMode(!isCompareMode)}
              className={`px-2.5 py-1 text-xs font-mono font-bold border flex items-center gap-1.5 transition-colors ${
                isCompareMode
                  ? 'bg-[#0091DA]/20 border-[#0091DA] text-[#0091DA]'
                  : (isDarkMode ? 'border-slate-600 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-black')
              }`}
              title="Compare current run side-by-side with previous run"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isCompareMode ? 'Exit Diff View' : 'Compare with Run #1'}</span>
            </button>
          )}

          {/* Primary Roundtrip CTA: Tune on Canvas */}
          <button
            onClick={() => {
              if (setViewMode) setViewMode('canvas');
            }}
            className="btn-tactile px-3.5 py-1 bg-[#001E50] hover:bg-[#00338D] text-white text-xs font-bold font-mono border border-[#0091DA]/40 flex items-center gap-1.5 shadow-sm transition-colors"
            title="Switch to visual graph to adjust models, prompts, skills, or policies"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0091DA]" />
            <span>Tune on Canvas ↗</span>
          </button>
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column (w-96): Dataset & Evaluator Pointers */}
        <div className={`w-96 h-full border-r flex flex-col shrink-0 ${
          isDarkMode ? 'bg-[#0F131D] border-[#222736]' : 'bg-[#FFFFFF] border-[#CBD5E1]'
        }`}>
          {/* Section 1: Golden Dataset Ingestion */}
          <div className={`p-4 border-b space-y-2.5 ${isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase font-mono tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#0B0F19]'
              }`}>
                Golden Benchmark Dataset
              </span>
              <span className="text-[11px] font-mono font-bold text-[#0091DA]">
                {dataset.length} cases loaded
              </span>
            </div>

            <div className={`p-2.5 border flex items-center justify-between ${
              isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
            }`}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0091DA]" />
                <div>
                  <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                    Ground Truth Ledger
                  </span>
                  <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Multi-scenario fixtures
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDatasetDrawerOpen(true)}
                className={`btn-tactile px-3 py-1 border border-[#00338D] text-xs font-bold transition-colors ${
                  isDarkMode
                    ? 'text-white hover:bg-[#00338D]'
                    : 'text-[#00338D] bg-white hover:bg-[#00338D] hover:text-white shadow-xs'
                }`}
              >
                Manage
              </button>
            </div>
          </div>

          {/* Section 2: Active Evaluators & Threshold Pointers */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase font-mono tracking-tight ${
                isDarkMode ? 'text-white' : 'text-[#0B0F19]'
              }`}>
                Evaluator Pointers ({evaluators.filter(e => e.isActive !== false).length})
              </span>
              <button
                onClick={() => setIsCustomModalOpen(true)}
                className="text-xs font-bold font-mono text-[#0091DA] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Evaluator</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {evaluators.map((ev) => {
                const isActive = ev.isActive !== false;
                return (
                  <div
                    key={ev.id}
                    className={`p-3 border transition-all ${
                      isActive 
                        ? (isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]')
                        : (isDarkMode ? 'opacity-50 bg-transparent border-dashed border-slate-700' : 'opacity-50 bg-slate-100 border-dashed border-slate-300')
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => handleToggleEvaluator(ev.id)}
                          className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-[#00338D] border-[#0091DA]' : 'border-slate-400'
                          }`}
                        >
                          {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                        </button>
                        <span className={`text-xs font-bold truncate ${
                          isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                        }`} title={ev.name}>
                          {ev.shortName || ev.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {ev.isHardGate && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-[#001E50] text-[#0091DA] border border-[#0091DA]/30 font-bold">
                            HARD GATE
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-[#009A44]">
                          {ev.type === 'latency-sla' ? `${ev.threshold}s` : `${ev.threshold}%`}
                        </span>
                        {ev.category === 'custom' && (
                          <button
                            onClick={() => handleDeleteEvaluator(ev.id)}
                            className="text-slate-400 hover:text-red-500 p-0.5 ml-1"
                            title="Remove custom evaluator"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <div className="pt-1">
                        <input
                          type="range"
                          min={ev.type === 'latency-sla' ? 1.0 : 50}
                          max={ev.type === 'latency-sla' ? 10.0 : 100}
                          step={ev.type === 'latency-sla' ? 0.2 : 1}
                          value={ev.threshold}
                          onChange={(e) => handleUpdateEvaluatorThreshold(ev.id, e.target.value)}
                          className="w-full accent-[#0091DA] cursor-pointer h-1"
                        />
                        <p className={`text-[10px] mt-1 leading-snug truncate ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {ev.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Primary CTA Execute Benchmark */}
          <div className={`p-4 border-t ${
            isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
          }`}>
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating}
              className="btn-tactile w-full py-3 bg-[#00338D] hover:bg-[#005EB8] disabled:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 rounded-none shadow-sm transition-all"
            >
              {isEvaluating ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse delay-150" />
                  </div>
                  <span className="font-mono">
                    Benchmarking ({evalProgress?.current || 0}/{evalProgress?.total || dataset.length})...
                  </span>
                </div>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute Benchmark (Run #{runs.length + 1})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Main Column: Results, Scorecards, ROI & Ledger */}
        <div className="flex-1 h-full overflow-y-auto p-6 space-y-6">
          {activeRun ? (
            <div className="space-y-6">
              {/* Gate Decision Banner */}
              <div className={`p-5 border-t-4 shadow-sm flex items-center justify-between ${
                activeRun.allPassed
                  ? (isDarkMode ? 'bg-[#0E1B2E] border-[#009A44]' : 'bg-[#E6F5EC] border-[#009A44]')
                  : (isDarkMode ? 'bg-[#201124] border-[#6D2077]' : 'bg-[#F9EFF6] border-[#6D2077]')
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 flex items-center justify-center text-white ${
                    activeRun.allPassed ? 'bg-[#009A44]' : 'bg-[#6D2077]'
                  }`}>
                    {activeRun.allPassed ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0091DA]">
                        Institutional Alignment Gatekeeper
                      </span>
                      {activeRun.sha256Hash && (
                        <span className={`text-[9px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {activeRun.sha256Hash.slice(0, 18)}...
                        </span>
                      )}
                    </div>
                    <h3 className={`text-base font-bold tracking-tight mt-0.5 ${
                      isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                    }`}>
                      {activeRun.allPassed
                        ? 'PASS: Certified for Production Deployment'
                        : 'FAIL: Alignment Standards Not Met'}
                    </h3>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {activeRun.allPassed
                        ? `All ${activeRun.aggregates?.totalCases} test cases passed institutional thresholds. Ready for multi-agent export.`
                        : `${activeRun.aggregates?.failedCases || 1} case failed alignment constraints. Tune prompts or guardrails on Canvas.`}
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                    activeRun.allPassed
                      ? 'bg-[#009A44] text-white'
                      : 'bg-[#6D2077] text-white'
                  }`}>
                    {activeRun.aggregates?.passedCases} / {activeRun.aggregates?.totalCases} PASSED
                  </span>

                  {!activeRun.allPassed && (
                    <button
                      onClick={() => {
                        if (setViewMode) setViewMode('canvas');
                      }}
                      className="btn-tactile px-3 py-1 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold font-mono"
                    >
                      Tune on Canvas ↗
                    </button>
                  )}
                </div>
              </div>

              {/* Aggregate Metric Scorecards with Delta Badges */}
              <div className="grid grid-cols-4 gap-4">
                <div className={`p-4 border shadow-sm ${
                  isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono font-bold uppercase ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>Composite Score</span>
                    {compareRun && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        (activeRun.aggregates?.overallMatchRate || 85) >= (compareRun.aggregates?.overallMatchRate || 85)
                          ? 'bg-[#009A44]/20 text-[#009A44]'
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {(activeRun.aggregates?.overallMatchRate || 85) - (compareRun.aggregates?.overallMatchRate || 85) >= 0 ? '+' : ''}
                        {(activeRun.aggregates?.overallMatchRate || 85) - (compareRun.aggregates?.overallMatchRate || 85)}%
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-[#0091DA] font-mono block mt-1">
                    {activeRun.aggregates?.overallMatchRate ?? 85}%
                  </span>
                  <span className={`text-[10px] mt-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Target: ≥ {thresholds.minCompositeScore ?? 85}% SLA
                  </span>
                </div>

                <div className={`p-4 border shadow-sm ${
                  isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono font-bold uppercase truncate ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {nonSlaEvaluators[0]?.shortName || nonSlaEvaluators[0]?.name || 'Alignment Gate'}
                    </span>
                    {nonSlaEvaluators[0] && (
                      <span className="text-[10px] font-mono font-bold text-[#009A44]">
                        ≥ {nonSlaEvaluators[0].threshold}%
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-[#009A44] font-mono block mt-1">
                    {nonSlaEvaluators[0]
                      ? (activeRun.aggregates?.evaluatorAverages?.[nonSlaEvaluators[0].id] ?? activeRun.aggregates?.overallMatchRate ?? 90)
                      : 100}%
                  </span>
                  <span className={`text-[10px] mt-1 block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {nonSlaEvaluators[0]?.description || 'Primary quality gate'}
                  </span>
                </div>

                <div className={`p-4 border shadow-sm ${
                  isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono font-bold uppercase truncate ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {nonSlaEvaluators[1]?.shortName || nonSlaEvaluators[1]?.name || 'Compliance Guard'}
                    </span>
                    {nonSlaEvaluators[1] ? (
                      <span className="text-[10px] font-mono font-bold text-[#00A3A6]">
                        ≥ {nonSlaEvaluators[1].threshold}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-[#00A3A6]">
                        Strict
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-[#00A3A6] font-mono block mt-1">
                    {nonSlaEvaluators[1]
                      ? (activeRun.aggregates?.evaluatorAverages?.[nonSlaEvaluators[1].id] ?? activeRun.aggregates?.overallMatchRate ?? 90)
                      : (activeRun.allPassed ? '100%' : 'Gated')}%
                  </span>
                  <span className={`text-[10px] mt-1 block truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {nonSlaEvaluators[1]?.description || 'Institutional compliance standard'}
                  </span>
                </div>

                <div className={`p-4 border shadow-sm ${
                  isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono font-bold uppercase ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>Avg Latency</span>
                    {compareRun && (
                      <span className={`text-[10px] font-mono font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {((activeRun.aggregates?.avgLatencySec || 1.5) - (compareRun.aggregates?.avgLatencySec || 1.5)).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-[#EAAA00] font-mono block mt-1">
                    {activeRun.aggregates?.avgLatencySec || 1.2}s
                  </span>
                  <span className={`text-[10px] mt-1 block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Budget: ≤ {thresholds.maxLatencySec ?? 4.0}s
                  </span>
                </div>
              </div>

              {/* "Is the Model Worth It?" ROI & Pareto Economics Card */}
              <ModelRoiCard
                roi={activeRun.roi || {}}
                overallMatchRate={activeRun.aggregates?.overallMatchRate || 85}
                laborRateHr={suite.laborRateHr ?? 75}
                reviewMinsSaved={suite.reviewMinsSaved ?? 15}
                onUpdateEconomics={({ laborRateHr, reviewMinsSaved }) => {
                  persistSuite({ laborRateHr, reviewMinsSaved });
                }}
                isDarkMode={isDarkMode}
              />

              {/* Deep Ground Truth Test Case Ledger Table */}
              <div className={`border shadow-sm overflow-hidden ${
                isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
              }`}>
                <div className={`p-3.5 border-b flex items-center justify-between ${
                  isDarkMode ? 'bg-[#161B29] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
                }`}>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-bold uppercase font-mono tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                    }`}>
                      Ground Truth Test Case Ledger ({activeRun.caseResults?.length || 0} Test Runs)
                    </h4>
                  </div>
                  <span className={`text-[11px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Click row for full diff & reasoning
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-[10px] font-mono font-bold uppercase ${
                        isDarkMode ? 'bg-[#0B0E16] border-[#222736] text-slate-400' : 'bg-[#F8F9FB] border-[#E0E0E0] text-slate-600'
                      }`}>
                        <th className="py-2.5 px-3">Case ID</th>
                        <th className="py-2.5 px-3">Scenario Name</th>
                        <th className="py-2.5 px-3">Composite Score</th>
                        {nonSlaEvaluators.map(ev => (
                          <th key={ev.id} className="py-2.5 px-3">{ev.shortName || ev.name}</th>
                        ))}
                        <th className="py-2.5 px-3">Latency</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-[#222736]' : 'divide-[#E0E0E0]'}`}>
                      {(activeRun.caseResults || activeRun.results || []).map((res, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedTestCaseForDetail(res)}
                          className={`cursor-pointer transition-colors ${
                            isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-[#E6EDF7]/50'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-[#0091DA]">{res.caseId || res.id}</td>
                          <td className={`py-3 px-3 font-medium max-w-xs truncate ${
                            isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                          }`}>{res.name || res.caseName}</td>
                          <td className={`py-3 px-3 font-mono font-bold ${
                            isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                          }`}>
                            {res.compositeScore ?? 85}%
                          </td>
                          {nonSlaEvaluators.map(ev => {
                            const score = res.evalScores?.[ev.id] ?? '-';
                            const isPassed = typeof score === 'number' ? score >= (ev.threshold || 85) : true;
                            return (
                              <td key={ev.id} className={`py-3 px-3 font-mono font-bold ${isPassed ? 'text-[#009A44]' : 'text-[#6D2077]'}`}>
                                {typeof score === 'number' ? `${score}%` : score}
                              </td>
                            );
                          })}
                          <td className={`py-3 px-3 font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{res.latencySec}s</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                              res.passed
                                ? 'bg-[#009A44]/15 text-[#009A44] border border-[#009A44]/30'
                                : 'bg-[#6D2077]/15 text-[#6D2077] border border-[#6D2077]/30'
                            }`}>
                              {res.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTestCaseForDetail(res);
                              }}
                              className="text-xs text-[#0091DA] hover:underline font-mono"
                            >
                              Details ↗
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Pre-Evaluation Institutional Specification */
            <div className={`p-6 border shadow-sm space-y-5 ${
              isDarkMode ? 'bg-[#121622] border-[#222736]' : 'bg-white border-[#CBD5E1]'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 ${
                isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00338D] text-white flex items-center justify-center">
                    <FileCheck2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                    }`}>
                      Institutional Alignment Gatekeeper Specification
                    </h4>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Evaluates agent faithfulness, extraction precision, PII guardrails, and custom rubrics against human ground truth.
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-[#00338D]/20 text-[#0091DA] border border-[#00338D]/40 font-mono text-xs font-bold">
                  {dataset.length} FIXTURES LOADED
                </span>
              </div>

              {/* Preview Cards */}
              <div className="grid grid-cols-3 gap-3.5">
                {dataset.slice(0, 3).map((cs, idx) => (
                  <div key={idx} className={`p-3.5 border ${
                    isDarkMode ? 'bg-[#161B29] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                  }`}>
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#0091DA] mb-1">
                      <span>{cs.id}</span>
                      <span>{cs.category}</span>
                    </div>
                    <h5 className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>{cs.caseName}</h5>
                    <p className={`text-[11px] mt-1 leading-relaxed line-clamp-2 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {cs.expectedOutput || (typeof cs.groundTruth === 'string' ? cs.groundTruth : JSON.stringify(cs.groundTruth || '')) || 'Ground truth fixture.'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Ready Trigger Bar */}
              <div className={`p-4 border flex items-center justify-between ${
                isDarkMode ? 'bg-[#161B29] border-[#00338D]/40' : 'bg-[#E6EDF7] border-[#00338D]/30'
              }`}>
                <div className="text-xs">
                  <span className={`font-bold block ${isDarkMode ? 'text-white' : 'text-[#001E50]'}`}>Ready for Regression Benchmark</span>
                  <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Executes multi-evaluator suite across all test cases with cryptographic audit fingerprinting.
                  </span>
                </div>
                <button
                  onClick={handleRunEvaluation}
                  disabled={isEvaluating}
                  className="btn-tactile px-5 py-2 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold rounded-none shadow-sm flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Execute Benchmark Suite</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <CustomEvaluatorModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSaveEvaluator={handleSaveCustomEvaluator}
        isDarkMode={isDarkMode}
      />

      <DatasetDrawer
        isOpen={isDatasetDrawerOpen}
        onClose={() => setIsDatasetDrawerOpen(false)}
        dataset={dataset}
        onUpdateDataset={handleUpdateDataset}
        isDarkMode={isDarkMode}
      />

      <TestCaseDetailModal
        isOpen={Boolean(selectedTestCaseForDetail)}
        onClose={() => setSelectedTestCaseForDetail(null)}
        testCase={selectedTestCaseForDetail}
        evaluators={evaluators}
        onTuneOnCanvas={() => {
          setSelectedTestCaseForDetail(null);
          if (setViewMode) setViewMode('canvas');
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
