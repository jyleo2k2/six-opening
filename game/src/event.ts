import { COMPANIES, getEvent } from '../data';
import { nextRange } from './rng';
import { RULES } from './rules';
import type { AppliedChange, GameState } from './types';

/**
 * 이벤트 발동 — 이번 턴 사건을 시세판에 적용한다 (기획서 §5.2).
 *
 * 방향(부호)은 data/events.ts에 고정돼 있고(역사 그대로), 폭은 범위 안에서
 * **종목마다 개별 추첨**한다 — 같은 섹터라도 조금씩 다르게 움직인다.
 *
 * advancePhase()가 만든 사본 위에서만 호출된다.
 */
export function applyCurrentEvent(state: GameState): void {
  const eventId = state.eventQueue[state.turn - 1];
  const event = getEvent(eventId);

  const changes: Record<string, AppliedChange> = {};
  for (const company of COMPANIES) {
    const range = event.effects[company.sector];
    if (!range) continue; // 무영향 섹터 — 가격 유지 (이벤트만 가격을 움직인다)
    const pct = nextRange(state.rng, range[0], range[1]);
    const before = state.prices[company.id];
    const after = Math.max(RULES.priceFloor, Math.round(before * (1 + pct)));
    state.prices[company.id] = after;
    changes[company.id] = { before, after, pct };
  }

  state.eventLog.push({ turn: state.turn, eventId, changes });
}
