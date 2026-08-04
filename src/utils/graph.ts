import type { FlowNode, FlowEdge } from '../types'

/**
 * 순서도 그래프 순회 유틸리티.
 * 시뮬레이션에서 다음 노드를 찾는 데 사용됩니다.
 */

/** 특정 노드에서 나가는 엣지들을 반환 */
export function getOutgoingEdges(nodeId: string, edges: FlowEdge[]): FlowEdge[] {
  return edges.filter(e => e.source === nodeId)
}

/** 특정 노드로 들어오는 엣지들을 반환 */
export function getIncomingEdges(nodeId: string, edges: FlowEdge[]): FlowEdge[] {
  return edges.filter(e => e.target === nodeId)
}

/** 텍스트로 시작 노드를 찾음 */
export function findStartNode(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find(
    n =>
      n.data.kind === 'terminal' &&
      (n.data.label.trim() === '시작' || n.data.label.toLowerCase().includes('start'))
  )
}

/** 텍스트로 끝 노드를 찾음 */
export function findEndNode(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find(
    n =>
      n.data.kind === 'terminal' &&
      (n.data.label.trim() === '끝' || n.data.label.toLowerCase().includes('end'))
  )
}

/** nodeId로 노드 객체를 빠르게 조회하기 위한 맵 생성 */
export function buildNodeMap(nodes: FlowNode[]): Map<string, FlowNode> {
  return new Map(nodes.map(n => [n.id, n]))
}
