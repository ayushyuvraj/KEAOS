import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Server, 
  Wrench, 
  Database, 
  Activity, 
  DollarSign, 
  Lock, 
  Search, 
  Plus, 
  Filter, 
  ShieldAlert, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  ExternalLink,
  Sliders,
  ChevronRight,
  Info
} from 'lucide-react';

import ScreenScaffold from '../common/ScreenScaffold';
import { PILLARS } from '../../constants/pillars';
import { PROVIDERS } from '../../services/llmService';
import { 
  getRegistryState, 
  subscribeToRegistry, 
  isComponentDecommissioned,
  isProviderDecommissioned,
  decommissionComponent,
  decommissionProvider,
  recommissionProvider,
  calculateBlastRadius,
  deleteSpecializedAgent,
  deleteCustomItem
} from '../../services/componentRegistryService';

import BlastRadiusDrawer from '../registry/BlastRadiusDrawer';
import CalibrationModal from '../registry/CalibrationModal';
import AddSpecializedAgentModal from '../registry/AddSpecializedAgentModal';
import AddPillarItemModal from '../registry/AddPillarItemModal';

// Canonical Categories Definition
const REGISTRY_CATEGORIES = [
  { id: 'agentCore', label: 'AI Agents', icon: Bot, color: '#00338D', description: 'Autonomous agent cores and pre-configured specialized personas.' },
  { id: 'model', label: 'Foundation Models', icon: Cpu, color: '#00338D', description: 'Reasoning brains: Google, Anthropic, OpenAI, Ollama, and OpenRouter.' },
  { id: 'skills', label: 'Skills', icon: Sparkles, color: '#6D2077', description: 'Specialized analytical behaviors, MoM synthesizers, and extraction methodologies.' },
  { id: 'policies', label: 'Policies & Guardrails', icon: ShieldCheck, color: '#470A68', description: 'Compliance boundaries, PII redactions, NDA masks, and safety constraints.' },
  { id: 'mcp', label: 'Model Context Protocol (MCP)', icon: Server, color: '#00A3A6', description: 'Real-time JSON-RPC and SSE client/server external resources.' },
  { id: 'tools', label: 'Ingestion Tools', icon: Wrench, color: '#0091DA', description: 'Multimodal file, audio, document, and text intake pipelines.' },
  { id: 'gateway', label: 'Gateway & Routing', icon: Layers, color: '#00A3A6', description: 'Traffic ingress, rate limiting, and zero-trust protocol mediation.' },
  { id: 'memory', label: 'Memory Stores', icon: Database, color: '#483698', description: 'Long-term episodic and semantic knowledge vector stores.' },
  { id: 'audit', label: 'Audit & Compliance', icon: Lock, color: '#001E50', description: 'Cryptographic SHA-256 tamper-proof execution ledger.' },
  { id: 'observability', label: 'Observability & Tracing', icon: Activity, color: '#0091DA', description: 'Distributed OpenTelemetry spans, token telemetry, and latency waterfalls.' },
  { id: 'cost_benefit', label: 'Cost & ROI Accounting', icon: DollarSign, color: '#EAAA00', description: 'Unit compute economics and employee time-saved valuation.' }
];

export default function RegistryView({ onNavigateToWorkflow, isDarkMode = true }) {
  const [registryState, setRegistryState] = useState(getRegistryState);
  const [selectedCategoryId, setSelectedCategoryId] = useState('agentCore');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'decommissioned'
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isAddPillarOpen, setIsAddPillarOpen] = useState(false);
  const [blastTarget, setBlastTarget] = useState(null);
  const [blastProviderId, setBlastProviderId] = useState(null);
  const [calibrationTarget, setCalibrationTarget] = useState(null);

  // Subscribe to registry updates reactively
  useEffect(() => {
    return subscribeToRegistry((updatedState) => {
      setRegistryState(updatedState);
    });
  }, []);

  const selectedCategory = useMemo(() => {
    return REGISTRY_CATEGORIES.find(c => c.id === selectedCategoryId) || REGISTRY_CATEGORIES[0];
  }, [selectedCategoryId]);

  // Aggregate items for selected category (Built-in + Custom)
  const categoryItems = useMemo(() => {
    const list = [];

    if (selectedCategoryId === 'agentCore') {
      // 1. Default Generic Autonomous Agent
      list.push({
        id: 'agent-core-primary',
        name: 'Autonomous Agent Core',
        role: 'General Multi-Agent Reasoning',
        prompt: 'Analyze meeting transcripts, extract decisions, action items with owners, and draft follow-up communications.',
        defaultModel: 'gpt-4o',
        isDefault: true
      });
      // 2. Custom Specialized Agents
      (registryState.customSpecializedAgents || []).forEach(sa => {
        list.push({
          ...sa,
          isSpecialized: true
        });
      });
    } else {
      // Items from PILLARS
      const pillarDef = PILLARS[selectedCategoryId];
      if (pillarDef && Array.isArray(pillarDef.items)) {
        pillarDef.items.forEach(item => {
          list.push({
            ...item,
            pillarType: selectedCategoryId,
            isBuiltin: true
          });
        });
      }
      // Custom items from registry state
      const customForCat = registryState.customItems?.[selectedCategoryId] || [];
      customForCat.forEach(item => {
        list.push({
          ...item,
          pillarType: selectedCategoryId,
          isCustom: true
        });
      });
    }

    return list;
  }, [selectedCategoryId, registryState]);

  // Compute blast metrics map for all items in current category
  const blastMap = useMemo(() => {
    const map = {};
    categoryItems.forEach(item => {
      const blast = calculateBlastRadius(item.id, null, selectedCategoryId);
      map[item.id] = blast.totalWorkflowCount;
    });
    return map;
  }, [categoryItems, selectedCategoryId]);

  // Filter items by status and search
  const filteredItems = useMemo(() => {
    return categoryItems.filter(item => {
      const isDecom = isComponentDecommissioned(item);
      if (filterMode === 'active' && isDecom) return false;
      if (filterMode === 'decommissioned' && !isDecom) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = (item.name || '').toLowerCase().includes(query);
        const descMatch = (item.description || item.prompt || item.role || '').toLowerCase().includes(query);
        return nameMatch || descMatch;
      }
      return true;
    });
  }, [categoryItems, filterMode, searchTerm, registryState]);

  // Calculate category counters for left sidebar
  const categoryStats = useMemo(() => {
    const stats = {};
    REGISTRY_CATEGORIES.forEach(cat => {
      let total = 0;
      let decommissioned = 0;

      if (cat.id === 'agentCore') {
        const agents = [
          { id: 'agent-core-primary' },
          ...(registryState.customSpecializedAgents || [])
        ];
        total = agents.length;
        decommissioned = agents.filter(a => isComponentDecommissioned(a)).length;
      } else {
        const builtins = PILLARS[cat.id]?.items || [];
        const customs = registryState.customItems?.[cat.id] || [];
        const combined = [...builtins, ...customs];
        total = combined.length;
        decommissioned = combined.filter(item => isComponentDecommissioned(item)).length;
      }

      stats[cat.id] = { total, decommissioned, active: total - decommissioned };
    });
    return stats;
  }, [registryState]);

  const activeReplacementsForCategory = useMemo(() => {
    return categoryItems.filter(item => !isComponentDecommissioned(item));
  }, [categoryItems, registryState]);

  return (
    <ScreenScaffold
      title="Enterprise Registry & Governance Control Plane"
      eyebrow="CONTROL PLANE & COMPONENT GOVERNANCE"
      statusText="AUTHORITATIVE REGISTRY"
      statusType="brand"
    >
      <div className="flex gap-6 h-[calc(100vh-140px)] select-none">
        {/* ======================================================== */}
        {/* LEFT COLUMN: 11 Canonical Categories List                */}
        {/* ======================================================== */}
        <div className={`w-80 border flex flex-col shrink-0 overflow-y-auto shadow-xs rounded-xl ${
          isDarkMode ? 'bg-[#0E131E] border-[#1F2C3F]' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-3.5 border-b flex items-center justify-between ${
            isDarkMode ? 'bg-[#0A0D14] border-[#1F2C3F]' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Canonical Architectural Pillars
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00338D]/20 text-[#0091DA] border border-[#0091DA]/30">
              {REGISTRY_CATEGORIES.length}
            </span>
          </div>

          <div className="divide-y divide-slate-800/20">
            {REGISTRY_CATEGORIES.map(cat => {
              const isSelected = cat.id === selectedCategoryId;
              const Icon = cat.icon;
              const stats = categoryStats[cat.id] || { total: 0, active: 0, decommissioned: 0 };

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setSearchTerm('');
                    setFilterMode('all');
                  }}
                  className={`w-full text-left p-3.5 flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? (isDarkMode 
                          ? 'bg-[#141C2B] border-l-4 border-l-[#0091DA] text-white' 
                          : 'bg-blue-50/80 border-l-4 border-l-[#00338D] text-[#00338D]')
                      : (isDarkMode 
                          ? 'hover:bg-white/[0.03] text-slate-300 border-l-4 border-l-transparent' 
                          : 'hover:bg-slate-50 text-slate-700 border-l-4 border-l-transparent')
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold truncate leading-tight">
                        {cat.label}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        {stats.active} Active {stats.decommissioned > 0 && <span className="text-rose-400">· {stats.decommissioned} Decom</span>}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    stats.decommissioned > 0
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : isDarkMode 
                        ? 'bg-[#151D2C] border-slate-700 text-slate-300' 
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    {stats.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Category Details & Component Inventory     */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
          {/* Category Header Card */}
          <div 
            className={`p-5 rounded-xl border shadow-xs relative overflow-hidden transition-all ${
              isDarkMode ? 'bg-[#0E131E] border-[#1F2C3F]' : 'bg-white border-slate-200'
            }`}
            style={{ borderTop: `3px solid ${selectedCategory.color}` }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40 mb-3">
              <div className="flex items-center gap-3">
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${selectedCategory.color}20`, color: selectedCategory.color }}
                >
                  <selectedCategory.icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider block" style={{ color: selectedCategory.color }}>
                    ARCHITECTURAL PILLAR SPECIFICATION
                  </span>
                  <h3 className="text-base font-bold tracking-tight">
                    {selectedCategory.label} Control Section
                  </h3>
                </div>
              </div>

              {/* Category-specific creation button */}
              {selectedCategoryId === 'agentCore' ? (
                <button
                  type="button"
                  onClick={() => setIsAddAgentOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#00338D] hover:bg-[#005EB8] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Specialized Agent</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddPillarOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#00338D] hover:bg-[#005EB8] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add {selectedCategory.label}</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              {selectedCategory.description}
            </p>

            {/* Metrics Chips */}
            <div className="grid grid-cols-4 gap-3">
              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-[#131926] border-[#222E42]' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Total Registered</span>
                <span className="text-base font-bold font-mono">{categoryItems.length}</span>
              </div>
              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-[#131926] border-[#222E42]' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-0.5">Active</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {categoryItems.filter(i => !isComponentDecommissioned(i)).length}
                </span>
              </div>
              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-[#131926] border-[#222E42]' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-mono uppercase text-rose-400 block mb-0.5">Decommissioned</span>
                <span className="text-base font-bold font-mono text-rose-400">
                  {categoryItems.filter(i => isComponentDecommissioned(i)).length}
                </span>
              </div>
              <div className={`p-2.5 rounded-lg border text-center ${
                isDarkMode ? 'bg-[#131926] border-[#222E42]' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] font-mono uppercase text-[#0091DA] block mb-0.5">Dependent Workflows</span>
                <span className="text-base font-bold font-mono text-[#0091DA]">
                  {Object.values(blastMap).reduce((a, b) => a + b, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PROVIDER-LEVEL DECOMMISSIONING BAR (For Models Pillar)   */}
          {/* ======================================================== */}
          {selectedCategoryId === 'model' && (
            <div className={`p-4 rounded-xl border space-y-2.5 ${
              isDarkMode ? 'bg-[#0E131E] border-[#1F2C3F]' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0091DA] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Provider-Level Decommissioning Controls (Org-Wide)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Dual-Level Governance
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {Object.values(PROVIDERS).map(prov => {
                  const isDecom = isProviderDecommissioned(prov.id);
                  return (
                    <div
                      key={prov.id}
                      className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                        isDecom
                          ? (isDarkMode ? 'bg-rose-950/20 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800')
                          : (isDarkMode ? 'bg-[#131926] border-[#222E42] text-slate-200' : 'bg-white border-slate-200 text-slate-800')
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold truncate">
                          {prov.name}
                        </span>
                        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                          isDecom ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {isDecom ? 'DECOM' : 'ACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBlastTarget(null);
                            setBlastProviderId(prov.id);
                          }}
                          className="text-[10px] text-[#0091DA] hover:underline font-mono cursor-pointer"
                        >
                          Blast Radius
                        </button>

                        {isDecom ? (
                          <button
                            type="button"
                            onClick={() => recommissionProvider(prov.id)}
                            className="px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            Recommission
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBlastTarget(null);
                              setBlastProviderId(prov.id);
                            }}
                            className="px-2 py-0.5 text-[9px] font-bold rounded bg-rose-600/80 hover:bg-rose-600 text-white cursor-pointer"
                          >
                            Decommission
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 rounded-lg border bg-[#0E131E] border-[#1F2C3F]">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterMode === 'all' 
                    ? 'bg-[#00338D] text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({categoryItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('active')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterMode === 'active' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active ({categoryItems.filter(i => !isComponentDecommissioned(i)).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('decommissioned')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  filterMode === 'decommissioned' 
                    ? 'bg-rose-600 text-white shadow-xs' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Decommissioned ({categoryItems.filter(i => isComponentDecommissioned(i)).length})
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${selectedCategory.label}...`}
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border outline-none font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-[#0E131E] border-[#1F2C3F] text-white focus:border-[#0091DA]' 
                    : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
                }`}
              />
            </div>
          </div>

          {/* Component Inventory Grid */}
          <div className="grid grid-cols-2 gap-4 pb-8">
            {filteredItems.length === 0 ? (
              <div className={`col-span-2 p-8 rounded-xl border text-center text-xs text-slate-400 ${
                isDarkMode ? 'bg-[#0E131E] border-[#1F2C3F]' : 'bg-slate-50 border-slate-200'
              }`}>
                No components match the selected filter.
              </div>
            ) : (
              filteredItems.map(item => {
                const isDecom = isComponentDecommissioned(item);
                const workflowCount = blastMap[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg ${
                      isDecom
                        ? (isDarkMode ? 'bg-rose-950/10 border-rose-900/40' : 'bg-rose-50/50 border-rose-200')
                        : (isDarkMode ? 'bg-[#0E131E] border-[#1F2C3F] hover:border-[#0091DA]' : 'bg-white border-slate-200 hover:border-[#00338D]')
                    }`}
                    style={{ borderTop: `3px solid ${isDecom ? '#E11D48' : selectedCategory.color}` }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isDecom
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isDecom ? 'DECOMMISSIONED' : 'ACTIVE'}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {item.isSpecialized && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              SPECIALIZED AGENT
                            </span>
                          )}
                          {item.isCustom && !item.isSpecialized && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              CUSTOM
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Role/Description */}
                      <h4 className="text-xs font-bold tracking-tight mb-1">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3 line-clamp-2">
                        {item.role || item.description || item.prompt}
                      </p>

                      {/* Workflow Dependency Pill */}
                      <div className="flex items-center justify-between mb-3 pt-2 border-t border-slate-800/30 text-[10px] font-mono">
                        <span className="text-slate-400">Blast Radius:</span>
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          workflowCount > 0 
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'text-slate-500'
                        }`}>
                          {workflowCount > 0 ? `Used in ${workflowCount} workflow(s)` : '0 workflows'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-800/30">
                      <button
                        type="button"
                        onClick={() => {
                          setBlastTarget(item);
                          setBlastProviderId(null);
                        }}
                        className="text-[11px] font-mono text-[#0091DA] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>Blast Radius</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isDecom ? (
                          <button
                            type="button"
                            onClick={() => setCalibrationTarget(item)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset & Calibrate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setBlastTarget(item);
                              setBlastProviderId(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-all cursor-pointer active:scale-95"
                          >
                            Decommission
                          </button>
                        )}

                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete '${item.name}' permanently?`)) {
                                if (item.isSpecialized) {
                                  deleteSpecializedAgent(item.id);
                                } else {
                                  deleteCustomItem(selectedCategoryId, item.id);
                                }
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete custom item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALS & DRAWERS                                         */}
      {/* ======================================================== */}
      {blastTarget && (
        <BlastRadiusDrawer
          isOpen={Boolean(blastTarget)}
          onClose={() => setBlastTarget(null)}
          targetItem={blastTarget}
          category={selectedCategoryId}
          activeReplacements={activeReplacementsForCategory}
          onComponentDecommissioned={() => setBlastTarget(null)}
          onNavigateToWorkflow={onNavigateToWorkflow}
          isDarkMode={isDarkMode}
        />
      )}

      {blastProviderId && (
        <BlastRadiusDrawer
          isOpen={Boolean(blastProviderId)}
          onClose={() => setBlastProviderId(null)}
          providerId={blastProviderId}
          category="model"
          activeReplacements={activeReplacementsForCategory}
          onComponentDecommissioned={() => setBlastProviderId(null)}
          onNavigateToWorkflow={onNavigateToWorkflow}
          isDarkMode={isDarkMode}
        />
      )}

      {calibrationTarget && (
        <CalibrationModal
          isOpen={Boolean(calibrationTarget)}
          onClose={() => setCalibrationTarget(null)}
          component={calibrationTarget}
          onComponentRecommissioned={() => setCalibrationTarget(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {isAddAgentOpen && (
        <AddSpecializedAgentModal
          isOpen={isAddAgentOpen}
          onClose={() => setIsAddAgentOpen(false)}
          onAgentCreated={() => setIsAddAgentOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {isAddPillarOpen && (
        <AddPillarItemModal
          isOpen={isAddPillarOpen}
          onClose={() => setIsAddPillarOpen(false)}
          category={selectedCategoryId}
          categoryLabel={selectedCategory.label}
          onItemCreated={() => setIsAddPillarOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </ScreenScaffold>
  );
}

