import React, { useState, useMemo, useRef } from 'react'
import { useFlowStore } from '../../store/flowStore'
import type { AlgorithmStep } from '../../types'



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

function getStepNumber(depth: number, idx: number): string {
  const korean = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하']
  const index = idx % korean.length
  if (depth === 0) return `${idx + 1}.`
  if (depth === 1) return `${korean[index]}.`
  if (depth === 2) return `${idx + 1})`
  if (depth >= 3) return `${korean[index]})`
  return ''
}

interface AlgorithmPanelProps {
  onClearClick?: () => void
}

export const AlgorithmPanel: React.FC<AlgorithmPanelProps> = ({ onClearClick }) => {
  const isAlgorithmPanelOpen = useFlowStore(s => s.isAlgorithmPanelOpen)
  const algorithmSteps = useFlowStore(s => s.algorithmSteps)
  const pastAlgorithm = useFlowStore(s => s.pastAlgorithm)
  const futureAlgorithm = useFlowStore(s => s.futureAlgorithm)
  const undoAlgorithm = useFlowStore(s => s.undoAlgorithm)
  const redoAlgorithm = useFlowStore(s => s.redoAlgorithm)
  
  const setAlgorithmPanelOpen = useFlowStore(s => s.setAlgorithmPanelOpen)
  const addAlgorithmStep = useFlowStore(s => s.addAlgorithmStep)
  const updateAlgorithmStep = useFlowStore(s => s.updateAlgorithmStep)
  const addBranchAlgorithmStep = useFlowStore(s => s.addBranchAlgorithmStep)
  const removeBranchAlgorithmStep = useFlowStore(s => s.removeBranchAlgorithmStep)
  const moveStepToBranch = useFlowStore(s => s.moveStepToBranch)
  const moveStepToRoot = useFlowStore(s => s.moveStepToRoot)
  const removeAlgorithmStep = useFlowStore(s => s.removeAlgorithmStep)
  const setHoveredStepId = useFlowStore(s => s.setHoveredStepId)
  const indentStep = useFlowStore(s => s.indentStep)
  const outdentStep = useFlowStore(s => s.outdentStep)
  const toggleDecision = useFlowStore(s => s.toggleDecision)

  const [newStepText, setNewStepText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Panel width state with localStorage persistence
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('algorithm_panel_width')
      return saved ? Math.max(280, Math.min(window.innerWidth * 0.7, Number(saved))) : 380
    } catch {
      return 380
    }
  })
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = panelWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const minWidth = 280
      const maxWidth = Math.max(minWidth, Math.min(window.innerWidth * 0.7, 850))
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsResizing(false)
      const delta = upEvent.clientX - startX
      const minWidth = 280
      const maxWidth = Math.max(minWidth, Math.min(window.innerWidth * 0.7, 850))
      const finalWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + delta))
      try {
        localStorage.setItem('algorithm_panel_width', String(Math.round(finalWidth)))
      } catch {}
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

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
  const renderLivePreviewCard = (step: AlgorithmStep | null, _location: 'root' | 'yes' | 'no') => {
    if (!step) return null
    let borderStyle = 'border-slate-300 text-slate-500'

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={handleDrop}
        className={`group rounded-md px-1 py-1 text-xs sm:text-sm flex flex-col gap-1 transition-all my-1 border-dashed border-2 bg-white/60 ${borderStyle}`}
      >
        <div className="flex items-start gap-1.5 w-full opacity-60">
          <span className="text-slate-400 font-bold text-xs select-none pt-1.5 flex-shrink-0 w-4">⋮⋮</span>
          <span
            className="flex-1 font-medium text-xs sm:text-sm whitespace-pre-wrap py-1.5"
            style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
          >
            {step.text || '빈 단계'}
          </span>
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
    branch?: 'yes' | 'no',
    depth: number = 0
  ) => {
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
          onDragStart={(e) => handleDragStart(e, step.id)}
          onDragEnd={(e) => {
            handleDragEnd()
            e.currentTarget.setAttribute('draggable', 'false')
          }}
          onDragOver={(e) => handleCardDragOver(e, currentLocation, idx, parentDecisionId)}
          onDrop={handleDrop}
          onMouseEnter={() => setHoveredStepId(step.id)}
          onMouseLeave={(e) => {
            setHoveredStepId(null)
            e.currentTarget.setAttribute('draggable', 'false')
          }}
          className={`step-card-wrapper relative group flex flex-col w-full text-sm transition-all border rounded-md ${
            isDragging ? 'opacity-30 border-dashed border-slate-400 bg-slate-100/60' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Main Row */}
          <div className="flex items-start gap-1.5 w-full hover:bg-slate-50 transition-colors py-1.5 px-2 rounded-t-md">
            {/* Drag Handle Icon - 좌측 */}
            <div 
              className="drag-handle flex items-center gap-1 pt-2.5 flex-shrink-0 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing select-none" 
              title="드래그하여 순서 변경"
              onMouseEnter={(e) => {
                const card = e.currentTarget.closest('.step-card-wrapper')
                if (card) card.setAttribute('draggable', 'true')
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget.closest('.step-card-wrapper')
                if (card) card.setAttribute('draggable', 'false')
              }}
              onMouseUp={(e) => {
                const card = e.currentTarget.closest('.step-card-wrapper')
                if (card) card.setAttribute('draggable', 'false')
              }}
            >
              <span>⋮⋮</span>
              <span className="text-[11px] font-bold w-4 text-center">{getStepNumber(depth, idx)}</span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {editingId === step.id ? (
                <textarea
                  onFocus={(e) => e.target.select()}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = `${el.scrollHeight}px`
                    }
                  }}
                  value={editText}
                  onChange={(e) => {
                    setEditText(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = `${e.target.scrollHeight}px`
                  }}
                  onBlur={() => saveEdit(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      saveEdit(step.id)
                    } else if (e.key === 'Escape') {
                      setEditingId(null)
                    } else if (e.key === 'Tab') {
                      e.preventDefault()
                      if (e.shiftKey) {
                        outdentStep(step.id)
                      } else {
                        indentStep(step.id)
                      }
                    }
                  }}
                  rows={1}
                  className="w-full text-sm bg-white border border-slate-300 rounded px-1.5 py-1 outline-none shadow-sm min-w-0 resize-none overflow-hidden focus:ring-1 focus:ring-slate-400"
                  style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
                  autoFocus
                />
              ) : (
                <div
                  onDoubleClick={() => startEdit(step.id, step.text)}
                  className={`text-slate-900 font-semibold text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-wrap cursor-text min-w-0 py-2 px-2 rounded transition-colors hover:bg-slate-100/50 select-none ${
                    !step.text.trim() ? 'italic text-slate-400 font-medium' : ''
                  }`}
                  style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}
                  title="더블클릭하여 내용 편집"
                >
                  {step.text || '빈 단계 (수정하려면 클릭)'}
                </div>
              )}
            </div>

            {/* Action buttons (Delete / Substep Toggle) */}
            <div className="flex items-center gap-1 flex-shrink-0 pt-2.5 pr-1">
              <label className="flex items-center gap-1 cursor-pointer pr-1">
                <input
                  type="checkbox"
                  checked={step.kind === 'decision'}
                  onChange={(e) => toggleDecision(step.id, e.target.checked)}
                  className="cursor-pointer w-3 h-3 text-blue-600 rounded border-slate-300 focus:ring-blue-500 accent-blue-500"
                />
                <span className="text-[10px] font-medium text-slate-500 select-none">조건</span>
              </label>
              <button
                onClick={() => {
                  if (isNested && parentDecisionId && branch) {
                    removeBranchAlgorithmStep(parentDecisionId, branch, step.id)
                  } else {
                    removeAlgorithmStep(step.id)
                  }
                }}
                className="p-1 text-slate-400 hover:text-red-600 text-xs cursor-pointer rounded hover:bg-red-50"
                title="삭제"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Decision Branches */}
          {step.kind === 'decision' && (
            <div className="ml-5 pr-2 flex flex-col gap-2 mt-1 mb-2">
              {/* YES BRANCH */}
              <div
                onDragOver={(e) => handleBranchBoxDragOver(e, 'yes', step.id, (step.yesSteps || []).length)}
                onDrop={handleDrop}
                className="flex flex-col gap-1 min-h-[20px] p-2 rounded-md border border-emerald-200 bg-emerald-50/30 shadow-xs transition-colors hover:border-emerald-300"
              >
                <div className="text-[11px] font-bold text-emerald-600 px-1 select-none flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    [예]
                  </div>
                  {(step.yesSteps || []).length > 0 && (
                    <div className="flex gap-1 pr-1">
                      <button onClick={(e) => { e.stopPropagation(); addBranchAlgorithmStep(step.id, 'yes', '', 'process'); }} className="text-[11px] text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 shadow-sm cursor-pointer whitespace-nowrap">+ 단계 추가</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  {(step.yesSteps || []).length === 0 && (
                    <div className="flex items-center gap-2 py-1.5 px-2">
                      <button onClick={(e) => { e.stopPropagation(); addBranchAlgorithmStep(step.id, 'yes', '', 'process'); }} className="text-[11px] text-slate-700 font-bold px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 shadow-sm cursor-pointer transition-colors">+ 단계 추가</button>
                    </div>
                  )}
                  {(step.yesSteps || []).map((yStep, yIdx) => renderStepCard(yStep, yIdx, true, step.id, 'yes', depth + 1))}
                  {dropIndicator?.location === 'yes' && dropIndicator.decisionId === step.id && dropIndicator.index === (step.yesSteps || []).length && renderLivePreviewCard(draggedStep, 'yes')}
                </div>
              </div>

              {/* NO BRANCH */}
              <div
                onDragOver={(e) => handleBranchBoxDragOver(e, 'no', step.id, (step.noSteps || []).length)}
                onDrop={handleDrop}
                className="flex flex-col gap-1 min-h-[20px] p-2 rounded-md border border-rose-200 bg-rose-50/30 shadow-xs transition-colors hover:border-rose-300"
              >
                <div className="text-[11px] font-bold text-rose-500 px-1 select-none flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    [아니오]
                  </div>
                  {(step.noSteps || []).length > 0 && (
                    <div className="flex gap-1 pr-1">
                      <button onClick={(e) => { e.stopPropagation(); addBranchAlgorithmStep(step.id, 'no', '', 'process'); }} className="text-[11px] text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 shadow-sm cursor-pointer whitespace-nowrap">+ 단계 추가</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  {(step.noSteps || []).length === 0 && (
                    <div className="flex items-center gap-2 py-1.5 px-2">
                      <button onClick={(e) => { e.stopPropagation(); addBranchAlgorithmStep(step.id, 'no', '', 'process'); }} className="text-[11px] text-slate-700 font-bold px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 shadow-sm cursor-pointer transition-colors">+ 단계 추가</button>
                    </div>
                  )}
                  {(step.noSteps || []).map((nStep, nIdx) => renderStepCard(nStep, nIdx, true, step.id, 'no', depth + 1))}
                  {dropIndicator?.location === 'no' && dropIndicator.decisionId === step.id && dropIndicator.index === (step.noSteps || []).length && renderLivePreviewCard(draggedStep, 'no')}
                </div>
              </div>
            </div>
          )}

          {/* Loop Block */}
          {step.kind === 'loop' && (
            <div className="ml-5 pr-2 flex flex-col gap-2 mt-1 mb-2">
              <div
                onDragOver={(e) => handleBranchBoxDragOver(e, 'yes', step.id, (step.yesSteps || []).length)}
                onDrop={handleDrop}
                className="flex flex-col gap-1 min-h-[20px] p-2 rounded-md border border-purple-200 bg-purple-50/30 shadow-xs transition-colors hover:border-purple-300"
              >
                <div className="text-[11px] font-bold text-purple-600 px-1 select-none flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    [반복 실행]
                  </div>
                  {(step.yesSteps || []).length > 0 && (
                    <div className="flex gap-1 pr-1">
                      <button onClick={(e) => { e.stopPropagation(); addBranchAlgorithmStep(step.id, 'yes', '', 'process'); }} className="text-[11px] text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 shadow-sm cursor-pointer whitespace-nowrap">+ 단계 추가</button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  {(step.yesSteps || []).length === 0 && (
                    <div className="flex items-center gap-2 py-1.5 px-2">
                      <button onClick={(e) => { e.stopPropagation(); addBranchAlgorithmStep(step.id, 'yes', '', 'process'); }} className="text-[11px] text-slate-700 font-bold px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 shadow-sm cursor-pointer transition-colors">+ 단계 추가</button>
                    </div>
                  )}
                  {(step.yesSteps || []).map((lStep, lIdx) => renderStepCard(lStep, lIdx, true, step.id, 'yes', depth + 1))}
                  {dropIndicator?.location === 'yes' && dropIndicator.decisionId === step.id && dropIndicator.index === (step.yesSteps || []).length && renderLivePreviewCard(draggedStep, 'yes')}
                </div>
              </div>
            </div>
          )}
        </div>
      </React.Fragment>
    )
  }

  return (
    <aside
      style={{ width: `${panelWidth}px` }}
      className={`relative h-full bg-white border-r border-slate-200 shadow-md flex flex-col flex-shrink-0 z-10 ${
        isResizing ? 'select-none' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/90 flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">📝</span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 leading-tight truncate">자연어 알고리즘</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Undo / Redo Group (Icon only) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={undoAlgorithm}
              disabled={pastAlgorithm.length === 0}
              className="w-8 h-7 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              title="되돌리기 (자연어 알고리즘)"
            >
              <span>↩</span>
            </button>
            <div className="w-px h-4 bg-slate-200 my-auto" />
            <button
              onClick={redoAlgorithm}
              disabled={futureAlgorithm.length === 0}
              className="w-8 h-7 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-sm font-bold transition-colors flex items-center justify-center cursor-pointer"
              title="다시 실행 (자연어 알고리즘)"
            >
              <span>↪</span>
            </button>
          </div>

          {/* Clear Algorithm Steps Button */}
          <button
            onClick={() => {
              if (algorithmSteps.length > 0 && onClearClick) {
                onClearClick()
              }
            }}
            disabled={algorithmSteps.length === 0}
            className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:bg-white disabled:hover:border-slate-200 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="자연어 알고리즘 초기화"
          >
            <span className="text-xs">🗑</span>
            <span>초기화</span>
          </button>

          {/* Close Panel Button */}
          <button
            onClick={() => setAlgorithmPanelOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors text-xs cursor-pointer flex-shrink-0"
            title="패널 닫기"
          >
            ✕
          </button>
        </div>
      </div>


      {/* Add New Step Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (newStepText.trim()) {
            addAlgorithmStep(newStepText.trim(), 'process')
            setNewStepText('')
          }
        }}
        className="p-2 border-b border-slate-200 bg-white flex gap-2 justify-stretch shrink-0 relative z-10 shadow-sm"
      >
        <input
          type="text"
          value={newStepText}
          onChange={(e) => setNewStepText(e.target.value)}
          placeholder="단계를 입력하세요..."
          className="flex-1 text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={!newStepText.trim()}
          className="text-xs sm:text-sm bg-blue-50 text-blue-600 border border-blue-200 font-bold px-3 py-1.5 rounded-md hover:bg-blue-100 disabled:opacity-50 transition cursor-pointer whitespace-nowrap"
        >
          + 단계 추가
        </button>
      </form>

      {/* Steps List (Root Drop Target) */}
      <div
        ref={scrollContainerRef}
        onDragOver={(e) => handleContainerDragOver(e, 'root', algorithmSteps.length)}
        onDrop={handleDrop}
        className="flex-1 overflow-y-auto p-2 select-none space-y-1.5 bg-slate-50/50"
      >
        {algorithmSteps.length === 0 ? (
          <div className="text-center py-10 text-xs sm:text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            알고리즘 단계가 없습니다.<br />위 양식에서 단계를 추가해 보세요!
          </div>
        ) : (
          <>
            {algorithmSteps.map((step, idx) => renderStepCard(step, idx, false, undefined, undefined, 0))}
            {dropIndicator?.location === 'root' &&
              dropIndicator.index === algorithmSteps.length &&
              renderLivePreviewCard(draggedStep, 'root')}
          </>
        )}
      </div>

      {/* Right Edge Resize Handle */}
      <div
        onMouseDown={handleMouseDownResize}
        className={`absolute top-0 right-0 w-2.5 h-full cursor-col-resize z-20 transition-colors flex items-center justify-center group ${
          isResizing ? 'bg-blue-500' : 'hover:bg-blue-300/50'
        }`}
        title="마우스로 드래그하여 자연어 알고리즘 창 너비를 조절할 수 있습니다"
      >
        <div
          className={`w-0.5 h-8 rounded-full transition-colors ${
            isResizing ? 'bg-white' : 'bg-slate-300 group-hover:bg-blue-600'
          }`}
        />
      </div>
    </aside>
  )
}
