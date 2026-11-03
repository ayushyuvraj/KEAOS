import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { 
  UploadCloud, 
  FileAudio, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon,
  Check, 
  Trash2, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  Database,
  FileCheck2,
  Plus,
  Lock,
  Unlock,
  X
} from 'lucide-react';
import { persistBinaryFile, getPersistedBinaryFile } from '../../services/fileStorageService';
import NodeActionToolbar from '../common/NodeActionToolbar';

/**
 * Categorize a file based on its name and mime type
 */
export function getFileCategory(fileName = '', mimeType = '') {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['csv', 'tsv', 'xlsx', 'xls', 'parquet', 'json'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) {
    return 'tabular';
  }
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'webm'].includes(ext) || mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mimeType.startsWith('image/')) {
    return 'image';
  }
  if (['pdf', 'docx', 'doc', 'txt', 'md'].includes(ext) || mimeType.includes('pdf') || mimeType.startsWith('text/')) {
    return 'document';
  }
  return 'other';
}

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
function sanitizeKey(name, defaultKey = 'file') {
  if (!name) return defaultKey;
  let key = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  if (!key || /^[0-9]/.test(key)) {
    key = 'file_' + (key || defaultKey);
  }
  return key;
}

export default function IngestionNode({ id, data = {}, selected }) {
  const {
    title = 'Universal Ingestion Port',
    isDarkMode = true,
    onDelete
  } = data;

  const isDeactivated = Boolean(data?.isDeactivated);
  const isLocked = Boolean(data?.isLocked);
  const [nodeTitle, setNodeTitle] = useState(data?.title || 'Universal Ingestion Port');

  useEffect(() => {
    if (data?.title) {
      setNodeTitle(data.title);
    }
  }, [data?.title]);

  // Ingestion Mode: 'files' (Unified Files & Media) | 'text' (Raw Direct Text)
  const [ingestMode, setIngestMode] = useState(
    data.ingestMode === 'text' ? 'text' : 'files'
  );

  // Configurable Max Files limit: 1 (default), 2, 5, 10, or 'unlimited'
  const [maxFiles, setMaxFiles] = useState(data.maxFiles !== undefined ? data.maxFiles : 1);

  // Optional constraint toggle: Enforce Uniform File Type
  const [enforceUniformType, setEnforceUniformType] = useState(Boolean(data.enforceUniformType));

  // Multi-File List: array of processed file descriptors
  const [filesList, setFilesList] = useState(data.files || []);

  // Raw Direct Text Content
  const [textContent, setTextContent] = useState(data.content || '');

  // UI state
  const [isExpanded, setIsExpanded] = useState(Boolean(data.isExpanded));
  const [errorAlert, setErrorAlert] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [customSize, setCustomSize] = useState({
    width: data.width || 680,
    height: data.height || 460
  });

  const multiFileInputRef = useRef(null);

  // Synchronize when data.isExpanded explicitly changes from Canvas
  useEffect(() => {
    if (data.isExpanded !== undefined) {
      setIsExpanded(Boolean(data.isExpanded));
    }
  }, [data.isExpanded]);

  // Synchronize maxFiles & enforceUniformType if updated from Inspector
  useEffect(() => {
    if (data.maxFiles !== undefined && data.maxFiles !== maxFiles) {
      setMaxFiles(data.maxFiles);
    }
    if (data.enforceUniformType !== undefined && data.enforceUniformType !== enforceUniformType) {
      setEnforceUniformType(Boolean(data.enforceUniformType));
    }
    if (data.ingestMode && data.ingestMode !== ingestMode) {
      setIngestMode(data.ingestMode === 'text' ? 'text' : 'files');
    }
  }, [data.maxFiles, data.enforceUniformType, data.ingestMode]);

  // Rehydrate binary File/Blob from IndexedDB if lost after page refresh
  useEffect(() => {
    let isCancelled = false;
    const rehydrateFromDB = async () => {
      try {
        if (filesList.length > 0) {
          let updated = false;
          const rehydrated = await Promise.all(
            filesList.map(async (fileObj, idx) => {
              if (!fileObj.rawFile) {
                const persisted = await getPersistedBinaryFile(`ingest-${id}-file-${idx}`) ||
                  (idx === 0 ? (await getPersistedBinaryFile(`ingest-${id}-slotA`) || await getPersistedBinaryFile('latest-invoice-binary')) : null) ||
                  (idx === 1 ? await getPersistedBinaryFile(`ingest-${id}-slotB`) : null);
                if (persisted) {
                  updated = true;
                  return { ...fileObj, rawFile: persisted };
                }
              }
              return fileObj;
            })
          );
          if (updated && !isCancelled) {
            setFilesList(rehydrated);
            broadcastFilesUpdate(rehydrated, maxFiles, enforceUniformType);
          }
        }
      } catch (err) {
        console.warn('[IngestionNode] Failed to rehydrate from IndexedDB:', err);
      }
    };
    rehydrateFromDB();
    return () => { isCancelled = true; };
  }, [id]);

  // Overall Status Calculation
  const statusInfo = useMemo(() => {
    if (ingestMode === 'text') {
      const isReady = Boolean(textContent && textContent.trim());
      return {
        status: isReady ? 'ready' : 'empty',
        label: isReady ? 'TEXT READY' : 'EMPTY TEXT',
        desc: isReady ? `${textContent.length} chars loaded` : 'Enter or paste raw text.',
        color: isReady ? '#009A44' : '#0091DA',
        isReady
      };
    }

    const count = filesList.length;
    const target = maxFiles === 'unlimited' ? '∞' : maxFiles;
    const isTargetMet = maxFiles === 'unlimited' ? count >= 1 : count >= maxFiles;

    if (isTargetMet) {
      return {
        status: 'ready',
        label: `${count}/${target} READY`,
        desc: `Intake complete (${count} file${count === 1 ? '' : 's'}). Downstream execution ready.`,
        color: '#009A44',
        isReady: true
      };
    }
    if (count > 0) {
      return {
        status: 'incomplete',
        label: `${count}/${target} PARTIAL`,
        desc: `Loaded ${count} file${count === 1 ? '' : 's'}, awaiting ${maxFiles - count} more.`,
        color: '#EAAA00',
        isReady: false
      };
    }
    return {
      status: 'empty',
      label: `0/${target} EMPTY`,
      desc: `Awaiting file upload (Max: ${target}).`,
      color: '#0091DA',
      isReady: false
    };
  }, [ingestMode, filesList, maxFiles, textContent]);

  // Broadcast updates to canvas DAG & downstream Deterministic Boxes
  const broadcastFilesUpdate = (newFilesList, currentLimit = maxFiles, currentUniform = enforceUniformType) => {
    const outputPayload = {
      files: newFilesList.map(f => f.sample || f.columns || f.name),
      count: newFilesList.length
    };

    // Expose type-scoped groupings
    const datasets = newFilesList.filter(f => f.category === 'tabular');
    const audios = newFilesList.filter(f => f.category === 'audio');
    const images = newFilesList.filter(f => f.category === 'image');
    const documents = newFilesList.filter(f => f.category === 'document');

    if (datasets.length) outputPayload.datasets = datasets.map(d => d.sample || d.columns);
    if (audios.length) outputPayload.audio = audios.map(a => a.name);
    if (images.length) outputPayload.images = images.map(i => i.name);
    if (documents.length) outputPayload.documents = documents.map(d => d.name);

    // Expose by sanitized file key and file index
    newFilesList.forEach((f, idx) => {
      const k = f.key || `file_${idx + 1}`;
      outputPayload[k] = f.sample || f.columns || f.name;
      outputPayload[`file_${idx + 1}`] = f.sample || f.columns || f.name;
    });

    // Backward compatibility: slotA & slotB
    if (newFilesList.length > 0) {
      outputPayload.slotA = newFilesList[0].sample || newFilesList[0].columns || newFilesList[0].name;
      outputPayload.data = outputPayload.slotA;
    } else {
      outputPayload.slotA = null;
      outputPayload.data = null;
    }
    if (newFilesList.length > 1) {
      outputPayload.slotB = newFilesList[1].sample || newFilesList[1].columns || newFilesList[1].name;
    } else {
      outputPayload.slotB = null;
    }

    // Summary description for LLM text context
    let textSummary = '';
    if (newFilesList.length > 0) {
      textSummary = `[UNIVERSAL INGESTION COMPLETED: ${newFilesList.length} FILE(S)]\n` +
        newFilesList.map((f, i) => {
          if (f.category === 'tabular') {
            return `• File ${i + 1} (${f.key}): "${f.name}" (${f.rowCount?.toLocaleString() || 0} rows, ${f.columnCount || 0} cols)\n  Fields: [${f.columns?.slice(0, 10).map(c => typeof c === 'string' ? c : c.name).join(', ')}]`;
          }
          if (f.category === 'audio') {
            return `• File ${i + 1} (${f.key}): "${f.name}" (Audio, ${f.size})`;
          }
          if (f.category === 'image') {
            return `• File ${i + 1} (${f.key}): "${f.name}" (Image, ${f.size})`;
          }
          return `• File ${i + 1} (${f.key}): "${f.name}" (Document, ${f.size})`;
        }).join('\n');
    }

    // Mutate ReactFlow node data
    data.files = newFilesList;
    data.maxFiles = currentLimit;
    data.enforceUniformType = currentUniform;
    data.ingestMode = ingestMode;
    data.slotA = newFilesList[0] || null;
    data.slotB = newFilesList[1] || null;
    data.rawFile = newFilesList[0]?.rawFile || null;
    data.fileName = newFilesList.map(f => f.name).join(', ');
    data.fileSize = newFilesList.map(f => f.size).join(' + ');
    data.lastOutput = outputPayload;
    data.content = textSummary;
    data.status = (currentLimit === 'unlimited' ? newFilesList.length >= 1 : newFilesList.length >= currentLimit)
      ? 'ready'
      : newFilesList.length > 0 ? 'incomplete' : 'empty';

    // Global in-memory cache to guarantee zero-loss file retrieval across canvas
    if (typeof window !== 'undefined') {
      window.__KEAOS_FILES__ = window.__KEAOS_FILES__ || {};
      window.__KEAOS_FILES__[id] = {
        files: newFilesList,
        slotA: newFilesList[0] || null,
        slotB: newFilesList[1] || null,
        rawFile: newFilesList[0]?.rawFile || null
      };
      if (newFilesList[0]?.rawFile) {
        window.__KEAOS_FILES__['latest'] = newFilesList[0].rawFile;
      }
    }

    // Dispatch institutional event for Canvas DAG
    try {
      window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
        detail: {
          nodeId: id,
          content: textSummary,
          output: outputPayload,
          files: newFilesList,
          slotA: newFilesList[0] || null,
          slotB: newFilesList[1] || null,
          rawFile: newFilesList[0]?.rawFile || null,
          status: data.status
        }
      }));
    } catch (e) {
      console.warn('Failed to broadcast keaos:ingestion-updated:', e);
    }
  };

  // Process incoming files with strict limit and uniform type enforcement
  const processIncomingFiles = async (newRawFiles) => {
    if (!newRawFiles || !newRawFiles.length) return;
    setErrorAlert(null);

    const isUnlimited = maxFiles === 'unlimited' || maxFiles === null;
    const currentCount = filesList.length;
    const capacity = isUnlimited ? Infinity : Math.max(0, maxFiles - currentCount);

    // Strict Limit Enforcement Rule
    if (newRawFiles.length > capacity) {
      setErrorAlert(
        `Intake Limit Exceeded: Limit is set to ${maxFiles} file(s) (${currentCount} already loaded). You dropped/selected ${newRawFiles.length} file(s). Please increase the Max Files limit or select at most ${capacity} file(s).`
      );
      return;
    }

    // Uniform Type Enforcement Rule
    if (enforceUniformType && filesList.length > 0) {
      const requiredCategory = filesList[0].category;
      const mismatch = newRawFiles.find(f => getFileCategory(f.name, f.type) !== requiredCategory);
      if (mismatch) {
        setErrorAlert(
          `Uniform Type Violation: Node is configured to require all files to be ${requiredCategory.toUpperCase()}. "${mismatch.name}" is of a different category.`
        );
        return;
      }
    }

    if (enforceUniformType && newRawFiles.length > 1) {
      const firstCat = getFileCategory(newRawFiles[0].name, newRawFiles[0].type);
      const mismatch = newRawFiles.find(f => getFileCategory(f.name, f.type) !== firstCat);
      if (mismatch) {
        setErrorAlert(
          `Uniform Type Violation: All selected files must share the same category. "${mismatch.name}" does not match "${firstCat.toUpperCase()}".`
        );
        return;
      }
    }

    try {
      const processedObjects = await Promise.all(
        newRawFiles.map(async (file, idx) => {
          const cat = getFileCategory(file.name, file.type);
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          let sniffed = null;
          if (cat === 'tabular') {
            sniffed = await sniffDatasetChunk(file);
          }
          const displaySize = file.size > 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
            : (file.size / 1024).toFixed(1) + ' KB';

          const fileIndex = currentCount + idx;
          persistBinaryFile(`ingest-${id}-file-${fileIndex}`, file);
          if (fileIndex === 0) {
            persistBinaryFile(`ingest-${id}-slotA`, file);
            persistBinaryFile('latest-invoice-binary', file);
          } else if (fileIndex === 1) {
            persistBinaryFile(`ingest-${id}-slotB`, file);
          }

          return {
            id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: displaySize,
            sizeBytes: file.size,
            type: file.type || ext,
            category: cat,
            format: sniffed?.format || ext,
            rowCount: sniffed?.rowCount || (cat === 'tabular' ? 1 : null),
            columnCount: sniffed?.columnCount || (sniffed?.columns?.length || null),
            columns: sniffed?.columns || [],
            sample: sniffed?.sample || [],
            isSniffed: Boolean(sniffed?.isSniffed),
            previewUrl: cat === 'image' ? URL.createObjectURL(file) : null,
            key: sanitizeKey(file.name, `file_${fileIndex + 1}`),
            rawFile: file
          };
        })
      );

      const updatedList = [...filesList, ...processedObjects];
      setFilesList(updatedList);
      broadcastFilesUpdate(updatedList, maxFiles, enforceUniformType);
    } catch (err) {
      console.error('File ingestion error:', err);
      setErrorAlert(`Failed to ingest files: ${err.message}`);
    }
  };

  const handleMultiFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorAlert(null);

    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;

    if (ingestMode === 'text') {
      files[0].text().then(text => {
        handleTextChange(text);
      }).catch(err => {
        setErrorAlert(`Failed to read text file: ${err.message}`);
      });
      return;
    }

    processIncomingFiles(files);
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      processIncomingFiles(files);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileId) => {
    const updated = filesList.filter(f => f.id !== fileId);
    setFilesList(updated);
    broadcastFilesUpdate(updated, maxFiles, enforceUniformType);
  };

  const handleClearAll = () => {
    setFilesList([]);
    broadcastFilesUpdate([], maxFiles, enforceUniformType);
  };

  const handleLimitChange = (newLimit) => {
    const val = newLimit === 'unlimited' ? 'unlimited' : Math.max(1, parseInt(newLimit, 10) || 1);
    setMaxFiles(val);
    data.maxFiles = val;
    broadcastFilesUpdate(filesList, val, enforceUniformType);
  };

  const handleToggleUniform = () => {
    const nextVal = !enforceUniformType;
    setEnforceUniformType(nextVal);
    data.enforceUniformType = nextVal;
    broadcastFilesUpdate(filesList, maxFiles, nextVal);
  };

  const handleTextChange = (newText) => {
    setTextContent(newText);
    data.content = newText;
    data.status = newText?.trim() ? 'ready' : 'empty';
    data.lastOutput = { text: newText, content: newText };

    window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
      detail: {
        nodeId: id,
        content: newText,
        output: { text: newText, content: newText },
        status: newText?.trim() ? 'ready' : 'empty'
      }
    }));
  };

  const handleCopyVar = (key) => {
    navigator.clipboard?.writeText(`inputs.${key}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isUnlimited = maxFiles === 'unlimited';
  const remainingCapacity = isUnlimited ? Infinity : Math.max(0, maxFiles - filesList.length);
  const canAddMore = isUnlimited || filesList.length < maxFiles;

  // -------------------------------------------------------------
  // 1. COMPACT ORIGIN DISC VIEW (Rule 13 Origin Token Invariant)
  // -------------------------------------------------------------
  if (!isExpanded) {
    const displayTarget = isUnlimited ? '∞' : maxFiles;
    return (
      <div 
        onWheel={(e) => e.stopPropagation()}
        className={`relative group select-none flex flex-col items-center justify-center font-sans ${
          isDeactivated ? 'opacity-40 grayscale pointer-events-none' : ''
        }`}>
        
        {/* Floating Action Toolbar on Hover */}
        <NodeActionToolbar
          nodeId={id}
          nodeName={nodeTitle}
          isDeactivated={isDeactivated}
          isLocked={isLocked}
          onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
          onDelete={() => data?.onDelete && data.onDelete(id)}
          onOpenInspector={() => data?.onOpenInspector && data.onOpenInspector(id)}
          onDuplicate={() => data?.onDuplicate && data.onDuplicate(id)}
          onCopy={() => data?.onCopy && data.onCopy(id)}
          onRename={(nodeId, newName) => {
            setNodeTitle(newName);
            if (data?.onRename) data.onRename(nodeId, newName);
          }}
          isDarkMode={isDarkMode}
          mode="circle-left"
          dropdownPlacement="auto"
        />

        {/* Precision Micro Typography Header */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-center pointer-events-none whitespace-nowrap z-10">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold block text-slate-400">
            {ingestMode === 'text' ? 'TEXT INGEST' : `FILES INGEST (${filesList.length}/${displayTarget})`}
          </span>
          <span className="text-[9px] font-mono block -mt-0.5 truncate" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        {/* 60px Concentric Origin Disc */}
        <div
          onClick={() => setIsExpanded(true)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleMultiFileDrop}
          title="Click to expand Ingestion Studio, or drop files directly here"
          className={`w-[60px] h-[60px] rounded-full flex flex-col items-center justify-center border-2 transition-all duration-200 cursor-pointer shadow-lg relative active:scale-95 ${
            statusInfo.isReady
              ? 'border-[#009A44] ring-2 ring-[#009A44]/30 shadow-[0_0_16px_rgba(0,154,68,0.3)]'
              : filesList.length > 0
                ? 'border-[#EAAA00] ring-2 ring-[#EAAA00]/30 shadow-[0_0_16px_rgba(234,170,0,0.3)]'
                : 'border-[#0091DA]/70 ring-2 ring-[#0091DA]/20'
          } ${
            isDarkMode ? 'bg-[#181920] text-white hover:border-[#0091DA]' : 'bg-white text-slate-800 hover:border-[#0091DA]'
          } ${selected ? 'ring-4 ring-[#0091DA]' : ''}`}
        >
          {/* Bottom Socket */}
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
          ) : filesList.length > 0 ? (
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
            {ingestMode === 'text' 
              ? (textContent ? 'TEXT' : 'EMPTY') 
              : `${filesList.length}/${displayTarget}`}
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
        minWidth: '460px',
        minHeight: '380px'
      }}
      className={`nowheel relative group flex flex-col rounded-none border-2 transition-colors duration-200 shadow-2xl select-none font-sans ${
        isDeactivated ? 'opacity-40 grayscale pointer-events-none' : ''
      } ${
        statusInfo.isReady
          ? 'border-[#009A44] shadow-[0_0_24px_rgba(0,154,68,0.25)]'
          : isDarkMode 
            ? 'bg-[#0E131F] border-[#0091DA]/50 text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]' 
            : 'bg-white border-[#0091DA]/50 text-[#0B0F19] shadow-[0_16px_36px_rgba(0,30,80,0.12)]'
      } ${selected ? 'ring-2 ring-[#0091DA]' : ''}`}
    >
      
      {/* Floating Action Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
        onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
        onDelete={() => data?.onDelete && data.onDelete(id)}
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

      {/* Node Resizer */}
      <NodeResizer 
        minWidth={460}
        minHeight={360}
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

      {/* Hidden Multi-File Input */}
      <input
        ref={multiFileInputRef}
        type="file"
        multiple
        accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.aac,.flac"
        onChange={handleFilesSelected}
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
              <h4 className={`text-xs font-mono font-bold uppercase tracking-wider truncate ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Universal Ingestion Port
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
            <p className={`text-[10px] font-mono truncate mt-0.5 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Multimodal Multi-File Intake • Zero-RAM Chunk Sniffing
            </p>
          </div>
        </div>

        {/* Header Controls (nodrag nopan prevents ReactFlow canvas interception) */}
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="nodrag nopan flex items-center gap-2 shrink-0 select-none"
        >
          {/* Intake Mode Switcher */}
          <select
            value={ingestMode}
            onChange={(e) => {
              setIngestMode(e.target.value);
              data.ingestMode = e.target.value;
              setErrorAlert(null);
            }}
            className={`px-2 py-1 text-[10px] font-mono rounded-none border outline-none cursor-pointer ${
              isDarkMode ? 'bg-[#0E131F] border-[#1E2638] text-slate-300' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value="files">Files & Media</option>
            <option value="text">Raw Direct Text</option>
          </select>

          {/* Max Files Controller: Stepper + Custom Number Input + Presets + Unlimited */}
          {ingestMode === 'files' && (
            <div className={`flex items-center border p-0.5 gap-1 ${
              isDarkMode ? 'bg-[#0E131F] border-[#1E2638]' : 'bg-white border-slate-300 shadow-xs'
            }`}>
              <span className={`text-[9px] font-mono px-1 font-bold uppercase ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Max:
              </span>

              {/* Stepper Controls & Custom Number Input */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const cur = isUnlimited ? 1 : Math.max(1, (Number(maxFiles) || 1) - 1);
                    handleLimitChange(cur);
                  }}
                  disabled={!isUnlimited && Number(maxFiles) <= 1}
                  className={`w-4 h-5 flex items-center justify-center text-[10px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Decrease file limit"
                >
                  -
                </button>

                <input
                  type="number"
                  min="1"
                  max="500"
                  value={isUnlimited ? '' : maxFiles}
                  placeholder={isUnlimited ? '∞' : '1'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      handleLimitChange(1);
                    } else {
                      const num = Math.max(1, parseInt(val, 10) || 1);
                      handleLimitChange(num);
                    }
                  }}
                  className={`w-9 h-5 text-center text-[10px] font-mono font-bold border-x outline-none transition-all ${
                    isDarkMode 
                      ? 'bg-[#141A29] border-[#1E2638] text-cyan-400 focus:border-[#0091DA]' 
                      : 'bg-slate-50 border-slate-200 text-[#00338D] focus:border-[#0091DA]'
                  }`}
                  title="Type custom number of files (e.g. 1, 2, 3, 4, 7, 20...)"
                />

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const cur = isUnlimited ? 2 : (Number(maxFiles) || 1) + 1;
                    handleLimitChange(cur);
                  }}
                  className={`w-4 h-5 flex items-center justify-center text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                    isDarkMode ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Increase file limit"
                >
                  +
                </button>
              </div>

              {/* Quick Preset Shortcut Chips */}
              <div className={`flex items-center border-l pl-1 gap-0.5 ${
                isDarkMode ? 'border-[#1E2638]' : 'border-slate-200'
              }`}>
                {[1, 2, 5, 10].map((presetVal) => {
                  const isPresetActive = !isUnlimited && Number(maxFiles) === presetVal;
                  return (
                    <button
                      key={presetVal}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLimitChange(presetVal);
                      }}
                      className={`px-1.5 py-0.5 text-[9px] font-mono transition-colors cursor-pointer ${
                        isPresetActive
                          ? 'bg-[#0091DA] text-white font-bold shadow-xs'
                          : isDarkMode 
                            ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={`Quick preset: ${presetVal} file(s)`}
                    >
                      {presetVal}
                    </button>
                  );
                })}

                {/* Unlimited Chip */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLimitChange('unlimited');
                  }}
                  className={`px-1.5 py-0.5 text-[9px] font-mono transition-colors cursor-pointer ${
                    isUnlimited
                      ? 'bg-[#0091DA] text-white font-bold shadow-xs'
                      : isDarkMode 
                        ? 'text-slate-400 hover:text-white hover:bg-white/5' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Allow unlimited files"
                >
                  ∞
                </button>
              </div>
            </div>
          )}

          {/* Enforce Uniform Type Toggle */}
          {ingestMode === 'files' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleUniform();
              }}
              className={`px-2 py-1 text-[9px] font-mono border flex items-center gap-1 transition-all cursor-pointer ${
                enforceUniformType
                  ? 'bg-[#6D2077]/20 border-[#6D2077] text-pink-400'
                  : isDarkMode
                    ? 'bg-[#0E131F] border-[#1E2638] text-slate-400 hover:text-slate-200'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="When enabled, requires all uploaded files in this node to share the same category (e.g. only datasets or only audio)"
            >
              {enforceUniformType ? <Lock className="w-2.5 h-2.5 text-pink-400" /> : <Unlock className="w-2.5 h-2.5 opacity-60" />}
              <span>{enforceUniformType ? 'Uniform: ON' : 'Uniform: OFF'}</span>
            </button>
          )}

          {/* Minimize / Collapse */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className={`p-1 rounded-none cursor-pointer ${
              isDarkMode 
                ? 'hover:bg-white/10 text-slate-400 hover:text-white' 
                : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Minimize to Origin Disc"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Error Alert Banner */}
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

      {/* Main Body */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleMultiFileDrop}
        className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0B0F19]"
      >
        {/* 1. Files & Media Mode */}
        {ingestMode === 'files' && (
          <div className="h-full flex flex-col justify-between">
            {filesList.length === 0 ? (
              /* Empty State: Large tactile dropzone */
              <div 
                onClick={() => multiFileInputRef.current?.click()}
                className="h-full min-h-[220px] border-2 border-dashed border-[#1E2638] hover:border-[#0091DA] p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-[#0E131F] transition-all group"
              >
                <div className="w-14 h-14 bg-[#0091DA]/10 text-[#0091DA] border border-[#0091DA]/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <span className="text-sm font-mono font-bold text-white tracking-tight">
                  Drop Files Here or Click to Browse
                </span>
                <span className="text-xs text-slate-400 font-mono mt-1">
                  Supports CSV, Excel, Parquet, PDF, Images (PNG/JPG), and Audio (MP3/WAV)
                </span>
                <div className="flex items-center gap-2 mt-3 text-[10px] font-mono text-slate-500">
                  <span className="px-2 py-0.5 bg-[#141A29] border border-[#2B354D] text-[#0091DA]">
                    Limit: {isUnlimited ? 'Unlimited' : `${maxFiles} File${maxFiles === 1 ? '' : 's'}`}
                  </span>
                  <span>•</span>
                  <span>Zero-RAM 64KB Sniffing</span>
                  <span>•</span>
                  <span>1,000,000+ Rows</span>
                </div>
              </div>
            ) : (
              /* Populated State: Responsive File Cards Grid */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Uploaded Files ({filesList.length} of {isUnlimited ? '∞' : maxFiles})
                    </span>
                    {enforceUniformType && filesList[0] && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#6D2077]/20 text-pink-300 border border-[#6D2077]/40 uppercase">
                        Type: {filesList[0].category}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] text-red-400 hover:text-red-300 font-mono hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filesList.map((file, idx) => {
                    const isTabular = file.category === 'tabular';
                    const isAudio = file.category === 'audio';
                    const isImage = file.category === 'image';

                    const badgeColor = isTabular
                      ? '#009A44'
                      : isAudio
                        ? '#0091DA'
                        : isImage
                          ? '#FD349C'
                          : '#7213EA';

                    const FileIcon = isTabular
                      ? FileSpreadsheet
                      : isAudio
                        ? FileAudio
                        : isImage
                          ? ImageIcon
                          : FileText;

                    return (
                      <div
                        key={file.id || idx}
                        className="p-3 border bg-[#101524] border-[#1E2638] hover:border-[#0091DA]/60 transition-all flex flex-col justify-between space-y-2 relative group"
                      >
                        {/* Card Top: Category Badge, Size & Delete */}
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-[9px] font-mono px-1.5 py-0.2 font-bold uppercase border"
                            style={{
                              backgroundColor: `${badgeColor}15`,
                              color: badgeColor,
                              borderColor: `${badgeColor}40`
                            }}
                          >
                            {file.category}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-slate-400">
                              {file.size}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card Body: Icon, Title & Dynamic Metadata */}
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 flex items-center justify-center shrink-0 border mt-0.5"
                            style={{
                              backgroundColor: `${badgeColor}10`,
                              borderColor: `${badgeColor}30`,
                              color: badgeColor
                            }}
                          >
                            <FileIcon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-mono font-bold text-white block truncate" title={file.name}>
                              {file.name}
                            </span>

                            {isTabular && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {file.rowCount?.toLocaleString()} rows • {file.columnCount} cols
                              </span>
                            )}

                            {isAudio && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                Audio Recording • Multimodal Ready
                              </span>
                            )}

                            {isImage && (
                              <div className="mt-1">
                                {file.previewUrl ? (
                                  <img 
                                    src={file.previewUrl} 
                                    alt={file.name} 
                                    className="w-full h-16 object-cover border border-[#1E2638]" 
                                  />
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono block">Image Binary</span>
                                )}
                              </div>
                            )}

                            {/* Schema Preview Chips for Datasets */}
                            {isTabular && file.columns && file.columns.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5 max-h-12 overflow-y-auto">
                                {file.columns.slice(0, 4).map((c, i) => (
                                  <span key={i} className="px-1 py-0.2 bg-[#141A29] text-[#0091DA] border border-[#2B354D] text-[8px] font-mono">
                                    {typeof c === 'string' ? c : c.name}
                                  </span>
                                ))}
                                {file.columns.length > 4 && (
                                  <span className="px-1 py-0.2 bg-[#141A29] text-slate-500 border border-[#2B354D] text-[8px] font-mono">
                                    +{file.columns.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Variable Copy Pill */}
                        <div className="pt-2 border-t border-[#182030] flex items-center justify-between text-[10px] font-mono">
                          <button
                            type="button"
                            onClick={() => handleCopyVar(file.key)}
                            className="px-2 py-0.5 bg-black/40 hover:bg-black/70 text-[#0091DA] border border-[#1E2638] flex items-center gap-1 cursor-pointer"
                            title={`Click to copy inputs.${file.key}`}
                          >
                            <span>inputs.{file.key}</span>
                            {copiedKey === file.key ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                            )}
                          </button>

                          <span className="text-slate-500 text-[9px]">
                            {idx === 0 ? 'Primary (slotA)' : idx === 1 ? 'Secondary (slotB)' : `Index [${idx}]`}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add File Tile (if below capacity) */}
                  {canAddMore && (
                    <div 
                      onClick={() => multiFileInputRef.current?.click()}
                      className="min-h-[120px] p-4 border-2 border-dashed border-[#1E2638] hover:border-[#0091DA] flex flex-col items-center justify-center text-center cursor-pointer bg-[#0E131F] transition-all group"
                    >
                      <Plus className="w-6 h-6 text-slate-500 group-hover:text-[#0091DA] transition-colors mb-1" />
                      <span className="text-xs font-mono font-bold text-slate-300 group-hover:text-white">
                        + Add File
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {isUnlimited ? 'Unlimited files' : `${remainingCapacity} more slot${remainingCapacity === 1 ? '' : 's'}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Raw Direct Text Stream Mode */}
        {ingestMode === 'text' && (
          <div className="h-full flex flex-col justify-between p-3.5 bg-[#0E131F] border border-[#1E2638] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0091DA] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Raw Direct Text Stream
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                {textContent.length} chars • {textContent.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            <textarea
              value={textContent}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste raw meeting transcript, executive directives, policy instructions, or tabular text lines..."
              className="flex-1 w-full p-2.5 bg-[#101524] border border-[#1E2638] focus:border-[#0091DA] text-slate-200 text-xs font-mono resize-none outline-none leading-relaxed"
            />

            <div className="pt-2 border-t border-[#182030] flex items-center justify-between text-[10px] font-mono">
              <button
                type="button"
                onClick={() => handleCopyVar('text')}
                className="px-2 py-0.5 bg-black/40 hover:bg-black/70 text-[#0091DA] border border-[#1E2638] flex items-center gap-1 cursor-pointer"
              >
                <span>inputs.text</span>
                {copiedKey === 'text' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
              </button>
              <button
                type="button"
                onClick={() => handleTextChange('')}
                className="text-[9px] text-slate-500 hover:text-red-400 cursor-pointer"
              >
                Clear text
              </button>
            </div>
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
          {ingestMode === 'text'
            ? 'Emits: inputs.text'
            : filesList.length >= 2
              ? 'Emits: inputs.files, inputs.slotA & inputs.slotB'
              : 'Emits: inputs.files & inputs[keys]'}
        </span>
      </div>

    </div>
  );
}
