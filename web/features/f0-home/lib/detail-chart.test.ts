import assert from "node:assert/strict";
import { buildDetailChart, PIN_COLORS } from "./detail-chart";

// spark 가 짧으면(0·1개) 그릴 선이 없다.
assert.equal(buildDetailChart({ code: "005930", spark: [], price: 1000, changePercent: 1, trades: [] }), null);
assert.equal(buildDetailChart({ code: "005930", spark: [50], price: 1000, changePercent: 1, trades: [] }), null);

const spark = [40, 60, 30, 80, 20, 55, 45];
const base = { code: "005930", spark, price: 10_000, changePercent: 2.5, trades: [] };

const geo = buildDetailChart(base);
assert.ok(geo);
// 선은 spark 길이만큼 좌표쌍을 낸다.
assert.equal(geo!.linePoints.split(" ").length, spark.length);
// 최고는 인덱스 3(80), 최저는 인덱스 4(20).
assert.match(geo!.hi.text, /^최고 [\d,]+원$/u);
assert.match(geo!.lo.text, /^최저 [\d,]+원$/u);
assert.ok(geo!.hi.visible);
assert.ok(geo!.lo.visible);

// 마지막 값이 최고·최저면 라벨을 숨긴다 — 지금 가격 표시와 겹치므로.
const lastIsHigh = buildDetailChart({ ...base, spark: [10, 20, 30, 100] });
assert.equal(lastIsHigh!.hi.visible, false);

// 매매 지점은 최근 3개만, 시간순으로.
const trades = [
  { id: "t1", name: "민지", member: "child" as const, side: "buy" as const, tradedAt: "2026-08-01T00:00:00Z" },
  { id: "t2", name: "엄마", member: "parent" as const, side: "sell" as const, tradedAt: "2026-08-03T00:00:00Z" },
  { id: "t3", name: "민지", member: "child" as const, side: "buy" as const, tradedAt: "2026-08-02T00:00:00Z" },
  { id: "t4", name: "아빠", member: "parent" as const, side: "buy" as const, tradedAt: "2026-08-04T00:00:00Z" },
];
const withTrades = buildDetailChart({ ...base, trades });
assert.equal(withTrades!.pins.length, 3);
assert.deepEqual(
  withTrades!.pins.map((p) => p.id),
  ["t3", "t2", "t4"],
);
assert.equal(withTrades!.pins[0].label, "B");
assert.equal(withTrades!.pins[1].label, "S");

// 가족 기록이 없어도 **원본처럼** B/S 지점을 세운다 — 51종 어디서나 보인다(B·B·S 세 개).
// 프로토타입이 갖고 있던 시연 폴백을 그대로 옮긴 것이다.
const noTrades = buildDetailChart({ ...base, trades: [] });
assert.equal(noTrades!.pins.length, 3);
assert.deepEqual(noTrades!.pins.map((p) => p.label), ["B", "B", "S"]);
// 코드만으로 정해지므로 같은 종목은 늘 같은 색·같은 자리다.
const again = buildDetailChart({ ...base, trades: [] });
assert.deepEqual(again!.pins.map((p) => p.color), noTrades!.pins.map((p) => p.color));
// 다른 종목은 다른 사람이 찍힌다(코드 해시가 색 순서를 돌린다).
const other = buildDetailChart({ ...base, code: "000660", trades: [] });
assert.notDeepEqual(other!.pins.map((p) => p.color), noTrades!.pins.map((p) => p.color));
// 색은 프로토타입의 파스텔 세 색 안에서만 고른다.
const palette = Object.values(PIN_COLORS);
for (const pin of noTrades!.pins) assert.ok(palette.includes(pin.color), pin.color);
// 실제 기록이 있으면 시연 지점은 쓰지 않는다.
assert.equal(withTrades!.pins.every((p) => !p.id.startsWith("demo_")), true);

console.log("detail chart tests passed");
