import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Code2, 
  Play, 
  Sliders, 
  AlertTriangle,
  Loader2, 
  MessageSquare,
  Unlock
} from 'lucide-react';
import { executeDeterministicTask } from '../../services/deterministicRunner';
import { getOfflineFallbackCode } from '../../services/deterministicCompiler';
import NodeActionToolbar from '../common/NodeActionToolbar';

export default function DeterministicNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  
  const [isRunning, setIsRunning] = useState(Boolean(data?.isRunning));
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle');
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);

  const textareaRef = useRef(null);

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

  // Local state for inline editable rule summary / prompt
  const displaySummary = data?.ruleSummary || data?.summary || data?.prompt || '';
  const [localText, setLocalText] = useState(displaySummary);

  useEffect(() => {
    const current = data?.ruleSummary || data?.summary || data?.prompt || '';
    setLocalText(current);
  }, [data?.ruleSummary, data?.summary, data?.prompt]);

  // Overall logic presence: logic is present if prompt directive is entered or frozen compiled code exists
  const hasPrompt = Boolean(localText && localText.trim().length > 0);
  const [isFrozen, setIsFrozen] = useState(Boolean(data?.isFrozen || (hasPrompt && hasCompiledCode)));
  const hasLogic = hasPrompt || (hasCompiledCode && isFrozen);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  useEffect(() => {
    if (data?.isFrozen !== undefined) {
      setIsFrozen(Boolean(data.isFrozen));
    }
  }, [data?.isFrozen]);

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

  const handleTextChange = (e) => {
    const val = e.target.value;
    setLocalText(val);
    if (!val || !val.trim()) {
      setIsFrozen(false);
    }
    if (data?.onUpdateNodeData) {
      const updates = { prompt: val, ruleSummary: val, summary: val };
      if (!val || !val.trim()) {
        updates.code = '';
        updates.isFrozen = false;
      } else if (isStarterCode) {
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

  // Open Co-Pilot chat in bottom drawer ONLY
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

  // Freeze handler for Amber -> Green
  const handleFreezeLogic = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setIsFrozen(true);
    setShowOverwriteWarning(false);
    if (data?.onUpdateNodeData) {
      data.onUpdateNodeData(id, { isFrozen: true, prompt: localText, ruleSummary: localText });
    }
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `✓ Logic frozen for "${nodeTitle}" • Ready to execute` }
    }));
  };

  // Clicking the box selects it or opens Inspector
  const handleBoxClick = () => {
    if (data?.onOpenInspector) {
      data.onOpenInspector(id);
    } else {
      window.dispatchEvent(new CustomEvent('keaos:select-node', { detail: { nodeId: id } }));
    }
  };

  // Guarded textarea click handler when logic is frozen
  const handleTextareaClick = (e) => {
    e.stopPropagation();
    if (isFrozen) {
      setShowOverwriteWarning(true);
    }
  };

  return (
    <div
      onClick={handleBoxClick}
      className={`relative group w-[228px] h-[136px] rounded-[18px] border-2 transition-all duration-200 select-none flex flex-col justify-between cursor-pointer shadow-xl ${
        isDeactivated
          ? 'opacity-45 grayscale border-dashed border-slate-500 bg-slate-800/40'
          : isDarkMode
            ? 'bg-[#1D2028] border-[#383C4A] text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
            : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_12px_32px_rgba(0,30,80,0.08)]'
      } ${
        !isDeactivated && isRunning
          ? 'border-[#EAAA00] ring-4 ring-amber-400/40 shadow-[0_0_28px_rgba(234,170,0,0.35)]'
          : selected
            ? 'border-[#0091DA] ring-2 ring-[#0091DA]'
            : isDarkMode ? 'hover:border-[#525769]' : 'hover:border-[#94A3B8]'
      }`}
      style={{ padding: '8px 10px' }}
    >


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

      {/* Exactly 1 Input Handle (Left - Flush Diamond) */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '9px',
          height: '9px',
          borderRadius: '2px',
          backgroundColor: isRunning ? '#F59E0B' : '#EAAA00',
          borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
          borderWidth: '2px',
          left: '-5px',
          zIndex: 30
        }}
        className={isRunning ? 'animate-pulse ring-4 ring-amber-400/80' : ''}
        title="Input Data Stream"
      />

      {/* Exactly 1 Output Handle (Right - Flush Diamond) */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '9px',
          height: '9px',
          borderRadius: '2px',
          backgroundColor: isRunning ? '#F59E0B' : runStatus === 'success' ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#1D2028' : '#FFFFFF',
          borderWidth: '2px',
          right: '-5px',
          zIndex: 30
        }}
        className={isRunning ? 'animate-pulse ring-4 ring-amber-400/80' : ''}
        title="Output Data Stream"
      />

      {/* Header Row: Icon + Editable Title on left, Status Dot + Action buttons on right */}
      <div className="flex items-center justify-between gap-1.5 px-0.5 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
          <Code2 className={`w-3.5 h-3.5 shrink-0 ${isRunning ? 'text-amber-400 animate-spin' : runStatus === 'success' ? 'text-emerald-500' : 'text-[#EAAA00]'}`} />
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
              className="nodrag nowheel text-xs font-mono font-bold text-[#EAAA00] bg-transparent border-b border-[#EAAA00] outline-none px-0.5 py-0 max-w-[100px]"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename rule"
              className="text-xs font-mono font-bold text-[#EAAA00] truncate max-w-[95px] cursor-text hover:underline decoration-dashed decoration-[#EAAA00]/60 transition-all"
            >
              {nodeTitle}
            </span>
          )}
        </div>

        {/* Right Actions: Small Circle Status Indicator + Play, Chat, Sandbox */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Small circle status indicator (to the left of play button) */}
          <span
            onClick={!isFrozen && hasLogic ? handleFreezeLogic : undefined}
            className={`w-2 h-2 rounded-full transition-all shrink-0 ${
              !hasLogic
                ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                : !isFrozen
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] cursor-pointer hover:scale-125'
                  : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
            } ${isRunning ? 'animate-ping' : ''}`}
            title={
              !hasLogic
                ? 'No logic defined'
                : !isFrozen
                  ? 'Draft logic (Click to freeze)'
                  : 'Logic frozen & active'
            }
          />

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
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>

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

      {/* Main Logic Text Box & Inline Overwrite Protection (Fills remaining height) */}
      <div className="relative flex-1 mt-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {showOverwriteWarning ? (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className={`w-full h-full p-2 rounded-xl text-[10px] font-mono border flex flex-col justify-between transition-all ${
              isDarkMode 
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200' 
                : 'bg-amber-50 border-amber-400 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              <span className="font-semibold leading-tight text-[9.5px]">
                Logic has already been there, but you're trying to replace it.
              </span>
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setShowOverwriteWarning(false)}
                className={`px-2 py-0.5 text-[8.5px] font-bold rounded transition-colors cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFrozen(false);
                  setShowOverwriteWarning(false);
                  if (data?.onUpdateNodeData) {
                    data.onUpdateNodeData(id, { isFrozen: false });
                  }
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="px-2 py-0.5 text-[8.5px] font-bold rounded bg-amber-500 text-black hover:bg-amber-400 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Unlock className="w-2.5 h-2.5" />
                Unlock to Edit
              </button>
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={localText}
            onChange={(e) => {
              if (isFrozen) {
                setShowOverwriteWarning(true);
                return;
              }
              handleTextChange(e);
            }}
            onClick={handleTextareaClick}
            onFocus={(e) => {
              if (isFrozen) {
                e.target.blur();
                setShowOverwriteWarning(true);
              }
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (isFrozen) {
                e.preventDefault();
                setShowOverwriteWarning(true);
              }
            }}
            readOnly={isFrozen}
            placeholder="Describe deterministic logic (e.g., parse rows, calculate tax, format output)..."
            className={`nodrag nowheel w-full h-full p-2 text-[10.5px] font-mono leading-relaxed resize-none rounded-xl border transition-all outline-none ${
              isFrozen
                ? isDarkMode
                  ? 'bg-[#141722]/80 border-[#2A2E3D] text-slate-300 cursor-pointer selection:bg-transparent'
                  : 'bg-slate-50 border-slate-200 text-slate-700 cursor-pointer selection:bg-transparent'
                : isDarkMode 
                  ? 'bg-[#0E111A] border-[#2E3547] text-white placeholder-slate-500 focus:border-[#EAAA00] focus:ring-1 focus:ring-[#EAAA00]'
                  : 'bg-white border-slate-300 text-[#0B0F19] placeholder-slate-400 focus:border-[#EAAA00] focus:ring-1 focus:ring-[#EAAA00]'
            }`}
          />
        )}
      </div>
    </div>
  );
}
