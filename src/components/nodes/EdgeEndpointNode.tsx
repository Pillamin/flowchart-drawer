import React, { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

/** 
 * 흐름선의 양 끝점 노드 (End-point Node)
 * 마우스를 올리거나 선택했을 때 끝점 조정 도트가 뚜렷하게 보임
 */
export const EdgeEndpointNode: React.FC<NodeProps> = memo(({ selected }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-6 h-6 -translate-x-1 -translate-y-1 rounded-full flex items-center justify-center transition-all cursor-grab active:cursor-grabbing ${
        (isHovered || selected)
          ? 'opacity-100 scale-110'
          : 'opacity-0 hover:opacity-100 scale-90'
      }`}
      title="잡고 옮겨서 흐름선 모양 변경 또는 도형에 붙이기 / 휴지통으로 삭제"
    >
      <div className={`w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all ${
        selected ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-slate-700 hover:bg-blue-500'
      }`}>
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>

      {/* 정중앙 Single Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="handle"
        isConnectable={false}
        style={{ opacity: 0, width: 1, height: 1, top: '50%', left: '50%', bottom: 'auto', right: 'auto', transform: 'translate(-50%, -50%)', background: 'transparent', border: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="src-handle"
        isConnectable={false}
        style={{ opacity: 0, width: 1, height: 1, top: '50%', left: '50%', bottom: 'auto', right: 'auto', transform: 'translate(-50%, -50%)', background: 'transparent', border: 'none' }}
      />
    </div>
  )
})

EdgeEndpointNode.displayName = 'EdgeEndpointNode'
