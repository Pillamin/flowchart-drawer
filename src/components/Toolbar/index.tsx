import React from 'react'
import { useFlowStore } from '../../store/flowStore'
import { HeaderInputs } from './HeaderInputs'

interface ToolbarProps {
  onValidateClick: () => void
  onSimulateClick: () => void
  onExportClick: () => void
  isExportingSnapshot?: boolean
  onToggleSidebar?: () => void
  onToggleRightPanel?: () => void
}

/** 상단 툴바: 앱 타이틀 + 주요 액션 버튼들 */
export const Toolbar: React.FC<ToolbarProps> = ({ onValidateClick, onSimulateClick, onExportClick, isExportingSnapshot, onToggleSidebar, onToggleRightPanel }) => {
  const simStatus = useFlowStore(s => s.simulation.status)
  const isSimRunning = simStatus === 'running' || simStatus === 'waiting'
  const isAlgorithmPanelOpen = useFlowStore(s => s.isAlgorithmPanelOpen)
  const toggleAlgorithmPanel = useFlowStore(s => s.toggleAlgorithmPanel)

  return (
    <header className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 h-14 bg-white border-b border-slate-300 shadow-2xs flex-shrink-0 z-10 whitespace-nowrap">
      
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

      {/* Center Inputs */}
      <div className="hidden lg:flex max-w-3xl flex-1 mx-2">
        <HeaderInputs />
      </div>
      
      <div className="flex-1 min-w-[8px]" />

      {/* Validate (검사하기) */}
      <button
        id="btn-validate"
        onClick={onValidateClick}
        className="px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-colors text-sm font-extrabold cursor-pointer flex items-center gap-1.5 flex-shrink-0"
      >
        <span className="text-sm">🔍</span>
        <span className="hidden xl:inline">검사하기</span>
      </button>

      {/* Simulate (실행 해보기) */}
      <button
        id="btn-simulate"
        onClick={onSimulateClick}
        className={`px-3 py-1.5 rounded-lg border transition-colors text-sm font-extrabold cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
          isSimRunning 
            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200' 
            : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-indigo-200'
        }`}
      >
        <span className="text-sm">{isSimRunning ? '⏹' : '▶'}</span>
        <span className="hidden xl:inline">{isSimRunning ? '시뮬레이션 중지' : '실행 해보기'}</span>
      </button>

      {/* Export (내보내기) */}
      <button
        onClick={onExportClick}
        disabled={isExportingSnapshot}
        className={`ml-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-extrabold cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
          isExportingSnapshot
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200'
        }`}
        title="내보내기"
      >
        <span className="text-sm">{isExportingSnapshot ? '⏳' : '📤'}</span> 
        <span className="hidden xl:inline">{isExportingSnapshot ? '준비중...' : '내보내기'}</span>
      </button>

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
