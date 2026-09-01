import React from 'react'
import type { LegalType } from '../modals/LegalModal'
import { useFlowStore } from '../../store/flowStore'
import { useSimulation } from '../../hooks/useSimulation'
import { Button } from '../ui/Button'
import type { ValidationResult, FlowEdge } from '../../types'

interface RightPanelProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
  isCollapsed: boolean
  onToggleCollapse: () => void
  onTemplateClick?: () => void
  onOpenLegalModal: (type: LegalType) => void
  validationResult?: ValidationResult | null
  onClearValidation?: () => void
}

/** 우측 패널: 디버깅 및 실행 결과 (준비 중) */
export const RightPanel: React.FC<RightPanelProps> = ({ isCollapsed, onToggleCollapse, onOpenLegalModal, validationResult, onClearValidation }) => {
  const simulation = useFlowStore(s => s.simulation)
  const { chooseDecision, stop } = useSimulation()

  if (isCollapsed) {
    return (
      <aside className="flex flex-col h-full bg-slate-50 border-l border-slate-300 items-center justify-center select-none w-6 relative shrink-0">
        <button
          onClick={onToggleCollapse}
          className="absolute -left-3 top-1/2 transform -translate-y-1/2 p-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-full shadow-sm transition-colors z-10"
          title="패널 펼치기"
        >
          <span className="text-[10px]">◀</span>
        </button>
      </aside>
    )
  }

  // --- Render Validation Result ---
  const renderValidation = () => {
    if (!validationResult) return null
    const errors = validationResult.issues.filter(i => i.severity === 'error')
    const warnings = validationResult.issues.filter(i => i.severity === 'warning')

    return (
      <div className="flex flex-col gap-4 animate-fade-in w-full">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-lg">🔍</span> 검사 결과</h4>
          <button onClick={onClearValidation} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕ 닫기</button>
        </div>
        
        <div className={`flex flex-col gap-2 p-3 rounded-xl border ${validationResult.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{validationResult.isValid ? '✅' : '❌'}</span>
            <div className={`font-bold text-sm ${validationResult.isValid ? 'text-emerald-700' : 'text-red-700'}`}>
              {validationResult.isValid ? '완벽해요! 오류가 없어요.' : `오류 ${errors.length}개, 경고 ${warnings.length}개가 있어요.`}
            </div>
          </div>
          {validationResult.isValid && warnings.length > 0 && (
            <div className="text-xs text-amber-600 mt-1 ml-7">경고 {warnings.length}개가 있지만 실행/내보내기는 가능해요.</div>
          )}
        </div>

        {validationResult.issues.length > 0 && (
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[40vh] pr-1">
            {[...errors, ...warnings].map(issue => (
              <div
                key={issue.id}
                className={`flex gap-2 p-3 rounded-lg text-sm border ${
                  issue.severity === 'error'
                    ? 'bg-red-50/50 border-red-100 text-red-800'
                    : 'bg-amber-50/50 border-amber-100 text-amber-800'
                }`}
              >
                <span className="flex-shrink-0">{issue.severity === 'error' ? '❌' : '⚠️'}</span>
                <span className="leading-relaxed text-xs font-medium">{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // --- Render Simulation ---
  const renderSimulation = () => {
    if (simulation.status === 'idle') return null

    const statusConfig = {
      running: { color: 'border-yellow-200 bg-yellow-50 text-yellow-800', icon: '▶', label: '실행 중...' },
      waiting: { color: 'border-purple-200 bg-purple-50 text-purple-800', icon: '❓', label: '조건 분기 대기 중' },
      finished: { color: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: '🎉', label: '실행 완료!' },
      error: { color: 'border-red-200 bg-red-50 text-red-800', icon: '⚠️', label: '오류 발생' },
      idle: { color: '', icon: '', label: '' },
    }[simulation.status]

    return (
      <div className="flex flex-col gap-4 animate-fade-in w-full h-full">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 flex items-center gap-2"><span className="text-lg">▶</span> 시뮬레이션</h4>
          <button onClick={stop} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕ 중지</button>
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-xl border ${statusConfig.color}`}>
          <span className="text-xl">{statusConfig.icon}</span>
          <span className="font-bold text-sm">{statusConfig.label}</span>
        </div>

        {/* Decision choices */}
        {simulation.status === 'waiting' && simulation.pendingDecisionEdges.length > 0 && (
          <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 font-bold mb-1">조건 결과를 선택하세요:</p>
            {simulation.pendingDecisionEdges.map((edge: FlowEdge) => (
              <Button
                key={edge.id}
                id={`btn-sim-decision-${edge.id}`}
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => chooseDecision(edge)}
              >
                {String(edge.label ?? '선택')}
              </Button>
            ))}
          </div>
        )}

        {/* Step log */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col-reverse gap-1.5 min-h-[150px]">
          {[...simulation.stepLog].reverse().map((log, i) => (
            <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${i === 0 ? 'bg-blue-50 text-blue-800 font-bold border border-blue-100' : 'text-slate-500'}`}>
              {log}
            </div>
          ))}
        </div>

        {/* Finished CTA */}
        {(simulation.status === 'finished' || simulation.status === 'error') && (
          <div className="mt-2">
            <Button id="btn-sim-reset" variant="secondary" size="sm" fullWidth onClick={stop}>
              처음으로 돌아가기
            </Button>
          </div>
        )}
      </div>
    )
  }

  const isIdle = !validationResult && simulation.status === 'idle'

  const handleClear = () => {
    if (validationResult && onClearValidation) {
      onClearValidation()
    }
    if (simulation.status !== 'idle') {
      stop()
    }
  }

  return (
    <aside
      className="flex flex-col bg-white w-80 min-w-[20rem] h-full border-l border-slate-300 select-none relative"
      style={{ boxShadow: '-2px 0 12px rgba(0,0,0,0.04)' }}
      aria-label="실행 패널"
    >
      <button
        onClick={onToggleCollapse}
        className="absolute top-1/2 left-2 transform -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors z-20"
        title="패널 접기"
      >
        <span className="text-xs">▶</span>
      </button>

      {/* Header - Fixed */}
      <div className="flex items-center justify-between px-3.5 border-b border-slate-200 bg-slate-50/90 shrink-0 gap-2 h-[52px]">
        <div className="flex items-center gap-2 min-w-0 ml-4">
          <span className="text-xl flex-shrink-0">🛠️</span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 leading-tight truncate">실행 및 디버깅</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIdle && (
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="내용 삭제"
            >
              <span className="text-xs">🗑️</span>
              <span>지우기</span>
            </button>
          )}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 gap-4">
        {isIdle && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium text-center w-full min-h-[200px]">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 border-dashed w-full">
              상단 메뉴에서 <br/>
              <span className="font-bold text-emerald-600">검사하기</span> 또는 <span className="font-bold text-indigo-600">실행 해보기</span>를<br/>
              클릭하면 결과가 나타납니다.
            </div>
          </div>
        )}
        
        {validationResult && renderValidation()}
        {simulation.status !== 'idle' && renderSimulation()}
      </div>

      {/* Footer & Status - Fixed */}
      <div className="flex flex-col items-center gap-2 px-5 py-4 border-t border-slate-100 bg-white shrink-0">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/70 rounded-full text-xs text-emerald-700 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>자동 저장 활성화됨</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
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

