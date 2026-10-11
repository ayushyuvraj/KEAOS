import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRight, 
  Sliders, 
  Cpu, 
  Sparkles, 
  FileText, 
  Lock,
  Layers
} from 'lucide-react';

export default function TestCaseDetailModal({
  isOpen,
  onClose,
  testCase,
  evaluators = [],
  onTuneOnCanvas,
  isDarkMode = true
}) {
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' | 'judge' | 'input'

  if (!isOpen || !testCase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className={`w-full max-w-5xl h-[88vh] border shadow-2xl flex flex-col overflow-hidden ${
        isDarkMode ? 'bg-[#0F131D] border-[#222736] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
      }`}>
        {/* Header Bar */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center text-white ${
              testCase.passed ? 'bg-[#009A44]' : 'bg-[#6D2077]'
            }`}>
              {testCase.passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#0091DA] font-bold">{testCase.caseId || testCase.id}</span>
                <h3 className={`text-sm font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                }`}>
                  {testCase.caseName || testCase.name}
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  testCase.passed 
                    ? 'bg-[#009A44]/20 text-[#009A44] border border-[#009A44]/30'
                    : 'bg-[#6D2077]/20 text-[#6D2077] border border-[#6D2077]/30'
                }`}>
                  {testCase.passed ? 'PASSED SLA GATE' : 'FAILED ALIGNMENT'}
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Composite Alignment Score: <strong className="font-mono text-[#0091DA]">{testCase.compositeScore || testCase.faithfulness}%</strong> | Latency: <span className="font-mono">{testCase.latencySec}s</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                if (onTuneOnCanvas) onTuneOnCanvas();
              }}
              className="btn-tactile px-3.5 py-1.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Tune on Canvas ↗</span>
            </button>
            <button
              onClick={onClose}
              className={`p-1 hover:bg-slate-500/20 transition-colors ${
                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Evaluator Score Breakdown Row */}
        <div className={`px-5 py-3 border-b flex items-center gap-4 overflow-x-auto text-xs font-mono ${
          isDarkMode ? 'bg-[#0B0E16] border-[#222736]' : 'bg-[#F1F3F7] border-[#E0E0E0]'
        }`}>
          <span className={`font-bold uppercase text-[10px] shrink-0 ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>Score Ledger:</span>
          {evaluators.map(ev => {
            const score = testCase.evalScores?.[ev.id] ?? (
              ev.id === 'eval-faithfulness' ? testCase.faithfulness :
              ev.id === 'eval-action-f1' ? testCase.actionItemF1 :
              ev.id === 'eval-pii' ? testCase.piiRate : 90
            );
            const isPassed = ev.type === 'latency-sla' 
              ? testCase.latencySec <= (ev.threshold || 4.0) 
              : score >= (ev.threshold || 85);

            return (
              <div key={ev.id} className={`flex items-center gap-2 px-2.5 py-1 border shrink-0 ${
                isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-[#CBD5E1]'
              }`}>
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>{ev.shortName || ev.name}:</span>
                <span className={`font-bold ${isPassed ? 'text-[#009A44]' : 'text-[#6D2077]'}`}>
                  {ev.type === 'latency-sla' ? `${testCase.latencySec}s` : `${score}%`}
                </span>
                {ev.isHardGate && (
                  <span className="text-[9px] px-1 py-0.2 bg-[#001E50] text-[#0091DA] border border-[#0091DA]/30 rounded">
                    GATE
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Failure Alerts */}
        {testCase.failureReasons && testCase.failureReasons.length > 0 && (
          <div className="mx-5 mt-4 p-3 bg-[#6D2077]/10 border border-[#6D2077]/40 text-xs flex items-center gap-2 text-[#EF4444]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div>
              <span className="font-bold block">SLA Threshold Violations:</span>
              <span className={isDarkMode ? 'text-slate-300' : 'text-slate-800'}>{testCase.failureReasons.join(' | ')}</span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className={`flex border-b text-xs font-mono font-bold mt-2 ${
          isDarkMode ? 'border-[#222736] bg-[#0B0E16]' : 'border-[#E0E0E0] bg-[#F8F9FB]'
        }`}>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-2.5 px-5 text-center border-b-2 transition-all ${
              activeTab === 'comparison'
                ? 'border-[#00338D] text-[#0091DA] bg-white/[0.04]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-black')
            }`}
          >
            Output vs Ground Truth
          </button>
          <button
            onClick={() => setActiveTab('judge')}
            className={`py-2.5 px-5 text-center border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'judge'
                ? 'border-[#00338D] text-[#0091DA] bg-white/[0.04]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-black')
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>LLM Judge Rationale</span>
          </button>
          <button
            onClick={() => setActiveTab('input')}
            className={`py-2.5 px-5 text-center border-b-2 transition-all ${
              activeTab === 'input'
                ? 'border-[#00338D] text-[#0091DA] bg-white/[0.04]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-black')
            }`}
          >
            Raw Input Source
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activeTab === 'comparison' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Agent Generated Output */}
              <div className={`p-4 border flex flex-col ${
                isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
              }`}>
                <div className={`flex items-center justify-between pb-2 mb-3 border-b ${
                  isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
                }`}>
                  <span className="text-xs font-bold uppercase font-mono text-[#0091DA]">
                    Actual Agent Output
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Live Synthesis</span>
                </div>

                <div className={`flex-1 overflow-y-auto space-y-3 font-mono text-xs leading-relaxed ${
                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {testCase.generatedSummary ? (
                    <div>
                      <span className={`text-[10px] font-bold uppercase block mb-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Synthesized Summary Highlights:
                      </span>
                      <div className={`p-2.5 border ${
                        isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-white border-[#CBD5E1]'
                      }`}>
                        {Array.isArray(testCase.generatedSummary) 
                          ? testCase.generatedSummary.join(' ') 
                          : testCase.generatedSummary}
                      </div>
                    </div>
                  ) : null}

                  {testCase.generatedActionItems && testCase.generatedActionItems.length > 0 ? (
                    <div>
                      <span className={`text-[10px] font-bold uppercase block mb-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Extracted Action Items ({testCase.generatedActionItems.length}):
                      </span>
                      <div className="space-y-1.5">
                        {testCase.generatedActionItems.map((act, i) => (
                          <div key={i} className={`p-2 border ${
                            isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-white border-[#CBD5E1]'
                          }`}>
                            <strong className="text-[#0091DA]">{act.assignee}:</strong> {act.task} <em className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>({act.deadline})</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Expected Ground Truth */}
              <div className={`p-4 border flex flex-col ${
                isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
              }`}>
                <div className={`flex items-center justify-between pb-2 mb-3 border-b ${
                  isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
                }`}>
                  <span className="text-xs font-bold uppercase font-mono text-[#009A44]">
                    Expected Ground Truth Target
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Benchmark Reference</span>
                </div>

                <div className={`flex-1 overflow-y-auto space-y-3 font-mono text-xs leading-relaxed ${
                  isDarkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {testCase.groundTruth?.keyDecision && (
                    <div>
                      <span className={`text-[10px] font-bold uppercase block mb-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Target Strategic Decision:
                      </span>
                      <div className={`p-2.5 border ${
                        isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-white border-[#CBD5E1]'
                      }`}>
                        {testCase.groundTruth.keyDecision}
                      </div>
                    </div>
                  )}

                  {testCase.groundTruth?.actionItems && (
                    <div>
                      <span className={`text-[10px] font-bold uppercase block mb-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Target Action Commitments ({testCase.groundTruth.actionItems.length}):
                      </span>
                      <div className="space-y-1.5">
                        {testCase.groundTruth.actionItems.map((act, i) => (
                          <div key={i} className={`p-2 border ${
                            isDarkMode ? 'bg-black/30 border-white/[0.06]' : 'bg-white border-[#CBD5E1]'
                          }`}>
                            <strong className="text-[#009A44]">{act.assignee}:</strong> {act.task} <em className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>({act.deadline})</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {testCase.groundTruth?.piiToRedact?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#6D2077] block mb-1">
                        Mandatory PII Targets to Redact:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {testCase.groundTruth.piiToRedact.map((pii, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#6D2077]/20 text-[#6D2077] border border-[#6D2077]/40 text-xs font-mono">
                            {pii}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'judge' && (
            <div className={`p-4 border space-y-3 leading-relaxed ${
              isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
            }`}>
              <div className="flex items-center gap-2 text-xs font-bold text-[#0091DA] uppercase font-mono">
                <Cpu className="w-4 h-4" />
                <span>Multi-LLM Judge Reasoning & Audit Critique</span>
              </div>
              <div className={`p-4 border font-mono text-xs whitespace-pre-wrap leading-relaxed ${
                isDarkMode ? 'bg-black/30 border-white/[0.06] text-slate-200' : 'bg-white border-[#CBD5E1] text-slate-800'
              }`}>
                {testCase.critique || 'Automated benchmark comparison completed with verified statistical alignment.'}
              </div>
            </div>
          )}

          {activeTab === 'input' && (
            <div className={`p-4 border space-y-2 ${
              isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
            }`}>
              <span className={`text-xs font-bold uppercase font-mono block ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Source Input Text
              </span>
              <div className={`p-3 border font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed ${
                isDarkMode ? 'bg-black/30 border-white/[0.06] text-slate-300' : 'bg-white border-[#CBD5E1] text-slate-800'
              }`}>
                {testCase.inputTranscript || 'No input text recorded.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3.5 border-t flex items-center justify-between ${
          isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
        }`}>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {testCase.tokensUsed ? `~${testCase.tokensUsed} tokens consumed` : ''} {testCase.costUsd ? `| $${testCase.costUsd} unit inference cost` : ''}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`px-4 py-1.5 border text-xs font-bold transition-colors ${
                isDarkMode ? 'border-slate-600 text-slate-300 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-black'
              }`}
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                if (onTuneOnCanvas) onTuneOnCanvas();
              }}
              className="btn-tactile px-4 py-1.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold flex items-center gap-2"
            >
              <span>Tune Parameters on Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
