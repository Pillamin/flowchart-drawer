import type { Node, Edge } from '@xyflow/react'

// ─── Node Types ────────────────────────────────────────────────────────────────
export type NodeKind = 'terminal' | 'io' | 'process' | 'decision'
export type StepKind = NodeKind | 'loop' | 'none'

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  kind: NodeKind
  isSimActive?: boolean   // 시뮬레이션 중 현재 노드
  isSimVisited?: boolean  // 시뮬레이션 중 방문한 노드
  isAlgorithmHighlighted?: boolean // 자연어 알고리즘 하이라이트
  isErrorFlashing?: boolean // 오류 발생 시 깜빡임 하이라이트
}

export interface AlgorithmStep {
  id: string
  text: string
  kind: StepKind
  nodeId?: string
  isPreview?: boolean       // 드래그 중 실시간 배치 예상 미리보기 노드 여부
  yesSteps?: AlgorithmStep[] // 참(예) 조건 또는 반복문 내부 하위에 실행할 블록 목록
  noSteps?: AlgorithmStep[]  // 거짓(아니오) 조건 하위에 실행할 블록 목록
  loopTrigger?: 'yes' | 'no' // 반복 실행 조건 ('yes': 조건 만족 시, 'no': 조건 미만족 시)
  targetStepId?: string     // 반복 수행 후 이동할 대상 블록의 ID (고유 ID로 보존되어 번호가 변경되어도 유지)
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
  edgeIds?: string[]
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
