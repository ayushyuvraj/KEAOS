import React, { useState, useEffect, useRef } from 'react';
import { 
  PanelLeft, 
  Sun, 
  Moon,
  Edit3,
  X
} from 'lucide-react';

import { FRAMEWORKS } from '../constants/frameworks';

export default function Header({
  viewMode,
  setViewMode,
  activeUseCase,
  onUpdateUseCase,
  onSelectFramework,
  isSidebarClosed = false,
  onToggleSidebarClosed,
  isDarkMode = true,
  onToggleTheme
}) {
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState(activeUseCase?.name || '');
  const [editDesc, setEditDesc] = useState(activeUseCase?.description || '');
  const [editFwId, setEditFwId] = useState(activeUseCase?.framework?.id || 'google-adk');
  const editPopoverRef = useRef(null);

  useEffect(() => {
    setEditName(activeUseCase?.name || '');
    setEditDesc(activeUseCase?.description || '');
    setEditFwId(activeUseCase?.framework?.id || 'google-adk');
  }, [activeUseCase?.name, activeUseCase?.description, activeUseCase?.framework?.id]);

  useEffect(() => {
    if (!isEditingDetails) return;
    const handleClickOutside = (e) => {
      if (editPopoverRef.current && !editPopoverRef.current.contains(e.target)) {
        setIsEditingDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditingDetails]);

  const handleSaveDetails = (e) => {
    e?.preventDefault();
    const chosenFw = FRAMEWORKS.find(f => f.id === editFwId) || activeUseCase?.framework;
    if (onUpdateUseCase) {
      onUpdateUseCase({
        name: editName.trim() || 'Untitled Workflow',
        description: editDesc.trim(),
        framework: chosenFw
      });
    }
    setIsEditingDetails(false);
  };

  const tabs = [
    { id: 'canvas', label: 'Editor' },
    { id: 'evaluation', label: 'Evaluations' },
    { id: 'frontend', label: 'Executions' },
    { id: 'code', label: 'Export Code' }
  ];

  const isWorkflowView = ['canvas', 'evaluation', 'frontend', 'code'].includes(viewMode);

  return (
    <header className={`relative h-12 px-5 flex items-center justify-between shrink-0 z-20 select-none border-b transition-colors ${
      isDarkMode 
        ? 'bg-[#18191E] border-[#2B2D36] text-white' 
        : 'bg-white border-[#E5E7EB] text-[#111827]'
    }`}>
      {/* Left: Minimal Breadcrumb & Framework Target Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebarClosed}
          className={`p-1.5 rounded-lg border transition-colors ${
            isSidebarClosed 
              ? 'bg-[#0091DA]/20 border-[#0091DA] text-[#0091DA]' 
              : isDarkMode
                ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/10'
                : 'border-transparent text-slate-500 hover:text-black hover:bg-black/5'
          }`}
          title={isSidebarClosed ? 'Open Left Panel' : 'Hide Left Panel'}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="relative flex items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setViewMode && setViewMode('home')}
            className={`font-mono text-[11px] hover:underline cursor-pointer transition-colors ${
              isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
            }`}
            title="Go to Home Workflows"
          >
            Workflow
          </button>
          <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>/</span>
          
          {/* Editable Details / Resources Region */}
          <div className="relative">
            <button
              onClick={() => setIsEditingDetails(!isEditingDetails)}
              className={`group flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all cursor-pointer ${
                isEditingDetails
                  ? 'bg-[#00338D]/20 border-[#0091DA] text-[#0091DA]'
                  : isDarkMode
                    ? 'border-transparent hover:border-[#383C4A] hover:bg-white/5 text-slate-200'
                    : 'border-transparent hover:border-slate-300 hover:bg-slate-100 text-slate-800'
              }`}
              title="Click to edit workflow name & description"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold tracking-tight text-xs max-w-[200px] truncate">
                  {activeUseCase?.name || 'Untitled Workflow'}
                </span>
                {activeUseCase?.description && (
                  <span className="text-[10px] text-slate-400 font-normal max-w-[200px] truncate leading-tight">
                    {activeUseCase.description}
                  </span>
                )}
              </div>
              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-[#0091DA] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>

            {/* Chic Popover for Editing Name & Description */}
            {isEditingDetails && (
              <div
                ref={editPopoverRef}
                className={`absolute top-full left-0 mt-2 w-80 p-4 rounded-none border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  isDarkMode 
                    ? 'bg-[#18191E] border-[#2E313C] text-white' 
                    : 'bg-white border-[#CBD5E1] text-[#0B0F19]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-700/30">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0091DA]">
                    Workflow Specifications
                  </span>
                  <button 
                    onClick={() => setIsEditingDetails(false)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleSaveDetails} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Meeting Intelligence Agent"
                      className={`w-full px-2.5 py-1.5 text-xs rounded-none border outline-none font-semibold ${
                        isDarkMode 
                          ? 'bg-[#121317] border-[#2E313C] text-white focus:border-[#0091DA]' 
                          : 'bg-white border-[#CBD5E1] text-black focus:border-[#00338D]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Add an executive description for this workflow..."
                      className={`w-full px-2.5 py-1.5 text-xs rounded-none border outline-none ${
                        isDarkMode 
                          ? 'bg-[#121317] border-[#2E313C] text-slate-200 focus:border-[#0091DA]' 
                          : 'bg-white border-[#CBD5E1] text-black focus:border-[#00338D]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                      Primary Framework
                    </label>
                    <select
                      value={editFwId}
                      onChange={(e) => setEditFwId(e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs rounded-none border outline-none font-mono ${
                        isDarkMode 
                          ? 'bg-[#121317] border-[#2E313C] text-white focus:border-[#0091DA]' 
                          : 'bg-white border-[#CBD5E1] text-black focus:border-[#00338D]'
                      }`}
                    >
                      {FRAMEWORKS.map((fw) => (
                        <option key={fw.id} value={fw.id}>
                          {fw.name} ({fw.subtitle})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetails(false)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold bg-[#00338D] hover:bg-[#005EB8] text-white rounded-none border border-[#0091DA]/50 shadow-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Exactly Centered Segmented Pill View Switcher (Only visible when inside a workflow workspace) */}
      {isWorkflowView && (
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center p-0.5 rounded-xl border pointer-events-auto z-10 ${
          isDarkMode ? 'bg-[#121316] border-[#2E313B]' : 'bg-gray-100 border-gray-200'
        }`}>
          {tabs.map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode && setViewMode(tab.id)}
                className={`px-3.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? isDarkMode 
                      ? 'bg-[#292C36] text-white shadow-sm' 
                      : 'bg-white text-black shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Right: Clean & Minimal Theme Toggle */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onToggleTheme}
          className={`p-1.5 rounded-lg border border-transparent transition-colors ${
            isDarkMode 
              ? 'text-slate-400 hover:text-white hover:bg-white/10' 
              : 'text-slate-500 hover:text-black hover:bg-black/5'
          }`}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>
    </header>
  );
}
