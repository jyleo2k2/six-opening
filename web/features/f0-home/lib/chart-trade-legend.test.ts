import assert from "node:assert/strict";
import { buildTradeLegend, type LegendTrade } from "./chart-trade-legend";

const trade = (over: Partial<LegendTrade> & { id: string }): LegendTrade => ({
  name: "김찬영",
  member: "child",
  side: "buy",
  price: 232_000,
  tradedAt: "2026-08-04T01:20:00+09:00",
  ...over,
});

// 체결이 없으면 줄이 없다 — 화면은 이때 범례를 통째로 감춘다.
assert.deepEqual(buildTradeLegend([]), []);

// 한 줄의 모양: 시안의 `B | 찬영 | 8/4 | 232,000원 | 매수`.
const [one] = buildTradeLegend([trade({ id: "t1" })]);
assert.equal(one.label, "B");
assert.equal(one.who, "김찬영");
assert.equal(one.date, "8/4");
assert.equal(one.price, "232,000원");
assert.equal(one.side, "매수");
assert.equal(one.member, "child");

// 매도는 S 와 `매도` 로 뒤집힌다.
const [sold] = buildTradeLegend([trade({ id: "t2", side: "sell" })]);
assert.equal(sold.label, "S");
assert.equal(sold.side, "매도");

// 부모 체결은 member 를 그대로 넘겨 점 색이 차트 마커와 같아진다.
const [byParent] = buildTradeLegend([trade({ id: "t3", member: "parent", name: "찬영엄마" })]);
assert.equal(byParent.member, "parent");
assert.equal(byParent.who, "찬영엄마");

// 다섯 건이면 오래된 하나를 버리고 마지막 넷만, 시간 오름차순으로 남긴다.
const many = buildTradeLegend([
  trade({ id: "d", tradedAt: "2026-08-04T00:00:00+09:00" }),
  trade({ id: "a", tradedAt: "2026-08-01T00:00:00+09:00" }),
  trade({ id: "e", tradedAt: "2026-08-05T00:00:00+09:00" }),
  trade({ id: "c", tradedAt: "2026-08-03T00:00:00+09:00" }),
  trade({ id: "b", tradedAt: "2026-08-02T00:00:00+09:00" }),
]);
assert.deepEqual(many.map((row) => row.id), ["b", "c", "d", "e"]);

// 체결 시각은 한국 시각으로 읽는다. UTC 8/3 16:00 은 KST 8/4 01:00 이라 8/4 다 —
// 실행 환경 표준시를 따라가면 자정 근처 체결이 하루씩 어긋난다.
const [midnight] = buildTradeLegend([trade({ id: "t4", tradedAt: "2026-08-03T16:00:00Z" })]);
assert.equal(midnight.date, "8/4");

// 시각을 못 읽으면 날짜만 비운다. 줄 자체는 남긴다 — 체결은 실제로 있었다.
const [broken] = buildTradeLegend([trade({ id: "t5", tradedAt: "언제인지 모름" })]);
assert.equal(broken.date, "");
assert.equal(broken.price, "232,000원");

// 원 단위로 반올림해 천 단위를 끊는다.
const [rounded] = buildTradeLegend([trade({ id: "t6", price: 1_234_567.4 })]);
assert.equal(rounded.price, "1,234,567원");

// 원본을 건드리지 않는다 — 화면이 넘긴 목록의 순서가 바뀌면 안 된다.
const given: LegendTrade[] = [
  trade({ id: "late", tradedAt: "2026-08-09T00:00:00+09:00" }),
  trade({ id: "early", tradedAt: "2026-08-01T00:00:00+09:00" }),
];
buildTradeLegend(given);
assert.deepEqual(given.map((row) => row.id), ["late", "early"]);
