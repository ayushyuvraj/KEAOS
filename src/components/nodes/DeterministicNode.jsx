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
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle'); // idle | success | error
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);

  const language = (data?.language || 'python').toLowerCase();
  const codeText = data?.code || '';

  // Local state for inline editable text box
  const [localPrompt, setLocalPrompt] = useState(data?.prompt || '');

  useEffect(() => {
    if (data?.prompt !== undefined && data?.prompt !== localPrompt) {
      setLocalPrompt(data.prompt);
    }
  }, [data?.prompt]);

  const handlePromptChange = (e) => {
    const val = e.target.value;
    setLocalPrompt(val);
    if (data?.onUpdateNodeData) {
      data.onUpdateNodeData(id, { prompt: val });
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
        language,
        code: codeText || (language === 'python' ? 'def process(inputs):\n    return inputs' : 'function process(inputs) { return inputs; }'),
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
      className={`relative group w-80 select-none transition-all duration-200 cursor-pointer ${
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
      {/* Floating Micro-Toolbar on Hover (displays on hover just like Agent and circular nodes) */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={data?.name || 'Deterministic Logic'}
        isDeactivated={isDeactivated}
        onOpenChat={handleChatClick}
        onExecute={handleQuickRun}
        onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
        onDelete={() => data?.onDelete && data.onDelete(id)}
        onOpenInspector={() => data?.onOpenInspector && data.onOpenInspector(id)}
        onDuplicate={() => data?.onDuplicate && data.onDuplicate(id)}
        onCopy={() => data?.onCopy && data.onCopy(id)}
        onRename={(nodeId, newName) => data?.onRename && data.onRename(nodeId, newName)}
        isDarkMode={isDarkMode}
        className="-top-7 right-2"
        dropdownPlacement="bottom"
      />

      {/* Input Handle (Left - Accepts connections from multiple boxes/agents) */}
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
        title="Input Data Stream (Fan-in supported)"
      />

      {/* Output Handle (Right - Feeds downstream boxes or agents) */}
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
        title="Deterministic Output Stream (Fan-out supported)"
      />

      {/* Top Header: Title on Left, Small Borderless Icons on Top Right (no boxes around them) */}
      <div className={`px-3 pt-2.5 pb-1.5 flex items-center justify-between border-b ${
        isDarkMode ? 'border-[#262B3B]/60' : 'border-slate-100'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Code2 className="w-3.5 h-3.5 text-[#EAAA00] shrink-0" />
          <span className="text-xs font-mono font-bold text-[#EAAA00] truncate">
            {data?.name || 'Deterministic Logic'}
          </span>
          <span className="text-[8.5px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded-none font-bold shrink-0">
            0 TOK
          </span>
        </div>

        {/* Small icons on top right WITHOUT boxes/borders around them */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick Run icon button */}
          <button
            type="button"
            onClick={handleQuickRun}
            disabled={isRunning}
            className={`p-1 transition-colors cursor-pointer active:scale-90 bg-transparent border-0 outline-none ${
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

          {/* Chat icon button — Opens bottom Co-Pilot chat ONLY */}
          <button
            type="button"
            onClick={handleChatClick}
            className={`p-1 transition-colors cursor-pointer active:scale-90 bg-transparent border-0 outline-none ${
              isDarkMode 
                ? 'text-slate-400 hover:text-[#0091DA]' 
                : 'text-slate-500 hover:text-[#00338D]'
            }`}
            title="Open Co-Pilot chat in bottom panel"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {/* Small button to open Sandbox Workspace */}
          <button
            type="button"
            onClick={handleOpenSandbox}
            className={`p-1 transition-colors cursor-pointer active:scale-90 bg-transparent border-0 outline-none ${
              isDarkMode 
                ? 'text-slate-400 hover:text-[#EAAA00]' 
                : 'text-slate-500 hover:text-[#B8860B]'
            }`}
            title="Open Full Deterministic Sandbox Workspace"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body: Clean Text Box for Deterministic Rule / Prompt */}
      <div className="p-3">
        <textarea
          value={localPrompt}
          onChange={handlePromptChange}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          rows={3}
          placeholder="Enter deterministic rule or prompt (e.g. filter rows where status is active)..."
          className={`nodrag nowheel w-full p-2 text-xs font-mono leading-relaxed resize-none rounded-none border transition-colors outline-none focus:ring-1 focus:ring-[#EAAA00] ${
            isDarkMode 
              ? 'bg-[#0B0F19] border-[#2A3042] text-slate-200 placeholder-slate-600 focus:border-[#EAAA00]' 
              : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#EAAA00]'
          }`}
        />

        {/* Subtle Bottom Status Strip */}
        <div className="flex items-center justify-between text-[9px] font-mono mt-1.5 px-0.5">
          <span className="truncate">
            {runStatus === 'success' && (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Ready ({latencyMs}ms)
              </span>
            )}
            {runStatus === 'error' && (
              <span className="text-red-400 font-bold flex items-center gap-1 truncate max-w-[170px]" title={statusMessage}>
                <AlertCircle className="w-2.5 h-2.5 shrink-0" /> {statusMessage || 'Error'}
              </span>
            )}
            {runStatus === 'running' && (
              <span className="text-blue-400 font-bold animate-pulse">Running...</span>
            )}
            {runStatus === 'idle' && (
              <span className="text-slate-400">• {language.toUpperCase()} • Idle</span>
            )}
          </span>

          <span className="text-slate-400 shrink-0 ml-2">
            {data?.upstreamCount > 1 
              ? `⚡ ${data.upstreamCount} In` 
              : data?.upstreamCount === 1 
                ? '🔗 1 In' 
                : 'Standalone'}
          </span>
        </div>
      </div>
    </div>
  );
}
