import React from 'react'
import { Button } from '../ui/Button'
import { useFlowStore } from '../../store/flowStore'
import { useReactFlow } from '@xyflow/react'

interface ToolbarProps {
  onClearClick: () => void
  onValidateClick: () => void
  onSimulateClick: () => void
}

/** 상단 툴바: 앱 타이틀 + 주요 액션 버튼들 */
export const Toolbar: React.FC<ToolbarProps> = ({ onClearClick, onValidateClick, onSimulateClick }) => {
  const past = useFlowStore(s => s.past)
  const future = useFlowStore(s => s.future)
  const undo = useFlowStore(s => s.undo)
  const redo = useFlowStore(s => s.redo)
  const simStatus = useFlowStore(s => s.simulation.status)
  const { fitView } = useReactFlow()

  const isSimRunning = simStatus === 'running' || simStatus === 'waiting'

  return (
    <header className="flex items-center gap-2 px-4 h-14 bg-white border-b border-slate-100 shadow-sm flex-shrink-0 z-10">
      {/* Brand */}
      <div className="flex items-center gap-2 mr-4">
        <span className="text-xl">🔷</span>
        <div>
          <h1 className="text-sm font-bold text-text-primary leading-tight">Flowchart Drawer</h1>
          <p className="text-[10px] text-text-placeholder leading-none">순서도 그리기</p>
        </div>
      </div>

      <div className="w-px h-7 bg-slate-200 mx-1" />

      {/* Undo / Redo */}
      <Button
        id="btn-undo"
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={past.length === 0}
        title="실행 취소 (Ctrl+Z)"
        icon={<span>↩</span>}
      >
        되돌리기
      </Button>
      <Button
        id="btn-redo"
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={future.length === 0}
        title="다시 실행 (Ctrl+Y)"
        icon={<span>↪</span>}
      >
        다시 실행
      </Button>

      <div className="w-px h-7 bg-slate-200 mx-1" />

      {/* Fit View */}
      <Button
        id="btn-fitview"
        variant="ghost"
        size="sm"
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        title="화면에 맞추기"
        icon={<span>⊡</span>}
      >
        전체 보기
      </Button>

      {/* Clear */}
      <Button
        id="btn-clear"
        variant="ghost"
        size="sm"
        onClick={onClearClick}
        title="캔버스 초기화"
        icon={<span>🗑</span>}
      >
        초기화
      </Button>

      <div className="flex-1" />

      {/* Validate */}
      <Button
        id="btn-validate"
        variant="secondary"
        size="sm"
        onClick={onValidateClick}
        icon={<span>🔍</span>}
      >
        검사하기
      </Button>

      {/* Simulate */}
      <Button
        id="btn-simulate"
        variant={isSimRunning ? 'danger' : 'primary'}
        size="sm"
        onClick={onSimulateClick}
        icon={<span>{isSimRunning ? '⏹' : '▶'}</span>}
      >
        {isSimRunning ? '시뮬레이션 중지' : '실행 해보기'}
      </Button>
    </header>
  )
}
