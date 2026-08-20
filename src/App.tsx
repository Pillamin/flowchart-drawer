import React, { useCallback, useRef, useState, Component } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Sidebar } from './components/Sidebar'
import { AlgorithmPanel } from './components/AlgorithmPanel'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'
import { RightPanel } from './components/RightPanel'
import { ClearModal } from './components/modals/ClearModal'
import { TemplateModal } from './components/modals/TemplateModal'
import { ValidationModal } from './components/modals/ValidationModal'
import { SimulationPanel } from './components/modals/SimulationPanel'
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
  const simStatus = useFlowStore(s => s.simulation.status)
  const resetSimulation = useFlowStore(s => s.resetSimulation)

  const [showClear, setShowClear] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [helpTopic, setHelpTopic] = useState<HelpTopic | null>(null)
  const [legalType, setLegalType] = useState<LegalType | null>(null)
  
  // Mobile responsive states
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [isMobileRightPanelOpen, setMobileRightPanelOpen] = useState(false)

  // Hooks
  useUndoRedo()
  const { validate } = useValidation()
  const { start: startSim, stop: stopSim } = useSimulation()

  const handleValidate = useCallback(() => {
    const result = validate()
    setValidationResult(result)
    setShowValidation(true)
  }, [validate])

  const handleSimulate = useCallback(() => {
    const isRunning = simStatus === 'running' || simStatus === 'waiting'
    if (isRunning) {
      stopSim()
    } else {
      resetSimulation()
      startSim()
    }
  }, [simStatus, startSim, stopSim, resetSimulation])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas font-sans relative">
      {/* Top Toolbar */}
      <Toolbar
        onClearClick={() => setShowClear(true)}
        onValidateClick={handleValidate}
        onSimulateClick={handleSimulate}
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
        <AlgorithmPanel />
        
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
        
        {/* Sidebar Wrapper */}
        <div className={`transition-transform transform md:translate-x-0 absolute md:relative z-40 h-full ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:block'}`}>
          <Sidebar onOpenHelp={(topic) => setHelpTopic(topic)} />
        </div>

        <Canvas canvasRef={canvasRef} />
        
        {/* RightPanel Wrapper */}
        <div className={`transition-transform transform md:translate-x-0 absolute right-0 md:relative z-40 h-full ${isMobileRightPanelOpen ? 'translate-x-0' : 'translate-x-full md:block'}`}>
          <RightPanel
            canvasRef={canvasRef}
            onTemplateClick={() => setShowTemplate(true)}
            onOpenLegalModal={(type) => setLegalType(type)}
          />
        </div>
      </div>

      {/* Modals */}
      <ClearModal
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={clearCanvas}
      />
      <TemplateModal
        isOpen={showTemplate}
        onClose={() => setShowTemplate(false)}
      />
      <ValidationModal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        result={validationResult}
      />

      {/* Simulation overlay panel */}
      <SimulationPanel />

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
