import { Placeholder } from '@/components/ui/Placeholder';

/**
 * 대전 화면.
 * 클라이언트는 서버가 viewFor()로 걸러 보낸 자기 뷰만 받는다 — 이벤트 큐·타인 뉴스·타인 정보
 * 내용을 화면이 요구하지도, 추측해 그리지도 않는다 (기획서 §9, web/AGENTS.md).
 * 판정 로직을 이 파일에 새로 쓰지 말 것 — game 패키지의 reduce()가 유일한 판정자다.
 */
export default async function GameRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return (
    <Placeholder
      title={`대전 · ${roomId}`}
      owner="게임 트랙 (이재용·이호연)"
      todo={[
        '시세판 16종목(섹터 그룹핑) · 내 포트폴리오(현금·보유·평단) · 총자산 순위 상시',
        '준비(90초): 내 뉴스 카드 · 매수/매도 · 정보소 3티어(구매 사실 공개 피드)',
        '채팅(60초): 자유 채팅 + 찌라시 프리셋 — 이모티콘 5종(웃음·울음·절망·따봉·야르)은 상시',
        '이벤트: 사건 배너(실제 역사 한 줄) → 등락 연출 → 풀스크린 순위 변동',
        'useGameRoom() — colyseus.js 접속: state(내 뷰)·phase(남은 시간)·chat·emote 수신',
        '종료: 자산 순 대시보드 + 명예의 전당 (T6)',
        '재접속 복구: 백그라운드 전환 시 소켓이 끊긴다 (기술스택 §5)',
      ]}
    />
  );
}
