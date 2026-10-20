import React, { useState, useRef, useEffect } from 'react';
import { 
  Power, 
  Trash2, 
  MoreHorizontal, 
  Sliders, 
  Copy, 
  Files, 
  CornerDownLeft,
  Edit3,
  MessageSquare,
  Bot
} from 'lucide-react';

export default function NodeActionToolbar({
  nodeId,
  nodeName,
  isDeactivated = false,
  onOpenChat,
  onExecute,
  onToggleDeactivate,
  onDelete,
  onOpenInspector,
  onDuplicate,
  onCopy,
  onRename,
  onAddDownstreamAgent,
  isDarkMode = true,
  isLocked = false,
  mode = 'custom', // 'circle-right' | 'circle-left' | 'card-top-right' | 'card-top' | 'custom'
  className = '',
  dropdownPlacement = 'auto' // 'auto' | 'top' | 'bottom' | 'right' | 'left' | 'top-left'
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dynamicFlipX, setDynamicFlipX] = useState(false);
  const [dynamicFlipY, setDynamicFlipY] = useState(false);
  const menuRef = useRef(null);
  const toolbarRef = useRef(null);

  // Dynamic boundary collision detection (flips sides if near canvas or screen edge)
  const handleCheckBoundary = () => {
    if (!toolbarRef.current) return;
    try {
      const rect = toolbarRef.current.getBoundingClientRect();
      const vw = window.innerWidth;

      if (mode === 'circle-right' || mode === 'agent-flank') {
        if (rect.right > vw - 60) {
          setDynamicFlipX(true);
        } else {
          setDynamicFlipX(false);
        }
      } else if (mode === 'circle-left') {
        if (rect.left < 60) {
          setDynamicFlipX(true);
        } else {
          setDynamicFlipX(false);
        }
      }

      if (rect.top < 65) {
        setDynamicFlipY(true);
      } else {
        setDynamicFlipY(false);
      }
    } catch (e) {
      // Safe fallback
    }
  };

  // Close dropdown on click outside (capture phase ensures canvas clicks always dismiss it)
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutside, true);
    window.addEventListener('mousedown', handleClickOutside, true);
    window.addEventListener('touchstart', handleClickOutside, true);
    window.addEventListener('click', handleClickOutside, true);

    const handleCustomClose = () => setIsMenuOpen(false);
    window.addEventListener('keaos:close-popups', handleCustomClose);

    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
      window.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('touchstart', handleClickOutside, true);
      window.removeEventListener('click', handleClickOutside, true);
      window.removeEventListener('keaos:close-popups', handleCustomClose);
    };
  }, [isMenuOpen]);

  // Compute dynamic exterior positioning styles guaranteeing ZERO overlap with the node body/circle
  let dynamicStyle = {};
  if (mode === 'circle-right') {
    // 60px circle disc centered in 140px container. Disc ends at x = 100px.
    // 50% = 70px. 70px + 38px = 108px (starts 8px cleanly outside the right perimeter of the circle).
    dynamicStyle = {
      top: '30px',
      transform: 'translateY(-50%)',
      ...(dynamicFlipX 
        ? { right: 'calc(50% + 38px)', left: 'auto' } 
        : { left: 'calc(50% + 38px)', right: 'auto' })
    };
  } else if (mode === 'circle-left') {
    // Starts 8px cleanly outside the left perimeter of the circle.
    dynamicStyle = {
      top: '30px',
      transform: 'translateY(-50%)',
      ...(dynamicFlipX 
        ? { left: 'calc(50% + 38px)', right: 'auto' } 
        : { right: 'calc(50% + 38px)', left: 'auto' })
    };
  } else if (mode === 'agent-flank') {
    // For AgentCoreNode: position on the upper flank outside the chassis.
    // Leaves all 3 TOP PORTS (TOOLS, MODEL, Gateway/MCP (+)) and all 3 BOTTOM PORTS 100% unobstructed.
    dynamicStyle = {
      top: '0px',
      ...(dynamicFlipX 
        ? { right: 'calc(100% + 18px)', left: 'auto' } 
        : { left: 'calc(100% + 18px)', right: 'auto' })
    };
  } else if (mode === 'card-top-right') {
    // For nodes with external titles above the node (RouterNode, ApprovalNode)
    dynamicStyle = dynamicFlipY
      ? { top: 'calc(100% + 10px)', bottom: 'auto', right: '0px' }
      : { bottom: 'calc(100% + 32px)', top: 'auto', right: '0px' };
  } else if (mode === 'card-top') {
    // For cards with internal headers
    dynamicStyle = dynamicFlipY
      ? { top: 'calc(100% + 10px)', bottom: 'auto', right: '8px' }
      : { bottom: 'calc(100% + 10px)', top: 'auto', right: '8px' };
  }

  // Strategic dropdown placement to guarantee zero overlap with node body, label text, or handles
  let computedDropdownClass = 'top-full right-0 mt-1.5';
  if (dropdownPlacement === 'top' || dynamicFlipY) {
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
  } else if (mode === 'circle-right') {
    computedDropdownClass = dynamicFlipX
      ? 'top-full right-0 mt-1.5'
      : 'top-full left-0 mt-1.5';
  } else if (mode === 'circle-left') {
    computedDropdownClass = dynamicFlipX
      ? 'top-full left-0 mt-1.5'
      : 'top-full right-0 mt-1.5';
  } else if (mode === 'agent-flank') {
    computedDropdownClass = dynamicFlipX
      ? 'top-full right-0 mt-1.5'
      : 'top-full left-0 mt-1.5';
  } else if (dropdownPlacement === 'auto') {
    // If toolbar is placed above the node, open upwards so it never overlaps the node token or label text below!
    if (className.includes('-top') || dynamicStyle.bottom) {
      computedDropdownClass = 'bottom-full right-0 mb-1.5';
    } else {
      computedDropdownClass = 'top-full right-0 mt-1.5';
    }
  }

  if (isLocked && !onOpenChat && !onOpenInspector) {
    return null;
  }

  return (
    <div 
      ref={toolbarRef}
      onMouseEnter={handleCheckBoundary}
      onPointerEnter={handleCheckBoundary}
      style={dynamicStyle}
      className={`absolute z-30 transition-all duration-150 before:absolute before:-inset-2 before:content-[''] before:-z-10 ${
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
        {/* 0. Live Chat with Agent */}
        {onOpenChat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat(nodeId);
            }}
            className={`p-1 rounded-md transition-all ${
              isDarkMode
                ? 'hover:text-[#38BDF8] hover:bg-white/10 active:scale-95 text-[#0091DA]'
                : 'hover:text-[#00338D] hover:bg-black/5 active:scale-95 text-[#005EB8]'
            }`}
            title={`Open Live Chat with ${nodeName || 'Agent'}`}
          >
            <MessageSquare className="w-3 h-3" />
          </button>
        )}

        {/* 1. Open Inspector / Configure */}
        {onOpenInspector && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInspector(nodeId);
            }}
            className={`p-1 rounded-md transition-all ${
              isDarkMode
                ? 'hover:text-[#0091DA] hover:bg-white/10 active:scale-95 text-slate-400'
                : 'hover:text-[#005EB8] hover:bg-black/5 active:scale-95 text-slate-500'
            }`}
            title={`Configure & Inspect ${nodeName || 'node'}`}
          >
            <Sliders className="w-3 h-3 stroke-[2.2]" />
          </button>
        )}

        {/* 2. Deactivate / Activate Toggle (hidden when locked) */}
        {!isLocked && (
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
        )}

        {/* 3. Delete Node (hidden when locked) */}
        {!isLocked && onDelete && (
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

        {/* 4. More Options (...) (hidden when locked) */}
        {!isLocked && (
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

              {/* Rename */}
              {onRename && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    // Activate inline editing directly on the canvas token
                    window.dispatchEvent(new CustomEvent('keaos:edit-agent-name', { detail: { agentId: nodeId } }));
                    if (!nodeId.includes('agent')) {
                      const newName = window.prompt(`Rename "${nodeName}":`, nodeName);
                      if (newName && newName.trim() && newName.trim() !== nodeName) {
                        onRename(nodeId, newName.trim());
                      }
                    }
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rename</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isDarkMode ? 'bg-[#292D38] text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>F2</span>
                </button>
              )}

              {/* Add Downstream Agent (A2A) */}
              {onAddDownstreamAgent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onAddDownstreamAgent(nodeId);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Add Downstream Agent</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    isDarkMode ? 'bg-[#292D38] text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                  }`}>A2A</span>
                </button>
              )}


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
      )}
    </div>
  </div>
);
}
