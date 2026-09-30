import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Sparkles, 
  FileText, 
  Copy, 
  Check, 
  Minimize2, 
  Maximize2, 
  Activity, 
  ShieldCheck, 
  DollarSign, 
  Clock, 
  Cpu, 
  ExternalLink,
  Code,
  ArrowRight,
  Layers,
  Terminal,
  RefreshCw,
  Trash2
} from 'lucide-react';
import MarkdownViewer from '../common/MarkdownViewer';

/**
 * OutputDisplayNode: Visual Canvas Output Component
 * - Morphs from a compact circular beacon into an expansive rich text viewport
 * - Shows live formatted markdown output on canvas without opening drawer
 * - Incorporates Observability (tokens, latency), Audit (SHA-256), and Cost ROI
 * - Has input & pass-through output handles for multi-agent chaining
 */
export default function OutputDisplayNode({ id, data, selected }) {
  const [isExpanded, setIsExpanded] = useState(data.isExpanded ?? false);
  const [copied, setCopied] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [viewFormat, setViewFormat] = useState('formatted'); // 'formatted' | 'raw'

  const isDarkMode = data.isDarkMode ?? true;
  const status = data.status || (data.outputContent ? 'ready' : 'idle'); // 'idle' | 'generating' | 'ready'
  const outputContent = data.outputContent || '';
  const auditHash = data.auditHash || null;
  const observability = data.observability || {
    totalTokens: data.tokens || 0,
    latencyMs: data.latencyMs || 0
  };
  const costUsd = data.costUsd ?? 0;
  const title = data.name || data.title || 'Stage Output';
  const stageNumber = data.stageNumber || null;

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

  // =========================================================================
  // VIEW 1: COLLAPSED CIRCULAR BADGE (Default Compact Geometry)
  // =========================================================================
  if (!isExpanded) {
    return (
      <div className="relative group select-none flex flex-col items-center">
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
          <div className="absolute top-1 right-1">
            <span className={`w-2 h-2 rounded-full block ${
              status === 'generating' 
                ? 'bg-[#0091DA] animate-ping' 
                : status === 'ready' 
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' 
                  : 'bg-amber-400'
            }`} />
          </div>

          {/* Central Icon */}
          <div className={`transition-colors ${
            status === 'generating' 
              ? 'text-[#0091DA] animate-spin' 
              : status === 'ready' 
                ? 'text-emerald-500' 
                : isDarkMode ? 'text-slate-300' : 'text-[#00338D]'
          }`}>
            {status === 'generating' ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : status === 'ready' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>

          {/* Micro Token / State Label */}
          <span className={`text-[8px] font-mono font-bold uppercase tracking-tight mt-0.5 ${
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
  // VIEW 2: EXPANDED MODEL OUTPUT VIEWPORT (Apple-style Morph)
  // =========================================================================
  return (
    <div 
      className={`relative w-[440px] max-w-[90vw] rounded-xl border-2 transition-all duration-300 shadow-2xl animate-apple-in select-text ${
        selected 
          ? 'ring-4 ring-[#0091DA]/30 border-[#0091DA]' 
          : isDarkMode 
            ? 'bg-[#151720] border-[#2E3346]' 
            : 'bg-white border-[#CBD5E1]'
      }`}
    >
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
      <div className={`p-3 border-b flex items-center justify-between gap-2 rounded-t-[10px] ${
        isDarkMode ? 'bg-[#1A1D27] border-[#2A2E3D]' : 'bg-slate-50 border-slate-200'
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
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {title}
              </h4>
              {stageNumber && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-bold">
                  STEP {stageNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'ready' ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]' : status === 'generating' ? 'bg-[#0091DA] animate-ping' : 'bg-amber-400'
              }`} />
              <span className={status === 'ready' ? 'text-emerald-500 font-bold' : isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                {status === 'ready' ? 'READY' : status === 'generating' ? 'STREAMING...' : 'IDLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Window Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Format Toggle (Formatted Markdown vs Raw Text) */}
          <div className={`flex items-center p-0.5 rounded border text-[10px] font-mono ${
            isDarkMode ? 'bg-[#12131A] border-slate-700' : 'bg-white border-slate-300'
          }`}>
            <button
              onClick={() => setViewFormat('formatted')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                viewFormat === 'formatted' 
                  ? 'bg-[#00338D] text-white font-bold' 
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
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
                  : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
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
                : 'bg-white border-slate-300 text-slate-600 hover:text-black hover:border-[#00338D]'
            } ${!outputContent ? 'opacity-40 cursor-not-allowed' : ''}`}
            title="Copy Output Content"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize back to Circle button */}
          <button
            onClick={toggleExpand}
            className={`p-1.5 rounded border transition-all cursor-pointer active:scale-95 ${
              isDarkMode 
                ? 'bg-[#222533] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500' 
                : 'bg-white border-slate-300 text-slate-600 hover:text-black hover:border-slate-400'
            }`}
            title="Minimize to circular badge"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. OBSERVABILITY, AUDIT & COST RIBBON                         */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 text-[10px] font-mono flex-wrap ${
        isDarkMode ? 'bg-[#111319] border-[#222634] text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
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
          <div className="flex items-center gap-0.5 text-amber-500 font-semibold" title="Calculated Inference Cost">
            <DollarSign className="w-3 h-3" />
            <span>{costUsd > 0 ? costUsd.toFixed(4) : '0.0000'}</span>
          </div>
        </div>

        {/* SHA-256 Cryptographic Audit Hash */}
        {auditHash ? (
          <button
            onClick={handleCopyHash}
            className={`px-1.5 py-0.5 rounded border flex items-center gap-1 font-bold cursor-pointer transition-colors ${
              copiedHash 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : isDarkMode 
                  ? 'bg-[#1C1F2B] border-slate-700 text-[#0091DA] hover:border-[#0091DA]' 
                  : 'bg-white border-slate-300 text-[#005EB8] hover:border-[#00338D]'
            }`}
            title={`SHA-256 Fingerprint: ${auditHash} (Click to copy)`}
          >
            <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" />
            <span>SHA-256: {auditHash.slice(0, 8)}...</span>
          </button>
        ) : (
          <span className="text-[9px] opacity-50 font-mono">W3C Audit: Idle</span>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 3. OUTPUT TEXT CONTENT AREA                                  */}
      {/* ------------------------------------------------------------ */}
      <div className={`p-3 max-h-[300px] min-h-[140px] overflow-y-auto text-xs leading-relaxed font-sans ${
        isDarkMode ? 'bg-[#151720] text-slate-200' : 'bg-white text-slate-800'
      }`}>
        {status === 'generating' ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 rounded-full bg-[#0091DA]/20 border border-[#0091DA] text-[#0091DA] flex items-center justify-center animate-spin">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs font-bold text-[#0091DA] animate-pulse">
                Streaming Output from Connected Agent...
              </p>
              <p className="text-[10px] text-slate-500">
                Compiling multi-pillar intelligence graph & applying guardrails
              </p>
            </div>
          </div>
        ) : outputContent ? (
          viewFormat === 'formatted' ? (
            <div className="space-y-2 select-text">
              <MarkdownViewer content={outputContent} isDarkMode={isDarkMode} />
            </div>
          ) : (
            <pre className={`p-2.5 rounded font-mono text-[11px] whitespace-pre-wrap select-text ${
              isDarkMode ? 'bg-[#0E1017] text-slate-300 border border-slate-800' : 'bg-slate-50 text-slate-800 border border-slate-200'
            }`}>
              {outputContent}
            </pre>
          )
        ) : (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center select-none opacity-60">
            <Sparkles className="w-6 h-6 text-slate-400" />
            <p className="text-xs font-medium">Awaiting Agent Execution</p>
            <p className="text-[10px] text-slate-500 max-w-[240px]">
              Wire an agent's output port to this node and execute the workflow to view real-time results here.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4. FOOTER STATUS BAR                                         */}
      {/* ------------------------------------------------------------ */}
      <div className={`px-3 py-1.5 border-t flex items-center justify-between text-[9px] font-mono rounded-b-[10px] ${
        isDarkMode ? 'bg-[#181A24] border-[#2A2E3D] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'
      }`}>
        <div className="flex items-center gap-1.5">
          <span>{outputContent ? `${outputContent.split(/\s+/).filter(Boolean).length} words` : '0 words'}</span>
          <span>•</span>
          <span>{outputContent.length} chars</span>
        </div>
        <div className="flex items-center gap-1 text-[#0091DA]">
          <span>Pass-through Socket</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
}
