import assert from "node:assert/strict";
import { buildTradeMarkers, chartBounds, symbolTrades } from "./trade-markers";
import type { Trade } from "../types/trade";

const base = { reason: "이 회사(제품)를 잘 알아", memo: "" } as const;

const trades: Trade[] = [
  { ...base, id: "c1", member: "child", symbol: "005930", side: "buy", quantity: 1, price: 70000, tradedAt: "2026-08-05T00:00:00.000Z" },
  { ...base, id: "p1", member: "parent", symbol: "005930", side: "buy", quantity: 2, price: 72000, tradedAt: "2026-08-06T00:00:00.000Z" },
  { ...base, id: "p2", member: "parent", symbol: "005930", side: "sell", quantity: 1, price: 74000, tradedAt: "2026-08-08T00:00:00.000Z" },
  { ...base, id: "x1", member: "child", symbol: "000660", side: "buy", quantity: 1, price: 190000, tradedAt: "2026-08-07T00:00:00.000Z" },
];

// 종목 필터 + 시간순 정렬
const picked = symbolTrades(trades, "005930");
assert.deepEqual(picked.map((trade) => trade.id), ["c1", "p1", "p2"]);
assert.equal(symbolTrades(trades, "999999").length, 0);

// 축은 차트 값과 체결가를 모두 포함해야 마커가 잘리지 않는다
const bounds = chartBounds([71000, 71500], picked);
assert.equal(bounds.min, 70000);
assert.equal(bounds.max, 74000);
assert.equal(bounds.range, 4000);

const markers = buildTradeMarkers({
  trades: picked,
  viewer: "child",
  min: bounds.min,
  range: bounds.range,
  width: 330,
  height: 150,
});

// 가격이 높을수록 위쪽(y가 작다)
assert.equal(markers.length, 3);
assert.ok(markers[2].y < markers[1].y, "74000이 72000보다 위여야 한다");
assert.ok(markers[1].y < markers[0].y, "72000이 70000보다 위여야 한다");

// 매수는 위 방향(▲), 매도는 아래 방향(▼)
assert.ok(markers[0].points.includes(`${markers[0].y - 9}`), "매수 꼭짓점은 위");
assert.ok(markers[2].points.includes(`${markers[2].y + 9}`), "매도 꼭짓점은 아래");

// 본인 마커에만 수량을 붙인다 — 타인 카드의 자산 규모 비노출 (v2.7 §10)
assert.equal(markers[0].label, "민지 매수 1주");
assert.equal(markers[1].label, "엄마 매수");
assert.equal(markers[2].label, "엄마 매도");

// 부모 계정으로 보면 반대가 된다
const parentView = buildTradeMarkers({
  trades: picked,
  viewer: "parent",
  min: bounds.min,
  range: bounds.range,
  width: 330,
  height: 150,
});
assert.equal(parentView[0].label, "민지 매수");
assert.equal(parentView[1].label, "엄마 매수 2주");

// 마커 하나면 가운데에 놓는다
const single = buildTradeMarkers({
  trades: [picked[0]],
  viewer: "child",
  min: bounds.min,
  range: bounds.range,
  width: 330,
  height: 150,
});
assert.equal(single[0].x, 165);

// 체결이 없으면 마커도 없다
assert.deepEqual(
  buildTradeMarkers({ trades: [], viewer: "child", min: 0, range: 1, width: 330, height: 150 }),
  [],
);

console.log("trade marker tests passed");
