import { getStock } from '../data/index';
import { currentPrice, toKRW } from './pricing';
import { MARKET_CURRENCY, type GameState, type PlayerState } from './types';

/**
 * 총자산(원) = 원화 현금 + 달러 현금 × 기준환율
 *            + Σ 한국주식 평가금액 + Σ 미국주식 평가금액 × 기준환율
 * 기획서 §2.
 */
export function totalAssetKRW(player: PlayerState, state: GameState): number {
  let sum = player.cash.KRW + player.cash.USD * state.fxRate;

  for (const holding of player.field) {
    const card = getStock(holding.cardId);
    const value = currentPrice(card, state) * holding.qty;
    sum += toKRW(value, MARKET_CURRENCY[card.market], state.fxRate);
  }
  return Math.round(sum);
}

export interface Settlement {
  totals: [number, number];
  /** 승자 인덱스. 동점이면 null — 기획서 Q10 추천안 = 무승부 */
  winner: 0 | 1 | null;
}

export function settle(state: GameState): Settlement {
  const totals: [number, number] = [
    totalAssetKRW(state.players[0], state),
    totalAssetKRW(state.players[1], state),
  ];
  const winner = totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1;
  return { totals, winner };
}
