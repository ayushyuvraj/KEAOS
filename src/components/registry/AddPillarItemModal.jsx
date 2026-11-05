import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  Cpu, 
  Server, 
  Wrench,
  AlertCircle
} from 'lucide-react';
import { addCustomItem } from '../../services/componentRegistryService';

export default function AddPillarItemModal({
  isOpen,
  onClose,
  category,
  categoryLabel,
  onItemCreated,
  isDarkMode = true
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [configField, setConfigField] = useState('');
  const [provider, setProvider] = useState('openai');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`Please provide a name for this ${categoryLabel || 'item'}.`);
      return;
    }

    let config = {};
    if (category === 'model') {
      config = { provider, modelId: configField.trim() || name.toLowerCase().replace(/\s+/g, '-'), temperature: 0.2 };
    } else if (category === 'policies') {
      config = { ruleType: 'regex_guard', pattern: configField.trim() || 'strict', enforcement: 'redact' };
    } else if (category === 'skills') {
      config = { format: 'structured', depth: 'high', guidelines: configField.trim() };
    } else if (category === 'mcp') {
      config = { endpoint: configField.trim() || 'http://localhost:8000', transport: 'sse' };
    }

    const newItem = addCustomItem(category, {
      name: name.trim(),
      description: description.trim() || `Enterprise custom ${categoryLabel}`,
      provider: category === 'model' ? provider : undefined,
      modelId: category === 'model' ? (configField.trim() || name.toLowerCase().replace(/\s+/g, '-')) : undefined,
      config
    });

    if (onItemCreated) {
      onItemCreated(newItem);
    }
    onClose();
  };

  const getPlaceholderForConfig = () => {
    if (category === 'model') return 'Model identifier (e.g. gpt-4o, claude-3-7-sonnet)';
    if (category === 'policies') return 'Guardrail regex or keywords to redact / block';
    if (category === 'skills') return 'Key behavioral guidelines or formatting prompt';
    if (category === 'mcp') return 'Server endpoint URL or stdio command';
    return 'Configuration parameter';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div 
        className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
          isDarkMode ? 'bg-[#0F131D] border-[#1E293B] text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-[#1E293B] bg-[#0A0D14]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00338D]/20 text-[#0091DA] border border-[#0091DA]/30 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#0091DA] block">
                {categoryLabel?.toUpperCase()} REGISTRY
              </span>
              <h3 className="text-sm font-bold truncate">
                Add {categoryLabel}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Name *
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
              placeholder={`e.g. ${category === 'model' ? 'Llama 3.3 70B' : category === 'policies' ? 'Financial PII Redactor' : 'Risk & Audit Skill'}`}
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-semibold ${
                isDarkMode ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
              }`}
            />
          </div>

          {category === 'model' && (
            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className={`w-full px-2.5 py-2 text-xs rounded-xl border outline-none font-medium ${
                  isDarkMode ? 'bg-[#151B28] border-[#222E42] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google GenAI</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational purpose & scope"
              className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-medium ${
                isDarkMode ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              Specification / Rule Value
            </label>
            <textarea
              rows={3}
              value={configField}
              onChange={(e) => setConfigField(e.target.value)}
              placeholder={getPlaceholderForConfig()}
              className={`w-full p-2.5 text-xs rounded-xl border outline-none leading-relaxed ${
                isDarkMode ? 'bg-[#151B28] border-[#222E42] text-white focus:border-[#0091DA]' : 'bg-white border-slate-300 text-slate-900 focus:border-[#00338D]'
              }`}
            />
          </div>

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
              Add to {categoryLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

