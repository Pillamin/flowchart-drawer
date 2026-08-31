import React from 'react'
import { Button } from '../ui/Button'
import { useFlowStore } from '../../store/flowStore'

interface ToolbarProps {
  onValidateClick: () => void
  onSimulateClick: () => void
  onToggleSidebar?: () => void
  onToggleRightPanel?: () => void
}

/** 상단 툴바: 앱 타이틀 + 주요 액션 버튼들 */
export const Toolbar: React.FC<ToolbarProps> = ({ onValidateClick, onSimulateClick, onToggleSidebar, onToggleRightPanel }) => {
  const simStatus = useFlowStore(s => s.simulation.status)
  const isAlgorithmPanelOpen = useFlowStore(s => s.isAlgorithmPanelOpen)
  const toggleAlgorithmPanel = useFlowStore(s => s.toggleAlgorithmPanel)

  const isSimRunning = simStatus === 'running' || simStatus === 'waiting'

  return (
    <header className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 h-14 bg-white border-b border-slate-200 shadow-2xs flex-shrink-0 z-10 whitespace-nowrap">
      
      {/* Mobile Sidebar Toggle */}
      {onToggleSidebar && (
        <button 
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-base flex-shrink-0"
          title="도형 팔레트 열기"
        >
          ☰
        </button>
      )}

      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-1 md:mr-3 flex-shrink-0">
        <span className="text-xl sm:text-2xl">🔷</span>
        <div className="hidden sm:block">
          <h1 className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">Flowchart Drawer</h1>
          <p className="text-[10px] font-bold text-slate-400 leading-none">순서도 그리기</p>
        </div>
      </div>

      <div className="hidden sm:block w-px h-6 bg-slate-200 mx-0.5 flex-shrink-0" />

      {/* Natural Language Algorithm Panel Toggle Switch (자연어 알고리즘 버튼) */}
      <button
        type="button"
        id="btn-algorithm-panel-toggle"
        onClick={toggleAlgorithmPanel}
        className={`flex-shrink-0 h-8 px-2.5 rounded-full border cursor-pointer select-none transition-all outline-none flex items-center gap-1.5 ${
          isAlgorithmPanelOpen
            ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-200 shadow-2xs'
            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
        }`}
        title="자연어 알고리즘 패널 열기/닫기 토글"
      >
        <span className="text-sm flex-shrink-0">📝</span>
        <span className={`text-xs font-bold whitespace-nowrap ${isAlgorithmPanelOpen ? 'text-blue-900' : 'text-slate-800'}`}>
          자연어 알고리즘
        </span>
        
        {/* Toggle Switch Track */}
        <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 flex-shrink-0 ${
          isAlgorithmPanelOpen ? 'bg-blue-600' : 'bg-slate-400'
        }`}>
          {/* Toggle Switch Knob */}
          <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-2xs ${
            isAlgorithmPanelOpen ? 'translate-x-3' : 'translate-x-0'
          }`} />
        </div>
        
        {/* Fixed width ON/OFF text container (너비 24px 고정으로 메뉴 위치 이동 완벽 방지) */}
        <span className={`w-6 text-center text-[11px] font-black leading-none flex-shrink-0 ${
          isAlgorithmPanelOpen ? 'text-blue-700' : 'text-slate-500'
        }`}>
          {isAlgorithmPanelOpen ? 'ON' : 'OFF'}
        </span>
      </button>

      <div className="flex-1 min-w-[8px]" />

      {/* Validate (검사하기 - 테스트 블록과 동일한 Primary UI 스타일 적용) */}
      <Button
        id="btn-validate"
        variant="primary"
        size="sm"
        onClick={onValidateClick}
        icon={<span className="text-sm">🔍</span>}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-bold text-xs px-2.5 py-1.5 flex-shrink-0"
      >
        <span className="inline">검사하기</span>
      </Button>

      {/* Simulate (실행 해보기) */}
      <Button
        id="btn-simulate"
        variant={isSimRunning ? 'danger' : 'primary'}
        size="sm"
        onClick={onSimulateClick}
        icon={<span className="text-sm">{isSimRunning ? '⏹' : '▶'}</span>}
        className={!isSimRunning ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs font-bold text-xs px-2.5 py-1.5 flex-shrink-0' : 'font-bold text-xs px-2.5 py-1.5 flex-shrink-0'}
      >
        <span className="inline">{isSimRunning ? '시뮬레이션 중지' : '실행 해보기'}</span>
      </Button>

      {/* Mobile RightPanel Toggle */}
      {onToggleRightPanel && (
        <button 
          onClick={onToggleRightPanel}
          className="md:hidden ml-1 p-1.5 text-slate-500 hover:bg-slate-100 rounded-md text-base flex-shrink-0"
          title="설정 패널 열기"
        >
          ⚙️
        </button>
      )}
    </header>
  )
}
