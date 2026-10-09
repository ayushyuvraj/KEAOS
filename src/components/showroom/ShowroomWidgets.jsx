import React, { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  ArrowRight, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Database, 
  Lock, 
  Globe, 
  Zap, 
  Activity, 
  TrendingUp, 
  Hash, 
  Image as ImageIcon,
  ChevronRight,
  ExternalLink,
  GripVertical
} from 'lucide-react';

// Icon Map for dynamic icon resolution
const ICON_MAP = {
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Lock,
  Globe,
  Zap,
  Activity,
  Play,
  ArrowRight,
  UploadCloud,
  FileText,
  Sparkles,
  TrendingUp,
  Hash
};

export function ResolveIcon({ name, className = 'w-5 h-5', style }) {
  const Comp = ICON_MAP[name] || Sparkles;
  return <Comp className={className} style={style} />;
}

// 1. Hero Brand Header
export function HeroBannerWidget({ props, theme, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`relative w-full py-4 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl p-4 bg-blue-500/5' : ''
      }`}
      style={{ textAlign: props.align || 'left' }}
    >
      {props.showBadge && (
        <div 
          className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-[10px] font-mono font-bold tracking-widest uppercase rounded-full border transition-all"
          style={{
            borderColor: theme.accentColor + '40',
            color: theme.accentColor,
            backgroundColor: theme.accentLight
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.accentColor }} />
          <span>{props.badgeText || 'AUTONOMOUS SUITE'}</span>
        </div>
      )}

      {props.eyebrow && (
        <p 
          className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] mb-1.5"
          style={{ color: theme.accentColor }}
        >
          {props.eyebrow}
        </p>
      )}

      <h1 
        className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2.5 leading-[1.2] break-words"
        style={{ 
          fontFamily: theme.fontDisplay, 
          color: theme.textPrimary 
        }}
      >
        {props.title}
      </h1>

      {props.subtitle && (
        <p 
          className="text-xs sm:text-sm max-w-2xl leading-relaxed"
          style={{ 
            color: theme.textSecondary,
            fontFamily: theme.fontBody,
            margin: props.align === 'center' ? '0 auto' : undefined
          }}
        >
          {props.subtitle}
        </p>
      )}
    </div>
  );
}

// 2. Compact Page Header
export function PageHeaderWidget({ props, theme, isSelected, onClick, onNavigate }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between pb-3.5 border-b transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl p-3 bg-blue-500/5' : ''
      }`}
      style={{ borderColor: theme.borderCard }}
    >
      <div>
        {props.category && (
          <p className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: theme.textMuted }}>
            {props.category}
          </p>
        )}
        <h2 className="text-lg sm:text-xl font-bold tracking-tight" style={{ fontFamily: theme.fontDisplay, color: theme.textPrimary }}>
          {props.title}
        </h2>
      </div>

      {props.actionLabel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigate && props.actionTrigger) onNavigate(props.actionTrigger);
          }}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: theme.accentLight,
            color: theme.accentColor,
            border: `1px solid ${theme.borderCard}`
          }}
        >
          {props.actionLabel}
        </button>
      )}
    </div>
  );
}

// 3. Conversational Input & Prompt Bar
export function PromptBarWidget({ 
  props, 
  theme, 
  isSelected, 
  onClick, 
  onExecute, 
  isExecuting 
}) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim() || isExecuting) return;
    if (onExecute) onExecute(query, props.binding);
  };

  const handlePickPrompt = (text) => {
    setQuery(text);
  };

  return (
    <div 
      onClick={onClick}
      className={`w-full flex flex-col gap-2.5 my-1 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl p-3 bg-blue-500/5' : ''
      }`}
    >
      <form onSubmit={handleSubmit} className="relative w-full">
        <div 
          className="relative flex items-center rounded-xl border p-1.5 transition-all shadow-sm focus-within:shadow-md"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderCard,
            boxShadow: theme.cardShadow
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={props.placeholder}
            disabled={isExecuting}
            className="flex-1 bg-transparent px-3.5 py-2 text-xs sm:text-sm focus:outline-none"
            style={{ 
              color: theme.textPrimary,
              fontFamily: theme.fontBody
            }}
          />

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isExecuting || !query.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundColor: theme.accentColor,
              color: theme.isDark ? '#000000' : '#FFFFFF',
              boxShadow: `0 2px 8px ${theme.glowColor}`
            }}
          >
            {isExecuting ? (
              // Whispered indicator per Rule 11
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span>Running...</span>
              </span>
            ) : (
              <>
                <span>{props.buttonLabel || 'Execute'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggested Prompt Pills */}
      {props.suggestedPrompts && props.suggestedPrompts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: theme.textMuted }}>
            Suggestions:
          </span>
          {props.suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handlePickPrompt(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full border transition-all text-left truncate max-w-xs hover:scale-[1.02]"
              style={{
                backgroundColor: theme.bgCard,
                borderColor: theme.borderCard,
                color: theme.textSecondary
              }}
            >
              “{prompt}”
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 4. File Dropzone Widget
export function FileDropzoneWidget({ props, theme, isSelected, onClick, onExecute, isExecuting }) {
  const [fileName, setFileName] = useState(null);
  const [fileSize, setFileSize] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileSize((file.size / 1024).toFixed(1) + ' KB');
      if (props.binding?.autoExecuteOnUpload && onExecute) {
        onExecute(`Analyze file: ${file.name}`, props.binding);
      }
    }
  };

  return (
    <div 
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          setFileName(file.name);
          setFileSize((file.size / 1024).toFixed(1) + ' KB');
          if (props.binding?.autoExecuteOnUpload && onExecute) {
            onExecute(`Analyze uploaded file: ${file.name}`, props.binding);
          }
        }
      }}
      className={`relative w-full p-5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 bg-blue-500/5' : ''
      }`}
      style={{
        backgroundColor: isDragOver ? theme.accentLight : theme.bgCard,
        borderColor: isDragOver ? theme.accentColor : theme.borderCard
      }}
    >
      <input 
        type="file" 
        onChange={handleFileChange}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
      />

      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-transform"
        style={{ backgroundColor: theme.accentLight, color: theme.accentColor }}
      >
        <UploadCloud className="w-5 h-5" />
      </div>

      <h3 className="text-xs sm:text-sm font-semibold mb-0.5" style={{ color: theme.textPrimary }}>
        {fileName ? fileName : props.title}
      </h3>

      <p className="text-[11px] max-w-md" style={{ color: theme.textSecondary }}>
        {fileSize ? `Loaded (${fileSize}). Staged for workflow.` : props.subtitle}
      </p>

      {fileName && (
        <div className="mt-2 flex items-center gap-2">
          <span 
            className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
            style={{ backgroundColor: theme.accentLight, color: theme.accentColor, borderColor: theme.borderCard }}
          >
            ✓ Staged for Execution
          </span>
        </div>
      )}
    </div>
  );
}

// 5. Action CTA Button
export function ActionButtonWidget({ props, theme, isSelected, onClick, onExecute, onNavigate, isExecuting }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (isExecuting) return;

    if (props.actionType === 'navigate' && onNavigate && props.targetScreenId) {
      onNavigate(props.targetScreenId);
    } else if (props.actionType === 'workflow' && onExecute) {
      onExecute(props.label, props.binding);
    } else if (props.actionType === 'workflow-and-navigate') {
      if (onExecute) onExecute(props.label, { ...props.binding, onCompleteNavigateTo: props.targetScreenId });
      else if (onNavigate && props.targetScreenId) onNavigate(props.targetScreenId);
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`inline-block my-1 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl p-2 bg-blue-500/5' : ''
      }`}
    >
      <button
        onClick={handleClick}
        disabled={isExecuting}
        className="px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        style={{
          backgroundColor: props.variant === 'outline' ? 'transparent' : theme.accentColor,
          color: props.variant === 'outline' ? theme.accentColor : (theme.isDark ? '#000000' : '#FFFFFF'),
          border: `1px solid ${props.variant === 'outline' ? theme.accentColor : 'transparent'}`,
          boxShadow: props.variant === 'outline' ? 'none' : `0 4px 16px ${theme.glowColor}`
        }}
      >
        {isExecuting ? (
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
            <span>Executing...</span>
          </span>
        ) : (
          <>
            <ResolveIcon name={props.icon || 'Play'} className="w-3.5 h-3.5" />
            <span>{props.label}</span>
          </>
        )}
      </button>
    </div>
  );
}

// 6. Streaming Intelligence Result Card
export function StreamingResultWidget({ 
  props, 
  theme, 
  isSelected, 
  onClick, 
  liveOutput, 
  isExecuting 
}) {
  const [copied, setCopied] = useState(false);
  const content = liveOutput || props.initialContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={onClick}
      className={`w-full rounded-xl border p-4 sm:p-5 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 bg-blue-500/5' : ''
      }`}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
        boxShadow: theme.cardShadow
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b mb-3" style={{ borderColor: theme.borderCard }}>
        <div>
          <h3 className="text-sm sm:text-base font-bold tracking-tight" style={{ fontFamily: theme.fontDisplay, color: theme.textPrimary }}>
            {props.title}
          </h3>
          {props.subtitle && (
            <p className="text-[11px]" style={{ color: theme.textSecondary }}>
              {props.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {props.showCopyButton && (
            <button
              onClick={handleCopy}
              className="p-1 px-2 text-xs rounded border transition-colors flex items-center gap-1.5"
              style={{ borderColor: theme.borderCard, color: theme.textSecondary }}
              title="Copy Output"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span className="text-[10px] font-mono">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Stream */}
      {isExecuting ? (
        // Minimalist Whispered Loading Indicator (Rule 11)
        <div className="py-6 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accentColor, animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accentColor, animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.accentColor, animationDelay: '300ms' }} />
          </div>
          <span className="text-[11px] font-mono opacity-60" style={{ color: theme.textMuted }}>
            Streaming synthesis via backend engine...
          </span>
        </div>
      ) : (
        <div 
          className="prose prose-sm max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans"
          style={{ color: theme.textPrimary, fontFamily: theme.fontBody }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// 7. Executive KPI Metric Grid
export function KpiGridWidget({ props, theme, isSelected, onClick }) {
  const metrics = props.metrics || [];

  return (
    <div 
      onClick={onClick}
      className={`w-full grid grid-cols-1 sm:grid-cols-3 gap-3 my-1 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl p-2.5 bg-blue-500/5' : ''
      }`}
    >
      {metrics.map((m, idx) => (
        <div 
          key={m.id || idx}
          className="rounded-xl border p-3.5 flex flex-col justify-between transition-all"
          style={{
            backgroundColor: theme.bgCard,
            borderColor: theme.borderCard,
            boxShadow: theme.cardShadow
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold" style={{ color: theme.textMuted }}>
              {m.label}
            </span>
            <span 
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                m.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
              }`}
            >
              {m.delta}
            </span>
          </div>

          <div className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ fontFamily: theme.fontDisplay, color: theme.textPrimary }}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// 8. Action Item & Comparison Table
export function ComparisonTableWidget({ props, theme, isSelected, onClick }) {
  const columns = props.columns || [];
  const rows = props.rows || [];

  return (
    <div 
      onClick={onClick}
      className={`w-full rounded-xl border overflow-hidden my-2 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 bg-blue-500/5' : ''
      }`}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
        boxShadow: theme.cardShadow
      }}
    >
      {props.title && (
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.borderCard }}>
          <h4 className="text-xs font-mono uppercase tracking-wider font-bold" style={{ color: theme.textPrimary }}>
            {props.title}
          </h4>
          <span className="text-[10px] font-mono" style={{ color: theme.textMuted }}>
            {rows.length} records verified
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: theme.borderCard, backgroundColor: theme.accentLight }}>
              {columns.map((col, idx) => (
                <th key={idx} className="px-3.5 py-2 font-mono uppercase font-bold text-[10px]" style={{ color: theme.textSecondary }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                className="border-b last:border-b-0 transition-colors"
                style={{ borderColor: theme.borderCard }}
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2.5" style={{ color: theme.textPrimary }}>
                    {cIdx === row.length - 1 && typeof cell === 'string' && cell.startsWith('SHA-256') ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-current opacity-80">
                        {cell}
                      </span>
                    ) : cell === 'CRITICAL' ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        {cell}
                      </span>
                    ) : cell === 'HIGH' ? (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 9. Verdict & Decision Banner
export function DecisionCalloutWidget({ props, theme, isSelected, onClick }) {
  const isApproved = props.status === 'APPROVED';

  return (
    <div 
      onClick={onClick}
      className={`w-full rounded-xl border p-4 my-2 flex items-start gap-3.5 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 bg-blue-500/5' : ''
      }`}
      style={{
        backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.05)' : 'rgba(234, 170, 0, 0.05)',
        borderColor: isApproved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 170, 0, 0.3)'
      }}
    >
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 170, 0, 0.15)',
          color: isApproved ? '#10B981' : '#EAAA00'
        }}
      >
        {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span 
            className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded"
            style={{
              backgroundColor: isApproved ? '#10B981' : '#EAAA00',
              color: '#FFFFFF'
            }}
          >
            {props.status}
          </span>
          <h4 className="text-xs sm:text-sm font-bold tracking-tight" style={{ color: theme.textPrimary }}>
            {props.headline}
          </h4>
        </div>

        <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: theme.textSecondary }}>
          {props.rationale}
        </p>

        <p className="text-[9px] font-mono" style={{ color: theme.textMuted }}>
          Seal: {props.verifier}
        </p>
      </div>
    </div>
  );
}

// 10. Custom Image & Visual Asset Widget
export function CustomImageWidget({ props, theme, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`w-full my-2 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl p-2 bg-blue-500/5' : ''
      }`}
    >
      <div 
        className="relative w-full overflow-hidden border transition-transform shadow-sm"
        style={{
          maxHeight: props.maxHeight || 240,
          borderRadius: props.rounded ? theme.borderRadius || '8px' : '0px',
          borderColor: theme.borderCard
        }}
      >
        <img 
          src={props.imageUrl} 
          alt={props.altText || 'Custom Showroom Visual'}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          style={{ maxHeight: props.maxHeight || 240 }}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
          }}
        />
      </div>

      {props.caption && (
        <p className="text-[10px] font-mono mt-1 text-center" style={{ color: theme.textMuted }}>
          {props.caption}
        </p>
      )}
    </div>
  );
}

// 11. Monogram & Vector Icon Badge
export function VectorIconBadgeWidget({ props, theme, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`w-full rounded-xl border p-3.5 my-1.5 flex items-center gap-3.5 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 bg-blue-500/5' : ''
      }`}
      style={{
        backgroundColor: theme.bgCard,
        borderColor: theme.borderCard,
        boxShadow: theme.cardShadow
      }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
        style={{
          backgroundColor: theme.accentLight,
          borderColor: theme.accentColor + '40',
          color: theme.accentColor
        }}
      >
        <ResolveIcon name={props.icon || 'ShieldCheck'} className="w-5 h-5" />
      </div>

      <div>
        <h4 className="text-xs sm:text-sm font-bold tracking-tight" style={{ color: theme.textPrimary }}>
          {props.title}
        </h4>
        <p className="text-[11px]" style={{ color: theme.textSecondary }}>
          {props.description}
        </p>
      </div>
    </div>
  );
}

// 12. Atmospheric Pulse / Micro-Animation Widget
export function LottiePulseWidget({ props, theme, isSelected, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`w-full py-3 flex items-center justify-center gap-2.5 transition-all ${
        isSelected ? 'ring-2 ring-blue-500/80 rounded-xl bg-blue-500/5' : ''
      }`}
    >
      <div className="relative flex items-center justify-center w-5 h-5">
        <span 
          className="absolute w-5 h-5 rounded-full animate-ping opacity-30" 
          style={{ backgroundColor: theme.accentColor }} 
        />
        <span 
          className="relative w-2.5 h-2.5 rounded-full" 
          style={{ backgroundColor: theme.accentColor }} 
        />
      </div>
      <span className="text-[11px] font-mono tracking-wide uppercase font-semibold" style={{ color: theme.textSecondary }}>
        {props.accentLabel || 'System Operational'}
      </span>
    </div>
  );
}

// Central Widget Renderer dispatcher
export function RenderShowroomWidget({ 
  widget, 
  theme, 
  isSelected = false, 
  onClick, 
  onExecute, 
  onNavigate, 
  liveOutput, 
  isExecuting = false 
}) {
  switch (widget.type) {
    case 'hero-banner':
      return <HeroBannerWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    case 'page-header':
      return <PageHeaderWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} onNavigate={onNavigate} />;
    case 'prompt-bar':
      return <PromptBarWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} onExecute={onExecute} isExecuting={isExecuting} />;
    case 'file-dropzone':
      return <FileDropzoneWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} onExecute={onExecute} isExecuting={isExecuting} />;
    case 'action-button':
      return <ActionButtonWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} onExecute={onExecute} onNavigate={onNavigate} isExecuting={isExecuting} />;
    case 'streaming-result':
      return <StreamingResultWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} liveOutput={liveOutput} isExecuting={isExecuting} />;
    case 'kpi-grid':
      return <KpiGridWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    case 'comparison-table':
      return <ComparisonTableWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    case 'decision-callout':
      return <DecisionCalloutWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    case 'custom-image':
      return <CustomImageWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    case 'vector-icon-badge':
      return <VectorIconBadgeWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    case 'lottie-pulse':
      return <LottiePulseWidget props={widget.props} theme={theme} isSelected={isSelected} onClick={onClick} />;
    default:
      return (
        <div className="p-3 border border-dashed rounded text-xs text-rose-500">
          Unknown Widget: {widget.type}
        </div>
      );
  }
}
