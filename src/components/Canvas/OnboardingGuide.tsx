import React from 'react'

/** 캔버스가 비어있을 때 표시되는 온보딩 안내 */
export const OnboardingGuide: React.FC = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-0">
    <div className="flex flex-col items-center gap-4 text-center max-w-xs animate-pulse-slow">
      <div className="text-6xl opacity-30">📋</div>
      <div>
        <p className="text-lg font-bold text-slate-400">시작 도형을 여기로 끌어다 놓으세요!</p>
        <p className="text-sm text-slate-300 mt-1">왼쪽 도형 상자에서 '시작/끝' 도형을 드래그해 시작해보세요.</p>
      </div>
      <div className="flex gap-2 text-xs text-slate-300">
        <span>↩ Ctrl+Z 되돌리기</span>
        <span>·</span>
        <span>Delete 삭제</span>
        <span>·</span>
        <span>더블클릭 텍스트 편집</span>
      </div>
    </div>
  </div>
)
