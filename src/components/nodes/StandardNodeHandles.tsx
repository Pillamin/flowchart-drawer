import React from 'react'
import { Handle, Position } from '@xyflow/react'

interface NodeHandlesProps {
  isHovered?: boolean
  selected?: boolean
  offsets?: {
    top?: { left?: number | string }
    bottom?: { left?: number | string }
    left?: { left?: number | string }
    right?: { left?: number | string; right?: number | string }
  }
}

/** 
 * 시작/끝, 입출력, 처리, 판단 도형 공통 노드 포트 (상, 하, 좌, 우 4개)
 * - 도형 위에 마우스를 올렸을 때만 노드 포트가 나타남 (opacity 0 -> 1)
 * - 노드 포트에 마우스를 올리면 제자리 정중앙 확대(scale 1.45) 및 파란색 강조
 * - 노드를 드래그하면 흐름선 생성
 */
export const StandardNodeHandles: React.FC<NodeHandlesProps> = ({
  isHovered = false,
  selected = false,
  offsets,
}) => {
  const isVisible = isHovered || selected

  const baseStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    backgroundColor: selected ? '#3B82F6' : '#64748B',
    border: '2px solid #FFFFFF',
    opacity: isVisible ? 1 : 0,
    pointerEvents: 'all',
    zIndex: 20,
  }

  // Handle의 기본 CSS 클래스
  const handleClassName = "w-2.5 h-2.5 !min-w-[10px] !min-h-[10px] relative"

  return (
    <>
      {/* Target (수신 포트) */}
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.top?.left !== undefined ? { left: offsets.top.left } : {}) }}
      />
      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.bottom?.left !== undefined ? { left: offsets.bottom.left } : {}) }}
      />
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.left?.left !== undefined ? { left: offsets.left.left } : {}) }}
      />
      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.right?.right !== undefined ? { right: offsets.right.right } : offsets?.right?.left !== undefined ? { left: offsets.right.left } : {}) }}
      />

      {/* Source (출발 포트) */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.top?.left !== undefined ? { left: offsets.top.left } : {}) }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.bottom?.left !== undefined ? { left: offsets.bottom.left } : {}) }}
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.left?.left !== undefined ? { left: offsets.left.left } : {}) }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className={handleClassName}
        style={{ ...baseStyle, ...(offsets?.right?.right !== undefined ? { right: offsets.right.right } : offsets?.right?.left !== undefined ? { left: offsets.right.left } : {}) }}
      />
    </>
  )
}

