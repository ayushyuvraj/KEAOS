import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Power, 
  Trash2, 
  MoreHorizontal, 
  Sliders, 
  Copy, 
  Files, 
  CornerDownLeft 
} from 'lucide-react';

export default function NodeActionToolbar({
  nodeId,
  nodeName,
  isDeactivated = false,
  onExecute,
  onToggleDeactivate,
  onDelete,
  onOpenInspector,
  onDuplicate,
  onCopy,
  isDarkMode = true,
  className = '',
  dropdownPlacement = 'auto' // 'auto' | 'top' | 'bottom' | 'right' | 'left' | 'top-left'
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Strategic dropdown placement to guarantee zero overlap with node body, label text, or handles
  let computedDropdownClass = 'top-full right-0 mt-1.5';
  if (dropdownPlacement === 'top') {
    computedDropdownClass = 'bottom-full right-0 mb-1.5';
  } else if (dropdownPlacement === 'top-left') {
    computedDropdownClass = 'bottom-full left-0 mb-1.5';
  } else if (dropdownPlacement === 'right') {
    computedDropdownClass = 'top-0 left-full ml-2';
  } else if (dropdownPlacement === 'left') {
    computedDropdownClass = 'top-0 right-full mr-2';
  } else if (dropdownPlacement === 'bottom-left') {
    computedDropdownClass = 'top-full left-0 mt-1.5';
  } else if (dropdownPlacement === 'bottom' || dropdownPlacement === 'bottom-right') {
    computedDropdownClass = 'top-full right-0 mt-1.5';
  } else if (dropdownPlacement === 'auto') {
    // If toolbar is placed above the node, open upwards so it never overlaps the node token or label text below!
    if (className.includes('-top')) {
      computedDropdownClass = 'bottom-full right-0 mb-1.5';
    } else {
      computedDropdownClass = 'top-full right-0 mt-1.5';
    }
  }

  return (
    <div 
      className={`absolute z-30 transition-all duration-150 ${
        isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Floating Micro-Toolbar Bar */}
      <div 
        className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border shadow-xl backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-[#1E2028]/95 border-[#383C4A] text-slate-400'
            : 'bg-white/95 border-[#CBD5E1] text-slate-500'
        }`}
      >
        {/* 1. Play / Execute Step */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onExecute) onExecute(nodeId);
          }}
          className={`p-1 rounded-md transition-all ${
            isDarkMode
              ? 'hover:text-[#0091DA] hover:bg-white/10 active:scale-95'
              : 'hover:text-[#005EB8] hover:bg-black/5 active:scale-95'
          }`}
          title="Execute step"
        >
          <Play className="w-3 h-3 fill-current" />
        </button>

        {/* 2. Deactivate / Activate Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleDeactivate) onToggleDeactivate(nodeId);
          }}
          className={`p-1 rounded-md transition-all ${
            isDeactivated
              ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10'
              : isDarkMode
                ? 'hover:text-white hover:bg-white/10 active:scale-95'
                : 'hover:text-black hover:bg-black/5 active:scale-95'
          }`}
          title={isDeactivated ? "Activate node" : "Deactivate node"}
        >
          <Power className="w-3 h-3 stroke-[2.2]" />
        </button>

        {/* 3. Delete Node */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(nodeId);
            }}
            className={`p-1 rounded-md transition-all ${
              isDarkMode
                ? 'hover:text-red-400 hover:bg-red-500/10 active:scale-95'
                : 'hover:text-red-600 hover:bg-red-50 active:scale-95'
            }`}
            title="Delete node (Del)"
          >
            <Trash2 className="w-3 h-3 stroke-[2.2]" />
          </button>
        )}

        {/* 4. More Options (...) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            className={`p-1 rounded-md transition-all ${
              isMenuOpen
                ? isDarkMode ? 'bg-white/15 text-white' : 'bg-black/10 text-black'
                : isDarkMode
                  ? 'hover:text-white hover:bg-white/10 active:scale-95'
                  : 'hover:text-black hover:bg-black/5 active:scale-95'
            }`}
            title="More actions"
          >
            <MoreHorizontal className="w-3 h-3 stroke-[2.5]" />
          </button>

          {/* Contextual Dropdown Menu (Matches Screenshot) */}
          {isMenuOpen && (
            <div 
              className={`absolute ${computedDropdownClass} w-56 rounded-xl border shadow-2xl py-1.5 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 ${
                isDarkMode 
                  ? 'bg-[#1C1E26] border-[#383C4A] text-slate-200' 
                  : 'bg-white border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              {/* Open Inspector */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (onOpenInspector) onOpenInspector(nodeId);
                }}
                className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                  isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Open...</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isDarkMode ? 'bg-[#292D38] text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>↵</span>
              </button>

              {/* Execute Step */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (onExecute) onExecute(nodeId);
                }}
                className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                  isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-slate-400" />
                  <span>Execute step</span>
                </div>
              </button>

              {/* Deactivate / Activate */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                  if (onToggleDeactivate) onToggleDeactivate(nodeId);
                }}
                className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                  isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Power className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isDeactivated ? 'Activate' : 'Deactivate'}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isDarkMode ? 'bg-[#292D38] text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>D</span>
              </button>

              {/* Duplicate */}
              {onDuplicate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDuplicate(nodeId);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Files className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicate</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isDarkMode ? 'bg-[#292D38] text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>Ctrl+D</span>
                </button>
              )}

              {/* Copy */}
              {onCopy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onCopy(nodeId);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isDarkMode ? 'bg-[#292D38] text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>Ctrl+C</span>
                </button>
              )}

              {/* Delete */}
              {onDelete && (
                <>
                  <div className={`my-1 border-t ${isDarkMode ? 'border-[#383C4A]' : 'border-slate-200'}`} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onDelete(nodeId);
                    }}
                    className={`w-full px-3 py-1.5 flex items-center justify-between text-left text-red-500 transition-colors ${
                      isDarkMode ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isDarkMode ? 'bg-[#292D38] text-red-400' : 'bg-red-100 text-red-600'
                    }`}>Del</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
