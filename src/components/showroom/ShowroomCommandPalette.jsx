import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Layers, 
  Palette, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Play, 
  FileCode, 
  Sparkles, 
  ArrowRight,
  Sliders,
  X
} from 'lucide-react';
import { WIDGET_CATALOG, SHOWROOM_ARCHETYPES } from '../../constants/showroomSchema';

export default function ShowroomCommandPalette({
  isOpen,
  onClose,
  screens = [],
  activeScreenId,
  onSelectScreen,
  onAddScreen,
  onAddWidget,
  onSelectArchetype,
  onSelectDevice,
  onLaunchLiveShowroom,
  isDarkMode = true
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Build command list based on search query
  const allCommands = [
    // 1. Widgets
    ...WIDGET_CATALOG.map(w => ({
      id: `widget-${w.type}`,
      category: 'Insert Widget',
      title: `Add ${w.name}`,
      subtitle: w.description,
      icon: Plus,
      action: () => onAddWidget(w)
    })),
    // 2. Screens
    ...screens.map((s, idx) => ({
      id: `screen-${s.id}`,
      category: 'Navigate Screen',
      title: `Go to ${s.title}`,
      subtitle: `Screen #${idx + 1}`,
      icon: Layers,
      action: () => onSelectScreen(s.id)
    })),
    {
      id: 'screen-add-new',
      category: 'Navigate Screen',
      title: 'Add New Screen',
      subtitle: 'Create a new step in the workflow flow',
      icon: Plus,
      action: onAddScreen
    },
    // 3. Archetypes
    ...Object.values(SHOWROOM_ARCHETYPES).map(arc => ({
      id: `archetype-${arc.id}`,
      category: 'Design Archetype DNA',
      title: `Switch to ${arc.name}`,
      subtitle: arc.tagline,
      icon: Palette,
      action: () => onSelectArchetype(arc.id)
    })),
    // 4. Device Frames
    {
      id: 'device-macbook',
      category: 'Hardware Frame',
      title: 'MacBook Pro Frame',
      subtitle: 'Render inside authentic MacBook Pro chassis',
      icon: Monitor,
      action: () => onSelectDevice('macbook')
    },
    {
      id: 'device-iphone',
      category: 'Hardware Frame',
      title: 'iPhone 16 Pro Frame',
      subtitle: 'Render inside iPhone chassis with Dynamic Island',
      icon: Smartphone,
      action: () => onSelectDevice('iphone')
    },
    {
      id: 'device-ipad',
      category: 'Hardware Frame',
      title: 'iPad Pro Frame',
      subtitle: 'Render inside iPad Pro chassis',
      icon: Tablet,
      action: () => onSelectDevice('ipad')
    },
    {
      id: 'device-none',
      category: 'Hardware Frame',
      title: 'Frameless Artboard',
      subtitle: 'Clean flat canvas mode',
      icon: Monitor,
      action: () => onSelectDevice('none')
    },
    // 5. App Actions
    {
      id: 'action-live',
      category: 'Studio Actions',
      title: 'Launch Live Showroom',
      subtitle: 'Run standalone interactive client experience',
      icon: Play,
      action: onLaunchLiveShowroom
    }
  ];

  const filteredCommands = query.trim()
    ? allCommands.filter(c => 
        c.title.toLowerCase().includes(query.toLowerCase()) || 
        c.category.toLowerCase().includes(query.toLowerCase()) ||
        c.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isDarkMode 
            ? 'bg-[#12141C] border-[#2A3040] text-white shadow-[0_20px_60px_rgba(0,0,0,0.8)]' 
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Command Search Input Bar */}
        <div className="h-14 px-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: isDarkMode ? '#222736' : '#E2E8F0' }}>
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, widgets, archetypes, screens (Cmd+K)..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 text-slate-400 bg-white/5">
            ESC
          </kbd>
        </div>

        {/* Command List Scrollport */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const IconComp = cmd.icon || Sparkles;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? isDarkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                      : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg border ${
                      isSelected 
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' 
                        : isDarkMode ? 'border-white/10 bg-white/5 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {cmd.title}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {cmd.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-black/20 text-slate-500 ml-2 shrink-0">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No matching commands or widgets found for "{query}".
            </div>
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="h-9 px-4 border-t flex items-center justify-between text-[10px] font-mono text-slate-500" style={{ borderColor: isDarkMode ? '#222736' : '#E2E8F0' }}>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Linear-Grade Velocity</span>
        </div>
      </div>
    </div>
  );
}
