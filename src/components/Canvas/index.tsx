import React, { useCallback, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  MarkerType,
  useReactFlow,
  OnConnectStart,
  OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useFlowStore } from '../../store/flowStore'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { OnboardingGuide } from './OnboardingGuide'
import { TrashBin } from './TrashBin'
import { NODE_CONFIGS, SNAP_GRID } from '../../constants/nodeConfig'
import { isStartLabel } from '../../utils/graph'
import type { NodeKind, FlowNode } from '../../types'

interface CanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>
}

function generateId() { return `node-${crypto.randomUUID()}` }

// 연결 추적용 Ref 타입
interface ConnectingInfo {
  nodeId: string
  handleId: string | null
  handleType: 'source' | 'target'
  isReconnect: boolean
  originalEdgeId: string | null
  /** true = source 끝점(화살표 없는 쪽)이 움직이는 중 */
  isSourceMoving: boolean
}

/** React Flow 캔버스 — 드롭, Delete키, 선택 등 이벤트 처리 */
export const Canvas: React.FC<CanvasProps> = ({ canvasRef }) => {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect, onReconnect, connectAnchorToNode,
    addNode, removeNode, removeEdge, deleteSelectedElements, setIsDraggingEdgeEndpoint,
  } = useFlowStore()

  const [isOverTrash, setIsOverTrash] = useState(false)
  const connectingInfoRef = useRef<ConnectingInfo | null>(null)
  // onReconnect(성공) 가 실행됐는지 추적 → onConnectEnd 이중처리 방지
  const reconnectFiredRef = useRef(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const { screenToFlowPosition } = useReactFlow()
  const isEmpty = nodes.length === 0

  // 모든 기존 엣지들의 타입을 'labeled'로 강제 마이그레이션 (과거에 생성된 straight, smoothstep 변환)
  React.useEffect(() => {
    const hasOldEdgeTypes = edges.some(e => e.type !== 'labeled')
    if (hasOldEdgeTypes) {
      useFlowStore.setState(s => ({
        edges: s.edges.map(e => ({ ...e, type: 'labeled' }))
      }))
    }
  }, [edges])

  // 드래그 오버 허용
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // 팔레트에서 드롭
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()

    const itemType = e.dataTransfer.getData('application/flowchart-item-type')
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const dropX = Math.round(position.x / SNAP_GRID[0]) * SNAP_GRID[0]
    const dropY = Math.round(position.y / SNAP_GRID[1]) * SNAP_GRID[1]

    // 캔버스에 엣지를 드래그해서 휴지통으로 가져왔는지 체크
    const edgeIdToDelete = e.dataTransfer.getData('application/flowchart-edge-id')
    if (edgeIdToDelete) {
      const trashEl = document.getElementById('trash-bin-zone')
      if (trashEl) {
        const rect = trashEl.getBoundingClientRect()
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          removeEdge(edgeIdToDelete)
          setIsOverTrash(false)
          return
        }
      }
    }

    // 흐름선(Edge)을 끌어다 놓은 경우 (다른 도형 없이 독립된 흐름선만 생성)
    if (itemType === 'edge') {
      const a1Id = generateId()
      const a2Id = generateId()

      // 드롭한 위치에 투명 앵커 노드 2개 생성 (100px 길이)
      addNode({
        id: a1Id,
        type: 'anchor',
        position: { x: dropX, y: dropY },
        data: { label: '', kind: 'process' },
        zIndex: 50,
      })
      addNode({
        id: a2Id,
        type: 'anchor',
        position: { x: dropX, y: dropY + 100 },
        data: { label: '', kind: 'process' },
        zIndex: 50,
      })

      setTimeout(() => {
        onConnect({
          source: a1Id,
          sourceHandle: 'src-handle',
          target: a2Id,
          targetHandle: 'handle',
        })
      }, 30)
      return
    }

    const kind = e.dataTransfer.getData('application/flowchart-node-kind') as NodeKind
    if (!kind || !NODE_CONFIGS[kind]) return

    const config = NODE_CONFIGS[kind]

    // 시작 도형이 이미 있으면 새 terminal 라벨을 '끝'으로 자동 변경
    const hasStart = nodes.some(n => n.data.kind === 'terminal' && isStartLabel(n.data.label))
    const defaultLabel = (kind === 'terminal' && hasStart) ? '끝' : config.defaultText

    const width = config.width || 140
    const height = config.height || 60

    addNode({
      id: generateId(),
      type: kind,
      position: {
        x: Math.round((position.x - width / 2) / SNAP_GRID[0]) * SNAP_GRID[0],
        y: Math.round((position.y - height / 2) / SNAP_GRID[1]) * SNAP_GRID[1],
      },
      data: { label: defaultLabel, kind },
    })
  }, [screenToFlowPosition, addNode, onConnect, removeEdge, nodes])

  // 연결 시작 시 시작 노드 및 포트 정보 기록
  const onConnectStart = useCallback((_event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
    // ReconnectStart가 이미 발생했다면 무시 (이중 처리 방지)
    if (connectingInfoRef.current?.isReconnect) return
    
    setIsConnecting(true)
    reconnectFiredRef.current = false
    if (params.nodeId) {
      const ht = (params.handleType ?? 'source') as 'source' | 'target'
      connectingInfoRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
        handleType: ht,
        isReconnect: false,
        originalEdgeId: null,
        isSourceMoving: ht === 'source',
      }
    }
  }, [])

  /**
   * 가장 가까운 포트 찾기 헬퍼
   */
  const findClosestPort = useCallback((targetNode: FlowNode, dropPos: { x: number; y: number }) => {
    const w = NODE_CONFIGS[targetNode.data.kind]?.width || targetNode.width || 140
    const h = NODE_CONFIGS[targetNode.data.kind]?.height || targetNode.height || 60
    const ports = [
      { id: 'top',    x: targetNode.position.x + w / 2, y: targetNode.position.y },
      { id: 'bottom', x: targetNode.position.x + w / 2, y: targetNode.position.y + h },
      { id: 'left',   x: targetNode.position.x,         y: targetNode.position.y + h / 2 },
      { id: 'right',  x: targetNode.position.x + w,     y: targetNode.position.y + h / 2 },
    ]
    let closest = ports[0]
    let minDist = Infinity
    for (const port of ports) {
      const d = Math.hypot(dropPos.x - port.x, dropPos.y - port.y)
      if (d < minDist) { minDist = d; closest = port }
    }
    return closest
  }, [])

  /**
   * 도형 주변에서 가장 가까운 도형 찾기 헬퍼 (anchor/edge-node 제외)
   */
  const findNearbyShape = useCallback((pos: { x: number; y: number }, excludeNodeId?: string) => {
    return nodes.find(n => {
      if (n.id === excludeNodeId) return false
      if (n.type === 'anchor' || n.type === 'edge-node') return false
      const w = NODE_CONFIGS[n.data.kind]?.width || 140
      const h = NODE_CONFIGS[n.data.kind]?.height || 60
      return (
        pos.x >= n.position.x - 40 &&
        pos.x <= n.position.x + w + 40 &&
        pos.y >= n.position.y - 40 &&
        pos.y <= n.position.y + h + 40
      )
    })
  }, [nodes])

  // 연결 종료 시 빈 공간이거나 포트를 빗나간 경우 처리
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: { isValid: boolean | null }) => {
    const info = connectingInfoRef.current
    connectingInfoRef.current = null
    setIsConnecting(false)
    setIsDraggingEdgeEndpoint(false)

    // ① onReconnect(성공 콜백)이 이미 실행된 경우 → 이중처리 방지
    if (reconnectFiredRef.current) {
      reconnectFiredRef.current = false
      return
    }

    // ② 정상 연결(isValid=true)이면 React Flow가 onConnect를 호출하므로 추가 처리 불필요
    if (connectionState.isValid === true) return

    if (!info) return

    const { nodeId, handleId, handleType, isReconnect, originalEdgeId } = info

    const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).touches[0]?.clientX || 0
    const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).touches[0]?.clientY || 0

    if (!clientX && !clientY) return

    const position = screenToFlowPosition({ x: clientX, y: clientY })
    const targetIsNode = (event.target as HTMLElement)?.closest('.react-flow__node')

    if (targetIsNode) {
      // ─── 도형 위에 놓았으나 포트를 빗나간 경우 → 가장 가까운 포트로 스냅 ───
      const targetShapeNode = nodes.find(n => {
        if (n.type === 'anchor' || n.type === 'edge-node') return false
        const w = NODE_CONFIGS[n.data.kind]?.width || 140
        const h = NODE_CONFIGS[n.data.kind]?.height || 60
        return (
          position.x >= n.position.x - 20 &&
          position.x <= n.position.x + w + 20 &&
          position.y >= n.position.y - 20 &&
          position.y <= n.position.y + h + 20
        )
      })

      if (!targetShapeNode) return

      const closestPort = findClosestPort(targetShapeNode, position)

      setTimeout(() => {
        if (isReconnect && originalEdgeId) {
          // Reconnect: 기존 엣지의 해당 끝점을 새 도형으로 변경
          // + 이전 끝점이 anchor였으면 정리
          const { edges: currentEdges, nodes: currentNodes } = useFlowStore.getState()
          const oldEdge = currentEdges.find(e => e.id === originalEdgeId)
          if (!oldEdge) return

          // isSourceMoving: source 끝점(화살표 없는 쪽)이 움직이는 경우 true
          const movingSrc = info.isSourceMoving
          const oldEndNodeId = movingSrc ? oldEdge.source : oldEdge.target
          const oldEndNode = currentNodes.find(n => n.id === oldEndNodeId)
          const shouldRemoveOldAnchor = oldEndNode && (oldEndNode.type === 'anchor' || oldEndNode.type === 'edge-node')

          const nextEdges = currentEdges.map(e => {
            if (e.id !== originalEdgeId) return e
            return {
              ...e,
              source:       movingSrc ? targetShapeNode.id : e.source,
              sourceHandle: movingSrc ? closestPort.id     : e.sourceHandle,
              target:       !movingSrc ? targetShapeNode.id : e.target,
              targetHandle: !movingSrc ? closestPort.id     : e.targetHandle,
            }
          })

          const nextNodes = shouldRemoveOldAnchor
            ? currentNodes.filter(n => n.id !== oldEndNodeId)
            : currentNodes

          useFlowStore.setState({
            edges: nextEdges,
            nodes: nextNodes,
            past: useFlowStore.getState().past,
            future: [],
          })
        } else {
          // 일반 연결
          if (handleType === 'target') {
            onConnect({ source: targetShapeNode.id, sourceHandle: closestPort.id, target: nodeId, targetHandle: handleId || 'top' })
          } else {
            onConnect({ source: nodeId, sourceHandle: handleId || 'bottom', target: targetShapeNode.id, targetHandle: closestPort.id })
          }
        }
      }, 40)
    } else {
      // ─── 빈 공간에 놓은 경우 → 새 anchor 노드 생성 ───
      const dropX = Math.round(position.x / SNAP_GRID[0]) * SNAP_GRID[0]
      const dropY = Math.round(position.y / SNAP_GRID[1]) * SNAP_GRID[1]
      const newAnchorId = generateId()

      addNode({
        id: newAnchorId,
        type: 'anchor',
        position: { x: dropX - 8, y: dropY - 8 },
        data: { label: '', kind: 'process' },
        zIndex: 9999,
      })

      setTimeout(() => {
        if (isReconnect && originalEdgeId) {
          // Reconnect: 기존 엣지의 해당 끝점을 새 anchor로 변경
          // + 이전 끝점이 anchor였으면 정리
          const { edges: currentEdges, nodes: currentNodes } = useFlowStore.getState()
          const oldEdge = currentEdges.find(e => e.id === originalEdgeId)
          if (!oldEdge) return

          // isSourceMoving: source 끝점(화살표 없는 쪽)이 움직이는 경우 true
          const movingSrc = info.isSourceMoving
          const oldEndNodeId = movingSrc ? oldEdge.source : oldEdge.target
          const oldEndNode = currentNodes.find(n => n.id === oldEndNodeId)
          const shouldRemoveOldAnchor = oldEndNode && (oldEndNode.type === 'anchor' || oldEndNode.type === 'edge-node')

          const nextEdges = currentEdges.map(e => {
            if (e.id !== originalEdgeId) return e
            return {
              ...e,
              source:       movingSrc  ? newAnchorId  : e.source,
              sourceHandle: movingSrc  ? 'src-handle' : e.sourceHandle,
              target:       !movingSrc ? newAnchorId  : e.target,
              targetHandle: !movingSrc ? 'handle'     : e.targetHandle,
            }
          })

          const nextNodes = shouldRemoveOldAnchor
            ? currentNodes.filter(n => n.id !== oldEndNodeId)
            : currentNodes

          useFlowStore.setState({
            edges: nextEdges,
            nodes: nextNodes,
            past: useFlowStore.getState().past,
            future: [],
          })
        } else {
          // 일반 연결: 새 anchor → nodeId 방향
          if (handleType === 'target') {
            onConnect({ source: newAnchorId, sourceHandle: 'src-handle', target: nodeId, targetHandle: handleId || 'top' })
          } else {
            onConnect({ source: nodeId, sourceHandle: handleId || 'bottom', target: newAnchorId, targetHandle: 'handle' })
          }
        }
      }, 40)
    }
  }, [screenToFlowPosition, addNode, nodes, onConnect, findClosestPort])

  // ReactFlow 내장 reconnect 성공 콜백
  const handleReconnect = useCallback((oldEdge: Parameters<typeof onReconnect>[0], newConnection: Parameters<typeof onReconnect>[1]) => {
    // 성공적으로 포트에 연결된 경우 onConnectEnd 이중처리 방지
    reconnectFiredRef.current = true
    onReconnect(oldEdge, newConnection)
  }, [onReconnect])

  const onReconnectStart = useCallback((event: React.MouseEvent | React.TouchEvent, edge: Parameters<typeof handleReconnect>[0], _handleType: 'source' | 'target') => {
    setIsConnecting(true)
    reconnectFiredRef.current = false

    // ─── 마우스 위치 기반으로 어느 끝점이 드래그되는지 직접 판단 ───
    // ReactFlow의 handleType은 "어떤 handle 타입을 찾는 중인지"를 나타내므로
    // "어느 끝점이 움직이는지"와 다를 수 있음. 위치 비교가 더 신뢰성 있음.
    const { nodes: currentNodes } = useFlowStore.getState()
    const sourceNode = currentNodes.find(n => n.id === edge.source)
    const targetNode = currentNodes.find(n => n.id === edge.target)

    let isSourceMoving = _handleType === 'source' // 기본값 (fallback)

    const getNodeHandlePos = (node: FlowNode, handleId: string | null | undefined) => {
      const w = NODE_CONFIGS[node.data?.kind]?.width || node.width || 140
      const h = NODE_CONFIGS[node.data?.kind]?.height || node.height || 60
      switch (handleId) {
        case 'top':    return { x: node.position.x + w / 2, y: node.position.y }
        case 'bottom': return { x: node.position.x + w / 2, y: node.position.y + h }
        case 'left':   return { x: node.position.x,         y: node.position.y + h / 2 }
        case 'right':  return { x: node.position.x + w,     y: node.position.y + h / 2 }
        // anchor node 핸들: 노드 중심
        default:       return { x: node.position.x + w / 2, y: node.position.y + h / 2 }
      }
    }

    if (sourceNode && targetNode) {
      const clientX = 'clientX' in event ? (event as React.MouseEvent).clientX : 0
      const clientY = 'clientY' in event ? (event as React.MouseEvent).clientY : 0
      if (clientX !== 0 || clientY !== 0) {
        const flowPos = screenToFlowPosition({ x: clientX, y: clientY })
        const srcPos = getNodeHandlePos(sourceNode, edge.sourceHandle)
        const tgtPos = getNodeHandlePos(targetNode, edge.targetHandle)
        const dSrc = Math.hypot(flowPos.x - srcPos.x, flowPos.y - srcPos.y)
        const dTgt = Math.hypot(flowPos.x - tgtPos.x, flowPos.y - tgtPos.y)
        isSourceMoving = dSrc < dTgt
      }
    }

    connectingInfoRef.current = {
      nodeId: isSourceMoving ? edge.source : edge.target,
      handleId: isSourceMoving ? (edge.sourceHandle ?? null) : (edge.targetHandle ?? null),
      handleType: isSourceMoving ? 'source' : 'target',
      isReconnect: true,
      originalEdgeId: edge.id,
      isSourceMoving,
    }
    // 흐름선 드래그 중 모든 도형 포트 표시
    setIsDraggingEdgeEndpoint(true)
  }, [screenToFlowPosition, setIsDraggingEdgeEndpoint])

  const onReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, _edge: Parameters<typeof handleReconnect>[0]) => {
    setIsDraggingEdgeEndpoint(false)
  }, [setIsDraggingEdgeEndpoint])

  // 휴지통 오버랩 체크 함수
  const checkIsOverTrash = useCallback((e: React.MouseEvent) => {
    const trashEl = document.getElementById('trash-bin-zone')
    if (!trashEl) return false
    const rect = trashEl.getBoundingClientRect()
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
  }, [])

  // 노드 드래그 시작 시 흐름선 끝점이면 즉시 핸들 표시
  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: FlowNode) => {
    if (node.type === 'anchor' || node.type === 'edge-node') {
      setIsDraggingEdgeEndpoint(true)
    }
  }, [setIsDraggingEdgeEndpoint])

  // 노드 드래그 중 휴지통 위인지 감지
  const onNodeDrag = useCallback((event: React.MouseEvent) => {
    setIsOverTrash(checkIsOverTrash(event))
  }, [checkIsOverTrash])

  // 노드 드래그 완료 처리 (휴지통 삭제 및 앵커 노드 도형 자동 Snap 연결)
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: FlowNode) => {
    // 1. 휴지통 위치에 놓은 경우 삭제
    if (checkIsOverTrash(event)) {
      removeNode(node.id)
      setIsOverTrash(false)
      return
    }
    setIsOverTrash(false)

    // 2. 흐름선 끝점 노드인 경우 일반 도형 근처에 오면 해당 포트로 자동 Snap 연결
    if (node.type === 'anchor' || node.type === 'edge-node') {
      setIsDraggingEdgeEndpoint(false)
      const dropPos = node.position

      const targetShapeNode = findNearbyShape(dropPos, node.id)

      if (targetShapeNode) {
        const closestPort = findClosestPort(targetShapeNode, dropPos)
        // 앵커 노드를 지우고 실제 도형으로 엣지 연결 전환
        connectAnchorToNode(node.id, targetShapeNode.id, closestPort.id)
      }
    } else {
      setIsDraggingEdgeEndpoint(false)
    }
  }, [checkIsOverTrash, removeNode, findNearbyShape, findClosestPort, connectAnchorToNode, setIsDraggingEdgeEndpoint])

  return (
    <div
      ref={canvasRef}
      className={`relative flex-1 bg-canvas ${isConnecting ? 'is-connecting' : ''}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionMode={ConnectionMode.Loose}
        elevateEdgesOnSelect={true}
        onConnect={onConnect}
        onConnectStart={onConnectStart as unknown as OnConnectStart}
        onConnectEnd={onConnectEnd}
        onReconnect={handleReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        edgesReconnectable={true}
        edgesFocusable={true}
        reconnectRadius={30}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeDragStart={onNodeDragStart as unknown as OnNodeDrag<FlowNode>}
        onNodeDrag={onNodeDrag as unknown as OnNodeDrag<FlowNode>}
        onNodeDragStop={onNodeDragStop as unknown as OnNodeDrag<FlowNode>}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'labeled',
          animated: false,
          reconnectable: true,
          markerEnd: { type: MarkerType.Arrow, width: 20, height: 20, color: '#64748B' },
        }}
        snapToGrid
        snapGrid={SNAP_GRID}
        defaultViewport={{ x: 40, y: 40, zoom: 0.8 }}
        minZoom={0.2}
        maxZoom={2}
        fitView={false}
        fitViewOptions={{ padding: 0.4, maxZoom: 0.85 }}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode="Shift"
        selectNodesOnDrag={false}
        connectionLineStyle={{ stroke: '#64748B', strokeWidth: 2, strokeDasharray: '5,4' }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#CBD5E1"
        />
        <Controls
          position="bottom-left"
          style={{ bottom: 16, left: 16 }}
          showFitView
          showZoom
          showInteractive
        />
        <MiniMap
          className="hidden md:block"
          position="top-right"
          style={{ top: 16, right: 16, borderRadius: 10, overflow: 'hidden' }}
          nodeColor={(n) => {
            const kind = (n.data as { kind?: NodeKind }).kind
            return kind ? NODE_CONFIGS[kind].colors.bg : '#f1f5f9'
          }}
          maskColor="rgba(241,245,249,0.7)"
        />
      </ReactFlow>

      <TrashBin
        isOver={isOverTrash}
        onClick={deleteSelectedElements}
      />

      {isEmpty && <OnboardingGuide />}
    </div>
  )
}
