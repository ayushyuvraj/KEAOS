import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
  interactionWidth = 24
}) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (e) => {
    e.stopPropagation();
    if (data?.onDelete) {
      data.onDelete(id);
    } else {
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    }
  };

  const isVisible = isHovered || selected;
  const isDeactivated = !!data?.isDeactivated;
  const isDarkMode = data?.isDarkMode ?? true;

  const defaultStroke = isDeactivated 
    ? (isDarkMode ? '#475569' : '#94A3B8') 
    : (style.stroke || '#0091DA');

  return (
    <>
      {/* Visible Bezier Edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isVisible ? '#EF4444' : defaultStroke,
          strokeWidth: isVisible ? 2.5 : (isDeactivated ? 1.4 : (style.strokeWidth || 1.8)),
          opacity: isVisible ? 1 : (isDeactivated ? 0.35 : (style.opacity ?? 1)),
          strokeDasharray: isDeactivated ? '3 3' : (style.strokeDasharray || '4 4'),
          filter: isVisible ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : undefined,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.15s ease'
        }}
      />

      {/* Invisible wider hit-target along the wire for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={interactionWidth}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Floating Delete Button centered directly over the wire */}
      <EdgeLabelRenderer>
        {isVisible && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-50 animate-in fade-in zoom-in-75 duration-100"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={handleDelete}
              className="w-5 h-5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center shadow-lg border border-white/60 cursor-pointer transition-all hover:scale-125 active:scale-95 group"
              title="Delete connection"
            >
              <X className="w-3 h-3 stroke-[2.5] group-hover:rotate-90 transition-transform duration-150" />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
