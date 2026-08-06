import { Placeholder } from '@/components/ui/Placeholder';

/**
 * 대전 화면.
 * 여기서 reduce()를 클라 측에서 먼저 돌려 UI를 즉시 반응시키고, 서버 broadcast로 상태를 확정한다.
 * 판정 로직을 이 파일에 새로 쓰지 말 것 — game 패키지의 reduce()가 유일한 판정자다.
 */
export default async function GameRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return (
    <Placeholder
      title={`대전 · ${roomId}`}
      owner="게임 트랙 (이재용·이호연)"
      todo={[
        '보드: 내 필드 3존 / 상대 필드 3존 / 패 5종류 / 현금·환율',
        'useGameRoom() — colyseus.js로 접속, state 수신, action 송신',
        '영역 전개 연출 (Lottie 1개 + CSS)',
        '재접속 복구: 백그라운드 전환 시 소켓이 끊긴다 (기술스택 §6.1)',
        'TODO(T1): 턴 제한시간 확정 시 서버 타이머 동기화 추가',
      ]}
    />
  );
}
