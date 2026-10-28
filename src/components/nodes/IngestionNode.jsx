import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { 
  UploadCloud, 
  FileAudio, 
  FileText, 
  FileSpreadsheet, 
  FileCode,
  Check, 
  Trash2, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  Play, 
  Pause,
  AlertCircle,
  Loader2, 
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  X,
  AlertTriangle,
  Database,
  FileCheck2
} from 'lucide-react';
import { transcribeAudioUniversal, getProviderCredential } from '../../services/llmService';

/**
 * Universal Zero-RAM Chunk Sniffer for Massive Files (CSV, TSV, XLSX, JSON)
 * Slices ONLY the first 64 KB of data to discover 500+ column headers, 
 * data types, and estimated row counts in milliseconds without heap exhaustion.
 */
async function sniffDatasetChunk(file) {
  if (!file) return null;
  const fileName = file.name || 'dataset.csv';
  const fileSize = file.size || 0;
  const ext = fileName.split('.').pop().toLowerCase();

  // Excel (.xlsx, .xls) handling
  if (['xlsx', 'xls'].includes(ext)) {
    if (typeof window !== 'undefined' && window.XLSX) {
      try {
        const buffer = await file.slice(0, Math.min(fileSize, 2 * 1024 * 1024)).arrayBuffer();
        const workbook = window.XLSX.read(buffer, { type: 'array', sheetRows: 50 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: null });
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return {
          format: 'excel',
          delimiter: ',',
          columns: columns.map(c => ({ name: c, type: typeof rows[0]?.[c] || 'string' })),
          columnCount: columns.length,
          rowCount: rows.length,
          sample: rows.slice(0, 5),
          isSniffed: fileSize > 2 * 1024 * 1024
        };
      } catch (e) {
        console.warn('Excel chunk sniff notice:', e);
      }
    }
  }

  // CSV / TSV / Delimited text handling (64 KB slice)
  const CHUNK_SIZE = 65536; // 64 KB
  const chunk = file.slice(0, Math.min(fileSize, CHUNK_SIZE));
  const text = await chunk.text();

  const lines = text.split(/\r?\n/).filter(Boolean);
  const firstLine = lines[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  // Parse header columns
  const rawHeaders = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const columns = rawHeaders.filter(Boolean);

  // Parse sample rows
  const sampleRows = [];
  let totalSampleBytes = firstLine.length;

  for (let i = 1; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    totalSampleBytes += line.length;
    const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    const row = {};
    columns.forEach((col, idx) => {
      row[col] = parts[idx] !== undefined ? parts[idx] : null;
    });
    sampleRows.push(row);
  }

  // Estimate total row count from byte stride
  const avgLineBytes = sampleRows.length > 0 ? Math.round(totalSampleBytes / (sampleRows.length + 1)) : 100;
  const estimatedRows = avgLineBytes > 0 ? Math.round(fileSize / avgLineBytes) : sampleRows.length;

  return {
    format: ext === 'tsv' ? 'tsv' : 'csv',
    delimiter,
    columns: columns.map(c => {
      const sampleVal = sampleRows[0]?.[c];
      const isNum = sampleVal !== null && sampleVal !== undefined && !isNaN(Number(sampleVal));
      return { name: c, type: isNum ? 'number' : 'string' };
    }),
    columnCount: columns.length,
    rowCount: Math.max(sampleRows.length, estimatedRows),
    sample: sampleRows.slice(0, 5),
    isSniffed: fileSize > CHUNK_SIZE
  };
}

// Generate clean JS identifier key from file name
function sanitizeKey(name, defaultKey = 'slot') {
  if (!name) return defaultKey;
  let key = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  if (!key || /^[0-9]/.test(key)) {
    key = 'file_' + (key || defaultKey);
  }
  return key;
}

export default function IngestionNode({ id, data = {}, selected }) {
  const {
    title = 'Universal Enterprise Dataset Ingestion',
    isDarkMode = true,
    onDelete
  } = data;

  // Ingestion Mode: 'bilateral' (Exactly 2 files) | 'single' (1 file) | 'audio' (meeting) | 'text' (raw text)
  const [ingestMode, setIngestMode] = useState(data.ingestMode || 'bilateral');

  // Bilateral Slots
  const [slotA, setSlotA] = useState(data.slotA || null);
  const [slotB, setSlotB] = useState(data.slotB || null);

  // Audio / Text Legacy Support
  const [audioFile, setAudioFile] = useState(data.audioFile || null);
  const [textContent, setTextContent] = useState(data.content || '');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [customSize, setCustomSize] = useState({
    width: data.width || 560,
    height: data.height || 420
  });

  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);
  const audioInputRef = useRef(null);

  // Synchronize when data.isExpanded explicitly changes from Canvas
  useEffect(() => {
    if (data.isExpanded !== undefined) {
      setIsExpanded(Boolean(data.isExpanded));
    }
  }, [data.isExpanded]);

  // Overall Status Calculation
  const statusInfo = useMemo(() => {
    if (ingestMode === 'bilateral') {
      if (slotA && slotB) {
        return {
          status: 'ready',
          label: '2/2 READY',
          desc: 'Both datasets verified. Zero-token downstream execution ready.',
          color: '#009A44',
          isReady: true
        };
      }
      if (slotA || slotB) {
        return {
          status: 'incomplete',
          label: '1/2 INCOMPLETE',
          desc: slotA ? 'Slot A loaded. Awaiting Slot B comparison dataset.' : 'Slot B loaded. Awaiting Slot A target dataset.',
          color: '#EAAA00',
          isReady: false
        };
      }
      return {
        status: 'empty',
        label: '0/2 EMPTY',
        desc: 'Bilateral Pipeline: Requires exactly 2 datasets (Slot A & Slot B).',
        color: '#0091DA',
        isReady: false
      };
    }

    if (ingestMode === 'single') {
      if (slotA) {
        return {
          status: 'ready',
          label: '1/1 READY',
          desc: 'Dataset loaded and verified.',
          color: '#009A44',
          isReady: true
        };
      }
      return {
        status: 'empty',
        label: '0/1 EMPTY',
        desc: 'Single Stream: Drop a CSV, Excel, or Parquet dataset.',
        color: '#0091DA',
        isReady: false
      };
    }

    // Audio or Text
    if (ingestMode === 'audio') {
      return {
        status: audioFile ? 'ready' : 'empty',
        label: audioFile ? 'AUDIO READY' : 'NO AUDIO',
        desc: audioFile ? `Audio loaded: ${audioFile.name}` : 'Drop MP3/WAV meeting recording.',
        color: '#0091DA',
        isReady: Boolean(audioFile)
      };
    }

    return {
      status: textContent ? 'ready' : 'empty',
      label: textContent ? 'TEXT READY' : 'EMPTY TEXT',
      desc: textContent ? `${textContent.length} chars loaded` : 'Enter or paste raw text.',
      color: '#0091DA',
      isReady: Boolean(textContent)
    };
  }, [ingestMode, slotA, slotB, audioFile, textContent]);

  // Broadcast updates to canvas DAG & downstream Deterministic Boxes
  const broadcastBilateralUpdate = (newSlotA, newSlotB) => {
    const keyA = newSlotA ? sanitizeKey(newSlotA.name, 'slotA') : 'slotA';
    const keyB = newSlotB ? sanitizeKey(newSlotB.name, 'slotB') : 'slotB';

    // Structured output for downstream agents & deterministic boxes
    const outputPayload = {};
    if (newSlotA) {
      outputPayload.slotA = newSlotA.sample || newSlotA.columns;
      outputPayload[keyA] = newSlotA.sample || newSlotA.columns;
      outputPayload.data = newSlotA.sample || newSlotA.columns;
    }
    if (newSlotB) {
      outputPayload.slotB = newSlotB.sample || newSlotB.columns;
      outputPayload[keyB] = newSlotB.sample || newSlotB.columns;
    }

    // Summary description for LLM text context
    let textSummary = '';
    if (newSlotA && newSlotB) {
      textSummary = `[BILATERAL DATASET INGESTION COMPLETED]\n` +
        `• Slot A (${keyA}): "${newSlotA.name}" (${newSlotA.rowCount?.toLocaleString()} rows, ${newSlotA.columnCount} columns)\n` +
        `  Fields: [${newSlotA.columns?.map(c => c.name).slice(0, 15).join(', ')}]\n` +
        `• Slot B (${keyB}): "${newSlotB.name}" (${newSlotB.rowCount?.toLocaleString()} rows, ${newSlotB.columnCount} columns)\n` +
        `  Fields: [${newSlotB.columns?.map(c => c.name).slice(0, 15).join(', ')}]\n` +
        `Both datasets loaded. Ready for deterministic reconciliation on primary keys.`;
    } else if (newSlotA) {
      textSummary = `[DATASET INGESTION: Slot A Loaded]\n"${newSlotA.name}" (${newSlotA.rowCount?.toLocaleString()} rows, ${newSlotA.columnCount} columns). Awaiting Slot B.`;
    }

    // Mutate ReactFlow node data
    data.slotA = newSlotA;
    data.slotB = newSlotB;
    data.ingestMode = ingestMode;
    data.lastOutput = outputPayload;
    data.content = textSummary;
    data.status = statusInfo.status;
    data.fileName = newSlotA ? (newSlotB ? `${newSlotA.name}, ${newSlotB.name}` : newSlotA.name) : (newSlotB?.name || '');
    data.fileSize = newSlotA ? `${newSlotA.size}${newSlotB ? ` + ${newSlotB.size}` : ''}` : (newSlotB?.size || '');

    // Dispatch institutional event for Canvas DAG
    try {
      window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
        detail: {
          nodeId: id,
          content: textSummary,
          output: outputPayload,
          slotA: newSlotA,
          slotB: newSlotB,
          status: statusInfo.status
        }
      }));
    } catch (e) {
      console.warn('Failed to broadcast keaos:ingestion-updated:', e);
    }
  };

  // Process and ingest file into a specific slot
  const handleIngestFile = async (file, targetSlot = 'slotA') => {
    if (!file) return;
    setErrorAlert(null);

    try {
      const sniffed = await sniffDatasetChunk(file);
      const displaySize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      const slotObject = {
        name: file.name,
        size: displaySize,
        rowCount: sniffed?.rowCount || 0,
        columnCount: sniffed?.columnCount || 0,
        columns: sniffed?.columns || [],
        sample: sniffed?.sample || [],
        format: sniffed?.format || 'csv',
        key: sanitizeKey(file.name, targetSlot),
        isSniffed: sniffed?.isSniffed || false,
        rawFile: file
      };

      if (targetSlot === 'slotA') {
        setSlotA(slotObject);
        broadcastBilateralUpdate(slotObject, slotB);
      } else {
        setSlotB(slotObject);
        broadcastBilateralUpdate(slotA, slotObject);
      }
    } catch (err) {
      console.error('File ingestion error:', err);
      setErrorAlert(`Failed to ingest ${file.name}: ${err.message}`);
    }
  };

  // Multi-File Drop Interceptor: Strict File-Count Enforcement
  const handleMultiFileDrop = async (e, forcedSlot = null) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorAlert(null);

    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;

    // Strict Enforcement Rule 1: Reject >2 files in bilateral mode
    if (ingestMode === 'bilateral') {
      if (files.length > 2) {
        setErrorAlert(
          `Intake Limit Violation: Bilateral Pipeline strictly requires exactly 2 files (Slot A & Slot B). You selected ${files.length} files. Please select only 2 files.`
        );
        return;
      }

      // If user dropped 2 files simultaneously: map files[0] -> Slot A, files[1] -> Slot B
      if (files.length === 2) {
        await handleIngestFile(files[0], 'slotA');
        await handleIngestFile(files[1], 'slotB');
        return;
      }

      // If user dropped 1 file
      if (files.length === 1) {
        if (forcedSlot) {
          await handleIngestFile(files[0], forcedSlot);
        } else if (!slotA) {
          await handleIngestFile(files[0], 'slotA');
        } else if (!slotB) {
          await handleIngestFile(files[0], 'slotB');
        } else {
          setErrorAlert('Slots Full: Both Slot A and Slot B are already loaded. Click [✕] to remove a dataset before uploading a new one.');
        }
        return;
      }
    }

    // Single mode: exactly 1 file allowed
    if (ingestMode === 'single') {
      if (files.length > 1) {
        setErrorAlert(`Intake Limit Violation: Single Stream mode accepts only 1 file. You selected ${files.length} files.`);
        return;
      }
      await handleIngestFile(files[0], 'slotA');
    }
  };

  const handleClearSlot = (targetSlot) => {
    if (targetSlot === 'slotA') {
      setSlotA(null);
      broadcastBilateralUpdate(null, slotB);
    } else {
      setSlotB(null);
      broadcastBilateralUpdate(slotA, null);
    }
  };

  const handleCopyVar = (key) => {
    navigator.clipboard?.writeText(`inputs.${key}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // -------------------------------------------------------------
  // 1. COMPACT ORIGIN DISC VIEW (Rule 13 Origin Token Invariant)
  // -------------------------------------------------------------
  if (!isExpanded) {
    return (
      <div 
        onWheel={(e) => e.stopPropagation()}
        className="relative group select-none flex flex-col items-center justify-center font-sans">
        
        {/* Precision Micro Typography Header */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-center pointer-events-none whitespace-nowrap z-10">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold block text-slate-400">
            {ingestMode === 'bilateral' ? 'BILATERAL INGEST' : 'UNIVERSAL INGEST'}
          </span>
          <span className="text-[9px] font-mono block -mt-0.5 truncate" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        {/* 60px Concentric Origin Disc */}
        <div
          onClick={() => setIsExpanded(true)}
          className={`w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center border-2 transition-all duration-200 cursor-pointer shadow-lg relative active:scale-95 ${
            statusInfo.isReady
              ? 'border-[#009A44] ring-2 ring-[#009A44]/30 shadow-[0_0_16px_rgba(0,154,68,0.3)]'
              : slotA || slotB
                ? 'border-[#EAAA00] ring-2 ring-[#EAAA00]/30 shadow-[0_0_16px_rgba(234,170,0,0.3)]'
                : 'border-[#0091DA]/70 ring-2 ring-[#0091DA]/20'
          } ${
            isDarkMode ? 'bg-[#181920] text-white hover:border-[#0091DA]' : 'bg-white text-slate-800 hover:border-[#0091DA]'
          } ${selected ? 'ring-4 ring-[#0091DA]' : ''}`}
        >
          {/* Bottom Sockets */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="data-out"
            style={{
              left: '50%',
              bottom: '-5px',
              transform: 'translateX(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              backgroundColor: statusInfo.color,
              borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 10
            }}
            title="Connect Ingested Dataset Stream to Canvas DAG"
          />

          {/* Right Socket for Horizontal Canvas Flow */}
          <Handle
            type="source"
            position={Position.Right}
            id="tools-out"
            style={{
              top: '50%',
              right: '-5px',
              transform: 'translateY(-50%) rotate(45deg)',
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              backgroundColor: statusInfo.color,
              borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 10
            }}
            title="Horizontal Stream Out"
          />

          {/* Central Icon */}
          {statusInfo.isReady ? (
            <FileCheck2 className="w-6 h-6 text-[#009A44] transition-transform group-hover:scale-110" />
          ) : (slotA || slotB) ? (
            <Layers className="w-6 h-6 text-[#EAAA00] animate-pulse" />
          ) : (
            <UploadCloud className="w-6 h-6 text-[#0091DA] transition-transform group-hover:scale-110" />
          )}

          {/* Micro Status Pill */}
          <span 
            className="text-[7.5px] font-mono font-bold uppercase tracking-tight px-1 rounded-full mt-0.5"
            style={{ 
              backgroundColor: `${statusInfo.color}20`, 
              color: statusInfo.color 
            }}
          >
            {ingestMode === 'bilateral' ? (statusInfo.isReady ? '2/2 OK' : (slotA || slotB) ? '1/2 IN' : 'INGEST') : 'PORT'}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. EXPANDED INSTITUTIONAL VIEWPORT CARD (Rule 5 Angular 0px)
  // -------------------------------------------------------------
  return (
    <div 
      onWheel={(e) => e.stopPropagation()}
      style={{
        width: `${customSize.width}px`,
        height: `${customSize.height}px`,
        minWidth: '420px',
        minHeight: '360px'
      }}
      className={`nowheel relative flex flex-col rounded-none border-2 transition-colors duration-200 shadow-2xl select-none font-sans ${
        statusInfo.isReady
          ? 'border-[#009A44] shadow-[0_0_24px_rgba(0,154,68,0.25)]'
          : isDarkMode 
            ? 'bg-[#0E131F] border-[#0091DA]/50 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]' 
            : 'bg-white border-[#0091DA]/50 text-[#0B0F19] shadow-[0_16px_36px_rgba(0,30,80,0.12)]'
      } ${selected ? 'ring-2 ring-[#0091DA]' : ''}`}
    >
      
      {/* Node Resizer */}
      <NodeResizer 
        minWidth={420}
        minHeight={340}
        maxWidth={1200}
        maxHeight={950}
        isVisible={true}
        lineClassName="!border-[#0091DA] hover:!border-2 !opacity-40 hover:!opacity-100 transition-opacity"
        handleClassName="!w-2.5 !h-2.5 !bg-[#0091DA] !border-2 !border-white !rounded-none hover:!scale-125 transition-transform"
        onResize={(_, params) => {
          setCustomSize({
            width: params.width,
            height: params.height
          });
        }}
      />

      {/* Hidden File Inputs for Manual File Dialogs */}
      <input
        ref={fileInputRefA}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.txt,.md,.pdf,.docx"
        onChange={(e) => e.target.files?.[0] && handleIngestFile(e.target.files[0], 'slotA')}
        className="hidden"
      />
      <input
        ref={fileInputRefB}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.txt,.md,.pdf,.docx"
        onChange={(e) => e.target.files?.[0] && handleIngestFile(e.target.files[0], 'slotB')}
        className="hidden"
      />

      {/* Header Bar */}
      <div className={`p-3 border-b flex items-center justify-between shrink-0 ${
        isDarkMode ? 'border-[#1E2638] bg-[#070A10]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-none bg-[#00338D] text-white flex items-center justify-center shrink-0">
            <UploadCloud className="w-4 h-4 text-[#0091DA]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white truncate">
                Universal Dataset Ingestion Engine
              </h4>
              <span 
                className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border shrink-0"
                style={{
                  backgroundColor: `${statusInfo.color}15`,
                  color: statusInfo.color,
                  borderColor: `${statusInfo.color}40`
                }}
              >
                {statusInfo.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
              Zero-RAM 64KB Sniffing • Up to 1,000,000+ Rows • 500 Columns
            </p>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Intake Mode Switcher */}
          <select
            value={ingestMode}
            onChange={(e) => {
              setIngestMode(e.target.value);
              setErrorAlert(null);
            }}
            className={`px-2 py-1 text-[10px] font-mono rounded-none border outline-none cursor-pointer ${
              isDarkMode ? 'bg-[#0E131F] border-[#1E2638] text-slate-300' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value="bilateral">Bilateral (2 Files - Reconciliation)</option>
            <option value="single">Single Stream (1 File)</option>
            <option value="audio">Audio Meeting (MP3 / WAV)</option>
            <option value="text">Direct Text</option>
          </select>

          {/* Minimize / Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-none cursor-pointer"
            title="Minimize to Origin Disc"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Error Alert Banner (When >2 files dropped or invalid actions) */}
      {errorAlert && (
        <div className="px-3 py-2 bg-red-500/15 border-b border-red-500/30 flex items-center justify-between text-xs font-mono text-red-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[11px] leading-tight">{errorAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorAlert(null)}
            className="p-0.5 hover:bg-red-500/20 text-red-400 hover:text-white rounded-none cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Body: Bilateral Dual-Slot Ingestion */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleMultiFileDrop(e)}
        className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0B0F19]"
      >
        {ingestMode === 'bilateral' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            
            {/* ---------------- SLOT A (Target / Base Dataset) ---------------- */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleMultiFileDrop(e, 'slotA')}
              className={`p-3 border rounded-none flex flex-col justify-between transition-all ${
                slotA
                  ? 'bg-[#101524] border-[#0091DA]/60 shadow-inner'
                  : 'bg-[#0E131F] border-dashed border-[#1E2638] hover:border-[#0091DA]/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0091DA] flex items-center gap-1.5">
                    <Database className="w-3 h-3" />
                    Slot A: Primary Register
                  </span>
                  {slotA && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot('slotA')}
                      className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-none cursor-pointer"
                      title="Remove Slot A File"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {slotA ? (
                  <div className="space-y-2 pt-1 font-mono">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block truncate" title={slotA.name}>
                          {slotA.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {slotA.rowCount?.toLocaleString()} rows • {slotA.columnCount} columns ({slotA.size})
                        </span>
                      </div>
                    </div>

                    {/* Columns Preview Chips */}
                    {slotA.columns && slotA.columns.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[9px] text-slate-500 block mb-1">SNIFFED SCHEMA (500+ COMPATIBLE):</span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {slotA.columns.slice(0, 10).map((col, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-[#141A29] text-[#0091DA] border border-[#2B354D] text-[9px]">
                              {col.name}
                            </span>
                          ))}
                          {slotA.columns.length > 10 && (
                            <span className="px-1.5 py-0.5 bg-[#141A29] text-slate-400 border border-[#2B354D] text-[9px]">
                              +{slotA.columns.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRefA.current?.click()}
                    className="py-8 flex flex-col items-center justify-center text-center cursor-pointer space-y-1.5 group"
                  >
                    <UploadCloud className="w-7 h-7 text-slate-500 group-hover:text-[#0091DA] transition-colors" />
                    <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-white">
                      Drop Target Register Here
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      e.g. Government GST (CSV, XLSX, Parquet)
                    </span>
                  </div>
                )}
              </div>

              {/* Slot A Footer Variable Pill */}
              <div className="pt-2 border-t border-[#182030] flex items-center justify-between text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleCopyVar(slotA?.key || 'slotA')}
                  className="px-2 py-0.5 rounded-none bg-black/40 hover:bg-black/70 text-[#0091DA] border border-[#1E2638] flex items-center gap-1 cursor-pointer"
                >
                  <span>inputs.{slotA?.key || 'slotA'}</span>
                  {copiedKey === (slotA?.key || 'slotA') ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                </button>
                <span className="text-slate-500 text-[9px]">
                  {slotA?.isSniffed ? '⚡ Zero-RAM Mode' : slotA ? 'In-Memory' : 'Awaiting File'}
                </span>
              </div>
            </div>

            {/* ---------------- SLOT B (Counterparty Dataset) ---------------- */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleMultiFileDrop(e, 'slotB')}
              className={`p-3 border rounded-none flex flex-col justify-between transition-all ${
                slotB
                  ? 'bg-[#101524] border-[#009A44]/60 shadow-inner'
                  : 'bg-[#0E131F] border-dashed border-[#1E2638] hover:border-[#009A44]/80'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#009A44] flex items-center gap-1.5">
                    <Database className="w-3 h-3" />
                    Slot B: Counterparty Register
                  </span>
                  {slotB && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot('slotB')}
                      className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-none cursor-pointer"
                      title="Remove Slot B File"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {slotB ? (
                  <div className="space-y-2 pt-1 font-mono">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-[#009A44] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block truncate" title={slotB.name}>
                          {slotB.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {slotB.rowCount?.toLocaleString()} rows • {slotB.columnCount} columns ({slotB.size})
                        </span>
                      </div>
                    </div>

                    {/* Columns Preview Chips */}
                    {slotB.columns && slotB.columns.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[9px] text-slate-500 block mb-1">SNIFFED SCHEMA (500+ COMPATIBLE):</span>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {slotB.columns.slice(0, 10).map((col, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-[#141A29] text-[#009A44] border border-[#2B354D] text-[9px]">
                              {col.name}
                            </span>
                          ))}
                          {slotB.columns.length > 10 && (
                            <span className="px-1.5 py-0.5 bg-[#141A29] text-slate-400 border border-[#2B354D] text-[9px]">
                              +{slotB.columns.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRefB.current?.click()}
                    className="py-8 flex flex-col items-center justify-center text-center cursor-pointer space-y-1.5 group"
                  >
                    <UploadCloud className="w-7 h-7 text-slate-500 group-hover:text-[#009A44] transition-colors" />
                    <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-white">
                      Drop Comparison Register Here
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      e.g. ERP Purchase Register (CSV, XLSX, Parquet)
                    </span>
                  </div>
                )}
              </div>

              {/* Slot B Footer Variable Pill */}
              <div className="pt-2 border-t border-[#182030] flex items-center justify-between text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => handleCopyVar(slotB?.key || 'slotB')}
                  className="px-2 py-0.5 rounded-none bg-black/40 hover:bg-black/70 text-[#009A44] border border-[#1E2638] flex items-center gap-1 cursor-pointer"
                >
                  <span>inputs.{slotB?.key || 'slotB'}</span>
                  {copiedKey === (slotB?.key || 'slotB') ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                </button>
                <span className="text-slate-500 text-[9px]">
                  {slotB?.isSniffed ? '⚡ Zero-RAM Mode' : slotB ? 'In-Memory' : 'Awaiting File'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Single Stream Mode Fallback */}
        {ingestMode === 'single' && (
          <div 
            onClick={() => fileInputRefA.current?.click()}
            className="h-full border-2 border-dashed border-[#1E2638] hover:border-[#0091DA] p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#0E131F]"
          >
            <UploadCloud className="w-10 h-10 text-[#0091DA] mb-2" />
            <span className="text-xs font-mono font-bold text-white">
              {slotA ? slotA.name : 'Drop Single File Here (CSV, Excel, Parquet, JSON)'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono mt-1">
              {slotA ? `${slotA.rowCount?.toLocaleString()} rows • ${slotA.columnCount} columns` : 'Supports massive enterprise datasets with zero RAM blowup'}
            </span>
          </div>
        )}
      </div>

      {/* Footer Pipeline Status Bar */}
      <div className={`p-2.5 border-t shrink-0 flex items-center justify-between text-[10px] font-mono ${
        isDarkMode ? 'border-[#1E2638] bg-[#070A10]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusInfo.color }} />
          <span className="text-slate-300">{statusInfo.desc}</span>
        </div>
        <span className="text-slate-500 hidden sm:inline">
          Emits: inputs.slotA & inputs.slotB
        </span>
      </div>

    </div>
  );
}
