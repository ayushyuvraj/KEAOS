import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Database, 
  Check, 
  Download,
  Layers,
  Sparkles,
  FileText,
  RotateCcw
} from 'lucide-react';
import { INITIAL_GOLDEN_DATASET } from '../../constants/goldenDataset';

export default function DatasetDrawer({
  isOpen,
  onClose,
  dataset = [],
  onUpdateDataset,
  isDarkMode = true
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(dataset[0]?.id || null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Core Capabilities');
  const [newInput, setNewInput] = useState('');
  const [newExpectedOutput, setNewExpectedOutput] = useState('');

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
              caseName: parts[0]?.trim() || `CSV Case ${idx + 1}`,
              category: parts[1]?.trim() || 'General',
              input: parts[2]?.trim() || '',
              expectedOutput: parts[3]?.trim() || ''
            };
          });
        }

        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((item, idx) => ({
            id: item.id || `tc-${idx + 1}`,
            caseName: item.caseName || item.name || `Test Case ${idx + 1}`,
            category: item.category || 'General',
            input: item.input || item.inputTranscript || item.prompt || '',
            expectedOutput: item.expectedOutput || (
              typeof item.groundTruth === 'string'
                ? item.groundTruth
                : (item.groundTruth ? JSON.stringify(item.groundTruth) : '')
            ),
            groundTruth: item.groundTruth || item.expectedOutput
          }));

          onUpdateDataset(normalized);
          setSelectedCaseId(normalized[0].id);
        } else {
          alert('Uploaded file did not contain an array of test cases.');
        }
      } catch (err) {
        alert(`Failed to parse dataset file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveNewCase = () => {
    if (!newName.trim() || !newInput.trim()) return;

    const newCase = {
      id: `tc-${Date.now().toString().slice(-4)}`,
      caseName: newName.trim(),
      category: newCategory.trim() || 'General',
      input: newInput.trim(),
      expectedOutput: newExpectedOutput.trim(),
      groundTruth: newExpectedOutput.trim()
    };

    const updated = [...dataset, newCase];
    onUpdateDataset(updated);
    setSelectedCaseId(newCase.id);
    setIsAddingNew(false);
    setNewName('');
    setNewInput('');
    setNewExpectedOutput('');
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
              onClick={() => {
                onUpdateDataset(INITIAL_GOLDEN_DATASET);
                setSelectedCaseId(INITIAL_GOLDEN_DATASET[0]?.id || null);
              }}
              className={`px-3 py-1.5 border text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                isDarkMode ? 'border-slate-600 text-slate-300 hover:border-slate-400' : 'border-slate-300 text-slate-700 hover:border-slate-500'
              }`}
              title="Reset dataset fixtures to standard architectural defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Defaults</span>
            </button>
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
          {/* Left Column: Test Case List */}
          <div className={`w-80 border-r flex flex-col shrink-0 ${
            isDarkMode ? 'bg-[#0B0E16] border-[#222736]' : 'bg-[#F8F9FB] border-[#E0E0E0]'
          }`}>
            {/* Action Bar */}
            <div className={`p-3 border-b flex items-center justify-between ${
              isDarkMode ? 'border-[#222736]' : 'border-[#E0E0E0]'
            }`}>
              <span className={`text-xs font-bold uppercase font-mono ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Test Cases ({dataset.length})
              </span>
              <button
                onClick={() => setIsAddingNew(true)}
                className="text-xs font-bold text-[#0091DA] hover:underline flex items-center gap-1 font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Case</span>
              </button>
            </div>

            {/* Test Case List */}
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
                          {cs.category || 'General'}
                        </span>
                      </div>
                      <h5 className={`text-xs font-bold truncate ${
                        isDarkMode ? 'text-white' : 'text-[#0B0F19]'
                      }`}>{cs.caseName || cs.name}</h5>
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
                      placeholder="e.g. Account Reconciliation Verification"
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
                      placeholder="e.g. Compliance / Data Processing"
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
                    Input Payload / Source Context *
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Enter raw input text, prompt payload, query, or data fixture..."
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
                    Expected Ground Truth Target / Deliverable *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Specify the expected output, target criteria, key figures, or structured JSON response..."
                    value={newExpectedOutput}
                    onChange={(e) => setNewExpectedOutput(e.target.value)}
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
                    }`}>{activeCase.caseName || activeCase.name}</h4>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 font-bold rounded ${
                    isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    {activeCase.category || 'General'}
                  </span>
                </div>

                {/* Source Input */}
                <div className="space-y-1.5">
                  <span className={`text-xs font-bold uppercase font-mono block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Input Payload / Source Context
                  </span>
                  <div className={`p-3 text-xs font-mono leading-relaxed border max-h-56 overflow-y-auto whitespace-pre-wrap ${
                    isDarkMode ? 'bg-[#0B0E16] border-[#222736] text-slate-300' : 'bg-[#F8F9FB] border-[#E0E0E0] text-black'
                  }`}>
                    {activeCase.input || activeCase.inputTranscript || 'No input text recorded.'}
                  </div>
                </div>

                {/* Expected Ground Truth Target */}
                <div className="space-y-1.5 pt-2">
                  <span className={`text-xs font-bold uppercase font-mono block ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Expected Ground Truth Target / Deliverable
                  </span>
                  <div className={`p-3 text-xs font-mono leading-relaxed border max-h-56 overflow-y-auto whitespace-pre-wrap ${
                    isDarkMode ? 'bg-[#141824] border-[#222736] text-white' : 'bg-[#F8F9FB] border-[#CBD5E1] text-[#0B0F19]'
                  }`}>
                    {activeCase.expectedOutput || (
                      typeof activeCase.groundTruth === 'string'
                        ? activeCase.groundTruth
                        : JSON.stringify(activeCase.groundTruth, null, 2)
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
