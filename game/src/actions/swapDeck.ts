import { RULES } from '../rules';
import { currentPlayer } from '../state';
import { fail, ok, type GameState, type Result } from '../types';

/**
 * 패↔덱 종류 교체 — 기획서 §5.
 * 종류 단위 1:1 교환. 그 종류의 카드는 패/덱에 몇 장 있든 **전량이 함께 이동**한다.
 *
 * TODO(Q7): 원문 충돌 — "언제든 자유롭게"(b) vs "자신의 턴에"(마).
 *   무제한이면 매 턴 덱 전체에서 원하는 카드를 꺼낼 수 있어 드로우 운이 무의미해진다.
 *   추천안(자신의 턴 + 턴당 1회)을 채택했다. RULES.SWAP_PER_TURN으로 조정한다.
 */
export function swapDeck(
  state: GameState,
  handCardId: string,
  deckCardId: string,
): Result<GameState> {
  const player = currentPlayer(state);

  if (RULES.SWAP_PER_TURN > 0 && player.swapUsedThisTurn) {
    return fail('이번 턴에는 이미 교체했다');
  }
  if (handCardId === deckCardId) return fail('같은 종류끼리는 교체할 수 없다');
  if (!player.hand.includes(handCardId)) return fail(`패에 ${handCardId}가 없다`);
  if (!player.deck.includes(deckCardId)) return fail(`덱에 ${deckCardId}가 없다`);

  const fromHand = player.hand.filter((id) => id === handCardId);
  const fromDeck = player.deck.filter((id) => id === deckCardId);

  player.hand = player.hand.filter((id) => id !== handCardId).concat(fromDeck);
  player.deck = player.deck.filter((id) => id !== deckCardId).concat(fromHand);

  player.swapUsedThisTurn = true;
  return ok(state);
}
