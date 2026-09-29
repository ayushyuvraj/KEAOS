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
  EyeOff
} from 'lucide-react';
import { PILLARS } from '../constants/pillars';
import { 
  PROVIDERS, 
  getProviderCredential, 
  saveProviderCredential,
  isFixedTemperatureModel,
  getCachedDiscoveredModels,
  fetchProviderModelsLive
} from '../services/llmService';
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

// Reusable simple-language Info Tooltip (i)
function InfoTooltip({ text, align = 'left' }) {
  const isRight = align === 'right';
  return (
    <div className="relative group/info inline-flex items-center ml-1.5 z-30">
      <div className="w-3.5 h-3.5 rounded-full border border-slate-400 text-slate-500 hover:text-[#00338D] hover:border-[#00338D] hover:bg-[#E6EDF7] flex items-center justify-center text-[9px] font-mono font-bold cursor-help transition-all">
        i
      </div>
      <div className={`absolute top-full ${isRight ? 'right-0' : 'left-0'} mt-1.5 hidden group-hover/info:block w-48 p-2.5 bg-[#0B0F19] text-white text-[10px] normal-case font-sans font-normal tracking-normal leading-relaxed shadow-xl border border-[#3E424F] z-50 rounded-none animate-in fade-in duration-150 pointer-events-none`}>
        {text}
        <div className={`absolute bottom-full ${isRight ? 'right-1.5' : 'left-1.5'} border-4 border-transparent border-b-[#0B0F19]`} />
      </div>
    </div>
  );
}

export default function Inspector({
  selectedNode,
  nodes = [],
  activeUseCase,
  onSelectFramework,
  agentConfig,
  onUpdateAgentConfig,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
  onCollapse,
  onOpenApiSettings
}) {
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
    if (selectedNode) {
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

  const isAgent = selectedNode.type === 'agentCore';
  const nodeData = selectedNode.data;
  const pillarDef = PILLARS[nodeData.pillarType];
  const isModel = nodeData.pillarType === 'model';

  // Multi-LLM provider detection for model nodes
  const currentProvider = nodeData.config?.provider || 
    (nodeData.name?.toLowerCase().includes('claude') ? 'anthropic' :
     nodeData.name?.toLowerCase().includes('gpt') ? 'openai' :
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
    if (!isModel) return;
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
        modelId: newModelId
      }
    });
  };

  return (
    <aside className="w-88 h-full bg-[#FFFFFF] border-l border-[#E0E0E0] flex flex-col shrink-0 overflow-hidden shadow-sm select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#E0E0E0] bg-[#F8F9FB] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#00338D] text-white flex items-center justify-center shadow-inner">
            {isAgent ? (
              <Bot className="w-4 h-4 text-white" />
            ) : isModel ? (
              <Cpu className="w-4 h-4 text-white" />
            ) : (
              <Settings2 className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#00338D] block font-mono">
              {isAgent ? 'Core Agent Inspector' : isModel ? 'Foundation Model Spec' : `${nodeData.pillarType?.toUpperCase()} Specifications`}
            </span>
            <h4 className="text-xs font-bold text-[#0B0F19] truncate max-w-[190px] tracking-tight">
              {nodeData.name}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isAgent && (
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              className="btn-tactile w-7 h-7 hover:bg-[#F2E9F4] text-slate-400 hover:text-[#6D2077] flex items-center justify-center transition-colors"
              title="Delete block"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCollapse}
            className="btn-tactile w-7 h-7 hover:bg-[#E0E0E0] text-slate-400 hover:text-[#0B0F19] flex items-center justify-center transition-colors"
            title="Collapse Panel"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="btn-tactile w-7 h-7 hover:bg-[#E0E0E0] text-slate-400 hover:text-[#0B0F19] flex items-center justify-center transition-colors"
            title="Close node inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FFFFFF]">
        {isAgent ? (
          <>
            {/* Target Multi-Agent Framework Selector */}
            <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00338D] flex items-center">
                  Target Multi-Agent Framework
                  <InfoTooltip text="Select the framework (like Google ADK, LangGraph, AutoGen, CrewAI, or OpenAI) you want to export Python code for." align="right" />
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#00338D]/10 text-[#00338D] font-bold">
                  {activeUseCase?.framework?.category || 'SDK'}
                </span>
              </div>
              <select
                value={activeUseCase?.framework?.id || 'google-adk'}
                onChange={(e) => {
                  const fw = FRAMEWORKS.find(f => f.id === e.target.value);
                  if (fw && onSelectFramework) onSelectFramework(fw);
                }}
                className="w-full p-2 text-xs font-mono font-bold bg-white border border-[#CBD5E1] text-[#0B0F19] rounded-none focus:outline-none focus:border-[#00338D] cursor-pointer"
              >
                {FRAMEWORKS.map(fw => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name} — {fw.subtitle}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                {activeUseCase?.framework?.description || 'Export idiomatic Python code matching your visual graph.'}
              </p>
            </div>

            {/* System Prompt Customizer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono flex items-center">
                  System Instruction Prompt
                  <InfoTooltip text="The main instructions and behavioral rules given to the AI agent to tell it how to act, think, and format its response." align="right" />
                </label>
                <span className="text-[10px] font-mono text-[#00338D] font-bold">Persona</span>
              </div>
              <textarea
                rows={5}
                value={agentConfig.prompt}
                onChange={(e) => onUpdateAgentConfig({ prompt: e.target.value })}
                placeholder="Provide authoritative prompt as to what we want the agent to do..."
                className="w-full p-3 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] leading-relaxed focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none resize-none font-mono transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Authoritative instructions governing output schema, analytical rigor, and task assignments.
              </p>
            </div>

            {/* Save Agent Specification Button */}
            <div className="pt-4 border-t border-[#E0E0E0]">
              <button
                type="button"
                onClick={() => {
                  setSavedNotification(true);
                  setTimeout(() => setSavedNotification(false), 2500);
                }}
                className="btn-tactile w-full flex items-center justify-center gap-2 py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold font-mono rounded-none transition-colors border-b-2 border-[#001E50] shadow-sm"
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
        ) : isModel ? (
          /* Specialized Multi-LLM Foundation Model Inspector */
          <div className="space-y-4">
            {/* Top: Current Provider Card with Change Provider button */}
            <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {(() => {
                    const CurrentLogo = PROVIDER_LOGOS[currentProvider] || Cpu;
                    return <CurrentLogo className="w-8 h-8 shrink-0" />;
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0B0F19]">{providerDef.name}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold flex items-center gap-1 ${
                        hasCredential || currentProvider === 'ollama'
                          ? 'bg-[#E6F5EC] text-[#009A44] border border-[#009A44]/30'
                          : 'bg-[#FEF6E6] text-[#EAAA00] border border-[#EAAA00]/30'
                      }`}>
                        {hasCredential || currentProvider === 'ollama' ? '● Key Ready' : '○ Key Missing'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Active Foundation Model Provider</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsChangingProvider(!isChangingProvider);
                    setEnteringKeyProvider(null);
                    setDiscoveryError(null);
                  }}
                  className="btn-tactile text-[11px] font-bold font-mono px-2.5 py-1 bg-white border border-[#CBD5E1] hover:border-[#00338D] text-[#00338D] hover:bg-[#E6EDF7] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Switch to another LLM provider"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isChangingProvider ? 'Cancel' : 'Change Provider'}</span>
                </button>
              </div>

              {/* Provider Switcher Drawer: Remaining 4 providers */}
              {isChangingProvider && (
                <div className="mt-3 pt-3 border-t border-[#CBD5E1] space-y-2 animate-in fade-in duration-150">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                    Select Alternate Provider (Remaining 4)
                  </span>

                  <div className="space-y-1.5">
                    {otherProviders.map(pDef => {
                      const PLogo = PROVIDER_LOGOS[pDef.id] || Cpu;
                      const hasKey = Boolean(getProviderCredential(pDef.id));
                      const isEnteringKey = enteringKeyProvider === pDef.id;

                      return (
                        <div key={pDef.id} className="border border-[#CBD5E1] bg-white">
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
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isEnteringKey ? 'bg-[#E6EDF7]' : 'hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <PLogo className="w-7 h-7 shrink-0" />
                              <div>
                                <div className="text-xs font-bold text-[#0B0F19]">{pDef.name}</div>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {hasKey ? '● API Key Ready' : pDef.id === 'ollama' ? '● Local / Cloud' : '○ API Key Required'}
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono font-bold text-[#00338D] flex items-center gap-1">
                              {hasKey || pDef.id === 'ollama' ? 'Select →' : isEnteringKey ? 'Close' : '+ Enter API'}
                            </span>
                          </div>

                          {/* Inline API key entry if not yet provided */}
                          {isEnteringKey && (
                            <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600">
                                  Paste {pDef.name} API Key
                                </label>
                                {pDef.docsUrl && (
                                  <a
                                    href={pDef.docsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-[#00338D] hover:underline font-mono font-bold flex items-center gap-0.5"
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
                                  className="w-full px-2.5 py-1.5 pr-8 text-xs font-mono border border-[#CBD5E1] bg-white text-[#0B0F19] rounded-none focus:outline-none focus:border-[#00338D]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKeySecret(!showKeySecret)}
                                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-700"
                                >
                                  {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              {discoveryError && (
                                <div className="p-2 bg-red-50 border border-red-300 text-red-700 text-[10px] font-mono">
                                  {discoveryError}
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={isDiscoveringNewProvider || (!providerKeyInput.trim() && pDef.id !== 'ollama')}
                                onClick={() => handleSaveNewProviderKey(pDef.id, providerKeyInput)}
                                className="btn-tactile w-full py-1.5 bg-[#00338D] hover:bg-[#005EB8] disabled:bg-slate-400 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                {isDiscoveringNewProvider ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Validating & Detecting Models...</span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-3 h-3" />
                                    <span>Save Globally & Switch to {pDef.name}</span>
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

            {/* Model Identifier Dropdown with all compatible models */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono flex items-center">
                  Model Identifier
                  <InfoTooltip text="Compatible models detected live via your API credentials." align="left" />
                </label>
                <div className="flex items-center gap-2">
                  {isLoadingModels && (
                    <span className="text-[10px] text-[#0091DA] font-mono flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Detecting...</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCustomModelMode(!customModelMode)}
                    className="text-[10px] font-mono text-[#00338D] hover:underline font-bold"
                  >
                    {customModelMode ? 'Compatible List' : 'Custom Model ID'}
                  </button>
                </div>
              </div>

              {customModelMode ? (
                <input
                  type="text"
                  value={currentModelId}
                  onChange={(e) => handleModelIdSelect(e.target.value)}
                  placeholder="e.g. gpt-4o, claude-3-5-sonnet, gemini-2.0-flash"
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-mono text-[#0B0F19] focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
                />
              ) : (
                <select
                  value={currentModelId}
                  onChange={(e) => handleModelIdSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-bold text-[#0B0F19] focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors cursor-pointer"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                {availableModels.length > 1
                  ? `${availableModels.length} compatible models accessible via your ${providerDef.name} API.`
                  : `Select any compatible model supported by ${providerDef.name}.`}
              </span>
            </div>

            {/* Ollama Endpoint & API Token Settings */}
            {currentProvider === 'ollama' && (
              <div className="p-3 bg-[#E6EDF7] border border-[#00338D]/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00338D]">
                  <Server className="w-3.5 h-3.5" />
                  <span className="flex items-center">
                    Ollama Host & API Settings
                    <InfoTooltip text="Supports local daemon (http://localhost:11434) and authenticated remote cloud instances." align="left" />
                  </span>
                </div>
                <p className="text-[11px] text-[#001E50] leading-relaxed">
                  Connect to local on-device hardware or remote authenticated Ollama cloud endpoints.
                </p>
                <div>
                  <label className="text-[10px] font-mono text-slate-600 block mb-1 flex items-center">
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
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-mono text-[#0B0F19] focus:outline-none focus:border-[#00338D] rounded-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-600 block mb-1 flex items-center">
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
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-mono text-[#0B0F19] focus:outline-none focus:border-[#00338D] rounded-none"
                  />
                </div>
              </div>
            )}

            {/* Credential Action & Live Status */}
            <div>
              <button
                type="button"
                onClick={() => onOpenApiSettings && onOpenApiSettings(currentProvider)}
                className="btn-tactile w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-[#00338D] text-white hover:bg-[#005EB8] rounded-none transition-colors shadow-sm border-b-2 border-[#001E50] cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure {providerDef.name} Credentials</span>
              </button>
            </div>

            {/* Hyperparameters */}
            <div className="space-y-3 pt-3 border-t border-[#E0E0E0]">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0B0F19] block font-mono flex items-center">
                Model Hyperparameters
                <InfoTooltip text="Fine-tune how the AI model balances factual precision versus creative output." align="right" />
              </span>

              {(() => {
                const isReasoning = isFixedTemperatureModel(currentModelId);
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#0B0F19] flex items-center gap-1.5">
                        <span>Temperature</span>
                        {isReasoning && (
                          <span className="text-[9px] font-mono uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 font-bold">
                            Default (1.0)
                          </span>
                        )}
                        <InfoTooltip 
                          text={isReasoning 
                            ? "This reasoning model only supports the default (1.0) temperature. Custom values are restricted by the provider." 
                            : "Controls randomness: 0.0 is exact and deterministic, 1.0 is creative and diverse."} 
                          align="left" 
                        />
                      </span>
                      <span className={`text-xs font-mono font-bold ${isReasoning ? 'text-slate-400' : 'text-[#00338D]'}`}>
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
                      className={`w-full accent-[#00338D] ${isReasoning ? 'opacity-40 cursor-not-allowed' : ''}`}
                    />
                    {isReasoning && (
                      <p className="text-[10px] text-amber-800 mt-1 font-sans italic leading-tight">
                        Reasoning & frontier models only allow default temperature (1.0).
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#0B0F19] flex items-center">
                    Top-P
                    <InfoTooltip text="Nucleus sampling threshold: Controls how many likely tokens are considered during generation." align="left" />
                  </span>
                  <span className="text-xs font-mono text-[#00338D] font-bold">
                    {Number(nodeData.config?.topP ?? 0.95).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="1.00"
                  step="0.01"
                  value={nodeData.config?.topP ?? 0.95}
                  onChange={(e) => {
                    onUpdateNodeData(selectedNode.id, {
                      config: { ...nodeData.config, topP: parseFloat(parseFloat(e.target.value).toFixed(2)) }
                    });
                  }}
                  className="w-full accent-[#00338D]"
                />
              </div>
            </div>

            {/* Provider Capability Overview */}
            <div className="p-3 bg-[#F8F9FB] border border-[#E0E0E0] text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-[#0B0F19] block mb-1 font-mono flex items-center">
                Provider Capabilities:
                <InfoTooltip text="Key features supported by this AI provider, such as native audio, structured output, or offline execution." align="right" />
              </span>
              {currentProvider === 'google' && 'Native multimodal audio ingestion (MP3), 1M-2M context window, fast JSON schema generation.'}
              {currentProvider === 'anthropic' && 'State-of-the-art analytical reasoning, nuanced long-form output, structured artifacts.'}
              {currentProvider === 'openai' && 'Flagship GPT-4o reasoning, strict JSON schema mode, widespread enterprise SDK compatibility.'}
              {currentProvider === 'ollama' && 'Private offline execution on local GPU/CPU. Complete compliance for confidential meetings.'}
              {currentProvider === 'openrouter' && 'Unified API gateway routing across 200+ models with automatic load balancing.'}
            </div>

            {/* Save Model Specification Button */}
            <div className="pt-3 border-t border-[#E0E0E0]">
              <button
                type="button"
                onClick={() => {
                  setSavedNotification(true);
                  setTimeout(() => setSavedNotification(false), 2500);
                }}
                className="btn-tactile w-full flex items-center justify-center gap-2 py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold font-mono rounded-none transition-colors border-b-2 border-[#001E50] shadow-sm cursor-pointer"
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
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 block mb-1 font-mono flex items-center">
                Pillar Category
                <InfoTooltip text="Which of the 10 core AI pillars (Skills, MCP, Tools, Gateway, Memory, Guardrails, etc.) this component belongs to." align="left" />
              </span>
              <div className="p-2.5 bg-[#F8F9FB] border border-[#E0E0E0] flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B0F19] capitalize">{nodeData.pillarType}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FFFFFF] text-[#00338D] border border-[#00338D]/20 font-bold">
                  Socket: {pillarDef?.socketId}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] block mb-1.5 font-mono flex items-center">
                Block Display Name
                <InfoTooltip text="The name assigned to this block on your canvas workspace." align="left" />
              </label>
              <input
                type="text"
                value={nodeData.name}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { name: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] block mb-1.5 font-mono flex items-center">
                Description
                <InfoTooltip text="A simple description explaining what this component does when your agent executes." align="left" />
              </label>
              <textarea
                rows={3}
                value={nodeData.description}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { description: e.target.value })}
                className="w-full p-2.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] leading-relaxed focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none resize-none transition-colors"
              />
            </div>

            {nodeData.pillarType === 'skills' && (
              <div className="space-y-3 pt-3 border-t border-[#E0E0E0]">
                <div>
                  <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#009A44] block mb-1.5 font-mono flex items-center">
                    Skill Directives & Output Rules
                    <InfoTooltip text="Custom instructions and formatting commands injected directly into the LLM when executing this skill." align="right" />
                  </label>
                  <textarea
                    rows={3}
                    value={nodeData.customDirective || ''}
                    onChange={(e) => onUpdateNodeData(selectedNode.id, { customDirective: e.target.value })}
                    placeholder="e.g. Format output as numbered bullet points with exact dollar figures and assignees..."
                    className="w-full p-2.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] leading-relaxed focus:outline-none focus:border-[#009A44] focus:ring-1 focus:ring-[#009A44] rounded-none resize-none transition-colors font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#009A44] font-mono flex items-center">
                      Reference Spec Document
                      <InfoTooltip text="Attach a Word (.docx), TXT, Markdown, or JSON file containing sample outputs and exact specifications for the AI to follow." align="right" />
                    </label>
                    {nodeData.referenceDoc && (
                      <span className="text-[10px] font-mono text-[#009A44] font-bold">✓ Attached</span>
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
                      className={`btn-tactile flex-1 py-2 px-3 border text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                        nodeData.referenceDoc
                          ? 'bg-[#E6F5EC] border-[#009A44] text-[#009A44]'
                          : 'bg-[#F8F9FB] border-[#CBD5E1] text-[#0B0F19] hover:bg-[#E6EDF7] hover:border-[#00338D]'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {nodeData.referenceDoc ? nodeData.referenceDoc.name : 'Upload Word / Spec File'}
                      </span>
                    </label>

                    {nodeData.referenceDoc && (
                      <button
                        type="button"
                        onClick={() => onUpdateNodeData(selectedNode.id, { referenceDoc: null })}
                        className="btn-tactile p-2 border border-[#CBD5E1] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove attached file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {nodeData.referenceDoc?.text && (
                    <div className="mt-2 p-2 bg-[#F8F9FB] border border-[#CBD5E1] text-[10px] font-mono text-slate-600 space-y-1">
                      <span className="font-bold text-[#009A44] block">Extracted Spec Preview:</span>
                      <p className="line-clamp-3 leading-relaxed text-[#0B0F19]">
                        {nodeData.referenceDoc.text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {nodeData.config && Object.keys(nodeData.config).length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#E0E0E0]">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0B0F19] block font-mono flex items-center">
                  Configuration Properties
                  <InfoTooltip text="Custom key-value parameters passed directly to this component during runtime execution." align="right" />
                </span>
                {Object.entries(nodeData.config).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-[10px] font-mono text-slate-500 block mb-1">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={String(val)}
                      onChange={(e) => {
                        const newConfig = { ...nodeData.config, [key]: e.target.value };
                        onUpdateNodeData(selectedNode.id, { config: newConfig });
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] font-mono focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
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
