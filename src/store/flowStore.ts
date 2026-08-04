import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges, reconnectEdge, MarkerType } from '@xyflow/react'
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react'
import type { FlowNode, FlowEdge, StudentInfo, SimulationState } from '../types'
import { DECISION_LABELS } from '../constants/nodeConfig'

const STORAGE_KEY = 'flowchart-drawer-v3'
const DEBOUNCE_MS = 2000

// ─── Types ──────────────────────────────────────────────────────────────────────
interface HistoryEntry {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface FlowStore {
  // Canvas state
  nodes: FlowNode[]
  edges: FlowEdge[]
  // Undo/Redo stacks
  past: HistoryEntry[]
  future: HistoryEntry[]
  // Student info
  student: StudentInfo
  // Simulation
  simulation: SimulationState
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
  clearCanvas: () => void
  loadTemplate: (nodes: FlowNode[], edges: FlowEdge[]) => void
  setStudent: (info: Partial<StudentInfo>) => void
  updateSimulation: (sim: Partial<SimulationState>) => void
  resetSimulation: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null

function persistToStorage(nodes: FlowNode[], edges: FlowEdge[], student: StudentInfo) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges, student }))
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, DEBOUNCE_MS)
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
function pushHistory(past: HistoryEntry[], nodes: FlowNode[], edges: FlowEdge[]): HistoryEntry[] {
  const next = [...past, { nodes, edges }]
  return next.length > 50 ? next.slice(next.length - 50) : next
}

// ─── Store ───────────────────────────────────────────────────────────────────────
const saved = loadFromStorage()

export const useFlowStore = create<FlowStore>((set, get) => ({
  nodes: saved?.nodes ?? [],
  edges: saved?.edges ?? [],
  past: [],
  future: [],
  student: saved?.student ?? DEFAULT_STUDENT,
  simulation: DEFAULT_SIM,

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
      ...(hasMeaningfulChange ? { past: pushHistory(past, nodes, edges), future: [] } : {}),
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  onEdgesChange: (changes) => {
    const { nodes, edges, past } = get()
    const hasMeaningfulChange = changes.some(c => c.type === 'remove' || c.type === 'add')
    set({
      edges: applyEdgeChanges(changes, edges),
      ...(hasMeaningfulChange ? { past: pushHistory(past, nodes, edges), future: [] } : {}),
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
      past: pushHistory(past, nodes, edges),
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
      past: pushHistory(past, nodes, edges),
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
      past: pushHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(nextNodes, nextEdges, get().student)
  },

  updateNodeLabel: (id, label) => {
    const { nodes, edges, past } = get()
    set({
      nodes: nodes.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n),
      past: pushHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  addNode: (node) => {
    const { nodes, edges, past } = get()
    set({
      nodes: [...nodes, node],
      past: pushHistory(past, nodes, edges),
      future: [],
    })
    persistToStorage(get().nodes, get().edges, get().student)
  },

  removeNode: (id) => {
    const { nodes, edges, past } = get()
    const nextNodes = nodes.filter(n => n.id !== id)
    const nextEdges = edges.filter(e => e.source !== id && e.target !== id)
    set({
      nodes: nextNodes,
      edges: nextEdges,
      past: pushHistory(past, nodes, edges),
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
      past: pushHistory(past, nodes, edges),
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
      past: pushHistory(past, nodes, edges),
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

  clearCanvas: () => {
    const { nodes, edges, past } = get()
    set({ nodes: [], edges: [], past: pushHistory(past, nodes, edges), future: [] })
    persistToStorage([], [], get().student)
  },

  loadTemplate: (nodes, edges) => {
    const { nodes: cur, edges: curE, past } = get()
    set({ nodes, edges, past: pushHistory(past, cur, curE), future: [] })
    persistToStorage(nodes, edges, get().student)
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
}))
