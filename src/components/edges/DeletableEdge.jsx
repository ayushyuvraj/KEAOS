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

  // Strategic offset: On vertical connections, offset delete badge horizontally (+22px)
  // so hovering the wire never covers socket labels (like 'Brain • Model') or node subtitle text
  const isVertical = Math.abs(sourceX - targetX) < 40;
  const badgeX = isVertical ? labelX + 22 : labelX;
  const badgeY = labelY;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (data?.onDelete) {
      data.onDelete(id);
    } else {
      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    }
  };

  const isVisible = isHovered || selected;

  return (
    <>
      {/* Visible Bezier Edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isVisible ? '#EF4444' : (style.stroke || '#0091DA'),
          strokeWidth: isVisible ? 2.5 : (style.strokeWidth || 1.8),
          filter: isVisible ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : undefined,
          transition: 'stroke 0.15s ease, stroke-width 0.15s ease'
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

      {/* Floating Delete Button strategically offset to never cover text */}
      <EdgeLabelRenderer>
        {isVisible && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${badgeX}px,${badgeY}px)`,
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
