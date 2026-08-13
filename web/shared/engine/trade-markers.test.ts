import assert from "node:assert/strict";
import { buildTradeMarkers, symbolTrades } from "./trade-markers";
import type { Trade } from "../types/trade";

const base = { reason: "이 회사(제품)를 잘 알아", memo: "" } as const;

const trades: Trade[] = [
  { ...base, id: "c1", member: "child", symbol: "005930", side: "buy", quantity: 1, price: 70000, tradedAt: "2026-08-05T02:00:00.000Z" },
  { ...base, id: "p1", member: "parent", symbol: "005930", side: "buy", quantity: 2, price: 72000, tradedAt: "2026-08-06T02:00:00.000Z" },
  { ...base, id: "p2", member: "parent", symbol: "005930", side: "sell", quantity: 1, price: 74000, tradedAt: "2026-08-08T02:00:00.000Z" },
  { ...base, id: "x1", member: "child", symbol: "000660", side: "buy", quantity: 1, price: 190000, tradedAt: "2026-08-07T02:00:00.000Z" },
];

const day = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
// 08-04 부터 08-08 까지의 일봉. 각 봉은 그날 00:00 UTC 로 잡는다.
const candleTimes = [
  day("2026-08-04T00:00:00.000Z"),
  day("2026-08-05T00:00:00.000Z"),
  day("2026-08-06T00:00:00.000Z"),
  day("2026-08-07T00:00:00.000Z"),
  day("2026-08-08T00:00:00.000Z"),
];

// 종목 필터 + 시간순 정렬
const picked = symbolTrades(trades, "005930");
assert.deepEqual(picked.map((trade) => trade.id), ["c1", "p1", "p2"]);
assert.equal(symbolTrades(trades, "999999").length, 0);

const markers = buildTradeMarkers({ trades: picked, viewer: "child", candleTimes });
assert.equal(markers.length, 3);

// 체결은 그 시각 이하의 마지막 봉에 붙는다 — 거래 순번이 아니라 실제 거래일 축이다
assert.equal(markers[0].time, day("2026-08-05T00:00:00.000Z"));
assert.equal(markers[1].time, day("2026-08-06T00:00:00.000Z"));
assert.equal(markers[2].time, day("2026-08-08T00:00:00.000Z"));

// y 는 곧 체결가다. 라이브러리가 가격축에 그대로 얹는다
assert.deepEqual(markers.map((marker) => marker.price), [70000, 72000, 74000]);
assert.deepEqual(markers.map((marker) => marker.side), ["buy", "buy", "sell"]);

// 본인 마커에만 수량을 붙인다 — 타인 자산 규모 비노출 (v2.7 §10)
assert.equal(markers[0].label, "민지 매수 1주");
assert.equal(markers[1].label, "엄마 매수");
assert.equal(markers[2].label, "엄마 매도");

// 부모 계정으로 보면 반대가 된다
const parentView = buildTradeMarkers({ trades: picked, viewer: "parent", candleTimes });
assert.equal(parentView[0].label, "민지 매수");
assert.equal(parentView[1].label, "엄마 매수 2주");

// 열람 계정을 모르면 아무에게도 수량을 붙이지 않는다
const unknownViewer = buildTradeMarkers({ trades: picked, viewer: null, candleTimes });
assert.deepEqual(
  unknownViewer.map((marker) => marker.label),
  ["민지 매수", "엄마 매수", "엄마 매도"],
);

// 첫 봉보다 이른 체결은 차트 범위 밖이라 버린다 — 없는 날짜에 찍으면 안 된다
const older: Trade = { ...base, id: "old", member: "child", symbol: "005930", side: "buy", quantity: 1, price: 60000, tradedAt: "2026-07-01T02:00:00.000Z" };
assert.equal(
  buildTradeMarkers({ trades: [older], viewer: "child", candleTimes }).length,
  0,
);

// 체결이 없거나 봉이 없으면 마커도 없다
assert.deepEqual(buildTradeMarkers({ trades: [], viewer: "child", candleTimes }), []);
assert.deepEqual(buildTradeMarkers({ trades: picked, viewer: "child", candleTimes: [] }), []);

console.log("trade marker tests passed");
