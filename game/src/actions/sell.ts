import { currencyOf, priceOf } from '../pricing';
import { currentPlayer } from '../state';
import { fail, ok, type GameState, type Result } from '../types';

/**
 * 매도 — 필드 종목카드를 평가금액에 판다. 기획서 §7.2.
 * 임의 장수를 고를 수 있고, 판 카드는 자기 덱으로 돌아간다 → 재드로우·재매수 가능(§5).
 */
export function sell(state: GameState, cardId: string, qty: number): Result<GameState> {
  if (qty <= 0) return fail('매도 수량은 1 이상이어야 한다');

  const player = currentPlayer(state);
  const holding = player.field.find((h) => h.cardId === cardId);
  if (!holding) return fail(`필드에 ${cardId}가 없다`);
  if (holding.qty < qty) return fail(`보유 수량이 부족하다 (보유 ${holding.qty}, 요청 ${qty})`);

  const currency = currencyOf(cardId);
  player.cash[currency] += priceOf(cardId, state) * qty;

  holding.qty -= qty;
  if (holding.qty === 0) {
    player.field.splice(player.field.indexOf(holding), 1);
  }

  for (let i = 0; i < qty; i++) player.deck.push(cardId);

  return ok(state);
}
