import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Play, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Webhook, 
  FolderDown, 
  RefreshCw, 
  Activity 
} from 'lucide-react';
import NodeActionToolbar from '../common/NodeActionToolbar';
import { processFileForTrigger } from '../../services/triggerEngine';

// Institutional Trigger Taxonomy Configurations
const TRIGGER_TYPE_CONFIG = {
  manual: {
    color: '#00A3A6',
    icon: Play,
    label: 'Manual Start',
    glowColor: 'rgba(0, 163, 166, 0.4)'
  },
  schedule: {
    color: '#0091DA',
    icon: Clock,
    label: 'Schedule / Time',
    glowColor: 'rgba(0, 145, 218, 0.4)'
  },
  webhook: {
    color: '#00A3A6',
    icon: Webhook,
    label: 'Webhook Ingress',
    glowColor: 'rgba(0, 163, 166, 0.4)'
  },
  file: {
    color: '#483698',
    icon: FolderDown,
    label: 'File Watcher',
    glowColor: 'rgba(72, 54, 152, 0.4)'
  },
  poll: {
    color: '#009A44',
    icon: RefreshCw,
    label: 'API Watcher',
    glowColor: 'rgba(0, 154, 68, 0.4)'
  },
  event: {
    color: '#6D2077',
    icon: Activity,
    label: 'A2A Event Bus',
    glowColor: 'rgba(109, 32, 119, 0.4)'
  }
};

function formatCountdown(sec) {
  if (sec == null || sec < 0) return '00:00';
  if (sec < 60) return `00:${sec.toString().padStart(2, '0')}`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

export default function TriggerNode({ id, data, selected }) {
  const isDarkMode = data?.isDarkMode !== false;
  const isDeactivated = Boolean(data?.isDeactivated);
  const isLocked = Boolean(data?.isLocked);
  const triggerType = data?.triggerType || 'manual';
  const typeConfig = TRIGGER_TYPE_CONFIG[triggerType] || TRIGGER_TYPE_CONFIG.manual;
  const TriggerIcon = typeConfig.icon;

  const [isFiring, setIsFiring] = useState(false);
  const [lastStatus, setLastStatus] = useState(data?.lastStatus || 'idle');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [nodeTitle, setNodeTitle] = useState(data?.name || typeConfig.label);
  const [countdown, setCountdown] = useState(null);
  const [isArmed, setIsArmed] = useState(Boolean(data?.config?.isArmed));
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (data?.name && data.name !== nodeTitle) {
      setNodeTitle(data.name);
    }
  }, [data?.name]);

  // Listen for schedule countdown ticks
  useEffect(() => {
    const handleScheduleTick = (e) => {
      if (e.detail?.nodeId === id) {
        setCountdown(e.detail.remainingSeconds);
        setIsArmed(Boolean(e.detail.isArmed));
      }
    };
    window.addEventListener('keaos:schedule-tick', handleScheduleTick);
    return () => window.removeEventListener('keaos:schedule-tick', handleScheduleTick);
  }, [id]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const trimmed = nodeTitle.trim() || typeConfig.label;
    setNodeTitle(trimmed);
    if (data?.onRename) {
      data.onRename(id, trimmed);
    } else if (data?.onUpdateNodeData) {
      data.onUpdateNodeData(id, { name: trimmed });
    }
  };

  const handleFireTrigger = (e, customPayload = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isDeactivated || isFiring) return;

    setIsFiring(true);
    setLastStatus('firing');

    window.dispatchEvent(new CustomEvent('keaos:fire-trigger-node', {
      detail: {
        nodeId: id,
        triggerType,
        payloadText: customPayload || data?.payloadText
      }
    }));

    setTimeout(() => {
      setIsFiring(false);
      setLastStatus('success');
      setTimeout(() => {
        setLastStatus('idle');
      }, 1000);
    }, 450);
  };

  const handleDiscClick = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    // Always open Inspector to inspect/configure
    if (data?.onOpenInspector) {
      data.onOpenInspector(id);
    }

    // For manual start, also fire immediately
    if (triggerType === 'manual') {
      handleFireTrigger(e);
    } else if (triggerType === 'file') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  // Drag and drop for File Watcher
  const handleDragOver = (e) => {
    if (triggerType === 'file') {
      e.preventDefault();
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    if (triggerType === 'file') {
      e.preventDefault();
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e) => {
    if (triggerType !== 'file') return;
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      try {
        const filePayload = await processFileForTrigger(files[0]);
        handleFireTrigger(null, JSON.stringify(filePayload, null, 2));
      } catch (err) {
        console.error('File drop error:', err);
      }
    }
  };

  const handleFileInputChange = async (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      try {
        const filePayload = await processFileForTrigger(files[0]);
        handleFireTrigger(null, JSON.stringify(filePayload, null, 2));
      } catch (err) {
        console.error('File selection error:', err);
      }
    }
  };

  const accentColor = typeConfig.color;

  return (
    <div 
      className="relative group w-[140px] flex flex-col items-center select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for File Trigger */}
      {triggerType === 'file' && (
        <input 
          ref={fileInputRef} 
          type="file" 
          className="hidden" 
          onChange={handleFileInputChange} 
        />
      )}

      {/* Floating Action Toolbar on Hover */}
      <NodeActionToolbar
        nodeId={id}
        nodeName={nodeTitle}
        isDeactivated={isDeactivated}
        isLocked={isLocked}
        onExecute={handleFireTrigger}
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
        className="-top-7 right-3"
        dropdownPlacement="bottom"
      />

      {/* Minimal Single-Line Label Placed Above Disc (Zero Wire Overlap) */}
      <div 
        className="absolute bottom-[calc(100%+8px)] left-0 w-full px-1 text-center pointer-events-auto"
        onClick={(e) => {
          if (data?.onOpenInspector) data.onOpenInspector(id);
        }}
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
            className={`w-full px-1.5 py-0.5 text-[11px] font-semibold text-center rounded-none outline-none border ${
              isDarkMode ? 'bg-[#141B2D] text-white' : 'bg-slate-50 text-slate-900'
            }`}
            style={{ borderColor: accentColor }}
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              if (isLocked) return;
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
            className="cursor-pointer group/title"
            title="Double-click to rename trigger"
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

      {/* 60px Circular Morphing Origin Disc */}
      <div className="relative w-[60px] h-[60px] flex items-center justify-center">
        <button
          type="button"
          onClick={handleDiscClick}
          disabled={isDeactivated || isFiring}
          className={`w-[60px] h-[60px] rounded-full flex items-center justify-center border-2 transition-all duration-150 relative shadow-lg cursor-pointer active:scale-95 ${
            isFiring
              ? 'scale-110 shadow-2xl'
              : lastStatus === 'success'
                ? 'border-[#009A44] bg-[#009A44]/15 ring-2 ring-[#009A44]/30'
                : isDeactivated
                  ? 'opacity-40 grayscale border-dashed border-slate-500 bg-slate-800/50'
                  : isDraggingOver
                    ? 'scale-110 border-dashed animate-pulse ring-4'
                    : isDarkMode
                      ? 'bg-[#0B101D] hover:scale-105'
                      : 'bg-white hover:scale-105'
          } ${
            selected && !isFiring
              ? 'ring-4 ring-[#0091DA]/30'
              : ''
          }`}
          style={{
            borderColor: isFiring ? '#009A44' : isDraggingOver ? '#483698' : selected ? '#0091DA' : accentColor,
            color: accentColor,
            boxShadow: isFiring 
              ? `0 0 28px ${typeConfig.glowColor}` 
              : selected 
                ? `0 0 16px ${typeConfig.glowColor}` 
                : undefined
          }}
          title={triggerType === 'manual' ? 'Click to Fire Manual Trigger' : `Click to configure ${typeConfig.label} in Inspector`}
        >
          {/* Expanding Concentric Sonar Wave when Firing */}
          {isFiring && (
            <>
              <span 
                className="absolute -inset-3 rounded-full animate-ping opacity-60 pointer-events-none" 
                style={{ backgroundColor: accentColor }}
              />
              <span 
                className="absolute -inset-1.5 rounded-full animate-pulse opacity-40 pointer-events-none" 
                style={{ backgroundColor: accentColor }}
              />
            </>
          )}

          {/* Active Schedule Breathing Glow Ring */}
          {triggerType === 'schedule' && isArmed && !isFiring && (
            <span 
              className="absolute -inset-1 rounded-full animate-pulse opacity-30 pointer-events-none"
              style={{ backgroundColor: accentColor }}
            />
          )}

          {/* Core Glyph: Absolute Minimal Precision Icon */}
          {isFiring ? (
            <Zap className="w-5 h-5 text-white animate-bounce" />
          ) : lastStatus === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#009A44]" />
          ) : (
            <TriggerIcon className={`w-5 h-5 transition-transform group-hover:scale-110 ${triggerType === 'manual' ? 'ml-0.5 fill-current' : ''}`} />
          )}
        </button>

        {/* Single Diamond Output Handle (Position.Right) */}
        <Handle
          type="source"
          position={Position.Right}
          id="trigger-out"
          style={{
            top: '50%',
            transform: 'translateY(-50%) rotate(45deg)',
            width: '9px',
            height: '9px',
            borderRadius: '1.5px',
            backgroundColor: accentColor,
            borderColor: isDarkMode ? '#0B101D' : '#FFFFFF',
            borderWidth: '2px',
            right: '-4.5px',
            zIndex: 30
          }}
          className={isFiring ? 'animate-pulse ring-4 ring-[#00A3A6]/80' : ''}
          title="Trigger Output: Connect to Agent Core or Deterministic Box"
        />
      </div>

      {/* Subtle Minimal Countdown Badge Below Disc (Only when schedule is armed) */}
      {triggerType === 'schedule' && isArmed && countdown !== null && (
        <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
          <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#0091DA]/15 text-[#0091DA] border border-[#0091DA]/30 flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0091DA] animate-ping" />
            {formatCountdown(countdown)}
          </span>
        </div>
      )}
    </div>
  );
}
