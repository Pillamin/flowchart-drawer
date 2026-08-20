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

/** 시작 텍스트/의미 판별 */
export function isStartLabel(label: string): boolean {
  if (!label) return false
  const trimmed = label.trim()
  if (!trimmed) return false

  // 한국어 키워드 포함 여부
  const krKeywords = ['시작', '출발', '처음', '입구', '스타트']
  if (krKeywords.some(kw => trimmed.includes(kw))) return true

  // 영어 키워드 독립 단어 매칭
  const enPattern = /\b(start|starts|started|starting|begin|begins|beginning|init|initial|initialize|initialization|launch|entry)\b/i
  return enPattern.test(trimmed)
}

/** 끝 텍스트/의미 판별 */
export function isEndLabel(label: string): boolean {
  if (!label) return false
  const trimmed = label.trim()
  if (!trimmed) return false

  // 한국어 키워드 포함 여부
  const krKeywords = ['끝', '종료', '마침', '마무리', '완료', '중단', '퇴장', '피니시', '끝내기', '마치기']
  if (krKeywords.some(kw => trimmed.includes(kw))) return true

  // 영어 키워드 독립 단어 매칭
  const enPattern = /\b(end|ends|ended|ending|stop|stops|stopped|stopping|finish|finishes|finished|exit|exits|terminate|terminates|terminated|termination|done|close|closed|quit)\b/i
  return enPattern.test(trimmed)
}

/** 텍스트로 시작 노드를 찾음 */
export function findStartNode(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find(
    n => n.data.kind === 'terminal' && isStartLabel(n.data.label)
  )
}

/** 텍스트로 끝 노드를 찾음 */
export function findEndNode(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find(
    n => n.data.kind === 'terminal' && isEndLabel(n.data.label)
  )
}

/** nodeId로 노드 객체를 빠르게 조회하기 위한 맵 생성 */
export function buildNodeMap(nodes: FlowNode[]): Map<string, FlowNode> {
  return new Map(nodes.map(n => [n.id, n]))
}
