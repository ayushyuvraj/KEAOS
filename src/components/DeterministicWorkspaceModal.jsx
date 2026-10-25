import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Code2, 
  Sparkles, 
  Play, 
  Zap, 
  Copy, 
  Check, 
  Upload, 
  Download, 
  Database, 
  Layers, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  FileCode,
  Search,
  RotateCcw,
  Cpu,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sun,
  Moon,
  MessageSquare,
  Send,
  Terminal,
  Table as TableIcon,
  CheckCircle2,
  Share2,
  FileSpreadsheet
} from 'lucide-react';
import { compileDeterministicLogic, getOfflineFallbackCode } from '../services/deterministicCompiler';
import { executeDeterministicTask, inferDataSchema } from '../services/deterministicRunner';
import { PROVIDERS, getProviderCredential, getAllConfiguredProviders } from '../services/llmService';

/**
 * Checks whether code is default starter/placeholder code.
 */
function isStarterCode(str) {
  if (!str) return true;
  const t = str.trim();
  return (
    t === 'function process(inputs) {\n  return inputs;\n}' ||
    t === 'function process(inputs) {\n  // Transform input data\n  return inputs;\n}' ||
    t === 'function process(inputs) {\n  // Write your deterministic JavaScript code here\n  return inputs;\n}' ||
    t.startsWith('function process(inputs) {\n  // Transform input data') ||
    t === 'function process(inputs) { return inputs; }' ||
    t.startsWith('def process(inputs):\n    # Write') ||
    t === 'def process(inputs):\n    return inputs'
  );
}

export default function DeterministicWorkspaceModal({
  isOpen,
  nodeId,
  nodeData = {},
  nodes = [],
  edges = [],
  onClose,
  onUpdateNode,
  isDarkMode = true,
  onToggleTheme
}) {
  if (!isOpen) return null;

  // Local state initialized from node data
  const [nodeName, setNodeName] = useState(nodeData?.name || 'Rule1');
  const [prompt, setPrompt] = useState(nodeData?.prompt || '');
  const [language, setLanguage] = useState(nodeData?.language || 'javascript');
  const [code, setCode] = useState(nodeData?.code || '');
  const [overrideProvider, setOverrideProvider] = useState(nodeData?.brainProvider || null);
  const [overrideModelId, setOverrideModelId] = useState(nodeData?.brainModelId || null);
  const [isBrainMenuOpen, setIsBrainMenuOpen] = useState(false);
  const brainMenuRef = useRef(null);

  // 3-Zone Studio Tab States
  const [activeLeftTab, setActiveLeftTab] = useState('chat'); // 'chat' | 'spec' | 'schema'
  const [activeRightTab, setActiveRightTab] = useState('table'); // 'table' | 'json' | 'console'

  // Conversational Chat State
  const [chatMessages, setChatMessages] = useState(() => {
    if (Array.isArray(nodeData?.chatHistory) && nodeData.chatHistory.length > 0) {
      return nodeData.chatHistory;
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `I am your Deterministic Co-Pilot. I have inspected your upstream inputs. Describe what you'd like to calculate, filter, join, or format, or pick a smart action below. I'll write zero-token browser code for you.`,
        timestamp: new Date().toLocaleTimeString()
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef(null);

  // Operational Spec Bullets (The Frozen Contract)
  const [operationalBullets, setOperationalBullets] = useState(() => {
    if (Array.isArray(nodeData?.operationalBullets) && nodeData.operationalBullets.length > 0) {
      return nodeData.operationalBullets;
    }
    return [
      'Ingests upstream data streams from inputs',
      'Transforms and validates incoming records',
      'Emits structured tabular preview with verification status'
    ];
  });

  // Pipe to Canvas Feedback State
  const [isPipingToCanvas, setIsPipingToCanvas] = useState(false);
  const [pipedSuccess, setPipedSuccess] = useState(false);

  // Close brain menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (brainMenuRef.current && !brainMenuRef.current.contains(e.target)) {
        setIsBrainMenuOpen(false);
      }
    };
    if (isBrainMenuOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isBrainMenuOpen]);
  
  // Custom test data modal toggle (default: false, automatically uses inherited stream)
  const [showCustomDataInput, setShowCustomDataInput] = useState(nodeData?.inputMode === 'manual' || nodeData?.inputMode === 'upload');
  const [manualInputText, setManualInputText] = useState(nodeData?.manualInputText || '{\n  "testValue": 100\n}');
  const [uploadedData, setUploadedData] = useState(nodeData?.uploadedData || null);
  const [uploadedFileName, setUploadedFileName] = useState(nodeData?.uploadedFileName || '');

  // UI & Execution states
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(nodeData?.lastOutput !== undefined ? {
    success: true,
    output: nodeData.lastOutput,
    tableData: nodeData.lastTableData || (Array.isArray(nodeData.lastOutput) ? nodeData.lastOutput : null),
    logs: nodeData.lastLogs || [],
    latencyMs: nodeData.lastLatencyMs || 0
  } : null);
  const [executionError, setExecutionError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isPayloadExpanded, setIsPayloadExpanded] = useState(false);
  const [outputSearch, setOutputSearch] = useState('');
  const [isFrozen, setIsFrozen] = useState(nodeData?.isFrozen || false);

  const hasLogic = useMemo(() => {
    return Boolean(code && !isStarterCode(code)) || Boolean(prompt && prompt.trim());
  }, [code, prompt]);

  // Synchronize state when node changes or modal opens
  useEffect(() => {
    if (isOpen && nodeId) {
      setNodeName(nodeData?.name || nodeData?.title || 'Deterministic Logic');
      setPrompt(nodeData?.prompt || nodeData?.ruleSummary || '');
      setCode(nodeData?.code || '');
      setLanguage(nodeData?.language || 'javascript');
      setOverrideProvider(nodeData?.brainProvider || null);
      setOverrideModelId(nodeData?.brainModelId || null);
      setIsFrozen(nodeData?.isFrozen || false);
      if (Array.isArray(nodeData?.operationalBullets) && nodeData.operationalBullets.length > 0) {
        setOperationalBullets(nodeData.operationalBullets);
      }
      setExecutionResult(nodeData?.lastOutput !== undefined ? {
        success: true,
        output: nodeData.lastOutput,
        tableData: nodeData.lastTableData || (Array.isArray(nodeData.lastOutput) ? nodeData.lastOutput : null),
        logs: nodeData.lastLogs || [],
        latencyMs: nodeData.lastLatencyMs || 0
      } : null);
      setExecutionError(null);
    }
  }, [nodeId, isOpen]);

  // ---------------------------------------------------------------------------
  // 1. BRAIN RESOLVER: Inherit connected Agent's model or user-selected override
  // ---------------------------------------------------------------------------
  const connectedBrain = useMemo(() => {
    if (overrideProvider) {
      const provDef = PROVIDERS[overrideProvider];
      const defaultModel = overrideProvider === 'openai' 
        ? 'gpt-4o-mini' 
        : overrideProvider === 'anthropic' 
          ? 'claude-3-5-sonnet-20241022' 
          : overrideProvider === 'google' 
            ? 'gemini-2.0-flash' 
            : 'default';
      const mId = overrideModelId || provDef?.defaultModel || defaultModel;
      return {
        agentName: 'Custom Selection',
        agentId: null,
        provider: overrideProvider,
        modelId: mId,
        displayName: `${(provDef?.name || overrideProvider).toUpperCase()} (${mId})`,
        isOverridden: true
      };
    }

    if (!nodeId || !nodes || !edges) return null;

    const nodeLookup = Object.fromEntries(nodes.map(n => [n.id, n]));
    const connectedEdges = edges.filter(e => e.target === nodeId || e.source === nodeId);

    let targetAgent = null;
    for (const edge of connectedEdges) {
      const otherId = edge.target === nodeId ? edge.source : edge.target;
      const otherNode = nodeLookup[otherId];
      if (otherNode?.type === 'agentCore') {
        targetAgent = otherNode;
        break;
      }
    }

    if (!targetAgent) {
      targetAgent = nodes.find(n => n.type === 'agentCore' && !n.data?.isDeactivated) || nodes.find(n => n.type === 'agentCore') || null;
    }

    let modelPillar = null;
    if (targetAgent) {
      const modelEdge = edges.find(e => e.target === targetAgent.id && e.targetHandle === 'model-in');
      if (modelEdge && nodeLookup[modelEdge.source]) {
        modelPillar = nodeLookup[modelEdge.source];
      }
      if (!modelPillar && targetAgent.data?.connectedModelName) {
        modelPillar = nodes.find(n => n.type === 'pillar' && n.data?.name === targetAgent.data.connectedModelName);
      }
    }

    if (!modelPillar) {
      modelPillar = nodes.find(n => n.type === 'pillar' && n.data?.pillarType === 'model' && !n.data?.isDeactivated) || null;
    }

    const configured = getAllConfiguredProviders();
    const defaultProvider = (Array.isArray(configured) && configured.length > 0)
      ? (typeof configured[0] === 'string' ? configured[0] : (configured[0]?.id || 'openai'))
      : 'openai';

    const rawProvider = modelPillar?.data?.config?.provider || modelPillar?.data?.provider || targetAgent?.data?.provider || defaultProvider || 'openai';
    const provider = (typeof rawProvider === 'string' && rawProvider.trim()) ? rawProvider.trim() : 'openai';

    const rawModelId = modelPillar?.data?.config?.modelId || modelPillar?.data?.modelId || targetAgent?.data?.modelId || targetAgent?.data?.model;
    const defaultModel = provider === 'openai' 
      ? 'gpt-4o-mini' 
      : provider === 'anthropic' 
        ? 'claude-3-5-sonnet-20241022' 
        : provider === 'google' 
          ? 'gemini-2.0-flash' 
          : 'default';
    const modelId = (typeof rawModelId === 'string' && rawModelId.trim()) ? rawModelId.trim() : defaultModel;

    const displayName = modelPillar?.data?.name || modelPillar?.data?.displayName || targetAgent?.data?.connectedModelName || `${provider.toUpperCase()} (${modelId})`;

    return {
      agentName: targetAgent?.data?.name || targetAgent?.data?.title || 'Autonomous Agent',
      agentId: targetAgent?.id || null,
      provider,
      modelId,
      displayName
    };
  }, [nodeId, nodes, edges, overrideProvider, overrideModelId]);

  // ---------------------------------------------------------------------------
  // 2. UPSTREAM DATA INGESTION & TYPED SCHEMA INTROSPECTION
  // ---------------------------------------------------------------------------
  const upstreamInfo = useMemo(() => {
    if (!nodeId) return { sources: [], payload: {}, schemaMap: {} };
    const incomingEdges = (edges || []).filter(e => e.target === nodeId);
    const sources = incomingEdges.map(e => {
      const srcNode = nodes.find(n => n.id === e.source);
      let srcOutput = srcNode?.data?.lastOutput ?? srcNode?.data?.content ?? srcNode?.data?.outputContent ?? null;

      // Automatically parse clean JSON strings if valid
      if (typeof srcOutput === 'string' && srcOutput.trim()) {
        const clean = srcOutput.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
        if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
          try {
            srcOutput = JSON.parse(clean);
          } catch {}
        }
      }

      const schema = inferDataSchema(srcOutput);

      return {
        id: e.source,
        name: srcNode?.data?.name || srcNode?.data?.title || e.source,
        type: srcNode?.type || 'node',
        output: srcOutput,
        schema
      };
    });

    const payload = {};
    const schemaMap = {};

    if (sources.length === 1) {
      const singleOut = sources[0].output;
      if (typeof singleOut === 'object' && singleOut !== null) {
        Object.assign(payload, singleOut);
      }
      payload['data'] = singleOut;
      const cleanKey = sources[0].name.replace(/[^a-zA-Z0-9_]/g, '_');
      payload[cleanKey] = singleOut;
      schemaMap['data'] = sources[0].schema;
      schemaMap[cleanKey] = sources[0].schema;
    } else if (sources.length > 1) {
      sources.forEach(s => {
        const key = s.name.replace(/[^a-zA-Z0-9_]/g, '_');
        payload[key] = s.output;
        schemaMap[key] = s.schema;
      });
      const firstSrc = sources.find(s => s.output !== null && s.output !== undefined);
      if (firstSrc) {
        payload['data'] = firstSrc.output;
        schemaMap['data'] = firstSrc.schema;
      }
    }

    payload['sources'] = sources;
    payload['allOutputs'] = sources.map(s => s.output);
    payload['__schemaMap'] = schemaMap;

    return { sources, payload, schemaMap };
  }, [nodeId, nodes, edges]);

  // Current active inputs
  const currentActiveInput = useMemo(() => {
    if (!showCustomDataInput) {
      return upstreamInfo.payload;
    }
    if (uploadedData) {
      return uploadedData;
    }
    try {
      return JSON.parse(manualInputText);
    } catch {
      return { rawText: manualInputText };
    }
  }, [showCustomDataInput, upstreamInfo.payload, uploadedData, manualInputText]);

  // Inspect incoming variable keys for 1-click copying
  const availableInputKeys = useMemo(() => {
    const keys = new Set();
    keys.add('data');
    if (upstreamInfo.sources.length === 1) {
      const singleOut = upstreamInfo.sources[0].output;
      if (singleOut && typeof singleOut === 'object' && !Array.isArray(singleOut)) {
        Object.keys(singleOut).slice(0, 10).forEach(k => keys.add(k));
      }
      const cleanKey = upstreamInfo.sources[0].name.replace(/[^a-zA-Z0-9_]/g, '_');
      keys.add(cleanKey);
    } else if (upstreamInfo.sources.length > 1) {
      upstreamInfo.sources.forEach(s => {
        keys.add(s.name.replace(/[^a-zA-Z0-9_]/g, '_'));
      });
      keys.add('allOutputs');
    }
    return Array.from(keys);
  }, [upstreamInfo]);

  // ---------------------------------------------------------------------------
  // 3. BRAIN SMART SUGGESTIONS (Based on Inferred Upstream Schemas)
  // ---------------------------------------------------------------------------
  const brainSuggestions = useMemo(() => {
    const suggestions = [];
    const schemaMap = upstreamInfo.schemaMap || {};
    const sourceKeys = Object.keys(schemaMap).filter(k => k !== 'data');
    
    // Multi-source Join / Reconciliation suggestions
    if (sourceKeys.length >= 2) {
      const k1 = sourceKeys[0];
      const k2 = sourceKeys[1];
      const s1 = schemaMap[k1];
      const s2 = schemaMap[k2];
      
      const cols1 = s1?.fields ? Object.keys(s1.fields) : [];
      const cols2 = s2?.fields ? Object.keys(s2.fields) : [];
      const matchingCols = cols1.filter(c => cols2.includes(c));

      if (matchingCols.length > 0) {
        suggestions.push({
          label: `Reconcile on ${matchingCols[0]}`,
          prompt: `Reconcile inputs.${k1} with inputs.${k2} matching on key "${matchingCols[0]}". Flag matched items, missing records, and amount discrepancy deltas.`
        });
      } else {
        suggestions.push({
          label: `Join ${k1} with ${k2}`,
          prompt: `Perform an inner join between inputs.${k1} and inputs.${k2} on primary key and return combined records.`
        });
      }

      suggestions.push({
        label: `Compare Record Counts`,
        prompt: `Compare volume between inputs.${k1} (${s1?.rowCount || 0} rows) and inputs.${k2} (${s2?.rowCount || 0} rows) and report summary statistics.`
      });
    } else if (sourceKeys.length === 1 || upstreamInfo.sources.length === 1) {
      const k = sourceKeys[0] || 'data';
      const s = schemaMap[k] || upstreamInfo.sources[0]?.schema;
      
      if (s?.format === 'tabular') {
        suggestions.push({
          label: 'Preview Top 10 Rows',
          prompt: `Slice and preview the first 10 rows of inputs.${k} and extract all column headers.`
        });

        // Numeric column detection
        const numCols = Object.keys(s.fields || {}).filter(f => s.fields[f].type === 'number');
        if (numCols.length > 0) {
          suggestions.push({
            label: `Sum ${numCols[0]} & Filter`,
            prompt: `Calculate total ${numCols[0]} from inputs.${k} and filter records where ${numCols[0]} > 0.`
          });
        }

        if (s.primaryKeyCandidate) {
          suggestions.push({
            label: `Deduplicate by ${s.primaryKeyCandidate}`,
            prompt: `Deduplicate records in inputs.${k} by primary key "${s.primaryKeyCandidate}".`
          });
        }
      }
    }

    // Default universal fallbacks
    if (suggestions.length === 0) {
      suggestions.push(
        { label: 'Parse & Transform Inputs', prompt: 'Transform incoming inputs and extract structured key-value summary.' },
        { label: 'Filter & Format Table', prompt: 'Filter active items from inputs.data and format into clean records.' }
      );
    }

    return suggestions;
  }, [upstreamInfo]);

  // Auto-init starter code if blank
  useEffect(() => {
    if (!code || isStarterCode(code)) {
      if (prompt && prompt.trim()) {
        const compiled = getOfflineFallbackCode(prompt, 'javascript', upstreamInfo.payload);
        setCode(compiled);
      } else {
        setCode('async function process(inputs, state) {\n  // Deterministic Browser Isolate (Zero Tokens • Sub-millisecond Latency)\n  const data = inputs.data || [];\n  return {\n    message: "Data processed successfully",\n    totalRecords: Array.isArray(data) ? data.length : 1,\n    table: Array.isArray(data) ? data.slice(0, 10) : [data]\n  };\n}');
      }
    }
  }, [code, prompt, upstreamInfo.payload]);

  // ---------------------------------------------------------------------------
  // 4. ACTIONS & EXECUTION
  // ---------------------------------------------------------------------------

  // Execute Code in the Async Isolate (Zero Tokens, Zero Cost)
  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionError(null);

    try {
      let codeToRun = code;
      const isStarter = isStarterCode(codeToRun);

      // Auto-compile if prompt exists but code is empty/starter
      if ((!codeToRun || isStarter) && prompt.trim()) {
        setIsCompiling(true);
        const compiled = await compileDeterministicLogic({
          prompt: prompt.trim(),
          language: 'javascript',
          sampleInputs: currentActiveInput,
          provider: connectedBrain?.provider || null,
          modelId: connectedBrain?.modelId || null
        });
        setIsCompiling(false);
        if (compiled?.code) {
          codeToRun = compiled.code;
          setCode(codeToRun);
          if (compiled.language) setLanguage(compiled.language);
        }
      }

      const res = await executeDeterministicTask({
        language: language || 'javascript',
        code: codeToRun,
        prompt: prompt.trim(),
        inputData: currentActiveInput,
        nodeId
      });

      if (res.success) {
        setExecutionResult(res);
        setExecutionError(null);

        // Auto-switch right tab: if table data exists, show table; else json
        if (res.tableData && Array.isArray(res.tableData) && res.tableData.length > 0) {
          setActiveRightTab('table');
        } else {
          setActiveRightTab('json');
        }

        // Update canvas state
        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            name: nodeName,
            prompt: prompt.trim(),
            code: codeToRun,
            language: language || 'javascript',
            lastOutput: res.output,
            lastTableData: res.tableData || null,
            lastLogs: res.logs || [],
            lastStatus: 'success',
            lastLatencyMs: res.latencyMs
          });
        }

        // Broadcast to downstream nodes in DAG
        window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
          detail: {
            nodeId,
            output: res.output,
            tableData: res.tableData,
            latencyMs: res.latencyMs,
            sourceAgentName: nodeName
          }
        }));
      } else {
        setExecutionError(res.error || 'Execution failed.');
        setExecutionResult(res);
        setActiveRightTab('console');
      }
    } catch (err) {
      setExecutionError(err.message || String(err));
      setExecutionResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Conversational Co-Pilot Chat Sender
  const handleSendChat = async (overrideText = null) => {
    const textToSend = (typeof overrideText === 'string' ? overrideText : chatInput).trim();
    if (!textToSend || isChatSending) return;

    setChatInput('');
    setIsChatSending(true);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await compileDeterministicLogic({
        prompt: textToSend,
        language: language || 'javascript',
        sampleInputs: currentActiveInput,
        provider: connectedBrain?.provider || null,
        modelId: connectedBrain?.modelId || null
      });

      if (res?.code) {
        setCode(res.code);
        setPrompt(textToSend);
        if (res.language) setLanguage(res.language);

        // Auto-distill operational bullets from this agreement
        const bullets = [
          `Consumes ${upstreamInfo.sources.length > 0 ? upstreamInfo.sources.map(s => s.name).join(' & ') : 'inputs.data'}`,
          `Executes deterministic logic: ${textToSend.slice(0, 70)}...`,
          `Guarantees zero-token sub-millisecond execution contract`
        ];
        setOperationalBullets(bullets);

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: `I have compiled your request into zero-token deterministic ${res.language || language} code. It is now active in your code editor. Click RUN to test it instantly!`,
          code: res.code,
          language: res.language || language,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatMessages(prev => [...prev, aiMsg]);

        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            name: nodeName,
            prompt: textToSend,
            code: res.code,
            language: res.language || language,
            operationalBullets: bullets,
            chatHistory: [...chatMessages, userMsg, aiMsg]
          });
        }
      }
    } catch (err) {
      const errMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error compiling logic: ${err.message || String(err)}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsChatSending(false);
      setTimeout(() => {
        if (chatBottomRef.current) {
          chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Publish to attached Canvas Output Viewers
  const handlePipeToCanvas = () => {
    if (!executionResult?.output) return;
    setIsPipingToCanvas(true);
    setPipedSuccess(true);

    window.dispatchEvent(new CustomEvent('keaos:deterministic-executed', {
      detail: {
        nodeId,
        output: executionResult.output,
        tableData: executionResult.tableData,
        latencyMs: executionResult.latencyMs,
        sourceAgentName: nodeName
      }
    }));

    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `✓ Published real-time output to attached Canvas Output Viewers` }
    }));

    setTimeout(() => {
      setIsPipingToCanvas(false);
      setPipedSuccess(false);
    }, 2000);
  };

  // Freeze Logic Handler
  const handleFreezeLogic = () => {
    setIsFrozen(true);
    if (onUpdateNode && nodeId) {
      onUpdateNode(nodeId, {
        isFrozen: true,
        operationalBullets,
        prompt: prompt || chatInput || 'Deterministic rule contract'
      });
    }
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `✓ Operational contract frozen for "${nodeName}" (Active)` }
    }));
  };

  // Keyboard Shortcuts: Ctrl/Cmd + Enter to Run, Esc to Close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExecute, onClose]);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy variable handler with inline toast
  const handleCopyVar = (keyStr) => {
    navigator.clipboard.writeText(`inputs.${keyStr}`);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Export output as JSON or CSV
  const handleExportOutput = (format = 'json') => {
    if (!executionResult?.output) return;
    const output = executionResult.output;
    let dataStr = '';
    let fileName = `${nodeName.replace(/\s+/g, '_')}_output.${format}`;
    let mimeType = format === 'csv' ? 'text/csv' : 'application/json';

    if (format === 'csv') {
      const rows = Array.isArray(output) ? output : (output?.table || output?.rows || [output]);
      if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object') {
        const headers = Object.keys(rows[0]);
        const csvRows = [headers.join(',')];
        rows.forEach(r => {
          csvRows.push(headers.map(h => JSON.stringify(r[h] ?? '')).join(','));
        });
        dataStr = csvRows.join('\n');
      } else {
        dataStr = String(output);
      }
    } else {
      dataStr = JSON.stringify(output, null, 2);
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine tabular shape of execution output if array
  const outputRows = useMemo(() => {
    if (!executionResult?.output) return [];
    if (Array.isArray(executionResult.output) && executionResult.output.length > 0 && typeof executionResult.output[0] === 'object' && executionResult.output[0] !== null) {
      return executionResult.output;
    }
    if (executionResult?.tableData && Array.isArray(executionResult.tableData) && executionResult.tableData.length > 0) {
      return executionResult.tableData;
    }
    if (typeof executionResult.output === 'object' && executionResult.output !== null) {
      for (const v of Object.values(executionResult.output)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
          return v;
        }
      }
    }
    return [];
  }, [executionResult]);

  const isOutputPrimitive = executionResult?.output !== null && 
    executionResult?.output !== undefined && 
    (typeof executionResult.output === 'string' || typeof executionResult.output === 'number' || typeof executionResult.output === 'boolean');

  const codeLineCount = useMemo(() => (code || '').split('\n').length, [code]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md transition-all duration-300 ${
      isDarkMode ? 'bg-black/80' : 'bg-[#001E50]/40'
    }`}>
      {/* Expanded Deterministic Box chassis */}
      <div 
        className={`relative w-full max-w-[98vw] xl:max-w-7xl h-[95vh] flex flex-col rounded-[20px] border-2 overflow-hidden font-sans shadow-2xl transition-all duration-200 animate-sandbox-expand ${
          isDarkMode 
            ? 'bg-[#141720] border-[#2C3242] text-white shadow-[0_30px_90px_rgba(0,0,0,0.85)]' 
            : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] shadow-[0_25px_70px_rgba(0,30,80,0.16)]'
        }`}
      >
        {/* ========================================================================= */}
        {/* TOP BAR: IDENTICAL LOOK & FEEL TO THE DETERMINISTIC BOX                  */}
        {/* ========================================================================= */}
        <div className={`px-5 py-3 flex items-center justify-between shrink-0 relative z-10 border-b transition-colors ${
          isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
        }`}>
          {/* Left: Code2 Icon + Rule Title + Brain Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <Code2 className={`w-4 h-4 shrink-0 transition-transform ${
              isExecuting || isCompiling ? 'text-amber-400 animate-spin' : executionResult?.success ? 'text-emerald-500' : 'text-[#EAAA00]'
            }`} />
            
            <input
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onBlur={() => onUpdateNode && nodeId && onUpdateNode(nodeId, { name: nodeName })}
              className="bg-transparent text-sm font-mono font-bold text-[#EAAA00] hover:underline decoration-dashed decoration-[#EAAA00]/60 focus:no-underline focus:border-b focus:border-[#EAAA00] focus:outline-none px-1 py-0.5 rounded-none tracking-tight transition-colors"
              placeholder="Rule Title"
              title="Click to rename rule"
            />

            {/* Interactive Brain Picker Pill & Dropdown */}
            <div className="relative" ref={brainMenuRef}>
              <button
                type="button"
                onClick={() => setIsBrainMenuOpen(!isBrainMenuOpen)}
                className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono transition-all cursor-pointer ${
                  isBrainMenuOpen
                    ? 'ring-2 ring-[#0091DA] border-[#0091DA]'
                    : isDarkMode
                      ? 'bg-[#141720] border-[#383C4A] text-slate-300 hover:border-[#0091DA]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#0091DA]'
                }`}
                title="Click to switch compilation brain"
              >
                <span className={`w-2 h-2 rounded-full ${
                  connectedBrain?.isOverridden ? 'bg-[#0091DA] shadow-[0_0_8px_rgba(0,145,218,0.7)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                }`} />
                <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Brain:</span>
                <span className={`font-bold truncate max-w-[160px] ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                  {connectedBrain ? connectedBrain.displayName : 'Auto'}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isBrainMenuOpen ? 'rotate-180 text-[#0091DA]' : ''}`} />
              </button>

              {/* Brain Dropdown Menu */}
              {isBrainMenuOpen && (
                <div className={`absolute top-full left-0 mt-2 w-72 rounded-[12px] border shadow-2xl z-50 p-2 font-mono text-xs transition-all ${
                  isDarkMode
                    ? 'bg-[#181920] border-[#383C4A] text-white shadow-black/80'
                    : 'bg-white border-slate-200 text-[#0B0F19] shadow-xl'
                }`}>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/40 mb-1 flex items-center justify-between">
                    <span>Select Brain</span>
                    <span className="text-[9px] text-emerald-400 font-normal">Active Models</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOverrideProvider(null);
                      setOverrideModelId(null);
                      setIsBrainMenuOpen(false);
                      if (onUpdateNode && nodeId) onUpdateNode(nodeId, { brainProvider: null, brainModelId: null });
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[8px] flex items-center justify-between transition-colors cursor-pointer ${
                      !overrideProvider
                        ? isDarkMode ? 'bg-[#00338D]/30 text-blue-300 font-bold' : 'bg-blue-50 text-[#00338D] font-bold'
                        : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Auto-Inherit from Canvas</span>
                      </div>
                      <div className="text-[9px] text-slate-400 pl-3">Default active model</div>
                    </div>
                    {!overrideProvider && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>

                  <div className="my-1 border-t border-slate-700/40" />

                  {[
                    { provider: 'anthropic', name: 'Claude 3.5 Sonnet', modelId: 'claude-3-5-sonnet-20241022' },
                    { provider: 'google', name: 'Gemini 2.0 Flash', modelId: 'gemini-2.0-flash' },
                    { provider: 'openai', name: 'OpenAI gpt-4o-mini', modelId: 'gpt-4o-mini' },
                    { provider: 'openai', name: 'OpenAI gpt-4o', modelId: 'gpt-4o' },
                    { provider: 'ollama', name: 'Ollama (Local Private)', modelId: 'llama3.3' }
                  ].map(item => {
                    const isSelected = overrideProvider === item.provider && overrideModelId === item.modelId;
                    return (
                      <button
                        key={`${item.provider}-${item.modelId}`}
                        type="button"
                        onClick={() => {
                          setOverrideProvider(item.provider);
                          setOverrideModelId(item.modelId);
                          setIsBrainMenuOpen(false);
                          if (onUpdateNode && nodeId) onUpdateNode(nodeId, { brainProvider: item.provider, brainModelId: item.modelId });
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-[6px] flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-500/20 text-blue-300 font-bold' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Center: Status & Freeze Action */}
          <div className="flex items-center gap-2">
            <span
              onClick={!isFrozen ? handleFreezeLogic : undefined}
              className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
                !hasLogic
                  ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                  : !isFrozen
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] cursor-pointer hover:scale-125'
                    : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
              }`}
              title={!hasLogic ? 'No logic' : !isFrozen ? 'Draft logic (Click to Freeze)' : 'Logic frozen & verified'}
            />
            <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
              !hasLogic ? 'text-rose-400' : !isFrozen ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {!hasLogic ? 'NO LOGIC' : !isFrozen ? 'DRAFT LOGIC' : 'FROZEN CONTRACT'}
            </span>
          </div>

          {/* Right: Theme Toggle + RUN Button + Close */}
          <div className="flex items-center gap-2.5">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            )}

            <button
              onClick={handleExecute}
              disabled={isExecuting || isCompiling}
              className="py-1.5 px-4 text-xs font-mono font-bold flex items-center gap-2 bg-[#00338D] hover:bg-[#005EB8] text-white rounded-[10px] transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Run logic (Ctrl+Enter)"
            >
              {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>RUN</span>
              <kbd className="hidden sm:inline-block ml-1 text-[9px] bg-black/30 px-1 py-0.5 rounded font-normal">Ctrl+↵</kbd>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Close Workspace (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* UNIFIED 3-ZONE STUDIO LAYOUT                                              */}
        {/* ========================================================================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-transparent relative z-10 divide-y lg:divide-y-0 lg:divide-x divide-[#2C3242]">
          
          {/* ----------------------------------------------------------------------- */}
          {/* ZONE 1 (LEFT - 4 COLS): Co-Pilot Chat, Spec Bullets & Schema Lineage   */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-4 flex flex-col h-full overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#141720]' : 'bg-[#F8FAFC]'
          }`}>
            {/* Zone 1 Tabs */}
            <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-1">
                {[
                  { id: 'chat', label: 'Co-Pilot Chat', icon: MessageSquare },
                  { id: 'spec', label: 'Operational Spec', icon: Sparkles },
                  { id: 'schema', label: 'Data Lineage', icon: Database }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeLeftTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveLeftTab(tab.id)}
                      className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 rounded-[8px] transition-colors cursor-pointer ${
                        isActive
                          ? isDarkMode ? 'bg-[#0091DA]/20 text-[#0091DA] font-bold border border-[#0091DA]/40' : 'bg-white text-[#00338D] font-bold shadow-xs'
                          : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[10px] font-mono text-slate-500">
                {upstreamInfo.sources.length} Stream{upstreamInfo.sources.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Zone 1 Body: Dynamic Tab View */}
            <div className="flex-1 overflow-hidden flex flex-col">
              
              {/* TAB 1: CONVERSATIONAL CO-PILOT CHAT */}
              {activeLeftTab === 'chat' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Upstream Stream Banner & Quick Key Access */}
                  <div className={`p-2.5 border-b text-[11px] font-mono shrink-0 ${
                    isDarkMode ? 'bg-[#181920]/80 border-[#2C3242]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Available Input Streams:</span>
                      <span className="text-[9px] text-[#0091DA]">Click to copy variable</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {availableInputKeys.map(k => (
                        <button
                          key={k}
                          onClick={() => handleCopyVar(k)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-full border flex items-center gap-1 transition-colors cursor-pointer ${
                            isDarkMode ? 'bg-[#141720] border-[#383C4A] text-slate-300 hover:border-[#0091DA]' : 'bg-slate-50 border-slate-300 text-slate-700'
                          }`}
                        >
                          <span>inputs.{k}</span>
                          {copiedKey === k ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-50" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Brain Smart Suggestion Chips */}
                  <div className="p-2 border-b border-[#2C3242]/60 overflow-x-auto flex gap-1.5 shrink-0 bg-black/10">
                    {brainSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChat(s.prompt)}
                        className={`px-2.5 py-1 text-[10px] font-mono rounded-full border whitespace-nowrap transition-all cursor-pointer ${
                          isDarkMode 
                            ? 'bg-[#EAAA00]/10 border-[#EAAA00]/30 text-[#EAAA00] hover:bg-[#EAAA00]/20' 
                            : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                        }`}
                        title={s.prompt}
                      >
                        ⚡ {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Chat Message Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs">
                    {chatMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[92%] p-3 rounded-[12px] border leading-relaxed ${
                          msg.role === 'user'
                            ? isDarkMode ? 'bg-[#00338D]/40 border-[#00338D] text-white' : 'bg-blue-100 border-blue-300 text-blue-900'
                            : msg.isError
                              ? 'bg-red-500/10 border-red-500/30 text-red-300'
                              : isDarkMode ? 'bg-[#1D2028] border-[#2C3242] text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.code && (
                            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase">Code generated ({msg.language})</span>
                              <button
                                onClick={() => {
                                  setCode(msg.code);
                                  window.dispatchEvent(new CustomEvent('keaos:toast', { detail: { message: '✓ Applied code to editor' } }));
                                }}
                                className="px-2 py-0.5 text-[10px] bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
                              >
                                Apply to Editor
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isChatSending && (
                      <div className="flex items-center gap-2 text-xs text-amber-400 p-2 font-mono">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Co-Pilot is compiling deterministic code...</span>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                    className={`p-2.5 border-t flex items-center gap-2 ${
                      isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Describe what this rule should do... (Enter to send)"
                      className={`flex-1 px-3 py-2 text-xs font-mono rounded-[10px] border outline-none transition-colors ${
                        isDarkMode ? 'bg-[#0B0F19] border-[#2C3242] text-white focus:border-[#0091DA]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#00338D]'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isChatSending || !chatInput.trim()}
                      className="p-2 rounded-[10px] bg-[#0091DA] hover:bg-[#005EB8] text-white transition-all cursor-pointer disabled:opacity-40"
                      title="Send message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: OPERATIONAL SPEC CONTRACT (FROZEN BULLETS) */}
              {activeLeftTab === 'spec' && (
                <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono">
                  <div className={`p-4 rounded-[14px] border space-y-3 ${
                    isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-white border-slate-200 shadow-xs'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-[#EAAA00] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Operational Contract
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isFrozen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {isFrozen ? 'FROZEN & VERIFIED' : 'DRAFT'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      These bullet points define the functional guarantees of this deterministic rule. Freezing locks the contract and displays it on the canvas.
                    </p>

                    <div className="space-y-2 pt-1">
                      {operationalBullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="w-5 h-5 rounded bg-[#0091DA]/20 text-[#0091DA] font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-slate-300 leading-snug">{bullet}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#2C3242] flex items-center gap-2">
                      <button
                        onClick={handleFreezeLogic}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-[10px] border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isFrozen
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-[#EAAA00] hover:bg-[#D49800] text-[#001E50] border-amber-400 shadow-sm'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isFrozen ? 'CONTRACT FROZEN' : 'FREEZE OPERATIONAL CONTRACT'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: UPSTREAM DATA LINEAGE & SCHEMA INSPECTOR */}
              {activeLeftTab === 'schema' && (
                <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-300">Connected Upstream Schemas:</span>
                    <button
                      onClick={() => setShowCustomDataInput(!showCustomDataInput)}
                      className="text-[10px] text-[#0091DA] hover:underline cursor-pointer"
                    >
                      {showCustomDataInput ? 'Use Inherited Stream' : '+ Custom Test Input'}
                    </button>
                  </div>

                  {!showCustomDataInput ? (
                    upstreamInfo.sources.length === 0 ? (
                      <div className="p-4 border rounded-[12px] text-center text-slate-500 space-y-1">
                        <Database className="w-6 h-6 mx-auto opacity-50 text-amber-400" />
                        <p>Standalone Node</p>
                        <p className="text-[10px]">Connect an Ingestion Node or Rule to pipe streams.</p>
                      </div>
                    ) : (
                      upstreamInfo.sources.map(src => {
                        const s = src.schema;
                        return (
                          <div key={src.id} className={`p-3 rounded-[12px] border space-y-2 ${
                            isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-xs">{src.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0091DA]/20 text-[#0091DA] font-bold uppercase">
                                {s.format} ({s.rowCount || 0} rows)
                              </span>
                            </div>

                            {s.fields && Object.keys(s.fields).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400">Columns & Inferred Types:</span>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(s.fields).map(f => (
                                    <span key={f} className="px-2 py-0.5 rounded text-[10px] bg-black/40 border border-slate-700 text-slate-300">
                                      {f} <span className="text-amber-400">({s.fields[f].type})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {s.sampleRecord && (
                              <div className="pt-1">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400">Sample Row:</span>
                                <pre className="p-2 mt-1 rounded bg-black/50 text-[10px] text-emerald-400 overflow-x-auto">
                                  {JSON.stringify(s.sampleRecord, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div className="p-3 border rounded-[12px] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-400">Custom Test Input</span>
                        <label className="text-[10px] text-[#0091DA] hover:underline cursor-pointer">
                          {uploadedFileName || 'Upload CSV / JSON'}
                          <input
                            type="file"
                            accept=".csv,.json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadedFileName(file.name);
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                try {
                                  if (file.name.endsWith('.json')) {
                                    setUploadedData(JSON.parse(ev.target.result));
                                  } else {
                                    // Parse CSV directly
                                    const lines = ev.target.result.split('\n').filter(Boolean);
                                    const headers = lines[0].split(',').map(h => h.trim());
                                    const rows = lines.slice(1).map(l => {
                                      const v = l.split(',');
                                      const obj = {};
                                      headers.forEach((h, i) => obj[h] = v[i]?.trim() || '');
                                      return obj;
                                    });
                                    setUploadedData(rows);
                                  }
                                } catch (err) {
                                  alert('Could not parse file: ' + err.message);
                                }
                              };
                              reader.readAsText(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <textarea
                        rows={6}
                        value={manualInputText}
                        onChange={(e) => setManualInputText(e.target.value)}
                        className="w-full p-2 text-xs font-mono bg-black/50 border border-slate-700 text-emerald-300 rounded outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* ZONE 2 (CENTER - 4 COLS): Pure Deterministic Code Isolate               */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-4 flex flex-col h-full overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#0B0F19]' : 'bg-[#FFFFFF]'
          }`}>
            {/* Editor Sub-Header */}
            <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-[#141720] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-[#EAAA00]" />
                <span className="text-xs font-mono font-bold">Deterministic Code</span>
                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#0091DA]/20 text-[#0091DA] border border-[#0091DA]/40">
                  {language} (Isolate)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{codeLineCount} lines</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyCode}
                  className="px-2 py-1 text-[11px] font-mono border border-slate-700 hover:border-slate-500 text-slate-300 rounded-[6px] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Code Textarea Editor */}
            <div className="flex-1 flex overflow-hidden bg-[#0B0F19]">
              <div className="w-10 py-3 select-none text-right pr-2 text-slate-600 font-mono text-xs border-r border-slate-800 bg-[#070A10]">
                {Array.from({ length: Math.max(codeLineCount, 15) }, (_, i) => (
                  <div key={i + 1} className="leading-relaxed">{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 p-3 text-xs font-mono bg-transparent text-emerald-300 outline-none resize-none leading-relaxed overflow-auto selection:bg-[#00338D]"
                placeholder="async function process(inputs, state) { ... }"
              />
            </div>

            {/* Editor Footer Status Bar */}
            <div className={`px-4 py-1.5 border-t flex items-center justify-between text-[10px] font-mono ${
              isDarkMode ? 'bg-[#070A10] border-[#2C3242] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-emerald-400">0 TOKENS • $0.00 COST</span>
                <span className="text-slate-600">|</span>
                <span>Sub-millisecond Browser Native</span>
              </div>
              <span>Async/Await Enabled</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* ZONE 3 (RIGHT - 4 COLS): Interactive Preview & DevTools Console         */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-4 flex flex-col h-full overflow-hidden transition-colors ${
            isDarkMode ? 'bg-[#141720]' : 'bg-[#F8FAFC]'
          }`}>
            {/* Zone 3 Tabs & Action Bar */}
            <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-1">
                {[
                  { id: 'table', label: `Table (${outputRows.length})`, icon: TableIcon },
                  { id: 'json', label: 'JSON Tree', icon: FileCode },
                  { id: 'console', label: `Console (${executionResult?.logs?.length || 0})`, icon: Terminal }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeRightTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveRightTab(tab.id)}
                      className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1.5 rounded-[8px] transition-colors cursor-pointer ${
                        isActive
                          ? isDarkMode ? 'bg-[#009A44]/20 text-emerald-400 font-bold border border-emerald-500/40' : 'bg-white text-emerald-700 font-bold shadow-xs'
                          : isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-black'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Pipe to Canvas & Export Buttons */}
              <div className="flex items-center gap-1">
                {executionResult?.output && (
                  <>
                    <button
                      onClick={handlePipeToCanvas}
                      disabled={isPipingToCanvas}
                      className={`px-2 py-1 text-[10px] font-mono rounded-[6px] border flex items-center gap-1 transition-all cursor-pointer ${
                        pipedSuccess
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 font-bold'
                          : isDarkMode ? 'bg-[#001E50] border-[#00338D] text-blue-300 hover:bg-[#00338D]' : 'bg-blue-50 border-blue-300 text-blue-800'
                      }`}
                      title="Publish result to connected Canvas Output Viewers"
                    >
                      {pipedSuccess ? <Check className="w-2.5 h-2.5" /> : <Share2 className="w-2.5 h-2.5" />}
                      <span>{pipedSuccess ? 'Piped' : 'Pipe to Canvas'}</span>
                    </button>

                    <button
                      onClick={() => handleExportOutput('csv')}
                      className="px-1.5 py-1 text-[10px] font-mono border border-slate-700 rounded text-slate-300 hover:text-white"
                      title="Download CSV"
                    >
                      CSV
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Zone 3 Body */}
            <div className="flex-1 overflow-hidden p-3 flex flex-col">
              
              {/* Execution Error Banner */}
              {executionError && (
                <div className="mb-3 p-3 rounded-[10px] border border-red-500/30 bg-red-500/10 text-red-300 font-mono text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Execution Error:</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px]">{executionError}</pre>
                </div>
              )}

              {/* No Execution Yet Empty State */}
              {!executionResult && !executionError ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2">
                  <Play className="w-8 h-8 text-[#EAAA00] opacity-40" />
                  <p className="text-xs">No execution run yet.</p>
                  <p className="text-[10px] text-slate-500">Press RUN or Ctrl+Enter to test logic.</p>
                </div>
              ) : activeRightTab === 'table' ? (
                /* TAB 1: TABULAR DATA GRID */
                outputRows.length > 0 ? (
                  <div className="flex-1 flex flex-col overflow-hidden font-mono space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                      <span>Showing {outputRows.length} records ({executionResult?.latencyMs || 0} ms):</span>
                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                        <input
                          type="text"
                          value={outputSearch}
                          onChange={(e) => setOutputSearch(e.target.value)}
                          placeholder="Filter rows..."
                          className="pl-6 pr-2 py-0.5 text-[10px] font-mono border border-slate-700 bg-black/40 rounded text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex-1 border border-slate-700/60 rounded-[10px] overflow-auto">
                      <table className="w-full text-left text-xs font-mono divide-y divide-slate-800">
                        <thead className="bg-[#0B0F19] sticky top-0 z-10">
                          <tr>
                            <th className="py-2 px-2.5 text-[10px] font-bold uppercase text-slate-400">#</th>
                            {Object.keys(outputRows[0]).map(col => (
                              <th key={col} className="py-2 px-2.5 text-[10px] font-bold uppercase text-slate-300 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {outputRows
                            .filter(r => !outputSearch || JSON.stringify(r).toLowerCase().includes(outputSearch.toLowerCase()))
                            .slice(0, 100)
                            .map((row, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-1.5 px-2.5 text-[10px] text-slate-500">{idx + 1}</td>
                                {Object.keys(outputRows[0]).map(col => (
                                  <td key={col} className="py-1.5 px-2.5 text-[11px] text-slate-300 whitespace-nowrap">
                                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : isOutputPrimitive ? (
                  /* Primitive Decision Card */
                  <div className="p-4 border border-emerald-500/30 bg-emerald-500/10 rounded-[12px] font-mono">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Evaluated Result:</span>
                    <span className="text-2xl font-bold text-white">{String(executionResult?.output)}</span>
                    <span className="block text-[10px] text-slate-400 mt-2">Latency: {executionResult?.latencyMs}ms • 0 Tokens</span>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-1">
                    <TableIcon className="w-6 h-6 opacity-40" />
                    <p className="text-xs">Output is an object or primitive.</p>
                    <button onClick={() => setActiveRightTab('json')} className="text-[10px] text-[#0091DA] hover:underline">
                      View in JSON Tree
                    </button>
                  </div>
                )
              ) : activeRightTab === 'json' ? (
                /* TAB 2: JSON TREE */
                <pre className="flex-1 p-3 rounded-[10px] border border-slate-700/60 bg-[#0B0F19] text-emerald-400 font-mono text-xs overflow-auto leading-relaxed">
                  {JSON.stringify(executionResult?.output, null, 2)}
                </pre>
              ) : (
                /* TAB 3: DEVTOOLS CONSOLE LOGS */
                <div className="flex-1 flex flex-col overflow-hidden font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                    <span>Captured Console Stream:</span>
                    <span className="text-[10px] text-slate-500">{executionResult?.logs?.length || 0} event(s)</span>
                  </div>

                  <div className="flex-1 p-3 rounded-[10px] border border-slate-700/60 bg-[#0B0F19] overflow-auto space-y-1">
                    {!executionResult?.logs || executionResult.logs.length === 0 ? (
                      <div className="text-slate-600 text-xs italic">
                        No console statements captured. Use console.log(...), console.warn(...), or console.error(...) inside your code.
                      </div>
                    ) : (
                      executionResult.logs.map((log, lIdx) => (
                        <div key={lIdx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-[10px] text-slate-600 shrink-0">{log.time}</span>
                          <span className={`text-[9px] uppercase px-1 rounded font-bold shrink-0 ${
                            log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                            log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                            log.level === 'info' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-700/40 text-slate-300'
                          }`}>
                            {log.level}
                          </span>
                          <span className="text-slate-200 whitespace-pre-wrap">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
