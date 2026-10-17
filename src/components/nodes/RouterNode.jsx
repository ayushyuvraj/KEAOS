import React, { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitFork, Check, X } from 'lucide-react';
import NodeActionToolbar from '../common/NodeActionToolbar';

export default function RouterNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  const isLocked = Boolean(data?.isLocked);

  const [nodeTitle, setNodeTitle] = useState(data?.name || 'Conditional Router');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    if (data?.name && data.name !== nodeTitle) {
      setNodeTitle(data.name);
    }
  }, [data?.name]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (data?.onRename) {
      data.onRename(id, nodeTitle.trim() || 'Conditional Router');
    }
  };

  const targetField = data?.targetField || 'status';
  const operator = data?.operator || '==';
  const comparisonValue = data?.comparisonValue || 'approved';
  const activeBranch = data?.lastEvaluatedBranch || null; // 'true-out' | 'false-out' | null

  // Format short rule snippet for display
  const ruleSnippet = `${targetField} ${operator} "${comparisonValue}"`;

  const handleNodeClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (data?.onOpenInspector) {
      data.onOpenInspector(id);
    }
  };

  return (
    <div className="relative group select-none">
      {/* Floating Action Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
        onToggleDeactivate={() => data?.onToggleDeactivate && data.onToggleDeactivate(id)}
        onDelete={() => data?.onDelete && data.onDelete(id)}
        onOpenInspector={() => data?.onOpenInspector && data.onOpenInspector(id)}
        onDuplicate={() => data?.onDuplicate && data.onDuplicate(id)}
        onCopy={() => data?.onCopy && data.onCopy(id)}
        onRename={(nodeId, newName) => {
          setNodeTitle(newName);
          if (data?.onRename) data.onRename(nodeId, newName);
        }}
        isDarkMode={isDarkMode}
        className="-top-7 right-2"
        dropdownPlacement="bottom"
      />

      {/* Minimal Label Placed Above Node */}
      <div 
        className="absolute bottom-[calc(100%+6px)] left-0 w-full px-1 text-center pointer-events-auto"
        onClick={handleNodeClick}
      >
        {isEditingTitle ? (
          <input
            type="text"
            value={nodeTitle}
            onChange={(e) => setNodeTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') setIsEditingTitle(false);
            }}
            autoFocus
            className={`w-full px-2 py-0.5 text-[11px] font-semibold text-center rounded-lg outline-none border ${
              isDarkMode ? 'bg-[#141B2D] text-white border-[#0091DA]' : 'bg-slate-50 text-slate-900 border-[#0091DA]'
            }`}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              if (isLocked) return;
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
            className="cursor-pointer"
            title="Double-click to rename router"
          >
            <span className={`text-[11px] font-semibold tracking-tight block truncate ${
              isDeactivated 
                ? 'line-through text-slate-500' 
                : isDarkMode ? 'text-white' : 'text-[#111827]'
            }`}>
              {nodeTitle}
            </span>
          </div>
        )}
      </div>

      {/* Subtle, Soft-Curved Capsule Token (No Sharp Edges) */}
      <div
        onClick={handleNodeClick}
        className={`relative h-[54px] min-w-[170px] max-w-[210px] px-3.5 py-1.5 rounded-2xl flex items-center gap-3 transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
          selected
            ? 'ring-4 ring-[#0091DA]/30 border-2 border-[#0091DA]'
            : 'border border-slate-200/80 dark:border-slate-800/80 hover:border-[#0091DA]/50'
        } ${
          isDeactivated
            ? 'opacity-40 grayscale border-dashed border-slate-500 bg-slate-800/40'
            : isDarkMode
              ? 'bg-[#101422] text-white'
              : 'bg-white text-slate-900 shadow-slate-200/50'
        }`}
      >
        {/* Input Handle (Left) */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{
            top: '50%',
            left: '-6px',
            width: '10px',
            height: '10px',
            borderRadius: '9999px',
            backgroundColor: '#0091DA',
            borderColor: isDarkMode ? '#101422' : '#FFFFFF',
            borderWidth: '2px',
            zIndex: 20
          }}
          title="Input: Connect upstream Agent, Deterministic Box, Ingestion, or Trigger"
        />

        {/* Subtle Icon Glyph */}
        <div className="w-8 h-8 rounded-full bg-[#0091DA]/15 text-[#0091DA] flex items-center justify-center shrink-0">
          <GitFork className="w-4 h-4 rotate-90" />
        </div>

        {/* Center Minimal Information */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0091DA]">
              LOGIC FORK
            </span>
            {activeBranch && (
              <span className={`w-1.5 h-1.5 rounded-full ${
                activeBranch === 'true-out' ? 'bg-[#10B981] animate-pulse' : 'bg-[#0091DA]'
              }`} />
            )}
          </div>
          <p className="text-[10px] font-mono truncate text-slate-400 dark:text-slate-400 mt-0.5" title={ruleSnippet}>
            {ruleSnippet}
          </p>
        </div>

        {/* True Output Handle (Top Right) */}
        <div className="absolute right-0 top-[28%] -translate-y-1/2 flex items-center">
          <Handle
            type="source"
            position={Position.Right}
            id="true-out"
            style={{
              right: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: '#10B981',
              borderColor: isDarkMode ? '#101422' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="True Output: Fires when condition matches"
          />
        </div>

        {/* False Output Handle (Bottom Right) */}
        <div className="absolute right-0 top-[72%] -translate-y-1/2 flex items-center">
          <Handle
            type="source"
            position={Position.Right}
            id="false-out"
            style={{
              right: '-6px',
              width: '10px',
              height: '10px',
              borderRadius: '9999px',
              backgroundColor: '#0091DA',
              borderColor: isDarkMode ? '#101422' : '#FFFFFF',
              borderWidth: '2px',
              zIndex: 20
            }}
            title="False Output: Fires when condition does not match (Default)"
          />
        </div>
      </div>

      {/* Tiny Subtle Port Labels on Right */}
      <div className="absolute -right-11 top-[18%] -translate-y-1/2 text-[9px] font-mono font-bold text-[#10B981] pointer-events-none">
        TRUE
      </div>
      <div className="absolute -right-12 top-[66%] -translate-y-1/2 text-[9px] font-mono font-bold text-[#0091DA] pointer-events-none">
        FALSE
      </div>
    </div>
  );
}
