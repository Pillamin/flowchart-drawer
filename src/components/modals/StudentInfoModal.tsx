import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useFlowStore } from '../../store/flowStore'

interface StudentInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

/** 과제 내보내기 시 학번/이름 누락 방지 모달 */
export const StudentInfoModal: React.FC<StudentInfoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const student = useFlowStore(s => s.student)
  const setStudent = useFlowStore(s => s.setStudent)

  const isComplete = Boolean(student.name?.trim())

  const handleSaveAndExport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isComplete) return
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚠️ 학생 정보 입력 확인">
      <form onSubmit={handleSaveAndExport} className="flex flex-col gap-3.5">
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed shadow-2xs">
          <p className="font-bold mb-0.5 flex items-center gap-1 text-amber-900">
            <span>📢</span> 학번과 이름을 입력해 주세요!
          </p>
          <p className="text-[11px] text-amber-800">
            이름이 입력되지 않은 상태입니다. 내보낸 순서도 표지에 학생 정보가 표시되어 제출 시 유용합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
          <div>
            <label htmlFor="modal-flowchart-title" className="text-xs text-slate-700 font-bold block mb-1">
              🏷️ 순서도 제목
            </label>
            <input
              id="modal-flowchart-title"
              type="text"
              value={student.title || ''}
              onChange={e => setStudent({ title: e.target.value })}
              placeholder="예) 카운트다운 알고리즘"
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="modal-grade" className="text-xs text-slate-700 font-bold block mb-1 text-center">
                학년
              </label>
              <input
                id="modal-grade"
                type="text"
                value={student.grade}
                onChange={e => setStudent({ grade: e.target.value })}
                placeholder="1"
                maxLength={4}
                className="w-full text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>
            <div>
              <label htmlFor="modal-classNum" className="text-xs text-slate-700 font-bold block mb-1 text-center">
                반
              </label>
              <input
                id="modal-classNum"
                type="text"
                value={student.classNum}
                onChange={e => setStudent({ classNum: e.target.value })}
                placeholder="3"
                maxLength={4}
                className="w-full text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>
            <div>
              <label htmlFor="modal-number" className="text-xs text-slate-700 font-bold block mb-1 text-center">
                번호
              </label>
              <input
                id="modal-number"
                type="text"
                value={student.number}
                onChange={e => setStudent({ number: e.target.value })}
                placeholder="12"
                maxLength={4}
                className="w-full text-center text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="modal-name" className="text-xs text-slate-700 font-bold block mb-1 flex items-center justify-between">
              <span>👤 이름</span>
              <span className="text-[10px] text-rose-500 font-normal">*필수 입력</span>
            </label>
            <input
              id="modal-name"
              type="text"
              value={student.name}
              onChange={e => setStudent({ name: e.target.value })}
              placeholder="홍길동"
              maxLength={10}
              required
              autoFocus
              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button
            id="btn-export-anyway"
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            이름 없이 저장
          </Button>
          <Button
            id="btn-export-save"
            type="submit"
            variant="primary"
            size="sm"
            disabled={!isComplete}
          >
            확인 및 다운로드
          </Button>
        </div>
      </form>
    </Modal>
  )
}
