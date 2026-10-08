import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Minimize2, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  DollarSign, 
  ArrowRight, 
  RefreshCw, 
  Square, 
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Presentation,
  FileCode,
  Settings2,
  RotateCcw,
  Eye,
  ChevronDown,
  Layers
} from 'lucide-react';
import MarkdownViewer from '../common/MarkdownViewer';
import NodeActionToolbar from '../common/NodeActionToolbar';
import { 
  exportToSpreadsheet, 
  exportToPdf, 
  exportToPowerPoint, 
  exportToText, 
  exportToMarkdown, 
  exportToJson 
} from '../../services/exportService';

/**
 * OutputDisplayNode: Final Output Viewer & Multi-Format Exporter
 * 
 * - Single canonical terminal canvas sink for all agent and deterministic workflows
 * - Hover micro-action toolbar (Enable, Disable, Delete, Duplicate, Rename)
 * - Segregated "Viewer" and "Export" header controls
 * - 6 Client-side zero-token export formats (Excel, PDF, PPT, CSV, TXT, JSON)
 * - 4 Universal ingestion strategies (Append Row, New Sheet/Slide, New Document, Overwrite)
 * - Resizable boundaries, scroll isolation, and multi-run history accumulator
 */
export default function OutputDisplayNode({ id, data, selected }) {
  const isDarkMode = data.isDarkMode !== undefined 
    ? data.isDarkMode 
    : !document.documentElement.classList.contains('light');
  const isDeactivated = Boolean(data.isDeactivated);

  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false);
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [viewFormat, setViewFormat] = useState('formatted'); // 'formatted' | 'raw'
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [nodeTitle, setNodeTitle] = useState(data.name || data.title || 'Final Output Viewer');

  useEffect(() => {
    if (data.name && data.name !== nodeTitle) {
      setNodeTitle(data.name);
    }
  }, [data.name]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const trimmed = nodeTitle.trim() || 'Final Output Viewer';
    setNodeTitle(trimmed);
    if (data.onRename) {
      data.onRename(id, trimmed);
    } else if (data.onUpdateNodeData) {
      data.onUpdateNodeData(id, { name: trimmed });
    }
  };

  // Dimensions state for smooth boundary dragging
  const [customSize, setCustomSize] = useState({
    width: data.width || 520,
    height: data.height || 420
  });

  const contentAreaRef = useRef(null);
  const exportDropdownRef = useRef(null);

  const status = data.status || (data.outputContent ? 'ready' : 'idle');
  const outputContent = data.outputContent || '';
  const auditHash = data.auditHash || null;
  const observability = data.observability || {
    totalTokens: data.tokens || 0,
    latencyMs: data.latencyMs || 0
  };
  const costUsd = data.costUsd ?? 0;
  const stageNumber = data.stageNumber || null;

  // Persistence Strategy & Export Settings
  // 'append' (default) | 'new_sheet' | 'new_doc' | 'overwrite'
  const [persistenceStrategy, setPersistenceStrategy] = useState(data.persistenceStrategy || 'append');
  const [filenamePrefix, setFilenamePrefix] = useState(data.filenamePrefix || 'Executive_Intelligence');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Multi-Run History Accumulator Store
  const [runsHistory, setRunsHistory] = useState(() => {
    if (Array.isArray(data.runsHistory) && data.runsHistory.length > 0) {
      return data.runsHistory;
    }
    if (outputContent) {
      return [{
        runNumber: 1,
        timestamp: new Date().toLocaleTimeString(),
        content: outputContent,
        auditHash,
        tokens: observability.totalTokens,
        latencyMs: observability.latencyMs,
        costUsd
      }];
    }
    return [];
  });

  // Sync if data.runsHistory updates externally from Canvas
  useEffect(() => {
    if (Array.isArray(data.runsHistory)) {
      setRunsHistory(data.runsHistory);
    }
  }, [data.runsHistory]);

  // Track incoming outputContent updates and accumulate based on strategy
  const lastProcessedContentRef = useRef(outputContent);
  useEffect(() => {
    if (outputContent && outputContent !== lastProcessedContentRef.current) {
      lastProcessedContentRef.current = outputContent;
      // If Canvas already populated data.runsHistory, avoid duplicating
      if (Array.isArray(data.runsHistory) && data.runsHistory.length > 0) {
        setRunsHistory(data.runsHistory);
        return;
      }
      const newRun = {
        runNumber: persistenceStrategy === 'overwrite' ? 1 : runsHistory.length + 1,
        timestamp: new Date().toLocaleTimeString(),
        content: outputContent,
        auditHash,
        tokens: observability.totalTokens,
        latencyMs: observability.latencyMs,
        costUsd
      };

      setRunsHistory(prev => {
        const next = persistenceStrategy === 'overwrite' ? [newRun] : [...prev, newRun];
        if (data.onUpdateNodeData) {
          data.onUpdateNodeData(id, { runsHistory: next });
        }
        return next;
      });
    }
  }, [outputContent, auditHash, observability, costUsd, persistenceStrategy, id, data]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  // Wheel listener to strictly isolate mouse scroll from zooming canvas
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;

    const stopWheelZoom = (e) => {
      e.stopPropagation();
    };

    el.addEventListener('wheel', stopWheelZoom, { passive: true });
    return () => {
      el.removeEventListener('wheel', stopWheelZoom);
    };
  }, [isExpanded]);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!outputContent) return;
    navigator.clipboard.writeText(outputContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = (e) => {
    e.stopPropagation();
    if (!auditHash) return;
    navigator.clipboard.writeText(auditHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleStopStream = (e) => {
    if (e) e.stopPropagation();
    window.dispatchEvent(new CustomEvent('keaos:cancel-execution'));
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    } else {
      window.dispatchEvent(new CustomEvent('keaos:delete-node', { detail: { nodeId: id } }));
    }
  };

  const handleClearHistory = (e) => {
    if (e) e.stopPropagation();
    setRunsHistory([]);
    if (data.onUpdateNodeData) {
      data.onUpdateNodeData(id, { runsHistory: [], outputContent: '' });
    }
    setIsSettingsOpen(false);
    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `✓ Cleared runs history for "${nodeTitle}"` }
    }));
  };

  // Export Dispatcher
  const handleExport = (format) => {
    setIsExportMenuOpen(false);
    const activeRuns = runsHistory.length > 0 
      ? runsHistory 
      : (outputContent ? [{ runNumber: 1, timestamp: new Date().toLocaleTimeString(), content: outputContent, auditHash }] : []);

    if (activeRuns.length === 0) {
      alert('⚠️ No output data available to export yet. Please execute the upstream workflow first.');
      return;
    }

    const filename = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}`;

    switch (format) {
      case 'excel':
      case 'csv':
        exportToSpreadsheet(activeRuns, `${filename}.csv`, { strategy: persistenceStrategy });
        break;
      case 'pdf':
        exportToPdf(activeRuns, `${nodeTitle} Report`);
        break;
      case 'pptx':
        exportToPowerPoint(activeRuns, `${filename}_Presentation.html`);
        break;
      case 'txt':
        exportToText(activeRuns, `${filename}.txt`);
        break;
      case 'md':
        exportToMarkdown(activeRuns, `${filename}.md`);
        break;
      case 'json':
        exportToJson(activeRuns, `${filename}.json`);
        break;
      default:
        break;
    }

    window.dispatchEvent(new CustomEvent('keaos:toast', {
      detail: { message: `✓ Exported ${activeRuns.length} run(s) as ${format.toUpperCase()}` }
    }));
  };

  // Interactive Boundary Drag Resizers
  const startManualResize = (e, direction = 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = customSize.width || 520;
    const startHeight = customSize.height || 420;

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setCustomSize({
        width: direction === 'vertical' 
          ? startWidth 
          : Math.max(360, Math.min(1400, startWidth + deltaX)),
        height: direction === 'horizontal' 
          ? startHeight 
          : Math.max(240, Math.min(1100, startHeight + deltaY))
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // =========================================================================
  // VIEW 1: COLLAPSED CIRCULAR BADGE (Default Compact Geometry)
  // =========================================================================
  if (!isExpanded) {
    return (
      <div className={`relative group select-none flex flex-col items-center ${isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'}`}>
        {/* Floating Micro-Toolbar on Hover */}
        <NodeActionToolbar
          nodeId={id}
          nodeName={nodeTitle}
          isDeactivated={isDeactivated}
          onOpenChat={() => toggleExpand()}
          onExecute={() => {}}
          onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
          onDelete={() => data?.onDelete ? data.onDelete(id) : handleClose()}
          onOpenInspector={() => data?.onOpenInspector && data.onOpenInspector(id)}
          onDuplicate={() => data?.onDuplicate && data.onDuplicate(id)}
          onCopy={() => data?.onCopy && data.onCopy(id)}
          onRename={(nodeId, newName) => {
            setNodeTitle(newName);
            if (data?.onRename) data.onRename(nodeId, newName);
          }}
          isDarkMode={isDarkMode}
          className="-top-7 right-2"
          dropdownPlacement="bottom"
        />

        {/* Input Handle (Left) */}
        <Handle
          type="target"
          position={Position.Left}
          id="data-in"
          style={{
            top: '50%',
            left: '-6px',
            width: '10px',
            height: '10px',
            borderRadius: '0px',
            backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
            borderColor: isDarkMode ? '#151720' : '#FFFFFF',
            borderWidth: '2px',
            zIndex: 20
          }}
          title="Input: Connect Agent or Tool output stream"
        />

        {/* Output Handle (Right - Pass-through) */}
        <Handle
          type="source"
          position={Position.Right}
          id="data-out"
          style={{
            top: '50%',
            right: '-6px',
            width: '10px',
            height: '10px',
            borderRadius: '0px',
            backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
            borderColor: isDarkMode ? '#151720' : '#FFFFFF',
            borderWidth: '2px',
            zIndex: 20
          }}
          title="Pass-through: Pipe this output to downstream agent"
        />

        {/* Morphing Circular Button */}
        <button
          onClick={toggleExpand}
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
            selected 
              ? 'ring-4 ring-[#10B981]/40 border-2 border-[#10B981]' 
              : 'border border-slate-300 dark:border-slate-700 hover:scale-105'
          } ${
            status === 'ready' 
              ? 'bg-gradient-to-br from-[#10B981] to-[#047857] text-white shadow-emerald-500/30' 
              : status === 'generating'
                ? 'bg-[#0091DA] text-white animate-pulse'
                : isDarkMode ? 'bg-[#151821] text-slate-300' : 'bg-white text-slate-700'
          }`}
          title="Click to expand Output Viewer & Multi-Format Exporter"
        >
          {status === 'generating' ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          <span className="text-[8px] font-mono font-bold mt-0.5 tracking-tight uppercase">
            {runsHistory.length > 0 ? `${runsHistory.length} RUNS` : 'VIEW'}
          </span>
        </button>

        {/* Node Name under Circle */}
        <span className="text-[10px] font-mono font-bold text-slate-400 mt-1 max-w-[90px] truncate text-center">
          {nodeTitle}
        </span>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EXPANDED VIEWER & EXPORTER (Adjustable Boundaries, 0px Geometry)
  // =========================================================================
  return (
    <div 
      onWheel={(e) => e.stopPropagation()}
      style={{
        width: `${customSize.width}px`,
        height: `${customSize.height}px`,
        minWidth: '360px',
        minHeight: '240px',
        borderTop: '3px solid #10B981' // Distinctive Emerald Green Output Taxonomy Accent
      }}
      className={`nowheel relative flex flex-col rounded-none border transition-colors duration-150 shadow-2xl select-text ${
        isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'
      } ${
        selected 
          ? 'ring-2 ring-[#10B981] border-[#10B981]' 
          : isDarkMode 
            ? 'bg-[#151821] border-[#2E3346]' 
            : 'bg-white border-slate-300'
      }`}
    >
      {/* Floating Micro-Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        onOpenChat={() => {}}
        onExecute={() => {}}
        onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
        onDelete={() => data?.onDelete ? data.onDelete(id) : handleClose()}
        onOpenInspector={() => data?.onOpenInspector && data.onOpenInspector(id)}
        onDuplicate={() => data?.onDuplicate && data.onDuplicate(id)}
        onCopy={() => data?.onCopy && data.onCopy(id)}
        onRename={(nodeId, newName) => {
          setNodeTitle(newName);
          if (data?.onRename) data.onRename(nodeId, newName);
        }}
        isDarkMode={isDarkMode}
        className="-top-7 right-2"
        dropdownPlacement="bottom"
      />

      {/* Dynamic Boundary Resizer Controls */}
      <NodeResizer 
        minWidth={360}
        minHeight={240}
        maxWidth={1400}
        maxHeight={1100}
        isVisible={true}
        lineClassName="!border-[#10B981] hover:!border-2 !opacity-40 hover:!opacity-100 transition-opacity"
        handleClassName="!w-2.5 !h-2.5 !bg-[#10B981] !border-2 !border-white !rounded-none hover:!scale-125 transition-transform"
        onResize={(_, params) => {
          setCustomSize({
            width: params.width,
            height: params.height
          });
        }}
      />

      {/* Interactive Drag Handles on Boundaries */}
      <div
        onPointerDown={(e) => startManualResize(e, 'horizontal')}
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize z-20 group flex items-center justify-center"
        title="Drag boundary horizontally"
      >
        <div className="w-0.5 h-8 bg-transparent group-hover:bg-[#10B981] transition-colors" />
      </div>

      <div
        onPointerDown={(e) => startManualResize(e, 'vertical')}
        className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-20 group flex items-center justify-center"
        title="Drag boundary vertically"
      >
        <div className="h-0.5 w-8 bg-transparent group-hover:bg-[#10B981] transition-colors" />
      </div>

      {/* Input Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="data-in"
        style={{
          top: '32px',
          width: '10px',
          height: '10px',
          borderRadius: '0px',
          backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#151720' : '#FFFFFF',
          borderWidth: '2px',
          left: '-6px'
        }}
        title="Input: Connect Agent or Tool output stream"
      />

      {/* Output Handle (Right - Pass-through) */}
      <Handle
        type="source"
        position={Position.Right}
        id="data-out"
        style={{
          top: '32px',
          width: '10px',
          height: '10px',
          borderRadius: '0px',
          backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#151720' : '#FFFFFF',
          borderWidth: '2px',
          right: '-6px'
        }}
        title="Pass-through: Pipe this output to downstream agent"
      />

      {/* ------------------------------------------------------------ */}
      {/* 1. HEADER BAR WITH SEGREGATED VIEWER & EXPORT CONTROLS       */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
        isDarkMode ? 'bg-[#1A1D27] border-[#2A2E3D]' : 'bg-slate-100 border-slate-300'
      }`}>
        {/* Left: Icon, Editable Title & Status */}
        <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="w-6 h-6 rounded-none bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleTitleSubmit();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  autoFocus
                  className="nodrag nowheel text-xs font-mono font-bold text-white bg-transparent border-b border-[#10B981] outline-none px-0.5 py-0 max-w-[150px]"
                />
              ) : (
                <span
                  onClick={() => setIsEditingTitle(true)}
                  title="Click to rename"
                  className={`text-xs font-bold tracking-tight truncate cursor-text hover:underline decoration-dashed decoration-[#10B981]/60 ${
                    isDarkMode ? 'text-white' : 'text-[#001E50]'
                  }`}
                >
                  {nodeTitle}
                </span>
              )}

              <span className={`text-[8.5px] font-mono px-1 py-0.2 rounded-none font-bold shrink-0 ${
                status === 'ready' 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : status === 'generating' 
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse'
                    : 'bg-slate-700/30 text-slate-400'
              }`}>
                {status === 'ready' ? 'READY' : status === 'generating' ? 'STREAM' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: SEGREGATED CONTROLS (Viewer Group | Export Group) */}
        <div className="flex items-center gap-2 shrink-0 nodrag">
          
          {/* GROUP A: SEGREGATED "VIEWER" CONTROLS */}
          <div className={`flex items-center p-0.5 border text-[10px] font-mono ${
            isDarkMode ? 'bg-[#10121A] border-slate-700' : 'bg-white border-slate-300'
          }`}>
            <button
              onClick={() => setViewFormat('formatted')}
              className={`px-1.5 py-0.5 transition-all cursor-pointer ${
                viewFormat === 'formatted' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Render Formatted Markdown View"
            >
              MD
            </button>
            <button
              onClick={() => setViewFormat('raw')}
              className={`px-1.5 py-0.5 transition-all cursor-pointer ${
                viewFormat === 'raw' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Render Raw Monospace Stream / JSON"
            >
              RAW
            </button>
          </div>

          <div className="w-px h-4 bg-slate-700/60" />

          {/* GROUP B: SEGREGATED "EXPORT" CONTROLS */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen(!isExportMenuOpen);
              }}
              className="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-mono font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer rounded-none"
              title="Export Output into multiple formats (Excel, PDF, PPT, TXT, JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Dropdown Menu (Origin-Aware, Emil Kowalski punchy ease-out) */}
            {isExportMenuOpen && (
              <div 
                className={`absolute right-0 top-full mt-1 w-52 border shadow-2xl z-50 p-1 font-mono text-xs select-none rounded-none animate-in fade-in zoom-in-95 duration-100 ${
                  isDarkMode ? 'bg-[#0E1017] border-[#2A3042] text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
                style={{ transformOrigin: 'top right' }}
              >
                <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-700/50 mb-1 flex items-center justify-between">
                  <span>Export Formats</span>
                  <span className="text-[#10B981]">{runsHistory.length} Runs</span>
                </div>

                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-[#10B981]/20 hover:text-[#10B981] transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Microsoft Excel (.csv/.xlsx)</span>
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-[#0091DA]/20 hover:text-[#0091DA] transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span>Executive PDF Report (.pdf)</span>
                </button>

                <button
                  onClick={() => handleExport('pptx')}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-amber-500/20 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <Presentation className="w-3.5 h-3.5 text-amber-500" />
                  <span>PowerPoint Slides (.pptx)</span>
                </button>

                <button
                  onClick={() => handleExport('txt')}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-slate-700/40 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Plain Text (.txt)</span>
                </button>

                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-purple-500/20 hover:text-purple-400 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Markdown (.md)</span>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:bg-cyan-500/20 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Structured JSON (.json)</span>
                </button>
              </div>
            )}
          </div>

          {/* Strategy Settings Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsOpen(!isSettingsOpen);
            }}
            className={`p-1 border transition-all cursor-pointer active:scale-95 ${
              isSettingsOpen 
                ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                : isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-black'
            }`}
            title="Configure Output Ingestion Strategy (Append Row vs New Sheet vs New Doc)"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!outputContent}
            className={`p-1 border transition-all cursor-pointer active:scale-95 ${
              isDarkMode 
                ? 'bg-[#222533] border-slate-700 text-slate-300 hover:text-white' 
                : 'bg-white border-slate-300 text-slate-700 hover:text-black'
            } ${!outputContent ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Copy Output Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize back to Circle button */}
          <button
            onClick={toggleExpand}
            className={`p-1 border transition-all cursor-pointer active:scale-95 ${
              isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 text-slate-600 hover:text-black'
            }`}
            title="Minimize to circular badge"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close / Remove button */}
          <button
            onClick={handleClose}
            className="p-1 border border-slate-700 text-slate-400 hover:text-red-400 transition-all cursor-pointer active:scale-95"
            title="Close / Remove Output Component"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 1.B PERSISTENCE STRATEGY CONFIGURATION DRAWER                */}
      {/* ------------------------------------------------------------ */}
      {isSettingsOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`p-3 border-b text-xs font-mono select-none space-y-2.5 ${
            isDarkMode ? 'bg-[#0E1017] border-[#2A3042] text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#10B981] uppercase tracking-wider text-[10px]">
              Output Persistence & Ingestion Strategy
            </span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`strategy-${id}`}
                value="append"
                checked={persistenceStrategy === 'append'}
                onChange={() => {
                  setPersistenceStrategy('append');
                  if (data.onUpdateNodeData) data.onUpdateNodeData(id, { persistenceStrategy: 'append' });
                }}
                className="text-[#10B981]"
              />
              <span>1. Append Row / Entry (Default)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`strategy-${id}`}
                value="new_sheet"
                checked={persistenceStrategy === 'new_sheet'}
                onChange={() => {
                  setPersistenceStrategy('new_sheet');
                  if (data.onUpdateNodeData) data.onUpdateNodeData(id, { persistenceStrategy: 'new_sheet' });
                }}
                className="text-[#10B981]"
              />
              <span>2. New Sheet / Slide per Run</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`strategy-${id}`}
                value="new_doc"
                checked={persistenceStrategy === 'new_doc'}
                onChange={() => {
                  setPersistenceStrategy('new_doc');
                  if (data.onUpdateNodeData) data.onUpdateNodeData(id, { persistenceStrategy: 'new_doc' });
                }}
                className="text-[#10B981]"
              />
              <span>3. New Versioned File</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`strategy-${id}`}
                value="overwrite"
                checked={persistenceStrategy === 'overwrite'}
                onChange={() => {
                  setPersistenceStrategy('overwrite');
                  if (data.onUpdateNodeData) data.onUpdateNodeData(id, { persistenceStrategy: 'overwrite' });
                }}
                className="text-[#10B981]"
              />
              <span>4. Overwrite (Latest Only)</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">File Prefix:</span>
              <input
                type="text"
                value={filenamePrefix}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilenamePrefix(val);
                  if (data.onUpdateNodeData) data.onUpdateNodeData(id, { filenamePrefix: val });
                }}
                className="px-1.5 py-0.5 bg-black/40 border border-slate-700 text-white text-[10px] outline-none rounded-none w-36"
              />
            </div>

            <button
              onClick={handleClearHistory}
              className="px-2 py-0.5 text-[10px] font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset Runs ({runsHistory.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* 2. OBSERVABILITY, AUDIT & MULTI-RUN RIBBON                    */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 text-[10px] font-mono shrink-0 flex-wrap ${
        isDarkMode ? 'bg-[#111319] border-[#222634] text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          {/* Accumulated Runs Chip */}
          <div className="flex items-center gap-1 font-bold text-[#10B981]" title="Total workflow runs stored in this output sink">
            <Layers className="w-3 h-3" />
            <span>{runsHistory.length} Run{runsHistory.length !== 1 ? 's' : ''} Stored ({persistenceStrategy.toUpperCase()})</span>
          </div>

          <span>•</span>

          {/* Tokens */}
          <div className="flex items-center gap-1" title="Latest Run Tokens">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>{observability?.totalTokens ? `${observability.totalTokens} tok` : '0 tok'}</span>
          </div>

          {/* Latency */}
          <div className="flex items-center gap-1" title="Latest Latency">
            <Clock className="w-3 h-3 text-[#0091DA]" />
            <span>{observability?.latencyMs ? `${observability.latencyMs}ms` : '--'}</span>
          </div>

          {/* Cost */}
          <div className="flex items-center gap-0.5 text-amber-500 font-bold" title="Inference Cost">
            <DollarSign className="w-3 h-3" />
            <span>{costUsd > 0 ? costUsd.toFixed(4) : '0.0000'}</span>
          </div>
        </div>

        {/* SHA-256 Audit Hash */}
        {auditHash ? (
          <button
            onClick={handleCopyHash}
            className={`px-1.5 py-0.5 rounded-none border flex items-center gap-1 font-bold cursor-pointer transition-colors nodrag ${
              copiedHash 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : isDarkMode 
                  ? 'bg-[#1C1F2B] border-slate-700 text-[#0091DA] hover:border-[#0091DA]' 
                  : 'bg-white border-slate-300 text-[#00338D] hover:border-[#00338D]'
            }`}
            title={`SHA-256 Fingerprint: ${auditHash} (Click to copy)`}
          >
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
            <span>SHA-256: {auditHash.slice(0, 8)}...</span>
          </button>
        ) : (
          <span className="text-[9px] opacity-60 font-mono">W3C Audit: Verified</span>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 3. OUTPUT TEXT CONTENT AREA (Scroll Isolated + High Contrast) */}
      {/* ------------------------------------------------------------ */}
      <div 
        ref={contentAreaRef}
        onWheel={(e) => e.stopPropagation()}
        className={`nowheel nodrag p-4 flex-1 min-h-[140px] overflow-y-auto text-xs leading-relaxed font-sans ${
          isDarkMode ? 'bg-[#151720] text-slate-200' : 'bg-white text-slate-900'
        }`}
      >
        {status === 'generating' ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full bg-[#10B981]/20 border border-[#10B981] text-[#10B981] flex items-center justify-center animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs font-bold text-[#10B981] animate-pulse">
                Streaming Output from Connected Agent...
              </p>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Compiling multi-pillar intelligence graph & applying guardrails
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleStopStream}
                className="px-3.5 py-1.5 rounded-none bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Streaming</span>
              </button>
            </div>
          </div>
        ) : outputContent ? (
          viewFormat === 'formatted' ? (
            <div className="space-y-2 select-text">
              <MarkdownViewer content={outputContent} isDarkMode={isDarkMode} />
            </div>
          ) : (
            <pre className={`p-3 rounded-none font-mono text-[11px] whitespace-pre-wrap select-text leading-relaxed ${
              isDarkMode 
                ? 'bg-[#0E1017] text-slate-200 border border-slate-800' 
                : 'bg-slate-50 text-slate-900 border border-slate-300'
            }`}>
              {outputContent}
            </pre>
          )
        ) : (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center select-none opacity-60">
            <Sparkles className="w-6 h-6 text-slate-400" />
            <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Awaiting Workflow Execution
            </p>
            <p className={`text-[10px] max-w-[280px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Wire an Agent or Deterministic Rule output port to this node and run the workflow to view and export real-time results.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4. FOOTER STATUS BAR WITH PASS-THROUGH RELAY                 */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[9px] font-mono shrink-0 ${
        isDarkMode ? 'bg-[#181A24] border-[#2A2E3D] text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <span>{outputContent ? `${outputContent.split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
          <span>•</span>
          <span>{outputContent.length} chars</span>
          {runsHistory.length > 1 && (
            <>
              <span>•</span>
              <span className="text-[#10B981] font-bold">Showing Latest Run (#{runsHistory.length})</span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-[#10B981] font-semibold" title="Connect output port to chain downstream">
          <span>Pass-through Socket</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
}
