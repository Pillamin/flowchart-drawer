import React, { useMemo } from 'react'
import { useViewport, useNodes } from '@xyflow/react'
import type { FlowNode, NodeKind } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'

type DragPreviewData = { x: number; y: number; type: 'node'; kind: NodeKind } | { x: number; y: number; type: 'edge' }

interface SnapGuidesProps {
  /** 현재 드래그 중인 노드 ID (null이면 가이드라인 숨김) */
  draggingNodeId: string | null
  /** 사이드바에서 드래그해서 캔버스 위에 있을 때의 미리보기 정보 */
  dragPreview?: DragPreviewData | null
}

/** 드래그 중 정렬 기준선과 오차(px) */
const THRESHOLD = 8

const renderPreviewShape = (kind: NodeKind, width: number, height: number) => {
  const config = NODE_CONFIGS[kind]
  let shape;
  if (kind === 'terminal') {
    const r = (height - 4) / 2
    shape = <rect x={2} y={2} width={width - 4} height={height - 4} rx={r} />
  } else if (kind === 'process') {
    shape = <rect x={2} y={2} width={width - 4} height={height - 4} rx={4} />
  } else if (kind === 'io') {
    const indent = Math.round(height * 0.35)
    shape = <polygon points={`${indent},2 ${width - 2},2 ${width - indent},${height - 2} 2,${height - 2}`} />
  } else {
    shape = <polygon points={`${width / 2},2 ${width - 2},${height / 2} ${width / 2},${height - 2} 2,${height / 2}`} />
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g fill={config.colors.bg} stroke={config.colors.border} strokeWidth="2" opacity="0.6">
        {shape}
      </g>
    </svg>
  )
}

/** 도형 드래그 시 다른 도형의 좌/중/우·상/중/하 위치와 일치할 때 보여주는 점선 가이드라인.
 *  useNodes()로 RF 내부 저장소에서 직접 읽어 1프레임 지연 없이 즉시 반응. */
export const SnapGuides: React.FC<SnapGuidesProps> = ({ draggingNodeId, dragPreview }) => {
  const { x: vpX, y: vpY, zoom } = useViewport()
  // RF 내부 Zustand 스토어에서 직접 읽음 → 드래그 중 실시간 위치 반영
  const allNodes = useNodes() as FlowNode[]

  const guides = useMemo(() => {
    const result = { vertical: [] as number[], horizontal: [] as number[] }
    if (!draggingNodeId && (!dragPreview || dragPreview.type !== 'node')) return result

    let dw = 140, dh = 60, dx = 0, dy = 0

    if (draggingNodeId) {
      const draggingNode = allNodes.find(n => n.id === draggingNodeId)
      if (!draggingNode) return result
      if (draggingNode.type === 'anchor' || draggingNode.type === 'edge-node') return result
      dw = NODE_CONFIGS[draggingNode.data.kind]?.width ?? 140
      dh = NODE_CONFIGS[draggingNode.data.kind]?.height ?? 60
      dx = draggingNode.position.x
      dy = draggingNode.position.y
    } else if (dragPreview && dragPreview.type === 'node') {
      dw = NODE_CONFIGS[dragPreview.kind]?.width ?? 140
      dh = NODE_CONFIGS[dragPreview.kind]?.height ?? 60
      dx = dragPreview.x
      dy = dragPreview.y
    }

    // 드래그 중 노드의 6개 기준축 (좌/중앙/우, 상/중앙/하)
    const draggingXs = [dx, dx + dw / 2, dx + dw]
    const draggingYs = [dy, dy + dh / 2, dy + dh]

    for (const node of allNodes) {
      if (node.id === draggingNodeId) continue
      if (node.type === 'anchor' || node.type === 'edge-node') continue

      const nw = NODE_CONFIGS[node.data.kind]?.width ?? 140
      const nh = NODE_CONFIGS[node.data.kind]?.height ?? 60
      const nx = node.position.x
      const ny = node.position.y

      const nodeXs = [nx, nx + nw / 2, nx + nw]
      const nodeYs = [ny, ny + nh / 2, ny + nh]

      for (const dxVal of draggingXs) {
        for (const nxVal of nodeXs) {
          if (Math.abs(dxVal - nxVal) <= THRESHOLD) {
            result.vertical.push(nxVal)
          }
        }
      }
      for (const dyVal of draggingYs) {
        for (const nyVal of nodeYs) {
          if (Math.abs(dyVal - nyVal) <= THRESHOLD) {
            result.horizontal.push(nyVal)
          }
        }
      }
    }

    // 중복 제거
    result.vertical = [...new Set(result.vertical)]
    result.horizontal = [...new Set(result.horizontal)]
    return result
  }, [draggingNodeId, dragPreview, allNodes])

  if (!draggingNodeId && !dragPreview) {
    return null
  }

  // flow 좌표 → 캔버스 내 화면(px) 좌표 변환
  const toScreenX = (flowX: number) => flowX * zoom + vpX
  const toScreenY = (flowY: number) => flowY * zoom + vpY

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1000 }}
    >
      {dragPreview && dragPreview.type === 'node' && (
        <div
          style={{
            position: 'absolute',
            left: toScreenX(dragPreview.x),
            top: toScreenY(dragPreview.y),
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
        >
          {renderPreviewShape(
            dragPreview.kind, 
            NODE_CONFIGS[dragPreview.kind]?.width ?? 140, 
            NODE_CONFIGS[dragPreview.kind]?.height ?? 60
          )}
        </div>
      )}
      {dragPreview && dragPreview.type === 'edge' && (
        <div
          style={{
            position: 'absolute',
            left: toScreenX(dragPreview.x),
            top: toScreenY(dragPreview.y),
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
        >
          <svg width={100} height={20} viewBox="0 -10 100 20" style={{ overflow: 'visible' }}>
            <line x1="0" y1="0" x2="100" y2="0" stroke="#64748B" strokeWidth="2" />
            <polygon points="88,-6 88,6 100,0" fill="#64748B" />
            <circle cx="0" cy="0" r="4" fill="#3B82F6" />
          </svg>
        </div>
      )}
      <svg
        width="100%"
        height="100%"
        style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}
      >
        {/* 세로 점선 (X 정렬) */}
        {guides.vertical.map((flowX, i) => (
          <line
            key={`v-${i}`}
            x1={toScreenX(flowX)}
            y1={-9999}
            x2={toScreenX(flowX)}
            y2={99999}
            stroke="#6366F1"
            strokeWidth={1}
            strokeDasharray="5 4"
            opacity={0.75}
          />
        ))}
        {/* 가로 점선 (Y 정렬) */}
        {guides.horizontal.map((flowY, i) => (
          <line
            key={`h-${i}`}
            x1={-9999}
            y1={toScreenY(flowY)}
            x2={99999}
            y2={toScreenY(flowY)}
            stroke="#6366F1"
            strokeWidth={1}
            strokeDasharray="5 4"
            opacity={0.75}
          />
        ))}
      </svg>
    </div>
  )
}


