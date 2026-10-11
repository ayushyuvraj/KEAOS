import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Sparkles, 
  Cpu, 
  Code2, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  FileText,
  ShieldAlert
} from 'lucide-react';
import { EVALUATOR_PRESET_TEMPLATES } from '../../constants/goldenDataset';

export default function CustomEvaluatorModal({
  isOpen,
  onClose,
  onSaveEvaluator,
  isDarkMode = true
}) {
  const [activeTab, setActiveTab] = useState('llm-judge'); // 'llm-judge' | 'deterministic' | 'templates'
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [threshold, setThreshold] = useState(85);
  const [isHardGate, setIsHardGate] = useState(true);
  const [weight, setWeight] = useState(25);
  const [description, setDescription] = useState('');
  const [promptRubric, setPromptRubric] = useState(
    'Evaluate whether the agent output strictly adheres to instructions and achieves the ground truth objective. Score from 0 to 100 with clear reasoning.'
  );
  const [ruleType, setRuleType] = useState('regex-check'); // 'regex-check' | 'json-schema' | 'contains-check'
  const [ruleExpression, setRuleExpression] = useState('');

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl) => {
    setName(tpl.name);
    setShortName(tpl.shortName);
    setThreshold(tpl.threshold);
    setIsHardGate(tpl.isHardGate);
    setWeight(tpl.weight);
    setDescription(tpl.description);
    if (tpl.promptRubric) setPromptRubric(tpl.promptRubric);
    if (tpl.ruleExpression) setRuleExpression(tpl.ruleExpression);
    if (tpl.type === 'regex-check' || tpl.type === 'json-schema' || tpl.type === 'contains-check') {
      setActiveTab('deterministic');
      setRuleType(tpl.type);
    } else {
      setActiveTab('llm-judge');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEvaluator = {
      id: `eval-custom-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      shortName: shortName.trim() || name.trim().slice(0, 14),
      category: 'custom',
      type: activeTab === 'deterministic' ? ruleType : 'llm-judge',
      targetField: 'all',
      threshold: Number(threshold),
      unit: '%',
      isHardGate,
      isActive: true,
      weight: Number(weight),
      description: description.trim() || 'Custom enterprise alignment evaluator.',
      promptRubric: activeTab === 'llm-judge' ? promptRubric : null,
      ruleExpression: activeTab === 'deterministic' ? ruleExpression : null
    };

    onSaveEvaluator(newEvaluator);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className={`w-full max-w-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
        isDarkMode ? 'bg-[#0F131D] border-[#222736] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00338D] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                  Universal Evaluator Builder
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E6EDF7] text-[#00338D] border border-[#00338D]/20 font-bold">
                  ALIGNMENT CRITERIA
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Define any custom evaluation pointer, dynamic LLM judge rubric, or deterministic assertion.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 hover:bg-slate-500/20 transition-colors ${
              isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className={`flex border-b text-xs font-mono font-bold ${
          isDarkMode ? 'border-[#222736] bg-[#0B0E16]' : 'border-[#E0E0E0] bg-[#F1F3F7]'
        }`}>
          <button
            onClick={() => setActiveTab('llm-judge')}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'llm-judge'
                ? 'border-[#00338D] text-[#0091DA] bg-white/[0.04]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-black')
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>LLM-as-a-Judge Rubric</span>
          </button>
          <button
            onClick={() => setActiveTab('deterministic')}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'deterministic'
                ? 'border-[#00338D] text-[#0091DA] bg-white/[0.04]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-black')
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Deterministic Rule / Regex</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-2.5 px-4 text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'templates'
                ? 'border-[#00338D] text-[#0091DA] bg-white/[0.04]'
                : (isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-600 hover:text-black')
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architectural Templates</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'templates' ? (
            <div className="space-y-3">
              <span className={`text-xs font-bold uppercase font-mono block ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Select an Architectural Template
              </span>
              <div className="grid grid-cols-2 gap-3">
                {EVALUATOR_PRESET_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3.5 border cursor-pointer transition-all hover:border-[#00338D] ${
                      isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#0091DA] font-mono">{tpl.shortName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#009A44]/10 text-[#009A44] border border-[#009A44]/30">
                        {tpl.threshold}% SLA
                      </span>
                    </div>
                    <h5 className={`text-xs font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>{tpl.name}</h5>
                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{tpl.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Evaluator Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Factual Consistency"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-none focus:outline-none focus:border-[#00338D] ${
                      isDarkMode ? 'bg-[#141824] border-[#2B2F40] text-white' : 'bg-white border-[#CBD5E1] text-black'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Short Code / Column Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Consistency"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-none focus:outline-none focus:border-[#00338D] ${
                      isDarkMode ? 'bg-[#141824] border-[#2B2F40] text-white' : 'bg-white border-[#CBD5E1] text-black'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Explains what this evaluation pointer enforces..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-none focus:outline-none focus:border-[#00338D] ${
                    isDarkMode ? 'bg-[#141824] border-[#2B2F40] text-white' : 'bg-white border-[#CBD5E1] text-black'
                  }`}
                />
              </div>

              {activeTab === 'llm-judge' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-bold uppercase font-mono ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Judge Prompt Rubric
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Dynamic LLM-as-a-Judge</span>
                  </div>
                  <textarea
                    rows={4}
                    value={promptRubric}
                    onChange={(e) => setPromptRubric(e.target.value)}
                    placeholder="Provide step-by-step grading instructions for the evaluation judge..."
                    className={`w-full p-2.5 text-xs font-mono border rounded-none focus:outline-none focus:border-[#00338D] leading-relaxed ${
                      isDarkMode ? 'bg-[#0B0E16] border-[#2B2F40] text-slate-200' : 'bg-white border-[#CBD5E1] text-black'
                    }`}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Deterministic Rule Engine Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRuleType('regex-check')}
                        className={`flex-1 py-1.5 px-2 border text-xs font-mono font-bold transition-colors ${
                          ruleType === 'regex-check'
                            ? 'bg-[#00338D] text-white border-[#0091DA]'
                            : (isDarkMode ? 'bg-white/[0.03] border-white/10 text-slate-400' : 'bg-white border-slate-300 text-slate-700')
                        }`}
                      >
                        Regex Guard
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleType('json-schema')}
                        className={`flex-1 py-1.5 px-2 border text-xs font-mono font-bold transition-colors ${
                          ruleType === 'json-schema'
                            ? 'bg-[#00338D] text-white border-[#0091DA]'
                            : (isDarkMode ? 'bg-white/[0.03] border-white/10 text-slate-400' : 'bg-white border-slate-300 text-slate-700')
                        }`}
                      >
                        Strict JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuleType('contains-check')}
                        className={`flex-1 py-1.5 px-2 border text-xs font-mono font-bold transition-colors ${
                          ruleType === 'contains-check'
                            ? 'bg-[#00338D] text-white border-[#0091DA]'
                            : (isDarkMode ? 'bg-white/[0.03] border-white/10 text-slate-400' : 'bg-white border-slate-300 text-slate-700')
                        }`}
                      >
                        Key Term Inclusion
                      </button>
                    </div>
                  </div>

                  {ruleType !== 'json-schema' && (
                    <div>
                      <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {ruleType === 'regex-check' ? 'Regex Pattern Expression' : 'Comma-Separated Mandatory Terms'}
                      </label>
                      <input
                        type="text"
                        placeholder={ruleType === 'regex-check' ? 'e.g. (?i)(confidential|secret|apikey)' : 'e.g. status, confirmation, transactionId'}
                        value={ruleExpression}
                        onChange={(e) => setRuleExpression(e.target.value)}
                        className={`w-full px-3 py-2 text-xs font-mono border rounded-none focus:outline-none focus:border-[#00338D] ${
                          isDarkMode ? 'bg-[#0B0E16] border-[#2B2F40] text-white' : 'bg-white border-[#CBD5E1] text-black'
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Sliders: Threshold and Gating */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className={`p-3 border ${
                  isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                }`}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>Pass/Fail Threshold</span>
                    <span className="font-mono font-bold text-[#009A44]">{threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-[#009A44] cursor-pointer"
                  />
                </div>

                <div className={`p-3 border flex items-center justify-between ${
                  isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                }`}>
                  <div>
                    <span className={`text-xs font-bold block ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>Hard Blocker Gate</span>
                    <span className="text-[10px] text-slate-500">Failure blocks deployment</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHardGate(!isHardGate)}
                    className={`w-10 h-5 flex items-center p-0.5 transition-colors ${
                      isHardGate ? 'bg-[#00338D] justify-end' : 'bg-slate-600 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${
          isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 border text-xs font-bold transition-colors ${
              isDarkMode ? 'text-slate-400 hover:text-white border-slate-700' : 'text-slate-600 hover:text-black border-slate-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn-tactile px-5 py-2 bg-[#00338D] hover:bg-[#005EB8] disabled:bg-slate-600 text-white font-bold text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Activate Evaluator</span>
          </button>
        </div>
      </div>
    </div>
  );
}
