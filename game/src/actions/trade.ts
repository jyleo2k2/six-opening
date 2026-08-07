import { getCompany } from '../../data';
import { RULES } from '../rules';
import type { Action, GameState } from '../types';

/**
 * 금액 기반 매매 (기획서 §3.2) — 만원 단위 슬라이더 → 소수점 주식.
 * 시장가 즉시 체결, 수수료 없음, 공매도·대출 없음. 사건만 가격을 움직인다.
 * 금액이 잔고·보유를 넘으면 가능한 만큼으로 줄여 체결한다(슬라이더 UX).
 */
export function buy(state: GameState, action: Extract<Action, { type: 'buy' }>): string | null {
  if (state.phase !== 'prep') return '준비 페이즈에만 매매할 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';

  const price = state.prices[action.companyId];
  if (price === undefined) return '없는 종목이다';

  if (!Number.isFinite(action.amount)) return '금액이 이상하다';
  const amount = Math.min(Math.floor(action.amount), player.cash);
  if (amount < RULES.minTradeAmount) return `최소 ${RULES.minTradeAmount.toLocaleString()}원부터 살 수 있다`;

  player.cash -= amount;
  const holding = player.holdings.find((h) => h.companyId === action.companyId);
  if (holding) holding.qty += amount / price;
  else player.holdings.push({ companyId: action.companyId, qty: amount / price });

  const sector = getCompany(action.companyId).sector;
  if (!player.boughtSectors.includes(sector)) player.boughtSectors.push(sector);
  if (!player.heldEver.includes(action.companyId)) player.heldEver.push(action.companyId);
  return null;
}

export function sell(state: GameState, action: Extract<Action, { type: 'sell' }>): string | null {
  if (state.phase !== 'prep') return '준비 페이즈에만 매매할 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';

  const price = state.prices[action.companyId];
  if (price === undefined) return '없는 종목이다';

  const holding = player.holdings.find((h) => h.companyId === action.companyId);
  if (!holding) return '보유하지 않은 종목이다';

  if (!Number.isFinite(action.amount)) return '금액이 이상하다';
  const holdingValue = holding.qty * price;
  const amount = Math.min(Math.floor(action.amount), holdingValue);
  if (amount < RULES.minTradeAmount && amount < holdingValue) {
    return `최소 ${RULES.minTradeAmount.toLocaleString()}원부터 팔 수 있다`;
  }

  holding.qty -= amount / price;
  player.cash += amount;
  // 잔여 평가 100원 미만은 정리 (부동소수 먼지)
  if (holding.qty * price < RULES.dustValue) {
    player.cash += Math.max(0, Math.round(holding.qty * price));
    player.holdings = player.holdings.filter((h) => h !== holding);
  }
  return null;
}
