import React, { useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { useFlowStore } from '../../store/flowStore'
import {
  exportPreviewDom,
  downloadText,
  getExportFilename
} from '../../utils/export'
import type { AlgorithmStep } from '../../types'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  snapshotUrl: string | null
}

type ExportFormat = 
  | 'INTEGRATED_PDF' 
  | 'INTEGRATED_PNG' 
  | 'FLOWCHART_PDF' 
  | 'FLOWCHART_PNG' 
  | 'NATURAL_TXT' 
  | 'NATURAL_COPY'

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, snapshotUrl }) => {
  const student = useFlowStore(s => s.student)
  const algorithmSteps = useFlowStore(s => s.algorithmSteps)
  
  const flowchartImage = snapshotUrl
  const previewA4Ref = useRef<HTMLDivElement>(null)
  const previewFlowchartRef = useRef<HTMLDivElement>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('INTEGRATED_PDF')
  const [previewMode, setPreviewMode] = useState<'FIT_PAGE' | 'FIT_WIDTH'>('FIT_PAGE')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleAction = async () => {
    setIsExporting(true)
    try {
      if (selectedFormat === 'NATURAL_COPY') {
        const text = generateAlgorithmText(algorithmSteps, student)
        await navigator.clipboard.writeText(text)
        showToast('클립보드에 복사되었습니다.')
      } else if (selectedFormat === 'NATURAL_TXT') {
        const text = generateAlgorithmText(algorithmSteps, student)
        downloadText(text, getExportFilename(student, '자연어', 'txt'))
        showToast('텍스트 파일 다운로드 완료')
      } else if (selectedFormat === 'FLOWCHART_PNG') {
        if (!previewFlowchartRef.current) return
        await exportPreviewDom('png', previewFlowchartRef.current, student, '순서도', false)
        showToast('순서도 PNG 다운로드 완료')
      } else if (selectedFormat === 'FLOWCHART_PDF') {
        if (!previewFlowchartRef.current) return
        await exportPreviewDom('pdf', previewFlowchartRef.current, student, '순서도', false)
        showToast('순서도 PDF 다운로드 완료')
      } else if (selectedFormat === 'INTEGRATED_PNG') {
        if (!previewA4Ref.current) return
        await exportPreviewDom('png', previewA4Ref.current, student, '', true, true)
        showToast('통합 PNG 다운로드 완료')
      } else if (selectedFormat === 'INTEGRATED_PDF') {
        if (!previewA4Ref.current) return
        await exportPreviewDom('pdf', previewA4Ref.current, student, '', true, true)
        showToast('통합 PDF 다운로드 완료')
      }
    } catch {
      showToast('작업 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  const renderFormatCard = (id: ExportFormat, title: string, desc: string, icon: string) => {
    const isSelected = selectedFormat === id
    return (
      <button
        onClick={() => setSelectedFormat(id)}
        className={`flex items-start gap-3 w-full text-left p-3 border rounded-xl transition-all cursor-pointer ${
          isSelected 
            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-sm' 
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{title}</span>
          <span className={`text-xs mt-0.5 ${isSelected ? 'text-blue-600/80' : 'text-slate-500'}`}>{desc}</span>
        </div>
      </button>
    )
  }

  const isIntegrated = selectedFormat === 'INTEGRATED_PDF' || selectedFormat === 'INTEGRATED_PNG'
  const isFlowchart = selectedFormat === 'FLOWCHART_PDF' || selectedFormat === 'FLOWCHART_PNG'
  const isNatural = selectedFormat === 'NATURAL_TXT' || selectedFormat === 'NATURAL_COPY'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="내보내기 및 저장" maxWidth="max-w-5xl">
      <div className="flex flex-col h-[75vh] min-h-[500px] max-h-[800px] bg-white rounded-b-2xl -mx-6 -my-5">
        <div className="flex flex-col md:flex-row gap-6 px-6 pb-6 pt-3 flex-1 min-h-0">
          
          {/* Left Column: Options (35%) */}
          <div className="w-full md:w-[35%] flex flex-col gap-6 overflow-y-auto pr-2">
            
            {/* 1. 통합 제출용 */}
            <section className="flex flex-col gap-2.5">
              <h3 className="text-sm font-bold text-blue-600 flex items-center gap-1">
                <span>⭐ 자연어+순서도 알고리즘 (A4)</span>
              </h3>
              <div className="flex flex-col gap-2">
                {renderFormatCard('INTEGRATED_PDF', 'PDF 문서', '수행평가 제출에 최적화된 형식', '📄')}
                {renderFormatCard('INTEGRATED_PNG', 'PNG 이미지', '웹이나 문서 삽입용 깔끔한 이미지', '🖼️')}
              </div>
            </section>

            {/* 2. 자연어 단독 */}
            <section className="flex flex-col gap-2.5 mt-2">
              <h3 className="text-sm font-bold text-slate-700">자연어 알고리즘</h3>
              <div className="flex flex-col gap-2">
                {renderFormatCard('NATURAL_TXT', 'TXT 파일', '텍스트 파일로 저장', '📝')}
                {renderFormatCard('NATURAL_COPY', '클립보드 복사', '보고서 등에 바로 붙여넣기', '📋')}
              </div>
            </section>

            {/* 3. 순서도 단독 */}
            <section className="flex flex-col gap-2.5 mt-2">
              <h3 className="text-sm font-bold text-slate-700">순서도 알고리즘</h3>
              <div className="flex flex-col gap-2">
                {renderFormatCard('FLOWCHART_PNG', 'PNG 이미지', '배경이 투명한 순서도 이미지', '🎨')}
                {renderFormatCard('FLOWCHART_PDF', 'PDF 문서', '확대해도 깨지지 않는 벡터 순서도', '📐')}
              </div>
            </section>

            {toastMessage && (
              <div className="mt-auto px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-200 rounded-xl text-center">
                {toastMessage}
              </div>
            )}
          </div>

          <div className={`w-full md:w-[65%] flex flex-col items-center bg-slate-100/80 border border-slate-200 rounded-2xl p-6 relative ${previewMode === 'FIT_WIDTH' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
            <div className="absolute top-4 left-6 flex items-center gap-2 z-10">
              <div className="px-3 py-1 bg-white/80 backdrop-blur text-slate-500 text-xs font-bold rounded-full border border-slate-200 shadow-sm">
                미리보기
              </div>
              <button
                onClick={() => setPreviewMode(p => p === 'FIT_WIDTH' ? 'FIT_PAGE' : 'FIT_WIDTH')}
                className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-full border border-slate-200 shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
              >
                {previewMode === 'FIT_WIDTH' ? '🖥️ 전체보기' : '↔️ 폭맞춤'}
              </button>
            </div>
            
            <div className={`w-full flex-1 flex flex-col items-center ${previewMode === 'FIT_PAGE' ? 'justify-center min-h-0' : 'justify-start mt-10'}`}>
              {isIntegrated && (
                <div
                  ref={previewA4Ref}
                  className="bg-white shadow-xl flex flex-col relative shrink-0"
                  style={{
                    width: previewMode === 'FIT_WIDTH' ? '100%' : 'auto',
                    height: previewMode === 'FIT_PAGE' ? '100%' : 'auto',
                    maxHeight: previewMode === 'FIT_PAGE' ? '100%' : 'none',
                    maxWidth: previewMode === 'FIT_WIDTH' ? '1000px' : '100%',
                    aspectRatio: '297 / 210',
                    padding: '5% 4%',
                  }}
                >
                <div className="flex flex-col gap-2 mb-6 border-b-2 border-slate-800 pb-4 shrink-0">
                  <h1 className="text-3xl font-black text-slate-800 text-center tracking-tight">
                    {student.title || '순서도 알고리즘'}
                  </h1>
                  <div className="flex justify-between items-end mt-4 text-sm font-bold text-slate-600 px-4">
                    <span>수행평가 제출용 (A4)</span>
                    <div className="flex gap-4 bg-slate-50 py-1.5 px-4 rounded-lg border border-slate-200">
                      <span>{student.grade ? `${student.grade}학년` : '___학년'}</span>
                      <span>{student.classNum ? `${student.classNum}반` : '___반'}</span>
                      <span>{student.number ? `${student.number}번` : '___번'}</span>
                      <span>{student.name || '이름: ____________'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row gap-6 flex-1 min-h-0">
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <h2 className="text-lg font-extrabold border-l-4 border-blue-500 pl-2">
                      1. 자연어 알고리즘
                    </h2>
                    <div className="flex-1 text-sm font-medium whitespace-pre-wrap leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 overflow-hidden">
                      {generateAlgorithmText(algorithmSteps)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <h2 className="text-lg font-extrabold border-l-4 border-blue-500 pl-2 shrink-0">
                      2. 순서도
                    </h2>
                    <div className="flex-1 flex items-center justify-center relative border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 p-2 min-h-0">
                      {flowchartImage ? (
                        <img
                          src={flowchartImage}
                          alt="Flowchart Preview"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm font-bold">순서도 스냅샷 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {isFlowchart && (
                <div 
                  ref={previewFlowchartRef}
                  className={`bg-white p-6 shadow-md rounded-xl border border-slate-200 w-full flex flex-col items-center justify-center shrink-0 ${previewMode === 'FIT_WIDTH' ? 'max-w-3xl min-h-[400px]' : 'h-full max-w-full'}`}
                >
                  <div className="flex flex-col gap-2 mb-6 border-b-2 border-slate-800 pb-4 shrink-0 w-full">
                    <h1 className="text-2xl font-black text-slate-800 text-center tracking-tight">
                      {student.title || '순서도 알고리즘'}
                    </h1>
                    <div className="flex justify-between items-end mt-4 text-sm font-bold text-slate-600 px-2">
                      <span>순서도 알고리즘</span>
                      <div className="flex gap-4 bg-slate-50 py-1.5 px-4 rounded-lg border border-slate-200">
                        <span>{student.grade ? `${student.grade}학년` : '___학년'}</span>
                        <span>{student.classNum ? `${student.classNum}반` : '___반'}</span>
                        <span>{student.number ? `${student.number}번` : '___번'}</span>
                        <span>{student.name || '이름: ____________'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full flex justify-center py-4 flex-1 min-h-0">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 p-4 inline-flex items-center justify-center w-full max-w-[70%] max-h-[400px]">
                      {flowchartImage ? (
                        <img
                          src={flowchartImage}
                          alt="Flowchart Only Preview"
                          className="max-w-full max-h-full object-contain drop-shadow-sm"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm font-bold my-10">순서도 스냅샷 없음</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isNatural && (
                <div className={`bg-white p-6 shadow-md rounded-xl border border-slate-200 w-full flex flex-col shrink-0 ${previewMode === 'FIT_WIDTH' ? 'max-w-3xl min-h-[400px]' : 'h-full max-w-full overflow-hidden'}`}>
                  <div className="flex flex-col gap-2 mb-6 border-b-2 border-slate-800 pb-4 shrink-0 w-full">
                    <h1 className="text-2xl font-black text-slate-800 text-center tracking-tight">
                      {student.title || '순서도 알고리즘'}
                    </h1>
                    <div className="flex justify-between items-end mt-4 text-sm font-bold text-slate-600 px-2">
                      <span>자연어 알고리즘</span>
                      <div className="flex gap-4 bg-slate-50 py-1.5 px-4 rounded-lg border border-slate-200">
                        <span>{student.grade ? `${student.grade}학년` : '___학년'}</span>
                        <span>{student.classNum ? `${student.classNum}반` : '___반'}</span>
                        <span>{student.number ? `${student.number}번` : '___번'}</span>
                        <span>{student.name || '이름: ____________'}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-medium whitespace-pre-wrap leading-relaxed text-slate-700 font-mono ${previewMode === 'FIT_PAGE' ? 'overflow-y-auto min-h-0 flex-1' : ''}`}>
                    {generateAlgorithmText(algorithmSteps, student)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-5 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleAction}
            disabled={isExporting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExporting ? '처리 중...' : '📥 파일 저장하기'}
          </button>
        </div>
      </div>
    </Modal>
  )
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

function generateAlgorithmText(steps: AlgorithmStep[], student?: any): string {
  if (steps.length === 0) return '작성된 알고리즘이 없습니다.'
  
  let result = ''
  
  if (student) {
    const title = student.title || '순서도 알고리즘'
    const info = [
      student.grade ? `${student.grade}학년` : '',
      student.classNum ? `${student.classNum}반` : '',
      student.number ? `${student.number}번` : '',
      student.name || '이름 없음'
    ].filter(Boolean).join(' ')
    
    result += `[ ${title} ]\n${info}\n\n`
  }

  const formatSteps = (list: AlgorithmStep[], depth = 0) => {
    const prefix = ' '.repeat(depth * 4)
    list.forEach((step, idx) => {
      const num = getStepNumber(depth, idx)
      result += `${prefix}${num} ${step.text}\n`
      
      if (step.kind === 'decision') {
        if (step.yesSteps && step.yesSteps.length > 0) {
          result += `${prefix}  (예)인 경우:\n`
          formatSteps(step.yesSteps, depth + 1)
        }
        if (step.noSteps && step.noSteps.length > 0) {
          result += `${prefix}  (아니오)인 경우:\n`
          formatSteps(step.noSteps, depth + 1)
        }
      }
      if (step.kind === 'loop' && step.yesSteps && step.yesSteps.length > 0) {
        result += `${prefix}  [반복]:\n`
        formatSteps(step.yesSteps, depth + 1)
      }
    })
  }

  formatSteps(steps)
  return result.trim()
}
