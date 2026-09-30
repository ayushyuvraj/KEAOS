import React, { useState, useEffect, useRef } from 'react';
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
  Code,
  MessageSquare,
  Send,
  Bot,
  User,
  Trash2,
  RefreshCw,
  Cpu,
  Maximize2,
  Minimize2,
  Minus,
  RotateCcw
} from 'lucide-react';
import MarkdownViewer from './common/MarkdownViewer';
import { runMeetingSimulation } from '../utils/meetingSimulatorEngine';
import { executeUniversalAgentChat } from '../utils/universalAgentEngine';
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
  // Mode: 'chat' (interactive live chat) | 'batch' (transcript benchmark runner)
  const [drawerMode, setDrawerMode] = useState('chat');

  // Batch Test State
  const [transcriptText, setTranscriptText] = useState('');
  const [inputTab, setInputTab] = useState('raw');
  const [outputTab, setOutputTab] = useState('output'); // 'output' | 'json'
  const [isRunning, setIsRunning] = useState(false);
  const [executionSteps, setExecutionSteps] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Batch Test Bench Resizing, Minimizing & Maximizing state
  const [colWidths, setColWidths] = useState([33.33, 33.33, 33.34]); // Percentage width for [input, traces, output]
  const [minimizedCols, setMinimizedCols] = useState({
    input: false,
    traces: false,
    output: false
  });
  const [maximizedCol, setMaximizedCol] = useState(null); // null | 'input' | 'traces' | 'output'

  const containerRef = useRef(null);
  const draggingDividerRef = useRef(null);

  // Interactive Live Chat State
  const [chatInput, setChatInput] = useState('');
  const [isChatRunning, setIsChatRunning] = useState(false);
  const [currentChatStep, setCurrentChatStep] = useState(null);
  const chatBottomRef = useRef(null);

  const initialGreeting = {
    id: 'msg-init',
    role: 'assistant',
    content: `Hello! I am your **${activeUseCase?.name || 'Autonomous Agent'}** built on **${activeUseCase?.framework?.name || 'Google ADK'}**.\n\nAll connected canvas pillars (**Foundation Model**, **Skills**, **MCP Servers**, **Tools**, **Episodic Memory**, and **Guardrails**) are compiled and active. You can chat with me or give me any enterprise task!`,
    timestamp: 'Live',
    auditHash: 'W3C-VERIFIED-GEN01',
    tokens: 48,
    latencyMs: 120
  };

  const [chatMessages, setChatMessages] = useState([initialGreeting]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current && isExpanded && drawerMode === 'chat') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatRunning, isExpanded, drawerMode]);

  // Attached pillars derived from canvas nodes (excluding deactivated components)
  const attachedPillars = (nodes || [])
    .filter(n => n.type === 'pillar' && !n.data?.isDeactivated)
    .map(n => ({
      id: n.data.toolId || n.id,
      name: n.data.name,
      type: n.data.pillarType,
      config: n.data.config || {},
      customDirective: n.data.customDirective || null,
      referenceDoc: n.data.referenceDoc || null
    }));

  // Listen for canvas "Execute Workflow" button trigger
  useEffect(() => {
    const handleExecuteTrigger = () => {
      setIsExpanded(true);
      setDrawerMode('batch');
      handleRunAgent();
    };
    window.addEventListener('keaos:execute-workflow', handleExecuteTrigger);
    return () => window.removeEventListener('keaos:execute-workflow', handleExecuteTrigger);
  }, [isRunning, transcriptText, activeUseCase, attachedPillars]);

  const modelNode = (nodes || []).find(n => n.type === 'pillar' && n.data?.pillarType === 'model' && !n.data?.isDeactivated);
  const modelDisplayName = modelNode?.data?.name || modelNode?.name || 'No Model Connected';

  // Handle Interactive Chat Submission
  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    const promptText = chatInput.trim();
    if (!promptText || isChatRunning) return;

    const userMsgId = `user-${Date.now()}`;
    const newUserMsg = {
      id: userMsgId,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatRunning(true);
    setCurrentChatStep({ step: 'Compiling Graph Topology', detail: 'Gathering active pillars...' });

    if (onExecutionStateChange) {
      onExecutionStateChange({ isExecuting: true, step: 'Starting chat...' });
    }

    try {
      const result = await executeUniversalAgentChat({
        userMessage: promptText,
        conversationHistory: chatMessages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        frameworkId: activeUseCase?.framework?.id || 'google-adk',
        agentConfig: activeUseCase?.agent || {},
        attachedPillars,
        onStepProgress: (currStep, allSteps) => {
          setCurrentChatStep(currStep);
          if (onExecutionStateChange) {
            onExecutionStateChange({ 
              isExecuting: true, 
              step: currStep.step, 
              nodeId: currStep.nodeId, 
              pillarType: currStep.pillarType 
            });
          }
        }
      });

      const assistantMsg = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        auditHash: result.auditHash,
        tokens: result.observability?.totalTokens || 0,
        latencyMs: result.observability?.totalLatencyMs || 0,
        costUsd: result.economics?.costUsd || 0,
        redactedPiiCount: result.redactedPiiCount || 0,
        steps: result.steps
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat execution failed:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Execution Error**: ${err.message}\n\nPlease check your foundation model API keys or endpoint configuration in the settings modal.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatRunning(false);
      setCurrentChatStep(null);
      if (onExecutionStateChange) {
        onExecutionStateChange({ isExecuting: false, step: 'Complete' });
      }
    }
  };

  const handleClearChat = () => {
    setChatMessages([initialGreeting]);
  };

  const handleRunAgent = async () => {
    if (isRunning) return;

    if (!transcriptText || !transcriptText.trim()) {
      alert('⚠️ No input transcript provided.\n\nPlease paste transcript text, select a preset sample, or upload a document/audio file before running execution.');
      setIsExpanded(true);
      setDrawerMode('batch');
      return;
    }

    setIsRunning(true);
    setExecutionSteps([]);
    setSimulationResult(null);
    setIsExpanded(true);
    setDrawerMode('batch');

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
      alert('Please configure a Google or OpenAI API Key in Settings to transcribe audio.');
    }
  };

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

  // Divider dragging handlers
  const handleMouseDown = (dividerIdx) => (e) => {
    e.preventDefault();
    draggingDividerRef.current = {
      dividerIdx,
      startX: e.clientX,
      startWidths: [...colWidths]
    };

    const handleMouseMove = (moveEvent) => {
      if (!draggingDividerRef.current || !containerRef.current) return;
      const { dividerIdx, startX, startWidths } = draggingDividerRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const deltaPercent = ((moveEvent.clientX - startX) / rect.width) * 100;
      setColWidths(prev => {
        const next = [...prev];
        const minPercent = 14;

        if (dividerIdx === 0) {
          let w0 = startWidths[0] + deltaPercent;
          let w1 = startWidths[1] - deltaPercent;
          if (w0 < minPercent) {
            w1 -= (minPercent - w0);
            w0 = minPercent;
          }
          if (w1 < minPercent) {
            w0 -= (minPercent - w1);
            w1 = minPercent;
          }
          next[0] = Math.max(minPercent, w0);
          next[1] = Math.max(minPercent, w1);
        } else if (dividerIdx === 1) {
          let w1 = startWidths[1] + deltaPercent;
          let w2 = startWidths[2] - deltaPercent;
          if (w1 < minPercent) {
            w2 -= (minPercent - w1);
            w1 = minPercent;
          }
          if (w2 < minPercent) {
            w1 -= (minPercent - w2);
            w2 = minPercent;
          }
          next[1] = Math.max(minPercent, w1);
          next[2] = Math.max(minPercent, w2);
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      draggingDividerRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleMaximize = (colKey) => {
    if (maximizedCol === colKey) {
      setMaximizedCol(null);
    } else {
      setMaximizedCol(colKey);
      setMinimizedCols(prev => ({ ...prev, [colKey]: false }));
    }
  };

  const toggleMinimize = (colKey) => {
    if (maximizedCol === colKey) {
      setMaximizedCol(null);
    }
    setMinimizedCols(prev => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      if (next.input && next.traces && next.output) {
        return prev;
      }
      return next;
    });
  };

  const resetLayout = () => {
    setColWidths([33.33, 33.33, 33.34]);
    setMinimizedCols({ input: false, traces: false, output: false });
    setMaximizedCol(null);
  };

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-200 select-none border-t shadow-2xl ${
      isDarkMode 
        ? 'bg-[#18191E] border-[#2E313B] text-white' 
        : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#111827]'
    }`}>
      {/* 1. MINIMAL COLLAPSIBLE DRAWER HEADER */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-10 px-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
      >
        {/* Left: Mode Switcher Tabs */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className={`flex items-center p-0.5 rounded-lg border text-xs font-semibold ${
            isDarkMode ? 'bg-[#121316] border-[#2A2D36]' : 'bg-gray-100 border-gray-200'
          }`}>
            <button
              onClick={() => { setDrawerMode('chat'); setIsExpanded(true); }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                drawerMode === 'chat'
                  ? isDarkMode ? 'bg-[#00338D] text-white shadow-sm' : 'bg-white text-[#00338D] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Agent Chat</span>
            </button>
            <button
              onClick={() => { setDrawerMode('batch'); setIsExpanded(true); }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                drawerMode === 'batch'
                  ? isDarkMode ? 'bg-[#00338D] text-white shadow-sm' : 'bg-white text-[#00338D] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Batch Test Bench</span>
            </button>
          </div>

          {/* Real-time Status Indicator */}
          {isChatRunning && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#0091DA] font-mono animate-pulse ml-2">
              <span className="w-2 h-2 rounded-full bg-[#0091DA]" />
              <span>{currentChatStep?.step || 'Reasoning...'}</span>
            </div>
          )}
          {isRunning && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#FF6D5A] font-mono animate-pulse ml-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6D5A]" />
              <span>Running Batch Simulation...</span>
            </div>
          )}
        </div>

        {/* Center: Tactile Pill Drag Handle */}
        <div className="w-12 h-1 rounded-full bg-slate-600/40 hover:bg-slate-400 transition-colors" />

        {/* Right: Quick Run & Expand Icon */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="text-[11px] font-mono text-slate-400 hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{activeUseCase?.framework?.name || 'Google ADK'}</span>
            <span>•</span>
            <span className="text-[#0091DA]">{modelDisplayName}</span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED DRAWER BODY */}
      {isExpanded && (
        <div className={`h-[420px] flex flex-col border-t transition-colors ${
          isDarkMode ? 'bg-[#121316] border-[#2E313B]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
        }`}>
          {/* ========================================================= */}
          {/* MODE 1: INTERACTIVE LIVE CHAT CONSOLE (Full Topology)     */}
          {/* ========================================================= */}
          {drawerMode === 'chat' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Chat Sub-Header */}
              <div className={`px-5 py-2 border-b flex items-center justify-between text-xs font-mono ${
                isDarkMode ? 'bg-[#18191E] border-[#2A2D36] text-slate-400' : 'bg-white border-gray-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#0091DA]" />
                  <span className="font-bold text-white">
                    {activeUseCase?.name || 'Agent Core'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0091DA]/20 text-[#0091DA]">
                    {activeUseCase?.framework?.name || 'Google ADK'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({attachedPillars.length} active pillars bound)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClearChat}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors"
                    title="Clear Chat History"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Chat Stream History Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {chatMessages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                        isUser 
                          ? 'bg-[#00338D] text-white' 
                          : isDarkMode ? 'bg-[#22242B] border border-[#3E424F] text-[#0091DA]' : 'bg-white border border-[#CBD5E1] text-[#00338D]'
                      }`}>
                        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      {/* Bubble */}
                      <div className="space-y-1">
                        <div className={`p-3 rounded-none border leading-relaxed ${
                          isUser
                            ? 'bg-[#00338D] text-white border-[#00338D]'
                            : isDarkMode
                              ? 'bg-[#1C1E24] border-[#2E313B] text-slate-200'
                              : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
                        }`}>
                          <div className="whitespace-pre-wrap font-sans text-xs">
                            {msg.content}
                          </div>
                        </div>

                        {/* Metadata Footer */}
                        <div className={`flex items-center gap-2 text-[9px] font-mono text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <span>{msg.timestamp}</span>
                          {!isUser && msg.auditHash && (
                            <>
                              <span>•</span>
                              <span className="text-[#0091DA]">SHA-256 Verified</span>
                            </>
                          )}
                          {!isUser && msg.latencyMs && (
                            <>
                              <span>•</span>
                              <span>{msg.latencyMs}ms</span>
                            </>
                          )}
                          {!isUser && msg.costUsd !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">${msg.costUsd.toFixed(4)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Live Step Progress / Thinking Indicator */}
                {isChatRunning && (
                  <div className="flex gap-3 mr-auto max-w-[85%]">
                    <div className="w-7 h-7 rounded-full bg-[#0091DA]/20 border border-[#0091DA] text-[#0091DA] flex items-center justify-center shrink-0 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className={`p-3 border rounded-none text-xs font-mono flex items-center gap-2 ${
                      isDarkMode ? 'bg-[#1C1E24] border-[#0091DA]/40 text-[#0091DA]' : 'bg-blue-50 border-[#0091DA]/40 text-[#00338D]'
                    }`}>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{currentChatStep?.step || 'Reasoning through multi-pillar graph'}...</span>
                      <span className="text-slate-400 text-[10px] hidden sm:inline">({currentChatStep?.detail || 'Synthesizing'})</span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Quick Starter Chips */}
              <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto border-t border-slate-700/20 text-[10px] font-mono shrink-0">
                <span className="text-slate-500 font-bold shrink-0">Prompts:</span>
                {[
                  'Extract key decisions & owners',
                  'Audit commitments against historical memory',
                  'Verify compliance against NDA & PII policies',
                  'Draft executive follow-up email'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setChatInput(chip);
                    }}
                    className={`px-2 py-0.5 rounded border whitespace-nowrap transition-colors ${
                      isDarkMode 
                        ? 'bg-[#1F2128] border-[#383C4A] text-slate-300 hover:text-white hover:border-[#0091DA]' 
                        : 'bg-white border-[#CBD5E1] text-slate-700 hover:text-black hover:border-[#00338D]'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Apple-style Interactive Chat Input Bar */}
              <form onSubmit={handleSendChat} className={`p-3 border-t flex items-center gap-2 ${
                isDarkMode ? 'bg-[#18191E] border-[#2E313B]' : 'bg-white border-[#CBD5E1]'
              }`}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Ask ${activeUseCase?.name || 'Agent'} anything across tools, memory & guardrails... (Press Enter)`}
                  disabled={isChatRunning}
                  className={`flex-1 px-3 py-2 text-xs font-sans rounded-none border focus:outline-none transition-colors ${
                    isDarkMode 
                      ? 'bg-[#121316] border-[#383C4A] text-white focus:border-[#0091DA]' 
                      : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isChatRunning || !chatInput.trim()}
                  className={`px-4 py-2 text-xs font-bold font-mono rounded-none flex items-center gap-1.5 transition-all ${
                    isChatRunning || !chatInput.trim()
                      ? 'opacity-40 bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-[#00338D] hover:bg-[#005EB8] text-white shadow-sm cursor-pointer'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: BATCH DATASET TEST BENCH (Existing 3-Pane Runner) */}
          {/* ========================================================= */}
          {drawerMode === 'batch' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div ref={containerRef} className="flex-1 flex w-full h-full overflow-hidden relative select-none">
                {/* ========================================================= */}
                {/* 1. COLUMN 1: TEST INPUT & PAYLOAD */}
                {/* ========================================================= */}
                {maximizedCol === 'input' || (maximizedCol === null && !minimizedCols.input) ? (
                  <div 
                    style={maximizedCol ? { width: '100%' } : { flex: `${colWidths[0]} 1 0%` }}
                    className={`min-w-[160px] flex flex-col h-full overflow-hidden border-r ${
                      isDarkMode ? 'border-[#2E313B]' : 'border-[#E5E7EB]'
                    }`}
                  >
                    <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                      isDarkMode ? 'bg-[#1C1E24] border-[#2E313B]' : 'bg-[#F3F4F6] border-[#E5E7EB]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#0091DA]" />
                        <span className="font-bold">Input Buffer</span>
                        {maximizedCol === 'input' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#0091DA]/20 text-[#0091DA] font-bold">
                            MAXIMIZED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setInputTab('raw')}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                              inputTab === 'raw' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Raw
                          </button>
                          <button
                            onClick={() => setInputTab('audio')}
                            className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                              inputTab === 'audio' ? 'bg-[#0091DA] text-white font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Audio
                          </button>
                        </div>

                        {/* Window Controls */}
                        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-1">
                          <button
                            onClick={() => toggleMinimize('input')}
                            title="Minimize section"
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleMaximize('input')}
                            title={maximizedCol === 'input' ? 'Restore size' : 'Maximize section'}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {maximizedCol === 'input' ? <Minimize2 className="w-3 h-3 text-[#0091DA]" /> : <Maximize2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-3 text-xs font-mono">
                      {inputTab === 'raw' && (
                        <textarea
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          className={`w-full h-full bg-transparent resize-none focus:outline-none leading-relaxed ${
                            isDarkMode ? 'text-slate-200' : 'text-[#0B0F19]'
                          }`}
                          placeholder="Paste script, meeting transcript, or task prompt..."
                        />
                      )}

                      {inputTab === 'audio' && (
                        <div className="h-full flex flex-col items-center justify-center p-4 border border-dashed border-slate-700 rounded-none text-center">
                          <Music className="w-8 h-8 text-[#0091DA] mb-2" />
                          <label className="px-3 py-1.5 bg-[#0091DA] hover:bg-[#0077B6] text-white cursor-pointer text-xs font-bold transition-colors">
                            Upload MP3 Recording
                            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                          </label>
                          {audioFile && (
                            <div className="text-[10px] text-slate-400 mt-2">
                              {audioFile.name} ({audioFile.size})
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Run Button in Column 1 */}
                    <div className={`p-3 border-t flex items-center justify-between ${
                      isDarkMode ? 'bg-[#18191E] border-[#2E313B]' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <span className="text-[10px] text-slate-500 font-mono">Press Ctrl+Enter to test</span>
                      <button
                        onClick={handleRunAgent}
                        disabled={isRunning}
                        className="px-4 py-1.5 bg-[#FF6D5A] hover:bg-[#FF5A45] text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {isRunning ? <Square className="w-3 h-3 fill-current animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{isRunning ? 'Simulating...' : 'Run Simulation'}</span>
                      </button>
                    </div>
                  </div>
                ) : maximizedCol === null && minimizedCols.input ? (
                  /* Column 1 Minimized Rail */
                  <div className={`w-[44px] shrink-0 flex-none h-full border-r flex flex-col items-center justify-between py-3 select-none transition-colors ${
                    isDarkMode ? 'bg-[#16181D] border-[#2E313B]' : 'bg-[#E5E7EB] border-[#CBD5E1]'
                  }`}>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => toggleMinimize('input')}
                        title="Expand Input Buffer"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-[#0091DA] cursor-pointer"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                      Input Buffer
                    </div>
                    <button
                      onClick={() => toggleMinimize('input')}
                      title="Expand Input Buffer"
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}

                {/* Divider 1: between Col 1 & Col 2 */}
                {maximizedCol === null && !minimizedCols.input && !minimizedCols.traces && (
                  <div
                    onMouseDown={handleMouseDown(0)}
                    className={`w-2 shrink-0 h-full cursor-col-resize flex items-center justify-center transition-all select-none group z-10 ${
                      isDarkMode ? 'bg-[#1C1E24] hover:bg-[#0091DA]' : 'bg-[#E5E7EB] hover:bg-[#00338D]'
                    }`}
                    title="Drag to resize Input & Traces"
                  >
                    <div className="w-0.5 h-7 bg-slate-500 group-hover:bg-white rounded-full transition-colors" />
                  </div>
                )}

                {/* ========================================================= */}
                {/* 2. COLUMN 2: EXECUTION STEP TRACE (TELEMETRY) */}
                {/* ========================================================= */}
                {maximizedCol === 'traces' || (maximizedCol === null && !minimizedCols.traces) ? (
                  <div 
                    style={maximizedCol ? { width: '100%' } : { flex: `${colWidths[1]} 1 0%` }}
                    className={`min-w-[160px] flex flex-col h-full overflow-hidden border-r ${
                      isDarkMode ? 'border-[#2E313B]' : 'border-[#E5E7EB]'
                    }`}
                  >
                    <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                      isDarkMode ? 'bg-[#1C1E24] border-[#2E313B]' : 'bg-[#F3F4F6] border-[#E5E7EB]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[#009A44]" />
                        <span className="font-bold">Pipeline Step Traces</span>
                        {maximizedCol === 'traces' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#009A44]/20 text-[#009A44] font-bold">
                            MAXIMIZED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          {executionSteps.length} Steps
                        </span>

                        {/* Window Controls */}
                        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5">
                          <button
                            onClick={() => toggleMinimize('traces')}
                            title="Minimize section"
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleMaximize('traces')}
                            title={maximizedCol === 'traces' ? 'Restore size' : 'Maximize section'}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {maximizedCol === 'traces' ? <Minimize2 className="w-3 h-3 text-[#009A44]" /> : <Maximize2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-3 space-y-2 text-xs font-mono">
                      {executionSteps.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                          <Clock className="w-6 h-6 mb-1 text-slate-600" />
                          <span>Ready for batch run</span>
                        </div>
                      ) : (
                        executionSteps.map((s, i) => (
                          <div key={i} className={`p-2 rounded border transition-colors ${
                            isDarkMode ? 'bg-[#191B22] border-[#2E313B]' : 'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-center justify-between text-[11px] font-bold text-white mb-0.5">
                              <span className="text-[#0091DA]">{s.step}</span>
                              <span className="text-slate-500 font-mono text-[9px]">{s.latencyMs}ms</span>
                            </div>
                            <div className="text-[10px] text-slate-400 leading-snug">{s.detail}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : maximizedCol === null && minimizedCols.traces ? (
                  /* Column 2 Minimized Rail */
                  <div className={`w-[44px] shrink-0 flex-none h-full border-r flex flex-col items-center justify-between py-3 select-none transition-colors ${
                    isDarkMode ? 'bg-[#16181D] border-[#2E313B]' : 'bg-[#E5E7EB] border-[#CBD5E1]'
                  }`}>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => toggleMinimize('traces')}
                        title="Expand Pipeline Traces"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-[#009A44] cursor-pointer"
                      >
                        <Activity className="w-4 h-4" />
                      </button>
                      <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-[#009A44]/20 text-[#009A44]">
                        {executionSteps.length}
                      </span>
                    </div>
                    <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                      Pipeline Traces
                    </div>
                    <button
                      onClick={() => toggleMinimize('traces')}
                      title="Expand Pipeline Traces"
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}

                {/* Divider 2: between Col 2 & Col 3 */}
                {maximizedCol === null && !minimizedCols.traces && !minimizedCols.output && (
                  <div
                    onMouseDown={handleMouseDown(1)}
                    className={`w-2 shrink-0 h-full cursor-col-resize flex items-center justify-center transition-all select-none group z-10 ${
                      isDarkMode ? 'bg-[#1C1E24] hover:bg-[#0091DA]' : 'bg-[#E5E7EB] hover:bg-[#00338D]'
                    }`}
                    title="Drag to resize Traces & Output"
                  >
                    <div className="w-0.5 h-7 bg-slate-500 group-hover:bg-white rounded-full transition-colors" />
                  </div>
                )}

                {/* ========================================================= */}
                {/* 3. COLUMN 3: AGENT OUTPUT (NATURAL INTELLIGENCE) & JSON */}
                {/* ========================================================= */}
                {maximizedCol === 'output' || (maximizedCol === null && !minimizedCols.output) ? (
                  <div 
                    style={maximizedCol ? { width: '100%' } : { flex: `${colWidths[2]} 1 0%` }}
                    className="min-w-[160px] flex flex-col h-full overflow-hidden"
                  >
                    <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-medium ${
                      isDarkMode ? 'bg-[#1C1E24] border-[#2E313B]' : 'bg-[#F3F4F6] border-[#E5E7EB]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#009A44]" />
                        <span className="font-bold">Agent Output</span>
                        {maximizedCol === 'output' && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#009A44]/20 text-[#009A44] font-bold">
                            MAXIMIZED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            onClick={() => setOutputTab('output')}
                            className={`px-2.5 py-0.5 rounded font-mono font-bold uppercase transition-colors cursor-pointer ${
                              outputTab === 'output' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Output
                          </button>
                          <button
                            onClick={() => setOutputTab('json')}
                            className={`px-2.5 py-0.5 rounded font-mono font-bold uppercase transition-colors cursor-pointer ${
                              outputTab === 'json' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            JSON
                          </button>
                        </div>

                        {/* Window Controls */}
                        <div className="flex items-center gap-0.5 border-l border-white/10 pl-1.5 ml-1">
                          <button
                            onClick={() => toggleMinimize('output')}
                            title="Minimize section"
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => toggleMaximize('output')}
                            title={maximizedCol === 'output' ? 'Restore size' : 'Maximize section'}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {maximizedCol === 'output' ? <Minimize2 className="w-3 h-3 text-[#009A44]" /> : <Maximize2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 text-xs select-text">
                      {!simulationResult ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                          <Code className="w-6 h-6 mb-1 text-slate-600" />
                          <span>Run simulation to inspect natural agent output</span>
                        </div>
                      ) : (
                        <>
                          {outputTab === 'output' && (
                            <div className="relative h-full flex flex-col">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/50">
                                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  Natural Output ({simulationResult.rawOutput ? `${simulationResult.rawOutput.length} chars` : 'Complete'})
                                </span>
                                <button
                                  onClick={() => {
                                    const text = simulationResult.rawOutput || (typeof simulationResult === 'string' ? simulationResult : JSON.stringify(simulationResult, null, 2));
                                    navigator.clipboard.writeText(text);
                                    setCopiedOutput(true);
                                    setTimeout(() => setCopiedOutput(false), 2000);
                                  }}
                                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] font-mono rounded flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  {copiedOutput ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedOutput ? 'Copied' : 'Copy Output'}</span>
                                </button>
                              </div>
                              <div className="flex-1 overflow-auto leading-relaxed select-text">
                                <MarkdownViewer content={simulationResult.rawOutput || (typeof simulationResult === 'string' ? simulationResult : '')} />
                              </div>
                            </div>
                          )}

                          {outputTab === 'json' && (
                            <div className="relative h-full">
                              <button
                                onClick={() => copyJsonOutput(simulationResult)}
                                className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded font-mono flex items-center gap-1 cursor-pointer"
                              >
                                {copiedJson ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedJson ? 'Copied' : 'Copy'}</span>
                              </button>
                              <pre className="h-full overflow-auto text-[10px] font-mono p-2 bg-black/30 rounded text-emerald-400">
                                {JSON.stringify(simulationResult, null, 2)}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : maximizedCol === null && minimizedCols.output ? (
                  /* Column 3 Minimized Rail */
                  <div className={`w-[44px] shrink-0 flex-none h-full border-l flex flex-col items-center justify-between py-3 select-none transition-colors ${
                    isDarkMode ? 'bg-[#16181D] border-[#2E313B]' : 'bg-[#E5E7EB] border-[#CBD5E1]'
                  }`}>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => toggleMinimize('output')}
                        title="Expand Agent Output"
                        className="p-1.5 hover:bg-white/10 rounded transition-colors text-[#009A44] cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400">
                      Agent Output
                    </div>
                    <button
                      onClick={() => toggleMinimize('output')}
                      title="Expand Agent Output"
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Batch Telemetry Footer */}
              <div className={`px-6 py-2 border-t flex items-center justify-between text-xs font-mono ${
                isDarkMode ? 'bg-[#121316] border-[#2E313B] text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-700'
              }`}>
                <div className="flex items-center gap-4">
                  <span>Latency: <strong className="text-white">{simulationResult?.observability?.totalLatencyMs || 0}ms</strong></span>
                  <span>Tokens: <strong className="text-white">{simulationResult?.observability?.totalTokens || 0}</strong></span>
                  <span>Cost: <strong className="text-amber-400">${simulationResult?.economics?.costUsd?.toFixed(4) || '0.0000'}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetLayout}
                    title="Reset sections to default equal split"
                    className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-[#0091DA]" />
                    <span>Reset Layout</span>
                  </button>
                  <span className="text-slate-600">|</span>
                  <div className="flex items-center gap-1.5">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
