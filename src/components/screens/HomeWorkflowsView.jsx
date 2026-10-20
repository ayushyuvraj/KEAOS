import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Copy, 
  Trash2, 
  Edit3, 
  Download, 
  Upload, 
  Star, 
  Clock, 
  SlidersHorizontal, 
  ArrowUpDown,
  Sparkles, 
  AlertTriangle, 
  X, 
  Check, 
  Lock,
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  loadAllWorkflows, 
  saveWorkflow, 
  createWorkflow, 
  duplicateWorkflow, 
  deleteWorkflow, 
  updateWorkflowMetadata, 
  exportWorkflowAsJson, 
  importWorkflowFromJson,
  getActiveWorkflowId
} from '../../utils/workflowStorage';
import { FRAMEWORKS } from '../../constants/frameworks';

export default function HomeWorkflowsView({
  activeUseCase,
  onOpenWorkflow,
  onCreateBlankWorkflow,
  isDarkMode = true
}) {
  const [workflows, setWorkflows] = useState(() => loadAllWorkflows());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrameworkFilter, setSelectedFrameworkFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updated'); // 'updated' | 'alpha' | 'nodes' | 'created'
  
  // Persistent view style (Grid / List) — holds true until manually changed
  const [viewStyle, setViewStyle] = useState(() => {
    try {
      return localStorage.getItem('keaos_workflows_view_style') || 'grid';
    } catch {
      return 'grid';
    }
  });

  // Windows Explorer style card sizing (Small | Medium | Large) — holds true until manually changed
  const [cardSize, setCardSize] = useState(() => {
    try {
      return localStorage.getItem('keaos_workflows_card_size') || 'medium';
    } catch {
      return 'medium';
    }
  });

  // Popover states for separate Filter & Sort buttons
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);

  // Popover container refs for click-outside detection
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const sizeRef = useRef(null);

  // Modal states
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  const fileInputRef = useRef(null);
  const activeWorkflowId = useMemo(() => getActiveWorkflowId(), [workflows]);

  // Synchronize workflows registry when activeUseCase changes or when workspace syncs
  useEffect(() => {
    setWorkflows(loadAllWorkflows());
  }, [activeUseCase]);

  useEffect(() => {
    const handleUpdate = () => {
      setWorkflows(loadAllWorkflows());
    };
    window.addEventListener('keaos:workspace-synced', handleUpdate);
    window.addEventListener('keaos:workspace-changed', handleUpdate);
    return () => {
      window.removeEventListener('keaos:workspace-synced', handleUpdate);
      window.removeEventListener('keaos:workspace-changed', handleUpdate);
    };
  }, []);

  // Click outside listener for all popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
      if (sizeRef.current && !sizeRef.current.contains(e.target)) {
        setIsSizeOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
        setIsSortOpen(false);
        setIsSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const reloadWorkflows = () => {
    setWorkflows(loadAllWorkflows());
  };

  // Persistent state handlers
  const handleSetViewStyle = (style) => {
    setViewStyle(style);
    try {
      localStorage.setItem('keaos_workflows_view_style', style);
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSetCardSize = (size) => {
    setCardSize(size);
    try {
      localStorage.setItem('keaos_workflows_card_size', size);
    } catch (err) {
      console.warn(err);
    }
  };

  // Filter and sort workflows
  const filteredWorkflows = useMemo(() => {
    let result = [...workflows];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((w) => 
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        (w.framework?.name && w.framework.name.toLowerCase().includes(q)) ||
        (w.tags && w.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Framework filter
    if (selectedFrameworkFilter !== 'all') {
      result = result.filter((w) => w.framework?.id === selectedFrameworkFilter);
    }

    // Sort order
    result.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;

      if (sortBy === 'alpha') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'nodes') {
        return (b.nodes?.length || 0) - (a.nodes?.length || 0);
      }
      if (sortBy === 'created') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    return result;
  }, [workflows, searchQuery, selectedFrameworkFilter, sortBy]);

  // Handle Create Blank Workflow
  const handleCreateNew = () => {
    const newWf = createWorkflow({
      name: 'Untitled Workflow',
      description: 'Pristine blank canvas. Connect models, skills, tools, and gateways.',
      framework: FRAMEWORKS[0],
      isBlank: true,
      nodes: [],
      edges: []
    });
    reloadWorkflows();
    showToast('Created new blank workflow');
    if (onCreateBlankWorkflow) {
      onCreateBlankWorkflow(newWf);
    } else if (onOpenWorkflow) {
      onOpenWorkflow(newWf);
    }
  };

  // Handle Duplicate
  const handleDuplicate = (id, e) => {
    e?.stopPropagation();
    const cloned = duplicateWorkflow(id);
    if (cloned) {
      reloadWorkflows();
      showToast(`Duplicated as "${cloned.name}"`);
    }
  };

  // Handle Delete with Strict Locked Immunity
  const handleDelete = (id, e) => {
    e?.stopPropagation();
    const target = workflows.find((w) => w.id === id);
    if (target && (target.isLocked || target.isWorkflowLocked)) {
      showToast(`Locked workflow "${target.name}" cannot be deleted.`);
      setDeleteConfirmId(null);
      return;
    }
    const res = deleteWorkflow(id);
    if (!res.success) {
      showToast(res.reason || 'Could not delete workflow');
    } else {
      reloadWorkflows();
      showToast('Workflow deleted');
      setDeleteConfirmId(null);
    }
  };

  // Handle Star Toggle
  const handleToggleStar = (id, currentStar, e) => {
    e?.stopPropagation();
    updateWorkflowMetadata(id, { isStarred: !currentStar });
    reloadWorkflows();
  };

  // Handle Export
  const handleExport = (wf, e) => {
    e?.stopPropagation();
    exportWorkflowAsJson(wf);
    showToast(`Exported "${wf.name}.keaos.json"`);
  };

  // Handle Import
  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const res = importWorkflowFromJson(content);
        if (res.success) {
          reloadWorkflows();
          showToast(`Imported "${res.workflow.name}"`);
          if (onOpenWorkflow) onOpenWorkflow(res.workflow);
        } else {
          showToast(`Import failed: ${res.error}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Format relative timestamp quietly
  const formatTime = (ts) => {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  // Sort label helper
  const sortLabels = {
    updated: 'Recently modified',
    alpha: 'Name (A–Z)',
    nodes: 'Complexity',
    created: 'Date created'
  };

  // Size grid class mapper
  const gridColumnsClass = useMemo(() => {
    if (cardSize === 'small') {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
    }
    if (cardSize === 'large') {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
    }
    // Default medium
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
  }, [cardSize]);

  const activeFrameworkName = useMemo(() => {
    if (selectedFrameworkFilter === 'all') return null;
    return FRAMEWORKS.find(f => f.id === selectedFrameworkFilter)?.name || selectedFrameworkFilter;
  }, [selectedFrameworkFilter]);

  return (
    <div className={`flex-1 h-full w-full overflow-hidden flex flex-col select-none transition-colors ${
      isDarkMode ? 'bg-[#0F1015] text-slate-100' : 'bg-[#F8F9FA] text-[#0B0F19]'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2 px-3.5 py-1.5 bg-[#001E50] border border-[#0091DA]/60 text-white text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-[#0091DA]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Google-Style Minimal Screen Header */}
      <div className={`px-6 py-4 border-b shrink-0 flex items-center justify-between transition-colors ${
        isDarkMode ? 'bg-[#14151B] border-[#22242D]' : 'bg-white border-[#E5E7EB]'
      }`}>
        <div className="flex items-center gap-3">
          <h1 className={`text-base font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
            Workflows
          </h1>
          <span className={`text-[11px] font-mono px-2 py-0.5 border ${
            isDarkMode ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            {workflows.length}
          </span>
        </div>

        {/* Primary Actions (Import & New Workflow) */}
        <div className="flex items-center gap-2.5">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".json" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-1.5 text-xs font-medium border transition-all active:scale-[0.98] flex items-center gap-1.5 ${
              isDarkMode 
                ? 'border-[#2E313D] text-slate-300 hover:text-white hover:bg-white/5' 
                : 'border-[#D1D5DB] text-slate-700 hover:text-black hover:bg-slate-100'
            }`}
            title="Import workflow from .keaos.json"
          >
            <Upload className="w-3.5 h-3.5 opacity-70" />
            <span>Import</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#0091DA]/40 shadow-sm flex items-center gap-1.5 transition-all active:scale-[0.98]"
            title="Create new blank workflow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New workflow</span>
          </button>
        </div>
      </div>

      {/* Google-Style Minimal Toolbar: Unified Search, Separate Filter, Separate Sort, Size & View */}
      <div className={`px-6 py-2.5 border-b shrink-0 flex items-center justify-between gap-3 ${
        isDarkMode ? 'bg-[#101117] border-[#1E2028]' : 'bg-[#FAFAFA] border-[#EBEBEB]'
      }`}>
        {/* Left: Search Bar + Separate Filter Button + Separate Sort Button */}
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          {/* Prominent Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows..."
              className={`w-full pl-8 pr-7 py-1.5 text-xs border transition-all outline-none ${
                isDarkMode 
                  ? 'bg-[#181921] border-[#2B2D38] text-white placeholder-slate-500 focus:border-[#0091DA]' 
                  : 'bg-white border-[#D1D5DB] text-black placeholder-slate-400 focus:border-[#00338D]'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dedicated Filter Button with Anchored Popover */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                setIsSortOpen(false);
                setIsSizeOpen(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                selectedFrameworkFilter !== 'all'
                  ? 'bg-[#00338D] text-white border-[#0091DA]'
                  : isDarkMode
                    ? 'bg-[#181921] border-[#2B2D38] text-slate-300 hover:text-white hover:border-slate-500'
                    : 'bg-white border-[#D1D5DB] text-slate-700 hover:text-black hover:border-slate-400'
              }`}
              title="Filter by SDK Framework"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 opacity-80" />
              <span>{activeFrameworkName ? `Filter: ${activeFrameworkName}` : 'Filter'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Filter Dropdown Popover */}
            {isFilterOpen && (
              <div className={`absolute left-0 mt-1.5 w-56 border shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
                isDarkMode ? 'bg-[#181921] border-[#2E313D] text-slate-200' : 'bg-white border-[#E0E0E0] text-slate-800'
              }`}>
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
                  SDK Framework
                </div>
                <button
                  onClick={() => {
                    setSelectedFrameworkFilter('all');
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                    selectedFrameworkFilter === 'all'
                      ? isDarkMode ? 'bg-[#00338D]/30 text-[#0091DA] font-semibold' : 'bg-blue-50 text-[#00338D] font-semibold'
                      : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>All SDKs</span>
                  {selectedFrameworkFilter === 'all' && <Check className="w-3.5 h-3.5 text-[#0091DA]" />}
                </button>
                {FRAMEWORKS.map((fw) => {
                  const isSelected = selectedFrameworkFilter === fw.id;
                  const count = workflows.filter(w => w.framework?.id === fw.id).length;
                  return (
                    <button
                      key={fw.id}
                      onClick={() => {
                        setSelectedFrameworkFilter(fw.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? isDarkMode ? 'bg-[#00338D]/30 text-[#0091DA] font-semibold' : 'bg-blue-50 text-[#00338D] font-semibold'
                          : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{fw.name}</span>
                        {count > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">({count})</span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0091DA] shrink-0" />}
                    </button>
                  );
                })}
                {selectedFrameworkFilter !== 'all' && (
                  <div className="mt-1 pt-1 border-t border-white/10 px-2">
                    <button
                      onClick={() => {
                        setSelectedFrameworkFilter('all');
                        setIsFilterOpen(false);
                      }}
                      className="w-full text-center py-1 text-[11px] text-red-400 hover:text-red-300 font-medium"
                    >
                      Reset filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dedicated Sort Button with Anchored Popover */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => {
                setIsSortOpen(!isSortOpen);
                setIsFilterOpen(false);
                setIsSizeOpen(false);
              }}
              className={`px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                isDarkMode 
                  ? 'bg-[#181921] border-[#2B2D38] text-slate-300 hover:text-white hover:border-slate-500' 
                  : 'bg-white border-[#D1D5DB] text-slate-700 hover:text-black hover:border-slate-400'
              }`}
              title="Sort Workflows"
            >
              <ArrowUpDown className="w-3.5 h-3.5 opacity-80" />
              <span>{sortLabels[sortBy] || 'Sort'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Sort Dropdown Popover */}
            {isSortOpen && (
              <div className={`absolute left-0 mt-1.5 w-48 border shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
                isDarkMode ? 'bg-[#181921] border-[#2E313D] text-slate-200' : 'bg-white border-[#E0E0E0] text-slate-800'
              }`}>
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
                  Sort Order
                </div>
                {[
                  { id: 'updated', label: 'Recently modified' },
                  { id: 'alpha', label: 'Name (A–Z)' },
                  { id: 'nodes', label: 'Complexity (Nodes)' },
                  { id: 'created', label: 'Date created' }
                ].map((opt) => {
                  const isSelected = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSortBy(opt.id);
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? isDarkMode ? 'bg-[#00338D]/30 text-[#0091DA] font-semibold' : 'bg-blue-50 text-[#00338D] font-semibold'
                          : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0091DA]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Windows Explorer Sizing & Persistent Grid/List View Toggles */}
        <div className="flex items-center gap-2">
          {/* Windows Explorer Style Sizing Selector (Small, Medium, Large) */}
          <div className="flex items-center border border-white/10 p-0.5">
            <button
              onClick={() => handleSetCardSize('small')}
              className={`px-2 py-1 text-[11px] font-mono font-medium transition-all ${
                cardSize === 'small'
                  ? 'bg-[#00338D] text-white'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Compact / Small tiles (Windows Explorer Small Icons)"
            >
              S
            </button>
            <button
              onClick={() => handleSetCardSize('medium')}
              className={`px-2 py-1 text-[11px] font-mono font-medium transition-all ${
                cardSize === 'medium'
                  ? 'bg-[#00338D] text-white'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Medium / Standard cards (Windows Explorer Medium Icons)"
            >
              M
            </button>
            <button
              onClick={() => handleSetCardSize('large')}
              className={`px-2 py-1 text-[11px] font-mono font-medium transition-all ${
                cardSize === 'large'
                  ? 'bg-[#00338D] text-white'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Large / Detailed cards (Windows Explorer Large Icons)"
            >
              L
            </button>
          </div>

          {/* Grid / List View Toggle (State Holds True Indefinitely) */}
          <div className="flex items-center border border-white/10 p-0.5">
            <button
              onClick={() => handleSetViewStyle('grid')}
              className={`p-1 transition-all ${
                viewStyle === 'grid'
                  ? 'bg-[#00338D] text-white'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Grid View (Holds selection until manually changed)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewStyle('list')}
              className={`p-1 transition-all ${
                viewStyle === 'list'
                  ? 'bg-[#00338D] text-white'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="List View (Holds selection until manually changed)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspaces Content Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredWorkflows.length === 0 ? (
          /* Clean Google-Style Empty State */
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
            <h3 className="text-sm font-semibold text-slate-300">No workflows found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              No topologies match your current search or filter query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFrameworkFilter('all');
              }}
              className="mt-3 text-xs text-[#0091DA] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : viewStyle === 'grid' ? (
          /* GRID VIEW */
          <div className={`grid ${gridColumnsClass}`}>
            {/* New Blank Workflow Tile */}
            <div
              onClick={handleCreateNew}
              className={`group border border-dashed cursor-pointer transition-all duration-150 flex flex-col items-center justify-center text-center ${
                cardSize === 'small' ? 'min-h-[110px] p-3' : cardSize === 'large' ? 'min-h-[220px] p-6' : 'min-h-[160px] p-4'
              } ${
                isDarkMode 
                  ? 'border-[#2E313D] hover:border-[#0091DA] bg-white/[0.01] hover:bg-white/[0.03]' 
                  : 'border-[#CBD5E1] hover:border-[#00338D] bg-white hover:bg-slate-50/80 shadow-sm'
              }`}
            >
              <div className={`rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                cardSize === 'small' ? 'w-7 h-7 mb-1.5' : 'w-9 h-9 mb-2.5'
              } ${
                isDarkMode ? 'bg-white/5 text-[#0091DA]' : 'bg-blue-50 text-[#00338D]'
              }`}>
                <Plus className={cardSize === 'small' ? 'w-4 h-4' : 'w-5 h-5'} />
              </div>
              <span className={`font-semibold tracking-tight ${cardSize === 'small' ? 'text-xs' : 'text-sm'} ${
                isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-black'
              }`}>
                New Workflow
              </span>
              {cardSize !== 'small' && (
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Start with a clean canvas
                </span>
              )}
            </div>

            {/* Workflow Cards */}
            {filteredWorkflows.map((wf) => {
              const isActive = wf.id === activeWorkflowId;
              const isLocked = Boolean(wf.isLocked ?? wf.isWorkflowLocked);
              const nodeCount = wf.nodes?.length || 0;
              const edgeCount = wf.edges?.length || 0;

              return (
                <div
                  key={wf.id}
                  onClick={() => onOpenWorkflow && onOpenWorkflow(wf)}
                  className={`group relative border transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                    cardSize === 'small' ? 'p-3 min-h-[110px]' : cardSize === 'large' ? 'p-5 min-h-[220px]' : 'p-4 min-h-[160px]'
                  } ${
                    isActive
                      ? isDarkMode 
                        ? 'border-[#0091DA] bg-[#161722] shadow-md shadow-[#0091DA]/5' 
                        : 'border-[#00338D] bg-blue-50/20 shadow-md ring-1 ring-[#00338D]/20'
                      : isDarkMode
                        ? 'border-[#252834] bg-[#14151C] hover:border-slate-500 hover:bg-[#181922]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#CBD5E1] hover:shadow-md'
                  }`}
                >
                  {/* Card Top: Framework, Status Badges & Star */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Framework Tag */}
                        <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 border ${
                          isDarkMode 
                            ? 'bg-white/5 border-white/10 text-slate-300' 
                            : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {wf.framework?.name || 'Google ADK'}
                        </span>

                        {/* Active Badge */}
                        {isActive && (
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            ACTIVE
                          </span>
                        )}

                        {/* Locked Badge */}
                        {isLocked && (
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 bg-blue-500/15 border border-blue-500/30 text-[#0091DA] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            LOCKED
                          </span>
                        )}
                      </div>

                      {/* Star Icon */}
                      <button
                        onClick={(e) => handleToggleStar(wf.id, wf.isStarred, e)}
                        className={`p-1 transition-colors ${
                          wf.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300 opacity-60 group-hover:opacity-100'
                        }`}
                        title={wf.isStarred ? 'Unstar' : 'Star workflow'}
                      >
                        <Star className={`w-3.5 h-3.5 ${wf.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Workflow Title */}
                    <h2 className={`font-semibold tracking-tight truncate ${
                      cardSize === 'small' ? 'text-xs' : cardSize === 'large' ? 'text-base mb-1' : 'text-sm mb-1'
                    } ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                      {wf.name}
                    </h2>

                    {/* Description snippet (Hidden in small mode for low cognitive load) */}
                    {cardSize !== 'small' && (
                      <p className={`text-slate-400 leading-relaxed ${
                        cardSize === 'large' ? 'text-xs line-clamp-2 mb-3' : 'text-[11px] line-clamp-1 mb-2'
                      }`}>
                        {wf.description || 'Enterprise agent workflow topology.'}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom: Quiet Metadata & Hover-Revealed Actions */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between mt-auto">
                    {/* Quiet Inline Metadata */}
                    <span className="text-[10px] text-slate-500 font-mono">
                      {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'} • {formatTime(wf.updatedAt)}
                    </span>

                    {/* Action Buttons: Quietly reveal on card hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWorkflow(wf);
                        }}
                        className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit details"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => handleDuplicate(wf.id, e)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => handleExport(wf, e)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Export JSON"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      {/* Locked Workflow Deletion Immunity */}
                      {isLocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast(`"${wf.name}" is locked. Unlock it before deleting.`);
                          }}
                          className="p-1 text-slate-500 cursor-not-allowed opacity-50"
                          title="Workflow is locked and cannot be deleted"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(wf.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST / TABLE VIEW */
          <div className={`border overflow-hidden ${
            isDarkMode ? 'bg-[#14151C] border-[#252834]' : 'bg-white border-[#E5E7EB]'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-mono uppercase tracking-wider text-slate-400 ${
                  isDarkMode ? 'bg-[#101117] border-[#252834]' : 'bg-slate-50 border-[#E5E7EB]'
                }`}>
                  <th className="py-2 px-3 w-8">★</th>
                  <th className="py-2 px-4">Workflow</th>
                  <th className="py-2 px-4">SDK</th>
                  <th className="py-2 px-4">Nodes</th>
                  <th className="py-2 px-4">Modified</th>
                  <th className="py-2 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#22242D]' : 'divide-slate-100'}`}>
                {filteredWorkflows.map((wf) => {
                  const isActive = wf.id === activeWorkflowId;
                  const isLocked = Boolean(wf.isLocked ?? wf.isWorkflowLocked);
                  const nodeCount = wf.nodes?.length || 0;

                  const rowPaddingClass = cardSize === 'small' ? 'py-2 px-4' : cardSize === 'large' ? 'py-4 px-4' : 'py-3 px-4';

                  return (
                    <tr
                      key={wf.id}
                      onClick={() => onOpenWorkflow && onOpenWorkflow(wf)}
                      className={`group cursor-pointer transition-colors ${
                        isActive
                          ? isDarkMode ? 'bg-[#191D2A]' : 'bg-blue-50/50'
                          : isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <button
                          onClick={(e) => handleToggleStar(wf.id, wf.isStarred, e)}
                          className={`p-1 transition-colors ${
                            wf.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${wf.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>
                      <td className={rowPaddingClass}>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            {wf.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              ACTIVE
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-500/15 text-[#0091DA] border border-[#0091DA]/30 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />
                              LOCKED
                            </span>
                          )}
                        </div>
                        {cardSize !== 'small' && wf.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {wf.description}
                          </p>
                        )}
                      </td>
                      <td className={`${rowPaddingClass} font-mono text-[11px] text-slate-400`}>
                        {wf.framework?.name || 'Google ADK'}
                      </td>
                      <td className={`${rowPaddingClass} font-mono text-[11px] text-slate-400`}>
                        {nodeCount}
                      </td>
                      <td className={`${rowPaddingClass} font-mono text-[11px] text-slate-400`}>
                        {formatTime(wf.updatedAt)}
                      </td>
                      <td className={`${rowPaddingClass} text-right`}>
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorkflow(wf);
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(wf.id, e)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleExport(wf, e)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="Export"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {isLocked ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showToast(`"${wf.name}" is locked. Unlock it before deleting.`);
                              }}
                              className="p-1 text-slate-500 cursor-not-allowed opacity-50"
                              title="Workflow is locked and cannot be deleted"
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(wf.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* RENAME / EDIT WORKFLOW MODAL */}
      {editingWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className={`w-full max-w-lg border shadow-2xl p-6 ${
            isDarkMode ? 'bg-[#181921] border-[#2E313D] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="text-sm font-bold">Edit Workflow Specifications</h3>
              <button 
                onClick={() => setEditingWorkflow(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  className={`w-full px-3 py-1.5 text-xs border outline-none ${
                    isDarkMode ? 'bg-[#101117] border-[#2E313D] text-white' : 'bg-slate-50 border-[#CBD5E1] text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingWorkflow.description || ''}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                  className={`w-full px-3 py-1.5 text-xs border outline-none ${
                    isDarkMode ? 'bg-[#101117] border-[#2E313D] text-white' : 'bg-slate-50 border-[#CBD5E1] text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                  Multi-Agent SDK
                </label>
                <select
                  value={editingWorkflow.framework?.id || 'google-adk'}
                  onChange={(e) => {
                    const fw = FRAMEWORKS.find((f) => f.id === e.target.value) || FRAMEWORKS[0];
                    setEditingWorkflow({ ...editingWorkflow, framework: fw });
                  }}
                  className={`w-full px-3 py-1.5 text-xs border outline-none ${
                    isDarkMode ? 'bg-[#101117] border-[#2E313D] text-white' : 'bg-slate-50 border-[#CBD5E1] text-black'
                  }`}
                >
                  {FRAMEWORKS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.subtitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingWorkflow(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateWorkflowMetadata(editingWorkflow.id, {
                      name: editingWorkflow.name,
                      description: editingWorkflow.description,
                      framework: editingWorkflow.framework
                    });
                    reloadWorkflows();
                    setEditingWorkflow(null);
                    showToast('Workflow updated successfully');
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#0091DA]/50 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION SAFEGUARD MODAL WITH STRICT LOCKED IMMUNITY */}
      {deleteConfirmId && (() => {
        const targetToDelete = workflows.find((w) => w.id === deleteConfirmId);
        const isLocked = Boolean(targetToDelete?.isLocked ?? targetToDelete?.isWorkflowLocked);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
            <div className={`w-full max-w-sm border shadow-2xl p-6 ${
              isDarkMode ? 'bg-[#181921] border-[#2E313D] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {isLocked ? (
                  <Lock className="w-5 h-5 shrink-0 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                )}
                <h3 className={`text-sm font-bold ${isLocked ? 'text-amber-400' : 'text-red-400'}`}>
                  {isLocked ? 'Workflow Is Locked' : 'Delete Workflow?'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {isLocked
                  ? `"${targetToDelete?.name || 'This workflow'}" is locked against deletion. Open and unlock the workflow on the canvas if you intend to permit deletion.`
                  : 'Are you sure you want to delete this workflow? This action permanently removes this visual graph topology from your local repository.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  {isLocked ? 'Close' : 'Cancel'}
                </button>
                {!isLocked && (
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  >
                    Delete Workflow
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
