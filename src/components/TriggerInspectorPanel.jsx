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
  AlertCircle
} from 'lucide-react';
import { 
  armScheduleTrigger, 
  disarmScheduleTrigger, 
  getScheduleStatus, 
  processFileForTrigger, 
  armPollingWatcher, 
  disarmPollingWatcher 
} from '../services/triggerEngine';

// Quick Sample Datasets for Instant File Ingestion Testing
const SAMPLE_FILES = {
  invoice: {
    fileName: 'Enterprise_Invoice_INV-2026-9041.pdf',
    fileSize: 142850,
    fileType: 'application/pdf',
    content: JSON.stringify({
      invoiceId: 'INV-2026-9041',
      vendor: 'Institutional Cloud Infrastructure Ltd',
      amountDueUSD: 48500.00,
      paymentTerms: 'NET-30',
      lineItems: [
        { description: 'High-Concurrency Agent Runtime Cluster', qty: 4, unitPrice: 8500 },
        { description: 'Hardware Cryptographic HSM Vault Tier', qty: 1, unitPrice: 14500 }
      ],
      dueDate: '2026-11-15'
    }, null, 2)
  },
  transcript: {
    fileName: 'Executive_Board_Strategy_Review.txt',
    fileSize: 18400,
    fileType: 'text/plain',
    content: `[00:01:15] Chief Risk Officer: We need automated validation on all outbound LLM prompts.
[00:02:40] Head of Infrastructure: The new KEAOS deterministic pipeline handles mathematical calculations with 0 token spend.
[00:03:55] Action Item: Deploy cryptographically audited trigger pipeline before Friday.`
  },
  financials: {
    fileName: 'Q3_Enterprise_Portfolio_Reconciliation.csv',
    fileSize: 32100,
    fileType: 'text/csv',
    content: `TransactionId,AccountId,DebitUSD,CreditUSD,Status
TX-8801,ACC-CORP-01,125000.00,0.00,CLEARED
TX-8802,ACC-CORP-02,0.00,125000.00,CLEARED
TX-8803,ACC-ESCROW-09,45000.00,0.00,FLAGGED_AUDIT`
  }
};

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
    const simulatedWebhookPayload = {
      event: 'stripe.payment_intent.succeeded',
      id: `evt_test_${Date.now()}`,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `pi_live_${Date.now().toString().slice(-6)}`,
          amount: 45000,
          currency: 'usd',
          status: 'succeeded',
          customer_email: 'finance-director@enterprise-client.com'
        }
      }
    };
    fireTrigger(JSON.stringify(simulatedWebhookPayload, null, 2));
  };

  // --- FILE WATCHER HANDLERS ---
  const handleLoadSampleFile = (key) => {
    const sample = SAMPLE_FILES[key];
    if (!sample) return;
    const payload = {
      source: 'file_watcher_drop',
      fileName: sample.fileName,
      fileSize: sample.fileSize,
      fileType: sample.fileType,
      content: sample.content,
      ingestedAt: new Date().toISOString()
    };
    onUpdateNodeData(selectedNode.id, { payloadText: JSON.stringify(payload, null, 2) });
    fireTrigger(JSON.stringify(payload, null, 2));
  };

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
      setIsPollingActive(false);
      onUpdateNodeData(selectedNode.id, { config: { ...triggerConfig, isPollingActive: false } });
    } else {
      armPollingWatcher(selectedNode.id, {
        endpointUrl: pollEndpoint,
        intervalSeconds: pollInterval,
        deduplicate: pollWatermark,
        payloadText: nodeData.payloadText
      });
      setIsPollingActive(true);
      onUpdateNodeData(selectedNode.id, { config: { ...triggerConfig, isPollingActive: true, endpointUrl: pollEndpoint, pollIntervalSeconds: pollInterval } });
    }
  };

  const handlePollOnceTest = () => {
    const pollSamplePayload = {
      source: 'api_polling_watcher',
      endpoint: pollEndpoint,
      status: 'UP',
      latencyMs: Math.floor(Math.random() * 40) + 12,
      checkedAt: new Date().toISOString(),
      payload: {
        activeQueues: 3,
        systemHealth: 'OPTIMAL',
        unprocessedRecords: Math.floor(Math.random() * 15)
      }
    };
    fireTrigger(JSON.stringify(pollSamplePayload, null, 2));
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

          {/* Simulate Inbound Webhook Ping */}
          <button
            type="button"
            onClick={handleSimulateWebhook}
            className="w-full py-2 px-3 bg-[#00A3A6]/20 hover:bg-[#00A3A6]/30 text-[#00A3A6] border border-[#00A3A6]/40 font-mono text-xs font-semibold rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Simulate Inbound Webhook Ping</span>
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

          {/* Quick Sample File Presets */}
          <div className="space-y-1.5">
            <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Quick Test File Presets:
            </span>
            <div className="space-y-1">
              {[
                { key: 'invoice', label: '📄 Corporate Invoice (PDF)', size: '142 KB' },
                { key: 'transcript', label: '🎙️ Board Strategy Review (TXT)', size: '18 KB' },
                { key: 'financials', label: '📊 Reconciliation Ledger (CSV)', size: '32 KB' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleLoadSampleFile(f.key)}
                  className={`w-full py-1.5 px-2.5 text-[10.5px] font-mono border rounded-none transition-all flex items-center justify-between ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-[#483698]/30 border-slate-700 hover:border-[#483698] text-slate-200'
                      : 'bg-slate-100 hover:bg-[#483698]/10 border-slate-300 hover:border-[#483698] text-slate-800'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[9px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{f.size}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- D. API POLLING WATCHER --- */}
      {triggerType === 'poll' && (
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <span className={`text-[10px] font-mono uppercase tracking-wider block ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Endpoint URL to Poll
            </span>
            <input
              type="text"
              value={pollEndpoint}
              onChange={(e) => setPollEndpoint(e.target.value)}
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
                  onClick={() => setPollInterval(p.sec)}
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
              onChange={(e) => setPollWatermark(e.target.checked)}
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
