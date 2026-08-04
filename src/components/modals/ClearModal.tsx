import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ClearModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ClearModal: React.FC<ClearModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="🗑 캔버스 초기화">
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-primary leading-relaxed">
        캔버스의 모든 도형과 화살표가 지워져요.<br />
        <strong>되돌리기(Ctrl+Z)로 복원할 수 있어요.</strong>
      </p>
      <div className="flex gap-2 justify-end">
        <Button id="btn-clear-cancel" variant="secondary" onClick={onClose}>취소</Button>
        <Button id="btn-clear-confirm" variant="danger" onClick={() => { onConfirm(); onClose() }}>
          초기화하기
        </Button>
      </div>
    </div>
  </Modal>
)
