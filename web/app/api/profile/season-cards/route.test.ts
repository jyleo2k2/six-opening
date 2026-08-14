import assert from "node:assert/strict";
import { synthesizeTabViews, TAB_FLUSH_TOLERANCE_MS } from "./route";
import { computeEvidence, VALID_DWELL_MS } from "../../../../shared/engine/behavior-profile";
import type { ProfileBuy } from "../../../../shared/types/behavior-profile";

const buy = (over: Partial<ProfileBuy>): ProfileBuy => ({
  id: "b1",
  symbol: "005930",
  price: 100,
  quantity: 1,
  reason: null,
  tradedAt: "2026-08-05T02:00:00.000Z",
  ...over,
});

const boughtAt = Date.parse("2026-08-05T02:00:00.000Z");
const rows = (...entries: [number, number][]) =>
  new Map([["005930", entries.map(([at, count]) => ({ at, count }))]]);

// flush 한 행의 tab_count 만큼 서로 다른 탭이 매수 직전 시각으로 되살아난다
const two = synthesizeTabViews([buy({})], rows([boughtAt, 2]));
assert.equal(two.length, 2);
assert.deepEqual(new Set(two.map((view) => view.tab)).size, 2);
assert.ok(two.every((view) => Date.parse(view.viewedAt) < boughtAt));
assert.ok(two.every((view) => view.dwellMs >= VALID_DWELL_MS));

// 탭은 세 종류뿐이라 그 이상은 잘린다
assert.equal(synthesizeTabViews([buy({})], rows([boughtAt, 9])).length, 3);
// 한 번만 본 매수는 근거로 인정되지 않는다 (EVIDENCE_TAB_MIN = 2)
assert.equal(synthesizeTabViews([buy({})], rows([boughtAt, 1])).length, 1);
// 열람 기록이 없으면 아무것도 만들지 않는다
assert.deepEqual(synthesizeTabViews([buy({})], new Map()), []);

// 체결과 flush 가 거의 동시라 여유 시간 안쪽은 그 매수의 것으로 본다
assert.equal(synthesizeTabViews([buy({})], rows([boughtAt + 5_000, 2])).length, 2);
// 여유를 넘긴 행은 그 매수에 붙지 않는다
assert.equal(
  synthesizeTabViews([buy({})], rows([boughtAt + TAB_FLUSH_TOLERANCE_MS + 1, 2])).length,
  0,
);

// 같은 종목을 두 번 샀으면 행이 시간순으로 각 매수에 하나씩 붙는다
const laterAt = Date.parse("2026-08-06T02:00:00.000Z");
const paired = synthesizeTabViews(
  [buy({}), buy({ id: "b2", tradedAt: "2026-08-06T02:00:00.000Z" })],
  rows([boughtAt, 2], [laterAt, 3]),
);
assert.equal(paired.filter((view) => Date.parse(view.viewedAt) < boughtAt).length, 2);
assert.equal(paired.filter((view) => Date.parse(view.viewedAt) > boughtAt).length, 3);

// 되살린 열람이 엔진 근거력으로 그대로 이어진다 — 2탭 매수 1건이면 shrink(1,1) = 6
assert.equal(computeEvidence([buy({})], synthesizeTabViews([buy({})], rows([boughtAt, 2]))), 6);
// 1탭뿐이면 근거 미인정 → shrink(0,1) = 4
assert.equal(computeEvidence([buy({})], synthesizeTabViews([buy({})], rows([boughtAt, 1]))), 4);

console.log("season cards route tests passed");
