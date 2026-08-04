import { TerminalNode } from './TerminalNode'
import { IONode } from './IONode'
import { ProcessNode } from './ProcessNode'
import { DecisionNode } from './DecisionNode'
import { EdgeEndpointNode } from './EdgeEndpointNode'
import type { NodeTypes } from '@xyflow/react'

export const nodeTypes: NodeTypes = {
  terminal: TerminalNode as NodeTypes[string],
  io: IONode as NodeTypes[string],
  process: ProcessNode as NodeTypes[string],
  decision: DecisionNode as NodeTypes[string],
  anchor: EdgeEndpointNode as NodeTypes[string],
  'edge-node': EdgeEndpointNode as NodeTypes[string],
  custom: ProcessNode as NodeTypes[string],
}
