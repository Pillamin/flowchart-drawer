import React from 'react'
import { Modal } from '../ui/Modal'

export type LegalType = 'terms' | 'privacy'

interface LegalModalProps {
  type: LegalType | null
  onClose: () => void
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null

  const isPrivacy = type === 'privacy'
  const title = isPrivacy ? '🔒 개인정보처리방침' : '📜 서비스 이용약관'

  return (
    <Modal isOpen={!!type} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="max-h-[70vh] overflow-y-auto pr-2 text-xs text-slate-600 leading-relaxed flex flex-col gap-4">
        {isPrivacy ? (
          <>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium text-slate-700">
              <strong>Flowchart Drawer</strong>(이하 '본 서비스')는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </div>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제1조 (개인정보의 처리 목적)</h3>
              <p>본 서비스는 중학생 등 학생들의 알고리즘 및 프로그래밍 교육을 목적으로 제작된 순서도 작성 및 시뮬레이션 교육용 웹 애플리케이션입니다. 본 서비스는 개인정보를 별도의 서버로 수집하거나 전송하지 않으며, 다음의 목적을 위해서만 브라우저 내에서 데이터를 활용합니다.</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                <li><strong>순서도 작성 및 자동 저장:</strong> 사용자가 작성 중인 순서도 데이터 및 학번/이름 정보를 사용자의 로컬 브라우저(localStorage)에 보관하여 새로고침 시 작업 내용을 복원합니다.</li>
                <li><strong>시뮬레이션 및 검증 기능 제공:</strong> 작성한 순서도의 논리적 오류 검사 및 변수 실행 시뮬레이션을 로컬 브라우저 내에서 수행합니다.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제2조 (처리하는 개인정보 항목 및 수집 방법)</h3>
              <p>1. <strong>처리 항목:</strong> 사용자가 실습을 위해 입력한 학번, 성명(한글), 순서도 노드 및 흐름선 데이터, 테스트용 변수 입력값</p>
              <p>2. <strong>수집 및 저장 여부:</strong> 본 서비스는 사용자가 입력한 정보를 별도의 서버로 전송하지 않으며, 외부 데이터베이스에 <strong>저장하지 않습니다.</strong> 모든 정보는 사용자의 기기(브라우저) 내부 저장소에만 보관됩니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제3조 (개인정보의 처리 및 보유기간)</h3>
              <p>본 서비스는 별도의 서버를 통한 데이터 저장을 수행하지 않습니다. 브라우저 내 저장소(localStorage)에 보관된 데이터는 사용자가 '초기화' 버튼을 누르거나 브라우저 쿠키/캐시를 삭제할 경우 즉시 소멸됩니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제4조 (개인정보의 제3자 제공 및 위탁)</h3>
              <p>본 서비스는 입력된 정보를 서버에 저장하지 않고 제3자에게 전송, 제공 또는 위탁하지 않습니다. 모든 순서도 생성 및 시뮬레이션 연산은 외부 API 호출 없이 사용자의 로컬 환경에서 단독으로 수행됩니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제5조 (정보주체와 법정대리인의 권리·의무 및 행사방법)</h3>
              <p>정보주체(학생 및 교사)는 본 서비스 내에서 언제든지 데이터를 수정하거나 '초기화' 버튼 또는 브라우저 캐시 삭제를 통해 저장된 데이터를 즉시 삭제할 수 있습니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제6조 (개인정보의 안전성 확보조치)</h3>
              <p>입력된 순서도 및 학생 정보를 외부 네트워크 서버로 송신하는 코드를 배제하고 로컬 브라우저 스크립트 내에서만 작동하도록 안전하게 관리합니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제7조 (개인정보 보호책임자)</h3>
              <p>본 서비스의 안전한 활용과 관리를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                <li><strong>성명:</strong> 김상륜</li>
                <li><strong>소속:</strong> 신방학중학교 (교사)</li>
                <li><strong>연락처:</strong> 02-956-6105</li>
              </ul>
            </section>

            <div className="text-[11px] text-slate-400 text-right pt-2">
              시행일자: 2026년 8월 4일
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium text-slate-700">
              본 이용약관(이하 '약관')은 <strong>Flowchart Drawer</strong>(이하 '본 서비스')가 제공하는 교육용 웹 애플리케이션 서비스의 이용에 관한 사항을 규정합니다.
            </div>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제1조 (목적)</h3>
              <p>이 약관은 본 서비스가 제공하는 교육용 순서도 작성 및 시뮬레이션 서비스(이하 '서비스')를 이용함에 있어 서비스 제공자와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제2조 (정의)</h3>
              <p>1. <strong>'서비스'</strong>란 본 웹페이지에서 작동하는 순서도 작성, 검증, 시뮬레이션, 이미지 내보내기 애플리케이션을 말합니다.</p>
              <p>2. <strong>'이용자'</strong>란 본 서비스에 접속하여 서비스를 활용하는 교사 및 학생을 말합니다.</p>
              <p>3. <strong>'시뮬레이터'</strong>란 사용자가 작성한 순서도의 실행 흐름 및 변수 변화를 모사해주는 시스템 내 기능을 말합니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제3조 (약관의 명시와 개정)</h3>
              <p>본 서비스는 이 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 화면 우측 하단 링크에 게시하며, 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제4조 (서비스의 제공 및 저장 구조)</h3>
              <p>본 서비스는 이용자가 입력한 어떠한 정보(학번, 성명, 순서도 데이터 등)도 외부 서버로 전송하거나 원격 저장하지 않으며, 사용자의 로컬 브라우저 환경 상에서만 작동합니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제5조 (이용자의 계정 관리)</h3>
              <p>본 서비스는 별도의 회원가입이나 로그인을 필요로 하지 않는 비회원제 서비스입니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제6조 (서비스의 제한 및 중단)</h3>
              <p>본 서비스는 교육 목적의 무료 툴이므로 이용 기기의 사양, 웹 브라우저 호환성 등에 따라 일부 기능 동작이 다를 수 있습니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제7조 (이용자의 의무 및 저작권)</h3>
              <p>1. 본 서비스가 작성한 소스코드 및 디자인의 저작권은 원저작자에게 귀속됩니다.</p>
              <p>2. 이용자가 직접 작성하고 내보낸 순서도 이미지 및 데이터의 활용 권한은 작성자 본인에게 있습니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-sm text-slate-800 mb-1">제8조 (면책조항)</h3>
              <p>본 서비스는 무료로 제공되는 교육용 도구로서, 사용자의 브라우저 삭제/초기화로 인한 순서도 데이터 유실에 대해 보상 의무를 지지 않습니다.</p>
            </section>

            <div className="text-[11px] text-slate-400 text-right pt-2">
              시행일자: 2026년 8월 4일
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          확인
        </button>
      </div>
    </Modal>
  )
}
