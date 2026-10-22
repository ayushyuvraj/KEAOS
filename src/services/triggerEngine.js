/**
 * KEAOS Trigger Execution Engine
 * 
 * Provides unified, model-agnostic event dispatching for workflow triggers.
 * Routes events from Trigger Nodes to connected AI Agent Cores and Deterministic Boxes.
 * Incorporates W3C WebCrypto SHA-256 deduplication and cryptographic audit logging.
 */

import { executeDeterministicTask } from './deterministicRunner';
import { recordWorkflowExecution } from './unifiedAuditService';
import { 
  executeRealMcpTool, 
  getRegisteredMcpServers, 
  getStoredMicrosoftOAuthCredentials,
  DEFAULT_OFFICIAL_MCP_SERVERS 
} from './mcpClientService';
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

const WATERMARK_STORAGE_PREFIX = 'keaos_stream_watermark_';

/**
 * Retrieves the persistent list of processed message IDs for a given trigger node from localStorage
 */
export function getPersistentWatermark(nodeId) {
  if (!nodeId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${WATERMARK_STORAGE_PREFIX}${nodeId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Records a message ID as processed in persistent storage (capped at 500 entries)
 */
export function recordProcessedMessage(nodeId, messageId) {
  if (!nodeId || !messageId || typeof window === 'undefined') return;
  try {
    const current = getPersistentWatermark(nodeId);
    if (!current.includes(messageId)) {
      const updated = [messageId, ...current].slice(0, 500);
      localStorage.setItem(`${WATERMARK_STORAGE_PREFIX}${nodeId}`, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('Failed to record persistent watermark:', e);
  }
}

/**
 * Clears persistent watermark cache for a given trigger node
 */
export function clearWatermarkCache(nodeId) {
  if (!nodeId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${WATERMARK_STORAGE_PREFIX}${nodeId}`);
  } catch (e) {
    console.warn('Failed to clear watermark cache:', e);
  }
  if (activeOutlookWatchers.has(nodeId)) {
    const w = activeOutlookWatchers.get(nodeId);
    if (w.seenItemIds) w.seenItemIds.clear();
  }
}

/**
 * Arms an Outlook MCP Stream Watcher with Zero-Trust Gateway enforcement
 * and Discrete Batch Queue processing (N incoming items -> N discrete downstream rows).
 */
export function armOutlookStreamWatcher(nodeId, {
  stream = 'inbox', // 'inbox' | 'sentitems' | 'drafts' | 'calendar' | 'tasks' | 'contacts'
  intervalSeconds = 60,
  maxBatchSize = 25,
  disabledTools = [],
  filter = '',
  search = '',
  unreadFilter = 'unread_only', // 'unread_only' | 'all' | 'read_only'
  attachmentFilter = 'any', // 'any' | 'require_attachments' | 'no_attachments'
  autoMarkAsRead = true
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

  // Construct dynamic OData filter from declarative settings if custom filter is not provided
  let effectiveFilter = filter || '';
  if (!effectiveFilter && (stream === 'inbox' || stream === 'sentitems' || stream === 'drafts')) {
    const parts = [];
    if (unreadFilter === 'unread_only') {
      parts.push('isRead eq false');
    } else if (unreadFilter === 'read_only') {
      parts.push('isRead eq true');
    }
    if (attachmentFilter === 'require_attachments') {
      parts.push('hasAttachments eq true');
    } else if (attachmentFilter === 'no_attachments') {
      parts.push('hasAttachments eq false');
    }
    effectiveFilter = parts.join(' and ');
  }

  // Seed seenItemIds from persistent watermark cache
  const initialWatermarks = getPersistentWatermark(nodeId);
  const seenItemIds = new Set(initialWatermarks);

  const watcherState = {
    nodeId,
    stream,
    intervalSeconds,
    maxBatchSize,
    requiredTool,
    disabledTools,
    unreadFilter,
    attachmentFilter,
    effectiveFilter,
    autoMarkAsRead,
    seenItemIds,
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
      const outlookServer = (registered || []).find(s => identifyMcpService(s) === 'outlook');

      let rawItems = [];

      if (outlookServer && outlookServer.config?.token) {
        try {
          if (stream === 'inbox' || stream === 'sentitems' || stream === 'drafts') {
            const folderName = stream === 'sentitems' ? 'sentitems' : (stream === 'drafts' ? 'drafts' : 'inbox');
            const pollArgs = {
              folder: folderName,
              limit: Math.min(50, maxBatchSize || 25),
              expandAttachments: true
            };
            if (effectiveFilter) pollArgs.filter = effectiveFilter;
            if (search) pollArgs.search = search;

            const res = await executeRealMcpTool(outlookServer, 'list_messages', pollArgs, { disabledTools: watcherState.disabledTools });
            if (res && Array.isArray(res.value)) {
              rawItems = res.value;
            }
          } else if (stream === 'calendar') {
            const res = await executeRealMcpTool(outlookServer, 'list_events', {
              limit: Math.min(50, maxBatchSize || 25)
            }, { disabledTools: watcherState.disabledTools });
            if (res && Array.isArray(res.value)) {
              rawItems = res.value;
            }
          } else if (stream === 'tasks') {
            const res = await executeRealMcpTool(outlookServer, 'list_tasks', {
              limit: Math.min(50, maxBatchSize || 25)
            }, { disabledTools: watcherState.disabledTools });
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

      if (newItems.length === 0) {
        // Idle check: Zero tokens consumed, zero downstream events fired
        return;
      }

      // Sort chronologically: oldest unread first up to latest
      newItems.sort((a, b) => new Date(a.receivedDateTime || 0) - new Date(b.receivedDateTime || 0));

      // DISCRETE QUEUE FAN-OUT:
      // If N items arrive in this interval, dispatch each one independently so downstream
      // agents and tabular sinks process them as N individual rows without mixing or jumbling!
      for (let idx = 0; idx < newItems.length; idx++) {
        const item = newItems[idx];
        seenItemIds.add(item.id);
        recordProcessedMessage(nodeId, item.id);
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
            hasAttachments: Boolean(item.hasAttachments || (item.attachments && item.attachments.length > 0)),
            attachmentsCount: item.attachments?.length || 0,
            attachments: Array.isArray(item.attachments) ? item.attachments.map(att => ({
              id: att.id,
              name: att.name,
              contentType: att.contentType,
              sizeBytes: att.size,
              isInline: Boolean(att.isInline)
            })) : [],
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

        // Auto-mark email as read on remote Microsoft Graph API if enabled and capability is permitted
        if (autoMarkAsRead && outlookServer && outlookServer.config?.token && (stream === 'inbox' || stream === 'sentitems' || stream === 'drafts')) {
          try {
            await executeRealMcpTool(outlookServer, 'mark_as_read', { messageId: item.id }, { disabledTools: watcherState.disabledTools });
          } catch (markErr) {
            console.warn(`[Auto-mark-as-read Notice]: ${markErr.message}`);
          }
        }

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
      // Real Trigger Ingress: Check if connected to an active MCP with live credentials (e.g. Microsoft 365 Outlook)
      let mcpLiveItem = null;
      try {
        const creds = getStoredMicrosoftOAuthCredentials();
        const mcpNode = (nodes || []).find(n => (n.data?.name || '').toLowerCase().includes('outlook') || n.data?.serviceName === 'Outlook');
        const token = mcpNode?.data?.config?.token || creds?.accessToken;
        if (token) {
          const cfg = triggerNode.data?.config || triggerNode.data || {};
          const stream = cfg.streamType || 'inbox';
          const folder = stream === 'sentitems' ? 'sentitems' : (stream === 'drafts' ? 'drafts' : 'inbox');
          const unreadFilter = cfg.unreadFilter || (cfg.unreadOnly ? 'unread_only' : 'all');
          const attachmentFilter = cfg.attachmentFilter || 'any';

          const parts = [];
          if (unreadFilter === 'unread_only') parts.push('isRead eq false');
          else if (unreadFilter === 'read_only') parts.push('isRead eq true');
          if (attachmentFilter === 'require_attachments') parts.push('hasAttachments eq true');
          else if (attachmentFilter === 'no_attachments') parts.push('hasAttachments eq false');
          const liveFilter = parts.join(' and ');

          const isMailStream = stream === 'inbox' || stream === 'sentitems' || stream === 'drafts';
          const toolToCall = (stream === 'calendar') ? 'list_events' :
                             (stream === 'tasks') ? 'list_tasks' :
                             (stream === 'contacts') ? 'list_contacts' : 'list_messages';

          const maxBatch = cfg.maxBatchSize || triggerNode.data?.maxBatchSize || 25;
          const callArgs = {
            limit: Math.min(50, maxBatch),
            expandAttachments: true
          };
          if (isMailStream) callArgs.folder = folder;
          if (liveFilter) callArgs.filter = liveFilter;

          const liveResult = await executeRealMcpTool({
            toolName: toolToCall,
            server: { transport: 'outlook-api', config: { token } },
            args: callArgs
          });
          const rawItems = liveResult?.value || liveResult?.messages || liveResult?.events || [];

          // Filter out already processed items using persistent watermark cache
          const seenWatermark = new Set(getPersistentWatermark(triggerId));
          const unreadItems = rawItems.filter(item => item && item.id && !seenWatermark.has(item.id));

          // Sort chronologically: oldest unread first up to latest, so they process in order of arrival
          unreadItems.sort((a, b) => new Date(a.receivedDateTime || 0) - new Date(b.receivedDateTime || 0));

          if (unreadItems.length > 0) {
            const firstItem = unreadItems[0];
            mcpLiveItem = firstItem;

            // Record watermark for first item
            recordProcessedMessage(triggerId, firstItem.id);

            const autoMark = cfg.autoMarkAsRead !== false && triggerNode.data?.autoMarkAsRead !== false;
            if (autoMark && isMailStream) {
              executeRealMcpTool({
                toolName: 'mark_as_read',
                server: { transport: 'outlook-api', config: { token } },
                args: { messageId: firstItem.id }
              }).catch(err => console.warn('Auto-mark error:', err));
            }

            // If multiple unread emails arrived, enqueue remaining items (1..N-1) into the FIFO execution queue
            if (unreadItems.length > 1) {
              setTimeout(async () => {
                for (let idx = 1; idx < unreadItems.length; idx++) {
                  const item = unreadItems[idx];
                  const discretePayload = {
                    source: 'outlook_mcp_stream',
                    stream,
                    batchIndex: idx + 1,
                    batchTotal: unreadItems.length,
                    item: {
                      id: item.id,
                      subject: item.subject || `Notification #${item.id}`,
                      sender: item.from?.emailAddress?.address || item.from || 'sender@enterprise.corp',
                      receivedDateTime: item.receivedDateTime || item.sentDateTime || item.createdDateTime || new Date().toISOString(),
                      hasAttachments: Boolean(item.hasAttachments || (item.attachments && item.attachments.length > 0)),
                      attachmentsCount: item.attachments?.length || 0,
                      attachments: Array.isArray(item.attachments) ? item.attachments.map(att => ({
                        id: att.id,
                        name: att.name,
                        contentType: att.contentType,
                        sizeBytes: att.size,
                        isInline: Boolean(att.isInline)
                      })) : [],
                      bodyPreview: item.bodyPreview || item.body?.content || ''
                    }
                  };

                  recordProcessedMessage(triggerId, item.id);
                  if (autoMark && isMailStream) {
                    executeRealMcpTool({
                      toolName: 'mark_as_read',
                      server: { transport: 'outlook-api', config: { token } },
                      args: { messageId: item.id }
                    }).catch(err => console.warn('Auto-mark error:', err));
                  }

                  window.dispatchEvent(new CustomEvent('keaos:fire-trigger-node', {
                    detail: {
                      nodeId: triggerId,
                      triggerType: triggerNode.data?.triggerType || 'poll',
                      payloadText: JSON.stringify(discretePayload, null, 2),
                      batchIndex: idx + 1,
                      batchTotal: unreadItems.length,
                      stream
                    }
                  }));

                  // Brief yield between queueing
                  await new Promise(r => setTimeout(r, 100));
                }
              }, 60);
            }
          }
        }
      } catch (err) {
        console.warn('Live MCP poll check:', err);
      }

      if (mcpLiveItem) {
        parsedPayload = {
          source: 'outlook_mcp_stream',
          stream: triggerNode.data?.streamType || 'inbox',
          item: mcpLiveItem
        };
      } else {
        parsedPayload = {
          source: 'ingress_trigger',
          triggerId,
          triggerName,
          triggerType: triggerNode.data?.triggerType || 'manual',
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

  // Observable Step 1: Trigger Node Glows & Pulses on Canvas (Visual Parity with Workflow 1)
  window.dispatchEvent(new CustomEvent('keaos:set-execution-state', {
    detail: { 
      isExecuting: true, 
      nodeId: triggerId, 
      pillarType: 'gateway',
      step: `⚡ Ingress Trigger Fired: "${triggerName}"` 
    }
  }));

  // Pulse outgoing canvas wires
  window.dispatchEvent(new CustomEvent('keaos:trigger-pulse', {
    detail: { triggerId, targetNodeIds }
  }));

  // Visual pacing window so human eye clearly sees the trigger activate
  await new Promise(r => setTimeout(r, 380));

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

    window.dispatchEvent(new CustomEvent('keaos:set-execution-state', {
      detail: { isExecuting: false, step: 'Complete' }
    }));

    return {
      success: true,
      orphaned: true,
      targetsCount: 0,
      payloadHash,
      message: 'Trigger fired successfully, but no active downstream nodes are connected.'
    };
  }

  const results = [];

  // 5. Fan-out execution to all connected targets with visible sequential progression
  for (const target of targetNodes) {
    // TARGET A: Deterministic Box (Zero-token logic execution)
    if (target.type === 'deterministicNode') {
      // Highlight the active Deterministic node on canvas!
      window.dispatchEvent(new CustomEvent('keaos:set-execution-state', {
        detail: { 
          isExecuting: true, 
          nodeId: target.id, 
          step: `Executing Deterministic Logic Box: "${target.data?.name || 'Schema Normalizer'}"` 
        }
      }));

      window.dispatchEvent(new CustomEvent('keaos:deterministic-executing', {
        detail: { nodeId: target.id, isRunning: true }
      }));

      // Observable visual pacing
      await new Promise(r => setTimeout(r, 360));

      try {
        const promptDirective = target.data?.prompt || target.data?.ruleSummary || 'Trigger Ingress Processing';
        const detResult = await executeDeterministicTask({
          nodeId: target.id,
          code: target.data?.code,
          language: target.data?.language || 'auto',
          inputData: parsedPayload,
          inputs: parsedPayload,
          prompt: promptDirective,
          ruleSummary: promptDirective
        });

        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: {
            nodeId: target.id,
            success: detResult.success,
            output: detResult.output,
            tableData: detResult.tableData,
            latencyMs: detResult.latencyMs,
            ruleSummary: promptDirective
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
      let formattedContext = typeof parsedPayload === 'string'
        ? parsedPayload
        : (parsedPayload.transcript || parsedPayload.text || parsedPayload.data || JSON.stringify(parsedPayload, null, 2));

      // Preserve natural language ingress criteria or directive if specified on trigger node
      const triggerDirective = triggerNode.data?.directive || triggerNode.data?.prompt || triggerNode.data?.naturalLanguagePrompt;
      if (triggerDirective && typeof triggerDirective === 'string' && triggerDirective.trim()) {
        formattedContext = `[TRIGGER DIRECTIVE / RELEVANCE CRITERIA]:\n"${triggerDirective.trim()}"\n\n[INGESTED STREAM PAYLOAD]:\n${formattedContext}`;
      }

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
    else if (target.type === 'outputNode' || target.type === 'outputNodeV2') {
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
        targetType: target.type,
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
