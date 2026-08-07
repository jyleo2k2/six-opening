import type { Action, GameState } from '../types';

/**
 * 매수·매도 (기획서 §3.2) — 시장가 즉시 체결, 수수료 없음, 정수 주.
 * 공매도·대출 없음: 현금과 보유 주식이 전부다.
 * reduce()가 만든 사본을 변형한다. 에러면 사유 문자열, 성공이면 null.
 */
export function buy(state: GameState, action: Extract<Action, { type: 'buy' }>): string | null {
  if (state.phase !== 'prep') return '준비 페이즈에만 매매할 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';

  if (!Number.isInteger(action.qty) || action.qty <= 0) return '수량은 1 이상의 정수다';

  const price = state.prices[action.companyId];
  if (price === undefined) return '없는 종목이다';

  const cost = price * action.qty;
  if (player.cash < cost) return '현금이 부족하다';

  player.cash -= cost;
  const holding = player.holdings.find((h) => h.companyId === action.companyId);
  if (holding) {
    // 평균 매수 단가 — 가중평균
    holding.avgCost = (holding.avgCost * holding.qty + cost) / (holding.qty + action.qty);
    holding.qty += action.qty;
  } else {
    player.holdings.push({ companyId: action.companyId, qty: action.qty, avgCost: price });
  }
  return null;
}

export function sell(state: GameState, action: Extract<Action, { type: 'sell' }>): string | null {
  if (state.phase !== 'prep') return '준비 페이즈에만 매매할 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';

  if (!Number.isInteger(action.qty) || action.qty <= 0) return '수량은 1 이상의 정수다';

  const holding = player.holdings.find((h) => h.companyId === action.companyId);
  if (!holding) return '보유하지 않은 종목이다';
  if (holding.qty < action.qty) return '보유 수량보다 많이 팔 수 없다';

  const price = state.prices[action.companyId];
  if (price === undefined) return '없는 종목이다';

  player.cash += price * action.qty;
  holding.qty -= action.qty;
  if (holding.qty === 0) {
    player.holdings = player.holdings.filter((h) => h !== holding);
  }
  return null;
}
