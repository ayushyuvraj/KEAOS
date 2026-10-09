import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Code, 
  FileJson, 
  Globe, 
  Sparkles,
  Layers
} from 'lucide-react';

export default function ShowroomCodeModal({
  isOpen,
  onClose,
  showroomApp,
  theme,
  isDarkMode = true
}) {
  const [activeTab, setActiveTab] = useState('react'); // 'react' | 'iframe' | 'json'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // 1. Generate React / Next.js Component snippet
  const generateReactCode = () => {
    return `// ============================================================================
// KEAOS Showroom Client Frontend - Autonomous Production Component
// Archetype: ${theme.name} (${showroomApp.archetypeId})
// Generated for: ${showroomApp.name}
// ============================================================================
import React, { useState } from 'react';

export default function ${showroomApp.name.replace(/[^a-zA-Z0-9]/g, '') || 'InstitutionalShowroom'}() {
  const [activeScreen, setActiveScreen] = useState('${showroomApp.screens[0]?.id || 'screen-1'}');
  const [executionState, setExecutionState] = useState({ isExecuting: false, result: null });

  const theme = ${JSON.stringify(theme, null, 2)};

  const handleExecute = async (prompt, binding) => {
    setExecutionState({ isExecuting: true, result: null });
    try {
      const response = await fetch('/api/keaos/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, binding, screenId: activeScreen })
      });
      const data = await response.json();
      setExecutionState({ isExecuting: false, result: data });
    } catch (err) {
      setExecutionState({ isExecuting: false, result: { error: err.message } });
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-8"
      style={{
        backgroundColor: theme.bgApp,
        color: theme.textPrimary,
        fontFamily: theme.fontBody
      }}
    >
      <div 
        className="w-full max-w-4xl rounded-2xl border p-6 sm:p-10 shadow-2xl transition-all"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.borderCard,
          boxShadow: theme.cardShadow
        }}
      >
        <header className="pb-6 border-b mb-6" style={{ borderColor: theme.borderCard }}>
          <div className="flex items-center justify-between">
            <span 
              className="text-[11px] font-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border"
              style={{
                backgroundColor: theme.accentLight,
                borderColor: theme.accentColor + '30',
                color: theme.accentColor
              }}
            >
              ${theme.name.toUpperCase()} ARCHETYPE
            </span>
            <span className="text-xs font-mono" style={{ color: theme.textMuted }}>
              Institutional Sovereign Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
            ${showroomApp.name}
          </h1>
        </header>

        {/* Dynamic Screen Container */}
        <main className="space-y-6">
          {/* Active Screen Widgets Hydration */}
          <div className="p-6 rounded-xl border border-dashed text-center" style={{ borderColor: theme.borderCard }}>
            <p className="text-sm font-semibold" style={{ color: theme.accentColor }}>
              Interactive Client Gateway Ready
            </p>
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
              Connecting to autonomous KEAOS workflow engine.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}`;
  };

  // 2. Generate Universal Embed Iframe snippet
  const generateIframeCode = () => {
    const embedUrl = `https://keaos.network/showroom/${showroomApp.slug || 'institutional-briefing'}`;
    return `<!-- KEAOS Interactive Showroom Embed -->
<!-- Embed in Retool, Notion, Webflow, Shopify, or Custom Portals -->
<iframe
  src="${embedUrl}"
  title="${showroomApp.name}"
  width="100%"
  height="820px"
  frameborder="0"
  allow="clipboard-write; camera; microphone"
  style="border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 40px -15px rgba(0,0,0,0.4);"
></iframe>`;
  };

  // 3. Generate JSON Application Schema
  const generateJsonSchema = () => {
    return JSON.stringify(showroomApp, null, 2);
  };

  const getCode = () => {
    if (activeTab === 'react') return generateReactCode();
    if (activeTab === 'iframe') return generateIframeCode();
    return generateJsonSchema();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([generateJsonSchema()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${showroomApp.slug || 'showroom'}-schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className={`w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-all ${
          isDarkMode ? 'bg-[#10131A] border-[#222838]' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`p-4 px-6 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'border-[#222838] bg-[#141822]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Export & Embed Frontend Showroom
              </h3>
              <p className="text-[11px] text-slate-400">
                Deploy clean React code, universal &lt;iframe&gt;, or declarative JSON schema
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'border-[#1C212E] bg-[#11141C]' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('react')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'react'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>React / Next.js</span>
            </button>
            <button
              onClick={() => setActiveTab('iframe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'iframe'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Universal &lt;iframe&gt;</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>JSON Schema</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'json' && (
              <button
                onClick={handleDownloadJson}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-1.5"
                title="Download JSON File"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Code Content View */}
        <div className="flex-1 overflow-auto p-4 bg-[#0B0F19] font-mono text-xs text-slate-200">
          <pre className="leading-relaxed whitespace-pre-wrap select-text">
            {getCode()}
          </pre>
        </div>

        {/* Footer */}
        <div className={`p-3 px-6 border-t flex items-center justify-between shrink-0 text-[11px] font-mono ${
          isDarkMode ? 'border-[#222838] bg-[#141822] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span>
            {activeTab === 'react' && 'Zero external styling dependencies required. Fully typed and portable.'}
            {activeTab === 'iframe' && 'Ready for Retool, Webflow, Notion, or internal enterprise dashboards.'}
            {activeTab === 'json' && `${showroomApp.screens.length} screens, ${showroomApp.screens.reduce((acc, s) => acc + (s.widgets?.length || 0), 0)} configured widgets.`}
          </span>
          <span className="text-blue-400 font-semibold">
            KEAOS Frontend Engine
          </span>
        </div>
      </div>
    </div>
  );
}
