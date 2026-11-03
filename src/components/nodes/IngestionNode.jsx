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
  Fingerprint,
  Sliders,
  ChevronDown,
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

  // Constraint toggle: Enforce Distinct Files (ON by default)
  const [enforceDistinct, setEnforceDistinct] = useState(
    data.enforceDistinct !== undefined ? Boolean(data.enforceDistinct) : true
  );

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

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const configRef = useRef(null);
  const settingsBtnRef = useRef(null);

  // Close popover on outside click or Escape key (Emil Kowalski UX)
  useEffect(() => {
    if (!isConfigOpen) return;
    const handleOutsideClick = (e) => {
      if (
        configRef.current?.contains(e.target) || 
        settingsBtnRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsConfigOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsConfigOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isConfigOpen]);

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
    if (data.enforceDistinct !== undefined && data.enforceDistinct !== enforceDistinct) {
      setEnforceDistinct(Boolean(data.enforceDistinct));
    }
    if (data.ingestMode && data.ingestMode !== ingestMode) {
      setIngestMode(data.ingestMode === 'text' ? 'text' : 'files');
    }
  }, [data.maxFiles, data.enforceUniformType, data.enforceDistinct, data.ingestMode]);

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
  const broadcastFilesUpdate = (newFilesList, currentLimit = maxFiles, currentUniform = enforceUniformType, currentMode = ingestMode, currentDistinct = enforceDistinct) => {
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
    data.enforceDistinct = currentDistinct;
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
          maxFiles: currentLimit,
          enforceUniformType: currentUniform,
          enforceDistinct: currentDistinct,
          ingestMode: ingestMode,
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

    // Distinct Files Enforcement Rule (ON by default)
    if (enforceDistinct) {
      // 1. Check if any incoming file is already in filesList
      const existingDuplicate = newRawFiles.find(newFile =>
        filesList.some(existing =>
          existing.name === newFile.name &&
          (existing.sizeBytes === newFile.size || existing.size === newFile.size)
        )
      );
      if (existingDuplicate) {
        setErrorAlert(
          `Duplicate File Rejected: "${existingDuplicate.name}" is already uploaded. Turn off "Distinct Files" in Settings if duplicate intake is intended.`
        );
        return;
      }

      // 2. Check for internal duplicates within the new incoming batch
      const seenInBatch = new Set();
      for (const file of newRawFiles) {
        const sig = `${file.name}-${file.size}`;
        if (seenInBatch.has(sig)) {
          setErrorAlert(
            `Duplicate File in Selection: "${file.name}" was selected multiple times in this batch.`
          );
          return;
        }
        seenInBatch.add(sig);
      }
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

  const handleModeChange = (newMode) => {
    setIngestMode(newMode);
    data.ingestMode = newMode;
    setErrorAlert(null);
    if (newMode === 'text') {
      handleTextChange(textContent, 'text');
    } else {
      broadcastFilesUpdate(filesList, maxFiles, enforceUniformType, 'files');
    }
  };

  const handleLimitChange = (newLimit) => {
    const val = newLimit === 'unlimited' ? 'unlimited' : Math.max(1, parseInt(newLimit, 10) || 1);
    setMaxFiles(val);
    data.maxFiles = val;
    broadcastFilesUpdate(filesList, val, enforceUniformType, ingestMode);
  };

  const handleToggleUniform = () => {
    const nextVal = !enforceUniformType;
    setEnforceUniformType(nextVal);
    data.enforceUniformType = nextVal;
    broadcastFilesUpdate(filesList, maxFiles, nextVal, ingestMode, enforceDistinct);
  };

  const handleToggleDistinct = () => {
    const nextVal = !enforceDistinct;
    setEnforceDistinct(nextVal);
    data.enforceDistinct = nextVal;
    broadcastFilesUpdate(filesList, maxFiles, enforceUniformType, ingestMode, nextVal);
  };

  const handleTextChange = (newText, currentMode = 'text') => {
    setTextContent(newText);
    data.content = newText;
    data.status = newText?.trim() ? 'ready' : 'empty';
    data.lastOutput = { text: newText, content: newText };
    data.ingestMode = currentMode;

    window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
      detail: {
        nodeId: id,
        content: newText,
        output: { text: newText, content: newText },
        status: newText?.trim() ? 'ready' : 'empty',
        ingestMode: currentMode,
        maxFiles,
        enforceUniformType,
        enforceDistinct
      }
    }));
  };

  const handleCopyVar = (key) => {
    navigator.clipboard?.writeText(`inputs.${key}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isUnlimited = maxFiles === 'unlimited';
  const displayTarget = isUnlimited ? '∞' : maxFiles;
  const remainingCapacity = isUnlimited ? Infinity : Math.max(0, maxFiles - filesList.length);
  const canAddMore = isUnlimited || filesList.length < maxFiles;

  // -------------------------------------------------------------
  // 1. COMPACT ORIGIN DISC VIEW (Rule 13 Origin Token Invariant)
  // -------------------------------------------------------------
  if (!isExpanded) {
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
  // 2. EXPANDED INSTITUTIONAL VIEWPORT CARD (Hybrid Apple-Google Studio)
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
      className={`nowheel relative group flex flex-col rounded-[22px] border transition-all duration-200 select-none font-sans ${
        isDeactivated ? 'opacity-40 grayscale pointer-events-none' : ''
      } ${
        isDarkMode 
          ? 'bg-[#080E1C] text-white shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.12)]' 
          : 'bg-white text-[#001E50] shadow-[0_16px_36px_rgba(0,51,141,0.08),0_2px_8px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)]'
      } ${
        statusInfo.isReady
          ? 'border-[#009A44] shadow-[0_0_24px_rgba(0,154,68,0.25)]'
          : isDarkMode 
            ? 'border-white/[0.09]' 
            : 'border-slate-200/90'
      } ${selected ? 'ring-2 ring-[#00B8F5] shadow-[0_0_26px_rgba(0,184,245,0.35)]' : ''}`}
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
        lineClassName="!border-[#00B8F5] hover:!border-2 !opacity-30 hover:!opacity-100 transition-opacity"
        handleClassName="!w-3 !h-3 !bg-[#00B8F5] !border-2 !border-white !rounded-full hover:!scale-125 transition-transform"
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
      <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0 rounded-t-[21px] transition-colors ${
        isDarkMode ? 'border-white/[0.07] bg-white/[0.02]' : 'border-slate-200/80 bg-slate-50/80'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#00338D]/15 text-[#0091DA] flex items-center justify-center shrink-0 shadow-xs border border-[#0091DA]/20">
            <UploadCloud className="w-4 h-4 text-[#0091DA]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`text-xs font-mono font-bold uppercase tracking-wider truncate ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {nodeTitle || 'Universal Ingestion Port'}
              </h4>
              <span 
                className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border shrink-0 transition-colors"
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
              Multimodal Ingestion • Zero-RAM Sniffer
            </p>
          </div>
        </div>

        {/* Minimalist Controls with Restored Settings Button & Popover */}
        <div 
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="nodrag nopan relative flex items-center gap-2 shrink-0 select-none"
        >
          {/* Settings / Configuration Pill Button */}
          <button
            ref={settingsBtnRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsConfigOpen((prev) => !prev);
            }}
            className={`px-3 py-1.5 text-[10px] font-mono font-semibold rounded-full border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              isConfigOpen
                ? 'bg-[#0091DA] text-white border-[#0091DA] shadow-[0_0_12px_rgba(0,145,218,0.4)]'
                : isDarkMode
                  ? 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 border-white/[0.1]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Configure Stream Type, File Limits & Uniform Rules"
          >
            <Sliders className="w-3.5 h-3.5 text-[#0091DA]" />
            <span>
              {ingestMode === 'text' 
                ? 'Direct Text' 
                : `Limit: ${displayTarget}${enforceUniformType ? ' • Uniform' : ''}${enforceDistinct ? ' • Distinct' : ''}`}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isConfigOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isDarkMode 
                ? 'border-white/[0.08] hover:bg-white/10 text-slate-400 hover:text-white' 
                : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
            title="Minimize to Origin Disc"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Floating Frosted Glass Settings Popover */}
          {isConfigOpen && (
            <div 
              ref={configRef}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className={`nodrag nopan absolute top-full right-0 mt-2 w-72 rounded-2xl border p-3.5 space-y-3 z-50 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
                isDarkMode 
                  ? 'bg-[#080E1C]/96 border-white/[0.12] text-white shadow-black/80' 
                  : 'bg-white/98 border-slate-200 text-slate-900 shadow-slate-300/60'
              }`}
            >
              {/* Header of Popover */}
              <div className="flex items-center justify-between border-b pb-2 border-inherit">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#0091DA] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Port Configuration
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfigOpen(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Stream Type Segmented Control */}
              <div className="space-y-1.5">
                <label className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Intake Stream Type
                </label>
                <div className={`grid grid-cols-2 p-1 rounded-xl border ${
                  isDarkMode ? 'bg-black/30 border-white/[0.07]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeChange('files');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                      ingestMode === 'files'
                        ? 'bg-[#0091DA] text-white font-bold shadow-xs'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Files & Media
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModeChange('text');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
                      ingestMode === 'text'
                        ? 'bg-[#0091DA] text-white font-bold shadow-xs'
                        : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Raw Direct Text
                  </button>
                </div>
              </div>

              {/* File Limit & Presets (Files mode only) */}
              {ingestMode === 'files' && (
                <div className="space-y-2 pt-1 border-t border-inherit">
                  <div className="flex items-center justify-between">
                    <label className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      Max Files Limit
                    </label>
                    <span className="text-[10px] font-mono text-[#0091DA] font-bold">
                      {isUnlimited ? 'Unlimited (∞)' : `${maxFiles} file${maxFiles === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {/* Stepper + Input */}
                  <div className="flex items-center gap-1.5">
                    <div className={`flex items-center rounded-xl border overflow-hidden flex-1 ${
                      isDarkMode ? 'bg-black/30 border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cur = isUnlimited ? 1 : Math.max(1, (Number(maxFiles) || 1) - 1);
                          handleLimitChange(cur);
                        }}
                        disabled={!isUnlimited && Number(maxFiles) <= 1}
                        className="w-8 h-7 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
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
                          e.stopPropagation();
                          const val = e.target.value.trim();
                          if (val === '') {
                            handleLimitChange(1);
                          } else {
                            const num = Math.max(1, parseInt(val, 10) || 1);
                            handleLimitChange(Math.min(500, num));
                          }
                        }}
                        className={`w-full h-7 text-center font-mono text-xs font-bold bg-transparent outline-none border-x ${
                          isDarkMode ? 'border-white/[0.08] text-cyan-400' : 'border-slate-200 text-[#00338D]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cur = isUnlimited ? 2 : (Number(maxFiles) || 1) + 1;
                          handleLimitChange(Math.min(500, cur));
                        }}
                        className="w-8 h-7 flex items-center justify-center text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 5, 10].map(cnt => {
                        const isPresetActive = !isUnlimited && Number(maxFiles) === cnt;
                        return (
                          <button
                            key={cnt}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLimitChange(cnt);
                            }}
                            className={`w-6 h-7 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              isPresetActive
                                ? 'bg-[#0091DA] text-white shadow-xs'
                                : isDarkMode
                                  ? 'bg-black/30 border border-white/[0.07] text-slate-400 hover:text-white'
                                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {cnt}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLimitChange('unlimited');
                        }}
                        className={`w-6 h-7 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          isUnlimited
                            ? 'bg-[#0091DA] text-white shadow-xs'
                            : isDarkMode
                              ? 'bg-black/30 border border-white/[0.07] text-slate-400 hover:text-white'
                              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                        title="Unlimited files"
                      >
                        ∞
                      </button>
                    </div>
                  </div>

                  {/* Uniform File Type Toggle Row */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleUniform();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 mt-2 transition-all duration-150 cursor-pointer select-none group/toggle ${
                      isDarkMode 
                        ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]' 
                        : 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        enforceUniformType 
                          ? 'bg-[#00338D]/15 border-[#00338D]/40 text-[#00338D] dark:text-[#0091DA]' 
                          : isDarkMode 
                            ? 'bg-white/5 border-white/10 text-slate-400' 
                            : 'bg-white border-slate-200 text-slate-500 shadow-2xs'
                      }`}>
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-sans font-semibold block leading-tight transition-colors ${
                          isDarkMode ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          Uniform File Type
                        </span>
                        <span className={`text-[9.5px] font-sans block leading-tight mt-0.5 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Require all files to share category
                        </span>
                      </div>
                    </div>

                    {/* Minimalist Sliding Switch in Royal Navy Blue (#00338D) */}
                    <div 
                      role="switch"
                      aria-checked={enforceUniformType}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        enforceUniformType
                          ? isDarkMode
                            ? 'bg-[#00338D] shadow-[0_0_12px_rgba(0,145,218,0.35)]'
                            : 'bg-[#00338D] shadow-[0_0_10px_rgba(0,51,141,0.25)]'
                          : isDarkMode
                            ? 'bg-slate-700'
                            : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          enforceUniformType ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Distinct Files Constraint Toggle Row */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDistinct();
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 mt-1.5 transition-all duration-150 cursor-pointer select-none group/toggle ${
                      isDarkMode 
                        ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08]' 
                        : 'bg-slate-50/90 hover:bg-slate-100/90 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                        enforceDistinct 
                          ? 'bg-[#00338D]/15 border-[#00338D]/40 text-[#00338D] dark:text-[#0091DA]' 
                          : isDarkMode 
                            ? 'bg-white/5 border-white/10 text-slate-400' 
                            : 'bg-white border-slate-200 text-slate-500 shadow-2xs'
                      }`}>
                        <Fingerprint className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-sans font-semibold block leading-tight transition-colors ${
                          isDarkMode ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          Distinct Files Only
                        </span>
                        <span className={`text-[9.5px] font-sans block leading-tight mt-0.5 ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          Prevent duplicate file uploads
                        </span>
                      </div>
                    </div>

                    {/* Minimalist Sliding Switch in Royal Navy Blue (#00338D) */}
                    <div 
                      role="switch"
                      aria-checked={enforceDistinct}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        enforceDistinct
                          ? isDarkMode
                            ? 'bg-[#00338D] shadow-[0_0_12px_rgba(0,145,218,0.35)]'
                            : 'bg-[#00338D] shadow-[0_0_10px_rgba(0,51,141,0.25)]'
                          : isDarkMode
                            ? 'bg-slate-700'
                            : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          enforceDistinct ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Error Alert Banner */}
      {errorAlert && (
        <div className="px-4 py-2 bg-red-500/15 border-b border-red-500/30 flex items-center justify-between text-xs font-mono text-red-300 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-[11px] leading-tight">{errorAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorAlert(null)}
            className="p-1 hover:bg-red-500/20 text-red-400 hover:text-white rounded-full cursor-pointer shrink-0 ml-2 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Body */}
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          setIsDragOver(false);
          handleMultiFileDrop(e);
        }}
        className={`flex-1 p-4 overflow-y-auto space-y-3 transition-colors rounded-b-[21px] ${
          isDarkMode ? 'bg-[#040813]' : 'bg-[#F8FAFC]'
        }`}
      >
        {/* 1. Files & Media Mode */}
        {ingestMode === 'files' && (
          <div className="h-full flex flex-col justify-between">
            {filesList.length === 0 ? (
              /* Empty State: Ultra-Minimalist Apple AirDrop Radar */
              <div 
                onClick={() => multiFileInputRef.current?.click()}
                className={`h-full min-h-[220px] rounded-2xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden ${
                  isDragOver
                    ? 'border-[#00B8F5] bg-[#0091DA]/10 scale-[1.008] shadow-[0_0_24px_rgba(0,184,245,0.25)]'
                    : isDarkMode
                      ? 'border-white/10 hover:border-[#0091DA]/60 bg-white/[0.02] hover:bg-white/[0.04]'
                      : 'border-slate-300 hover:border-[#0091DA]/60 bg-white/70 hover:bg-white'
                }`}
              >
                {/* Concentric AirDrop Breathing Radar Rings */}
                <div className="relative mb-3 flex items-center justify-center">
                  <div className={`w-32 h-32 rounded-full border transition-all duration-500 flex items-center justify-center ${
                    isDragOver 
                      ? 'border-[#00B8F5]/50 scale-110 shadow-[0_0_30px_rgba(0,184,245,0.3)]'
                      : 'border-[#0091DA]/15 group-hover:border-[#0091DA]/30 animate-pulse'
                  }`}>
                    <div className={`w-24 h-24 rounded-full border transition-all duration-300 flex items-center justify-center ${
                      isDragOver ? 'border-[#00B8F5]/70' : 'border-[#0091DA]/25 group-hover:border-[#0091DA]/50'
                    }`}>
                      {/* Central Floating Squircle Icon Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00338D]/20 to-[#0091DA]/20 border border-[#0091DA]/40 text-[#0091DA] flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-transform duration-200">
                        <UploadCloud className="w-7 h-7 text-[#0091DA] group-hover:text-[#00B8F5] transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Typography */}
                <h5 className={`text-sm font-sans font-bold tracking-tight transition-colors ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Drop Files Here or Click to Browse
                </h5>
                <p className={`text-xs font-sans mt-1 max-w-sm ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Supports Datasets (CSV, XLSX, Parquet), Audio (MP3, WAV), Images, and Documents
                </p>

                {/* Capacity Telemetry Pill */}
                <div className="flex items-center gap-2 mt-4 text-[10px] font-mono">
                  <span className={`px-2.5 py-0.5 rounded-full border font-bold ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/10 text-cyan-400' 
                      : 'bg-white border-slate-200 text-[#00338D] shadow-xs'
                  }`}>
                    Limit: {isUnlimited ? 'Unlimited' : `${maxFiles} File${maxFiles === 1 ? '' : 's'}`}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">Zero-RAM 64KB Sniffing</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400">1M+ Row Scale</span>
                </div>
              </div>
            ) : (
              /* Populated State: Responsive Apple Stash Cards Grid */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Uploaded Files ({filesList.length} of {isUnlimited ? '∞' : maxFiles})
                    </span>
                    {enforceUniformType && filesList[0] && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 uppercase font-bold">
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
                        className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 relative group ${
                          isDarkMode
                            ? 'bg-[#0B101D] border-white/[0.08] hover:border-[#0091DA]/50 shadow-lg'
                            : 'bg-white border-slate-200/90 hover:border-[#0091DA]/50 shadow-xs hover:shadow-md'
                        }`}
                      >
                        {/* Card Top: Category Badge, Size & Delete */}
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border"
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
                              className="p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card Body: Icon, Title & Dynamic Metadata */}
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 shadow-xs"
                            style={{
                              backgroundColor: `${badgeColor}12`,
                              borderColor: `${badgeColor}30`,
                              color: badgeColor
                            }}
                          >
                            <FileIcon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className={`text-xs font-mono font-bold block truncate ${
                              isDarkMode ? 'text-white' : 'text-slate-900'
                            }`} title={file.name}>
                              {file.name}
                            </span>

                            {isTabular && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                {file.rowCount?.toLocaleString()} rows • {file.columnCount} cols
                              </span>
                            )}

                            {isAudio && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                Audio Recording • Multimodal
                              </span>
                            )}

                            {isImage && (
                              <div className="mt-1">
                                {file.previewUrl ? (
                                  <img 
                                    src={file.previewUrl} 
                                    alt={file.name} 
                                    className="w-full h-16 object-cover rounded-lg border border-inherit" 
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
                                  <span key={i} className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${
                                    isDarkMode
                                      ? 'bg-black/30 text-[#0091DA] border-white/10'
                                      : 'bg-slate-100 text-[#00338D] border-slate-200'
                                  }`}>
                                    {typeof c === 'string' ? c : c.name}
                                  </span>
                                ))}
                                {file.columns.length > 4 && (
                                  <span className="px-1.5 py-0.2 rounded text-[8px] font-mono text-slate-400">
                                    +{file.columns.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>


                      </div>
                    );
                  })}

                  {/* Add File Tile (if below capacity) */}
                  {canAddMore && (
                    <div 
                      onClick={() => multiFileInputRef.current?.click()}
                      className={`min-h-[120px] p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${
                        isDarkMode
                          ? 'border-white/10 hover:border-[#0091DA] bg-white/[0.02] hover:bg-white/[0.04]'
                          : 'border-slate-300 hover:border-[#0091DA] bg-white/60 hover:bg-white'
                      }`}
                    >
                      <Plus className="w-6 h-6 text-slate-400 group-hover:text-[#0091DA] transition-colors mb-1" />
                      <span className={`text-xs font-mono font-bold transition-colors ${
                        isDarkMode ? 'text-slate-300 group-hover:text-white' : 'text-slate-700 group-hover:text-slate-900'
                      }`}>
                        + Add File
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">
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
          <div className={`h-full flex flex-col justify-between p-4 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-[#0A1020]/80 border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
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
              className={`flex-1 w-full p-3 rounded-xl border font-mono text-xs resize-none outline-none leading-relaxed transition-colors ${
                isDarkMode 
                  ? 'bg-black/30 border-white/10 text-slate-200 focus:border-[#0091DA]' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#0091DA]'
              }`}
            />

            <div className="pt-2 border-t border-inherit flex items-center justify-between text-[10px] font-mono">
              <button
                type="button"
                onClick={() => handleCopyVar('text')}
                className={`px-2 py-0.5 rounded-full border flex items-center gap-1 cursor-pointer transition-colors ${
                  isDarkMode
                    ? 'bg-black/40 hover:bg-black/70 text-[#0091DA] border-white/10'
                    : 'bg-slate-100 hover:bg-slate-200 text-[#00338D] border-slate-200'
                }`}
              >
                <span>inputs.text</span>
                {copiedKey === 'text' ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
              </button>
              <button
                type="button"
                onClick={() => handleTextChange('')}
                className="text-[9px] text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
              >
                Clear text
              </button>
            </div>
          </div>
        )}
      </div>

            {/* Sockets for Downstream Canvas Connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="data-out"
        style={{
          left: '50%',
          bottom: '-6px',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          borderRadius: '2px',
          backgroundColor: statusInfo.color,
          borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 10
        }}
        title="Connect Ingested Dataset Stream to Canvas DAG"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="tools-out"
        style={{
          top: '50%',
          right: '-6px',
          transform: 'translateY(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          borderRadius: '2px',
          backgroundColor: statusInfo.color,
          borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 10
        }}
        title="Horizontal Stream Out"
      />
    </div>
  );
}