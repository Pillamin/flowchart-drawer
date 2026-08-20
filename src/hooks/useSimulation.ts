import { useCallback, useRef } from 'react'
import { useFlowStore } from '../store/flowStore'
import { findStartNode, findEndNode, getOutgoingEdges, isEndLabel } from '../utils/graph'
import { validateFlow } from '../utils/validation'
import type { FlowEdge } from '../types'

const STEP_DELAY_MS = 800
const MAX_NODE_VISIT_COUNT = 25

/**
 * 순서도 실행 시뮬레이션 훅.
 * 시작 노드부터 시작해서 흐름선을 따라 노드를 하나씩 활성화합니다.
 * 판단 노드에서는 사용자 입력(예/아니오)을 기다립니다.
 */
export function useSimulation() {
  const updateSimulation = useFlowStore(s => s.updateSimulation)
  const resetSimulation = useFlowStore(s => s.resetSimulation)
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visitCountsRef = useRef<Record<string, number>>({})

  const cleanup = useCallback(() => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current)
  }, [])

  const stop = useCallback(() => {
    cleanup()
    visitCountsRef.current = {}
    resetSimulation()
  }, [cleanup, resetSimulation])

  /** 특정 노드를 현재 활성 노드로 하이라이트 */
  const highlightNode = useCallback((nodeId: string, edgeId?: string) => {
    const store = useFlowStore.getState()
    // 이전 active 해제, 새 active 설정, visited 누적
    useFlowStore.setState(s => ({
      nodes: s.nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isSimActive: n.id === nodeId,
          isSimVisited: n.id !== nodeId ? (s.simulation.visitedNodeIds.includes(n.id) || n.data.isSimVisited) : false,
        },
      })),
      edges: s.edges.map(e => ({
        ...e,
        data: {
          ...e.data,
          isSimActive: edgeId ? e.id === edgeId : false,
        },
      })),
    }))

    const visited = [...store.simulation.visitedNodeIds]
    if (!visited.includes(nodeId)) visited.push(nodeId)

    updateSimulation({
      currentNodeId: nodeId,
      visitedNodeIds: visited,
      ...(edgeId ? { activeEdgeIds: [...store.simulation.activeEdgeIds, edgeId] } : {}),
    })
  }, [updateSimulation])

  /** 한 스텝 실행: 현재 노드 → 다음 노드로 이동 */
  const step = useCallback((nodeId: string) => {
    const store = useFlowStore.getState()
    const { nodes: currentNodes, edges: currentEdges, simulation } = store

    const currentNode = currentNodes.find(n => n.id === nodeId)
    if (!currentNode) { stop(); return }

    // 끝 노드 도달
    const isEnd = currentNode.data.kind === 'terminal' && isEndLabel(currentNode.data.label)
    if (isEnd) {
      updateSimulation({ status: 'finished', stepLog: [...simulation.stepLog, `✅ 끝! 순서도를 성공적으로 완료했어요.`] })
      return
    }

    const outgoing = getOutgoingEdges(nodeId, currentEdges)

    if (outgoing.length === 0) {
      updateSimulation({
        status: 'error',
        stepLog: [...simulation.stepLog, `⚠️ "${currentNode.data.label}" 도형에서 나가는 화살표가 없어요.`],
      })
      return
    }

    // 판단 노드: 사용자 선택 대기
    if (currentNode.data.kind === 'decision') {
      updateSimulation({
        status: 'waiting',
        pendingDecisionEdges: outgoing,
        stepLog: [...simulation.stepLog, `🔀 "${currentNode.data.label}" 조건을 판단하세요.`],
      })
      return
    }

    // 경로 진행
    const nextEdge = outgoing[0]
    const nextNode = currentNodes.find(n => n.id === nextEdge.target)
    if (!nextNode) { stop(); return }

    // 노드 방문 횟수 증가 및 무한 루프 감지 (25회 초과 시에만 감지)
    const nextVisitCount = (visitCountsRef.current[nextNode.id] || 0) + 1
    visitCountsRef.current[nextNode.id] = nextVisitCount

    if (nextVisitCount > MAX_NODE_VISIT_COUNT) {
      updateSimulation({
        status: 'error',
        stepLog: [...simulation.stepLog, `⚠️ 무한 루프가 감지됐어요! "${nextNode.data.label}" 도형이 ${MAX_NODE_VISIT_COUNT}회 이상 반복 방문되었습니다.`],
      })
      return
    }

    const multiEdgeWarning = outgoing.length > 1
      ? ` (⚠️ 나가는 화살표가 ${outgoing.length}개 탐지되어 첫 번째 경로로 진행합니다)`
      : ''

    updateSimulation({
      stepLog: [...simulation.stepLog, `➡️ "${currentNode.data.label}" → "${nextNode.data.label}"${multiEdgeWarning}`],
    })
    highlightNode(nextNode.id, nextEdge.id)

    stepTimerRef.current = setTimeout(() => {
      step(nextNode.id)
    }, STEP_DELAY_MS)
  }, [stop, updateSimulation, highlightNode])

  /** 시뮬레이션 시작 */
  const start = useCallback(() => {
    cleanup()
    resetSimulation()
    visitCountsRef.current = {}
    const store = useFlowStore.getState()

    // 시뮬레이션 시작 전 순서도 구조 자동 검증 연동
    const validationResult = validateFlow(store.nodes, store.edges)
    const errorIssues = validationResult.issues.filter(i => i.severity === 'error')

    if (errorIssues.length > 0) {
      updateSimulation({
        status: 'error',
        stepLog: [
          '❌ [검증 실패] 순서도 오류로 인해 시뮬레이션을 시작할 수 없습니다.',
          ...errorIssues.map(issue => `• ${issue.message}`),
        ],
      })
      return
    }

    const startNode = findStartNode(store.nodes)
    const endNode = findEndNode(store.nodes)

    if (!startNode || !endNode) {
      updateSimulation({
        status: 'error',
        stepLog: ["❌ '시작' 또는 '끝' 도형을 찾을 수 없어요. 먼저 검사하기를 실행해보세요."],
      })
      return
    }

    visitCountsRef.current[startNode.id] = 1

    updateSimulation({
      status: 'running',
      stepLog: [`🚀 시작! "${startNode.data.label}" 도형부터 출발해요.`],
    })
    highlightNode(startNode.id)

    stepTimerRef.current = setTimeout(() => {
      step(startNode.id)
    }, STEP_DELAY_MS)
  }, [cleanup, resetSimulation, updateSimulation, highlightNode, step])

  /** 판단 노드에서 사용자가 예/아니오 선택 */
  const chooseDecision = useCallback((edge: FlowEdge) => {
    cleanup()
    const store = useFlowStore.getState()
    const { nodes: currentNodes, simulation } = store
    const nextNode = currentNodes.find(n => n.id === edge.target)
    if (!nextNode) return

    // 노드 방문 횟수 업데이트
    const nextVisitCount = (visitCountsRef.current[nextNode.id] || 0) + 1
    visitCountsRef.current[nextNode.id] = nextVisitCount

    if (nextVisitCount > MAX_NODE_VISIT_COUNT) {
      updateSimulation({
        status: 'error',
        stepLog: [...simulation.stepLog, `⚠️ 무한 루프가 감지됐어요! "${nextNode.data.label}" 도형이 ${MAX_NODE_VISIT_COUNT}회 이상 반복 방문되었습니다.`],
      })
      return
    }

    updateSimulation({
      status: 'running',
      pendingDecisionEdges: [],
      stepLog: [...simulation.stepLog, `✔️ "${String(edge.label ?? '선택')}" → "${nextNode.data.label}"`],
    })
    highlightNode(nextNode.id, edge.id)

    stepTimerRef.current = setTimeout(() => {
      step(nextNode.id)
    }, STEP_DELAY_MS)
  }, [cleanup, updateSimulation, highlightNode, step])

  return { start, stop, chooseDecision }
}
