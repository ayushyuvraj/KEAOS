import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Play, 
  Eye, 
  EyeOff,
  Edit3, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Palette, 
  Layers, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  UploadCloud, 
  Settings2, 
  Share2, 
  Check, 
  ChevronRight, 
  Sliders, 
  Zap,
  Move,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
  Command,
  Laptop,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Code
} from 'lucide-react';
import { 
  SHOWROOM_ARCHETYPES, 
  WIDGET_CATALOG, 
  createDefaultShowroomApp 
} from '../../constants/showroomSchema';
import { RenderShowroomWidget, ResolveIcon } from './ShowroomWidgets';
import ShowroomRuntime from './ShowroomRuntime';
import DeviceFrame from './DeviceFrame';
import ShowroomCommandPalette from './ShowroomCommandPalette';
import ShowroomLayerTree from './ShowroomLayerTree';
import ShowroomCodeModal from './ShowroomCodeModal';

// Curated Luxury Image Presets
const IMAGE_PRESETS = [
  { name: 'Atelier 3D Art', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Sovereign Architecture', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Cyber Hologram', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Nordic Sanctuary', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80' }
];

export default function ShowroomStudio({
  activeUseCase,
  nodes = [],
  edges = [],
  isDarkMode = true
}) {
  // 1. Showroom App State (initialized from default or activeUseCase)
  const [showroomApp, setShowroomApp] = useState(() => {
    return createDefaultShowroomApp(activeUseCase?.name || 'Institutional Advisory');
  });

  const [activeScreenId, setActiveScreenId] = useState(showroomApp.screens[0]?.id || 'screen-1');
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'
  const [viewport, setViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [deviceFrame, setDeviceFrame] = useState('none'); // 'none' | 'macbook' | 'iphone' | 'ipad'
  const [canvasScale, setCanvasScale] = useState(1); // 0.65 to 1.2
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState('components'); // 'components' | 'layers'
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  // Sidebar visibility toggles to ensure spacious artboard
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Drag-and-drop state
  const [draggingWidgetType, setDraggingWidgetType] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingScreenId, setEditingScreenId] = useState(null);

  const theme = SHOWROOM_ARCHETYPES[showroomApp.archetypeId] || SHOWROOM_ARCHETYPES['boutique-luxury'];
  const activeScreen = showroomApp.screens.find(s => s.id === activeScreenId) || showroomApp.screens[0];
  const selectedWidget = activeScreen?.widgets?.find(w => w.id === selectedWidgetId);
  const artboardScrollRef = useRef(null);

  // Global Cmd+K / Ctrl+K Hotkey Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Screen Management Handlers ---
  const handleAddScreen = () => {
    const screenIndex = showroomApp.screens.length + 1;
    const newScreen = {
      id: `screen-${Date.now()}`,
      title: `Screen ${screenIndex}: Executive Briefing`,
      description: 'Custom client interaction screen.',
      widgets: [
        {
          id: `widget-header-${Date.now()}`,
          type: 'page-header',
          props: {
            title: `Executive Briefing Stage ${screenIndex}`,
            category: 'Autonomous Synthesis',
            actionLabel: '← Previous Screen',
            actionTrigger: activeScreenId
          }
        },
        {
          id: `widget-prompt-${Date.now()}`,
          type: 'prompt-bar',
          props: {
            placeholder: 'Submit specialized query...',
            buttonLabel: 'Execute',
            binding: { triggerWorkflow: true }
          }
        }
      ]
    };

    setShowroomApp(prev => ({
      ...prev,
      screens: [...prev.screens, newScreen]
    }));
    setActiveScreenId(newScreen.id);
    setSelectedWidgetId(null);
    if (artboardScrollRef.current) artboardScrollRef.current.scrollTop = 0;
  };

  const handleDeleteScreen = (screenId, e) => {
    if (e) e.stopPropagation();
    if (showroomApp.screens.length <= 1) return;
    const remaining = showroomApp.screens.filter(s => s.id !== screenId);
    setShowroomApp(prev => ({
      ...prev,
      screens: remaining
    }));
    if (activeScreenId === screenId) {
      setActiveScreenId(remaining[0].id);
    }
  };

  const handleUpdateScreenTitle = (screenId, newTitle) => {
    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => s.id === screenId ? { ...s, title: newTitle } : s)
    }));
  };

  // --- Widget Management Handlers ---
  const handleAddWidget = (template, insertIndex = null) => {
    const newWidget = {
      id: `widget-${template.type}-${Date.now()}`,
      type: template.type,
      props: JSON.parse(JSON.stringify(template.defaultProps))
    };

    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => {
        if (s.id === activeScreenId) {
          const currentWidgets = [...(s.widgets || [])];
          if (insertIndex !== null && insertIndex >= 0) {
            currentWidgets.splice(insertIndex, 0, newWidget);
          } else {
            currentWidgets.push(newWidget);
          }
          return { ...s, widgets: currentWidgets };
        }
        return s;
      })
    }));

    setSelectedWidgetId(newWidget.id);
    setIsInspectorOpen(true);
  };

  const handleDeleteWidget = (widgetId, e) => {
    if (e) e.stopPropagation();
    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => {
        if (s.id === activeScreenId) {
          return {
            ...s,
            widgets: s.widgets.filter(w => w.id !== widgetId)
          };
        }
        return s;
      })
    }));
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
  };

  const handleToggleWidgetVisibility = (widgetId, e) => {
    if (e) e.stopPropagation();
    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => {
        if (s.id === activeScreenId) {
          return {
            ...s,
            widgets: s.widgets.map(w => {
              if (w.id === widgetId) {
                return { ...w, hidden: !w.hidden };
              }
              return w;
            })
          };
        }
        return s;
      })
    }));
  };

  const handleMoveWidget = (widgetId, direction, e) => {
    if (e) e.stopPropagation();
    const widgets = [...(activeScreen.widgets || [])];
    const index = widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = widgets[index - 1];
      widgets[index - 1] = widgets[index];
      widgets[index] = temp;
    } else if (direction === 'down' && index < widgets.length - 1) {
      const temp = widgets[index + 1];
      widgets[index + 1] = widgets[index];
      widgets[index] = temp;
    }

    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => s.id === activeScreenId ? { ...s, widgets } : s)
    }));
  };

  const handleDuplicateWidget = (widgetId, e) => {
    if (e) e.stopPropagation();
    const widget = activeScreen.widgets.find(w => w.id === widgetId);
    if (!widget) return;

    const duplicated = {
      ...widget,
      id: `widget-${widget.type}-${Date.now()}`,
      props: JSON.parse(JSON.stringify(widget.props))
    };

    const widgets = [...activeScreen.widgets];
    const index = widgets.findIndex(w => w.id === widgetId);
    widgets.splice(index + 1, 0, duplicated);

    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => s.id === activeScreenId ? { ...s, widgets } : s)
    }));
    setSelectedWidgetId(duplicated.id);
  };

  const handleUpdateWidgetProp = (key, value) => {
    if (!selectedWidget) return;
    setShowroomApp(prev => ({
      ...prev,
      screens: prev.screens.map(s => {
        if (s.id === activeScreenId) {
          return {
            ...s,
            widgets: s.widgets.map(w => {
              if (w.id === selectedWidget.id) {
                return {
                  ...w,
                  props: { ...w.props, [key]: value }
                };
              }
              return w;
            })
          };
        }
        return s;
      })
    }));
  };

  const handleUpdateWidgetBinding = (key, value) => {
    if (!selectedWidget) return;
    const currentBinding = selectedWidget.props.binding || {};
    handleUpdateWidgetProp('binding', {
      ...currentBinding,
      [key]: value
    });
  };

  // Drag and drop handlers
  const handleDragStartPalette = (e, template) => {
    e.dataTransfer.setData('application/keaos-widget', template.type);
    setDraggingWidgetType(template.type);
  };

  const handleDragOverArtboard = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDropArtboard = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    const widgetType = e.dataTransfer.getData('application/keaos-widget');
    if (widgetType) {
      const template = WIDGET_CATALOG.find(w => w.type === widgetType);
      if (template) {
        handleAddWidget(template, index);
      }
    }
    setDraggingWidgetType(null);
    setDragOverIndex(null);
  };

  // Image file reader for custom image uploads
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleUpdateWidgetProp('imageUrl', event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyShareLink = () => {
    const dummyUrl = `${window.location.origin}/showroom/${showroomApp.slug}`;
    navigator.clipboard.writeText(dummyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Viewport styling
  const viewportWidthClass = 
    viewport === 'mobile' ? 'max-w-[390px]' :
    viewport === 'tablet' ? 'max-w-[768px]' : 'max-w-4xl';

  // If in Preview Mode, render the standalone runtime directly
  if (viewMode === 'preview') {
    return (
      <ShowroomRuntime
        showroomApp={showroomApp}
        activeUseCase={activeUseCase}
        nodes={nodes}
        edges={edges}
        onExitPreview={() => setViewMode('editor')}
      />
    );
  }

  return (
    <div className={`flex-1 h-full flex flex-col select-none overflow-hidden ${
      isDarkMode ? 'bg-[#0D0F14] text-white' : 'bg-[#F4F6F9] text-[#111827]'
    }`}>
      {/* 1. Studio Top Toolbar */}
      <div className={`h-13 px-4 border-b flex items-center justify-between shrink-0 gap-3 ${
        isDarkMode ? 'bg-[#14171F] border-[#252A36]' : 'bg-white border-[#E2E8F0]'
      }`}>
        {/* Left: App Title & Design Archetype Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Toggle Component Drawer Button */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isPaletteOpen
                ? isDarkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-300 text-black'
                : isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-black'
            }`}
            title={isPaletteOpen ? 'Collapse Components' : 'Expand Components'}
          >
            {isPaletteOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider text-blue-500">
              Frontend
            </span>
            <span className="text-slate-500">/</span>
            <input
              type="text"
              value={showroomApp.name}
              onChange={(e) => setShowroomApp(prev => ({ ...prev, name: e.target.value }))}
              className={`text-xs font-semibold px-2 py-1 rounded border bg-transparent focus:outline-none max-w-xs transition-colors ${
                isDarkMode ? 'border-white/10 hover:border-white/25 focus:border-blue-500' : 'border-slate-200 hover:border-slate-300 focus:border-blue-500'
              }`}
              title="Click to rename frontend application"
            />
          </div>

          {/* Archetype Theme Selector */}
          <div className="flex items-center gap-1.5 pl-2.5 border-l border-slate-700/30">
            <Palette className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={showroomApp.archetypeId}
              onChange={(e) => setShowroomApp(prev => ({ ...prev, archetypeId: e.target.value }))}
              className={`text-xs font-medium px-2 py-1 rounded border appearance-none cursor-pointer focus:outline-none transition-colors ${
                isDarkMode ? 'bg-[#1C202B] border-[#2E3545] text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
              title="Select Visual Archetype DNA (Maison Luxury, Obsidian Void, Titanium Linear, Institutional Sovereign, Nordic Sage)"
            >
              {Object.values(SHOWROOM_ARCHETYPES).map(arc => (
                <option key={arc.id} value={arc.id}>
                  DNA: {arc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Search / Cmd+K & Device Chassis Selector */}
        <div className="flex items-center gap-2">
          {/* Linear-Style Cmd+K Spotlight Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 transition-colors ${
              isDarkMode ? 'bg-[#0B0D12] border-[#222735] text-slate-300 hover:border-slate-500' : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-400'
            }`}
            title="Press Cmd+K or Ctrl+K to open Command Palette"
          >
            <Command className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline text-[11px] text-slate-400">Search or Insert...</span>
            <kbd className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${
              isDarkMode ? 'bg-white/10 border-white/20 text-slate-300' : 'bg-white border-slate-300 text-slate-600'
            }`}>⌘K</kbd>
          </button>

          {/* Device Chassis Switcher */}
          <div className={`flex items-center p-0.5 rounded-lg border ${
            isDarkMode ? 'bg-[#0B0D12] border-[#222735]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setDeviceFrame('none')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${deviceFrame === 'none' ? (isDarkMode ? 'bg-[#222735] text-white shadow-xs' : 'bg-white text-black shadow-xs') : 'text-slate-400 hover:text-slate-200'}`}
              title="Clean Frameless Artboard"
            >
              Frameless
            </button>
            <button
              onClick={() => setDeviceFrame('macbook')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${deviceFrame === 'macbook' ? (isDarkMode ? 'bg-[#222735] text-white shadow-xs' : 'bg-white text-black shadow-xs') : 'text-slate-400 hover:text-slate-200'}`}
              title="Apple MacBook Pro Hardware Chassis"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">MacBook</span>
            </button>
            <button
              onClick={() => setDeviceFrame('iphone')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${deviceFrame === 'iphone' ? (isDarkMode ? 'bg-[#222735] text-white shadow-xs' : 'bg-white text-black shadow-xs') : 'text-slate-400 hover:text-slate-200'}`}
              title="Apple iPhone 16 Pro Hardware Chassis"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iPhone</span>
            </button>
            <button
              onClick={() => setDeviceFrame('ipad')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${deviceFrame === 'ipad' ? (isDarkMode ? 'bg-[#222735] text-white shadow-xs' : 'bg-white text-black shadow-xs') : 'text-slate-400 hover:text-slate-200'}`}
              title="Apple iPad Pro Hardware Chassis"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">iPad</span>
            </button>
          </div>

          {/* Canvas Zoom Controls */}
          <div className={`hidden xl:flex items-center p-0.5 rounded-lg border text-xs font-mono ${
            isDarkMode ? 'bg-[#0B0D12] border-[#222735]' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setCanvasScale(prev => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] text-slate-400 min-w-10 text-center">
              {Math.round(canvasScale * 100)}%
            </span>
            <button
              onClick={() => setCanvasScale(prev => Math.min(1.2, Number((prev + 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCanvasScale(1)}
              className="px-1.5 py-0.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors border-l border-slate-700/40"
              title="Reset to 100%"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Code & Embed Export Modal Button */}
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              isDarkMode ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title="Export React Component, Universal iframe, or JSON Schema"
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Code & Embed</span>
          </button>

          <button
            onClick={handleCopyShareLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              isDarkMode ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share URL'}</span>
          </button>

          <button
            onClick={() => setViewMode('preview')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#00338D] hover:bg-[#005EB8] text-white shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Live Showroom</span>
          </button>

          {/* Toggle Inspector Button */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isInspectorOpen
                ? isDarkMode ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-100 border-slate-300 text-black'
                : isDarkMode ? 'border-transparent text-slate-400 hover:text-white' : 'border-transparent text-slate-500 hover:text-black'
            }`}
            title={isInspectorOpen ? 'Collapse Inspector' : 'Expand Inspector'}
          >
            {isInspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Multi-Screen Navigation Bar */}
      <div className={`h-10 px-4 border-b flex items-center justify-between shrink-0 ${
        isDarkMode ? 'bg-[#10131A] border-[#1F2430]' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mr-1">
            Screens:
          </span>
          {showroomApp.screens.map((screen, idx) => {
            const isActive = screen.id === activeScreenId;
            const isEditing = editingScreenId === screen.id;
            return (
              <div 
                key={screen.id}
                onClick={() => {
                  setActiveScreenId(screen.id);
                  if (artboardScrollRef.current) artboardScrollRef.current.scrollTop = 0;
                }}
                className={`group flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border cursor-pointer transition-all ${
                  isActive 
                    ? isDarkMode 
                      ? 'bg-[#1F2433] border-blue-500 text-white shadow-xs' 
                      : 'bg-white border-blue-500 text-blue-700 shadow-xs'
                    : isDarkMode 
                      ? 'border-transparent text-slate-400 hover:text-white hover:bg-white/5' 
                      : 'border-transparent text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <span className="font-mono text-[10px] opacity-60">#{idx + 1}</span>

                {isEditing ? (
                  <input
                    type="text"
                    value={screen.title}
                    autoFocus
                    onBlur={() => setEditingScreenId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingScreenId(null)}
                    onChange={(e) => handleUpdateScreenTitle(screen.id, e.target.value)}
                    className="bg-transparent text-xs outline-none border-b border-blue-500 px-0.5"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span 
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingScreenId(screen.id);
                    }}
                    title="Double-click to rename"
                  >
                    {screen.title}
                  </span>
                )}

                {showroomApp.screens.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteScreen(screen.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity p-0.5"
                    title="Delete Screen"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddScreen}
            className={`px-2 py-0.5 text-xs font-semibold rounded-md border border-dashed flex items-center gap-1 transition-colors ${
              isDarkMode ? 'border-slate-700 hover:border-slate-500 text-slate-400' : 'border-slate-300 hover:border-slate-400 text-slate-600'
            }`}
            title="Add a new screen to flow"
          >
            <Plus className="w-3 h-3" />
            <span>Add Screen</span>
          </button>
        </div>

        <div className="text-[10px] font-mono text-slate-500 hidden md:block">
          {activeScreen?.widgets?.length || 0} widgets attached
        </div>
      </div>

      {/* 3. Main Workspace: Palette (Left) + Artboard (Center) + Inspector (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Component Primitives Catalog Drawer (Collapsible) */}
        {isPaletteOpen && (
          <aside className={`w-64 border-r flex flex-col shrink-0 select-none overflow-hidden transition-all animate-fadeIn ${
            isDarkMode ? 'bg-[#10131A] border-[#1F2430]' : 'bg-white border-slate-200'
          }`}>
            {/* Tab Switcher: Components vs Layers */}
            <div className={`p-2 px-3 border-b flex items-center justify-between shrink-0 ${
              isDarkMode ? 'border-[#1F2430] bg-[#141822]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-1 w-full">
                <button
                  onClick={() => setLeftSidebarTab('components')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    leftSidebarTab === 'components'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-black hover:bg-slate-200/60'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Components</span>
                </button>
                <button
                  onClick={() => setLeftSidebarTab('layers')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    leftSidebarTab === 'layers'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-black hover:bg-slate-200/60'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Layers</span>
                </button>
              </div>
            </div>

            {leftSidebarTab === 'layers' ? (
              <ShowroomLayerTree
                screens={showroomApp.screens}
                activeScreenId={activeScreenId}
                selectedWidgetId={selectedWidgetId}
                onSelectScreen={(screenId) => {
                  setActiveScreenId(screenId);
                  if (artboardScrollRef.current) artboardScrollRef.current.scrollTop = 0;
                }}
                onSelectWidget={(widgetId) => {
                  setSelectedWidgetId(widgetId);
                  setIsInspectorOpen(true);
                }}
                onDeleteWidget={handleDeleteWidget}
                onDuplicateWidget={handleDuplicateWidget}
                onToggleWidgetVisibility={handleToggleWidgetVisibility}
                isDarkMode={isDarkMode}
              />
            ) : (
              <>
                {/* Category Tabs */}
                <div className="p-3 border-b border-slate-700/20">
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 mb-2">
                    Drag or Click to Add
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {['all', 'inputs', 'outputs', 'media'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`py-1 text-[9px] font-mono uppercase rounded capitalize transition-colors ${
                          activeCategory === cat 
                            ? 'bg-blue-600 text-white font-bold' 
                            : isDarkMode ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Component List with Drag support */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  {WIDGET_CATALOG
                    .filter(w => activeCategory === 'all' || w.category === activeCategory)
                    .map(template => (
                      <div
                        key={template.type}
                        draggable={true}
                        onDragStart={(e) => handleDragStartPalette(e, template)}
                        onClick={() => handleAddWidget(template)}
                        className={`p-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] active:scale-[0.99] group ${
                          isDarkMode 
                            ? 'bg-[#151923] border-[#222838] hover:border-blue-500/60' 
                            : 'bg-slate-50 border-slate-200 hover:border-blue-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                            <GripVertical className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                            <span>{template.name}</span>
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/20 text-slate-400">
                            {template.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 pl-4.5">
                          {template.description}
                        </p>
                      </div>
                    ))}
                </div>

                <div className="p-2.5 border-t border-slate-700/20 text-[10px] font-mono text-slate-500 text-center">
                  Drag component onto canvas or click to add.
                </div>
              </>
            )}
          </aside>
        )}

        {/* Center: Live Artboard (Spacious, Scrollable, Cleanly Aligned) */}
        <main 
          ref={artboardScrollRef}
          onClick={() => setSelectedWidgetId(null)}
          onDragOver={(e) => handleDragOverArtboard(e, activeScreen?.widgets?.length || 0)}
          onDrop={(e) => handleDropArtboard(e, activeScreen?.widgets?.length || 0)}
          className={`flex-1 overflow-y-auto px-4 py-8 md:px-8 flex flex-col items-center transition-colors ${
            isDarkMode ? 'bg-[#0B0C10]' : 'bg-[#EDF0F5]'
          }`}
          style={{
            backgroundImage: isDarkMode 
              ? 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)' 
              : 'radial-gradient(rgba(0, 0, 0, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          <DeviceFrame
            device={deviceFrame}
            scale={canvasScale}
            theme={theme}
            isDarkMode={isDarkMode}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`w-full ${viewportWidthClass} transition-all rounded-2xl border shadow-xl p-5 md:p-8 flex flex-col gap-4 my-2`}
              style={{
                backgroundColor: theme.bgApp,
                borderColor: theme.borderCard,
                color: theme.textPrimary,
                fontFamily: theme.fontBody
              }}
            >
              {/* Screen Header in Artboard */}
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: theme.borderCard }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border font-semibold" style={{ borderColor: theme.borderCard, color: theme.textMuted }}>
                    Artboard • {activeScreen?.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono opacity-70" style={{ color: theme.textMuted }}>
                  {theme.name} DNA
                </span>
              </div>

              {/* Render Active Screen Widgets with Control Handles & Drop Insertion Indicators */}
              {activeScreen?.widgets?.length > 0 ? (
                activeScreen.widgets.map((widget, idx) => {
                  const isSelected = selectedWidgetId === widget.id;
                  const isDragOverThis = dragOverIndex === idx;

                  return (
                    <React.Fragment key={widget.id}>
                      {/* Insertion line indicator when dragging over */}
                      {isDragOverThis && (
                        <div className="w-full h-1 bg-blue-500 rounded-full animate-pulse my-1 shadow-[0_0_8px_#3B82F6]" />
                      )}

                      <div 
                        onDragOver={(e) => handleDragOverArtboard(e, idx)}
                        onDrop={(e) => handleDropArtboard(e, idx)}
                        className={`relative group transition-all ${widget.hidden ? 'opacity-35 grayscale' : ''}`}
                      >
                        {widget.hidden && (
                          <div className="absolute top-1 left-2 z-10 px-2 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-300 border border-slate-700 shadow">
                            Layer Hidden (Eye Off)
                          </div>
                        )}

                        {/* Hover Reordering & Action Bar */}
                        <div className="absolute -top-3.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 bg-[#181B24] border border-slate-700 rounded-md px-1.5 py-0.5 shadow-md">
                          <button
                            onClick={(e) => handleMoveWidget(widget.id, 'up', e)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleMoveWidget(widget.id, 'down', e)}
                            disabled={idx === activeScreen.widgets.length - 1}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleToggleWidgetVisibility(widget.id, e)}
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                            title={widget.hidden ? "Show Widget" : "Hide Widget"}
                          >
                            {widget.hidden ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={(e) => handleDuplicateWidget(widget.id, e)}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteWidget(widget.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Widget Render with click selection */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWidgetId(widget.id);
                            setIsInspectorOpen(true);
                          }}
                          className="cursor-pointer"
                        >
                          <RenderShowroomWidget
                            widget={widget}
                            theme={theme}
                            isSelected={isSelected}
                          />
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              ) : (
                <div 
                  onDragOver={(e) => handleDragOverArtboard(e, 0)}
                  onDrop={(e) => handleDropArtboard(e, 0)}
                  className="py-16 text-center border-2 border-dashed rounded-xl cursor-pointer" 
                  style={{ borderColor: theme.borderCard }}
                >
                  <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Screen is empty. Drag a component here from the left palette or click any item to begin.
                  </p>
                </div>
              )}
            </div>
          </DeviceFrame>
        </main>

        {/* Right: Property & Workflow Binding Inspector (Collapsible) */}
        {isInspectorOpen && (
          <aside className={`w-80 border-l flex flex-col shrink-0 select-none overflow-hidden transition-all animate-fadeIn ${
            isDarkMode ? 'bg-[#10131A] border-[#1F2430]' : 'bg-white border-slate-200'
          }`}>
            <div className="h-11 px-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: isDarkMode ? '#1F2430' : '#E2E8F0' }}>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Inspector</span>
              </span>
              <div className="flex items-center gap-2">
                {selectedWidget && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {selectedWidget.type}
                  </span>
                )}
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1 text-slate-500 hover:text-white"
                  title="Close Inspector"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedWidget ? (
                <>
                  {/* 1. Content & Text Props */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 block">
                      Content & Copy
                    </span>

                    {selectedWidget.props.title !== undefined && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Title</label>
                        <input
                          type="text"
                          value={selectedWidget.props.title}
                          onChange={(e) => handleUpdateWidgetProp('title', e.target.value)}
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                            isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-black'
                          }`}
                        />
                      </div>
                    )}

                    {selectedWidget.props.subtitle !== undefined && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Subtitle</label>
                        <textarea
                          rows={2}
                          value={selectedWidget.props.subtitle}
                          onChange={(e) => handleUpdateWidgetProp('subtitle', e.target.value)}
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                            isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-black'
                          }`}
                        />
                      </div>
                    )}

                    {selectedWidget.props.eyebrow !== undefined && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Eyebrow Badge</label>
                        <input
                          type="text"
                          value={selectedWidget.props.eyebrow}
                          onChange={(e) => handleUpdateWidgetProp('eyebrow', e.target.value)}
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                            isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-black'
                          }`}
                        />
                      </div>
                    )}

                    {selectedWidget.props.placeholder !== undefined && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Placeholder</label>
                        <input
                          type="text"
                          value={selectedWidget.props.placeholder}
                          onChange={(e) => handleUpdateWidgetProp('placeholder', e.target.value)}
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                            isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-black'
                          }`}
                        />
                      </div>
                    )}

                    {selectedWidget.props.label !== undefined && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Button Label</label>
                        <input
                          type="text"
                          value={selectedWidget.props.label}
                          onChange={(e) => handleUpdateWidgetProp('label', e.target.value)}
                          className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                            isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-black'
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Media & Asset Controls */}
                  {(selectedWidget.type === 'custom-image' || selectedWidget.type === 'vector-icon-badge') && (
                    <div className="space-y-3 pt-3 border-t border-slate-700/20">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 block">
                        Visual Assets & Presets
                      </span>

                      {selectedWidget.type === 'custom-image' && (
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Choose Luxury Preset</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              {IMAGE_PRESETS.map((p, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleUpdateWidgetProp('imageUrl', p.url)}
                                  className="text-[10px] p-1.5 rounded border text-left truncate transition-colors hover:border-blue-500"
                                  style={{ borderColor: isDarkMode ? '#2B3142' : '#CBD5E1' }}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Image URL</label>
                            <input
                              type="text"
                              value={selectedWidget.props.imageUrl}
                              onChange={(e) => handleUpdateWidgetProp('imageUrl', e.target.value)}
                              className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                                isDarkMode ? 'border-slate-700 text-white' : 'border-slate-300 text-black'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Or Upload Local Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-600 file:text-white cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {selectedWidget.type === 'vector-icon-badge' && (
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Icon Symbol</label>
                          <select
                            value={selectedWidget.props.icon || 'ShieldCheck'}
                            onChange={(e) => handleUpdateWidgetProp('icon', e.target.value)}
                            className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                              isDarkMode ? 'border-slate-700 text-white bg-[#151923]' : 'border-slate-300 text-black bg-white'
                            }`}
                          >
                            <option value="ShieldCheck">ShieldCheck (Security / Provenance)</option>
                            <option value="Cpu">Cpu (Autonomous Reasoning)</option>
                            <option value="Layers">Layers (Multi-Agent Fleet)</option>
                            <option value="Database">Database (Memory / Knowledge)</option>
                            <option value="Lock">Lock (Guardrails / Compliance)</option>
                            <option value="Globe">Globe (Cross-Border Integration)</option>
                            <option value="Zap">Zap (Instant Execution)</option>
                            <option value="Sparkles">Sparkles (AI Intelligence)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Workflow & Screen Navigation Bindings */}
                  <div className="space-y-3 pt-3 border-t border-slate-700/20">
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-500 block flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Engine & Flow Binding</span>
                    </span>

                    {/* Target Screen Navigation */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Navigate to Screen on Execution
                      </label>
                      <select
                        value={selectedWidget.props.binding?.onCompleteNavigateTo || selectedWidget.props.targetScreenId || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          handleUpdateWidgetBinding('onCompleteNavigateTo', val);
                          handleUpdateWidgetProp('targetScreenId', val);
                        }}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                          isDarkMode ? 'border-slate-700 text-white bg-[#151923]' : 'border-slate-300 text-black bg-white'
                        }`}
                      >
                        <option value="">Stay on Current Screen</option>
                        {showroomApp.screens.map(s => (
                          <option key={s.id} value={s.id}>
                            → {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Target Workflow Node */}
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Target Canvas Agent / Node
                      </label>
                      <select
                        value={selectedWidget.props.binding?.targetNodeId || 'agent-core'}
                        onChange={(e) => handleUpdateWidgetBinding('targetNodeId', e.target.value)}
                        className={`w-full text-xs px-2.5 py-1.5 rounded-lg border bg-transparent focus:outline-none ${
                          isDarkMode ? 'border-slate-700 text-white bg-[#151923]' : 'border-slate-300 text-black bg-white'
                        }`}
                      >
                        <option value="agent-core">Central Agent Core</option>
                        {nodes.filter(n => n.type === 'pillar').map(n => (
                          <option key={n.id} value={n.id}>
                            {n.data?.name || n.id} ({n.data?.pillarType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-24 text-center">
                  <Settings2 className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-slate-500">
                    Click any component on the artboard to customize its text, styling, and workflow bindings.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 4. Command Palette Overlay (Cmd+K / Ctrl+K) */}
      <ShowroomCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        screens={showroomApp.screens}
        activeScreenId={activeScreenId}
        onSelectScreen={(screenId) => {
          setActiveScreenId(screenId);
          setIsCommandPaletteOpen(false);
        }}
        onAddScreen={() => {
          handleAddScreen();
          setIsCommandPaletteOpen(false);
        }}
        onAddWidget={(template) => {
          handleAddWidget(template);
          setIsCommandPaletteOpen(false);
        }}
        onSelectArchetype={(archId) => {
          setShowroomApp(prev => ({ ...prev, archetypeId: archId }));
          setIsCommandPaletteOpen(false);
        }}
        onSelectDevice={(device) => {
          setDeviceFrame(device);
          setIsCommandPaletteOpen(false);
        }}
        onLaunchLiveShowroom={() => {
          setViewMode('preview');
          setIsCommandPaletteOpen(false);
        }}
        isDarkMode={isDarkMode}
      />

      {/* 5. Code Export & Embed Modal */}
      <ShowroomCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        showroomApp={showroomApp}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
