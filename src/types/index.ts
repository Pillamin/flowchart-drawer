import type { Node, Edge } from '@xyflow/react'

// ─── Node Types ────────────────────────────────────────────────────────────────
export type NodeKind = 'terminal' | 'io' | 'process' | 'decision'

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  kind: NodeKind
  isSimActive?: boolean   // 시뮬레이션 중 현재 노드
  isSimVisited?: boolean  // 시뮬레이션 중 방문한 노드
}

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge

// ─── Validation ────────────────────────────────────────────────────────────────
export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  id: string
  severity: ValidationSeverity
  message: string
  nodeIds?: string[]
}

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
}

// ─── Simulation ────────────────────────────────────────────────────────────────
export type SimulationStatus = 'idle' | 'running' | 'waiting' | 'finished' | 'error'

export interface SimulationState {
  status: SimulationStatus
  currentNodeId: string | null
  visitedNodeIds: string[]
  activeEdgeIds: string[]
  pendingDecisionEdges: FlowEdge[]  // 판단 노드에서 선택 대기 중인 엣지들
  stepLog: string[]
}

// ─── Student Info ───────────────────────────────────────────────────────────────
export interface StudentInfo {
  grade: string
  classNum: string
  number: string
  name: string
  title?: string
}

// ─── Export ─────────────────────────────────────────────────────────────────────
export type ExportFormat = 'png' | 'jpg' | 'pdf'

// ─── Template ───────────────────────────────────────────────────────────────────
export interface FlowTemplate {
  id: string
  name: string
  description: string
  nodes: FlowNode[]
  edges: FlowEdge[]
}
