import { toJpeg, toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import type { ExportFormat, StudentInfo } from '../types'

const EXPORT_OPTIONS = {
  quality: 0.95,
  pixelRatio: 2,
  backgroundColor: '#F8FAFC',
}

/** 캔버스 DOM 요소를 찾아 이미지/PDF로 내보내기 */
export async function exportFlow(
  format: ExportFormat,
  canvasEl: HTMLElement,
  student: StudentInfo,
): Promise<void> {
  // 학생 정보 워터마크를 위한 임시 요소 추가
  const watermark = createWatermark(student)
  canvasEl.appendChild(watermark)

  try {
    if (format === 'png') {
      const dataUrl = await toPng(canvasEl, EXPORT_OPTIONS)
      downloadDataUrl(dataUrl, getExportFilename(student, 'png'))
    } else if (format === 'jpg') {
      const dataUrl = await toJpeg(canvasEl, EXPORT_OPTIONS)
      downloadDataUrl(dataUrl, getExportFilename(student, 'jpg'))
    } else if (format === 'pdf') {
      const dataUrl = await toPng(canvasEl, EXPORT_OPTIONS)
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
    canvasEl.removeChild(watermark)
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
