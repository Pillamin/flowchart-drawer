import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

/** 
 * 흐름선의 양 끝점 앵커 노드 — 
 * 노드 자체를 드래그하거나 핸들을 잡아 다른 도형의 포트로 끌어다 연결할 수 있음
 */
export const AnchorNode: React.FC<NodeProps> = memo(({ selected }) => {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing transition-all flex items-center justify-center ${
        selected ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-slate-600 hover:bg-blue-500'
      }`}
      style={{ zIndex: 9999 }}
      title="드래그해서 위치 이동, 휴지통으로 삭제, 또는 다른 도형에 연결"
    >
      <div className="w-1.5 h-1.5 bg-white rounded-full opacity-90" />
      
      {/* 
        다른 도형 포트에 연결 시 Target 및 필요시 연결점 수신만 수행
        width/height를 0으로 두어 React Flow가 Handle의 모서리가 아닌 정확한 중심을 (sourceX/targetY)로 잡도록 함 (선 꺾임 방지)
      */}
      <Handle
        type="target"
        position={Position.Top}
        id="handle"
        style={{ width: 0, height: 0, minWidth: 0, minHeight: 0, border: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="src-handle"
        style={{ width: 0, height: 0, minWidth: 0, minHeight: 0, border: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }}
      />
    </div>
  )
})

AnchorNode.displayName = 'AnchorNode'
