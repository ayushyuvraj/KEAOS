import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Code2, 
  Play, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Trash2, 
  Zap,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';
import { executeDeterministicTask } from '../../services/deterministicRunner';

export default function DeterministicNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  
  const [isRunning, setIsRunning] = useState(false);
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle'); // idle | success | error
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);

  const language = (data?.language || 'python').toLowerCase();
  const promptText = data?.prompt || '';
  const codeText = data?.code || '';

  // Language pill color badge
  const getLangBadgeStyle = () => {
    switch (language) {
      case 'python':
        return { text: 'PYTHON', bg: 'bg-blue-500/15', textCol: 'text-blue-400', border: 'border-blue-500/30' };
      case 'sql':
        return { text: 'SQL', bg: 'bg-emerald-500/15', textCol: 'text-emerald-400', border: 'border-emerald-500/30' };
      default:
        return { text: 'JAVASCRIPT', bg: 'bg-amber-500/15', textCol: 'text-amber-400', border: 'border-amber-500/30' };
    }
  };

  const badge = getLangBadgeStyle();

  // Quick Run logic right from node
  const handleQuickRun = async (e) => {
    e.stopPropagation();
    if (isRunning) return;

    setIsRunning(true);
    setRunStatus('running');

    try {
      // Gather inputs passed through data or upstream
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
        // Propagate result
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

  const handleOpenWorkspace = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('keaos:open-deterministic-workspace', {
      detail: { nodeId: id }
    }));
  };

  return (
    <div
      onClick={handleOpenWorkspace}
      className={`relative w-80 select-none transition-all duration-200 cursor-pointer ${
        isDarkMode ? 'bg-[#151821] text-white' : 'bg-white text-[#0B0F19]'
      } ${
        selected 
          ? 'ring-2 ring-[#0091DA] shadow-[0_0_20px_rgba(0,145,218,0.25)]' 
          : 'shadow-lg hover:shadow-xl'
      } ${
        isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'
      } border ${
        isDarkMode ? 'border-[#2D3346]' : 'border-slate-300'
      } rounded-none`}
      style={{
        borderTop: '3px solid #EAAA00' // Distinctive Amber Gold Deterministic Accent
      }}
    >
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
          borderRadius: '0px', // Strict 0px angular geometry
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
          borderRadius: '0px', // Strict 0px angular geometry
          backgroundColor: '#0091DA',
          borderColor: isDarkMode ? '#151821' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 20
        }}
        title="Deterministic Output Stream (Fan-out supported)"
      />

      {/* Top Header */}
      <div className={`p-3 border-b flex items-center justify-between ${
        isDarkMode ? 'border-[#262B3B] bg-[#1A1F2C]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#EAAA00]/20 text-[#EAAA00] flex items-center justify-center shrink-0 border border-[#EAAA00]/40 rounded-none">
            <Code2 className="w-4 h-4 font-bold" />
          </div>
          <div>
            <h4 className="text-xs font-bold font-mono tracking-tight text-[#EAAA00]">
              {data?.name || 'Deterministic Logic'}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 border ${badge.bg} ${badge.textCol} ${badge.border} rounded-none`}>
                {badge.text}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 flex items-center gap-0.5 rounded-none font-bold">
                <Zap className="w-2.5 h-2.5" /> 0 TOKENS
              </span>
            </div>
          </div>
        </div>

        {/* Quick Run / Status Badge */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleQuickRun}
            disabled={isRunning}
            className={`p-1.5 text-xs font-mono font-bold flex items-center justify-center transition-all ${
              isRunning 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                : 'bg-[#0091DA] hover:bg-[#007BB8] text-white border border-[#0091DA]'
            } rounded-none cursor-pointer`}
            title="Execute logic deterministically (0 tokens)"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3 space-y-2.5">
        {/* Human language prompt preview */}
        <div className={`p-2 border text-[11px] leading-relaxed ${
          isDarkMode ? 'bg-[#0F1117] border-[#222736] text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        } rounded-none min-h-[46px]`}>
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">
            Human Instruction
          </div>
          <p className="line-clamp-2 italic font-mono text-[11px]">
            {promptText ? `"${promptText}"` : 'No instruction configured. Click to open workspace.'}
          </p>
        </div>

        {/* Status / Latency row */}
        <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
          <div className="flex items-center gap-1.5">
            {runStatus === 'success' && (
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <Check className="w-3 h-3" /> Ready ({latencyMs}ms)
              </span>
            )}
            {runStatus === 'error' && (
              <span className="text-red-400 flex items-center gap-1 font-bold truncate max-w-[170px]" title={statusMessage}>
                <AlertCircle className="w-3 h-3 shrink-0" /> {statusMessage || 'Error'}
              </span>
            )}
            {runStatus === 'running' && (
              <span className="text-blue-400 flex items-center gap-1 font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Running...
              </span>
            )}
            {runStatus === 'idle' && (
              <span className="text-slate-400 flex items-center gap-1">
                • Idle (Awaiting Run)
              </span>
            )}
          </div>

          <span className={`text-[9px] font-mono font-bold ${
            data?.upstreamCount > 1 
              ? 'text-[#EAAA00]' 
              : data?.upstreamCount === 1 
                ? 'text-[#0091DA]' 
                : 'text-slate-400'
          }`}>
            {data?.upstreamCount > 1 
              ? `⚡ ${data.upstreamCount} In (Fan-In)` 
              : data?.upstreamCount === 1 
                ? '🔗 1 In (Chained)' 
                : 'Standalone'}
          </span>
        </div>

        {/* Bottom Workspace Action */}
        <button
          onClick={handleOpenWorkspace}
          className={`w-full py-1.5 px-3 border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
            isDarkMode 
              ? 'bg-[#1E2333] hover:bg-[#252C40] border-[#343D56] text-[#0091DA]' 
              : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-[#00338D]'
          } rounded-none cursor-pointer`}
        >
          <span>Open Logic & Sandbox</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
