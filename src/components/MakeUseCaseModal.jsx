import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, Layers, AlertTriangle } from 'lucide-react';
import { FRAMEWORKS } from '../constants/frameworks';
import { isWorkflowNameTaken, getNextUniqueWorkflowName } from '../utils/workflowStorage';

export default function MakeUseCaseModal({ isOpen, onClose, onCreateUseCase }) {
  const [name, setName] = useState(() => getNextUniqueWorkflowName('Untitled Workflow'));
  const [description, setDescription] = useState('');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('google-adk');
  const [template, setTemplate] = useState('meeting-pilot');

  if (!isOpen) return null;

  const isDuplicate = isWorkflowNameTaken(name.trim());
  const isNameEmpty = !name.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isDuplicate || isNameEmpty) return;
    const frameworkObj = FRAMEWORKS.find(f => f.id === selectedFrameworkId) || FRAMEWORKS[0];
    onCreateUseCase({
      name: name.trim(),
      description,
      framework: frameworkObj,
      template
    });
    onClose();
  };

  const selectedFramework = FRAMEWORKS.find(f => f.id === selectedFrameworkId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001E50]/50 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#CBD5E1] shadow-[0_16px_48px_rgba(0,30,80,0.3)] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#001E50] border-b border-[#00338D] flex items-center justify-between text-white">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0091DA] font-mono">
              Agent Workflow Generator
            </span>
            <h2 className="text-base font-bold text-white mt-0.5 tracking-tight">
              Create Enterprise Use Case
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-tactile w-8 h-8 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#FFFFFF]">
          {/* Use Case Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                Use Case Title
              </label>
              {isDuplicate && (
                <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider">
                  Name already taken
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meeting Intelligence Agent"
              className={`w-full px-3.5 py-2.5 bg-[#FFFFFF] border text-xs focus:outline-none rounded-none transition-colors ${
                isDuplicate 
                  ? 'border-rose-500 bg-rose-50 text-rose-900 focus:border-rose-600 focus:ring-1 focus:ring-rose-500'
                  : 'border-[#CBD5E1] text-[#0B0F19] focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D]'
              }`}
            />
            {isDuplicate && (
              <p className="mt-1 text-[11px] font-mono text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Another workflow already uses this name (case-insensitive).
              </p>
            )}
          </div>

          {/* Framework Dropdown (Clean dropdown without pictures) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] font-mono">
                Agent Orchestration Framework
              </label>
              <span className="text-[10px] text-[#00338D] font-mono font-bold">5 SDKs Supported</span>
            </div>
            <select
              value={selectedFrameworkId}
              onChange={(e) => setSelectedFrameworkId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FFFFFF] border border-[#CBD5E1] text-[#0B0F19] text-xs focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none font-semibold transition-colors"
            >
              {FRAMEWORKS.map((fw) => (
                <option key={fw.id} value={fw.id} className="bg-[#FFFFFF] text-[#0B0F19] py-2">
                  {fw.name} — {fw.subtitle}
                </option>
              ))}
            </select>

            {selectedFramework && (
              <div className="mt-2 p-3 bg-[#E6EDF7] border border-[#00338D]/20 text-xs text-[#333333] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#00338D] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#00338D]">{selectedFramework.name}: </span>
                  <span className="text-[11px] leading-relaxed text-slate-700">{selectedFramework.description}</span>
                  <div className="mt-1 text-[10px] font-mono text-[#00338D] font-bold">
                    Default Model: {selectedFramework.defaultModel} • File Export: {selectedFramework.exportExtension}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] mb-1.5 font-mono">
              Business Goal & Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this agent accomplish?"
              className="w-full px-3.5 py-2 bg-[#FFFFFF] border border-[#CBD5E1] text-[#0B0F19] text-xs focus:outline-none focus:border-[#00338D] focus:ring-1 focus:ring-[#00338D] rounded-none resize-none transition-colors"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.08em] text-[#0B0F19] mb-2 font-mono">
              Initial Workspace Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTemplate('meeting-pilot');
                  setName('Meeting Intelligence Agent');
                  setDescription('Multi-speaker transcript synthesis, action item extraction, and task dispatching.');
                  setSelectedFrameworkId('google-adk');
                }}
                className={`btn-tactile p-3 text-left border rounded-none transition-all ${
                  template === 'meeting-pilot'
                    ? 'border-[#00338D] bg-[#E6EDF7] text-[#0B0F19] shadow-sm'
                    : 'border-[#E0E0E0] bg-[#FFFFFF] text-[#666666] hover:border-[#00338D]'
                }`}
              >
                <div className="font-bold text-xs text-[#0B0F19] flex items-center justify-between">
                  <span>Single Agent Pilot</span>
                  {template === 'meeting-pilot' && <Check className="w-3.5 h-3.5 text-[#00338D]" />}
                </div>
                <p className="text-[10px] text-[#475569] mt-1 leading-snug">
                  Foundation Model, Summarizer, Action Items, Calendar MCP, PII policy & evaluation suite.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplate('outlook-stream-intelligence');
                  setName('Outlook Mail & Attachment Intelligence');
                  setDescription('Continuous MCP stream monitoring (Inbox/Sent/Calendar), zero-trust Gateway filtering, attachment decoding, and discrete tabular extraction.');
                  setSelectedFrameworkId('microsoft-adk');
                }}
                className={`btn-tactile p-3 text-left border rounded-none transition-all ${
                  template === 'outlook-stream-intelligence'
                    ? 'border-[#00A3A6] bg-[#00A3A6]/10 text-[#0B0F19] shadow-sm ring-1 ring-[#00A3A6]'
                    : 'border-[#E0E0E0] bg-[#FFFFFF] text-[#666666] hover:border-[#00A3A6]'
                }`}
              >
                <div className="font-bold text-xs text-[#0B0F19] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00A3A6]" />
                    Outlook Stream & Attachments
                  </span>
                  {template === 'outlook-stream-intelligence' && <Check className="w-3.5 h-3.5 text-[#00A3A6]" />}
                </div>
                <p className="text-[10px] text-[#475569] mt-1 leading-snug">
                  MCP Mail Watcher (Inbox/Sent), zero-trust Gateway permission enforcer, attachment decoding & discrete tabular rows.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplate('multi-agent-triad');
                  setName('Enterprise Triad Multi-Agent Fleet');
                  setDescription('3 Connected Agents: Google Scribe ➔ MS Orchestrator ➔ LangGraph Risk Auditor with A2A DAG channels.');
                }}
                className={`btn-tactile p-3 text-left border rounded-none transition-all ${
                  template === 'multi-agent-triad'
                    ? 'border-[#6366F1] bg-[#EEF2FF] text-[#0B0F19] shadow-sm'
                    : 'border-[#E0E0E0] bg-[#FFFFFF] text-[#666666] hover:border-[#6366F1]'
                }`}
              >
                <div className="font-bold text-xs text-[#1E1B4B] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
                    Triad Multi-Agent
                  </span>
                  {template === 'multi-agent-triad' && <Check className="w-3.5 h-3.5 text-[#6366F1]" />}
                </div>
                <p className="text-[10px] text-[#475569] mt-1 leading-snug">
                  3 Connected Agents: Google Scribe ➔ MS Orchestrator ➔ LangGraph Risk Auditor with A2A DAG channels.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTemplate('blank');
                  setName(getNextUniqueWorkflowName('Untitled Workflow'));
                  setDescription('');
                }}
                className={`btn-tactile p-3 text-left border rounded-none transition-all ${
                  template === 'blank'
                    ? 'border-[#00338D] bg-[#E6EDF7] text-[#0B0F19] shadow-sm'
                    : 'border-[#E0E0E0] bg-[#FFFFFF] text-[#666666] hover:border-[#00338D]'
                }`}
              >
                <div className="font-bold text-xs text-[#0B0F19] flex items-center justify-between">
                  <span>Blank Canvas</span>
                  {template === 'blank' && <Check className="w-3.5 h-3.5 text-[#00338D]" />}
                </div>
                <p className="text-[10px] text-[#475569] mt-1 leading-snug">
                  Starts with an empty Core Agent node for custom modular assembly from scratch.
                </p>
              </button>
            </div>
          </div>

          {/* Form Actions (Sharp 0px CTAs) */}
          <div className="pt-3 border-t border-[#E0E0E0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-tactile px-4 py-2 text-xs font-bold text-[#666666] hover:text-[#0B0F19] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDuplicate || isNameEmpty}
              className={`btn-tactile flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-none transition-all shadow-sm border-b-2 border-[#001E50] ${
                isDuplicate || isNameEmpty
                  ? 'bg-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-[#00338D] hover:bg-[#005EB8]'
              }`}
            >
              <span>Initialize in {selectedFramework?.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
