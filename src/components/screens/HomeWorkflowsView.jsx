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
  getActiveWorkflowId,
  isWorkflowNameTaken,
  getNextUniqueWorkflowName
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
    const uniqueName = getNextUniqueWorkflowName('Untitled Workflow', null, workflows);
    const newWf = createWorkflow({
      name: uniqueName,
      description: '',
      framework: FRAMEWORKS[0],
      isBlank: true,
      nodes: [],
      edges: []
    });
    reloadWorkflows();
    showToast(`Created new blank workflow: "${uniqueName}"`);
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

  // Dynamic grid column setup based on user's card size selection
  const gridColumnsClass = useMemo(() => {
    if (cardSize === 'small') {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5';
    }
    if (cardSize === 'large') {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
    }
    // Default medium
    return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5';
  }, [cardSize]);

  const activeFrameworkName = useMemo(() => {
    if (selectedFrameworkFilter === 'all') return null;
    return FRAMEWORKS.find(f => f.id === selectedFrameworkFilter)?.name || selectedFrameworkFilter;
  }, [selectedFrameworkFilter]);

  // Framework badge color helper mapped strictly to the 5-Color Pentagon Palette
  const getFrameworkBadgeStyle = (fwName = '') => {
    const fLower = fwName.toLowerCase();
    if (fLower.includes('langgraph') || fLower.includes('langchain')) {
      return isDarkMode
        ? 'bg-[#1E49E2]/15 text-[#1E49E2] border-[#1E49E2]/35'
        : 'bg-[#1E49E2]/10 text-[#1E49E2] border-[#1E49E2]/25';
    }
    if (fLower.includes('crewai')) {
      return isDarkMode
        ? 'bg-[#FD349C]/15 text-[#FD349C] border-[#FD349C]/35'
        : 'bg-[#FD349C]/10 text-[#FD349C] border-[#FD349C]/25';
    }
    if (fLower.includes('openai') || fLower.includes('swarm')) {
      return isDarkMode
        ? 'bg-[#7213EA]/20 text-purple-300 border-[#7213EA]/35'
        : 'bg-[#7213EA]/10 text-[#7213EA] border-[#7213EA]/25';
    }
    // Default Google ADK / Microsoft ADK
    return isDarkMode
      ? 'bg-[#00338D]/25 text-[#00B8F5] border-[#00B8F5]/30'
      : 'bg-[#00338D]/10 text-[#00338D] border-[#00338D]/20';
  };

  return (
    <div className={`flex-1 h-full w-full overflow-hidden flex flex-col select-none transition-colors duration-200 ${
      isDarkMode ? 'bg-[#070A12] text-slate-100' : 'bg-[#EDF2F7] text-[#001E50]'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2.5 px-4 py-2 bg-[#00338D] border border-[#00B8F5]/50 text-white text-xs font-mono rounded-2xl shadow-[0_12px_32px_rgba(0,51,141,0.4)] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-xl">
          <Sparkles className="w-4 h-4 text-[#00B8F5]" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Soft Neo-Modernist Screen Header */}
      <div className={`px-6 py-4 border-b shrink-0 flex items-center justify-between transition-colors backdrop-blur-xl ${
        isDarkMode ? 'bg-[#080E1C]/80 border-white/[0.08]' : 'bg-white/85 border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <h1 className={`text-base font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#001E50]'}`}>
            Workflows
          </h1>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
            isDarkMode 
              ? 'bg-[#00B8F5]/15 text-[#00B8F5] border-[#00B8F5]/30' 
              : 'bg-[#00338D]/10 text-[#00338D] border-[#00338D]/20'
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
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-2xl border transition-all duration-150 active:scale-95 flex items-center gap-1.5 shadow-xs ${
              isDarkMode 
                ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5' 
                : 'bg-white border-slate-200 text-slate-700 hover:text-[#001E50] hover:bg-slate-50'
            }`}
            title="Import workflow from .keaos.json"
          >
            <Upload className="w-3.5 h-3.5 opacity-70" />
            <span>Import</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="px-4 py-1.5 text-xs font-bold rounded-2xl bg-[#00338D] hover:bg-[#1E49E2] text-white border border-[#1E49E2]/40 shadow-[0_4px_14px_rgba(0,51,141,0.3)] flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer"
            title="Create new blank workflow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New workflow</span>
          </button>
        </div>
      </div>

      {/* Minimal Control Toolbar: Search, Filter, Sort, Size & View */}
      <div className={`px-6 py-2.5 border-b shrink-0 flex items-center justify-between gap-3 backdrop-blur-lg ${
        isDarkMode ? 'bg-[#080E1C]/60 border-white/[0.06]' : 'bg-white/60 border-slate-200/60'
      }`}>
        {/* Left: Search Bar + Filter Popover + Sort Popover */}
        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
          {/* Prominent Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows..."
              className={`w-full pl-9 pr-7 py-2 text-xs rounded-xl border transition-all outline-none ${
                isDarkMode 
                  ? 'bg-[#040813]/90 border-white/[0.08] text-white placeholder-slate-500 focus:border-[#00B8F5] focus:ring-2 focus:ring-[#00B8F5]/30' 
                  : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-[#00338D] focus:ring-2 focus:ring-[#00338D]/20 shadow-xs'
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
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                selectedFrameworkFilter !== 'all'
                  ? 'bg-[#00338D] text-white border-[#00B8F5]'
                  : isDarkMode
                    ? 'bg-[#040813]/90 border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-[#001E50] hover:border-slate-300'
              }`}
              title="Filter by SDK Framework"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 opacity-80 text-[#00B8F5]" />
              <span>{activeFrameworkName ? `Filter: ${activeFrameworkName}` : 'Filter'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Filter Dropdown Popover */}
            {isFilterOpen && (
              <div className={`absolute left-0 mt-2 w-56 rounded-2xl border shadow-2xl z-50 p-1.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
                isDarkMode ? 'bg-[#080E1C]/95 border-white/10 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
              }`}>
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1 font-bold">
                  SDK Framework
                </div>
                <button
                  onClick={() => {
                    setSelectedFrameworkFilter('all');
                    setIsFilterOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-xs text-left rounded-lg flex items-center justify-between transition-colors ${
                    selectedFrameworkFilter === 'all'
                      ? isDarkMode ? 'bg-[#00338D]/30 text-[#00B8F5] font-semibold' : 'bg-blue-50 text-[#00338D] font-semibold'
                      : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>All SDKs</span>
                  {selectedFrameworkFilter === 'all' && <Check className="w-3.5 h-3.5 text-[#00B8F5]" />}
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
                      className={`w-full px-3 py-1.5 text-xs text-left rounded-lg flex items-center justify-between transition-colors ${
                        isSelected
                          ? isDarkMode ? 'bg-[#00338D]/30 text-[#00B8F5] font-semibold' : 'bg-blue-50 text-[#00338D] font-semibold'
                          : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{fw.name}</span>
                        {count > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00B8F5] shrink-0" />}
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
                      className="w-full text-center py-1 text-[11px] text-[#FD349C] hover:underline font-semibold"
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
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                isDarkMode 
                  ? 'bg-[#040813]/90 border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20' 
                  : 'bg-white border-slate-200 text-slate-700 hover:text-[#001E50] hover:border-slate-300'
              }`}
              title="Sort Workflows"
            >
              <ArrowUpDown className="w-3.5 h-3.5 opacity-80 text-[#00B8F5]" />
              <span>{sortLabels[sortBy] || 'Sort'}</span>
              <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
            </button>

            {/* Sort Dropdown Popover */}
            {isSortOpen && (
              <div className={`absolute left-0 mt-2 w-48 rounded-2xl border shadow-2xl z-50 p-1.5 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
                isDarkMode ? 'bg-[#080E1C]/95 border-white/10 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
              }`}>
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1 font-bold">
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
                      className={`w-full px-3 py-1.5 text-xs text-left rounded-lg flex items-center justify-between transition-colors ${
                        isSelected
                          ? isDarkMode ? 'bg-[#00338D]/30 text-[#00B8F5] font-semibold' : 'bg-blue-50 text-[#00338D] font-semibold'
                          : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00B8F5]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: S/M/L Size Segment & Grid/List View Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Card Sizing Segment (Small, Medium, Large) */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDarkMode ? 'bg-[#040813]/90 border-white/[0.08]' : 'bg-slate-100/90 border-slate-200'
          }`}>
            {['small', 'medium', 'large'].map((size) => {
              const label = size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L';
              const isSelected = cardSize === size;
              return (
                <button
                  key={size}
                  onClick={() => handleSetCardSize(size)}
                  className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all ${
                    isSelected
                      ? 'bg-[#00338D] text-white shadow-xs'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                  }`}
                  title={`${size.toUpperCase()} card layout`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Grid / List View Toggle */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDarkMode ? 'bg-[#040813]/90 border-white/[0.08]' : 'bg-slate-100/90 border-slate-200'
          }`}>
            <button
              onClick={() => handleSetViewStyle('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewStyle === 'grid'
                  ? 'bg-[#00338D] text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSetViewStyle('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewStyle === 'list'
                  ? 'bg-[#00338D] text-white shadow-xs'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspaces Content Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredWorkflows.length === 0 ? (
          /* Clean Empty State */
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="w-9 h-9 text-slate-500 mb-2 opacity-40" />
            <h3 className="text-sm font-bold text-slate-300">No workflows found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              No topologies match your current search or filter query.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFrameworkFilter('all');
              }}
              className="mt-3 text-xs font-semibold text-[#00B8F5] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : viewStyle === 'grid' ? (
          /* GRID VIEW */
          <div className={`grid ${gridColumnsClass}`}>
            {/* New Blank Workflow Tile (Soft-Modern Dashed Squircle) */}
            <div
              onClick={handleCreateNew}
              className={`group rounded-[22px] border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center text-center backdrop-blur-xl ${
                cardSize === 'small' ? 'min-h-[120px] p-3' : cardSize === 'large' ? 'min-h-[220px] p-6' : 'min-h-[160px] p-4.5'
              } ${
                isDarkMode 
                  ? 'border-[#00B8F5]/30 hover:border-[#00B8F5] bg-white/[0.02] hover:bg-[#00B8F5]/[0.06] hover:shadow-[0_12px_32px_rgba(0,184,245,0.15)]' 
                  : 'border-[#00338D]/25 hover:border-[#00338D] bg-white/80 hover:bg-[#00338D]/[0.03] shadow-[0_10px_25px_rgba(0,51,141,0.05)]'
              }`}
            >
              <div className={`rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-xs ${
                cardSize === 'small' ? 'w-8 h-8 mb-1.5' : 'w-10 h-10 mb-2.5'
              } ${
                isDarkMode ? 'bg-[#00B8F5]/15 text-[#00B8F5] border border-[#00B8F5]/30' : 'bg-[#00338D]/10 text-[#00338D] border border-[#00338D]/20'
              }`}>
                <Plus className={cardSize === 'small' ? 'w-4 h-4' : 'w-5 h-5 stroke-[2.5]'} />
              </div>
              <span className={`font-bold tracking-tight ${cardSize === 'small' ? 'text-xs' : 'text-sm'} ${
                isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-[#001E50] group-hover:text-[#00338D]'
              }`}>
                New Workflow
              </span>
              {cardSize !== 'small' && (
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Start with a clean canvas
                </span>
              )}
            </div>

            {/* Workflow Cards (Soft-Modern Squircle Cards) */}
            {filteredWorkflows.map((wf) => {
              const isActive = wf.id === activeWorkflowId;
              const isLocked = Boolean(wf.isLocked ?? wf.isWorkflowLocked);
              const nodeCount = wf.nodes?.length || 0;
              const fwBadgeClass = getFrameworkBadgeStyle(wf.framework?.name);

              return (
                <div
                  key={wf.id}
                  onClick={() => onOpenWorkflow && onOpenWorkflow(wf)}
                  className={`group relative rounded-[22px] border transition-all duration-300 flex flex-col justify-between cursor-pointer backdrop-blur-xl ${
                    cardSize === 'small' ? 'p-3.5 min-h-[120px]' : cardSize === 'large' ? 'p-5 min-h-[220px]' : 'p-4 min-h-[160px]'
                  } ${
                    isActive
                      ? isDarkMode 
                        ? 'border-[#00B8F5]/60 bg-[#0A1224]/95 ring-2 ring-[#00B8F5] shadow-[0_0_26px_rgba(0,184,245,0.35),0_16px_40px_rgba(0,0,0,0.7)]' 
                        : 'border-[#00338D] bg-white ring-2 ring-[#00338D] shadow-[0_16px_36px_rgba(0,51,141,0.15)]'
                      : isDarkMode
                        ? 'border-white/[0.08] bg-[#080E1C]/92 hover:border-[#00B8F5]/50 hover:bg-[#0C1428] shadow-[0_16px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.1)] hover:scale-[1.01]'
                        : 'border-slate-200/90 bg-white/95 hover:border-[#00338D]/40 shadow-[0_14px_32px_rgba(0,51,141,0.06),0_2px_6px_rgba(0,0,0,0.02),inset_0_1px_1px_rgba(255,255,255,0.9)] hover:shadow-[0_20px_40px_rgba(0,51,141,0.12)] hover:scale-[1.01]'
                  }`}
                >
                  {/* Card Top: Framework, Status Badges & Star */}
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Framework Tag */}
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${fwBadgeClass}`}>
                          {wf.framework?.name || 'Google ADK'}
                        </span>

                        {/* Active Badge */}
                        {isActive && (
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00B8F5]/15 border border-[#00B8F5]/40 text-[#00B8F5] shadow-[0_0_8px_rgba(0,184,245,0.25)]">
                            ACTIVE
                          </span>
                        )}

                        {/* Locked Badge */}
                        {isLocked && (
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1E49E2]/15 border border-[#1E49E2]/35 text-[#1E49E2] flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            LOCKED
                          </span>
                        )}
                      </div>

                      {/* Star Icon */}
                      <button
                        onClick={(e) => handleToggleStar(wf.id, wf.isStarred, e)}
                        className={`p-1.5 rounded-full transition-transform active:scale-90 ${
                          wf.isStarred 
                            ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                            : 'text-slate-400 hover:text-amber-400 opacity-60 group-hover:opacity-100'
                        }`}
                        title={wf.isStarred ? 'Unstar' : 'Star workflow'}
                      >
                        <Star className={`w-3.5 h-3.5 ${wf.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Workflow Title */}
                    <h2 className={`font-bold tracking-tight truncate ${
                      cardSize === 'small' ? 'text-xs' : cardSize === 'large' ? 'text-base mb-1' : 'text-sm mb-1'
                    } ${isDarkMode ? 'text-white' : 'text-[#001E50]'}`}>
                      {wf.name}
                    </h2>

                    {/* Description snippet */}
                    {cardSize !== 'small' && (
                      <p className={`text-slate-400 leading-relaxed ${
                        cardSize === 'large' ? 'text-xs line-clamp-2 mb-3' : 'text-[11px] line-clamp-1 mb-2'
                      }`}>
                        {wf.description || 'Enterprise agent workflow topology.'}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom: Quiet Metadata & Hover-Revealed Actions */}
                  <div className={`pt-2.5 border-t flex items-center justify-between mt-auto transition-colors ${
                    isDarkMode ? 'border-white/[0.06]' : 'border-slate-100'
                  }`}>
                    {/* Quiet Inline Metadata */}
                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'} • {formatTime(wf.updatedAt)}
                    </span>

                    {/* Action Buttons Dock: Quietly reveals on card hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWorkflow(wf);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8F5] hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                        title="Edit details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDuplicate(wf.id, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8F5] hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleExport(wf, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8F5] hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                        title="Export JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Locked Workflow Deletion Immunity */}
                      {isLocked ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast(`"${wf.name}" is locked. Unlock it before deleting.`);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 cursor-not-allowed opacity-40"
                          title="Workflow is locked and cannot be deleted"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(wf.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#FD349C] hover:bg-[#FD349C]/10 transition-colors"
                          title="Delete workflow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST / TABLE VIEW (Soft Squircle Table Container) */
          <div className={`rounded-[22px] border overflow-hidden backdrop-blur-xl ${
            isDarkMode 
              ? 'bg-[#080E1C]/92 border-white/[0.08] shadow-[0_20px_45px_rgba(0,0,0,0.6)]' 
              : 'bg-white/95 border-slate-200/90 shadow-[0_16px_36px_rgba(0,51,141,0.06)]'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-mono uppercase tracking-wider text-slate-400 ${
                  isDarkMode ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <th className="py-2.5 px-3 w-8">★</th>
                  <th className="py-2.5 px-4 font-bold">Workflow</th>
                  <th className="py-2.5 px-4 font-bold">SDK</th>
                  <th className="py-2.5 px-4 font-bold">Nodes</th>
                  <th className="py-2.5 px-4 font-bold">Modified</th>
                  <th className="py-2.5 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-100'}`}>
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
                          ? isDarkMode ? 'bg-[#00338D]/20' : 'bg-blue-50/70'
                          : isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <button
                          onClick={(e) => handleToggleStar(wf.id, wf.isStarred, e)}
                          className={`p-1 rounded-full transition-colors ${
                            wf.isStarred ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${wf.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>
                      <td className={rowPaddingClass}>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#001E50]'}`}>
                            {wf.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00B8F5]/15 text-[#00B8F5] border border-[#00B8F5]/30">
                              ACTIVE
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1E49E2]/15 text-[#1E49E2] border border-[#1E49E2]/30 flex items-center gap-1">
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8F5] hover:bg-white/10 transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(wf.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8F5] hover:bg-white/10 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleExport(wf, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#00B8F5] hover:bg-white/10 transition-colors"
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
                              className="p-1.5 rounded-lg text-slate-500 cursor-not-allowed opacity-40"
                              title="Workflow is locked and cannot be deleted"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(wf.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#FD349C] hover:bg-[#FD349C]/10 transition-colors"
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

      {/* RENAME / EDIT WORKFLOW MODAL (Soft Squircle Modal) */}
      {editingWorkflow && (() => {
        const isEditDuplicate = isWorkflowNameTaken(editingWorkflow.name, editingWorkflow.id, workflows);
        const isEditNameEmpty = !editingWorkflow.name?.trim();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-[24px] border shadow-2xl p-6 backdrop-blur-2xl ${
              isDarkMode 
                ? 'bg-[#080E1C]/95 border-white/10 text-white shadow-[0_25px_60px_rgba(0,0,0,0.8)]' 
                : 'bg-white/98 border-slate-200 text-[#001E50] shadow-[0_25px_60px_rgba(0,51,141,0.18)]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#00B8F5]" />
                  <span>Edit Workflow Specifications</span>
                </h3>
                <button 
                  onClick={() => setEditingWorkflow(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono font-medium text-slate-400">
                      Workflow Name
                    </label>
                    {isEditDuplicate && (
                      <span className="text-[10px] font-mono font-bold text-[#FD349C] uppercase tracking-wider">
                        Name already taken
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editingWorkflow.name}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border outline-none transition-all ${
                      isEditDuplicate
                        ? 'border-[#FD349C] bg-[#FD349C]/10 text-[#FD349C] focus:border-[#FD349C]'
                        : isDarkMode 
                          ? 'bg-[#040813] border-white/10 text-white focus:border-[#00B8F5] focus:ring-2 focus:ring-[#00B8F5]/30' 
                          : 'bg-slate-50 border-slate-200 text-black focus:border-[#00338D] focus:ring-2 focus:ring-[#00338D]/20'
                    }`}
                  />
                  {isEditDuplicate && (
                    <p className="mt-1 text-[11px] font-mono text-[#FD349C] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Another workflow already uses this name (case-insensitive).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe what this workflow accomplishes..."
                    value={editingWorkflow.description || ''}
                    onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border outline-none resize-none transition-all ${
                      isDarkMode 
                        ? 'bg-[#040813] border-white/10 text-white focus:border-[#00B8F5] focus:ring-2 focus:ring-[#00B8F5]/30' 
                        : 'bg-slate-50 border-slate-200 text-black focus:border-[#00338D] focus:ring-2 focus:ring-[#00338D]/20'
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
                    className={`w-full px-3.5 py-2 text-xs rounded-xl border outline-none transition-all ${
                      isDarkMode 
                        ? 'bg-[#040813] border-white/10 text-white focus:border-[#00B8F5]' 
                        : 'bg-slate-50 border-slate-200 text-black focus:border-[#00338D]'
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
                    className="px-4 py-2 text-xs font-semibold rounded-2xl text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isEditDuplicate || isEditNameEmpty}
                    onClick={() => {
                      if (isEditDuplicate || isEditNameEmpty) return;
                      updateWorkflowMetadata(editingWorkflow.id, {
                        name: editingWorkflow.name.trim(),
                        description: editingWorkflow.description,
                        framework: editingWorkflow.framework
                      });
                      reloadWorkflows();
                      setEditingWorkflow(null);
                      showToast('Workflow updated successfully');
                    }}
                    className={`px-4.5 py-2 text-xs font-bold text-white rounded-2xl border shadow-sm transition-all duration-150 active:scale-95 ${
                      isEditDuplicate || isEditNameEmpty
                        ? 'bg-slate-700/50 border-slate-600/50 cursor-not-allowed opacity-40'
                        : 'bg-[#00338D] hover:bg-[#1E49E2] border-[#1E49E2]/40 shadow-[0_4px_14px_rgba(0,51,141,0.3)]'
                    }`}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE CONFIRMATION SAFEGUARD MODAL WITH STRICT LOCKED IMMUNITY */}
      {deleteConfirmId && (() => {
        const targetToDelete = workflows.find((w) => w.id === deleteConfirmId);
        const isLocked = Boolean(targetToDelete?.isLocked ?? targetToDelete?.isWorkflowLocked);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-200">
            <div className={`w-full max-w-sm rounded-[24px] border shadow-2xl p-6 backdrop-blur-2xl ${
              isDarkMode 
                ? 'bg-[#080E1C]/95 border-white/10 text-white shadow-[0_25px_60px_rgba(0,0,0,0.8)]' 
                : 'bg-white/98 border-slate-200 text-[#001E50] shadow-[0_25px_60px_rgba(0,51,141,0.18)]'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {isLocked ? (
                  <Lock className="w-5 h-5 shrink-0 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-[#FD349C]" />
                )}
                <h3 className={`text-sm font-bold ${isLocked ? 'text-amber-400' : 'text-[#FD349C]'}`}>
                  {isLocked ? 'Workflow Is Locked' : 'Delete Workflow?'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {isLocked
                  ? `"${targetToDelete?.name || 'This workflow'}" is locked against deletion. Open and unlock the workflow on the canvas if you intend to permit deletion.`
                  : 'Are you sure you want to delete this workflow? This action permanently removes this visual graph topology from your local repository.'}
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-2xl text-slate-400 hover:text-white transition-colors"
                >
                  {isLocked ? 'Close' : 'Cancel'}
                </button>
                {!isLocked && (
                  <button
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="px-4 py-1.5 text-xs font-bold rounded-2xl bg-[#FD349C] hover:bg-[#FD349C]/90 text-white shadow-[0_4px_14px_rgba(253,52,156,0.35)] active:scale-95 transition-all"
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
