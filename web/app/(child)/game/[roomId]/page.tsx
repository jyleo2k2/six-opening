import { GameScreen } from '@/features/game/GameScreen';

/**
 * 대전 라우트 — roomId 'new'면 방 생성(?mode=quick|regular), 아니면 초대코드 입장.
 * 판정·상태는 전부 서버(viewFor를 거친 내 뷰)에서 온다 (기획서 §9, web/AGENTS.md).
 */
export default async function GameRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { roomId } = await params;
  const { mode } = await searchParams;
  return <GameScreen roomId={roomId} mode={mode === 'quick' ? 'quick' : mode === 'regular' ? 'regular' : undefined} />;
}
