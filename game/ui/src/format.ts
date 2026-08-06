/** 주가처럼 원 단위를 그대로 보여줄 때. */
export function won(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

/** 자산·현금처럼 큰 금액은 만원 단위로 축약. */
export function manwon(n: number): string {
  const man = n / 10_000;
  if (Math.abs(man) >= 1000) return `${(man / 10_000).toFixed(2)}억`;
  if (Math.abs(man) >= 100) return `${Math.round(man)}만`;
  return `${man.toFixed(1)}만`;
}

export function signedManwon(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${manwon(Math.abs(n))}`;
}

export function pct(ratio: number, digits = 1): string {
  const v = ratio * 100;
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toFixed(digits)}%`;
}
