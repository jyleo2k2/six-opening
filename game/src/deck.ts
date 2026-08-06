import { getCard } from '../data/index';
import { RULES } from './rules';
import { fail, ok, type Result } from './types';

/** 덱 규칙 검증 — 기획서 §5 + Q3 추천안 */
export function validateDeck(deck: string[]): Result<true> {
  if (deck.length !== RULES.DECK_SIZE) {
    return fail(`덱은 정확히 ${RULES.DECK_SIZE}장이어야 한다 (현재 ${deck.length}장)`);
  }

  const counts = new Map<string, number>();
  for (const id of deck) {
    getCard(id); // 존재하지 않는 카드면 throw
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  for (const [id, n] of counts) {
    if (n > RULES.MAX_COPIES) {
      return fail(`같은 종류는 최대 ${RULES.MAX_COPIES}장까지다 (${id}: ${n}장)`);
    }
  }

  const stockCount = deck.filter((id) => getCard(id).kind === 'stock').length;
  if (stockCount < RULES.MIN_STOCK_IN_DECK) {
    return fail(`종목카드가 최소 ${RULES.MIN_STOCK_IN_DECK}장 필요하다 (현재 ${stockCount}장)`);
  }

  return ok(true);
}
