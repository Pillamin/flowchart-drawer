import React, { memo } from 'react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'

/** 처리 노드 — 직사각형 */
export const ProcessNode: React.FC<NodeProps & { data: FlowNodeData }> = memo(({ id, data, selected }) => {
  const config = NODE_CONFIGS.process
  return (
    <BaseNode id={id} data={data} selected={selected} className="rounded-md px-4 py-3">
      <span className="text-sm font-bold text-center leading-tight" style={{ color: config.colors.text }}>
        {data.label}
      </span>
    </BaseNode>
  )
})
ProcessNode.displayName = 'ProcessNode'
