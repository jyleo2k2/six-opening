/**
 * 서버 룸 E2E 스모크 — 실제 colyseus.js 클라이언트 2명이 방을 만들고 5턴을 완주한다.
 *
 *   npm run smoke -w game
 *
 * 검증하는 것: 방 생성·입장, 방장 시작, 매매/정보 액션 판정, 채팅·이모티콘 릴레이,
 * 전원 준비 조기 전환, viewFor 필터(이벤트 큐·타인 내용 미노출), 정산 브로드캐스트.
 * typecheck는 이 경로를 잡지 못한다 — 프로토콜·수명주기 문제는 여기서만 드러난다.
 */
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { GameRoom } from './GameRoom';
import { RULES, type GameView } from '../src/index';

const PORT = 2599;
const TIMEOUT_MS = 30_000;

function fail(message: string): never {
  console.error(`[smoke] 실패: ${message}`);
  process.exit(1);
}

/** 두 클라이언트 공용 — 페이즈마다 자동 행동하고 결과를 기록한다 */
function wire(room: Room, log: { view?: GameView; settled?: unknown; chats: string[]; emotes: string[]; rejected: string[] }, act: boolean) {
  room.onMessage('state', (view: GameView) => {
    log.view = view;
  });
  room.onMessage('settled', (payload) => {
    log.settled = payload;
  });
  room.onMessage('chat', (msg: { text: string }) => log.chats.push(msg.text));
  room.onMessage('emote', (msg: { kind: string }) => log.emotes.push(msg.kind));
  room.onMessage('rejected', (msg: { reason: string }) => log.rejected.push(msg.reason));
  room.onMessage('lobby', () => {});
  room.onMessage('player-left', () => {});

  room.onMessage('phase', (msg: { phase: string; turn: number }) => {
    if (msg.phase === 'prep' && act) {
      room.send('action', { type: 'buy', playerId: room.sessionId, companyId: 'deundeun-bank', qty: 5 });
      if (msg.turn === 1) {
        room.send('action', { type: 'buyInfo', playerId: room.sessionId, tier: 1 });
        // 스푸핑 방어 확인 — 남의 playerId로 보내면 거부돼야 한다
        room.send('action', { type: 'buy', playerId: 'ghost', companyId: 'deundeun-bank', qty: 1 });
      }
    }
    if (msg.phase === 'chat' && act && msg.turn === 1) {
      room.send('chat', { text: '반도체가 오를 거라는 소문이 있던데?' });
      room.send('emote', { kind: 'yar' });
    }
    // 전원 준비 → 조기 전환 (이벤트 연출 포함)
    setTimeout(() => room.send('ready'), 50);
  });
}

async function main() {
  const server = new Server({ transport: new WebSocketTransport() });
  server.define('kids-kiwoom', GameRoom);
  await server.listen(PORT);

  const url = `ws://localhost:${PORT}`;
  const host = { chats: [] as string[], emotes: [] as string[], rejected: [] as string[] } as Parameters<typeof wire>[1];
  const guest = { chats: [] as string[], emotes: [] as string[], rejected: [] as string[] } as Parameters<typeof wire>[1];

  const roomA = await new Client(url).create('kids-kiwoom', { nickname: '방장' });
  wire(roomA, host, true);
  const roomB = await new Client(url).joinById(roomA.roomId, { nickname: '손님' });
  wire(roomB, guest, false);

  roomA.send('start');

  const start = Date.now();
  while (!host.settled || !guest.settled) {
    if (Date.now() - start > TIMEOUT_MS) fail('제한시간 안에 정산에 도달하지 못했다');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // ── 검증 ────────────────────────────────────────────────────────────
  const standings = (host.settled as { standings: { rank: number; totalAsset: number }[] }).standings;
  if (standings.length !== 2) fail(`정산 인원 ${standings.length} ≠ 2`);

  const view = host.view!;
  if (view.phase !== 'ended') fail(`최종 페이즈 ${view.phase} ≠ ended`);
  if (view.eventLog.length !== RULES.turns) fail(`이벤트 ${view.eventLog.length}회 ≠ ${RULES.turns}회`);
  if ((view as unknown as Record<string, unknown>).eventQueue !== undefined) fail('viewFor 위반: eventQueue가 와이어에 실렸다');
  if ((view as unknown as Record<string, unknown>).rng !== undefined) fail('viewFor 위반: rng가 와이어에 실렸다');
  if (view.me.holdings.length === 0) fail('방장 매수가 반영되지 않았다');
  if (view.me.forecasts.length === 0) fail('정보소 예보가 반영되지 않았다');

  const guestView = guest.view!;
  if (guestView.me.forecasts.length !== 0) fail('손님에게 타인 예보가 새어 들어갔다');
  if (guestView.purchases.length === 0) fail('구매 사실 공개가 누락됐다');
  if ((guestView.others[0] as unknown as Record<string, unknown>).holdings !== undefined) fail('viewFor 위반: 타인 보유 내역 노출');

  if (!guest.chats.includes('반도체가 오를 거라는 소문이 있던데?')) fail('채팅 릴레이 누락');
  if (!guest.emotes.includes('yar')) fail('이모티콘 릴레이 누락');
  if (!host.rejected.some((r) => r.includes('자기 액션만'))) fail('스푸핑 방어가 작동하지 않았다');

  console.log('[smoke] 통과 — 2인 5턴 완주');
  console.log(`  정산: ${standings.map((s) => `${s.rank}위 ${s.totalAsset.toLocaleString()}원`).join(' · ')}`);
  console.log(`  이벤트: ${view.eventLog.map((e) => e.eventId).join(' → ')}`);
  process.exit(0);
}

main().catch((error) => {
  if (error instanceof Error && error.stack) console.error(error.stack);
  fail(error instanceof Error ? error.message : String(error));
});
