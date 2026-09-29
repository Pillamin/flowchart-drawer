import React, { memo, useCallback, useState, useRef } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
  useReactFlow,
} from '@xyflow/react'
import { EDGE_STYLE, SELECTED_EDGE_STYLE, SIM_ACTIVE_EDGE_STYLE } from '../../constants/nodeConfig'
import { useFlowStore } from '../../store/flowStore'

// ─── 커스텀 직각 경로 (라운드 코너 포함) ────────────────────────────────────
// ─── 커스텀 직각 경로 (라운드 코너 포함) ────────────────────────────────────
function buildOrthogonalPath(
  sX: number, sY: number,
  tX: number, tY: number,
  midX: number,
  sp: Position,
  tp: Position,
  R = 12,
): [path: string, labelX: number, labelY: number, handleY: number] {
  const OFF = 20
  const rmin = (a: number, b: number) => Math.min(R, Math.abs(a) / 2, Math.abs(b) / 2)
  // 수평 진입(Left/Right 핸들)인지 여부
  const hEntry = tp === Position.Left || tp === Position.Right

  // ─ Right/Left 출구
  if (sp === Position.Right || sp === Position.Left) {
    const d1 = sp === Position.Right ? 1 : -1
    const d2 = tX >= midX ? 1 : -1
    const dy = tY >= sY ? 1 : -1
    const safeMidX = sp === Position.Right
      ? Math.max(midX, sX + OFF)
      : Math.min(midX, sX - OFF)
    const midY = (sY + tY) / 2

    if (hEntry) {
      // H → V → H: 수평으로 직접 tY까지 내려가서 tX로 진입
      const r1 = rmin(safeMidX - sX, tY - sY)
      const r2 = rmin(tY - sY, tX - safeMidX)
      const path = [
        `M ${sX},${sY}`,
        `H ${safeMidX - d1 * r1}`,
        `Q ${safeMidX},${sY} ${safeMidX},${sY + dy * r1}`,
        `V ${tY - dy * r2}`,
        `Q ${safeMidX},${tY} ${safeMidX + d2 * r2},${tY}`,
        `H ${tX}`,
      ].join(' ')
      return [path, safeMidX, midY, midY]
    } else {
      // H → V → H → V: 수평 나간 후 중간 Y에서 껮고 tX로 검친 뒤 수직 진입
      const yMid = (sY + tY) / 2
      const y2 = tY >= sY ? Math.max(yMid, tY - OFF) : Math.min(yMid, tY + OFF)
      const r1 = rmin(safeMidX - sX, y2 - sY)
      const r2 = rmin(y2 - sY, tX - safeMidX)
      const r3 = rmin(tX - safeMidX, tY - y2)
      const path = [
        `M ${sX},${sY}`,
        `H ${safeMidX - d1 * r1}`,
        `Q ${safeMidX},${sY} ${safeMidX},${sY + dy * r1}`,
        `V ${y2 - dy * r2}`,
        `Q ${safeMidX},${y2} ${safeMidX + d2 * r2},${y2}`,
        `H ${tX - d2 * r3}`,
        `Q ${tX},${y2} ${tX},${y2 + r3}`,
        `V ${tY}`,
      ].join(' ')
      return [path, safeMidX, midY, midY]
    }
  }

  // ─ Bottom/Top 출구 (루프백 포함)
  const y1 = sY + OFF
  const d1 = midX >= sX ? 1 : -1
  const d2 = tX >= midX ? 1 : -1
  const r1 = rmin(y1 - sY, midX - sX)

  if (hEntry) {
    // V → bridge → V(tY) → H(tX): 세로 내려가다가 tX로 직진화살표 진입
    const dy = tY >= y1 ? 1 : -1
    const r2 = rmin(midX - sX, tY - y1)
    const r3 = rmin(tY - y1, tX - midX)
    const midY = (y1 + tY) / 2
    const path = [
      `M ${sX},${sY}`,
      `V ${y1 - r1}`,
      `Q ${sX},${y1} ${sX + d1 * r1},${y1}`,
      `H ${midX - d1 * r2}`,
      `Q ${midX},${y1} ${midX},${y1 + dy * r2}`,
      `V ${tY - dy * r3}`,
      `Q ${midX},${tY} ${midX + d2 * r3},${tY}`,
      `H ${tX}`,
    ].join(' ')
    return [path, midX, midY, midY]
  } else {
    // V → bridge → H → V: 수직 진입(Top)
    const y2 = tY - OFF
    const dy = y2 >= y1 ? 1 : -1
    const r2 = rmin(midX - sX, y2 - y1)
    const r3 = rmin(y2 - y1, tX - midX)
    const r4 = rmin(tX - midX, tY - y2)
    const midY = (y1 + y2) / 2
    const path = [
      `M ${sX},${sY}`,
      `V ${y1 - r1}`,
      `Q ${sX},${y1} ${sX + d1 * r1},${y1}`,
      `H ${midX - d1 * r2}`,
      `Q ${midX},${y1} ${midX},${y1 + dy * r2}`,
      `V ${y2 - dy * r3}`,
      `Q ${midX},${y2} ${midX + d2 * r3},${y2}`,
      `H ${tX - d2 * r4}`,
      `Q ${tX},${y2} ${tX},${y2 + r4}`,
      `V ${tY}`,
    ].join(' ')
    return [path, midX, midY, midY]
  }
}

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
  const updateEdgeMidX = useFlowStore(s => s.updateEdgeMidX)
  const sourceNode = useFlowStore(s => s.nodes.find(n => n.id === source))
  const targetNode = useFlowStore(s => s.nodes.find(n => n.id === target))
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const { screenToFlowPosition } = useReactFlow()

  // 드래그 추적 ref
  const isDragging = useRef(false)
  const dragStartScreenX = useRef(0)
  const dragStartMidX = useRef(0)

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

  // midX 저장값 읽기
  const storedMidX = (data as Record<string, unknown>)?.midX as number | null | undefined
  const hasMidX = storedMidX != null

  // 노드 z-index > 엣지 SVG 이므로, 경로 시작/끝을 노드 안으로 살짝 들여 시각적 gap 제거
  const INSET = 4
  const iSX = sp === Position.Right ? sX - INSET : sp === Position.Left  ? sX + INSET : sX
  const iSY = sp === Position.Bottom ? sY - INSET : sp === Position.Top  ? sY + INSET : sY
  const iTX = tp === Position.Right  ? tX - INSET : tp === Position.Left  ? tX + INSET : tX
  const iTY = tp === Position.Bottom ? tY - INSET : tp === Position.Top   ? tY + INSET : tY

  // 경로 계산
  const smoothStepResult = getSmoothStepPath({
    sourceX: iSX, sourceY: iSY, sourcePosition: sp,
    targetX: iTX, targetY: iTY, targetPosition: tp,
  })
  const orthogonalResult = hasMidX
    ? buildOrthogonalPath(iSX, iSY, iTX, iTY, storedMidX!, sp, tp)
    : null


  const edgePath = orthogonalResult ? orthogonalResult[0] : smoothStepResult[0]
  const labelX   = orthogonalResult ? orthogonalResult[1] : smoothStepResult[1]
  const labelY   = orthogonalResult ? orthogonalResult[2] : smoothStepResult[2]
  // 핸들 위치: 삭제 버튼과 겹치지 않도록 +28 오프셋
  // (실제 그려진 선의 X좌표인 labelX를 사용해야 도형 내부로 파고들지 않음)
  const handleX  = labelX
  const handleY  = (hasMidX ? (orthogonalResult![3]) : labelY) + 28

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

  // ─── 세로선 핸들 드래그 (가로 이동만) ────────────────────────────────────────
  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    isDragging.current = true
    dragStartScreenX.current = e.clientX
    dragStartMidX.current = storedMidX ?? (sX + tX) / 2

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const startFlow = screenToFlowPosition({ x: dragStartScreenX.current, y: 0 })
      const curFlow   = screenToFlowPosition({ x: ev.clientX, y: 0 })
      const delta = curFlow.x - startFlow.x
      
      const rawX = dragStartMidX.current + delta
      // 20px(그리드 사이즈) 단위로 스냅해서 선들이 서로 겹칠 수 있게 함
      const snapX = Math.round(rawX / 20) * 20
      updateEdgeMidX(id, snapX)
    }
    const onMouseUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [id, storedMidX, sX, tX, updateEdgeMidX, screenToFlowPosition])

  // 더블클릭 → 기본 경로로 초기화
  const onHandleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    updateEdgeMidX(id, null)
  }, [id, updateEdgeMidX])

  return (
    <>
      <defs>
        <marker id={`arrow-error`} markerWidth="12.5" markerHeight="12.5" viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon strokeLinecap="round" strokeLinejoin="round" points="-5,-4 0,0 -5,4 -5,-4" fill="#EF4444" stroke="#EF4444" strokeWidth="1" />
        </marker>
        <marker id={`arrow-selected`} markerWidth="12.5" markerHeight="12.5" viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon strokeLinecap="round" strokeLinejoin="round" points="-5,-4 0,0 -5,4 -5,-4" fill="#3B82F6" stroke="#3B82F6" strokeWidth="1" />
        </marker>
        <marker id={`arrow-sim-active`} markerWidth="12.5" markerHeight="12.5" viewBox="-10 -10 20 20" refX="0" refY="0" orient="auto-start-reverse">
          <polygon className="marker-sim-active" strokeLinecap="round" strokeLinejoin="round" points="-5,-4 0,0 -5,4 -5,-4" strokeWidth="1" />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={
          isSimActive
            ? 'url(#arrow-sim-active)'
            : isErrorFlashing 
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

        {/* ── 세로선 가로 드래그 핸들 (선택됐을 때만 표시) ── */}
        {!isSimActive && (
          <g
            className={`edge-mid-handle ${selected ? 'visible' : ''}`}
            transform={`translate(${handleX}, ${handleY})`}
            onMouseDown={onHandleMouseDown}
            onDoubleClick={onHandleDoubleClick}
            style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
          >
            {/* 넓은 투명 클릭 영역 */}
            <rect x={-20} y={-16} width={40} height={32} fill="transparent" style={{ pointerEvents: 'all' }} />
            {/* pill 배경 */}
            <rect x={-11} y={-6} width={22} height={12} rx={6} fill="#1E293B" stroke="#94A3B8" strokeWidth={1.5} opacity={0.9} />
            {/* grip 세로선 3개 */}
            <line x1={-5} y1={-3.5} x2={-5} y2={3.5} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
            <line x1={0}  y1={-3.5} x2={0}  y2={3.5} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
            <line x1={5}  y1={-3.5} x2={5}  y2={3.5} stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" />
          </g>
        )}
      </g>

      <EdgeLabelRenderer>
        {/* 1. 판단 노드 전용 예/아니오 라벨 및 팝업 */}
        {isDecisionEdge && (() => {
          // 판단 도형 출구 바로 옆에 붙도록 작은 간격만 유지
          const decLX = sp === Position.Right ? sX + 40
            : sp === Position.Left  ? sX - 40
            : sX   // Bottom/Top: 선 중앙
          const decLY = sp === Position.Bottom ? sY + 14
            : sp === Position.Top   ? sY - 14
            : sY

          // 라벨이 없거나(최초 연결), 팝업이 열려있을 때
          if (label === null || isPopupOpen) {
            return (
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${decLX}px, ${decLY}px)`,
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
                  transform: `translate(-50%, -50%) translate(${decLX}px, ${decLY}px)`,
                  pointerEvents: 'all',
                }}
                className="nodrag nopan select-none cursor-pointer custom-edge-label"
                onClick={(e) => { e.stopPropagation(); setIsPopupOpen(true) }}
                title="클릭하여 라벨 수정"
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-xs border transition-colors whitespace-nowrap ${colorClass}`}>
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
        @keyframes arrowBlink {
          0%, 100% { stroke: #FBBF24; fill: #FBBF24; filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6)); }
          50% { stroke: #D97706; fill: #D97706; filter: none; }
        }
        .marker-sim-active {
          animation: arrowBlink 1.2s ease-in-out infinite;
        }
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
        /* 세로선 핸들: 평소 숨김, selected 시 노출 */
        .edge-mid-handle {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .edge-mid-handle.visible {
          opacity: 1 !important;
        }
      `}</style>
    </>
  )
})

LabeledEdge.displayName = 'LabeledEdge'
