/**
 * 서버 룸 E2E 스모크 (영웅키움 v2) — 실클라이언트 2명 + 봇 1이 정규 5R를 완주한다.
 *
 *   npm run smoke -w game
 *
 * 검증: 방 생성·입장·봇 추가, 방장 시작(모드), 금액 매매·정보소 판정, 템플릿 채팅
 * (검증·조립·릴레이), 뉴스 공유, 이모트, 4페이즈 조기 전환, viewFor 필터
 * (사건 큐·real 플래그·타인 내용 미노출), 스푸핑 거부, 정산(시상식 포함).
 */
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client, type Room } from '@colyseus/sdk';
import { GameRoom } from './GameRoom';
import { RULES, type GameView } from '../src/index';

const PORT = 2599;
const TIMEOUT_MS = 40_000;

function fail(message: string): never {
  console.error(`[smoke] 실패: ${message}`);
  process.exit(1);
}

interface Log {
  view?: GameView;
  settled?: { standings: { rank: number; totalAsset: number; nickname: string }[]; awards: Record<string, { nickname: string }> };
  chats: string[];
  emotes: string[];
  rejected: string[];
}

function wire(room: Room, log: Log, act: boolean) {
  room.onMessage('state', (view: GameView) => {
    log.view = view;
  });
  room.onMessage('settled', (payload: Log['settled']) => {
    log.settled = payload;
  });
  room.onMessage('chat', (msg: { text: string }) => log.chats.push(msg.text));
  room.onMessage('emote', (msg: { kind: string }) => log.emotes.push(msg.kind));
  room.onMessage('rejected', (msg: { reason: string }) => log.rejected.push(msg.reason));
  room.onMessage('lobby', () => {});
  room.onMessage('player-left', () => {});

  room.onMessage('phase', (msg: { phase: string; turn: number }) => {
    if (msg.phase === 'prep' && act) {
      room.send('action', { type: 'buy', playerId: room.sessionId, companyId: 'sec1', amount: 150_000 });
      if (msg.turn === 1) {
        room.send('action', { type: 'buyInfo', playerId: room.sessionId, tab: 'analysis', tier: 1 });
        // 스푸핑 방어 — 남의 playerId
        room.send('action', { type: 'buy', playerId: 'ghost', companyId: 'sec1', amount: 10_000 });
      }
    }
    if (msg.phase === 'chat' && act && msg.turn === 1) {
      room.send('chat', { subject: '나는', sector: 'bio', verb: '샀어' }); // 거짓말 (미보유)
      room.send('chat', { subject: '나는', sector: 'x', verb: '샀어' }); // 템플릿 위반 → 거부
      room.send('shareNews');
      room.send('emote', { kind: 'fire' });
    }
    setTimeout(() => room.send('ready'), 60);
  });
}

async function main() {
  const server = new Server({ transport: new WebSocketTransport() });
  server.define('kids-kiwoom', GameRoom);
  await server.listen(PORT);

  const url = `ws://localhost:${PORT}`;
  const host: Log = { chats: [], emotes: [], rejected: [] };
  const guest: Log = { chats: [], emotes: [], rejected: [] };

  const roomA = await new Client(url).create('kids-kiwoom', { nickname: '방장' });
  wire(roomA, host, true);
  const roomB = await new Client(url).joinById(roomA.roomId, { nickname: '손님' });
  wire(roomB, guest, false);

  roomA.send('addBot');
  roomA.send('start', { mode: 'regular' });

  const startedAt = Date.now();
  while (!host.settled || !guest.settled) {
    if (Date.now() - startedAt > TIMEOUT_MS) fail('제한시간 안에 정산에 도달하지 못했다');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // ── 정산 ────────────────────────────────────────────────────────────
  const standings = host.settled!.standings;
  if (standings.length !== 3) fail(`정산 인원 ${standings.length} ≠ 3 (사람 2 + 봇 1)`);
  const awards = host.settled!.awards;
  for (const key of ['profitKing', 'truthEye', 'steady']) {
    if (!awards[key]?.nickname) fail(`시상식 누락: ${key}`);
  }

  // ── viewFor 필터 ────────────────────────────────────────────────────
  const view = host.view!;
  if (view.phase !== 'ended') fail(`최종 페이즈 ${view.phase} ≠ ended`);
  if (view.eventLog.length !== RULES.turnsRegular) fail(`사건 ${view.eventLog.length}회 ≠ ${RULES.turnsRegular}회`);
  const raw = view as unknown as Record<string, unknown>;
  if (raw.eventQueue !== undefined) fail('viewFor 위반: eventQueue 노출');
  if (raw.rng !== undefined) fail('viewFor 위반: rng 노출');
  if (raw.lies !== undefined) fail('viewFor 위반: lies 노출');
  if (view.me.news.some((n) => 'real' in n)) fail('viewFor 위반: 뉴스 real 플래그 노출');
  if (view.me.holdings.length === 0) fail('방장 매수가 반영되지 않았다');
  if (view.me.intel.length === 0) fail('정보소 결과가 반영되지 않았다');

  const guestView = guest.view!;
  if (guestView.me.intel.length !== 0) fail('손님에게 타인 정보 내용이 새어 들어갔다');
  const hostSummary = guestView.others.find((o) => o.id === roomA.sessionId)!;
  if (!hostSummary.heldSectors.includes('semi')) fail('섹터 보유 칩(heldSectors) 누락');
  if ((hostSummary as unknown as Record<string, unknown>).holdings !== undefined) fail('viewFor 위반: 타인 보유 내역 노출');
  if (guestView.purchases.length === 0) fail('구매 사실 공개 누락');

  // ── 릴레이·검증 ─────────────────────────────────────────────────────
  if (!guest.chats.some((t) => t === '[나는] [바이오] [샀어]')) fail('템플릿 채팅 조립·릴레이 누락');
  if (!guest.chats.some((t) => t.startsWith('[내 뉴스] '))) fail('뉴스 공유 릴레이 누락');
  if (!guest.emotes.includes('fire')) fail('이모트 릴레이 누락');
  if (!host.rejected.some((r) => r.includes('자기 액션만'))) fail('스푸핑 방어 미작동');
  if (!host.rejected.some((r) => r.includes('없는 섹터') || r.includes('템플릿'))) fail('템플릿 검증 미작동');

  console.log('[smoke] 통과 — 사람 2 + 봇 1, 정규 5R 완주');
  console.log(`  정산: ${standings.map((s) => `${s.rank}위 ${s.nickname} ${s.totalAsset.toLocaleString()}원`).join(' · ')}`);
  console.log(`  시상: 🏆${awards.profitKing.nickname} 🔍${awards.truthEye.nickname} 🛡️${awards.steady.nickname}`);
  process.exit(0);
}

main().catch((error) => {
  if (error instanceof Error && error.stack) console.error(error.stack);
  fail(error instanceof Error ? error.message : String(error));
});
