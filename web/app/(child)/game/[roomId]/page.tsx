import { GameScreen } from '@/features/game/GameScreen';

/**
 * 대전 화면 라우트 — roomId가 'new'면 방을 만들고, 아니면 초대코드로 입장한다.
 * 판정·상태는 전부 서버(viewFor를 거친 내 뷰)에서 온다 (기획서 §9, web/AGENTS.md).
 */
export default async function GameRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <GameScreen roomId={roomId} />;
}
