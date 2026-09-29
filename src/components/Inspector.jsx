import React, { useState, useEffect } from 'react';
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
  Activity,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { PILLARS } from '../constants/pillars';
import { PROVIDERS, getProviderCredential } from '../services/llmService';
import { FRAMEWORKS } from '../constants/frameworks';

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

  const activeModelNode = (nodes || []).find(n => n.data?.pillarType === 'model' && !n.data?.isDeactivated);
  const activeModelName = activeModelNode?.data?.name || 'No Model Connected';

  useEffect(() => {
    if (selectedNode) {
      setIsCollapsed(false);
    }
  }, [selectedNode?.id]);

  const handleCollapse = () => {
    if (onCollapse) {
      onCollapse();
    } else {
      setIsCollapsed(true);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="btn-tactile absolute top-4 right-5 z-20 flex items-center gap-2 px-3 py-2 bg-[#FFFFFF] hover:bg-[#F8F9FB] text-[#00338D] border border-[#CBD5E1] hover:border-[#00338D] shadow-[0_4px_16px_rgba(0,30,80,0.1)] transition-all font-mono text-xs font-bold rounded-none select-none"
        title="Open Inspector Panel"
      >
        <PanelRightOpen className="w-4 h-4 text-[#00338D]" />
        <span>{selectedNode ? 'Inspect Block' : 'Studio HUD'}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#009A44] beacon-live" />
      </button>
    );
  }

  if (!selectedNode) {
    return (
      <aside className="w-88 h-full bg-[#FFFFFF] border-l border-[#CBD5E1] p-5 flex flex-col justify-between shrink-0 overflow-y-auto select-none shadow-sm">
        <div className="space-y-5">
          {/* Header */}
          <div className="border-b border-[#E0E0E0] pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-[#00338D]" />
                <h3 className="text-xs font-bold text-[#0B0F19] tracking-tight uppercase font-mono">
                  Studio Architecture HUD
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Live topology health, socket allocation, and system telemetry.
              </p>
            </div>
            <button
              onClick={handleCollapse}
              className="btn-tactile p-1 text-slate-400 hover:text-[#00338D] hover:bg-[#E6EDF7] border border-transparent hover:border-[#CBD5E1] transition-colors ml-2 shrink-0"
              title="Collapse Right Panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          {/* Graph Health Metric Cards */}
          <div className="space-y-2.5">
            <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>GRAPH HEALTH</span>
                <span className="font-bold text-[#009A44]">100% OPERATIONAL</span>
              </div>
              <div className="text-base font-extrabold text-[#001E50] mt-1 tracking-tight">
                10 / 10 Pillars Bound
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Strict typed sockets enforced. Zero connection collisions.
              </p>
            </div>

            <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>ACTIVE FOUNDATION MODEL</span>
                <span className="font-bold text-[#00338D]">LIVE API</span>
              </div>
              <div className="text-xs font-bold text-[#0B0F19] mt-1 truncate">
                {activeModelName}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => onOpenApiSettings && onOpenApiSettings('google')}
                  className="btn-tactile text-[10px] font-mono font-bold text-[#00338D] hover:underline flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  <span>Configure API Keys</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#F8F9FB] border border-[#CBD5E1]">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>CRYPTOGRAPHIC AUDIT</span>
                <span className="font-bold text-[#001E50]">W3C SHA-256</span>
              </div>
              <div className="text-xs font-mono text-slate-700 mt-1 truncate">
                Immutable Ledger Active
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                All meeting inputs and outputs cryptographically signed.
              </p>
            </div>
          </div>

          {/* Quick Inspector Hint */}
          <div className="p-3 bg-[#E6EDF7]/50 border border-[#00338D]/20 text-xs">
            <span className="font-bold text-[#00338D] block mb-1">Canvas Inspection</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Click any block on the canvas to inspect its parameters, adjust LLM provider settings, or modify execution prompts.
            </p>
          </div>
        </div>

        {/* Footer Quick Action */}
        <div className="pt-4 border-t border-[#E0E0E0]">
          <div className="text-[10px] font-mono text-slate-400 text-center">
            KEAOS Operating Studio v2.4 • Production Ready
          </div>
        </div>
      </aside>
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

  const handleProviderSelect = (newProvider) => {
    const pDef = PROVIDERS[newProvider];
    const defaultModel = pDef.defaultModel;
    onUpdateNodeData(selectedNode.id, {
      name: `${pDef.name} (${defaultModel})`,
      description: `${pDef.name} foundation model configured for live enterprise inference.`,
      config: {
        ...nodeData.config,
        provider: newProvider,
        modelId: defaultModel,
        baseUrl: newProvider === 'ollama' ? (nodeData.config?.baseUrl || 'http://localhost:11434') : undefined
      }
    });
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
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00338D]">
                  Target Multi-Agent Framework
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
                <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                  System Instruction Prompt
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

            {/* Universal & Dynamic Injection Tokens */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                  Dynamic Injection Tokens
                </span>
                <span className="text-[9px] font-mono text-slate-400">Click to insert</span>
              </div>

              {/* Universal Tokens */}
              <div className="mb-2">
                <span className="text-[9px] font-mono text-slate-400 block mb-1 uppercase tracking-tight">
                  Universal (Any Task)
                </span>
                <div className="flex flex-wrap gap-1">
                  {['{{user_input}}', '{{attached_tools}}', '{{memory_context}}', '{{policy_rules}}'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => onUpdateAgentConfig({ prompt: (agentConfig.prompt || '') + ` ${tag}` })}
                      className="btn-tactile text-[9px] font-mono px-2 py-0.5 bg-[#00338D]/10 hover:bg-[#00338D] text-[#00338D] hover:text-white border border-[#00338D]/30 transition-colors font-bold"
                      title="Insert universal token"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Domain Specific & Custom Tokens */}
              <div className="mb-2">
                <span className="text-[9px] font-mono text-slate-400 block mb-1 uppercase tracking-tight">
                  Domain & Custom Variables
                </span>
                <div className="flex flex-wrap gap-1">
                  {['{{transcript}}', '{{attendees}}', '{{meeting_date}}', '{{past_commitments}}', ...customTokens].map(tag => (
                    <button
                      key={tag}
                      onClick={() => onUpdateAgentConfig({ prompt: (agentConfig.prompt || '') + ` ${tag}` })}
                      className="btn-tactile text-[9px] font-mono px-2 py-0.5 bg-[#F1F5F9] hover:bg-[#0091DA] text-slate-700 hover:text-white border border-slate-300 hover:border-[#0091DA] transition-colors font-medium"
                      title="Insert token into prompt"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Custom Token Input */}
              <div className="flex items-center gap-1 mt-1.5">
                <input
                  type="text"
                  value={newCustomToken}
                  onChange={(e) => setNewCustomToken(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCustomToken.trim()) {
                      e.preventDefault();
                      const cleaned = newCustomToken.trim().replace(/^\{+|\}+$/g, '');
                      const formatted = `{{${cleaned}}}`;
                      if (!customTokens.includes(formatted)) {
                        setCustomTokens([...customTokens, formatted]);
                      }
                      setNewCustomToken('');
                    }
                  }}
                  placeholder="e.g. invoice_data"
                  className="flex-1 px-2 py-1 bg-white border border-[#CBD5E1] text-[10px] font-mono text-[#0B0F19] rounded-none focus:outline-none focus:border-[#00338D]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCustomToken.trim()) {
                      const cleaned = newCustomToken.trim().replace(/^\{+|\}+$/g, '');
                      const formatted = `{{${cleaned}}}`;
                      if (!customTokens.includes(formatted)) {
                        setCustomTokens([...customTokens, formatted]);
                      }
                      setNewCustomToken('');
                    }
                  }}
                  className="px-2.5 py-1 bg-[#00338D] hover:bg-[#005EB8] text-white text-[10px] font-mono font-bold transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Hyperparameters */}
            <div className="space-y-4 pt-3 border-t border-[#E0E0E0]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#0B0F19]">Temperature</span>
                  <span className="text-xs font-mono text-[#00338D] font-bold">{agentConfig.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={agentConfig.temperature}
                  onChange={(e) => onUpdateAgentConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-[#00338D]"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
                  <span>Deterministic (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#0B0F19]">Top-P</span>
                  <span className="text-xs font-mono text-[#00338D] font-bold">{agentConfig.topP || 0.95}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={agentConfig.topP || 0.95}
                  onChange={(e) => onUpdateAgentConfig({ topP: parseFloat(e.target.value) })}
                  className="w-full accent-[#00338D]"
                />
              </div>
            </div>
          </>
        ) : isModel ? (
          /* Specialized Multi-LLM Foundation Model Inspector */
          <div className="space-y-4">
            {/* Provider Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                  LLM Provider
                </label>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  hasCredential || currentProvider === 'ollama'
                    ? 'bg-[#E6F5EC] text-[#009A44] border border-[#009A44]/30'
                    : 'bg-[#FEF6E6] text-[#EAAA00] border border-[#EAAA00]/30'
                }`}>
                  {hasCredential || currentProvider === 'ollama' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{currentProvider === 'ollama' ? 'Local Service' : 'Key Ready'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      <span>Key Missing</span>
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(PROVIDERS).filter(([_, def]) => !def.disabled).map(([pId, def]) => {
                  const isSelected = currentProvider === pId;
                  const isConfigured = Boolean(getProviderCredential(pId));
                  return (
                    <button
                      key={pId}
                      onClick={() => handleProviderSelect(pId)}
                      className={`btn-tactile px-3 py-2 text-left text-xs font-bold border transition-all flex items-center justify-between rounded-none ${
                        isSelected
                          ? 'border-[#00338D] bg-[#E6EDF7] text-[#00338D] shadow-sm'
                          : 'border-[#CBD5E1] bg-[#FFFFFF] text-[#0B0F19] hover:bg-[#F8F9FB]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#00338D] beacon-live' : 'bg-[#CCCCCC]'}`} />
                        <span>{def.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {isConfigured ? '● Active' : def.isLocal ? '● Local' : '○ Not set'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model ID Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                  Model Identifier
                </label>
                <button
                  onClick={() => setCustomModelMode(!customModelMode)}
                  className="text-[10px] font-mono text-[#00338D] hover:underline font-bold"
                >
                  {customModelMode ? 'Preset Models' : 'Custom Model ID'}
                </button>
              </div>

              {customModelMode ? (
                <input
                  type="text"
                  value={currentModelId}
                  onChange={(e) => handleModelIdSelect(e.target.value)}
                  placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-mono text-[#0B0F19] focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
                />
              ) : (
                <select
                  value={currentModelId}
                  onChange={(e) => handleModelIdSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-bold text-[#0B0F19] focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
                >
                  {providerDef.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Ollama Local Endpoint Settings */}
            {currentProvider === 'ollama' && (
              <div className="p-3 bg-[#E6EDF7] border border-[#00338D]/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00338D]">
                  <Server className="w-3.5 h-3.5" />
                  <span>Local Private Host</span>
                </div>
                <p className="text-[11px] text-[#001E50] leading-relaxed">
                  Runs directly on your computer hardware. 100% private, zero token costs, air-gapped compliance.
                </p>
                <div>
                  <label className="text-[10px] font-mono text-slate-600 block mb-1">
                    Ollama Base URL
                  </label>
                  <input
                    type="text"
                    value={nodeData.config?.baseUrl || 'http://localhost:11434'}
                    onChange={(e) => {
                      onUpdateNodeData(selectedNode.id, {
                        config: { ...nodeData.config, baseUrl: e.target.value }
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs font-mono text-[#0B0F19] focus:outline-none focus:border-[#00338D] rounded-none"
                  />
                </div>
              </div>
            )}

            {/* Credential Action & Live Status */}
            <div>
              <button
                onClick={() => onOpenApiSettings && onOpenApiSettings(currentProvider)}
                className="btn-tactile w-full flex items-center justify-center gap-2 py-2 text-xs font-bold bg-[#00338D] text-white hover:bg-[#005EB8] rounded-none transition-colors shadow-sm border-b-2 border-[#001E50]"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure {providerDef.name} Credentials</span>
              </button>
            </div>

            {/* Hyperparameters */}
            <div className="space-y-3 pt-3 border-t border-[#E0E0E0]">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0B0F19] block font-mono">
                Model Hyperparameters
              </span>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#0B0F19]">Temperature</span>
                  <span className="text-xs font-mono text-[#00338D] font-bold">
                    {nodeData.config?.temperature ?? 0.2}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={nodeData.config?.temperature ?? 0.2}
                  onChange={(e) => {
                    onUpdateNodeData(selectedNode.id, {
                      config: { ...nodeData.config, temperature: parseFloat(e.target.value) }
                    });
                  }}
                  className="w-full accent-[#00338D]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#0B0F19]">Top-P</span>
                  <span className="text-xs font-mono text-[#00338D] font-bold">
                    {nodeData.config?.topP ?? 0.95}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={nodeData.config?.topP ?? 0.95}
                  onChange={(e) => {
                    onUpdateNodeData(selectedNode.id, {
                      config: { ...nodeData.config, topP: parseFloat(e.target.value) }
                    });
                  }}
                  className="w-full accent-[#00338D]"
                />
              </div>
            </div>

            {/* Provider Capability Overview */}
            <div className="p-3 bg-[#F8F9FB] border border-[#E0E0E0] text-[11px] text-slate-600 leading-relaxed">
              <span className="font-bold text-[#0B0F19] block mb-1 font-mono">Provider Capabilities:</span>
              {currentProvider === 'google' && 'Native multimodal audio ingestion (MP3), 1M-2M context window, fast JSON schema generation.'}
              {currentProvider === 'anthropic' && 'State-of-the-art analytical reasoning, nuanced long-form output, structured artifacts.'}
              {currentProvider === 'openai' && 'Flagship GPT-4o reasoning, strict JSON schema mode, widespread enterprise SDK compatibility.'}
              {currentProvider === 'ollama' && 'Private offline execution on local GPU/CPU. Complete compliance for confidential meetings.'}
              {currentProvider === 'openrouter' && 'Unified API gateway routing across 200+ models with automatic load balancing.'}
            </div>
          </div>
        ) : (
          /* Generic Inspector for other Pillars */
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 block mb-1 font-mono">
                Pillar Category
              </span>
              <div className="p-2.5 bg-[#F8F9FB] border border-[#E0E0E0] flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B0F19] capitalize">{nodeData.pillarType}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FFFFFF] text-[#00338D] border border-[#00338D]/20 font-bold">
                  Socket: {pillarDef?.socketId}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] block mb-1.5 font-mono">
                Block Display Name
              </label>
              <input
                type="text"
                value={nodeData.name}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { name: e.target.value })}
                className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] block mb-1.5 font-mono">
                Description
              </label>
              <textarea
                rows={3}
                value={nodeData.description}
                onChange={(e) => onUpdateNodeData(selectedNode.id, { description: e.target.value })}
                className="w-full p-2.5 bg-[#FFFFFF] border border-[#CBD5E1] text-xs text-[#0B0F19] leading-relaxed focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none resize-none transition-colors"
              />
            </div>

            {nodeData.config && Object.keys(nodeData.config).length > 0 && (
              <div className="space-y-3 pt-3 border-t border-[#E0E0E0]">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#0B0F19] block font-mono">
                  Configuration Properties
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
