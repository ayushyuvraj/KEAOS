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
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Table as TableIcon,
  Search,
  Settings,
  HelpCircle,
  Cpu,
  MessageSquare
} from 'lucide-react';
import { compileDeterministicLogic } from '../services/deterministicCompiler';
import { executeDeterministicTask } from '../services/deterministicRunner';
import { getAllConfiguredProviders } from '../services/llmService';

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
  const [nodeName, setNodeName] = useState(nodeData?.name || 'Deterministic Logic Box');
  const [prompt, setPrompt] = useState(nodeData?.prompt || '');
  const [language, setLanguage] = useState(nodeData?.language || 'auto');
  const [code, setCode] = useState(nodeData?.code || '');
  const [engine, setEngine] = useState(nodeData?.engine || 'auto'); // auto | browser | backend

  // Input Data Tabs: 'inherited' | 'upload' | 'manual'
  const [inputTab, setInputTab] = useState(nodeData?.inputMode || 'inherited');
  const [manualInputText, setManualInputText] = useState(nodeData?.manualInputText || '{\n  "x": 10,\n  "y": 20\n}');
  const [uploadedData, setUploadedData] = useState(nodeData?.uploadedData || null);
  const [uploadedFileName, setUploadedFileName] = useState(nodeData?.uploadedFileName || '');

  // Generation & Execution states
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(nodeData?.lastOutput !== undefined ? {
    success: true,
    output: nodeData.lastOutput,
    latencyMs: nodeData.lastLatencyMs || 0
  } : null);
  const [executionError, setExecutionError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Output search filter
  const [outputSearch, setOutputSearch] = useState('');
  const [outputViewMode, setOutputViewMode] = useState('auto'); // auto | table | json | raw

  // Upstream node detection (DAG flow: fan-in from multiple boxes or agents)
  const upstreamInfo = useMemo(() => {
    if (!nodeId) return { sources: [], payload: {} };
    const incomingEdges = (edges || []).filter(e => e.target === nodeId);
    const sources = incomingEdges.map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      let srcOutput = srcNode?.data?.lastOutput ?? srcNode?.data?.content ?? srcNode?.data?.outputContent ?? null;

      // Automatically parse JSON strings if valid
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
      // Single source: provide directly and alias as 'data'
      const singleOut = sources[0].output;
      if (typeof singleOut === 'object' && singleOut !== null) {
        Object.assign(payload, singleOut);
      }
      payload['data'] = singleOut;
      payload[sources[0].name.replace(/[^a-zA-Z0-9_]/g, '_')] = singleOut;
    } else if (sources.length > 1) {
      // Multiple sources (fan-in): key by clean node name
      sources.forEach(s => {
        const key = s.name.replace(/[^a-zA-Z0-9_]/g, '_');
        payload[key] = s.output;
      });
      // Also provide first table/object as default if any
      const firstSrc = sources.find(s => s.output !== null && s.output !== undefined);
      if (firstSrc) {
        payload['data'] = firstSrc.output;
      }
    }

    // Always attach full list so all inputs are considered
    payload['sources'] = sources;
    payload['allOutputs'] = sources.map(s => s.output);

    return { sources, payload };
  }, [nodeId, nodes, edges]);

  // Determine current active input data based on selected tab
  const currentActiveInput = useMemo(() => {
    if (inputTab === 'inherited') {
      return upstreamInfo.payload;
    }
    if (inputTab === 'upload') {
      return uploadedData || { note: 'No file uploaded yet.' };
    }
    // Manual tab
    try {
      return JSON.parse(manualInputText);
    } catch {
      return { rawText: manualInputText };
    }
  }, [inputTab, upstreamInfo.payload, uploadedData, manualInputText]);

  // Set starter code if code is empty on language change
  useEffect(() => {
    if (!code) {
      if (language === 'python') {
        setCode('def process(inputs):\n    # Write your deterministic Python code here\n    result = inputs\n    return result');
      } else if (language === 'sql') {
        setCode('-- Write your deterministic SQL query here\nSELECT * FROM data;');
      } else {
        setCode('function process(inputs) {\n  // Write your deterministic JavaScript code here\n  return inputs;\n}');
      }
    }
  }, [language, code]);

  // Handle Natural Language Compilation
  const handleCompile = async () => {
    if (!prompt.trim()) {
      alert('Please enter a description in crude, simple human language.');
      return;
    }

    setIsCompiling(true);
    try {
      const activeProviders = getAllConfiguredProviders();
      const primaryProvider = activeProviders.length > 0 ? activeProviders[0].id : 'google';

      const res = await compileDeterministicLogic({
        prompt,
        language,
        sampleInputs: currentActiveInput,
        provider: primaryProvider
      });

      if (res.code) {
        setCode(res.code);
      }
    } catch (err) {
      console.error('Compilation failed:', err);
      alert(`Logic Compilation Error: ${err.message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // Handle Execution (0 Tokens)
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionError(null);

    try {
      const res = await executeDeterministicTask({
        language,
        code,
        inputData: currentActiveInput,
        engine
      });

      if (res.success) {
        setExecutionResult(res);
        setExecutionError(null);

        // Update node in canvas state
        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            name: nodeName,
            prompt,
            language,
            code,
            engine,
            inputMode: inputTab,
            manualInputText,
            uploadedData,
            uploadedFileName,
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

  // Handle file uploads (CSV, JSON, Excel text)
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
        } catch (err) {
          alert('Invalid JSON file.');
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
    } else {
      // General text or fallback
      reader.onload = (event) => {
        setUploadedData({ fileName: file.name, content: event.target.result });
      };
      reader.readAsText(file);
    }
  };

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Export output as JSON or CSV
  const handleExportOutput = () => {
    if (!executionResult?.output) return;
    const output = executionResult.output;
    let dataStr = '';
    let fileName = `${nodeName.replace(/\s+/g, '_')}_output.json`;
    let mimeType = 'application/json';

    if (Array.isArray(output) && output.length > 0 && typeof output[0] === 'object') {
      // Export as CSV
      const headers = Object.keys(output[0]);
      const csvRows = [headers.join(',')];
      output.forEach(row => {
        csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
      });
      dataStr = csvRows.join('\n');
      fileName = `${nodeName.replace(/\s+/g, '_')}_output.csv`;
      mimeType = 'text/csv';
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Determine tabular shape of execution output
  const outputRows = useMemo(() => {
    if (!executionResult?.output) return [];
    if (Array.isArray(executionResult.output)) {
      return executionResult.output;
    }
    if (typeof executionResult.output === 'object') {
      // If object has array property (e.g. { results: [...] })
      for (const v of Object.values(executionResult.output)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
          return v;
        }
      }
    }
    return [];
  }, [executionResult]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className={`relative w-full max-w-7xl h-[92vh] flex flex-col border shadow-2xl rounded-none overflow-hidden ${
          isDarkMode ? 'bg-[#0E1118] border-[#2A3144] text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* Top Header Bar */}
        <div className={`px-6 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'bg-[#001E50] border-[#00338D]' : 'bg-[#001E50] border-[#00338D] text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#EAAA00] text-[#001E50] flex items-center justify-center shrink-0 font-bold rounded-none">
              <Code2 className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white border-b border-white/20 hover:border-white/60 focus:border-[#EAAA00] focus:outline-none px-1 py-0.5 rounded-none font-mono"
                  placeholder="Box Name"
                />
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#EAAA00]/20 text-[#EAAA00] border border-[#EAAA00]/40 rounded-none">
                  DETERMINISTIC SANDBOX
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 rounded-none">
                  <Zap className="w-3 h-3" /> 0 TOKENS
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                Simple Human Language • Multi-Language Backend • Complete Execution Transparency
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="btn-tactile px-4 py-2 bg-[#0091DA] hover:bg-[#007BB8] text-white text-xs font-mono font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer rounded-none border border-[#0091DA]"
              title="Run deterministic logic with zero token waste"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>EXECUTING...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>RUN LOGIC (0 TOKENS)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors"
              title="Close Workspace (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Split Grid Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: Human Language Intent & Data Sources (5 cols)                */}
          {/* ========================================================================= */}
          <div className={`lg:col-span-5 border-r flex flex-col overflow-y-auto ${
            isDarkMode ? 'border-[#222738] bg-[#121620]' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="p-5 space-y-5">
              {/* 1. Natural Language Instruction Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#0091DA] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Human Language Instruction
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Talk in simple, crude words
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. 'swap variables x and y', or 'join table A with table B on column id and return matching and non-matching rows', or 'pivot months as columns and sum amounts'..."
                    className={`w-full p-3 text-xs font-mono leading-relaxed border rounded-none transition-all resize-none focus:outline-none ${
                      isDarkMode 
                        ? 'bg-[#0B0D14] border-[#2A3144] text-white focus:border-[#0091DA] focus:ring-1 focus:ring-[#0091DA]' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D]'
                    }`}
                  />
                </div>

                {/* Language & Engine Selection Row */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                      Backend Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className={`w-full py-1.5 px-2.5 text-xs font-mono font-bold border rounded-none focus:outline-none ${
                        isDarkMode 
                          ? 'bg-[#181D2A] border-[#2E364A] text-[#EAAA00]' 
                          : 'bg-white border-slate-300 text-[#00338D]'
                      }`}
                    >
                      <option value="auto">Platform-Agnostic (Auto-Detect)</option>
                      <option value="javascript">JavaScript / TypeScript (Browser Native)</option>
                      <option value="python">Python (Pandas / Native)</option>
                      <option value="sql">SQL (DuckDB / Relational)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                      Execution Runner
                    </label>
                    <select
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      className={`w-full py-1.5 px-2.5 text-xs font-mono font-bold border rounded-none focus:outline-none ${
                        isDarkMode 
                          ? 'bg-[#181D2A] border-[#2E364A] text-slate-200' 
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="auto">Auto (Fastest)</option>
                      <option value="browser">In-Browser Isolate</option>
                      <option value="backend">Backend Sandbox Pool</option>
                    </select>
                  </div>
                </div>

                {/* Generate Logic Button */}
                <button
                  onClick={handleCompile}
                  disabled={isCompiling}
                  className={`w-full py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer rounded-none ${
                    isCompiling
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : isDarkMode
                        ? 'bg-[#EAAA00] hover:bg-[#D49800] text-[#001E50] border-[#EAAA00]'
                        : 'bg-[#EAAA00] hover:bg-[#D49800] text-[#001E50] border-[#EAAA00]'
                  }`}
                  title="Translate your plain language instructions into deterministic code"
                >
                  {isCompiling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SYNTHESIZING DETERMINISTIC LOGIC...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>GENERATE / UPDATE CODE FROM PROMPT</span>
                    </>
                  )}
                </button>

                {/* Or Discuss in Co-Pilot Panel */}
                <button
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    window.dispatchEvent(new CustomEvent('keaos:set-drawer-mode', {
                      detail: { mode: 'deterministic-copilot', nodeId }
                    }));
                    window.dispatchEvent(new CustomEvent('keaos:expand-drawer'));
                  }}
                  className={`w-full py-2 px-3 text-xs font-mono font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer rounded-none ${
                    isDarkMode 
                      ? 'bg-[#00338D]/25 hover:bg-[#00338D]/45 text-[#0091DA] border-[#00338D]' 
                      : 'bg-blue-50 hover:bg-blue-100 text-[#00338D] border-blue-200'
                  }`}
                  title="Open conversational Co-Pilot in bottom panel using the connected model brain"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>DISCUSS & PLAN IN BOTTOM CO-PILOT PANEL</span>
                </button>
              </div>

              {/* 2. Input Data & Source Selection */}
              <div className="space-y-3 pt-2 border-t border-slate-700/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#0091DA]" />
                    Input Data Source
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Available as `inputs`
                  </span>
                </div>

                {/* Tabs: Inherited | Upload | Manual */}
                <div className={`grid grid-cols-3 p-1 border rounded-none ${
                  isDarkMode ? 'bg-[#0E1118] border-[#222736]' : 'bg-slate-200 border-slate-300'
                }`}>
                  <button
                    onClick={() => setInputTab('inherited')}
                    className={`py-1 text-xs font-mono font-bold transition-all rounded-none ${
                      inputTab === 'inherited'
                        ? isDarkMode ? 'bg-[#222838] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Inherited ({upstreamInfo.sources.length})
                  </button>
                  <button
                    onClick={() => setInputTab('upload')}
                    className={`py-1 text-xs font-mono font-bold transition-all rounded-none ${
                      inputTab === 'upload'
                        ? isDarkMode ? 'bg-[#222838] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => setInputTab('manual')}
                    className={`py-1 text-xs font-mono font-bold transition-all rounded-none ${
                      inputTab === 'manual'
                        ? isDarkMode ? 'bg-[#222838] text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Raw / Paste
                  </button>
                </div>

                {/* Tab Content: Inherited */}
                {inputTab === 'inherited' && (
                  <div className={`p-3 border rounded-none text-xs font-mono space-y-2 ${
                    isDarkMode ? 'bg-[#0B0D14] border-[#222736]' : 'bg-white border-slate-300'
                  }`}>
                    {upstreamInfo.sources.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 space-y-1">
                        <p className="text-xs">No upstream nodes connected yet.</p>
                        <p className="text-[11px] text-slate-500">
                          Connect another Deterministic Box, Agent Core, or Ingestion Node to feed data into this box.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Status banner */}
                        {upstreamInfo.sources.length > 1 ? (
                          <div className={`p-2 border text-[11px] font-mono flex items-start gap-2 ${
                            isDarkMode ? 'bg-[#EAAA00]/10 border-[#EAAA00]/30 text-[#EAAA00]' : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                            <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Multi-Source Fan-In Active ({upstreamInfo.sources.length} Sources)</span>
                              <span className="text-[10px] opacity-90 block">
                                All upstream outputs are aggregated into `inputs`. Each source is accessible by key or via `inputs.allOutputs`.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className={`p-2 border text-[11px] font-mono flex items-start gap-2 ${
                            isDarkMode ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block">Chained Stream Active (1 Upstream Source)</span>
                              <span className="text-[10px] opacity-90 block">
                                Output flows directly into `inputs.data` and `inputs['{upstreamInfo.sources[0]?.name?.replace(/[^a-zA-Z0-9_]/g, '_')}']`.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Quick Variable Access Chips */}
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                            Available Code Variables:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {upstreamInfo.sources.map(src => {
                              const cleanKey = src.name.replace(/[^a-zA-Z0-9_]/g, '_');
                              return (
                                <button
                                  key={src.id}
                                  onClick={() => {
                                    navigator.clipboard.writeText(`inputs['${cleanKey}']`);
                                    alert(`Copied inputs['${cleanKey}'] to clipboard`);
                                  }}
                                  className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-colors cursor-pointer rounded-none flex items-center gap-1 ${
                                    isDarkMode 
                                      ? 'bg-[#181D2A] hover:bg-[#202738] border-[#2A3348] text-[#0091DA]' 
                                      : 'bg-white hover:bg-slate-100 border-slate-300 text-[#00338D]'
                                  }`}
                                  title={`Click to copy inputs['${cleanKey}']`}
                                >
                                  <span>inputs['{cleanKey}']</span>
                                  <Copy className="w-2.5 h-2.5 opacity-60" />
                                </button>
                              );
                            })}
                            {upstreamInfo.sources.length > 1 && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText('inputs.allOutputs');
                                  alert("Copied inputs.allOutputs to clipboard");
                                }}
                                className={`px-2 py-0.5 text-[10px] font-mono font-bold border transition-colors cursor-pointer rounded-none flex items-center gap-1 ${
                                  isDarkMode 
                                    ? 'bg-[#181D2A] hover:bg-[#202738] border-[#2A3348] text-emerald-400' 
                                    : 'bg-white hover:bg-slate-100 border-slate-300 text-emerald-700'
                                }`}
                                title="Click to copy inputs.allOutputs"
                              >
                                <span>inputs.allOutputs</span>
                                <Copy className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Connected Sources List */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                            Connected Upstream Components:
                          </span>
                          {upstreamInfo.sources.map(src => (
                            <div 
                              key={src.id}
                              className={`p-2 border flex items-center justify-between ${
                                isDarkMode ? 'border-[#262B3B] bg-[#141824]' : 'border-slate-200 bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${src.output !== null ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                                <span className="font-bold">{src.name}</span>
                                <span className="text-[10px] text-slate-400">({src.type})</span>
                              </div>
                              <span className={`text-[10px] font-mono font-bold ${src.output !== null ? 'text-emerald-400' : 'text-slate-400'}`}>
                                {src.output !== null ? 'Output Ready' : 'Awaiting Run'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content: Upload File */}
                {inputTab === 'upload' && (
                  <div className={`p-4 border border-dashed rounded-none text-center space-y-3 ${
                    isDarkMode ? 'bg-[#0B0D14] border-[#2A3144]' : 'bg-white border-slate-300'
                  }`}>
                    <label className="cursor-pointer block space-y-2">
                      <div className="w-10 h-10 mx-auto bg-blue-500/15 text-[#0091DA] flex items-center justify-center border border-blue-500/30">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-white block">
                        {uploadedFileName ? uploadedFileName : 'Click to Upload Excel, CSV, or JSON'}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Supports .csv, .json, .xlsx tabular datasets
                      </span>
                      <input
                        type="file"
                        accept=".csv,.json,.txt,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Tab Content: Manual Paste */}
                {inputTab === 'manual' && (
                  <textarea
                    rows={5}
                    value={manualInputText}
                    onChange={(e) => setManualInputText(e.target.value)}
                    placeholder='{"x": 10, "y": 20}'
                    className={`w-full p-2.5 text-xs font-mono leading-relaxed border rounded-none focus:outline-none ${
                      isDarkMode 
                        ? 'bg-[#0B0D14] border-[#2A3144] text-white focus:border-[#0091DA]' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
                    }`}
                  />
                )}

                {/* Live Schema & Preview Inspector */}
                <div className={`p-3 border rounded-none text-xs font-mono ${
                  isDarkMode ? 'bg-[#0B0D14] border-[#222736]' : 'bg-white border-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Live Input Payload Preview
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      {Array.isArray(currentActiveInput) ? `${currentActiveInput.length} Rows` : 'Object Payload'}
                    </span>
                  </div>
                  <pre className="text-[11px] text-slate-300 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap leading-tight">
                    {JSON.stringify(currentActiveInput, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: Code Editor & Execution Results (7 cols)                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
            {/* Top Code Inspector Header */}
            <div className={`p-3 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#EAAA00]" />
                <span className="text-xs font-mono font-bold tracking-tight">
                  Backend Code ({language.toUpperCase()})
                </span>
                <span className="text-[9px] font-mono text-slate-400 bg-black/30 px-2 py-0.5 border border-white/10 rounded-none">
                  Fully Editable
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 text-[11px] font-mono border border-slate-700 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 rounded-none transition-colors"
                  title="Copy code to clipboard"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="h-64 sm:h-72 border-b shrink-0 relative overflow-hidden bg-[#0A0D14]">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck="false"
                className="w-full h-full p-4 font-mono text-xs text-emerald-300 bg-transparent resize-none focus:outline-none leading-relaxed selection:bg-blue-600/40"
                placeholder="// Deterministic code here..."
              />
            </div>

            {/* Execution Console & Results View */}
            <div className={`flex-1 flex flex-col overflow-hidden ${
              isDarkMode ? 'bg-[#0E1118]' : 'bg-white'
            }`}>
              {/* Output Sub-Header */}
              <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
                isDarkMode ? 'bg-[#121622] border-[#222738]' : 'bg-slate-100 border-slate-200'
              }`}>
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
                        className="pl-7 pr-2 py-1 text-[11px] font-mono bg-black/20 border border-slate-700 text-white focus:outline-none rounded-none"
                      />
                    </div>
                  )}

                  {executionResult?.output && (
                    <button
                      onClick={handleExportOutput}
                      className="px-2.5 py-1 text-[11px] font-mono border border-slate-700 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 rounded-none transition-colors"
                      title="Download output as CSV or JSON"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Output Content Body */}
              <div className="flex-1 overflow-auto p-4">
                {executionError ? (
                  <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      Execution Error Traceback:
                    </p>
                    <p className="whitespace-pre-wrap">{executionError}</p>
                  </div>
                ) : !executionResult ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2">
                    <Code2 className="w-8 h-8 text-slate-600" />
                    <p className="text-xs">No execution run yet.</p>
                    <p className="text-[11px] text-slate-600">
                      Click "RUN LOGIC (0 TOKENS)" above to test your deterministic backend logic.
                    </p>
                  </div>
                ) : outputRows.length > 0 ? (
                  /* Interactive Tabular Grid View */
                  <div className="space-y-2 font-mono">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Showing {outputRows.length} transformed records:</span>
                    </div>

                    <div className="border border-slate-700/60 overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono divide-y divide-slate-700/60">
                        <thead className={isDarkMode ? 'bg-[#181D2A]' : 'bg-slate-100'}>
                          <tr>
                            <th className="py-2 px-3 text-[10px] font-bold uppercase text-slate-400">#</th>
                            {Object.keys(outputRows[0]).map(col => (
                              <th key={col} className="py-2 px-3 text-[10px] font-bold uppercase text-slate-300">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {outputRows
                            .filter(r => {
                              if (!outputSearch) return true;
                              return JSON.stringify(r).toLowerCase().includes(outputSearch.toLowerCase());
                            })
                            .slice(0, 100)
                            .map((row, idx) => (
                              <tr key={idx} className={isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
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
                  /* Formatted JSON / Scalar View */
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
