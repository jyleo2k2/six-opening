import assert from "node:assert/strict";
import { buildDetailChart, PIN_COLORS } from "./detail-chart";

// spark 가 짧으면(0·1개) 그릴 선이 없다.
assert.equal(buildDetailChart({ spark: [], price: 1000, changePercent: 1, trades: [] }), null);
assert.equal(buildDetailChart({ spark: [50], price: 1000, changePercent: 1, trades: [] }), null);

const spark = [40, 60, 30, 80, 20, 55, 45];
const base = { spark, price: 10_000, changePercent: 2.5, trades: [] };

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

// 체결 기록이 없으면 핀도 없다 — 없는 매매를 지어내지 않는다.
assert.equal(buildDetailChart(base)!.pins.length, 0);
// 핀 색은 프로토타입의 파스텔 표에서 고른다.
const palette: string[] = Object.values(PIN_COLORS);
for (const pin of withTrades!.pins) assert.ok(palette.includes(pin.color), pin.color);

console.log("detail chart tests passed");
