import React, { memo, useState, useRef, useEffect, useCallback } from 'react'
import type { FlowNodeData } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'
import { useFlowStore } from '../../store/flowStore'
import { StandardNodeHandles } from './StandardNodeHandles'

interface BaseNodeProps {
  id: string
  data: FlowNodeData
  selected?: boolean
}

/** 공통 노드 래퍼: 핸들(연결점), 더블클릭 편집, 시뮬레이션 하이라이트를 담당 */
export const BaseNode: React.FC<BaseNodeProps & { children?: React.ReactNode; className?: string; style?: React.CSSProperties }> = memo(({
  id,
  data,
  selected,
  className = '',
  style,
}) => {
  const config = NODE_CONFIGS[data.kind]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const removeNode = useFlowStore(s => s.removeNode)
  const updateNodeLabel = useFlowStore(s => s.updateNodeLabel)

  // 시뮬레이션 하이라이트 상태
  const isActive = data.isSimActive
  const isVisited = data.isSimVisited

  useEffect(() => { setDraft(data.label) }, [data.label])

  const commitEdit = useCallback(() => {
    setEditing(false)
    if (draft.trim() !== data.label) {
      updateNodeLabel(id, draft.trim() || data.label)
    }
  }, [draft, data.label, id, updateNodeLabel])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => {
      inputRef.current?.select()
    }, 0)
  }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false); setDraft(data.label) }
  }, [commitEdit, data.label])

  const borderColor = isActive
    ? '#FBBF24'
    : isVisited
    ? '#10B981'
    : selected
    ? '#3B82F6'
    : config.colors.border

  return (
    <div
      className={`relative flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors duration-150 ${className}`}
      style={{ ...style,
        width: config.width,
        minHeight: config.height,
        background: config.colors.bg,
        border: `2px solid ${borderColor}`,
        boxShadow: selected
          ? `0 0 0 3px ${borderColor}44, 0 4px 12px rgba(0,0,0,0.12)`
          : isActive
          ? '0 0 0 4px #FBBF2466, 0 0 20px #FBBF2433'
          : isHovered
          ? '0 4px 14px rgba(59, 130, 246, 0.18)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        transformOrigin: 'center',
      }}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 표준 공통 연결점 사용 */}
      <StandardNodeHandles isHovered={isHovered} selected={selected} />

      <div className="w-full h-full flex items-center justify-center px-3 py-2">
        <textarea
          ref={inputRef}
          value={editing ? draft : data.label}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={onKeyDown}
          readOnly={!editing}
          tabIndex={editing ? 0 : -1}
          className={`w-full bg-transparent text-center text-sm font-bold resize-none outline-none border-none p-0 m-0 leading-snug overflow-hidden flex items-center justify-center ${
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
        <span className="absolute -top-3 -right-2 text-xs bg-yellow-400 text-yellow-900 font-bold px-1.5 py-0.5 rounded-full shadow">
          ▶
        </span>
      )}
      {isVisited && !isActive && (
        <span className="absolute -top-3 -right-2 text-xs bg-green-400 text-green-900 font-bold px-1.5 py-0.5 rounded-full shadow">
          ✓
        </span>
      )}
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
