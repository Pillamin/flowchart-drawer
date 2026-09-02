import React from 'react'
import { useFlowStore } from '../../store/flowStore'

interface TrashBinProps {
  isOver: boolean
  onClick: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

/** 캔버스 오른쪽 하단에 위치한 휴지통 모양 아이콘 버튼 */
export const TrashBin: React.FC<TrashBinProps> = ({ isOver, onClick, onDragOver, onDragLeave, onDrop }) => {
  const { nodes, edges } = useFlowStore()
  const hasSelection = nodes.some(n => n.selected) || edges.some(e => e.selected)

  return (
    <div
      id="trash-bin-zone"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`absolute bottom-14 right-14 z-10 flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl border-2 transition-all duration-200 cursor-pointer select-none ${
        isOver
          ? 'bg-red-500 border-red-600 text-white scale-115 shadow-red-300 shadow-2xl animate-bounce'
          : hasSelection
          ? 'bg-red-50 border-red-400 text-red-600 hover:bg-red-100 hover:scale-105'
          : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
      }`}
      title={
        hasSelection
          ? '선택한 요소 삭제하기'
          : '도형을 여기로 끌어다 놓거나, 선택 후 클릭하여 삭제하세요'
      }
    >
      <span className="text-2xl leading-none">
        🗑️
      </span>
    </div>
  )
}
