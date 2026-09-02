import React from 'react'

export const HeaderInputs: React.FC = () => {
  return (
    <div className="flex items-center gap-1 flex-1 justify-center mx-2 max-w-4xl">
      {/* 1. 추상화 */}
      <button 
        onClick={() => window.open('https://abstraction-brown.vercel.app/', '_blank')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.9rem] font-semibold text-slate-600 bg-transparent hover:text-indigo-600 hover:bg-indigo-50/70 transition-all duration-200"
      >
        <span>🧩</span>
        <span>추상화</span>
      </button>

      {/* 구분선 */}
      <div className="w-px h-3.5 bg-slate-300 mx-1"></div>

      {/* 2. 알고리즘 */}
      <button 
        onClick={() => window.open('https://algorithm-two-pi.vercel.app/', '_blank')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.9rem] font-semibold text-slate-600 bg-transparent hover:text-indigo-600 hover:bg-indigo-50/70 transition-all duration-200"
      >
        <span>📜</span>
        <span>알고리즘</span>
      </button>

      {/* 구분선 */}
      <div className="w-px h-3.5 bg-slate-300 mx-1"></div>

      {/* 3. 알고리즘 작성 (현재 사이트 활성화 상태) */}
      <button 
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.9rem] font-semibold bg-indigo-100 text-indigo-800 transition-all duration-200 cursor-pointer"
      >
        <span>✍️</span>
        <span>알고리즘 작성</span>
      </button>

      {/* 구분선 */}
      <div className="w-px h-3.5 bg-slate-300 mx-1"></div>

      {/* 4. 알고리즘 분석 */}
      <button 
        onClick={() => window.open('https://updown-algorithm-analysis.vercel.app/', '_blank')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[0.9rem] font-semibold text-slate-600 bg-transparent hover:text-indigo-600 hover:bg-indigo-50/70 transition-all duration-200"
      >
        <span>📊</span>
        <span>알고리즘 분석</span>
      </button>
    </div>
  )
}

