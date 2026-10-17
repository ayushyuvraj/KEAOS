// KEAOS Pure Evaluation Engine for Human-in-the-Loop Approval Gate
// Supports 4 Actions: Approve, Edit & Approve, Steer & Refine, and Reject
// Zero external dependencies, deterministic state & audit ledger

/**
 * Creates an immutable audit record for human approval, edit, steering, or rejection
 */
export function recordApprovalDecision({
  nodeId,
  decision, // 'approved' | 'edit_and_approve' | 'steer_and_refine' | 'rejected'
  reviewerRole = 'Reviewer',
  reason = '',
  feedback = '',
  payload = null,
  modifiedPayload = null,
  timestamp = new Date().toISOString()
}) {
  let activeBranch = 'approved-out';
  let defaultReason = 'Approved by reviewer';

  if (decision === 'rejected') {
    activeBranch = 'rejected-out';
    defaultReason = 'Rejected by reviewer';
  } else if (decision === 'edit_and_approve') {
    activeBranch = 'approved-out';
    defaultReason = 'Direct human override applied & approved';
  } else if (decision === 'steer_and_refine') {
    activeBranch = 'refine-loop';
    defaultReason = `Human steering feedback provided: "${feedback}"`;
  }

  return {
    nodeId,
    decision,
    activeBranch,
    reviewerRole,
    reason: reason.trim() || defaultReason,
    feedback: feedback.trim(),
    timestamp,
    payload,
    effectivePayload: decision === 'edit_and_approve' ? (modifiedPayload || payload) : payload
  };
}

/**
 * Live test helper for Inspector and Canvas Simulator
 */
export function simulateDecision(decision, { reviewerRole, instructions, payloadText, modifiedPayloadText, feedbackText }) {
  try {
    let parsedOriginal = null;
    let parsedModified = null;

    const trimmedOrig = String(payloadText || '').trim();
    if (trimmedOrig && ((trimmedOrig.startsWith('{') && trimmedOrig.endsWith('}')) || (trimmedOrig.startsWith('[') && trimmedOrig.endsWith(']')))) {
      try { parsedOriginal = JSON.parse(trimmedOrig); } catch { parsedOriginal = trimmedOrig; }
    } else {
      parsedOriginal = trimmedOrig || { status: 'pending_review', sample: true };
    }

    if (decision === 'edit_and_approve') {
      const trimmedMod = String(modifiedPayloadText || payloadText || '').trim();
      if (trimmedMod && ((trimmedMod.startsWith('{') && trimmedMod.endsWith('}')) || (trimmedMod.startsWith('[') && trimmedMod.endsWith(']')))) {
        try { parsedModified = JSON.parse(trimmedMod); } catch { parsedModified = trimmedMod; }
      } else {
        parsedModified = trimmedMod;
      }
    }

    const res = recordApprovalDecision({
      nodeId: 'sim-gate',
      decision,
      reviewerRole,
      reason: decision === 'approved' ? 'Signed off via simulator' 
            : decision === 'rejected' ? 'Declined via simulator'
            : decision === 'edit_and_approve' ? 'Directly modified payload and approved'
            : `Steering feedback: "${feedbackText || 'Please refine tone and numbers'}"`,
      feedback: feedbackText || '',
      payload: parsedOriginal,
      modifiedPayload: parsedModified
    });

    return {
      success: true,
      decision: res.decision,
      branch: res.activeBranch,
      reason: res.reason,
      feedback: res.feedback,
      timestamp: res.timestamp,
      effectivePayload: res.effectivePayload
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}
