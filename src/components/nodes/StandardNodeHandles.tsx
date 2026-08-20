import React from 'react'
import { Handle, Position } from '@xyflow/react'

import { useFlowStore } from '../../store/flowStore'

interface NodeHandlesProps {
  nodeId: string
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
  nodeId,
  isHovered = false,
  selected = false,
  offsets,
}) => {
  const isDraggingEdgeEndpoint = useFlowStore(s => s.isDraggingEdgeEndpoint)
  const isVisible = isHovered || selected || isDraggingEdgeEndpoint
  
  // Find which handle positions (top, bottom, left, right) are currently connected
  const edges = useFlowStore(s => s.edges)

  const connectedPositions = new Set<string>()
  edges.forEach(e => {
    if (e.source === nodeId && e.sourceHandle) connectedPositions.add(e.sourceHandle.replace('target-', ''))
    if (e.target === nodeId && e.targetHandle) connectedPositions.add(e.targetHandle.replace('target-', ''))
  })

  const isPositionConnected = (handleId: string) => connectedPositions.has(handleId.replace('target-', ''))

  const getStyle = (handleId: string): React.CSSProperties => {
    const connected = isPositionConnected(handleId)
    // 흐름선 끝점 드래그 중엔 연결 여부와 무관하게 모든 포트 표시
    const forceShow = isDraggingEdgeEndpoint
    return {
      width: 10,
      height: 10,
      backgroundColor: selected ? '#3B82F6' : isDraggingEdgeEndpoint ? '#10B981' : '#64748B',
      border: '2px solid #FFFFFF',
      opacity: (isVisible && (forceShow || !connected)) ? 1 : 0,
      visibility: (!forceShow && connected) ? 'hidden' : 'visible',
      zIndex: 20,
    }
  }

  // Handle의 기본 CSS 클래스
  // 흐름선 끝점 드래그 중엔 연결된 포트도 클릭 가능하게
  // Hit Area 확장을 위해 before: 요소 사용 (44x44px 영역 확보)
  const getClassName = (handleId: string) =>
    `w-2.5 h-2.5 !min-w-[10px] !min-h-[10px] relative before:content-[''] before:absolute before:-inset-4 before:bg-transparent ${(isPositionConnected(handleId) && !isDraggingEdgeEndpoint) ? '!pointer-events-none' : ''}`

  // 드래그 중엔 연결 여부와 무관하게 모든 포트에 연결 허용
  const isConn = (handleId: string) => isDraggingEdgeEndpoint ? true : !isPositionConnected(handleId)

  return (
    <>
      {/* Target (수신 포트) */}
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className={getClassName('target-top')}
        isConnectable={isConn('target-top')}
        style={{ ...getStyle('target-top'), ...(offsets?.top?.left !== undefined ? { left: offsets.top.left } : {}) }}
      />
      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className={getClassName('target-bottom')}
        isConnectable={isConn('target-bottom')}
        style={{ ...getStyle('target-bottom'), ...(offsets?.bottom?.left !== undefined ? { left: offsets.bottom.left } : {}) }}
      />
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className={getClassName('target-left')}
        isConnectable={isConn('target-left')}
        style={{ ...getStyle('target-left'), ...(offsets?.left?.left !== undefined ? { left: offsets.left.left } : {}) }}
      />
      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className={getClassName('target-right')}
        isConnectable={isConn('target-right')}
        style={{ ...getStyle('target-right'), ...(offsets?.right?.right !== undefined ? { right: offsets.right.right } : offsets?.right?.left !== undefined ? { left: offsets.right.left } : {}) }}
      />

      {/* Source (출발 포트) */}
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        className={getClassName('top')}
        isConnectable={isConn('top')}
        style={{ ...getStyle('top'), ...(offsets?.top?.left !== undefined ? { left: offsets.top.left } : {}) }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className={getClassName('bottom')}
        isConnectable={isConn('bottom')}
        style={{ ...getStyle('bottom'), ...(offsets?.bottom?.left !== undefined ? { left: offsets.bottom.left } : {}) }}
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        className={getClassName('left')}
        isConnectable={isConn('left')}
        style={{ ...getStyle('left'), ...(offsets?.left?.left !== undefined ? { left: offsets.left.left } : {}) }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className={getClassName('right')}
        isConnectable={isConn('right')}
        style={{ ...getStyle('right'), ...(offsets?.right?.right !== undefined ? { right: offsets.right.right } : offsets?.right?.left !== undefined ? { left: offsets.right.left } : {}) }}
      />
    </>
  )
}

