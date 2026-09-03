import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import type { StudentInfo } from '../types'

// unused imports removed
const EXPORT_OPTIONS = {
  quality: 1,
  pixelRatio: 2,
  backgroundColor: '#F8FAFC',
}

export function getExportFilename(student: StudentInfo, suffix: string, extension: string): string {
  const hakbun = (student.grade || student.classNum || student.number)
    ? `${student.grade || ''}${student.classNum || ''}${(student.number || '').padStart(2, '0')}`
    : ''
  
  const parts = []
  if (hakbun) parts.push(hakbun)
  if (student.name) parts.push(student.name)
  if (student.title) parts.push(student.title)
  
  const baseName = parts.length > 0 ? parts.join('_') : '순서도'
  return `${baseName}${suffix ? `_${suffix}` : ''}.${extension}`
}

export async function getFlowchartDataUrl(canvasEl: HTMLElement, student: StudentInfo): Promise<string | null> {
  const viewportEl = canvasEl.querySelector('.react-flow__viewport') as HTMLElement
  if (!viewportEl) return null

  // 최적의 크기(Bounding Box)를 DOM 기반으로 계산합니다.
  // getNodesBounds는 node.position과 node.width만을 참조하며, edge(선)의 궤적을 무시하는 한계가 있습니다.
  const originalTransform = viewportEl.style.transform
  const originalTransition = viewportEl.style.transition
  
  // 계산을 위해 임시로 뷰포트 변환을 초기화합니다.
  viewportEl.style.transition = 'none'
  viewportEl.style.transform = 'translate(0px, 0px) scale(1)'
  
  const viewportRect = viewportEl.getBoundingClientRect()
  const elements = viewportEl.querySelectorAll('.react-flow__node, .react-flow__edge path.react-flow__edge-path, .react-flow__edge text, .react-flow__edge foreignObject, .react-flow__edge-label')
  
  if (elements.length === 0) {
    viewportEl.style.transform = originalTransform
    viewportEl.style.transition = originalTransition
    return null
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  elements.forEach(el => {
    const rect = el.getBoundingClientRect()
    // viewportRect.left/top이 내부 좌표계의 원점(0,0) 역할을 합니다.
    const x = rect.left - viewportRect.left
    const y = rect.top - viewportRect.top
    const w = rect.width
    const h = rect.height
    
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x + w > maxX) maxX = x + w
    if (y + h > maxY) maxY = y + h
  })

  // 뷰포트 원래대로 복구
  viewportEl.style.transform = originalTransform
  viewportEl.style.transition = originalTransition

  // 만약 비정상적인 값이면 (렌더링 꼬임 등) 실패 처리
  if (minX === Infinity) return null

  const padding = 40
  const imageWidth = (maxX - minX) + padding * 2
  const imageHeight = (maxY - minY) + padding * 2

  const styleOptions = {
    ...EXPORT_OPTIONS,
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      // 계산된 minX, minY를 기반으로 전체 요소를 좌측 상단으로 끌어올립니다.
      transform: `translate(${-minX + padding}px, ${-minY + padding}px) scale(1)`,
    },
  }

  const watermark = createWatermark(student)
  viewportEl.appendChild(watermark)

  try {
    return await toPng(viewportEl, styleOptions)
  } finally {
    viewportEl.removeChild(watermark)
  }
}

export async function exportFlowchartOnly(
  format: 'png' | 'pdf',
  canvasEl: HTMLElement,
  student: StudentInfo,
): Promise<void> {
  const dataUrl = await getFlowchartDataUrl(canvasEl, student)
  if (!dataUrl) return
  
  if (format === 'png') {
    downloadDataUrl(dataUrl, getExportFilename(student, '순서도', 'png'))
  } else if (format === 'pdf') {
    const img = new Image()
    img.src = dataUrl
    await new Promise(res => { img.onload = res })

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height],
    })
    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height)
    pdf.save(getExportFilename(student, '순서도', 'pdf'))
  }
}

export async function exportPreviewDom(
  format: 'png' | 'pdf',
  previewEl: HTMLElement,
  student: StudentInfo,
  suffix: string = '',
  isA4: boolean = true,
  isLandscape: boolean = false
): Promise<void> {
  const styleOptions: any = {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: '#FFFFFF',
  }
  
  const dataUrl = await toPng(previewEl, styleOptions)

  if (format === 'png') {
    downloadDataUrl(dataUrl, getExportFilename(student, suffix, 'png'))
  } else if (format === 'pdf') {
    const img = new Image()
    img.src = dataUrl
    await new Promise(res => { img.onload = res })

    let pdf;
    let pdfWidth, pdfHeight;

    if (isA4) {
      const orientation = isLandscape ? 'landscape' : 'portrait'
      pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
      pdfWidth = isLandscape ? 297 : 210
      pdfHeight = isLandscape ? 210 : 297
    } else {
      pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [img.width, img.height],
      })
      pdfWidth = img.width
      pdfHeight = img.height
    }
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(getExportFilename(student, suffix, 'pdf'))
  }
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

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
