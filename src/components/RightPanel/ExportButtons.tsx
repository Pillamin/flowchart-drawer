import React, { useState } from 'react'
import { useExport } from '../../hooks/useExport'
import { useFlowStore } from '../../store/flowStore'
import { StudentInfoModal } from '../modals/StudentInfoModal'
import type { ExportFormat } from '../../types'

interface ExportButtonsProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
}

const FORMATS: { format: ExportFormat; label: string; desc: string; icon: string; hoverBorder: string }[] = [
  { format: 'png', label: 'PNG 이미지', desc: '고화질 래스터 이미지', icon: '🖼️', hoverBorder: 'hover:border-emerald-300 hover:bg-emerald-50/50' },
  { format: 'jpg', label: 'JPG 이미지', desc: '압축 이미지 저장', icon: '📷', hoverBorder: 'hover:border-amber-300 hover:bg-amber-50/50' },
  { format: 'pdf', label: 'PDF 문서', desc: '인쇄 및 제출용 문서', icon: '📄', hoverBorder: 'hover:border-rose-300 hover:bg-rose-50/50' },
]

export const ExportButtons: React.FC<ExportButtonsProps> = ({ canvasRef }) => {
  const { doExport } = useExport(canvasRef)
  const student = useFlowStore(s => s.student)
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingFormat, setPendingFormat] = useState<ExportFormat | null>(null)

  const executeExport = async (format: ExportFormat) => {
    setLoading(format)
    setError(null)
    try {
      await doExport(format)
    } catch (e) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      console.error('[export]', e)
    } finally {
      setLoading(null)
    }
  }

  const handleExportClick = (format: ExportFormat) => {
    // 학생 이름이 입력되어 있지 않으면 모달 띄우기
    if (!student.name || !student.name.trim()) {
      setPendingFormat(format)
    } else {
      executeExport(format)
    }
  }

  return (
    <section aria-label="내보내기" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
        <span className="text-base">📥</span>
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">순서도 내보내기</h3>
      </div>

      <div className="flex flex-col gap-2">
        {FORMATS.map(({ format, label, desc, icon, hoverBorder }) => (
          <button
            key={format}
            id={`btn-export-${format}`}
            disabled={loading !== null}
            onClick={() => handleExportClick(format)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-50 text-left ${hoverBorder}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg flex-shrink-0">{loading === format ? '⏳' : icon}</span>
              <div className="flex flex-col leading-snug min-w-0">
                <span className="text-sm font-bold text-slate-800 truncate">
                  {loading === format ? '저장 중...' : label}
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">{desc}</span>
              </div>
            </div>
            <span className="text-slate-300 font-bold text-sm flex-shrink-0">↓</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-bold">
          {error}
        </div>
      )}

      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2 text-xs text-blue-900 leading-relaxed">
        <span className="text-sm flex-shrink-0">💡</span>
        <span>학번과 이름을 작성하면 순서도 하단 표지에 자동으로 기록돼요.</span>
      </div>

      {/* 학번/이름 누락 시 모달 */}
      <StudentInfoModal
        isOpen={pendingFormat !== null}
        onClose={() => setPendingFormat(null)}
        onConfirm={() => {
          if (pendingFormat) {
            executeExport(pendingFormat)
          }
        }}
      />
    </section>
  )
}
