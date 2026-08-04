import React, { useCallback, useRef, useState, Component } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Canvas } from './components/Canvas'
import { RightPanel } from './components/RightPanel'
import { ClearModal } from './components/modals/ClearModal'
import { TemplateModal } from './components/modals/TemplateModal'
import { ValidationModal } from './components/modals/ValidationModal'
import { SimulationPanel } from './components/modals/SimulationPanel'
import { HelpModal, type HelpTopic } from './components/modals/HelpModal'
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
        <div style={{ padding: 32, background: '#FEF2F2', color: '#991B1B', fontFamily: 'monospace' }}>
          <h2>🚨 렌더링 오류 발생</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{String(this.state.error)}</pre>
          <button onClick={() => { localStorage.clear(); this.setState({ error: null }) }}
            style={{ marginTop: 16, padding: '8px 16px', background: '#DC2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            모두 지우고 다시 시작
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-canvas font-sans">
      {/* Top Toolbar */}
      <Toolbar
        onClearClick={() => setShowClear(true)}
        onValidateClick={handleValidate}
        onSimulateClick={handleSimulate}
      />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenHelp={(topic) => setHelpTopic(topic)} />
        <Canvas canvasRef={canvasRef} />
        <RightPanel
          canvasRef={canvasRef}
          onTemplateClick={() => setShowTemplate(true)}
        />
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
