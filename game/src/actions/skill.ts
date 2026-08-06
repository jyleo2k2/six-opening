import { getCard } from '../../data/index';
import { RULES } from '../rules';
import { currentPlayer } from '../state';
import { fail, ok, type GameState, type Result } from '../types';

/**
 * 스킬카드 발동 — 시장 이벤트/뉴스. 기획서 §4.2.
 *   · 발동 코스트 없음, 자신의 턴에 발동
 *   · 효과는 섹터 단위이므로 양 플레이어 필드에 동일 적용된다
 *   · 전략은 '상대만 들고 있는 섹터'를 치는 것
 *
 * TODO(Q1): 원문 "바." 항이 미완성이라 효과 체계 전체가 미확정이다.
 *   현재는 추천안(턴당 1장, 섹터 ±%, 양측 공통)으로 구현했다.
 *   【추정】 사용한 스킬카드는 덱으로 돌아가지 않고 게임에서 제외된다.
 *     덱으로 돌리면 같은 카드를 계속 재사용할 수 있어 밸런스가 무너진다.
 */
export function playSkill(state: GameState, cardId: string): Result<GameState> {
  const card = getCard(cardId);
  if (card.kind !== 'skill') return fail('스킬카드가 아니다');

  const player = currentPlayer(state);
  if (player.skillUsedThisTurn) {
    return fail(`스킬카드는 턴당 ${RULES.SKILL_PER_TURN}장까지다`);
  }

  const index = player.hand.indexOf(cardId);
  if (index === -1) return fail(`패에 ${cardId}가 없다`);

  for (const effect of card.effects) {
    state.priceMods[effect.sector] *= 1 + effect.delta;
  }

  // 제외 — 덱으로 돌려보내지 않는다
  player.hand.splice(index, 1);
  player.skillUsedThisTurn = true;

  return ok(state);
}
