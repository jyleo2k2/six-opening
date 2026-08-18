import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeChartPoints,
  parseChartPoints,
  type ChartPoint,
} from "./chart-data";

const point = (time: string, open: number, high: number, low: number, close: number): ChartPoint => ({
  time: Math.floor(new Date(time).getTime() / 1000),
  open,
  high,
  low,
  close,
  volume: 10,
  price: close,
});

test("잘못된 API 포인트는 TradingView에 전달하지 않는다", () => {
  const valid = point("2026-08-01T00:00:00+09:00", 100, 110, 90, 105);
  const parsed = parseChartPoints({ points: [{ ...valid, close: 0 }, valid] });
  assert.deepEqual(parsed, [valid]);
});

test("API 포인트를 시간순으로 정렬한다", () => {
  const earlier = point("2026-08-01T00:00:00+09:00", 100, 110, 90, 105);
  const later = point("2026-08-02T00:00:00+09:00", 105, 115, 100, 110);
  assert.deepEqual(parseChartPoints({ points: [later, earlier] }), [earlier, later]);
});

test("chart polling replaces the current candle and appends new candles", () => {
  const current = point("2026-08-01T00:00:00+09:00", 100, 110, 90, 105);
  const next = point("2026-08-02T00:00:00+09:00", 105, 115, 100, 110);
  const updated = { ...current, close: 108, price: 108 };

  assert.deepEqual(mergeChartPoints([current], [updated, next]), [updated, next]);
});

test("chart polling preserves existing points and sorts by time", () => {
  const earlier = point("2026-08-01T00:00:00+09:00", 100, 110, 90, 105);
  const later = point("2026-08-02T00:00:00+09:00", 105, 115, 100, 110);

  assert.deepEqual(mergeChartPoints([later], [earlier]), [earlier, later]);
});
