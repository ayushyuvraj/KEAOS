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
import { executeDeterministicTask, inferDataSchema, parseCsv } from '../services/deterministicRunner';
import { 
  PROVIDERS, 
  getProviderCredential, 
  getAllConfiguredProviders, 
  executeUniversalChat,
  getCachedDiscoveredModels,
  fetchProviderModelsLive
} from '../services/llmService';

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
  const [discoveredModels, setDiscoveredModels] = useState({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // 3-Zone Studio Tab States
  const [activeLeftTab, setActiveLeftTab] = useState('chat'); // 'chat' | 'spec' | 'schema'
  const [activeRightTab, setActiveRightTab] = useState('table'); // 'table' | 'json' | 'console'

  // Conversational Chat State (Bilateral Discussion Protocol)
  const [chatMessages, setChatMessages] = useState(() => {
    if (Array.isArray(nodeData?.chatHistory) && nodeData.chatHistory.length > 0) {
      return nodeData.chatHistory;
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `I am your Deterministic Co-Pilot & Software Architect. Tell me what logic or calculation you need. We'll discuss and finalize the step-by-step plan together, and once you approve, I will formulate the exact deterministic code for you.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef(null);
  const lastPlanPromptRef = useRef(nodeData?.prompt || '');

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


  
  // Custom test data modal toggle (default: false, automatically uses inherited stream)
  const [showCustomDataInput, setShowCustomDataInput] = useState(nodeData?.inputMode === 'manual' || nodeData?.inputMode === 'upload');
  const [manualInputText, setManualInputText] = useState(nodeData?.manualInputText || '{\n  "testValue": 100\n}');
  const [uploadedData, setUploadedData] = useState(nodeData?.uploadedData || null);
  const [uploadedFileName, setUploadedFileName] = useState(nodeData?.uploadedFileName || '');
  const fileUploadInputRef = useRef(null);

  // Studio In-Memory Test File Uploader (Supports CSV, XLSX, JSON)
  const handleStudioFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const parsedFiles = {};
    let pending = files.length;

    files.forEach(file => {
      const fileName = file.name || 'file';
      const isJson = fileName.toLowerCase().endsWith('.json');
      const isXlsx = /\.(xlsx|xls)$/i.test(fileName);

      const reader = new FileReader();
      if (isXlsx && typeof window !== 'undefined' && window.XLSX) {
        reader.onload = (ev) => {
          try {
            const data = new Uint8Array(ev.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: null });
            assignFile(fileName, rows);
          } catch (err) {
            console.warn('XLSX parse error:', err);
            assignFile(fileName, []);
          }
          checkComplete();
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (ev) => {
          try {
            const text = ev.target.result;
            if (isJson) {
              const parsed = JSON.parse(text);
              assignFile(fileName, parsed);
            } else {
              const rows = parseCsv(text);
              assignFile(fileName, rows);
            }
          } catch (err) {
            console.warn('File read error:', err);
            assignFile(fileName, []);
          }
          checkComplete();
        };
        reader.readAsText(file);
      }
    });

    function assignFile(name, data) {
      const lower = name.toLowerCase();
      if (/2b|gstr/i.test(lower)) {
        parsedFiles['gstgr2b'] = data;
        parsedFiles['gstr2b'] = data;
      } else if (/pr|purchase/i.test(lower)) {
        parsedFiles['pr'] = data;
        parsedFiles['purchase_register'] = data;
      } else {
        const cleanKey = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
        parsedFiles[cleanKey] = data;
      }
    }

    function checkComplete() {
      pending--;
      if (pending === 0) {
        const keys = Object.keys(parsedFiles);
        if (keys.length > 0 && !parsedFiles['data']) {
          parsedFiles['data'] = parsedFiles['gstgr2b'] || parsedFiles[keys[0]];
        }
        setUploadedData(parsedFiles);
        setUploadedFileName(files.map(f => f.name).join(', '));
        window.dispatchEvent(new CustomEvent('keaos:toast', {
          detail: { message: `✓ Ingested ${files.length} test file(s) into inputs` }
        }));
      }
    }
  };

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

  // Active Brain Provider and Compatible Models resolution
  const activeBrainProvider = overrideProvider || connectedBrain?.provider || 'openai';

  useEffect(() => {
    if (!isOpen || !activeBrainProvider) return;
    const cached = getCachedDiscoveredModels(activeBrainProvider);
    if (cached && cached.length > 0) {
      setDiscoveredModels(prev => ({ ...prev, [activeBrainProvider]: cached }));
    } else {
      const cred = getProviderCredential(activeBrainProvider);
      if (cred || activeBrainProvider === 'ollama') {
        setIsLoadingModels(true);
        fetchProviderModelsLive(activeBrainProvider, cred)
          .then(models => {
            if (Array.isArray(models) && models.length > 0) {
              setDiscoveredModels(prev => ({ ...prev, [activeBrainProvider]: models }));
            }
          })
          .catch(err => {
            console.warn('Model discovery failed in Deterministic Studio:', err);
          })
          .finally(() => {
            setIsLoadingModels(false);
          });
      }
    }
  }, [activeBrainProvider, isOpen]);

  const compatibleModelsList = useMemo(() => {
    const pDef = PROVIDERS[activeBrainProvider] || PROVIDERS.openai;
    const cached = discoveredModels[activeBrainProvider] || getCachedDiscoveredModels(activeBrainProvider) || [];
    let list = cached.length > 0 
      ? cached 
      : (pDef.models || []).map(m => (typeof m === 'string' ? { id: m, name: m } : m));

    const currentActiveModelId = overrideModelId || connectedBrain?.modelId || pDef.defaultModel;
    if (currentActiveModelId && !list.some(m => m.id === currentActiveModelId)) {
      list = [{ id: currentActiveModelId, name: currentActiveModelId }, ...list];
    }
    return list;
  }, [activeBrainProvider, discoveredModels, overrideModelId, connectedBrain?.modelId]);

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
    if (uploadedData && typeof uploadedData === 'object') {
      return {
        ...upstreamInfo.payload,
        ...uploadedData,
        data: uploadedData.data !== undefined ? uploadedData.data : (uploadedData.gstgr2b || uploadedData.pr || upstreamInfo.payload.data)
      };
    }
    if (!showCustomDataInput) {
      return upstreamInfo.payload;
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
    if (uploadedData && typeof uploadedData === 'object') {
      Object.keys(uploadedData).forEach(k => {
        if (k !== '__schemaMap' && k !== 'sources' && k !== 'allOutputs') {
          keys.add(k);
        }
      });
    }
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
  }, [upstreamInfo, uploadedData]);

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

  // Conversational Co-Pilot Chat Sender (Bilateral Discussion Protocol)
  const handleSendChat = async (overrideText = null) => {
    const textToSend = (typeof overrideText === 'string' ? overrideText : chatInput).trim();
    if (!textToSend || isChatSending) return;

    setChatInput('');
    setIsChatSending(true);

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const nextChatMessages = [...chatMessages, userMsg];
    setChatMessages(nextChatMessages);

    // Track whether this message is a user approval / confirmation
    const isConfirmationText = /^(yes|yeah|yep|proceed|confirm|deploy|looks good|sounds good|ok|okay|fine|do it|go ahead|formulate|generate|i am okay|i'm okay)/i.test(textToSend.toLowerCase()) || 
      textToSend.toLowerCase().includes('plan is finalized') || 
      textToSend.toLowerCase().includes('formulate the code') ||
      textToSend.toLowerCase().includes('okay with');

    if (!isConfirmationText) {
      lastPlanPromptRef.current = textToSend;
    }

    try {
      // 1. Build upstream data schema context for the model
      let inputContext = '';
      if (upstreamInfo.sources && upstreamInfo.sources.length > 0) {
        inputContext = `AVAILABLE UPSTREAM DATA STREAMS IN THIS DAG:\n` + upstreamInfo.sources.map(s => {
          const streamName = s.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const fields = s.schema?.fields ? Object.keys(s.schema.fields).join(', ') : 'dynamic keys';
          return `- inputs.${streamName} (Source: "${s.name}", format: ${s.schema?.format || 'tabular'}, fields: [${fields}], rowCount: ${s.schema?.rowCount || 'unknown'})`;
        }).join('\n');
      } else {
        inputContext = `INPUT SPECIFICATION:\n- inputs.data: dynamic payload passed at runtime.`;
      }

      // 2. Strict Two-Phase Bilateral System Prompt
      const systemPrompt = `You are the KEAOS Deterministic Logic Co-Pilot & Software Architect.
You are helping the user design, plan, and deploy a 100% deterministic code module inside the KEAOS Deterministic Rule Box named "${nodeName || 'Rule Box'}".
Once finalized and deployed, this box runs purely algorithmically in KEAOS with ZERO LLM calls and ZERO token consumption at runtime.

${inputContext}

CRITICAL MANDATE: YOU OPERATE STRICTLY IN A BILATERAL TWO-PHASE PROTOCOL.
YOU MUST NEVER ENGAGE IN A ONE-SIDED MONOLOGUE OR GENERATE CODE IN ONE SHOT WITHOUT EXPLICIT USER CONFIRMATION.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: BILATERAL DISCUSSION, CLARIFICATION & ARCHITECTURAL PLAN (Default Phase)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the user states what they want, gives a command, or asks for logic:
1. DO NOT GENERATE CODE YET. ABSOLUTELY NEVER output markdown code fences (\`\`\`) with executable code in Phase 1.
2. IF THE USER'S REQUEST IS AMBIGUOUS, UNDERSPECIFIED, OR MISSING KEY DETAILS:
   - Actively question the user back and ask for clarification (e.g. key matching names, tolerance thresholds, null handling, or priority order).
   - Wait for the user to clarify.
3. PROVIDE A CRISP, STRUCTURED ARCHITECTURAL PROPOSAL / FINAL PLAN:
   - **Input Structure**: Expected incoming fields/streams (e.g. \`inputs.data\`, \`inputs.gstr2b\`, \`inputs.pri\`, array of records).
   - **Processing Logic**: Step-by-step algorithmic actions (e.g. hash map indexing, matching logic, amount comparisons, discrepancy flagging).
   - **Output Specification**: Exact shape and format of the output (table rows, summary metrics, match status flags).
4. CONCLUDE WITH THIS EXACT MANDATORY QUESTION:
   "Yes this is what has been finalized. Are you okay with it or would you like to change something?"
5. If the user suggests tweaks, answers questions, or refines details, iterate and update the architectural plan in the same crisp, structured style without code, repeating the question.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: FINALIZATION & CODE FORMULATION (Only When User Approves)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHEN AND ONLY WHEN the user confirms the plan (e.g. "yes", "proceed", "looks good", "finalize", "deploy", "confirm", "sound good", "I am okay with this", "go ahead", "formulate the code", "yes, this plan is finalized"):
1. State the ultra-crisp functional rule summary on its own line:
   RULE_SUMMARY: <Ultra-crisp summary of rule function, max 6-10 words>
2. Confirm deployment in 1 crisp sentence:
   "✓ Logic finalized and formulated into zero-token deterministic ${language || 'javascript'} code."
3. Provide the COMPLETE, self-contained, working deterministic code inside a single standard markdown code block:
   \`\`\`${language || 'javascript'}
   // Self-contained browser-native process function
   function process(inputs, state) {
     ...
     return result;
   }
   \`\`\`
4. RUNTIME SPECIFICATION & STRICT NON-BLOCKING INVARIANT:
   - The code executes directly in the KEAOS browser sandbox isolate.
   - The function receives 'inputs' (e.g. 'inputs.gstgr2b', 'inputs.pr', 'inputs.data') and a persistent 'state' object.
   - CRITICAL: Deterministic functions in KEAOS MUST NEVER call window.showOpenFilePicker(), prompt(), or interactive browser dialogs that pause execution.
   - Code MUST execute instantly in-memory on 'inputs' (in < 20ms).
   - ALWAYS include clean fallback sample data if inputs are empty or unprovided so clicking RUN always works immediately with zero timeout.
   - Both sync and async functions ('async function process(inputs, state)') are supported.
   - For console debugging, 'console.log(...)' is captured into DevTools.
   - NEVER tell the user to install packages ('npm install'), open a terminal, or configure backend servers.`;

      // Format conversation history for LLM
      const messagesForLlm = nextChatMessages.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      }));

      let responseText = '';
      const provider = connectedBrain?.provider || 'openai';
      const modelId = connectedBrain?.modelId || 'gpt-4o';

      try {
        const chatResponse = await executeUniversalChat({
          provider,
          modelId,
          systemPrompt,
          messages: messagesForLlm,
          temperature: 0.2
        });
        responseText = typeof chatResponse === 'string'
          ? chatResponse
          : (chatResponse?.text || chatResponse?.responseText || chatResponse?.rawText || '');
      } catch (llmErr) {
        console.warn('Direct LLM chat failed, evaluating fallback bilateral response:', llmErr);
        // Fallback bilateral handler for offline/unconfigured scenarios
        if (isConfirmationText) {
          const reqPrompt = lastPlanPromptRef.current || prompt || textToSend;
          const fallbackCode = getOfflineFallbackCode(reqPrompt, language || 'javascript', currentActiveInput);
          responseText = `RULE_SUMMARY: Executes deterministic ${language || 'javascript'} data transformation\n\n✓ Logic finalized and formulated into zero-token deterministic ${language || 'javascript'} code.\n\n\`\`\`${language || 'javascript'}\n${fallbackCode}\n\`\`\``;
        } else {
          // Propose architectural plan without code
          responseText = `I have analyzed your requirement: **"${textToSend}"**.\n\n**Proposed Logic Architecture:**\n- **Input Structure:** Consumes ${upstreamInfo.sources.length > 0 ? upstreamInfo.sources.map(s => `\`inputs.${s.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}\``).join(' & ') : '`inputs.data`'}.\n- **Processing Logic:** Algorithmic transformation, matching, and validation for "${textToSend}".\n- **Output Specification:** Returns structured table records with status flags and summary counts.\n\nYes this is what has been finalized. Are you okay with it or would you like to change something?`;
        }
      }

      // Check if code block was returned (Phase 2 completion)
      const codeBlockRegex = /```([a-zA-Z0-9_\-]+)?\s*([\s\S]*?)```/;
      const codeMatch = codeBlockRegex.exec(responseText);

      if (codeMatch && codeMatch[2]) {
        // Phase 2: User confirmed plan -> Code formulated!
        const rawLang = (codeMatch[1] || language || 'javascript').toLowerCase();
        const detectedLang = rawLang.includes('py') ? 'python' : rawLang.includes('sql') ? 'sql' : 'javascript';
        const detectedCode = codeMatch[2].trim();

        // Extract RULE_SUMMARY
        const summaryRegex = /RULE_SUMMARY:\s*([^\n\r]+)/i;
        const summaryMatch = summaryRegex.exec(responseText);
        let detectedSummary = summaryMatch ? summaryMatch[1].trim() : null;

        if (!detectedSummary && detectedCode) {
          const commentMatch = /\/\/\s*([^\n\r]+)/.exec(detectedCode);
          if (commentMatch && !commentMatch[1].toLowerCase().includes('self-contained')) {
            detectedSummary = commentMatch[1].trim();
          }
        }
        if (!detectedSummary) {
          detectedSummary = lastPlanPromptRef.current || prompt || 'Executes custom deterministic logic';
        }

        // Apply immediately to the Studio Code Editor
        setCode(detectedCode);
        setLanguage(detectedLang);
        setPrompt(detectedSummary);

        const bullets = [
          `Consumes ${upstreamInfo.sources.length > 0 ? upstreamInfo.sources.map(s => s.name).join(' & ') : 'inputs.data'}`,
          `Executes deterministic logic: ${detectedSummary}`,
          `Guarantees zero-token sub-millisecond execution contract`
        ];
        setOperationalBullets(bullets);

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: responseText.replace(/```([a-zA-Z0-9_\-]+)?\s*([\s\S]*?)```/g, '').trim() || '✓ Logic finalized and formulated into zero-token deterministic code.',
          code: detectedCode,
          language: detectedLang,
          isFinalized: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);

        window.dispatchEvent(new CustomEvent('keaos:toast', {
          detail: { message: `✓ Logic finalized & loaded into Code Editor` }
        }));

        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            name: nodeName,
            prompt: detectedSummary,
            code: detectedCode,
            language: detectedLang,
            operationalBullets: bullets,
            chatHistory: [...nextChatMessages, aiMsg]
          });
        }
      } else {
        // Phase 1: Architectural plan / bilateral clarification question
        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: responseText,
          isPlan: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);

        if (onUpdateNode && nodeId) {
          onUpdateNode(nodeId, {
            chatHistory: [...nextChatMessages, aiMsg]
          });
        }
      }
    } catch (err) {
      const errMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error in discussion: ${err.message || String(err)}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
        <div className={`px-5 py-3 flex items-center justify-between shrink-0 relative z-30 border-b transition-colors ${
          isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-[#FFFFFF] border-[#E2E8F0]'
        }`}>
          {/* Left: Code2 Icon + Rule Title + Brain & Model Selectors */}
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <Code2 className={`w-4 h-4 shrink-0 transition-transform ${
              isExecuting || isCompiling ? 'text-amber-400 animate-spin' : executionResult?.success ? 'text-emerald-500' : 'text-[#EAAA00]'
            }`} />
            
            <input
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              onBlur={() => onUpdateNode && nodeId && onUpdateNode(nodeId, { name: nodeName })}
              className="bg-transparent text-sm font-mono font-bold text-[#EAAA00] hover:underline decoration-dashed decoration-[#EAAA00]/60 focus:no-underline focus:border-b focus:border-[#EAAA00] focus:outline-none px-1 py-0.5 rounded-none tracking-tight transition-colors shrink-0 max-w-[130px] sm:max-w-[170px] truncate"
              placeholder="Rule Title"
              title="Click to rename rule"
            />

            {/* Dual Brain Dropdowns: Provider & Compatible Models */}
            <div className="flex items-center gap-2 border-l border-slate-700/50 pl-3">
              {/* Dropdown 1: Model Provider (Anthropic, OpenAI, etc.) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Brain:</span>
                <select
                  value={overrideProvider || 'auto'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'auto') {
                      setOverrideProvider(null);
                      setOverrideModelId(null);
                      if (onUpdateNode && nodeId) {
                        onUpdateNode(nodeId, { brainProvider: null, brainModelId: null });
                      }
                      window.dispatchEvent(new CustomEvent('keaos:toast', {
                        detail: { message: `✓ Inherited model from Canvas Agent` }
                      }));
                    } else {
                      const pDef = PROVIDERS[val];
                      const newModel = pDef?.defaultModel || 'default';
                      setOverrideProvider(val);
                      setOverrideModelId(newModel);
                      if (onUpdateNode && nodeId) {
                        onUpdateNode(nodeId, { brainProvider: val, brainModelId: newModel });
                      }
                      window.dispatchEvent(new CustomEvent('keaos:toast', {
                        detail: { message: `✓ Switched provider to ${pDef?.name || val}` }
                      }));
                    }
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-[8px] border outline-none cursor-pointer transition-colors ${
                    isDarkMode 
                      ? 'bg-[#141720] border-[#383C4A] text-slate-200 focus:border-[#0091DA]' 
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-[#00338D]'
                  }`}
                  title="Select AI Brain Provider"
                >
                  <option value="auto">Auto (Inherit from Canvas)</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="google">Google GenAI</option>
                  <option value="ollama">Ollama (Local Private)</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>

              {/* Dropdown 2: Compatible Model (Populated based on Provider & API Key) */}
              <div className="flex items-center gap-1.5">
                <select
                  value={overrideModelId || connectedBrain?.modelId || ''}
                  onChange={(e) => {
                    const selectedModel = e.target.value;
                    const prov = overrideProvider || connectedBrain?.provider || 'openai';
                    setOverrideProvider(prov);
                    setOverrideModelId(selectedModel);
                    if (onUpdateNode && nodeId) {
                      onUpdateNode(nodeId, { brainProvider: prov, brainModelId: selectedModel });
                    }
                    window.dispatchEvent(new CustomEvent('keaos:toast', {
                      detail: { message: `✓ Selected model: ${selectedModel}` }
                    }));
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-[8px] border outline-none cursor-pointer transition-colors max-w-[170px] sm:max-w-[210px] truncate ${
                    isDarkMode 
                      ? 'bg-[#141720] border-[#383C4A] text-slate-200 focus:border-[#0091DA]' 
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-[#00338D]'
                  }`}
                  title="Select Compatible Model Architecture"
                >
                  {compatibleModelsList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>

                {/* API Key Status Pill */}
                <div 
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono select-none ${
                    Boolean(getProviderCredential(activeBrainProvider)) || activeBrainProvider === 'ollama'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                  title={
                    Boolean(getProviderCredential(activeBrainProvider)) || activeBrainProvider === 'ollama'
                      ? `${PROVIDERS[activeBrainProvider]?.name || activeBrainProvider} API Key Ready`
                      : `${PROVIDERS[activeBrainProvider]?.name || activeBrainProvider} API Key Missing`
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    Boolean(getProviderCredential(activeBrainProvider)) || activeBrainProvider === 'ollama'
                      ? 'bg-emerald-400'
                      : 'bg-amber-400 animate-pulse'
                  }`} />
                  <span className="hidden xl:inline">
                    {Boolean(getProviderCredential(activeBrainProvider)) || activeBrainProvider === 'ollama'
                      ? 'Key Ready'
                      : 'Key Missing'}
                  </span>
                </div>
              </div>
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
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Available Input Streams:</span>
                        {uploadedFileName && (
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 max-w-[140px] truncate" title={uploadedFileName}>
                            ✓ {uploadedFileName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileUploadInputRef.current?.click()}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-full border flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                            isDarkMode
                              ? 'bg-[#00338D]/40 border-[#00338D] text-blue-200 hover:bg-[#00338D]/70'
                              : 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                          }`}
                          title="Upload local CSV, Excel, or JSON test files directly into inputs"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>+ Upload Test Files (CSV/Excel)</span>
                        </button>
                        <input
                          ref={fileUploadInputRef}
                          type="file"
                          multiple
                          accept=".csv,.xlsx,.xls,.json"
                          onChange={handleStudioFileUpload}
                          className="hidden"
                        />
                        <span className="text-[9px] text-[#0091DA] hidden xl:inline">Click pill to copy</span>
                      </div>
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

                          {/* Phase 2: Finalized Code Badge & Reapply Button */}
                          {msg.code && (
                            <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Plan Finalized & Code Formulated ({msg.language || language})</span>
                              </div>
                              <button
                                onClick={() => {
                                  setCode(msg.code);
                                  if (msg.language) setLanguage(msg.language);
                                  window.dispatchEvent(new CustomEvent('keaos:toast', { detail: { message: '✓ Reapplied code to editor' } }));
                                }}
                                className="px-2.5 py-1 text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                              >
                                Reapply to Editor
                              </button>
                            </div>
                          )}

                          {/* Phase 1: Bilateral Plan Actions (Confirm or Request Changes) */}
                          {msg.role === 'assistant' && !msg.code && !msg.isError && msg.id !== 'msg-welcome' && (
                            <div className="mt-3 pt-2.5 border-t border-[#2C3242]/80 flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleSendChat("Yes, this plan is finalized. Please formulate the code.")}
                                disabled={isChatSending}
                                className="px-3 py-1.5 text-[11px] font-bold rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>✓ Yes, Confirm Plan & Formulate Code</span>
                              </button>
                              <button
                                onClick={() => {
                                  setChatInput("I want to adjust: ");
                                  setTimeout(() => {
                                    const inputEl = document.querySelector('input[placeholder*="Describe what this rule"]');
                                    if (inputEl) inputEl.focus();
                                  }, 50);
                                }}
                                disabled={isChatSending}
                                className="px-3 py-1.5 text-[11px] font-medium rounded-full bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span>✎ Request Changes</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isChatSending && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 p-2 font-mono">
                        <span className="w-2 h-2 rounded-full bg-[#0091DA] animate-ping" />
                        <span className="opacity-80">Reasoning architecture...</span>
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
