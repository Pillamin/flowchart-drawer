import React, { memo, useCallback, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  MarkerType,
  Position,
  type EdgeProps,
} from '@xyflow/react'
import { EDGE_STYLE, SELECTED_EDGE_STYLE, SIM_ACTIVE_EDGE_STYLE } from '../../constants/nodeConfig'
import { useFlowStore } from '../../store/flowStore'

/** 커스텀 엣지: 깔끔한 화살표선 + 선택 시 작고 빨간 삭제 버튼 표시 */
export const LabeledEdge: React.FC<EdgeProps> = memo(({
  id,
  source, target,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  label,
  selected,
  data,
  markerEnd,
}) => {
  const removeEdge = useFlowStore(s => s.removeEdge)
  const updateEdgeLabel = useFlowStore(s => s.updateEdgeLabel)
  const sourceNode = useFlowStore(s => s.nodes.find(n => n.id === source))
  const targetNode = useFlowStore(s => s.nodes.find(n => n.id === target))
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  let sp = sourcePosition;
  let tp = targetPosition;

  // React Flow의 Handle DOM 측정 오차를 무시하고 앵커 노드의 정확한 정중앙 좌표 사용
  const sX = sourceNode?.type === 'anchor' || sourceNode?.type === 'edge-node' ? sourceNode.position.x + 8 : sourceX;
  const sY = sourceNode?.type === 'anchor' || sourceNode?.type === 'edge-node' ? sourceNode.position.y + 8 : sourceY;
  const tX = targetNode?.type === 'anchor' || targetNode?.type === 'edge-node' ? targetNode.position.x + 8 : targetX;
  const tY = targetNode?.type === 'anchor' || targetNode?.type === 'edge-node' ? targetNode.position.y + 8 : targetY;

  if (sourceNode?.type === 'anchor' || sourceNode?.type === 'edge-node') {
    if (Math.abs(tX - sX) > Math.abs(tY - sY)) {
      sp = tX > sX ? Position.Right : Position.Left;
    } else {
      sp = tY > sY ? Position.Bottom : Position.Top;
    }
  }
  if (targetNode?.type === 'anchor' || targetNode?.type === 'edge-node') {
    if (Math.abs(sX - tX) > Math.abs(sY - tY)) {
      tp = sX > tX ? Position.Right : Position.Left;
    } else {
      tp = sY > tY ? Position.Bottom : Position.Top;
    }
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sX, sourceY: sY, sourcePosition: sp,
    targetX: tX, targetY: tY, targetPosition: tp,
  })

  const isSimActive = (data as Record<string, unknown>)?.isSimActive as boolean | undefined
  const isDecisionEdge = (data as Record<string, unknown>)?.isDecisionEdge as boolean | undefined
  const isErrorFlashing = (data as Record<string, unknown>)?.isErrorFlashing as boolean | undefined

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
      <defs>
        <marker id={`arrow-error`} markerWidth="12.5" markerHeight="12.5" viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon strokeLinecap="round" strokeLinejoin="round" points="-5,-4 0,0 -5,4 -5,-4" fill="#EF4444" stroke="#EF4444" strokeWidth="1" />
        </marker>
        <marker id={`arrow-selected`} markerWidth="12.5" markerHeight="12.5" viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon strokeLinecap="round" strokeLinejoin="round" points="-5,-4 0,0 -5,4 -5,-4" fill="#3B82F6" stroke="#3B82F6" strokeWidth="1" />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={
          isErrorFlashing 
            ? 'url(#arrow-error)'
            : selected
            ? 'url(#arrow-selected)'
            : markerEnd
        }
        interactionWidth={30}
        style={{
          ...style,
          strokeWidth: isErrorFlashing ? 4 : selected ? 3 : style.strokeWidth,
          stroke: isErrorFlashing ? '#EF4444' : selected ? '#3B82F6' : style.stroke,
          filter: isErrorFlashing ? 'drop-shadow(0 0 12px rgba(239,68,68,0.6))' : 'none',
          transition: 'all 0.2s',
          cursor: 'pointer',
        }}
      />
      <g className="edge-hover-effect">
        {/* 흐름선 끝점 시각적 효과 — hover 시 CSS로, selected 시 클래스로 노출 (규칙 2) */}
        <g className={`edge-endpoints ${selected ? 'visible' : ''}`} style={{ transition: 'opacity 0.2s', pointerEvents: 'none' }}>
          <circle cx={sourceX} cy={sourceY} r={8} fill="#334155" stroke="#FFFFFF" strokeWidth={2} />
          <circle cx={sourceX} cy={sourceY} r={3} fill="#FFFFFF" />
          <circle cx={targetX} cy={targetY} r={8} fill="#334155" stroke="#FFFFFF" strokeWidth={2} />
          <circle cx={targetX} cy={targetY} r={3} fill="#FFFFFF" />
        </g>
      </g>

      <EdgeLabelRenderer>
        {/* 1. 판단 노드 전용 예/아니오 라벨 및 팝업 */}
        {isDecisionEdge && (() => {
          // 라벨이 없거나(최초 연결), 팝업이 열려있을 때
          if (label === null || isPopupOpen) {
            return (
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                  pointerEvents: 'all',
                }}
                className="nodrag nopan flex items-center gap-1 bg-white shadow-lg border border-slate-200 rounded-lg p-1.5 z-50"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); updateEdgeLabel(id, '예 (Yes)'); setIsPopupOpen(false) }}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  예
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateEdgeLabel(id, '아니오 (No)'); setIsPopupOpen(false) }}
                  className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                >
                  아니오
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeEdge(id) }}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  title="선 삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            )
          }

          if (label) {
            const labelStr = String(label)
            const isYes = labelStr.includes('참') || labelStr.includes('예')
            const colorClass = isYes
              ? 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100'
              : 'bg-rose-50 border-rose-400 text-rose-800 hover:bg-rose-100'
            return (
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 16}px)`,
                  pointerEvents: 'all',
                }}
                className="nodrag nopan select-none cursor-pointer"
                onClick={(e) => { e.stopPropagation(); setIsPopupOpen(true) }}
                title="클릭하여 라벨 수정"
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-xs border transition-colors ${colorClass}`}>
                  {labelStr}
                </span>
              </div>
            )
          }
          return null
        })()}

        {/* 2. 흐름선을 한 번 클릭하면 나타나는 작고 예쁜 빨간색 삭제 버튼 (팝업이 띄워져 있을 땐 숨김) */}
        {selected && (!isDecisionEdge || (label !== null && !isPopupOpen)) && (
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
        .edge-endpoints {
          opacity: 0;
        }
        .react-flow__edge:hover .edge-endpoints,
        .edge-endpoints.visible {
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
