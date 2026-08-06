import { currentPlayer } from '../state';
import { fail, ok, type Currency, type GameState, type Result } from '../types';

/**
 * 환전 — 기준환율로 원↔달러. 무제한, 수수료 없음. 기획서 §7.2.
 * 원화는 원 단위, 달러는 센트 단위로 반올림한다.
 */
export function exchange(state: GameState, from: Currency, amount: number): Result<GameState> {
  if (amount <= 0) return fail('환전 금액은 0보다 커야 한다');

  const player = currentPlayer(state);
  if (player.cash[from] < amount) {
    return fail(`${from} 잔액이 부족하다 (보유 ${player.cash[from]})`);
  }

  if (from === 'KRW') {
    player.cash.KRW -= amount;
    player.cash.USD += Math.round((amount / state.fxRate) * 100) / 100;
  } else {
    player.cash.USD -= amount;
    player.cash.KRW += Math.round(amount * state.fxRate);
  }

  return ok(state);
}
