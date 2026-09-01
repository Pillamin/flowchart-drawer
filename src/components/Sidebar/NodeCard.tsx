import React, { useCallback } from 'react'
import type { NodeKind } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'
import { ShapeTooltip } from './ShapeTooltip'

import type { HelpTopic } from '../modals/HelpModal'

interface NodeCardProps {
  kind: NodeKind
  onOpenHelp?: (topic: HelpTopic) => void
}

const SHAPE_PREVIEW: Record<NodeKind, React.ReactNode> = {
  terminal: (
    <div className="w-20 h-9 rounded-full border-2"
      style={{ background: '#D1FAE5', borderColor: '#10B981' }}>
    </div>
  ),
  io: (
    <svg width={88} height={36} viewBox="0 0 88 36">
      <polygon points="11,2 86,2 77,34 2,34" fill="#FEF08A" stroke="#EAB308" strokeWidth={2} />
    </svg>
  ),
  process: (
    <div className="w-20 h-9 border-2"
      style={{ background: '#BAE6FD', borderColor: '#0EA5E9' }}>
    </div>
  ),
  decision: (
    <svg width={80} height={48} viewBox="0 0 80 48">
      <polygon points="40,2 78,24 40,46 2,24" fill="#E9D5FF" stroke="#A855F7" strokeWidth={2} />
    </svg>
  ),
}

/** 드래그 가능한 도형 카드 */
export const NodeCard: React.FC<NodeCardProps> = ({ kind, onOpenHelp }) => {
  const config = NODE_CONFIGS[kind]

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/flowchart-node-kind', kind)
    e.dataTransfer.effectAllowed = 'move'

    // 기본 HTML5 드래그 이미지 제거 (투명 이미지 사용)
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)

    // Canvas.tsx에서 onDragOver 시점에 참조하기 위해 전역 변수에 종류 저장
    ;(window as any).__draggedKind = kind
    ;(window as any).__draggedItemType = 'node'
  }, [kind])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105 hover:shadow-md select-none"
      title={`${config.label} 드래그해서 캔버스에 배치`}
    >
      <div className="drag-shape-preview flex items-center justify-center">
        {SHAPE_PREVIEW[kind]}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">
        <div></div>
        <span className="text-xs font-bold text-text-primary leading-tight text-center">{config.label}</span>
        <div className="flex justify-start pl-1.5">
          <ShapeTooltip kind={kind} onOpenHelp={onOpenHelp} />
        </div>
      </div>
    </div>
  )
}
