import { toJpeg, toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import type { ExportFormat, StudentInfo } from '../types'

import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { useFlowStore } from '../store/flowStore'

const EXPORT_OPTIONS = {
  quality: 1,
  pixelRatio: 2,
  backgroundColor: '#F8FAFC',
}

export async function exportFlow(
  format: ExportFormat,
  canvasEl: HTMLElement,
  student: StudentInfo,
): Promise<void> {
  // 실제 React Flow 요소(viewport)를 찾아서 그 안의 내용물을 내보내기 대상으로 삼습니다.
  const viewportEl = canvasEl.querySelector('.react-flow__viewport') as HTMLElement
  if (!viewportEl) return

  // 1. 전체 도형(nodes)의 경계(bounds) 계산
  const nodes = useFlowStore.getState().nodes
  const nodesBounds = getNodesBounds(nodes)
  
  // 패딩(여백)을 주어 흐름선(예/아니오 라벨 등)이 바깥으로 튀어나가도 잘리지 않도록 설정
  const padding = 200
  const imageWidth = nodesBounds.width + padding * 2
  const imageHeight = nodesBounds.height + padding * 2

  // 2. 전체 노드를 포괄하는 뷰포트(transform) 값 계산 (배율은 1로 고정하여 선명도 유지)
  const viewport = getViewportForBounds(
    nodesBounds,
    imageWidth,
    imageHeight,
    0.5,
    2,
    padding
  )

  // html-to-image 에 전달할 옵션에 크기와 transform 강제 적용
  const styleOptions = {
    ...EXPORT_OPTIONS,
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  }

  // 학생 정보 워터마크를 viewportEl에 붙여서 같이 찍히게 합니다.
  const watermark = createWatermark(student)
  viewportEl.appendChild(watermark)

  try {
    if (format === 'png') {
      const dataUrl = await toPng(viewportEl, styleOptions)
      downloadDataUrl(dataUrl, getExportFilename(student, 'png'))
    } else if (format === 'jpg') {
      const dataUrl = await toJpeg(viewportEl, styleOptions)
      downloadDataUrl(dataUrl, getExportFilename(student, 'jpg'))
    } else if (format === 'pdf') {
      const dataUrl = await toPng(viewportEl, styleOptions)
      const img = new Image()
      img.src = dataUrl
      await new Promise(res => { img.onload = res })

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      })
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height)
      pdf.save(getExportFilename(student, 'pdf'))
    }
  } finally {
    viewportEl.removeChild(watermark)
  }
}

function getExportFilename(student: StudentInfo, extension: string): string {
  const hakbun = (student.grade || student.classNum || student.number)
    ? `${student.grade || ''}${student.classNum || ''}${(student.number || '').padStart(2, '0')}`
    : ''
  
  const parts = []
  if (hakbun) parts.push(hakbun)
  if (student.name) parts.push(student.name)
  if (student.title) parts.push(student.title)
  
  const baseName = parts.length > 0 ? parts.join('_') + ' 순서도' : '순서도'
  return `${baseName}.${extension}`
}

function createWatermark(student: StudentInfo): HTMLDivElement {
  const el = document.createElement('div')
  const infoParts = [
    student.grade && `${student.grade}학년`,
    student.classNum && `${student.classNum}반`,
    student.number && `${student.number}번`,
    student.name,
  ].filter(Boolean).join(' ')
  
  const titlePart = student.title ? `[${student.title}]` : ''
  const text = [titlePart, infoParts].filter(Boolean).join(' ')

  el.style.cssText = `
    position: absolute;
    bottom: 12px;
    right: 16px;
    font-family: "Nanum Square Round", sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #64748B;
    background: rgba(248,250,252,0.85);
    padding: 4px 10px;
    border-radius: 6px;
    pointer-events: none;
    z-index: 9999;
  `
  el.textContent = text
  return el
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
