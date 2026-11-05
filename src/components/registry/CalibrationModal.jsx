import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  CheckCircle2, 
  RotateCcw, 
  Sliders, 
  Play, 
  Loader2, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { recommissionComponent, runCalibrationProbe } from '../../services/componentRegistryService';

export default function CalibrationModal({
  isOpen,
  onClose,
  component,
  onComponentRecommissioned,
  isDarkMode = true
}) {
  const [editedConfig, setEditedConfig] = useState(component?.config || {});
  const [editedPrompt, setEditedPrompt] = useState(component?.prompt || '');
  const [probeStatus, setProbeStatus] = useState(null); // null | 'running' | 'success' | 'error'
  const [probeResult, setProbeResult] = useState(null);

  if (!isOpen || !component) return null;

  const handleRunProbe = async () => {
    setProbeStatus('running');
    setProbeResult(null);
    try {
      const res = await runCalibrationProbe(component);
      setProbeStatus(res.success ? 'success' : 'error');
      setProbeResult(res);
    } catch (err) {
      setProbeStatus('error');
      setProbeResult({ success: false, message: err.message || 'Calibration probe failed' });
    }
  };

  const handleRecommission = () => {
    recommissionComponent(component.id, {
      ...editedConfig,
      prompt: editedPrompt || component.prompt
    });
    if (onComponentRecommissioned) {
      onComponentRecommissioned(component.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDarkMode ? 'bg-[#0F131D] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-[#1E293B] bg-[#0A0D14]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-400 block">
                LIFECYCLE RESET & CALIBRATION
              </span>
              <h3 className="text-sm font-bold truncate">
                Calibrate {component.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Component Summary Card */}
          <div className={`p-3.5 rounded-xl border space-y-1.5 ${
            isDarkMode ? 'bg-[#151B28] border-[#222E42]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0091DA]">
                {component.name}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                DECOMMISSIONED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {component.description || 'Enterprise component under governance evaluation.'}
            </p>
          </div>

          {/* Persona Prompt (if applicable) */}
          {component.prompt !== undefined && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                Calibrate System Prompt & Instructions
              </label>
              <textarea
                rows={3}
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className={`w-full p-2.5 text-xs rounded-xl border outline-none font-sans leading-relaxed ${
                  isDarkMode ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
                }`}
                placeholder="Adjust system instructions for this specialized agent..."
              />
            </div>
          )}

          {/* Test Probe Section */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 ${
            isDarkMode ? 'bg-[#111723] border-[#233147]' : 'bg-emerald-50/40 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">
                  Automated Calibration Probe
                </span>
              </div>
              <button
                type="button"
                onClick={handleRunProbe}
                disabled={probeStatus === 'running'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {probeStatus === 'running' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run Health Probe</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Verify schema compliance, API responsiveness, and zero-leak guardrails before returning this component to the active studio inventory.
            </p>

            {probeResult && (
              <div className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150 ${
                probeResult.success 
                  ? (isDarkMode ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800')
                  : (isDarkMode ? 'bg-rose-950/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800')
              }`}>
                {probeResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">STATUS: {probeResult.success ? 'PASSED' : 'FAILED'}</span>
                    {probeResult.latencyMs && (
                      <span className="text-[10px] opacity-70">({probeResult.latencyMs}ms)</span>
                    )}
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {probeResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDarkMode ? 'border-[#1E293B] bg-[#0A0D14]' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleRecommission}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Recommission Component</span>
          </button>
        </div>
      </div>
    </div>
  );
}

