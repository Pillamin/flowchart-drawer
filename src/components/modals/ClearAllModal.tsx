import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ClearAllModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="🗑 전체 지우기">
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-primary leading-relaxed">
        자연어 알고리즘, 순서도 캔버스, 그리고 실행/디버깅 결과가 모두 지워져요.<br />
        <strong>이 작업은 되돌릴 수 없어요. 계속할까요?</strong>
      </p>
      <div className="flex gap-2 justify-end">
        <Button id="btn-clear-all-cancel" variant="secondary" onClick={onClose}>취소</Button>
        <Button id="btn-clear-all-confirm" variant="danger" onClick={() => { onConfirm(); onClose() }}>
          전체 지우기
        </Button>
      </div>
    </div>
  </Modal>
)
