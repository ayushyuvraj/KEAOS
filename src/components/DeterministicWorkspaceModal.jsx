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
  FileSpreadsheet,
  Activity,
  Filter,
  Maximize2,
  Minimize2,
  Globe,
  LayoutDashboard,
  Bug,
  Wrench,
  Sliders,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { compileDeterministicLogic, getOfflineFallbackCode } from '../services/deterministicCompiler';
import { executeDeterministicTask, inferDataSchema, parseCsv } from '../services/deterministicRunner';
import { TAX_RECON_PROCESS_CODE } from '../constants/sampleTaxReconData';
import { CASH_FLOW_PROCESS_CODE } from '../constants/sampleCashFlowData';
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

  // Dual-Panel Workspace States: Left Panel (Chat ⟷ Code Editor) & Right Panel (Live Browser)
  const [leftView, setLeftView] = useState('chat'); // 'chat' (PRIMARY) | 'code'
  const [leftWidthPercent, setLeftWidthPercent] = useState(50);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [activeRightTab, setActiveRightTab] = useState('browser'); // 'browser' (PRIMARY) | 'table' | 'console' | 'json'
  const [isZone3Maximized, setIsZone3Maximized] = useState(false);

  // Drag-to-Resize mouse event listeners for central divider
  const handleMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 25), 75);
      setLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Conversational Chat State (Bilateral Discussion Protocol)
  const [chatMessages, setChatMessages] = useState(() => {
    if (Array.isArray(nodeData?.chatHistory) && nodeData.chatHistory.length > 0) {
      return nodeData.chatHistory;
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `I am your Deterministic Co-Pilot. Tell me what logic, calculations, or transformations you need. I will write the code immediately, explain it, and configure it for your rule box. You can ask for in-memory transforms, interactive file pickers (e.g. window.showOpenFilePicker), regex parsing, Excel reconciliations, and more.`,
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
  const [dashboardFilter, setDashboardFilter] = useState('ALL');
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

  // Keyboard listener for Escape (exit maximized full page view)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isZone3Maximized) {
        e.preventDefault();
        e.stopPropagation();
        setIsZone3Maximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isZone3Maximized]);

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
    let provider = (typeof rawProvider === 'string' && rawProvider.trim()) ? rawProvider.trim() : defaultProvider;

    // Prioritize an active configured provider if the inferred provider has no credentials
    if (!getProviderCredential(provider) && provider !== 'ollama' && defaultProvider && (getProviderCredential(defaultProvider) || defaultProvider === 'ollama')) {
      provider = defaultProvider;
    }

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
        { label: 'Cash Flow & Runway Engine', prompt: 'Create an interactive cash flow engine with monthly revenue and expense sliders, calculate button, and 12-month trajectory table.' },
        { label: 'Indirect Tax Reconciliation', prompt: 'Reconcile GSTR-2B tax portal data with ERP Purchase Register using 5-tier cascading matching.' },
        { label: 'Parse & Transform Inputs', prompt: 'Transform incoming inputs and extract structured key-value summary.' }
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
  const handleExecute = async (overrideCode = null) => {
    setIsExecuting(true);
    setExecutionError(null);

    try {
      let codeToRun = (typeof overrideCode === 'string') ? overrideCode : code;
      if (typeof overrideCode === 'string') {
        setCode(overrideCode);
      }
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

        // Auto-switch right tab: if HTML or summary exists, show live browser; else if table data exists, show table; else json
        const hasHtml = Boolean(res.output?.html || (typeof res.output === 'string' && (res.output.trim().startsWith('<') || res.output.trim().startsWith('<!DOCTYPE'))));
        const hasSummary = Boolean(res.output?.summary || (res.output && typeof res.output === 'object' && !Array.isArray(res.output) && Object.keys(res.output).some(k => typeof res.output[k] === 'number')));

        if (hasHtml || hasSummary) {
          setActiveRightTab('browser');
        } else if (res.tableData && Array.isArray(res.tableData) && res.tableData.length > 0) {
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

  // Conversational Co-Pilot Chat Sender (Uninhibited Modern AI Pair Programmer)
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
    lastPlanPromptRef.current = textToSend;

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

      // 2. Closed-Loop Context: Current Code in Editor
      const codeContext = `\n\nCURRENT CODE IN ZONE 2 EDITOR:\n\`\`\`${language || 'javascript'}\n${code || '// No code written yet'}\n\`\`\``;

      // 3. Closed-Loop Error Awareness: Active Runtime Failure in Zone 3 Isolate
      const errorContext = executionError ? `\n\n⚠️ ACTIVE RUNTIME ERROR IN ZONE 3 EXECUTION ISOLATE:
- Error Message: ${executionError}
- Failing Language: ${language || 'javascript'}
- Recent Console Logs: ${JSON.stringify(executionResult?.logs?.slice(-5) || [])}
- Available Upstream Input Keys: [${Object.keys(currentActiveInput || {}).join(', ')}]
DIAGNOSTIC & SELF-HEALING MANDATE:
The code failed with the runtime error above. You MUST analyze the root cause in the current code, explain why it broke, and generate the complete corrected replacement code in your markdown code block so that the user's editor is automatically updated and can run without errors.` : '';

      // 4. Modern Intelligent AI Pair-Programmer System Prompt
      const systemPrompt = `You are the KEAOS Deterministic Logic Co-Pilot & Senior Software Architect.
You help the user design, write, explain, and optimize deterministic code (JavaScript, Python, or SQL) for the KEAOS Deterministic Rule Box "${nodeName || 'Rule Box'}".

${inputContext}
${codeContext}
${errorContext}

CORE PHILOSOPHY & UNINHIBITED CODING CAPABILITIES:
1. WRITE COMPLETE, PRODUCTION-READY CODE IMMEDIATELY:
   - When the user asks to write logic, perform calculations, extract data, process files, or implement algorithms, WRITE THE COMPLETE WORKING CODE RIGHT AWAY.
   - Do NOT gatekeep code or delay behind rigid confirmation phases. Answer naturally, clearly, and empoweringly.
   - Accompany your code with a concise, helpful explanation of how it works and any relevant options.

2. RUNTIME & PLATFORM CONTRACT:
   - The code executes directly in the KEAOS Deterministic Box with 0 LLM token cost at runtime.
   - For JavaScript: define a \`function process(inputs, state)\` or \`async function process(inputs, state)\`.
     - In-Memory Data Streams: The function receives \`inputs\` (e.g., \`inputs.data\`, \`inputs.tableA\`, \`inputs.pr\`, etc.) and a persistent \`state\` object.
     - Interactive File Selection & Ingestion: If the user requests file processing (e.g., reading Excel files like GSTR2B and Purchase Register PR, CSVs, or JSON), write complete, self-contained JavaScript code utilizing modern Web APIs (\`window.showOpenFilePicker()\` or dynamic file inputs) and the built-in SheetJS \`XLSX\` library (e.g., \`const workbook = XLSX.read(data, { type: 'array' })\`, \`XLSX.utils.sheet_to_json(sheet)\`). SheetJS in JS delivers in-memory DataFrame-grade performance directly inside the browser isolate.
     - Standard Web APIs (fetch, crypto, Blob, URL, RegExp, Math, Date) and \`console.log(...)\` are fully supported.
     - Always provide fallback sample data when \`inputs\` is empty so clicking RUN immediately succeeds without errors.
   - For Python: define \`def process(inputs):\` returning transformed records or dicts. Standard libraries (pandas, math, re, json, datetime) are supported.
   - For SQL: provide clean SQL (SELECT ... FROM ...).
   - If the user asks for languages that require external compilation toolchains (e.g. Rust, C++), provide the code, but ALSO provide the equivalent browser-native JavaScript isolate code using SheetJS/Web APIs so they can execute it immediately inside this browser box without external compilers.

3. ADVISORY NOTES (NOT RESTRICTIONS):
   - If an approach has an operational tradeoff (e.g. using window.showOpenFilePicker requires an interactive user click, whereas for unattended automated pipelines they can also use an Ingestion Node), mention it briefly as a helpful tip, but ALWAYS fulfill what the user asked for.

4. FORMATTING:
   - Put the PRIMARY, EXECUTABLE APPLICATION CODE in the main markdown code block:
     \`\`\`${language || 'javascript'}
     // Complete, working process function
     async function process(inputs, state) {
       ...
       return result;
     }
     \`\`\`
   - If auxiliary configuration files or dependencies are needed (such as Cargo.toml or package.json), describe them in text or place them AFTER the primary code block, so the studio editor immediately receives the executable logic.
   - State a crisp functional summary at the beginning or end:
     RULE_SUMMARY: <Crisp summary of rule function, max 6-10 words>`;

      // Format conversation history for LLM
      const messagesForLlm = nextChatMessages.slice(-8).map(m => ({
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
        console.warn('Direct LLM chat failed:', llmErr);
        const errMsg = llmErr.message || String(llmErr);
        const isKeyMissing = errMsg.toLowerCase().includes('no api key') ||
                             errMsg.toLowerCase().includes('credential') ||
                             errMsg.toLowerCase().includes('unauthorized') ||
                             errMsg.toLowerCase().includes('401');

        if (isKeyMissing) {
          const providerName = PROVIDERS[provider]?.name || provider;
          responseText = `**API Key Missing for ${providerName}**\n\nTo chat with the Co-Pilot and generate code automatically, please select an active provider or enter your API key using the model dropdown at the top of this modal.\n\n*In the meantime, you can write or edit code directly in the center Code Editor, or select an alternate provider with an active key.*`;
        } else {
          responseText = `**Inference Notice (${PROVIDERS[provider]?.name || provider}):** ${errMsg}\n\nPlease check your API key or network connection, or switch to an alternate model architecture at the top.`;
        }
      }

      // Smart Multi-Code-Block Extraction & Prioritization
      const allCodeBlocks = [];
      const globalBlockRegex = /```([a-zA-Z0-9_\-]+)?\s*([\s\S]*?)```/g;
      let blockMatch;
      while ((blockMatch = globalBlockRegex.exec(responseText)) !== null) {
        const rawTag = (blockMatch[1] || '').trim().toLowerCase();
        const blockContent = blockMatch[2].trim();
        if (blockContent.length > 0) {
          allCodeBlocks.push({
            id: `blk-${allCodeBlocks.length}`,
            lang: rawTag || language || 'javascript',
            code: blockContent,
            linesCount: blockContent.split('\n').length
          });
        }
      }

      // Configuration / auxiliary language tags that should not take priority over actual implementations
      const CONFIG_LANGS = new Set([
        'toml', 'yaml', 'yml', 'json', 'bash', 'sh', 'shell', 'dockerfile',
        'txt', 'text', 'env', 'ini', 'requirements', 'markdown', 'md'
      ]);

      let primaryBlock = null;
      if (allCodeBlocks.length > 0) {
        // 1. First, search for non-config executable code blocks
        const implementationBlocks = allCodeBlocks.filter(b => !CONFIG_LANGS.has(b.lang));

        if (implementationBlocks.length > 0) {
          // Find block with function signatures or pick the longest implementation
          primaryBlock = implementationBlocks.find(b => 
            /\b(function|async\s+function|def|fn|const\s+process|let\s+process|var\s+process|SELECT)\b/i.test(b.code)
          ) || implementationBlocks.reduce((prev, curr) => (curr.code.length > prev.code.length ? curr : prev), implementationBlocks[0]);
        } else {
          // If all blocks are config blocks, take the largest one
          primaryBlock = allCodeBlocks.reduce((prev, curr) => (curr.code.length > prev.code.length ? curr : prev), allCodeBlocks[0]);
        }
      }

      if (primaryBlock && primaryBlock.code) {
        const rawLang = primaryBlock.lang.toLowerCase();
        let detectedLang = 'javascript';
        if (rawLang.includes('py')) detectedLang = 'python';
        else if (rawLang.includes('sql')) detectedLang = 'sql';
        else if (rawLang.includes('rust') || rawLang === 'rs') detectedLang = 'rust';
        else if (rawLang.includes('toml')) detectedLang = 'toml';
        else detectedLang = 'javascript';

        const detectedCode = primaryBlock.code;

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

        // Keep clean explanation
        const cleanContent = responseText.replace(/RULE_SUMMARY:\s*[^\n\r]+/i, '').trim();

        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: cleanContent,
          code: detectedCode,
          language: detectedLang,
          codeBlocks: allCodeBlocks,
          selectedBlockId: primaryBlock.id,
          isFinalized: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, aiMsg]);

        window.dispatchEvent(new CustomEvent('keaos:toast', {
          detail: { message: `✓ Logic formulated & loaded into Code Editor` }
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
        // Conversational / explanation response without code block
        const cleanContent = responseText.replace(/RULE_SUMMARY:\s*[^\n\r]+/i, '').trim();
        const aiMsg = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: cleanContent,
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

  // 1-Click Closed-Loop Auto-Fix Handler
  const handleAutoFixError = () => {
    if (!executionError) return;
    setLeftView('chat');
    const fixPrompt = `The execution failed with runtime error: "${executionError}". Please inspect the current code in the editor, diagnose the root cause, fix the issue, and provide the complete corrected replacement code.`;
    handleSendChat(fixPrompt);
  };

  // Popout Live Browser to Standalone Window
  const handlePopoutBrowser = () => {
    if (!executionResult?.output) return;
    const newWin = window.open('', '_blank');
    if (!newWin) {
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: 'Popout blocked: Please allow popups for this site.' }
      }));
      return;
    }
    const htmlContent = executionResult.output.html 
      || (typeof executionResult.output === 'string' && (executionResult.output.trim().startsWith('<') || executionResult.output.trim().startsWith('<!DOCTYPE')) ? executionResult.output : null);
    
    if (htmlContent) {
      newWin.document.write(htmlContent);
      newWin.document.close();
    } else {
      const title = executionResult.output?.summary?.title || executionResult.output?.title || nodeName || 'KEAOS Studio Preview';
      const jsonStr = JSON.stringify(executionResult.output, null, 2);
      newWin.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${title} — KEAOS Preview</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-[#0B0F19] text-slate-100 p-6 font-mono">
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="border-b border-[#2C3242] pb-4 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-[#EAAA00] uppercase tracking-wider">${title}</h1>
          <p class="text-xs text-slate-400">KEAOS Universal Deterministic Browser Isolate • 0 Tokens • ${executionResult.latencyMs || 0}ms</p>
        </div>
        <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/40">● Live Preview</span>
      </div>
      <pre class="bg-[#141720] border border-[#2C3242] p-4 rounded text-xs text-emerald-400 overflow-auto max-h-[80vh]">${jsonStr}</pre>
    </div>
  </body>
</html>`);
      newWin.document.close();
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
      if (Array.isArray(executionResult.output.records) && executionResult.output.records.length > 0) {
        return executionResult.output.records;
      }
      if (Array.isArray(executionResult.output.table) && executionResult.output.table.length > 0) {
        return executionResult.output.table;
      }
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
        {/* DUAL-PANEL RESIZABLE WORKSPACE (CHAT ⟷ CODE EDITOR | LIVE BROWSER)       */}
        {/* ========================================================================= */}
        <div 
          ref={containerRef}
          className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-transparent relative z-10"
        >
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT PANEL: 2-WAY TOGGLE [💬 CHAT (PRIMARY)] ⟷ [💻 CODE EDITOR]        */}
          {/* ----------------------------------------------------------------------- */}
          {!isZone3Maximized && (
            <div 
              style={{ width: `${leftWidthPercent}%` }}
              className={`flex flex-col h-full overflow-hidden transition-none border-r border-[#2C3242] shrink-0 ${
                isDarkMode ? 'bg-[#141720]' : 'bg-[#F8FAFC]'
              }`}
            >
              {/* Left Panel Header: 2-Way Segmented Toggle */}
              <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
                isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
              }`}>
                {/* 2-Way Segmented Button */}
                <div className="flex items-center p-0.5 rounded-[8px] bg-black/40 border border-slate-700/60 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setLeftView('chat')}
                    className={`px-3 py-1 text-xs font-mono flex items-center gap-1.5 rounded-[6px] transition-all cursor-pointer ${
                      leftView === 'chat'
                        ? isDarkMode ? 'bg-[#00338D] text-white font-bold shadow-xs' : 'bg-[#00338D] text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeftView('code')}
                    className={`px-3 py-1 text-xs font-mono flex items-center gap-1.5 rounded-[6px] transition-all cursor-pointer ${
                      leftView === 'code'
                        ? isDarkMode ? 'bg-[#00338D] text-white font-bold shadow-xs' : 'bg-[#00338D] text-white font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Code Editor</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/50 text-emerald-400 font-normal">
                      {codeLineCount}L
                    </span>
                  </button>
                </div>

                {/* Left Header Right Actions: Upload Test Files & Stream Count */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileUploadInputRef.current?.click()}
                    className={`px-2 py-1 text-[10px] font-mono rounded-[6px] border flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                      isDarkMode
                        ? 'bg-[#001E50] border-[#00338D] text-blue-300 hover:bg-[#00338D]'
                        : 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                    }`}
                    title="Upload local CSV, Excel, or JSON test files directly into inputs"
                  >
                    <Upload className="w-2.5 h-2.5" />
                    <span className="hidden sm:inline">+ Upload File</span>
                  </button>
                  <input
                    ref={fileUploadInputRef}
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={handleStudioFileUpload}
                    className="hidden"
                  />
                  <span className="text-[10px] font-mono text-slate-500">
                    {upstreamInfo.sources.length} Stream{upstreamInfo.sources.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* View 1: Conversational Chat (PRIMARY on Open) */}
              {leftView === 'chat' && (
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
                      <span className="text-[9px] text-[#0091DA] hidden xl:inline">Click pill to copy</span>
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
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-mono text-xs">
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

                          {/* Multi-Code-Block Selector or Single Code Badge */}
                          {msg.codeBlocks && msg.codeBlocks.length > 1 ? (
                            <div className="mt-3 pt-2.5 border-t border-[#2C3242] space-y-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span>Generated Blocks ({msg.codeBlocks.length})</span>
                                <span className="text-[9px] text-slate-500 font-mono">1-Click to Switch Editor</span>
                              </div>
                              <div className="space-y-1.5">
                                {msg.codeBlocks.map((blk, idx) => {
                                  const isCurrentlyInEditor = code === blk.code;
                                  return (
                                    <div
                                      key={blk.id || idx}
                                      className={`p-2 rounded border flex items-center justify-between gap-2 transition-all ${
                                        isCurrentlyInEditor
                                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                          : 'bg-black/30 border-slate-700/60 text-slate-300 hover:border-slate-500'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-black/40 border border-slate-700 text-[#0091DA]">
                                          {blk.lang || 'code'}
                                        </span>
                                        <span className="text-[11px] font-mono truncate text-slate-300">
                                          {blk.linesCount} lines {isCurrentlyInEditor ? '• Active' : ''}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          setCode(blk.code);
                                          const rawLang = (blk.lang || '').toLowerCase();
                                          if (rawLang.includes('py')) setLanguage('python');
                                          else if (rawLang.includes('sql')) setLanguage('sql');
                                          else if (rawLang.includes('rust') || rawLang === 'rs') setLanguage('rust');
                                          else if (rawLang.includes('toml')) setLanguage('toml');
                                          else setLanguage('javascript');

                                          window.dispatchEvent(new CustomEvent('keaos:toast', {
                                            detail: { message: `✓ Loaded ${blk.lang.toUpperCase()} into Code Editor` }
                                          }));
                                        }}
                                        className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all cursor-pointer ${
                                          isCurrentlyInEditor
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                            : 'bg-[#0091DA]/20 hover:bg-[#0091DA]/40 text-[#0091DA] border border-[#0091DA]/40'
                                        }`}
                                      >
                                        {isCurrentlyInEditor ? '✓ Active in Editor' : 'Load into Editor'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : msg.code ? (
                            <div className="mt-2.5 p-2 rounded-[8px] bg-black/40 border border-emerald-500/30 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-[10px] text-emerald-300 font-bold uppercase truncate">
                                  {msg.language || language} Implementation Active ({msg.code.split('\n').length} lines)
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setLeftView('code')}
                                  className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[#00338D] hover:bg-[#005EB8] text-white transition-all cursor-pointer"
                                >
                                  View in Code
                                </button>
                                <button
                                  type="button"
                                  onClick={handleExecute}
                                  className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Play className="w-2.5 h-2.5 fill-current" />
                                  <span>Run Now</span>
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {/* Quick Action Chip for non-code messages */}
                          {msg.role === 'assistant' && !msg.code && !msg.isError && msg.id !== 'msg-welcome' && (
                            <div className="mt-2 pt-2 border-t border-[#2C3242]/60 flex items-center gap-2">
                              <button
                                onClick={() => handleSendChat("Write the complete working code for this now.")}
                                disabled={isChatSending}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#0091DA]/20 hover:bg-[#0091DA]/30 border border-[#0091DA]/40 text-[#0091DA] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Code2 className="w-3 h-3" />
                                <span>Write Complete Code</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 mt-0.5 px-1">{msg.timestamp}</span>
                      </div>
                    ))}
                    {isChatSending && (
                      <div className="flex items-center gap-1.5 px-3 py-2 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA] animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA] animate-pulse delay-75" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA] animate-pulse delay-150" />
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Proactive Closed-Loop Error Remediation Chip */}
                  {executionError && (
                    <div className="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20 flex items-center justify-between text-[10px] font-mono shrink-0">
                      <div className="flex items-center gap-1.5 text-red-300 truncate max-w-[70%]">
                        <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">Active Error: {executionError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoFixError}
                        disabled={isChatSending}
                        className="text-[#EAAA00] hover:underline font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Auto-Fix</span>
                      </button>
                    </div>
                  )}

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
                      placeholder="Ask Co-Pilot to write code, cash flow engine, tax reconciler... (Enter to send)"
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

              {/* View 2: Full-Height Code Editor */}
              {leftView === 'code' && (
                <div className={`flex-1 flex flex-col h-full overflow-hidden transition-colors ${
                  isDarkMode ? 'bg-[#0B0F19]' : 'bg-[#FFFFFF]'
                }`}>
                  {/* Editor Sub-Header */}
                  <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
                    isDarkMode ? 'bg-[#141720] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-[#EAAA00]" />
                      <span className="text-xs font-mono font-bold">Deterministic Code</span>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border outline-none cursor-pointer ${
                          isDarkMode ? 'bg-[#0091DA]/20 text-[#0091DA] border-[#0091DA]/40' : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        <option value="javascript">JavaScript (Browser Native)</option>
                        <option value="python">Python</option>
                        <option value="sql">SQL</option>
                      </select>
                      <span className="text-[10px] text-slate-500 font-mono">{codeLineCount} lines</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyCode}
                        className="px-2 py-1 text-[11px] font-mono border border-slate-700 hover:border-slate-500 text-slate-300 rounded-[6px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={handleExecute}
                        disabled={isExecuting || isCompiling}
                        className="px-2.5 py-1 text-[11px] font-mono font-bold bg-[#00338D] hover:bg-[#005EB8] text-white rounded-[6px] flex items-center gap-1 transition-all cursor-pointer"
                        title="Run code (Ctrl+Enter)"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Run</span>
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
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* DRAGGABLE DIVIDER RESIZER HANDLE (col-resize)                             */}
          {/* ========================================================================= */}
          {!isZone3Maximized && (
            <div
              onMouseDown={handleMouseDown}
              className="w-2 hover:w-2.5 bg-[#2C3242] hover:bg-[#0091DA] active:bg-[#0091DA] cursor-col-resize transition-all duration-150 flex items-center justify-center shrink-0 group relative z-20 select-none"
              title="Drag horizontally to resize panels"
            >
              <div className="w-0.5 h-10 bg-slate-500 group-hover:bg-white group-active:bg-white rounded-full transition-colors" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* RIGHT PANEL: LIVE BROWSER SANDBOX & DEVTOOLS                              */}
          {/* ========================================================================= */}
          <div 
            style={{ width: isZone3Maximized ? '100%' : `${100 - leftWidthPercent}%` }}
            className={`flex flex-col h-full overflow-hidden transition-none ${
              isDarkMode ? 'bg-[#141720]' : 'bg-[#F8FAFC]'
            }`}>
            {/* Zone 3 Tabs & Action Bar */}
            <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-1">
                {(() => {
                  const hasTaxReconSummary = Boolean(executionResult?.output?.summary && (executionResult.output.summary.totalGstrRows !== undefined || executionResult.output.summary.exactMatchCount !== undefined));
                  const hasHtmlOutput = Boolean(executionResult?.output?.html || (typeof executionResult?.output === 'string' && (executionResult.output.trim().startsWith('<') || executionResult.output.trim().startsWith('<!DOCTYPE'))));
                  const browserTabLabel = hasTaxReconSummary 
                    ? 'Tax Recon Dashboard' 
                    : hasHtmlOutput 
                      ? 'Live Web View' 
                      : (executionResult?.output?.summary?.title || executionResult?.output?.title || 'Live Browser');

                  const zone3Tabs = [
                    { id: 'browser', label: browserTabLabel, icon: hasHtmlOutput ? Globe : LayoutDashboard },
                    { id: 'table', label: `Table (${outputRows.length})`, icon: TableIcon },
                    { id: 'json', label: 'JSON Tree', icon: FileCode },
                    { id: 'console', label: `Console (${executionResult?.logs?.length || 0})`, icon: Terminal }
                  ];

                  return zone3Tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeRightTab === tab.id || (tab.id === 'browser' && activeRightTab === 'dashboard');
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
                  });
                })()}
              </div>

              {/* Pipe to Canvas & Export & Full Page Actions */}
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

                    <button
                      type="button"
                      onClick={handlePopoutBrowser}
                      className="px-1.5 py-1 text-[10px] font-mono border border-slate-700 rounded text-slate-300 hover:text-white flex items-center gap-1"
                      title="Open Live Preview in Standalone Browser Window"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span className="hidden xl:inline">Popout</span>
                    </button>
                  </>
                )}

                {/* Full-Page Maximize / Restore Toggle */}
                <button
                  type="button"
                  onClick={() => setIsZone3Maximized(prev => !prev)}
                  className={`px-2 py-1 text-[10px] font-mono rounded-[6px] border flex items-center gap-1 transition-all cursor-pointer ${
                    isZone3Maximized
                      ? 'bg-[#EAAA00]/20 text-[#EAAA00] border-[#EAAA00]/40 font-bold'
                      : isDarkMode ? 'bg-[#181920] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                  title={isZone3Maximized ? 'Restore 3-Zone View (Esc)' : 'Extend Live Browser to Full Page'}
                >
                  {isZone3Maximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span>{isZone3Maximized ? 'Restore' : 'Maximize'}</span>
                </button>
              </div>
            </div>

            {/* Zone 3 Body */}
            <div className="flex-1 overflow-hidden p-3 flex flex-col">
              
              {/* Execution Error Banner with 1-Click AI Auto-Fix */}
              {executionError && (
                <div className="mb-3 p-3 rounded-[10px] border border-red-500/30 bg-red-500/10 text-red-300 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Execution Error:</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFixError}
                      disabled={isChatSending}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-[6px] bg-[#00338D] hover:bg-[#005EB8] text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-[#0091DA]/50"
                      title="Send error and failing code directly to Co-Pilot to automatically diagnose and fix"
                    >
                      {isChatSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-[#EAAA00]" />}
                      <span>Auto-Fix with AI Co-Pilot</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] p-2 rounded bg-black/40 border border-red-500/20 text-red-200 overflow-x-auto">{executionError}</pre>
                </div>
              )}

              {(activeRightTab === 'browser' || activeRightTab === 'dashboard') ? (
                /* TAB 0: UNIVERSAL LIVE BROWSER & EXECUTIVE DASHBOARD STUDIO */
                executionResult?.output ? (
                /* TAB 0: UNIVERSAL LIVE BROWSER & EXECUTIVE DASHBOARD STUDIO */
                (() => {
                  const rawOut = executionResult.output;
                  const summary = rawOut?.summary || (typeof rawOut === 'object' && !Array.isArray(rawOut) ? rawOut : null);
                  const htmlContent = rawOut?.html || (typeof rawOut === 'string' && (rawOut.trim().startsWith('<') || rawOut.trim().startsWith('<!DOCTYPE')) ? rawOut : null);
                  
                  // Check if this is the specialized Indirect Tax Reconciliation workflow
                  const isTaxRecon = summary && (summary.totalGstrRows !== undefined || summary.exactMatchCount !== undefined);

                  if (htmlContent) {
                    // Mode 1: HTML Sandboxed Webview Mode
                    return (
                      <div className="flex-1 flex flex-col overflow-hidden font-mono space-y-2">
                        {/* Mini Browser Chrome Toolbar */}
                        <div className={`p-2 border rounded-none flex items-center justify-between shrink-0 text-xs ${
                          isDarkMode ? 'bg-[#0B0F19] border-[#2C3242]' : 'bg-[#F0F4F8] border-[#CBD5E1]'
                        }`}>
                          <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                            <div className="flex-1 bg-black/40 border border-slate-700/60 rounded px-2.5 py-1 text-[10px] text-slate-300 truncate">
                              <span className="text-emerald-400 font-bold">http://127.0.0.1:5173/isolate/web-preview</span>
                              <span className="text-slate-500 ml-2">({executionResult.latencyMs || 0}ms • 0 Tokens)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={handleExecute}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                              title="Reload Preview (Ctrl+Enter)"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={handlePopoutBrowser}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                              title="Open in new window"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Sandboxed Iframe */}
                        <div className="flex-1 border border-slate-700/60 rounded overflow-hidden bg-white">
                          <iframe
                            title="KEAOS Studio Webview"
                            srcDoc={htmlContent}
                            className="w-full h-full border-0"
                            sandbox="allow-scripts allow-popups"
                          />
                        </div>
                      </div>
                    );
                  }

                  if (isTaxRecon) {
                    const allRecords = Array.isArray(rawOut?.records) 
                      ? rawOut.records 
                      : outputRows;
                  
                  // Filter records by selected category
                  const filteredRecords = allRecords.filter(r => {
                    if (dashboardFilter === 'EXACT') return r.matchType === 'EXACT_MATCH';
                    if (dashboardFilter === 'NEAR') return r.matchType === 'NEAR_MATCH';
                    if (dashboardFilter === 'TOLERANCE') return r.matchType === 'TOLERANCE_MATCH';
                    if (dashboardFilter === 'SPLIT') return r.matchType?.startsWith('SPLIT');
                    if (dashboardFilter === 'MISSING_PR') return r.matchType === 'MISMATCH_GSTR_ONLY';
                    if (dashboardFilter === 'MISSING_GSTR') return r.matchType === 'MISMATCH_PR_ONLY';
                    if (dashboardFilter === 'MISMATCHES') return r.matchType?.startsWith('MISMATCH');
                    return true;
                  }).filter(r => {
                    if (!outputSearch) return true;
                    const q = outputSearch.toLowerCase();
                    return (
                      (r.gstin && String(r.gstin).toLowerCase().includes(q)) ||
                      (r.vendor && String(r.vendor).toLowerCase().includes(q)) ||
                      (r.invoiceNumber && String(r.invoiceNumber).toLowerCase().includes(q)) ||
                      (r.status && String(r.status).toLowerCase().includes(q))
                    );
                  });

                  return (
                    <div className="flex-1 flex flex-col overflow-y-auto font-sans space-y-3 pr-1">
                      {/* Top Header Card */}
                      <div className={`p-3 border rounded-none flex items-center justify-between shrink-0 ${
                        isDarkMode ? 'bg-[#0B0F19] border-[#2C3242]' : 'bg-[#F0F4F8] border-[#CBD5E1]'
                      }`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#EAAA00]">
                              Indirect Tax Reconciliation Dashboard
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#009A44]/20 text-[#009A44] border border-[#009A44]/40">
                              {summary.reconciliationRate || '73%'} Auto-Reconciled
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            GSTR-2B (Govt Tax Portal) ↔ Purchase Register (ERP AP Ledger)
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 block">Execution Latency</span>
                          <span className="text-xs font-bold text-emerald-400">{executionResult.latencyMs || 0}ms • 0 Tokens</span>
                        </div>
                      </div>

                      {/* 7 Core KPI Metric Cards (Strictly per user's specification) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 shrink-0">
                        {/* 1. GSTR Rows */}
                        <div 
                          onClick={() => setDashboardFilter('ALL')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'ALL' ? 'border-[#0091DA] ring-1 ring-[#0091DA]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-slate-500' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-slate-400 block">1. GSTR-2B Rows</span>
                          <span className="text-base font-mono font-bold text-white block mt-0.5">{summary.totalGstrRows}</span>
                          <span className="text-[8px] text-[#0091DA] font-mono">Portal Total</span>
                        </div>

                        {/* 2. PR Rows */}
                        <div 
                          onClick={() => setDashboardFilter('ALL')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'ALL' ? 'border-[#0091DA] ring-1 ring-[#0091DA]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-slate-500' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-slate-400 block">2. PR ERP Rows</span>
                          <span className="text-base font-mono font-bold text-white block mt-0.5">{summary.totalPrRows}</span>
                          <span className="text-[8px] text-[#0091DA] font-mono">Books Total</span>
                        </div>

                        {/* 3. Exact Matches */}
                        <div 
                          onClick={() => setDashboardFilter('EXACT')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'EXACT' ? 'border-[#009A44] ring-1 ring-[#009A44]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-[#009A44]/60' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-[#009A44] block font-bold">3. Exact Matches</span>
                          <span className="text-base font-mono font-bold text-[#009A44] block mt-0.5">{summary.exactMatchCount}</span>
                          <span className="text-[8px] text-slate-400 font-mono">100% Direct</span>
                        </div>

                        {/* 4. Near Matches */}
                        <div 
                          onClick={() => setDashboardFilter('NEAR')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'NEAR' ? 'border-[#00A3A6] ring-1 ring-[#00A3A6]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-[#00A3A6]/60' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-[#00A3A6] block font-bold">4. Near Matches</span>
                          <span className="text-base font-mono font-bold text-[#00A3A6] block mt-0.5">{summary.nearMatchCount}</span>
                          <span className="text-[8px] text-slate-400 font-mono">Normalized Inv</span>
                        </div>

                        {/* 5. Tolerance Matches */}
                        <div 
                          onClick={() => setDashboardFilter('TOLERANCE')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'TOLERANCE' ? 'border-[#EAAA00] ring-1 ring-[#EAAA00]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-[#EAAA00]/60' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-[#EAAA00] block font-bold">5. Tolerance Matches</span>
                          <span className="text-base font-mono font-bold text-[#EAAA00] block mt-0.5">{summary.toleranceMatchCount}</span>
                          <span className="text-[8px] text-slate-400 font-mono">±30d / ±₹1k</span>
                        </div>

                        {/* 6. Mismatches */}
                        <div 
                          onClick={() => setDashboardFilter('MISMATCHES')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'MISMATCHES' ? 'border-[#E02424] ring-1 ring-[#E02424]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-[#E02424]/60' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-[#E02424] block font-bold">6. Mismatches</span>
                          <span className="text-base font-mono font-bold text-[#E02424] block mt-0.5">{summary.mismatchCount}</span>
                          <span className="text-[8px] text-slate-400 font-mono">PR:{summary.mismatchesPrOnlyCount} | GSTR:{summary.mismatchesGstrOnlyCount}</span>
                        </div>

                        {/* 7. Ambiguous Matches */}
                        <div 
                          onClick={() => setDashboardFilter('SPLIT')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            dashboardFilter === 'SPLIT' ? 'border-[#483698] ring-1 ring-[#483698]' : isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-[#483698]/60' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-[#A78BFA] block font-bold">7. Ambiguous</span>
                          <span className="text-base font-mono font-bold text-[#A78BFA] block mt-0.5">{summary.ambiguousMatchCount}</span>
                          <span className="text-[8px] text-slate-400 font-mono">Split 1:N / N:1</span>
                        </div>
                      </div>

                      {/* Financial ITC Exposure Banner */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                        <div className="p-2.5 border rounded-none bg-emerald-950/20 border-emerald-500/40 flex items-center justify-between font-mono">
                          <div>
                            <span className="text-[9px] uppercase text-emerald-400 block font-bold">Reconciled Eligible ITC (Sec 16 Admissible)</span>
                            <span className="text-lg font-bold text-emerald-300">₹{Number(summary.totalReconciledItc || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">GSTR-3B Ready</span>
                        </div>

                        <div className="p-2.5 border rounded-none bg-rose-950/20 border-rose-500/40 flex items-center justify-between font-mono">
                          <div>
                            <span className="text-[9px] uppercase text-rose-400 block font-bold">At-Risk Disallowed ITC (DRC-01C Exposure)</span>
                            <span className="text-lg font-bold text-rose-300">₹{Number(summary.totalAtRiskItc || 0).toLocaleString('en-IN')}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full font-bold">Vendor Notice Required</span>
                        </div>
                      </div>

                      {/* Category Filter Pills & Search */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800 shrink-0">
                        <div className="flex items-center gap-1 overflow-x-auto py-1">
                          {[
                            { id: 'ALL', label: `All (${allRecords.length})` },
                            { id: 'EXACT', label: `Exact (${summary.exactMatchCount})`, color: 'text-emerald-400' },
                            { id: 'NEAR', label: `Near (${summary.nearMatchCount})`, color: 'text-teal-400' },
                            { id: 'TOLERANCE', label: `Tolerance (${summary.toleranceMatchCount})`, color: 'text-amber-400' },
                            { id: 'SPLIT', label: `Split (${summary.splitMatchCount})`, color: 'text-violet-400' },
                            { id: 'MISSING_GSTR', label: `Missing in GSTR (${summary.mismatchesPrOnlyCount})`, color: 'text-rose-400' },
                            { id: 'MISSING_PR', label: `Missing in PR (${summary.mismatchesGstrOnlyCount})`, color: 'text-orange-400' }
                          ].map(f => (
                            <button
                              key={f.id}
                              onClick={() => setDashboardFilter(f.id)}
                              className={`px-2 py-0.5 text-[10px] font-mono rounded-full border transition-all whitespace-nowrap cursor-pointer ${
                                dashboardFilter === f.id
                                  ? 'bg-blue-600 text-white border-blue-500 font-bold'
                                  : 'bg-black/30 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className={f.color}>{f.label}</span>
                            </button>
                          ))}
                        </div>

                        <div className="relative shrink-0">
                          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                          <input
                            type="text"
                            value={outputSearch}
                            onChange={(e) => setOutputSearch(e.target.value)}
                            placeholder="Filter records..."
                            className="pl-6 pr-2 py-0.5 text-[10px] font-mono border border-slate-700 bg-black/40 rounded text-white outline-none w-36"
                          />
                        </div>
                      </div>

                      {/* Audit Table */}
                      <div className="flex-1 border border-slate-700/60 rounded-none overflow-auto min-h-[220px]">
                        <table className="w-full text-left text-xs font-mono divide-y divide-slate-800">
                          <thead className="bg-[#0B0F19] sticky top-0 z-10">
                            <tr>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-400">#</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300">Status</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300">Supplier GSTIN</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300">Vendor Name</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300">Invoice #</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300">Date / Lag</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300 text-right">GSTR Val</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300 text-right">PR Val</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300 text-right">Delta</th>
                              <th className="py-2 px-2 text-[9px] font-bold uppercase text-slate-300">Compliance Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {filteredRecords.map((r, idx) => {
                              const isExact = r.matchType === 'EXACT_MATCH';
                              const isNear = r.matchType === 'NEAR_MATCH';
                              const isTolerance = r.matchType === 'TOLERANCE_MATCH';
                              const isSplit = r.matchType?.startsWith('SPLIT');
                              const isMissingGstr = r.matchType === 'MISMATCH_PR_ONLY';

                              return (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="py-1.5 px-2 text-[10px] text-slate-500">{idx + 1}</td>
                                  <td className="py-1.5 px-2 whitespace-nowrap">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                                      isExact ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                                      isNear ? 'bg-teal-500/20 text-teal-400 border-teal-500/40' :
                                      isTolerance ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                                      isSplit ? 'bg-violet-500/20 text-violet-400 border-violet-500/40' :
                                      isMissingGstr ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                                      'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                    }`}>
                                      {r.status || r.matchType}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 text-[10px] text-slate-300 font-mono font-bold">{r.gstin}</td>
                                  <td className="py-1.5 px-2 text-[10px] text-slate-200 truncate max-w-[120px]">{r.vendor}</td>
                                  <td className="py-1.5 px-2 text-[10px] text-slate-300 font-mono truncate max-w-[130px]">{r.invoiceNumber}</td>
                                  <td className="py-1.5 px-2 text-[9px] text-slate-400 whitespace-nowrap">
                                    {r.invoiceDate} {r.dateDiff && r.dateDiff !== '0d' && r.dateDiff !== 'N/A' && (
                                      <span className="text-amber-400 font-bold ml-1">({r.dateDiff})</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 text-[10px] font-mono text-right text-slate-300">
                                    ₹{Number(r.gstrValue || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-1.5 px-2 text-[10px] font-mono text-right text-slate-300">
                                    ₹{Number(r.prValue || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-1.5 px-2 text-[10px] font-mono text-right whitespace-nowrap">
                                    {r.deltaAmount !== 0 ? (
                                      <span className={r.deltaAmount > 0 ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                                        {r.deltaAmount > 0 ? `+₹${r.deltaAmount}` : `-₹${Math.abs(r.deltaAmount)}`}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-400">₹0</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 text-[9px] text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate max-w-[180px]">{r.action || r.notes}</span>
                                      {isSplit && (
                                        <button
                                          onClick={() => {
                                            window.dispatchEvent(new CustomEvent('keaos:toast', {
                                              detail: { message: `✓ Split match approved by auditor for ${r.invoiceNumber}` }
                                            }));
                                          }}
                                          className="px-1.5 py-0.5 text-[8px] rounded font-mono bg-violet-600/30 text-violet-300 border border-violet-500 hover:bg-violet-600/50 cursor-pointer shrink-0"
                                        >
                                          Confirm
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // Mode 3: Adaptive Universal Executive Dashboard (For ANY future workflow!)
                const allRecords = Array.isArray(rawOut?.records)
                  ? rawOut.records
                  : Array.isArray(rawOut?.items)
                  ? rawOut.items
                  : Array.isArray(rawOut?.data)
                  ? rawOut.data
                  : Array.isArray(rawOut?.transactions)
                  ? rawOut.transactions
                  : Array.isArray(rawOut?.cohort)
                  ? rawOut.cohort
                  : Array.isArray(rawOut?.patients)
                  ? rawOut.patients
                  : Array.isArray(rawOut?.orders)
                  ? rawOut.orders
                  : outputRows;

                // Extract or compute KPIs dynamically
                const detectedSummary = rawOut?.summary || rawOut?.kpis || rawOut?.metrics || rawOut?.stats || {};
                const dynamicKpis = [];

                const explicitKeys = Object.keys(detectedSummary).filter(k => typeof detectedSummary[k] !== 'object' && detectedSummary[k] !== null);
                if (explicitKeys.length > 0) {
                  explicitKeys.slice(0, 7).forEach(key => {
                    const val = detectedSummary[key];
                    const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toUpperCase();
                    let displayVal = String(val);
                    if (typeof val === 'number') {
                      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('percent') || key.toLowerCase().includes('pct')) {
                        displayVal = `${val.toFixed(1)}%`;
                      } else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('value') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('saving') || key.toLowerCase().includes('balance')) {
                        displayVal = `₹${val.toLocaleString('en-IN')}`;
                      } else {
                        displayVal = val.toLocaleString();
                      }
                    }
                    dynamicKpis.push({ key, label, val: displayVal, sub: 'Workflow KPI' });
                  });
                }

                // If dynamicKpis is small, compute auto-metrics from allRecords
                if (dynamicKpis.length < 3 && allRecords.length > 0) {
                  dynamicKpis.push({
                    key: 'total_records',
                    label: 'TOTAL PROCESSED',
                    val: allRecords.length.toLocaleString(),
                    sub: 'Dataset Records'
                  });

                  const statusCounts = {};
                  const numericSums = {};
                  allRecords.forEach(r => {
                    const st = r.status || r.state || r.category || r.riskLevel || r.matchType || r.tier;
                    if (st) statusCounts[st] = (statusCounts[st] || 0) + 1;
                    Object.keys(r).forEach(k => {
                      if (typeof r[k] === 'number') {
                        numericSums[k] = (numericSums[k] || 0) + r[k];
                      }
                    });
                  });

                  const topStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
                  if (topStatuses.length > 0) {
                    dynamicKpis.push({
                      key: 'primary_status',
                      label: String(topStatuses[0][0]).toUpperCase(),
                      val: topStatuses[0][1].toLocaleString(),
                      sub: `${Math.round((topStatuses[0][1] / allRecords.length) * 100)}% of total`
                    });
                  }

                  const numEntries = Object.entries(numericSums);
                  if (numEntries.length > 0) {
                    const [numKey, numSum] = numEntries[0];
                    const label = numKey.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toUpperCase();
                    const isCurrency = numKey.toLowerCase().includes('amount') || numKey.toLowerCase().includes('cost') || numKey.toLowerCase().includes('price') || numKey.toLowerCase().includes('val');
                    dynamicKpis.push({
                      key: numKey,
                      label: `TOTAL ${label}`,
                      val: isCurrency ? `₹${Math.round(numSum).toLocaleString('en-IN')}` : Math.round(numSum).toLocaleString(),
                      sub: `Avg: ${(numSum / allRecords.length).toFixed(1)}`
                    });
                  }
                }

                if (dynamicKpis.length === 0) {
                  dynamicKpis.push({
                    key: 'status',
                    label: 'EXECUTION STATUS',
                    val: executionResult.success ? 'SUCCESS' : 'FAILED',
                    sub: `${executionResult.latencyMs || 0}ms latency`
                  });
                }

                // Status distribution
                const statusMap = {};
                allRecords.forEach(r => {
                  const st = r.status || r.state || r.category || r.riskLevel || r.matchType || r.action || 'PROCESSED';
                  statusMap[st] = (statusMap[st] || 0) + 1;
                });
                const statusEntries = Object.entries(statusMap);
                const uniqueStatuses = ['ALL', ...Object.keys(statusMap)];

                // Filter records
                const filteredUniversalRecords = allRecords.filter(r => {
                  if (dashboardFilter && dashboardFilter !== 'ALL') {
                    const st = r.status || r.state || r.category || r.riskLevel || r.matchType || r.action;
                    if (st !== dashboardFilter) return false;
                  }
                  if (!outputSearch) return true;
                  const q = outputSearch.toLowerCase();
                  return Object.values(r).some(v => String(v).toLowerCase().includes(q));
                });

                // Infer table columns
                const inferredColumns = allRecords.length > 0
                  ? Object.keys(allRecords[0]).filter(k => typeof allRecords[0][k] !== 'object' || allRecords[0][k] === null).slice(0, 8)
                  : [];

                const palette = ['#009A44', '#0091DA', '#EAAA00', '#6D2077', '#00338D', '#E02424'];

                return (
                  <div className="flex-1 flex flex-col overflow-y-auto font-sans space-y-3 pr-1">
                    {/* Top Header Card */}
                    <div className={`p-3 border rounded-none flex items-center justify-between shrink-0 ${
                      isDarkMode ? 'bg-[#0B0F19] border-[#2C3242]' : 'bg-[#F0F4F8] border-[#CBD5E1]'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#0091DA] flex items-center gap-1.5">
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            {selectedNode?.data?.label || node?.data?.label || 'Universal Executive Dashboard'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#009A44]/20 text-[#009A44] border border-[#009A44]/40">
                            {executionResult.success ? '✓ 100% Deterministic' : 'Failed'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {selectedLanguage?.toUpperCase()} Isolate • Real-Time Algorithmic Execution Output
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-400 block">Execution Latency</span>
                        <span className="text-xs font-bold text-emerald-400">{executionResult.latencyMs || 0}ms • 0 Tokens</span>
                      </div>
                    </div>

                    {/* Dynamic KPI Cards Grid */}
                    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(dynamicKpis.length, 6)} gap-1.5 shrink-0`}>
                      {dynamicKpis.map((kpi, idx) => (
                        <div
                          key={kpi.key || idx}
                          onClick={() => setDashboardFilter('ALL')}
                          className={`p-2 border rounded-none cursor-pointer transition-all ${
                            isDarkMode ? 'bg-[#0E131F] border-[#2C3242] hover:border-slate-500' : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase text-slate-400 block truncate">{kpi.label}</span>
                          <span className="text-base font-mono font-bold text-white block mt-0.5 truncate">{kpi.val}</span>
                          <span className="text-[8px] text-[#0091DA] font-mono truncate block">{kpi.sub}</span>
                        </div>
                      ))}
                    </div>

                    {/* Status Distribution Bar */}
                    {statusEntries.length > 1 && (
                      <div className={`p-2.5 border rounded-none shrink-0 ${
                        isDarkMode ? 'bg-[#0E131F] border-[#2C3242]' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                          <span>Status Classification Breakdown</span>
                          <span>{allRecords.length} records evaluated</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-none overflow-hidden flex">
                          {statusEntries.map(([st, count], i) => {
                            const pct = Math.round((count / allRecords.length) * 100);
                            const color = palette[i % palette.length];
                            return (
                              <div
                                key={st}
                                style={{ width: `${pct}%`, backgroundColor: color }}
                                title={`${st}: ${count} (${pct}%)`}
                                className="h-full transition-all duration-300"
                              />
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] font-mono">
                          {statusEntries.map(([st, count], i) => {
                            const pct = Math.round((count / allRecords.length) * 100);
                            const color = palette[i % palette.length];
                            return (
                              <div key={st} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-slate-300 uppercase">{st}:</span>
                                <span className="text-white font-bold">{count} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filter Pills & Search */}
                    <div className="flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[65%]">
                        {uniqueStatuses.slice(0, 6).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setDashboardFilter(st)}
                            className={`px-2 py-0.5 text-[9px] font-mono rounded-none uppercase transition-all whitespace-nowrap cursor-pointer ${
                              dashboardFilter === st
                                ? 'bg-[#00338D] text-white font-bold border border-[#005EB8]'
                                : isDarkMode
                                ? 'bg-[#0E131F] text-slate-400 border border-[#2C3242] hover:text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <div className="relative flex-1 max-w-[200px]">
                        <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
                        <input
                          type="text"
                          value={outputSearch}
                          onChange={(e) => setOutputSearch(e.target.value)}
                          placeholder="Search records..."
                          className={`w-full pl-7 pr-2 py-1 text-[10px] font-mono border rounded-none outline-none ${
                            isDarkMode ? 'bg-[#0E131F] border-[#2C3242] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Table Data View */}
                    {allRecords.length > 0 && inferredColumns.length > 0 ? (
                      <div className={`flex-1 border rounded-none overflow-auto min-h-[220px] ${
                        isDarkMode ? 'bg-[#0B0F19] border-[#2C3242]' : 'bg-white border-slate-200'
                      }`}>
                        <table className="w-full border-collapse text-left">
                          <thead className={`sticky top-0 text-[9px] font-mono uppercase tracking-wider ${
                            isDarkMode ? 'bg-[#0E131F] text-slate-400 border-b border-[#2C3242]' : 'bg-slate-100 text-slate-600 border-b border-slate-300'
                          }`}>
                            <tr>
                              <th className="py-2 px-2.5">#</th>
                              {inferredColumns.map(col => (
                                <th key={col} className="py-2 px-2.5 truncate max-w-[150px]">
                                  {col.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1F2430]">
                            {filteredUniversalRecords.slice(0, 100).map((row, idx) => (
                              <tr key={row.id || idx} className="hover:bg-white/[0.03] transition-colors">
                                <td className="py-1.5 px-2.5 text-[9px] font-mono text-slate-500">{idx + 1}</td>
                                {inferredColumns.map(col => {
                                  const cellVal = row[col];
                                  const isStatusCol = col.toLowerCase().includes('status') || col.toLowerCase().includes('risk') || col.toLowerCase().includes('state');
                                  const isNumeric = typeof cellVal === 'number';
                                  const isCurrency = isNumeric && (col.toLowerCase().includes('amount') || col.toLowerCase().includes('price') || col.toLowerCase().includes('cost') || col.toLowerCase().includes('val'));

                                  return (
                                    <td key={col} className="py-1.5 px-2.5 text-[10px] font-mono text-slate-300 truncate max-w-[180px]">
                                      {isStatusCol ? (
                                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase bg-[#0091DA]/20 text-[#0091DA] border border-[#0091DA]/40">
                                          {String(cellVal || 'N/A')}
                                        </span>
                                      ) : isCurrency ? (
                                        <span className="font-bold text-emerald-400">
                                          ₹{cellVal.toLocaleString('en-IN')}
                                        </span>
                                      ) : (
                                        String(cellVal ?? '-')
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-700">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase">Algorithmic Execution Complete</h4>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-sm font-mono">
                          Isolate executed successfully in {executionResult.latencyMs || 0}ms with 0 LLM tokens consumed.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* LIVE BROWSER GENESIS CANVAS (Before Execution or Initial State) */
              <div className="flex-1 flex flex-col overflow-hidden font-mono space-y-3">
                {/* Mini Browser Chrome Toolbar */}
                <div className={`p-2 border rounded-none flex items-center justify-between shrink-0 text-xs ${
                  isDarkMode ? 'bg-[#0B0F19] border-[#2C3242]' : 'bg-[#F0F4F8] border-[#CBD5E1]'
                }`}>
                  <div className="flex items-center gap-2 flex-1 mr-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    <div className="flex-1 bg-black/40 border border-slate-700/60 rounded px-2.5 py-1 text-[10px] text-slate-300 truncate flex items-center justify-between">
                      <span className="text-emerald-400 font-bold truncate">http://127.0.0.1:5173/sandbox/live</span>
                      <span className="text-slate-500 hidden sm:inline ml-2">(Client V8 Isolate • 0 Tokens • Ready)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecute()}
                    disabled={isExecuting}
                    className="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#00338D] hover:bg-[#005EB8] text-white rounded-none border border-[#0091DA]/50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current text-[#EAAA00]" />}
                    <span>RUN NOW</span>
                  </button>
                </div>

                {/* Genesis Canvas Hero & Quick-Launch Environments */}
                <div className={`flex-1 border rounded-none p-5 flex flex-col justify-between overflow-y-auto ${
                  isDarkMode ? 'bg-[#0B0F19]/60 border-[#2C3242]' : 'bg-white border-slate-200'
                }`}>
                  <div className="space-y-4">
                    {/* Hero Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full bg-[#00338D]/20 text-[#0091DA] border border-[#00338D]/40">
                          Universal Webview Sandbox
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Zero-Token Deterministic Runtime
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white tracking-wide uppercase font-sans">
                        Live Browser & Interactive Dashboard Canvas
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                        Ask Co-Pilot in the left Chat to build any dashboard, simulator, or workflow tool. Generated code mounts directly into this live sandboxed iframe with working sliders, real-time calculations, and full DOM interactivity.
                      </p>
                    </div>

                    {/* 3 Quick-Launch Interactive Cards */}
                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                      {/* 1. Cash Flow Simulator */}
                      <div className={`p-3.5 border transition-all ${
                        isDarkMode ? 'bg-[#141720] border-[#2C3242] hover:border-[#EAAA00]/60' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-none bg-[#EAAA00]/20 text-[#EAAA00] flex items-center justify-center shrink-0">
                                <DollarSign className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-white tracking-wide">
                                Cash Flow & Runway Simulator
                              </span>
                              <span className="px-1.5 py-0.2 text-[8px] font-mono rounded-full bg-[#EAAA00]/10 text-[#EAAA00] border border-[#EAAA00]/30">
                                Financial Dashboard
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal pl-8">
                              Real-time SaaS cash engine with revenue & payroll sliders, net burn calculations, runway alerts, and a 12-month trajectory projection table.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExecute(CASH_FLOW_PROCESS_CODE)}
                            disabled={isExecuting}
                            className="px-3 py-1.5 text-[11px] font-mono font-bold bg-[#EAAA00] hover:bg-[#D99B00] text-black rounded-none flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
                          >
                            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>Launch Simulator</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Indirect Tax Reconciliation */}
                      <div className={`p-3.5 border transition-all ${
                        isDarkMode ? 'bg-[#141720] border-[#2C3242] hover:border-[#009A44]/60' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-none bg-[#009A44]/20 text-[#009A44] flex items-center justify-center shrink-0">
                                <TrendingUp className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-white tracking-wide">
                                Indirect Tax Reconciliation Engine
                              </span>
                              <span className="px-1.5 py-0.2 text-[8px] font-mono rounded-full bg-[#009A44]/10 text-[#009A44] border border-[#009A44]/30">
                                Enterprise Audit
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal pl-8">
                              Multi-criteria matching engine (Exact, Fuzzy Vendor, Date Drift, Split-Invoices) reconciling GSTR-2B against ERP Purchase Register.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleExecute(TAX_RECON_PROCESS_CODE)}
                            disabled={isExecuting}
                            className="px-3 py-1.5 text-[11px] font-mono font-bold bg-[#009A44] hover:bg-[#008139] text-white rounded-none flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
                          >
                            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>Launch Engine</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Tip */}
                  <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>💡 Tip: Type in the left Chat to build custom dashboards, or switch to Code Editor to inspect raw code.</span>
                    <span>0ms Server Latency</span>
                  </div>
                </div>
              </div>
            )
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
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2">
                    <TableIcon className="w-7 h-7 opacity-40 text-[#0091DA]" />
                    <p className="text-xs">{executionResult ? 'Output is an object or primitive.' : 'No tabular records generated yet.'}</p>
                    {executionResult ? (
                      <button onClick={() => setActiveRightTab('json')} className="text-[10px] text-[#0091DA] hover:underline cursor-pointer">
                        View in JSON Tree
                      </button>
                    ) : (
                      <p className="text-[10px] text-slate-500">Run code or launch a template to inspect tabular outputs.</p>
                    )}
                  </div>
                )
              ) : activeRightTab === 'json' ? (
                /* TAB 2: JSON TREE */
                executionResult?.output !== undefined ? (
                  <pre className="flex-1 p-3 rounded-[10px] border border-slate-700/60 bg-[#0B0F19] text-emerald-400 font-mono text-xs overflow-auto leading-relaxed">
                    {JSON.stringify(executionResult.output, null, 2)}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 font-mono space-y-2">
                    <FileCode className="w-7 h-7 opacity-40 text-emerald-400" />
                    <p className="text-xs">No JSON output available yet.</p>
                    <p className="text-[10px] text-slate-500">Run code or launch a template to inspect return payloads.</p>
                  </div>
                )
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
