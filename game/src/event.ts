import { COMPANIES, getEvent } from '../data';
import { nextRange } from './rng';
import { RULES } from './rules';
import { totalAsset } from './settle';
import type { AppliedChange, GameState } from './types';

/**
 * 사건 발동 (기획서 §5).
 *
 * - 등락 = **실제 관찰 등락률(imp) × 밴드 0.7~1.3** — 방향은 역사 고정, 폭만 판마다 다르다.
 *   종목마다 개별 추첨이라 같은 섹터 2종목도 조금씩 다르게 움직인다.
 * - 무영향 섹터도 ±2% 시장 노이즈 — 시장은 늘 흔들린다.
 * - 적용 후: MDD(든든이 상) 갱신 + 지난 라운드 거짓말 정산(진실의 눈).
 *
 * advancePhase()가 만든 사본 위에서만 호출된다.
 */
export function applyCurrentEvent(state: GameState): void {
  const event = getEvent(state.eventQueue[state.turn - 1]);

  const changes: Record<string, AppliedChange> = {};
  for (const company of COMPANIES) {
    const imp = event.imp[company.sector];
    const pct =
      imp !== undefined
        ? imp * nextRange(state.rng, RULES.bandMin, RULES.bandMax)
        : nextRange(state.rng, -RULES.noisePct, RULES.noisePct);
    const before = state.prices[company.id];
    const after = Math.max(RULES.priceFloor, Math.round(before * (1 + pct)));
    state.prices[company.id] = after;
    changes[company.id] = { before, after, pct: (after - before) / before };
  }
  state.eventLog.push({ turn: state.turn, eventId: event.id, changes });

  // 최대 낙폭(MDD) 추적 — 🛡️ 든든이 상
  for (const player of state.players) {
    const total = totalAsset(state, player);
    player.peak = Math.max(player.peak, total);
    player.maxDrawdown = Math.max(player.maxDrawdown, (player.peak - total) / player.peak);
  }

  settleLies(state);
}

/**
 * 거짓말 정산 (기획서 §4) — 지난 라운드 회의의 "[나는][X][샀어]" 허위 발화에 대해,
 * 이번 라운드에 그 섹터를 사지 않은 (발화자 제외) 플레이어의 "안 속은 횟수"를 올린다.
 */
function settleLies(state: GameState): void {
  const dueLies = state.lies.filter((lie) => lie.turn === state.turn - 1);
  for (const lie of dueLies) {
    for (const player of state.players) {
      if (player.id === lie.playerId) continue;
      if (!player.boughtSectors.includes(lie.sector)) player.notFooled += 1;
    }
  }
  state.lies = state.lies.filter((lie) => lie.turn >= state.turn);
}
