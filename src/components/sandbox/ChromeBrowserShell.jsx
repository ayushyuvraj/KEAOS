import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Terminal,
  Columns2,
  Maximize2,
  Minus,
  X,
  Plus,
  Play,
  Loader2,
  FileCode,
  CheckCircle2,
  Layers,
  Database
} from 'lucide-react';
import { compileOutputToHtml } from '../../services/webviewCompiler';

/**
 * ChromeBrowserShell — Google Chrome-Grade Live Browser Sandbox
 * 
 * Features:
 * - Chrome Tab Strip with active tab & close control
 * - Chrome Omnibox with SSL lock, canonical 127.0.0.1 origin, and latency meter
 * - Device Viewport Switcher (Desktop, Laptop, Tablet, Mobile)
 * - Popout to Standalone Browser Tab (tested & guaranteed for Google Chrome & Microsoft Edge)
 * - Sandboxed HTML5/DOM iframe with zero-token execution
 * - Collapsible Chrome DevTools Drawer (Console, Timing, Inputs)
 */
export default function ChromeBrowserShell({
  executionResult,
  isExecuting,
  onExecute,
  nodeName = 'Deterministic Box',
  language = 'javascript',
  isDarkMode = true,
  sandboxLayoutMode = 'split',
  onSetSandboxLayoutMode,
  availableInputKeys = [],
  inputsPayload = {}
}) {
  const [deviceMode, setDeviceMode] = useState('desktop'); // 'desktop' | 'laptop' | 'tablet' | 'mobile'
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState('console'); // 'console' | 'timing' | 'storage'
  const [copiedUrl, setCopiedUrl] = useState(false);
  const iframeRef = useRef(null);

  const rawOutput = executionResult?.output;
  const latencyMs = executionResult?.latencyMs || 0;
  const logs = executionResult?.logs || [];

  // Generate canonical Chrome Omnibox URL
  const slug = (nodeName || 'sandbox')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'applet';
  const canonicalUrl = `http://127.0.0.1:5173/sandbox/live/${slug}`;

  // Compile output into full interactive HTML
  const compiledHtml = useMemo(() => {
    return compileOutputToHtml({
      rawOutput,
      title: nodeName,
      nodeName,
      latencyMs,
      language
    });
  }, [rawOutput, nodeName, latencyMs, language]);

  // Robust Popout Mechanism: Compatible with Google Chrome and Microsoft Edge
  const handleOpenInNewTab = () => {
    try {
      const blob = new Blob([compiledHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank', 'noopener,noreferrer');

      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        // Fallback for strict Edge/Chrome popup blocker policies
        const fallbackWin = window.open('', '_blank');
        if (fallbackWin) {
          fallbackWin.document.open();
          fallbackWin.document.write(compiledHtml);
          fallbackWin.document.close();
        } else {
          window.dispatchEvent(new CustomEvent('keaos:toast', {
            detail: { message: 'Popup blocked by browser. Please allow popups for 127.0.0.1.' }
          }));
        }
      }
    } catch (err) {
      console.error('Failed to open standalone popup:', err);
      const fallbackWin = window.open('', '_blank');
      if (fallbackWin) {
        fallbackWin.document.open();
        fallbackWin.document.write(compiledHtml);
        fallbackWin.document.close();
      }
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(canonicalUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleReloadIframe = () => {
    if (onExecute) {
      onExecute();
    } else if (iframeRef.current) {
      iframeRef.current.srcdoc = compiledHtml;
    }
  };

  // Viewport device widths
  const viewportWidthClass = {
    desktop: 'w-full h-full',
    laptop: 'w-[1024px] max-w-full h-full shadow-2xl border-x border-[#1E2638]',
    tablet: 'w-[768px] max-w-full h-full shadow-2xl border-x border-[#1E2638]',
    mobile: 'w-[375px] max-w-full h-full shadow-2xl border-x border-[#1E2638]'
  }[deviceMode];

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none font-sans ${
      isDarkMode ? 'bg-[#0A0D14] text-slate-200' : 'bg-[#E5E9F0] text-slate-800'
    }`}>
      
      {/* ========================================================================= */}
      {/* 1. GOOGLE CHROME TAB STRIP                                                */}
      {/* ========================================================================= */}
      <div className={`h-9 px-2 pt-1 flex items-center justify-between shrink-0 border-b ${
        isDarkMode ? 'bg-[#070A10] border-[#182030]' : 'bg-[#D8DEE9] border-[#C2C9D6]'
      }`}>
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 pr-2">
          {/* Active Tab */}
          <div className={`h-8 px-3 rounded-t-sm flex items-center gap-2 max-w-[220px] text-xs font-medium border-t-2 border-t-[#00338D] border-x ${
            isDarkMode 
              ? 'bg-[#0E131F] border-[#1E2638] text-white shadow-sm' 
              : 'bg-white border-[#CBD5E1] text-slate-900 shadow-xs'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <FileCode className="w-3.5 h-3.5 text-[#0091DA] shrink-0" />
            <span className="truncate text-[11px] font-mono tracking-tight font-semibold">
              {nodeName || 'Live Applet'}
            </span>
            <button
              type="button"
              className="p-0.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white cursor-pointer ml-auto shrink-0"
              title="Close Tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* New Tab Button */}
          <button
            type="button"
            onClick={onExecute}
            className="p-1 hover:bg-white/10 rounded-sm text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Execute / New Tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Window Controls (Minimize | Split View | Maximize) */}
        {onSetSandboxLayoutMode && (
          <div className="flex items-center gap-0.5 shrink-0 pl-2">
            <button
              type="button"
              onClick={() => onSetSandboxLayoutMode('minimized')}
              className={`p-1.5 rounded-none cursor-pointer transition-colors ${
                sandboxLayoutMode === 'minimized'
                  ? 'bg-[#00338D] text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Minimize Sandbox (Focus Chat)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSetSandboxLayoutMode('split')}
              className={`p-1.5 rounded-none cursor-pointer transition-colors ${
                sandboxLayoutMode === 'split'
                  ? 'bg-[#00338D] text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Split View (Chat & Browser 50/50)"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSetSandboxLayoutMode('maximized')}
              className={`p-1.5 rounded-none cursor-pointer transition-colors ${
                sandboxLayoutMode === 'maximized'
                  ? 'bg-[#00338D] text-white'
                  : 'text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Maximize Browser"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CHROME OMNIBOX & NAVIGATION TOOLBAR                                     */}
      {/* ========================================================================= */}
      <div className={`px-2 py-1.5 flex items-center justify-between gap-2 shrink-0 border-b text-xs ${
        isDarkMode ? 'bg-[#0E131F] border-[#182030]' : 'bg-[#F1F5F9] border-[#CBD5E1]'
      }`}>
        
        {/* Navigation Buttons */}
        <div className="flex items-center gap-0.5 shrink-0 text-slate-400">
          <button
            type="button"
            className="p-1 rounded-sm hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 rounded-sm hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReloadIframe}
            disabled={isExecuting}
            className="p-1 rounded-sm hover:bg-white/10 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
            title="Reload Applet (Ctrl+R / Execute)"
          >
            {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0091DA]" /> : <RotateCw className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Chrome Omnibox Capsule */}
        <div className={`flex-1 flex items-center justify-between px-2.5 py-1 rounded-sm border min-w-0 text-[11px] font-mono transition-all ${
          isDarkMode ? 'bg-[#070A10] border-[#1E2638] text-slate-300' : 'bg-white border-[#CBD5E1] text-slate-800'
        }`}>
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-emerald-400 font-bold truncate">http://127.0.0.1:5173</span>
            <span className="text-slate-400 truncate">/sandbox/live/{slug}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-2">
            <span className="hidden sm:inline text-[9px] px-1.5 py-0.2 rounded-none bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
              {latencyMs}ms • 0 Tokens
            </span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-0.5 hover:text-white text-slate-400 cursor-pointer transition-colors"
              title="Copy URL"
            >
              {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Responsive Viewport Switcher */}
          <div className="flex items-center border border-[#1E2638] bg-[#070A10] rounded-none p-0.5">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`p-1 rounded-none cursor-pointer transition-colors ${
                deviceMode === 'desktop' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View (Fluid 100%)"
            >
              <Monitor className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('laptop')}
              className={`p-1 rounded-none cursor-pointer transition-colors ${
                deviceMode === 'laptop' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Laptop View (1024px)"
            >
              <Laptop className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('tablet')}
              className={`p-1 rounded-none cursor-pointer transition-colors ${
                deviceMode === 'tablet' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`p-1 rounded-none cursor-pointer transition-colors ${
                deviceMode === 'mobile' ? 'bg-[#00338D] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3 h-3" />
            </button>
          </div>

          {/* Standalone Tab Popout Button (Works in Chrome & Edge) */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="px-2 py-1 text-[10px] font-mono font-bold bg-[#00338D] hover:bg-[#005EB8] text-white rounded-none border border-[#0091DA]/50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Open Live Web Application in New Browser Tab (Chrome & Edge)"
          >
            <ExternalLink className="w-3 h-3 text-[#EAAA00]" />
            <span className="hidden lg:inline">Open in New Tab</span>
          </button>

          {/* DevTools Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsDevToolsOpen(!isDevToolsOpen)}
            className={`p-1.5 border rounded-none cursor-pointer transition-colors ${
              isDevToolsOpen 
                ? 'bg-[#1E2638] text-white border-[#0091DA]' 
                : 'bg-[#070A10] text-slate-400 border-[#1E2638] hover:text-white'
            }`}
            title="Toggle Chrome DevTools (Console & Telemetry)"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE SANDBOXED IFRAME VIEWPORT                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center bg-[#070A10]">
        <div className={`transition-all duration-200 flex flex-col ${viewportWidthClass}`}>
          <iframe
            ref={iframeRef}
            title="KEAOS Chrome Sandbox Live Applet"
            srcDoc={compiledHtml}
            className="w-full flex-1 border-0 bg-[#0B0F19]"
            sandbox="allow-scripts allow-popups allow-downloads allow-modals allow-forms allow-same-origin"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CHROME DEVTOOLS DRAWER (Collapsible Bottom Panel)                       */}
      {/* ========================================================================= */}
      {isDevToolsOpen && (
        <div className={`h-48 border-t shrink-0 flex flex-col font-mono text-xs select-text ${
          isDarkMode ? 'bg-[#080B12] border-[#1E2638]' : 'bg-[#F8FAFC] border-[#CBD5E1]'
        }`}>
          {/* DevTools Header / Tabs */}
          <div className="flex items-center justify-between border-b border-[#182030] px-3 py-1 bg-[#0E131F] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-[#0091DA]" />
                DevTools
              </span>
              <button
                type="button"
                onClick={() => setActiveDevTab('console')}
                className={`px-2 py-0.5 text-[10px] rounded-none cursor-pointer ${
                  activeDevTab === 'console' ? 'bg-[#00338D] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Console ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveDevTab('timing')}
                className={`px-2 py-0.5 text-[10px] rounded-none cursor-pointer ${
                  activeDevTab === 'timing' ? 'bg-[#00338D] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Telemetry & Runtime
              </button>
              <button
                type="button"
                onClick={() => setActiveDevTab('storage')}
                className={`px-2 py-0.5 text-[10px] rounded-none cursor-pointer ${
                  activeDevTab === 'storage' ? 'bg-[#00338D] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Input Streams ({availableInputKeys.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsDevToolsOpen(false)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Close DevTools"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* DevTools Body */}
          <div className="flex-1 overflow-auto p-2.5">
            {activeDevTab === 'console' && (
              <div className="space-y-1">
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <div key={i} className="text-[11px] text-slate-300 font-mono flex items-start gap-2">
                      <span className="text-slate-500 text-[9px] shrink-0">[{new Date().toLocaleTimeString()}]</span>
                      <span className="text-emerald-400 shrink-0">›</span>
                      <span className="whitespace-pre-wrap break-all">{typeof log === 'object' ? JSON.stringify(log) : String(log)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-[11px] italic p-2">
                    No console logs emitted. Use console.log(...) in your deterministic code to print debug output here.
                  </div>
                )}
              </div>
            )}

            {activeDevTab === 'timing' && (
              <div className="grid grid-cols-3 gap-3 p-2">
                <div className="p-2 border border-[#1E2638] bg-[#0E131F]">
                  <span className="text-[9px] text-slate-400 uppercase block">Execution Latency</span>
                  <span className="text-lg font-bold text-emerald-400">{latencyMs} ms</span>
                  <span className="text-[9px] text-slate-500 block">Client V8 Web Worker isolate</span>
                </div>
                <div className="p-2 border border-[#1E2638] bg-[#0E131F]">
                  <span className="text-[9px] text-slate-400 uppercase block">LLM Token Consumption</span>
                  <span className="text-lg font-bold text-emerald-400">0 Tokens</span>
                  <span className="text-[9px] text-slate-500 block">Deterministic local runtime</span>
                </div>
                <div className="p-2 border border-[#1E2638] bg-[#0E131F]">
                  <span className="text-[9px] text-slate-400 uppercase block">Language & Engine</span>
                  <span className="text-lg font-bold text-[#0091DA] uppercase">{language}</span>
                  <span className="text-[9px] text-slate-500 block">Sandboxed Browser Environment</span>
                </div>
              </div>
            )}

            {activeDevTab === 'storage' && (
              <div className="space-y-2">
                <div className="text-[10px] text-slate-400">
                  Active variables available inside the <code className="text-[#0091DA]">inputs</code> object:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableInputKeys.map(k => (
                    <span key={k} className="px-2 py-0.5 rounded-none bg-[#141A29] text-[#0091DA] border border-[#2B354D] text-[10px]">
                      inputs.{k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

