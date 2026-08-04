import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { useExport } from '../../hooks/useExport'
import type { ExportFormat } from '../../types'

interface ExportButtonsProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
}

const FORMATS: { format: ExportFormat; label: string; icon: string }[] = [
  { format: 'png', label: 'PNG', icon: '🖼' },
  { format: 'jpg', label: 'JPG', icon: '📷' },
  { format: 'pdf', label: 'PDF', icon: '📄' },
]

export const ExportButtons: React.FC<ExportButtonsProps> = ({ canvasRef }) => {
  const { doExport } = useExport(canvasRef)
  const [loading, setLoading] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (format: ExportFormat) => {
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

  return (
    <section aria-label="내보내기">
      <h3 className="text-xs font-bold text-text-placeholder uppercase tracking-wide mb-2">내보내기 / Export</h3>
      <div className="flex flex-col gap-1.5">
        {FORMATS.map(({ format, label, icon }) => (
          <Button
            key={format}
            id={`btn-export-${format}`}
            variant="secondary"
            size="sm"
            fullWidth
            disabled={loading !== null}
            onClick={() => handleExport(format)}
            icon={<span>{loading === format ? '⏳' : icon}</span>}
          >
            {loading === format ? '저장 중...' : `${label}로 저장`}
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-[11px] text-red-500 font-bold mt-1">{error}</p>
      )}
      <p className="text-[11px] text-text-placeholder mt-2 leading-relaxed">
        📌 학번·이름을 입력하면 파일에 자동으로 표시돼요.
      </p>
    </section>
  )
}
