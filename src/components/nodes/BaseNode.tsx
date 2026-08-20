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
  const algorithmSteps = useFlowStore(s => s.algorithmSteps)
  const setHoveredStepId = useFlowStore(s => s.setHoveredStepId)

  // 시뮬레이션 및 알고리즘 하이라이트 상태
  const isActive = data.isSimActive
  const isVisited = data.isSimVisited
  const isAlgoHighlighted = data.isAlgorithmHighlighted

  useEffect(() => { setDraft(data.label) }, [data.label])

  const commitEdit = useCallback(() => {
    setEditing(false)
    if (draft.trim() !== data.label) {
      updateNodeLabel(id, draft.trim() || data.label)
    }
  }, [draft, data.label, id, updateNodeLabel])

  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(data.label) // 더블클릭 시 최신 label 상태 반영
    setEditing(true)
    setTimeout(() => {
      inputRef.current?.select()
    }, 0)
  }, [data.label])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') { setEditing(false); setDraft(data.label) }
  }, [commitEdit, data.label])

  const handleMouseEnter = () => {
    setIsHovered(true)
    const matchingStep = algorithmSteps.find(s => s.nodeId === id)
    if (matchingStep) {
      setHoveredStepId(matchingStep.id)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setHoveredStepId(null)
  }

  const edges = useFlowStore(s => s.edges)
  const isConnectedToSelectedEdge = edges.some(e => e.selected && (e.source === id || e.target === id))

  const borderColor = isAlgoHighlighted
    ? '#2563EB'
    : isActive
    ? '#FBBF24'
    : isVisited
    ? '#10B981'
    : selected
    ? '#3B82F6'
    : config.colors.border

  // 텍스트 길이에 따른 폰트 크기 계산 (더 잘 보이는 스케일 적용)
  const getFontSizeClass = (text: string) => {
    const len = text.length
    if (len > 35) return 'text-[9px] leading-tight'
    if (len > 24) return 'text-[10px] leading-tight'
    if (len > 15) return 'text-[11px] leading-tight'
    if (len > 8) return 'text-xs leading-normal'
    return 'text-sm font-bold'
  }

  return (
    <div
      className={`relative flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150 ${className} ${isConnectedToSelectedEdge ? 'opacity-90' : ''}`}
      style={{ ...style,
        width: config.width,
        minHeight: config.height,
        background: config.colors.bg,
        border: `2px solid ${borderColor}`,
        pointerEvents: isConnectedToSelectedEdge ? 'none' : 'all',
        boxShadow: isAlgoHighlighted
          ? '0 0 0 4px rgba(37, 99, 235, 0.4), 0 0 16px rgba(37, 99, 235, 0.3)'
          : selected
          ? `0 0 0 3px ${borderColor}44, 0 4px 12px rgba(0,0,0,0.12)`
          : isActive
          ? '0 0 0 4px #FBBF2466, 0 0 20px #FBBF2433'
          : isHovered
          ? '0 4px 14px rgba(59, 130, 246, 0.18)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        transformOrigin: 'center',
      }}
      onDoubleClick={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 표준 공통 연결점 사용 */}
      <StandardNodeHandles nodeId={id} isHovered={isHovered} selected={selected} />

      <div className="w-full h-full flex items-center justify-center px-3 py-1 overflow-hidden pointer-events-none">
        {editing ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={onKeyDown}
            className={`w-full bg-transparent text-center font-bold resize-none outline-none border-none p-0 m-0 select-text pointer-events-auto cursor-text ${getFontSizeClass(draft)}`}
            style={{
              color: config.colors.text,
              fontFamily: '"Nanum Square Round", sans-serif',
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
            }}
            autoFocus
          />
        ) : (
          <div
            className={`w-full max-h-full text-center font-bold select-none cursor-grab overflow-hidden line-clamp-3 text-ellipsis ${getFontSizeClass(data.label)}`}
            style={{
              color: config.colors.text,
              fontFamily: '"Nanum Square Round", sans-serif',
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.label}
          </div>
        )}
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
