// Exact backup of CanvasExecutionDrawer.jsx before minimal n8n-style refactoring
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw, 
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
  AlertTriangle, 
  Sparkles, 
  Bot, 
  Server, 
  Database, 
  Zap, 
  ListChecks, 
  FileSpreadsheet, 
  ExternalLink,
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

  // Attached pillars derived from canvas nodes
  const attachedPillars = nodes
    .filter(n => n.type === 'pillar')
    .map(n => ({
      id: n.data.toolId || n.id,
      name: n.data.name,
      type: n.data.pillarType,
      config: n.data.config || {}
    }));

  const activeModelNode = nodes.find(n => n.type === 'pillar' && n.data.pillarType === 'model');
  const activeModelName = activeModelNode?.data?.name || 'Gemini 2.0 Flash';

  // Handle sample selection change
  const handleSelectSample = (idx) => {
    setSelectedSampleIndex(idx);
    setTranscriptText(SAMPLE_MEETINGS[idx].transcript);
  };

  // MP3 Audio Upload & Diarization
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
      setTranscriptText(`[00:02] Sarah Chen: Finalizing the Q3 Enterprise Launch roadmap and GPU cluster expansion.
[00:18] David Miller: Streaming gateway is 95% complete. We anticipate a bottleneck without additional H100 instances.
[01:05] Alex Wong: What is the cost impact?
[01:12] David Miller: Approximately $45,000 extra per month. Base compensation already accounts for maintenance.
[02:14] Alex Wong: Approved using the $60,000 Q2 marketing reserve buffer, provided Priya delivers the latency benchmark report by next Tuesday.
[02:45] Priya Patel: I will run stress tests against Singapore and Frankfurt clusters and publish the final latency matrix by Tuesday, 5 PM EST.`);
      setInputTab('raw');
    }
  };

  // Run Agent Simulation on Canvas
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

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to Run
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
    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-200 select-none shadow-2xl border-t ${
      isDarkMode 
        ? 'bg-[#10141E] border-[#2B354B] text-white shadow-[0_-12px_40px_rgba(0,0,0,0.7)]' 
        : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_-12px_40px_rgba(0,30,80,0.12)]'
    }`}>
      {/* 1. COLLAPSED DOCK / PRIMARY RUN TOOLBAR */}
      <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
        isDarkMode ? 'border-[#2B354B] bg-[#141824]' : 'border-[#E0E0E0] bg-[#F8F9FB]'
      }`}>
        {/* Left: Prominent Run Button & Sample Selector */}
        <div className="flex items-center gap-3">
          {/* Main Run Button */}
          <button
            onClick={handleRunAgent}
            disabled={isRunning}
            className={`btn-tactile px-4 py-2 flex items-center gap-2 font-bold text-xs shadow-md transition-all ${
              isRunning
                ? 'bg-[#EAAA00] text-black border border-amber-400 cursor-wait animate-pulse'
                : 'bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#0091DA]/50'
            }`}
            title="Execute Agent against input payload (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current animate-spin" />
                <span className="font-mono tracking-tight">RUNNING AGENT...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-[#0091DA]" />
                <span className="font-mono tracking-tight">RUN AGENT</span>
                <span className="text-[10px] opacity-75 font-mono px-1 py-0.2 bg-black/20 rounded-none border border-white/20">
                  Ctrl+↵
                </span>
              </>
            )}
          </button>

          {/* Quick Input Preset Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 font-medium">Input:</span>
            <select
              value={selectedSampleIndex}
              onChange={(e) => handleSelectSample(Number(e.target.value))}
              disabled={isRunning}
              className={`text-xs py-1.5 px-2.5 font-mono border focus:outline-none rounded-none cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#1C2230] border-[#2B354B] text-slate-200 focus:border-[#0091DA]' 
                  : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
              }`}
            >
              {SAMPLE_MEETINGS.map((m, idx) => (
                <option key={m.id} value={idx}>
                  {m.title} ({m.speakers?.length || 3} speakers)
                </option>
              ))}
            </select>
          </div>

          {/* Active Model Indicator */}
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border ${
            isDarkMode ? 'bg-[#1C2230] border-[#2B354B] text-slate-300' : 'bg-white border-[#CBD5E1] text-slate-600'
          }`}>
            <Bot className="w-3 h-3 text-[#0091DA]" />
            <span className="font-bold text-slate-400">Brain:</span>
            <span className="truncate max-w-[140px] text-white font-bold">{activeModelName}</span>
          </div>
        </div>

        {/* Center: Ambient Backend Supervision Status Chips */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1 px-2 py-0.5 border border-[#009A44]/40 bg-[#009A44]/15 text-[#009A44] font-bold">
            <ShieldCheck className="w-3 h-3" />
            <span>SHA-256 Supervised</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 border border-[#0091DA]/40 bg-[#0091DA]/15 text-[#0091DA] font-bold">
            <Activity className="w-3 h-3" />
            <span>OTel Tracing Active</span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 border border-[#EAAA00]/40 bg-[#EAAA00]/15 text-[#EAAA00] font-bold">
            <DollarSign className="w-3 h-3" />
            <span>Cost Metered</span>
          </div>
        </div>

        {/* Right: Last Run Summary Metrics + Expand/Collapse Button */}
        <div className="flex items-center gap-3">
          {simulationResult && (
            <div className={`hidden sm:flex items-center gap-3 text-xs font-mono px-3 py-1 border ${
              isDarkMode ? 'bg-[#1C2230] border-[#2B354B] text-slate-300' : 'bg-white border-[#CBD5E1] text-slate-700'
            }`}>
              <div className="flex items-center gap-1 text-cyan-400 font-bold">
                <Clock className="w-3 h-3 text-[#0091DA]" />
                <span>{simulationResult.observability.totalLatencyMs}ms</span>
              </div>
              <span className="text-slate-500">•</span>
              <div className="text-amber-400 font-bold">
                ${simulationResult.economics.costUsd.toFixed(4)}
              </div>
              <span className="text-slate-500">•</span>
              <div className="text-emerald-400 font-bold">
                +{simulationResult.economics.netRoiMultiplier}x ROI
              </div>
            </div>
          )}

          {/* Expand / Collapse Drawer Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`btn-tactile px-3 py-1.5 flex items-center gap-1.5 text-xs font-mono font-bold border transition-colors ${
              isExpanded 
                ? 'bg-[#00338D] text-white border-[#0091DA]' 
                : isDarkMode 
                  ? 'bg-[#1C2230] hover:bg-[#252C3D] text-slate-300 border-[#2B354B]' 
                  : 'bg-white hover:bg-slate-100 text-[#0B0F19] border-[#CBD5E1]'
            }`}
          >
            <span>{isExpanded ? 'Collapse Deck' : 'Inspect Output & Logs'}</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED EXECUTION DECK (n8n-style Three-Column Inspection Panel) */}
      {isExpanded && (
        <div className={`h-[380px] flex flex-col border-t transition-colors ${
          isDarkMode ? 'bg-[#0E121B] border-[#2B354B]' : 'bg-[#F5F6F8] border-[#CBD5E1]'
        }`}>
          {/* Main 3-Pane Body */}
          <div className="flex-1 grid grid-cols-12 divide-x divide-inherit overflow-hidden">
            
            {/* COLUMN 1: TEST INPUT & PAYLOAD (4 Cols) */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              {/* Column Header with Tabs */}
              <div className={`px-3 py-2 border-b flex items-center justify-between text-xs font-mono font-bold ${
                isDarkMode ? 'bg-[#141824] border-[#2B354B]' : 'bg-[#EBF0F7] border-[#CBD5E1]'
              }`}>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span>TEST INPUT PAYLOAD</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setInputTab('preset')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                      inputTab === 'preset' 
                        ? 'bg-[#00338D] text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Preset
                  </button>
                  <button
                    onClick={() => setInputTab('raw')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors ${
                      inputTab === 'raw' 
                        ? 'bg-[#00338D] text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Raw Edit
                  </button>
                  <button
                    onClick={() => setInputTab('audio')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase transition-colors flex items-center gap-1 ${
                      inputTab === 'audio' 
                        ? 'bg-[#00338D] text-white' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Music className="w-2.5 h-2.5" />
                    MP3
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-3 overflow-y-auto">
                {inputTab === 'preset' && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-400 font-mono">
                      Select an enterprise multi-speaker meeting transcript to simulate reasoning:
                    </p>
                    {SAMPLE_MEETINGS.map((sample, idx) => (
                      <div
                        key={sample.id}
                        onClick={() => handleSelectSample(idx)}
                        className={`p-2.5 border cursor-pointer transition-all ${
                          selectedSampleIndex === idx
                            ? isDarkMode
                              ? 'bg-[#00338D]/25 border-[#0091DA] text-white'
                              : 'bg-[#E6EDF7] border-[#00338D] text-[#00338D]'
                            : isDarkMode
                              ? 'bg-[#141824] border-[#2B354B] text-slate-300 hover:border-slate-500'
                              : 'bg-white border-[#CBD5E1] text-[#0B0F19] hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="truncate">{sample.title}</span>
                          <span className="text-[10px] font-mono opacity-75">{sample.duration}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {sample.transcript.slice(0, 140)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {inputTab === 'raw' && (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={transcriptText}
                      onChange={(e) => setTranscriptText(e.target.value)}
                      placeholder="Paste or type meeting dialogue, notes, or multi-speaker transcripts here..."
                      className={`flex-1 w-full p-2.5 text-xs font-mono resize-none focus:outline-none rounded-none border ${
                        isDarkMode 
                          ? 'bg-[#0B0F19] border-[#2B354B] text-slate-200 focus:border-[#0091DA]' 
                          : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
                      }`}
                    />
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1.5">
                      <span>{transcriptText.length} characters</span>
                      <span>~{Math.round(transcriptText.length / 4)} tokens</span>
                    </div>
                  </div>
                )}

                {inputTab === 'audio' && (
                  <div className="h-full flex flex-col justify-center items-center text-center p-4 border border-dashed border-[#2B354B]">
                    <Music className="w-8 h-8 text-[#0091DA] mb-2 animate-bounce" />
                    <h4 className="text-xs font-bold mb-1">Native MP3 Audio Ingestion</h4>
                    <p className="text-[11px] text-slate-400 mb-3 max-w-[240px]">
                      Upload meeting MP3 audio stream for automated speech-to-text diarization.
                    </p>
                    <label className="btn-tactile px-3 py-1.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-mono font-bold cursor-pointer border border-[#0091DA]/50 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isTranscribing ? 'Transcribing...' : 'Select MP3 File'}</span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/m4a"
                        onChange={handleAudioUpload}
                        disabled={isTranscribing}
                        className="hidden"
                      />
                    </label>
                    {audioFile && (
                      <div className="text-[10px] font-mono text-emerald-400 mt-2">
                        {audioFile.name} ({audioFile.size})
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: REAL-TIME EXECUTION TRACE & WATERFALL (4 Cols) */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className={`px-3 py-2 border-b flex items-center justify-between text-xs font-mono font-bold ${
                isDarkMode ? 'bg-[#141824] border-[#2B354B]' : 'bg-[#EBF0F7] border-[#CBD5E1]'
              }`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span>EXECUTION WATERFALL</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {executionSteps.length} Steps Logged
                </span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                {executionSteps.length === 0 && !isRunning && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
                    <Terminal className="w-7 h-7 mb-2 opacity-50" />
                    <p className="text-xs font-mono font-bold">Execution Engine Standby</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                      Click &quot;Run Agent&quot; or press Ctrl+Enter to trigger execution pipeline.
                    </p>
                  </div>
                )}

                {executionSteps.map((step, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 border text-xs font-mono animate-in fade-in duration-100 ${
                      isDarkMode 
                        ? 'bg-[#141824] border-[#2B354B] text-slate-200' 
                        : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-inherit mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-[#0091DA]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#009A44]" />
                        <span>{step.step}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{step.latencyMs}ms</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      {step.detail}
                    </p>
                  </div>
                ))}

                {isRunning && (
                  <div className="p-2 border border-[#0091DA] bg-[#0091DA]/10 flex items-center gap-2 text-xs font-mono text-[#0091DA] animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-[#0091DA] beacon-live" />
                    <span>Processing live multi-pillar reasoning...</span>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: SYNTHESIZED AGENT OUTPUT (4 Cols) */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className={`px-3 py-2 border-b flex items-center justify-between text-xs font-mono font-bold ${
                isDarkMode ? 'bg-[#141824] border-[#2B354B]' : 'bg-[#EBF0F7] border-[#CBD5E1]'
              }`}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#009A44]" />
                  <span>SYNTHESIZED OUTPUT</span>
                </div>

                {/* Output View Tabs */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOutputTab('summary')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      outputTab === 'summary' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setOutputTab('actions')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      outputTab === 'actions' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Actions ({simulationResult?.actionItems?.length || 0})
                  </button>
                  <button
                    onClick={() => setOutputTab('decisions')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      outputTab === 'decisions' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Decisions
                  </button>
                  <button
                    onClick={() => setOutputTab('json')}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                      outputTab === 'json' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Output Content */}
              <div className="flex-1 p-3 overflow-y-auto">
                {!simulationResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-10">
                    <Sparkles className="w-7 h-7 mb-2 opacity-50 text-[#009A44]" />
                    <p className="text-xs font-mono font-bold">No Output Generated Yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                      Execute the agent to see extracted actions, decisions, and executive summaries.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Summary Tab */}
                    {outputTab === 'summary' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-mono border-b pb-1.5 border-inherit">
                          <span className="font-bold text-slate-400">Sentiment & Morale:</span>
                          <span className="text-[#009A44] font-bold">{simulationResult.sentiment}</span>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold block text-[#0091DA]">Executive Key Takeaways:</span>
                          {simulationResult.summary.map((pt, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
                              <span className="text-[#009A44] font-bold shrink-0 mt-0.5">▪</span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items Tab */}
                    {outputTab === 'actions' && (
                      <div className="space-y-2">
                        {simulationResult.actionItems.map((act, i) => (
                          <div 
                            key={i} 
                            className={`p-2.5 border text-xs ${
                              isDarkMode ? 'bg-[#141824] border-[#2B354B]' : 'bg-white border-[#CBD5E1]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white">{act.task}</span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-[#00338D] text-white">
                                {act.priority || 'High'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1 pt-1 border-t border-inherit">
                              <span>Assignee: <strong className="text-cyan-400">{act.assignee}</strong></span>
                              <span>Due: <strong className="text-amber-400">{act.deadline}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Decisions Tab */}
                    {outputTab === 'decisions' && (
                      <div className="space-y-2">
                        {simulationResult.decisions.map((dec, i) => (
                          <div 
                            key={i} 
                            className={`p-2.5 border border-l-4 border-l-[#009A44] text-xs ${
                              isDarkMode ? 'bg-[#141824] border-[#2B354B]' : 'bg-white border-[#CBD5E1]'
                            }`}
                          >
                            <span className="text-[10px] font-mono font-bold text-[#009A44] uppercase block mb-1">
                              Binding Agreement #{i + 1}
                            </span>
                            <p className="text-slate-200 leading-relaxed font-sans">{dec}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Raw JSON Tab */}
                    {outputTab === 'json' && (
                      <div className="relative h-full">
                        <button
                          onClick={() => copyJsonOutput(simulationResult)}
                          className="absolute top-2 right-2 btn-tactile px-2 py-1 bg-[#00338D] text-white text-[10px] font-mono flex items-center gap-1 border border-white/20"
                        >
                          {copiedJson ? <Check className="w-3 h-3 text-[#009A44]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        <pre className="h-full overflow-auto text-[10px] font-mono p-2 bg-[#0B0F19] text-emerald-400 border border-[#1E293B]">
                          {JSON.stringify(simulationResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

          </div>

          {/* 3. PERVASIVE AMBIENT TELEMETRY FOOTER (Always Visible when Expanded) */}
          <div className={`px-4 py-2 border-t flex items-center justify-between text-xs font-mono ${
            isDarkMode ? 'bg-[#0B0F19] border-[#2B354B] text-slate-300' : 'bg-[#EBF0F7] border-[#CBD5E1] text-slate-800'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0091DA]" />
                <span className="text-slate-400">Total Latency:</span>
                <strong className="text-white">{simulationResult?.observability?.totalLatencyMs || 0} ms</strong>
              </div>

              <span className="text-slate-600">|</span>

              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#0091DA]" />
                <span className="text-slate-400">Token Meter:</span>
                <strong className="text-white">{simulationResult?.observability?.totalTokens || 0} tokens</strong>
              </div>

              <span className="text-slate-600">|</span>

              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#EAAA00]" />
                <span className="text-slate-400">Compute Cost:</span>
                <strong className="text-amber-400">${simulationResult?.economics?.costUsd?.toFixed(4) || '0.0000'}</strong>
              </div>

              <span className="text-slate-600">|</span>

              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#009A44]" />
                <span className="text-slate-400">Labor Saved:</span>
                <strong className="text-emerald-400">+${simulationResult?.economics?.humanValueSavedUsd || '0.00'}</strong>
              </div>
            </div>

            {/* SHA-256 Fingerprint with 1-click Copy */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[10px]">W3C SHA-256 Audit:</span>
              <button
                onClick={() => simulationResult?.auditHash && copyHash(simulationResult.auditHash)}
                disabled={!simulationResult?.auditHash}
                className="btn-tactile px-2 py-0.5 bg-black/40 hover:bg-black/60 border border-slate-700 text-[10px] text-cyan-400 font-mono flex items-center gap-1"
                title="Click to copy cryptographic audit hash"
              >
                <Fingerprint className="w-3 h-3 text-[#0091DA]" />
                <span>
                  {simulationResult?.auditHash 
                    ? `${simulationResult.auditHash.substring(0, 18)}...` 
                    : 'Awaiting Run...'}
                </span>
                {copiedHash ? <Check className="w-3 h-3 text-[#009A44]" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
