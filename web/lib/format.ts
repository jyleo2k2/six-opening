import type { Currency } from 'game';

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
export const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export const money = (n: number, currency: Currency) => (currency === 'KRW' ? won(n) : usd(n));

/** 수익률 — 부호를 항상 붙인다 */
export const rate = (current: number, cost: number) => {
  const pct = ((current - cost) / cost) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
};

/** 상승은 빨강, 하락은 파랑 — 국내 증권앱 관습 */
export const pnlClass = (current: number, cost: number) =>
  current >= cost ? 'text-red-500' : 'text-blue-500';
