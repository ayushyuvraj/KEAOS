import React, { useState, useRef, useEffect } from 'react';
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
  X 
} from 'lucide-react';
import MarkdownViewer from '../common/MarkdownViewer';

/**
 * OutputDisplayNode: Visual Canvas Output Component
 * - Resizable boundaries: Drag any border or corner to resize smoothly
 * - Scroll isolation: Mouse wheel scrolling within the box scrolls content and NEVER zooms canvas
 * - High contrast: Pitch-dark charcoal (#0F172A / text-slate-900) in Light Mode, crisp slate in Dark Mode
 * - Morphs between compact circular beacon and expansive resizable card
 */
export default function OutputDisplayNode({ id, data, selected }) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false);
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [viewFormat, setViewFormat] = useState('formatted'); // 'formatted' | 'raw'

  // Dimensions state for smooth boundary dragging
  const [customSize, setCustomSize] = useState({
    width: data.width || 480,
    height: data.height || 400
  });

  const contentAreaRef = useRef(null);

  // Compute theme from node data or root class
  const isDarkMode = data.isDarkMode !== undefined 
    ? data.isDarkMode 
    : !document.documentElement.classList.contains('light');

  const status = data.status || (data.outputContent ? 'ready' : 'idle'); // 'idle' | 'generating' | 'ready'
  const outputContent = data.outputContent || '';
  const auditHash = data.auditHash || null;
  const observability = data.observability || {
    totalTokens: data.tokens || 0,
    latencyMs: data.latencyMs || 0
  };
  const costUsd = data.costUsd ?? 0;
  const title = data.name || data.title || 'Agent Intelligence Output';
  const stageNumber = data.stageNumber || null;

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

  // Manual interactive boundary drag handlers (bottom-right corner, right border, bottom border)
  const startManualResize = (e, direction = 'both') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = customSize.width || 480;
    const startHeight = customSize.height || 400;

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      setCustomSize({
        width: direction === 'vertical' 
          ? startWidth 
          : Math.max(340, Math.min(1400, startWidth + deltaX)),
        height: direction === 'horizontal' 
          ? startHeight 
          : Math.max(220, Math.min(1100, startHeight + deltaY))
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
      <div className="relative group select-none flex flex-col items-center">
        {/* Quick Close Button on Hover */}
        <button
          onClick={handleClose}
          className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-md z-30"
          title="Close / Remove Output Component"
        >
          <X className="w-2.5 h-2.5" />
        </button>

        {/* Quick Stop Button when generating */}
        {status === 'generating' && (
          <button
            onClick={handleStopStream}
            className="absolute -top-6 whitespace-nowrap px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold flex items-center gap-1 shadow-lg hover:bg-red-700 cursor-pointer z-30 animate-bounce"
            title="Stop active stream"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>STOP</span>
          </button>
        )}

        {/* Left Target Socket (data-in) */}
        <Handle
          type="target"
          position={Position.Left}
          id="data-in"
          style={{
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: '9px',
            height: '9px',
            borderRadius: '2px',
            backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
            borderColor: isDarkMode ? '#171922' : '#FFFFFF',
            borderWidth: '2px',
            left: '-5px'
          }}
          title="Input: Connect Agent or Tool output stream"
        />

        {/* Circular Morphing Chassis */}
        <div
          onClick={toggleExpand}
          className={`w-[60px] h-[60px] rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl group-hover:scale-105 ${
            selected 
              ? 'ring-4 ring-[#0091DA]/30 border-[#0091DA]' 
              : isDarkMode 
                ? 'bg-[#151720] border-[#2E3346] hover:border-[#0091DA]' 
                : 'bg-white border-[#CBD5E1] hover:border-[#00338D]'
          } ${
            status === 'generating' 
              ? 'brain-glow-breath border-[#0091DA]' 
              : status === 'ready' 
                ? 'shadow-[0_0_16px_rgba(16,185,129,0.25)]' 
                : ''
          }`}
          title="Click to expand full model output and observability"
        >
          {/* Status Beacon Dot */}
          <div className="relative mb-0.5">
            <Sparkles className={`w-5 h-5 ${
              status === 'ready' 
                ? 'text-emerald-400' 
                : status === 'generating' 
                  ? 'text-[#0091DA] animate-spin' 
                  : isDarkMode ? 'text-slate-300' : 'text-[#00338D]'
            }`} />
            {status === 'generating' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0091DA] animate-ping" />
            )}
          </div>

          <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${
            status === 'ready' ? 'text-emerald-500' : isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {status === 'ready' ? 'Output' : status === 'generating' ? 'Running' : 'Ready'}
          </span>
        </div>

        {/* Right Source Socket (data-out: pipe to downstream agents) */}
        <Handle
          type="source"
          position={Position.Right}
          id="data-out"
          style={{
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: '9px',
            height: '9px',
            borderRadius: '2px',
            backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
            borderColor: isDarkMode ? '#171922' : '#FFFFFF',
            borderWidth: '2px',
            right: '-5px'
          }}
          title="Pass-through: Pipe output to downstream Agent or Evaluation"
        />

        {/* Sub-label under circle */}
        <div className="mt-1.5 flex flex-col items-center pointer-events-none text-center max-w-[100px]">
          <span className={`text-[10px] font-bold font-mono truncate ${
            isDarkMode ? 'text-slate-200' : 'text-slate-800'
          }`}>
            {title}
          </span>
          {observability?.totalTokens > 0 && (
            <span className="text-[8px] font-mono text-emerald-500 font-semibold">
              {observability.totalTokens} tokens
            </span>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EXPANDED MODEL OUTPUT VIEWPORT (Adjustable Boundaries & Scroll Isolated)
  // =========================================================================
  return (
    <div 
      onWheel={(e) => e.stopPropagation()}
      style={{
        width: `${customSize.width}px`,
        height: `${customSize.height}px`,
        minWidth: '340px',
        minHeight: '220px'
      }}
      className={`nowheel relative flex flex-col rounded-xl border-2 transition-colors duration-200 shadow-2xl select-text ${
        selected 
          ? 'ring-4 ring-[#0091DA]/30 border-[#0091DA]' 
          : isDarkMode 
            ? 'bg-[#151720] border-[#2E3346]' 
            : 'bg-white border-slate-300'
      }`}
    >
      {/* ReactFlow Dynamic Boundary Resizer Controls */}
      <NodeResizer 
        minWidth={340}
        minHeight={220}
        maxWidth={1400}
        maxHeight={1100}
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

      {/* Interactive Drag Handles on Boundaries */}
      <div
        onPointerDown={(e) => startManualResize(e, 'horizontal')}
        className="absolute top-0 right-0 w-2.5 h-full cursor-ew-resize z-20 group flex items-center justify-center"
        title="Drag boundary horizontally"
      >
        <div className="w-0.5 h-8 bg-transparent group-hover:bg-[#0091DA] rounded-full transition-colors" />
      </div>

      <div
        onPointerDown={(e) => startManualResize(e, 'vertical')}
        className="absolute bottom-0 left-0 w-full h-2.5 cursor-ns-resize z-20 group flex items-center justify-center"
        title="Drag boundary vertically"
      >
        <div className="h-0.5 w-8 bg-transparent group-hover:bg-[#0091DA] rounded-full transition-colors" />
      </div>

      <div
        onPointerDown={(e) => startManualResize(e, 'both')}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center text-slate-400 hover:text-[#0091DA] transition-colors"
        title="Drag corner to resize boundary"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current">
          <path d="M8 2L2 8M8 5L5 8M8 8L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Left Input Handle (data-in) */}
      <Handle
        type="target"
        position={Position.Left}
        id="data-in"
        style={{
          top: '32px',
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#151720' : '#FFFFFF',
          borderWidth: '2px',
          left: '-6px'
        }}
        title="Input: Connect Agent or Tool output stream"
      />

      {/* Right Output Handle (data-out) */}
      <Handle
        type="source"
        position={Position.Right}
        id="data-out"
        style={{
          top: '32px',
          width: '10px',
          height: '10px',
          borderRadius: '2px',
          backgroundColor: status === 'ready' ? '#10B981' : '#0091DA',
          borderColor: isDarkMode ? '#151720' : '#FFFFFF',
          borderWidth: '2px',
          right: '-6px'
        }}
        title="Pass-through: Pipe this output to downstream agent"
      />

      {/* ------------------------------------------------------------ */}
      {/* 1. HEADER BAR                                                */}
      {/* ------------------------------------------------------------ */}
      <div className={`p-3 border-b flex items-center justify-between gap-2 shrink-0 rounded-t-[10px] ${
        isDarkMode ? 'bg-[#1A1D27] border-[#2A2E3D]' : 'bg-slate-100 border-slate-300'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
            status === 'ready' 
              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
              : 'bg-[#0091DA]/15 text-[#0091DA] border border-[#0091DA]/30'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className={`text-xs font-bold tracking-tight truncate ${
                isDarkMode ? 'text-white' : 'text-[#001E50]'
              }`}>
                {title}
              </h4>
              {stageNumber && (
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  STEP {stageNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'ready' ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]' : status === 'generating' ? 'bg-[#0091DA] animate-ping' : 'bg-amber-400'
              }`} />
              <span className={status === 'ready' ? 'text-emerald-500 font-bold' : isDarkMode ? 'text-slate-400' : 'text-slate-700'}>
                {status === 'ready' ? 'READY' : status === 'generating' ? 'STREAMING...' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Window Actions */}
        <div className="flex items-center gap-1 shrink-0 nodrag">
          {/* Format Toggle (Formatted Markdown vs Raw Text) */}
          <div className={`flex items-center p-0.5 rounded border text-[10px] font-mono ${
            isDarkMode ? 'bg-[#12131A] border-slate-700' : 'bg-white border-slate-300'
          }`}>
            <button
              onClick={() => setViewFormat('formatted')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
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
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                viewFormat === 'raw' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
              title="Render Raw Monospace Text"
            >
              RAW
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!outputContent}
            className={`p-1.5 rounded border transition-all cursor-pointer active:scale-95 ${
              isDarkMode 
                ? 'bg-[#222533] border-slate-700 text-slate-300 hover:text-white hover:border-[#0091DA]' 
                : 'bg-white border-slate-300 text-slate-700 hover:text-black hover:border-[#00338D]'
            } ${!outputContent ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Copy Output Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Stop Stream Button when generating */}
          {status === 'generating' && (
            <button
              onClick={handleStopStream}
              className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white border border-red-400 flex items-center gap-1 text-[10px] font-mono font-bold transition-all cursor-pointer active:scale-95 shadow-sm animate-pulse"
              title="Stop active streaming output"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>STOP</span>
            </button>
          )}

          {/* Minimize back to Circle button */}
          <button
            onClick={toggleExpand}
            className={`p-1.5 rounded border transition-all cursor-pointer active:scale-95 ${
              isDarkMode 
                ? 'bg-[#222533] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500' 
                : 'bg-white border-slate-300 text-slate-700 hover:text-black hover:border-slate-400'
            }`}
            title="Minimize to circular badge"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Close / Remove button */}
          <button
            onClick={handleClose}
            className={`p-1.5 rounded border transition-all cursor-pointer active:scale-95 ${
              isDarkMode 
                ? 'bg-[#222533] border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40' 
                : 'bg-white border-slate-300 text-slate-600 hover:text-red-600 hover:border-red-300'
            }`}
            title="Close / Remove Output Component"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. OBSERVABILITY, AUDIT & COST RIBBON                         */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 text-[10px] font-mono flex-wrap shrink-0 ${
        isDarkMode ? 'bg-[#111319] border-[#222634] text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          {/* Latency */}
          <div className="flex items-center gap-1" title="Model Inference Latency">
            <Clock className="w-3 h-3 text-[#0091DA]" />
            <span>{observability?.latencyMs ? `${observability.latencyMs}ms` : '--'}</span>
          </div>

          {/* Tokens */}
          <div className="flex items-center gap-1" title="Total Tokens Processed">
            <Cpu className="w-3 h-3 text-purple-400" />
            <span>{observability?.totalTokens ? `${observability.totalTokens} tok` : '--'}</span>
          </div>

          {/* Cost */}
          <div className="flex items-center gap-0.5 text-amber-500 font-bold" title="Calculated Inference Cost">
            <DollarSign className="w-3 h-3" />
            <span>{costUsd > 0 ? costUsd.toFixed(4) : '0.0000'}</span>
          </div>
        </div>

        {/* SHA-256 Cryptographic Audit Hash */}
        {auditHash ? (
          <button
            onClick={handleCopyHash}
            className={`px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold cursor-pointer transition-colors nodrag ${
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
          <span className="text-[9px] opacity-60 font-mono">W3C Audit: Idle</span>
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
            <div className="w-8 h-8 rounded-full bg-[#0091DA]/20 border border-[#0091DA] text-[#0091DA] flex items-center justify-center animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs font-bold text-[#0091DA] animate-pulse">
                Streaming Output from Connected Agent...
              </p>
              <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Compiling multi-pillar intelligence graph & applying guardrails
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleStopStream}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Stop Streaming</span>
              </button>
              <button
                onClick={handleClose}
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  isDarkMode 
                    ? 'border-slate-600 hover:border-slate-400 text-slate-300 hover:bg-white/5' 
                    : 'border-slate-300 hover:border-slate-500 text-slate-700 hover:bg-black/5'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Close Component</span>
              </button>
            </div>
          </div>
        ) : outputContent ? (
          viewFormat === 'formatted' ? (
            <div className="space-y-2 select-text">
              <MarkdownViewer content={outputContent} isDarkMode={isDarkMode} />
            </div>
          ) : (
            <pre className={`p-3 rounded font-mono text-[11px] whitespace-pre-wrap select-text leading-relaxed ${
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
              Awaiting Agent Execution
            </p>
            <p className={`text-[10px] max-w-[260px] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Wire an agent's output port to this node and execute the workflow to view real-time results here.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4. FOOTER STATUS BAR                                         */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[9px] font-mono shrink-0 rounded-b-[10px] ${
        isDarkMode ? 'bg-[#181A24] border-[#2A2E3D] text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
      }`}>
        <div className="flex items-center gap-1.5">
          <span>{outputContent ? `${outputContent.split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
          <span>•</span>
          <span>{outputContent.length} chars</span>
        </div>
        <div className="flex items-center gap-1 text-[#0091DA] font-semibold">
          <span>Pass-through Socket</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
}
