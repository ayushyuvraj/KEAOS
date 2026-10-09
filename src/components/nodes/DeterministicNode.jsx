import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Code2, 
  Play, 
  Sliders,
  Check, 
  AlertCircle, 
  Loader2, 
  MessageSquare,
  Zap,
  Lock,
  Unlock,
  Copy,
  RotateCcw,
  FileText,
  FileCode
} from 'lucide-react';
import { executeDeterministicTask } from '../../services/deterministicRunner';
import { compileDeterministicLogic, getOfflineFallbackCode } from '../../services/deterministicCompiler';
import NodeActionToolbar from '../common/NodeActionToolbar';

export default function DeterministicNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  
  const [isRunning, setIsRunning] = useState(Boolean(data?.isRunning));
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle');
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);

  // Tab mode & Overwrite Protection Guard states
  const [activeTab, setActiveTab] = useState('directive'); // 'directive' | 'code'
  const [isCodeLocked, setIsCodeLocked] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isRecompiling, setIsRecompiling] = useState(false);

  // Detect pre-existing logic / code
  const language = (data?.language || 'python').toLowerCase();
  const codeText = data?.code || '';
  const isStarterCode = !codeText || 
    codeText.trim() === 'function process(inputs) {\n  return inputs;\n}' ||
    codeText.trim() === 'function process(inputs) {\n  // Transform input data\n  return inputs;\n}' ||
    codeText.trim().startsWith('function process(inputs) {\n  // Transform input data') ||
    codeText.trim() === 'function process(inputs) { return inputs; }' ||
    codeText.trim().startsWith('def process(inputs):\n    # Write');
  const hasCompiledCode = Boolean(codeText && codeText.trim().length > 0 && !isStarterCode);
  const codeLines = codeText ? codeText.split('\n').filter(l => l.trim()).length : 0;
  const isStaged = Boolean(data?.isStaged && !isRunning);

  useEffect(() => {
    if (data?.lastStatus) setRunStatus(data.lastStatus);
    if (data?.isRunning !== undefined) setIsRunning(Boolean(data.isRunning));
    if (data?.isExecuting !== undefined) {
      setIsRunning(Boolean(data.isExecuting));
      if (data.isExecuting) setRunStatus('running');
    }
    if (data?.lastLatencyMs !== undefined) setLatencyMs(data.lastLatencyMs);
    if (data?.lastError !== undefined) setStatusMessage(data.lastError || '');
  }, [data?.lastStatus, data?.isRunning, data?.isExecuting, data?.lastLatencyMs, data?.lastError]);

  // Listen for real-time executing and executed events for this specific node
  useEffect(() => {
    const handleExecuting = (e) => {
      if (e.detail?.nodeId === id) {
        setIsRunning(true);
        setRunStatus('running');
      }
    };
    const handleExecuted = (e) => {
      if (e.detail?.nodeId === id) {
        setIsRunning(false);
        setRunStatus(e.detail?.success !== false ? 'success' : 'error');
        if (e.detail?.latencyMs !== undefined) setLatencyMs(e.detail.latencyMs);
        if (e.detail?.error) setStatusMessage(e.detail.error);
      }
    };
    window.addEventListener('keaos:deterministic-executing', handleExecuting);
    window.addEventListener('keaos:deterministic-executed', handleExecuted);
    return () => {
      window.removeEventListener('keaos:deterministic-executing', handleExecuting);
      window.removeEventListener('keaos:deterministic-executed', handleExecuted);
    };
  }, [id]);

  // Inline Editable Rule Title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [nodeTitle, setNodeTitle] = useState(data?.name || 'Rule1');

  useEffect(() => {
    if (data?.name && data.name !== nodeTitle) {
      setNodeTitle(data.name);
    }
  }, [data?.name]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const trimmed = nodeTitle.trim() || 'Rule1';
    setNodeTitle(trimmed);
    if (data?.onRename) {
      data.onRename(id, trimmed);
    } else if (data?.onUpdateNodeData) {
      data.onUpdateNodeData(id, { name: trimmed });
    }
  };

  // Local state for inline editable rule summary / prompt
  const displaySummary = data?.ruleSummary || data?.summary || data?.prompt || '';
  const [localText, setLocalText] = useState(displaySummary);

  useEffect(() => {
    const current = data?.ruleSummary || data?.summary || data?.prompt || '';
    setLocalText(current);
  }, [data?.ruleSummary, data?.summary, data?.prompt]);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setLocalText(val);
    if (data?.onUpdateNodeData) {
      const updates = { prompt: val, ruleSummary: val, summary: val };
      if (val && val.trim() && isStarterCode) {
        updates.code = getOfflineFallbackCode(val, language, data?.lastUpstreamReceived || {});
      }
      data.onUpdateNodeData(id, updates);
    }
  };

  // Auto-sync real transparent code if starter code exists alongside a directive
  useEffect(() => {
    if (isStarterCode && localText && localText.trim()) {
      const generated = getOfflineFallbackCode(localText, language, data?.lastUpstreamReceived || {});
      if (generated && generated !== codeText && data?.onUpdateNodeData) {
        data.onUpdateNodeData(id, { code: generated });
      }
    }
  }, [isStarterCode, localText, language, codeText, id, data?.lastUpstreamReceived, data?.onUpdateNodeData]);

  const hasPromptDirective = Boolean(localText && localText.trim().length > 0);

  const handleCopyCode = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!codeText) return;
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecompile = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isRecompiling || !localText.trim()) return;
    setIsRecompiling(true);
    try {
      const res = await compileDeterministicLogic({
        prompt: localText,
        language,
        sampleInputs: data?.lastUpstreamReceived || { sample: 'data' }
      });
      if (res?.code && data?.onUpdateNodeData) {
        data.onUpdateNodeData(id, { code: res.code, prompt: localText });
      }
      setActiveTab('code');
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: `✓ Recompiled logic for "${nodeTitle}"` }
      }));
    } catch (err) {
      console.error('Recompile error:', err);
    } finally {
      setIsRecompiling(false);
    }
  };

  // Quick Run logic right from node
  const handleQuickRun = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isRunning) return;

    setIsRunning(true);
    setRunStatus('running');

    try {
      const inputPayload = data?.lastUpstreamReceived 
        || data?.upstreamPayload 
        || data?.currentInput 
        || data?.manualInput 
        || data?.uploadedData 
        || { sampleA: 10, sampleB: 20, tokens: 1250, latencyMs: 140 };

      const [res] = await Promise.all([
        executeDeterministicTask({
          nodeId: id,
          language,
          code: data?.code || '',
          prompt: localText || data?.prompt || data?.ruleSummary || '',
          inputData: inputPayload
        }),
        new Promise((resolve) => setTimeout(resolve, 850))
      ]);

      if (res.success) {
        setRunStatus('success');
        setLatencyMs(res.latencyMs);
        setStatusMessage('');
        if (data?.onUpdateNodeData) {
          data.onUpdateNodeData(id, {
            lastOutput: res.output,
            lastTableData: res.tableData,
            lastStatus: 'success',
            lastLatencyMs: res.latencyMs
          });
        }
        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: { 
            nodeId: id, 
            output: res.output, 
            tableData: res.tableData,
            latencyMs: res.latencyMs,
            success: true,
            sourceAgentName: nodeTitle
          }
        }));
      } else {
        setRunStatus('error');
        setLatencyMs(res.latencyMs);
        setStatusMessage(res.error || 'Execution failed');
      }
    } catch (err) {
      setRunStatus('error');
      setStatusMessage(err.message || 'Execution error');
    } finally {
      setIsRunning(false);
    }
  };

  // Open Co-Pilot chat in bottom drawer ONLY (never open right panel)
  const handleChatClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (data?.onOpenDeterministicChat) {
      data.onOpenDeterministicChat(id);
    } else {
      window.dispatchEvent(new CustomEvent('keaos:set-drawer-mode', {
        detail: { mode: 'deterministic-copilot', nodeId: id }
      }));
      window.dispatchEvent(new CustomEvent('keaos:expand-drawer'));
    }
  };

  // Small button to open Sandbox Workspace Modal
  const handleOpenSandbox = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    window.dispatchEvent(new CustomEvent('keaos:open-deterministic-workspace', {
      detail: { nodeId: id }
    }));
  };

  // Clicking anywhere else on the box opens the right panel (Inspector)
  const handleBoxClick = () => {
    if (data?.onOpenInspector) {
      data.onOpenInspector(id);
    } else {
      window.dispatchEvent(new CustomEvent('keaos:select-node', { detail: { nodeId: id } }));
    }
  };

  return (
    <div
      onClick={handleBoxClick}
      className={`relative group w-72 select-none transition-all duration-200 cursor-pointer ${
        isDarkMode ? 'bg-[#151821] text-white' : 'bg-white text-[#0B0F19]'
      } ${
        isRunning 
          ? 'deterministic-glow-breath ring-4 ring-amber-400/70 scale-[1.02] border-[#EAAA00]' 
          : isStaged
            ? 'ring-2 ring-amber-400/40 border-amber-500/80 shadow-[0_0_18px_rgba(234,170,0,0.25)]'
            : selected 
              ? 'ring-2 ring-[#0091DA] shadow-[0_0_20px_rgba(0,145,218,0.25)]' 
              : 'shadow-md hover:shadow-xl'
      } ${
        isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'
      } border ${
        isDarkMode ? 'border-[#2D3346]' : 'border-slate-300'
      } rounded-none`}
      style={{
        borderTop: isRunning 
          ? '3px solid #EAAA00' 
          : isStaged
            ? '3px solid #EAAA00'
            : runStatus === 'success' 
              ? '3px solid #10B981' 
              : runStatus === 'error'
                ? '3px solid #EF4444'
                : '3px solid #EAAA00',
        boxShadow: isRunning 
          ? undefined
          : isStaged
            ? '0 0 16px rgba(234, 170, 0, 0.3)'
            : runStatus === 'success'
              ? '0 0 15px rgba(16, 185, 129, 0.2)'
              : undefined
      }}
    >
      {/* Floating Active Status Beacon (Exact Parity with Circular Nodes) */}
      {isRunning ? (
        <div 
          className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[8.5px] font-mono tracking-wider font-bold uppercase shadow-2xl z-40 flex items-center gap-1.5 text-white bg-[#EAAA00] animate-bounce pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <span>COMPUTING LOGIC • 0 TOKENS</span>
        </div>
      ) : isStaged ? (
        <div 
          className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[8px] font-mono tracking-wider font-bold uppercase shadow-lg z-40 flex items-center gap-1.5 text-amber-200 bg-amber-950/90 border border-amber-500/50 pointer-events-none animate-pulse"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          <span>PIPELINE STAGED • AWAITING STREAM</span>
        </div>
      ) : null}

      {/* Concentric Perimeter Radar Waves when Active (Exact Parity with Circular Nodes) */}
      {isRunning && (
        <>
          <span 
            className="absolute -inset-2.5 rounded-none animate-ping opacity-40 pointer-events-none z-0"
            style={{ backgroundColor: '#EAAA00' }}
          />
          <span 
            className="absolute -inset-1 rounded-none animate-pulse opacity-45 pointer-events-none z-0"
            style={{ backgroundColor: '#EAAA00' }}
          />
        </>
      )}

      {/* Scanning Laser Beam Overlay during active computation */}
      {isRunning && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400/25 to-transparent deterministic-laser-sweep" />
        </div>
      )}

      {/* Floating Micro-Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        onOpenChat={handleChatClick}
        onExecute={handleQuickRun}
        onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
        onDelete={() => data?.onDelete && data.onDelete(id)}
        onOpenInspector={() => data?.onOpenInspector && data.onOpenInspector(id)}
        onDuplicate={() => data?.onDuplicate && data.onDuplicate(id)}
        onCopy={() => data?.onCopy && data.onCopy(id)}
        onRename={(nodeId, newName) => {
          setNodeTitle(newName);
          if (data?.onRename) data.onRename(nodeId, newName);
        }}
        isDarkMode={isDarkMode}
        className="-top-7 right-2"
        dropdownPlacement="bottom"
      />

      {/* Input Handle (Left - Fan-in supported, pulses when active) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          top: '50%',
          left: '-7px',
          width: '12px',
          height: '12px',
          borderRadius: '0px',
          backgroundColor: isRunning ? '#F59E0B' : isStaged ? '#D97706' : '#EAAA00',
          borderColor: isDarkMode ? '#151821' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 30
        }}
        className={isRunning ? 'animate-pulse ring-4 ring-amber-400/80' : isStaged ? 'animate-pulse ring-2 ring-amber-400/50' : ''}
        title="Input Data Stream (Connect Agent or Ingestion Output)"
      />

      {/* Output Handle (Right - Connects to Output Viewer) */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{
          top: '50%',
          right: '-7px',
          width: '12px',
          height: '12px',
          borderRadius: '0px',
          backgroundColor: isRunning ? '#F59E0B' : runStatus === 'success' ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#151821' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 30
        }}
        className={isRunning ? 'animate-pulse ring-4 ring-amber-400/80' : ''}
        title="Deterministic Output Stream (Connect to Final Output Viewer to inspect/export)"
      />

      {/* Top Header: Clean, borderless ghost actions, editable title & presence badges */}
      <div className={`px-2.5 pt-2 pb-1.5 flex items-center justify-between border-b ${
        isDarkMode ? 'border-[#262B3B]/60' : 'border-slate-100'
      }`}>
        {/* Left: Icon, Editable Title & Status Badges */}
        <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
          <Code2 className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'text-amber-400 animate-spin' : runStatus === 'success' ? 'text-emerald-400' : 'text-[#EAAA00]'}`} />
          {isEditingTitle ? (
            <input
              type="text"
              value={nodeTitle}
              onChange={(e) => setNodeTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setNodeTitle(data?.name || 'Rule1');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="nodrag nowheel text-xs font-mono font-bold text-[#EAAA00] bg-transparent border-b border-[#EAAA00] outline-none px-0.5 py-0 max-w-[110px]"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename rule"
              className="text-xs font-mono font-bold text-[#EAAA00] truncate max-w-[100px] cursor-text hover:underline decoration-dashed decoration-[#EAAA00]/60 transition-all"
            >
              {nodeTitle}
            </span>
          )}

          {/* Logic Presence Indicator (Institutional Zero-Click Awareness) */}
          {isRunning ? (
            <span className="text-[8px] font-mono px-1.5 py-0.2 bg-amber-500 text-black flex items-center gap-1 font-bold animate-pulse shrink-0">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-black" />
              <span>RUNNING</span>
            </span>
          ) : isStaged ? (
            <span className="text-[8px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-bold animate-pulse shrink-0" title="Workflow pipeline active: awaiting upstream output stream">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>STAGED</span>
            </span>
          ) : hasCompiledCode ? (
            <span 
              className="text-[8px] font-mono px-1.5 py-0.2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold shrink-0 cursor-pointer hover:bg-emerald-500/25 transition-colors"
              onClick={() => setActiveTab('code')}
              title={`Custom logic compiled (${codeLines} lines). Click to view code.`}
            >
              <Lock className="w-2.5 h-2.5 text-emerald-400" />
              <span>{language.toUpperCase()} • {codeLines}L</span>
            </span>
          ) : hasPromptDirective ? (
            <span 
              className="text-[8px] font-mono px-1.5 py-0.2 bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-bold shrink-0"
              title="Natural language directive configured"
            >
              <FileText className="w-2.5 h-2.5 text-amber-300" />
              <span>DIRECTIVE</span>
            </span>
          ) : (
            <span className="text-[8px] font-mono px-1 py-0.2 bg-slate-700/20 text-slate-400 font-bold shrink-0">
              READY
            </span>
          )}

          {/* Execution Latency Pill if completed */}
          {runStatus === 'success' && latencyMs !== null && (
            <span className="text-[8px] font-mono px-1 py-0.2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold shrink-0" title={`Executed in ${latencyMs}ms (0 tokens)`}>
              {latencyMs}ms
            </span>
          )}
          {runStatus === 'error' && (
            <span className="text-[8px] font-mono px-1 py-0.2 bg-red-500/15 text-red-400 border border-red-500/30 font-bold shrink-0" title={statusMessage || 'Execution error'}>
              ERR
            </span>
          )}
        </div>

        {/* Right: Tactile Ghost Action Icons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick Run */}
          <button
            type="button"
            onClick={handleQuickRun}
            disabled={isRunning}
            className={`p-1 transition-all duration-100 cursor-pointer active:scale-90 bg-transparent border-0 outline-none ${
              isDarkMode 
                ? 'text-slate-400 hover:text-emerald-400' 
                : 'text-slate-500 hover:text-emerald-600'
            }`}
            title="Run logic (0 tokens)"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

          {/* Chat Icon — Opens bottom Co-Pilot chat */}
          <button
            type="button"
            onClick={handleChatClick}
            className={`p-1 transition-all duration-100 cursor-pointer active:scale-90 bg-transparent border-0 outline-none ${
              isDarkMode 
                ? 'text-slate-400 hover:text-[#0091DA]' 
                : 'text-slate-500 hover:text-[#00338D]'
            }`}
            title="Open Co-Pilot chat"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {/* Sandbox Workspace */}
          <button
            type="button"
            onClick={handleOpenSandbox}
            className={`p-1 transition-all duration-100 cursor-pointer active:scale-90 bg-transparent border-0 outline-none ${
              isDarkMode 
                ? 'text-slate-400 hover:text-[#EAAA00]' 
                : 'text-slate-500 hover:text-[#B8860B]'
            }`}
            title="Open Sandbox Workspace"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented Mode Switcher: Directive (Human) vs Code (Machine) */}
      <div className={`px-2.5 pt-1 pb-1 flex items-center justify-between border-b text-[10px] font-mono ${
        isDarkMode ? 'bg-[#0A0D14] border-[#222736]' : 'bg-slate-100 border-slate-200'
      }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('directive')}
            className={`px-2 py-0.5 font-bold transition-all border-b-2 ${
              activeTab === 'directive'
                ? isDarkMode ? 'text-amber-400 border-[#EAAA00]' : 'text-amber-700 border-[#EAAA00]'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Directive {hasPromptDirective ? '•' : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-2 py-0.5 font-bold flex items-center gap-1 transition-all border-b-2 ${
              activeTab === 'code'
                ? isDarkMode ? 'text-emerald-400 border-emerald-400' : 'text-emerald-700 border-emerald-600'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            {hasCompiledCode && <Lock className="w-2.5 h-2.5 text-emerald-400" />}
            <span>Code {hasCompiledCode ? `(${codeLines}L)` : ''}</span>
          </button>
        </div>

        {/* Right side tab-contextual controls */}
        {activeTab === 'code' ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCodeLocked(!isCodeLocked)}
              className={`px-1.5 py-0.5 text-[8px] flex items-center gap-1 font-bold border transition-colors ${
                isCodeLocked 
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title={isCodeLocked ? 'Click to unlock code for manual editing' : 'Click to lock code against accidental edits'}
            >
              {isCodeLocked ? <Lock className="w-2.5 h-2.5 text-slate-400" /> : <Unlock className="w-2.5 h-2.5 text-amber-400" />}
              <span>{isCodeLocked ? 'Locked' : 'Unlocked'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Copy code to clipboard"
            >
              {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
          </div>
        ) : hasCompiledCode ? (
          <button
            type="button"
            onClick={handleRecompile}
            disabled={isRecompiling}
            className="px-1.5 py-0.5 text-[8px] bg-[#EAAA00]/15 hover:bg-[#EAAA00]/25 text-[#EAAA00] border border-[#EAAA00]/40 flex items-center gap-1 font-bold transition-all cursor-pointer"
            title="Recompile active logic from current prompt"
          >
            <RotateCcw className={`w-2.5 h-2.5 ${isRecompiling ? 'animate-spin' : ''}`} />
            <span>{isRecompiling ? 'Compiling...' : 'Recompile'}</span>
          </button>
        ) : null}
      </div>

      {/* Main Body: Dual-View with Overwrite Protection */}
      <div className="p-2.5">
        {activeTab === 'directive' ? (
          <>
            {/* Overwrite Protection Banner if code already exists */}
            {hasCompiledCode && (
              <div className={`mb-1.5 px-2 py-1 text-[9px] font-mono border flex items-center justify-between ${
                isDarkMode ? 'bg-[#0E151E] border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}>
                <span className="flex items-center gap-1 truncate max-w-[210px]">
                  <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>Compiled {language.toUpperCase()} active ({codeLines}L). Logic preserved.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="underline hover:text-white font-bold shrink-0 ml-1 cursor-pointer"
                >
                  View Code →
                </button>
              </div>
            )}

            <textarea
              value={localText}
              onChange={handleTextChange}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              rows={hasCompiledCode ? 2.5 : 3.5}
              placeholder="Rule summary (e.g. Appends incoming records into stateful Excel workbook)..."
              className={`nodrag nowheel w-full p-2 text-[11px] font-mono leading-relaxed resize-none rounded-none border transition-colors outline-none focus:ring-1 focus:ring-[#EAAA00] ${
                isDarkMode 
                  ? 'bg-[#0A0D14] border-[#242A3B] text-slate-200 placeholder-slate-600 focus:border-[#EAAA00]'
                  : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#EAAA00]'
              }`}
            />
          </>
        ) : (
          /* Code View: Syntax Styled with Read-Only Lock Guard */
          <div className="relative">
            {isCodeLocked && (
              <div 
                onClick={() => setIsCodeLocked(false)}
                className="absolute top-1 right-1 z-10 px-1.5 py-0.5 bg-black/75 backdrop-blur-sm border border-slate-700 text-[8px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer hover:border-amber-400 transition-colors"
                title="Click to unlock for manual editing"
              >
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                <span>Protected (Click to edit)</span>
              </div>
            )}
            <textarea
              value={codeText}
              onChange={(e) => {
                if (isCodeLocked) return;
                if (data?.onUpdateNodeData) {
                  data.onUpdateNodeData(id, { code: e.target.value });
                }
              }}
              readOnly={isCodeLocked}
              rows={hasCompiledCode ? 3.8 : 3.5}
              className={`nodrag nowheel w-full p-2 text-[10px] font-mono leading-relaxed resize-none rounded-none border transition-colors outline-none ${
                isCodeLocked ? 'opacity-90 select-all cursor-default' : 'focus:ring-1 focus:ring-emerald-400'
              } ${
                isDarkMode 
                  ? 'bg-[#07090F] border-[#202534] text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-emerald-400'
              }`}
              placeholder="// Write or compile deterministic logic here..."
            />
          </div>
        )}

        {/* Output / Table Preview Banner if executed */}
        {runStatus === 'success' && (data?.lastOutput || data?.lastTableData) && (
          <div className={`mt-1.5 p-1.5 text-[9px] font-mono border ${
            isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          } flex items-center justify-between`}>
            <span className="truncate max-w-[210px] font-medium">
              ✓ {typeof data.lastOutput === 'object' 
                  ? (data.lastOutput?.summary || data.lastOutput?.action || (data.lastTableData ? `${data.lastTableData.length} Rows Generated` : 'Output Ready')) 
                  : String(data.lastOutput || 'Output Ready').slice(0, 45)}
            </span>
            <span className="text-[8px] font-bold shrink-0">{latencyMs ? `${latencyMs}ms` : '0 TOK'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
