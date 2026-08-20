import React from 'react'
import { StudentInfo } from './StudentInfo'
import { ExportButtons } from './ExportButtons'
import type { LegalType } from '../modals/LegalModal'

interface RightPanelProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  onTemplateClick?: () => void
  onOpenLegalModal: (type: LegalType) => void
}

/** 우측 패널: 학생 정보 + 내보내기 */
export const RightPanel: React.FC<RightPanelProps> = ({ canvasRef, onOpenLegalModal }) => {
  return (
    <aside
      className="flex flex-col gap-4.5 bg-white w-72 min-w-[18rem] h-full border-l border-slate-200/80 overflow-y-auto px-4 py-5 select-none"
      style={{ boxShadow: '-2px 0 12px rgba(0,0,0,0.04)' }}
      aria-label="설정 패널"
    >
      {/* Student Info Card */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
        <StudentInfo />
      </div>

      {/* Export Section Card */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
        <ExportButtons canvasRef={canvasRef} />
      </div>

      {/* Footer & Status */}
      <div className="mt-auto flex flex-col items-center gap-2 pt-3 border-t border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/70 rounded-full text-xs text-emerald-700 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>자동 저장 활성화됨</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <button
            onClick={() => onOpenLegalModal('terms')}
            className="hover:text-slate-700 underline decoration-slate-300 transition-colors"
          >
            이용약관
          </button>
          <span>·</span>
          <button
            onClick={() => onOpenLegalModal('privacy')}
            className="hover:text-slate-700 underline decoration-slate-300 transition-colors"
          >
            개인정보처리방침
          </button>
        </div>
      </div>
    </aside>
  )
}

