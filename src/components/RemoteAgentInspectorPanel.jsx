import React, { useState } from 'react';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Activity
} from 'lucide-react';

export default function RemoteAgentInspectorPanel({
  selectedNode,
  onUpdateNodeData
}) {
  const nodeData = selectedNode?.data || {};

  // Form State
  const [name, setName] = useState(nodeData.name || 'LangGraph Remote Agent');
  const [framework, setFramework] = useState(nodeData.framework || 'langgraph');
  const [hostingProvider, setHostingProvider] = useState(nodeData.hostingProvider || 'AWS');
  const [endpointUrl, setEndpointUrl] = useState(nodeData.endpointUrl || 'https://api.example.com/run');
  const [httpMethod, setHttpMethod] = useState(nodeData.httpMethod || 'POST');
  const [authType, setAuthType] = useState(nodeData.authType || 'bearer');
  const [authToken, setAuthtoken] = useState(nodeData.authToken || '');
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(nodeData.timeoutSeconds || 30);
  const [retries, setRetries] = useState(nodeData.retries || 1);
  const [requestMode, setRequestMode] = useState(nodeData.requestMode || 'json_envelope');
  const [responsePath, setResponsePath] = useState(nodeData.responsePath || 'auto');
  const [otelIngestion, setOtelIngestion] = useState(nodeData.otelIngestion !== false);

  // Live Ping Testing State
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  // Sync mutations back to canvas node data
  const handleFieldChange = (field, value) => {
    if (onUpdateNodeData && selectedNode?.id) {
      onUpdateNodeData(selectedNode.id, { [field]: value });
    }
  };

  const handlePingEndpoint = async () => {
    setIsPinging(true);
    setPingResult(null);

    const startTime = performance.now();
    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (authType === 'bearer' && authToken) {
        headers['Authorization'] = `Bearer ${authToken.trim()}`;
      } else if (authType === 'api_key' && authToken) {
        headers['X-API-Key'] = authToken.trim();
      } else if (authType === 'basic' && authToken) {
        const encoded = typeof btoa !== 'undefined'
          ? btoa(authToken.trim())
          : authToken.trim();
        headers['Authorization'] = `Basic ${encoded}`;
      }

      const body = requestMode === 'json_envelope' 
        ? JSON.stringify({
            test: true,
            input: 'KEAOS Connection Health Check',
            timestamp: new Date().toISOString()
          })
        : 'KEAOS Connection Health Check';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), (Number(timeoutSeconds) || 10) * 1000);

      const res = await fetch(endpointUrl, {
        method: httpMethod,
        headers,
        body: httpMethod === 'GET' ? undefined : body,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const durationMs = Math.round(performance.now() - startTime);
      let text = await res.text();
      let parsed = null;
      try { 
        parsed = JSON.parse(text); 
      } catch {
        parsed = text;
      }

      setPingResult({
        success: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs,
        preview: parsed ? JSON.stringify(parsed, null, 2).slice(0, 300) : text.slice(0, 300)
      });
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      setPingResult({
        success: false,
        status: 0,
        statusText: 'Network / CORS Error',
        durationMs,
        error: err.name === 'AbortError' ? `Timeout after ${timeoutSeconds}s` : err.message
      });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-4 p-3 select-none text-xs">
      {/* 1. Identity & Framework */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Agent Identity & Engine
        </label>
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              handleFieldChange('name', e.target.value);
            }}
            placeholder="Agent / Service Name"
            className="w-full px-2.5 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs focus:outline-none focus:border-[#00A3A6]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 font-mono block mb-1">Framework</span>
            <select
              value={framework}
              onChange={(e) => {
                setFramework(e.target.value);
                handleFieldChange('framework', e.target.value);
              }}
              className="w-full px-2 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs font-mono"
            >
              <option value="langgraph">LangGraph (StateGraph)</option>
              <option value="crewai">CrewAI (Crews & Tasks)</option>
              <option value="google-adk">Google ADK / GenAI</option>
              <option value="autogen">Microsoft AutoGen</option>
              <option value="openai-swarm">OpenAI Swarm</option>
              <option value="fastapi">FastAPI / Python</option>
              <option value="custom">Custom REST API</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-mono block mb-1">Hosting Provider</span>
            <select
              value={hostingProvider}
              onChange={(e) => {
                setHostingProvider(e.target.value);
                handleFieldChange('hostingProvider', e.target.value);
              }}
              className="w-full px-2 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs font-mono"
            >
              <option value="AWS">AWS (ECS / Lambda)</option>
              <option value="Azure">Azure (Container Apps)</option>
              <option value="GCP">GCP (Cloud Run / Vertex)</option>
              <option value="On-Prem">On-Premise Private Cloud</option>
              <option value="Localhost">Localhost / Docker</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Network Endpoint Configuration */}
      <div className="space-y-2 pt-2 border-t border-[#1E293B]">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Service Endpoint (URL)</span>
          <span className="text-[#00A3A6] text-[9px]">ZERO CODE REWRITE</span>
        </label>

        <div className="flex gap-2">
          <select
            value={httpMethod}
            onChange={(e) => {
              setHttpMethod(e.target.value);
              handleFieldChange('httpMethod', e.target.value);
            }}
            className="w-20 px-2 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs font-mono font-bold"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
            <option value="PUT">PUT</option>
          </select>

          <input
            type="text"
            value={endpointUrl}
            onChange={(e) => {
              setEndpointUrl(e.target.value);
              handleFieldChange('endpointUrl', e.target.value);
            }}
            placeholder="https://api.yourdomain.com/v1/run"
            className="flex-1 px-2.5 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs font-mono focus:outline-none focus:border-[#00A3A6]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div>
            <span className="text-slate-400 block mb-1">Timeout (seconds)</span>
            <input
              type="number"
              min="2"
              max="180"
              value={timeoutSeconds}
              onChange={(e) => {
                setTimeoutSeconds(e.target.value);
                handleFieldChange('timeoutSeconds', Number(e.target.value));
              }}
              className="w-full px-2 py-1 bg-[#090D16] border border-[#1E293B] text-slate-200"
            />
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Retry on Failure</span>
            <select
              value={retries}
              onChange={(e) => {
                setRetries(e.target.value);
                handleFieldChange('retries', Number(e.target.value));
              }}
              className="w-full px-2 py-1 bg-[#090D16] border border-[#1E293B] text-slate-200 font-mono"
            >
              <option value="0">0 Retries (Fail fast)</option>
              <option value="1">1 Retry</option>
              <option value="2">2 Retries</option>
              <option value="3">3 Retries</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Authentication & Secrets */}
      <div className="space-y-2 pt-2 border-t border-[#1E293B]">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Security & Authentication</span>
          <Key className="w-3 h-3 text-slate-500" />
        </label>

        <div>
          <select
            value={authType}
            onChange={(e) => {
              setAuthType(e.target.value);
              handleFieldChange('authType', e.target.value);
            }}
            className="w-full px-2 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs font-mono"
          >
            <option value="none">No Auth (Public / Internal Mesh)</option>
            <option value="bearer">Bearer Token (Authorization: Bearer ...)</option>
            <option value="api_key">API Key (X-API-Key: ...)</option>
            <option value="basic">Basic Auth</option>
          </select>
        </div>

        {authType !== 'none' && (
          <div className="relative">
            <input
              type={showAuthToken ? 'text' : 'password'}
              value={authToken}
              onChange={(e) => {
                setAuthtoken(e.target.value);
                handleFieldChange('authToken', e.target.value);
              }}
              placeholder="Paste Bearer Token or API Key..."
              className="w-full pl-2.5 pr-8 py-1.5 bg-[#090D16] border border-[#1E293B] rounded-none text-slate-200 text-xs font-mono focus:outline-none focus:border-[#00A3A6]"
            />
            <button
              type="button"
              onClick={() => setShowAuthToken(!showAuthToken)}
              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
            >
              {showAuthToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* 4. Request / Response Data Mapping */}
      <div className="space-y-2 pt-2 border-t border-[#1E293B]">
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Input & Output Protocol
        </label>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div>
            <span className="text-slate-400 block mb-1">Payload Envelope</span>
            <select
              value={requestMode}
              onChange={(e) => {
                setRequestMode(e.target.value);
                handleFieldChange('requestMode', e.target.value);
              }}
              className="w-full px-2 py-1 bg-[#090D16] border border-[#1E293B] text-slate-200"
            >
              <option value="json_envelope">Standard JSON ({'{ input, context }'})</option>
              <option value="raw">Raw Upstream Content</option>
            </select>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Response Field</span>
            <input
              type="text"
              value={responsePath}
              onChange={(e) => {
                setResponsePath(e.target.value);
                handleFieldChange('responsePath', e.target.value);
              }}
              placeholder="auto, output, or result"
              className="w-full px-2 py-1 bg-[#090D16] border border-[#1E293B] text-slate-200 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. Live Connection Test ("Ping Endpoint") */}
      <div className="pt-2 border-t border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
            Connectivity Verification
          </span>
          <button
            type="button"
            onClick={handlePingEndpoint}
            disabled={isPinging || !endpointUrl}
            className="px-3 py-1 bg-[#00A3A6] hover:bg-[#008D90] disabled:opacity-50 text-white font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            {isPinging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            <span>Ping Endpoint</span>
          </button>
        </div>

        {pingResult && (
          <div
            className={`p-2 border text-[10px] font-mono space-y-1 ${
              pingResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1">
                {pingResult.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{pingResult.status || 'ERROR'} {pingResult.statusText}</span>
              </span>
              <span>{pingResult.durationMs}ms</span>
            </div>

            {pingResult.preview && (
              <pre className="p-1 bg-black/40 text-[9px] text-slate-300 overflow-x-auto max-h-24 font-mono whitespace-pre-wrap">
                {pingResult.preview}
              </pre>
            )}

            {pingResult.error && (
              <p className="text-[9px] text-red-400">{pingResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* 6. Ingrained OpenTelemetry Switch */}
      <div className="pt-2 border-t border-[#1E293B]">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-200 block flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00A3A6]" />
              <span>Audit 2.0 (OpenTelemetry)</span>
            </span>
            <span className="text-[10px] text-slate-400 block">
              Auto-generate W3C trace span and calculate costs for every execution
            </span>
          </div>
          <input
            type="checkbox"
            checked={otelIngestion}
            onChange={(e) => {
              setOtelIngestion(e.target.checked);
              handleFieldChange('otelIngestion', e.target.checked);
            }}
            className="w-4 h-4 accent-[#00A3A6]"
          />
        </label>
      </div>
    </div>
  );
}
