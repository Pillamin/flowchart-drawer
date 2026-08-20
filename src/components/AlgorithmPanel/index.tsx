import React, { useState, useMemo, useRef } from 'react'
import { useFlowStore } from '../../store/flowStore'
import type { StepKind, AlgorithmStep } from '../../types'

const KIND_LABELS: Record<StepKind, { label: string; bg: string; text: string; border: string }> = {
  none: { label: '', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-300' },
  terminal: { label: '시작/끝', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  io: { label: '입출력', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  process: { label: '처리', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300' },
  decision: { label: '판단(선택)', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  loop: { label: '판단(반복)', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
}

interface DropIndicator {
  location: 'root' | 'yes' | 'no'
  decisionId?: string
  index: number
}

function findStepById(steps: AlgorithmStep[], id: string | null): AlgorithmStep | null {
  if (!id) return null
  for (const s of steps) {
    if (s.id === id) return s
    if (s.yesSteps) {
      const found = findStepById(s.yesSteps, id)
      if (found) return found
    }
    if (s.noSteps) {
      const found = findStepById(s.noSteps, id)
      if (found) return found
    }
  }
  return null
}

export const AlgorithmPanel: React.FC = () => {
  const isAlgorithmPanelOpen = useFlowStore(s => s.isAlgorithmPanelOpen)
  const algorithmSteps = useFlowStore(s => s.algorithmSteps)
  const hoveredStepId = useFlowStore(s => s.hoveredStepId)
  const pastAlgorithm = useFlowStore(s => s.pastAlgorithm)
  const futureAlgorithm = useFlowStore(s => s.futureAlgorithm)
  const undoAlgorithm = useFlowStore(s => s.undoAlgorithm)
  const redoAlgorithm = useFlowStore(s => s.redoAlgorithm)
  
  const setAlgorithmPanelOpen = useFlowStore(s => s.setAlgorithmPanelOpen)
  const addAlgorithmStep = useFlowStore(s => s.addAlgorithmStep)
  const updateAlgorithmStep = useFlowStore(s => s.updateAlgorithmStep)
  const moveStepToBranch = useFlowStore(s => s.moveStepToBranch)
  const moveStepToRoot = useFlowStore(s => s.moveStepToRoot)
  const updateBranchAlgorithmStep = useFlowStore(s => s.updateBranchAlgorithmStep)
  const updateAlgorithmStepLoopConfig = useFlowStore(s => s.updateAlgorithmStepLoopConfig)
  const removeAlgorithmStep = useFlowStore(s => s.removeAlgorithmStep)
  const moveAlgorithmStep = useFlowStore(s => s.moveAlgorithmStep)
  const setHoveredStepId = useFlowStore(s => s.setHoveredStepId)

  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const handleAutoScroll = (clientY: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const threshold = 60
    const speed = 14

    if (clientY < rect.top + threshold) {
      container.scrollTop -= speed
    } else if (clientY > rect.bottom - threshold) {
      container.scrollTop += speed
    }
  }

  const draggedStep = useMemo(() => findStepById(algorithmSteps, draggedStepId), [algorithmSteps, draggedStepId])

  if (!isAlgorithmPanelOpen) return null

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return
    addAlgorithmStep(newText, 'none')
    setNewText('')
  }

  const startEdit = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      updateAlgorithmStep(id, editText)
    }
    setEditingId(null)
  }

  const handleDragStart = (e: React.DragEvent, stepId: string) => {
    e.stopPropagation()
    setDraggedStepId(stepId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ stepId }))
  }

  const handleDragEnd = () => {
    setDraggedStepId(null)
    setDropIndicator(null)
  }

  const handleCardDragOver = (
    e: React.DragEvent,
    location: 'root' | 'yes' | 'no',
    cardIndex: number,
    decisionId?: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    handleAutoScroll(e.clientY)

    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + Math.min(36, rect.height / 2)
    const targetIndex = e.clientY < midY ? cardIndex : cardIndex + 1

    if (
      !dropIndicator ||
      dropIndicator.location !== location ||
      dropIndicator.decisionId !== decisionId ||
      dropIndicator.index !== targetIndex
    ) {
      setDropIndicator({ location, decisionId, index: targetIndex })
    }
  }

  const handleBranchBoxDragOver = (
    e: React.DragEvent,
    branch: 'yes' | 'no',
    decisionId: string,
    branchLength: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    handleAutoScroll(e.clientY)

    if (
      !dropIndicator ||
      dropIndicator.location !== branch ||
      dropIndicator.decisionId !== decisionId ||
      dropIndicator.index !== branchLength
    ) {
      setDropIndicator({ location: branch, decisionId, index: branchLength })
    }
  }

  const handleContainerDragOver = (
    e: React.DragEvent,
    location: 'root' | 'yes' | 'no',
    stepsLength: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    handleAutoScroll(e.clientY)

    if (e.target !== e.currentTarget) return

    if (
      !dropIndicator ||
      dropIndicator.location !== location ||
      dropIndicator.index !== stepsLength
    ) {
      setDropIndicator({ location, index: stepsLength })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const raw = e.dataTransfer.getData('text/plain')
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.stepId && dropIndicator) {
        if (dropIndicator.location === 'root') {
          moveStepToRoot(data.stepId, dropIndicator.index)
        } else if (dropIndicator.decisionId) {
          moveStepToBranch(data.stepId, dropIndicator.decisionId, dropIndicator.location, dropIndicator.index)
        }
      }
    } catch {}
    handleDragEnd()
  }

  // Render Full Live Preview Card at candidate target location
  const renderLivePreviewCard = (step: AlgorithmStep | null, location: 'root' | 'yes' | 'no') => {
    if (!step) return null
    const kindStyle = KIND_LABELS[step.kind] || KIND_LABELS.none
    const borderStyle =
      location === 'root'
        ? 'border-2 border-dashed border-blue-500 bg-blue-50/90 text-blue-900 shadow-md ring-2 ring-blue-300'
        : location === 'yes'
        ? 'border-2 border-dashed border-emerald-500 bg-emerald-100/90 text-emerald-900 shadow-md ring-2 ring-emerald-300'
        : 'border-2 border-dashed border-rose-500 bg-rose-100/90 text-rose-900 shadow-md ring-2 ring-rose-300'

    return (
      <div 
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={handleDrop}
        className={`group rounded-md px-2.5 py-1.5 text-xs sm:text-sm flex flex-col gap-1 transition-all my-1 ${borderStyle}`}
      >
        <div className="flex items-center justify-between gap-1.5 w-full opacity-90">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-slate-400 font-bold text-xs select-none">⋮⋮</span>
            <span className={`text-xs font-bold border px-1.5 py-0.5 rounded ${kindStyle.bg} ${kindStyle.text} ${kindStyle.border}`}>
              {kindStyle.label}
            </span>
            <span className="flex-1 font-bold text-xs sm:text-sm truncate">
              {step.text}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Render Step Card Component
  const renderStepCard = (
    step: AlgorithmStep,
    idx: number,
    isNested?: boolean,
    parentDecisionId?: string,
    branch?: 'yes' | 'no'
  ) => {
    const kindStyle = KIND_LABELS[step.kind] || KIND_LABELS.none
    const isHovered = hoveredStepId === step.id
    const isDragging = draggedStepId === step.id
    const currentLocation = isNested && branch ? branch : 'root'

    const showPreviewBefore =
      dropIndicator &&
      dropIndicator.location === currentLocation &&
      dropIndicator.decisionId === parentDecisionId &&
      dropIndicator.index === idx

    return (
      <React.Fragment key={step.id}>
        {showPreviewBefore && renderLivePreviewCard(draggedStep, currentLocation)}

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, step.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleCardDragOver(e, currentLocation, idx, parentDecisionId)}
          onDrop={handleDrop}
          onMouseEnter={() => setHoveredStepId(step.id)}
          onMouseLeave={() => setHoveredStepId(null)}
          className={`group border rounded-md transition-all flex flex-col px-2.5 py-2 text-xs sm:text-sm gap-1.5 ${
            isDragging
              ? 'opacity-30 border-dashed border-blue-400 bg-blue-50/60'
              : 'bg-white cursor-grab active:cursor-grabbing'
          } ${
            !isDragging && isHovered
              ? 'border-blue-500 shadow-xs ring-1 ring-blue-300'
              : !isDragging
              ? 'border-slate-200 hover:border-slate-300'
              : ''
          }`}
        >
          {/* Single-Line Main Row */}
          <div className="flex items-center justify-between gap-1.5 w-full cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Drag Handle Icon */}
              <span className="text-slate-400 hover:text-slate-600 cursor-grab text-xs select-none font-bold flex-shrink-0">
                ⋮⋮
              </span>

              {/* Index Badge or Bullet */}
              {!isNested ? (
                <span className="rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 w-5 h-5 text-xs sm:text-sm">
                  {idx + 1}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
              )}

              {/* Kind Select Tag */}
              <select
                value={step.kind || 'none'}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (isNested && parentDecisionId && branch) {
                    updateBranchAlgorithmStep(parentDecisionId, branch, step.id, step.text, e.target.value as StepKind)
                  } else {
                    updateAlgorithmStep(step.id, step.text, e.target.value as StepKind)
                  }
                }}
                className={`font-bold border rounded-md cursor-pointer flex-shrink-0 text-xs px-2 py-0.5 ${kindStyle.bg} ${kindStyle.text} ${kindStyle.border}`}
              >
                <option value="none"></option>
                <option value="terminal">시작/끝</option>
                <option value="io">입출력</option>
                <option value="process">처리</option>
                <option value="decision">판단(선택)</option>
                <option value="loop">판단(반복)</option>
              </select>

              {/* Step Text or Inline Single-Line Input Editor */}
              {editingId === step.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0" onMouseDown={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(step.id)}
                    className="flex-1 text-xs sm:text-sm border border-blue-400 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(step.id)}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-medium hover:bg-blue-700 flex-shrink-0"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => startEdit(step.id, step.text)}
                  className="flex-1 text-slate-700 font-medium break-words leading-snug cursor-pointer hover:text-slate-900 min-w-0 text-xs sm:text-sm"
                  title="클릭하여 내용 수정"
                >
                  {step.text}
                </div>
              )}

              {step.nodeId && (
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded flex-shrink-0" title="순서도 노드와 연결됨">
                  🔗
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 flex-shrink-0">
              {!isNested && (
                <>
                  <button
                    onClick={() => moveAlgorithmStep(step.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                    title="위로 이동"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveAlgorithmStep(step.id, 'down')}
                    disabled={idx === algorithmSteps.length - 1}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                    title="아래로 이동"
                  >
                    ▼
                  </button>
                </>
              )}
              <button
                onClick={() => removeAlgorithmStep(step.id)}
                className="p-1 text-red-400 hover:text-red-600 text-xs"
                title="삭제"
              >
                🗑
              </button>
            </div>
          </div>

          {/* Decision Nested Branch Containers */}
          {step.kind === 'decision' && (
            <div className="mt-1 flex flex-col gap-1.5 pt-1.5 border-t border-purple-100">
              {/* YES BRANCH CONTAINER */}
              <div
                onDragOver={(e) =>
                  handleBranchBoxDragOver(e, 'yes', step.id, (step.yesSteps || []).length)
                }
                onDrop={handleDrop}
                className="p-2 rounded-md border border-emerald-200 bg-emerald-50/50 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1">
                    <span>✅</span> 참(예) 실행 경로
                  </span>
                  <span className="text-[10px] font-normal text-emerald-600 bg-white/80 border border-emerald-200 px-1.5 py-0.2 rounded">
                    드롭 구역
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {(step.yesSteps || []).length === 0 ? (
                    <>
                      {dropIndicator?.location === 'yes' && dropIndicator.decisionId === step.id && (
                        renderLivePreviewCard(draggedStep, 'yes')
                      )}
                      <div className="text-xs text-emerald-700 font-medium py-1.5 text-center border border-dashed border-emerald-300 rounded bg-white/70">
                        여기로 블록을 드래그하세요!
                      </div>
                    </>
                  ) : (
                    <>
                      {(step.yesSteps || []).map((yStep, yIdx) =>
                        renderStepCard(yStep, yIdx, true, step.id, 'yes')
                      )}
                      {dropIndicator?.location === 'yes' &&
                        dropIndicator.decisionId === step.id &&
                        dropIndicator.index === (step.yesSteps || []).length &&
                        renderLivePreviewCard(draggedStep, 'yes')}
                    </>
                  )}
                </div>
              </div>

              {/* NO BRANCH CONTAINER */}
              <div
                onDragOver={(e) =>
                  handleBranchBoxDragOver(e, 'no', step.id, (step.noSteps || []).length)
                }
                onDrop={handleDrop}
                className="p-2 rounded-md border border-rose-200 bg-rose-50/50 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span className="flex items-center gap-1">
                    <span>❌</span> 거짓(아니오) 실행 경로
                  </span>
                  <span className="text-[10px] font-normal text-rose-600 bg-white/80 border border-rose-200 px-1.5 py-0.2 rounded">
                    드롭 구역
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {(step.noSteps || []).length === 0 ? (
                    <>
                      {dropIndicator?.location === 'no' && dropIndicator.decisionId === step.id && (
                        renderLivePreviewCard(draggedStep, 'no')
                      )}
                      <div className="text-xs text-rose-700 font-medium py-1.5 text-center border border-dashed border-rose-300 rounded bg-white/70">
                        여기로 블록을 드래그하세요!
                      </div>
                    </>
                  ) : (
                    <>
                      {(step.noSteps || []).map((nStep, nIdx) =>
                        renderStepCard(nStep, nIdx, true, step.id, 'no')
                      )}
                      {dropIndicator?.location === 'no' &&
                        dropIndicator.decisionId === step.id &&
                        dropIndicator.index === (step.noSteps || []).length &&
                        renderLivePreviewCard(draggedStep, 'no')}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loop Nested Branch Container (반복구조) */}
          {step.kind === 'loop' && (
            <div className="mt-1 flex flex-col gap-1.5 pt-1.5 border-t border-purple-100">
              {/* 1. Loop Condition Trigger Select */}
              <div className="flex items-center justify-between gap-1.5 px-2 py-1 bg-purple-100/60 rounded border border-purple-200 text-xs">
                <span className="font-bold text-purple-900 flex items-center gap-1">
                  <span>🔄</span> 반복 실행 조건:
                </span>
                <select
                  value={step.loopTrigger ?? 'yes'}
                  onChange={(e) => updateAlgorithmStepLoopConfig(step.id, { loopTrigger: e.target.value as 'yes' | 'no' })}
                  className="text-xs font-bold border border-purple-300 rounded px-1.5 py-0.5 bg-white text-purple-900 outline-none cursor-pointer"
                >
                  <option value="yes">조건 참(예)</option>
                  <option value="no">조건 거짓(아니오)</option>
                </select>
              </div>

              {/* 2. Code Block Execution Area */}
              <div
                onDragOver={(e) =>
                  handleBranchBoxDragOver(e, 'yes', step.id, (step.yesSteps || []).length)
                }
                onDrop={handleDrop}
                className="p-2 rounded-md border border-purple-200 bg-purple-50/50 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                  <span className="flex items-center gap-1">
                    <span>📦</span> 반복 실행할 블록
                  </span>
                  <span className="text-[10px] font-normal text-purple-600 bg-white/80 border border-purple-200 px-1.5 py-0.2 rounded">
                    드롭 구역
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {(step.yesSteps || []).length === 0 ? (
                    <>
                      {dropIndicator?.location === 'yes' && dropIndicator.decisionId === step.id && (
                        renderLivePreviewCard(draggedStep, 'yes')
                      )}
                      <div className="text-xs text-purple-700 font-medium py-1.5 text-center border border-dashed border-purple-300 rounded bg-white/70">
                        여기로 블록을 드래그하세요!
                      </div>
                    </>
                  ) : (
                    <>
                      {(step.yesSteps || []).map((lStep, lIdx) =>
                        renderStepCard(lStep, lIdx, true, step.id, 'yes')
                      )}
                      {dropIndicator?.location === 'yes' &&
                        dropIndicator.decisionId === step.id &&
                        dropIndicator.index === (step.yesSteps || []).length &&
                        renderLivePreviewCard(draggedStep, 'yes')}
                    </>
                  )}
                </div>
              </div>

              {/* 3. Target Block Jump Selection */}
              <div className="flex items-center justify-between gap-1.5 px-2 py-1 bg-purple-100/40 rounded border border-purple-200 text-xs">
                <span className="font-bold text-purple-900 flex items-center gap-1">
                  <span>↩️</span> 되돌아갈 블록:
                </span>
                <select
                  value={step.targetStepId ?? ''}
                  onChange={(e) => updateAlgorithmStepLoopConfig(step.id, { targetStepId: e.target.value || undefined })}
                  className="text-xs font-medium border border-purple-300 rounded px-1.5 py-0.5 bg-white text-slate-800 outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="">-- 이동 대상 선택 --</option>
                  {algorithmSteps.map((rootStep, rootIdx) => (
                    <option key={rootStep.id} value={rootStep.id}>
                      {rootIdx + 1}번 ({rootStep.text || '제목 없음'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </React.Fragment>
    )
  }

  return (
    <aside className="w-[380px] h-full bg-white border-r border-slate-200 shadow-md flex flex-col flex-shrink-0 z-10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/90 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">📝</span>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">자연어 알고리즘</h2>
            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">단계별 순서 작성</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo Group */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={undoAlgorithm}
              disabled={pastAlgorithm.length === 0}
              className="px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="되돌리기 (자연어 알고리즘)"
            >
              <span>↩</span>
              <span>되돌리기</span>
            </button>
            <div className="w-px h-3.5 bg-slate-200 my-auto" />
            <button
              onClick={redoAlgorithm}
              disabled={futureAlgorithm.length === 0}
              className="px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="다시 실행 (자연어 알고리즘)"
            >
              <span>↪</span>
              <span>다시 실행</span>
            </button>
          </div>

          {/* Close Panel Button */}
          <button
            onClick={() => setAlgorithmPanelOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors text-xs"
            title="패널 닫기"
          >
            ✕
          </button>
        </div>
      </div>


      {/* Add New Root Step Form */}
      <form onSubmit={handleAdd} className="p-2.5 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="새 알고리즘 단계 입력..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1 text-xs sm:text-sm border border-slate-300 rounded-md px-2.5 py-1.5 bg-white outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={!newText.trim()}
          className="w-full text-xs sm:text-sm bg-blue-600 text-white font-bold py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-40 transition shadow-xs cursor-pointer"
        >
          + 메인 단계 추가
        </button>
      </form>

      {/* Steps List (Root Drop Target) */}
      <div
        ref={scrollContainerRef}
        onDragOver={(e) => handleContainerDragOver(e, 'root', algorithmSteps.length)}
        onDrop={handleDrop}
        className="flex-1 overflow-y-auto p-2 select-none space-y-1.5"
      >
        {algorithmSteps.length === 0 ? (
          <div className="text-center py-10 text-xs sm:text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            알고리즘 단계가 없습니다.<br />위 양식에서 단계를 추가해 보세요!
          </div>
        ) : (
          <>
            {algorithmSteps.map((step, idx) => renderStepCard(step, idx))}
            {dropIndicator?.location === 'root' &&
              dropIndicator.index === algorithmSteps.length &&
              renderLivePreviewCard(draggedStep, 'root')}
          </>
        )}
      </div>
    </aside>
  )
}
