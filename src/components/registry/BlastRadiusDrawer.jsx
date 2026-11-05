import React, { useState, useMemo } from 'react';
import { 
  X, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink, 
  RefreshCw, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Activity,
  GitBranch
} from 'lucide-react';
import { 
  calculateBlastRadius, 
  remapComponentAcrossWorkflows,
  decommissionComponent,
  decommissionProvider
} from '../../services/componentRegistryService';

export default function BlastRadiusDrawer({
  isOpen,
  onClose,
  targetItem,
  providerId = null,
  category = null,
  activeReplacements = [],
  onComponentDecommissioned,
  onOpenCalibration,
  onNavigateToWorkflow,
  isDarkMode = true
}) {
  const [selectedReplacementId, setSelectedReplacementId] = useState('');
  const [remapSuccessMessage, setRemapSuccessMessage] = useState(null);
  const [isRemapping, setIsRemapping] = useState(false);

  // Calculate real-time blast radius
  const blastData = useMemo(() => {
    if (!targetItem && !providerId) {
      return { affectedWorkflows: [], totalWorkflowCount: 0, totalNodeCount: 0, riskLevel: 'LOW' };
    }
    return calculateBlastRadius(targetItem?.id || targetItem?.name, providerId, category);
  }, [targetItem, providerId, category]);

  if (!isOpen) return null;

  const itemName = targetItem?.name || providerId?.toUpperCase() || 'Component';
  const isProvider = Boolean(providerId);

  const riskBadgeStyles = {
    CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    MEDIUM: 'bg-blue-500/10 text-sky-400 border-blue-500/30',
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  };

  const handleExecuteRemap = () => {
    if (!selectedReplacementId) return;
    const replacement = activeReplacements.find(r => r.id === selectedReplacementId || r.modelId === selectedReplacementId);
    if (!replacement) return;

    setIsRemapping(true);
    const result = remapComponentAcrossWorkflows(targetItem, replacement);
    setIsRemapping(false);
    setRemapSuccessMessage(`Successfully remapped ${result.updatedNodes} node(s) across ${result.updatedWorkflows} workflow(s) to '${replacement.name}'.`);
  };

  const handleConfirmDecommission = () => {
    if (isProvider) {
      decommissionProvider(providerId);
    } else if (targetItem?.id) {
      decommissionComponent(targetItem.id);
    }
    if (onComponentDecommissioned) {
      onComponentDecommissioned(targetItem?.id || providerId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-lg h-full border-l flex flex-col justify-between shadow-2xl transition-all ${
          isDarkMode ? 'bg-[#0F131D] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Drawer Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-[#1E293B] bg-[#0A0D14]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block">
                BLAST RADIUS & DEPENDENCY ASSESSMENT
              </span>
              <h3 className="text-sm font-bold truncate">
                {itemName}
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

        {/* Drawer Body */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Risk Level Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${riskBadgeStyles[blastData.riskLevel]}`}>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <span className="text-xs font-bold tracking-tight uppercase block font-mono">
                  {blastData.riskLevel} IMPACT RISK
                </span>
                <span className="text-[11px] opacity-80 block leading-tight mt-0.5">
                  {blastData.totalWorkflowCount === 0 
                    ? 'Zero active workflows rely on this component. Safe to decommission.'
                    : `Decommissioning will degrade ${blastData.totalWorkflowCount} workflow(s) using ${blastData.totalNodeCount} node(s).`}
                </span>
              </div>
            </div>
          </div>

          {/* Impact Metric Chips */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border text-center ${
              isDarkMode ? 'bg-[#151B28] border-[#222E42]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                AFFECTED WORKFLOWS
              </span>
              <span className="text-2xl font-bold font-mono text-[#0091DA]">
                {blastData.totalWorkflowCount}
              </span>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              isDarkMode ? 'bg-[#151B28] border-[#222E42]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                IMPACTED GRAPH NODES
              </span>
              <span className="text-2xl font-bold font-mono text-rose-400">
                {blastData.totalNodeCount}
              </span>
            </div>
          </div>

          {/* Interactive Batch Remap Assistant */}
          {blastData.totalWorkflowCount > 0 && activeReplacements.length > 0 && (
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDarkMode ? 'bg-[#111723] border-[#233147]' : 'bg-blue-50/50 border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-[#0091DA]" />
                <span className="text-xs font-bold tracking-tight">
                  Interactive Batch Remap Assistant
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Seamlessly migrate all dependent nodes across these {blastData.totalWorkflowCount} workflows to an active component before or after decommissioning:
              </p>

              <div className="flex items-center gap-2 pt-1">
                <select
                  value={selectedReplacementId}
                  onChange={(e) => setSelectedReplacementId(e.target.value)}
                  className={`flex-1 px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium ${
                    isDarkMode ? 'bg-[#182133] border-[#2B3B55] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">Select active replacement...</option>
                  {activeReplacements.map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} {rep.provider ? `(${rep.provider})` : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedReplacementId || isRemapping}
                  onClick={handleExecuteRemap}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00338D] hover:bg-[#005EB8] text-white disabled:opacity-40 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  {isRemapping ? 'Remapping...' : 'Batch Remap'}
                </button>
              </div>

              {remapSuccessMessage && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pt-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{remapSuccessMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* List of Affected Workflows */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block px-1">
              DEPENDENT WORKFLOWS ({blastData.totalWorkflowCount})
            </span>

            {blastData.totalWorkflowCount === 0 ? (
              <div className={`p-4 rounded-xl border text-center text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#111723] border-[#1E293B]' : 'bg-slate-50 border-slate-200'
              }`}>
                No active workflows depend on this component.
              </div>
            ) : (
              <div className="space-y-2">
                {blastData.affectedWorkflows.map(wf => (
                  <div
                    key={wf.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isDarkMode ? 'bg-[#121824] border-[#1F2C3F]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <h4 className="text-xs font-bold truncate">
                          {wf.name}
                        </h4>
                      </div>
                      {onNavigateToWorkflow && (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToWorkflow(wf.id);
                            onClose();
                          }}
                          className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-mono transition-colors cursor-pointer"
                        >
                          <span>Open Canvas</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {wf.nodes.map(n => (
                        <span
                          key={n.id}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isDarkMode 
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          Node: {n.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
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
            Close
          </button>

          <button
            type="button"
            onClick={handleConfirmDecommission}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Confirm Decommission
          </button>
        </div>
      </div>
    </div>
  );
}

