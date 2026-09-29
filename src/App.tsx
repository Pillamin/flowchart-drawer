import React, { useCallback, useRef, useState, Component } from 'react'
import { ReactFlowProvider, useReactFlow } from '@xyflow/react'
import { Sidebar } from './components/Sidebar'
import { AlgorithmPanel } from './components/AlgorithmPanel'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'
import { RightPanel } from './components/RightPanel'
import { ClearModal } from './components/modals/ClearModal'
import { ClearAlgorithmModal } from './components/modals/ClearAlgorithmModal'
import { ClearAllModal } from './components/modals/ClearAllModal'
import { TemplateModal } from './components/modals/TemplateModal'
import { ExportModal } from './components/modals/ExportModal'
import { HelpModal, type HelpTopic } from './components/modals/HelpModal'
import { LegalModal, type LegalType } from './components/modals/LegalModal'
import { useFlowStore } from './store/flowStore'
import { useUndoRedo } from './hooks/useUndoRedo'
import { useValidation } from './hooks/useValidation'
import { useSimulation } from './hooks/useSimulation'
import type { ValidationResult } from './types'

// 실제 런타임 오류를 화면에 표시하는 에러 경계
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, background: '#FEF2F2', color: '#991B1B', fontFamily: '"Nanum Square Round", sans-serif', textAlign: 'center', marginTop: '20vh' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>🚨 오류가 발생했어요!</h2>
          <p style={{ fontSize: '14px', marginBottom: '24px' }}>
            화면을 그리는 도중 예기치 않은 문제가 생겼습니다.<br />
            아래 버튼을 눌러 초기화하고 다시 시작해 주세요.
          </p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ padding: '10px 20px', background: '#DC2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>
            모두 지우고 다시 시작하기
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const AppInner: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const clearCanvas = useFlowStore(s => s.clearCanvas)
  const clearAlgorithmSteps = useFlowStore(s => s.clearAlgorithmSteps)
  const simStatus = useFlowStore(s => s.simulation.status)
  const resetSimulation = useFlowStore(s => s.resetSimulation)

  const [showClear, setShowClear] = useState(false)
  const [showAlgorithmClear, setShowAlgorithmClear] = useState(false)
  const [showClearAll, setShowClearAll] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportSnapshot, setExportSnapshot] = useState<string | null>(null)
  const [isExportingSnapshot, setIsExportingSnapshot] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null)
  const [legalType, setLegalType] = useState<LegalType | null>(null)
  
  // Mobile responsive states
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isMobileRightPanelOpen, setMobileRightPanelOpen] = useState(false)
  
  // Desktop panel states
  const [isDesktopRightPanelCollapsed, setIsDesktopRightPanelCollapsed] = useState(true)

  // Hooks
  useUndoRedo()
  const { validate } = useValidation()
  const { start: startSim, stop: stopSim } = useSimulation()
  const { fitView } = useReactFlow()
  const past = useFlowStore(s => s.past)
  const future = useFlowStore(s => s.future)
  const undo = useFlowStore(s => s.undo)
  const redo = useFlowStore(s => s.redo)
  const nodes = useFlowStore(s => s.nodes)
  const student = useFlowStore(s => s.student)

  const handleValidate = useCallback(() => {
    setIsDesktopRightPanelCollapsed(false)
    resetSimulation()
    const result = validate()
    setValidationResult(result)
  }, [validate, resetSimulation])

  const handleSimulate = useCallback(() => {
    setIsDesktopRightPanelCollapsed(false)
    const isRunning = simStatus === 'running' || simStatus === 'waiting'
    if (isRunning) {
      stopSim()
    } else {
      setValidationResult(null)
      resetSimulation()
      startSim()
    }
  }, [simStatus, startSim, stopSim, resetSimulation])

  const handleClearAllConfirm = useCallback(() => {
    clearAlgorithmSteps()
    clearCanvas()
    resetSimulation()
    setValidationResult(null)
  }, [clearAlgorithmSteps, clearCanvas, resetSimulation, setValidationResult])

  const handleExportClick = async () => {
    if (!canvasRef.current) return
    setIsExportingSnapshot(true)
    try {
      const { getFlowchartDataUrl } = await import('./utils/export')
      const url = await getFlowchartDataUrl(canvasRef.current, student)
      setExportSnapshot(url)
      setShowExportModal(true)
    } finally {
      setIsExportingSnapshot(false)
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas font-sans relative">
      {/* Top Toolbar */}
      <Toolbar
        onValidateClick={handleValidate}
        onSimulateClick={handleSimulate}
        onExportClick={handleExportClick}
        onClearAllClick={() => setShowClearAll(true)}
        isExportingSnapshot={isExportingSnapshot}
        onToggleSidebar={() => {
          setMobileSidebarOpen(prev => !prev)
          setMobileRightPanelOpen(false)
        }}
        onToggleRightPanel={() => {
          setMobileRightPanelOpen(prev => !prev)
          setMobileSidebarOpen(false)
        }}
      />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <AlgorithmPanel onClearClick={() => setShowAlgorithmClear(true)} />
        
        {/* Mobile Sidebar Overlay Background */}
        {(isMobileSidebarOpen || isMobileRightPanelOpen) && (
          <div 
            className="md:hidden absolute inset-0 bg-slate-900/20 z-30 transition-opacity" 
            onClick={() => {
              setMobileSidebarOpen(false)
              setMobileRightPanelOpen(false)
            }} 
          />
        )}
        
        {/* Flowchart Container (Sidebar + Canvas + Header) */}
        <div className="flex flex-1 flex-col relative min-w-0">
          {/* Flowchart Header */}
          <div className="flex items-center justify-between px-3.5 border-b border-slate-200 bg-slate-50/90 flex-shrink-0 gap-2 h-[52px]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl flex-shrink-0">🔲</span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-800 leading-tight truncate">순서도 알고리즘</h2>
              </div>
            </div>
            
            {/* Left Tools */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button onClick={undo} disabled={past.length === 0} className="w-8 h-7 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-sm font-bold transition-colors flex items-center justify-center cursor-pointer" title="실행 취소"><span>↩</span></button>
                <div className="w-px h-4 bg-slate-200 my-auto" />
                <button onClick={redo} disabled={future.length === 0} className="w-8 h-7 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-sm font-bold transition-colors flex items-center justify-center cursor-pointer" title="다시 실행"><span>↪</span></button>
              </div>
              <button onClick={() => { fitView({ padding: 0.15, duration: 400 }) }} className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1.5" title="화면에 맞추기">
                <span className="text-xs">⊡</span><span className="hidden sm:inline">전체보기</span>
              </button>
              <button onClick={() => setShowClear(true)} disabled={nodes.length === 0} className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200 rounded-lg transition-colors text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1.5" title="캔버스 지우기">
                <span className="text-xs">🗑</span><span className="hidden sm:inline">지우기</span>
              </button>
            </div>
          </div>
          
          {/* Flowchart Content */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Sidebar Wrapper */}
            <div className={`transition-transform transform md:translate-x-0 absolute md:relative z-40 h-full ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:block'}`}>
              <Sidebar onOpenHelp={(topic) => setHelpTopic(topic)} onOpenLegalModal={(type) => setLegalType(type)} />
            </div>

            <Canvas canvasRef={canvasRef} />
          </div>
        </div>
        
        {/* RightPanel Wrapper */}
        <div className={`transition-transform transform md:translate-x-0 absolute right-0 md:relative z-40 h-full ${isMobileRightPanelOpen ? 'translate-x-0' : 'translate-x-full md:block'}`}>
          <RightPanel
            canvasRef={canvasRef}
            isCollapsed={isDesktopRightPanelCollapsed}
            onToggleCollapse={() => setIsDesktopRightPanelCollapsed(prev => !prev)}
            onTemplateClick={() => setShowTemplate(true)}
            validationResult={validationResult}
            onClearValidation={() => setValidationResult(null)}
          />
        </div>
      </div>

      {/* Modals */}
      <ClearModal
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={clearCanvas}
      />
      <ClearAlgorithmModal
        isOpen={showAlgorithmClear}
        onClose={() => setShowAlgorithmClear(false)}
        onConfirm={clearAlgorithmSteps}
      />
      <ClearAllModal
        isOpen={showClearAll}
        onClose={() => setShowClearAll(false)}
        onConfirm={handleClearAllConfirm}
      />
      <TemplateModal
        isOpen={showTemplate}
        onClose={() => setShowTemplate(false)}
      />
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          snapshotUrl={exportSnapshot}
        />
      )}

      {/* Help Modal */}
      <HelpModal
        topic={helpTopic}
        onClose={() => setHelpTopic(null)}
      />

      {/* Legal Modal (Terms of Service / Privacy Policy) */}
      <LegalModal
        type={legalType}
        onClose={() => setLegalType(null)}
      />
    </div>
  )
}

const App: React.FC = () => (
  <ErrorBoundary>
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  </ErrorBoundary>
)

export default App
