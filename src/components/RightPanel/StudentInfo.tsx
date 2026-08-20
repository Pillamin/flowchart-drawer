import React from 'react'
import { useFlowStore } from '../../store/flowStore'

/** 학번/이름 입력 폼 (내보내기 이미지에 포함됨) */
export const StudentInfo: React.FC = () => {
  const student = useFlowStore(s => s.student)
  const setStudent = useFlowStore(s => s.setStudent)

  return (
    <section aria-label="순서도 및 학생 정보" className="flex flex-col gap-4">
      {/* Title Header */}
      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
        <span className="text-base">📋</span>
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">순서도 및 학생 정보</h3>
      </div>

      {/* Flowchart Title Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="flowchart-title" className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <span>🏷️</span> 순서도 제목
        </label>
        <input
          id="flowchart-title"
          type="text"
          value={student.title || ''}
          onChange={e => setStudent({ title: e.target.value })}
          placeholder="예) 최댓값 구하기 알고리즘"
          maxLength={30}
          className="w-full text-sm font-bold text-slate-800 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition-all"
        />
      </div>

      {/* Grade, Class, Number in 3-column Grid */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <span>🎓</span> 학번 정보
        </span>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'grade', label: '학년', placeholder: '1' },
            { key: 'classNum', label: '반', placeholder: '3' },
            { key: 'number', label: '번호', placeholder: '12' },
          ] as const).map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs text-slate-400 font-bold text-center">{label}</span>
              <input
                id={`student-${key}`}
                type="text"
                value={student[key]}
                onChange={e => setStudent({ [key]: e.target.value })}
                placeholder={placeholder}
                maxLength={4}
                className="w-full text-center text-sm font-bold text-slate-800 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-xl py-2 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Name Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="student-name" className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <span>👤</span> 학생 이름
        </label>
        <input
          id="student-name"
          type="text"
          value={student.name}
          onChange={e => setStudent({ name: e.target.value })}
          placeholder="홍길동"
          maxLength={10}
          className="w-full text-sm font-bold text-slate-800 bg-slate-50/80 hover:bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 transition-all"
        />
      </div>
    </section>
  )
}
