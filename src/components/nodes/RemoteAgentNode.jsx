import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Globe, 
  Server, 
  Loader2, 
  AlertCircle, 
  Activity
} from 'lucide-react';
import NodeActionToolbar from '../common/NodeActionToolbar';

export default function RemoteAgentNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  const isLocked = Boolean(data?.isLocked);

  const [isRunning, setIsRunning] = useState(Boolean(data?.isRunning));
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');

  const framework = data?.framework || 'langgraph';
  const endpointUrl = data?.endpointUrl || 'https://api.example.com/run';
  const nodeTitle = data?.name || 'Remote Agent';
  const host = data?.hostingProvider || 'AWS';

  // Listen for execution state updates
  useEffect(() => {
    const handleExecState = (e) => {
      if (e.detail?.nodeId === id) {
        if (e.detail.isExecuting) {
          setIsRunning(true);
          setRunStatus('running');
        } else {
          setIsRunning(false);
          setRunStatus('completed');
        }
      }
    };

    const handleRemoteExecuting = (e) => {
      if (e.detail?.nodeId === id) {
        setIsRunning(true);
        setRunStatus('running');
      }
    };

    const handleRemoteExecuted = (e) => {
      if (e.detail?.nodeId === id) {
        setIsRunning(false);
        setRunStatus(e.detail.success ? 'completed' : 'error');
        if (e.detail.latencyMs != null) setLatencyMs(e.detail.latencyMs);
        if (e.detail.error) setStatusMessage(e.detail.error);
      }
    };

    window.addEventListener('keaos:set-execution-state', handleExecState);
    window.addEventListener('keaos:remote-agent-executing', handleRemoteExecuting);
    window.addEventListener('keaos:remote-agent-executed', handleRemoteExecuted);

    return () => {
      window.removeEventListener('keaos:set-execution-state', handleExecState);
      window.removeEventListener('keaos:remote-agent-executing', handleRemoteExecuting);
      window.removeEventListener('keaos:remote-agent-executed', handleRemoteExecuted);
    };
  }, [id]);

  // Clean domain display helper
  const cleanDomain = () => {
    try {
      if (endpointUrl.startsWith('http')) {
        const u = new URL(endpointUrl);
        return `${u.hostname}${u.pathname !== '/' ? u.pathname : ''}`;
      }
    } catch {
      // Fallback
    }
    return endpointUrl.replace(/https?:\/\//, '').slice(0, 24);
  };

  const getFrameworkBadgeColor = () => {
    switch (framework.toLowerCase()) {
      case 'langgraph':
        return 'bg-[#00A3A6]/15 text-[#00A3A6] border-[#00A3A6]/30';
      case 'crewai':
        return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'google-adk':
      case 'google adk':
        return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
      case 'fastapi':
        return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
    }
  };

  return (
    <div
      className={`relative group transition-all duration-200 select-none ${
        isDeactivated ? 'opacity-40 grayscale pointer-events-none' : ''
      }`}
      style={{ width: '280px' }}
    >
      {/* Node Action Toolbar for Hover / Quick Controls */}
      <NodeActionToolbar
        id={id}
        data={data}
        selected={selected}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
        pillarType="remote_agent"
      />

      {/* Main Structural Card */}
      <div
        className={`border transition-all duration-200 ${
          isDarkMode
            ? 'bg-[#0D111C] border-[#1E293B] text-slate-100 shadow-xl'
            : 'bg-white border-slate-300 text-slate-900 shadow-md'
        } ${selected ? 'ring-2 ring-[#00A3A6] border-transparent shadow-lg' : ''} ${
          isRunning ? 'ring-2 ring-[#00A3A6] shadow-[#00A3A6]/20 shadow-lg' : ''
        }`}
        style={{
          borderTop: '3px solid #00A3A6',
          borderRadius: 0
        }}
      >
        {/* Node Header */}
        <div
          className={`p-2.5 flex items-center justify-between border-b ${
            isDarkMode ? 'border-[#1E293B] bg-[#111827]/70' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-sm bg-[#00A3A6]/15 border border-[#00A3A6]/30 text-[#00A3A6] flex items-center justify-center shrink-0">
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs truncate tracking-tight">
                  {nodeTitle}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {cleanDomain()}
              </p>
            </div>
          </div>

          {/* Framework Badge */}
          <span
            className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${getFrameworkBadgeColor()}`}
          >
            {framework}
          </span>
        </div>

        {/* Node Body & Telemetry Highlights */}
        <div className="p-2.5 space-y-2">
          {/* Host & Protocol Details */}
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Server className="w-3 h-3 text-slate-400" />
              <span>Host:</span>
              <span className="font-semibold text-slate-300 uppercase">{host}</span>
            </span>

            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-[#00A3A6]" />
              <span>OTel 2.0</span>
            </span>
          </div>

          {/* Latency & Status Row */}
          <div
            className={`p-2 border rounded-sm flex items-center justify-between text-[11px] font-mono ${
              isDarkMode ? 'bg-[#090D16] border-[#1E293B]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? 'bg-amber-400 animate-pulse'
                    : runStatus === 'completed'
                    ? 'bg-emerald-500'
                    : runStatus === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-500'
                }`}
              />
              <span className="uppercase text-[10px] font-semibold text-slate-300">
                {isRunning ? 'EXECUTING' : runStatus}
              </span>
            </div>

            <div className="text-[10px] text-slate-400">
              {latencyMs != null ? `${latencyMs}ms` : 'Ready'}
            </div>
          </div>

          {/* Error Message Snippet (if any) */}
          {statusMessage && runStatus === 'error' && (
            <div className="p-1.5 bg-red-500/10 border border-red-500/30 rounded-sm text-[10px] text-red-400 flex items-start gap-1 font-mono">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="truncate">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Input Handle (Left Socket) */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-2.5 !h-2.5 !bg-[#00A3A6] !border-2 !border-white dark:!border-[#0D111C] hover:!scale-125 transition-transform"
          title="Data Inflow (Input Context from Upstream Nodes)"
        />

        {/* Output Handle (Right Socket) */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-2.5 !h-2.5 !bg-[#00A3A6] !border-2 !border-white dark:!border-[#0D111C] hover:!scale-125 transition-transform"
          title="Data Outflow (Remote Service Result to Downstream Nodes)"
        />

        {/* Auxiliary Handle (Top Socket: Optional Policy / Guardrail) */}
        <Handle
          type="target"
          position={Position.Top}
          id="policy-in"
          className="!w-2.5 !h-2.5 !bg-[#6D2077] !border-2 !border-white dark:!border-[#0D111C] hover:!scale-125 transition-transform"
          title="Security & Guardrails Policy Socket"
        />
      </div>
    </div>
  );
}
