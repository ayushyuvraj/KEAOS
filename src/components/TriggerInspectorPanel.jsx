import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Clock, 
  Webhook, 
  FolderDown, 
  RefreshCw, 
  Activity, 
  Play, 
  Copy, 
  Check, 
  Calendar, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Layers,
  Save
} from 'lucide-react';
import { 
  armScheduleTrigger, 
  disarmScheduleTrigger, 
  getScheduleStatus, 
  processFileForTrigger, 
  armPollingWatcher, 
  disarmPollingWatcher,
  armOutlookStreamWatcher,
  disarmOutlookStreamWatcher
} from '../services/triggerEngine';
import { 
  executeRealMcpTool, 
  getStoredMicrosoftOAuthCredentials 
} from '../services/mcpClientService';
import { OUTLOOK_OFFICIAL_ACTIONS } from '../constants/mcpOfficialCatalogs';

export default function TriggerInspectorPanel({
  selectedNode,
  nodes = [],
  edges = [],
  onUpdateNodeData,
  isDarkMode = true,
  t
}) {
  if (!selectedNode || selectedNode.type !== 'triggerNode') return null;

  const nodeData = selectedNode.data || {};
  const triggerType = nodeData.triggerType || 'manual';
  const triggerConfig = nodeData.config || {};

  // Copy feedback states
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Schedule timer state
  const [scheduleMode, setScheduleMode] = useState(triggerConfig.scheduleMode || 'datetime');
  const [scheduledTime, setScheduledTime] = useState(triggerConfig.scheduledTime || '');
  const [intervalSeconds, setIntervalSeconds] = useState(triggerConfig.intervalSeconds || 15);
  const [countdown, setCountdown] = useState(null);
  const [isArmed, setIsArmed] = useState(Boolean(triggerConfig.isArmed));

  // Polling state
  const [pollInterval, setPollInterval] = useState(triggerConfig.pollIntervalSeconds || 30);
  const [pollEndpoint, setPollEndpoint] = useState(triggerConfig.endpointUrl || 'https://api.example.com/v1/status');
  const [pollWatermark, setPollWatermark] = useState(triggerConfig.deduplicateWatermark !== false);
  const [isPollingActive, setIsPollingActive] = useState(Boolean(triggerConfig.isPollingActive));

  // MCP Stream & Zero-Trust Gateway Ingress state
  const defaultSubMode = triggerConfig.pollSubMode || 
    (nodeData?.name?.toLowerCase().includes('outlook') ? 'stream' : 
     (triggerConfig.endpointUrl || triggerType === 'poll' ? 'rest' : 'stream'));
  const [pollSubMode, setPollSubMode] = useState(defaultSubMode); // 'stream' | 'rest'
  const [streamType, setStreamType] = useState(triggerConfig.streamType || 'inbox'); // 'inbox' | 'sentitems' | 'calendar' | 'tasks' | 'contacts'
  const [batchMode, setBatchMode] = useState(triggerConfig.batchMode !== false);
  const [maxBatchSize, setMaxBatchSize] = useState(triggerConfig.maxBatchSize || 25);
  const [isSimulatingBatch, setIsSimulatingBatch] = useState(false);
  const [isSavingPolling, setIsSavingPolling] = useState(false);
  const [savePollingSuccess, setSavePollingSuccess] = useState(false);

  // Derive Gateway Zero-Trust permissions & connected MCP active state
  const gatewayNode = (nodes || []).find(n => n.type === 'pillar' && n.data?.pillarType === 'gateway') ||
                      (nodes || []).find(n => n.data?.gatewayType === 'mcp-egress');
  const disabledTools = Array.isArray(gatewayNode?.data?.disabledTools) 
    ? gatewayNode.data.disabledTools 
    : (Array.isArray(gatewayNode?.disabledTools) ? gatewayNode.disabledTools : []);

  const outlookMcpNode = (nodes || []).find(n => 
    n.type === 'pillar' && n.data?.pillarType === 'mcp' && 
    (n.data?.serviceName === 'Outlook' || n.data?.name?.toLowerCase().includes('outlook'))
  );
  const isMcpDeactivated = Boolean(outlookMcpNode?.data?.isDeactivated);
  const isGatewayDeactivated = Boolean(gatewayNode?.data?.isDeactivated);
  const isUnavailable = isMcpDeactivated || isGatewayDeactivated;

  const totalOutlookCount = OUTLOOK_OFFICIAL_ACTIONS.length;
  const blockedOutlookCount = isUnavailable 
    ? totalOutlookCount 
    : OUTLOOK_OFFICIAL_ACTIONS.filter(t => disabledTools.includes(t.name)).length;
  const permittedOutlookCount = isUnavailable ? 0 : totalOutlookCount - blockedOutlookCount;

  // Stream capability permissions governed by Gateway & MCP active state
  const isInboxPermitted = !isUnavailable && !disabledTools.includes('list_messages');
  const isSentItemsPermitted = !isUnavailable && !disabledTools.includes('list_messages');
  const isCalendarPermitted = !isUnavailable && !disabledTools.includes('list_events');
  const isTasksPermitted = !isUnavailable && !disabledTools.includes('list_tasks');
  const isContactsPermitted = !isUnavailable && !disabledTools.includes('list_contacts');

  // File Watcher state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // A2A Event Bus state
  const [eventTopic, setEventTopic] = useState(triggerConfig.topic || 'incident.sev1.raised');

  // Discover connected downstream target nodes
  const connectedTargets = (edges || [])
    .filter(e => e.source === selectedNode.id)
    .map(e => nodes.find(n => n.id === e.target))
    .filter(Boolean);

  // Listen for schedule countdown ticks from triggerEngine
  useEffect(() => {
    const handleScheduleTick = (e) => {
      if (e.detail?.nodeId === selectedNode.id) {
        setCountdown(e.detail.remainingSeconds);
        setIsArmed(Boolean(e.detail.isArmed));
      }
    };
    window.addEventListener('keaos:schedule-tick', handleScheduleTick);
    return () => window.removeEventListener('keaos:schedule-tick', handleScheduleTick);
  }, [selectedNode.id]);

  // Sync initial schedule status on mount/selection
  useEffect(() => {
    const status = getScheduleStatus(selectedNode.id);
    setIsArmed(status.isArmed);
    setCountdown(status.remainingSeconds);
  }, [selectedNode.id]);

  // Synchronize local poller state when node configuration changes or node is switched
  useEffect(() => {
    const cfg = selectedNode?.data?.config || {};
    if (cfg.pollSubMode) {
      setPollSubMode(cfg.pollSubMode);
    } else {
      const derived = (selectedNode?.data?.name?.toLowerCase().includes('outlook')) ? 'stream' : 
                      (cfg.endpointUrl || triggerType === 'poll' ? 'rest' : 'stream');
      setPollSubMode(derived);
    }
    if (cfg.endpointUrl !== undefined) setPollEndpoint(cfg.endpointUrl);
    if (cfg.pollIntervalSeconds !== undefined) setPollInterval(cfg.pollIntervalSeconds);
    if (cfg.deduplicateWatermark !== undefined) setPollWatermark(cfg.deduplicateWatermark);
    if (cfg.streamType) setStreamType(cfg.streamType);
    if (cfg.batchMode !== undefined) setBatchMode(cfg.batchMode);
    if (cfg.maxBatchSize !== undefined) setMaxBatchSize(cfg.maxBatchSize);
    if (cfg.isPollingActive !== undefined) setIsPollingActive(Boolean(cfg.isPollingActive));
  }, [selectedNode?.id, selectedNode?.data?.config, triggerType]);

  // Dispatch fire trigger event
  const fireTrigger = (payloadTextOverride = null) => {
    window.dispatchEvent(new CustomEvent('keaos:fire-trigger-node', {
      detail: {
        nodeId: selectedNode.id,
        triggerType,
        payloadText: payloadTextOverride || nodeData.payloadText
      }
    }));
  };

  // --- SCHEDULE HANDLERS ---
  const handleArmDatetime = (customIso = null) => {
    const targetIso = customIso || scheduledTime;
    let targetTimestamp = targetIso ? new Date(targetIso).getTime() : Date.now() + 10000;
    if (isNaN(targetTimestamp) || targetTimestamp <= Date.now()) {
      targetTimestamp = Date.now() + 10000;
    }

    const isoString = new Date(targetTimestamp).toISOString();
    setScheduledTime(isoString.slice(0, 16));

    onUpdateNodeData(selectedNode.id, {
      config: {
        ...triggerConfig,
        isArmed: true,
        scheduleMode: 'datetime',
        scheduledTime: isoString,
        targetTimestamp
      }
    });

    armScheduleTrigger(selectedNode.id, {
      runAtTimestamp: targetTimestamp,
      isRecurring: false,
      payloadText: nodeData.payloadText
    });
  };

  const handleArmInterval = (seconds = null) => {
    const sec = seconds || intervalSeconds || 15;
    setIntervalSeconds(sec);

    onUpdateNodeData(selectedNode.id, {
      config: {
        ...triggerConfig,
        isArmed: true,
        scheduleMode: 'interval',
        intervalSeconds: sec
      }
    });

    armScheduleTrigger(selectedNode.id, {
      intervalSeconds: sec,
      isRecurring: true,
      payloadText: nodeData.payloadText
    });
  };

  const handleDisarmSchedule = () => {
    disarmScheduleTrigger(selectedNode.id);
    setIsArmed(false);
    setCountdown(null);

    onUpdateNodeData(selectedNode.id, {
      config: {
        ...triggerConfig,
        isArmed: false
      }
    });
  };

  const handleSchedulePreset = (offsetSeconds) => {
    const targetTimestamp = Date.now() + (offsetSeconds * 1000);
    const dateObj = new Date(targetTimestamp);
    // Format for datetime-local (YYYY-MM-DDTHH:mm)
    const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setScheduledTime(localIso);
    handleArmDatetime(localIso);
  };

  // --- WEBHOOK HANDLERS ---
  const webhookUrl = `https://api.keaos.studio/v1/ingress/wh_live_${selectedNode.id}`;
  const webhookSecret = `whsec_${selectedNode.id.replace(/[^a-zA-Z0-9]/g, '')}_key`;
  const curlSnippet = `curl -X POST "${webhookUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-keaos-secret: ${webhookSecret}" \\\n  -d '{"event":"customer.created","id":"cust_9021","status":"ACTIVE"}'`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else if (type === 'curl') {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleSimulateWebhook = () => {
    let webhookPayload = null;
    if (payloadText && payloadText.trim()) {
      try {
        webhookPayload = JSON.parse(payloadText);
      } catch {
        webhookPayload = { text: payloadText.trim() };
      }
    } else {
      webhookPayload = {
        event: 'ingress.webhook.received',
        id: `whk_${Date.now()}`,
        timestamp: new Date().toISOString(),
        headers: { 'content-type': 'application/json' },
        source: 'external_webhook'
      };
    }
    fireTrigger(JSON.stringify(webhookPayload, null, 2));
  };

  // --- FILE WATCHER HANDLERS ---

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      try {
        const filePayload = await processFileForTrigger(files[0]);
        const payloadString = JSON.stringify(filePayload, null, 2);
        onUpdateNodeData(selectedNode.id, { payloadText: payloadString });
        fireTrigger(payloadString);
      } catch (err) {
        console.error('File parsing error:', err);
      }
    }
  };

  const handleBrowseFile = async (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      try {
        const filePayload = await processFileForTrigger(files[0]);
        const payloadString = JSON.stringify(filePayload, null, 2);
        onUpdateNodeData(selectedNode.id, { payloadText: payloadString });
        fireTrigger(payloadString);
      } catch (err) {
        console.error('File selection error:', err);
      }
    }
  };

  // --- POLLING HANDLERS ---
  const handleTogglePolling = () => {
    if (isPollingActive) {
      disarmPollingWatcher(selectedNode.id);
      disarmOutlookStreamWatcher(selectedNode.id);
      setIsPollingActive(false);
      onUpdateNodeData(selectedNode.id, { config: { ...triggerConfig, isPollingActive: false } });
    } else {
      if (pollSubMode === 'stream') {
        try {
          armOutlookStreamWatcher(selectedNode.id, {
            stream: streamType,
            intervalSeconds: pollInterval,
            maxBatchSize,
            disabledTools
          });
          setIsPollingActive(true);
          onUpdateNodeData(selectedNode.id, {
            config: {
              ...triggerConfig,
              isPollingActive: true,
              pollSubMode: 'stream',
              streamType,
              pollIntervalSeconds: pollInterval,
              maxBatchSize
            }
          });
        } catch (err) {
          alert(`❌ ${err.message}`);
        }
      } else {
        armPollingWatcher(selectedNode.id, {
          endpointUrl: pollEndpoint,
          intervalSeconds: pollInterval,
          deduplicate: pollWatermark,
          payloadText: nodeData.payloadText
        });
        setIsPollingActive(true);
        onUpdateNodeData(selectedNode.id, {
          config: {
            ...triggerConfig,
            isPollingActive: true,
            pollSubMode: 'rest',
            endpointUrl: pollEndpoint,
            pollIntervalSeconds: pollInterval
          }
        });
      }
    }
  };

  const updateTriggerConfig = (updates) => {
    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, {
        config: {
          ...triggerConfig,
          ...updates
        }
      });
    }
  };

  const handleSaveAndEnforcePolling = () => {
    setIsSavingPolling(true);
    const updatedConfig = {
      ...triggerConfig,
      pollSubMode,
      pollIntervalSeconds: pollInterval,
      endpointUrl: pollEndpoint,
      deduplicateWatermark: pollWatermark,
      streamType,
      batchMode,
      maxBatchSize
    };

    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, {
        config: updatedConfig
      });
    }

    // If polling is currently active, live-enforce & re-arm immediately with updated options
    if (isPollingActive) {
      if (pollSubMode === 'stream') {
        disarmPollingWatcher(selectedNode.id);
        try {
          armOutlookStreamWatcher(selectedNode.id, {
            stream: streamType,
            intervalSeconds: pollInterval,
            maxBatchSize,
            disabledTools
          });
        } catch (err) {
          console.warn('Failed to re-arm stream watcher:', err);
        }
      } else {
        disarmOutlookStreamWatcher(selectedNode.id);
        armPollingWatcher(selectedNode.id, {
          endpointUrl: pollEndpoint,
          intervalSeconds: pollInterval,
          deduplicate: pollWatermark,
          payloadText: nodeData.payloadText
        });
      }
    }

    setSavePollingSuccess(true);
    setTimeout(() => {
      setSavePollingSuccess(false);
      setIsSavingPolling(false);
    }, 2000);
  };

  const handlePollOnceTest = async () => {
    let resultPayload = null;
    const startTime = performance.now();
    if (pollEndpoint && pollEndpoint.startsWith('http')) {
      try {
        const res = await fetch(pollEndpoint);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch { json = { body: text }; }
        resultPayload = {
          source: 'api_polling_watcher',
          endpoint: pollEndpoint,
          status: res.status,
          ok: res.ok,
          latencyMs: Math.round(performance.now() - startTime),
          checkedAt: new Date().toISOString(),
          data: json
        };
      } catch (err) {
        resultPayload = {
          source: 'api_polling_watcher',
          endpoint: pollEndpoint,
          status: 'FETCH_ERROR',
          error: err.message,
          latencyMs: Math.round(performance.now() - startTime),
          checkedAt: new Date().toISOString()
        };
      }
    } else if (payloadText && payloadText.trim()) {
      try {
        resultPayload = JSON.parse(payloadText);
      } catch {
        resultPayload = { text: payloadText.trim(), timestamp: new Date().toISOString() };
      }
    } else {
      resultPayload = {
        source: 'api_polling_watcher',
        endpoint: pollEndpoint || 'local_stream',
        checkedAt: new Date().toISOString(),
        status: 'DISPATCHED'
      };
    }
    fireTrigger(JSON.stringify(resultPayload, null, 2));
  };

  // Queries live stream items from real connected MCP server or user configured payload
  // Dispatches each discrete item independently so downstream nodes append separate rows without jumbling
  const handlePollBatchTest = async () => {
    setIsSimulatingBatch(true);
    try {
      let realBatch = [];
      const creds = getStoredMicrosoftOAuthCredentials();
      const mcpNode = (nodes || []).find(n => (n.data?.name || '').toLowerCase().includes('outlook') || n.data?.serviceName === 'Outlook');
      const token = mcpNode?.data?.config?.token || creds?.accessToken;

      if (token) {
        try {
          const liveResult = await executeRealMcpTool({
            toolName: 'list_messages',
            server: { transport: 'outlook-api', config: { token } },
            args: { limit: maxBatchSize || 5 }
          });
          const items = liveResult?.value || liveResult?.messages || [];
          if (Array.isArray(items) && items.length > 0) {
            realBatch = items;
          }
        } catch (mcpErr) {
          console.warn('Real MCP fetch in inspector:', mcpErr);
        }
      }

      if (realBatch.length === 0 && payloadText && payloadText.trim()) {
        try {
          const parsed = JSON.parse(payloadText);
          realBatch = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          realBatch = [{ text: payloadText.trim(), timestamp: new Date().toISOString() }];
        }
      }

      if (realBatch.length === 0) {
        realBatch = [{
          id: `msg_${Date.now()}`,
          stream: streamType,
          timestamp: new Date().toISOString(),
          status: 'STREAM_VERIFIED'
        }];
      }

      for (let i = 0; i < realBatch.length; i++) {
        const msg = realBatch[i];
        const discretePayload = {
          source: 'outlook_mcp_stream',
          stream: streamType,
          batchIndex: i + 1,
          batchTotal: realBatch.length,
          item: msg
        };

        fireTrigger(JSON.stringify(discretePayload, null, 2));

        window.dispatchEvent(new CustomEvent('keaos:output-append-run', {
          detail: {
            output: JSON.stringify(discretePayload, null, 2),
            payload: msg,
            tableData: typeof msg === 'object' ? msg : { raw: msg },
            sourceNodeType: 'outlook_mcp_stream',
            sourceNodeId: selectedNode.id,
            sourceNodeName: selectedNode.data?.name || 'Outlook Ingress Watcher'
          }
        }));

        if (i < realBatch.length - 1) {
          await new Promise(r => setTimeout(r, 450));
        }
      }
    } catch (err) {
      console.error('Batch stream poll error:', err);
    } finally {
      setIsSimulatingBatch(false);
    }
  };

  // --- A2A EVENT BUS HANDLERS ---
  const handlePublishEventTest = () => {
    const eventPayload = {
      source: 'a2a_event_bus',
      topic: eventTopic,
      eventId: `ev_${Date.now()}`,
      timestamp: new Date().toISOString(),
      payload: {
        severity: eventTopic.includes('sev1') ? 'CRITICAL' : 'INFO',
        service: 'payment-clearing-engine',
        actor: 'Autonomous Audit Agent'
      }
    };
    fireTrigger(JSON.stringify(eventPayload, null, 2));
  };

  return (
    <div className={`p-4 ${t.card} rounded-none border space-y-4`}>
      {/* 1. Header & Live Indicator */}
      <div className={`flex items-center justify-between pb-2 border-b ${isDarkMode ? 'border-slate-700/40' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          {triggerType === 'manual' && <Play className="w-4 h-4 text-[#00A3A6]" />}
          {triggerType === 'schedule' && <Clock className="w-4 h-4 text-[#0091DA]" />}
          {triggerType === 'webhook' && <Webhook className="w-4 h-4 text-[#00A3A6]" />}
          {triggerType === 'file' && <FolderDown className="w-4 h-4 text-[#483698]" />}
          {triggerType === 'poll' && <RefreshCw className="w-4 h-4 text-[#009A44]" />}
          {triggerType === 'event' && <Activity className="w-4 h-4 text-[#6D2077]" />}
          
          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {triggerType === 'manual' && 'Manual Start Ignition'}
            {triggerType === 'schedule' && 'Schedule & Time Ignition'}
            {triggerType === 'webhook' && 'Universal Webhook Ingress'}
            {triggerType === 'file' && 'File & Media Watcher'}
            {triggerType === 'poll' && 'API Polling Watcher'}
            {triggerType === 'event' && 'A2A Event Bus Listener'}
          </span>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 bg-[#00A3A6]/10 text-[#00A3A6] border-[#00A3A6]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A3A6] animate-pulse" />
          {connectedTargets.length} Target{connectedTargets.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* 2. Connected Downstream Execution Targets */}
      <div className="space-y-1.5">
        <span className={`text-[10px] font-mono uppercase tracking-wider ${t.subText}`}>
          Connected Execution Targets
        </span>
        {connectedTargets.length > 0 ? (
          <div className="space-y-1">
            {connectedTargets.map(tgt => (
              <div 
                key={tgt.id} 
                className={`flex items-center justify-between p-2 rounded-none ${t.subCard} border ${t.border} text-xs font-mono`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowRight className="w-3 h-3 text-[#0091DA] shrink-0" />
                  <span className={`font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {tgt.data?.name || tgt.data?.title || tgt.id}
                  </span>
                </div>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded-none bg-[#00A3A6]/15 text-[#00A3A6] border border-[#00A3A6]/30 font-semibold shrink-0">
                  {tgt.type === 'deterministicNode' ? '⚡ Deterministic' : '🤖 Agent Core'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-[11px] italic p-2.5 border rounded-none leading-relaxed ${
            isDarkMode ? 'text-slate-400 bg-slate-800/20 border-slate-700/30' : 'text-slate-600 bg-slate-50 border-slate-200'
          }`}>
            Not connected to any downstream nodes. Drag from the right diamond socket into an AI Agent Core or Deterministic Box.
          </div>
        )}
      </div>

      {/* 3. TYPE-SPECIFIC CONFIGURATION PANELS */}

      {/* --- A. SCHEDULE & TIME / CRON TRIGGER --- */}
      {triggerType === 'schedule' && (
        <div className="space-y-3 pt-1">
          {/* Active Countdown Banner if Armed */}
          {isArmed && countdown !== null && (
            <div className="p-3 bg-[#0091DA]/15 border border-[#0091DA]/40 rounded-none flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0091DA] animate-ping" />
                <span className="text-xs font-mono text-[#0091DA] font-semibold">
                  Ticking Countdown:
                </span>
              </div>
              <span className="text-sm font-mono font-bold text-white bg-[#0091DA]/40 px-2.5 py-0.5 rounded-none border border-[#0091DA]/50">
                {countdown}s remaining
              </span>
            </div>
          )}

          {/* Mode Selector */}
          <div className={`flex border rounded-none overflow-hidden text-xs font-mono ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
            <button
              type="button"
              onClick={() => setScheduleMode('datetime')}
              className={`flex-1 py-1.5 text-center transition-all ${
                scheduleMode === 'datetime' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Exact Date & Time
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('interval')}
              className={`flex-1 py-1.5 text-center transition-all ${
                scheduleMode === 'interval' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Recurring Interval
            </button>
          </div>

          {/* Exact Date & Time Mode */}
          {scheduleMode === 'datetime' ? (
            <div className="space-y-2">
              <label className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Target Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={`w-full p-2 text-xs font-mono rounded-none ${t.input}`}
              />

              {/* Zero-Cognitive Load Quick Presets */}
              <div className="space-y-1 pt-1">
                <span className={`text-[9.5px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Quick 1-Click Presets:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: '⏱️ In 10s (Test)', sec: 10 },
                    { label: '⏱️ In 1 Minute', sec: 60 },
                    { label: '⏱️ In 15 Minutes', sec: 900 },
                    { label: '⏱️ In 1 Hour', sec: 3600 }
                  ].map(preset => (
                    <button
                      key={preset.sec}
                      type="button"
                      onClick={() => handleSchedulePreset(preset.sec)}
                      className={`py-1 px-2 text-[10px] font-mono border rounded-none transition-all text-left truncate ${
                        isDarkMode 
                          ? 'bg-slate-800 hover:bg-[#00338D] text-slate-200 hover:text-white border-slate-700' 
                          : 'bg-slate-100 hover:bg-[#00338D] text-slate-700 hover:text-white border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Arm / Disarm Datetime Schedule */}
              <div className="pt-2">
                {isArmed ? (
                  <button
                    type="button"
                    onClick={handleDisarmSchedule}
                    className="w-full py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-mono text-xs font-semibold rounded-none transition-all cursor-pointer"
                  >
                    Cancel Scheduled Countdown
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleArmDatetime()}
                    className="w-full py-2 px-3 bg-[#00338D] hover:bg-[#005EB8] text-white font-mono text-xs font-semibold rounded-none transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Arm & Start Countdown</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Recurring Interval Mode */
            <div className="space-y-2">
              <label className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Repeat Interval Presets
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Every 10s (Test)', sec: 10 },
                  { label: 'Every 1 min', sec: 60 },
                  { label: 'Every 5 min', sec: 300 },
                  { label: 'Every 15 min', sec: 900 }
                ].map(p => (
                  <button
                    key={p.sec}
                    type="button"
                    onClick={() => {
                      setIntervalSeconds(p.sec);
                      handleArmInterval(p.sec);
                    }}
                    className={`py-1.5 px-2 text-[10.5px] font-mono border rounded-none transition-all text-left truncate ${
                      intervalSeconds === p.sec && isArmed
                        ? 'bg-[#00338D] text-white border-blue-400 font-bold'
                        : isDarkMode
                          ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {intervalSeconds === p.sec && isArmed ? '✓ ' : ''}{p.label}
                  </button>
                ))}
              </div>

              {/* Disarm Button */}
              {isArmed && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDisarmSchedule}
                    className="w-full py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 font-mono text-xs font-semibold rounded-none transition-all cursor-pointer"
                  >
                    Stop Recurring Interval
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- B. UNIVERSAL WEBHOOK INGRESS --- */}
      {triggerType === 'webhook' && (
        <div className="space-y-3 pt-1">
          {/* Endpoint URL Card */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Ingress Endpoint URL</span>
              <span className="text-emerald-400 font-semibold">200 Fast ACK</span>
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className={`flex-1 p-2 text-[10.5px] font-mono rounded-none ${t.input} select-all`}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, 'url')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-none transition-all"
                title="Copy Webhook Endpoint URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Security Secret Header */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Header Signature Secret (x-keaos-secret)
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={webhookSecret}
                className={`flex-1 p-2 text-[10.5px] font-mono rounded-none ${t.input} select-all`}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookSecret, 'secret')}
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-none transition-all"
                title="Copy Webhook Secret"
              >
                {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Dispatch Ingress Webhook Test */}
          <button
            type="button"
            onClick={handleSimulateWebhook}
            className="w-full py-2 px-3 bg-[#00A3A6]/20 hover:bg-[#00A3A6]/30 text-[#00A3A6] border border-[#00A3A6]/40 font-mono text-xs font-semibold rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Dispatch Ingress Webhook Test</span>
          </button>

          {/* cURL Snippet */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                cURL Ingestion Command
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(curlSnippet, 'curl')}
                className="text-[10px] font-mono text-blue-400 hover:underline flex items-center gap-1"
              >
                {copiedCurl ? 'Copied ✓' : 'Copy cURL'}
              </button>
            </div>
            <pre className="p-2 text-[9.5px] font-mono bg-black/40 text-slate-300 border border-slate-800 rounded-none overflow-x-auto leading-relaxed">
              {curlSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* --- C. FILE / MEDIA WATCHER --- */}
      {triggerType === 'file' && (
        <div className="space-y-3 pt-1">
          {/* Tactile Ingestion Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`p-4 border-2 border-dashed rounded-none text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#483698] bg-[#483698]/20 text-white'
                : isDarkMode 
                  ? 'border-slate-700 bg-slate-800/30 hover:border-slate-500 text-slate-300' 
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400 text-slate-700'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleBrowseFile}
            />
            <FolderDown className="w-6 h-6 mx-auto mb-1 text-[#483698]" />
            <span className="text-xs font-mono font-semibold block">
              Drag & Drop file here or Browse
            </span>
            <span className={`text-[10px] font-mono block mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Supports PDF, CSV, TXT, JSON, MP3 audio
            </span>
          </div>
        </div>
      )}

      {/* --- D. API / MCP STREAM POLLING WATCHER --- */}
      {triggerType === 'poll' && (
        <div className="space-y-3 pt-1">
          {/* Sub-mode Tabs: Outlook Stream vs Generic REST */}
          <div className={`flex border rounded-none overflow-hidden text-xs font-mono ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
            <button
              type="button"
              onClick={() => {
                setPollSubMode('stream');
                updateTriggerConfig({ pollSubMode: 'stream' });
              }}
              className={`flex-1 py-1.5 text-center transition-all flex items-center justify-center gap-1.5 ${
                pollSubMode === 'stream' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Outlook Stream</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPollSubMode('rest');
                updateTriggerConfig({ pollSubMode: 'rest' });
              }}
              className={`flex-1 py-1.5 text-center transition-all flex items-center justify-center gap-1.5 ${
                pollSubMode === 'rest' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generic REST</span>
            </button>
          </div>

          {/* STREAM INGRESS MODE (GATEWAY GOVERNED) */}
          {pollSubMode === 'stream' ? (
            <div className="space-y-3">
              {/* Institutional Gateway Zero-Trust Enforcement Banner */}
              <div className={`p-2.5 rounded-none border text-xs font-mono flex items-center justify-between ${
                permittedOutlookCount === 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : blockedOutlookCount > 0 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                    : 'bg-[#009A44]/10 border-[#009A44]/30 text-emerald-300'
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${permittedOutlookCount === 0 ? 'text-rose-400' : 'text-[#00A3A6]'}`} />
                  <span className="font-semibold text-[11px]">
                    Gateway Policy: {permittedOutlookCount} / {totalOutlookCount} Capabilities Permitted
                    {isMcpDeactivated && ' (MCP Deactivated)'}
                  </span>
                </div>
                {blockedOutlookCount > 0 && (
                  <span className={`text-[9.5px] px-1.5 py-0.2 font-bold border ${
                    permittedOutlookCount === 0 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {blockedOutlookCount} Blocked
                  </span>
                )}
              </div>

              {/* Resource Stream Selector with Gateway Permission Locking */}
              <div className="space-y-1.5">
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Stream to Monitor (Strictly Gateway Governed)
                </span>
                <div className="space-y-1">
                  {[
                    { key: 'inbox', label: '📥 Inbox (Incoming Mail)', tool: 'list_messages', permitted: isInboxPermitted },
                    { key: 'sentitems', label: '📤 Sent Items (User & Auto-Generated)', tool: 'list_messages', permitted: isSentItemsPermitted },
                    { key: 'calendar', label: '📅 Calendar (Meeting Invites)', tool: 'list_events', permitted: isCalendarPermitted },
                    { key: 'tasks', label: '☑️ Tasks & To-Do Lists', tool: 'list_tasks', permitted: isTasksPermitted },
                    { key: 'contacts', label: '👥 Contacts Directory', tool: 'list_contacts', permitted: isContactsPermitted }
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      disabled={!s.permitted}
                      onClick={() => {
                        if (s.permitted) {
                          setStreamType(s.key);
                          updateTriggerConfig({ streamType: s.key });
                        }
                      }}
                      className={`w-full py-1.5 px-2.5 text-[10.5px] font-mono border rounded-none transition-all flex items-center justify-between text-left ${
                        !s.permitted
                          ? 'opacity-40 bg-slate-900 border-dashed border-slate-700 text-slate-500 cursor-not-allowed'
                          : streamType === s.key
                            ? 'bg-[#00338D] text-white border-[#0091DA] font-bold shadow-sm'
                            : isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                      }`}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="text-[9px] shrink-0 font-bold">
                        {isMcpDeactivated 
                          ? '🔒 MCP DEACTIVATED' 
                          : s.permitted 
                            ? (streamType === s.key ? '✓ ACTIVE' : 'PERMITTED') 
                            : '🔒 BLOCKED BY GATEWAY'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Polling Interval Presets */}
              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Scan Cadence (Zero Tokens When Idle)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Every 30s (Dev)', sec: 30 },
                    { label: 'Every 1 min', sec: 60 },
                    { label: 'Every 5 min', sec: 300 },
                    { label: 'Every 15 min', sec: 900 }
                  ].map(p => (
                    <button
                      key={p.sec}
                      type="button"
                      onClick={() => {
                        setPollInterval(p.sec);
                        updateTriggerConfig({ pollIntervalSeconds: p.sec });
                      }}
                      className={`py-1 px-2 text-[10.5px] font-mono border rounded-none transition-all text-left truncate ${
                        pollInterval === p.sec
                          ? 'bg-[#009A44] text-white border-emerald-400 font-bold'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {pollInterval === p.sec ? '✓ ' : ''}{p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discrete Multi-Email Batch Queue Setting */}
              <div className={`p-2 border rounded-none ${t.subCard} border ${t.border} space-y-1.5`}>
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => {
                      setBatchMode(e.target.checked);
                      updateTriggerConfig({ batchMode: e.target.checked });
                    }}
                    className="mt-0.5 rounded-none border-slate-700 text-[#009A44] focus:ring-0"
                  />
                  <div>
                    <span className={`text-xs font-mono font-bold block ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      Discrete Multi-Item Batch Queue
                    </span>
                    <span className={`text-[10px] font-mono leading-relaxed block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      When N emails arrive in a scan (e.g. 16 emails), process each independently as a separate row. Never mix or jumble items.
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleTogglePolling}
                  className={`w-full py-2 px-3 font-mono text-xs font-semibold rounded-none transition-all cursor-pointer ${
                    isPollingActive
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40'
                      : 'bg-[#009A44] hover:bg-[#008037] text-white'
                  }`}
                >
                  {isPollingActive ? '🛑 Disarm Stream Watcher' : '⚡ Arm Stream Watcher'}
                </button>

                <button
                  type="button"
                  disabled={isSimulatingBatch}
                  onClick={handlePollBatchTest}
                  className={`w-full py-2 px-3 border font-mono text-xs font-semibold rounded-none transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isSimulatingBatch
                      ? 'bg-[#00A3A6]/20 text-[#00A3A6] border-[#00A3A6] animate-pulse'
                      : isDarkMode
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                  title="Polls live messages from the connected MCP stream or configured payload"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isSimulatingBatch ? 'Polling Live Stream...' : 'Poll Live Ingress (Fetch Real Stream)'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* GENERIC REST POLLING MODE (EXISTING, 100% PRESERVED) */
            <div className="space-y-3">
              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Endpoint URL to Poll
                </span>
                <input
                  type="text"
                  value={pollEndpoint}
                  onChange={(e) => {
                    setPollEndpoint(e.target.value);
                    updateTriggerConfig({ endpointUrl: e.target.value });
                  }}
                  placeholder="https://api.example.com/v1/status"
                  className={`w-full p-2 text-xs font-mono rounded-none ${t.input}`}
                />
              </div>

              <div className="space-y-1">
                <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Polling Frequency
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: 'Every 10s (Test)', sec: 10 },
                    { label: 'Every 30s', sec: 30 },
                    { label: 'Every 1 min', sec: 60 },
                    { label: 'Every 5 min', sec: 300 }
                  ].map(p => (
                    <button
                      key={p.sec}
                      type="button"
                      onClick={() => {
                        setPollInterval(p.sec);
                        updateTriggerConfig({ pollIntervalSeconds: p.sec });
                      }}
                      className={`py-1 px-2 text-[10.5px] font-mono border rounded-none transition-all text-left truncate ${
                        pollInterval === p.sec
                          ? 'bg-[#009A44] text-white border-emerald-400 font-bold'
                          : isDarkMode
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {pollInterval === p.sec ? '✓ ' : ''}{p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watermark Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={pollWatermark}
                  onChange={(e) => {
                    setPollWatermark(e.target.checked);
                    updateTriggerConfig({ deduplicateWatermark: e.target.checked });
                  }}
                  className="rounded-none border-slate-700 text-[#009A44] focus:ring-0"
                />
                <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Only trigger downstream if SHA-256 fingerprint changes
                </span>
              </label>

              {/* Polling Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTogglePolling}
                  className={`py-2 px-3 font-mono text-xs font-semibold rounded-none transition-all cursor-pointer ${
                    isPollingActive
                      ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40'
                      : 'bg-[#009A44] hover:bg-[#008037] text-white'
                  }`}
                >
                  {isPollingActive ? 'Stop Poller' : 'Start Poller'}
                </button>
                <button
                  type="button"
                  onClick={handlePollOnceTest}
                  className={`py-2 px-3 border font-mono text-xs font-semibold rounded-none transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  Poll Once (Test)
                </button>
              </div>
            </div>
          )}

          {/* EXPLICIT SAVE & ENFORCE BUTTON (USER-REQUESTED) */}
          <div className="pt-2 border-t border-slate-700/50 space-y-1.5">
            <button
              type="button"
              onClick={handleSaveAndEnforcePolling}
              disabled={isSavingPolling}
              className={`w-full py-2.5 px-3 font-mono text-xs font-bold rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                savePollingSuccess
                  ? 'bg-[#009A44] hover:bg-[#008037] text-white border border-emerald-400'
                  : 'bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#005EB8] active:scale-98'
              }`}
              title="Saves configuration to canvas and live-enforces settings across active pollers"
            >
              {savePollingSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Configuration Saved & Enforced ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Enforce Options</span>
                </>
              )}
            </button>
            <div className={`flex items-center justify-between text-[10px] font-mono px-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Active Target: <strong className={pollSubMode === 'rest' ? 'text-emerald-400' : 'text-[#0091DA]'}>{pollSubMode === 'rest' ? 'Generic REST' : 'Outlook Stream'}</strong></span>
              <span>Cadence: Every {pollInterval}s</span>
            </div>
          </div>
        </div>
      )}

      {/* --- E. A2A EVENT BUS LISTENER --- */}
      {triggerType === 'event' && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Subscribed Event Topic
            </span>
            <input
              type="text"
              value={eventTopic}
              onChange={(e) => setEventTopic(e.target.value)}
              placeholder="e.g. incident.sev1.raised or *"
              className={`w-full p-2 text-xs font-mono rounded-none ${t.input}`}
            />
          </div>

          <div className="space-y-1">
            <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Enterprise Topic Presets:
            </span>
            <div className="space-y-1">
              {[
                'incident.sev1.raised',
                'invoice.audit.requested',
                'customer.churn.risk',
                'compliance.violation.detected',
                '*'
              ].map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setEventTopic(topic)}
                  className={`w-full py-1 px-2 text-[10px] font-mono border rounded-none transition-all text-left truncate ${
                    eventTopic === topic
                      ? 'bg-[#6D2077] text-white border-fuchsia-400 font-bold'
                      : isDarkMode
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {eventTopic === topic ? '✓ ' : ''}{topic}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handlePublishEventTest}
            className="w-full py-2 px-3 bg-[#6D2077] hover:bg-[#8A2B97] text-white font-mono text-xs font-semibold rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Emit Test Event to Topic</span>
          </button>
        </div>
      )}

      {/* 4. SHARED PAYLOAD EDITOR (JSON) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
        <label className={`text-[10px] font-mono uppercase tracking-wider ${t.label} block flex items-center justify-between`}>
          <span>Default Trigger Payload (JSON)</span>
          <span className="text-slate-500 lowercase font-normal">injected into downstream targets</span>
        </label>
        <textarea
          rows={3}
          value={nodeData.payloadText || '{\n  "source": "manual_dispatch",\n  "test": true\n}'}
          onChange={(e) => onUpdateNodeData(selectedNode.id, { payloadText: e.target.value })}
          placeholder="JSON trigger payload..."
          className={`w-full p-2.5 text-[10.5px] font-mono leading-relaxed rounded-none resize-none transition-all ${t.input}`}
        />
      </div>

      {/* 5. PRIMARY INSTANT EXECUTE BUTTON */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => fireTrigger()}
          className="w-full py-2.5 px-3 bg-[#00338D] hover:bg-[#005EB8] text-white font-mono font-bold text-xs rounded-none shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Fire Trigger Impulse Now</span>
        </button>
      </div>
    </div>
  );
}
