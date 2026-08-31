import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges, reconnectEdge, MarkerType } from '@xyflow/react'
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import type { FlowNode, FlowEdge, StudentInfo, SimulationState, AlgorithmStep, NodeKind, StepKind } from '../types'
import { DECISION_LABELS } from '../constants/nodeConfig'
import { isStartLabel } from '../utils/graph'

const STORAGE_KEY = 'flowchart-drawer-v3'
const DEBOUNCE_MS = 2000

// ─── Types ──────────────────────────────────────────────────────────────────────
interface CanvasHistoryEntry {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface AlgorithmHistoryEntry {
  algorithmSteps: AlgorithmStep[]
}

interface FlowStore {
  // Canvas state
  nodes: FlowNode[]
  edges: FlowEdge[]
  // Undo/Redo stacks for Canvas (Flowchart)
  past: CanvasHistoryEntry[]
  future: CanvasHistoryEntry[]
  // Undo/Redo stacks for Natural Language Algorithm
  pastAlgorithm: AlgorithmHistoryEntry[]
  futureAlgorithm: AlgorithmHistoryEntry[]
  // Student info
  student: StudentInfo
  // Simulation
  simulation: SimulationState
  // Natural Language Algorithm State
  isAlgorithmPanelOpen: boolean
  isAutoSyncEnabled: boolean
  algorithmSteps: AlgorithmStep[]
  hoveredStepId: string | null
  isDraggingEdgeEndpoint: boolean

  // Actions
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void
  onConnect: (connection: Connection) => void
  onReconnect: (oldEdge: FlowEdge, newConnection: Connection) => void
  updateNodePosition: (id: string, position: { x: number; y: number }) => void
  connectAnchorToNode: (anchorNodeId: string, targetNodeId: string, targetHandleId?: string) => void
  updateNodeLabel: (id: string, label: string) => void
  addNode: (node: FlowNode) => void
  removeNode: (id: string) => void
  removeEdge: (id: string) => void
  deleteSelectedElements: () => void
  undo: () => void
  redo: () => void
  undoAlgorithm: () => void
  redoAlgorithm: () => void
  clearCanvas: () => void
  loadTemplate: (nodes: FlowNode[], edges: FlowEdge[]) => void
  setStudent: (info: Partial<StudentInfo>) => void
  updateSimulation: (sim: Partial<SimulationState>) => void
  resetSimulation: () => void
  
  // Natural Language Algorithm Actions
  toggleAlgorithmPanel: () => void
  setAlgorithmPanelOpen: (open: boolean) => void
  toggleAutoSync: () => void
  addAlgorithmStep: (text: string, kind: StepKind) => void
  updateAlgorithmStep: (id: string, text: string, kind?: StepKind) => void
  toggleDecision: (id: string, isDecision: boolean) => void
  updateAlgorithmStepLoopConfig: (id: string, config: { loopTrigger?: 'yes' | 'no'; targetStepId?: string }) => void
  updateAlgorithmStepBranchText: (id: string, branch: 'yes' | 'no', text: string) => void
  reorderAlgorithmSteps: (fromIndex: number, toIndex: number) => void
  addBranchAlgorithmStep: (parentDecisionId: string, branch: 'yes' | 'no', text: string, kind: StepKind) => void
  removeBranchAlgorithmStep: (parentDecisionId: string, branch: 'yes' | 'no', stepId: string) => void
  updateBranchAlgorithmStep: (parentDecisionId: string, branch: 'yes' | 'no', stepId: string, text: string, kind?: StepKind) => void
  moveStepToBranch: (stepId: string, targetDecisionId: string, targetBranch: 'yes' | 'no', targetIndex?: number) => void
  moveStepToRoot: (stepId: string, targetIndex?: number) => void
  removeAlgorithmStep: (id: string) => void
  clearAlgorithmSteps: () => void
  moveAlgorithmStep: (id: string, direction: 'up' | 'down') => void
  insertStepAfter: (targetId: string, text: string, kind?: StepKind) => void
  indentStep: (id: string) => void
  outdentStep: (id: string) => void
  setHoveredStepId: (id: string | null) => void
  setIsDraggingEdgeEndpoint: (dragging: boolean) => void
  generateFlowchartFromAlgorithm: () => void
  extractAlgorithmFromFlowchart: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────
function autoDetectKind(text: string, defaultKind: StepKind = 'process'): StepKind {
  const t = text.trim()
  if (!t) return defaultKind
  if (t.includes('입력') || t.includes('출력') || t.includes('말한다') || t.includes('묻는다') || t.includes('보여준다')) {
    return 'io'
  }
  return defaultKind
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function persistImmediately(nodes: FlowNode[], edges: FlowEdge[], student: StudentInfo) {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges, student }))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function persistToStorage(nodes: FlowNode[], edges: FlowEdge[], student: StudentInfo) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    persistImmediately(nodes, edges, student)
  }, DEBOUNCE_MS)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      try {
        const state = useFlowStore.getState()
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: state.nodes, edges: state.edges, student: state.student }))
      } catch {}
    }
  })
}

function loadFromStorage(): Pick<FlowStore, 'nodes' | 'edges' | 'student'> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Pick<FlowStore, 'nodes' | 'edges' | 'student'>
    if (parsed && Array.isArray(parsed.nodes)) {
      parsed.nodes = parsed.nodes.map(n => ({
        ...n,
        type: (n.type === 'custom' || !n.type) ? (n.data?.kind ?? 'process') : n.type,
      }))
    }
    return parsed
  } catch {
    return null
  }
}

const DEFAULT_STUDENT: StudentInfo = { grade: '', classNum: '', number: '', name: '', title: '' }

const DEFAULT_SIM: SimulationState = {
  status: 'idle',
  currentNodeId: null,
  visitedNodeIds: [],
  activeEdgeIds: [],
  pendingDecisionEdges: [],
  stepLog: [],
}

// ─── Push to history before mutating ─────────────────────────────────────────────
function pushCanvasHistory(past: CanvasHistoryEntry[], nodes: FlowNode[], edges: FlowEdge[]): CanvasHistoryEntry[] {
  const next = [...past, { nodes, edges }]
  return next.length > 50 ? next.slice(next.length - 50) : next
}

function pushAlgorithmHistory(past: AlgorithmHistoryEntry[], algorithmSteps: AlgorithmStep[]): AlgorithmHistoryEntry[] {
  const next = [...past, { algorithmSteps }]
  return next.length > 50 ? next.slice(next.length - 50) : next
}

// ─── Find merge node (분기 합류점 탐색) ──────────────────────────────────────────
// yes/no 두 분기에서 각각 BFS로 도달 가능한 노드를 수집하고 첫 교집합 노드를 반환
function findMergeNode(
  yesStart: string | undefined,
  noStart: string | undefined,
  outEdges: Record<string, FlowEdge[]>,
  shapeNodes: FlowNode[]
): string | null {
  if (!yesStart || !noStart) return null

  const bfsReach = (start: string, limit = 50): string[] => {
    const visited: string[] = []
    const queue = [start]
    while (queue.length > 0 && visited.length < limit) {
      const cur = queue.shift()!
      if (visited.includes(cur)) continue
      visited.push(cur)
      const nexts = (outEdges[cur] || []).map(e => e.target).filter(t => shapeNodes.some(n => n.id === t))
      queue.push(...nexts)
    }
    return visited
  }

  const yesReach = bfsReach(yesStart)
  const noReach  = bfsReach(noStart)

  // yes 쪽 탐색 순서를 기준으로 첫 번째 교집합 노드 반환
  return yesReach.find(id => noReach.includes(id)) ?? null
}

// ─── Store ───────────────────────────────────────────────────────────────────────
const saved = loadFromStorage()

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: [],
  edges: [],
  past: [],
  future: [],
  pastAlgorithm: [],
  futureAlgorithm: [],
  student: saved?.student ?? DEFAULT_STUDENT,
  simulation: DEFAULT_SIM,
  isDraggingEdgeEndpoint: false,

  onNodesChange: (changes) => {
    const { nodes, edges, past } = get()
    const nextNodes = applyNodeChanges(changes, nodes)
    const removedNodeIds = new Set(changes.filter(c => c.type === 'remove').map(c => c.id))
    const nextEdges = removedNodeIds.size > 0
      ? edges.filter(e => !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target))
      : edges

    const hasMeaningfulChange = changes.some(c => c.type === 'remove' || c.type === 'add')
    set({
      nodes: nextNodes,
      edges: nextEdges,
      ...(hasMeaningfulChange ? { past: pushCanvasHistory(past, nodes, edges), future: [] } : {}),
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  onEdgesChange: (changes) => {
    const { nodes, edges, past } = get()
    const hasMeaningfulChange = changes.some(c => c.type === 'remove' || c.type === 'add')
    set({
      edges: applyEdgeChanges(changes, edges),
      ...(hasMeaningfulChange ? { past: pushCanvasHistory(past, nodes, edges), future: [] } : {}),
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  onConnect: (connection) => {
    const { nodes, edges, past } = get()
    
    let finalSource = connection.source
    let finalSourceHandle = connection.sourceHandle
    let finalTarget = connection.target
    let finalTargetHandle = connection.targetHandle

    const nodesToRemove = new Set<string>()
    const edgesToRemove = new Set<string>()

    const sourceNode = nodes.find(n => n.id === connection.source)
    if (sourceNode && (sourceNode.type === 'anchor' || sourceNode.type === 'edge-node')) {
      const existing = edges.find(e => e.source === connection.source || e.target === connection.source)
      if (existing) {
        const otherEnd = existing.source === connection.source ? existing.target : existing.source
        const otherEndHandle = existing.source === connection.source ? existing.targetHandle : existing.sourceHandle
        finalSource = otherEnd
        finalSourceHandle = otherEndHandle ?? null
        nodesToRemove.add(connection.source)
        edgesToRemove.add(existing.id)
      }
    }

    const targetNode = nodes.find(n => n.id === connection.target)
    if (targetNode && (targetNode.type === 'anchor' || targetNode.type === 'edge-node')) {
      const existing = edges.find(e => (e.source === connection.target || e.target === connection.target) && !edgesToRemove.has(e.id))
      if (existing) {
        const otherEnd = existing.source === connection.target ? existing.target : existing.source
        const otherEndHandle = existing.source === connection.target ? existing.targetHandle : existing.sourceHandle
        finalTarget = otherEnd
        finalTargetHandle = otherEndHandle ?? null
        nodesToRemove.add(connection.target)
        edgesToRemove.add(existing.id)
      }
    }

    if (finalSource === finalTarget) return // prevent self-loops

    // 판단 노드에서 뽑을 때 자동 라벨 부여 (최초 source 기준으로 체크)
    let label: string | undefined
    const originalSourceNode = nodes.find(n => n.id === finalSource)
    if (originalSourceNode?.data.kind === 'decision') {
      const existingOutgoing = edges.filter(e => e.source === finalSource && !edgesToRemove.has(e.id))
      label = existingOutgoing.length === 0 ? DECISION_LABELS.yes : DECISION_LABELS.no
    }

    const newEdge: FlowEdge = {
      source: finalSource,
      sourceHandle: finalSourceHandle,
      target: finalTarget,
      targetHandle: finalTargetHandle,
      id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'labeled',
      reconnectable: true,
      markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: '#64748B' },
      ...(label ? { label, data: { isDecisionEdge: true } } : {}),
    }

    let updatedEdges = addEdge(newEdge, edges.filter(e => !edgesToRemove.has(e.id)))
    let updatedNodes = nodes.filter(n => !nodesToRemove.has(n.id))

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(updatedNodes, updatedEdges, get().student)
  },

  onReconnect: (oldEdge, newConnection) => {
    const { nodes, edges, past } = get()
    const nextEdges = reconnectEdge(oldEdge, newConnection, edges)

    let nextNodes = [...nodes]
    // Reconnect로 인해 끊어진 이전 끝점이 anchor/edge-node라면 무조건 제거
    // (새 연결점이 anchor가 아닌 실제 도형인 경우 이전 anchor는 더 이상 필요 없음)
    const oldEndpoints = [
      { id: oldEdge.source, isSourceEnd: true },
      { id: oldEdge.target, isSourceEnd: false },
    ]
    oldEndpoints.forEach(({ id: nodeId }) => {
      // 새 연결에서도 같은 노드를 재사용한다면 제거하지 않음
      if (nodeId === newConnection.source || nodeId === newConnection.target) return

      const node = nextNodes.find(n => n.id === nodeId)
      if (node && (node.type === 'anchor' || node.type === 'edge-node')) {
        // 이 anchor를 사용하는 다른 엣지가 없으면 제거
        const hasOtherEdge = nextEdges.some(e => e.source === nodeId || e.target === nodeId)
        if (!hasOtherEdge) {
          nextNodes = nextNodes.filter(n => n.id !== nodeId)
        }
      }
    })

    set({
      nodes: nextNodes,
      edges: nextEdges,
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  updateNodePosition: (id, position) => {
    const { nodes, edges } = get()
    const nextNodes = nodes.map(n => n.id === id ? { ...n, position } : n)
    set({ nodes: nextNodes })
    persistToStorage(nextNodes, edges, get().student)
  },

  connectAnchorToNode: (anchorNodeId, targetNodeId, snapHandleId = 'top') => {
    const { nodes, edges, past } = get()
    // 앵커 노드와 연결되어 있던 엣지 찾기
    const connectedEdge = edges.find(e => e.source === anchorNodeId || e.target === anchorNodeId)
    if (!connectedEdge) return

    // 반대쪽 노드가 targetNodeId와 동일하면 Self-loop 방지
    const otherEndId = connectedEdge.source === anchorNodeId ? connectedEdge.target : connectedEdge.source
    if (otherEndId === targetNodeId) return

    let nextEdges = edges.map(e => {
      if (e.id === connectedEdge.id) {
        return {
          ...e,
          source: e.source === anchorNodeId ? targetNodeId : e.source,
          sourceHandle: e.source === anchorNodeId ? snapHandleId : e.sourceHandle,
          target: e.target === anchorNodeId ? targetNodeId : e.target,
          targetHandle: e.target === anchorNodeId ? snapHandleId : e.targetHandle,
        }
      }
      return e
    })

    // 더 이상 쓰이지 않는 앵커 노드 제거
    const nextNodes = nodes.filter(n => n.id !== anchorNodeId)

    set({
      nodes: nextNodes,
      edges: nextEdges,
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  updateNodeLabel: (id, label) => {
    const { nodes, edges, past } = get()
    set({
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n),
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  addNode: (node) => {
    const { nodes, edges, past } = get()
    set({
      nodes: [...nodes, node],
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  removeNode: (id) => {
    const { nodes, edges, past } = get()
    const removedEdges = edges.filter(e => e.source === id || e.target === id)
    const nextEdges = edges.filter(e => e.source !== id && e.target !== id)
    let nextNodes = nodes.filter(n => n.id !== id)

    // 삭제된 노드와 연결되어 있던 앵커 노드 중 고립된 노드 정리
    removedEdges.forEach(targetEdge => {
      [targetEdge.source, targetEdge.target].forEach(anchorId => {
        if (anchorId === id) return
        const node = nextNodes.find(n => n.id === anchorId)
        if (node && (node.type === 'anchor' || node.type === 'edge-node')) {
          const hasOtherEdge = nextEdges.some(e => e.source === anchorId || e.target === anchorId)
          if (!hasOtherEdge) {
            nextNodes = nextNodes.filter(n => n.id !== anchorId)
          }
        }
      })
    })

    set({
      nodes: nextNodes,
      edges: nextEdges,
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  removeEdge: (id) => {
    const { nodes, edges, past } = get()
    const targetEdge = edges.find(e => e.id === id)
    const nextEdges = edges.filter(e => e.id !== id)

    let nextNodes = [...nodes]
    if (targetEdge) {
      // 삭제할 엣지의 source/target 중 다른 엣지와 연결되어 있지 않은 anchor/edge-node 제거
      const anchorIdsToCheck = [targetEdge.source, targetEdge.target]
      anchorIdsToCheck.forEach(anchorId => {
        const node = nodes.find(n => n.id === anchorId)
        if (node && (node.type === 'anchor' || node.type === 'edge-node')) {
          // 이 앵커 노드를 사용하고 있는 다른 엣지가 없으면 제거
          const hasOtherEdge = nextEdges.some(e => e.source === anchorId || e.target === anchorId)
          if (!hasOtherEdge) {
            nextNodes = nextNodes.filter(n => n.id !== anchorId)
          }
        }
      })
    }

    set({
      nodes: nextNodes,
      edges: nextEdges,
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  deleteSelectedElements: () => {
    const { nodes, edges, past } = get()
    const selectedNodes = nodes.filter(n => n.selected)
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id))
    const selectedEdgeIds = new Set(edges.filter(e => e.selected).map(e => e.id))

    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return

    let nextNodes = nodes.filter(n => !selectedNodeIds.has(n.id))
    let nextEdges = edges.filter(
      e => !selectedEdgeIds.has(e.id) && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
    )

    // 선택 삭제된 엣지들에 남아있는 앵커 노드 정리
    const removedEdges = edges.filter(e => !nextEdges.some(ne => ne.id === e.id))
    removedEdges.forEach(e => {
      [e.source, e.target].forEach(nodeId => {
        const node = nextNodes.find(n => n.id === nodeId)
        if (node && (node.type === 'anchor' || node.type === 'edge-node')) {
          const hasOtherEdge = nextEdges.some(ne => ne.source === nodeId || ne.target === nodeId)
          if (!hasOtherEdge) {
            nextNodes = nextNodes.filter(n => n.id !== nodeId)
          }
        }
      })
    })

    set({
      nodes: nextNodes,
      edges: nextEdges,
      past: pushCanvasHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  undo: () => {
    const { past, nodes, edges, future } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      past: past.slice(0, -1),
      future: [{ nodes, edges }, ...future],
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  redo: () => {
    const { future, nodes, edges, past } = get()
    if (!future.length) return
    const next = future[0]
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }],
      future: future.slice(1),
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  undoAlgorithm: () => {
    const { pastAlgorithm, algorithmSteps, futureAlgorithm } = get()
    if (!pastAlgorithm.length) return
    const prev = pastAlgorithm[pastAlgorithm.length - 1]
    set({
      algorithmSteps: prev.algorithmSteps,
      pastAlgorithm: pastAlgorithm.slice(0, -1),
      futureAlgorithm: [{ algorithmSteps }, ...futureAlgorithm],
    })
  },

  redoAlgorithm: () => {
    const { futureAlgorithm, algorithmSteps, pastAlgorithm } = get()
    if (!futureAlgorithm.length) return
    const next = futureAlgorithm[0]
    set({
      algorithmSteps: next.algorithmSteps,
      pastAlgorithm: [...pastAlgorithm, { algorithmSteps }],
      futureAlgorithm: futureAlgorithm.slice(1),
    })
  },

  clearCanvas: () => {
    const { nodes, edges, past } = get()
    set({ nodes: [], edges: [], past: pushCanvasHistory(past, nodes, edges), future: [], student: DEFAULT_STUDENT })
    persistImmediately([], [], DEFAULT_STUDENT)
  },

  loadTemplate: (nodes, edges) => {
    const { nodes: cur, edges: curE, past } = get()
    set({ nodes, edges, past: pushCanvasHistory(past, cur, curE), future: [] })
    persistImmediately(nodes, edges, get().student)
  },

  setStudent: (info) => {
    const next = { ...get().student, ...info }
    set({ student: next })
    persistToStorage(get().nodes, get().edges, next)
  },

  updateSimulation: (sim) => {
    set(s => ({ simulation: { ...s.simulation, ...sim } }))
  },

  resetSimulation: () => {
    // 하이라이트 제거 + simulation 초기화를 단일 set()으로 처리 (리렌더 1회)
    set(s => ({
      simulation: DEFAULT_SIM,
      nodes: s.nodes.map(n => ({
        ...n,
        data: { ...n.data, isSimActive: false, isSimVisited: false },
      })),
      edges: s.edges.map(e => ({ ...e, data: { ...e.data, isSimActive: false } })),
    }))
  },

  // ─── Natural Language Algorithm ──────────────────────────────────────────
  isAlgorithmPanelOpen: true,
  isAutoSyncEnabled: false,
  hoveredStepId: null,
  algorithmSteps: [],

  toggleAlgorithmPanel: () => set(s => ({ isAlgorithmPanelOpen: !s.isAlgorithmPanelOpen })),
  setAlgorithmPanelOpen: (open) => set({ isAlgorithmPanelOpen: open }),
  toggleAutoSync: () => set(s => ({ isAutoSyncEnabled: !s.isAutoSyncEnabled })),
  setIsDraggingEdgeEndpoint: (dragging) => set({ isDraggingEdgeEndpoint: dragging }),

  addAlgorithmStep: (text, kind) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const actualKind = kind === 'process' ? autoDetectKind(text, kind) : kind
    const newStep: AlgorithmStep = {
      id: `step-${Date.now()}`,
      text: text.trim() || '새 단계',
      kind: actualKind,
      ...(actualKind === 'decision'
        ? {
            yesSteps: [],
            noSteps: [],
          }
        : actualKind === 'loop'
        ? {
            yesSteps: [],
            loopTrigger: 'yes',
          }
        : {}),
    }
    set({
      algorithmSteps: [...algorithmSteps, newStep],
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  updateAlgorithmStep: (id, text, kind) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const update = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(step => {
        if (step.id === id) {
          const nextKind = kind || step.kind
          const actualKind = nextKind === 'process' ? autoDetectKind(text, nextKind) : nextKind
          return {
            ...step,
            text,
            kind: actualKind,
            ...(actualKind === 'decision'
              ? {
                  yesSteps: step.yesSteps || [],
                  noSteps: step.noSteps || [],
                }
              : nextKind === 'loop'
              ? {
                  yesSteps: step.yesSteps || [],
                  loopTrigger: step.loopTrigger || 'yes',
                }
              : {}),
          }
        }
        return {
          ...step,
          ...(step.yesSteps ? { yesSteps: update(step.yesSteps) } : {}),
          ...(step.noSteps ? { noSteps: update(step.noSteps) } : {}),
        }
      })
    }
    const nextSteps = update(algorithmSteps)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  updateAlgorithmStepLoopConfig: (id, config) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const update = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(step => {
        if (step.id === id) {
          return {
            ...step,
            ...config,
          }
        }
        return {
          ...step,
          ...(step.yesSteps ? { yesSteps: update(step.yesSteps) } : {}),
          ...(step.noSteps ? { noSteps: update(step.noSteps) } : {}),
        }
      })
    }
    const nextSteps = update(algorithmSteps)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  updateAlgorithmStepBranchText: (id, branch, text) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const update = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(step => {
        if (step.id === id) {
          const targetKey = branch === 'yes' ? 'yesSteps' : 'noSteps'
          const currentList = step[targetKey] || []
          const nextList = currentList.length > 0
            ? currentList.map((item, idx) => (idx === 0 ? { ...item, text } : item))
            : [{ id: `step-${Date.now()}-${branch}-1`, text, kind: 'io' as NodeKind }]

          return { ...step, [targetKey]: nextList }
        }
        return {
          ...step,
          ...(step.yesSteps ? { yesSteps: update(step.yesSteps) } : {}),
          ...(step.noSteps ? { noSteps: update(step.noSteps) } : {}),
        }
      })
    }
    const nextSteps = update(algorithmSteps)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  reorderAlgorithmSteps: (fromIndex, toIndex) => {
    const { pastAlgorithm, algorithmSteps } = get()
    if (fromIndex < 0 || fromIndex >= algorithmSteps.length || toIndex < 0 || toIndex >= algorithmSteps.length) return
    const nextSteps = [...algorithmSteps]
    const [moved] = nextSteps.splice(fromIndex, 1)
    nextSteps.splice(toIndex, 0, moved)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  toggleDecision: (id, isDecision) => {
    const { pastAlgorithm, algorithmSteps } = get()
    let changed = false
    const update = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(step => {
        if (step.id === id) {
          if (isDecision && step.kind !== 'decision') {
            changed = true
            return {
              ...step,
              kind: 'decision',
              yesSteps: step.yesSteps || [],
              noSteps: step.noSteps || [],
            }
          } else if (!isDecision && step.kind === 'decision') {
            changed = true
            const nextStep = { ...step, kind: 'process' as StepKind }
            delete nextStep.yesSteps
            delete nextStep.noSteps
            return nextStep
          }
        }
        return {
          ...step,
          ...(step.yesSteps ? { yesSteps: update(step.yesSteps) } : {}),
          ...(step.noSteps ? { noSteps: update(step.noSteps) } : {}),
        }
      })
    }
    const nextSteps = update(algorithmSteps)
    if (changed) {
      set({
        algorithmSteps: nextSteps,
        pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
        futureAlgorithm: [],
      })
      if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
    }
  },

  addBranchAlgorithmStep: (parentDecisionId, branch, text, kind) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const update = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(step => {
        if (step.id === parentDecisionId) {
          const targetKey = branch === 'yes' ? 'yesSteps' : 'noSteps'
          const currentList = step[targetKey] || []
          const newSubStep: AlgorithmStep = {
            id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            text: text.trim() || '새 하위 단계',
            kind,
          }
          return { ...step, [targetKey]: [...currentList, newSubStep] }
        }
        return {
          ...step,
          ...(step.yesSteps ? { yesSteps: update(step.yesSteps) } : {}),
          ...(step.noSteps ? { noSteps: update(step.noSteps) } : {}),
        }
      })
    }
    const nextSteps = update(algorithmSteps)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  removeBranchAlgorithmStep: (_parentDecisionId, _branch, stepId) => {
    get().removeAlgorithmStep(stepId)
  },

  updateBranchAlgorithmStep: (_parentDecisionId, _branch, stepId, text, kind) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const update = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(step => {
        if (step.id === stepId) {
          const nextKind = kind || step.kind
          return {
            ...step,
            text,
            kind: nextKind,
            ...(nextKind === 'decision'
              ? {
                  yesSteps: step.yesSteps || [],
                  noSteps: step.noSteps || [],
                }
              : nextKind === 'loop'
              ? {
                  yesSteps: step.yesSteps || [],
                  loopTrigger: step.loopTrigger || 'yes',
                }
              : {}),
          }
        }
        return {
          ...step,
          ...(step.yesSteps ? { yesSteps: update(step.yesSteps) } : {}),
          ...(step.noSteps ? { noSteps: update(step.noSteps) } : {}),
        }
      })
    }
    const nextSteps = update(algorithmSteps)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  moveStepToBranch: (stepId, targetDecisionId, targetBranch, targetIndex) => {
    if (stepId === targetDecisionId) return // 판단 노드 자기 자신 내부로 드롭 방지

    const { pastAlgorithm, algorithmSteps } = get()
    let extractedStep: AlgorithmStep | null = null
    
    // Find original location first
    let origDecisionId: string | null = null
    let origBranch: 'yes' | 'no' | null = null
    let origIndex: number = -1

    const findOrig = (steps: AlgorithmStep[], decisionId: string | null = null, branch: 'yes'|'no'|null = null) => {
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].id === stepId) {
          origDecisionId = decisionId
          origBranch = branch
          origIndex = i
          return
        }
        if (steps[i].yesSteps) findOrig(steps[i].yesSteps!, steps[i].id, 'yes')
        if (steps[i].noSteps) findOrig(steps[i].noSteps!, steps[i].id, 'no')
      }
    }
    findOrig(algorithmSteps)

    const extract = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      const result: AlgorithmStep[] = []
      for (const s of steps) {
        if (s.id === stepId) {
          extractedStep = { ...s }
          continue
        }
        const yesList = s.yesSteps ? extract(s.yesSteps) : undefined
        const noList = s.noSteps ? extract(s.noSteps) : undefined
        result.push({
          ...s,
          ...(yesList ? { yesSteps: yesList } : {}),
          ...(noList ? { noSteps: noList } : {}),
        })
      }
      return result
    }

    const cleaned = extract(algorithmSteps)
    if (!extractedStep) return

    const insert = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps.map(s => {
        if (s.id === targetDecisionId) {
          const targetKey = targetBranch === 'yes' ? 'yesSteps' : 'noSteps'
          const currentList = [...(s[targetKey] || [])]
          let insertIdx = typeof targetIndex === 'number' ? targetIndex : currentList.length
          
          if (origDecisionId === targetDecisionId && origBranch === targetBranch && origIndex !== -1 && origIndex < insertIdx) {
            insertIdx -= 1
          }
          
          insertIdx = Math.max(0, Math.min(insertIdx, currentList.length))
          currentList.splice(insertIdx, 0, extractedStep!)
          return { ...s, [targetKey]: currentList }
        }
        const yesList = s.yesSteps ? insert(s.yesSteps) : undefined
        const noList = s.noSteps ? insert(s.noSteps) : undefined
        return {
          ...s,
          ...(yesList ? { yesSteps: yesList } : {}),
          ...(noList ? { noSteps: noList } : {}),
        }
      })
    }

    const nextSteps = insert(cleaned)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  moveStepToRoot: (stepId, targetIndex) => {
    const { pastAlgorithm, algorithmSteps } = get()
    let extractedStep: AlgorithmStep | null = null
    let origRootIndex = -1

    for (let i = 0; i < algorithmSteps.length; i++) {
      if (algorithmSteps[i].id === stepId) {
        origRootIndex = i
        break
      }
    }

    const extract = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      const result: AlgorithmStep[] = []
      for (const s of steps) {
        if (s.id === stepId) {
          extractedStep = { ...s }
          continue
        }
        const yesList = s.yesSteps ? extract(s.yesSteps) : undefined
        const noList = s.noSteps ? extract(s.noSteps) : undefined
        result.push({
          ...s,
          ...(yesList ? { yesSteps: yesList } : {}),
          ...(noList ? { noSteps: noList } : {}),
        })
      }
      return result
    }

    const cleaned = extract(algorithmSteps)
    if (!extractedStep) return

    let insertIdx = typeof targetIndex === 'number' ? targetIndex : cleaned.length
    if (origRootIndex !== -1 && origRootIndex < insertIdx) {
      insertIdx -= 1
    }
    insertIdx = Math.max(0, Math.min(insertIdx, cleaned.length))
    cleaned.splice(insertIdx, 0, extractedStep)

    set({
      algorithmSteps: cleaned,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  insertStepAfter: (targetId, text, kind) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const actualKind = kind === 'process' || !kind ? autoDetectKind(text || '', kind || 'process') : kind
    const newStep: AlgorithmStep = {
      id: `step-${Date.now()}`,
      text: text?.trim() || '',
      kind: actualKind,
      ...(actualKind === 'decision'
        ? { yesSteps: [], noSteps: [] }
        : actualKind === 'loop'
        ? { yesSteps: [], loopTrigger: 'yes' }
        : {}),
    }

    const insert = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      const result: AlgorithmStep[] = []
      for (const s of steps) {
        const yesList = s.yesSteps ? insert(s.yesSteps) : undefined
        const noList = s.noSteps ? insert(s.noSteps) : undefined
        result.push({
          ...s,
          ...(yesList ? { yesSteps: yesList } : {}),
          ...(noList ? { noSteps: noList } : {}),
        })
        if (s.id === targetId) {
          result.push(newStep)
        }
      }
      return result
    }
    
    set({
      algorithmSteps: insert(algorithmSteps),
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  indentStep: (id) => {
    const { pastAlgorithm, algorithmSteps } = get()

    // 1. 트리에서 해당 아이템을 제거하고 추출하며, 이전 형제의 하위로 밀어넣는 로직
    const processIndent = (steps: AlgorithmStep[]): { newSteps: AlgorithmStep[], changed: boolean } => {
      let changed = false
      const result: AlgorithmStep[] = []
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i]
        if (s.id === id) {
          // indent 불가능한 경우 (첫번째 요소거나 이전 형제가 하위를 가질 수 없는 경우)
          if (i === 0) {
            result.push(s)
            continue
          }
          const prev = result[i - 1]
          if (prev.kind === 'decision' || prev.kind === 'loop') {
            changed = true
            // 이전 형제의 yesSteps에 추가
            if (!prev.yesSteps) prev.yesSteps = []
            prev.yesSteps.push({ ...s })
            continue
          } else {
            // 이전 형제가 decision이 아니면 무시
            result.push(s)
            continue
          }
        }
        
        const yesRes = s.yesSteps ? processIndent(s.yesSteps) : { newSteps: undefined, changed: false }
        const noRes = s.noSteps ? processIndent(s.noSteps) : { newSteps: undefined, changed: false }
        if (yesRes.changed || noRes.changed) changed = true

        result.push({
          ...s,
          ...(yesRes.newSteps ? { yesSteps: yesRes.newSteps } : {}),
          ...(noRes.newSteps ? { noSteps: noRes.newSteps } : {}),
        })
      }
      return { newSteps: result, changed }
    }

    const { newSteps, changed } = processIndent(algorithmSteps)
    if (changed) {
      set({
        algorithmSteps: newSteps,
        pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
        futureAlgorithm: [],
      })
      if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
    }
  },

  outdentStep: (id) => {
    const { pastAlgorithm, algorithmSteps } = get()
    
    const processOutdent = (steps: AlgorithmStep[]): { newSteps: AlgorithmStep[], extracted: AlgorithmStep | null } => {
      let extractedStep: AlgorithmStep | null = null
      const result: AlgorithmStep[] = []
      
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i]
        if (s.id === id) {
          extractedStep = { ...s }
          continue // 현재 레벨에서 제거
        }
        
        const yesRes = s.yesSteps ? processOutdent(s.yesSteps) : { newSteps: undefined, extracted: null }
        const noRes = s.noSteps ? processOutdent(s.noSteps) : { newSteps: undefined, extracted: null }
        
        const updatedStep = {
          ...s,
          ...(yesRes.newSteps ? { yesSteps: yesRes.newSteps } : {}),
          ...(noRes.newSteps ? { noSteps: noRes.newSteps } : {}),
        }
        result.push(updatedStep)
        
        // 자식에서 추출된 노드가 있다면 현재 레벨(부모의 다음)에 삽입
        if (yesRes.extracted) result.push(yesRes.extracted)
        if (noRes.extracted) result.push(noRes.extracted)
      }
      
      return { newSteps: result, extracted: extractedStep }
    }

    const { newSteps } = processOutdent(algorithmSteps)
    // 최상위에서 extracted되었다면 이미 root에 있으므로 무시 (변화 없음)
    
    // 만약 뭔가 변경되었다면 (즉, 자식 레벨에서 추출되어 부모 레벨로 추가된 경우)
    // 최상위 배열 길이가 달라졌거나 내부가 변함
    set({
      algorithmSteps: newSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  removeAlgorithmStep: (id) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const clean = (steps: AlgorithmStep[]): AlgorithmStep[] => {
      return steps
        .filter(s => s.id !== id)
        .map(s => ({
          ...s,
          ...(s.yesSteps ? { yesSteps: clean(s.yesSteps) } : {}),
          ...(s.noSteps ? { noSteps: clean(s.noSteps) } : {}),
        }))
    }
    const nextSteps = clean(algorithmSteps)
    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  clearAlgorithmSteps: () => {
    const { pastAlgorithm, algorithmSteps } = get()
    if (!algorithmSteps.length) return
    set({
      algorithmSteps: [],
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
      hoveredStepId: null,
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  moveAlgorithmStep: (id, direction) => {
    const { pastAlgorithm, algorithmSteps } = get()
    const index = algorithmSteps.findIndex(s => s.id === id)
    if (index === -1) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= algorithmSteps.length) return

    const nextSteps = [...algorithmSteps]
    const [moved] = nextSteps.splice(index, 1)
    nextSteps.splice(targetIndex, 0, moved)

    set({
      algorithmSteps: nextSteps,
      pastAlgorithm: pushAlgorithmHistory(pastAlgorithm, algorithmSteps),
      futureAlgorithm: [],
    })
    if (get().isAutoSyncEnabled) get().generateFlowchartFromAlgorithm()
  },

  setHoveredStepId: (stepId) => {
    const { algorithmSteps, nodes } = get()
    const step = algorithmSteps.find(s => s.id === stepId)
    const targetNodeId = step?.nodeId

    set({
      hoveredStepId: stepId,
      nodes: nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          isAlgorithmHighlighted: targetNodeId ? n.id === targetNodeId : false,
        },
      })),
    })
  },

  generateFlowchartFromAlgorithm: () => {
    const { algorithmSteps, nodes: curNodes, edges: curEdges, past } = get()
    if (algorithmSteps.length === 0) return

    const getLayoutedElements = (nodes: FlowNode[], edges: FlowEdge[]) => {
      if (nodes.length === 0) return { nodes, edges }

      const g = new dagre.graphlib.Graph()
      g.setGraph({
        rankdir: 'TB',
        nodesep: 100,
        ranksep: 120,
        marginx: 150,
        marginy: 80,
      })
      g.setDefaultEdgeLabel(() => ({}))

      nodes.forEach((node) => {
        const isDecision = node.type === 'decision'
        const width = isDecision ? 180 : 150
        const height = isDecision ? 90 : 50
        g.setNode(node.id, { width, height })
      })

      edges.forEach((edge) => {
        const isLoopReturn = edge.id.includes('loop-return')
        if (!isLoopReturn) {
          g.setEdge(edge.source, edge.target)
        }
      })

      dagre.layout(g)

      const layoutedNodes = nodes.map((node) => {
        const nodeWithPos = g.node(node.id)
        const isDecision = node.type === 'decision'
        const width = isDecision ? 180 : 150
        const height = isDecision ? 90 : 50

        return {
          ...node,
          position: {
            x: Math.round((nodeWithPos?.x ?? 300) - width / 2),
            y: Math.round((nodeWithPos?.y ?? 60) - height / 2),
          },
        }
      })

      const nodeMap = new Map(layoutedNodes.map(n => [n.id, n]))

      // Pre-compute dynamic handle assignments for decision nodes (one bottom handle, one side handle)
      const decisionEdgesMap = new Map<string, FlowEdge[]>()
      edges.forEach((edge) => {
        if (edge.id.includes('loop-return')) return
        const srcNode = nodeMap.get(edge.source)
        if (srcNode?.type === 'decision') {
          const list = decisionEdgesMap.get(edge.source) || []
          list.push(edge)
          decisionEdgesMap.set(edge.source, list)
        }
      })

      const edgeHandleAssignment = new Map<string, { sourceHandle: string; targetHandle: string }>()

      decisionEdgesMap.forEach((outEdges, decisionNodeId) => {
        const srcNode = nodeMap.get(decisionNodeId)
        if (!srcNode) return

        if (outEdges.length === 1) {
          const edge = outEdges[0]
          const tgtNode = nodeMap.get(edge.target)
          const dx = tgtNode ? tgtNode.position.x - srcNode.position.x : 0
          const dy = tgtNode ? tgtNode.position.y - srcNode.position.y : 0

          const sourceHandle = Math.abs(dx) > Math.abs(dy) && dx > 30 ? 'right' : 'bottom'
          edgeHandleAssignment.set(edge.id, { sourceHandle, targetHandle: 'target-top' })
        } else if (outEdges.length >= 2) {
          const scored = outEdges.map((edge) => {
            const tgtNode = nodeMap.get(edge.target)
            const dx = tgtNode ? tgtNode.position.x - srcNode.position.x : 0
            const dy = tgtNode ? tgtNode.position.y - srcNode.position.y : 0
            const verticalScore = dy - Math.abs(dx)
            return { edge, dx, dy, verticalScore }
          })

          // Sort by verticalScore descending: closest to straight down gets bottom handle
          scored.sort((a, b) => b.verticalScore - a.verticalScore)

          // Straight-down target gets bottom handle
          edgeHandleAssignment.set(scored[0].edge.id, {
            sourceHandle: 'bottom',
            targetHandle: 'target-top',
          })

          // Side target gets right or left handle based on dx direction
          for (let i = 1; i < scored.length; i++) {
            const item = scored[i]
            const sideHandle = item.dx < -30 ? 'left' : 'right'
            edgeHandleAssignment.set(item.edge.id, {
              sourceHandle: sideHandle,
              targetHandle: 'target-top',
            })
          }
        }
      })

      const layoutedEdges = edges.map((edge) => {
        const srcNode = nodeMap.get(edge.source)
        const tgtNode = nodeMap.get(edge.target)

        if (!srcNode || !tgtNode) return edge

        const isLoopReturn = edge.id.includes('loop-return')
        if (isLoopReturn) {
          const isSelfTarget = edge.source === edge.target
          return {
            ...edge,
            sourceHandle: 'top',
            targetHandle: isSelfTarget ? 'target-top' : 'target-right',
          }
        }

        const assigned = edgeHandleAssignment.get(edge.id)
        let sourceHandle = assigned?.sourceHandle || edge.sourceHandle || 'bottom'
        let targetHandle = assigned?.targetHandle || edge.targetHandle || 'target-top'

        const dx = tgtNode.position.x - srcNode.position.x
        const dy = tgtNode.position.y - srcNode.position.y

        if (dy < -30 && Math.abs(dx) > 30) {
          targetHandle = dx > 0 ? 'target-left' : 'target-right'
        }

        return {
          ...edge,
          sourceHandle,
          targetHandle,
        }
      })

      return { nodes: layoutedNodes, edges: layoutedEdges }
    }

    const stepIdToNodeId: Record<string, string> = {}

    // Pre-assign nodeIds recursively for all root & nested steps
    const assignNodeIdsRecursively = (steps: AlgorithmStep[], prefix = 'algo'): AlgorithmStep[] => {
      return steps.map((s, idx) => {
        const nodeId = s.nodeId || `node-${prefix}-${idx}-${Date.now()}`
        stepIdToNodeId[s.id] = nodeId
        return {
          ...s,
          nodeId,
          ...(s.yesSteps ? { yesSteps: assignNodeIdsRecursively(s.yesSteps, `${prefix}-y${idx}`) } : {}),
          ...(s.noSteps ? { noSteps: assignNodeIdsRecursively(s.noSteps, `${prefix}-n${idx}`) } : {}),
        }
      })
    }

    const updatedSteps = assignNodeIdsRecursively(algorithmSteps)
    const startX = 300
    const startY = 60
    const stepGapY = 140
    const toNodeKind = (kind: StepKind): NodeKind => (kind === 'loop' ? 'decision' : kind === 'none' ? 'process' : kind)

    // Recursive step renderer for arbitrary nested control structures
    const processStepList = (
      stepList: AlgorithmStep[],
      curX: number,
      curY: number,
      prevConnectIds: string[],
      parentPath = 'algo'
    ): {
      nodes: FlowNode[]
      edges: FlowEdge[]
      outgoingConnectIds: string[]
      finalY: number
    } => {
      const resultNodes: FlowNode[] = []
      const resultEdges: FlowEdge[] = []
      let currentY = curY
      let currentPrevIds = [...prevConnectIds]

      stepList.forEach((step, sIdx) => {
        const nodeId = step.nodeId || `node-${parentPath}-${sIdx}-${Date.now()}`
        stepIdToNodeId[step.id] = nodeId

        if (step.kind === 'decision') {
          // ─── 1. Decision Node (선택구조) ───────────────────────────────
          resultNodes.push({
            id: nodeId,
            type: 'decision',
            position: { x: curX, y: currentY },
            data: { label: step.text, kind: 'decision' },
          })

          // Connect incoming edges
          currentPrevIds.forEach(prevIdStr => {
            let realPrevId = prevIdStr
            let sourceHandle = 'bottom'
            let labelStr: string | undefined = undefined
            let isDecision = false

            if (prevIdStr.startsWith('loop-exit:')) {
              const parts = prevIdStr.split(':')
              realPrevId = parts[1]
              labelStr = parts[2]
              isDecision = true
            } else if (prevIdStr.startsWith('decision-branch:')) {
              const parts = prevIdStr.split(':')
              realPrevId = parts[1]
              sourceHandle = parts[2]
              labelStr = parts[3]
              isDecision = true
            }

            resultEdges.push({
              id: `edge-${realPrevId}-${nodeId}`,
              source: realPrevId,
              sourceHandle: sourceHandle,
              target: nodeId,
              targetHandle: 'target-top',
              type: 'labeled',
              ...(isDecision ? {
                label: labelStr,
                markerEnd: { type: MarkerType.ArrowClosed, color: labelStr?.includes('참') ? '#16a34a' : '#dc2626' },
                style: { strokeWidth: 2, stroke: labelStr?.includes('참') ? '#16a34a' : '#dc2626', ...(labelStr?.includes('거짓') ? { strokeDasharray: '4 4' } : {}) },
                data: { isDecisionEdge: true },
              } : {
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
                style: { strokeWidth: 2, stroke: '#64748b' },
              }),
            })
          })

          const hasYes = step.yesSteps && step.yesSteps.length > 0
          const hasNo = step.noSteps && step.noSteps.length > 0

          let yesRes = {
            nodes: [] as FlowNode[],
            edges: [] as FlowEdge[],
            outgoingConnectIds: [`decision-branch:${nodeId}:bottom:참 (예)`],
            finalY: currentY + stepGapY,
          }

          let noRes = {
            nodes: [] as FlowNode[],
            edges: [] as FlowEdge[],
            outgoingConnectIds: [`decision-branch:${nodeId}:right:거짓 (아니오)`],
            finalY: currentY + stepGapY,
          }

          // YES Branch Sub-Steps (Recursion!)
          if (hasYes) {
            yesRes = processStepList(
              step.yesSteps!,
              curX,
              currentY + stepGapY,
              [nodeId],
              `${parentPath}-y${sIdx}`
            )
            if (yesRes.edges.length > 0) {
              yesRes.edges[0].label = '참 (예)'
              yesRes.edges[0].data = { ...yesRes.edges[0].data, isDecisionEdge: true }
              yesRes.edges[0].style = { strokeWidth: 2, stroke: '#16a34a' }
              yesRes.edges[0].markerEnd = { type: MarkerType.ArrowClosed, color: '#16a34a' }
            }
            resultNodes.push(...yesRes.nodes)
            resultEdges.push(...yesRes.edges)
          }

          // NO Branch Sub-Steps (Recursion!)
          if (hasNo) {
            noRes = processStepList(
              step.noSteps!,
              curX + 240,
              currentY + stepGapY,
              [nodeId],
              `${parentPath}-n${sIdx}`
            )
            if (noRes.edges.length > 0) {
              noRes.edges[0].sourceHandle = 'right'
              noRes.edges[0].targetHandle = 'target-top'
              noRes.edges[0].label = '거짓 (아니오)'
              noRes.edges[0].data = { ...noRes.edges[0].data, isDecisionEdge: true }
              noRes.edges[0].style = { strokeWidth: 2, stroke: '#dc2626', strokeDasharray: '4 4' }
              noRes.edges[0].markerEnd = { type: MarkerType.ArrowClosed, color: '#dc2626' }
            }
            resultNodes.push(...noRes.nodes)
            resultEdges.push(...noRes.edges)
          }

          currentY = Math.max(
            hasYes ? yesRes.finalY : currentY + stepGapY,
            hasNo ? noRes.finalY : currentY + stepGapY
          )
          currentPrevIds = [...yesRes.outgoingConnectIds, ...noRes.outgoingConnectIds]

        } else if (step.kind === 'loop') {
          // ─── 2. Loop Node (반복구조) ─────────────────────────────────
          const isTriggerYes = (step.loopTrigger ?? 'yes') === 'yes'
          const triggerLabel = isTriggerYes ? '참 (반복)' : '거짓 (반복)'
          const exitLabel = isTriggerYes ? '거짓 (종료)' : '참 (종료)'

          resultNodes.push({
            id: nodeId,
            type: 'decision',
            position: { x: curX, y: currentY },
            data: { label: `${step.text} (반복)`, kind: 'decision' },
          })

          // Connect incoming edges
          currentPrevIds.forEach(prevIdStr => {
            let realPrevId = prevIdStr
            let sourceHandle = 'bottom'
            let labelStr: string | undefined = undefined
            let isDecision = false

            if (prevIdStr.startsWith('loop-exit:')) {
              const parts = prevIdStr.split(':')
              realPrevId = parts[1]
              labelStr = parts[2]
              isDecision = true
            } else if (prevIdStr.startsWith('decision-branch:')) {
              const parts = prevIdStr.split(':')
              realPrevId = parts[1]
              sourceHandle = parts[2]
              labelStr = parts[3]
              isDecision = true
            }

            resultEdges.push({
              id: `edge-${realPrevId}-${nodeId}`,
              source: realPrevId,
              sourceHandle: sourceHandle,
              target: nodeId,
              targetHandle: 'target-top',
              type: 'labeled',
              ...(isDecision ? {
                label: labelStr,
                markerEnd: { type: MarkerType.ArrowClosed, color: labelStr?.includes('참') ? '#16a34a' : '#dc2626' },
                style: { strokeWidth: 2, stroke: labelStr?.includes('참') ? '#16a34a' : '#dc2626', ...(labelStr?.includes('거짓') ? { strokeDasharray: '4 4' } : {}) },
                data: { isDecisionEdge: true },
              } : {
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
                style: { strokeWidth: 2, stroke: '#64748b' },
              }),
            })
          })

          // Loop Body Sub-Steps (Recursion!) in Right Column (curX + 260)
          const loopSteps = step.yesSteps && step.yesSteps.length > 0
            ? step.yesSteps
            : [{ id: `${nodeId}-loop-def`, text: '반복 실행 처리', kind: 'process' as StepKind }]

          const loopRes = processStepList(
            loopSteps,
            curX + 260,
            currentY,
            [nodeId],
            `${parentPath}-l${sIdx}`
          )
          if (loopRes.edges.length > 0) {
            loopRes.edges[0].sourceHandle = 'right'
            loopRes.edges[0].targetHandle = 'target-left'
            loopRes.edges[0].label = triggerLabel
            loopRes.edges[0].data = { ...loopRes.edges[0].data, isDecisionEdge: true }
            loopRes.edges[0].style = { strokeWidth: 2, stroke: '#16a34a' }
            loopRes.edges[0].markerEnd = { type: MarkerType.ArrowClosed, color: '#16a34a' }
          }
          resultNodes.push(...loopRes.nodes)
          resultEdges.push(...loopRes.edges)

          // 🔄 Loop Back-Edge: from last body node UP to targetStepId node (or self)
          const targetNodeId = (step.targetStepId && stepIdToNodeId[step.targetStepId])
            ? stepIdToNodeId[step.targetStepId]
            : nodeId

          const isSelfTarget = targetNodeId === nodeId

          loopRes.outgoingConnectIds.forEach(lastBodyIdStr => {
            const realLastId = lastBodyIdStr.startsWith('loop-exit:') ? lastBodyIdStr.split(':')[1] : lastBodyIdStr
            resultEdges.push({
              id: `edge-loop-return-${nodeId}-${realLastId}`,
              source: realLastId,
              sourceHandle: 'top',
              target: targetNodeId,
              targetHandle: isSelfTarget ? 'target-top' : 'target-right',
              type: 'labeled',
              label: '↩️ 되돌아가기',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
              style: { strokeWidth: 2.5, stroke: '#6366f1' },
            })
          })

          currentY = Math.max(currentY + stepGapY, loopRes.finalY)
          currentPrevIds = [`loop-exit:${nodeId}:${exitLabel}`]

        } else {
          // ─── 3. Standard Node (시작/끝, 입출력, 처리) ────────────────
          const sKind = toNodeKind(step.kind)
          resultNodes.push({
            id: nodeId,
            type: sKind,
            position: { x: curX, y: currentY },
            data: { label: step.text, kind: sKind },
          })

          currentPrevIds.forEach(prevIdStr => {
            let realPrevId = prevIdStr
            let sourceHandle = 'bottom'
            let labelStr: string | undefined = undefined
            let isDecision = false

            if (prevIdStr.startsWith('loop-exit:')) {
              const parts = prevIdStr.split(':')
              realPrevId = parts[1]
              labelStr = parts[2]
              isDecision = true
            } else if (prevIdStr.startsWith('decision-branch:')) {
              const parts = prevIdStr.split(':')
              realPrevId = parts[1]
              sourceHandle = parts[2]
              labelStr = parts[3]
              isDecision = true
            }

            resultEdges.push({
              id: `edge-${realPrevId}-${nodeId}`,
              source: realPrevId,
              sourceHandle: sourceHandle,
              target: nodeId,
              targetHandle: 'target-top',
              type: 'labeled',
              ...(isDecision ? {
                label: labelStr,
                markerEnd: { type: MarkerType.ArrowClosed, color: labelStr?.includes('참') ? '#16a34a' : '#dc2626' },
                style: { strokeWidth: 2, stroke: labelStr?.includes('참') ? '#16a34a' : '#dc2626', ...(labelStr?.includes('거짓') ? { strokeDasharray: '4 4' } : {}) },
                data: { isDecisionEdge: true },
              } : {
                markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
                style: { strokeWidth: 2, stroke: '#64748b' },
              }),
            })
          })

          currentY += stepGapY
          currentPrevIds = [nodeId]
        }
      })

      return {
        nodes: resultNodes,
        edges: resultEdges,
        outgoingConnectIds: currentPrevIds,
        finalY: currentY,
      }
    }

    const { nodes: newNodes, edges: newEdges, outgoingConnectIds, finalY } = processStepList(
      updatedSteps,
      startX,
      startY,
      []
    )

    // Handle any unhandled trailing exit edges by appending a terminal end node ("끝")
    if (outgoingConnectIds.length > 0 && outgoingConnectIds.some(id => id.startsWith('loop-exit:'))) {
      const endNodeId = `node-algo-end-${Date.now()}`
      newNodes.push({
        id: endNodeId,
        type: 'terminal',
        position: { x: startX, y: finalY },
        data: { label: '끝', kind: 'terminal' },
      })

      outgoingConnectIds.forEach(prevIdStr => {
        const isLoopExit = prevIdStr.startsWith('loop-exit:')
        const realPrevId = isLoopExit ? prevIdStr.split(':')[1] : prevIdStr
        const exitLabelStr = isLoopExit ? prevIdStr.split(':')[2] : undefined

        newEdges.push({
          id: `edge-${realPrevId}-${endNodeId}`,
          source: realPrevId,
          sourceHandle: 'bottom',
          target: endNodeId,
          targetHandle: 'target-top',
          type: 'labeled',
          ...(isLoopExit ? {
            label: exitLabelStr,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#dc2626' },
            style: { strokeWidth: 2, stroke: '#dc2626', strokeDasharray: '4 4' },
            data: { isDecisionEdge: true },
          } : {
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
            style: { strokeWidth: 2, stroke: '#64748b' },
          }),
        })
      })
    }

    // Apply Dagre graph layout for 100% collision-free & tangle-free flowcharts
    const layouted = getLayoutedElements(newNodes, newEdges)

    set({
      nodes: layouted.nodes,
      edges: layouted.edges,
      algorithmSteps: updatedSteps,
      past: pushCanvasHistory(past, curNodes, curEdges),
      future: [],
    })
    persistToStorage(layouted.nodes, layouted.edges, get().student)
  },

  extractAlgorithmFromFlowchart: () => {
    const { nodes, edges } = get()
    if (nodes.length === 0) return

    // anchor/edge-node 제외 실제 도형만 대상
    const shapeNodes = nodes.filter(n => n.type !== 'anchor' && n.type !== 'edge-node')
    const shapeEdges = edges.filter(e => {
      const srcOk = shapeNodes.some(n => n.id === e.source)
      const tgtOk = shapeNodes.some(n => n.id === e.target)
      return srcOk && tgtOk
    })

    // 방문 추적 (사이클 방지 및 분기 노드 중복 방지)
    const visited = new Set<string>()

    // nodeId 기준 outgoing 엣지 맵
    const outEdges: Record<string, FlowEdge[]> = {}
    shapeEdges.forEach(e => {
      if (!outEdges[e.source]) outEdges[e.source] = []
      outEdges[e.source].push(e)
    })

    // 판단 노드에서 나가는 엣지를 yes/no 분류
    const isYesEdge = (e: FlowEdge) => {
      const label = typeof e.label === 'string' ? e.label : ''
      return label.includes('예') || label.toLowerCase().includes('yes') || label.includes('참')
    }
    const isNoEdge = (e: FlowEdge) => {
      const label = typeof e.label === 'string' ? e.label : ''
      return label.includes('아니오') || label.toLowerCase().includes('no') || label.includes('거짓')
    }

    let stepCounter = 0

    // 그래프 순회: 현재 nodeId에서 이어지는 스텝들을 재귀적으로 수집
    // stopAt: 이 노드 id를 만나면 중단 (분기 합류점)
    const collectSteps = (nodeId: string, stopAt: Set<string>): AlgorithmStep[] => {
      if (!nodeId || visited.has(nodeId) || stopAt.has(nodeId)) return []
      const node = shapeNodes.find(n => n.id === nodeId)
      if (!node) return []

      visited.add(nodeId)
      const step: AlgorithmStep = {
        id: `step-ext-${Date.now()}-${stepCounter++}`,
        text: node.data.label || `단계 ${stepCounter}`,
        kind: node.data.kind || 'process',
        nodeId: node.id,
      }

      const outs = outEdges[nodeId] || []

      if (node.data.kind === 'decision') {
        // 판단 노드: yes/no 분기 탐색
        const yesEdge = outs.find(isYesEdge) || outs.find(e => !isNoEdge(e)) || outs[0]
        const noEdge  = outs.find(isNoEdge)  || outs.find(e => e !== yesEdge)  || outs[1]

        // 합류점 찾기: yes/no 두 분기가 모두 도달하는 첫 번째 공통 노드
        const mergeNode = findMergeNode(yesEdge?.target, noEdge?.target, outEdges, shapeNodes)
        const mergeSet = mergeNode ? new Set([mergeNode]) : new Set<string>()

        if (yesEdge?.target) {
          step.yesSteps = collectSteps(yesEdge.target, mergeSet)
          // yes 탐색에서 방문한 노드들을 visited에 추가
          step.yesSteps.forEach(s => s.nodeId && visited.add(s.nodeId))
        }
        if (noEdge?.target) {
          step.noSteps = collectSteps(noEdge.target, mergeSet)
          step.noSteps.forEach(s => s.nodeId && visited.add(s.nodeId))
        }

        const result: AlgorithmStep[] = [step]
        // 합류점 이후 계속 탐색
        if (mergeNode) {
          result.push(...collectSteps(mergeNode, stopAt))
        }
        return result
      } else {
        // 일반 노드: 다음 노드로 계속
        const next = outs[0]?.target
        return [step, ...collectSteps(next || '', stopAt)]
      }
    }

    // 시작 노드 찾기 (terminal '시작' 우선, 없으면 in-degree 0인 노드)
    const inDegree: Record<string, number> = {}
    shapeNodes.forEach(n => { inDegree[n.id] = 0 })
    shapeEdges.forEach(e => { inDegree[e.target] = (inDegree[e.target] || 0) + 1 })

    let startNode =
      shapeNodes.find(n => n.data.kind === 'terminal' && isStartLabel(n.data.label)) ||
      shapeNodes.find(n => inDegree[n.id] === 0) ||
      shapeNodes[0]

    const extractedSteps = startNode ? collectSteps(startNode.id, new Set()) : []

    set({ algorithmSteps: extractedSteps })
  },
}))
