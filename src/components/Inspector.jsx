import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Settings2, 
  X, 
  Trash2,
  Cpu,
  Key,
  Server,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sliders,
  PanelRightClose,
  PanelRightOpen,
  Upload,
  FileText,
  Save,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  DollarSign,
  Sparkles,
  ChevronDown,
  UploadCloud,
  Brain,
  Ban,
  GitFork,
  Check,
  Search,
  Code2
} from 'lucide-react';
import { PILLARS } from '../constants/pillars';
import { groupToolsByCategory } from '../constants/mcpOfficialCatalogs';
import { 
  PROVIDERS, 
  getProviderCredential, 
  saveProviderCredential,
  isFixedTemperatureModel,
  getCachedDiscoveredModels,
  fetchProviderModelsLive
} from '../services/llmService';
import { getLiveModelProfile, fetchLivePricingCatalog } from '../services/modelPricingService';
import { FRAMEWORKS } from '../constants/frameworks';
import {
  GoogleLogo,
  AnthropicLogo,
  OpenAILogo,
  OllamaLogo,
  OpenRouterLogo
} from '../constants/providerLogos';

const PROVIDER_LOGOS = {
  google: GoogleLogo,
  anthropic: AnthropicLogo,
  openai: OpenAILogo,
  ollama: OllamaLogo,
  openrouter: OpenRouterLogo
};

// Clean raw markdown link syntax and formatting from descriptions
function cleanDescription(text) {
  if (!text) return '';
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
}

// Reusable simple-language Info Tooltip (i)
function InfoTooltip({ text, align = 'left' }) {
  const isRight = align === 'right';
  return (
    <div className="relative group/info inline-flex items-center ml-1.5 z-30">
      <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-400 hover:text-[#00338D] hover:border-[#00338D] hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center text-[9px] font-mono font-bold cursor-help transition-all">
        i
      </div>
      <div className={`absolute top-full ${isRight ? 'right-0' : 'left-0'} mt-1.5 hidden group-hover/info:block w-52 p-2.5 bg-[#0B0F19] text-white text-[11px] normal-case font-sans font-normal tracking-normal leading-relaxed shadow-xl border border-slate-700/80 z-50 rounded-xl animate-in fade-in duration-150 pointer-events-none`}>
        {text}
        <div className={`absolute bottom-full ${isRight ? 'right-2' : 'left-2'} border-4 border-transparent border-b-[#0B0F19]`} />
      </div>
    </div>
  );
}

export default function Inspector({
  selectedNode: selectedNodeProp,
  nodes = [],
  edges = [],
  activeUseCase,
  onSelectFramework,
  agentConfig,
  onUpdateAgentConfig,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
  onCollapse,
  onOpenApiSettings,
  isDarkMode = true,
  isEmbedded = false
}) {
  // Always derive freshest node data from nodes array if available
  const selectedNode = useMemo(() => {
    if (!selectedNodeProp) return null;
    return nodes.find((n) => n.id === selectedNodeProp.id) || selectedNodeProp;
  }, [nodes, selectedNodeProp]);

  const [gatewayToolSearch, setGatewayToolSearch] = useState('');

  // Compute A2A connections for selected agent
  const incomingAgentEdges = useMemo(() => {
    if (!selectedNode?.id) return [];
    return (edges || []).filter(e => e.target === selectedNode.id && (e.targetHandle === 'agent-in' || !e.targetHandle));
  }, [edges, selectedNode?.id]);

  const upstreamAgents = useMemo(() => {
    return incomingAgentEdges
      .map(e => nodes.find(n => n.id === e.source && n.type === 'agentCore'))
      .filter(Boolean);
  }, [incomingAgentEdges, nodes]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNode?.id) return [];
    return (edges || []).filter(e => e.source === selectedNode.id && e.sourceHandle === 'out');
  }, [edges, selectedNode?.id]);

  const downstreamReceivers = useMemo(() => {
    return outgoingEdges
      .map(e => nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [outgoingEdges, nodes]);

  const [customModelMode, setCustomModelMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [customTokens, setCustomTokens] = useState([]);
  const [newCustomToken, setNewCustomToken] = useState('');
  const [savedNotification, setSavedNotification] = useState(false);

  // Model Provider and Live Discovery state for foundation models
  const [isChangingProvider, setIsChangingProvider] = useState(false);
  const [enteringKeyProvider, setEnteringKeyProvider] = useState(null);
  const [providerKeyInput, setProviderKeyInput] = useState('');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [isDiscoveringNewProvider, setIsDiscoveringNewProvider] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState({});

  useEffect(() => {
    if (selectedNode?.id) {
      setIsCollapsed(false);
      setIsChangingProvider(false);
      setEnteringKeyProvider(null);
      setDiscoveryError(null);
    }
  }, [selectedNode?.id]);

  const handleCollapse = () => {
    if (onCollapse) {
      onCollapse();
    } else {
      setIsCollapsed(true);
    }
  };

  const isAgent = selectedNode?.type === 'agentCore';
  const isOutput = selectedNode?.type === 'outputNode';
  const isIngest = selectedNode?.type === 'ingestionNode';
  const isDeterministic = selectedNode?.type === 'deterministicNode';
  const nodeData = selectedNode?.data || {};
  const pillarDef = PILLARS[nodeData?.pillarType];
  const isModel = nodeData?.pillarType === 'model';

  // Multi-LLM provider detection for model nodes
  const currentProvider = nodeData.config?.provider || 
    (nodeData.name?.toLowerCase().includes('claude') ? 'anthropic' :
     (nodeData.name?.toLowerCase().includes('gpt') ||
      nodeData.name?.toLowerCase().includes('openai') ||
      nodeData.name?.toLowerCase().includes('o1') ||
      nodeData.name?.toLowerCase().includes('o3') ||
      nodeData.name?.toLowerCase().includes('o4')) ? 'openai' :
     nodeData.name?.toLowerCase().includes('ollama') ? 'ollama' :
     nodeData.name?.toLowerCase().includes('openrouter') ? 'openrouter' : 'google');

  const currentModelId = nodeData.config?.modelId || PROVIDERS[currentProvider]?.defaultModel || 'gemini-2.0-flash';
  const providerDef = PROVIDERS[currentProvider] || PROVIDERS.google;
  const hasCredential = Boolean(getProviderCredential(currentProvider));

  // The 4 other available providers when changing provider
  const otherProviders = useMemo(() => {
    return Object.values(PROVIDERS).filter(p => !p.disabled && p.id !== currentProvider);
  }, [currentProvider]);

  // Fetch or retrieve cached models for active provider
  useEffect(() => {
    if (!isModel || !selectedNode?.id) return;
    const cached = getCachedDiscoveredModels(currentProvider);
    if (cached && cached.length > 0) {
      setDiscoveredModels(prev => ({ ...prev, [currentProvider]: cached }));
    } else {
      const cred = getProviderCredential(currentProvider);
      if (cred || currentProvider === 'ollama') {
        setIsLoadingModels(true);
        fetchProviderModelsLive(currentProvider, cred)
          .then(models => {
            setDiscoveredModels(prev => ({ ...prev, [currentProvider]: models }));
          })
          .catch(err => {
            console.warn('Auto model discovery error in Inspector:', err);
          })
          .finally(() => {
            setIsLoadingModels(false);
          });
      }
    }
  }, [currentProvider, isModel, selectedNode?.id]);

  // Available models for the dropdown (including current selection)
  const availableModels = useMemo(() => {
    const cached = discoveredModels[currentProvider] || getCachedDiscoveredModels(currentProvider) || [];
    let list = cached.length > 0
      ? cached
      : (providerDef.models || []).map(m => (typeof m === 'string' ? { id: m, name: m } : m));

    if (currentModelId && !list.some(m => m.id === currentModelId)) {
      list = [{ id: currentModelId, name: currentModelId, description: 'Current Active Model' }, ...list];
    }
    return list;
  }, [discoveredModels, currentProvider, providerDef.models, currentModelId]);

  if (!selectedNode) {
    return null;
  }

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="btn-tactile absolute top-4 right-5 z-20 flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] hover:bg-[#F8F9FB] text-[#00338D] border border-[#CBD5E1] hover:border-[#00338D] shadow-[0_4px_16px_rgba(0,30,80,0.1)] transition-all font-mono text-xs font-bold rounded-none select-none"
        title="Open Inspector Panel"
      >
        <PanelRightOpen className="w-4 h-4 text-[#00338D]" />
        <span>Inspect Block</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#009A44] beacon-live" />
      </button>
    );
  }

  // Switch to an alternate provider where credentials are already configured
  const handleSwitchProvider = async (targetProviderId) => {
    const pDef = PROVIDERS[targetProviderId];
    if (!pDef) return;
    setIsChangingProvider(false);
    setEnteringKeyProvider(null);
    setDiscoveryError(null);

    const cached = getCachedDiscoveredModels(targetProviderId);
    const initialModel = cached?.[0]?.id || pDef.defaultModel;

    onUpdateNodeData(selectedNode.id, {
      name: `${pDef.name} (${initialModel})`,
      description: `${pDef.name} foundation model configured for live enterprise inference.`,
      config: {
        ...nodeData.config,
        provider: targetProviderId,
        modelId: initialModel,
        baseUrl: targetProviderId === 'ollama' ? (nodeData.config?.baseUrl || 'http://localhost:11434') : undefined
      }
    });

    if (!cached || cached.length === 0) {
      const cred = getProviderCredential(targetProviderId);
      if (cred || targetProviderId === 'ollama') {
        setIsLoadingModels(true);
        try {
          const models = await fetchProviderModelsLive(targetProviderId, cred);
          setDiscoveredModels(prev => ({ ...prev, [targetProviderId]: models }));
          if (models.length > 0 && !models.some(m => m.id === initialModel)) {
            onUpdateNodeData(selectedNode.id, {
              name: `${pDef.name} (${models[0].id})`,
              config: {
                ...nodeData.config,
                provider: targetProviderId,
                modelId: models[0].id
              }
            });
          }
        } catch (err) {
          console.warn('Model discovery error on switch:', err);
        } finally {
          setIsLoadingModels(false);
        }
      }
    }
  };

  // Save key globally and switch provider
  const handleSaveNewProviderKey = async (targetProviderId, keyVal) => {
    const pDef = PROVIDERS[targetProviderId];
    if (!pDef) return;
    const trimmedKey = (keyVal || '').trim();
    if (!trimmedKey && targetProviderId !== 'ollama') return;

    saveProviderCredential(targetProviderId, trimmedKey);
    setIsDiscoveringNewProvider(true);
    setDiscoveryError(null);

    try {
      const models = await fetchProviderModelsLive(targetProviderId, trimmedKey);
      setDiscoveredModels(prev => ({ ...prev, [targetProviderId]: models }));
      const selectedModelId = models[0]?.id || pDef.defaultModel;

      onUpdateNodeData(selectedNode.id, {
        name: `${pDef.name} (${selectedModelId})`,
        description: `${pDef.name} foundation model configured for live enterprise inference.`,
        config: {
          ...nodeData.config,
          provider: targetProviderId,
          modelId: selectedModelId,
          baseUrl: targetProviderId === 'ollama' ? (nodeData.config?.baseUrl || 'http://localhost:11434') : undefined
        }
      });

      setIsChangingProvider(false);
      setEnteringKeyProvider(null);
      setProviderKeyInput('');
    } catch (err) {
      setDiscoveryError(err.message || 'Failed to connect to API with the provided key.');
    } finally {
      setIsDiscoveringNewProvider(false);
    }
  };

  const handleModelIdSelect = (newModelId) => {
    onUpdateNodeData(selectedNode.id, {
      name: `${providerDef.name} (${newModelId})`,
      config: {
        ...nodeData.config,
        provider: currentProvider,
        modelId: newModelId
      }
    });
  };

  // Theme-aware styles to ensure pure light theme on light mode and sleek dark slate on dark mode
  const t = {
    aside: isDarkMode 
      ? 'bg-[#0D0F17] text-slate-100 border-white/[0.08]' 
      : 'bg-[#FFFFFF] text-slate-900 border-slate-200',
    header: isDarkMode 
      ? 'bg-[#141722] border-white/[0.08]' 
      : 'bg-white border-slate-200/80',
    content: isDarkMode 
      ? 'bg-[#0D0F17] text-slate-100' 
      : 'bg-[#F8FAFC] text-slate-900',
    card: isDarkMode 
      ? 'bg-[#141722] border-white/[0.08] shadow-sm' 
      : 'bg-white border-slate-200/90 shadow-xs',
    subCard: isDarkMode 
      ? 'bg-[#1A1E2B] border-white/[0.06]' 
      : 'bg-slate-50 border-slate-200/70',
    input: isDarkMode 
      ? 'bg-[#1A1E2B] border-white/[0.1] hover:border-white/[0.2] text-white focus:border-blue-500' 
      : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900 focus:border-[#00338D]',
    select: isDarkMode 
      ? 'bg-[#141722] border-white/[0.1] hover:border-white/[0.2] text-white' 
      : 'bg-white border-slate-300 hover:border-slate-400 text-slate-900',
    title: isDarkMode ? 'text-white' : 'text-slate-900',
    label: isDarkMode ? 'text-slate-300' : 'text-slate-700',
    subText: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-white/[0.08]' : 'border-slate-200/80',
    btnGhost: isDarkMode 
      ? 'hover:bg-white/[0.08] text-slate-400 hover:text-slate-200' 
      : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800',
    btnPill: isDarkMode 
      ? 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.1] text-slate-200' 
      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700',
  };

  return (
    <aside className={`${
      isEmbedded ? 'w-full h-full' : `w-96 h-full border-l shadow-2xl`
    } ${t.aside} flex flex-col shrink-0 overflow-hidden select-none`}>
      {/* Header */}
      <div className={`p-4 border-b ${t.header} shrink-0 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner shrink-0">
            {isAgent ? (
              <Bot className="w-4 h-4 text-blue-300" />
            ) : isDeterministic ? (
              <Code2 className="w-4 h-4 text-[#EAAA00]" />
            ) : isOutput ? (
              <Sparkles className="w-4 h-4 text-emerald-400" />
            ) : isIngest ? (
              <UploadCloud className="w-4 h-4 text-[#0091DA]" />
            ) : isModel ? (
              <Cpu className="w-4 h-4 text-blue-300" />
            ) : (
              <Settings2 className="w-4 h-4 text-blue-300" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 block font-mono">
              {isAgent ? 'Core Agent Inspector' : isDeterministic ? 'Deterministic Box' : isOutput ? 'Output Component' : isIngest ? 'Ingestion Port' : isModel ? 'Foundation Model' : `${nodeData.pillarType?.toUpperCase()} Specifications`}
            </span>
            <h4 className={`text-sm font-semibold truncate max-w-[190px] tracking-tight ${t.title}`}>
              {isOutput ? (nodeData.title || 'Agent Output') : isIngest ? (nodeData.fileName || nodeData.title || 'Data Ingestion') : nodeData.name}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isAgent && (
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="w-8 h-8 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all card-pressable"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCollapse}
            className={`w-8 h-8 rounded-lg ${t.btnGhost} flex items-center justify-center transition-all card-pressable`}
            title="Collapse Panel"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg ${t.btnGhost} flex items-center justify-center transition-all card-pressable`}
            title="Close node inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${t.content}`}>
        {isAgent ? (
          <>
            {/* Agent Name & Strategic Role */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-sans flex items-center`}>
                  Agent Designation
                  <InfoTooltip text="Unique name and operational role of this specific agent within the multi-agent graph." align="right" />
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-300 font-medium">
                  {nodeData.role ? nodeData.role.toUpperCase() : 'AGENT CORE'}
                </span>
              </div>
              <input
                type="text"
                value={nodeData.name || ''}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { name: e.target.value })}
                placeholder="Agent Name..."
                className={`w-full px-3.5 py-2 text-xs font-semibold ${t.input} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
              />
              <div className="space-y-1">
                <label className={`text-[10px] font-mono uppercase tracking-wider ${t.subText}`}>Architectural Role</label>
                <select
                  value={nodeData.role || 'specialist'}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { role: e.target.value })}
                  className={`w-full px-3 py-2 text-xs ${t.select} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer`}
                >
                  <option value="specialist">Specialist Agent (Domain Task Executor)</option>
                  <option value="orchestrator">Orchestrator Agent (Workflow Dispatcher)</option>
                  <option value="scribe">Note-Taking & Ingestion Scribe</option>
                  <option value="auditor">Compliance & Policy Auditor</option>
                  <option value="synthesizer">Executive Synthesizer & Deliverer</option>
                </select>
              </div>
            </div>

            {/* Target Multi-Agent Framework Selector */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-sans flex items-center`}>
                  Target Framework
                  <InfoTooltip text="Select the framework (Google ADK, Microsoft ADK, OpenAI, LangChain, LangGraph) for this specific agent." align="right" />
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-medium">
                  {(nodeData.framework || activeUseCase?.framework)?.category || 'SDK'}
                </span>
              </div>
              <div className="relative">
                <select
                  value={(nodeData.framework || activeUseCase?.framework)?.id || 'google-adk'}
                  onChange={(e) => {
                    const fw = FRAMEWORKS.find(f => f.id === e.target.value);
                    if (fw) {
                      onUpdateNodeData(selectedNode.id, { framework: fw });
                      const allAgents = nodes.filter(n => n.type === 'agentCore');
                      if (allAgents.length <= 1 && onSelectFramework) {
                        onSelectFramework(fw);
                      }
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs font-medium ${t.select} rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer appearance-none pr-8 transition-all`}
                >
                  {FRAMEWORKS.map(fw => (
                    <option key={fw.id} value={fw.id} className={`${isDarkMode ? 'bg-[#141722] text-white' : 'bg-white text-slate-900'} py-1`}>
                      {fw.name} — {fw.subtitle}
                    </option>
                  ))}
                </select>
                <div className={`absolute right-3 top-3 pointer-events-none ${t.subText}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-xs ${t.subText} mt-1 leading-relaxed`}>
                {(nodeData.framework || activeUseCase?.framework)?.description || 'Export idiomatic Python code matching your visual graph.'}
              </p>
            </div>

            {/* Foundation Model & Brain Linkage */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-2 border ${nodeData.connectedModelName ? 'border-blue-500/30' : 'border-indigo-500/20'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${nodeData.connectedModelName ? 'text-blue-400' : 'text-indigo-400'} font-sans flex items-center gap-1.5`}>
                  <Brain className="w-3.5 h-3.5" />
                  Foundation Model Brain
                </span>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                  nodeData.connectedModelName
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                }`}>
                  {nodeData.connectedModelName ? 'DEDICATED' : 'SHARED INHERITANCE'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${nodeData.connectedModelName ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                  <span className="text-xs font-bold text-white">
                    {nodeData.connectedModelName || nodeData.inheritedModelName || 'Gemini 2.0 Flash'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {nodeData.connectedModelName ? 'Directly Bound' : 'Auto-Shared'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {nodeData.connectedModelName
                  ? 'This agent uses its own dedicated model node attached via the model-in socket.'
                  : 'Accessing the senior agent brain by default. You can drag a wire to share the same model node or connect a new model node to override.'}
              </p>
            </div>

            {/* Inter-Agent A2A Topologies */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-3 border border-indigo-500/20`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider text-indigo-400 font-sans flex items-center gap-1.5`}>
                  <Bot className="w-3.5 h-3.5" />
                  A2A Topology Channels
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {upstreamAgents.length} In / {downstreamReceivers.length} Out
                </span>
              </div>

              {/* Upstream Ingress */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Upstream Feeds (Incoming A2A)</div>
                {upstreamAgents.length > 0 ? (
                  <div className="space-y-1">
                    {upstreamAgents.map(up => (
                      <div key={up.id} className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-xs">
                        <span className="font-semibold text-slate-200">{up.data?.name || 'Agent'}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                          {up.data?.framework?.name || 'Google ADK'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic px-1">
                    Root Agent (Ingests raw transcripts or direct user chat)
                  </div>
                )}
              </div>

              {/* Downstream Egress */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Downstream Receivers (Outgoing A2A)</div>
                {downstreamReceivers.length > 0 ? (
                  <div className="space-y-1">
                    {downstreamReceivers.map(down => (
                      <div key={down.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs">
                        <span className="font-semibold text-slate-200">{down.data?.name || down.data?.title || 'Component'}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                          {down.type === 'agentCore' ? (down.data?.framework?.name || 'Agent') : 'Canvas Output'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic px-1">
                    Terminal Agent (No downstream connections yet)
                  </div>
                )}
              </div>

              {/* Quick Spawn Downstream Agent Button */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('keaos:spawn-downstream-agent', {
                    detail: { sourceAgentId: selectedNode.id }
                  }));
                }}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer card-pressable"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>+ Connect Downstream Agent (A2A)</span>
              </button>
            </div>

            {/* System Prompt Customizer */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-2.5`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-sans flex items-center`}>
                  Agent Persona & Instructions
                  <InfoTooltip text="The main instructions and behavioral rules given to this AI agent." align="right" />
                </label>
                <span className="text-[10px] font-mono text-blue-500 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-500/10">Directive</span>
              </div>
              <textarea
                rows={5}
                value={nodeData.prompt !== undefined ? nodeData.prompt : (agentConfig?.prompt || '')}
                onChange={(e) => {
                  onUpdateNodeData(selectedNode.id, { prompt: e.target.value });
                  const allAgents = nodes.filter(n => n.type === 'agentCore');
                  if (allAgents.length <= 1 && onUpdateAgentConfig) {
                    onUpdateAgentConfig({ prompt: e.target.value });
                  }
                }}
                placeholder="Provide authoritative prompt as to what we want this agent to do..."
                className={`w-full p-3 ${t.input} text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded-xl resize-none font-mono transition-colors`}
              />
              <p className={`text-xs ${t.subText} leading-relaxed`}>
                Authoritative instructions governing output schema, analytical rigor, and task assignments for this agent.
              </p>
            </div>

            {/* Save Agent Specification Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSavedNotification(true);
                  setTimeout(() => setSavedNotification(false), 2500);
                }}
                className="card-pressable w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {savedNotification ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Agent Specification Saved ✓</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Agent Specification</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : isOutput ? (
          /* Specialized Canvas Output Display Inspector */
          <div className="space-y-4">
            <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.label} block font-mono`}>
                  Output Component State
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  nodeData.status === 'generating' 
                    ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30 animate-pulse'
                    : nodeData.content 
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                }`}>
                  {nodeData.status || (nodeData.content ? 'Ready' : 'Idle')}
                </span>
              </div>
              <p className={`text-xs ${t.subText}`}>
                Dual-state visual component. Click the circular badge on the canvas to expand with Apple-inspired physics and inspect real-time outputs, W3C SHA-256 audit, and latency.
              </p>

              <div>
                <label className={`text-[10px] font-mono ${t.subText} block mb-1`}>
                  Display Title
                </label>
                <input
                  type="text"
                  value={nodeData.title || 'Agent Output'}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { title: e.target.value })}
                  className={`w-full px-3 py-2 text-xs font-sans rounded-lg transition-all ${t.input}`}
                />
              </div>

              <div>
                <label className={`text-[10px] font-mono ${t.subText} block mb-1`}>
                  Default Presentation Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateNodeData(selectedNode.id, { format: 'markdown' })}
                    className={`px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                      (nodeData.format || 'markdown') === 'markdown'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                        : `${t.subCard} ${t.subText} hover:text-white`
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateNodeData(selectedNode.id, { format: 'raw' })}
                    className={`px-3 py-2 text-xs font-mono rounded-lg border transition-all ${
                      nodeData.format === 'raw'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                        : `${t.subCard} ${t.subText} hover:text-white`
                    }`}
                  >
                    Raw Text
                  </button>
                </div>
              </div>
            </div>

            {nodeData.auditHash && (
              <div className={`p-4 ${t.card} rounded-2xl space-y-2`}>
                <span className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 block font-mono`}>
                  Cryptographic Audit Hash
                </span>
                <p className="text-[10px] font-mono text-emerald-400 break-all bg-black/40 p-2 rounded border border-emerald-500/20">
                  {nodeData.auditHash}
                </p>
              </div>
            )}

            <div className={`p-4 ${t.card} rounded-2xl flex items-center justify-between`}>
              <span className={`text-xs ${t.subText}`}>Remove from Canvas</span>
              <button
                type="button"
                onClick={() => onDeleteNode(selectedNode.id)}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Output Node</span>
              </button>
            </div>
          </div>
        ) : isIngest ? (
          /* Specialized Ingestion Port Inspector */
          <div className="space-y-4">
            <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.label} block font-mono`}>
                  Ingestion Payload Status
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  nodeData.status === 'ready' 
                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : nodeData.status === 'transcribing'
                      ? 'bg-blue-500/15 text-blue-500 border border-blue-500/30 animate-pulse'
                      : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                }`}>
                  {nodeData.status || (nodeData.content ? 'Ready' : 'Empty')}
                </span>
              </div>
              <p className={`text-xs ${t.subText}`}>
                Upload audio (MP3, WAV), documents (PDF, DOCX), spreadsheets (CSV), or raw text directly into this canvas node. Feeds directly into the agent pipeline.
              </p>

              <div>
                <label className={`text-[10px] font-mono ${t.subText} block mb-1`}>
                  Source Name
                </label>
                <input
                  type="text"
                  value={nodeData.fileName || nodeData.title || 'Data Ingestion'}
                  onChange={(e) => onUpdateNodeData(selectedNode.id, { fileName: e.target.value })}
                  className={`w-full px-3 py-2 text-xs font-sans rounded-lg transition-all ${t.input}`}
                />
              </div>

              {nodeData.fileSize && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className={t.subText}>Payload Size:</span>
                  <span className="font-mono font-bold text-[#0091DA]">{nodeData.fileSize}</span>
                </div>
              )}
            </div>

            {nodeData.content && (
              <div className={`p-4 ${t.card} rounded-2xl space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider text-slate-400 block font-mono`}>
                    Extracted Payload Preview
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {nodeData.content.length} chars
                  </span>
                </div>
                <div className={`p-2.5 rounded-lg max-h-40 overflow-y-auto text-[11px] font-mono leading-relaxed select-text ${
                  isDarkMode ? 'bg-black/40 text-slate-300' : 'bg-slate-100 text-slate-800'
                }`}>
                  {nodeData.content.slice(0, 500)}
                  {nodeData.content.length > 500 ? '...' : ''}
                </div>
              </div>
            )}

            <div className={`p-4 ${t.card} rounded-2xl flex items-center justify-between`}>
              <span className={`text-xs ${t.subText}`}>Remove from Canvas</span>
              <button
                type="button"
                onClick={() => onDeleteNode(selectedNode.id)}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Ingestion Node</span>
              </button>
            </div>
          </div>
        ) : isModel ? (
          /* Specialized Multi-LLM Foundation Model Inspector */
          <div className="space-y-4">
            {/* Top: Current Provider Card with Switch Provider button */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${isDarkMode ? 'bg-white/[0.06] border border-white/[0.1]' : 'bg-slate-100 border border-slate-200'} flex items-center justify-center shrink-0 shadow-xs`}>
                    {(() => {
                      const CurrentLogo = PROVIDER_LOGOS[currentProvider] || Cpu;
                      return <CurrentLogo className="w-6 h-6 shrink-0" />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tracking-tight ${t.title}`}>{providerDef.name}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
                        hasCredential || currentProvider === 'ollama'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasCredential || currentProvider === 'ollama' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        {hasCredential || currentProvider === 'ollama' ? 'Key Ready' : 'Key Missing'}
                      </span>
                    </div>
                    <span className={`text-xs ${t.subText}`}>Foundation Provider</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingProvider(!isChangingProvider);
                    setEnteringKeyProvider(null);
                    setDiscoveryError(null);
                  }}
                  className={`card-pressable text-xs font-medium px-3.5 py-1.5 ${t.btnPill} rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-xs`}
                  title="Switch to another LLM provider"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  <span>{isChangingProvider ? 'Cancel' : 'Switch'}</span>
                </button>
              </div>

              {/* Subtle API Credential Status Bar */}
              <div className={`pt-2.5 border-t ${t.border} flex items-center justify-between text-xs`}>
                <span className={`${t.subText} flex items-center gap-1.5`}>
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>API Authentication:</span>
                  <strong className={hasCredential || currentProvider === 'ollama' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                    {hasCredential || currentProvider === 'ollama' ? 'Active' : 'Unconfigured'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenApiSettings && onOpenApiSettings(currentProvider)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{hasCredential ? 'Manage Key' : 'Enter Key'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Provider Switcher Drawer: Remaining 4 providers */}
              {isChangingProvider && (
                <div className={`mt-3 pt-3 border-t ${t.border} space-y-2 animate-in fade-in duration-150`}>
                  <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${t.subText} block`}>
                    Select Alternate Provider (Remaining 4)
                  </span>

                  <div className="space-y-1.5">
                    {otherProviders.map(pDef => {
                      const PLogo = PROVIDER_LOGOS[pDef.id] || Cpu;
                      const hasKey = Boolean(getProviderCredential(pDef.id));
                      const isEnteringKey = enteringKeyProvider === pDef.id;

                      return (
                        <div key={pDef.id} className={`border ${t.border} ${t.subCard} rounded-xl overflow-hidden shadow-xs`}>
                          <div
                            onClick={() => {
                              if (hasKey || pDef.id === 'ollama') {
                                handleSwitchProvider(pDef.id);
                              } else {
                                setEnteringKeyProvider(isEnteringKey ? null : pDef.id);
                                setProviderKeyInput('');
                                setDiscoveryError(null);
                              }
                            }}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isEnteringKey ? 'bg-blue-600/15' : isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-white/[0.06]' : 'bg-white border border-slate-200'} flex items-center justify-center shrink-0`}>
                                <PLogo className="w-5 h-5 shrink-0" />
                              </div>
                              <div>
                                <div className={`text-xs font-semibold ${t.title}`}>{pDef.name}</div>
                                <span className={`text-[10px] ${t.subText}`}>
                                  {hasKey ? '● API Key Ready' : pDef.id === 'ollama' ? '● Local / Cloud' : '○ API Key Required'}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              {hasKey || pDef.id === 'ollama' ? 'Select →' : isEnteringKey ? 'Close' : '+ Enter API'}
                            </span>
                          </div>

                          {/* Inline API key entry if not yet provided */}
                          {isEnteringKey && (
                            <div className={`p-3 ${isDarkMode ? 'bg-[#141722]' : 'bg-white'} border-t ${t.border} space-y-2 animate-in fade-in duration-150`}>
                              <div className="flex items-center justify-between">
                                <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${t.label}`}>
                                  Paste {pDef.name} API Key
                                </label>
                                {pDef.docsUrl && (
                                  <a
                                    href={pDef.docsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-mono font-semibold flex items-center gap-0.5"
                                  >
                                    <span>Get Key</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>

                              <div className="relative">
                                <input
                                  type={showKeySecret ? 'text' : 'password'}
                                  value={providerKeyInput}
                                  onChange={(e) => setProviderKeyInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveNewProviderKey(pDef.id, providerKeyInput);
                                    }
                                  }}
                                  placeholder={pDef.placeholder || 'Paste API Key...'}
                                  className={`w-full px-3 py-1.5 pr-8 text-xs font-mono rounded-lg ${t.input}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKeySecret(!showKeySecret)}
                                  className={`absolute right-2 top-2 ${t.subText} hover:text-slate-800 dark:hover:text-white`}
                                >
                                  {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              {discoveryError && (
                                <div className="p-2 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-[10px] font-mono rounded-lg">
                                  {discoveryError}
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={isDiscoveringNewProvider || (!providerKeyInput.trim() && pDef.id !== 'ollama')}
                                onClick={() => handleSaveNewProviderKey(pDef.id, providerKeyInput)}
                                className="card-pressable w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                {isDiscoveringNewProvider ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Validating & Detecting Models...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3 h-3" />
                                    <span>Save & Switch to {pDef.name}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Model Architecture Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-sans flex items-center gap-1`}>
                  Model Architecture
                  <InfoTooltip text="Compatible models detected live via your API credentials." align="left" />
                </label>
                <div className="flex items-center gap-2">
                  {isLoadingModels && (
                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Detecting...</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCustomModelMode(!customModelMode)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors cursor-pointer"
                  >
                    {customModelMode ? 'Standard Models' : 'Custom Model ID'}
                  </button>
                </div>
              </div>

              {customModelMode ? (
                <input
                  type="text"
                  value={currentModelId}
                  onChange={(e) => handleModelIdSelect(e.target.value)}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet, gemini-2.0-flash"
                  className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-xl transition-all ${t.input}`}
                />
              ) : (
                <div className="relative">
                  <select
                    value={currentModelId}
                    onChange={(e) => handleModelIdSelect(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer appearance-none pr-8 ${t.select}`}
                  >
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id} className={`${isDarkMode ? 'bg-[#141722] text-white' : 'bg-white text-slate-900'} py-1`}>
                        {m.name || m.id}
                      </option>
                    ))}
                  </select>
                  <div className={`absolute right-3 top-3 pointer-events-none ${t.subText}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              )}
              <span className={`text-[11px] ${t.subText} font-sans block`}>
                {availableModels.length > 1
                  ? `${availableModels.length} models verified and accessible via your ${providerDef.name} API.`
                  : `Select any compatible model supported by ${providerDef.name}.`}
              </span>
            </div>

            {/* Ollama Endpoint & API Token Settings */}
            {currentProvider === 'ollama' && (
              <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Server className="w-3.5 h-3.5" />
                  <span className="flex items-center">
                    Ollama Host & API Settings
                    <InfoTooltip text="Supports local daemon (http://localhost:11434) and authenticated remote cloud instances." align="left" />
                  </span>
                </div>
                <p className={`text-xs ${t.subText} leading-relaxed`}>
                  Connect to local on-device hardware or remote authenticated Ollama cloud endpoints.
                </p>
                <div>
                  <label className={`text-[10px] font-mono ${t.subText} block mb-1 flex items-center`}>
                    Endpoint URL
                    <InfoTooltip text="Local host address or remote cloud Ollama instance." align="left" />
                  </label>
                  <input
                    type="text"
                    value={nodeData.config?.baseUrl || 'http://localhost:11434'}
                    onChange={(e) => {
                      onUpdateNodeData(selectedNode.id, {
                        config: { ...nodeData.config, baseUrl: e.target.value }
                      });
                    }}
                    placeholder="http://localhost:11434 or https://..."
                    className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg ${t.input}`}
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-mono ${t.subText} block mb-1 flex items-center`}>
                    API Key / Bearer Token
                    <InfoTooltip text="Optional token for authenticated remote Ollama servers." align="left" />
                  </label>
                  <input
                    type="password"
                    value={nodeData.config?.apiKey || ''}
                    onChange={(e) => {
                      onUpdateNodeData(selectedNode.id, {
                        config: { ...nodeData.config, apiKey: e.target.value }
                      });
                    }}
                    placeholder="ollama_... or Bearer token (optional for local)"
                    className={`w-full px-3 py-1.5 text-xs font-mono rounded-lg ${t.input}`}
                  />
                </div>
              </div>
            )}

            {/* Hyperparameters */}
            <div className={`p-4 ${t.card} rounded-2xl space-y-4`}>
              {(() => {
                const isReasoning = isFixedTemperatureModel(currentModelId);
                return (
                  <>
                    <div className={`flex items-center justify-between pb-1 border-b ${t.border}`}>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${t.label} font-sans flex items-center gap-1`}>
                        Sampling Hyperparameters
                        <InfoTooltip text="Fine-tune how the AI model balances factual precision versus creative output." align="right" />
                      </span>
                      {isReasoning ? (
                        <span className="text-[10px] font-mono uppercase bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 font-medium rounded-full">
                          Fixed by Model
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono uppercase bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 px-2 py-0.5 font-medium rounded-full">
                          Dynamic
                        </span>
                      )}
                    </div>

                    {/* Temperature Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${t.title} flex items-center gap-1.5`}>
                          <span className={isReasoning ? t.subText : t.title}>Temperature</span>
                          <InfoTooltip 
                            text={isReasoning 
                              ? "This reasoning model only supports default (1.0) temperature. Custom values are restricted by provider." 
                              : "Controls randomness: 0.0 is deterministic and exact, 1.0 is creative and diverse."} 
                            align="left" 
                          />
                        </span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isReasoning 
                            ? isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500' 
                            : 'bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300'
                        }`}>
                          {isReasoning ? '1.00 (Fixed)' : Number(nodeData.config?.temperature ?? 0.2).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="1.00"
                        step="0.01"
                        disabled={isReasoning}
                        value={isReasoning ? 1.00 : (nodeData.config?.temperature ?? 0.2)}
                        onChange={(e) => {
                          onUpdateNodeData(selectedNode.id, {
                            config: { ...nodeData.config, temperature: parseFloat(parseFloat(e.target.value).toFixed(2)) }
                          });
                        }}
                        className={`modern-slider w-full transition-opacity ${isReasoning ? 'opacity-30 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
                      />
                      <div className={`flex justify-between text-[10px] ${t.subText} font-sans`}>
                        <span>Precise (0.0)</span>
                        <span>Balanced (0.5)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    {/* Top-P Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${t.title} flex items-center gap-1.5`}>
                          <span className={isReasoning ? t.subText : t.title}>Nucleus Sampling (Top-P)</span>
                          <InfoTooltip 
                            text={isReasoning
                              ? "Reasoning models enforce fixed nucleus sampling."
                              : "Controls the cumulative probability of candidate tokens considered during generation."} 
                            align="left" 
                          />
                        </span>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isReasoning 
                            ? isDarkMode ? 'bg-white/[0.05] text-slate-400' : 'bg-slate-100 text-slate-500'
                            : 'bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-300'
                        }`}>
                          {isReasoning ? '1.00 (Fixed)' : Number(nodeData.config?.topP ?? 0.95).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="1.00"
                        step="0.01"
                        disabled={isReasoning}
                        value={isReasoning ? 1.00 : (nodeData.config?.topP ?? 0.95)}
                        onChange={(e) => {
                          onUpdateNodeData(selectedNode.id, {
                            config: { ...nodeData.config, topP: parseFloat(parseFloat(e.target.value).toFixed(2)) }
                          });
                        }}
                        className={`modern-slider w-full transition-opacity ${isReasoning ? 'opacity-30 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Dynamic Model Intelligence & Real-Time Economics Card */}
            {(() => {
              const profile = getLiveModelProfile(currentProvider, currentModelId);
              return (
                <div className={`p-4 ${t.card} rounded-2xl space-y-3.5`}>
                  {/* Top: Model Header & Context Limit */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                      <span className={`text-xs font-bold ${t.title} truncate font-sans`}>
                        {profile.displayName}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full shrink-0">
                      {Math.round(profile.contextLength / 1000)}K Context
                    </span>
                  </div>

                  {/* Clean Real-time Pricing Rate Card */}
                  <div className={`p-3 ${t.subCard} rounded-xl space-y-2.5`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`${t.subText} font-medium flex items-center gap-1.5`}>
                        <DollarSign className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        Live Pricing
                      </span>
                      <span className={`text-[10px] font-mono ${t.subText}`}>USD / 1M Tokens</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'} p-2.5 rounded-lg border`}>
                        <span className={`text-[10px] ${t.subText} block mb-0.5`}>Input</span>
                        <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-300">
                          {profile.isFree ? 'Free' : `$${profile.promptPricePerMillion.toFixed(2)}`}
                        </span>
                      </div>
                      <div className={`${isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-slate-200'} p-2.5 rounded-lg border`}>
                        <span className={`text-[10px] ${t.subText} block mb-0.5`}>Output</span>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300">
                          {profile.isFree ? 'Free' : `$${profile.completionPricePerMillion.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <div className={`text-xs ${t.subText} pt-1.5 flex justify-between items-center border-t ${t.border}`}>
                      <span>Est. Run Cost (1.2k tokens):</span>
                      <strong className={`${t.title} font-mono font-bold`}>
                        {profile.isFree ? '$0.0000' : `$${((350 * profile.promptPricePerToken) + (850 * profile.completionPricePerToken)).toFixed(4)}`}
                      </strong>
                    </div>
                  </div>

                  {/* Live Model Description with cleaned markdown links */}
                  <p className={`text-xs ${t.label} leading-relaxed font-sans`}>
                    {cleanDescription(profile.description)}
                  </p>

                  {/* Dynamic Capabilities Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {profile.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className={`text-[10px] font-sans px-2.5 py-1 ${isDarkMode ? 'bg-white/[0.04] border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'} border rounded-full font-medium`}
                      >
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Save Model Specification Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSavedNotification(true);
                  setTimeout(() => setSavedNotification(false), 2500);
                }}
                className="card-pressable w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {savedNotification ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Model Specification Saved ✓</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Model Specification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Generic Inspector for other Pillars */
          <div className="space-y-4">
            <div className={`p-4 ${t.card} rounded-2xl space-y-2`}>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.subText} block font-mono flex items-center justify-between`}>
                <span className="flex items-center gap-1.5">
                  Pillar Category
                  <InfoTooltip text="Which of the 10 core AI pillars (Skills, MCP, Tools, Gateway, Memory, Guardrails, etc.) this component belongs to." align="left" />
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 rounded-full font-semibold">
                  Socket: {pillarDef?.socketId}
                </span>
              </span>
              <div className={`p-3 ${t.subCard} rounded-xl flex items-center justify-between`}>
                <span className={`text-xs font-bold ${t.title} capitalize`}>{nodeData.pillarType}</span>
                <span className={`text-[10px] font-mono ${t.subText}`}>Pillar Block</span>
              </div>
            </div>

            <div className={`p-4 ${t.card} rounded-2xl space-y-2`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${t.label} block font-mono flex items-center`}>
                Block Display Name
                <InfoTooltip text="The name assigned to this block on your canvas workspace." align="left" />
              </label>
              <input
                type="text"
                value={nodeData.name}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { name: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl transition-all ${t.input}`}
              />
            </div>

            <div className={`p-4 ${t.card} rounded-2xl space-y-2`}>
              <label className={`text-xs font-semibold uppercase tracking-wider ${t.label} block font-mono flex items-center`}>
                Description
                <InfoTooltip text="A simple description explaining what this component does when your agent executes." align="left" />
              </label>
              <textarea
                rows={3}
                value={nodeData.description}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { description: e.target.value })}
                className={`w-full p-3 text-xs leading-relaxed rounded-xl resize-none transition-all ${t.input}`}
              />
            </div>

            {/* Exposed MCP Tools & Capabilities with Full Connection Basis */}
            {nodeData.pillarType === 'mcp' && (() => {
              const mcpItemDef = PILLARS.mcp?.items?.find(it => it.id === nodeData.itemId || it.id === nodeData.toolId || it.name === nodeData.name);
              const exposedTools = nodeData.tools || mcpItemDef?.tools || [];
              const basis = nodeData.basis || null;

              return (
                <div className={`p-4 ${t.card} rounded-2xl space-y-3.5`}>
                  {/* Connection Basis Card */}
                  <div className={`p-3.5 ${t.subCard} rounded-xl border ${t.border} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#00A3A6]" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#00A3A6]">
                          Connection Basis & Auth
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live & Verified
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs font-mono">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={t.subText}>API Provider:</span>
                        <span className="font-bold text-white">{basis?.provider || nodeData.transport?.toUpperCase() || 'Direct API'}</span>
                      </div>
                      {basis?.authenticatedAs && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={t.subText}>Authenticated Identity:</span>
                          <span className="font-bold text-[#00A3A6]">@{basis.username || basis.authenticatedAs}</span>
                        </div>
                      )}
                      {basis?.repository && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={t.subText}>Target Repository:</span>
                          <span className="font-bold text-slate-200 truncate max-w-[180px]">{basis.repository}</span>
                        </div>
                      )}
                      {basis?.domain && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={t.subText}>Workspace Domain:</span>
                          <span className="font-bold text-slate-200">{basis.domain}</span>
                        </div>
                      )}
                      {basis?.tokenMasked && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={t.subText}>Credential Token:</span>
                          <span className="text-slate-400 font-mono">{basis.tokenMasked}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={t.subText}>Endpoint URL:</span>
                        <span className="text-slate-400 font-mono truncate max-w-[180px]">{basis?.apiEndpoint || nodeData.serverUrl || 'https://api.github.com'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Exposed Capabilities List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${t.subText}`}>
                        Exposed Capabilities ({exposedTools.length} Total)
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">
                        Discovered live
                      </span>
                    </div>

                    <div className="space-y-2">
                      {exposedTools.map((tool, idx) => {
                        const isRead = tool.type === 'read';
                        const isDestructive = tool.type === 'destructive';
                        return (
                          <div
                            key={idx}
                            className={`p-3 ${t.subCard} rounded-xl border ${t.border} space-y-1.5 transition-all hover:border-[#00A3A6]/50`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-[#0B0F19] dark:text-white truncate">
                                {tool.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                  isDestructive
                                    ? 'bg-rose-500/15 text-rose-500 border-rose-500/40'
                                    : isRead
                                      ? 'bg-[#00A3A6]/15 text-[#00A3A6] border-[#00A3A6]/40'
                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                                }`}>
                                  {tool.type?.toUpperCase()}
                                </span>
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  EXPOSED
                                </span>
                              </div>
                            </div>
                            <p className={`text-[11px] ${t.subText} leading-relaxed`}>
                              {tool.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs font-mono text-amber-500`}>
                    <GitFork className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed text-[10.5px]">
                      Policy Control Note: Capabilities are routed through the connected Gateway. To toggle or disable specific capabilities (such as file deletion), manage the rules in the Gateway controller.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* MCP Egress Gateway Controller & Tool Route Table */}
            {nodeData.pillarType === 'gateway' && (() => {
              // Find connected incoming MCP server nodes
              const incomingMcpEdges = (edges || []).filter(e => e.target === selectedNode.id);
              const connectedMcpNodes = incomingMcpEdges
                .map(e => nodes.find(n => n.id === e.source && n.data?.pillarType === 'mcp'))
                .filter(Boolean);

              // Collect all tools from all connected MCP nodes
              const routedTools = [];
              connectedMcpNodes.forEach(mcpNode => {
                const itemDef = PILLARS.mcp?.items?.find(it => it.id === mcpNode.data?.itemId || it.id === mcpNode.data?.toolId || it.name === mcpNode.data?.name);
                const tools = mcpNode.data?.tools || itemDef?.tools || [];
                tools.forEach(tool => routedTools.push({ ...tool, serverName: mcpNode.data?.name || 'MCP Server', serverId: mcpNode.id }));
              });

              const disabledTools = Array.isArray(nodeData.disabledTools) ? nodeData.disabledTools : [];
              const allowedCount = routedTools.filter(t => !disabledTools.includes(t.name)).length;

              const handleToggle = (toolName) => {
                const isBlocked = disabledTools.includes(toolName);
                const next = isBlocked
                  ? disabledTools.filter(t => t !== toolName)
                  : [...disabledTools, toolName];
                onUpdateNodeData(selectedNode.id, { disabledTools: next });
              };

              const handleBlockDestructive = () => {
                const destructiveNames = routedTools
                  .filter(t => t.type === 'destructive' || t.name.startsWith('delete_') || t.name.startsWith('drop_'))
                  .map(t => t.name);
                const next = Array.from(new Set([...disabledTools, ...destructiveNames]));
                onUpdateNodeData(selectedNode.id, { disabledTools: next });
              };

              const handlePermitAll = () => {
                onUpdateNodeData(selectedNode.id, { disabledTools: [] });
              };

              return (
                <div className={`p-4 ${t.card} rounded-2xl space-y-3.5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EAAA00] shadow-[0_0_8px_#EAAA00]" />
                      <span className={`text-xs font-bold ${t.title} uppercase tracking-wider font-mono`}>
                        MCP Egress Gateway Controller
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EAAA00]/15 text-[#EAAA00] border border-[#EAAA00]/40 font-bold">
                      {connectedMcpNodes.length} MCP Connected
                    </span>
                  </div>

                  {connectedMcpNodes.length > 0 ? (
                    <>
                      <div className={`p-3 ${t.subCard} rounded-xl border ${t.border} space-y-2`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`${t.subText} font-mono text-[10px] uppercase tracking-wider font-semibold`}>
                            Connected MCP Ingress
                          </span>
                          <span className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Zero-Trust Mediated
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {connectedMcpNodes.map(mcp => (
                            <span
                              key={mcp.id}
                              className="text-[11px] font-mono px-2.5 py-1 bg-[#00A3A6]/15 text-[#00A3A6] border border-[#00A3A6]/40 rounded-lg font-bold flex items-center gap-1.5"
                            >
                              <Server className="w-3 h-3" />
                              {mcp.data?.name || 'MCP Server'}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Quick Bulk Policy Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handlePermitAll}
                          className="flex-1 py-1 px-2 text-[10px] font-mono font-bold border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors rounded-lg cursor-pointer"
                        >
                          ✓ Permit All Tools
                        </button>
                        <button
                          type="button"
                          onClick={handleBlockDestructive}
                          className="flex-1 py-1 px-2 text-[10px] font-mono font-bold border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors rounded-lg cursor-pointer"
                        >
                          🛡️ Block Destructive
                        </button>
                      </div>

                      {/* Search Bar for Gateway Tools */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search Actions / Capabilities..."
                          value={gatewayToolSearch}
                          onChange={(e) => setGatewayToolSearch(e.target.value)}
                          className={`w-full pl-9 pr-7 py-1.5 text-xs font-mono rounded-lg border ${t.border} ${t.input} placeholder:text-slate-500 focus:outline-none focus:border-[#EAAA00]`}
                        />
                        {gatewayToolSearch && (
                          <button
                            type="button"
                            onClick={() => setGatewayToolSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Routed Tools Table with Individual Toggles */}
                      {(() => {
                        const filtered = routedTools.filter(t => {
                          if (!gatewayToolSearch.trim()) return true;
                          const q = gatewayToolSearch.toLowerCase();
                          return t.name.toLowerCase().includes(q) || 
                                 (t.displayName && t.displayName.toLowerCase().includes(q)) || 
                                 (t.category && t.category.toLowerCase().includes(q)) ||
                                 (t.description && t.description.toLowerCase().includes(q));
                        });
                        const categorized = groupToolsByCategory(filtered);

                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${t.subText}`}>
                                Gateway Feature Rules ({allowedCount}/{routedTools.length} Permitted)
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">
                                Drop before transit
                              </span>
                            </div>

                            {Object.keys(categorized).length === 0 ? (
                              <div className="text-center py-4 text-xs font-mono text-slate-500 border border-dashed border-slate-700/40 rounded-xl">
                                No actions match "{gatewayToolSearch}"
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                {Object.entries(categorized).map(([category, catTools]) => (
                                  <div key={category} className="space-y-1.5">
                                    <div className="flex items-center justify-between px-2 py-1 bg-slate-800/40 dark:bg-slate-900/60 rounded border border-slate-700/40 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                      <span>{category}</span>
                                      <span className="text-[9px] px-1.5 py-0.2 bg-slate-700/50 text-slate-300 rounded-full font-normal">
                                        {catTools.length}
                                      </span>
                                    </div>

                                    {catTools.map((tool, idx) => {
                                      const isBlocked = disabledTools.includes(tool.name);
                                      const isRead = tool.type === 'read';
                                      const isDestructive = tool.type === 'destructive';

                                      return (
                                        <div
                                          key={idx}
                                          className={`p-3 ${t.subCard} rounded-xl border transition-all ${
                                            isBlocked 
                                              ? 'border-rose-500/40 bg-rose-500/5' 
                                              : `${t.border} hover:border-[#EAAA00]/50`
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-sans font-semibold truncate ${
                                                  isBlocked ? 'line-through text-rose-400' : 'text-[#0B0F19] dark:text-white'
                                                }`}>
                                                  {tool.displayName || tool.name}
                                                </span>
                                                <span className="text-[9px] font-mono text-slate-400 truncate">
                                                  ({tool.serverName})
                                                </span>
                                              </div>
                                              <span className="text-[9.5px] font-mono text-slate-400 block truncate">
                                                {tool.name}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                                isDestructive
                                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                                                  : isRead
                                                    ? 'bg-[#00A3A6]/15 text-[#00A3A6] border-[#00A3A6]/40'
                                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                                              }`}>
                                                {tool.type?.toUpperCase()}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleToggle(tool.name)}
                                                className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border ${
                                                  isBlocked
                                                    ? 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600 shadow-xs'
                                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/40'
                                                }`}
                                                title={isBlocked ? 'Click to permit capability' : 'Click to block capability'}
                                              >
                                                {isBlocked ? (
                                                  <>
                                                    <Ban className="w-2.5 h-2.5" />
                                                    <span>BLOCKED</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Check className="w-2.5 h-2.5" />
                                                    <span>PERMITTED</span>
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                          {tool.description && (
                                            <p className={`text-[11px] ${t.subText} leading-relaxed mt-1`}>
                                              {tool.description}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    /* When no MCP Server is connected yet */
                    <div className={`p-4 ${t.subCard} rounded-xl border border-dashed border-[#EAAA00]/50 text-center space-y-2.5`}>
                      <div className="w-8 h-8 rounded-full bg-[#EAAA00]/15 text-[#EAAA00] flex items-center justify-center mx-auto">
                        <Server className="w-4 h-4" />
                      </div>
                      <h6 className={`text-xs font-bold ${t.title}`}>
                        Awaiting MCP Server Connection
                      </h6>
                      <p className={`text-[11px] ${t.subText} leading-relaxed`}>
                        Connect a verified live MCP Server (via Universal Link, Slack, Jira, or GitHub) into the circular teal socket on the right of this Gateway node to inspect and route its tools.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('keaos:open-connect-mcp'));
                        }}
                        className="card-pressable w-full py-2 px-3 bg-[#00A3A6] hover:bg-[#008A8C] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>+ Connect Real MCP Server</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Dedicated Deterministic Box Inspector Card */}
            {isDeterministic && (
              <div className={`p-4 ${t.card} rounded-none border space-y-3.5`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono text-[#EAAA00] flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    Deterministic Box
                  </span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-none">
                    ⚡ 0 TOKENS
                  </span>
                </div>

                <div>
                  <label className={`text-[10px] font-mono uppercase tracking-wider ${t.subText} block mb-1 font-semibold`}>
                    Simple Human Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={nodeData.prompt || ''}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { prompt: e.target.value })}
                    placeholder="e.g. 'swap variables x and y', 'join table A with B on id'..."
                    className={`w-full p-2.5 text-xs font-mono leading-relaxed border rounded-none resize-none ${t.input}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[10px] font-mono uppercase ${t.subText} block mb-1 font-semibold`}>
                      Language
                    </label>
                    <select
                      value={nodeData.language || 'python'}
                      onChange={(e) => onUpdateNodeData(selectedNode.id, { language: e.target.value })}
                      className={`w-full py-1.5 px-2 text-xs font-mono font-bold rounded-none border ${t.input}`}
                    >
                      <option value="python">Python</option>
                      <option value="sql">SQL</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-[10px] font-mono uppercase ${t.subText} block mb-1 font-semibold`}>
                      Last Status
                    </label>
                    <div className="py-1.5 px-2 text-xs font-mono font-bold">
                      {nodeData.lastStatus === 'success' ? (
                        <span className="text-emerald-400">✓ Ready ({nodeData.lastLatencyMs}ms)</span>
                      ) : (
                        <span className="text-slate-400">• Idle</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('keaos:open-deterministic-workspace', {
                      detail: { nodeId: selectedNode.id }
                    }));
                  }}
                  className="w-full py-2.5 px-3 bg-[#0091DA] hover:bg-[#007BB8] text-white text-xs font-mono font-bold rounded-none flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all border border-[#0091DA]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Logic & Sandbox Workspace</span>
                </button>
              </div>
            )}

            {(nodeData.pillarType === 'skills' || nodeData.pillarType === 'policies') && (
              <div className={`p-4 ${t.card} rounded-2xl space-y-3.5`}>
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wider ${nodeData.pillarType === 'policies' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'} block mb-1.5 font-mono flex items-center`}>
                    {nodeData.pillarType === 'policies' ? 'Policy & Guardrail Directives' : 'Skill Directives & Output Rules'}
                    <InfoTooltip 
                      text={nodeData.pillarType === 'policies' 
                        ? 'Custom compliance rules, privacy constraints, and safety guardrails enforced directly by the AI model during execution.'
                        : 'Custom instructions and formatting commands injected directly into the LLM when executing this skill.'} 
                      align="right" 
                    />
                  </label>
                  <textarea
                    rows={3}
                    value={nodeData.customDirective || ''}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { customDirective: e.target.value })}
                    placeholder={nodeData.pillarType === 'policies'
                      ? 'e.g. Strictly redact all customer identifiers, enforce NDA restrictions, and verify SOC2 compliance...'
                      : 'e.g. Format output as numbered bullet points with exact dollar figures and assignees...'}
                    className={`w-full p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 ${nodeData.pillarType === 'policies' ? 'focus:ring-purple-500/30' : 'focus:ring-emerald-500/30'} rounded-xl resize-none transition-all font-mono ${t.input}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`text-xs font-semibold uppercase tracking-wider ${nodeData.pillarType === 'policies' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'} font-mono flex items-center`}>
                      {nodeData.pillarType === 'policies' ? 'Governance / Policy Document' : 'Reference Spec Document'}
                      <InfoTooltip 
                        text={nodeData.pillarType === 'policies'
                          ? 'Attach a Word (.docx), TXT, Markdown, or JSON file containing institutional compliance rules and security policies.'
                          : 'Attach a Word (.docx), TXT, Markdown, or JSON file containing sample outputs and exact specifications for the AI to follow.'} 
                        align="right" 
                      />
                    </label>
                    {nodeData.referenceDoc && (
                      <span className={`text-[10px] font-mono ${nodeData.pillarType === 'policies' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'} font-semibold`}>✓ Attached</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".docx,.doc,.txt,.md,.json,.csv"
                      id={`inspector-skill-file-${selectedNode.id}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const fileName = file.name;
                        const ext = fileName.split('.').pop().toLowerCase();
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          let rawText = evt.target.result || '';
                          if (['docx', 'doc'].includes(ext)) {
                            const matches = rawText.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
                            if (matches && matches.length > 0) {
                              rawText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
                            } else {
                              rawText = rawText.replace(/[\x00-\x1F\x7F-\x9F]+/g, ' ').replace(/<[^>]+>/g, ' ').trim();
                            }
                          }
                          const cleanText = rawText.trim();
                          onUpdateNodeData(selectedNode.id, {
                            referenceDoc: { name: fileName, text: cleanText }
                          });
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <label
                      htmlFor={`inspector-skill-file-${selectedNode.id}`}
                      className={`card-pressable flex-1 py-2.5 px-3 border rounded-xl text-xs font-mono font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                        nodeData.referenceDoc
                          ? nodeData.pillarType === 'policies'
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-300'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                          : `${t.subCard} ${t.subText} hover:border-blue-500/50 hover:text-blue-600 dark:hover:text-white`
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {nodeData.referenceDoc 
                          ? nodeData.referenceDoc.name 
                          : (nodeData.pillarType === 'policies' ? 'Upload Policy / Governance File' : 'Upload Word / Spec File')}
                      </span>
                    </label>

                    {nodeData.referenceDoc && (
                      <button
                        type="button"
                        onClick={() => onUpdateNodeData(selectedNode.id, { referenceDoc: null })}
                        className={`card-pressable p-2.5 border ${t.border} rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors`}
                        title="Remove attached file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {nodeData.referenceDoc?.text && (
                    <div className={`mt-2.5 p-3 ${t.subCard} rounded-xl text-[10px] font-mono ${t.subText} space-y-1`}>
                      <span className={`font-semibold ${nodeData.pillarType === 'policies' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'} block`}>
                        {nodeData.pillarType === 'policies' ? 'Extracted Governance Preview:' : 'Extracted Spec Preview:'}
                      </span>
                      <p className={`line-clamp-3 leading-relaxed ${t.title}`}>
                        {nodeData.referenceDoc.text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {nodeData.config && Object.keys(nodeData.config).length > 0 && (
              <div className={`p-4 ${t.card} rounded-2xl space-y-3`}>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.label} block font-mono flex items-center`}>
                  Configuration Properties
                  <InfoTooltip text="Custom key-value parameters passed directly to this component during runtime execution." align="right" />
                </span>
                {Object.entries(nodeData.config).map(([key, val]) => (
                  <div key={key}>
                    <label className={`text-[10px] font-mono ${t.subText} block mb-1`}>
                      {key}
                    </label>
                    <input
                      type="text"
                      value={String(val)}
                      onChange={(e) => {
                        const newConfig = { ...nodeData.config, [key]: e.target.value };
                        onUpdateNodeData(selectedNode.id, { config: newConfig });
                      }}
                      className={`w-full px-3 py-2 text-xs font-mono rounded-lg transition-all ${t.input}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
