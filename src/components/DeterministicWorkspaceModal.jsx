import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Code2, 
  Sparkles, 
  Play, 
  Zap, 
  Copy, 
  Check, 
  Upload, 
  Download, 
  Database, 
  Layers, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  FileCode,
  Search,
  RotateCcw,
  Cpu,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { compileDeterministicLogic, getOfflineFallbackCode } from '../services/deterministicCompiler';
import { executeDeterministicTask } from '../services/deterministicRunner';
import { getAllConfiguredProviders } from '../services/llmService';

/**
 * Checks whether code is default starter/placeholder code.
 */
function isStarterCode(str) {
  if (!str) return true;
  const t = str.trim();
  return (
    t === 'function process(inputs) {\n  return inputs;\n}' ||
    t === 'function process(inputs) {\n  // Transform input data\n  return inputs;\n}' ||
    t === 'function process(inputs) {\n  // Write your deterministic JavaScript code here\n  return inputs;\n}' ||
    t.startsWith('function process(inputs) {\n  // Transform input data') ||
    t === 'function process(inputs) { return inputs; }' ||
    t.startsWith('def process(inputs):\n    # Write') ||
    t === 'def process(inputs):\n    return inputs'
  );
}

export default function DeterministicWorkspaceModal({
  isOpen,
  nodeId,
  nodeData = {},
  nodes = [],
  edges = [],
  onClose,
  onUpdateNode,
  isDarkMode = true,
  onToggleTheme
}) {
  if (!isOpen) return null;

  // Local state initialized from node data
  const [nodeName, setNodeName] = useState(nodeData?.name || 'Rule1');
  const [prompt, setPrompt] = useState(nodeData?.prompt || '');
  const [language, setLanguage] = useState(nodeData?.language || 'javascript');
  const [code, setCode] = useState(nodeData?.code || '');
  
  // Custom test data modal toggle (default: false, automatically uses inherited stream)
  const [showCustomDataInput, setShowCustomDataInput] = useState(nodeData?.inputMode === 'manual' || nodeData?.inputMode === 'upload');
  const [manualInputText, setManualInputText] = useState(nodeData?.manualInputText || '{\n  "testValue": 100\n}');
  const [uploadedData, setUploadedData] = useState(nodeData?.uploadedData || null);
  const [uploadedFileName, setUploadedFileName] = useState(nodeData?.uploadedFileName || '');

  // UI & Execution states
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(nodeData?.lastOutput !== undefined ? {
    success: true,
    output: nodeData.lastOutput,
    latencyMs: nodeData.lastLatencyMs || 0
  } : null);
  const [executionError, setExecutionError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [outputSearch, setOutputSearch] = useState('');
  const [isFrozen, setIsFrozen] = useState(nodeData?.isFrozen || false);

  const hasLogic = useMemo(() => {
    return Boolean(code && !isStarterCode(code)) || Boolean(prompt && prompt.trim());
  }, [code, prompt]);

  useEffect(() => {
    if (nodeData?.isFrozen !== undefined) {
      setIsFrozen(nodeData.isFrozen);
    }
  }, [nodeData?.isFrozen]);

  // ---------------------------------------------------------------------------
  // 1. BRAIN RESOLVER: Automatically inherit the connected Agent's exact model
  // ---------------------------------------------------------------------------
  const connectedBrain = useMemo(() => {
    if (!nodeId || !nodes || !edges) return null;

    const nodeLookup = Object.fromEntries(nodes.map(n => [n.id, n]));

    // Trace edges to find incoming/outgoing agentCore
    const connectedEdges = edges.filter(
      e => e.target === nodeId || e.source === nodeId
    );

    let targetAgent = null;
    for (const edge of connectedEdges) {
      const otherId = edge.target === nodeId ? edge.source : edge.target;
      const otherNode = nodeLookup[otherId];
      if (otherNode?.type === 'agentCore') {
        targetAgent = otherNode;
        break;
      }
    }

    // Fallback: search canvas for active agent
    if (!targetAgent) {
      targetAgent = nodes.find(n => n.type === 'agentCore' && !n.data?.isDeactivated) || nodes.find(n => n.type === 'agentCore') || null;
    }

    // Find model pillar connected to targetAgent's 'model-in' socket
    let modelPillar = null;
    if (targetAgent) {
      const modelEdge = edges.find(e => e.target === targetAgent.id && e.targetHandle === 'model-in');
      if (modelEdge && nodeLookup[modelEdge.source]) {
        modelPillar = nodeLookup[modelEdge.source];
      }
      if (!modelPillar && targetAgent.data?.connectedModelName) {
        modelPillar = nodes.find(n => n.type === 'pillar' && n.data?.name === targetAgent.data.connectedModelName);
      }
    }

    // Fallback: search canvas for any active model pillar
    if (!modelPillar) {
      modelPillar = nodes.find(n => n.type === 'pillar' && n.data?.pillarType === 'model' && !n.data?.isDeactivated) || null;
    }

    // Detect provider and model ID
    const configured = getAllConfiguredProviders();
    const defaultProvider = configured.length > 0 ? configured[0].id : 'openai';

    const provider = modelPillar?.data?.config?.provider || modelPillar?.data?.provider || defaultProvider;
    const modelId = modelPillar?.data?.config?.modelId || modelPillar?.data?.modelId || (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gemini-2.0-flash');
    const displayName = modelPillar?.data?.name || modelPillar?.data?.displayName || `${provider.toUpperCase()} (${modelId})`;

    return {
      agentName: targetAgent?.data?.name || targetAgent?.data?.title || 'Autonomous Agent',
      agentId: targetAgent?.id || null,
      provider,
      modelId,
      displayName
    };
  }, [nodeId, nodes, edges]);

  // ---------------------------------------------------------------------------
  // 2. UPSTREAM DATA INGESTION: Auto-resolve incoming payload from canvas
  // ---------------------------------------------------------------------------
  const upstreamInfo = useMemo(() => {
    if (!nodeId) return { sources: [], payload: {} };
    const incomingEdges = (edges || []).filter(e => e.target === nodeId);
    const sources = incomingEdges.map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      let srcOutput = srcNode?.data?.lastOutput ?? srcNode?.data?.content ?? srcNode?.data?.outputContent ?? null;

      // Automatically parse clean JSON strings if valid
      if (typeof srcOutput === 'string' && srcOutput.trim()) {
        const clean = srcOutput.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
        if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
          try {
            srcOutput = JSON.parse(clean);
          } catch {}
        }
      }

      return {
        id: e.source,
        name: srcNode?.data?.name || srcNode?.data?.title || e.source,
        type: srcNode?.type || 'node',
        output: srcOutput
      };
    });

    const payload = {};
    if (sources.length === 1) {
      const singleOut = sources[0].output;
      if (typeof singleOut === 'object' && singleOut !== null) {
        Object.assign(payload, singleOut);
      }
      payload['data'] = singleOut;
      const cleanKey = sources[0].name.replace(/[^a-zA-Z0-9_]/g, '_');
      payload[cleanKey] = singleOut;
    } else if (sources.length > 1) {
      sources.forEach(s => {
        const key = s.name.replace(/[^a-zA-Z0-9_]/g, '_');
        payload[key] = s.output;
      });
      const firstSrc = sources.find(s => s.output !== null && s.output !== undefined);
      if (firstSrc) {
        payload['data'] = firstSrc.output;
      }
    }

    payload['sources'] = sources;
    payload['allOutputs'] = sources.map(s => s.output);

    return { sources, payload };
  }, [nodeId, nodes, edges]);

  // Current active inputs
  const currentActiveInput = useMemo(() => {
    if (!showCustomDataInput) {
      return upstreamInfo.payload;
    }
    if (uploadedData) {
      return uploadedData;
    }
    try {
      return JSON.parse(manualInputText);
    } catch {
      return { rawText: manualInputText };
    }
  }, [showCustomDataInput, upstreamInfo.payload, uploadedData, manualInputText]);

  // Inspect incoming variable keys for 1-click copying
  const availableInputKeys = useMemo(() => {
    const keys = new Set();
    keys.add('data');
    if (upstreamInfo.sources.length === 1) {
      const singleOut = upstreamInfo.sources[0].output;
      if (singleOut && typeof singleOut === 'object' && !Array.isArray(singleOut)) {
        Object.keys(singleOut).slice(0, 8).forEach(k => keys.add(k));
      }
      const cleanKey = upstreamInfo.sources[0].name.replace(/[^a-zA-Z0-9_]/g, '_');
      keys.add(cleanKey);
    } else if (upstreamInfo.sources.length > 1) {
      upstreamInfo.sources.forEach(s => {
        keys.add(s.name.replace(/[^a-zA-Z0-9_]/g, '_'));
      });
      keys.add('allOutputs');
    }
    return Array.from(keys);
  }, [upstreamInfo]);

  // Auto-init starter code if blank
  useEffect(() => {
    if (!code || isStarterCode(code)) {
      if (prompt && prompt.trim()) {
        const compiled = getOfflineFallbackCode(prompt, 'javascript', upstreamInfo.payload);
        setCode(compiled);
      } else {
        setCode('function process(inputs) {\n  // Deterministic browser-native logic\n  return inputs;\n}');
      }
    }
  }, [code, prompt, upstreamInfo.payload]);

  // ---------------------------------------------------------------------------
  // 3. ACTIONS & EXECUTION
  // ---------------------------------------------------------------------------

  // Compile using the connected agent's brain (Zero language prompt needed!)
  const handleCompile = async () => {
    if (!prompt.trim()) return;

    setIsCompiling(true);
    setExecutionError(null);

    try {
      const res = await compileDeterministicLogic({
        prompt: prompt.trim(),
        language: 'javascript', // browser-native default for instant zero-token execution
        sampleInputs: currentActiveInput,
        provider: connectedBrain?.provider || null,
        modelId: connectedBrain?.modelId || null
      });

      if (res?.code) {
        setCode(res.code);
        if (res.language) setLanguage(res.language);
        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            name: nodeName,
            prompt: prompt.trim(),
            code: res.code,
            language: res.language || 'javascript'
          });
        }
      }
    } catch (err) {
      console.error('Logic compilation error:', err);
      setExecutionError(`Compilation error: ${err.message || String(err)}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // Run Deterministic Logic (0 Tokens, Zero Cost)
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionError(null);

    try {
      let codeToRun = code;
      const isStarter = isStarterCode(codeToRun);

      // If user has a prompt but code is starter/empty, auto-compile with connected brain first
      if ((!codeToRun || isStarter) && prompt.trim()) {
        setIsCompiling(true);
        const compiled = await compileDeterministicLogic({
          prompt: prompt.trim(),
          language: 'javascript',
          sampleInputs: currentActiveInput,
          provider: connectedBrain?.provider || null,
          modelId: connectedBrain?.modelId || null
        });
        setIsCompiling(false);
        if (compiled?.code) {
          codeToRun = compiled.code;
          setCode(codeToRun);
          if (compiled.language) setLanguage(compiled.language);
        }
      }

      const res = await executeDeterministicTask({
        language: language || 'javascript',
        code: codeToRun,
        prompt: prompt.trim(),
        inputData: currentActiveInput,
        nodeId
      });

      if (res.success) {
        setExecutionResult(res);
        setExecutionError(null);

        // Update canvas state
        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            name: nodeName,
            prompt: prompt.trim(),
            code: codeToRun,
            language: language || 'javascript',
            lastOutput: res.output,
            lastStatus: 'success',
            lastLatencyMs: res.latencyMs
          });
        }

        // Broadcast to downstream nodes in DAG
        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: {
            nodeId,
            output: res.output,
            latencyMs: res.latencyMs
          }
        }));
      } else {
        setExecutionError(res.error || 'Execution failed.');
        setExecutionResult(null);
      }
    } catch (err) {
      setExecutionError(err.message || String(err));
      setExecutionResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Keyboard Shortcuts: Ctrl/Cmd + Enter to Run, Esc to Close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExecute, onClose]);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy variable handler with inline toast
  const handleCopyVar = (keyStr) => {
    navigator.clipboard.writeText(`inputs.${keyStr}`);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Export output as JSON or CSV
  const handleExportOutput = (format = 'json') => {
    if (!executionResult?.output) return;
    const output = executionResult.output;
    let dataStr = '';
    let fileName = `${nodeName.replace(/\s+/g, '_')}_output.${format}`;
    let mimeType = format === 'csv' ? 'text/csv' : 'application/json';

    if (format === 'csv') {
      const rows = Array.isArray(output) ? output : (output?.table || output?.rows || [output]);
      if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object') {
        const headers = Object.keys(rows[0]);
        const csvRows = [headers.join(',')];
        rows.forEach(r => {
          csvRows.push(headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
        });
        dataStr = csvRows.join('\n');
      } else {
        dataStr = String(output);
      }
    } else {
      dataStr = JSON.stringify(output, null, 2);
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle optional custom file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          setUploadedData(parsed);
        } catch {
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
          const rows = lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const rowObj = {};
            headers.forEach((h, idx) => {
              rowObj[h] = vals[idx] !== undefined ? vals[idx] : '';
            });
            return rowObj;
          });
          setUploadedData(rows);
        }
      };
      reader.readAsText(file);
    }
  };

  // Determine tabular shape of execution output if array
  const outputRows = useMemo(() => {
    if (!executionResult?.output) return [];
    if (Array.isArray(executionResult.output)) return executionResult.output;
    if (typeof executionResult.output === 'object') {
      for (const v of Object.values(executionResult.output)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          return v;
        }
      }
    }
    return [];
  }, [executionResult]);

  const isOutputPrimitive = executionResult?.output !== null && 
    executionResult?.output !== undefined && 
    (typeof executionResult.output === 'string' || typeof executionResult.output === 'number' || typeof executionResult.output === 'boolean');

  const codeLineCount = useMemo(() => (code || '').split('\n').length, [code]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md transition-all duration-300 ${
      isDarkMode ? 'bg-black/75' : 'bg-[#001E50]/30'
    }`}>
      {/* Expanded Deterministic Box chassis */}
      <div 
        className={`relative w-full max-w-7xl h-[94vh] flex flex-col rounded-[22px] border-2 overflow-hidden font-sans shadow-2xl transition-all duration-200 animate-sandbox-expand ${
          isDarkMode 
            ? 'bg-[#1D2028] border-[#383C4A] text-white shadow-[0_30px_90px_rgba(0,0,0,0.75)]' 
            : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_25px_70px_rgba(0,30,80,0.16)]'
        }`}
      >
        {/* ========================================================================= */}
        {/* TOP BAR: IDENTICAL LOOK & FEEL TO THE DETERMINISTIC BOX                  */}
        {/* ========================================================================= */}
        <div className={`px-6 py-3.5 flex items-center justify-between shrink-0 relative z-10 border-b transition-colors ${
          isDarkMode 
            ? 'bg-[#1D2028] border-[#2C3242]' 
            : 'bg-[#FFFFFF] border-[#E2E8F0]'
        }`}>
          {/* Left: Code2 Icon + Rule Title + Brain Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <Code2 className={`w-4 h-4 shrink-0 transition-transform ${
              isExecuting || isCompiling ? 'text-amber-400 animate-spin' : executionResult?.success ? 'text-emerald-500' : 'text-[#EAAA00]'
            }`} />
            
            <input
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onBlur={() => onUpdateNode && nodeId && onUpdateNode(nodeId, { name: nodeName })}
              className="bg-transparent text-sm font-mono font-bold text-[#EAAA00] hover:underline decoration-dashed decoration-[#EAAA00]/60 focus:no-underline focus:border-b focus:border-[#EAAA00] focus:outline-none px-1 py-0.5 rounded-none tracking-tight transition-colors"
              placeholder="Rule Title"
              title="Click to rename rule"
            />

            {/* Brain Pill */}
            {connectedBrain ? (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono transition-colors ${
                isDarkMode 
                  ? 'bg-[#141720] border-[#383C4A] text-slate-300' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Brain:</span>
                <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>{connectedBrain.displayName}</span>
              </div>
            ) : (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono ${
                isDarkMode ? 'bg-[#141720] border-[#383C4A] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Brain: Auto</span>
              </div>
            )}
          </div>

          {/* Center: Small Circle Status Indicator (Mirroring Deterministic Box) */}
          <div className="flex items-center gap-2">
            <span
              onClick={!isFrozen && hasLogic ? () => {
                setIsFrozen(true);
                if (onUpdateNode && nodeId) onUpdateNode(nodeId, { isFrozen: true });
              } : undefined}
              className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                !hasLogic
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                  : !isFrozen
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] cursor-pointer hover:scale-125'
                    : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
              } ${isExecuting ? 'animate-ping' : ''}`}
              title={
                !hasLogic
                  ? 'No logic defined'
                  : !isFrozen
                    ? 'Draft logic (Click to freeze)'
                    : 'Logic frozen & active'
              }
            />
            <span className={`text-[10px] font-mono font-bold tracking-wider uppercase hidden md:inline-block ${
              !hasLogic
                ? 'text-rose-500'
                : !isFrozen
                  ? 'text-amber-500'
                  : 'text-emerald-500'
            }`}>
              {!hasLogic ? 'No Logic' : !isFrozen ? 'Draft Logic' : 'Frozen & Active'}
            </span>
          </div>

          {/* Right: Theme Toggle, RUN, Close (Mirroring Node Action Buttons) */}
          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                    : 'text-slate-500 hover:text-black hover:bg-slate-100'
                }`}
                title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>
            )}

            <button
              onClick={handleExecute}
              disabled={isExecuting || isCompiling}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDarkMode
                  ? 'bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#005EB8]/60 shadow-[0_2px_10px_rgba(0,51,141,0.3)]'
                  : 'bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#00338D]'
              }`}
              title="Run deterministic logic in zero-latency browser isolate (Ctrl + Enter)"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>RUN</span>
                  <span className="text-[10px] text-white/70 font-normal ml-0.5">Ctrl+Enter</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                isDarkMode 
                  ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                  : 'text-slate-500 hover:text-black hover:bg-slate-100'
              }`}
              title="Close Workspace (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN 2-PANE STUDIO LAYOUT                                                */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-transparent relative z-10">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANE: Human Intent & Upstream Context (5 Columns)                   */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-5 border-r flex flex-col overflow-y-auto transition-colors ${
            isDarkMode 
              ? 'border-[#2C3242] bg-[#141720]' 
              : 'border-slate-200 bg-[#F8FAFC]'
          }`}>
            <div className="p-5 space-y-5">
              
              {/* 1. Human Language Directive Card */}
              <div className={`p-4 rounded-[16px] border space-y-3 transition-colors ${
                isDarkMode ? 'bg-[#1D2028] border-[#2C3242]' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#0091DA] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0091DA]" />
                    Rule Directive
                  </label>
                  <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Simple natural language
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what this rule should do in plain words (e.g. 'Classify token consumption as High or Low given token count of 4000', or 'Filter rows where status is active and sum amount')..."
                    className={`w-full p-3 text-xs font-mono leading-relaxed rounded-[12px] transition-all resize-none outline-none border ${
                      isDarkMode
                        ? 'bg-[#141720] border-[#2C3242] text-white focus:border-[#0091DA] placeholder:text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-[#0B0F19] focus:bg-white focus:border-[#00338D] placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* Compile Logic Button */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCompile}
                    disabled={isCompiling || !prompt.trim()}
                    className={`flex-1 py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer rounded-[12px] ${
                      isCompiling
                        ? isDarkMode
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                        : isDarkMode
                          ? 'bg-[#EAAA00]/90 hover:bg-[#EAAA00] text-[#001E50] border-amber-300/40 shadow-[0_4px_16px_rgba(234,170,0,0.25)]'
                          : 'bg-[#EAAA00] hover:bg-[#D49800] text-[#001E50] border-amber-500 shadow-sm'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={`Compile plain English into deterministic code using ${connectedBrain?.displayName || 'active model'}`}
                  >
                    {isCompiling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>TRANSLATING WITH BRAIN...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>COMPILE LOGIC WITH BRAIN</span>
                      </>
                    )}
                  </button>
                </div>
                
                <p className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Translates via {connectedBrain ? connectedBrain.displayName : 'connected model'} into zero-latency deterministic code.
                </p>
              </div>

              {/* 2. Upstream Context & Variable Inspector Card */}
              <div className={`p-4 rounded-[16px] border space-y-3 transition-colors ${
                isDarkMode ? 'bg-[#1D2028] border-[#2C3242]' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Database className="w-3.5 h-3.5 text-[#0091DA]" />
                    Upstream Context
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomDataInput(!showCustomDataInput)}
                    className="text-[10px] font-mono text-[#0091DA] hover:underline cursor-pointer"
                  >
                    {showCustomDataInput ? 'Switch to Inherited Stream' : '+ Custom Test Data'}
                  </button>
                </div>

                {/* Inherited Stream View */}
                {!showCustomDataInput ? (
                  <div className={`p-3 rounded-[12px] border space-y-3 transition-colors ${
                    isDarkMode 
                      ? 'bg-[#141720] border-[#2C3242]' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    {/* Upstream Source Badge */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${upstreamInfo.sources.length > 0 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-amber-400'}`} />
                        <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                          {upstreamInfo.sources.length > 0 
                            ? upstreamInfo.sources[0].name 
                            : 'Standalone Node (No Upstream Connection)'}
                        </span>
                      </div>
                      <span className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {upstreamInfo.sources.length > 0 ? 'Connected Stream' : 'Awaiting Connection'}
                      </span>
                    </div>

                    {/* Quick Variable Access Chips */}
                    <div>
                      <span className={`text-[9px] font-bold block uppercase tracking-wider mb-1.5 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Incoming Variable Keys (Click to Copy):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableInputKeys.map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleCopyVar(key)}
                            className={`px-2 py-0.5 text-[10px] font-mono border flex items-center gap-1 rounded-full transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'border-[#383C4A] bg-[#1D2028] hover:bg-[#2C3242] text-[#0091DA] hover:text-white'
                                : 'border-slate-300 bg-white hover:bg-blue-50 text-[#005EB8] hover:text-[#00338D]'
                            }`}
                            title={`Click to copy inputs.${key}`}
                          >
                            <span>inputs.{key}</span>
                            {copiedKey === key ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-50" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Collapsible Input Payload Preview */}
                    <div className={`pt-2 border-t ${isDarkMode ? 'border-[#2C3242]' : 'border-slate-200'}`}>
                      <button
                        type="button"
                        onClick={() => setIsPayloadExpanded(!isPayloadExpanded)}
                        className={`w-full flex items-center justify-between text-[10px] font-mono transition-colors cursor-pointer ${
                          isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>Live Payload Preview</span>
                        <div className="flex items-center gap-1">
                          <span className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600 font-bold'}>
                            {Array.isArray(currentActiveInput) ? `${currentActiveInput.length} Rows` : 'Object'}
                          </span>
                          {isPayloadExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                      </button>

                      {isPayloadExpanded && (
                        <pre className={`mt-2 p-2.5 rounded-[10px] border text-[10px] font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-tight ${
                          isDarkMode 
                            ? 'bg-black/50 border-[#2C3242] text-slate-300' 
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          {JSON.stringify(currentActiveInput, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Custom Test Data Mode (Upload or Paste) */
                  <div className={`p-3 rounded-[12px] border space-y-3 transition-colors ${
                    isDarkMode 
                      ? 'bg-[#141720] border-[#2C3242]' 
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">
                        Custom Test Input
                      </span>
                      <label className="text-[10px] font-mono text-[#0091DA] hover:underline cursor-pointer">
                        {uploadedFileName || 'Upload CSV / JSON'}
                        <input
                          type="file"
                          accept=".csv,.json,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <textarea
                      rows={5}
                      value={manualInputText}
                      onChange={(e) => setManualInputText(e.target.value)}
                      placeholder='{\n  "customKey": "test value"\n}'
                      className={`w-full p-2.5 text-xs font-mono border rounded-[10px] resize-none outline-none ${
                        isDarkMode 
                          ? 'bg-[#0B0F19] border-[#2C3242] text-emerald-300' 
                          : 'bg-white border-slate-300 text-slate-800 focus:border-[#00338D]'
                      }`}
                    />
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANE: Deterministic Logic & Live Output (7 Columns)               */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-7 p-5 space-y-4 flex flex-col h-full overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#141720]' : 'bg-[#F8FAFC]'
          }`}>
            
            {/* 1. Code Editor Card */}
            <div className={`h-[280px] shrink-0 rounded-[16px] border flex flex-col overflow-hidden transition-colors ${
              isDarkMode ? 'bg-[#1D2028] border-[#2C3242]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              {/* Code Inspector Header */}
              <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 transition-colors ${
                isDarkMode ? 'bg-[#141720] border-[#2C3242]' : 'bg-[#F1F5F9] border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#EAAA00]" />
                  <span className={`text-xs font-mono font-bold tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                  }`}>
                    Deterministic Logic
                  </span>
                  <span className="text-[9px] font-mono text-[#0091DA] bg-[#0091DA]/15 border border-[#0091DA]/40 px-2 py-0.5 rounded-full font-bold uppercase">
                    {language} (Browser Isolate)
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {codeLineCount} lines
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className={`px-2.5 py-1 text-[11px] font-mono border flex items-center gap-1 rounded-[8px] transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'border-[#383C4A] bg-[#141720] hover:bg-[#2C3242] text-slate-300 hover:text-white'
                        : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-black shadow-xs'
                    }`}
                    title="Copy code to clipboard"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Code Editor Surface */}
              <div className="flex-1 flex overflow-hidden bg-[#0B0F19]">
                {/* Line Numbers Gutter */}
                <div className="select-none py-3 px-2 text-right font-mono text-[11px] border-r min-w-[36px] text-slate-500 border-slate-800 bg-[#07090F]">
                  {code.split('\n').map((_, i) => (
                    <div key={i} className="leading-relaxed">{i + 1}</div>
                  ))}
                </div>

                {/* Editable Codearea */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck="false"
                  className="flex-1 p-3 font-mono text-xs text-emerald-400 bg-transparent resize-none focus:outline-none leading-relaxed selection:bg-blue-600/40"
                  placeholder="// Deterministic process(inputs) function..."
                />
              </div>
            </div>

            {/* 2. Execution Console & Output Card */}
            <div className={`flex-1 rounded-[16px] border flex flex-col overflow-hidden transition-colors ${
              isDarkMode ? 'bg-[#1D2028] border-[#2C3242]' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              {/* Output Sub-Header */}
              <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 transition-colors ${
                isDarkMode ? 'bg-[#141720] border-[#2C3242]' : 'bg-[#F1F5F9] border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-mono font-bold ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Execution Output
                  </span>

                  {executionResult?.success && (
                    <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      SUCCESS • {executionResult.latencyMs}ms • 0 TOKENS
                    </span>
                  )}

                  {executionError && (
                    <span className="text-[10px] font-mono text-red-500 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> FAILED
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {outputRows.length > 0 && (
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        value={outputSearch}
                        onChange={(e) => setOutputSearch(e.target.value)}
                        placeholder="Filter rows..."
                        className={`pl-7 pr-2 py-0.5 text-[11px] font-mono border rounded-[8px] focus:outline-none ${
                          isDarkMode 
                            ? 'bg-[#141720] border-[#383C4A] text-white' 
                            : 'bg-white border-slate-300 text-[#0B0F19]'
                        }`}
                      />
                    </div>
                  )}

                  {executionResult?.output !== undefined && executionResult?.output !== null && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExportOutput('json')}
                        className={`px-2.5 py-1 text-[10px] font-mono border rounded-[8px] transition-colors cursor-pointer ${
                          isDarkMode 
                            ? 'border-[#383C4A] bg-[#141720] hover:bg-[#2C3242] text-slate-300 hover:text-white' 
                            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-black shadow-xs'
                        }`}
                        title="Download JSON output"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => handleExportOutput('csv')}
                        className={`px-2.5 py-1 text-[10px] font-mono border rounded-[8px] transition-colors cursor-pointer ${
                          isDarkMode 
                            ? 'border-[#383C4A] bg-[#141720] hover:bg-[#2C3242] text-slate-300 hover:text-white' 
                            : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-black shadow-xs'
                        }`}
                        title="Download CSV output"
                      >
                        CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Output Content Body */}
              <div className="flex-1 overflow-auto p-4">
                {executionError ? (
                  <div className={`p-4 border text-xs font-mono space-y-1 rounded-[12px] ${
                    isDarkMode 
                      ? 'border-red-500/30 bg-red-500/10 text-red-300' 
                      : 'border-red-300 bg-red-50 text-red-700'
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Execution Error:
                    </p>
                    <p className="whitespace-pre-wrap">{executionError}</p>
                  </div>
                ) : !executionResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2">
                    <Code2 className="w-8 h-8 text-[#EAAA00] opacity-60" />
                    <p className="text-xs">No execution run yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Click "RUN" or press Ctrl+Enter to test your deterministic logic.
                    </p>
                  </div>
                ) : isOutputPrimitive ? (
                  /* Decision Outcome Badge Card */
                  <div className={`p-5 border rounded-[14px] flex items-center justify-between transition-colors ${
                    isDarkMode 
                      ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-white shadow-[0_4px_20px_rgba(16,185,129,0.08)]' 
                      : 'border-emerald-300 bg-emerald-50 text-[#0B0F19] shadow-xs'
                  }`}>
                    <div>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 ${
                        isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                      }`}>
                        Evaluated Output:
                      </span>
                      <span className={`text-2xl font-mono font-bold ${
                        isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                      }`}>
                        {String(executionResult.output)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Execution Latency
                      </span>
                      <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {executionResult.latencyMs} ms
                      </span>
                      <span className={`text-[10px] font-mono block ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>
                        0 Tokens • Zero Inference Cost
                      </span>
                    </div>
                  </div>
                ) : outputRows.length > 0 ? (
                  /* Tabular Grid View */
                  <div className="space-y-2 font-mono">
                    <div className={`text-[11px] flex items-center justify-between ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <span>Showing {outputRows.length} records:</span>
                    </div>

                    <div className={`border rounded-[10px] overflow-hidden overflow-x-auto ${isDarkMode ? 'border-[#2C3242]' : 'border-slate-200'}`}>
                      <table className={`w-full text-left text-xs font-mono divide-y ${isDarkMode ? 'divide-[#2C3242]' : 'divide-slate-200'}`}>
                        <thead className={isDarkMode ? 'bg-[#141720]' : 'bg-slate-100'}>
                          <tr>
                            <th className={`py-2 px-3 text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>#</th>
                            {Object.keys(outputRows[0]).map(col => (
                              <th key={col} className={`py-2 px-3 text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDarkMode ? 'divide-[#1A1F2C]' : 'divide-slate-200'}`}>
                          {outputRows
                            .filter(r => {
                              if (!outputSearch) return true;
                              return JSON.stringify(r).toLowerCase().includes(outputSearch.toLowerCase());
                            })
                            .slice(0, 100)
                            .map((row, idx) => (
                              <tr key={idx} className={isDarkMode ? 'hover:bg-white/5 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                                <td className={`py-2 px-3 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</td>
                                {Object.keys(outputRows[0]).map(col => (
                                  <td key={col} className={`py-2 px-3 text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Formatted JSON View */
                  <pre className={`text-xs font-mono whitespace-pre-wrap leading-relaxed p-3.5 border rounded-[12px] ${
                    isDarkMode 
                      ? 'bg-[#0B0F19] border-[#2C3242] text-emerald-400' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    {JSON.stringify(executionResult.output, null, 2)}
                  </pre>
                )}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
