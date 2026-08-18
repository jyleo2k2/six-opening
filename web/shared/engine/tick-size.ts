/**
 * 국내주식 호가단위(최소 가격 변동폭). KRX 현행 규정(2023-01-25 개정)이다.
 *
 * 화면·API·DB 세 곳이 같은 표를 봐야 해서 기능 폴더가 아니라 여기에 둔다.
 * `f0-home/lib/order-view.ts` 안에 두면 `web/app` 이 기능 폴더를 거꾸로 참조하게 된다.
 */

export type Market = "KOSPI" | "KOSDAQ";

/**
 * KOSPI 구간표. `[하한, 단위]` 이고 **가격이 큰 쪽부터** 본다.
 *
 * 경계는 "이상"이다 — 200,000원은 500원 단위이고 199,999원은 100원 단위다.
 */
const KOSPI_TICKS: readonly (readonly [number, number])[] = [
  [500_000, 1_000],
  [200_000, 500],
  [50_000, 100],
  [20_000, 50],
  [5_000, 10],
  [2_000, 5],
  [0, 1],
];

/**
 * KOSDAQ 구간표. 5만원 위로는 100원 하나로 끝난다 — KOSPI 처럼 500·1,000 으로 올라가지
 * 않는다. 그래서 20만원부터 두 시장이 갈린다(KOSPI 500원 ↔ KOSDAQ 100원).
 */
const KOSDAQ_TICKS: readonly (readonly [number, number])[] = [
  [50_000, 100],
  [20_000, 50],
  [5_000, 10],
  [2_000, 5],
  [0, 1],
];

/** 이 가격에서의 호가단위. 종목 고유값이 아니라 **가격이 어느 구간에 있느냐**로 정해진다. */
export function tickSize(price: number, market: Market): number {
  const table = market === "KOSDAQ" ? KOSDAQ_TICKS : KOSPI_TICKS;
  const value = Number.isFinite(price) ? Math.abs(price) : 0;
  for (const [floor, tick] of table) {
    if (value >= floor) return tick;
  }
  return 1;
}

/**
 * 호가단위에 맞춘 가격.
 *
 * 내림(`down`)·올림(`up`)만 있고 반올림은 없다. 매수는 내려서 싸게, 매도는 올려서 비싸게
 * 잡아야 아이가 누른 칩보다 불리해지지 않는다 — 반올림은 절반의 경우 불리한 쪽으로 간다.
 *
 * **단위는 결과 가격이 아니라 받은 가격에서 고른다.** 경계에서 단위가 바뀌기 때문이다:
 * 200,100원(500원 단위)을 내리면 200,000원이고 이건 여전히 500원 단위 구간이라 맞다.
 * 반대로 결과에서 다시 고르면 199,999원 언저리에서 100원 단위로 내려가 두 값이 갈린다.
 * 경계 아래로 내려간 결과가 더 작은 단위의 배수이기도 한 것은 문제가 되지 않는다 —
 * 큰 단위의 배수는 언제나 작은 단위의 배수다.
 */
export function snapToTick(price: number, market: Market, dir: "down" | "up"): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const tick = tickSize(price, market);
  const steps = dir === "down" ? Math.floor(price / tick) : Math.ceil(price / tick);
  // 내림이 0 으로 떨어지면 살 수 없는 값이 된다. 가장 싼 호가 한 칸은 남긴다.
  return Math.max(tick, steps * tick);
}

/** 접수할 수 있는 가격인가. API·DB 게이트가 이걸로 판정한다. */
export function isOnTick(price: number, market: Market): boolean {
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(price)) return false;
  return price % tickSize(price, market) === 0;
}
