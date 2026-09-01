import React, { memo, useState, useRef, useEffect, useCallback } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'
import { useFlowStore } from '../../store/flowStore'
import { StandardNodeHandles } from './StandardNodeHandles'

/** 입출력 노드 — 평행사변형 (SVG + foreignObject, 핸들 위치 정확히 보정) */
export const IONode: React.FC<NodeProps & { data: FlowNodeData }> = memo(({ id, data, selected }) => {
  const config = NODE_CONFIGS.io
  const W = config.width   // 150
  const H = config.height  // 56
  const SKEW = W * 0.12   // 평행사변형 기울기 px (12%)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const removeNode = useFlowStore(s => s.removeNode)
  const updateNodeLabel = useFlowStore(s => s.updateNodeLabel)

  const isActive = data.isSimActive
  const isVisited = data.isSimVisited

  useEffect(() => { setDraft(data.label) }, [data.label])

  useEffect(() => {
    if ((data as any).isNew) {
      setEditing(true)
      setTimeout(() => { inputRef.current?.select() }, 50)
      if (typeof (data as any).isNew !== 'undefined') {
         delete (data as any).isNew
      }
    }
  }, [data])

  const commitEdit = useCallback(() => {
    setEditing(false)
    if (draft.trim() !== data.label) {
      updateNodeLabel(id, draft.trim() || data.label)
    }
  }, [draft, data.label, id, updateNodeLabel])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 0)
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false); setDraft(data.label) }
  }, [commitEdit, data.label])

  const borderColor = isActive
    ? '#FBBF24'
    : isVisited
    ? '#10B981'
    : selected
    ? '#3B82F6'
    : config.colors.border

  // 핸들 위치를 평행사변형 시각 경계에 맞춰 보정
  // 평행사변형: 상단은 SKEW만큼 오른쪽으로 치우침, 하단은 0
  // top handle: 중앙 = W/2 + SKEW/2 위치
  // bottom handle: 중앙 = W/2 - SKEW/2 위치 (시각적 하단 중앙)
  // left handle: 하단 왼쪽 꼭짓점 (x=0, y=H) → 실제 left edge 중간 = x=SKEW/2
  // right handle: 상단 오른쪽 꼭짓점 (x=W, y=0) → 실제 right edge 중간 = x=W-SKEW/2

  const getFontSizeClass = (text: string) => {
    const lines = text.split('\n')
    const lineCount = lines.length
    const maxLineLen = Math.max(...lines.map(l => l.length), 0)
    const totalLen = text.length

    if (totalLen > 36 || lineCount >= 4 || maxLineLen > 18) return 'text-[11px] leading-tight font-bold'
    if (totalLen > 22 || lineCount >= 3 || maxLineLen > 12) return 'text-[12.5px] leading-tight font-bold'
    if (totalLen > 12 || lineCount >= 2 || maxLineLen > 8) return 'text-[14.5px] leading-tight font-bold'
    if (totalLen > 6) return 'text-[17px] leading-snug font-extrabold'
    return 'text-[20px] sm:text-[21px] leading-snug font-black tracking-tight'
  }

  return (
    <div
      className="relative cursor-grab active:cursor-grabbing"
      style={{ width: W, height: H }}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width={W}
        height={H}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
      >
        <polygon
          points={`${SKEW},0 ${W},0 ${W - SKEW},${H} 0,${H}`}
          fill={config.colors.bg}
          stroke={borderColor}
          strokeWidth={2.5}
          style={{
            filter: selected
              ? `drop-shadow(0 0 0 3px ${borderColor}44) drop-shadow(0 4px 12px rgba(0,0,0,0.12))`
              : isActive
              ? 'drop-shadow(0 0 6px #FBBF2488)'
              : 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))',
            transition: 'all 0.2s',
            transform: selected ? 'scale(1.05)' : isActive ? 'scale(1.04)' : 'scale(1)',
            transformOrigin: 'center',
          }}
        />
      </svg>

      {/* 텍스트 영역 — 단일 textarea 구조로 들뜸 완전 방지 */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ paddingLeft: SKEW, paddingRight: SKEW, paddingTop: 1, paddingBottom: 1 }}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            rows={Math.max(1, draft.split('\n').length)}
            value={draft}
            placeholder={config.placeholder}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onKeyDown}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className={`nodrag nopan w-full bg-transparent text-center font-bold resize-none outline-none border-none p-0 m-0 select-text pointer-events-auto cursor-text ${getFontSizeClass(draft || config.placeholder)}`}
            style={{
              color: config.colors.text,
              fontFamily: '"Nanum Square Round", sans-serif',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
            autoFocus
          />
        ) : (
          <div
            className={`w-full text-center font-bold select-none cursor-grab flex items-center justify-center ${getFontSizeClass(data.label || config.placeholder)} ${!data.label ? 'opacity-50' : ''}`}
            style={{
              color: config.colors.text,
              fontFamily: '"Nanum Square Round", sans-serif',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.label || config.placeholder}
          </div>
        )}
      </div>

      {/* 표준 공통 연결점 사용 (도형 전체의 정중앙에 배치하여 굴곡 없이 직선 연결) */}
      <StandardNodeHandles
        nodeId={id}
        isHovered={isHovered}
        selected={selected}
        offsets={{
          left: { left: `${SKEW / 2}px` },
          right: { right: `${SKEW / 2}px` },
        }}
      />

      {/* 클릭 선택 시 상단에 표시되는 작고 빨간 삭제 버튼 */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeNode(id)
          }}
          className="absolute -top-2.5 -right-2.5 z-20 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-[11px] flex items-center justify-center shadow-md border border-white cursor-pointer transition-all"
          title="도형 삭제"
        >
          ✕
        </button>
      )}

      {/* Sim status badge */}
      {isActive && (
        <span className="absolute -top-3 -right-2 text-xs bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-full shadow" style={{ zIndex: 10 }}>
          ▶
        </span>
      )}
      {isVisited && !isActive && (
        <span className="absolute -top-3 -right-2 text-xs bg-green-400 text-green-900 font-bold px-1.5 py-0.5 rounded-full shadow" style={{ zIndex: 10 }}>
          ✓
        </span>
      )}
    </div>
  )
})
IONode.displayName = 'IONode'
