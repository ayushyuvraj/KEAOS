import React, { useState, useMemo } from 'react';
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
  Type
} from 'lucide-react';
import { PILLARS } from '../constants/pillars';

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
    subtitle: 'Google GenAI, Anthropic Claude, OpenAI, Ollama Local & OpenRouter',
    icon: Cpu,
    color: '#00338D', // Royal Blue
    bgColor: '#E6EDF7',
    badge: 'FOUNDATION MODEL',
    socketId: 'model-in',
    items: PILLARS.model?.items || []
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

  const activeCategory = useMemo(() => {
    return NODE_CATEGORIES.find(c => c.id === activeCategoryId) || null;
  }, [activeCategoryId]);

  // Global search filtering across categories and sub-items
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase().trim();

    const matches = [];
    NODE_CATEGORIES.forEach(category => {
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
  }, [searchQuery]);

  const handleSelectCategory = (categoryId) => {
    setActiveCategoryId(categoryId);
    setSearchQuery('');
  };

  const handleBackToCategories = () => {
    setActiveCategoryId(null);
    setSearchQuery('');
  };

  const handleItemAdd = (categoryId, item) => {
    if (onAddNode) {
      onAddNode(categoryId, item);
      setAddedItemId(item.id);
      setTimeout(() => setAddedItemId(null), 1400);
    }
  };

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
                onClick={handleBackToCategories}
                className={`btn-tactile flex items-center gap-1.5 text-xs font-mono font-bold transition-colors ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-white' 
                    : 'text-slate-600 hover:text-[#00338D]'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Categories</span>
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
                <activeCategory.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 truncate">
                <h3 className="text-sm font-bold tracking-tight truncate">
                  {activeCategory.label}
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeCategory.items.length} {activeCategory.items.length === 1 ? 'component' : 'components'} available
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
                <h3 className="text-sm font-bold tracking-tight">
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

        {/* Search Input */}
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
            autoFocus
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
                    <category.icon className="w-3 h-3" style={{ color: category.color }} />
                    <span>{category.label}</span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemAdd(category.id, item)}
                        className={`p-3 border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isDarkMode 
                            ? 'bg-[#1E2028] border-[#2D313D] hover:border-[#0091DA] hover:bg-[#252833]' 
                            : 'bg-white border-[#E2E8F0] hover:border-[#00338D] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-[#0B0F19] dark:text-white truncate">
                            {item.name}
                          </h5>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleItemAdd(category.id, item);
                          }}
                          className={`btn-tactile w-7 h-7 flex items-center justify-center shrink-0 border transition-all ${
                            addedItemId === item.id
                              ? 'bg-[#009A44] text-white border-[#009A44]'
                              : 'bg-[#00338D] hover:bg-[#005EB8] text-white border-[#001E50]'
                          }`}
                          title="Add to Canvas"
                        >
                          {addedItemId === item.id ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
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
          <div className="p-3 space-y-2">
            {activeCategory.items
              .filter(item => !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(item => {
                let ItemIcon = activeCategory.icon;
                if (item.id === 'tool-audio-transcribe') ItemIcon = Mic;
                if (item.id === 'tool-doc-parser') ItemIcon = FileText;
                if (item.id === 'tool-text-box-ingest') ItemIcon = Type;

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
                        <h5 className="text-xs font-bold text-[#0B0F19] dark:text-white truncate">
                          {item.name}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
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
                      </div>
                    </div>

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
                );
              })}
          </div>
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
                        <h4 className="text-xs font-bold text-[#0B0F19] dark:text-white tracking-tight">
                          {category.label}
                        </h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-black/10 dark:bg-white/10 text-slate-500 rounded font-bold">
                          {category.items.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {category.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* FOOTER: Architecture Info                                    */}
      {/* ============================================================ */}
      <div className={`p-3 border-t text-[10px] font-mono text-slate-400 flex items-center justify-between shrink-0 ${
        isDarkMode ? 'bg-[#14151B] border-[#2D313D]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
      }`}>
        <span>8 VISUAL PILLARS</span>
        <span>AUDIT & COST: INHERENT</span>
      </div>
    </aside>
  );
}
