import type { NodeKind } from '../types'

// ─── Node Configuration ─────────────────────────────────────────────────────────
export interface NodeConfig {
  kind: NodeKind
  label: string          // 한국어 / English 병기 표시명
  defaultText: string    // 캔버스에 배치 시 기본 텍스트
  placeholder: string    // 힌트 텍스트
  tooltip: string        // 학생 눈높이 설명
  shape: string          // 도형 설명 (렌더링 참고용)
  colors: {
    bg: string
    border: string
    text: string
  }
  width: number
  height: number
}

export const NODE_CONFIGS: Record<NodeKind, NodeConfig> = {
  terminal: {
    kind: 'terminal',
    label: '단말',
    defaultText: '',
    placeholder: '시작 / 끝',
    tooltip: '알고리즘을 시작하고 끝낼 때 사용해요! 순서도에는 반드시 시작과 끝이 하나씩 있어야 해요.',
    shape: '타원 (Oval)',
    colors: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
    width: 170,
    height: 60,
  },
  io: {
    kind: 'io',
    label: '입출력',
    defaultText: '',
    placeholder: '입력 / 출력',
    tooltip: '데이터를 입력받거나 결과를 화면에 출력할 때 사용해요. 키보드 입력이나 화면 출력 등이 해당돼요!',
    shape: '평행사변형 (Parallelogram)',
    colors: { bg: '#FEF08A', border: '#EAB308', text: '#713F12' },
    width: 170,
    height: 64,
  },
  process: {
    kind: 'process',
    label: '처리',
    defaultText: '',
    placeholder: '계산 / 저장',
    tooltip: '계산하거나 값을 저장하는 등 명령을 처리할 때 사용해요. 변수에 값을 넣거나 더하기·빼기 같은 연산이 해당돼요!',
    shape: '직사각형 (Rectangle)',
    colors: { bg: '#BAE6FD', border: '#0EA5E9', text: '#0C4A6E' },
    width: 170,
    height: 64,
  },
  decision: {
    kind: 'decision',
    label: '판단',
    defaultText: '',
    placeholder: '조건 / 질문',
    tooltip: "조건에 따라 '예(Yes) / 아니오(No)'로 길을 나눌 때 사용해요. 마름모 모양이 특징이에요!",
    shape: '마름모 (Diamond)',
    colors: { bg: '#E9D5FF', border: '#A855F7', text: '#581C87' },
    width: 170,
    height: 104,
  },
}

export const NODE_KINDS_ORDER: NodeKind[] = ['terminal', 'io', 'process', 'decision']

// ─── Edge / Arrow Configuration ─────────────────────────────────────────────────
export const EDGE_STYLE = {
  stroke: '#64748B',
  strokeWidth: 2,
}

export const SELECTED_EDGE_STYLE = {
  stroke: '#3B82F6',
  strokeWidth: 2.5,
}

export const SIM_ACTIVE_EDGE_STYLE = {
  stroke: '#FBBF24',
  strokeWidth: 3,
}

// ─── Canvas Configuration ────────────────────────────────────────────────────────
export const GRID_SIZE = 20
export const SNAP_GRID: [number, number] = [GRID_SIZE, GRID_SIZE]

// A4 비율 가이드라인 (210:297)
export const A4_GUIDE = { width: 794, height: 1123 }

// ─── Decision Edge Labels ────────────────────────────────────────────────────────
export const DECISION_LABELS = {
  yes: '예 (Yes)',
  no: '아니오 (No)',
}
