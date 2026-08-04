import { useEffect } from 'react'
import { useFlowStore } from '../store/flowStore'

/** Ctrl+Z / Ctrl+Y 키보드 단축키로 Undo/Redo를 처리하는 훅 */
export function useUndoRedo() {
  const undo = useFlowStore(s => s.undo)
  const redo = useFlowStore(s => s.redo)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 텍스트 입력 중에는 단축키 무시
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])
}
