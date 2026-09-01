import React from 'react'
import { useFlowStore } from '../../store/flowStore'

export const HeaderInputs: React.FC = () => {
  const student = useFlowStore(s => s.student)
  const setStudent = useFlowStore(s => s.setStudent)

  return (
    <div className="flex items-center gap-3 flex-1 justify-center mx-2 max-w-4xl">
      {/* Title */}
      <div className="flex items-center gap-1.5 min-w-[240px] max-w-[380px] w-full">
        <span className="text-sm">🏷️</span>
        <input
          type="text"
          value={student.title || ''}
          onChange={e => setStudent({ title: e.target.value })}
          placeholder="순서도 제목"
          maxLength={30}
          className="w-full text-sm font-bold text-slate-800 bg-slate-200/90 hover:bg-slate-300/80 border-transparent rounded-lg px-3 py-1.5 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-500 transition-all shadow-inner"
        />
      </div>

      <div className="w-px h-5 bg-slate-200" />

      {/* Grade / Class / Number */}
      <div className="flex items-center gap-2">
        <span className="text-sm">🎓</span>
        <input
          type="text"
          value={student.grade || ''}
          onChange={e => setStudent({ grade: e.target.value })}
          placeholder="학년"
          maxLength={1}
          className="w-12 text-center text-sm font-bold text-slate-800 bg-slate-200/90 hover:bg-slate-300/80 border-transparent rounded-lg px-2 py-1.5 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-500 transition-all shadow-inner"
        />
        <input
          type="text"
          value={student.classNum || ''}
          onChange={e => setStudent({ classNum: e.target.value })}
          placeholder="반"
          maxLength={2}
          className="w-12 text-center text-sm font-bold text-slate-800 bg-slate-200/90 hover:bg-slate-300/80 border-transparent rounded-lg px-2 py-1.5 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-500 transition-all shadow-inner"
        />
        <input
          type="text"
          value={student.number || ''}
          onChange={e => setStudent({ number: e.target.value })}
          placeholder="번호"
          maxLength={2}
          className="w-12 text-center text-sm font-bold text-slate-800 bg-slate-200/90 hover:bg-slate-300/80 border-transparent rounded-lg px-2 py-1.5 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-500 transition-all shadow-inner"
        />
      </div>

      <div className="w-px h-5 bg-slate-200" />

      {/* Name */}
      <div className="flex items-center gap-1.5 min-w-[120px] max-w-[180px] w-full">
        <span className="text-sm">👤</span>
        <input
          type="text"
          value={student.name || ''}
          onChange={e => setStudent({ name: e.target.value })}
          placeholder="이름"
          maxLength={10}
          className="w-full text-sm font-bold text-slate-800 bg-slate-200/90 hover:bg-slate-300/80 border-transparent rounded-lg px-3 py-1.5 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-500 transition-all shadow-inner"
        />
      </div>
    </div>
  )
}

