import React, { useState, useEffect } from 'react';
import { 
  X, 
  Activity, 
  Server, 
  Cpu, 
  ShieldCheck, 
  Database, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Terminal,
  Zap,
  HardDrive,
  Sun,
  Moon
} from 'lucide-react';
import { checkGatewayHealth, fetchClusterMetrics, executeSandboxedCodeRemote } from '../services/backendConnector';

export default function ClusterDiagnosticsModal({ isOpen, onClose, isDarkMode = false, onToggleTheme }) {
  const [clusterData, setClusterData] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isGatewayOnline, setIsGatewayOnline] = useState(false);

  // Sandbox playground state
  const [sandboxLang, setSandboxLang] = useState('javascript');
  const [sandboxCode, setSandboxCode] = useState(
    '// Tier 1 Micro-Task: Compute latency percentiles\noutput = {\n  p50: 45,\n  p95: 180,\n  p99: 240,\n  status: "COMPLIANT"\n};'
  );
  const [sandboxInput, setSandboxInput] = useState('{"cluster": "Frankfurt", "samples": 1200}');
  const [isExecutingSandbox, setIsExecutingSandbox] = useState(false);
  const [sandboxResult, setSandboxResult] = useState(null);

  const loadClusterStatus = async () => {
    setIsChecking(true);
    const health = await checkGatewayHealth();
    setIsGatewayOnline(health.online);

    if (health.online) {
      const metrics = await fetchClusterMetrics();
      setClusterData(metrics);
    } else {
      setClusterData(null);
    }
    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadClusterStatus();
    }
  }, [isOpen]);

  const handleRunSandboxTest = async () => {
    setIsExecutingSandbox(true);
    setSandboxResult(null);

    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(sandboxInput);
      } catch (e) {
        parsedInput = { raw: sandboxInput };
      }

      if (isGatewayOnline) {
        const res = await executeSandboxedCodeRemote({
          language: sandboxLang,
          code: sandboxCode,
          input: parsedInput,
          timeoutMs: 8000
        });
        setSandboxResult(res);
      } else {
        // Fallback local execution when gateway server is not running
        const startTime = performance.now();
        if (sandboxLang === 'javascript') {
          try {
            const func = new Function('input', `${sandboxCode}; return output;`);
            const out = func(parsedInput);
            setSandboxResult({
              success: true,
              tier: 'LOCAL_BROWSER_EVAL',
              sandboxId: 'local-browser',
              output: out,
              latencyMs: Number((performance.now() - startTime).toFixed(2))
            });
          } catch (err) {
            setSandboxResult({
              success: false,
              tier: 'LOCAL_BROWSER_EVAL',
              error: err.message,
              latencyMs: Number((performance.now() - startTime).toFixed(2))
            });
          }
        } else {
          setSandboxResult({
            success: false,
            tier: 'TIER_2_PYTHON',
            error: 'Python execution requires the KEAOS Gateway server (Port 4000). Start gateway via node server/index.js.',
            latencyMs: 10
          });
        }
      }
    } catch (err) {
      setSandboxResult({
        success: false,
        error: err.message,
        latencyMs: 0
      });
    } finally {
      setIsExecutingSandbox(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setSandboxLang(lang);
    if (lang === 'python') {
      setSandboxCode(
        '# Tier 2 Python MicroVM Sandbox\ndef sanitize_and_run(input_payload):\n    cluster = input_payload.get("cluster", "US-East")\n    return {\n        "processed": True,\n        "cluster_allocated": cluster,\n        "gpu_nodes": 8,\n        "memory_limit_mb": 512\n    }'
      );
    } else {
      setSandboxCode(
        '// Tier 1 Micro-Task: Compute latency percentiles\noutput = {\n  p50: 45,\n  p95: 180,\n  p99: 240,\n  status: "COMPLIANT"\n};'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center select-none p-4 ${
      isDarkMode ? 'bg-black/70 backdrop-blur-xl' : 'bg-black/60 backdrop-blur-xs'
    }`}>
      <div className={`w-full max-w-4xl border shadow-2xl flex flex-col max-h-[90vh] rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors ${
        isDarkMode ? 'bg-[#0B0F19] border-white/10 text-white' : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19]'
      }`}>
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#001E50] border-b border-[#00338D] flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#00338D] border border-[#0091DA]/40 flex items-center justify-center text-white shadow-inner">
              <Server className="w-5 h-5 text-[#0091DA]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#0091DA] uppercase tracking-wider font-mono">
                  CLUSTER CONTROL & EXECUTION PLANE
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  isGatewayOnline
                    ? 'bg-[#E6F5EC] text-[#009A44] border-[#009A44]/40'
                    : 'bg-[#FDF7E6] text-[#EAAA00] border-[#EAAA00]/40'
                }`}>
                  {isGatewayOnline ? 'PORT 4000 ONLINE' : 'STANDALONE MODE'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                High-Concurrency Orchestrator & Sandbox Fleet Diagnostics
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="btn-tactile p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-200" />}
              </button>
            )}
            <button
              onClick={loadClusterStatus}
              disabled={isChecking}
              className="btn-tactile p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
              title="Refresh Cluster Status"
            >
              <RotateCcw className={`w-4 h-4 ${isChecking ? 'animate-spin text-[#0091DA]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="btn-tactile p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-none transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className={`p-6 overflow-y-auto space-y-6 flex-1 transition-colors ${
          isDarkMode ? 'bg-[#070A12]' : 'bg-[#F5F6F8]'
        }`}>
          
          {/* Top Grid: Cluster Status Cards */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            {/* Card 1: Engine Gateway */}
            <div className={`p-3 border shadow-xs space-y-1 transition-colors ${
              isDarkMode ? 'bg-[#0E1526] border-white/10' : 'bg-[#FFFFFF] border-[#CBD5E1]'
            }`}>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>ORCHESTRATION GATEWAY</span>
                <span className={`w-2 h-2 rounded-full ${isGatewayOnline ? 'bg-[#009A44] beacon-live' : 'bg-[#EAAA00]'}`} />
              </div>
              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                {isGatewayOnline ? 'Cluster Gateway' : 'Local Fallback'}
              </h4>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {isGatewayOnline ? 'http://localhost:4000' : 'In-browser evaluation mode'}
              </p>
            </div>

            {/* Card 2: Tiered Sandboxes */}
            <div className={`p-3 border shadow-xs space-y-1 transition-colors ${
              isDarkMode ? 'bg-[#0E1526] border-white/10' : 'bg-[#FFFFFF] border-[#CBD5E1]'
            }`}>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>SANDBOX ISOLATION</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#0091DA]" />
              </div>
              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>Tier 1 & Tier 2</h4>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                V8 WASI + Python microVMs
              </p>
            </div>

            {/* Card 3: Memory Fabric */}
            <div className={`p-3 border shadow-xs space-y-1 transition-colors ${
              isDarkMode ? 'bg-[#0E1526] border-white/10' : 'bg-[#FFFFFF] border-[#CBD5E1]'
            }`}>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>MEMORY FABRIC</span>
                <Database className="w-3.5 h-3.5 text-[#8B5CF6]" />
              </div>
              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>4-Tier Namespaces</h4>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {clusterData ? `${clusterData.memoryFabric.tier3Namespaces} Namespaces, ${clusterData.memoryFabric.tier4Entities} Entities` : 'Dual-path persistent'}
              </p>
            </div>

            {/* Card 4: Rate Governor */}
            <div className={`p-3 border shadow-xs space-y-1 transition-colors ${
              isDarkMode ? 'bg-[#0E1526] border-white/10' : 'bg-[#FFFFFF] border-[#CBD5E1]'
            }`}>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                <span>RATE GOVERNOR</span>
                <Zap className="w-3.5 h-3.5 text-[#EAAA00]" />
              </div>
              <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>5 Provider Buckets</h4>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Leaky token rate caps active
              </p>
            </div>
          </div>

          {/* Interactive Tiered Sandbox Testbench */}
          <div className={`p-5 border shadow-sm space-y-4 transition-colors ${
            isDarkMode ? 'bg-[#0E1526] border-white/10' : 'bg-[#FFFFFF] border-[#CBD5E1]'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isDarkMode ? 'border-white/10' : 'border-[#E0E0E0]'
            }`}>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#0091DA]" />
                <h4 className={`text-xs font-bold uppercase font-mono tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                }`}>
                  Tiered Code Sandbox Testbench (Live Execution Bench)
                </h4>
              </div>
              <div className={`flex items-center gap-1.5 p-1 border ${
                isDarkMode ? 'bg-[#070A12] border-white/10' : 'bg-[#F8F9FB] border-[#CBD5E1]'
              }`}>
                <button
                  onClick={() => handleLanguageChange('javascript')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-none transition-all cursor-pointer ${
                    sandboxLang === 'javascript'
                      ? 'bg-[#00338D] text-white'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-[#0B0F19]'
                  }`}
                >
                  Tier 1: JS / V8 Isolate (&lt;5ms)
                </button>
                <button
                  onClick={() => handleLanguageChange('python')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-none transition-all cursor-pointer ${
                    sandboxLang === 'python'
                      ? 'bg-[#00338D] text-white'
                      : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-[#0B0F19]'
                  }`}
                >
                  Tier 2: Python MicroVM (15s Cap)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Code Editor */}
              <div className="space-y-2">
                <div className={`flex items-center justify-between text-[11px] font-mono font-bold ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  <span>Isolated Code Snippet:</span>
                  <span className="text-[10px] text-slate-400">Memory limit: {sandboxLang === 'python' ? '512MB' : '32MB'}</span>
                </div>
                <textarea
                  value={sandboxCode}
                  onChange={(e) => setSandboxCode(e.target.value)}
                  rows={8}
                  className="w-full p-3 font-mono text-xs bg-[#0B0F19] text-emerald-400 border border-[#1E293B] focus:border-[#0091DA] outline-none resize-none leading-relaxed"
                />
                <div>
                  <span className={`text-[10px] font-mono font-bold block mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>Input Payload (JSON):</span>
                  <input
                    type="text"
                    value={sandboxInput}
                    onChange={(e) => setSandboxInput(e.target.value)}
                    className={`w-full p-2 font-mono text-xs outline-none border transition-colors ${
                      isDarkMode 
                        ? 'bg-[#070A12] border-white/10 text-white focus:border-[#0091DA]' 
                        : 'bg-[#FFFFFF] border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D]'
                    }`}
                  />
                </div>
                <button
                  onClick={handleRunSandboxTest}
                  disabled={isExecutingSandbox}
                  className="btn-tactile w-full py-2.5 bg-[#00338D] hover:bg-[#005EB8] text-white font-bold text-xs flex items-center justify-center gap-2 rounded-none transition-all shadow-xs cursor-pointer"
                >
                  {isExecutingSandbox ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Executing in Sandbox...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Dispatch to Sandbox ({sandboxLang.toUpperCase()})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Output Display */}
              <div className="space-y-2 flex flex-col">
                <div className={`flex items-center justify-between text-[11px] font-mono font-bold ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  <span>Sandbox Execution Telemetry:</span>
                  {sandboxResult && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6F5EC] text-[#009A44] font-bold">
                      {sandboxResult.latencyMs}ms • {sandboxResult.tier || 'SANDBOX'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-h-[220px] p-3 font-mono text-xs bg-[#0B0F19] text-slate-200 border border-[#1E293B] overflow-auto">
                  {sandboxResult ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-[#1E293B] pb-1 text-[10px] text-slate-400">
                        <span>STATUS: {sandboxResult.success ? 'PASSED' : 'EXECUTION_ERROR'}</span>
                        <span>LATENCY: {sandboxResult.latencyMs}ms</span>
                      </div>
                      {sandboxResult.output && (
                        <div>
                          <span className="text-slate-400 text-[10px]">OUTPUT:</span>
                          <pre className="text-emerald-400 text-[11px] mt-1 whitespace-pre-wrap">
                            {JSON.stringify(sandboxResult.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      {sandboxResult.rawOutput && (
                        <div>
                          <span className="text-slate-400 text-[10px]">STDOUT:</span>
                          <pre className="text-slate-300 text-[11px] mt-1 whitespace-pre-wrap">{sandboxResult.rawOutput}</pre>
                        </div>
                      )}
                      {sandboxResult.error && (
                        <div>
                          <span className="text-red-400 text-[10px]">ERROR / TIMEOUT:</span>
                          <pre className="text-red-400 text-[11px] mt-1 whitespace-pre-wrap">{sandboxResult.error}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-1">
                      <Cpu className="w-8 h-8 text-slate-600 mb-1" />
                      <p className="text-[11px]">Sandbox is standing by.</p>
                      <p className="text-[10px] text-slate-600">Click Dispatch to run code in an isolated environment.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rate Governor & Quota Monitor */}
          {clusterData?.rateLimits && (
            <div className={`p-4 border shadow-sm space-y-3 transition-colors ${
              isDarkMode ? 'bg-[#0E1526] border-white/10' : 'bg-[#FFFFFF] border-[#CBD5E1]'
            }`}>
              <h4 className={`text-xs font-bold uppercase font-mono tracking-tight flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-[#0B0F19]'
              }`}>
                <Zap className="w-4 h-4 text-[#EAAA00]" />
                Multi-LLM Rate Governor (Token-Bucket Capacity Meter)
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(clusterData.rateLimits).map(([prov, data]) => {
                  const pct = Math.round((data.availableTokens / data.capacity) * 100);
                  return (
                    <div key={prov} className={`p-2.5 border text-xs transition-colors ${
                      isDarkMode ? 'bg-[#070A12] border-white/10' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                    }`}>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className={`font-bold uppercase ${isDarkMode ? 'text-[#0091DA]' : 'text-[#00338D]'}`}>{prov}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden mb-1.5 ${
                        isDarkMode ? 'bg-slate-800' : 'bg-[#E0E0E0]'
                      }`}>
                        <div
                          className="bg-[#00338D] h-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {data.availableTokens}/{data.capacity} tokens
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick CLI Start Guide */}
          {!isGatewayOnline && (
            <div className="p-4 bg-[#001E50] border border-[#00338D] text-white flex items-center justify-between text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0091DA] font-mono">
                  CLI Execution Plane Quickstart
                </span>
                <p className="text-xs text-slate-300">
                  To activate the Port 4000 high-concurrency execution cluster on your host machine, run:
                </p>
                <code className="text-xs font-mono text-[#EAAA00] bg-black/40 px-2 py-1 inline-block mt-1">
                  node server/index.js
                </code>
              </div>
              <span className="text-[10px] font-mono px-3 py-1 bg-white/10 border border-white/20 text-white font-bold rounded-none">
                HTTP + SSE STREAMING READY
              </span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 transition-colors ${
          isDarkMode ? 'bg-[#0B0F19] border-white/10 text-slate-400' : 'bg-[#F8F9FB] border-[#CBD5E1] text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-[#009A44]" />
            <span>Architecture: Decoupled Control Plane &amp; Execution Plane (Phase 2 Primed)</span>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile px-5 py-2 bg-[#00338D] hover:bg-[#005EB8] text-white text-xs font-bold rounded-none shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
