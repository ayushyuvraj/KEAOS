import React, { useState, useMemo, useRef } from 'react';
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
  Layers, 
  Cpu, 
  ShieldCheck, 
  ArrowRight, 
  ExternalLink,
  SlidersHorizontal,
  Bot,
  Sparkles,
  CheckCircle2,
  FileCode,
  AlertTriangle,
  X,
  Check
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
  const [viewStyle, setViewStyle] = useState('grid'); // 'grid' | 'list'
  
  // Modal states
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  const fileInputRef = useRef(null);
  const activeWorkflowId = useMemo(() => getActiveWorkflowId(), [workflows]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const reloadWorkflows = () => {
    setWorkflows(loadAllWorkflows());
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
      // Starred items float to top
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
      // Default: updated
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

  // Handle Delete
  const handleDelete = (id, e) => {
    e?.stopPropagation();
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

  // Format relative timestamp
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

  return (
    <div className={`flex-1 h-full w-full overflow-hidden flex flex-col select-none transition-colors ${
      isDarkMode ? 'bg-[#0F1015] text-slate-100' : 'bg-[#F5F6F8] text-[#0B0F19]'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-[#001E50] border border-[#0091DA] text-white text-xs font-mono shadow-2xl animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-[#0091DA]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header Bar */}
      <div className={`px-8 py-5 border-b shrink-0 flex items-center justify-between ${
        isDarkMode ? 'bg-[#18191E] border-[#2B2D36]' : 'bg-white border-[#E0E0E0]'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#0091DA]">
              WORKSPACE REPOSITORY // MULTI-AGENT STUDIO
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-[#00338D]/20 text-[#0091DA] border border-[#0091DA]/30">
              {workflows.length} WORKFLOWS
            </span>
          </div>
          <h1 className={`text-xl font-bold tracking-tight mt-1 ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
            Agent Workflows & Topologies
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional hub to design, duplicate, organize, and orchestrate visual agent graphs.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-3">
          {/* Hidden File Input for Import */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".json" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`btn-tactile px-3.5 py-2 text-xs font-semibold rounded-none border transition-colors flex items-center gap-1.5 ${
              isDarkMode 
                ? 'border-[#383B46] text-slate-300 hover:text-white hover:bg-white/5' 
                : 'border-[#CBD5E1] text-slate-700 hover:text-black hover:bg-slate-100'
            }`}
            title="Import KEAOS workflow (.keaos.json)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          {/* Create Blank Workflow Button */}
          <button
            onClick={handleCreateNew}
            className="btn-tactile px-4 py-2 text-xs font-bold rounded-none bg-[#00338D] hover:bg-[#005EB8] text-white border border-[#0091DA]/50 shadow-md flex items-center gap-2 transition-all"
            title="Start fresh with a pristine empty canvas"
          >
            <Plus className="w-4 h-4" />
            <span>New Blank Workflow</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & Ergonomic Toolbar */}
      <div className={`px-8 py-3 border-b shrink-0 flex flex-wrap items-center justify-between gap-4 ${
        isDarkMode ? 'bg-[#121317] border-[#22242C]' : 'bg-[#FAFAFA] border-[#EBEBEB]'
      }`}>
        {/* Left: Search Box + SDK Filters */}
        <div className="flex items-center gap-3 flex-1 min-w-[320px]">
          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter workflows by name, tags, SDK..."
              className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-none border transition-all outline-none font-mono ${
                isDarkMode 
                  ? 'bg-[#1B1C22] border-[#2B2D36] text-white placeholder-slate-500 focus:border-[#0091DA]' 
                  : 'bg-white border-[#D1D5DB] text-black placeholder-slate-400 focus:border-[#00338D]'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Framework Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setSelectedFrameworkFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider rounded-none border transition-all ${
                selectedFrameworkFilter === 'all'
                  ? 'bg-[#00338D] text-white border-[#0091DA]'
                  : isDarkMode
                    ? 'border-[#2B2D36] text-slate-400 hover:text-white hover:bg-white/5'
                    : 'border-[#E0E0E0] text-slate-600 hover:text-black hover:bg-slate-100'
              }`}
            >
              All SDKs
            </button>
            {FRAMEWORKS.map((fw) => {
              const active = selectedFrameworkFilter === fw.id;
              return (
                <button
                  key={fw.id}
                  onClick={() => setSelectedFrameworkFilter(fw.id)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-none border transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#00338D] text-white border-[#0091DA]'
                      : isDarkMode
                        ? 'border-[#2B2D36] text-slate-400 hover:text-white hover:bg-white/5'
                        : 'border-[#E0E0E0] text-slate-600 hover:text-black hover:bg-slate-100'
                  }`}
                >
                  {fw.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Sort Dropdown & Grid/List View Switcher */}
        <div className="flex items-center gap-3">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-2 py-1 text-xs rounded-none border outline-none font-mono ${
                isDarkMode 
                  ? 'bg-[#1B1C22] border-[#2B2D36] text-slate-200' 
                  : 'bg-white border-[#CBD5E1] text-slate-800'
              }`}
            >
              <option value="updated">Recently Modified</option>
              <option value="created">Recently Created</option>
              <option value="alpha">Name (A–Z)</option>
              <option value="nodes">Highest Node Count</option>
            </select>
          </div>

          {/* Grid vs List View Toggle */}
          <div className={`flex items-center border p-0.5 rounded-none ${
            isDarkMode ? 'border-[#2B2D36] bg-[#17181E]' : 'border-[#CBD5E1] bg-white'
          }`}>
            <button
              onClick={() => setViewStyle('grid')}
              className={`p-1.5 transition-colors ${
                viewStyle === 'grid'
                  ? 'bg-[#00338D] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewStyle('list')}
              className={`p-1.5 transition-colors ${
                viewStyle === 'list'
                  ? 'bg-[#00338D] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredWorkflows.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="h-72 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-white/5 border border-dashed border-slate-600 flex items-center justify-center text-slate-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No matching workflows found</h3>
            <p className="text-xs text-slate-400 mb-4">
              {searchQuery ? `No workflows match "${searchQuery}".` : 'No workflows found for the selected filter.'}
            </p>
            <button
              onClick={handleCreateNew}
              className="px-3.5 py-1.5 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-semibold rounded-none border border-[#0091DA]/50"
            >
              Create New Blank Workflow
            </button>
          </div>
        ) : viewStyle === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {/* Blank Canvas Quick Genesis Card */}
            <div 
              onClick={handleCreateNew}
              className={`p-5 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer group transition-all min-h-[220px] ${
                isDarkMode 
                  ? 'border-[#2B2D36] bg-[#14151B]/50 hover:bg-[#181A22] hover:border-[#0091DA]' 
                  : 'border-[#CBD5E1] bg-white hover:bg-slate-50 hover:border-[#00338D]'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-[#00338D]/15 border border-[#0091DA]/40 flex items-center justify-center text-[#0091DA] group-hover:scale-110 group-hover:bg-[#00338D] group-hover:text-white transition-all mb-3">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white tracking-tight group-hover:text-[#0091DA] transition-colors">
                Create Blank Workflow
              </span>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Start with a zero-node canvas and assemble your custom multi-agent graph.
              </p>
            </div>

            {/* Workflow Cards */}
            {filteredWorkflows.map((wf) => {
              const isActive = wf.id === activeWorkflowId;
              const nodeCount = wf.nodes?.length || 0;
              const edgeCount = wf.edges?.length || 0;

              return (
                <div
                  key={wf.id}
                  onClick={() => onOpenWorkflow && onOpenWorkflow(wf)}
                  className={`group relative p-5 border flex flex-col justify-between transition-all cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-[#171922] border-[#0091DA] shadow-[0_4px_24px_rgba(0,145,218,0.15)]'
                        : 'bg-white border-[#00338D] shadow-md'
                      : isDarkMode
                        ? 'bg-[#16171D] border-[#262832] hover:border-slate-500 hover:bg-[#1A1C24]'
                        : 'bg-white border-[#E0E0E0] hover:border-[#00338D] hover:shadow-sm'
                  }`}
                >
                  {/* Card Top: SDK Badge, Star & Context Actions */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#00338D] text-white border border-[#0091DA]/40">
                          {wf.framework?.name || 'Google ADK'}
                        </span>
                        {isActive && (
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleToggleStar(wf.id, wf.isStarred, e)}
                          className={`p-1 transition-colors ${
                            wf.isStarred 
                              ? 'text-amber-400' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={wf.isStarred ? 'Unstar workflow' : 'Star workflow'}
                        >
                          <Star className={`w-3.5 h-3.5 ${wf.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className={`text-sm font-bold tracking-tight line-clamp-1 mb-1.5 group-hover:text-[#0091DA] transition-colors ${
                      isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                    }`}>
                      {wf.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                      {wf.description || 'Enterprise agent graph topology.'}
                    </p>

                    {/* Architectural Metric Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                        isDarkMode ? 'bg-[#1E2028] border-[#303340] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        {nodeCount === 0 ? 'Blank Slide' : `${nodeCount} Nodes`}
                      </span>
                      {edgeCount > 0 && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 border ${
                          isDarkMode ? 'bg-[#1E2028] border-[#303340] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {edgeCount} Wires
                        </span>
                      )}
                      {wf.stats?.mcpCount > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 border bg-[#00A3A6]/15 border-[#00A3A6]/40 text-[#00A3A6]">
                          {wf.stats.mcpCount} MCP
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Metadata & Action Icons */}
                  <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                    isDarkMode ? 'border-[#22242D]' : 'border-slate-100'
                  }`}>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(wf.updatedAt)}</span>
                    </div>

                    {/* Card Actions Ribbon */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* Rename / Edit Specs */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWorkflow(wf);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
                        title="Edit Details & Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={(e) => handleDuplicate(wf.id, e)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
                        title="Duplicate / Copy Workflow"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Export JSON */}
                      <button
                        onClick={(e) => handleExport(wf, e)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
                        title="Export as .keaos.json"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(wf.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE / LIST VIEW */
          <div className={`border overflow-hidden ${
            isDarkMode ? 'bg-[#16171E] border-[#292B36]' : 'bg-white border-[#E0E0E0]'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b text-[10px] font-mono uppercase tracking-wider text-slate-400 ${
                  isDarkMode ? 'bg-[#111216] border-[#292B36]' : 'bg-slate-50 border-[#E0E0E0]'
                }`}>
                  <th className="py-2.5 px-4 w-10">★</th>
                  <th className="py-2.5 px-4">Workflow Name & Details</th>
                  <th className="py-2.5 px-4">Target SDK</th>
                  <th className="py-2.5 px-4">Graph Topology</th>
                  <th className="py-2.5 px-4">Last Modified</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-[#22242D]' : 'divide-slate-100'}`}>
                {filteredWorkflows.map((wf) => {
                  const isActive = wf.id === activeWorkflowId;
                  const nodeCount = wf.nodes?.length || 0;

                  return (
                    <tr
                      key={wf.id}
                      onClick={() => onOpenWorkflow && onOpenWorkflow(wf)}
                      className={`cursor-pointer transition-colors ${
                        isActive
                          ? isDarkMode ? 'bg-[#1C1F2B]' : 'bg-blue-50/60'
                          : isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => handleToggleStar(wf.id, wf.isStarred, e)}
                          className={`p-1 transition-colors ${
                            wf.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${wf.isStarred ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold tracking-tight text-xs ${isDarkMode ? 'text-white' : 'text-black'}`}>
                            {wf.name}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {wf.description}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-[#00338D] text-white border border-[#0091DA]/30">
                          {wf.framework?.name || 'Google ADK'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {nodeCount === 0 ? '0 Nodes (Blank)' : `${nodeCount} Nodes`}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {formatTime(wf.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorkflow(wf);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
                            title="Edit Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(wf.id, e)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleExport(wf, e)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-none transition-colors"
                            title="Export"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(wf.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
          <div className={`w-full max-w-lg border shadow-2xl rounded-none ${
            isDarkMode ? 'bg-[#18191E] border-[#2E313C] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
          }`}>
            <div className="px-6 py-4 bg-[#001E50] border-b border-[#00338D] flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#0091DA]" />
                <h3 className="text-sm font-bold">Edit Workflow Metadata</h3>
              </div>
              <button 
                onClick={() => setEditingWorkflow(null)} 
                className="p-1 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Workflow Title
                </label>
                <input
                  type="text"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  className={`w-full px-3 py-2 text-xs border rounded-none outline-none font-semibold ${
                    isDarkMode ? 'bg-[#121317] border-[#2E313C] text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingWorkflow.description || ''}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                  className={`w-full px-3 py-2 text-xs border rounded-none outline-none ${
                    isDarkMode ? 'bg-[#121317] border-[#2E313C] text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Target Multi-Agent Framework
                </label>
                <select
                  value={editingWorkflow.framework?.id || 'google-adk'}
                  onChange={(e) => {
                    const fw = FRAMEWORKS.find(f => f.id === e.target.value);
                    if (fw) setEditingWorkflow({ ...editingWorkflow, framework: fw });
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-none outline-none font-mono ${
                    isDarkMode ? 'bg-[#121317] border-[#2E313C] text-white' : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  {FRAMEWORKS.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.subtitle})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setEditingWorkflow(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
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
                  className="px-4 py-2 text-xs font-bold bg-[#00338D] hover:bg-[#005EB8] text-white rounded-none border border-[#0091DA]/50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION SAFEGUARD MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className={`w-full max-w-sm border shadow-2xl p-6 rounded-none ${
            isDarkMode ? 'bg-[#18191E] border-[#2E313C] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
          }`}>
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Delete Workflow?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Are you sure you want to delete this workflow? This action permanently removes this visual graph topology from your local repository.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-none shadow-sm"
              >
                Delete Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
