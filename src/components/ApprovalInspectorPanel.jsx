import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Sparkles, 
  Edit3, 
  RotateCcw, 
  Clock, 
  Settings2,
  FileCode2,
  MessageSquare
} from 'lucide-react';
import { simulateDecision } from '../services/approvalEngine';

const COMMON_ROLES = [
  'Compliance Officer',
  'Finance Director',
  'Security Lead',
  'Legal Counsel',
  'Operations Manager',
  'Executive Reviewer'
];

export default function ApprovalInspectorPanel({
  selectedNode,
  onUpdateNodeData,
  isDarkMode = true,
  t
}) {
  const nodeData = selectedNode?.data || {};

  const reviewerRole = nodeData.reviewerRole ?? 'Compliance Officer';
  const instructions = nodeData.instructions ?? 'Verify that payload meets compliance and audit criteria before releasing downstream.';
  const requireReasonOnReject = nodeData.requireReasonOnReject ?? true;
  const allowDirectEdit = nodeData.allowDirectEdit ?? true;
  const allowSteeringLoop = nodeData.allowSteeringLoop ?? true;
  const timeoutPolicy = nodeData.timeoutPolicy ?? 'manual';

  // Simulator State
  const [simMode, setSimMode] = useState('standard'); // 'standard' | 'edit' | 'steer'
  const upstreamPayload = node?.data?.pendingPayload || node?.data?.upstreamPayload;
  const [samplePayloadText, setSamplePayloadText] = useState(() => {
    return upstreamPayload ? JSON.stringify(upstreamPayload, null, 2) : '{\n  "action": "execute",\n  "status": "pending_approval"\n}';
  });
  const [modifiedPayloadText, setModifiedPayloadText] = useState(() => {
    return upstreamPayload ? JSON.stringify(upstreamPayload, null, 2) : '{\n  "action": "execute",\n  "status": "pending_approval"\n}';
  });
  const [steeringFeedbackText, setSteeringFeedbackText] = useState(
    'Please refine output based on policy specifications.'
  );
  const [simulationResult, setSimulationResult] = useState(null);

  const handleFieldChange = (field, value) => {
    onUpdateNodeData(selectedNode.id, { [field]: value });
  };

  const handleSimulate = (decision) => {
    const res = simulateDecision(decision, {
      reviewerRole,
      instructions,
      payloadText: samplePayloadText,
      modifiedPayloadText,
      feedbackText: steeringFeedbackText
    });
    setSimulationResult(res);
  };

  return (
    <div className="space-y-4">
      {/* 1. Reviewer Assignment & Role */}
      <div className={`p-4 ${t.card} rounded-2xl space-y-3.5`}>
        <div className="flex items-center justify-between">
          <label className={`text-xs font-semibold uppercase tracking-wider ${t.label} block font-mono flex items-center gap-1.5`}>
            <span>Reviewer Assignment</span>
          </label>
          <span className="text-[9px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            0 TOKENS
          </span>
        </div>

        {/* Designated Role Selector */}
        <div className="space-y-1">
          <span className={`text-[10px] font-mono ${t.subText} uppercase`}>Designated Role</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={reviewerRole}
              onChange={(e) => handleFieldChange('reviewerRole', e.target.value)}
              placeholder="e.g. Compliance Officer"
              className={`flex-1 px-3 py-2 text-xs font-mono rounded-xl transition-all ${t.input}`}
            />
            <select
              value={COMMON_ROLES.includes(reviewerRole) ? reviewerRole : ''}
              onChange={(e) => {
                if (e.target.value) handleFieldChange('reviewerRole', e.target.value);
              }}
              className={`w-32 px-2 py-2 text-xs font-mono rounded-xl transition-all ${t.input}`}
            >
              <option value="">Presets...</option>
              {COMMON_ROLES.map((role) => (
                <option key={role} value={role} className="bg-slate-900 text-white">
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Review Instructions */}
        <div className="space-y-1">
          <span className={`text-[10px] font-mono ${t.subText} uppercase`}>Sign-Off Instructions</span>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => handleFieldChange('instructions', e.target.value)}
            placeholder="Instructions shown to the human reviewer..."
            className={`w-full p-2.5 text-xs font-sans rounded-xl transition-all ${t.input} resize-none`}
          />
        </div>
      </div>

      {/* 2. Governance Controls & 3rd-Option Capabilities */}
      <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
        <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} block font-mono`}>
          Governance & Action Controls
        </span>

        {/* Allow Direct Human Override (Flavor A) */}
        <label className={`p-3 ${t.subCard} rounded-xl border flex items-center justify-between cursor-pointer transition-colors`}>
          <div className="pr-3">
            <div className="flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
              <span className={`text-xs font-bold ${t.title}`}>Allow Direct Human Override</span>
            </div>
            <span className={`text-[10px] ${t.subText} block mt-0.5`}>
              Reviewer can edit payload directly (0 tokens) and proceed downstream without re-prompting.
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowDirectEdit}
            onChange={(e) => handleFieldChange('allowDirectEdit', e.target.checked)}
            className="w-4 h-4 rounded text-[#EAAA00] focus:ring-[#EAAA00] cursor-pointer"
          />
        </label>

        {/* Allow Agent Steering Feedback Loop (Flavor B) */}
        <label className={`p-3 ${t.subCard} rounded-xl border flex items-center justify-between cursor-pointer transition-colors`}>
          <div className="pr-3">
            <div className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
              <span className={`text-xs font-bold ${t.title}`}>Allow Agent Steering Feedback Loop</span>
            </div>
            <span className={`text-[10px] ${t.subText} block mt-0.5`}>
              Reviewer can provide instructions to loop back and re-prompt the upstream agent.
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowSteeringLoop}
            onChange={(e) => handleFieldChange('allowSteeringLoop', e.target.checked)}
            className="w-4 h-4 rounded text-[#EAAA00] focus:ring-[#EAAA00] cursor-pointer"
          />
        </label>

        {/* Require Reason Toggle */}
        <label className={`p-3 ${t.subCard} rounded-xl border flex items-center justify-between cursor-pointer transition-colors`}>
          <div className="pr-3">
            <span className={`text-xs font-bold ${t.title} block`}>Require Rejection Note</span>
            <span className={`text-[10px] ${t.subText} block mt-0.5`}>
              Reviewer must enter an audit rationale if declining the action.
            </span>
          </div>
          <input
            type="checkbox"
            checked={requireReasonOnReject}
            onChange={(e) => handleFieldChange('requireReasonOnReject', e.target.checked)}
            className="w-4 h-4 rounded text-[#EAAA00] focus:ring-[#EAAA00] cursor-pointer"
          />
        </label>

        {/* Timeout Escalation */}
        <div className="space-y-1 pt-1">
          <span className={`text-[10px] font-mono ${t.subText} uppercase flex items-center gap-1`}>
            <Clock className="w-3 h-3 text-[#EAAA00]" />
            <span>Timeout Action</span>
          </span>
          <select
            value={timeoutPolicy}
            onChange={(e) => handleFieldChange('timeoutPolicy', e.target.value)}
            className={`w-full px-3 py-2 text-xs font-mono rounded-xl transition-all ${t.input}`}
          >
            <option value="manual" className="bg-slate-900 text-white">Hold indefinitely until reviewed</option>
            <option value="auto_reject_24h" className="bg-slate-900 text-white">Auto-Reject after 24 Hours</option>
            <option value="auto_reject_48h" className="bg-slate-900 text-white">Auto-Reject after 48 Hours</option>
            <option value="escalate_manager" className="bg-slate-900 text-white">Escalate to Senior Partner after 24 Hours</option>
          </select>
        </div>
      </div>

      {/* 3. Interactive Decision & Steering Simulator */}
      <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#EAAA00]" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-mono`}>
              Decision & Steer Simulator
            </span>
          </div>
          <span className="text-[9px] font-mono text-slate-400">
            Multi-action test
          </span>
        </div>

        {/* Simulator Mode Tabs */}
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl text-[10px] font-mono">
          <button
            type="button"
            onClick={() => setSimMode('standard')}
            className={`flex-1 py-1 px-2 rounded-lg transition-all text-center cursor-pointer ${
              simMode === 'standard' 
                ? 'bg-[#EAAA00] text-black font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign-Off (Yes/No)
          </button>
          <button
            type="button"
            onClick={() => setSimMode('edit')}
            className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              simMode === 'edit' 
                ? 'bg-emerald-600 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-2.5 h-2.5" />
            <span>Direct Edit</span>
          </button>
          <button
            type="button"
            onClick={() => setSimMode('steer')}
            className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
              simMode === 'steer' 
                ? 'bg-blue-600 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Steer Agent</span>
          </button>
        </div>

        {/* Mode 1: Standard Yes/No */}
        {simMode === 'standard' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Proposed Upstream Payload</span>
              <span>Reviewer: {reviewerRole}</span>
            </div>
            <textarea
              rows={3}
              value={samplePayloadText}
              onChange={(e) => setSamplePayloadText(e.target.value)}
              className={`w-full p-2.5 text-[11px] font-mono rounded-xl transition-all ${t.input} resize-none leading-relaxed`}
              placeholder='{"action": "sample"}'
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleSimulate('approved')}
                className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simulate Approve</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulate('rejected')}
                className="py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                <span>Simulate Reject</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Direct Edit & Override (Flavor A) */}
        {simMode === 'edit' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
              <span>Direct Human Override (0 Tokens)</span>
              <span>Proceeds to Approved</span>
            </div>
            <textarea
              rows={4}
              value={modifiedPayloadText}
              onChange={(e) => setModifiedPayloadText(e.target.value)}
              className={`w-full p-2.5 text-[11px] font-mono rounded-xl transition-all ${t.input} border-emerald-500/40 resize-none leading-relaxed`}
              placeholder="Edit payload directly..."
            />
            <button
              type="button"
              onClick={() => handleSimulate('edit_and_approve')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simulate Edit & Approve (0 Tokens)</span>
            </button>
          </div>
        )}

        {/* Mode 3: Steer Agent Feedback Loop (Flavor B) */}
        {simMode === 'steer' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-blue-400">
              <span>Human Guidance Feedback</span>
              <span>Loops Back to Agent</span>
            </div>
            <textarea
              rows={3}
              value={steeringFeedbackText}
              onChange={(e) => setSteeringFeedbackText(e.target.value)}
              placeholder="Instructions to send back to upstream agent..."
              className={`w-full p-2.5 text-xs font-sans rounded-xl transition-all ${t.input} border-blue-500/40 resize-none leading-relaxed`}
            />
            <button
              type="button"
              onClick={() => handleSimulate('steer_and_refine')}
              disabled={!steeringFeedbackText.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Simulate Send Feedback & Refine</span>
            </button>
          </div>
        )}

        {/* Simulator Results Output */}
        {simulationResult && (
          <div className={`p-3 rounded-xl border text-xs font-mono transition-all animate-in fade-in duration-150 ${
            simulationResult.branch === 'approved-out'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : simulationResult.branch === 'refine-loop'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                {simulationResult.branch === 'approved-out' ? (
                  <Check className="w-4 h-4 shrink-0" />
                ) : simulationResult.branch === 'refine-loop' ? (
                  <RotateCcw className="w-4 h-4 shrink-0" />
                ) : (
                  <X className="w-4 h-4 shrink-0" />
                )}
                <span>Directs to: [{simulationResult.branch.toUpperCase()}]</span>
              </span>
              <span className="text-[10px] opacity-70">
                {new Date(simulationResult.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-[10px] opacity-80 mt-1">
              {simulationResult.reason} • Signed off as: {reviewerRole}
            </div>

            {/* Display effective payload if modified */}
            {simulationResult.decision === 'edit_and_approve' && simulationResult.effectivePayload && (
              <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[10px]">
                <div className="font-bold text-emerald-300">Effective Overridden Payload:</div>
                <pre className="mt-1 p-1.5 bg-black/40 rounded overflow-x-auto text-emerald-200">
                  {typeof simulationResult.effectivePayload === 'object'
                    ? JSON.stringify(simulationResult.effectivePayload, null, 2)
                    : String(simulationResult.effectivePayload)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
