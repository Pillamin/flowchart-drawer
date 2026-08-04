import { useCallback, useRef } from 'react'
import { useFlowStore } from '../store/flowStore'
import { exportFlow } from '../utils/export'
import type { ExportFormat } from '../types'

/** 캔버스 DOM 참조를 받아 내보내기를 수행하는 훅 */
export function useExport(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const student = useFlowStore(s => s.student)
  const isExporting = useRef(false)

  const doExport = useCallback(async (format: ExportFormat) => {
    if (isExporting.current || !canvasRef.current) return
    isExporting.current = true
    try {
      await exportFlow(format, canvasRef.current, student)
    } finally {
      isExporting.current = false
    }
  }, [canvasRef, student])

  return { doExport }
}
