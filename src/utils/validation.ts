import type { FlowNode, FlowEdge, ValidationResult, ValidationIssue } from '../types'

/**
 * 순서도 로직 오류를 검사하는 순수 함수들.
 * 각 규칙은 독립적인 함수로 분리되어 유지보수가 쉽습니다.
 */

function checkStartEnd(nodes: FlowNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const terminals = nodes.filter(n => n.data.kind === 'terminal')
  const starts = terminals.filter(n =>
    n.data.label.trim() === '시작' || n.data.label.toLowerCase().includes('start')
  )
  const ends = terminals.filter(n =>
    n.data.label.trim() === '끝' || n.data.label.toLowerCase().includes('end')
  )

  if (terminals.length === 0) {
    issues.push({
      id: 'no-terminal',
      severity: 'error',
      message: '시작/끝(단자) 도형이 하나도 없어요. 순서도는 반드시 시작과 끝이 있어야 해요!',
    })
  } else {
    if (starts.length === 0) {
      issues.push({
        id: 'no-start',
        severity: 'error',
        message: "텍스트가 '시작'인 단자 도형이 없어요. 시작 도형을 추가하거나, 도형 텍스트를 '시작'으로 바꿔보세요.",
        nodeIds: terminals.map(n => n.id),
      })
    } else if (starts.length > 1) {
      issues.push({
        id: 'multi-start',
        severity: 'error',
        message: '시작 도형이 2개 이상이에요. 시작은 하나만 있어야 해요!',
        nodeIds: starts.map(n => n.id),
      })
    }
    if (ends.length === 0) {
      issues.push({
        id: 'no-end',
        severity: 'error',
        message: "텍스트가 '끝'인 단자 도형이 없어요. 끝 도형을 추가하거나, 도형 텍스트를 '끝'으로 바꿔보세요.",
        nodeIds: terminals.map(n => n.id),
      })
    }
  }
  return issues
}

function checkIsolatedNodes(nodes: FlowNode[], edges: FlowEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const connectedIds = new Set<string>()
  edges.forEach(e => {
    connectedIds.add(e.source)
    connectedIds.add(e.target)
  })

  // anchor/edge-node는 보조 노드이므로 검사 제외
  const realNodes = nodes.filter(n => n.type !== 'anchor' && n.type !== 'edge-node')
  const isolated = realNodes.filter(n => !connectedIds.has(n.id))
  if (isolated.length > 0) {
    issues.push({
      id: 'isolated-nodes',
      severity: 'error',
      message: `${isolated.length}개의 도형이 화살표와 연결되지 않았어요. 모든 도형은 흐름선으로 연결해야 해요!`,
      nodeIds: isolated.map(n => n.id),
    })
  }
  return issues
}

function checkDecisionBranches(nodes: FlowNode[], edges: FlowEdge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const decisions = nodes.filter(n => n.data.kind === 'decision')

  decisions.forEach(node => {
    const outgoing = edges.filter(e => e.source === node.id)
    if (outgoing.length < 2) {
      issues.push({
        id: `decision-incomplete-${node.id}`,
        severity: 'error',
        message: `판단 도형 "${node.data.label}"에서 나오는 화살표가 ${outgoing.length}개예요. '예'와 '아니오' 방향 화살표 2개가 필요해요!`,
        nodeIds: [node.id],
      })
    } else if (outgoing.length > 2) {
      issues.push({
        id: `decision-too-many-${node.id}`,
        severity: 'warning',
        message: `판단 도형 "${node.data.label}"에서 나오는 화살표가 ${outgoing.length}개예요. 보통 2개(예/아니오)여야 해요.`,
        nodeIds: [node.id],
      })
    }
  })
  return issues
}

function checkEmptyLabels(nodes: FlowNode[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  // anchor/edge-node는 라벨이 없는 게 정상이므로 제외
  const realNodes = nodes.filter(n => n.type !== 'anchor' && n.type !== 'edge-node')
  const empty = realNodes.filter(n => !n.data.label.trim())
  if (empty.length > 0) {
    issues.push({
      id: 'empty-labels',
      severity: 'warning',
      message: `${empty.length}개의 도형에 텍스트가 없어요. 더블클릭해서 내용을 입력해보세요!`,
      nodeIds: empty.map(n => n.id),
    })
  }
  return issues
}

// ─── Main Validation Entry Point ─────────────────────────────────────────────────
export function validateFlow(nodes: FlowNode[], edges: FlowEdge[]): ValidationResult {
  // anchor/edge-node를 제외한 실제 노드만 체크
  const realNodes = nodes.filter(n => n.type !== 'anchor' && n.type !== 'edge-node')
  if (realNodes.length === 0) {
    return {
      isValid: false,
      issues: [{
        id: 'empty-canvas',
        severity: 'error',
        message: '캔버스가 비어있어요. 도형을 추가하고 순서도를 완성해보세요!',
      }],
    }
  }

  const issues: ValidationIssue[] = [
    ...checkStartEnd(nodes),
    ...checkIsolatedNodes(nodes, edges),
    ...checkDecisionBranches(nodes, edges),
    ...checkEmptyLabels(nodes),
  ]

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  }
}
