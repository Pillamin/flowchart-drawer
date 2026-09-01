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
  const isErrorFlashing = data.isErrorFlashing

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

  // Textarea 자동 높이 조절
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.style.height = '0px'
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px'
    }
  }, [draft, editing])

  const commitEdit = useCallback(() => {
    setEditing(false)
    if (draft.trim() !== data.label) updateNodeLabel(id, draft.trim() || data.label)
  }, [draft, data.label, id, updateNodeLabel])

  const borderColor = isErrorFlashing ? '#EF4444' : isActive ? '#FBBF24' : isVisited ? '#10B981' : selected ? '#3B82F6' : config.colors.border
  const glow = isErrorFlashing
    ? 'drop-shadow(0 0 12px rgba(239,68,68,0.6))'
    : isActive
    ? 'drop-shadow(0 0 8px #FBBF24)'
    : selected
    ? 'drop-shadow(0 0 6px #3B82F6)'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'

  const hw = width / 2
  const hh = height / 2
  const pts = `${hw},0 ${width},${hh} ${hw},${height} 0,${hh}`

  const getFontSizeClass = (text: string) => {
    const lines = text.split('\n')
    const lineCount = lines.length
    const maxLineLen = Math.max(...lines.map(l => l.length), 0)
    const totalLen = text.length

    if (totalLen > 35 || lineCount >= 5 || maxLineLen > 16) return 'text-[10px] leading-tight font-bold'
    if (totalLen > 22 || lineCount >= 4 || maxLineLen > 11) return 'text-[11.5px] leading-tight font-bold'
    
    // 기본 크기를 두 줄(약 14px)에 맞춤
    return 'text-[14px] leading-tight font-bold'
  }

  return (
    <div
      className="relative cursor-grab active:cursor-grabbing"
      style={{ width, height }}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true); setTimeout(() => inputRef.current?.select(), 0) }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={width} height={height} style={{ filter: glow, position: 'absolute', top: 0, left: 0 }}>
        <polygon
          points={pts}
          fill={config.colors.bg}
          stroke={borderColor}
          strokeWidth={isErrorFlashing ? 4 : 2}
          style={{
            transformOrigin: 'center',
            transition: 'all 0.2s',
          }}
        />
      </svg>
      <div
        className="absolute flex items-center justify-center pointer-events-none overflow-hidden"
        style={{ top: '8%', left: '8%', width: '84%', height: '84%' }}
      >
        {editing ? (
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder={config.placeholder}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitEdit() }
              if (e.key === 'Escape') { setEditing(false); setDraft(data.label) }
            }}
            onMouseDown={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className={`nodrag nopan w-full bg-transparent text-center font-bold resize-none outline-none border-none p-0 m-0 select-text pointer-events-auto cursor-text overflow-hidden ${getFontSizeClass(draft || config.placeholder)}`}
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

      {/* 표준 공통 연결점 사용 */}
      <StandardNodeHandles nodeId={id} isHovered={isHovered} selected={selected} />

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
