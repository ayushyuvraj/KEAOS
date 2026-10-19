import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldCheck, Check, X, Edit3, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import NodeActionToolbar from '../common/NodeActionToolbar';
import { recordApprovalDecision } from '../../services/approvalEngine';

export default function ApprovalNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  const isLocked = Boolean(data?.isLocked);

  const [nodeTitle, setNodeTitle] = useState(data?.name || 'Approval Gate');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Review & Steering Popover State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState('preview'); // 'preview' | 'edit' | 'steer'
  const [currentPayload, setCurrentPayload] = useState(() => {
    return data?.pendingPayload || data?.upstreamPayload || null;
  });
  const [editablePayloadText, setEditablePayloadText] = useState(() => {
    return currentPayload ? JSON.stringify(currentPayload, null, 2) : '';
  });
  const [steeringFeedback, setSteeringFeedback] = useState('');
  const [currentStatus, setCurrentStatus] = useState(data?.approvalStatus || 'idle');

  useEffect(() => {
    if (data?.name && data.name !== nodeTitle) {
      setNodeTitle(data.name);
    }
  }, [data?.name]);

  useEffect(() => {
    if (data?.approvalStatus) {
      setCurrentStatus(data.approvalStatus);
    }
  }, [data?.approvalStatus]);

  // Listen for incoming approval requests during execution
  useEffect(() => {
    const handleApprovalRequest = (e) => {
      if (e.detail?.nodeId === id || !e.detail?.nodeId) {
        if (e.detail?.payload) {
          setCurrentPayload(e.detail.payload);
          setEditablePayloadText(typeof e.detail.payload === 'string' ? e.detail.payload : JSON.stringify(e.detail.payload, null, 2));
        }
        setCurrentStatus('pending');
        setIsReviewOpen(true);
      }
    };
    window.addEventListener('keaos:approval-requested', handleApprovalRequest);
    return () => window.removeEventListener('keaos:approval-requested', handleApprovalRequest);
  }, [id]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (data?.onRename) {
      data.onRename(id, nodeTitle.trim() || 'Approval Gate');
    }
  };

  const reviewerRole = data?.reviewerRole || 'Compliance Officer';

  const handleDecision = (decisionType) => {
    let modified = null;
    if (decisionType === 'edit_and_approve') {
      try {
        modified = JSON.parse(editablePayloadText);
      } catch (err) {
        modified = editablePayloadText;
      }
    }

    const record = recordApprovalDecision({
      nodeId: id,
      decision: decisionType,
      reviewerRole,
      feedback: steeringFeedback,
      payload: currentPayload,
      modifiedPayload: modified
    });

    const newStatus = decisionType === 'rejected' ? 'rejected' 
      : decisionType === 'steer_and_refine' ? 'refining'
      : 'approved';

    setCurrentStatus(newStatus);
    setIsReviewOpen(false);

    window.dispatchEvent(new CustomEvent('keaos:approval-resolved', {
      detail: {
        nodeId: id,
        decision: decisionType,
        record,
        activeBranch: record.activeBranch,
        effectivePayload: record.effectivePayload,
        feedback: steeringFeedback
      }
    }));

    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { 
        message: decisionType === 'approved' ? '✓ Action Approved'
          : decisionType === 'edit_and_approve' ? '✓ Approved with Human Edits'
          : decisionType === 'steer_and_refine' ? '↺ Steering Sent to Agent'
          : '✕ Action Rejected'
      }
    }));
  };

  const handleNodeClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (data?.onOpenInspector) {
      data.onOpenInspector(id);
    }
  };

  return (
    <div className="relative group select-none">
      {/* Floating Action Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
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

      {/* Minimal Label Placed Above Node */}
      <div 
        className="absolute bottom-[calc(100%+6px)] left-0 w-full px-1 text-center pointer-events-auto"
        onClick={handleNodeClick}
      >
        {isEditingTitle ? (
          <input
            type="text"
            value={nodeTitle}
            onChange={(e) => setNodeTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') setIsEditingTitle(false);
            }}
            autoFocus
            className={`w-full px-2 py-0.5 text-[11px] font-semibold text-center rounded-lg outline-none border ${
              isDarkMode ? 'bg-[#141B2D] text-white border-[#EAAA00]' : 'bg-slate-50 text-slate-900 border-[#EAAA00]'
            }`}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              if (isLocked) return;
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
            className="cursor-pointer"
            title="Double-click to rename approval gate"
          >
            <span className={`text-[11px] font-semibold tracking-tight block truncate ${
              isDeactivated 
                ? 'line-through text-slate-500' 
                : isDarkMode ? 'text-white' : 'text-[#111827]'
            }`}>
              {nodeTitle}
            </span>
          </div>
        )}
      </div>

      {/* Subtle, Soft-Curved Capsule Token (No Sharp Edges) */}
      <div
        onClick={handleNodeClick}
        className={`relative h-[54px] min-w-[170px] max-w-[210px] px-3.5 py-1.5 rounded-2xl flex items-center gap-3 transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
          selected
            ? 'ring-4 ring-[#EAAA00]/30 border-2 border-[#EAAA00]'
            : 'border border-slate-200/80 dark:border-slate-800/80 hover:border-[#EAAA00]/50'
        } ${
          isDeactivated
            ? 'opacity-40 grayscale border-dashed border-slate-500 bg-slate-800/40'
            : isDarkMode
              ? 'bg-[#14120E] text-white'
              : 'bg-white text-slate-900 shadow-slate-200/50'
        }`}
      >
        {/* Input Handle (Left) */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{
            top: '50%',
            left: '-6px',
            width: '10px',
            height: '10px',
            borderRadius: '9999px',
            backgroundColor: '#EAAA00',
            borderColor: isDarkMode ? '#14120E' : '#FFFFFF',
            borderWidth: '2px',
            zIndex: 20
          }}
          title="Input: Connect upstream Agent, Deterministic Box, or Router"
        />

        {/* Subtle Icon Glyph */}
        <div className="w-8 h-8 rounded-full bg-[#EAAA00]/15 text-[#EAAA00] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>

        {/* Center Minimal Information */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#EAAA00]">
              SIGN-OFF GATE
            </span>
            {currentStatus === 'pending' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#EAAA00] animate-pulse" />
            )}
            {currentStatus === 'approved' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            )}
            {currentStatus === 'rejected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            )}
          </div>
          <p className="text-[10px] font-mono truncate text-slate-400 dark:text-slate-400 mt-0.5" title={`Reviewer: ${reviewerRole}`}>
            {reviewerRole}
          </p>
        </div>

        {/* Interactive Quick Review Toggle Icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsReviewOpen(!isReviewOpen);
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors cursor-pointer ${
            isReviewOpen 
              ? 'bg-[#EAAA00] text-black font-bold' 
              : 'hover:bg-white/10 text-slate-400 hover:text-white'
          }`}
          title={isReviewOpen ? 'Close Sign-Off Panel' : 'Open Sign-Off & Steering Panel'}
        >
          {isReviewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Approved Output Handle (Top Right) */}
        <div className="absolute right-0 top-[28%] -translate-y-1/2 flex items-center">
          <Handle
            type="source"
            position={Position.Right}
            id="approved-out"
            style={{
              right: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: '#10B981',
              borderColor: isDarkMode ? '#14120E' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="Approved Output: Resumes execution when signed off or edited"
          />
        </div>

        {/* Rejected Output Handle (Bottom Right) */}
        <div className="absolute right-0 top-[72%] -translate-y-1/2 flex items-center">
          <Handle
            type="source"
            position={Position.Right}
            id="rejected-out"
            style={{
              right: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: '#EF4444',
              borderColor: isDarkMode ? '#14120E' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="Rejected Output: Routes execution when rejected"
          />
        </div>
      </div>

      {/* Tiny Subtle Port Labels on Right */}
      <div className="absolute -right-14 top-[18%] -translate-y-1/2 text-[9px] font-mono font-bold text-[#10B981] pointer-events-none">
        APPROVE
      </div>
      <div className="absolute -right-12 top-[66%] -translate-y-1/2 text-[9px] font-mono font-bold text-[#EF4444] pointer-events-none">
        REJECT
      </div>

      {/* In-Place Interactive Canvas Review Card (Opens when review is requested or toggled) */}
      {isReviewOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[280px] p-3 rounded-2xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${
            isDarkMode 
              ? 'bg-[#14120E] border-[#EAAA00]/40 text-white shadow-amber-950/40' 
              : 'bg-white border-amber-300 text-slate-900 shadow-xl'
          }`}
        >
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#EAAA00]" />
              <span className="text-[10px] font-mono font-bold uppercase text-[#EAAA00]">
                Sign-off & Steer
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg text-[9px] font-mono">
              <button
                type="button"
                onClick={() => setReviewTab('preview')}
                className={`px-1.5 py-0.5 rounded ${reviewTab === 'preview' ? 'bg-[#EAAA00] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setReviewTab('edit')}
                className={`px-1.5 py-0.5 rounded ${reviewTab === 'edit' ? 'bg-[#EAAA00] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setReviewTab('steer')}
                className={`px-1.5 py-0.5 rounded ${reviewTab === 'steer' ? 'bg-[#EAAA00] text-black font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Steer
              </button>
            </div>
          </div>

          {/* Tab 1: Preview Proposal */}
          {reviewTab === 'preview' && (
            <div className="space-y-2 mb-3">
              <div className="text-[9px] font-mono text-slate-400 flex justify-between">
                <span>Proposed Action</span>
                <span>Reviewer: {reviewerRole}</span>
              </div>
              <div className={`p-2 rounded-xl text-[10px] font-mono max-h-24 overflow-y-auto ${
                isDarkMode ? 'bg-[#0C0B08] text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-700 border border-slate-200'
              }`}>
                {typeof currentPayload === 'object' ? JSON.stringify(currentPayload, null, 2) : String(currentPayload)}
              </div>
            </div>
          )}

          {/* Tab 2: Direct Edit (Instant 0-Token Override) */}
          {reviewTab === 'edit' && (
            <div className="space-y-2 mb-3">
              <div className="text-[9px] font-mono text-emerald-400 flex items-center justify-between">
                <span>Direct Edit (0 Tokens)</span>
                <span>Instant Override</span>
              </div>
              <textarea
                rows={4}
                value={editablePayloadText}
                onChange={(e) => setEditablePayloadText(e.target.value)}
                className={`w-full p-2 text-[10px] font-mono rounded-xl resize-none ${
                  isDarkMode ? 'bg-[#0C0B08] text-white border border-emerald-500/30' : 'bg-slate-50 text-slate-900 border border-emerald-500'
                }`}
              />
            </div>
          )}

          {/* Tab 3: Steer Agent (Human Guidance Feedback Loop) */}
          {reviewTab === 'steer' && (
            <div className="space-y-2 mb-3">
              <div className="text-[9px] font-mono text-blue-400 flex items-center justify-between">
                <span>Steering Feedback</span>
                <span>Re-prompts Agent</span>
              </div>
              <textarea
                rows={3}
                value={steeringFeedback}
                onChange={(e) => setSteeringFeedback(e.target.value)}
                placeholder="Tell the agent what to fix (e.g. reduce budget by 10%, soften closing tone)..."
                className={`w-full p-2 text-[10px] font-sans rounded-xl resize-none ${
                  isDarkMode ? 'bg-[#0C0B08] text-white border border-blue-500/30' : 'bg-slate-50 text-slate-900 border border-blue-500'
                }`}
              />
            </div>
          )}

          {/* Action Decision Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            {reviewTab === 'edit' ? (
              <button
                type="button"
                onClick={() => handleDecision('edit_and_approve')}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Approve with Edits</span>
              </button>
            ) : reviewTab === 'steer' ? (
              <button
                type="button"
                onClick={() => handleDecision('steer_and_refine')}
                disabled={!steeringFeedback.trim()}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Send & Refine</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleDecision('approved')}
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve (Yes)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('edit')}
                  className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  title="Edit directly or steer with feedback"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  className="px-2 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reject</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
