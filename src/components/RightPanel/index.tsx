import React from 'react'
import { StudentInfo } from './StudentInfo'
import { ExportButtons } from './ExportButtons'
import { Button } from '../ui/Button'
import type { LegalType } from '../modals/LegalModal'

interface RightPanelProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  onTemplateClick: () => void
  onOpenLegalModal: (type: LegalType) => void
}

/** 우측 패널: 학생 정보 + 내보내기 + 템플릿 */
export const RightPanel: React.FC<RightPanelProps> = ({ canvasRef, onTemplateClick, onOpenLegalModal }) => {
  return (
    <aside
      className="flex flex-col gap-5 bg-white w-52 min-w-[13rem] h-full border-l border-slate-100 overflow-y-auto px-4 py-5"
      style={{ boxShadow: '-2px 0 8px rgba(0,0,0,0.04)' }}
      aria-label="설정 패널"
    >
      <StudentInfo />

      <div className="h-px bg-slate-100" />

      <ExportButtons canvasRef={canvasRef} />

      <div className="h-px bg-slate-100" />

      {/* Template */}
      <section aria-label="예시 불러오기">
        <h3 className="text-xs font-bold text-text-placeholder uppercase tracking-wide mb-2">예시 템플릿</h3>
        <Button
          id="btn-template"
          variant="secondary"
          size="sm"
          fullWidth
          onClick={onTemplateClick}
          icon={<span>📂</span>}
        >
          예시 불러오기
        </Button>
        <p className="text-[11px] text-text-placeholder mt-2 leading-relaxed">
          ⚠️ 현재 작업이 덮어씌워져요.
        </p>
      </section>

      <div className="mt-auto flex flex-col items-center gap-1.5 pt-3 border-t border-slate-100">
        <div className="text-[10px] text-slate-300 text-center leading-relaxed">
          💾 자동 저장 중 · 새로고침 후에도 복원돼요
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <button
            onClick={() => onOpenLegalModal('terms')}
            className="hover:text-slate-600 underline decoration-slate-300 transition-colors"
          >
            이용약관
          </button>
          <span>·</span>
          <button
            onClick={() => onOpenLegalModal('privacy')}
            className="hover:text-slate-600 underline decoration-slate-300 transition-colors"
          >
            개인정보처리방침
          </button>
        </div>
      </div>
    </aside>
  )
}

