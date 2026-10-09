import React from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  GripVertical,
  Sliders,
  Sparkles
} from 'lucide-react';
import { WIDGET_CATALOG } from '../../constants/showroomSchema';

export default function ShowroomLayerTree({
  screens = [],
  activeScreenId,
  selectedWidgetId,
  onSelectScreen,
  onSelectWidget,
  onDeleteWidget,
  onDuplicateWidget,
  onToggleWidgetVisibility,
  isDarkMode = true
}) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2 select-none text-xs">
      <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 px-2 py-1">
        Screen & Layer Hierarchy
      </div>

      {screens.map((screen, sIdx) => {
        const isScreenActive = screen.id === activeScreenId;
        const widgets = screen.widgets || [];

        return (
          <div 
            key={screen.id}
            className={`rounded-xl border overflow-hidden transition-all ${
              isScreenActive 
                ? isDarkMode ? 'border-blue-500/40 bg-blue-500/5' : 'border-blue-500/40 bg-blue-50/50'
                : isDarkMode ? 'border-white/5 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'
            }`}
          >
            {/* Screen Header Item */}
            <div 
              onClick={() => onSelectScreen(screen.id)}
              className="px-3 py-2 flex items-center justify-between cursor-pointer group hover:bg-blue-500/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Layers className={`w-3.5 h-3.5 ${isScreenActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className={`font-semibold truncate ${isScreenActive ? 'text-blue-400' : 'text-slate-300'}`}>
                  #{sIdx + 1} {screen.title}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {widgets.length}
              </span>
            </div>

            {/* Nested Widgets Stack */}
            {isScreenActive && (
              <div className="pl-4 pr-1.5 pb-1.5 space-y-1 border-t border-white/5 pt-1">
                {widgets.map((widget, wIdx) => {
                  const isWidgetSelected = widget.id === selectedWidgetId;
                  const isHidden = widget.props?._hidden === true;

                  return (
                    <div
                      key={widget.id}
                      onClick={() => onSelectWidget(widget.id)}
                      className={`group flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isWidgetSelected
                          ? 'bg-blue-600 text-white font-medium'
                          : isDarkMode 
                            ? 'hover:bg-white/10 text-slate-400 hover:text-white' 
                            : 'hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <GripVertical className="w-3 h-3 opacity-40 shrink-0" />
                        <span className="text-[11px] truncate">
                          {widget.props?.title || widget.props?.label || widget.type}
                        </span>
                      </div>

                      {/* Layer Quick Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleWidgetVisibility) onToggleWidgetVisibility(widget.id);
                          }}
                          className="p-1 hover:text-white"
                          title={isHidden ? 'Show Layer' : 'Hide Layer'}
                        >
                          {isHidden ? <EyeOff className="w-2.5 h-2.5 text-slate-500" /> : <Eye className="w-2.5 h-2.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDuplicateWidget) onDuplicateWidget(widget.id, e);
                          }}
                          className="p-1 hover:text-white"
                          title="Duplicate Layer"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteWidget) onDeleteWidget(widget.id, e);
                          }}
                          className="p-1 hover:text-rose-400"
                          title="Delete Layer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
