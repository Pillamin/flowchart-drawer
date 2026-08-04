import React, { memo } from 'react'
import { BaseNode } from './BaseNode'
import type { NodeProps } from '@xyflow/react'
import type { FlowNodeData } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'

// ─── Terminal Node (시작/끝 — 타원) ───────────────────────────────────────────
export const TerminalNode: React.FC<NodeProps & { data: FlowNodeData }> = memo(({ id, data, selected }) => {
  const config = NODE_CONFIGS.terminal
  return (
    <BaseNode id={id} data={data} selected={selected} className="rounded-full px-5 py-3">
      <span className="text-sm font-bold text-center leading-tight" style={{ color: config.colors.text }}>
        {data.label}
      </span>
    </BaseNode>
  )
})
TerminalNode.displayName = 'TerminalNode'
