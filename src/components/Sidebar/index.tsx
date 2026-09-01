import React, { useCallback } from 'react'
import { NodeCard } from './NodeCard'
import { ShapeTooltip } from './ShapeTooltip'
import { NODE_KINDS_ORDER } from '../../constants/nodeConfig'
import type { HelpTopic } from '../modals/HelpModal'

interface SidebarProps {
  onOpenHelp?: (topic: HelpTopic) => void
}

/** 좌측 도형 팔레트 사이드바 */
export const Sidebar: React.FC<SidebarProps> = ({ onOpenHelp }) => {
  const onEdgeDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/flowchart-item-type', 'edge')
    e.dataTransfer.effectAllowed = 'move'

    // 투명 드래그 이미지 설정
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(img, 0, 0)

    ;(window as any).__draggedItemType = 'edge'
  }, [])
  return (
    <aside
      className="flex flex-col gap-1 bg-sidebar w-52 min-w-[13rem] h-full border-r border-slate-200 overflow-y-auto z-10"
      style={{ boxShadow: '2px 0 8px rgba(0,0,0,0.05)' }}
      aria-label="도형 팔레트"
    >
      <div className="px-4 pt-5 pb-2">
        <h2 className="text-sm font-bold text-slate-800">📦 순서도 기호</h2>
      </div>
      <div className="px-2 pb-4 flex flex-col gap-1">
        {NODE_KINDS_ORDER.map(kind => (
          <NodeCard key={kind} kind={kind} onOpenHelp={onOpenHelp} />
        ))}

        {/* 흐름선 카드 (통합 항목) */}
        <div
          draggable
          onDragStart={onEdgeDragStart}
          className="group flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105 hover:shadow-md select-none"
          title="흐름선을 드래그해서 캔버스에 배치하세요"
        >
          <svg width={110} height={36} viewBox="0 0 110 36">
            <defs>
              <marker id="sb-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#64748B" />
              </marker>
            </defs>
            <line x1="6" y1="18" x2="96" y2="18" stroke="#64748B" strokeWidth="2" markerEnd="url(#sb-arrow)" />
            <circle cx="6" cy="18" r="3.5" fill="#3B82F6" />
          </svg>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">
            <div></div>
            <span className="text-xs font-bold text-text-primary leading-tight text-center">흐름선</span>
            <div className="flex justify-start pl-1.5">
              <ShapeTooltip kind="edge" onOpenHelp={onOpenHelp} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto px-4 py-3 border-t border-slate-100">
        <p className="text-[11px] text-text-placeholder leading-relaxed">
          💡 <strong>팁:</strong> 도형을 클릭하면 연결 포트가 나타나요. 포트에서 드래그해서 화살표를 연결해보세요!
        </p>
      </div>
    </aside>
  )
}
