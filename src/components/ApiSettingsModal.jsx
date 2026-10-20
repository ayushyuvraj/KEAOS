import React, { useState, useEffect } from 'react';
import { Key, X, CheckCircle2, AlertCircle, ExternalLink, Shield, Cpu, Server } from 'lucide-react';
import { PROVIDERS, getProviderCredential, saveProviderCredential, testProviderConnection } from '../services/llmService';

export default function ApiSettingsModal({ isOpen, onClose, onKeyUpdated, initialTab = 'openai' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [credentials, setCredentials] = useState({});
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (initialTab && PROVIDERS[initialTab] && !PROVIDERS[initialTab].disabled) {
        setActiveTab(initialTab);
      } else {
        setActiveTab('openai');
      }
      const initialCreds = {};
      Object.keys(PROVIDERS).forEach((pId) => {
        if (!PROVIDERS[pId].disabled) {
          initialCreds[pId] = getProviderCredential(pId) || '';
        }
      });
      setCredentials(initialCreds);
      setTestResults({});
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentDef = PROVIDERS[activeTab] || PROVIDERS.google;

  const handleTestConnection = async (pId) => {
    setTestingProvider(pId);
    setTestResults(prev => ({ ...prev, [pId]: null }));

    const res = await testProviderConnection(pId, credentials[pId]);
    setTestResults(prev => ({ ...prev, [pId]: res }));
    setTestingProvider(null);
  };

  const handleSave = () => {
    Object.entries(credentials).forEach(([pId, val]) => {
      saveProviderCredential(pId, val);
    });
    if (onKeyUpdated) onKeyUpdated();
    onClose();
  };

  const toggleShowSecret = (pId) => {
    setShowSecrets(prev => ({ ...prev, [pId]: !prev[pId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001E50]/50 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#CBD5E1] shadow-[0_16px_48px_rgba(0,30,80,0.3)] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#001E50] border-b border-[#00338D] flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#00338D] text-white flex items-center justify-center border border-[#0091DA]/40 shadow-inner">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0091DA] font-mono">
                Multi-LLM Credential Registry
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Configure Foundation Model Providers
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile w-8 h-8 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Banner */}
        <div className="px-6 py-2.5 bg-[#E6EDF7] border-b border-[#00338D]/20 text-xs text-[#00338D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#00338D] shrink-0" />
            <span className="font-bold">Zero-Simulation Engine: </span>
            <span className="text-slate-700">Models execute directly against live provider endpoints without mocks.</span>
          </div>
          <span className="text-[9px] font-mono uppercase font-bold text-[#00338D] px-2 py-0.5 bg-white border border-[#00338D]/20">
            Local W3C WebCrypto
          </span>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-[#E0E0E0] bg-[#F8F9FB] px-6 pt-2 gap-1 overflow-x-auto">
          {Object.entries(PROVIDERS).filter(([_, def]) => !def.disabled).map(([pId, def]) => {
            const hasCred = Boolean(credentials[pId] && credentials[pId].trim().length > 0);
            return (
              <button
                key={pId}
                onClick={() => setActiveTab(pId)}
                className={`btn-tactile px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap rounded-none ${
                  activeTab === pId
                    ? 'border-[#00338D] text-[#00338D] bg-[#FFFFFF] shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-[#0B0F19]'
                }`}
              >
                <span>{def.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    hasCred ? 'bg-[#009A44] beacon-live' : 'bg-[#CBD5E1]'
                  }`}
                  title={hasCred ? 'Configured' : 'Unconfigured'}
                />
              </button>
            );
          })}
        </div>

        {/* Provider Configuration Panel */}
        <div className="p-6 space-y-4 bg-[#FFFFFF]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#0B0F19] tracking-tight">{currentDef.name}</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {currentDef.isLocal
                    ? 'Private on-premises inference server via standard HTTP endpoint.'
                    : `Authenticate directly with ${currentDef.name} API.`}
                </p>
              </div>

              <a
                href={currentDef.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#00338D] hover:underline flex items-center gap-1 font-bold font-mono"
              >
                <span>Get API Credentials</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Input field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] mb-1.5 font-mono">
                {currentDef.isLocal ? 'Ollama Base URL' : `${currentDef.name} API Key`}
              </label>

              <div className="relative">
                <input
                  type={showSecrets[activeTab] || currentDef.isLocal ? 'text' : 'password'}
                  value={credentials[activeTab] || ''}
                  onChange={(e) => {
                    setCredentials({ ...credentials, [activeTab]: e.target.value });
                    setTestResults({ ...testResults, [activeTab]: null });
                  }}
                  placeholder={currentDef.placeholder}
                  className="w-full pl-3.5 pr-20 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] text-[#0B0F19] text-xs font-mono focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none transition-colors"
                />
                {!currentDef.isLocal && (
                  <button
                    type="button"
                    onClick={() => toggleShowSecret(activeTab)}
                    className="absolute right-2.5 top-2.5 text-[11px] font-bold text-[#00338D] hover:underline font-mono"
                  >
                    {showSecrets[activeTab] ? 'Hide' : 'Show'}
                  </button>
                )}
              </div>
            </div>

            {/* Models Available Info */}
            <div className="p-3 bg-[#F8F9FB] border border-[#E0E0E0] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 block font-mono">
                Compatible Models via KEAOS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentDef.models.map((m) => (
                  <span
                    key={m}
                    className="text-[10px] font-mono px-2 py-0.5 bg-[#FFFFFF] text-[#0B0F19] border border-[#CBD5E1] font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Connection Test Result */}
            {testResults[activeTab] && (
              <div
                className={`p-3 text-xs flex items-start gap-2.5 border ${
                  testResults[activeTab].success
                    ? 'bg-[#E6F5EC] border-[#009A44] text-[#009A44]'
                    : 'bg-[#F2E9F4] border-[#6D2077] text-[#6D2077]'
                }`}
              >
                {testResults[activeTab].success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#009A44]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6D2077]" />
                )}
                <div className="font-medium">
                  <span className="font-bold">
                    {testResults[activeTab].success ? 'Verification Passed: ' : 'Verification Failed: '}
                  </span>
                  <span>{testResults[activeTab].message}</span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-[#E0E0E0] flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleTestConnection(activeTab)}
              disabled={testingProvider === activeTab}
              className="btn-tactile px-4 py-2 text-xs font-bold text-[#00338D] border border-[#00338D] hover:bg-[#E6EDF7] rounded-none transition-colors disabled:opacity-50"
            >
              {testingProvider === activeTab ? 'Testing Ping...' : `Test ${currentDef.name} Connection`}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-tactile px-4 py-2 text-xs font-bold text-slate-600 hover:text-[#0B0F19] rounded-none transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn-tactile px-5 py-2 text-xs font-bold bg-[#00338D] hover:bg-[#005EB8] text-white rounded-none transition-all shadow-sm border-b-2 border-[#001E50]"
              >
                Save & Apply Credentials
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
