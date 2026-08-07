import { rollForecast } from '../info';
import { infoTier } from '../rules';
import type { Action, GameState } from '../types';

/**
 * 정보소 구매 (기획서 §3.3) — 턴당 1회, 준비 페이즈 전용.
 * 구매 사실(purchases)은 전원 공개, 예보 내용(forecasts)은 본인만.
 */
export function buyInfo(
  state: GameState,
  action: Extract<Action, { type: 'buyInfo' }>,
): string | null {
  if (state.phase !== 'prep') return '준비 페이즈에만 정보를 살 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';
  if (player.infoBoughtThisTurn) return '이번 턴 정보는 이미 샀다';

  if (![1, 2, 3].includes(action.tier)) return '없는 정보 티어다';
  const tier = infoTier(action.tier);
  if (player.cash < tier.price) return '현금이 부족하다';

  player.cash -= tier.price;
  player.infoBoughtThisTurn = true;
  player.forecasts.push(rollForecast(state, tier));
  state.purchases.push({ turn: state.turn, playerId: player.id, tier: tier.tier });
  return null;
}
