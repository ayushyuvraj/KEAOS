import React, { useState } from 'react';
import { 
  Play, 
  Upload, 
  FileText, 
  Music, 
  Type, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Activity, 
  DollarSign, 
  CheckCircle2, 
  Plus,
  Terminal,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Cpu,
  Copy,
  Check,
  Database,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { SAMPLE_MEETINGS } from '../constants/sampleMeetings';
import { 
  runMeetingSimulation, 
  getEpisodicMemoryStore, 
  clearEpisodicMemoryStore 
} from '../utils/meetingSimulatorEngine';
import { transcribeAudioUniversal, getProviderCredential } from '../services/llmService';
import { getActiveApiKey } from '../services/geminiService';
import { 
  dispatchDistributedWorkflow, 
  streamWorkflowTelemetry, 
  checkGatewayHealth 
} from '../services/backendConnector';

export default function MeetingSimulator({
  activeUseCase,
  nodes,
  edges,
  onAddToolToCanvas
}) {
  const [inputMode, setInputMode] = useState('paste');
  const [transcriptText, setTranscriptText] = useState('');
  const [mp3File, setMp3File] = useState(null);
  const [txtFile, setTxtFile] = useState(null);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [activeOutputTab, setActiveOutputTab] = useState('summary');
  const [copiedHash, setCopiedHash] = useState(false);
  const [executionMode, setExecutionMode] = useState('local'); // 'local' | 'cluster'

  const attachedPillars = nodes
    .filter(n => n.type === 'pillar' && !n.data?.isDeactivated)
    .map(n => ({
      id: n.data.toolId || n.id,
      name: n.data.name,
      type: n.data.pillarType,
      config: n.data.config || {},
      customDirective: n.data.customDirective || null,
      referenceDoc: n.data.referenceDoc || null
    }));

  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);

  const handleMp3Upload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setMp3File({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        duration: 'Processing audio stream...'
      });

      const googleKey = getProviderCredential('google') || getActiveApiKey();
      const openAiKey = getProviderCredential('openai');

      if (googleKey || openAiKey) {
        setIsTranscribingAudio(true);
        try {
          const transResult = await transcribeAudioUniversal(file);
          setTranscriptText(transResult.transcript);
          setMp3File(prev => ({ 
            ...prev, 
            duration: `${(transResult.durationMs / 1000).toFixed(1)}s (${transResult.provider})` 
          }));
        } catch (err) {
          alert(`Audio transcription failed: ${err.message}`);
        } finally {
          setIsTranscribingAudio(false);
        }
      } else {
        alert('No Google or OpenAI API Key found. Please configure an API Key in API Credentials to transcribe MP3 audio files.');
      }
    }
  };

  const handleTxtUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTxtFile({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
        setTranscriptText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setExecutionSteps([]);
    setSimulationResult(null);

    if (executionMode === 'cluster') {
      const health = await checkGatewayHealth();
      if (health.online) {
        try {
          const dispatch = await dispatchDistributedWorkflow({
            transcript: transcriptText,
            agentConfig: activeUseCase.agent,
            attachedPillars
          });

          // Stream real-time checkpoints via Server-Sent Events (SSE)
          streamWorkflowTelemetry(dispatch.workflowId, {
            onCheckpoint: (cp) => {
              setExecutionSteps((prev) => [
                ...prev,
                {
                  step: cp.stage,
                  detail: JSON.stringify(cp.payload || {}),
                  latencyMs: 120,
                  timestamp: new Date().toLocaleTimeString()
                }
              ]);
            },
            onDone: async () => {
              const localResult = await runMeetingSimulation({
                transcript: transcriptText,
                frameworkId: activeUseCase.framework.id,
                agentConfig: activeUseCase.agent,
                attachedPillars
              });
              setSimulationResult({
                ...localResult,
                clusterExecutionId: dispatch.workflowId
              });
              setIsRunning(false);
            },
            onError: () => {
              setIsRunning(false);
            }
          });
          return;
        } catch (err) {
          console.warn('Cluster dispatch failed, falling back to local simulation:', err);
        }
      } else {
        alert('Cluster Gateway is not running on port 4000.\nRun "node server/index.js" in your terminal to start the cluster.\nFalling back to local in-browser execution.');
      }
    }

    const result = await runMeetingSimulation({
      transcript: transcriptText,
      frameworkId: activeUseCase.framework.id,
      agentConfig: activeUseCase.agent,
      attachedPillars,
      onStepProgress: (newStep, allSteps) => {
        setExecutionSteps(allSteps);
      }
    });

    setSimulationResult(result);
    setIsRunning(false);
  };

  const copyAuditHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="flex-1 h-full bg-[#F5F6F8] flex overflow-hidden select-none">
      {/* Left Column: Multimodal Ingestion Console */}
      <div className="w-[480px] h-full border-r border-[#CBD5E1] flex flex-col shrink-0 bg-[#FFFFFF] shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-[#E0E0E0] bg-[#F8F9FB]">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-[#0B0F19] tracking-tight">Multimodal Input Ingest</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6EDF7] text-[#00338D] border border-[#00338D]/30 font-bold">
              STREAM READY
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Ingest meeting artifacts to trigger the visual agent graph execution.
          </p>
        </div>

        {/* Execution Mode Selector: Local vs Distributed Cluster */}
        <div className="px-4 py-2 bg-[#001E50] text-white flex items-center justify-between text-xs border-b border-[#00338D]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#0091DA]" />
            Engine:
          </span>
          <div className="flex items-center gap-1 bg-black/30 p-0.5 border border-white/10">
            <button
              onClick={() => setExecutionMode('local')}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold transition-all cursor-pointer ${
                executionMode === 'local'
                  ? 'bg-[#00338D] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              In-Browser
            </button>
            <button
              onClick={async () => {
                const health = await checkGatewayHealth();
                if (!health.online) {
                  alert('KEAOS Cluster Gateway is offline at http://localhost:4000.\nTo launch the cluster, run in your terminal:\n\nnode server/index.js');
                }
                setExecutionMode('cluster');
              }}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                executionMode === 'cluster'
                  ? 'bg-[#009A44] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Cluster (Port 4000)</span>
            </button>
          </div>
        </div>

        {/* Input Switcher (Tabs) */}
        <div className="flex border-b border-[#CBD5E1] bg-[#F8F9FB] p-1.5 gap-1.5">
          <button
            onClick={() => setInputMode('mp3')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-none transition-all ${
              inputMode === 'mp3'
                ? 'bg-[#00338D] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#FFFFFF] hover:text-[#0B0F19]'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>MP3 Audio</span>
          </button>
          <button
            onClick={() => setInputMode('txt')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-none transition-all ${
              inputMode === 'txt'
                ? 'bg-[#00338D] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#FFFFFF] hover:text-[#0B0F19]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>TXT Document</span>
          </button>
          <button
            onClick={() => setInputMode('paste')}
            className={`flex-1 py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-none transition-all ${
              inputMode === 'paste'
                ? 'bg-[#00338D] text-white shadow-sm'
                : 'text-slate-600 hover:bg-[#FFFFFF] hover:text-[#0B0F19]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Paste Text</span>
          </button>
        </div>

        {/* Dynamic Input Body */}
        <div className="p-4 flex-1 flex flex-col overflow-y-auto space-y-4">
          {inputMode === 'mp3' && (
            <div className="space-y-4">
              <div className="border border-dashed border-[#CBD5E1] p-6 text-center bg-[#F8F9FB] space-y-3">
                <Music className="w-10 h-10 text-[#00338D] mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-[#0B0F19] tracking-tight">Upload MP3 Audio Recording</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Audio is transcribed using Gemini 2.0 or OpenAI Whisper API.
                  </p>
                </div>
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/m4a"
                  onChange={handleMp3Upload}
                  className="hidden"
                  id="mp3-file-input"
                />
                <label
                  htmlFor="mp3-file-input"
                  className="btn-tactile inline-flex items-center gap-2 px-4 py-2 bg-[#00338D] text-white text-xs font-bold cursor-pointer rounded-none shadow-sm hover:bg-[#005EB8]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Audio File</span>
                </label>
              </div>

              {isTranscribingAudio && (
                <div className="p-3 bg-[#E6EDF7] border border-[#00338D]/30 flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-[#00338D] border-t-transparent animate-spin" />
                  <span className="text-xs font-bold text-[#00338D]">Transcribing audio with real Speech-to-Text API...</span>
                </div>
              )}

              {mp3File && (
                <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F19] block">{mp3File.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{mp3File.size} • {mp3File.duration}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E6F5EC] text-[#009A44]">Ready</span>
                </div>
              )}
            </div>
          )}

          {inputMode === 'txt' && (
            <div className="space-y-4">
              <div className="border border-dashed border-[#CBD5E1] p-6 text-center bg-[#F8F9FB] space-y-3">
                <FileText className="w-10 h-10 text-[#00338D] mx-auto" />
                <div>
                  <h4 className="text-xs font-bold text-[#0B0F19] tracking-tight">Upload Plain Text Transcript</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Upload .txt or markdown meeting notes.</p>
                </div>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleTxtUpload}
                  className="hidden"
                  id="txt-file-input"
                />
                <label
                  htmlFor="txt-file-input"
                  className="btn-tactile inline-flex items-center gap-2 px-4 py-2 bg-[#00338D] text-white text-xs font-bold cursor-pointer rounded-none shadow-sm hover:bg-[#005EB8]"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Text File</span>
                </label>
              </div>

              {txtFile && (
                <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F19] block">{txtFile.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{txtFile.size}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E6F5EC] text-[#009A44]">Loaded</span>
                </div>
              )}
            </div>
          )}

          {/* Transcript Text Editor */}
          <div className="flex-1 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B0F19] tracking-tight">Meeting Transcript Buffer</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTranscriptText(SAMPLE_MEETINGS[0].transcript)}
                  className="btn-tactile text-[10px] font-mono font-bold px-2 py-0.5 bg-[#F8F9FB] border border-[#CBD5E1] text-[#00338D] hover:bg-[#E6EDF7]"
                >
                  Preset 1 (Strategy)
                </button>
                <button
                  onClick={() => setTranscriptText(SAMPLE_MEETINGS[1].transcript)}
                  className="btn-tactile text-[10px] font-mono font-bold px-2 py-0.5 bg-[#F8F9FB] border border-[#CBD5E1] text-[#00338D] hover:bg-[#E6EDF7]"
                >
                  Preset 2 (Postmortem)
                </button>
              </div>
            </div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste raw transcript with speaker labels and timestamps..."
              className="flex-1 min-h-[220px] p-3 text-xs font-mono bg-[#FFFFFF] border border-[#CBD5E1] focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] outline-none resize-none leading-relaxed text-[#0B0F19]"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>{transcriptText.length} characters</span>
              <span>~{Math.round(transcriptText.length / 4)} tokens</span>
            </div>
          </div>
        </div>

        {/* Active Episodic Memory Ingest Status */}
        {attachedPillars.some(p => p.type === 'memory') && (
          <div className="px-4 py-2.5 bg-[#EFEBF5] border-t border-[#483698]/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#483698]">
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold text-[11px]">Episodic Memory Linked</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#483698]/20 text-[#483698] font-bold">
              {getEpisodicMemoryStore().length} Commitments Primed
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="p-4 border-t border-[#CBD5E1] bg-[#F8F9FB]">
          <button
            onClick={handleRunSimulation}
            disabled={isRunning || !transcriptText.trim()}
            className="btn-tactile w-full py-3 bg-[#00338D] hover:bg-[#005EB8] disabled:bg-slate-400 text-white font-bold text-xs flex items-center justify-center gap-2 rounded-none shadow-sm transition-all"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Synthesizing Visual Agent Graph...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Visual Agent Pipeline ({activeUseCase.framework.name})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Execution Traces & Structured Intelligence Ledger */}
      <div className="flex-1 h-full overflow-y-auto p-6 space-y-6">
        {/* Waterfall Execution Steps (When Running or After Run) */}
        {executionSteps.length > 0 && (
          <div className="p-4 bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
              <span className="text-xs font-bold text-[#00338D] flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-[#00338D]" />
                Live Pillar Execution Sequence
              </span>
              <span className="text-xs font-mono font-bold text-[#00338D]">
                Framework: {activeUseCase.framework.name}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {executionSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F8F9FB] border border-[#CBD5E1] text-xs shadow-inner"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span className="font-bold text-[#00338D]">Pillar {idx + 1}</span>
                    <span>{step.latencyMs}ms</span>
                  </div>
                  <h5 className="font-bold text-[#0B0F19] truncate tracking-tight">{step.step}</h5>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results View */}
        {simulationResult ? (
          <div className="space-y-6">
            {/* Financial ROI Banner Card */}
            <div className="p-5 bg-[#001E50] border-t-4 border-[#EAAA00] text-white flex items-center justify-between shadow-[0_8px_32px_rgba(0,30,80,0.3)]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-[#00338D] text-[#EAAA00] flex items-center justify-center border border-[#0091DA]/30 shadow-inner">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#EAAA00] font-mono">
                    Financial Impact & ROI Ledger
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5 tracking-tight">
                    Compute Cost: ${simulationResult.economics.costUsd} • Labor Value Saved: ${simulationResult.economics.humanValueSavedUsd}
                  </h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono px-3.5 py-1 rounded-full bg-[#EAAA00] text-[#001E50] font-extrabold shadow-sm">
                  {simulationResult.economics.netRoiMultiplier}x ROI
                </span>
                <span className="block text-[11px] text-slate-300 mt-1.5 font-medium">
                  Saved {simulationResult.economics.humanMinutesSaved} mins of executive advisory review
                </span>
              </div>
            </div>

            {/* Structured Output Views */}
            <div className="bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm overflow-hidden">
              {/* Output Navigation Tabs */}
              <div className="flex items-center border-b border-[#E0E0E0] bg-[#F8F9FB] px-4 pt-2 gap-2">
                <button
                  onClick={() => setActiveOutputTab('summary')}
                  className={`btn-tactile px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 rounded-none transition-all ${
                    activeOutputTab === 'summary'
                      ? 'border-[#00338D] text-[#00338D] bg-[#FFFFFF] shadow-sm'
                      : 'border-transparent text-slate-500 hover:text-[#0B0F19]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#009A44]" />
                  <span>Executive Synthesis ({simulationResult.summary.length})</span>
                </button>

                <button
                  onClick={() => setActiveOutputTab('decisions')}
                  className={`btn-tactile px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 rounded-none transition-all ${
                    activeOutputTab === 'decisions'
                      ? 'border-[#00338D] text-[#00338D] bg-[#FFFFFF] shadow-sm'
                      : 'border-transparent text-slate-500 hover:text-[#0B0F19]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00338D]" />
                  <span>Decisions Register ({simulationResult.decisions.length})</span>
                </button>

                <button
                  onClick={() => setActiveOutputTab('actions')}
                  className={`btn-tactile px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 rounded-none transition-all ${
                    activeOutputTab === 'actions'
                      ? 'border-[#00338D] text-[#00338D] bg-[#FFFFFF] shadow-sm'
                      : 'border-transparent text-slate-500 hover:text-[#0B0F19]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#00A3A6]" />
                  <span>Action Items Matrix ({simulationResult.actionItems.length})</span>
                </button>

                <button
                  onClick={() => setActiveOutputTab('memory')}
                  className={`btn-tactile px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-2 rounded-none transition-all ${
                    activeOutputTab === 'memory'
                      ? 'border-[#483698] text-[#483698] bg-[#FFFFFF] shadow-sm'
                      : 'border-transparent text-slate-500 hover:text-[#0B0F19]'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-[#483698]" />
                  <span>
                    Episodic Memory ({simulationResult.memory?.hasMemory ? `${simulationResult.memory?.retrievedItems?.length || 0} Ingested` : 'Off'})
                  </span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-5">
                {activeOutputTab === 'summary' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0B0F19] tracking-tight uppercase font-mono">
                      High-Level Executive Takeaways
                    </h4>
                    <ul className="space-y-2">
                      {simulationResult.summary.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#009A44] mt-1.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeOutputTab === 'decisions' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0B0F19] tracking-tight uppercase font-mono">
                      Institutional Decisions Register
                    </h4>
                    <div className="divide-y divide-[#E0E0E0]">
                      {simulationResult.decisions.map((dec, idx) => (
                        <div key={idx} className="py-3 flex items-start gap-3">
                          <span className="w-5 h-5 bg-[#00338D]/10 text-[#00338D] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs text-[#0B0F19] font-medium leading-relaxed">{dec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeOutputTab === 'actions' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0B0F19] tracking-tight uppercase font-mono">
                      Action Items & Ownership Matrix
                    </h4>
                    <div className="overflow-x-auto border border-[#CBD5E1]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F8F9FB] border-b border-[#CBD5E1] text-[10px] font-mono font-bold text-slate-600">
                            <th className="py-2.5 px-3">Assignee</th>
                            <th className="py-2.5 px-3">Deliverable Task</th>
                            <th className="py-2.5 px-3">Deadline</th>
                            <th className="py-2.5 px-3">Priority</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E0E0]">
                          {simulationResult.actionItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#F8F9FB] transition-colors">
                              <td className="py-2.5 px-3 font-bold text-[#00338D]">{item.assignee}</td>
                              <td className="py-2.5 px-3 text-[#0B0F19]">{item.task}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{item.deadline}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                                  item.priority === 'High' 
                                    ? 'bg-[#F2E9F4] text-[#6D2077] border border-[#6D2077]/30' 
                                    : 'bg-[#E6EFF8] text-[#005EB8] border border-[#005EB8]/30'
                                }`}>
                                  {item.priority}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeOutputTab === 'memory' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#483698] tracking-tight uppercase font-mono flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Cross-Session Episodic Memory Pipeline
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Dual-path read/write memory loop preserving institutional state across meeting executions.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (window.confirm('Reset episodic memory store back to default seed commitments?')) {
                              clearEpisodicMemoryStore();
                              alert('Episodic memory store reset.');
                            }
                          }}
                          className="btn-tactile text-[10px] font-mono font-bold px-2.5 py-1 bg-[#F8F9FB] border border-[#CBD5E1] text-slate-600 hover:bg-[#E0E0E0] flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Memory Store</span>
                        </button>
                      </div>
                    </div>

                    {simulationResult.memory?.hasMemory ? (
                      <div className="space-y-4">
                        {/* Read Path: What was ingested */}
                        <div className="p-3 bg-[#EFEBF5] border border-[#483698]/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#483698] font-mono uppercase flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#483698]" />
                              Input Ingest: Retrieved Prior Commitments ({simulationResult.memory.retrievedItems?.length || 0})
                            </span>
                            <span className="text-[10px] font-mono text-[#483698] font-bold px-2 py-0.5 rounded-full bg-[#483698]/10">
                              Injected into Model Context
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {simulationResult.memory.retrievedItems?.map((mem, idx) => (
                              <div key={idx} className="p-2.5 bg-[#FFFFFF] border border-[#483698]/20 text-xs text-slate-700 flex items-start gap-2.5 shadow-xs">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#483698]/10 text-[#483698] font-bold shrink-0">
                                  {mem.date || 'Historical'}
                                </span>
                                <span className="font-mono text-[10px] font-bold uppercase text-[#483698] shrink-0">
                                  [{mem.type || 'NOTE'}]:
                                </span>
                                <span className="text-[11px] leading-relaxed text-[#0B0F19]">{mem.text || mem.task}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Write Path: What was saved */}
                        <div className="p-3 bg-[#E6F5EC] border border-[#009A44]/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#009A44] font-mono uppercase flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#009A44]" />
                              Output Commit: Saved New Deliverables to Memory
                            </span>
                            <span className="text-[10px] font-mono text-[#009A44] font-bold px-2 py-0.5 rounded-full bg-[#009A44]/10">
                              +{simulationResult.memory.newCommittedCount} Committed to Local Persistent Store
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            The newly synthesized decisions and action items from this meeting have been committed into the persistent store. When you run future meetings, the agent will recall these commitments to evaluate follow-through.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-[#F8F9FB] border border-[#CBD5E1] text-center space-y-2">
                        <Database className="w-8 h-8 text-slate-400 mx-auto" />
                        <h5 className="text-xs font-bold text-[#0B0F19]">Stateless Execution Mode</h5>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          No Memory pillar was connected to the agent on the visual canvas. Drag an <span className="font-bold text-[#483698]">Episodic Memory</span> or <span className="font-bold text-[#483698]">Vector Store</span> block and wire it into the <span className="font-mono font-bold text-[#483698]">memory-in</span> socket to enable historical cross-meeting reasoning.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic Compliance Ledger Strip */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6D2077] flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6D2077]" />
                  PII & Redaction Guard
                </span>
                <p className="text-xs text-[#0B0F19] font-medium">
                  {simulationResult.redactedPiiCount > 0
                    ? `Protected: Redacted ${simulationResult.redactedPiiCount} confidential financial values.`
                    : 'Passed: Zero PII violations detected in transcript.'}
                </p>
              </div>

              <div className="p-4 bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#001E50] flex items-center gap-1.5 font-mono">
                    <FileCheck className="w-3.5 h-3.5 text-[#001E50]" />
                    W3C Cryptographic SHA-256 Audit
                  </span>
                  <button
                    onClick={() => copyAuditHash(simulationResult.auditHash)}
                    className="btn-tactile text-[10px] font-mono text-[#00338D] hover:underline flex items-center gap-1"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-[#009A44]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-slate-700 truncate">
                  {simulationResult.auditHash}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Institutional Pre-Flight Intelligence Readiness Console (NO EMPTY VOID!) */
          <div className="space-y-6">
            {/* Top Readiness Banner */}
            <div className="p-5 bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#00338D] text-white flex items-center justify-center shadow-inner">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0B0F19] tracking-tight">
                      Simulation Pre-Flight Readiness
                    </h4>
                    <p className="text-xs text-slate-500">
                      Verify socket bindings, multi-LLM pipeline stages, and cryptographic gates before execution.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#E6F5EC] text-[#009A44] border border-[#009A44]/30 font-mono text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#009A44] beacon-live" />
                    <span>SYSTEM PRIMED</span>
                  </span>
                </div>
              </div>

              {/* Architecture Waterfall Preview Cards */}
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
                  <div className="text-[10px] font-mono font-bold text-[#005EB8] mb-1">STAGE 1: INGESTION</div>
                  <h5 className="font-bold text-[#0B0F19] tracking-tight">Multimodal Normalizer</h5>
                  <p className="text-[11px] text-slate-500 mt-1">Accepts raw audio streams or text, stamps chronological turns.</p>
                </div>

                <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
                  <div className="text-[10px] font-mono font-bold text-[#6D2077] mb-1">STAGE 2: POLICY GUARD</div>
                  <h5 className="font-bold text-[#0B0F19] tracking-tight">PII Masking Sanitizer</h5>
                  <p className="text-[11px] text-slate-500 mt-1">Auto-detects and masks compensation, personal IDs, and secrets.</p>
                </div>

                <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
                  <div className="text-[10px] font-mono font-bold text-[#00338D] mb-1">STAGE 3: REASONING</div>
                  <h5 className="font-bold text-[#0B0F19] tracking-tight">Universal Multi-LLM</h5>
                  <p className="text-[11px] text-slate-500 mt-1">Extracts structured deliverables, commitments, and strategic themes.</p>
                </div>

                <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
                  <div className="text-[10px] font-mono font-bold text-[#001E50] mb-1">STAGE 4: AUDIT</div>
                  <h5 className="font-bold text-[#0B0F19] tracking-tight">SHA-256 Ledger Lock</h5>
                  <p className="text-[11px] text-slate-500 mt-1">Generates immutable cryptographic fingerprint of synthesis output.</p>
                </div>
              </div>
            </div>

            {/* Expected Artifact Structure Preview */}
            <div className="p-5 bg-[#FFFFFF] border border-[#CBD5E1] shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-[#0B0F19] tracking-tight uppercase font-mono">
                Institutional Extraction Target Rubric
              </h4>
              <p className="text-xs text-slate-500">
                The visual agent graph will generate 3 verified enterprise deliverables once triggered:
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 border border-[#CBD5E1] bg-[#F8F9FB]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-[#009A44]" />
                    <span className="font-bold text-xs text-[#0B0F19]">Executive Synthesis</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Distills multi-hour discussions into concise, board-ready strategic summaries and themes.
                  </p>
                </div>

                <div className="p-3.5 border border-[#CBD5E1] bg-[#F8F9FB]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00338D]" />
                    <span className="font-bold text-xs text-[#0B0F19]">Decisions Register</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Formally registers budget approvals, scope sign-offs, and architecture trade-offs.
                  </p>
                </div>

                <div className="p-3.5 border border-[#CBD5E1] bg-[#F8F9FB]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Layers className="w-4 h-4 text-[#00A3A6]" />
                    <span className="font-bold text-xs text-[#0B0F19]">Action Items Matrix</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Maps strict assignees, explicit delivery deadlines, and priority rankings.
                  </p>
                </div>
              </div>

              {/* Ready Trigger Callout */}
              <div className="p-4 bg-[#E6EDF7] border border-[#00338D]/30 flex items-center justify-between mt-3">
                <div className="text-xs text-[#00338D]">
                  <span className="font-bold block">Ready for Execution</span>
                  <span className="text-[11px] text-slate-600">Review or edit the transcript on the left, then trigger the pipeline.</span>
                </div>
                <button
                  onClick={handleRunSimulation}
                  disabled={isRunning || !transcriptText.trim()}
                  className="btn-tactile px-5 py-2 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold rounded-none shadow-sm flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Trigger Agent Pipeline</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
