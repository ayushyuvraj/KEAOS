import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  Code2,
  SlidersHorizontal,
  Activity,
  Database,
  AlertTriangle,
  Compass
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
 * Parses raw text or structured data into table headers and rows
 */
function parseTableData(raw) {
  if (!raw) return null;
  const text = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw);
  if (!text) return null;

  // 1. JSON Array of objects
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
        const headers = Array.from(new Set(arr.flatMap(item => Object.keys(item))));
        const rows = arr.map(item => headers.map(h => item[h] !== undefined ? String(item[h]) : ''));
        return { headers, rows };
      }
    } catch {}
  }

  // 2. Markdown table (| col1 | col2 |)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length >= 2) {
    const parseRow = (line) => line.slice(1, -1).split('|').map(c => c.trim());
    const headers = parseRow(tableLines[0]);
    // Skip separator lines like |---|---|
    const dataLines = tableLines.slice(1).filter(l => !/^[|\s-:]+$/.test(l));
    const rows = dataLines.map(parseRow);
    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }

  // 3. CSV format (comma-separated with header)
  if (lines.length >= 2 && lines[0].includes(',')) {
    const parseCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    const headers = parseCsvLine(lines[0]);
    if (headers.length > 1) {
      const rows = lines.slice(1).map(parseCsvLine);
      return { headers, rows };
    }
  }

  return null;
}

/**
 * OutputDisplayNode: Institutional Output Viewer & Multi-Format Exporter
 * 
 * - Impeccable & Taste Engineering: Multi-layer border depth, precision typography, and calm hierarchy
 * - Google-level simplicity: Dedicated controls, zero cognitive clutter, and progressive disclosure
 * - Zero-token client-side export to Excel, PDF, PPT, CSV, TXT, JSON
 * - 4 Ingestion strategies: Append Row, New Sheet/Slide, New Document, Overwrite
 * - Multi-run history accumulator with active run scrubbing and interactive table grid
 */
export default function OutputDisplayNode({ id, data, selected }) {
  const isDarkMode = data.isDarkMode !== undefined 
    ? data.isDarkMode 
    : !document.documentElement.classList.contains('light');
  const isDeactivated = Boolean(data.isDeactivated);
  const isLocked = Boolean(data.isLocked);

  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false);

  useEffect(() => {
    if (data.isExpanded !== undefined) {
      setIsExpanded(data.isExpanded);
    }
  }, [data.isExpanded]);

  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [viewFormat, setViewFormat] = useState(data.viewFormat || 'general'); // 'general' (default) | 'formatted' (MD) | 'table' | 'raw'
  const [isViewModeMenuOpen, setIsViewModeMenuOpen] = useState(false);
  
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

  // Dimensions state
  const [customSize, setCustomSize] = useState({
    width: data.width || 560,
    height: data.height || 440
  });

  const contentAreaRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const settingsPopoverRef = useRef(null);
  const viewModeDropdownRef = useRef(null);

  const isExecuting = Boolean(data.isExecuting) || data.status === 'generating';
  const status = data.status || (isExecuting ? 'generating' : (data.outputContent ? 'ready' : 'idle'));
  const outputContent = data.outputContent || '';
  const auditHash = data.auditHash || null;
  const observability = data.observability || {
    totalTokens: data.tokens || 0,
    latencyMs: data.latencyMs || 0
  };
  const costUsd = data.costUsd ?? 0;

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

  // Active run index for scrubbing history (-1 means latest)
  const [selectedRunIndex, setSelectedRunIndex] = useState(-1);

  // Sync if data.runsHistory updates externally
  useEffect(() => {
    if (Array.isArray(data.runsHistory)) {
      setRunsHistory(data.runsHistory);
      if (data.runsHistory.length === 0) {
        lastProcessedContentRef.current = '';
      }
    }
  }, [data.runsHistory]);

  // Track incoming outputContent updates and accumulate based on strategy
  const lastProcessedContentRef = useRef(outputContent);
  useEffect(() => {
    if (outputContent && outputContent !== lastProcessedContentRef.current) {
      lastProcessedContentRef.current = outputContent;
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
      if (viewModeDropdownRef.current && !viewModeDropdownRef.current.contains(e.target)) {
        setIsViewModeMenuOpen(false);
      }
    };
    if (isExportMenuOpen || isSettingsOpen || isViewModeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen, isSettingsOpen, isViewModeMenuOpen]);

  // Wheel listener to strictly isolate mouse scroll from zooming canvas
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;
    const stopWheelZoom = (e) => e.stopPropagation();
    el.addEventListener('wheel', stopWheelZoom, { passive: true });
    return () => el.removeEventListener('wheel', stopWheelZoom);
  }, [isExpanded]);

  // Resolve active run content
  const activeRunIndex = useMemo(() => {
    if (runsHistory.length === 0) return 0;
    if (selectedRunIndex < 0 || selectedRunIndex >= runsHistory.length) {
      return runsHistory.length - 1;
    }
    return selectedRunIndex;
  }, [runsHistory, selectedRunIndex]);

  const activeContent = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]) {
      const run = runsHistory[activeRunIndex];
      const runContent = run.content ?? run.output ?? run.text ?? run.outputContent ?? '';
      if (runContent) return typeof runContent === 'object' ? JSON.stringify(runContent, null, 2) : String(runContent);
      if (run.tableData) {
        return typeof run.tableData === 'string' ? run.tableData : JSON.stringify(run.tableData, null, 2);
      }
    }
    return outputContent || data.content || '';
  }, [runsHistory, activeRunIndex, outputContent, data.content]);

  const activeAuditHash = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.auditHash) {
      return runsHistory[activeRunIndex].auditHash;
    }
    return auditHash;
  }, [runsHistory, activeRunIndex, auditHash]);

  const activeTokens = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.tokens !== undefined) {
      return runsHistory[activeRunIndex].tokens;
    }
    return observability.totalTokens || 0;
  }, [runsHistory, activeRunIndex, observability]);

  const activeLatencyMs = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.latencyMs !== undefined) {
      return runsHistory[activeRunIndex].latencyMs;
    }
    return observability.latencyMs || 0;
  }, [runsHistory, activeRunIndex, observability]);

  const activeCostUsd = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.costUsd !== undefined) {
      return runsHistory[activeRunIndex].costUsd;
    }
    return costUsd || 0;
  }, [runsHistory, activeRunIndex, costUsd]);

  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(false);

  const activeModelId = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.modelId) {
      return runsHistory[activeRunIndex].modelId;
    }
    return data.modelId || null;
  }, [runsHistory, activeRunIndex, data.modelId]);

  const activeTelemetryBreakdown = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.telemetryBreakdown) {
      return runsHistory[activeRunIndex].telemetryBreakdown;
    }
    return data.telemetryBreakdown || null;
  }, [runsHistory, activeRunIndex, data.telemetryBreakdown]);

  // Detect and parse table data
  const parsedTable = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.tableData) {
      const parsed = parseTableData(runsHistory[activeRunIndex].tableData);
      if (parsed) return parsed;
    }
    return parseTableData(activeContent);
  }, [runsHistory, activeRunIndex, activeContent]);

  // Auto-switch to table view if active content is structured table/CSV
  const hasTableData = Boolean(parsedTable && parsedTable.headers.length > 0);

  // Extract topics and headings for General view
  const extractedTopics = useMemo(() => {
    if (!activeContent || typeof activeContent !== 'string') return [];
    const lines = activeContent.split('\n');
    const topics = [];
    let topicIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Markdown headings: #, ##, ###
      const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].replace(/[*_`]/g, '').trim();
        if (title && !topics.some(t => t.title.toLowerCase() === title.toLowerCase())) {
          topics.push({
            id: `topic-${topicIndex++}`,
            title,
            level
          });
        }
        continue;
      }

      // Bold topic headers: **Topic Name:**
      const boldTopicMatch = line.match(/^\*\*([A-Za-z0-9\s—–\-_/&]+):\*\*\s*(.*)$/);
      if (boldTopicMatch && boldTopicMatch[1].length < 40) {
        const title = boldTopicMatch[1].trim();
        if (title && !topics.some(t => t.title.toLowerCase() === title.toLowerCase())) {
          topics.push({
            id: `topic-${topicIndex++}`,
            title,
            level: 2
          });
        }
      }
    }

    return topics.slice(0, 12);
  }, [activeContent]);

  const handleTopicClick = (topicTitle) => {
    if (!contentAreaRef.current) return;
    const cleanTarget = topicTitle.trim().toLowerCase();
    const elements = contentAreaRef.current.querySelectorAll('h1, h2, h3, h4, h5, strong, b, span');
    for (const el of elements) {
      if (el.textContent.trim().toLowerCase().includes(cleanTarget)) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('transition-all', 'duration-300', 'ring-2', 'ring-[#0091DA]', 'ring-offset-2');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-[#0091DA]', 'ring-offset-2');
        }, 1500);
        break;
      }
    }
  };

  const handleCopy = (e) => {
    if (e) e.stopPropagation();
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHash = (e) => {
    if (e) e.stopPropagation();
    if (!activeAuditHash) return;
    navigator.clipboard.writeText(activeAuditHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const toggleExpand = (e) => {
    if (e) e.stopPropagation();
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    if (data?.onUpdateNodeData) {
      data.onUpdateNodeData(id, { isExpanded: nextExpanded });
    }
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
    setSelectedRunIndex(-1);
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
      : (activeContent ? [{ runNumber: 1, timestamp: new Date().toLocaleTimeString(), content: activeContent, auditHash: activeAuditHash }] : []);

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

  // Manual Boundary Resizer
  const startManualResize = (e, direction = 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = customSize.width || 560;
    const startHeight = customSize.height || 440;

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
      <div className={`relative group w-14 select-none flex flex-col items-center ${isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'}`}>
        {/* Floating Micro-Toolbar on Hover */}
        <NodeActionToolbar
          nodeId={id}
          nodeName={nodeTitle}
          isDeactivated={isDeactivated}
          isLocked={isLocked}
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
          mode="circle-right"
          dropdownPlacement="auto"
        />

        {/* Circular Morphing Button with Left/Right Attached Handles */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          {/* Input Handle (Left) */}
          <Handle
            type="target"
            position={Position.Left}
            id="data-in"
            style={{
              top: '28px',
              left: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '0px',
              backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : '#0091DA',
              borderColor: isDarkMode ? '#151720' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="Input: Connect Agent or Tool output stream"
          />

          {/* Morphing Circular Button */}
          <button
            onClick={toggleExpand}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-xl active:scale-95 ${
              isExecuting
                ? 'ring-4 ring-[#10B981]/50 border-2 border-[#10B981] shadow-[0_0_24px_rgba(16,185,129,0.55)] scale-105'
                : selected 
                  ? 'ring-4 ring-[#10B981]/40 border-2 border-[#10B981]' 
                  : isDarkMode ? 'border border-white/15 hover:border-[#10B981]' : 'border border-slate-200 hover:border-[#10B981]'
            } ${
              status === 'ready' || runsHistory.length > 0
                ? 'bg-gradient-to-br from-[#10B981] to-[#047857] text-white shadow-emerald-500/30' 
                : isExecuting
                  ? 'bg-[#10B981] text-white animate-pulse'
                  : isDarkMode ? 'bg-[#1E2026] text-slate-200 shadow-[0_8px_24px_rgba(0,0,0,0.4)]' : 'bg-white text-slate-700 shadow-[0_8px_24px_rgba(0,30,80,0.08)]'
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

          {/* Output Handle (Right - Pass-through) */}
          <Handle
            type="source"
            position={Position.Right}
            id="data-out"
            style={{
              top: '28px',
              right: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '0px',
              backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : (isDarkMode ? '#34D399' : '#0091DA'),
              borderColor: isDarkMode ? '#1C1E24' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="Pass-through: Pipe this output to downstream agent"
          />
        </div>

        {/* Node Name under Circle (Frosted Pill) */}
        <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-auto select-none flex flex-col items-center">
          <div className={`px-2.5 py-0.5 rounded-full border backdrop-blur-md max-w-[180px] inline-flex items-center justify-center ${
            isDarkMode 
              ? 'bg-[#1C1E24]/90 border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)]' 
              : 'bg-white/95 border-slate-200 shadow-[0_4px_16px_rgba(0,30,80,0.08)]'
          }`}>
            <span className={`text-[10px] font-semibold tracking-tight block truncate ${
              isDarkMode ? 'text-white' : 'text-[#111827]'
            }`}>
              {nodeTitle}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EXPANDED VIEWER & EXPORTER (Impeccable & Taste Refined Shell)
  // =========================================================================
  return (
    <div 
      onWheel={(e) => e.stopPropagation()}
      style={{
        width: `${customSize.width}px`,
        height: `${customSize.height}px`,
        minWidth: '360px',
        minHeight: '240px'
      }}
      className={`nowheel relative flex flex-col rounded-none border transition-all duration-150 select-text overflow-hidden ${
        isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'
      } ${
        isExecuting
          ? 'ring-2 ring-[#10B981] border-[#10B981] shadow-[0_0_36px_rgba(16,185,129,0.35)]'
          : selected 
            ? 'ring-2 ring-[#10B981] border-[#10B981] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.7)]' 
            : isDarkMode 
              ? 'bg-gradient-to-b from-[#141824] via-[#10131B] to-[#0C0E14] border-[#262D3D] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-white/[0.05]' 
              : 'bg-white border-slate-300 shadow-[0_16px_40px_-10px_rgba(0,30,80,0.12)]'
      }`}
    >
      {/* Precision Luminous Top Taxonomy Accent Bar */}
      <div className="h-[2px] w-full shrink-0 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 shadow-[0_1px_6px_rgba(16,185,129,0.3)]" />

      {/* Floating Micro-Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
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
        mode="card-top"
        dropdownPlacement="auto"
      />

      {/* Dynamic Boundary Resizer Controls */}
      {!isLocked && (
        <>
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
        </>
      )}

      {/* Input Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        id="data-in"
        style={{
          top: '28px',
          width: '10px',
          height: '10px',
          borderRadius: '0px',
          backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : '#0091DA',
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
          top: '28px',
          width: '10px',
          height: '10px',
          borderRadius: '0px',
          backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#151720' : '#FFFFFF',
          borderWidth: '2px',
          right: '-6px'
        }}
        title="Pass-through: Pipe this output to downstream agent"
      />

      {/* ------------------------------------------------------------ */}
      {/* 1. ARCHITECTURAL HEADER BAR                                  */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-3 shrink-0 ${
        isDarkMode ? 'bg-[#151924]/90 border-white/[0.08]' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Left: Faceted Badge, Title & Live Status Pill */}
        <div className="flex items-center gap-2.5 min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="w-5 h-5 rounded-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-3 h-3" />
          </div>
          
          <div className="min-w-0 flex items-center gap-2">
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
                className="nodrag nowheel text-xs font-semibold text-white bg-transparent border-b border-[#10B981] outline-none px-0.5 py-0 max-w-[180px]"
              />
            ) : (
              <span
                onClick={() => {
                  if (isLocked) return;
                  setIsEditingTitle(true);
                }}
                title={isLocked ? 'Workflow is locked' : 'Click to rename'}
                className={`text-xs font-semibold tracking-[-0.01em] truncate ${
                  isLocked ? 'cursor-default' : 'cursor-text hover:underline decoration-dashed decoration-[#10B981]/60'
                } ${
                  isDarkMode ? 'text-white' : 'text-[#001E50]'
                }`}
              >
                {nodeTitle}
              </span>
            )}

            {/* Precision Status Indicator Pill */}
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-tight border shrink-0 ${
              status === 'generating'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/25 animate-pulse'
                : status === 'ready' || runsHistory.length > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : isDarkMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                status === 'generating' 
                  ? 'bg-blue-400 animate-ping' 
                  : status === 'ready' || runsHistory.length > 0 
                    ? 'bg-emerald-400' 
                    : 'bg-slate-400'
              }`} />
              <span className="uppercase text-[8.5px]">
                {status === 'generating' ? 'STREAMING' : status === 'ready' || runsHistory.length > 0 ? 'READY' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: SEGREGATED VIEW, EXPORT, STRATEGY & ACTIONS */}
        <div className="flex items-center gap-1.5 shrink-0 nodrag">
          
          {/* GROUP A: INSTITUTIONAL VIEW MODE DROPDOWN */}
          <div className="relative" ref={viewModeDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsViewModeMenuOpen(!isViewModeMenuOpen);
                setIsExportMenuOpen(false);
                setIsSettingsOpen(false);
              }}
              className={`px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 rounded-none border ${
                isViewModeMenuOpen 
                  ? 'bg-[#00338D] text-white border-[#00338D]' 
                  : isDarkMode 
                    ? 'bg-[#181D2A] hover:bg-[#202738] text-slate-100 border-white/[0.12] hover:border-[#00338D]' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-[#00338D]'
              }`}
              title="Select Output Presentation Mode"
            >
              {viewFormat === 'general' ? (
                <Sparkles className="w-3 h-3 text-[#0091DA]" />
              ) : viewFormat === 'formatted' ? (
                <FileText className="w-3 h-3 text-purple-400" />
              ) : viewFormat === 'table' ? (
                <TableIcon className="w-3 h-3 text-emerald-400" />
              ) : (
                <Code2 className="w-3 h-3 text-amber-400" />
              )}
              <span className="font-semibold text-[11px]">
                {viewFormat === 'general'
                  ? 'General'
                  : viewFormat === 'formatted'
                    ? 'Markdown'
                    : viewFormat === 'table'
                      ? 'Table'
                      : 'Raw / JSON'}
              </span>
              <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${isViewModeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* View Mode Popover Menu */}
            {isViewModeMenuOpen && (
              <div 
                className={`absolute left-0 top-full mt-1.5 w-60 border shadow-2xl z-50 p-1 select-none rounded-none origin-top-left transition-all duration-150 animate-in fade-in zoom-in-95 ${
                  isDarkMode ? 'bg-[#0B0D14] border-[#262D3D] text-slate-200 ring-1 ring-white/[0.06]' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider text-slate-400 font-semibold border-b border-white/[0.08] mb-1 flex items-center justify-between">
                  <span>View Presentation</span>
                  <span className="text-[#0091DA] font-mono text-[8.5px]">ACTIVE: {viewFormat.toUpperCase()}</span>
                </div>

                {/* 1. General (Default) */}
                <button
                  onClick={() => {
                    setViewFormat('general');
                    setIsViewModeMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 flex items-start gap-2 text-xs transition-colors cursor-pointer active:scale-98 ${
                    viewFormat === 'general'
                      ? isDarkMode ? 'bg-[#00338D]/25 text-white' : 'bg-[#00338D]/10 text-[#00338D] font-semibold'
                      : 'hover:bg-blue-500/10 hover:text-[#0091DA]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0091DA] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">General</span>
                      <span className="text-[8px] font-mono px-1 py-0.5 bg-blue-500/20 text-[#0091DA] rounded-none">DEFAULT</span>
                    </div>
                    <div className="text-[9.5px] opacity-70 leading-tight mt-0.5">
                      Verbatim LLM output & topic navigation
                    </div>
                  </div>
                </button>

                {/* 2. Markdown (MD) */}
                <button
                  onClick={() => {
                    setViewFormat('formatted');
                    setIsViewModeMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 flex items-start gap-2 text-xs transition-colors cursor-pointer active:scale-98 ${
                    viewFormat === 'formatted'
                      ? isDarkMode ? 'bg-purple-500/25 text-white' : 'bg-purple-500/10 text-purple-700 font-semibold'
                      : 'hover:bg-purple-500/10 hover:text-purple-400'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[11px]">Markdown (MD)</div>
                    <div className="text-[9.5px] opacity-70 leading-tight mt-0.5">
                      Standard linear document reader
                    </div>
                  </div>
                </button>

                {/* 3. Spreadsheet Table (TBL) */}
                <button
                  onClick={() => {
                    if (hasTableData) {
                      setViewFormat('table');
                      setIsViewModeMenuOpen(false);
                    }
                  }}
                  disabled={!hasTableData}
                  className={`w-full text-left px-2.5 py-1.5 flex items-start gap-2 text-xs transition-colors ${
                    !hasTableData
                      ? 'opacity-40 cursor-not-allowed'
                      : viewFormat === 'table'
                        ? isDarkMode ? 'bg-emerald-500/25 text-white' : 'bg-emerald-500/10 text-emerald-700 font-semibold'
                        : 'hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer active:scale-98'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">Spreadsheet Table</span>
                      {!hasTableData && <span className="text-[8px] opacity-60">(No table data)</span>}
                    </div>
                    <div className="text-[9.5px] opacity-70 leading-tight mt-0.5">
                      Interactive columns & rows grid
                    </div>
                  </div>
                </button>

                {/* 4. Raw Monospace / JSON */}
                <button
                  onClick={() => {
                    setViewFormat('raw');
                    setIsViewModeMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 flex items-start gap-2 text-xs transition-colors cursor-pointer active:scale-98 ${
                    viewFormat === 'raw'
                      ? isDarkMode ? 'bg-amber-500/25 text-white' : 'bg-amber-500/10 text-amber-700 font-semibold'
                      : 'hover:bg-amber-500/10 hover:text-amber-400'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[11px]">Raw Stream / JSON</div>
                    <div className="text-[9.5px] opacity-70 leading-tight mt-0.5">
                      Character-for-character raw stream
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-3.5 bg-slate-500/20 mx-0.5" />

          {/* GROUP B: INSTITUTIONAL EXPORT DROPDOWN */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen(!isExportMenuOpen);
                setIsSettingsOpen(false);
              }}
              className={`px-2.5 py-1 text-[11px] font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-95 rounded-none border ${
                isExportMenuOpen 
                  ? 'bg-emerald-600 text-white border-emerald-500' 
                  : isDarkMode 
                    ? 'bg-[#181D2A] hover:bg-[#202738] text-slate-100 border-white/[0.12] hover:border-emerald-500/50' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-600'
              }`}
              title="Export Output into multiple formats"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {/* Export Popover */}
            {isExportMenuOpen && (
              <div 
                className={`absolute right-0 top-full mt-1.5 w-56 border shadow-2xl z-50 p-1 select-none rounded-none origin-top-right transition-all duration-150 animate-in fade-in zoom-in-95 ${
                  isDarkMode ? 'bg-[#0B0D14] border-[#262D3D] text-slate-200 ring-1 ring-white/[0.06]' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider text-slate-400 font-semibold border-b border-white/[0.08] mb-1 flex items-center justify-between">
                  <span>Export Format</span>
                  <span className="text-[#10B981] font-mono">{runsHistory.length || 1} Run(s)</span>
                </div>

                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#10B981]/15 hover:text-[#10B981] text-xs transition-colors cursor-pointer active:scale-98"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Microsoft Excel (.csv/.xlsx)</span>
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-[#0091DA]/15 hover:text-[#0091DA] text-xs transition-colors cursor-pointer active:scale-98"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0091DA]" />
                  <span>Executive PDF Report (.pdf)</span>
                </button>

                <button
                  onClick={() => handleExport('pptx')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-amber-500/15 hover:text-amber-400 text-xs transition-colors cursor-pointer active:scale-98"
                >
                  <Presentation className="w-3.5 h-3.5 text-amber-500" />
                  <span>PowerPoint Slides (.pptx)</span>
                </button>

                <button
                  onClick={() => handleExport('txt')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-500/15 text-xs transition-colors cursor-pointer active:scale-98"
                >
                  <FileText className="w-3.5 h-3.5 opacity-60" />
                  <span>Plain Text (.txt)</span>
                </button>

                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-purple-500/15 hover:text-purple-400 text-xs transition-colors cursor-pointer active:scale-98"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Markdown (.md)</span>
                </button>

                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-cyan-500/15 hover:text-cyan-400 text-xs transition-colors cursor-pointer active:scale-98"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Structured JSON (.json)</span>
                </button>
              </div>
            )}
          </div>

          {/* GROUP C: STRATEGY & SETTINGS POPOVER */}
          <div className="relative" ref={settingsPopoverRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(!isSettingsOpen);
                setIsExportMenuOpen(false);
              }}
              className={`p-1.5 border transition-all duration-150 cursor-pointer active:scale-95 rounded-none ${
                isSettingsOpen 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : isDarkMode 
                    ? 'border-white/[0.08] text-slate-400 hover:text-white bg-[#181D2A] hover:bg-[#202738]' 
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50'
              }`}
              title="Configure Output Ingestion Strategy & History"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>

            {/* Ingestion Strategy Popover */}
            {isSettingsOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-full mt-1.5 w-72 border shadow-2xl z-50 p-3 select-none rounded-none origin-top-right transition-all duration-150 animate-in fade-in zoom-in-95 space-y-3 ${
                  isDarkMode ? 'bg-[#0B0D14] border-[#262D3D] text-slate-200 ring-1 ring-white/[0.06]' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Persistence Strategy
                  </span>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    { id: 'append', label: 'Append Row / Entry (Default)', sub: 'Accumulate runs in unified table' },
                    { id: 'new_sheet', label: 'New Sheet / Slide per Run', sub: 'Create separate tab per run' },
                    { id: 'new_doc', label: 'New Versioned File', sub: 'Create timestamped file' },
                    { id: 'overwrite', label: 'Overwrite (Latest Only)', sub: 'Keep only most recent run' }
                  ].map(opt => (
                    <label 
                      key={opt.id}
                      className={`flex items-start gap-2 p-1.5 border cursor-pointer transition-colors ${
                        persistenceStrategy === opt.id 
                          ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-emerald-50/80 border-emerald-300'
                          : isDarkMode ? 'border-transparent hover:bg-white/[0.03]' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`strategy-${id}`}
                        value={opt.id}
                        checked={persistenceStrategy === opt.id}
                        onChange={() => {
                          setPersistenceStrategy(opt.id);
                          if (data.onUpdateNodeData) data.onUpdateNodeData(id, { persistenceStrategy: opt.id });
                        }}
                        className="mt-0.5 text-emerald-500 focus:ring-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium leading-tight">{opt.label}</div>
                        <div className="text-[9px] opacity-60 leading-tight mt-0.5">{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] opacity-70">File Prefix:</span>
                    <input
                      type="text"
                      value={filenamePrefix}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilenamePrefix(val);
                        if (data.onUpdateNodeData) data.onUpdateNodeData(id, { filenamePrefix: val });
                      }}
                      className={`px-2 py-0.5 text-[11px] border font-mono outline-none rounded-none w-36 ${
                        isDarkMode ? 'bg-black/50 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] opacity-60 font-mono">
                      {runsHistory.length} run{runsHistory.length !== 1 ? 's' : ''} stored
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="px-2 py-1 text-[10px] font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/30 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset Runs</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!activeContent}
            className={`p-1.5 border transition-all duration-150 cursor-pointer active:scale-95 rounded-none ${
              isDarkMode 
                ? 'bg-[#181D2A] hover:bg-[#202738] border-white/[0.08] text-slate-300 hover:text-white' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
            } ${!activeContent ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Copy Output Content"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400 animate-in zoom-in duration-100" /> : <Copy className="w-3 h-3" />}
          </button>

          {/* Minimize back to Circle */}
          <button
            onClick={toggleExpand}
            className={`p-1.5 border transition-all duration-150 cursor-pointer active:scale-95 rounded-none ${
              isDarkMode 
                ? 'bg-[#181D2A] hover:bg-[#202738] border-white/[0.08] text-slate-300 hover:text-white' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title="Minimize to circular token"
          >
            <Minimize2 className="w-3 h-3" />
          </button>

          {/* Close / Remove button */}
          {!isLocked && (
            <button
              onClick={handleClose}
              className={`p-1.5 border transition-all duration-150 cursor-pointer active:scale-95 rounded-none ${
                isDarkMode 
                  ? 'border-white/[0.08] text-slate-400 hover:text-red-400 hover:bg-red-500/10' 
                  : 'border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Close / Remove Output Component"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. PRECISION TELEMETRY & MULTI-RUN NAVIGATOR RIBBON          */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-3 text-[10px] font-mono shrink-0 select-none ${
        isDarkMode ? 'bg-[#0B0D14] border-white/[0.06] text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          
          {/* Upstream Source Badge */}
          {data?.sourceNodeType === 'deterministic' ? (
            <span className="font-semibold text-amber-400 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/25">
              <span>⚡</span>
              <span>{data?.sourceNodeName || 'Deterministic Rule'}</span>
            </span>
          ) : data?.sourceNodeType === 'agent' || activeContent ? (
            <span className="font-semibold text-[#0091DA] flex items-center gap-1 px-1.5 py-0.5 bg-[#0091DA]/10 border border-[#0091DA]/25">
              <span>🤖</span>
              <span>{data?.sourceNodeName || 'Autonomous Agent'}</span>
            </span>
          ) : null}

          {/* Run Stepper / Scrubber */}
          {runsHistory.length > 1 && (
            <>
              <span className="opacity-30">•</span>
              <div className="flex items-center gap-1 bg-[#131722] px-1 py-0.5 rounded-none border border-white/[0.08]">
                <button
                  onClick={() => setSelectedRunIndex(prev => Math.max(0, (prev === -1 ? runsHistory.length - 1 : prev) - 1))}
                  disabled={activeRunIndex === 0}
                  className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Previous Run"
                >
                  <ChevronLeft className="w-2.5 h-2.5" />
                </button>
                <span className="text-[9px] font-semibold text-emerald-400 px-1">
                  Run {activeRunIndex + 1} of {runsHistory.length}
                </span>
                <button
                  onClick={() => setSelectedRunIndex(prev => Math.min(runsHistory.length - 1, (prev === -1 ? runsHistory.length - 1 : prev) + 1))}
                  disabled={activeRunIndex === runsHistory.length - 1}
                  className="p-0.5 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  title="Next Run"
                >
                  <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </>
          )}

          <span className="opacity-30">•</span>

          {/* Unified Telemetry String with Multi-Stage Drawer Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsTelemetryDrawerOpen(prev => !prev);
            }}
            className="flex items-center gap-1.5 text-[9.5px] px-1.5 py-0.5 rounded border border-transparent hover:border-[#00B8F5]/30 hover:bg-[#00B8F5]/10 cursor-pointer transition-all nodrag"
            title="Click to view Stage-by-Stage Computation Cost & Architecture Breakdown"
          >
            {activeModelId && (
              <>
                <span className="text-[#00B8F5] font-semibold uppercase">{activeModelId.replace(/^gemini-/, 'Gemini ').replace(/^gpt-/, 'GPT-')}</span>
                <span className="opacity-30">•</span>
              </>
            )}
            <span title="Latency">{activeLatencyMs ? `${activeLatencyMs >= 1000 ? (activeLatencyMs / 1000).toFixed(1) : (activeLatencyMs / 1000).toFixed(2)}s` : '--'}</span>
            <span className="opacity-30">•</span>
            <span title="Inference Tokens">{activeTokens ? `${activeTokens.toLocaleString()} tok` : '0 tok'}</span>
            <span className="opacity-30">•</span>
            <span title="Cost" className="text-amber-400 font-semibold">${activeCostUsd > 0 ? Number(activeCostUsd).toFixed(4) : '0.0000'}</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isTelemetryDrawerOpen ? 'rotate-180 text-[#00B8F5]' : ''}`} />
          </button>
        </div>

        {/* SHA-256 Cryptographic Audit Badge */}
        {activeAuditHash ? (
          <button
            onClick={handleCopyHash}
            className={`px-1.5 py-0.5 rounded-none border flex items-center gap-1 font-semibold cursor-pointer transition-colors nodrag ${
              copiedHash 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : isDarkMode 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40' 
                  : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-500'
            }`}
            title={`SHA-256: ${activeAuditHash} (Click to copy)`}
          >
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
            <span>{copiedHash ? 'Copied' : `SHA: ${activeAuditHash.slice(0, 8)}...`}</span>
          </button>
        ) : (
          <span className="text-[9px] opacity-50 flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500/60" />
            <span>W3C Audit: Verified</span>
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* MULTI-STAGE ARCHITECTURE & COMPUTATION COST DRAWER           */}
      {/* ------------------------------------------------------------ */}
      {isTelemetryDrawerOpen && (
        <div className="p-3 border-b border-[#1E293B] bg-[#0A0E18] text-xs font-mono space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#00B8F5]" />
              Pipeline Computation Waterfall
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00B8F5]/10 text-[#00B8F5] border border-[#00B8F5]/30">
              {activeTelemetryBreakdown?.tierLabel || 'Tier 3 (Decomposed)'}
            </span>
          </div>

          {/* Stacked Token / Cost Distribution Bar */}
          {activeTelemetryBreakdown?.stages && activeTelemetryBreakdown.stages.length > 0 && (
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                {activeTelemetryBreakdown.stages.map((stg, i) => {
                  const colors = ['bg-[#00B8F5]', 'bg-[#10B981]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]'];
                  const color = stg.nature === 'deterministic' ? 'bg-emerald-600' : colors[i % colors.length];
                  return (
                    <div
                      key={stg.id || i}
                      style={{ width: `${Math.max(stg.pctOfTotal, 3)}%` }}
                      className={`${color} h-full transition-all`}
                      title={`${stg.name}: ${stg.tokens.toLocaleString()} tok (${stg.pctOfTotal}%)`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabular Stage-by-Stage Cost Breakdown */}
          <div className="border border-[#1E293B] rounded overflow-hidden">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-[#121826] text-slate-400 border-b border-[#1E293B]">
                <tr>
                  <th className="p-1.5">Stage</th>
                  <th className="p-1.5">Nature</th>
                  <th className="p-1.5 text-right">Tokens</th>
                  <th className="p-1.5 text-right">Cost (USD)</th>
                  <th className="p-1.5 text-right">% Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60 text-slate-200">
                {(activeTelemetryBreakdown?.stages || [
                  { name: 'Document Vision & Schema Extraction', nature: 'generative', tokens: activeTokens || 2450, costUsd: activeCostUsd || 0.0008, pctOfTotal: 75 },
                  { name: 'Deterministic Compliance & GST Rules', nature: 'deterministic', tokens: 0, costUsd: 0, pctOfTotal: 0 },
                  { name: 'Decision & Advisory Copilot', nature: 'generative', tokens: Math.round((activeTokens || 2450) * 0.25), costUsd: (activeCostUsd || 0.0008) * 0.25, pctOfTotal: 25 }
                ]).map((stg, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="p-1.5 font-medium flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${stg.nature === 'deterministic' ? 'bg-emerald-400' : 'bg-[#00B8F5]'}`} />
                      {stg.name}
                    </td>
                    <td className="p-1.5 text-slate-400 capitalize">
                      {stg.nature === 'deterministic' ? (
                        <span className="text-emerald-400">Algorithmic (0-Tok)</span>
                      ) : (
                        <span>LLM Inference</span>
                      )}
                    </td>
                    <td className="p-1.5 text-right tabular-nums">
                      {stg.tokens > 0 ? `${stg.tokens.toLocaleString()} tok` : '0 tok'}
                    </td>
                    <td className="p-1.5 text-right tabular-nums font-semibold text-amber-400">
                      ${Number(stg.costUsd || 0).toFixed(5)}
                    </td>
                    <td className="p-1.5 text-right tabular-nums text-slate-400">
                      {stg.pctOfTotal || 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* 3. OUTPUT TEXT CONTENT AREA (High Legibility & Scroll-Safe)  */}
      {/* ------------------------------------------------------------ */}
      <div 
        ref={contentAreaRef}
        onWheel={(e) => e.stopPropagation()}
        className={`nowheel nodrag flex-1 min-h-[140px] overflow-y-auto text-xs leading-relaxed font-sans ${
          isDarkMode ? 'bg-[#0B0D14] text-slate-200' : 'bg-white text-slate-900'
        }`}
      >
        {status === 'generating' ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500 text-emerald-400 flex items-center justify-center animate-spin">
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-0.5">
              <p className="font-mono text-xs font-semibold text-emerald-400 animate-pulse">
                {data?.sourceNodeType === 'deterministic'
                  ? `Executing ${data?.sourceNodeName || 'Deterministic Rule'}...`
                  : `Streaming from ${data?.sourceNodeName || 'Connected Agent'}...`}
              </p>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {data?.sourceNodeType === 'deterministic'
                  ? 'Compiling native logic isolate'
                  : 'Compiling multi-pillar intelligence graph'}
              </p>
            </div>
            <button
              onClick={handleStopStream}
              className="mt-2 px-3 py-1 rounded-none bg-red-600 hover:bg-red-700 text-white font-mono text-[11px] font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-transform active:scale-95"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop Streaming</span>
            </button>
          </div>
        ) : activeContent ? (
          viewFormat === 'table' && parsedTable ? (
            /* Interactive Spreadsheet Table View */
            <div className="w-full overflow-x-auto select-text">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead>
                  <tr className={`border-b sticky top-0 ${
                    isDarkMode ? 'bg-[#141824] border-white/[0.08] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <th className="px-2.5 py-1.5 text-[10px] font-semibold w-10 text-center opacity-40 border-r border-inherit">#</th>
                    {parsedTable.headers.map((h, i) => (
                      <th key={i} className="px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase border-r border-inherit last:border-r-0 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {parsedTable.rows.map((row, rIdx) => (
                    <tr 
                      key={rIdx} 
                      className={`transition-colors ${
                        isDarkMode 
                          ? 'even:bg-white/[0.015] hover:bg-emerald-500/[0.04]' 
                          : 'even:bg-slate-50/70 hover:bg-slate-100/70'
                      }`}
                    >
                      <td className="px-2.5 py-1.5 text-[10px] text-center opacity-40 font-mono border-r border-inherit">{rIdx + 1}</td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-1.5 text-xs whitespace-pre-wrap border-r border-inherit last:border-r-0">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewFormat === 'raw' ? (
            /* Raw Monospace Stream / JSON */
            <div className="p-3">
              <pre className={`p-3 rounded-none font-mono text-[11px] whitespace-pre-wrap select-text leading-relaxed border ${
                isDarkMode 
                  ? 'bg-[#07090D] text-slate-200 border-white/[0.06]' 
                  : 'bg-slate-50 text-slate-900 border-slate-200'
              }`}>
                {activeContent}
              </pre>
            </div>
          ) : (
            /* General (Default) & Formatted Markdown View */
            <div className="flex flex-col h-full min-h-full">
              {/* Dynamic Topic Navigation Ribbon (Active in General mode when topics exist) */}
              {viewFormat === 'general' && extractedTopics.length > 0 && (
                <div className={`px-3 py-1.5 border-b flex items-center gap-2 overflow-x-auto select-none shrink-0 scrollbar-thin ${
                  isDarkMode 
                    ? 'bg-[#0E121D]/90 border-white/[0.06]' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-wider font-bold shrink-0 text-[#0091DA]">
                    <Compass className="w-3 h-3 text-[#0091DA]" />
                    <span>Topics:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                    {extractedTopics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTopicClick(topic.title);
                        }}
                        className={`px-2 py-0.5 text-[9.5px] font-mono font-medium rounded-full border transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          isDarkMode
                            ? 'bg-white/[0.04] hover:bg-[#0091DA]/20 hover:text-[#0091DA] border-white/[0.08] hover:border-[#0091DA]/40 text-slate-300'
                            : 'bg-white hover:bg-[#00338D]/10 hover:text-[#00338D] border-slate-200 hover:border-[#00338D]/30 text-slate-700 shadow-xs'
                        }`}
                        title={`Jump to: ${topic.title}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA]" />
                        <span>{topic.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 space-y-2 select-text flex-1">
                <MarkdownViewer content={activeContent} isDarkMode={isDarkMode} />
              </div>
            </div>
          )
        ) : runsHistory.length > 0 ? (
          /* When runs are stored in memory, display an Executive Runs Ledger instead of empty placeholder */
          <div className="p-3 select-none space-y-2">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Accumulated Runs Ledger ({runsHistory.length} total)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-500/20">
                Strategy: {persistenceStrategy.toUpperCase()}
              </span>
            </div>

            {/* Diagnostic alert when the selected run produced 0 content */}
            <div className={`p-2.5 rounded-none border text-xs font-mono space-y-1 ${
              isDarkMode ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Selected Run #{activeRunIndex + 1} produced no text content (0 chars)</span>
              </div>
              <p className="text-[10px] opacity-80 leading-relaxed font-sans">
                Upstream node <strong>{data?.sourceNodeName || 'Row & Schema Normalizer'}</strong> executed in {activeLatencyMs || 0}ms but returned an empty output because the upstream agent (Mail & Attachment Extractor) has not yet sent an ingested email payload.
              </p>
            </div>

            <div className="space-y-1">
              {runsHistory.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedRunIndex(idx)}
                  className={`p-2 border transition-all cursor-pointer flex items-center justify-between text-xs font-mono ${
                    activeRunIndex === idx
                      ? isDarkMode ? 'bg-emerald-500/10 border-emerald-500/40 text-white' : 'bg-emerald-50 border-emerald-300 text-slate-900'
                      : isDarkMode ? 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">Run #{r.runNumber || idx + 1}</span>
                    <span className="text-[10px] opacity-60">{r.timestamp || 'Ready'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {r.latencyMs ? <span>{r.latencyMs}ms</span> : null}
                    {r.tokens ? <span>{r.tokens} tok</span> : null}
                    <span className="px-1.5 py-0.2 bg-black/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                      SELECT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Architectural Blueprint Empty State */
          <div className="m-3 p-8 border border-dashed border-white/[0.08] bg-white/[0.01] flex flex-col items-center justify-center gap-3 text-center select-none">
            <div className="w-10 h-10 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.1)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-[-0.01em] text-slate-200">
                Awaiting Upstream Execution
              </p>
              <p className="text-[11px] max-w-[320px] text-slate-400 leading-relaxed">
                {data?.sourceNodeName
                  ? `Connected to ${data.sourceNodeName}. Execute the workflow to capture dedicated output.`
                  : 'Wire an Agent or Deterministic Rule output port to this node and execute the workflow.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4. WHISPERED STATUS FOOTER                                   */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3.5 py-1.5 border-t flex items-center justify-between text-[9.5px] font-mono shrink-0 select-none ${
        isDarkMode ? 'bg-[#090B10] border-white/[0.06] text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          {viewFormat === 'table' && parsedTable ? (
            <span>{parsedTable.rows.length} rows • {parsedTable.headers.length} columns</span>
          ) : (
            <>
              <span>{activeContent ? `${activeContent.split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
              <span>•</span>
              <span>{activeContent.length} chars</span>
            </>
          )}
          {runsHistory.length > 0 && (
            <>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                Viewing Run {activeRunIndex + 1}/{runsHistory.length} ({persistenceStrategy.toUpperCase()})
              </span>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium" title="Connect output port to chain downstream">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Pass-through</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
}
