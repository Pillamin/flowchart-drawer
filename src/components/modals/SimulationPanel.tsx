import React from 'react'
import { useFlowStore } from '../../store/flowStore'
import { useSimulation } from '../../hooks/useSimulation'
import { Button } from '../ui/Button'
import type { FlowEdge } from '../../types'

/** 실행 시뮬레이션 패널 — 우측 하단 오버레이로 표시 */
export const SimulationPanel: React.FC = () => {
  const simulation = useFlowStore(s => s.simulation)
  const { chooseDecision, stop } = useSimulation()

  if (simulation.status === 'idle') return null

  const statusConfig = {
    running: { color: 'border-yellow-300 bg-yellow-50', icon: '▶', label: '실행 중...' },
    waiting: { color: 'border-purple-300 bg-purple-50', icon: '❓', label: '선택이 필요해요!' },
    finished: { color: 'border-green-300 bg-green-50', icon: '🎉', label: '완료!' },
    error: { color: 'border-red-300 bg-red-50', icon: '⚠️', label: '오류 발생' },
    idle: { color: '', icon: '', label: '' },
  }[simulation.status]

  return (
    <div
      className={`fixed bottom-20 right-4 w-72 rounded-2xl border-2 shadow-xl z-40 overflow-hidden animate-fade-in ${statusConfig.color}`}
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/60">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusConfig.icon}</span>
          <span className="font-bold text-sm text-text-primary">{statusConfig.label}</span>
        </div>
        <button
          onClick={stop}
          className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-0.5 rounded-lg hover:bg-white/50 transition-colors"
          aria-label="시뮬레이션 중지"
        >
          ✕ 중지
        </button>
      </div>

      {/* Decision choices */}
      {simulation.status === 'waiting' && simulation.pendingDecisionEdges.length > 0 && (
        <div className="px-4 py-3 flex flex-col gap-2">
          <p className="text-xs text-text-placeholder font-bold">조건 결과를 선택하세요:</p>
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
      <div className="px-4 py-3 max-h-40 overflow-y-auto flex flex-col-reverse gap-1">
        {[...simulation.stepLog].reverse().map((log, i) => (
          <p key={i} className={`text-xs leading-relaxed ${i === 0 ? 'text-text-primary font-bold' : 'text-text-placeholder'}`}>
            {log}
          </p>
        ))}
      </div>

      {/* Finished CTA */}
      {(simulation.status === 'finished' || simulation.status === 'error') && (
        <div className="px-4 pb-4">
          <Button id="btn-sim-reset" variant="secondary" size="sm" fullWidth onClick={stop}>
            처음으로 돌아가기
          </Button>
        </div>
      )}
    </div>
  )
}
