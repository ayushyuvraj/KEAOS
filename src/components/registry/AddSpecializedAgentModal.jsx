import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  Sparkles, 
  Cpu, 
  Sliders, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { addSpecializedAgent } from '../../services/componentRegistryService';

export default function AddSpecializedAgentModal({
  isOpen,
  onClose,
  onAgentCreated,
  isDarkMode = true
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [prompt, setPrompt] = useState('');
  const [defaultModel, setDefaultModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState(0.2);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this Specialized AI Agent.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please provide specialized system instructions / prompt.');
      return;
    }

    const newAgent = addSpecializedAgent({
      name: name.trim(),
      role: role.trim() || 'Specialized Reasoning',
      prompt: prompt.trim(),
      defaultModel,
      temperature,
      topP: 0.95
    });

    if (onAgentCreated) {
      onAgentCreated(newAgent);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDarkMode ? 'bg-[#0F131D] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-[#1E293B] bg-[#0A0D14]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00338D]/20 text-[#0091DA] border border-[#0091DA]/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#0091DA] block">
                SPECIALIZED AI AGENT FACTORY
              </span>
              <h3 className="text-sm font-bold truncate">
                Define New Specialized Agent
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Agent Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Tax Reconciliation Specialist"
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-semibold transition-colors ${
                isDarkMode 
                  ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Role & Domain Specialization
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. GSTR-2A Matching & Variance Resolution"
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Specialized System Instructions & Persona Prompt *
            </label>
            <textarea
              rows={4}
              required
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (error) setError('');
              }}
              placeholder="Define exactly how this agent reasons, parses data, enforces domain invariants, and formats structured outputs..."
              className={`w-full p-2.5 text-xs rounded-xl border outline-none leading-relaxed transition-colors ${
                isDarkMode 
                  ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' 
                  : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                Default Foundation Model
              </label>
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className={`w-full px-2.5 py-2 text-xs rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#151B28] border-[#222E42] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Anthropic)</option>
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Anthropic)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Google)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
                <option value="llama3.3">Llama 3.3 (Ollama Local)</option>
                <option value="deepseek-r1">DeepSeek R1 (Ollama Local)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block">
                  Temperature
                </label>
                <span className="text-[10px] font-mono text-[#0091DA] font-semibold">
                  {temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg accent-[#0091DA] cursor-pointer mt-2"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Once registered, this Specialized AI Agent will immediately be available in the right <strong>Add Components</strong> panel under <strong>AI Agent</strong> for drag-and-drop into any workflow.
          </p>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/40">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#00338D] hover:bg-[#005EB8] text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Register Specialized Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

