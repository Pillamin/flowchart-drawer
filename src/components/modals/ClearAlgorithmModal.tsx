import React from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface ClearAlgorithmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export const ClearAlgorithmModal: React.FC<ClearAlgorithmModalProps> = ({ isOpen, onClose, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="🗑 자연어 알고리즘 초기화">
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-primary leading-relaxed">
        작성하신 자연어 알고리즘 단계들이 모두 지워져요.<br />
        <strong>되돌리기(Ctrl+Z)로 복원할 수 있어요.</strong>
      </p>
      <div className="flex gap-2 justify-end">
        <Button id="btn-alg-clear-cancel" variant="secondary" onClick={onClose}>취소</Button>
        <Button id="btn-alg-clear-confirm" variant="danger" onClick={() => { onConfirm(); onClose() }}>
          초기화하기
        </Button>
      </div>
    </div>
  </Modal>
)
