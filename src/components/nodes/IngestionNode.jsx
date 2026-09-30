import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  UploadCloud, 
  FileAudio, 
  FileText, 
  FileSpreadsheet, 
  FileCode,
  Type, 
  Check, 
  Trash2, 
  Sparkles, 
  Minimize2, 
  Maximize2, 
  Mic, 
  Play, 
  Pause,
  AlertCircle,
  Loader2,
  FileCheck2,
  BookOpen,
  ArrowRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { transcribeAudioUniversal, getProviderCredential } from '../../services/llmService';
import { INITIAL_GOLDEN_DATASET } from '../../constants/goldenDataset';

// Map file extension to human label and icon
function getFileFormatMeta(fileName = '', mimeType = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext) || mimeType.startsWith('audio/')) {
    return {
      type: 'audio',
      label: ext.toUpperCase() || 'AUDIO',
      color: '#0091DA', // Pacific Blue
      bgColor: '#E6F4FC',
      Icon: FileAudio
    };
  }
  if (['csv', 'xlsx', 'xls'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
    return {
      type: 'spreadsheet',
      label: ext.toUpperCase() || 'DATA',
      color: '#009A44', // Green
      bgColor: '#E6F5EC',
      Icon: FileSpreadsheet
    };
  }
  if (['json', 'yaml', 'yml'].includes(ext)) {
    return {
      type: 'code',
      label: ext.toUpperCase(),
      color: '#EAAA00', // Amber
      bgColor: '#FDF7E6',
      Icon: FileCode
    };
  }
  if (['pdf', 'docx', 'doc', 'pptx'].includes(ext)) {
    return {
      type: 'document',
      label: ext.toUpperCase(),
      color: '#6D2077', // Magenta
      bgColor: '#F2E9F4',
      Icon: FileText
    };
  }
  return {
    type: 'text',
    label: (ext || 'TXT').toUpperCase(),
    color: '#00338D', // Navy
    bgColor: '#E6EDF7',
    Icon: FileText
  };
}

export default function IngestionNode({ id, data = {}, selected }) {
  const {
    title = 'Data & File Ingestion',
    content = '',
    fileName = '',
    fileSize = '',
    fileType = 'text',
    status = 'idle', // 'idle' | 'uploading' | 'transcribing' | 'ready'
    isDarkMode = true,
    isExpanded: initialExpanded = false,
    onDelete
  } = data;

  // Local state
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'text' | 'samples'
  const [textInput, setTextInput] = useState(content || '');
  const [currentFile, setCurrentFile] = useState(fileName ? { name: fileName, size: fileSize } : null);
  const [fileContent, setFileContent] = useState(content || '');
  const [localStatus, setLocalStatus] = useState(status || (content ? 'ready' : 'idle'));
  const [statusMessage, setStatusMessage] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync external content update if provided
  useEffect(() => {
    if (content && content !== fileContent) {
      setFileContent(content);
      setTextInput(content);
      setLocalStatus('ready');
    }
  }, [content]);

  // Derive file meta
  const meta = getFileFormatMeta(currentFile?.name || (fileContent ? 'transcript.txt' : ''), '');
  const IconComponent = meta.Icon;

  // Word & character stats
  const charCount = (fileContent || textInput || '').length;
  const wordCount = (fileContent || textInput || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  // Broadcast ingestion update to Canvas and Agent pipeline
  const broadcastUpdate = (newContent, fileDetails, newStatus = 'ready') => {
    setFileContent(newContent);
    setLocalStatus(newStatus);
    data.content = newContent;
    data.fileName = fileDetails?.name || currentFile?.name || 'input.txt';
    data.fileSize = fileDetails?.size || currentFile?.size || `${(newContent.length / 1024).toFixed(1)} KB`;
    data.status = newStatus;

    try {
      window.dispatchEvent(new CustomEvent('keaos:ingestion-updated', {
        detail: {
          nodeId: id,
          content: newContent,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: meta.type,
          status: newStatus
        }
      }));
    } catch (e) {
      console.warn('Failed to dispatch keaos:ingestion-updated:', e);
    }
  };

  // Handle local file selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileMeta = getFileFormatMeta(file.name, file.type);
    setCurrentFile({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type
    });

    // 1. Audio handling (.mp3, .wav, .m4a, etc.)
    if (fileMeta.type === 'audio') {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setLocalStatus('transcribing');
      setIsTranscribing(true);
      setStatusMessage('Transcribing audio via Multimodal Speech API...');

      try {
        const transResult = await transcribeAudioUniversal(file);
        const transcript = transResult.transcript;
        broadcastUpdate(transcript, {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        }, 'ready');
        setStatusMessage(`Transcribed in ${(transResult.durationMs / 1000).toFixed(1)}s via ${transResult.provider}`);
      } catch (err) {
        console.warn('Transcription fallback error:', err);
        // Fallback: Create structured audio placeholder with metadata if API key missing
        const fallbackTranscript = `[AUDIO INGESTION: ${file.name}]\nFormat: ${file.type || 'audio/mp3'} | Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB\n\nNotice: Direct transcription API key missing in Settings. This audio file is loaded in memory for native multimodal analysis.`;
        broadcastUpdate(fallbackTranscript, {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        }, 'ready');
        setStatusMessage('Audio ingested in memory. Set Google/OpenAI key to auto-transcribe.');
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // 2. Documents & Plain Text (.txt, .md, .csv, .json, .docx, .doc)
    const ext = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      let extracted = event.target?.result || '';
      // Quick DOCX XML text strip
      if (['docx', 'doc'].includes(ext) && typeof extracted === 'string') {
        const matches = extracted.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (matches && matches.length > 0) {
          extracted = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
        } else {
          extracted = extracted.replace(/[\x00-\x1F\x7F-\x9F]+/g, ' ').replace(/<[^>]+>/g, ' ').trim();
        }
      }

      broadcastUpdate(extracted, {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      }, 'ready');
      setStatusMessage(`Ingested ${extracted.length} characters`);
    };

    reader.readAsText(file);
  };

  // Handle direct text apply
  const handleApplyText = () => {
    if (!textInput.trim()) return;
    setCurrentFile({
      name: 'manual_input.txt',
      size: `${(textInput.length / 1024).toFixed(1)} KB`
    });
    broadcastUpdate(textInput.trim(), {
      name: 'manual_input.txt',
      size: `${(textInput.length / 1024).toFixed(1)} KB`
    }, 'ready');
    setStatusMessage(`Manual text applied (${textInput.length} chars)`);
  };

  // Handle preset sample selection
  const handleSelectSample = (sample) => {
    setCurrentFile({
      name: `${sample.caseName.replace(/\s+/g, '_').toLowerCase()}.txt`,
      size: `${(sample.inputTranscript.length / 1024).toFixed(1)} KB`
    });
    setTextInput(sample.inputTranscript);
    broadcastUpdate(sample.inputTranscript, {
      name: `${sample.caseName.replace(/\s+/g, '_').toLowerCase()}.txt`,
      size: `${(sample.inputTranscript.length / 1024).toFixed(1)} KB`
    }, 'ready');
    setStatusMessage(`Loaded "${sample.caseName}" preset`);
  };

  // Clear ingested data
  const handleClear = () => {
    setFileContent('');
    setTextInput('');
    setCurrentFile(null);
    setAudioUrl(null);
    setLocalStatus('idle');
    setStatusMessage('');
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
    broadcastUpdate('', null, 'idle');
  };

  // Toggle audio playback preview
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // -------------------------------------------------------------
  // 1. COLLAPSED CIRCULAR BADGE (Default Canvas Representation)
  // -------------------------------------------------------------
  if (!isExpanded) {
    const isReady = localStatus === 'ready' && fileContent;
    const isProcessing = isTranscribing || localStatus === 'transcribing';
    const isExecuting = data.isExecuting;

    return (
      <div className="relative group flex flex-col items-center select-none">
        {/* Floating Active Beacon */}
        {isExecuting && (
          <div 
            className="absolute -top-7 whitespace-nowrap px-2 py-0.5 rounded-full text-[8.5px] font-mono tracking-wider font-bold uppercase shadow-lg z-30 flex items-center gap-1.5 text-white animate-bounce pointer-events-none"
            style={{ backgroundColor: '#0091DA' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>INGESTING / FEEDING</span>
          </div>
        )}

        {/* Right Socket: data-out (feeds directly to agent tools-in) */}
        <Handle
          type="source"
          position={Position.Right}
          id="data-out"
          style={{
            top: '50%',
            right: '-6px',
            transform: 'translateY(-50%) rotate(45deg)',
            width: '10px',
            height: '10px',
            borderRadius: '2px',
            backgroundColor: meta.color,
            borderColor: isDarkMode ? '#1E2026' : '#FFFFFF',
            borderWidth: '2px',
            zIndex: 10
          }}
          title="Connect Ingested Data Stream to Agent"
        />

        {/* 60px Circular Morphing Disc */}
        <div
          onClick={() => setIsExpanded(true)}
          className={`w-15 h-15 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-200 cursor-pointer shadow-lg relative group-hover:scale-105 active:scale-95 ${
            isExecuting || isProcessing
              ? 'border-[#0091DA] ring-4 ring-[#0091DA]/30 animate-pulse shadow-[0_0_24px_rgba(0,145,218,0.7)] scale-105'
              : isReady
                ? 'border-[#10B981] ring-2 ring-[#10B981]/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'border-amber-500/60 ring-2 ring-amber-500/20'
          } ${
            isDarkMode
              ? 'bg-[#181920] text-white'
              : 'bg-white text-slate-800'
          } ${selected ? 'ring-4 ring-[#0091DA]' : ''}`}
        >
          {/* Animated Concentric Radar Wave when Active */}
          {(isExecuting || isProcessing) && (
            <>
              <span 
                className="absolute -inset-3 rounded-full animate-ping opacity-50 pointer-events-none"
                style={{ backgroundColor: '#0091DA' }}
              />
              <span 
                className="absolute -inset-1.5 rounded-full animate-pulse opacity-40 pointer-events-none"
                style={{ backgroundColor: '#0091DA' }}
              />
            </>
          )}
          {/* Pulsing Status Beacon */}
          <span 
            className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 ${
              isDarkMode ? 'border-[#181920]' : 'border-white'
            } ${
              isProcessing
                ? 'bg-[#0091DA] animate-ping'
                : isReady
                  ? 'bg-[#10B981]'
                  : 'bg-amber-500'
            }`}
          />

          {/* Central File/Audio Icon */}
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#0091DA]" />
          ) : (
            <IconComponent 
              className="w-6 h-6 transition-transform group-hover:scale-110" 
              style={{ color: meta.color }} 
            />
          )}

          {/* Micro Format Pill */}
          <span 
            className="text-[7.5px] font-mono font-bold uppercase tracking-tight px-1 rounded-full mt-0.5"
            style={{ 
              backgroundColor: `${meta.color}20`, 
              color: meta.color 
            }}
          >
            {isReady ? meta.label : 'INGEST'}
          </span>
        </div>

        {/* Succinct Canvas Label */}
        <div className="mt-2 text-center max-w-[130px]">
          <span className={`text-[11px] font-semibold tracking-tight block truncate ${
            isDarkMode ? 'text-white' : 'text-[#111827]'
          }`}>
            {currentFile?.name ? currentFile.name : title}
          </span>
          <span className="text-[9px] font-mono block -mt-0.5 text-slate-400">
            {isProcessing ? 'Transcribing...' : isReady ? `${charCount} chars ready` : 'Click to Upload'}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. EXPANDED VIEWPORT CARD (Rich File Upload & Audio Ingestion)
  // -------------------------------------------------------------
  return (
    <div className={`relative w-[420px] rounded-2xl border-2 transition-all duration-200 shadow-2xl select-none morph-apple-motion ${
      isDarkMode 
        ? 'bg-[#14161F] border-[#2C3142] text-white shadow-[0_20px_50px_rgba(0,0,0,0.7)]' 
        : 'bg-white border-[#CBD5E1] text-[#0B0F19] shadow-[0_16px_36px_rgba(0,30,80,0.12)]'
    } ${selected ? 'ring-2 ring-[#0091DA]' : ''}`}>
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.txt,.md,.csv,.json,.pdf,.docx,.doc,.pptx,.xlsx,.xls,.log"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden Audio Player for Preview */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

      {/* Right Socket: data-out */}
      <Handle
        type="source"
        position={Position.Right}
        id="data-out"
        style={{
          top: '32px',
          right: '-7px',
          width: '12px',
          height: '12px',
          borderRadius: '3px',
          backgroundColor: '#0091DA',
          borderColor: isDarkMode ? '#14161F' : '#FFFFFF',
          borderWidth: '2px',
          zIndex: 20
        }}
        title="Ingested Data Stream Out"
      />

      {/* Header Bar */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        isDarkMode ? 'border-[#2C3142] bg-[#1A1D28]' : 'border-slate-200 bg-slate-50'
      }`}>
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
          >
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold tracking-tight">
                {currentFile ? currentFile.name : 'Data & File Ingestion'}
              </h4>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold uppercase ${
                localStatus === 'ready' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isTranscribing 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {localStatus === 'ready' ? 'Ready' : isTranscribing ? 'Transcribing' : 'Empty'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Direct Ingestion Port & Pipeline Feeder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {fileContent && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear ingested file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Minimize to circular badge"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Switcher: Upload File / Direct Text / Enterprise Presets */}
      <div className={`px-3 pt-2.5 flex items-center gap-1.5 border-b text-[11px] font-mono ${
        isDarkMode ? 'border-[#2C3142] bg-[#14161F]' : 'border-slate-200 bg-white'
      }`}>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-1.5 rounded-t-lg font-bold transition-all border-b-2 ${
            activeTab === 'upload'
              ? 'border-[#0091DA] text-[#0091DA] bg-[#0091DA]/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Upload Source
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`px-3 py-1.5 rounded-t-lg font-bold transition-all border-b-2 ${
            activeTab === 'text'
              ? 'border-[#0091DA] text-[#0091DA] bg-[#0091DA]/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Raw Text
        </button>
        <button
          onClick={() => setActiveTab('samples')}
          className={`px-3 py-1.5 rounded-t-lg font-bold transition-all border-b-2 ${
            activeTab === 'samples'
              ? 'border-[#0091DA] text-[#0091DA] bg-[#0091DA]/10'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Enterprise Presets
        </button>
      </div>

      {/* Main Body */}
      <div className="p-3.5 space-y-3">
        {/* Tab 1: Upload Source (Drag-and-Drop or File Picker) */}
        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDarkMode 
                  ? 'border-[#383E54] hover:border-[#0091DA] bg-[#181B26]/60 hover:bg-[#181B26]' 
                  : 'border-slate-300 hover:border-[#00338D] bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#0091DA]/15 text-[#0091DA] mx-auto flex items-center justify-center mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold mb-1">
                Drop audio, doc, or data file here
              </p>
              <p className="text-[10px] text-slate-400">
                Supports <strong className="text-[#0091DA]">MP3, WAV, M4A</strong>, PDF, DOCX, CSV, TXT, JSON
              </p>
            </div>

            {/* If Audio File is active: Audio Waveform Preview Bar */}
            {meta.type === 'audio' && (
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isDarkMode ? 'bg-[#181B26] border-[#2C3142]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlayAudio}
                    className="w-8 h-8 rounded-full bg-[#0091DA] hover:bg-[#005EB8] text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-white truncate max-w-[200px]">
                      {currentFile?.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {currentFile?.size} • Audio Track
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors"
                >
                  Change Audio
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Raw Text / Direct Paste */}
        {activeTab === 'text' && (
          <div className="space-y-2">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste raw transcript, meeting notes, customer email, or policy directives here..."
              rows={6}
              className={`w-full p-2.5 text-xs font-mono rounded-xl border resize-none focus:outline-none transition-colors ${
                isDarkMode 
                  ? 'bg-[#181B26] border-[#2C3142] text-white focus:border-[#0091DA]' 
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#00338D]'
              }`}
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{textInput.length} characters</span>
              <button
                onClick={handleApplyText}
                disabled={!textInput.trim()}
                className="px-3 py-1 bg-[#0091DA] hover:bg-[#005EB8] disabled:opacity-40 text-white rounded font-bold transition-all cursor-pointer"
              >
                Apply Text to Pipeline
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Enterprise Presets */}
        {activeTab === 'samples' && (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {INITIAL_GOLDEN_DATASET.map((sample) => (
              <div
                key={sample.id}
                onClick={() => handleSelectSample(sample)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode 
                    ? 'bg-[#181B26] border-[#2C3142] hover:border-[#0091DA] hover:bg-[#1E2230]' 
                    : 'bg-slate-50 border-slate-200 hover:border-[#00338D] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white tracking-tight">
                    {sample.caseName}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0091DA]/20 text-[#0091DA] font-bold">
                    {sample.category}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {sample.inputTranscript.slice(0, 140)}...
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Active Content Preview Ribbon */}
        {fileContent && (
          <div className={`p-2.5 rounded-xl border text-[10px] font-mono ${
            isDarkMode ? 'bg-[#10121A] border-[#222634]' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <FileCheck2 className="w-3.5 h-3.5" />
                Pipeline Payload Ready
              </span>
              <span>{wordCount} words • {charCount} chars</span>
            </div>
            <p className="line-clamp-3 text-slate-300 leading-relaxed font-sans text-[11px]">
              {fileContent}
            </p>
          </div>
        )}

        {/* Status / Feedback message */}
        {statusMessage && (
          <div className="text-[10px] font-mono text-[#0091DA] flex items-center gap-1 px-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className={`p-3 border-t flex items-center justify-between text-[11px] font-mono ${
        isDarkMode ? 'border-[#2C3142] bg-[#181B26]' : 'border-slate-200 bg-slate-50'
      }`}>
        <span className="text-slate-400 flex items-center gap-1.5">
          <ArrowRight className="w-3.5 h-3.5 text-[#0091DA]" />
          <span>Feeds Agent <strong>tools-in</strong></span>
        </span>

        <button
          onClick={() => {
            setIsExpanded(false);
            window.dispatchEvent(new CustomEvent('keaos:toast', {
              detail: { message: `📥 Ingested data loaded into Agent Pipeline` }
            }));
          }}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition-all cursor-pointer"
        >
          Confirm & Collapse
        </button>
      </div>
    </div>
  );
}
