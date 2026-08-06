import { getCard } from '../../data/index';
import { currencyOf, priceOf } from '../pricing';
import { RULES } from '../rules';
import { currentPlayer } from '../state';
import { fail, ok, type GameState, type Result } from '../types';

/**
 * 매수 — 패의 종목카드를 현재가격만큼 지불하고 필드에 낸다. 기획서 §7.2.
 * 필드는 3종류까지. 같은 종목은 한 존에 스택되고 매수가격은 평균단가로 갱신된다(Q11).
 */
export function buy(state: GameState, cardId: string, qty: number): Result<GameState> {
  if (qty <= 0) return fail('매수 수량은 1 이상이어야 한다');

  const card = getCard(cardId);
  if (card.kind !== 'stock') return fail('종목카드만 매수할 수 있다');

  const player = currentPlayer(state);

  const inHand = player.hand.filter((id) => id === cardId).length;
  if (inHand < qty) return fail(`패에 ${cardId}가 ${qty}장 없다 (현재 ${inHand}장)`);

  const holding = player.field.find((h) => h.cardId === cardId);
  if (!holding && player.field.length >= RULES.FIELD_SLOTS) {
    return fail(`종목카드 존은 ${RULES.FIELD_SLOTS}개까지다`);
  }

  const currency = currencyOf(cardId);
  const price = priceOf(cardId, state);
  const cost = price * qty;
  if (player.cash[currency] < cost) {
    return fail(`현금이 부족하다 (필요 ${cost}, 보유 ${player.cash[currency]} ${currency})`);
  }

  player.cash[currency] -= cost;

  for (let i = 0; i < qty; i++) {
    player.hand.splice(player.hand.indexOf(cardId), 1);
  }

  if (holding) {
    const total = holding.qty + qty;
    holding.avgCost = (holding.avgCost * holding.qty + cost) / total;
    holding.qty = total;
  } else {
    player.field.push({ cardId, qty, avgCost: price });
  }

  return ok(state);
}
