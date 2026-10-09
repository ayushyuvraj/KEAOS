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
  ExternalLink
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
  isDarkMode = true
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
  const [isPayloadExpanded, setIsPayloadExpanded] = useState(false);
  const [outputSearch, setOutputSearch] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-7xl h-[94vh] flex flex-col bg-[#0B0F19] border border-[#222B3D] text-white shadow-2xl rounded-none overflow-hidden font-sans"
      >
        {/* ========================================================================= */}
        {/* TOP INSTITUTIONAL HEADER BAR                                              */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 bg-[#001E50] border-b border-[#00338D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#EAAA00] text-[#001E50] flex items-center justify-center font-bold rounded-none shrink-0">
              <Code2 className="w-5 h-5 font-bold" />
            </div>
            
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                onBlur={() => onUpdateNode && nodeId && onUpdateNode(nodeId, { name: nodeName })}
                className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-white/40 focus:border-[#EAAA00] focus:outline-none px-1 py-0.5 rounded-none font-mono tracking-tight"
                placeholder="Rule Title"
              />
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#EAAA00]/20 text-[#EAAA00] border border-[#EAAA00]/40 rounded-none uppercase">
                DETERMINISTIC RUNTIME
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 rounded-none">
                <Zap className="w-3 h-3 text-emerald-400" /> 0 TOKENS • $0.00 INFERENCE
              </span>
            </div>

            {/* Inherited Agent Brain Indicator */}
            {connectedBrain && (
              <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-white/15 text-[11px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">Brain:</span>
                <span className="text-white font-bold">{connectedBrain.displayName}</span>
                <span className="text-slate-400">({connectedBrain.agentName})</span>
              </div>
            )}
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExecute}
              disabled={isExecuting || isCompiling}
              className="btn-tactile px-4 py-2 bg-[#00338D] hover:bg-[#005EB8] active:scale-[0.98] text-white text-xs font-mono font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer rounded-none border border-[#005EB8]"
              title="Run deterministic logic in zero-latency browser isolate (Ctrl + Enter)"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>EXECUTING...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-white" />
                  <span>RUN LOGIC (0 TOKENS)</span>
                  <span className="text-[10px] opacity-75 font-normal ml-1">Ctrl+Enter</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
              title="Close Workspace (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN 2-PANE STUDIO LAYOUT                                                 */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-[#0B0F19]">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANE: Human Intent & Upstream Context (5 Columns)                   */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-5 border-r border-[#1E2536] bg-[#0E1321] flex flex-col overflow-y-auto">
            <div className="p-5 space-y-5">
              
              {/* 1. Human Language Directive Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#0091DA] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0091DA]" />
                    Rule Directive
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Simple natural language
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what this rule should do in plain words (e.g. 'Classify token consumption as High or Low given token count of 4000', or 'Filter rows where status is active and sum amount')..."
                    className="w-full p-3 text-xs font-mono leading-relaxed bg-[#060911] border border-[#232B3E] text-white focus:border-[#0091DA] focus:ring-1 focus:ring-[#0091DA] rounded-none transition-all resize-none outline-none placeholder:text-slate-600"
                  />
                </div>

                {/* Compile Logic Button (Powered directly by the connected Agent Brain) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCompile}
                    disabled={isCompiling || !prompt.trim()}
                    className={`flex-1 py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer rounded-none ${
                      isCompiling
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-[#EAAA00] hover:bg-[#D49800] text-[#001E50] border-[#EAAA00]'
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
                
                <p className="text-[10px] text-slate-400 font-mono">
                  Translates via {connectedBrain ? connectedBrain.displayName : 'connected model'} into zero-latency deterministic code.
                </p>
              </div>

              {/* 2. Upstream Context & Variable Inspector */}
              <div className="space-y-3 pt-4 border-t border-[#1E2536]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
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
                  <div className="p-3 bg-[#060911] border border-[#232B3E] space-y-3">
                    {/* Upstream Source Badge */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${upstreamInfo.sources.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className="font-bold text-white">
                          {upstreamInfo.sources.length > 0 
                            ? upstreamInfo.sources[0].name 
                            : 'Standalone Node (No Upstream Connection)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {upstreamInfo.sources.length > 0 ? 'Connected Stream' : 'Awaiting Connection'}
                      </span>
                    </div>

                    {/* Quick Variable Access Chips */}
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-1.5">
                        Incoming Variable Keys (Click to Copy):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {availableInputKeys.map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleCopyVar(key)}
                            className="px-2 py-0.5 text-[10px] font-mono border border-[#2A344A] bg-[#121726] hover:bg-[#1A2238] text-[#0091DA] hover:text-white flex items-center gap-1 rounded-none transition-colors cursor-pointer"
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
                    <div className="pt-2 border-t border-[#1E2536]">
                      <button
                        type="button"
                        onClick={() => setIsPayloadExpanded(!isPayloadExpanded)}
                        className="w-full flex items-center justify-between text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        <span>Live Payload Preview</span>
                        <div className="flex items-center gap-1">
                          <span className="text-emerald-400">
                            {Array.isArray(currentActiveInput) ? `${currentActiveInput.length} Rows` : 'Object'}
                          </span>
                          {isPayloadExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </div>
                      </button>

                      {isPayloadExpanded && (
                        <pre className="mt-2 p-2.5 bg-[#030508] border border-[#1A2130] text-[10px] text-slate-300 font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-tight">
                          {JSON.stringify(currentActiveInput, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Custom Test Data Mode (Upload or Paste) */
                  <div className="p-3 bg-[#060911] border border-[#232B3E] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
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
                      className="w-full p-2 text-xs font-mono bg-[#030508] border border-[#1A2130] text-emerald-300 focus:outline-none rounded-none resize-none"
                    />
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT PANE: Deterministic Logic & Live Output (7 Columns)               */}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-[#080C16]">
            
            {/* 1. Code Inspector Header */}
            <div className="px-4 py-2.5 bg-[#0D1220] border-b border-[#1E2536] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#EAAA00]" />
                <span className="text-xs font-mono font-bold text-white tracking-tight">
                  Deterministic Logic
                </span>
                <span className="text-[9px] font-mono text-[#0091DA] bg-[#0091DA]/10 border border-[#0091DA]/30 px-2 py-0.5 rounded-none font-bold uppercase">
                  {language} (Browser Isolate)
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {codeLineCount} lines
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 text-[11px] font-mono border border-[#2A344A] bg-[#121726] hover:bg-[#1A2238] text-slate-300 hover:text-white flex items-center gap-1 rounded-none transition-colors cursor-pointer"
                  title="Copy code to clipboard"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 2. Clean Code Editor Surface */}
            <div className="h-60 sm:h-64 border-b border-[#1E2536] shrink-0 flex overflow-hidden bg-[#05070D]">
              {/* Line Numbers Gutter */}
              <div className="select-none py-3 px-2 text-right text-slate-600 font-mono text-[11px] border-r border-[#151C2C] bg-[#04060A] min-w-[34px]">
                {code.split('\n').map((_, i) => (
                  <div key={i} className="leading-relaxed">{i + 1}</div>
                ))}
              </div>

              {/* Editable Codearea */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck="false"
                className="flex-1 p-3 font-mono text-xs text-emerald-300 bg-transparent resize-none focus:outline-none leading-relaxed selection:bg-blue-600/40"
                placeholder="// Deterministic process(inputs) function..."
              />
            </div>

            {/* 3. Execution Console & Output Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0E18]">
              
              {/* Output Sub-Header */}
              <div className="px-4 py-2 bg-[#0E1322] border-b border-[#1E2536] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Execution Output
                  </span>

                  {executionResult?.success && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-none font-bold">
                      SUCCESS • {executionResult.latencyMs}ms • 0 TOKENS
                    </span>
                  )}

                  {executionError && (
                    <span className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-none font-bold flex items-center gap-1">
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
                        className="pl-7 pr-2 py-0.5 text-[11px] font-mono bg-black/40 border border-[#252E42] text-white focus:outline-none rounded-none"
                      />
                    </div>
                  )}

                  {executionResult?.output !== undefined && executionResult?.output !== null && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExportOutput('json')}
                        className="px-2 py-1 text-[10px] font-mono border border-[#2A344A] bg-[#121726] hover:bg-[#1A2238] text-slate-300 hover:text-white rounded-none transition-colors cursor-pointer"
                        title="Download JSON output"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => handleExportOutput('csv')}
                        className="px-2 py-1 text-[10px] font-mono border border-[#2A344A] bg-[#121726] hover:bg-[#1A2238] text-slate-300 hover:text-white rounded-none transition-colors cursor-pointer"
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
                  <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono space-y-1 rounded-none">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      Execution Error:
                    </p>
                    <p className="whitespace-pre-wrap">{executionError}</p>
                  </div>
                ) : !executionResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2">
                    <Code2 className="w-8 h-8 text-slate-600" />
                    <p className="text-xs">No execution run yet.</p>
                    <p className="text-[11px] text-slate-600">
                      Click "RUN LOGIC (0 TOKENS)" or press Ctrl+Enter to test your deterministic logic.
                    </p>
                  </div>
                ) : isOutputPrimitive ? (
                  /* Decision Outcome Badge Card */
                  <div className="p-5 border border-emerald-500/30 bg-emerald-500/10 rounded-none flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                        Evaluated Output:
                      </span>
                      <span className="text-2xl font-mono font-bold text-white">
                        {String(executionResult.output)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">Execution Latency</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">{executionResult.latencyMs} ms</span>
                      <span className="text-[10px] font-mono text-emerald-500 block">0 Tokens • Zero Inference Cost</span>
                    </div>
                  </div>
                ) : outputRows.length > 0 ? (
                  /* Tabular Grid View */
                  <div className="space-y-2 font-mono">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Showing {outputRows.length} records:</span>
                    </div>

                    <div className="border border-[#20293B] overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono divide-y divide-[#20293B]">
                        <thead className="bg-[#101524]">
                          <tr>
                            <th className="py-2 px-3 text-[10px] font-bold uppercase text-slate-400">#</th>
                            {Object.keys(outputRows[0]).map(col => (
                              <th key={col} className="py-2 px-3 text-[10px] font-bold uppercase text-slate-300">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#151D2C]">
                          {outputRows
                            .filter(r => {
                              if (!outputSearch) return true;
                              return JSON.stringify(r).toLowerCase().includes(outputSearch.toLowerCase());
                            })
                            .slice(0, 100)
                            .map((row, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-2 px-3 text-[11px] text-slate-500">{idx + 1}</td>
                                {Object.keys(outputRows[0]).map(col => (
                                  <td key={col} className="py-2 px-3 text-[11px] text-slate-300">
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
                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
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
