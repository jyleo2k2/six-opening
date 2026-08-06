import { MACRO_EVENTS, getEvent } from '../data/index';
import { nextInt } from './rng';
import { SECTORS, type GameState } from './types';

/**
 * 영역 전개 — 거시경제 환경 발동. 기획서 §7.3.
 *
 * 발동 시점(TODO(Q4) 추천안 채택):
 *   · 게임 시작 시 1회
 *   · 1~4라운드 종료 시 각 1회   → 총 5회
 *   · 5라운드 종료(정산 직전)에는 발동하지 않는다 (막판 운빨 방지)
 *
 * 【추정】같은 게임에서 같은 이벤트는 두 번 나오지 않는다. 기획서에 명시가 없어 임의로 정했다.
 */
export function expandDomain(state: GameState): void {
  const pool = MACRO_EVENTS.filter((e) => !state.eventLog.includes(e.id));
  if (pool.length === 0) return;

  const event = pool[nextInt(state.rng, pool.length)];
  applyEvent(state, event.id);
}

/** 이벤트의 섹터별 효과를 누적 배율에 곱해 넣는다 */
export function applyEvent(state: GameState, eventId: string): void {
  const event = getEvent(eventId);
  for (const sector of SECTORS) {
    state.priceMods[sector] *= 1 + event.matrix[sector];
  }
  state.activeEventId = eventId;
  state.eventLog.push(eventId);
}
