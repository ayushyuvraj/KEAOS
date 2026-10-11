import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  FileText, 
  Database, 
  Check, 
  Download,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  INITIAL_GOLDEN_DATASET, 
  FINANCIAL_AUDIT_DATASET 
} from '../../constants/goldenDataset';

export default function DatasetDrawer({
  isOpen,
  onClose,
  dataset,
  onUpdateDataset,
  isDarkMode = true
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(dataset[0]?.id || null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Executive');
  const [newInput, setNewInput] = useState('');
  const [newDecision, setNewDecision] = useState('');
  const [newActionItemsText, setNewActionItemsText] = useState('');

  if (!isOpen) return null;

  const activeCase = dataset.find(d => d.id === selectedCaseId) || dataset[0];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let parsed = [];
        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else if (file.name.endsWith('.jsonl')) {
          parsed = text
            .split('\n')
            .filter(l => l.trim().length > 0)
            .map(l => JSON.parse(l));
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim().length > 0);
          parsed = lines.slice(1).map((line, idx) => {
            const parts = line.split(',');
            return {
              id: `csv-${idx + 1}`,
              caseName: parts[0] || `CSV Test Case ${idx + 1}`,
              category: parts[1] || 'General',
              inputTranscript: parts[2] || '',
              groundTruth: { keyDecision: parts[3] || '', actionItems: [], piiToRedact: [] }
            };
          });
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdateDataset(parsed);
          setSelectedCaseId(parsed[0].id);
        } else {
          alert('Dataset file did not contain an array of test cases.');
        }
      } catch (err) {
        alert(`Failed to parse dataset file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveNewCase = () => {
    if (!newName.trim() || !newInput.trim()) return;

    let parsedActions = [];
    if (newActionItemsText.trim()) {
      parsedActions = newActionItemsText
        .split('\n')
        .filter(l => l.trim().length > 0)
        .map(l => ({
          assignee: 'Owner',
          task: l.trim(),
          deadline: 'TBD'
        }));
    }

    const newCase = {
      id: `gd-custom-${Date.now().toString().slice(-4)}`,
      caseName: newName.trim(),
      category: newCategory.trim() || 'Custom',
      inputTranscript: newInput.trim(),
      groundTruth: {
        keyDecision: newDecision.trim(),
        actionItems: parsedActions,
        piiToRedact: []
      }
    };

    const updated = [...dataset, newCase];
    onUpdateDataset(updated);
    setSelectedCaseId(newCase.id);
    setIsAddingNew(false);
    setNewName('');
    setNewInput('');
    setNewDecision('');
    setNewActionItemsText('');
  };

  const handleDeleteCase = (id) => {
    if (dataset.length <= 1) {
      alert('You must have at least one test case in your golden dataset.');
      return;
    }
    const updated = dataset.filter(d => d.id !== id);
    onUpdateDataset(updated);
    setSelectedCaseId(updated[0]?.id || null);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `golden-dataset-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className={`w-full max-w-5xl h-[85vh] border shadow-2xl flex flex-col overflow-hidden ${
        isDarkMode ? 'bg-[#0F131D] border-[#222736] text-white' : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#00338D] text-white flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#0B0F19]'}`}>
                  Golden Benchmark Dataset Manager
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#009A44]/10 text-[#009A44] border border-[#009A44]/30 font-bold">
                  {dataset.length} TEST CASES
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage institutional ground truth test fixtures and multi-scenario regression suites.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className={`px-3 py-1.5 border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                isDarkMode ? 'border-slate-600 text-slate-300 hover:border-slate-400' : 'border-slate-300 text-slate-700 hover:border-slate-500'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <input
              type="file"
              accept=".json,.jsonl,.csv"
              onChange={handleFileUpload}
              className="hidden"
              id="drawer-dataset-upload"
            />
            <label
              htmlFor="drawer-dataset-upload"
              className="btn-tactile px-3 py-1.5 bg-[#00338D] hover:bg-[#005EB8] text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Dataset</span>
            </label>
            <button
              onClick={onClose}
              className={`p-1 hover:bg-slate-500/20 transition-colors ml-2 ${
                isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Column Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Test Case List & Domain Selector */}
          <div className={`w-80 border-r flex flex-col shrink-0 ${
            isDarkMode ? 'bg-[#0B0E16] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
          }`}>
            {/* Quick Domain Swapper */}
            <div className={`p-3 border-b space-y-2 ${isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'}`}>
              <span className={`text-[10px] font-mono uppercase font-bold block ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Load Preset Regression Suites
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateDataset(INITIAL_GOLDEN_DATASET)}
                  className={`flex-1 py-1 px-2 border text-[11px] font-mono hover:border-[#00338D] transition-colors ${
                    isDarkMode ? 'border-[#222736] text-slate-300 bg-white/[0.02]' : 'border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  Executive (3)
                </button>
                <button
                  onClick={() => onUpdateDataset([...INITIAL_GOLDEN_DATASET, ...FINANCIAL_AUDIT_DATASET])}
                  className={`flex-1 py-1 px-2 border text-[11px] font-mono hover:border-[#00338D] transition-colors ${
                    isDarkMode ? 'border-[#222736] text-slate-300 bg-white/[0.02]' : 'border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  Financial (4)
                </button>
              </div>
            </div>

            {/* Test Case Rows */}
            <div className={`p-2 border-b flex items-center justify-between ${
              isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
            }`}>
              <span className={`text-xs font-bold uppercase font-mono ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>Cases</span>
              <button
                onClick={() => setIsAddingNew(true)}
                className="text-xs font-bold text-[#0091DA] hover:underline flex items-center gap-1 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Case</span>
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto divide-y ${
              isDarkMode ? 'divide-[#222736]' : 'divide-[#E0E0E0]'
            }`}>
              {dataset.map((cs) => {
                const isSelected = cs.id === selectedCaseId;
                return (
                  <div
                    key={cs.id}
                    onClick={() => {
                      setSelectedCaseId(cs.id);
                      setIsAddingNew(false);
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#00338D]/20 border-l-4 border-l-[#00338D]'
                        : (isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-[#E6EDF7]/50')
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-mono text-[#0091DA] font-bold">{cs.id}</span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                          isDarkMode ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {cs.category}
                        </span>
                      </div>
                      <h5 className={`text-xs font-bold truncate ${
                        isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                      }`}>{cs.caseName}</h5>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCase(cs.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete test case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Case Inspector or Add New Form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isAddingNew ? (
              <div className="space-y-4">
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
                }`}>
                  <h4 className={`text-sm font-bold uppercase font-mono ${
                    isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                  }`}>Create New Test Case</h4>
                  <button
                    onClick={() => setIsAddingNew(false)}
                    className={`text-xs ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'}`}
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Case Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Audit Review Sync"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-none focus:outline-none focus:border-[#00338D] ${
                        isDarkMode ? 'bg-[#141824] border-[#2B2F40] text-white' : 'bg-white border-[#CBD5E1] text-black'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Category
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Compliance / Tax"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
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
                    Input Transcript / Document Text *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Paste ground truth raw dialogue or source document..."
                    value={newInput}
                    onChange={(e) => setNewInput(e.target.value)}
                    className={`w-full p-2.5 text-xs font-mono border rounded-none focus:outline-none focus:border-[#00338D] ${
                      isDarkMode ? 'bg-[#0B0E16] border-[#2B2F40] text-slate-200' : 'bg-white border-[#CBD5E1] text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Expected Key Decision / Ground Truth Target
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $45K approved for GPU expansion..."
                    value={newDecision}
                    onChange={(e) => setNewDecision(e.target.value)}
                    className={`w-full px-3 py-2 text-xs border rounded-none focus:outline-none focus:border-[#00338D] ${
                      isDarkMode ? 'bg-[#141824] border-[#2B2F40] text-white' : 'bg-white border-[#CBD5E1] text-black'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-bold uppercase font-mono block mb-1 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Expected Action Items (One per line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="David: Deploy update by Wednesday&#10;Kavita: Update alert routing"
                    value={newActionItemsText}
                    onChange={(e) => setNewActionItemsText(e.target.value)}
                    className={`w-full p-2.5 text-xs font-mono border rounded-none focus:outline-none focus:border-[#00338D] ${
                      isDarkMode ? 'bg-[#0B0E16] border-[#2B2F40] text-slate-200' : 'bg-white border-[#CBD5E1] text-black'
                    }`}
                  />
                </div>

                <button
                  onClick={handleSaveNewCase}
                  disabled={!newName.trim() || !newInput.trim()}
                  className="btn-tactile px-5 py-2 bg-[#00338D] hover:bg-[#005EB8] disabled:bg-slate-600 text-white font-bold text-xs flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Append to Dataset</span>
                </button>
              </div>
            ) : activeCase ? (
              <div className="space-y-4">
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-[#0091DA] font-bold block">{activeCase.id}</span>
                    <h4 className={`text-base font-bold ${
                      isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                    }`}>{activeCase.caseName}</h4>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 font-bold rounded ${
                    isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {activeCase.category}
                  </span>
                </div>

                {/* Source Input */}
                <div className="space-y-1.5">
                  <span className={`text-xs font-bold uppercase font-mono block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Source Input Text / Transcript
                  </span>
                  <div className={`p-3 text-xs font-mono leading-relaxed border max-h-56 overflow-y-auto ${
                    isDarkMode ? 'bg-[#0B0E16] border-[#222736] text-slate-300' : 'bg-[#F8F9FB] border-[#E0E0E0] text-black'
                  }`}>
                    {activeCase.inputTranscript}
                  </div>
                </div>

                {/* Ground Truth Targets */}
                <div className="space-y-3 pt-2">
                  <span className={`text-xs font-bold uppercase font-mono block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Ground Truth Alignment Targets
                  </span>

                  <div className={`p-3 border space-y-1.5 ${
                    isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                  }`}>
                    <span className="text-[10px] font-mono text-[#0091DA] font-bold block uppercase">
                      Target Key Decision
                    </span>
                    <p className={`text-xs font-medium leading-relaxed ${
                      isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                    }`}>
                      {activeCase.groundTruth?.keyDecision || 'No specific decision mandated.'}
                    </p>
                  </div>

                  <div className={`p-3 border space-y-2 ${
                    isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#009A44] font-bold uppercase">
                        Target Action Commitments ({activeCase.groundTruth?.actionItems?.length || 0})
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {(activeCase.groundTruth?.actionItems || []).map((act, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Check className="w-3.5 h-3.5 text-[#009A44] shrink-0 mt-0.5" />
                          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>
                            <strong>{act.assignee}:</strong> {act.task} <em className={`font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>({act.deadline})</em>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeCase.groundTruth?.piiToRedact?.length > 0 && (
                    <div className={`p-3 border space-y-1 ${
                      isDarkMode ? 'bg-[#141824] border-[#222736]' : 'bg-[#F8F9FB] border-[#CBD5E1]'
                    }`}>
                      <span className="text-[10px] font-mono text-[#6D2077] font-bold block uppercase">
                        Mandatory PII Redaction Targets
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {activeCase.groundTruth.piiToRedact.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs font-mono bg-[#6D2077]/20 text-[#6D2077] border border-[#6D2077]/40">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
