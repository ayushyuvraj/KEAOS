import React, { useState, useEffect, useRef } from 'react';
import { 
  PanelLeft, 
  Sun, 
  Moon,
  Edit3,
  Layers,
  X,
  Lock,
  Unlock
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
  onToggleTheme,
  isWorkflowLocked = false,
  onToggleWorkflowLock
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

        {viewMode === 'unified-audit' || viewMode === 'audit' ? (
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold tracking-widest uppercase ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              AUDIT
            </span>
          </div>
        ) : viewMode === 'observability' ? (
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs font-bold tracking-widest uppercase ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              OBSERVABILITY
            </span>
          </div>
        ) : (
          <div className="relative flex items-center gap-2 text-xs font-medium">
            <button
              onClick={() => setViewMode && setViewMode('home')}
              className={`font-mono text-xs font-bold tracking-widest uppercase cursor-pointer transition-opacity hover:opacity-80 ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
              title="Go to Home Workflows"
            >
              WORKFLOWS
            </button>

            {viewMode !== 'home' && (
              <>
                <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>/</span>
                
                {/* Editable Details / Resources Region */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (isWorkflowLocked) return;
                      setIsEditingDetails(!isEditingDetails);
                    }}
                    className={`group flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${
                      isWorkflowLocked
                        ? 'border-transparent text-slate-300 cursor-default'
                        : isEditingDetails
                          ? 'bg-[#00338D]/20 border-[#0091DA] text-[#0091DA] cursor-pointer'
                          : isDarkMode
                            ? 'border-transparent hover:border-[#383C4A] hover:bg-white/5 text-slate-200 cursor-pointer'
                            : 'border-transparent hover:border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer'
                    }`}
                    title={
                      isWorkflowLocked
                        ? 'Workflow is locked for execution. Unlock to edit specifications.'
                        : 'Click to edit workflow name & description'
                    }
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
                    {isWorkflowLocked ? (
                      <Lock className={`w-3 h-3 shrink-0 ${isDarkMode ? 'text-[#0091DA]' : 'text-[#00338D]'}`} />
                    ) : (
                      <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-[#0091DA] opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                    )}
                  </button>

                  {/* Chic Popover for Editing Name & Description */}
                  {isEditingDetails && !isWorkflowLocked && (
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
              </>
            )}
          </div>
        )}
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

      {/* Center: Quick 1-click Return to Editor when in Global Views (Audit, Observability, Catalog) */}
      {!isWorkflowView && viewMode !== 'home' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center pointer-events-auto z-10">
          <button
            onClick={() => setViewMode && setViewMode('canvas')}
            className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDarkMode
                ? 'bg-[#00338D]/30 hover:bg-[#00338D]/50 text-[#38BDF8] border-[#0091DA]/40 shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-[#00338D] border-blue-200 shadow-xs'
            }`}
            title={`Return to Editor (${activeUseCase?.name || 'Active Workflow'})`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Return to Editor</span>
          </button>
        </div>
      )}

      {/* Right: Workflow Lock Toggle & Clean Minimal Theme Toggle */}
      <div className="flex items-center gap-2.5 ml-auto">
        {isWorkflowView && (
          <label 
            className="relative inline-flex items-center cursor-pointer select-none transition-transform active:scale-95"
            title={
              isWorkflowLocked
                ? 'Workflow is LOCKED (Execution only). Click to unlock canvas editing.'
                : 'Workflow is UNLOCKED (Editing enabled). Click to lock canvas from accidental edits.'
            }
          >
            <input 
              type="checkbox" 
              checked={isWorkflowLocked} 
              onChange={onToggleWorkflowLock} 
              className="sr-only" 
              aria-label={isWorkflowLocked ? 'Unlock workflow' : 'Lock workflow'}
            />
            <div 
              className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner flex items-center ${
                isWorkflowLocked
                  ? isDarkMode
                    ? 'bg-[#00338D] border border-[#0091DA]/60 shadow-[0_0_16px_rgba(0,145,218,0.4)]'
                    : 'bg-[#00338D] border border-[#002B7A] shadow-[0_0_12px_rgba(0,51,141,0.25)]'
                  : isDarkMode
                    ? 'bg-[#1C1F2B] border border-[#33384A]'
                    : 'bg-slate-200 border border-slate-300'
              }`}
            >
              {/* Sliding Thumb Knob */}
              <span 
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ease-out flex items-center justify-center ${
                  isWorkflowLocked ? 'translate-x-7' : 'translate-x-0'
                }`}
              />

              {/* Unlocked Icon (Left) */}
              <svg 
                className={`absolute top-[5px] left-[6px] w-4 h-4 pointer-events-none transition-colors duration-300 z-10 ${
                  !isWorkflowLocked 
                    ? 'fill-slate-900 stroke-slate-900' 
                    : isDarkMode ? 'fill-blue-100/80 stroke-blue-100/80' : 'fill-white/80 stroke-white/80'
                }`} 
                viewBox="0 0 100 100"
              >
                <path d="M50,18A19.9,19.9,0,0,0,30,38v8a8,8,0,0,0-8,8V74a8,8,0,0,0,8,8H70a8,8,0,0,0,8-8V54a8,8,0,0,0-8-8H38V38a12,12,0,0,1,23.6-3,4,4,0,1,0,7.8-2A20.1,20.1,0,0,0,50,18Z" />
              </svg>

              {/* Locked Icon (Right) */}
              <svg 
                className={`absolute top-[5px] right-[6px] w-4 h-4 pointer-events-none transition-colors duration-300 z-10 ${
                  isWorkflowLocked 
                    ? 'fill-[#00338D] stroke-[#00338D]' 
                    : isDarkMode ? 'fill-slate-500 stroke-slate-500' : 'fill-slate-400 stroke-slate-400'
                }`} 
                viewBox="0 0 100 100"
              >
                <path d="M30,46V38a20,20,0,0,1,40,0v8a8,8,0,0,1,8,8V74a8,8,0,0,1-8,8H30a8,8,0,0,1-8-8V54A8,8,0,0,1,30,46Zm32-8v8H38V38a12,12,0,0,1,24,0Z" fillRule="evenodd" />
              </svg>
            </div>
          </label>
        )}

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
