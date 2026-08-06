import { nextInt } from './rng';
import { RULES } from './rules';
import type { GameState, PlayerState } from './types';

export const handKinds = (p: PlayerState): Set<string> => new Set(p.hand);

/**
 * 패 유지 규칙 — 기획서 §5.
 *   · 패는 항상 5'종류'를 유지한다 (장수 기준이 아니다).
 *   · 5종류 미만이면 5종류가 될 때까지 덱에서 랜덤 드로우한다.
 *   · 드로우 중 이미 가진 종류가 나오면 그대로 패에 추가한다.
 *   · 덱에 새 종류가 남아 있지 않으면 드로우를 멈춘다.
 */
export function refillHand(p: PlayerState, state: GameState): void {
  while (handKinds(p).size < RULES.HAND_KINDS && p.deck.length > 0) {
    // 덱에 '패에 없는 종류'가 남아있지 않으면 더 뽑아도 종류가 늘지 않는다 → 중단
    const hasNewKind = p.deck.some((id) => !p.hand.includes(id));
    if (!hasNewKind) break;

    const i = nextInt(state.rng, p.deck.length);
    p.hand.push(p.deck.splice(i, 1)[0]);
  }
}
