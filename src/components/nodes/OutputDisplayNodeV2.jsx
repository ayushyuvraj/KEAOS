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
  Database,
  AlertTriangle,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Presentation,
  FileCode,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  Code2,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  ExternalLink,
  Flame,
  CheckCircle2,
  Terminal
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
 * Intelligent parser that converts raw outputs (JSON objects, markdown tables, CSV)
 * into structured columns and rows with type awareness.
 */
function parseTableDataV2(raw) {
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

  // 2. Single JSON Object with array values or key-value entries
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const obj = JSON.parse(text);
      if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj);
        // Find if any key contains an array of objects (common LLM pattern)
        const arrayKey = keys.find(k => Array.isArray(obj[k]) && obj[k].length > 0 && typeof obj[k][0] === 'object');
        if (arrayKey) {
          const arr = obj[arrayKey];
          const headers = Array.from(new Set(arr.flatMap(item => Object.keys(item))));
          const rows = arr.map(item => headers.map(h => item[h] !== undefined ? String(item[h]) : ''));
          return { headers, rows, title: arrayKey };
        }
        // Fallback: key-value summary table
        const headers = ['Property', 'Value'];
        const rows = keys.map(k => [k, typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k])]);
        return { headers, rows, title: 'Key-Value Properties' };
      }
    } catch {}
  }

  // 3. Markdown table (| col1 | col2 |)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length >= 2) {
    const parseRow = (line) => line.slice(1, -1).split('|').map(c => c.trim());
    const headers = parseRow(tableLines[0]);
    const dataLines = tableLines.slice(1).filter(l => !/^[|\s-:]+$/.test(l));
    const rows = dataLines.map(parseRow);
    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }

  // 4. CSV format (comma-separated with header)
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
          result.push(current.trim());
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
 * OutputArtifactPortalIcon / ArtifactStudioGlyph:
 * Official Neon Cyber-Portal Output Emblem from User Design Specification:
 * - Glowing concentric cyan-to-purple portal ring with angular exit notch
 * - Center verified document with dog-ear corner fold & checkmark
 * - Aerodynamic dynamic curved output/export arrow emerging outward
 */
/**
 * OutputPortalLineIcon:
 * Bespoke Single-Line Vector Icon designed to match all other institutional KEAOS nodes:
 * - Outer Portal Ring with Right Exit Opening & Chamfered Lips
 * - Verified Document with Folded Dog-Ear Corner
 * - Checkmark inside Document
 * - Aerodynamic Curved Outgoing Arrow through Portal Opening
 * Pure SVG stroke="currentColor", strokeWidth="1.75", zero raster blur.
 */
export function OutputPortalLineIcon({ className = "w-6 h-6", strokeWidth = 1.75, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Outer Portal Ring with Right Exit Opening & Chamfered Lips */}
      <path d="M 19 5 L 18 6.5 A 8.5 8.5 0 1 0 18 17.5 L 19 19" />

      {/* Verified Document with Folded Dog-Ear Corner */}
      <path d="M 6.5 6.5 H 10 L 12 8.5 V 16.5 A 1 1 0 0 1 11 17.5 H 6.5 A 1 1 0 0 1 5.5 16.5 V 7.5 A 1 1 0 0 1 6.5 6.5 Z" />
      <path d="M 10 6.5 V 8.5 H 12" />

      {/* Checkmark inside Document */}
      <path d="M 7.5 12.5 L 8.8 13.8 L 11 11.2" />

      {/* Aerodynamic Curved Outgoing Arrow through Portal Opening */}
      <path d="M 10 15 C 12.5 15 15 13.5 21 12 M 17.5 8.8 L 21 12 L 17.5 15.2" />
    </svg>
  );
}

export const OutputArtifactPortalIcon = OutputPortalLineIcon;
export const ArtifactStudioGlyph = OutputPortalLineIcon;

/**
 * OutputDisplayNodeV2 — Output Viewer v2.0 (Artifact Studio)
 * 
 * Re-imagined square canvas artifact viewer inspired by Emil Kowalski, Linear, and Apple Intelligence.
 * Preserves 100% of functional capabilities while delivering modern craft, proportional square geometry,
 * smooth tactile interactions, and zero-jitter handle anchoring.
 */
export default function OutputDisplayNodeV2({ id, data, selected }) {
  const isDarkMode = data.isDarkMode !== undefined 
    ? data.isDarkMode 
    : !document.documentElement.classList.contains('light');
  const isDeactivated = Boolean(data.isDeactivated);
  const isLocked = Boolean(data.isLocked);

  // Expanded state
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false);

  useEffect(() => {
    if (data.isExpanded !== undefined) {
      setIsExpanded(data.isExpanded);
    }
  }, [data.isExpanded]);

  // Dimension state: Symmetrical Square default (520px x 520px)
  const [customSize, setCustomSize] = useState({
    width: data.width || 520,
    height: data.height || 520
  });

  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [viewFormat, setViewFormat] = useState('formatted'); // 'formatted' | 'table' | 'json'
  const [tableSearch, setTableSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ colIndex: -1, direction: 'asc' });

  // Node Title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [nodeTitle, setNodeTitle] = useState(data.name || data.title || 'Output Viewer v2.0');

  useEffect(() => {
    if (data.name && data.name !== nodeTitle) {
      setNodeTitle(data.name);
    }
  }, [data.name]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const trimmed = nodeTitle.trim() || 'Output Viewer v2.0';
    setNodeTitle(trimmed);
    if (data.onRename) {
      data.onRename(id, trimmed);
    } else if (data.onUpdateNodeData) {
      data.onUpdateNodeData(id, { name: trimmed });
    }
  };

  const contentAreaRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const settingsPopoverRef = useRef(null);

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
  const [persistenceStrategy, setPersistenceStrategy] = useState(data.persistenceStrategy || 'append');
  const [filenamePrefix, setFilenamePrefix] = useState(data.filenamePrefix || 'Intelligence_Artifact_v2');
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

  const [selectedRunIndex, setSelectedRunIndex] = useState(-1);

  // Sync runsHistory externally
  useEffect(() => {
    if (Array.isArray(data.runsHistory)) {
      setRunsHistory(data.runsHistory);
      if (data.runsHistory.length === 0) {
        lastProcessedContentRef.current = '';
      }
    }
  }, [data.runsHistory]);

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

  // Morph transition state: 'idle' | 'expanding' | 'collapsing'
  const [morphState, setMorphState] = useState('idle');

  // Click outside & Escape key to dismiss open popovers
  useEffect(() => {
    if (!isExportMenuOpen && !isSettingsOpen) return;

    const handleClickOutside = (e) => {
      // If export menu is open and click was outside its container
      if (isExportMenuOpen && exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
      // If settings popover is open and click was outside its container
      if (isSettingsOpen && settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsExportMenuOpen(false);
        setIsSettingsOpen(false);
      }
    };

    // Capture phase guarantees catching clicks anywhere on canvas or inside viewer even if stopPropagation was called
    document.addEventListener('pointerdown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportMenuOpen, isSettingsOpen]);

  // Wheel listener to strictly isolate mouse scroll from zooming canvas
  useEffect(() => {
    const el = contentAreaRef.current;
    if (!el) return;
    const stopWheelZoom = (e) => e.stopPropagation();
    el.addEventListener('wheel', stopWheelZoom, { passive: true });
    return () => el.removeEventListener('wheel', stopWheelZoom);
  }, [isExpanded]);

  // Active run resolution
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

  // Parse table data
  const parsedTable = useMemo(() => {
    if (runsHistory.length > 0 && runsHistory[activeRunIndex]?.tableData) {
      const parsed = parseTableDataV2(runsHistory[activeRunIndex].tableData);
      if (parsed) return parsed;
    }
    return parseTableDataV2(activeContent);
  }, [runsHistory, activeRunIndex, activeContent]);

  const hasTableData = Boolean(parsedTable && parsedTable.headers.length > 0);

  // Filtered and sorted table rows
  const processedTable = useMemo(() => {
    if (!parsedTable) return null;
    let { headers, rows } = parsedTable;

    if (tableSearch.trim()) {
      const query = tableSearch.toLowerCase();
      rows = rows.filter(r => r.some(cell => String(cell).toLowerCase().includes(query)));
    }

    if (sortConfig.colIndex >= 0) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sortConfig.colIndex] || '';
        const valB = b[sortConfig.colIndex] || '';
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }
        return sortConfig.direction === 'asc' 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
    }

    return { headers, rows };
  }, [parsedTable, tableSearch, sortConfig]);

  const handleSort = (colIndex) => {
    setSortConfig(curr => {
      if (curr.colIndex === colIndex) {
        if (curr.direction === 'asc') return { colIndex, direction: 'desc' };
        return { colIndex: -1, direction: 'asc' };
      }
      return { colIndex, direction: 'asc' };
    });
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

  const handleExpand = (e) => {
    if (e) e.stopPropagation();
    if (morphState !== 'idle') return;
    setMorphState('expanding');
    setTimeout(() => {
      setIsExpanded(true);
      if (data?.onUpdateNodeData) {
        data.onUpdateNodeData(id, { isExpanded: true });
      }
      setTimeout(() => {
        setMorphState('idle');
      }, 260);
    }, 70);
  };

  const handleCollapse = (e) => {
    if (e) e.stopPropagation();
    if (morphState !== 'idle') return;
    setIsExportMenuOpen(false);
    setIsSettingsOpen(false);
    setMorphState('collapsing');
    setTimeout(() => {
      setIsExpanded(false);
      setMorphState('idle');
      if (data?.onUpdateNodeData) {
        data.onUpdateNodeData(id, { isExpanded: false });
      }
    }, 180);
  };

  const toggleExpand = (e) => {
    if (isExpanded) {
      handleCollapse(e);
    } else {
      handleExpand(e);
    }
  };

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    } else {
      window.dispatchEvent(new CustomEvent('keaos:delete-node', { detail: { nodeId: id } }));
    }
  };

  const handleStopStream = (e) => {
    if (e) e.stopPropagation();
    window.dispatchEvent(new CustomEvent('keaos:cancel-execution'));
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
      window.dispatchEvent(new CustomEvent('keaos:toast', {
        detail: { message: '⚠️ No output data available to export yet.' }
      }));
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

  // Manual Drag Resizer for smooth tactile sizing
  const startManualResize = (e, direction = 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = customSize.width || 520;
    const startHeight = customSize.height || 520;

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setCustomSize({
        width: direction === 'vertical' 
          ? startWidth 
          : Math.max(380, Math.min(1200, startWidth + deltaX)),
        height: direction === 'horizontal' 
          ? startHeight 
          : Math.max(380, Math.min(1100, startHeight + deltaY))
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
  // VIEW 1: COLLAPSED CIRCULAR BADGE (High-Craft Concentric Disc Token)
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
          onOpenChat={() => handleExpand()}
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

        {/* 56px Concentric Morphing Button with Anchored Handles */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          {/* Input Handle (Left) - Pinned at top: 28px for zero-jitter wire */}
          <Handle
            type="target"
            position={Position.Left}
            id="data-in"
            style={{
              top: '28px',
              left: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : '#0091DA',
              borderColor: isDarkMode ? '#0F1219' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="Input: Connect Agent or Tool output stream"
          />

          {/* Morphing Circular Button with Tactile Physics & Single-Line Cyber-Portal Icon */}
          <button
            onClick={handleExpand}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xl active:scale-95 group/btn relative overflow-hidden ${
              morphState === 'expanding' ? 'animate-circle-exit' : 'animate-circle-enter'
            } ${
              isExecuting
                ? 'ring-4 ring-cyan-400/50 border-2 border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.55)] scale-105'
                : selected 
                  ? 'ring-4 ring-cyan-500/40 border-2 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.35)]' 
                  : isDarkMode 
                    ? 'border border-white/15 hover:border-cyan-400 bg-[#1E2026] text-cyan-400 shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:scale-105' 
                    : 'border border-slate-200 hover:border-cyan-500 bg-white text-cyan-600 shadow-[0_8px_24px_rgba(0,30,80,0.08)] hover:scale-105'
            }`}
            title="Click to expand Output Viewer v2.0 (Artifact Studio)"
          >
            {/* Animated Concentric Sonar Wave when Active */}
            {isExecuting && (
              <>
                <span className="absolute -inset-2 rounded-full animate-ping opacity-50 bg-cyan-400 pointer-events-none" />
                <span className="absolute -inset-1 rounded-full animate-pulse opacity-40 bg-cyan-400 pointer-events-none" />
              </>
            )}

            {/* Core Single-Line Vector Icon */}
            {status === 'generating' ? (
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            ) : (
              <OutputPortalLineIcon 
                className="w-7 h-7 transition-transform duration-200 group-hover/btn:scale-110 drop-shadow-sm" 
              />
            )}

            {/* Subtle Run Count Indicator Pill (Top Right, if runs exist) */}
            {runsHistory.length > 0 && (
              <span className="absolute top-1 right-1 px-1 py-0.2 rounded-full bg-cyan-500 text-white text-[7px] font-mono font-bold shadow-sm pointer-events-none">
                {runsHistory.length}
              </span>
            )}
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
              borderRadius: '2px',
              backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : (isDarkMode ? '#34D399' : '#0091DA'),
              borderColor: isDarkMode ? '#0F1219' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="Pass-through: Pipe this output to downstream agent"
          />
        </div>

        {/* Node Name under Circle (Centered Frosted Capsule) */}
        <div 
          onClick={handleExpand}
          className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-auto select-none flex flex-col items-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
        >
          <div className={`px-2.5 py-0.5 rounded-full border backdrop-blur-md max-w-[200px] inline-flex items-center gap-1.5 shadow-sm ${
            isDarkMode 
              ? 'bg-[#141822]/90 border-white/10 text-white shadow-[0_4px_16px_rgba(0,0,0,0.5)]' 
              : 'bg-white/95 border-cyan-300 text-slate-800 shadow-[0_4px_16px_rgba(0,30,80,0.1)]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDarkMode ? 'bg-cyan-400' : 'bg-cyan-500'}`} />
            <span className="text-[10px] font-semibold tracking-tight truncate">
              {nodeTitle}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EXPANDED VIEWER v2.0 (The Symmetrical Square Artifact Studio)
  // =========================================================================
  return (
    <div 
      onWheel={(e) => e.stopPropagation()}
      style={{
        width: `${customSize.width}px`,
        height: `${customSize.height}px`,
        minWidth: '380px',
        minHeight: '380px'
      }}
      className={`nowheel relative flex flex-col rounded-2xl border select-text overflow-hidden ${
        morphState === 'collapsing' 
          ? 'animate-artifact-collapse' 
          : 'animate-artifact-expand'
      } ${
        isDeactivated ? 'opacity-40 grayscale' : 'opacity-100'
      } ${
        isExecuting
          ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.35)]'
          : selected 
            ? 'ring-2 ring-emerald-500 border-emerald-500/80 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)]' 
            : isDarkMode 
              ? 'bg-[#0E121B]/95 border-white/10 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl' 
              : 'bg-white/95 border-slate-200 shadow-[0_20px_50px_-12px_rgba(0,30,80,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl'
      }`}
    >
      {/* Precision Glowing Top Accent Rim */}
      <div className={`h-[2px] w-full shrink-0 transition-opacity ${
        isExecuting 
          ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 animate-pulse' 
          : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
      }`} />

      {/* Floating Micro-Toolbar on Hover for Expanded Studio */}
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
            minWidth={380}
            minHeight={380}
            maxWidth={1200}
            maxHeight={1100}
            isVisible={true}
            lineClassName="!border-emerald-500 hover:!border-2 !opacity-30 hover:!opacity-100 transition-opacity"
            handleClassName="!w-2.5 !h-2.5 !bg-emerald-500 !border-2 !border-white !rounded-full hover:!scale-125 transition-transform"
            onResize={(_, params) => {
              setCustomSize({
                width: params.width,
                height: params.height
              });
            }}
          />

          {/* Corner diagonal resizer */}
          <div
            onPointerDown={(e) => startManualResize(e, 'both')}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-colors"
            title="Drag corner to resize square studio"
          >
            <svg width="9" height="9" viewBox="0 0 10 10" className="fill-current opacity-70">
              <path d="M8 2L2 8M8 5L5 8M8 8L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}

      {/* Input Handle (Left) - Zero Jitter pinned at top: 28px */}
      <Handle
        type="target"
        position={Position.Left}
        id="data-in"
        style={{
          top: '28px',
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#0E121B' : '#FFFFFF',
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
          borderRadius: '2px',
          backgroundColor: status === 'ready' || runsHistory.length > 0 ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#0E121B' : '#FFFFFF',
          borderWidth: '2px',
          right: '-6px'
        }}
        title="Pass-through: Pipe this output to downstream agent"
      />

      {/* ============================================================ */}
      {/* 1. ELEGANT HEADER TIER: Identity & Status (Left) + Tabs & Actions (Right) */}
      {/* ============================================================ */}
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2.5 shrink-0 select-none overflow-hidden ${
        isDarkMode ? 'border-white/[0.08] bg-[#121622]/85' : 'border-slate-100 bg-slate-50/90'
      }`}>
        {/* Left: Avatar with Live Status Dot + Node Title + Status Chip */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Avatar Icon with Live Precision Beacon */}
          <div className={`relative w-6 h-6 rounded-md border flex items-center justify-center shrink-0 shadow-sm ${
            isDarkMode ? 'bg-[#1E2026] border-white/15 text-cyan-400' : 'bg-white border-slate-200 text-cyan-600'
          }`}>
            <OutputPortalLineIcon className="w-3.5 h-3.5" />
            {/* Live status dot */}
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border ${
              isDarkMode ? 'border-[#121622]' : 'border-white'
            } ${
              status === 'generating' 
                ? 'bg-blue-400 animate-ping' 
                : status === 'ready' || runsHistory.length > 0 
                  ? 'bg-emerald-400' 
                  : 'bg-slate-400'
            }`} />
          </div>

          {/* Editable Node Title */}
          {isEditingTitle ? (
            <input
              type="text"
              value={nodeTitle}
              onChange={(e) => setNodeTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              autoFocus
              className="nodrag nowheel text-xs font-semibold text-white bg-transparent border-b border-emerald-400 outline-none px-0.5 py-0 max-w-[130px]"
            />
          ) : (
            <span
              onClick={() => {
                if (isLocked) return;
                setIsEditingTitle(true);
              }}
              title={isLocked ? 'Workflow is locked' : 'Click to rename'}
              className={`text-xs font-semibold tracking-tight truncate max-w-[130px] ${
                isLocked ? 'cursor-default' : 'cursor-text hover:underline decoration-dashed decoration-emerald-400/60'
              } ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
            >
              {nodeTitle}
            </span>
          )}

          {/* Micro Status Chip (Never overlaps: stays inline, neatly styled) */}
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-semibold tracking-wider border shrink-0 ${
            status === 'generating'
              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse'
              : status === 'ready' || runsHistory.length > 0
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : isDarkMode ? 'bg-white/5 text-slate-400 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            <span className={`w-1 h-1 rounded-full ${
              status === 'generating' 
                ? 'bg-blue-400 animate-ping' 
                : status === 'ready' || runsHistory.length > 0 
                  ? 'bg-emerald-400' 
                  : 'bg-slate-400'
            }`} />
            <span className="uppercase text-[7.5px]">
              {status === 'generating' ? 'STREAM' : status === 'ready' || runsHistory.length > 0 ? 'READY' : 'IDLE'}
            </span>
          </span>
        </div>

        {/* Right: Consolidated Controls (Segmented Switcher + Divider + Action Buttons) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Segmented Glass Pill Switcher */}
          <div className={`p-0.5 rounded-xl border flex items-center shrink-0 ${
            isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-200/60 border-slate-300/60'
          }`}>
            <button
              onClick={() => setViewFormat('formatted')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all duration-150 cursor-pointer flex items-center gap-1 active:scale-[0.93] ${
                viewFormat === 'formatted'
                  ? isDarkMode 
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs border border-emerald-500/30' 
                    : 'bg-white text-emerald-700 font-semibold shadow-xs border border-emerald-500/20'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Rendered Markdown View"
            >
              <FileText className="w-3 h-3" />
              <span>Formatted</span>
            </button>

            <button
              onClick={() => setViewFormat('table')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all duration-150 cursor-pointer flex items-center gap-1 active:scale-[0.93] ${
                viewFormat === 'table'
                  ? isDarkMode 
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs border border-emerald-500/30' 
                    : 'bg-white text-emerald-700 font-semibold shadow-xs border border-emerald-500/20'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Interactive Table Grid"
            >
              <TableIcon className="w-3 h-3" />
              <span>Table</span>
              {hasTableData && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setViewFormat('json')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all duration-150 cursor-pointer flex items-center gap-1 active:scale-[0.93] ${
                viewFormat === 'json'
                  ? isDarkMode 
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-xs border border-emerald-500/30' 
                    : 'bg-white text-emerald-700 font-semibold shadow-xs border border-emerald-500/20'
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Raw Monospace / JSON Stream"
            >
              <Code2 className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>

          <div className="w-px h-3.5 bg-white/10 mx-0.5" />

          {/* Quick Copy */}
          <button
            onClick={handleCopy}
            disabled={!activeContent}
            className={`p-1.5 rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.88] ${
              isDarkMode 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
            } ${!activeContent ? 'opacity-30 cursor-not-allowed' : ''}`}
            title="Copy Output Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExportMenuOpen(prev => !prev);
                setIsSettingsOpen(false);
              }}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all duration-150 cursor-pointer active:scale-[0.93] border ${
                isExportMenuOpen 
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                  : isDarkMode 
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}
              title="Export Output to multiple formats"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
              <ChevronDown className={`w-2.5 h-2.5 opacity-70 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Export Popover */}
            {isExportMenuOpen && (
              <div 
                className={`absolute right-0 top-full mt-1.5 w-52 rounded-xl border shadow-2xl z-50 p-1.5 select-none transition-all duration-150 animate-popover-enter ${
                  isDarkMode ? 'bg-[#0E121B] border-white/10 text-slate-200 shadow-black/80' : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/30'
                }`}
              >
                <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 border-b border-white/5 mb-1">
                  Format Exporters
                </div>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-emerald-500/15 hover:text-emerald-400 text-xs transition-all duration-150 cursor-pointer active:scale-[0.96] hover:translate-x-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Microsoft Excel / CSV</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-red-500/15 hover:text-red-400 text-xs transition-all duration-150 cursor-pointer active:scale-[0.96] hover:translate-x-1"
                >
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  <span>Executive PDF Report</span>
                </button>
                <button
                  onClick={() => handleExport('pptx')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-amber-500/15 hover:text-amber-400 text-xs transition-all duration-150 cursor-pointer active:scale-[0.96] hover:translate-x-1"
                >
                  <Presentation className="w-3.5 h-3.5 text-amber-400" />
                  <span>PowerPoint Slides</span>
                </button>
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-500/15 text-xs transition-all duration-150 cursor-pointer active:scale-[0.96] hover:translate-x-1"
                >
                  <FileText className="w-3.5 h-3.5 opacity-60" />
                  <span>Plain Text (.txt)</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-purple-500/15 hover:text-purple-400 text-xs transition-all duration-150 cursor-pointer active:scale-[0.96] hover:translate-x-1"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Markdown (.md)</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-cyan-500/15 hover:text-cyan-400 text-xs transition-all duration-150 cursor-pointer active:scale-[0.96] hover:translate-x-1"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Structured JSON (.json)</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings Popover */}
          <div className="relative" ref={settingsPopoverRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSettingsOpen(prev => !prev);
                setIsExportMenuOpen(false);
              }}
              className={`p-1.5 rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.88] ${
                isSettingsOpen 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : isDarkMode 
                    ? 'border-white/10 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10' 
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100'
              }`}
              title="Configure Output Strategy & History"
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 transition-transform duration-200 ${isSettingsOpen ? 'rotate-90 text-emerald-400' : ''}`} />
            </button>

            {isSettingsOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute right-0 top-full mt-1.5 w-72 rounded-xl border shadow-2xl z-50 p-3 select-none transition-all duration-150 animate-popover-enter space-y-3 ${
                  isDarkMode ? 'bg-[#0E121B] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Persistence Strategy
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">v2.0 Core</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    { id: 'append', label: 'Append Row / Entry (Default)', desc: 'Accumulate runs in unified table' },
                    { id: 'new_sheet', label: 'New Sheet / Slide per Run', desc: 'Create separate tab per run' },
                    { id: 'new_doc', label: 'New Versioned File', desc: 'Create timestamped versioned file' },
                    { id: 'overwrite', label: 'Overwrite (Latest Only)', desc: 'Displays only the freshest execution output' }
                  ].map(strat => (
                    <label 
                      key={strat.id} 
                      className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                        persistenceStrategy === strat.id 
                          ? isDarkMode ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'
                          : isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="persistenceStrategyV2" 
                        value={strat.id}
                        checked={persistenceStrategy === strat.id}
                        onChange={() => {
                          setPersistenceStrategy(strat.id);
                          if (data.onUpdateNodeData) data.onUpdateNodeData(id, { persistenceStrategy: strat.id });
                        }}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div>
                        <div className="font-medium text-[11px]">{strat.label}</div>
                        <div className="text-[9.5px] opacity-60 leading-tight">{strat.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
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
                      className={`px-2 py-0.5 text-[11px] border font-mono outline-none rounded-lg w-36 ${
                        isDarkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] opacity-60 font-mono">
                      {runsHistory.length} run{runsHistory.length !== 1 ? 's' : ''} stored
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 transition-all duration-150 flex items-center gap-1 cursor-pointer active:scale-[0.92]"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset Runs</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Minimize back to Circular Token */}
          <button
            onClick={handleCollapse}
            className={`p-1.5 rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.88] ${
              isDarkMode 
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title="Minimize to circular token"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete / Close */}
          {!isLocked && (
            <button
              onClick={handleClose}
              className={`p-1.5 rounded-lg border transition-all duration-150 cursor-pointer active:scale-[0.88] ${
                isDarkMode 
                  ? 'border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' 
                  : 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title="Remove from canvas"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. THE HERO CONTENT STAGE                                    */}
      {/* ============================================================ */}
      <div 
        ref={contentAreaRef}
        className="flex-1 overflow-auto p-4 custom-scrollbar select-text min-h-0"
      >
        {status === 'generating' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
              <span className="absolute -inset-1 rounded-2xl bg-emerald-500/20 animate-ping pointer-events-none" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold text-emerald-400 animate-pulse">
                {data?.sourceNodeType === 'deterministic'
                  ? `Executing ${data?.sourceNodeName || 'Deterministic Rule'}...`
                  : `Streaming from ${data?.sourceNodeName || 'Connected Agent'}...`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {data?.sourceNodeType === 'deterministic'
                  ? 'Compiling native logic isolate'
                  : 'Synthesizing live multimodal response'}
              </p>
            </div>
            <button
              onClick={handleStopStream}
              className="mt-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-all duration-150 active:scale-[0.93]"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop Streaming</span>
            </button>
          </div>
        )}

        {/* When runs are stored in memory, display an Executive Runs Ledger instead of empty placeholder */}
        {!activeContent && status !== 'generating' && runsHistory.length > 0 && (
          <div className="p-3 select-none space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Accumulated Runs Ledger ({runsHistory.length} total)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Strategy: {persistenceStrategy.toUpperCase()}
              </span>
            </div>

            {/* Diagnostic alert when the selected run produced 0 content */}
            <div className={`p-2.5 rounded-xl border text-xs font-mono space-y-1 ${
              isDarkMode ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Selected Run #{activeRunIndex + 1} produced no text content (0 chars)</span>
              </div>
              <p className="text-[10px] opacity-80 leading-relaxed font-sans">
                Upstream node <strong>{data?.sourceNodeName || 'Connected Node'}</strong> executed in {activeLatencyMs || 0}ms but returned an empty output.
              </p>
            </div>

            <div className="space-y-1">
              {runsHistory.map((r, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedRunIndex(idx)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs font-mono ${
                    activeRunIndex === idx
                      ? isDarkMode ? 'bg-emerald-500/15 border-emerald-500/50 text-white' : 'bg-emerald-50 border-emerald-300 text-slate-900'
                      : isDarkMode ? 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">Run #{r.runNumber || idx + 1}</span>
                    <span className="text-[10px] opacity-60">{r.timestamp || 'Ready'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    {r.latencyMs ? <span>{r.latencyMs}ms</span> : null}
                    {r.tokens ? <span>{r.tokens} tok</span> : null}
                    <span className="px-1.5 py-0.2 rounded bg-black/30 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                      SELECT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!activeContent && status !== 'generating' && runsHistory.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm ${
              isDarkMode ? 'bg-[#1E2026] border-white/15 text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-600'
            }`}>
              <OutputPortalLineIcon className="w-7 h-7" />
            </div>
            <div>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Awaiting Pipeline Execution
              </p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                {data?.sourceNodeName
                  ? `Connected to ${data.sourceNodeName}. Execute the workflow to capture dedicated output.`
                  : 'Connect an Agent, Execution Tool, or Trigger node to stream real-time results into this studio.'}
              </p>
            </div>
          </div>
        )}

        {/* View Mode A: Formatted Markdown */}
        {activeContent && viewFormat === 'formatted' && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed font-sans">
            <MarkdownViewer content={activeContent} />
          </div>
        )}

        {/* View Mode B: Interactive Data Table Grid */}
        {activeContent && viewFormat === 'table' && (
          <div className="space-y-2.5">
            {processedTable && processedTable.headers.length > 0 ? (
              <>
                {/* Table Filter & Row Counter Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className={`relative flex-1 max-w-xs flex items-center border rounded-lg px-2 py-1 text-xs ${
                    isDarkMode ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <Search className="w-3 h-3 text-slate-400 shrink-0 mr-1.5" />
                    <input
                      type="text"
                      placeholder="Filter rows..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="bg-transparent outline-none text-[11px] w-full"
                    />
                    {tableSearch && (
                      <button onClick={() => setTableSearch('')} className="text-slate-400 hover:text-white transition-all duration-140 active:scale-[0.85] cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {processedTable.rows.length} row{processedTable.rows.length !== 1 ? 's' : ''} · {processedTable.headers.length} cols
                  </span>
                </div>

                {/* Table Grid */}
                <div className={`border rounded-xl overflow-hidden shadow-xs ${
                  isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-white'
                }`}>
                  <div className="overflow-x-auto max-h-[340px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={`sticky top-0 z-10 ${
                        isDarkMode ? 'bg-[#141822] text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}>
                        <tr className="border-b border-white/10">
                          {processedTable.headers.map((h, i) => (
                            <th 
                              key={i} 
                              onClick={() => handleSort(i)}
                              className="px-3 py-2 text-[10.5px] font-semibold tracking-tight cursor-pointer hover:text-emerald-400 select-none transition-all duration-150 active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-1">
                                <span>{h}</span>
                                <ArrowUpDown className={`w-2.5 h-2.5 opacity-50 ${sortConfig.colIndex === i ? 'text-emerald-400 opacity-100' : ''}`} />
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                        {processedTable.rows.map((row, rIdx) => (
                          <tr 
                            key={rIdx} 
                            className={`transition-colors ${
                              isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
                            }`}
                          >
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-slate-300">
                                {cell || <span className="opacity-30 italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <TableIcon className="w-8 h-8 mx-auto opacity-40 text-emerald-400" />
                <p className="text-xs">No structured tabular data detected in this output.</p>
                <button
                  onClick={() => setViewFormat('formatted')}
                  className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all duration-150 active:scale-[0.94] cursor-pointer"
                >
                  Switch to Formatted View
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Mode C: Monospace JSON Stream */}
        {activeContent && viewFormat === 'json' && (
          <div className={`p-3.5 rounded-xl border font-mono text-[11px] leading-relaxed overflow-x-auto ${
            isDarkMode ? 'bg-[#0B0E14] border-white/10 text-emerald-300/90' : 'bg-slate-900 border-slate-800 text-emerald-400'
          }`}>
            <pre className="m-0 whitespace-pre-wrap select-text">{activeContent}</pre>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. TELEMETRY & RUN SCRUBBER DECK (Footer Tier)               */}
      {/* ============================================================ */}
      <div className={`px-3.5 py-2 border-t flex items-center justify-between gap-3 shrink-0 text-[10px] select-none ${
        isDarkMode ? 'border-white/[0.08] bg-[#121622]/80 text-slate-400' : 'border-slate-100 bg-slate-50/90 text-slate-600'
      }`}>
        {/* Left: Multi-Run Scrubber + Words/Chars Count */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden border-white/10 bg-black/20">
            <button
              onClick={() => setSelectedRunIndex(Math.max(0, activeRunIndex - 1))}
              disabled={activeRunIndex <= 0}
              className="p-1 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-140 active:scale-[0.85]"
              title="Previous Execution Run"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="px-2 py-0.5 font-mono font-semibold text-[10px] text-white">
              {runsHistory.length > 0 ? `Run ${activeRunIndex + 1} of ${runsHistory.length}` : 'Live Stream'}
            </span>
            <button
              onClick={() => setSelectedRunIndex(Math.min(runsHistory.length - 1, activeRunIndex + 1))}
              disabled={activeRunIndex >= runsHistory.length - 1}
              className="p-1 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-140 active:scale-[0.85]"
              title="Next Execution Run"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {runsHistory.length > 0 && (
            <span className="text-[9.5px] font-mono text-emerald-400 font-semibold hidden md:inline">
              ({persistenceStrategy.toUpperCase()})
            </span>
          )}

          {/* Upstream Source Badge in Footer */}
          {data?.sourceNodeType === 'deterministic' ? (
            <span className="font-semibold text-amber-400 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[8.5px] font-mono shrink-0 hidden sm:inline-flex" title={`Fed by ${data?.sourceNodeName || 'Deterministic Rule'}`}>
              <span>⚡</span>
              <span className="truncate max-w-[90px]">{data?.sourceNodeName || 'Deterministic Rule'}</span>
            </span>
          ) : (data?.sourceNodeType === 'agent' || data?.sourceNodeName) ? (
            <span className="font-semibold text-sky-400 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-[8.5px] font-mono shrink-0 hidden sm:inline-flex" title={`Fed by ${data?.sourceNodeName || 'Autonomous Agent'}`}>
              <span>🤖</span>
              <span className="truncate max-w-[90px]">{data?.sourceNodeName || 'Autonomous Agent'}</span>
            </span>
          ) : null}

          {runsHistory[activeRunIndex]?.timestamp && (
            <span className="text-[9.5px] opacity-60 font-mono hidden lg:inline">
              {runsHistory[activeRunIndex].timestamp}
            </span>
          )}

          {/* Word & Character Count / Table Rows & Cols */}
          <span className="opacity-30 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 opacity-70 font-mono text-[9.5px] hidden sm:flex">
            {viewFormat === 'table' && parsedTable ? (
              <span>{parsedTable.rows.length} rows · {parsedTable.headers.length} cols</span>
            ) : (
              <>
                <span>{activeContent ? `${activeContent.split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
                <span>·</span>
                <span>{activeContent.length} chars</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Observability Metrics + SHA-256 Provenance + Pass-through */}
        <div className="flex items-center gap-2 font-mono">
          {/* Tokens */}
          {activeTokens > 0 && (
            <div className="flex items-center gap-1 opacity-80" title="Total Tokens consumed">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="tabular-nums font-semibold">{activeTokens.toLocaleString()} tok</span>
            </div>
          )}

          {/* Latency */}
          {activeLatencyMs > 0 && (
            <div className="flex items-center gap-1 opacity-80" title="Execution Latency">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="tabular-nums font-semibold">{activeLatencyMs}ms</span>
            </div>
          )}

          {/* Cost */}
          {activeCostUsd > 0 && (
            <div className="flex items-center gap-0.5 text-emerald-400 font-semibold" title="Estimated Unit Cost">
              <span>${Number(activeCostUsd).toFixed(4)}</span>
            </div>
          )}

          {/* SHA-256 Provenance Seal */}
          {activeAuditHash && (
            <button
              onClick={handleCopyHash}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] transition-all duration-150 cursor-pointer active:scale-[0.92] ${
                copiedHash 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700'
              }`}
              title={`SHA-256 Cryptographic Seal: ${activeAuditHash} (Click to copy)`}
            >
              <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
              <span>{copiedHash ? 'COPIED' : `${activeAuditHash.slice(0, 6)}...`}</span>
            </button>
          )}

          {/* Pass-through downstream indicator */}
          <div className="flex items-center gap-1 text-emerald-400 font-medium pl-1 text-[9.5px]" title="Connect right port to pipe downstream">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="hidden sm:inline">Pass-through</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
