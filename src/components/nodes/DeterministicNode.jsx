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
  Zap
} from 'lucide-react';
import { executeDeterministicTask } from '../../services/deterministicRunner';
import NodeActionToolbar from '../common/NodeActionToolbar';

export default function DeterministicNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle');
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);

  const language = (data?.language || 'python').toLowerCase();
  const codeText = data?.code || '';

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
      data.onUpdateNodeData(id, { prompt: val, ruleSummary: val, summary: val });
    }
  };

  // Quick Run logic right from node
  const handleQuickRun = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isRunning) return;

    setIsRunning(true);
    setRunStatus('running');

    try {
      const inputPayload = data?.upstreamPayload || data?.currentInput || data?.manualInput || data?.uploadedData || { sampleA: 10, sampleB: 20 };
      const res = await executeDeterministicTask({
        nodeId: id,
        language,
        code: codeText || (language === 'python' ? 'def process(inputs):\n    return inputs' : 'function process(inputs, state) { return inputs; }'),
        inputData: inputPayload
      });

      if (res.success) {
        setRunStatus('success');
        setLatencyMs(res.latencyMs);
        setStatusMessage('');
        if (data?.onUpdateNodeData) {
          data.onUpdateNodeData(id, {
            lastOutput: res.output,
            lastStatus: 'success',
            lastLatencyMs: res.latencyMs
          });
        }
        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: { nodeId: id, output: res.output, latencyMs: res.latencyMs }
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
      className={`relative group w-72 select-none transition-all duration-150 cursor-pointer ${
        isDarkMode ? 'bg-[#151821] text-white' : 'bg-white text-[#0B0F19]'
      } ${
        selected 
          ? 'ring-2 ring-[#0091DA] shadow-[0_0_20px_rgba(0,145,218,0.25)]' 
          : 'shadow-md hover:shadow-xl'
      } ${
        isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'
      } border ${
        isDarkMode ? 'border-[#2D3346]' : 'border-slate-300'
      } rounded-none`}
      style={{
        borderTop: '3px solid #EAAA00' // Distinctive Amber Gold Deterministic Accent
      }}
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

      {/* Input Handle (Left - Fan-in supported) */}
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
          backgroundColor: '#EAAA00',
          borderColor: isDarkMode ? '#151821' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 20
        }}
        title="Input Data Stream"
      />

      {/* Output Handle (Right - Fan-out supported) */}
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
          backgroundColor: '#0091DA',
          borderColor: isDarkMode ? '#151821' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 20
        }}
        title="Deterministic Output Stream"
      />

      {/* Top Header: Clean, borderless ghost actions, editable title */}
      <div className={`px-2.5 pt-2 pb-1.5 flex items-center justify-between border-b ${
        isDarkMode ? 'border-[#262B3B]/60' : 'border-slate-100'
      }`}>
        {/* Left: Icon and Inline Editable Title */}
        <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
          <Code2 className="w-3.5 h-3.5 text-[#EAAA00] shrink-0" />
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
              className="nodrag nowheel text-xs font-mono font-bold text-[#EAAA00] bg-transparent border-b border-[#EAAA00] outline-none px-0.5 py-0 max-w-[130px]"
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename rule"
              className="text-xs font-mono font-bold text-[#EAAA00] truncate max-w-[130px] cursor-text hover:underline decoration-dashed decoration-[#EAAA00]/60 transition-all"
            >
              {nodeTitle}
            </span>
          )}
        </div>

        {/* Right: Tactile Ghost Action Icons (No boxes/borders around them) */}
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

          {/* Chat Icon — Opens bottom Co-Pilot chat ONLY */}
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

      {/* Main Body: Maximized Functional Rule Summary Text Area */}
      <div className="p-2.5">
        <textarea
          value={localText}
          onChange={handleTextChange}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          rows={3.5}
          placeholder="Rule summary (e.g. Appends incoming records into stateful Excel workbook)..."
          className={`nodrag nowheel w-full p-2 text-[11px] font-mono leading-relaxed resize-none rounded-none border transition-colors outline-none focus:ring-1 focus:ring-[#EAAA00] ${
            isDarkMode 
              ? 'bg-[#0A0D14] border-[#242A3B] text-slate-200 placeholder-slate-600 focus:border-[#EAAA00]'
              : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#EAAA00]'
          }`}
        />
      </div>
    </div>
  );
}
