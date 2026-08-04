import React, { memo, useCallback } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { EDGE_STYLE, SELECTED_EDGE_STYLE, SIM_ACTIVE_EDGE_STYLE } from '../../constants/nodeConfig'
import { useFlowStore } from '../../store/flowStore'

/** 커스텀 엣지: 깔끔한 화살표선 + 선택 시 작고 빨간 삭제 버튼 표시 */
export const LabeledEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label,
  selected,
  data,
  markerEnd,
}) => {
  const removeEdge = useFlowStore(s => s.removeEdge)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const isSimActive = (data as Record<string, unknown>)?.isSimActive as boolean | undefined
  const isDecisionEdge = (data as Record<string, unknown>)?.isDecisionEdge as boolean | undefined

  const style = isSimActive
    ? SIM_ACTIVE_EDGE_STYLE
    : selected
    ? SELECTED_EDGE_STYLE
    : EDGE_STYLE

  const onRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    removeEdge(id)
  }, [id, removeEdge])

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={30}
        style={{
          ...style,
          strokeWidth: selected ? 3 : style.strokeWidth,
          stroke: selected ? '#3B82F6' : style.stroke,
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
      />
      <g className="edge-hover-effect">
        {/* 흐름선 끝점 시각적 효과 (CSS로 Hover/Select 시에만 노출) */}
        <g className={`edge-endpoints ${selected ? 'visible' : ''}`} style={{ opacity: selected ? 1 : 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
          <circle cx={sourceX} cy={sourceY} r={8} fill="#334155" stroke="#FFFFFF" strokeWidth={2} />
          <circle cx={sourceX} cy={sourceY} r={3} fill="#FFFFFF" />
          <circle cx={targetX} cy={targetY} r={8} fill="#334155" stroke="#FFFFFF" strokeWidth={2} />
          <circle cx={targetX} cy={targetY} r={3} fill="#FFFFFF" />
        </g>
      </g>

      <EdgeLabelRenderer>
        {/* 1. 판단 노드 전용 예/아니오 라벨 */}
        {label && isDecisionEdge && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 16}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan select-none"
          >
            <span className="text-xs font-bold px-2 py-0.5 rounded-full shadow-xs border bg-purple-50 border-purple-300 text-purple-800">
              {String(label)}
            </span>
          </div>
        )}

        {/* 2. 흐름선을 한 번 클릭하면 나타나는 작고 예쁜 빨간색 삭제 버튼 */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-20"
          >
            <button
              onClick={onRemoveClick}
              className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-[11px] flex items-center justify-center shadow-md transition-all cursor-pointer border border-white"
              title="흐름선 삭제"
            >
              ✕
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
      
      <style>{`
        .react-flow__edge:hover .edge-endpoints {
          opacity: 1 !important;
        }
        .react-flow__edge:hover .react-flow__edge-path {
          stroke: #3B82F6;
          stroke-width: 3px;
        }
        .react-flow__edgelabel-renderer {
          z-index: 2000 !important;
        }
        .react-flow__edgeupdater {
          r: 15 !important;
          stroke-width: 30 !important;
          cursor: grab !important;
        }
        .react-flow__edgeupdater:active {
          cursor: grabbing !important;
        }
      `}</style>
    </>
  )
})

LabeledEdge.displayName = 'LabeledEdge'
