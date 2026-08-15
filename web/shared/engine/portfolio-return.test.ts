import assert from "node:assert/strict";
import { computePortfolioReturn } from "./portfolio-return";

// 라이브 DB 의 찬영아빠 구성(5종목). 종가는 stock_candles 2026-08-13 기준.
const dadHoldings = [
  { symbol: "005930", quantity: 6, averagePrice: 270000 },
  { symbol: "000660", quantity: 1, averagePrice: 1630000 },
  { symbol: "005380", quantity: 3, averagePrice: 448000 },
  { symbol: "012450", quantity: 1, averagePrice: 1120000 },
  { symbol: "010140", quantity: 100, averagePrice: 22000 },
];
const dadPrices = {
  "005930": 274500,
  "000660": 1645000,
  "005380": 510000,
  "012450": 1147000,
  "010140": 22300,
};

const dad = computePortfolioReturn(dadHoldings, dadPrices, 2_086_000);
assert.equal(dad.marketValue, 274500 * 6 + 1645000 + 510000 * 3 + 1147000 + 22300 * 100);
assert.equal(dad.cost, 270000 * 6 + 1630000 + 448000 * 3 + 1120000 + 22000 * 100);
assert.equal(dad.profit, dad.marketValue - dad.cost);
assert.ok(dad.returnRate > 0 && dad.returnRate < 5, `실제 구성 수익률: ${dad.returnRate}`);
assert.equal(dad.valuedCount, 5);
assert.equal(dad.pricelessCount, 0);

// 보유가 없으면 0%. 나눗셈이 NaN 이 되면 트랙이 통째로 깨진다.
const empty = computePortfolioReturn([], {}, 10_000_000);
assert.equal(empty.returnRate, 0);
assert.equal(empty.marketValue, 0);
assert.equal(empty.cash, 10_000_000);

// 손실도 그대로 음수로 나온다.
const loss = computePortfolioReturn(
  [{ symbol: "005930", quantity: 10, averagePrice: 100000 }],
  { "005930": 80000 },
  0,
);
assert.equal(loss.returnRate, -20);
assert.equal(loss.profit, -200000);

// 현재가가 없는 종목은 평균단가로 평가한다 — 손익 0 으로 남기고 빼지 않는다.
// 빼버리면 원금만 줄어 남은 종목의 수익률이 부풀어 보인다.
const partial = computePortfolioReturn(
  [
    { symbol: "005930", quantity: 1, averagePrice: 100000 },
    { symbol: "999999", quantity: 1, averagePrice: 500000 },
  ],
  { "005930": 110000 },
  0,
);
assert.equal(partial.cost, 600000);
assert.equal(partial.marketValue, 610000);
assert.equal(partial.pricelessCount, 1);
assert.ok(Math.abs(partial.returnRate - 1.6667) < 0.001);

// 수량 0(전량 매도 뒤 남은 행)과 망가진 값은 세지 않는다.
const dirty = computePortfolioReturn(
  [
    { symbol: "005930", quantity: 0, averagePrice: 100000 },
    { symbol: "000660", quantity: 2, averagePrice: 100000 },
  ],
  { "000660": 100000 },
  0,
);
assert.equal(dirty.valuedCount, 1);
assert.equal(dirty.returnRate, 0);

console.log("portfolio return engine tests passed");
