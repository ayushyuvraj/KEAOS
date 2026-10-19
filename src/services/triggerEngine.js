/**
 * KEAOS Trigger Execution Engine
 * 
 * Provides unified, model-agnostic event dispatching for workflow triggers.
 * Routes events from Trigger Nodes to connected AI Agent Cores and Deterministic Boxes.
 * Incorporates W3C WebCrypto SHA-256 deduplication and cryptographic audit logging.
 */

import { executeDeterministicTask } from './deterministicRunner';
import { recordWorkflowExecution } from './unifiedAuditService';
import { executeRealMcpTool, getRegisteredMcpServers, DEFAULT_OFFICIAL_MCP_SERVERS } from './mcpClientService';
import { identifyMcpService } from '../constants/mcpOfficialCatalogs';

// Ingress Deduplication Cache (TTL: 24 Hours)
const deduplicationCache = new Map();
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generates W3C WebCrypto SHA-256 hash for payload fingerprinting
 */
export async function generateTriggerPayloadHash(payloadObj) {
  try {
    const raw = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj || {});
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback hash if subtle crypto is blocked in sandbox
    let hash = 0;
    const str = JSON.stringify(payloadObj || {});
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// Active Schedules & Polling Watchers Registry (Key: nodeId)
const activeSchedules = new Map();
const activePollers = new Map();

/**
 * Arms or updates a temporal schedule timer for a Schedule/Cron trigger node.
 */
export function armScheduleTrigger(nodeId, {
  runAtTimestamp = null,
  intervalSeconds = null,
  isRecurring = false,
  payloadText = null
}) {
  // Clear any existing schedule for this node first
  disarmScheduleTrigger(nodeId);

  const now = Date.now();
  let targetTimestamp = runAtTimestamp;

  if (!targetTimestamp && intervalSeconds) {
    targetTimestamp = now + (intervalSeconds * 1000);
  }

  if (!targetTimestamp || targetTimestamp <= now) {
    // If target timestamp is in the past, or not provided, set 10s default test
    targetTimestamp = now + 10000;
  }

  const scheduleState = {
    nodeId,
    targetTimestamp,
    intervalSeconds,
    isRecurring,
    payloadText,
    isArmed: true,
    timerId: null,
    tickIntervalId: null
  };

  // Broadcast initial tick immediately
  const initialRemaining = Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000));
  window.dispatchEvent(new CustomEvent('keaos:schedule-tick', {
    detail: {
      nodeId,
      remainingSeconds: initialRemaining,
      targetTimestamp,
      isArmed: true,
      isRecurring
    }
  }));

  // Setup 1-second countdown broadcast
  scheduleState.tickIntervalId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((targetTimestamp - Date.now()) / 1000));
    window.dispatchEvent(new CustomEvent('keaos:schedule-tick', {
      detail: {
        nodeId,
        remainingSeconds: remaining,
        targetTimestamp,
        isArmed: true,
        isRecurring
      }
    }));

    if (remaining <= 0) {
      clearInterval(scheduleState.tickIntervalId);
    }
  }, 1000);

  // Setup main fire timeout
  const delayMs = Math.max(50, targetTimestamp - now);
  scheduleState.timerId = setTimeout(() => {
    // Fire the trigger node
    window.dispatchEvent(new CustomEvent('keaos:fire-trigger-node', {
      detail: {
        nodeId,
        triggerType: 'schedule',
        payloadText: payloadText || JSON.stringify({
          source: 'schedule_runner',
          scheduledAt: new Date(targetTimestamp).toISOString(),
          executedAt: new Date().toISOString()
        })
      }
    }));

    // If recurring, re-arm for next interval
    if (isRecurring && intervalSeconds) {
      armScheduleTrigger(nodeId, {
        intervalSeconds,
        isRecurring: true,
        payloadText
      });
    } else {
      scheduleState.isArmed = false;
      activeSchedules.delete(nodeId);
      window.dispatchEvent(new CustomEvent('keaos:schedule-tick', {
        detail: {
          nodeId,
          remainingSeconds: 0,
          targetTimestamp: null,
          isArmed: false,
          isRecurring: false
        }
      }));
    }
  }, delayMs);

  activeSchedules.set(nodeId, scheduleState);
  return scheduleState;
}

/**
 * Disarms and cancels an active schedule for a trigger node.
 */
export function disarmScheduleTrigger(nodeId) {
  if (activeSchedules.has(nodeId)) {
    const sched = activeSchedules.get(nodeId);
    if (sched.timerId) clearTimeout(sched.timerId);
    if (sched.tickIntervalId) clearInterval(sched.tickIntervalId);
    activeSchedules.delete(nodeId);

    window.dispatchEvent(new CustomEvent('keaos:schedule-tick', {
      detail: {
        nodeId,
        remainingSeconds: null,
        targetTimestamp: null,
        isArmed: false
      }
    }));
  }
}

/**
 * Gets current schedule status for a node
 */
export function getScheduleStatus(nodeId) {
  if (!activeSchedules.has(nodeId)) return { isArmed: false, remainingSeconds: 0 };
  const sched = activeSchedules.get(nodeId);
  const remaining = Math.max(0, Math.ceil((sched.targetTimestamp - Date.now()) / 1000));
  return {
    isArmed: sched.isArmed,
    remainingSeconds: remaining,
    targetTimestamp: sched.targetTimestamp,
    isRecurring: sched.isRecurring
  };
}

/**
 * Arms an API Polling Watcher
 */
export function armPollingWatcher(nodeId, {
  endpointUrl = 'https://api.example.com/v1/status',
  intervalSeconds = 30,
  deduplicate = true,
  payloadText = null
}) {
  disarmPollingWatcher(nodeId);

  let lastHash = null;
  const pollState = {
    nodeId,
    endpointUrl,
    intervalSeconds,
    intervalId: null,
    isArmed: true
  };

  const executePoll = async () => {
    try {
      const mockPayload = {
        source: 'api_polling_watcher',
        endpoint: endpointUrl,
        timestamp: new Date().toISOString(),
        status: 'UP',
        payload: payloadText ? JSON.parse(payloadText) : { serverLoad: (Math.random() * 100).toFixed(1) + '%' }
      };

      const hash = await generateTriggerPayloadHash(mockPayload);
      if (deduplicate && lastHash === hash) {
        return; // No delta, skip
      }
      lastHash = hash;

      window.dispatchEvent(new CustomEvent('keaos:fire-trigger-node', {
        detail: {
          nodeId,
          triggerType: 'poll',
          payloadText: JSON.stringify(mockPayload)
        }
      }));
    } catch {
      // Graceful fallback
    }
  };

  pollState.intervalId = setInterval(executePoll, Math.max(5000, intervalSeconds * 1000));
  activePollers.set(nodeId, pollState);
  return pollState;
}

/**
 * Disarms an API Polling Watcher
 */
export function disarmPollingWatcher(nodeId) {
  if (activePollers.has(nodeId)) {
    const p = activePollers.get(nodeId);
    if (p.intervalId) clearInterval(p.intervalId);
    activePollers.delete(nodeId);
  }
}

// Active Outlook MCP Stream Watchers Registry (Key: nodeId)
const activeOutlookWatchers = new Map();

/**
 * Arms an Outlook MCP Stream Watcher with Zero-Trust Gateway enforcement
 * and Discrete Batch Queue processing (N incoming items -> N discrete downstream rows).
 */
export function armOutlookStreamWatcher(nodeId, {
  stream = 'inbox', // 'inbox' | 'sentitems' | 'calendar' | 'tasks' | 'contacts'
  intervalSeconds = 60,
  maxBatchSize = 25,
  disabledTools = [],
  filter = '',
  search = ''
}) {
  disarmOutlookStreamWatcher(nodeId);

  // 1. Zero-Trust Gateway Policy Check
  const requiredTool = (stream === 'calendar') ? 'list_events' :
                       (stream === 'tasks') ? 'list_tasks' :
                       (stream === 'contacts') ? 'list_contacts' : 'list_messages';

  if (Array.isArray(disabledTools) && disabledTools.includes(requiredTool)) {
    const errorMsg = `[GATEWAY ZERO-TRUST PERIMETER]: Stream "${stream}" requires capability "${requiredTool}", which is BLOCKED by operator policy.`;
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }

  const seenItemIds = new Set();
  const watcherState = {
    nodeId,
    stream,
    intervalSeconds,
    maxBatchSize,
    requiredTool,
    disabledTools,
    intervalId: null,
    isArmed: true,
    lastPolledAt: null,
    processedCount: 0
  };

  const executeStreamPoll = async () => {
    try {
      watcherState.lastPolledAt = new Date().toISOString();

      // Dynamic perimeter re-check: ensure tool has not been disabled mid-session
      if (Array.isArray(watcherState.disabledTools) && watcherState.disabledTools.includes(requiredTool)) {
        console.warn(`[Gateway Policy Active] Stream polling skipped: ${requiredTool} is blocked at Gateway perimeter.`);
        return;
      }

      // Discover active Outlook MCP server from registry
      const registered = getRegisteredMcpServers();
      const outlookServer = (registered || []).find(s => identifyMcpService(s) === 'outlook') || DEFAULT_OFFICIAL_MCP_SERVERS[0];

      let rawItems = [];

      if (outlookServer && outlookServer.config?.token) {
        try {
          if (stream === 'inbox' || stream === 'sentitems') {
            const folderName = stream === 'sentitems' ? 'sentitems' : 'inbox';
            const pollArgs = {
              folder: folderName,
              limit: Math.min(50, maxBatchSize || 25),
              filter: filter || (stream === 'inbox' ? 'isRead eq false' : '')
            };
            if (search) pollArgs.search = search;

            const res = await executeRealMcpTool(outlookServer, 'list_messages', pollArgs, { disabledTools });
            if (res && Array.isArray(res.value)) {
              rawItems = res.value;
            }
          } else if (stream === 'calendar') {
            const res = await executeRealMcpTool(outlookServer, 'list_events', {
              limit: Math.min(50, maxBatchSize || 25)
            }, { disabledTools });
            if (res && Array.isArray(res.value)) {
              rawItems = res.value;
            }
          } else if (stream === 'tasks') {
            const res = await executeRealMcpTool(outlookServer, 'list_tasks', {
              limit: Math.min(50, maxBatchSize || 25)
            }, { disabledTools });
            if (res && Array.isArray(res.value)) {
              rawItems = res.value;
            }
          }
        } catch (fetchErr) {
          console.warn(`[Outlook Stream Poll Notice]: ${fetchErr.message}`);
        }
      }

      // Filter out already processed items using watermarking
      const newItems = rawItems.filter(item => item && item.id && !seenItemIds.has(item.id));
      newItems.forEach(item => seenItemIds.add(item.id));

      if (newItems.length === 0) {
        // Idle check: Zero tokens consumed, zero downstream events fired
        return;
      }

      // DISCRETE QUEUE FAN-OUT:
      // If N items arrive in this interval, dispatch each one independently so downstream
      // agents and tabular sinks process them as N individual rows without mixing or jumbling!
      for (let idx = 0; idx < newItems.length; idx++) {
        const item = newItems[idx];
        watcherState.processedCount++;

        const discretePayload = {
          source: 'outlook_mcp_stream',
          stream,
          batchIndex: idx + 1,
          batchTotal: newItems.length,
          item: {
            id: item.id,
            subject: item.subject || `Notification #${item.id}`,
            sender: item.from?.emailAddress?.address || item.from || 'sender@enterprise.corp',
            receivedDateTime: item.receivedDateTime || item.sentDateTime || item.createdDateTime || new Date().toISOString(),
            hasAttachments: Boolean(item.hasAttachments),
            bodyPreview: item.bodyPreview || item.body?.content || ''
          }
        };

        window.dispatchEvent(new CustomEvent('keaos:fire-trigger-node', {
          detail: {
            nodeId,
            triggerType: 'poll',
            payloadText: JSON.stringify(discretePayload, null, 2),
            batchIndex: idx + 1,
            batchTotal: newItems.length,
            stream
          }
        }));

        // Allow 350ms delay between queued items for orderly sequential row ingestion
        if (idx < newItems.length - 1) {
          await new Promise(r => setTimeout(r, 350));
        }
      }
    } catch (pollErr) {
      console.warn('Stream poll execution error:', pollErr);
    }
  };

  watcherState.intervalId = setInterval(executeStreamPoll, Math.max(5000, intervalSeconds * 1000));
  activeOutlookWatchers.set(nodeId, watcherState);
  return watcherState;
}

/**
 * Disarms an Outlook Stream Watcher
 */
export function disarmOutlookStreamWatcher(nodeId) {
  if (activeOutlookWatchers.has(nodeId)) {
    const watcher = activeOutlookWatchers.get(nodeId);
    if (watcher.intervalId) clearInterval(watcher.intervalId);
    activeOutlookWatchers.delete(nodeId);
  }
}

/**
 * Gets Outlook Stream Watcher Status
 */
export function getOutlookWatcherStatus(nodeId) {
  if (!activeOutlookWatchers.has(nodeId)) {
    return { isArmed: false, stream: null, processedCount: 0 };
  }
  const w = activeOutlookWatchers.get(nodeId);
  return {
    isArmed: w.isArmed,
    stream: w.stream,
    intervalSeconds: w.intervalSeconds,
    lastPolledAt: w.lastPolledAt,
    processedCount: w.processedCount
  };
}

/**
 * Helper to process dropped or selected files into a clean payload
 */
export async function processFileForTrigger(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    const reader = new FileReader();
    const isTextReadable = file.type.startsWith('text/') || 
      file.type === 'application/json' || 
      file.name.endsWith('.txt') || 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.md') ||
      file.name.endsWith('.json');

    if (isTextReadable) {
      reader.onload = (e) => {
        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'text/plain',
          lastModified: file.lastModified,
          content: e.target.result,
          isText: true
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file content'));
      reader.readAsText(file);
    } else {
      // For binary files (PDFs, images, audio)
      reader.onload = (e) => {
        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          dataUrl: e.target.result,
          isText: false
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Dispatches a trigger event to all downstream connected nodes on the canvas.
 * 
 * @param {Object} options
 * @param {Object} options.triggerNode - The source trigger node
 * @param {Array} options.nodes - All active canvas nodes
 * @param {Array} options.edges - All active canvas edges
 * @param {Object|string} options.payload - Custom or default payload to emit
 * @returns {Promise<Object>} Execution result summary
 */
export async function fireTriggerEvent({
  triggerNode,
  nodes = [],
  edges = [],
  payload = null
}) {
  if (!triggerNode || !triggerNode.id) {
    throw new Error('Invalid trigger node provided to fireTriggerEvent');
  }

  const triggerId = triggerNode.id;
  const triggerName = triggerNode.data?.name || 'Trigger';

  // 1. Parse and sanitize payload
  let parsedPayload = payload;
  if (!parsedPayload) {
    const rawPayloadText = triggerNode.data?.payloadText;
    if (rawPayloadText && typeof rawPayloadText === 'string') {
      try {
        parsedPayload = JSON.parse(rawPayloadText);
      } catch (err) {
        // Fallback to raw text string if not valid JSON
        parsedPayload = { text: rawPayloadText };
      }
    } else {
      const isOutlookStream = (triggerNode.data?.streamType === 'inbox') || 
                              (triggerNode.data?.name || '').toLowerCase().includes('outlook') ||
                              (triggerNode.data?.pollSubMode === 'stream');
      if (isOutlookStream) {
        parsedPayload = {
          source: 'outlook_mcp_stream',
          stream: triggerNode.data?.streamType || 'inbox',
          item: {
            id: `msg_${Date.now()}`,
            subject: 'Vendor Invoice #INV-2026-9041 (Payment Approval Required)',
            from: 'ap-billing@cloudinfrastructures.corp',
            receivedDateTime: new Date().toISOString(),
            hasAttachments: true,
            bodyPreview: 'Please find attached invoice INV-2026-9041 for Q3 compute infrastructure cluster. Total due: $48,500.00. Payment due in 30 days.'
          }
        };
      } else {
        parsedPayload = {
          source: 'manual_trigger',
          triggerId,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // 2. Generate Cryptographic Fingerprint
  const payloadHash = await generateTriggerPayloadHash(parsedPayload);
  const now = Date.now();

  // 3. Deduplication Check (Clean up expired keys first)
  for (const [key, timestamp] of deduplicationCache.entries()) {
    if (now - timestamp > DEDUP_TTL_MS) {
      deduplicationCache.delete(key);
    }
  }

  // Check if identical trigger fired in last 500ms (debouncing rapid accidental clicks)
  if (deduplicationCache.has(payloadHash) && (now - deduplicationCache.get(payloadHash) < 500)) {
    return {
      success: false,
      deduplicated: true,
      message: 'Trigger debounced: identical event fired < 500ms ago.'
    };
  }
  deduplicationCache.set(payloadHash, now);

  // 4. Discover all downstream target nodes wired to this trigger
  const outboundEdges = (edges || []).filter(e => e.source === triggerId);
  const targetNodeIds = outboundEdges.map(e => e.target);
  const targetNodes = (nodes || []).filter(n => targetNodeIds.includes(n.id) && !n.data?.isDeactivated);

  // Pulse outgoing canvas wires
  window.dispatchEvent(new CustomEvent('keaos:trigger-pulse', {
    detail: { triggerId, targetNodeIds }
  }));

  if (targetNodes.length === 0) {
    // Audit even if orphan trigger
    try {
      recordWorkflowExecution({
        workflowId: `trg-${triggerId}`,
        workflowName: `${triggerName} (No Downstream Target)`,
        transcript: JSON.stringify(parsedPayload),
        deliverables: { result: 'Fired trigger with zero active connected downstream targets.' },
        model: 'Ingress Engine',
        framework: 'KEAOS Native',
        auditHash: payloadHash
      });
    } catch (e) {
      // Non-blocking
    }

    return {
      success: true,
      orphaned: true,
      targetsCount: 0,
      payloadHash,
      message: 'Trigger fired successfully, but no active downstream nodes are connected.'
    };
  }

  const results = [];

  // 5. Fan-out execution to all connected targets
  for (const target of targetNodes) {
    // TARGET A: Deterministic Box (Zero-token logic execution)
    if (target.type === 'deterministicNode') {
      window.dispatchEvent(new CustomEvent('keaos:deterministic-executing', {
        detail: { nodeId: target.id, isRunning: true }
      }));

      try {
        const detResult = await executeDeterministicTask({
          nodeId: target.id,
          code: target.data?.code,
          language: target.data?.language || 'python',
          inputs: parsedPayload,
          ruleSummary: target.data?.prompt || target.data?.ruleSummary || 'Trigger Ingress Processing'
        });

        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: {
            nodeId: target.id,
            success: detResult.success,
            output: detResult.output,
            latencyMs: detResult.latencyMs,
            ruleSummary: target.data?.prompt || target.data?.ruleSummary || 'Processed Trigger Input'
          }
        }));

        results.push({
          targetId: target.id,
          targetType: 'deterministicNode',
          success: detResult.success,
          output: detResult.output
        });
      } catch (err) {
        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: {
            nodeId: target.id,
            success: false,
            error: err.message,
            latencyMs: 0
          }
        }));

        results.push({
          targetId: target.id,
          targetType: 'deterministicNode',
          success: false,
          error: err.message
        });
      }
    }

    // TARGET B: AI Agent Core (Dispatches into multi-agent DAG)
    else if (target.type === 'agentCore') {
      const formattedContext = typeof parsedPayload === 'string'
        ? parsedPayload
        : (parsedPayload.transcript || parsedPayload.text || parsedPayload.data || JSON.stringify(parsedPayload, null, 2));

      window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
        detail: { content: formattedContext, nodeId: triggerId }
      }));

      window.dispatchEvent(new CustomEvent('keaos:execute-workflow', {
        detail: { agentId: target.id, initialContext: formattedContext }
      }));

      results.push({
        targetId: target.id,
        targetType: 'agentCore',
        success: true,
        dispatched: true
      });
    }

    // TARGET C: Direct Output Display Node (Continuous Tabular Stream)
    else if (target.type === 'outputNode') {
      const formattedOutput = typeof parsedPayload === 'object'
        ? JSON.stringify(parsedPayload, null, 2)
        : String(parsedPayload || '');

      window.dispatchEvent(new CustomEvent('keaos:output-append-run', {
        detail: {
          targetNodeId: target.id,
          output: formattedOutput,
          payload: parsedPayload,
          sourceNodeType: 'trigger',
          sourceNodeId: triggerId,
          sourceNodeName: triggerName
        }
      }));

      results.push({
        targetId: target.id,
        targetType: 'outputNode',
        success: true
      });
    }
  }

  // 6. Record immutable cryptographic audit entry
  try {
    recordWorkflowExecution({
      workflowId: `trg-${triggerId}-${now}`,
      workflowName: `${triggerName} -> [${targetNodes.map(t => t.data?.name || t.type).join(', ')}]`,
      transcript: JSON.stringify(parsedPayload),
      deliverables: { targetsExecuted: results },
      model: 'Ingress Engine',
      framework: 'KEAOS Native',
      auditHash: payloadHash
    });
  } catch (e) {
    // Non-blocking
  }

  return {
    success: true,
    triggerId,
    payloadHash,
    targetsCount: targetNodes.length,
    results
  };
}
