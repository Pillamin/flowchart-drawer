import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { ValidationResult } from '../../types'

interface ValidationModalProps {
  isOpen: boolean
  onClose: () => void
  result: ValidationResult | null
}

export const ValidationModal: React.FC<ValidationModalProps> = ({ isOpen, onClose, result }) => {
  if (!result) return null

  const errors = result.issues.filter(i => i.severity === 'error')
  const warnings = result.issues.filter(i => i.severity === 'warning')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔍 순서도 검사 결과" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        {/* Summary badge */}
        <div className={`flex items-center gap-3 p-3 rounded-xl ${result.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <span className="text-2xl">{result.isValid ? '✅' : '❌'}</span>
          <div>
            <div className={`font-bold text-sm ${result.isValid ? 'text-green-700' : 'text-red-700'}`}>
              {result.isValid ? '완벽해요! 오류가 없어요.' : `오류 ${errors.length}개, 경고 ${warnings.length}개가 있어요.`}
            </div>
            {result.isValid && warnings.length > 0 && (
              <div className="text-xs text-yellow-600 mt-0.5">경고 {warnings.length}개가 있지만 제출은 가능해요.</div>
            )}
          </div>
        </div>

        {/* Issues list */}
        {result.issues.length > 0 && (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {[...errors, ...warnings].map(issue => (
              <div
                key={issue.id}
                className={`flex gap-2.5 p-3 rounded-lg text-sm ${
                  issue.severity === 'error'
                    ? 'bg-red-50 border border-red-100 text-red-800'
                    : 'bg-yellow-50 border border-yellow-100 text-yellow-800'
                }`}
              >
                <span className="flex-shrink-0 text-base">{issue.severity === 'error' ? '❌' : '⚠️'}</span>
                <span className="leading-relaxed">{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button id="btn-validation-close" variant="primary" onClick={onClose}>확인</Button>
        </div>
      </div>
    </Modal>
  )
}
