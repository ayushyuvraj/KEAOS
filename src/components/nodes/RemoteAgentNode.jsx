import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Globe,
  Server,
  Loader2,
  AlertCircle,
  Activity,
  Shield
} from 'lucide-react';
import NodeActionToolbar from '../common/NodeActionToolbar';

// Strict 5-Color Palette from the Brand Pentagon
// 1. Royal Navy:   #00338D
// 2. Electric Blue: #1E49E2
// 3. Vivid Cyan:    #00B8F5
// 4. Vibrant Magenta: #FD349C
// 5. Electric Violet: #7213EA

export default function RemoteAgentNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  const isLocked = Boolean(data?.isLocked);

  const [isRunning, setIsRunning] = useState(Boolean(data?.isRunning));
  const [runStatus, setRunStatus] = useState(data?.lastStatus || 'idle');
  const [latencyMs, setLatencyMs] = useState(data?.lastLatencyMs || null);
  const [statusMessage, setStatusMessage] = useState(data?.lastError || '');

  const framework = data?.framework || 'fastapi';
  const endpointUrl = data?.endpointUrl || 'http://127.0.0.1:8000/run';
  const nodeTitle = data?.name || 'Universal External Agent';
  const host = data?.hostingProvider || 'Localhost';

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

    const handleCancelExecution = () => {
      setIsRunning(false);
      setRunStatus((prev) => (prev === 'running' ? 'idle' : prev));
    };

    window.addEventListener('keaos:set-execution-state', handleExecState);
    window.addEventListener('keaos:remote-agent-executing', handleRemoteExecuting);
    window.addEventListener('keaos:remote-agent-executed', handleRemoteExecuted);
    window.addEventListener('keaos:cancel-execution', handleCancelExecution);

    return () => {
      window.removeEventListener('keaos:set-execution-state', handleExecState);
      window.removeEventListener('keaos:remote-agent-executing', handleRemoteExecuting);
      window.removeEventListener('keaos:remote-agent-executed', handleRemoteExecuted);
      window.removeEventListener('keaos:cancel-execution', handleCancelExecution);
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

  // Framework pills mapped strictly to the 5-color pentagon palette
  const getFrameworkBadge = () => {
    switch (framework.toLowerCase()) {
      case 'fastapi':
        return {
          label: 'FastAPI',
          classes: isDarkMode
            ? 'bg-[#00B8F5]/15 text-[#00B8F5] border-[#00B8F5]/35 shadow-[0_2px_8px_rgba(0,184,245,0.2)]'
            : 'bg-[#00B8F5]/10 text-[#00338D] border-[#00B8F5]/30'
        };
      case 'langgraph':
        return {
          label: 'LangGraph',
          classes: isDarkMode
            ? 'bg-[#1E49E2]/20 text-[#1E49E2] border-[#1E49E2]/40 shadow-[0_2px_8px_rgba(30,73,226,0.2)]'
            : 'bg-blue-50 text-[#1E49E2] border-[#1E49E2]/30'
        };
      case 'crewai':
        return {
          label: 'CrewAI',
          classes: isDarkMode
            ? 'bg-[#FD349C]/15 text-[#FD349C] border-[#FD349C]/35 shadow-[0_2px_8px_rgba(253,52,156,0.2)]'
            : 'bg-pink-50 text-[#FD349C] border-[#FD349C]/30'
        };
      case 'google-adk':
      case 'google adk':
        return {
          label: 'Google ADK',
          classes: isDarkMode
            ? 'bg-[#00338D]/30 text-[#00B8F5] border-[#00B8F5]/35 shadow-[0_2px_8px_rgba(0,51,141,0.2)]'
            : 'bg-blue-50 text-[#00338D] border-[#00338D]/30'
        };
      default:
        return {
          label: framework,
          classes: isDarkMode
            ? 'bg-[#7213EA]/20 text-purple-300 border-[#7213EA]/40 shadow-xs'
            : 'bg-purple-50 text-[#7213EA] border-[#7213EA]/30'
        };
    }
  };

  const frameworkBadge = getFrameworkBadge();

  return (
    <div
      className={`relative group transition-all duration-300 select-none ${isDeactivated ? 'opacity-40 grayscale pointer-events-none' : ''
        }`}
      style={{ width: '228px' }}
    >
      {/* Node Action Toolbar for Hover / Quick Controls */}
      <NodeActionToolbar
        id={id}
        data={data}
        selected={selected}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
        pillarType="remote_agent"
        mode="card-top"
      />

      {/* Main Soft-Modern Frosted Card */}
      <div
        className={`relative transition-all duration-300 rounded-2xl p-2.5 backdrop-blur-xl border ${isDarkMode
            ? 'bg-[#080E1C]/92 border-white/[0.09] text-slate-100 shadow-[0_20px_45px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]'
            : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-[0_16px_36px_rgba(0,51,141,0.08),0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)]'
          } ${selected
            ? 'ring-2 ring-[#00B8F5] shadow-[0_0_26px_rgba(0,184,245,0.4)]'
            : 'hover:shadow-[0_20px_40px_rgba(0,51,141,0.14)]'
          } ${isRunning
            ? 'ring-2 ring-[#00B8F5] shadow-[0_0_28px_rgba(0,184,245,0.5)] animate-pulse'
            : ''
          }`}
      >
        {/* Top Header Row: Floating Squircle Icon + Titles + Framework Pill */}
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Soft-Clay Squircle Icon Badge using Pentagon Blues & Cyans */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 ${isDarkMode
                  ? 'bg-gradient-to-br from-[#00B8F5]/25 via-[#1E49E2]/20 to-[#00338D]/30 text-[#00B8F5] border-[#00B8F5]/40 shadow-[0_4px_14px_rgba(0,184,245,0.3)]'
                  : 'bg-gradient-to-br from-[#00B8F5]/15 via-[#1E49E2]/10 to-[#00338D]/10 text-[#1E49E2] border-[#00B8F5]/35 shadow-[0_4px_12px_rgba(0,184,245,0.18)]'
                }`}
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00B8F5]" />
              ) : (
                <Globe className="w-3.5 h-3.5 stroke-[2.2]" />
              )}
            </div>

            {/* Title & Endpoint Micro-Pill */}
            <div className="min-w-0">
              <h3 className={`font-bold text-[11px] truncate tracking-tight ${isDarkMode ? 'text-white' : 'text-[#001E50]'
                }`}>
                {nodeTitle}
              </h3>
              <div className="mt-0.5">
                <span className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded-full border truncate max-w-[100px] ${isDarkMode
                    ? 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                    : 'bg-[#00338D]/5 border-[#00338D]/15 text-[#00338D]'
                  }`}>
                  {cleanDomain()}
                </span>
              </div>
            </div>
          </div>

          {/* Framework Pill Badge */}
          <span
            className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 transition-colors ${frameworkBadge.classes}`}
          >
            {frameworkBadge.label}
          </span>
        </div>

        {/* Middle Telemetry & Host Ribbon */}
        <div
          className={`px-2 py-1 rounded-xl flex items-center justify-between text-[9px] font-mono mb-2 transition-colors border ${isDarkMode
              ? 'bg-white/[0.03] border-white/[0.06] text-slate-300'
              : 'bg-[#00338D]/[0.03] border-[#00338D]/10 text-slate-700'
            }`}
        >
          <span className="flex items-center gap-1 truncate max-w-[105px]">
            <Server className={`w-2.5 h-2.5 shrink-0 ${isDarkMode ? 'text-[#00B8F5]' : 'text-[#1E49E2]'}`} />
            <span className="opacity-70 text-[8.5px]">Host:</span>
            <span className={`font-semibold uppercase truncate text-[8.5px] ${isDarkMode ? 'text-white' : 'text-[#001E50]'}`}>
              {host}
            </span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {(data?.enforceOnInput !== false || data?.enforceOnOutput !== false) && (
              <span 
                className="flex items-center gap-0.5 text-[8px] text-[#FD349C] font-semibold" 
                title="Bidirectional Guardrail Protection Active"
              >
                <Shield className="w-2 h-2 stroke-[2.5]" />
                <span>GUARD</span>
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              <Activity className="w-2.5 h-2.5 text-[#00B8F5]" />
              <span className="font-semibold text-[8px] text-[#00B8F5]">OTel</span>
            </span>
          </div>
        </div>

        {/* Bottom Recessed Telemetry & Status Tray */}
        <div
          className={`p-1.5 rounded-xl flex items-center justify-between text-[10px] font-mono transition-colors border ${isDarkMode
              ? 'bg-[#040813]/90 border-white/[0.06] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
              : 'bg-slate-100/80 border-slate-200/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)]'
            }`}
        >
          {/* Status Indicator Dot & Label (Mapped strictly to 5-color palette: Cyan, Magenta, Slate) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning
                  ? 'bg-[#00B8F5] animate-pulse shadow-[0_0_8px_rgba(0,184,245,0.7)]'
                  : runStatus === 'completed'
                    ? 'bg-[#00B8F5] shadow-[0_0_8px_rgba(0,184,245,0.6)]'
                    : runStatus === 'error'
                      ? 'bg-[#FD349C] shadow-[0_0_8px_rgba(253,52,156,0.6)]'
                      : 'bg-slate-400'
                }`}
            />
            <span className={`uppercase text-[9px] font-bold tracking-wider truncate ${isRunning
                ? 'text-[#00B8F5]'
                : runStatus === 'completed'
                  ? (isDarkMode ? 'text-[#00B8F5]' : 'text-[#1E49E2]')
                  : runStatus === 'error'
                    ? 'text-[#FD349C]'
                    : (isDarkMode ? 'text-slate-400' : 'text-slate-600')
              }`}>
              {isRunning ? 'RUN' : runStatus}
            </span>
          </div>

          {/* Latency & Multi-Stage Telemetry Pill */}
          {data?.lastTokens > 0 ? (
            <div 
              className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 flex items-center gap-1 ${
                isDarkMode 
                  ? 'bg-[#00B8F5]/15 border-[#00B8F5]/35 text-[#00B8F5]' 
                  : 'bg-[#00338D]/10 border-[#00338D]/20 text-[#00338D]'
              }`}
              title={`${data.lastModelId || 'LLM'}: ${data.lastTokens.toLocaleString()} tokens ($${Number(data.lastCostUsd || 0).toFixed(4)})`}
            >
              <span>{data.lastTokens >= 1000 ? `${(data.lastTokens / 1000).toFixed(1)}k` : `${data.lastTokens}`}</span>
              <span className="opacity-40">•</span>
              <span className="text-amber-400">${Number(data.lastCostUsd || 0).toFixed(4)}</span>
            </div>
          ) : (
            <div className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${latencyMs != null
                ? (isDarkMode
                  ? 'bg-[#00B8F5]/15 border-[#00B8F5]/35 text-[#00B8F5]'
                  : 'bg-[#00338D]/10 border-[#00338D]/20 text-[#00338D]')
                : (isDarkMode
                  ? 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                  : 'bg-white border-slate-200 text-slate-500')
              }`}>
              {latencyMs != null ? `${latencyMs}ms` : 'Ready'}
            </div>
          )}
        </div>

        {/* Error Message Snippet (using Magenta #FD349C instead of red) */}
        {statusMessage && runStatus === 'error' && (
          <div className="mt-1.5 p-1.5 bg-[#FD349C]/10 border border-[#FD349C]/30 rounded-xl text-[9px] text-[#FD349C] flex items-start gap-1 font-mono">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-[#FD349C]" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {/* Input Handle (Left Socket - Inflow: Vivid Cyan #00B8F5) */}
        <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
          <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-[#00B8F5] bg-[#00B8F5]/15 px-1.5 py-0.2 rounded-full border border-[#00B8F5]/35 shadow-xs">
            IN
          </span>
        </div>
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-3 !h-3 !bg-[#00B8F5] !border-2 !border-white dark:!border-[#080E1C] !rounded-full shadow-[0_2px_8px_rgba(0,184,245,0.5)] hover:!scale-125 transition-transform cursor-crosshair"
          title="Data & Tool Inflow (IN)"
        />

        {/* Output Handle (Right Socket - Outflow: Vivid Cyan #00B8F5) */}
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10">
          <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-[#00B8F5] bg-[#00B8F5]/15 px-1.5 py-0.2 rounded-full border border-[#00B8F5]/35 shadow-xs">
            OUT
          </span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-3 !h-3 !bg-[#00B8F5] !border-2 !border-white dark:!border-[#080E1C] !rounded-full shadow-[0_2px_8px_rgba(0,184,245,0.5)] hover:!scale-125 transition-transform cursor-crosshair"
          title="Data Outflow (OUT)"
        />

        {/* Guardrail Policy Handle (Bottom Socket - Governance & Policy: Vibrant Magenta #FD349C) */}
        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 flex items-center pointer-events-none z-10">
          <span className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-[#FD349C] bg-[#FD349C]/15 px-1.5 py-0.2 rounded-full border border-[#FD349C]/35 shadow-xs">
            GUARD
          </span>
        </div>
        <Handle
          type="target"
          position={Position.Bottom}
          id="policy-in"
          className="!w-3 !h-3 !bg-[#FD349C] !border-2 !border-white dark:!border-[#080E1C] !rounded-full shadow-[0_2px_8px_rgba(253,52,156,0.5)] hover:!scale-125 transition-transform cursor-crosshair"
          title="Security & Guardrails Policy Socket (GUARD)"
        />
      </div>
    </div>
  );
}
