import React from 'react'
import type { NodeKind } from '../../types'
import { NODE_CONFIGS } from '../../constants/nodeConfig'

export type HelpTopic = NodeKind | 'edge'

interface HelpModalProps {
  topic: HelpTopic | null
  onClose: () => void
}

const TOPIC_DETAILS: Record<HelpTopic, { title: string; subtitle: string; icon: string; desc: string; usage: string[]; example: string }> = {
  terminal: {
    title: '시작 / 끝 (Terminal)',
    subtitle: '알고리즘의 시작점과 종료점을 나타냅니다.',
    icon: '🟢',
    desc: '순서도의 맨 처음과 맨 끝에 반드시 배치해야 하는 도형입니다. 타원(Oval) 형태로 시작할 때 "시작", 마칠 때 "끝"을 적어 알고리즘의 실행 범위를 명확히 지정합니다.',
    usage: [
      '순서도에 최소 1개의 시작과 1개의 끝이 존재해야 합니다.',
      '알고리즘이 시작하여 최종 결과에 도달해 종료됨을 명시합니다.',
    ],
    example: '예시: [시작] → [이름 입력] → ... → [결과 출력] → [끝]',
  },
  io: {
    title: '입출력 (Input / Output)',
    subtitle: '데이터의 입력 및 결과의 출력을 담당합니다.',
    icon: '🟡',
    desc: '키보드로 값을 받아오거나, 화면/프린터로 처리된 결과를 사용자에게 보여줄 때 사용하는 평행사변형(Parallelogram) 도형입니다.',
    usage: [
      '키보드 입력, 마우스 클릭 등 외부에서 값을 받아올 때 사용해요.',
      '화면에 텍스트나 점수를 보여줄 때 사용해요.',
    ],
    example: '예시: [점수 입력 받기], [결과 화면에 출력]',
  },
  process: {
    title: '처리 (Process)',
    subtitle: '연산, 변수 값 변경, 명령 수행을 나타냅니다.',
    icon: '🔵',
    desc: '더하기·빼기 같은 사칙연산, 변수에 값 저장하기, 데이터 변환 등 실제 컴퓨터 작업 명령을 나타내는 직사각형(Rectangle) 도형입니다.',
    usage: [
      '변수에 값을 계산하여 저장할 때 사용해요 (예: 합계 = A + B).',
      '계산 및 데이터 처리 단계를 명확하게 작성합니다.',
    ],
    example: '예시: [총점 = 국어 + 영어], [카운트 1 증가]',
  },
  decision: {
    title: '판단 (Decision)',
    subtitle: '조건에 따라 실행 흐름을 나눕니다.',
    icon: '🟣',
    desc: '질문이나 조건을 판단하여 결과가 "예(Yes)"인지 "아니오(No)"인지에 따라 다음 수행 단계를 분기시키는 마름모(Diamond) 도형입니다.',
    usage: [
      '조건문(if/else) 역할을 수행합니다.',
      '보통 2개 이상의 화살표(예/아니오)가 뻗어나갑니다.',
    ],
    example: '예시: [점수 >= 80점 인가?], [나이 > 19세 인가?]',
  },
  edge: {
    title: '흐름선 (Flow Line)',
    subtitle: '알고리즘의 진행 방향을 연결해줍니다.',
    icon: '➡️',
    desc: '도형과 도형 사이를 연결하여 명령어가 어떤 순서로 실행되는지 화살표 방향으로 보여주는 선입니다.',
    usage: [
      '도형에 마우스를 올리면 나타나는 파란 포트(점)에서 드래그하여 연결합니다.',
      '사이드바에서 흐름선을 캔버스로 끌어다 놓아 연결용 안내선을 생성할 수도 있습니다.',
      '판단 도형에서 뻗어나오는 흐름선에는 자동으로 [예] / [아니오] 라벨이 붙습니다.',
    ],
    example: '예시: [시작] ──▶ [입력] ──▶ [처리] ──▶ [끝]',
  },
}

export const HelpModal: React.FC<HelpModalProps> = ({ topic, onClose }) => {
  if (!topic) return null
  const info = TOPIC_DETAILS[topic]
  const config = topic !== 'edge' ? NODE_CONFIGS[topic] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-[480px] max-w-[90vw] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-center justify-between border-b border-slate-100"
          style={{ background: config ? config.colors.bg : '#F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.icon}</span>
            <div>
              <h3
                className="text-lg font-extrabold text-slate-800 leading-tight"
                style={{ color: config ? config.colors.text : '#1E293B' }}
              >
                {info.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{info.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 text-slate-700 text-sm leading-relaxed overflow-y-auto max-h-[60vh]">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">상세 설명</h4>
            <p className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-slate-700">{info.desc}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">사용 규칙 및 팁</h4>
            <ul className="list-disc list-inside bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
              {info.usage.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">알고리즘 예시</h4>
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl text-xs font-semibold text-indigo-900">
              {info.example}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  )
}
