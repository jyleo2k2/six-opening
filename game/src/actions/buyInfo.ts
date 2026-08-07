import { buildIntel, infoPrice } from '../info';
import type { Action, GameState } from '../types';

/**
 * 정보소 구매 (기획서 §3.3) — 게임당 2회, 해설/정찰 2탭, 꼴찌 50% 할인.
 * 구매 사실(purchases)은 전원 공개, 결과(intel)는 본인만.
 */
export function buyInfo(
  state: GameState,
  action: Extract<Action, { type: 'buyInfo' }>,
): string | null {
  if (state.phase !== 'prep') return '준비 페이즈에만 정보를 살 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';
  if (player.infoLeft <= 0) return '정보소 이용 횟수를 다 썼다 (게임당 2회)';
  if (![1, 2, 3].includes(action.tier)) return '없는 정보 티어다';
  if (action.tab !== 'analysis' && action.tab !== 'scout') return '없는 정보 탭이다';

  const price = infoPrice(state, player.id, action.tier);
  if (player.cash < price) return '현금이 부족하다';

  player.cash -= price;
  player.infoLeft -= 1;
  const intel = buildIntel(state, player.id, action.tab, action.tier);
  player.intel.push({
    turn: state.turn,
    tab: action.tab,
    tier: action.tier,
    text: intel.text,
    ...(intel.hint ? { hint: intel.hint } : {}),
  });
  state.purchases.push({ turn: state.turn, playerId: player.id, tab: action.tab, tier: action.tier });
  return null;
}
