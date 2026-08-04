import React, { memo, useState, useRef, useCallback, useEffect } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'
import { useFlowStore } from '../../store/flowStore'
import { StandardNodeHandles } from './StandardNodeHandles'

/**
 * 판단 노드 — 마름모 (SVG + foreignObject로 구현)
 * clip-path 대신 SVG를 사용해 정확한 마름모 형태를 제공합니다.
 */
export const DecisionNode: React.FC<NodeProps & { data: FlowNodeData }> = memo(({ id, data, selected }) => {
  const config = NODE_CONFIGS.decision
  const { width, height } = config
  const removeNode = useFlowStore(s => s.removeNode)
  const updateNodeLabel = useFlowStore(s => s.updateNodeLabel)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isActive = data.isSimActive
  const isVisited = data.isSimVisited

  useEffect(() => { setDraft(data.label) }, [data.label])

  const commitEdit = useCallback(() => {
    setEditing(false)
    if (draft.trim() !== data.label) updateNodeLabel(id, draft.trim() || data.label)
  }, [draft, data.label, id, updateNodeLabel])

  const borderColor = isActive ? '#FBBF24' : isVisited ? '#10B981' : selected ? '#3B82F6' : config.colors.border
  const glow = isActive
    ? 'drop-shadow(0 0 8px #FBBF24)'
    : selected
    ? 'drop-shadow(0 0 6px #3B82F6)'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'

  const hw = width / 2
  const hh = height / 2
  const pts = `${hw},0 ${width},${hh} ${hw},${height} 0,${hh}`

  return (
    <div
      style={{ width, height, position: 'relative' }}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={width} height={height} style={{ filter: glow, position: 'absolute', top: 0, left: 0 }}>
        <polygon
          points={pts}
          fill={config.colors.bg}
          stroke={borderColor}
          strokeWidth={2}
          style={{
            transformOrigin: 'center',
            transition: 'all 0.2s',
          }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ top: '25%', left: '20%', width: '60%', height: '50%' }}
      >
        <textarea
          ref={inputRef}
          value={editing ? draft : data.label}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') { setEditing(false); setDraft(data.label) }
          }}
          readOnly={!editing}
          tabIndex={editing ? 0 : -1}
          className={`w-full bg-transparent text-center text-[13px] font-bold resize-none outline-none border-none p-0 m-0 leading-snug overflow-hidden ${
            editing ? 'select-text pointer-events-auto cursor-text' : 'select-none pointer-events-none cursor-grab'
          }`}
          style={{
            color: config.colors.text,
            fontFamily: '"Nanum Square Round", sans-serif',
            height: '1.4em',
            maxHeight: '2.8em',
          }}
        />
      </div>

      {/* 표준 공통 연결점 사용 */}
      <StandardNodeHandles isHovered={isHovered} selected={selected} />

      {/* 클릭 선택 시 상단에 표시되는 작고 빨간 삭제 버튼 */}
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeNode(id)
          }}
          className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-[11px] flex items-center justify-center shadow-md border border-white cursor-pointer transition-all"
          title="도형 삭제"
        >
          ✕
        </button>
      )}

      {isActive && (
        <span style={{ position: 'absolute', top: -12, right: -8, fontSize: 11, background: '#FBBF24', color: '#78350F', fontWeight: 700, padding: '2px 6px', borderRadius: 9999 }}>▶</span>
      )}
      {isVisited && !isActive && (
        <span style={{ position: 'absolute', top: -12, right: -8, fontSize: 11, background: '#4ADE80', color: '#14532D', fontWeight: 700, padding: '2px 6px', borderRadius: 9999 }}>✓</span>
      )}
    </div>
  )
})
DecisionNode.displayName = 'DecisionNode'
