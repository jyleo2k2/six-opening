import { getStock } from '../data/index';
import type { Currency, GameState, StockCard } from './types';

/**
 * 현재가 = 시작가 × ∏(1 + 효과ᵢ)   — 기획서 §8
 * 모든 효과가 섹터 단위이므로 섹터별 누적 배율 하나로 표현된다.
 * 반올림: 원화는 원 단위, 달러는 센트 단위.
 */
export function currentPrice(card: StockCard, state: GameState): number {
  const raw = card.basePrice * state.priceMods[card.sector];
  return card.market === 'KR' ? Math.round(raw) : Math.round(raw * 100) / 100;
}

export function priceOf(cardId: string, state: GameState): number {
  return currentPrice(getStock(cardId), state);
}

/** 해당 종목이 거래되는 통화 */
export function currencyOf(cardId: string): Currency {
  return getStock(cardId).market === 'KR' ? 'KRW' : 'USD';
}

export function toKRW(amount: number, currency: Currency, fxRate: number): number {
  return currency === 'KRW' ? amount : amount * fxRate;
}
