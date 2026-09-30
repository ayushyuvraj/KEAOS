import React from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, Copy, Check } from 'lucide-react';
import { clearCanvasState } from '../../utils/persistentState';

/**
 * Institutional Error Boundary for KEAOS Studio.
 * Catches any render-time runtime exceptions, preventing blank white screens
 * and providing one-click recovery and clear diagnostics.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('KEAOS Error Boundary caught runtime exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      clearCanvasState();
      localStorage.removeItem('keaos_ui_state');
    } catch (e) {
      console.warn('Failed to clear local storage:', e);
    }
    window.location.reload();
  };

  handleCopyDiagnostics = () => {
    const diagnostics = [
      `KEAOS Studio Runtime Error Diagnostics`,
      `Timestamp: ${new Date().toISOString()}`,
      `Error: ${this.state.error?.message || 'Unknown Error'}`,
      `Stack: ${this.state.error?.stack || 'No stack trace'}`,
      `Component Stack: ${this.state.errorInfo?.componentStack || 'No component stack'}`
    ].join('\n\n');

    navigator.clipboard.writeText(diagnostics);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#090A0F] text-white p-6 select-none font-sans">
          {/* Institutional Top Accent Bar */}
          <div className="fixed top-0 left-0 right-0 h-1 bg-[#00338D]" />

          <div className="max-w-xl w-full bg-[#12141C] border border-[#2E3346] shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#242838] pb-4">
              <div className="w-10 h-10 rounded-none bg-[#EAAA00]/15 border border-[#EAAA00]/40 flex items-center justify-center text-[#EAAA00] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0091DA] px-1.5 py-0.5 bg-[#0091DA]/10 border border-[#0091DA]/20">
                    KEAOS RECOVERY
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Institutional Guard</span>
                </div>
                <h1 className="text-base font-bold text-white tracking-tight mt-0.5">
                  Runtime Exception Intercepted
                </h1>
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                The visual studio encountered an unexpected error during rendering. Your work is safeguarded. You can reload or perform an atomic state reset below.
              </p>

              <div className="p-3 bg-[#0B0C12] border border-[#232736] font-mono text-xs text-red-400 overflow-x-auto max-h-36 whitespace-pre-wrap select-text">
                {this.state.error?.toString() || 'Unknown runtime error occurred.'}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleReload}
                  className="btn-tactile px-4 py-2 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Studio</span>
                </button>

                <button
                  onClick={this.handleResetState}
                  className="btn-tactile px-3 py-2 bg-[#1C1F2B] hover:bg-[#252A3A] border border-[#383E54] text-slate-300 hover:text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Resets canvas topology and UI state back to the default pilot template"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default Canvas</span>
                </button>
              </div>

              <button
                onClick={this.handleCopyDiagnostics}
                className="btn-tactile px-3 py-2 text-slate-400 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{this.state.copied ? 'Copied Diagnostics' : 'Copy Diagnostics'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
