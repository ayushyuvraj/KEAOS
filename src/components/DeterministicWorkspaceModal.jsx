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
  Minus,
  Columns2,
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
import { 
  STREAM_TRANSFORMER_PROCESS_CODE, 
  KEY_JOINER_PROCESS_CODE, 
  REACTIVE_UI_PROCESS_CODE 
} from '../constants/universalBlueprints';
import { 
  PROVIDERS, 
  getProviderCredential, 
  getAllConfiguredProviders, 
  executeUniversalChat,
  getCachedDiscoveredModels,
  fetchProviderModelsLive
} from '../services/llmService';
import ChromeBrowserShell from './sandbox/ChromeBrowserShell';
import { compileOutputToHtml } from '../services/webviewCompiler';

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
  const [sandboxLayoutMode, setSandboxLayoutMode] = useState('split'); // 'minimized' | 'split' | 'maximized'
  const isZone3Maximized = sandboxLayoutMode === 'maximized';

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
      return nodeData.chatHistory.map(msg => {
        if (msg.id === 'msg-welcome' || (msg.role === 'assistant' && msg.content?.includes('Deterministic Co-Pilot'))) {
          return { ...msg, content: 'How may I help you?' };
        }
        return msg;
      });
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: 'How may I help you?',
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
  // Manage list of uploaded files: [{ id, name, key, rowCount, data }]
  const [uploadedFileList, setUploadedFileList] = useState(() => {
    if (Array.isArray(nodeData?.uploadedFileList)) {
      return nodeData.uploadedFileList;
    }
    // Backward compatibility with legacy uploadedData object
    if (nodeData?.uploadedData && typeof nodeData.uploadedData === 'object') {
      const keys = Object.keys(nodeData.uploadedData).filter(
        k => k !== '__schemaMap' && k !== 'sources' && k !== 'allOutputs' && k !== 'data'
      );
      if (keys.length > 0) {
        return keys.map((k, idx) => ({
          id: `file-legacy-${idx}-${k}`,
          name: `${k}.json`,
          key: k,
          rowCount: Array.isArray(nodeData.uploadedData[k]) ? nodeData.uploadedData[k].length : 1,
          data: nodeData.uploadedData[k]
        }));
      }
    }
    return [];
  });

  // Workspace-Wide File Aggregator:
  // Combines files uploaded to this node + any files uploaded to other nodes in workspace
  const workspaceGlobalFiles = useMemo(() => {
    const map = new Map();
    // 1. Local files uploaded to this node
    (uploadedFileList || []).forEach(f => {
      if (f.key && f.data) {
        map.set(f.key, { ...f, isLocal: true });
      }
    });
    // 2. Scan all other nodes in workspace for uploaded files
    (nodes || []).forEach(n => {
      if (n.id !== nodeId) {
        if (Array.isArray(n.data?.uploadedFileList)) {
          n.data.uploadedFileList.forEach(f => {
            if (f.key && f.data && !map.has(f.key)) {
              map.set(f.key, {
                ...f,
                isLocal: false,
                sourceNodeName: n.data?.name || n.data?.label || n.id
              });
            }
          });
        }
        if (n.data?.uploadedData && typeof n.data.uploadedData === 'object') {
          Object.keys(n.data.uploadedData).forEach(k => {
            if (k !== '__schemaMap' && k !== 'sources' && k !== 'allOutputs' && k !== 'data' && !map.has(k)) {
              const d = n.data.uploadedData[k];
              map.set(k, {
                id: `global-${n.id}-${k}`,
                name: `${k}.json`,
                key: k,
                rowCount: Array.isArray(d) ? d.length : 1,
                data: d,
                isLocal: false,
                sourceNodeName: n.data?.name || n.data?.label || n.id
              });
            }
          });
        }
      }
    });
    return Array.from(map.values());
  }, [uploadedFileList, nodes, nodeId]);

  // Map all workspace uploaded files to inputs dictionary
  const uploadedData = useMemo(() => {
    if (!workspaceGlobalFiles.length) return null;
    const map = {};
    workspaceGlobalFiles.forEach((f, idx) => {
      map[f.key] = f.data;
      if (idx === 0) {
        map['data'] = f.data; // First file also mirrored as inputs.data
      }
    });
    return map;
  }, [workspaceGlobalFiles]);

  const uploadedFileName = useMemo(() => {
    return uploadedFileList.map(f => f.name).join(', ');
  }, [uploadedFileList]);

  const fileUploadInputRef = useRef(null);

  // Helper to generate a clean, safe JS identifier variable key from a filename
  const sanitizeKey = (name, existingKeys = []) => {
    let key = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    if (!key || /^[0-9]/.test(key)) {
      key = 'file_' + (key || 'data');
    }
    let uniqueKey = key;
    let counter = 2;
    while (existingKeys.includes(uniqueKey)) {
      uniqueKey = `${key}_${counter}`;
      counter++;
    }
    return uniqueKey;
  };

  // Studio In-Memory Test File Uploader (Supports appending multiple CSV, XLSX, JSON files)
  const handleStudioFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newEntries = [];
    let pending = files.length;
    const existingKeys = uploadedFileList.map(f => f.key);

    files.forEach(file => {
      const fileName = file.name || 'file';
      const isJson = fileName.toLowerCase().endsWith('.json');
      const isXlsx = /\.(xlsx|xls)$/i.test(fileName);
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const key = sanitizeKey(fileName, [...existingKeys, ...newEntries.map(entry => entry.key)]);

      const onDataParsed = (parsedData) => {
        const rowCount = Array.isArray(parsedData)
          ? parsedData.length
          : (parsedData && typeof parsedData === 'object')
            ? Object.keys(parsedData).length
            : 1;

        newEntries.push({
          id: fileId,
          name: fileName,
          key,
          rowCount,
          data: parsedData
        });
        checkComplete();
      };

      const reader = new FileReader();
      if (isXlsx && typeof window !== 'undefined' && window.XLSX) {
        reader.onload = (ev) => {
          try {
            const data = new Uint8Array(ev.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: null });
            onDataParsed(rows);
          } catch (err) {
            console.warn('XLSX parse error:', err);
            onDataParsed([]);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (ev) => {
          try {
            const text = ev.target.result;
            if (isJson) {
              const parsed = JSON.parse(text);
              onDataParsed(parsed);
            } else {
              const rows = parseCsv(text);
              onDataParsed(rows);
            }
          } catch (err) {
            console.warn('File read error:', err);
            onDataParsed([]);
          }
        };
        reader.readAsText(file);
      }
    });

    function checkComplete() {
      pending--;
      if (pending === 0) {
        setUploadedFileList(prev => {
          const combined = [...prev, ...newEntries];
          if (onUpdateNode && nodeId) {
            onUpdateNode(nodeId, { uploadedFileList: combined });
          }
          return combined;
        });

        window.dispatchEvent(new CustomEvent('keaos:toast', {
          detail: { message: `✓ Added ${newEntries.length} file(s) to input streams` }
        }));

        if (e.target) {
          e.target.value = '';
        }
      }
    }
  };

  // Remove a single uploaded file
  const handleRemoveFile = (fileId) => {
    setUploadedFileList(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      if (onUpdateNode && nodeId) {
        onUpdateNode(nodeId, { uploadedFileList: updated });
      }
      return updated;
    });
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: 'File removed from input streams' }
    }));
  };

  // Clear all uploaded files
  const handleClearAllFiles = () => {
    setUploadedFileList([]);
    if (onUpdateNode && nodeId) {
      onUpdateNode(nodeId, { uploadedFileList: [] });
    }
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: 'All uploaded files cleared' }
    }));
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
      if (Array.isArray(nodeData?.uploadedFileList)) {
        setUploadedFileList(nodeData.uploadedFileList);
      }
    }
  }, [nodeId, isOpen]);

  // Auto-sync code and language changes to node data with debouncing
  useEffect(() => {
    if (!isOpen || !nodeId || !onUpdateNode) return;
    const timer = setTimeout(() => {
      onUpdateNode(nodeId, { code, language });
    }, 400);
    return () => clearTimeout(timer);
  }, [code, language, isOpen, nodeId, onUpdateNode]);

  // Safe close handler that flushes active state to node
  const handleCloseModal = () => {
    if (onUpdateNode && nodeId) {
      onUpdateNode(nodeId, {
        name: nodeName,
        code,
        language,
        prompt,
        operationalBullets
      });
    }
    onClose();
  };

  // Keyboard listener for Escape (exit maximized or minimized view back to split)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sandboxLayoutMode !== 'split') {
        e.preventDefault();
        e.stopPropagation();
        setSandboxLayoutMode('split');
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, sandboxLayoutMode]);

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
        schema,
        srcNodeData: srcNode?.data
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

    // Explicitly unpack Ingestion Node bilateral slots
    sources.forEach(s => {
      if (s.type === 'ingestionNode' && s.srcNodeData) {
        if (s.srcNodeData.slotA) {
          payload['slotA'] = s.srcNodeData.slotA.sample || s.srcNodeData.slotA.columns || [];
          schemaMap['slotA'] = inferDataSchema(payload['slotA']);
        }
        if (s.srcNodeData.slotB) {
          payload['slotB'] = s.srcNodeData.slotB.sample || s.srcNodeData.slotB.columns || [];
          schemaMap['slotB'] = inferDataSchema(payload['slotB']);
        }
      }
    });

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
        data: uploadedData.data !== undefined ? uploadedData.data : upstreamInfo.payload.data
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

  // Inspect incoming variable keys for 1-click copying (Zero hardcoding: only exposed if stream or file exists)
  const availableInputKeys = useMemo(() => {
    const keys = new Set();

    // 1. Keys from all workspace files (local + cross-box)
    workspaceGlobalFiles.forEach(f => {
      keys.add(f.key);
    });

    // 2. Keys from upstream connected nodes
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
    }

    // 3. Explicitly expose bilateral slots from connected Ingestion Nodes
    upstreamInfo.sources.forEach(s => {
      if (s.type === 'ingestionNode') {
        if (s.srcNodeData?.slotA) keys.add('slotA');
        if (s.srcNodeData?.slotB) keys.add('slotB');
      }
    });

    // 4. Only expose generic 'data' if an actual stream or file exists
    if (uploadedFileList.length > 0 || upstreamInfo.sources.length > 0) {
      keys.add('data');
    }

    return Array.from(keys);
  }, [upstreamInfo, workspaceGlobalFiles]);

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
      // 1. Build upstream & workspace uploaded data schema context for the model
      const streamLines = [];
      workspaceGlobalFiles.forEach(f => {
        let fieldList = 'dynamic fields';
        if (Array.isArray(f.data) && f.data.length > 0 && typeof f.data[0] === 'object') {
          fieldList = Object.keys(f.data[0]).slice(0, 15).join(', ');
        }
        streamLines.push(
          `- inputs.${f.key} (File: "${f.name}", format: tabular, fields: [${fieldList}], rowCount: ${f.rowCount || f.data?.length || 1}${!f.isLocal ? `, source: ${f.sourceNodeName}` : ''})`
        );
      });

      if (upstreamInfo.sources && upstreamInfo.sources.length > 0) {
        upstreamInfo.sources.forEach(s => {
          const streamName = s.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const fields = s.schema?.fields ? Object.keys(s.schema.fields).join(', ') : 'dynamic keys';
          streamLines.push(
            `- inputs.${streamName} (Source: "${s.name}", format: ${s.schema?.format || 'tabular'}, fields: [${fields}], rowCount: ${s.schema?.rowCount || 'unknown'})`
          );
        });
      }

      const inputContext = streamLines.length > 0
        ? `AVAILABLE INPUT DATA STREAMS IN THIS ENVIRONMENT:\n` + streamLines.join('\n')
        : `INPUT SPECIFICATION:\n- No input files or upstream streams currently loaded. Reference expected 'inputs.<key>' and inform the user to upload or wire data.`;

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
      - In-Memory Data Streams & Pre-Ingested Datasets (STRICT ZERO-INTERACTION CONTRACT):
        * All datasets are PRE-LOADED into \`inputs\` by the platform\'s Ingestion Node or the "+ Upload File" button in the header.
        * NEVER write interactive file dialogs (\`window.showOpenFilePicker()\`, dynamic \`<input type="file">\`, \`prompt()\`, \`confirm()\`). Browser security sandboxes block unprompted file picker calls and will crash the execution immediately!
        * Pure Function Contract: The function MUST be a pure deterministic processor: \`process(inputs, state)\`.
        * If reconciling or comparing two datasets (e.g., Purchase Register & GSTR-2B, or Primary & Counterparty), access them via \`inputs.slotA\` and \`inputs.slotB\` (or \`inputs.pr\`, \`inputs.gstr2b\`, or find the two streams in \`inputs\`).
        * If \`inputs\` is empty during drafting, reference \`inputs.slotA || inputs.data || []\` and inform the user that datasets can be attached via the Ingestion Node on canvas.
      - Standard In-Memory Web APIs (SheetJS XLSX, crypto, Blob, URL, RegExp, Math, Date) and \`console.log(...)\` are fully supported.
      - ZERO-MOCK HONESTY (ABSOLUTE MANDATE): Never hallucinate, fabricate, or hardcode fake fallback data (e.g. dummy invoices like INV001, INV002). Use strictly the real data provided in \'inputs\'. If an input stream or file is missing, write the code that references the expected \'inputs.<key>\' directly and explain to the user in prose that they need to load or pipe that dataset.
    - For Python: define \`def process(inputs):\` returning transformed records or dicts. Standard libraries (pandas, math, re, json, datetime) are supported.
    - For SQL: provide clean SQL (SELECT ... FROM ...).
    - If the user asks for languages that require external compilation toolchains (e.g. Rust, C++), provide the code, but ALSO provide the equivalent browser-native JavaScript isolate code using SheetJS/Web APIs so they can execute it immediately inside this browser box without external compilers.

3. ADVISORY NOTES & BEST PRACTICES:
    - For high-volume multi-thousand/million row reconciliations, use O(N) Hash Maps (\`new Map(...)\`) for instant sub-millisecond joins instead of slow nested O(N^2) loops.
    - Always return clean structured outputs: \`{ summary: {...}, records: [...], ... }\` or an array of records.

4. FORMATTING:
   - Put the PRIMARY, EXECUTABLE APPLICATION CODE in the main markdown code block matching \`\`\`${(language || 'javascript').toLowerCase()}:
     \`\`\`${(language || 'javascript').toLowerCase()}
     ${(language || '').toLowerCase() === 'python' ? 'def process(inputs):\n       # Complete, working Python logic\n       ...\n       return result' : (language || '').toLowerCase() === 'sql' ? '-- Complete, working SQL query\nSELECT ... FROM inputs_table;' : 'async function process(inputs, state) {\n       // Complete, working JavaScript logic\n       ...\n       return result;\n     }'}
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
    const htmlToRender = compileOutputToHtml({
      rawOutput: executionResult.output,
      title: nodeName,
      nodeName,
      latencyMs: executionResult.latencyMs || 0,
      language
    });

    try {
      const blob = new Blob([htmlToRender], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        const fallbackWin = window.open('', '_blank');
        if (fallbackWin) {
          fallbackWin.document.open();
          fallbackWin.document.write(htmlToRender);
          fallbackWin.document.close();
        } else {
          window.dispatchEvent(new CustomEvent('keaos:toast', {
            detail: { message: 'Popup blocked by browser. Please allow popups for 127.0.0.1.' }
          }));
        }
      }
    } catch (err) {
      console.error('Failed to open popup tab:', err);
      const fallbackWin = window.open('', '_blank');
      if (fallbackWin) {
        fallbackWin.document.open();
        fallbackWin.document.write(htmlToRender);
        fallbackWin.document.close();
      }
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
        handleCloseModal();
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
      for (const [k, v] of Object.entries(executionResult.output)) {
        if (k !== 'summary' && k !== 'html' && Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
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

  // 3-Button Layout Control: Minimize | Split View | Maximize (Icon-only, no text)
  const renderLayoutControls = () => (
    <div className={`flex items-center p-0.5 rounded-[6px] border ${
      isDarkMode ? 'bg-black/40 border-slate-700/60' : 'bg-slate-200/80 border-slate-300'
    }`}>
      {/* 1. Minimize (Chat takes over entire sandbox) */}
      <button
        type="button"
        onClick={() => setSandboxLayoutMode('minimized')}
        className={`p-1 rounded-[4px] transition-all cursor-pointer flex items-center justify-center ${
          sandboxLayoutMode === 'minimized'
            ? isDarkMode ? 'bg-[#00338D] text-white shadow-xs' : 'bg-[#00338D] text-white shadow-xs'
            : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
        title="Minimize Sandbox (Chat takes over full width)"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* 2. Split View (Dual-panel side by side) */}
      <button
        type="button"
        onClick={() => setSandboxLayoutMode('split')}
        className={`p-1 rounded-[4px] transition-all cursor-pointer flex items-center justify-center ${
          sandboxLayoutMode === 'split'
            ? isDarkMode ? 'bg-[#00338D] text-white shadow-xs' : 'bg-[#00338D] text-white shadow-xs'
            : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
        title="Split View (Chat & Sandbox)"
      >
        <Columns2 className="w-3.5 h-3.5" />
      </button>

      {/* 3. Maximize (Sandbox takes over full page) */}
      <button
        type="button"
        onClick={() => setSandboxLayoutMode('maximized')}
        className={`p-1 rounded-[4px] transition-all cursor-pointer flex items-center justify-center ${
          sandboxLayoutMode === 'maximized'
            ? isDarkMode ? 'bg-[#00338D] text-white shadow-xs' : 'bg-[#00338D] text-white shadow-xs'
            : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
        title="Maximize Sandbox (Full width)"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

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
              onClick={handleCloseModal}
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
          {sandboxLayoutMode !== 'maximized' && (
            <div 
              style={{ width: sandboxLayoutMode === 'minimized' ? '100%' : `${leftWidthPercent}%` }}
              className={`flex flex-col h-full overflow-hidden transition-none shrink-0 ${
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
                    {upstreamInfo.sources.length + uploadedFileList.length} Stream{(upstreamInfo.sources.length + uploadedFileList.length) !== 1 ? 's' : ''}
                  </span>
                  {sandboxLayoutMode === 'minimized' && renderLayoutControls()}
                </div>
              </div>

              {/* View 1: Conversational Chat (PRIMARY on Open) */}
              {leftView === 'chat' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Upstream Stream Banner & Quick Key Access */}
                  <div className={`p-2.5 border-b text-[11px] font-mono shrink-0 ${
                    isDarkMode ? 'bg-[#181920]/80 border-[#2C3242]' : 'bg-white border-slate-200'
                  }`}>
                    {/* Header Row: Label & Actions */}
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Available Input Streams:</span>
                        {workspaceGlobalFiles.length > 0 && (
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                            {workspaceGlobalFiles.length} file{workspaceGlobalFiles.length !== 1 ? 's' : ''} available
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* + Add More Files Button */}
                        <button
                          type="button"
                          onClick={() => fileUploadInputRef.current?.click()}
                          className={`px-2 py-0.5 text-[9px] font-mono rounded border flex items-center gap-1 transition-all cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#00338D]/20 border-[#0091DA]/40 text-[#0091DA] hover:bg-[#00338D]/40 hover:text-white'
                              : 'bg-blue-50 border-blue-300 text-[#00338D] hover:bg-blue-100'
                          }`}
                          title="Add more CSV, Excel, or JSON files to inputs"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>+ Add Files</span>
                        </button>

                        {/* Clear All Files Button if > 1 file */}
                        {uploadedFileList.length > 1 && (
                          <button
                            type="button"
                            onClick={handleClearAllFiles}
                            className="px-1.5 py-0.5 text-[9px] font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded border border-red-500/20 cursor-pointer transition-all"
                            title="Remove all uploaded files"
                          >
                            Clear All
                          </button>
                        )}

                        <span className="text-[9px] text-slate-500 hidden xl:inline">Click pill to copy</span>
                      </div>
                    </div>

                    {/* Uploaded Files Chips with Remove (X) Button */}
                    {uploadedFileList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 pb-1.5 border-b border-[#2C3242]/40">
                        {workspaceGlobalFiles.map(f => (
                          <div
                            key={f.id}
                            className={`px-2 py-0.5 text-[10px] font-mono rounded-[6px] border flex items-center gap-1.5 ${
                              isDarkMode ? 'bg-[#0B0F19] border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            }`}
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="font-semibold truncate max-w-[130px]" title={f.name}>{f.name}</span>
                            <span className="text-[9px] opacity-60">({f.rowCount} rows)</span>
                            <button
                              type="button"
                              onClick={() => handleCopyVar(f.key)}
                              className="px-1 py-0.2 text-[9px] rounded bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400 cursor-pointer flex items-center gap-0.5"
                              title={`Copy inputs.${f.key}`}
                            >
                              <span>inputs.{f.key}</span>
                              {copiedKey === f.key ? <Check className="w-2 h-2 text-emerald-300" /> : <Copy className="w-2 h-2 opacity-50" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(f.id);
                              }}
                              className="p-0.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded cursor-pointer transition-colors"
                              title={`Remove ${f.name}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Variable Pills (or No Streams message if empty) */}
                    {availableInputKeys.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] text-slate-500 mr-1">Variable Pills:</span>
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
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-500 py-0.5">
                        <span className="text-[10px] text-slate-400 italic">No input streams connected. Connect an upstream node on canvas or click "+ Add Files" above to load data.</span>
                      </div>
                    )}
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
                      placeholder="Ask Co-Pilot to write code, transform data, build UI widgets... (Enter to send)"
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
                      onBlur={() => onUpdateNode && nodeId && onUpdateNode(nodeId, { code, language })}
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
          {/* SLEEK DRAGGABLE DIVIDER RESIZER HANDLE (col-resize)                       */}
          {/* ========================================================================= */}
          {sandboxLayoutMode === 'split' && (
            <div
              onMouseDown={handleMouseDown}
              className="w-2 -mx-1 cursor-col-resize flex items-center justify-center shrink-0 group relative z-30 select-none"
              title="Drag horizontally to resize panels"
            >
              <div className={`w-px group-hover:w-[2px] group-active:w-[2px] h-full transition-all duration-150 ${
                isDarkMode 
                  ? 'bg-[#2C3242] group-hover:bg-[#0091DA] group-active:bg-[#0091DA]' 
                  : 'bg-slate-300 group-hover:bg-[#0091DA] group-active:bg-[#0091DA]'
              }`} />
            </div>
          )}

          {/* ========================================================================= */}
          {/* RIGHT PANEL: LIVE BROWSER SANDBOX & DEVTOOLS                              */}
          {/* ========================================================================= */}
          {sandboxLayoutMode !== 'minimized' && (
            <div 
              style={{ width: sandboxLayoutMode === 'maximized' ? '100%' : `${100 - leftWidthPercent}%` }}
              className={`flex flex-col h-full overflow-hidden transition-none ${
                isDarkMode ? 'bg-[#141720]' : 'bg-[#F8FAFC]'
              }`}>
            {/* Zone 3 Tabs & Action Bar */}
            <div className={`px-3 py-2 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'bg-[#181920] border-[#2C3242]' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-1">
                {(() => {
                  const hasHtmlOutput = Boolean(executionResult?.output?.html || (typeof executionResult?.output === 'string' && (executionResult.output.trim().startsWith('<') || executionResult.output.trim().startsWith('<!DOCTYPE'))));
                  const browserTabLabel = hasHtmlOutput 
                    ? 'Live Web View' 
                    : (executionResult?.output?.summary?.title || executionResult?.output?.title || nodeName || 'Live Dashboard');

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

                {/* 3-Button Layout Control: Minimize | Split View | Maximize (Icon-only) */}
                {renderLayoutControls()}
              </div>
            </div>

            {/* Zone 3 Body */}
            <div className={`flex-1 overflow-hidden flex flex-col ${(activeRightTab === 'browser' || activeRightTab === 'dashboard') ? 'p-0' : 'p-3'}`}>
              
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
                <ChromeBrowserShell
                  executionResult={executionResult}
                  isExecuting={isExecuting}
                  onExecute={() => handleExecute()}
                  nodeName={nodeName || nodeData?.name || nodeData?.label || 'Deterministic Applet'}
                  language={language}
                  isDarkMode={isDarkMode}
                  sandboxLayoutMode={sandboxLayoutMode}
                  onSetSandboxLayoutMode={setSandboxLayoutMode}
                  availableInputKeys={availableInputKeys}
                  inputsPayload={currentActiveInput}
                />
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
          )}

        </div>

      </div>
    </div>
  );
}
