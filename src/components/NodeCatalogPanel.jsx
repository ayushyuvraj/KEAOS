import React, { useState, useMemo, useEffect } from 'react';
import { 
  Bot, 
  Cpu, 
  Sparkles, 
  Layers, 
  Wrench, 
  Database, 
  ShieldCheck, 
  GitFork, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  X, 
  Plus, 
  Check,
  Plug,
  Mic,
  FileText,
  Type,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Key
} from 'lucide-react';
import { PILLARS } from '../constants/pillars';
import {
  GoogleLogo,
  AnthropicLogo,
  OpenAILogo,
  OllamaLogo,
  OpenRouterLogo
} from '../constants/providerLogos';
import {
  fetchProviderModelsLive,
  getProviderCredential,
  saveProviderCredential,
  getOllamaConfig,
  saveOllamaConfig
} from '../services/llmService';

// The 5 Authorized Model Providers with Official Logos
export const MODEL_PROVIDERS = [
  {
    id: 'google',
    name: 'Google',
    fullName: 'Google GenAI',
    tagline: 'Gemini Models (Flash, Pro, Lite, Ultra)',
    logo: GoogleLogo,
    keyLabel: 'Google AI Studio API Key',
    placeholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    requiresKey: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    fullName: 'Anthropic Claude',
    tagline: 'Claude Models (Sonnet, Haiku, Opus)',
    logo: AnthropicLogo,
    keyLabel: 'Anthropic API Key',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    requiresKey: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    fullName: 'OpenAI',
    tagline: 'GPT & Reasoning Models (GPT-4o, o1, o3, etc.)',
    logo: OpenAILogo,
    keyLabel: 'OpenAI API Key',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    requiresKey: true
  },
  {
    id: 'ollama',
    name: 'Ollama',
    fullName: 'Ollama (Cloud API & Local)',
    tagline: 'Ollama API & On-device models (Llama 3.3, DeepSeek, Mistral, Qwen)',
    logo: OllamaLogo,
    keyLabel: 'Ollama API Key / Bearer Token',
    placeholder: 'Paste your Ollama API key or token (e.g. ollama_... or Bearer token)',
    docsUrl: 'https://ollama.com',
    requiresKey: false,
    isLocal: false
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    fullName: 'OpenRouter',
    tagline: 'Universal API for 200+ models with real-time routing',
    logo: OpenRouterLogo,
    keyLabel: 'OpenRouter API Key',
    placeholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    requiresKey: true
  }
];

// 8 Visual Canvas Node Categories in exact sequence
const NODE_CATEGORIES = [
  {
    id: 'agentCore',
    label: 'AI Agent',
    subtitle: 'Primary reasoning core, persona instructions & multi-agent orchestrator',
    icon: Bot,
    color: '#00338D', // Brand Blue
    bgColor: '#E6EDF7',
    badge: 'CORE AGENT',
    socketId: 'agent-core',
    items: [
      {
        id: 'agent-core-primary',
        name: 'Autonomous Agent Core',
        description: 'Central reasoning engine, authoritative instruction prompts, multi-SDK code synthesis, and typed socket coordinator.',
        config: {
          framework: 'google-adk',
          temperature: 0.2,
          topP: 0.95
        }
      },
      {
        id: 'agent-sub-orchestrator',
        name: 'Specialized Sub-Agent',
        description: 'Delegated sub-agent instance for distributed multi-agent workflows, task routing, and parallel execution.',
        config: {
          framework: 'google-adk',
          temperature: 0.1,
          topP: 0.90
        }
      }
    ]
  },
  {
    id: 'model',
    label: 'Models',
    subtitle: 'Google, Anthropic, OpenAI, Ollama Local & OpenRouter',
    icon: Cpu,
    color: '#00338D', // Royal Blue
    bgColor: '#E6EDF7',
    badge: 'FOUNDATION MODEL',
    socketId: 'model-in',
    items: MODEL_PROVIDERS.map(p => ({
      id: `provider-${p.id}`,
      name: p.name,
      description: p.tagline,
      providerId: p.id,
      isProviderCard: true
    }))
  },
  {
    id: 'skills',
    label: 'Skills',
    subtitle: 'Executive Summarizer, Action Items, Sentiment Analysis, Decisions Register',
    icon: Sparkles,
    color: '#009A44', // Green
    bgColor: '#E6F5EC',
    badge: 'SKILL',
    socketId: 'skill-in',
    items: PILLARS.skills?.items || []
  },
  {
    id: 'mcp',
    label: 'MCP (Model Context Protocol)',
    subtitle: 'Standardized client/server resources (Google Calendar, Slack, Jira, Filesystem)',
    icon: Layers,
    color: '#00A3A6', // Teal
    bgColor: '#E6F6F6',
    badge: 'MCP SERVER',
    socketId: 'mcp-in',
    items: PILLARS.mcp?.items || []
  },
  {
    id: 'tools',
    label: 'Tools',
    subtitle: 'Audio Transcription (Whisper), Document Parser, Text Box Ingest',
    icon: Wrench,
    color: '#005EB8', // Pacific Blue
    bgColor: '#E6EFF8',
    badge: 'TOOL',
    socketId: 'tool-in',
    items: PILLARS.tools?.items || []
  },
  {
    id: 'memory',
    label: 'Memory',
    subtitle: 'Episodic recurring sync memory, Chroma semantic vector store & past commitments',
    icon: Database,
    color: '#483698', // Violet
    bgColor: '#EFEBF5',
    badge: 'MEMORY',
    socketId: 'memory-in',
    items: PILLARS.memory?.items || []
  },
  {
    id: 'policies',
    label: 'Policies & Guardrails',
    subtitle: 'Real-time PII & salary redaction, enterprise NDA trade secret safety controls',
    icon: ShieldCheck,
    color: '#6D2077', // Magenta
    bgColor: '#F2E9F4',
    badge: 'POLICY',
    socketId: 'policy-in',
    items: PILLARS.policies?.items || []
  },
  {
    id: 'gateway',
    label: 'Gateway',
    subtitle: 'Ingress rate limiters, token budget caps, circuit breakers & model fallback router',
    icon: GitFork,
    color: '#EAAA00', // Amber
    bgColor: '#FDF7E6',
    badge: 'GATEWAY',
    socketId: 'gateway-in',
    items: PILLARS.gateway?.items || []
  }
];

export default function NodeCatalogPanel({
  isOpen,
  onClose,
  onAddNode,
  isDarkMode = true
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItemId, setAddedItemId] = useState(null);

  // Model Provider Selection & Live Dynamic Model Discovery State
  const [selectedModelProvider, setSelectedModelProvider] = useState(null);
  const [providerApiKey, setProviderApiKey] = useState('');
  const [ollamaEndpointUrl, setOllamaEndpointUrl] = useState(() => getOllamaConfig().baseUrl || 'http://localhost:11434');
  const [showKeySecret, setShowKeySecret] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState({});
  const [isDiscoveringModels, setIsDiscoveringModels] = useState(false);
  const [discoveryError, setDiscoveryError] = useState(null);
  const [modelSearchFilter, setModelSearchFilter] = useState('');

  // Custom user-defined skills (persisted in localStorage)
  const [customSkills, setCustomSkills] = useState(() => {
    try {
      const saved = localStorage.getItem('keaos_custom_skills');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Custom Skill Creation Form State
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [newSkillDirective, setNewSkillDirective] = useState('');
  const [referenceDoc, setReferenceDoc] = useState(null);

  const handleReferenceFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = (event) => {
      let rawText = event.target.result || '';
      if (['docx', 'doc'].includes(ext)) {
        const matches = rawText.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (matches && matches.length > 0) {
          rawText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
        } else {
          rawText = rawText.replace(/[\x00-\x1F\x7F-\x9F]+/g, ' ').replace(/<[^>]+>/g, ' ').trim();
        }
      }
      const cleanText = rawText.trim();
      const docObj = { name: fileName, text: cleanText };
      setReferenceDoc(docObj);
      if (!newSkillDirective.trim()) {
        setNewSkillDirective(`Adhere strictly to output formatting & specification guidelines from attached document "${fileName}":\n\n${cleanText.slice(0, 1500)}`);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSkill = (e) => {
    if (e) e.preventDefault();
    if (!newSkillName.trim()) return;

    const createdSkill = {
      id: `skill-custom-${Date.now().toString().slice(-4)}`,
      name: newSkillName.trim(),
      description: newSkillDesc.trim() || 'Custom user-defined skill capability',
      customDirective: newSkillDirective.trim() || null,
      referenceDoc: referenceDoc || null,
      config: { format: 'custom_rules', isCustom: true, docAttached: Boolean(referenceDoc) }
    };

    const updated = [createdSkill, ...customSkills];
    setCustomSkills(updated);
    try {
      localStorage.setItem('keaos_custom_skills', JSON.stringify(updated));
    } catch (err) {}

    setNewSkillName('');
    setNewSkillDesc('');
    setNewSkillDirective('');
    setReferenceDoc(null);
    setIsCreatingSkill(false);

    handleItemAdd('skills', createdSkill);
  };

  const handleDeleteCustomSkill = (skillId, e) => {
    if (e) e.stopPropagation();
    const updated = customSkills.filter(s => s.id !== skillId);
    setCustomSkills(updated);
    try {
      localStorage.setItem('keaos_custom_skills', JSON.stringify(updated));
    } catch (err) {}
  };

  const categoriesWithCustomSkills = useMemo(() => {
    return NODE_CATEGORIES.map(cat => {
      if (cat.id === 'skills') {
        return {
          ...cat,
          items: [...customSkills, ...(PILLARS.skills?.items || [])]
        };
      }
      return cat;
    });
  }, [customSkills]);

  const activeCategory = useMemo(() => {
    return categoriesWithCustomSkills.find(c => c.id === activeCategoryId) || null;
  }, [activeCategoryId, categoriesWithCustomSkills]);

  // Global search filtering across categories and sub-items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();

    const matches = [];
    categoriesWithCustomSkills.forEach(category => {
      const matchedItems = category.items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        category.label.toLowerCase().includes(query)
      );

      if (matchedItems.length > 0) {
        matches.push({
          category,
          items: matchedItems
        });
      }
    });

    return matches;
  }, [searchQuery, categoriesWithCustomSkills]);

  const handleSelectCategory = (categoryId) => {
    setActiveCategoryId(categoryId);
    setSelectedModelProvider(null);
    setSearchQuery('');
  };

  const handleBackToCategories = () => {
    setActiveCategoryId(null);
    setSelectedModelProvider(null);
    setSearchQuery('');
  };

  const handleItemAdd = (categoryId, item) => {
    if (onAddNode) {
      onAddNode(categoryId, item);
      setAddedItemId(item.id);
      setTimeout(() => setAddedItemId(null), 1400);
    }
  };

  // Provider selection and live API querying
  const handleSelectProvider = (providerId) => {
    setSelectedModelProvider(providerId);
    setDiscoveryError(null);
    setModelSearchFilter('');

    if (providerId === 'ollama') {
      const ollamaConf = getOllamaConfig();
      setOllamaEndpointUrl(ollamaConf.baseUrl || 'http://localhost:11434');
      setProviderApiKey(ollamaConf.apiKey || '');
      setShowKeySecret(false);

      if (!discoveredModels[providerId]) {
        handleTriggerModelDiscovery(providerId, ollamaConf.apiKey, ollamaConf.baseUrl);
      }
      return;
    }

    const existingKey = getProviderCredential(providerId) || '';
    setProviderApiKey(existingKey);
    setShowKeySecret(false);

    // If models not yet discovered for this provider and credential exists, auto-query
    if (!discoveredModels[providerId] && existingKey.trim()) {
      handleTriggerModelDiscovery(providerId, existingKey);
    }
  };

  const handleTriggerModelDiscovery = async (targetProviderId, targetKey, customUrl) => {
    const pId = targetProviderId || selectedModelProvider;
    let key = (targetKey !== undefined ? targetKey : providerApiKey).trim();
    let url = (customUrl !== undefined ? customUrl : ollamaEndpointUrl).trim();
    const providerDef = MODEL_PROVIDERS.find(p => p.id === pId);

    // If user pasted a URL into key field or combined URL + Key for Ollama, auto-detect it
    if (pId === 'ollama' && (key.includes('http://') || key.includes('https://'))) {
      const parts = key.split(/\s+/);
      const foundUrl = parts.find(p => p.startsWith('http://') || p.startsWith('https://'));
      const foundKey = parts.find(p => !p.startsWith('http://') && !p.startsWith('https://'));
      if (foundUrl) {
        url = foundUrl;
        setOllamaEndpointUrl(url);
      }
      if (foundKey) {
        key = foundKey;
        setProviderApiKey(key);
      } else if (foundUrl) {
        key = '';
        setProviderApiKey('');
      }
    }

    if (pId !== 'ollama' && !key) {
      setDiscoveryError(`Please paste an API key for ${providerDef?.name || pId}.`);
      return;
    }

    setIsDiscoveringModels(true);
    setDiscoveryError(null);

    try {
      const models = await fetchProviderModelsLive(pId, key, url);
      setDiscoveredModels(prev => ({ ...prev, [pId]: models }));
      if (pId === 'ollama') {
        saveOllamaConfig({ baseUrl: url, apiKey: key });
      } else if (key) {
        saveProviderCredential(pId, key);
      }
    } catch (err) {
      console.error(`Failed to discover models for ${pId}:`, err);
      setDiscoveryError(err.message || 'Failed to connect to API or retrieve models.');
    } finally {
      setIsDiscoveringModels(false);
    }
  };

  const handleAddDiscoveredModel = (model) => {
    const providerDef = MODEL_PROVIDERS.find(p => p.id === selectedModelProvider);
    if (selectedModelProvider === 'ollama') {
      saveOllamaConfig({ baseUrl: ollamaEndpointUrl.trim(), apiKey: providerApiKey.trim() });
    } else if (providerApiKey.trim()) {
      saveProviderCredential(selectedModelProvider, providerApiKey.trim());
    }

    const modelNodeItem = {
      id: `model-${selectedModelProvider}-${model.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
      name: `${providerDef?.name || selectedModelProvider}: ${model.name || model.id}`,
      description: model.description || `Live accessible ${providerDef?.name} foundation model.`,
      config: {
        provider: selectedModelProvider,
        modelId: model.id,
        contextLength: model.contextLength,
        baseUrl: selectedModelProvider === 'ollama' ? (ollamaEndpointUrl.trim() || 'http://localhost:11434') : undefined,
        apiKey: selectedModelProvider === 'ollama' ? (providerApiKey.trim() || undefined) : undefined
      }
    };

    handleItemAdd('model', modelNodeItem);
  };

  const handleItemClick = (categoryId, item) => {
    if (categoryId === 'model' && item.providerId) {
      setActiveCategoryId('model');
      handleSelectProvider(item.providerId);
      setSearchQuery('');
      return;
    }
    handleItemAdd(categoryId, item);
  };

  const currentProviderModels = selectedModelProvider ? (discoveredModels[selectedModelProvider] || []) : [];
  const filteredDiscoveredModels = useMemo(() => {
    if (!modelSearchFilter.trim()) return currentProviderModels;
    const q = modelSearchFilter.toLowerCase().trim();
    return currentProviderModels.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.id && m.id.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  }, [currentProviderModels, modelSearchFilter]);

  if (!isOpen) return null;

  return (
    <aside 
      className={`absolute top-0 right-0 w-96 h-full z-30 flex flex-col border-l shadow-2xl transition-all duration-200 animate-in slide-in-from-right duration-200 select-none ${
        isDarkMode 
          ? 'bg-[#181A20] border-[#2D313D] text-[#E2E8F0]' 
          : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19]'
      }`}
    >
      {/* ============================================================ */}
      {/* HEADER: Dynamic based on Tier 1 vs Tier 2                    */}
      {/* ============================================================ */}
      <div className={`p-4 border-b shrink-0 ${
        isDarkMode ? 'border-[#2D313D] bg-[#1E2028]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
      }`}>
        {activeCategory ? (
          /* Tier 2 Header: Back button + Category Title */
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={
                  activeCategory.id === 'model' && selectedModelProvider
                    ? () => { setSelectedModelProvider(null); setDiscoveryError(null); }
                    : handleBackToCategories
                }
                className={`btn-tactile flex items-center gap-1.5 text-xs font-mono font-bold transition-colors ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-white' 
                    : 'text-slate-600 hover:text-[#00338D]'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>
                  {activeCategory.id === 'model' && selectedModelProvider
                    ? 'All Providers'
                    : 'All Categories'}
                </span>
              </button>

              <button
                onClick={onClose}
                className={`p-1 transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-[#0B0F19]'
                }`}
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div 
                className="w-7 h-7 flex items-center justify-center shrink-0 border"
                style={{ 
                  backgroundColor: activeCategory.bgColor, 
                  color: activeCategory.color,
                  borderColor: `${activeCategory.color}40`
                }}
              >
                {activeCategory.id === 'model' && selectedModelProvider ? (
                  (() => {
                    const CurrentLogo = MODEL_PROVIDERS.find(p => p.id === selectedModelProvider)?.logo || Cpu;
                    return <CurrentLogo className="w-4 h-4" />;
                  })()
                ) : (
                  React.createElement(activeCategory.icon || Wrench, { className: 'w-4 h-4' })
                )}
              </div>
              <div className="flex-1 truncate">
                <h3 className={`text-sm font-bold tracking-tight truncate ${
                  isDarkMode ? 'text-white' : 'text-[#001E50]'
                }`}>
                  {activeCategory.id === 'model' && selectedModelProvider
                    ? `${MODEL_PROVIDERS.find(p => p.id === selectedModelProvider)?.name} Models`
                    : activeCategory.label}
                </h3>
                <span className={`text-[10px] font-mono ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500 font-medium'
                }`}>
                  {activeCategory.id === 'model'
                    ? selectedModelProvider
                      ? isDiscoveringModels
                        ? 'Connecting & detecting compatible models...'
                        : `${currentProviderModels.length} models detected via API`
                      : '5 foundation providers available'
                    : `${activeCategory.items.length} ${activeCategory.items.length === 1 ? 'component' : 'components'} available`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Tier 1 Header: Title + Search */
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0091DA] block">
                  Nodes & Capabilities
                </span>
                <h3 className={`text-sm font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-[#001E50]'
                }`}>
                  What happens next?
                </h3>
              </div>

              <button
                onClick={onClose}
                className={`p-1 transition-colors ${
                  isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-[#0B0F19]'
                }`}
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search Input (only shown when not inside a selected model provider) */}
        {!(activeCategory?.id === 'model' && selectedModelProvider) && (
          <div className="relative mt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={activeCategory ? `Search in ${activeCategory.label}...` : "Search nodes..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 text-xs border focus:outline-none transition-colors rounded-none ${
                isDarkMode 
                  ? 'bg-[#14151B] border-[#2D313D] text-white placeholder-slate-500 focus:border-[#0091DA]' 
                  : 'bg-white border-[#CBD5E1] text-[#0B0F19] placeholder-slate-400 focus:border-[#00338D]'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* BODY CONTENT: Search Results / Tier 1 List / Tier 2 List     */}
      {/* ============================================================ */}
      <div className="flex-1 overflow-y-auto divide-y divide-inherit">
        {searchResults ? (
          /* Global Search Results */
          <div className="p-3 space-y-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No matching components found for "{searchQuery}"
              </div>
            ) : (
              searchResults.map(({ category, items }) => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-slate-400 px-1">
                    {React.createElement(category.icon || Wrench, { className: 'w-3 h-3', style: { color: category.color } })}
                    <span>{category.label}</span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(category.id, item)}
                        className={`p-3 border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isDarkMode 
                            ? 'bg-[#1E2028] border-[#2D313D] hover:border-[#0091DA] hover:bg-[#252833]' 
                            : 'bg-white border-[#E2E8F0] hover:border-[#00338D] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className={`text-xs font-bold truncate ${
                            isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                          }`}>
                            {item.name}
                          </h5>
                          <p className={`text-[11px] line-clamp-2 mt-0.5 leading-relaxed ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {item.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(category.id, item);
                          }}
                          className={`btn-tactile w-7 h-7 flex items-center justify-center shrink-0 border transition-all ${
                            addedItemId === item.id
                              ? 'bg-[#009A44] text-white border-[#009A44]'
                              : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#001E50]'
                          }`}
                          title={item.isProviderCard ? "Configure Provider" : "Add to Canvas"}
                        >
                          {addedItemId === item.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : item.isProviderCard ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeCategory ? (
          /* Tier 2 Detail List: Sub-items inside selected category */
          activeCategory.id === 'model' ? (
            /* ======================================================== */
            /* SPECIALIZED DYNAMIC MODEL DISCOVERY & SELECTION          */
            /* ======================================================== */
            !selectedModelProvider ? (
              /* Level 2A: The 5 Providers with Actual SVG Logos */
              <div className="p-3 space-y-2.5">
                <div className={`p-3 border text-[11px] leading-relaxed rounded-none ${
                  isDarkMode 
                    ? 'bg-[#14151B] border-[#2D313D] text-slate-300' 
                    : 'bg-[#E6EDF7] border-[#00338D]/20 text-[#001E50]'
                }`}>
                  <div className="font-bold flex items-center gap-1.5 text-[#00338D] mb-1">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Select Foundation Model Provider</span>
                  </div>
                  Paste your API key to detect all compatible models in real time. Zero hardcoded model limits.
                </div>

                <div className="space-y-2">
                  {MODEL_PROVIDERS.map(provider => {
                    const ProviderLogo = provider.logo;
                    const isConfigured = Boolean(getProviderCredential(provider.id));
                    return (
                      <button
                        key={provider.id}
                        onClick={() => handleSelectProvider(provider.id)}
                        className={`w-full p-3.5 border transition-all text-left flex items-start justify-between gap-3 group cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#1E2028] border-[#2D313D] hover:border-[#0091DA] hover:bg-[#252833]'
                            : 'bg-white border-[#E2E8F0] hover:border-[#00338D] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 flex items-center justify-center shrink-0 border bg-white shadow-sm p-1.5">
                            <ProviderLogo className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-xs font-bold tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                                {provider.name}
                              </h4>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                isConfigured || provider.isLocal
                                  ? 'bg-[#E6F5EC] text-[#009A44] border border-[#009A44]/30'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {isConfigured ? '● Key Ready' : provider.isLocal ? '● Local Endpoint' : '○ Paste Key'}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 line-clamp-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {provider.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center text-[#00338D] text-xs font-bold font-mono self-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#00338D]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Level 2B: Provider API Key Input & Real-Time Model Detection */
              <div className="p-3 space-y-3">
                {(() => {
                  const currentProviderDef = MODEL_PROVIDERS.find(p => p.id === selectedModelProvider) || MODEL_PROVIDERS[0];
                  const SelectedLogo = currentProviderDef.logo;

                  return (
                    <div className="space-y-3">
                      {/* Connection & API Key Box */}
                      <div className={`p-3.5 border space-y-3 ${
                        isDarkMode ? 'bg-[#1E2028] border-[#2D313D]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 flex items-center justify-center border bg-white p-1 shadow-sm">
                              <SelectedLogo className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                                {currentProviderDef.name}
                              </h4>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {currentProviderDef.isLocal ? 'Local Daemon Endpoint' : 'Cloud API Key'}
                              </span>
                            </div>
                          </div>

                          <a
                            href={currentProviderDef.docsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#00338D] hover:underline flex items-center gap-1 font-bold font-mono"
                          >
                            <span>Get Key</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Input field */}
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                            {currentProviderDef.keyLabel} {selectedModelProvider === 'ollama' ? '(Optional for local)' : '*'}
                          </label>
                          <div className="relative">
                            <input
                              type={showKeySecret ? 'text' : 'password'}
                              value={providerApiKey}
                              onChange={(e) => {
                                const val = e.target.value;
                                // If user pastes a full URL into the API key field for Ollama, auto-populate the endpoint URL
                                if (selectedModelProvider === 'ollama' && (val.startsWith('http://') || val.startsWith('https://'))) {
                                  setOllamaEndpointUrl(val.trim());
                                  setProviderApiKey('');
                                } else {
                                  setProviderApiKey(val);
                                }
                                setDiscoveryError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleTriggerModelDiscovery();
                                }
                              }}
                              placeholder={currentProviderDef.placeholder}
                              className={`w-full pl-3 pr-16 py-2 text-xs font-mono border rounded-none focus:outline-none transition-colors ${
                                isDarkMode 
                                  ? 'bg-[#14151B] border-[#2D313D] text-white focus:border-[#0091DA]' 
                                  : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
                              }`}
                            />
                            <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setShowKeySecret(!showKeySecret)}
                                className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:text-white"
                                title={showKeySecret ? "Hide Key" : "Show Key"}
                              >
                                {showKeySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Dedicated Server Endpoint URL for Ollama */}
                        {selectedModelProvider === 'ollama' && (
                          <div>
                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Ollama Host Endpoint (Remote or Local)
                            </label>
                            <input
                              type="text"
                              value={ollamaEndpointUrl}
                              onChange={(e) => {
                                setOllamaEndpointUrl(e.target.value);
                                setDiscoveryError(null);
                              }}
                              placeholder="http://localhost:11434 (default) or https://your-cloud-ollama.com"
                              className={`w-full px-3 py-2 text-xs font-mono border rounded-none focus:outline-none transition-colors ${
                                isDarkMode 
                                  ? 'bg-[#14151B] border-[#2D313D] text-white focus:border-[#0091DA]' 
                                  : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
                              }`}
                            />
                            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                              Supports local daemon (http://localhost:11434) and remote cloud/proxy Ollama instances.
                            </span>

                            {providerApiKey.trim() && ollamaEndpointUrl.includes('localhost') && (
                              <div className="p-2.5 bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-sans leading-snug mt-2 animate-in fade-in">
                                <span className="font-bold font-mono text-[10px] uppercase block text-amber-800 mb-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Remote Cloud API Token Detected</span>
                                </span>
                                You entered an API token, but the Host Endpoint is set to local (<code className="font-mono bg-amber-100 text-amber-900 px-1">http://localhost:11434</code>). Please enter your remote host URL above (e.g. <code className="font-mono bg-amber-100 text-amber-900 px-1">https://your-cloud-ollama.com</code>).
                              </div>
                            )}
                          </div>
                        )}

                        {/* Trigger button */}
                        <button
                          onClick={() => handleTriggerModelDiscovery()}
                          disabled={isDiscoveringModels || (!providerApiKey.trim() && selectedModelProvider !== 'ollama')}
                          className="btn-tactile w-full py-2 bg-[#00338D] hover:bg-[#005EB8] disabled:bg-slate-600 text-white text-xs font-bold font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          {isDiscoveringModels ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Querying {currentProviderDef.name} API in Real-Time...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Detect Compatible Models</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Error Banner */}
                      {discoveryError && (
                        <div className="p-3 border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-mono space-y-1 animate-in fade-in duration-150">
                          <div className="flex items-center gap-1.5 font-bold text-red-500">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Authentication / Discovery Failed</span>
                          </div>
                          <p className="text-[11px] leading-relaxed break-words pl-5">{discoveryError}</p>
                        </div>
                      )}

                      {/* Loading State Skeleton */}
                      {isDiscoveringModels && (
                        <div className="p-4 border border-[#0091DA]/30 bg-[#0091DA]/5 space-y-2 animate-pulse text-center">
                          <Loader2 className="w-5 h-5 text-[#0091DA] animate-spin mx-auto" />
                          <p className="text-xs font-mono text-[#0091DA] font-bold">
                            Querying live API endpoints...
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Detecting models accessible with this credential
                          </p>
                        </div>
                      )}

                      {/* Discovered Models List */}
                      {!isDiscoveringModels && currentProviderModels.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs px-1 font-mono">
                            <span className="text-[#009A44] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{currentProviderModels.length} Models Accessible</span>
                            </span>
                            <span className="text-slate-400 text-[10px]">Click any model to add to canvas</span>
                          </div>

                          {/* Filter input */}
                          {currentProviderModels.length > 3 && (
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                              <input
                                type="text"
                                value={modelSearchFilter}
                                onChange={(e) => setModelSearchFilter(e.target.value)}
                                placeholder={`Filter ${currentProviderModels.length} models...`}
                                className={`w-full pl-8 pr-3 py-1.5 text-xs font-mono border rounded-none focus:outline-none ${
                                  isDarkMode
                                    ? 'bg-[#14151B] border-[#2D313D] text-white focus:border-[#0091DA]'
                                    : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
                                }`}
                              />
                            </div>
                          )}

                          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                            {filteredDiscoveredModels.map(model => (
                              <div
                                key={model.id}
                                onClick={() => handleAddDiscoveredModel(model)}
                                className={`group p-2.5 border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                                  isDarkMode
                                    ? 'bg-[#1E2028] border-[#2D313D] hover:border-[#0091DA] hover:bg-[#252833]'
                                    : 'bg-white border-[#E2E8F0] hover:border-[#00338D] hover:bg-[#F8FAFC]'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <SelectedLogo className="w-3.5 h-3.5 shrink-0" />
                                    <h5 className={`text-xs font-bold truncate ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                                      {model.name}
                                    </h5>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
                                    {model.id}
                                  </span>
                                  <p className={`text-[10px] line-clamp-2 mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {model.description}
                                  </p>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddDiscoveredModel(model);
                                  }}
                                  className={`btn-tactile w-7 h-7 flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                                    addedItemId === `model-${selectedModelProvider}-${model.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
                                      ? 'bg-[#009A44] text-white border-[#009A44]'
                                      : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#001E50]'
                                  }`}
                                  title="Add to Canvas"
                                >
                                  {addedItemId === `model-${selectedModelProvider}-${model.id.replace(/[^a-zA-Z0-9_-]/g, '-')}` ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )
          ) : (
            /* Other categories (Skills, MCP, Tools, etc.) */
            <div className="p-3 space-y-3">
              {/* Create Custom Skill Button & Form (for Skills Category) */}
              {activeCategory.id === 'skills' && (
                <div className="space-y-2">
                  {!isCreatingSkill ? (
                    <button
                      onClick={() => setIsCreatingSkill(true)}
                      className="btn-tactile w-full py-2.5 px-3 bg-[#009A44] hover:bg-[#007F38] text-white text-xs font-bold font-mono flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Create Custom Skill</span>
                    </button>
                  ) : (
                    <form onSubmit={handleCreateSkill} className={`p-3 border space-y-3 animate-in fade-in zoom-in-95 duration-150 ${
                      isDarkMode ? 'bg-[#1E2028] border-[#009A44]/60' : 'bg-[#E6F5EC] border-[#009A44]/60'
                    }`}>
                      <div className="flex items-center justify-between border-b border-[#009A44]/30 pb-2">
                        <span className="text-xs font-bold text-[#009A44] font-mono flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Define New Custom Skill</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatingSkill(false)}
                          className="text-slate-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase">
                          Skill Name *
                        </label>
                        <input
                          type="text"
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          placeholder="e.g. Contract Clause Extractor"
                          required
                          className={`w-full px-2.5 py-1.5 text-xs border rounded-none focus:outline-none ${
                            isDarkMode 
                              ? 'bg-[#14151B] border-[#2D313D] text-white focus:border-[#009A44]' 
                              : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#009A44]'
                          }`}
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase">
                          Description
                        </label>
                        <input
                          type="text"
                          value={newSkillDesc}
                          onChange={(e) => setNewSkillDesc(e.target.value)}
                          placeholder="e.g. Extracts termination clauses, liability limits, and SLAs."
                          className={`w-full px-2.5 py-1.5 text-xs border rounded-none focus:outline-none ${
                            isDarkMode 
                              ? 'bg-[#14151B] border-[#2D313D] text-white focus:border-[#009A44]' 
                              : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#009A44]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase flex items-center justify-between">
                          <span>Attach Reference Spec (.docx, .txt, .md, .json)</span>
                          {referenceDoc && <span className="text-[#009A44] font-bold">✓ Parsed</span>}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept=".docx,.doc,.txt,.md,.json,.csv"
                            onChange={handleReferenceFileUpload}
                            id="custom-skill-doc-input"
                            className="hidden"
                          />
                          <label
                            htmlFor="custom-skill-doc-input"
                            className={`btn-tactile flex-1 py-1.5 px-3 border text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                              referenceDoc
                                ? 'bg-[#E6F5EC] border-[#009A44] text-[#009A44]'
                                : 'bg-[#14151B] border-[#2D313D] text-slate-300 hover:text-white'
                            }`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span className="truncate">{referenceDoc ? referenceDoc.name : 'Upload Word / Spec File'}</span>
                          </label>
                          {referenceDoc && (
                            <button
                              type="button"
                              onClick={() => setReferenceDoc(null)}
                              className="p-1.5 text-slate-400 hover:text-red-400"
                              title="Remove attached file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase">
                          Prompt Directives & Output Rules
                        </label>
                        <textarea
                          rows={3}
                          value={newSkillDirective}
                          onChange={(e) => setNewSkillDirective(e.target.value)}
                          placeholder="e.g. Format output strictly as a markdown table with columns: Clause | Penalty | Severity..."
                          className={`w-full p-2.5 text-xs font-mono border rounded-none focus:outline-none resize-none ${
                            isDarkMode 
                              ? 'bg-[#14151B] border-[#2D313D] text-white focus:border-[#009A44]' 
                              : 'bg-white border-[#CBD5E1] text-[#0B0F19] focus:border-[#009A44]'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={!newSkillName.trim()}
                          className="btn-tactile flex-1 py-1.5 bg-[#009A44] hover:bg-[#007F38] disabled:bg-slate-600 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Save & Add to Canvas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreatingSkill(false)}
                          className="btn-tactile px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-mono font-bold transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeCategory.items
                .filter(item => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(item => {
                  let ItemIcon = activeCategory.icon;
                  if (item.id === 'tool-audio-transcribe') ItemIcon = Mic;
                  if (item.id === 'tool-doc-parser') ItemIcon = FileText;
                  if (item.id === 'tool-text-box-ingest') ItemIcon = Type;
                  const isCustom = item.config?.isCustom;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemAdd(activeCategory.id, item)}
                      className={`group p-3 border transition-all cursor-pointer flex items-start justify-between gap-3 shadow-sm ${
                        isDarkMode 
                          ? 'bg-[#1E2028] border-[#2D313D] hover:border-[#0091DA] hover:bg-[#252833]' 
                          : 'bg-white border-[#E2E8F0] hover:border-[#00338D] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ItemIcon className="w-3.5 h-3.5 shrink-0" style={{ color: activeCategory.color }} />
                          <h5 className={`text-xs font-bold truncate ${
                            isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                          }`}>
                            {item.name}
                          </h5>
                        </div>
                        <p className={`text-[11px] line-clamp-2 mt-1 leading-relaxed ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {item.description}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span 
                            className="text-[9px] font-mono px-1.5 py-0.5 border flex items-center gap-1 font-bold"
                            style={{ 
                              backgroundColor: activeCategory.bgColor, 
                              color: activeCategory.color, 
                              borderColor: `${activeCategory.color}40` 
                            }}
                          >
                            <Plug className="w-2.5 h-2.5" />
                            {activeCategory.socketId}
                          </span>

                          {isCustom && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#009A44]/20 text-[#009A44] border border-[#009A44]/40 font-bold">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isCustom && (
                          <button
                            onClick={(e) => handleDeleteCustomSkill(item.id, e)}
                            className="btn-tactile w-7 h-7 flex items-center justify-center shrink-0 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all mt-0.5"
                            title="Delete Custom Skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemAdd(activeCategory.id, item);
                          }}
                          className={`btn-tactile w-7 h-7 flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                            addedItemId === item.id
                              ? 'bg-[#009A44] text-white border-[#009A44]'
                              : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#001E50]'
                          }`}
                          title="Add to Canvas"
                        >
                          {addedItemId === item.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        ) : (
          /* Tier 1 Primary Category List (Exact sequence requested by user) */
          <div className="divide-y divide-inherit">
            {NODE_CATEGORIES.map(category => {
              const CategoryIcon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleSelectCategory(category.id)}
                  className={`w-full p-4 flex items-center justify-between text-left transition-all group ${
                    isDarkMode 
                      ? 'hover:bg-[#1E2028] hover:border-l-4 hover:border-l-[#0091DA]' 
                      : 'hover:bg-[#F8FAFC] hover:border-l-4 hover:border-l-[#00338D]'
                  }`}
                  style={{
                    borderLeftColor: category.color
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div 
                      className="w-8 h-8 flex items-center justify-center shrink-0 border shadow-inner mt-0.5"
                      style={{ 
                        backgroundColor: category.bgColor, 
                        color: category.color,
                        borderColor: `${category.color}40` 
                      }}
                    >
                      <CategoryIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-bold tracking-tight ${
                          isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                        }`}>
                          {category.label}
                        </h4>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-[#E6EDF7] text-[#00338D]'
                        }`}>
                          {category.items.length}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-0.5 line-clamp-2 leading-relaxed ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {category.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 transition-all shrink-0 ${
                    isDarkMode 
                      ? 'text-slate-400 group-hover:text-white group-hover:translate-x-0.5' 
                      : 'text-slate-400 group-hover:text-[#00338D] group-hover:translate-x-0.5'
                  }`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* FOOTER: Architecture Info                                    */}
      {/* ============================================================ */}
      <div className={`p-3 border-t text-[10px] font-mono flex items-center justify-between shrink-0 ${
        isDarkMode ? 'bg-[#14151B] border-[#2D313D] text-slate-400' : 'bg-[#F8FAFC] border-[#E2E8F0] text-slate-600 font-bold'
      }`}>
        <span>8 VISUAL PILLARS</span>
        <span>AUDIT & COST: INHERENT</span>
      </div>
    </aside>
  );
}
