import assert from "node:assert/strict";
import { buildTradeMarkers, type ChartTrade } from "./trade-markers";

// `GET /api/trades?symbol=005930` 이 돌려주는 모양. 종목 필터와 수량 마스킹은 서버가 끝냈다.
const trades: ChartTrade[] = [
  { id: "c1", name: "김찬영", member: "child", side: "buy", price: 70000, quantity: 1, tradedAt: "2026-08-05T02:00:00.000Z" },
  { id: "p1", name: "엄마", member: "parent", side: "buy", price: 72000, quantity: null, tradedAt: "2026-08-06T02:00:00.000Z" },
  { id: "p2", name: "엄마", member: "parent", side: "sell", price: 74000, quantity: null, tradedAt: "2026-08-08T02:00:00.000Z" },
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

const markers = buildTradeMarkers({ trades, candleTimes });
assert.equal(markers.length, 3);

// 체결은 그 시각 이하의 마지막 봉에 붙는다 — 거래 순번이 아니라 실제 거래일 축이다
assert.equal(markers[0].time, day("2026-08-05T00:00:00.000Z"));
assert.equal(markers[1].time, day("2026-08-06T00:00:00.000Z"));
assert.equal(markers[2].time, day("2026-08-08T00:00:00.000Z"));

// y 는 곧 체결가다. 라이브러리가 가격축에 그대로 얹는다
assert.deepEqual(markers.map((marker) => marker.price), [70000, 72000, 74000]);
assert.deepEqual(markers.map((marker) => marker.side), ["buy", "buy", "sell"]);
assert.deepEqual(markers.map((marker) => marker.member), ["child", "parent", "parent"]);

// 라벨의 이름은 profiles.name 을 그대로 쓴다. 수량은 서버가 남긴 것만 붙는다
assert.equal(markers[0].label, "김찬영 매수 1주");
assert.equal(markers[1].label, "엄마 매수");
assert.equal(markers[2].label, "엄마 매도");

// 응답 순서가 뒤집혀 와도 마커는 시간순이다
const shuffled = buildTradeMarkers({ trades: [...trades].reverse(), candleTimes });
assert.deepEqual(shuffled.map((marker) => marker.id), ["c1", "p1", "p2"]);

// 첫 봉보다 이른 체결은 차트 범위 밖이라 버린다 — 없는 날짜에 찍으면 안 된다
const older: ChartTrade = { id: "old", name: "김찬영", member: "child", side: "buy", price: 60000, quantity: 1, tradedAt: "2026-07-01T02:00:00.000Z" };
assert.equal(buildTradeMarkers({ trades: [older], candleTimes }).length, 0);

// 체결이 없거나 봉이 없으면 마커도 없다
assert.deepEqual(buildTradeMarkers({ trades: [], candleTimes }), []);
assert.deepEqual(buildTradeMarkers({ trades, candleTimes: [] }), []);

console.log("trade marker tests passed");
