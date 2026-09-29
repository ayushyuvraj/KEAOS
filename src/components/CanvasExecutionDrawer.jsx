import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  ChevronUp, 
  ChevronDown, 
  Copy, 
  Check, 
  Upload, 
  FileText, 
  Music, 
  Terminal, 
  Clock, 
  Activity, 
  DollarSign, 
  ShieldCheck, 
  Fingerprint, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles, 
  Code
} from 'lucide-react';
import { SAMPLE_MEETINGS } from '../constants/sampleMeetings';
import { runMeetingSimulation } from '../utils/meetingSimulatorEngine';
import { transcribeAudioUniversal, getProviderCredential } from '../services/llmService';
import { getActiveApiKey } from '../services/geminiService';

export default function CanvasExecutionDrawer({
  activeUseCase,
  nodes,
  edges,
  isDarkMode = true,
  onExecutionStateChange,
  isExpanded = false,
  setIsExpanded
}) {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [transcriptText, setTranscriptText] = useState(SAMPLE_MEETINGS[0].transcript);
  const [inputTab, setInputTab] = useState('preset'); // 'preset' | 'raw' | 'audio'
  const [outputTab, setOutputTab] = useState('summary'); // 'summary' | 'actions' | 'decisions' | 'json'

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Attached pillars derived from canvas nodes (excluding deactivated components)
  const attachedPillars = nodes
    .filter(n => n.type === 'pillar' && !n.data?.isDeactivated)
    .map(n => ({
      id: n.data.toolId || n.id,
      name: n.data.name,
      type: n.data.pillarType,
      config: n.data.config || {}
    }));

  const handleSelectSample = (idx) => {
    setSelectedSampleIndex(idx);
    setTranscriptText(SAMPLE_MEETINGS[idx].transcript);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAudioFile({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    });

    const googleKey = getProviderCredential('google') || getActiveApiKey();
    const openAiKey = getProviderCredential('openai');

    if (googleKey || openAiKey) {
      setIsTranscribing(true);
      try {
        const transResult = await transcribeAudioUniversal(file);
        setTranscriptText(transResult.transcript);
        setInputTab('raw');
      } catch (err) {
        alert(`Audio transcription failed: ${err.message}`);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      setTranscriptText(SAMPLE_MEETINGS[0].transcript);
      setInputTab('raw');
    }
  };

  const handleRunAgent = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setExecutionSteps([]);
    setSimulationResult(null);
    setIsExpanded(true); // Auto expand drawer to view execution live

    if (onExecutionStateChange) {
      onExecutionStateChange({ isExecuting: true, step: 'Starting' });
    }

    try {
      const result = await runMeetingSimulation({
        transcript: transcriptText,
        frameworkId: activeUseCase?.framework?.id || 'google-adk',
        agentConfig: activeUseCase?.agent || {},
        attachedPillars,
        onStepProgress: (currentStep, allSteps) => {
          setExecutionSteps([...allSteps]);
          if (onExecutionStateChange) {
            onExecutionStateChange({ isExecuting: true, step: currentStep.step });
          }
        }
      });

      setSimulationResult(result);
    } catch (err) {
      console.error('Execution failed:', err);
      alert(`Agent execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
      if (onExecutionStateChange) {
        onExecutionStateChange({ isExecuting: false, step: 'Complete' });
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunAgent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transcriptText, attachedPillars, isRunning]);

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const copyJsonOutput = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-200 select-none border-t ${
      isDarkMode 
        ? 'bg-[#18191E] border-[#2E313B] text-white' 
        : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#111827]'
    }`}>
      {/* 1. ULTRA-MINIMAL COLLAPSED BAR (Matching Reference Image) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-10 px-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        {/* Left: Simple Logs Tab */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-slate-300">
            Logs
          </span>

          {isRunning && (
            <div className="flex items-center gap-1.5 text-[10px] text-[#0091DA] font-mono animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA]" />
              <span>Executing pipeline...</span>
            </div>
          )}

          {simulationResult && !isRunning && (
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="text-cyan-400">{simulationResult.observability.totalLatencyMs}ms</span>
              <span>•</span>
              <span className="text-emerald-400">+{simulationResult.economics.netRoiMultiplier}x ROI</span>
            </div>
          )}
        </div>

        {/* Center: Minimal Pill Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />

        {/* Right: Quick Run & Expand Icon */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleRunAgent}
            disabled={isRunning}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all ${
              isRunning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse'
                : 'bg-[#FF6D5A] hover:bg-[#FF5A45] text-white'
            }`}
            title="Run Agent (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3 fill-current animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Test Run</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED THREE-COLUMN INSPECTION DRAWER */}
      {isExpanded && (
        <div className={`h-[380px] flex flex-col border-t transition-colors ${
          isDarkMode ? 'bg-[#14151A] border-[#2E313B]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
        }`}>
          {/* Main 3-Pane Body */}
          <div className="flex-1 grid grid-cols-12 divide-x divide-inherit overflow-hidden">
            
            {/* COLUMN 1: TEST INPUT & PAYLOAD */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                isDarkMode ? 'bg-[#1C1E24] border-[#2E313B]' : 'bg-[#F3F4F6] border-[#E5E7EB]'
              }`}>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span>Input Transcript</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInputTab('preset')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      inputTab === 'preset' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setInputTab('raw')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      inputTab === 'raw' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Raw Edit
                  </button>
                  <button
                    onClick={() => setInputTab('audio')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${
                      inputTab === 'audio' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Music className="w-2.5 h-2.5" />
                    MP3
                  </button>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto">
                {inputTab === 'preset' && (
                  <div className="space-y-2">
                    {SAMPLE_MEETINGS.map((sample, idx) => (
                      <div
                        key={sample.id}
                        onClick={() => handleSelectSample(idx)}
                        className={`p-2 rounded-xl border cursor-pointer transition-all ${
                          selectedSampleIndex === idx
                            ? isDarkMode
                              ? 'bg-[#0091DA]/15 border-[#0091DA] text-white'
                              : 'bg-blue-50 border-blue-400 text-blue-900'
                            : isDarkMode
                              ? 'bg-[#1A1C22] border-[#2A2D36] text-slate-300 hover:border-slate-500'
                              : 'bg-white border-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="truncate">{sample.title}</span>
                          <span className="text-[10px] opacity-75">{sample.duration}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {sample.transcript.slice(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {inputTab === 'raw' && (
                  <textarea
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    placeholder="Type or paste transcript..."
                    className={`w-full h-full p-2.5 text-xs font-mono resize-none focus:outline-none rounded-xl border ${
                      isDarkMode ? 'bg-[#121316] border-[#2E313B] text-slate-200' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  />
                )}

                {inputTab === 'audio' && (
                  <div className="h-full flex flex-col justify-center items-center text-center p-4 border border-dashed border-[#2E313B] rounded-xl">
                    <Music className="w-8 h-8 text-[#0091DA] mb-2 animate-bounce" />
                    <label className="px-3 py-1.5 bg-[#0091DA] hover:bg-[#0081C2] text-white text-xs font-bold cursor-pointer rounded-lg flex items-center gap-1.5 shadow-md">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isTranscribing ? 'Transcribing...' : 'Select MP3'}</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/m4a"
                        onChange={handleAudioUpload}
                        disabled={isTranscribing}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: EXECUTION STEPS WATERFALL */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                isDarkMode ? 'bg-[#1C1E24] border-[#2E313B]' : 'bg-[#F3F4F6] border-[#E5E7EB]'
              }`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span>Execution Steps</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {executionSteps.length} Steps
                </span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {executionSteps.length === 0 && !isRunning && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
                    <Terminal className="w-7 h-7 mb-2 opacity-40" />
                    <p className="text-xs font-bold">Awaiting Execution</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click &quot;Test Run&quot; to execute agent.</p>
                  </div>
                )}

                {executionSteps.map((step, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 rounded-xl border text-xs font-mono ${
                      isDarkMode ? 'bg-[#1A1C22] border-[#2A2D36] text-slate-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 mb-1 border-b border-inherit">
                      <div className="flex items-center gap-1.5 font-bold text-[#0091DA]">
                        <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                        <span>{step.step}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{step.latencyMs}ms</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">{step.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 3: OUTPUT */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                isDarkMode ? 'bg-[#1C1E24] border-[#2E313B]' : 'bg-[#F3F4F6] border-[#E5E7EB]'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Output</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOutputTab('summary')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      outputTab === 'summary' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setOutputTab('actions')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      outputTab === 'actions' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Actions
                  </button>
                  <button
                    onClick={() => setOutputTab('json')}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      outputTab === 'json' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto">
                {!simulationResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
                    <Sparkles className="w-7 h-7 mb-2 opacity-40 text-[#10B981]" />
                    <p className="text-xs font-bold">No Output Generated</p>
                  </div>
                ) : (
                  <>
                    {outputTab === 'summary' && (
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-mono text-slate-400">
                          Tone: <strong className="text-[#10B981]">{simulationResult.sentiment}</strong>
                        </div>
                        <div className="space-y-1">
                          {simulationResult.summary.map((pt, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                              <span className="text-[#10B981] font-bold">▪</span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {outputTab === 'actions' && (
                      <div className="space-y-2">
                        {simulationResult.actionItems.map((act, i) => (
                          <div key={i} className={`p-2 rounded-xl border text-xs ${
                            isDarkMode ? 'bg-[#1A1C22] border-[#2A2D36]' : 'bg-white border-gray-200'
                          }`}>
                            <div className="font-bold text-white mb-1">{act.task}</div>
                            <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                              <span>Assignee: <strong className="text-cyan-400">{act.assignee}</strong></span>
                              <span>Due: <strong className="text-amber-400">{act.deadline}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {outputTab === 'json' && (
                      <div className="relative h-full">
                        <button
                          onClick={() => copyJsonOutput(simulationResult)}
                          className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded-md font-mono flex items-center gap-1"
                        >
                          {copiedJson ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                        </button>
                        <pre className="h-full overflow-auto text-[10px] font-mono p-2 bg-black/30 rounded-xl text-emerald-400">
                          {JSON.stringify(simulationResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Minimal Telemetry Footer */}
          <div className={`px-6 py-2 border-t flex items-center justify-between text-xs font-mono ${
            isDarkMode ? 'bg-[#121316] border-[#2E313B] text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-700'
          }`}>
            <div className="flex items-center gap-4">
              <span>Latency: <strong className="text-white">{simulationResult?.observability?.totalLatencyMs || 0}ms</strong></span>
              <span>Tokens: <strong className="text-white">{simulationResult?.observability?.totalTokens || 0}</strong></span>
              <span>Cost: <strong className="text-amber-400">${simulationResult?.economics?.costUsd?.toFixed(4) || '0.0000'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span>SHA-256:</span>
              <button
                onClick={() => simulationResult?.auditHash && copyHash(simulationResult.auditHash)}
                disabled={!simulationResult?.auditHash}
                className="text-[10px] text-cyan-400 font-mono hover:underline"
              >
                {simulationResult?.auditHash ? `${simulationResult.auditHash.substring(0, 16)}...` : 'Pending'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
