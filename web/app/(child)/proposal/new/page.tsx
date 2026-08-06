import { Placeholder } from '@/components/ui/Placeholder';

/**
 * 제안서 작성.
 * ⚠ 앱이 종목을 추천하면 투자권유 규제에 걸린다. 추천 주체는 항상 자녀다 —
 *   화면 문구도 "추천 종목" 같은 표현을 쓰지 말 것 (기술스택 §9).
 */
export default function NewProposalPage() {
  return (
    <Placeholder
      title="부모님께 제안하기"
      owner="제안서 트랙 (김설빈·박혜준)"
      todo={[
        '입력: 종목 · 수량 · 이유(아이가 직접 쓴다)',
        'brokerage.submitProposal()으로 전송 (lib/brokerage/port.ts)',
        '쿼리스트링 ?ticker= 로 종목 상세에서 이어받기',
        '전송 후 부모에게 알림 — 푸시는 Capacitor 래핑 시점에 붙는다',
        '앱이 종목을 고르거나 권하지 않는다. 이유를 쓰게 하는 것이 학습의 핵심',
      ]}
    />
  );
}
