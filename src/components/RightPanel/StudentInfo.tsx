import React from 'react'
import { useFlowStore } from '../../store/flowStore'

/** 학번/이름 입력 폼 (내보내기 이미지에 포함됨) */
export const StudentInfo: React.FC = () => {
  const student = useFlowStore(s => s.student)
  const setStudent = useFlowStore(s => s.setStudent)

  return (
    <section aria-label="학생 정보">
      <h3 className="text-xs font-bold text-text-placeholder uppercase tracking-wide mb-2">순서도 및 학생 정보</h3>
      
      <div className="mb-3">
        <label htmlFor="flowchart-title" className="text-[11px] text-text-placeholder font-bold block mb-0.5">순서도 제목</label>
        <input
          id="flowchart-title"
          type="text"
          value={student.title || ''}
          onChange={e => setStudent({ title: e.target.value })}
          placeholder="예) 최댓값 찾기"
          maxLength={30}
          className="w-full text-sm font-bold text-text-primary bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-selected focus:ring-1 focus:ring-selected/30 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {([
          { key: 'grade', label: '학년', placeholder: '1' },
          { key: 'classNum', label: '반', placeholder: '3' },
          { key: 'number', label: '번호', placeholder: '12' },
        ] as const).map(({ key, label, placeholder }) => (
          <div key={key}>
            <label htmlFor={`student-${key}`} className="text-[11px] text-text-placeholder font-bold block mb-0.5">{label}</label>
            <input
              id={`student-${key}`}
              type="text"
              value={student[key]}
              onChange={e => setStudent({ [key]: e.target.value })}
              placeholder={placeholder}
              maxLength={4}
              className="w-full text-sm font-bold text-text-primary bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-selected focus:ring-1 focus:ring-selected/30 transition-all"
            />
          </div>
        ))}
        <div className="col-span-1">
          <label htmlFor="student-name" className="text-[11px] text-text-placeholder font-bold block mb-0.5">이름</label>
          <input
            id="student-name"
            type="text"
            value={student.name}
            onChange={e => setStudent({ name: e.target.value })}
            placeholder="홍길동"
            maxLength={10}
            className="w-full text-sm font-bold text-text-primary bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-selected focus:ring-1 focus:ring-selected/30 transition-all"
          />
        </div>
      </div>
    </section>
  )
}
