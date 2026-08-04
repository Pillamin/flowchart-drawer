import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TEMPLATES } from '../../constants/templates'
import { useFlowStore } from '../../store/flowStore'
import type { FlowTemplate } from '../../types'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose }) => {
  const loadTemplate = useFlowStore(s => s.loadTemplate)

  const handleLoad = (template: FlowTemplate) => {
    loadTemplate(template.nodes, template.edges)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📂 예시 템플릿 불러오기" maxWidth="max-w-lg">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-placeholder">
          아래 예시를 불러오면 현재 작업이 덮어씌워져요. (되돌리기 가능)
        </p>
        {TEMPLATES.map(template => (
          <div
            key={template.id}
            className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-selected hover:bg-blue-50/50 transition-all"
          >
            <div className="flex-1">
              <div className="font-bold text-sm text-text-primary">{template.name}</div>
              <div className="text-xs text-text-placeholder mt-0.5 leading-relaxed">{template.description}</div>
            </div>
            <Button
              id={`btn-template-${template.id}`}
              variant="primary"
              size="sm"
              onClick={() => handleLoad(template)}
            >
              불러오기
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
