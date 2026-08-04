import React from 'react'
import type { HelpTopic } from '../modals/HelpModal'
import { NODE_CONFIGS } from '../../constants/nodeConfig'

interface ShapeTooltipProps {
  kind: HelpTopic
  onOpenHelp?: (topic: HelpTopic) => void
}

/** ⓘ 버튼 클릭 시 모달 팝업 오픈 */
export const ShapeTooltip: React.FC<ShapeTooltipProps> = ({ kind, onOpenHelp }) => {
  const config = kind !== 'edge' ? NODE_CONFIGS[kind] : null
  const label = config ? config.label : '흐름선'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (onOpenHelp) onOpenHelp(kind)
      }}
      className="w-5 h-5 rounded-full bg-slate-200 hover:bg-indigo-500 hover:text-white text-slate-500 text-xs font-bold flex items-center justify-center transition-all cursor-pointer hover:scale-110 shadow-xs"
      aria-label={`${label} 상세 설명 창 보기`}
      title={`${label} 상세 설명 보기`}
    >
      ⓘ
    </button>
  )
}
