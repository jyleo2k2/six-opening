import assert from "node:assert/strict";
import {
  closesCutoff,
  CLOSE_LOOKBACK_DAYS,
  CLOSE_MIN_WINDOW_DAYS,
  synthesizeTabViews,
  TAB_FLUSH_TOLERANCE_MS,
} from "./route";
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

// ── 종가 조회 구간 ──────────────────────────────────────────────────────────
// 예전에는 보관 구간 전체(1년)를 종목마다 받아 수십 행만 썼다. 엔진이 보는 구간은
// 첫 거래일부터라 거기서 열흘만 앞서면 된다.

const day = 24 * 60 * 60 * 1000;
const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const asOf = new Date("2026-08-18T09:00:00+09:00");

// 첫 거래 열흘 전부터 읽는다 — 연휴로 직전 거래일이 멀어도 매도가 대체가 짚을 종가가 있다
assert.equal(
  closesCutoff(["2026-06-01T02:00:00.000Z", "2026-05-01T02:00:00.000Z"], asOf),
  at("2026-04-21T02:00:00.000Z"),
);
assert.equal(CLOSE_LOOKBACK_DAYS, 10);

// 거래가 없으면 현재가만 쓰므로 최근 한 달이면 된다
assert.equal(closesCutoff([], asOf), Math.floor((asOf.getTime() - CLOSE_MIN_WINDOW_DAYS * day) / 1000));

// 첫 거래가 최근이어도 창은 한 달 아래로 줄지 않는다 — 마지막 종가가 한 개도 없으면
// 평가금액이 평균단가로 떨어진다
assert.equal(
  closesCutoff(["2026-08-17T02:00:00.000Z"], asOf),
  Math.floor((asOf.getTime() - CLOSE_MIN_WINDOW_DAYS * day) / 1000),
);

// 날짜로 못 읽는 값은 구간을 넓히지 않는다
assert.equal(closesCutoff(["", "그런 날 없음"], asOf), closesCutoff([], asOf));

console.log("season cards route tests passed");
