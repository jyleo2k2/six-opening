import assert from "node:assert/strict";
import {
  computeBehaviorProfile,
  computeEvidence,
  computeFocus,
  gradeAccuracy,
  judgeCharacter,
  kstDateOf,
  parsePrototypeProfileInput,
  profileEntriesFromTrades,
  starGradeOf,
  viewedTabCount,
} from "./behavior-profile";
import type { DailyClose, ProfileBuy, ProfileTabView } from "../types/behavior-profile";
import type { Trade } from "../types/trade";

const buy = (over: Partial<ProfileBuy>): ProfileBuy => ({
  id: "b1",
  symbol: "005930",
  price: 100,
  quantity: 1,
  reason: "buy_news",
  tradedAt: "2026-08-05T02:00:00.000Z",
  ...over,
});

const view = (over: Partial<ProfileTabView>): ProfileTabView => ({
  tab: "news",
  symbol: "005930",
  viewedAt: "2026-08-05T01:00:00.000Z",
  dwellMs: 12_000,
  ...over,
});

// KST 변환 — 16시 UTC 는 KST 다음날이다
assert.equal(kstDateOf("2026-08-04T16:00:00.000Z"), "2026-08-05");
assert.equal(kstDateOf("2026-08-04T02:00:00.000Z"), "2026-08-04");

// 유효 열람 — 10초 미만·다른 종목·매수 이후 열람은 세지 않는다
const b1 = buy({});
assert.equal(viewedTabCount(b1, [view({}), view({ tab: "chart" })]), 2);
assert.equal(viewedTabCount(b1, [view({ dwellMs: 9_999 })]), 0);
assert.equal(viewedTabCount(b1, [view({ symbol: "000660" })]), 0);
assert.equal(viewedTabCount(b1, [view({ viewedAt: "2026-08-05T03:00:00.000Z" })]), 0);
// 기업정보 탭은 화면 출시 전이지만 이벤트 매핑이 이미 산다
assert.equal(viewedTabCount(b1, [view({ tab: "info" }), view({ tab: "chart" })]), 2);
// 같은 탭을 여러 번 봐도 종류는 1개다
assert.equal(viewedTabCount(b1, [view({}), view({ viewedAt: "2026-08-05T00:30:00.000Z" })]), 1);

// 근거력 — 2탭+ 매수 1건 / 전체 2건 = 5점
const b2 = buy({ id: "b2", symbol: "000660", tradedAt: "2026-08-06T02:00:00.000Z" });
assert.equal(computeEvidence([b1, b2], [view({}), view({ tab: "chart" })]), 5);
assert.equal(computeEvidence([], []), 0);

// 집중력 — 섹터 경계 3↔4, 현금 50% 패널티, 전량 현금
const sectorBySymbol = { A: "game", B: "ent", C: "food", D: "bank", E: "auto" };
const holding = (symbol: string) => ({ symbol, quantity: 1, averagePrice: 100 });
const prices = { A: 100, B: 100, C: 100, D: 100, E: 100 };
assert.equal(computeFocus([holding("A"), holding("B"), holding("C")], 0, prices, sectorBySymbol), 7);
assert.equal(computeFocus([holding("A"), holding("B"), holding("C"), holding("D")], 0, prices, sectorBySymbol), 4);
// 현금비중 50% 이상이면 −2 (보유 300 = 현금 300)
assert.equal(computeFocus([holding("A"), holding("B"), holding("C")], 300, prices, sectorBySymbol), 5);
assert.equal(computeFocus([], 1_000_000, prices, sectorBySymbol), 1);
// 현재가가 없으면 averagePrice 로 평가한다 — 값 200이면 현금 100은 33%라 패널티 없음
assert.equal(computeFocus([{ symbol: "A", quantity: 2, averagePrice: 100 }], 100, {}, sectorBySymbol), 9);

// 정확력 — 5거래일 종가 판정과 표본 보류
const closes = (symbol: string, dates: [string, number][]): Record<string, DailyClose[]> => ({
  [symbol]: dates.map(([date, close]) => ({ date, close })),
});
const series = closes("005930", [
  ["2026-08-03", 100],
  ["2026-08-04", 101],
  ["2026-08-05", 102],
  ["2026-08-06", 103],
  ["2026-08-07", 104],
  ["2026-08-10", 110],
  ["2026-08-11", 90],
  ["2026-08-12", 91],
]);
// 08-03 매수 100원 → 5거래일 뒤(08-10) 110원 = 적중, 기본 5점 +1 = 6점
const early = buy({ tradedAt: "2026-08-03T02:00:00.000Z" });
assert.deepEqual(gradeAccuracy([early], [], series), { accuracy: 6, graded: 1, pending: 0, hits: 1 });
// 08-10 매수 → 남은 봉 2개뿐이라 채점 보류, 점수는 기본 5점 그대로
const late = buy({ id: "b9", tradedAt: "2026-08-10T02:00:00.000Z" });
assert.deepEqual(gradeAccuracy([late], [], series), { accuracy: 5, graded: 0, pending: 1, hits: 0 });
// 캔들이 아예 없는 종목도 보류
assert.equal(gradeAccuracy([buy({ symbol: "999999" })], [], series).pending, 1);
// 매도 — 08-04 매도(종가 101 근사) → 5거래일 뒤(08-11) 90 = 하락 적중
const sell = { id: "s1", symbol: "005930", tradedAt: "2026-08-04T05:00:00.000Z", planMatch: true };
assert.equal(gradeAccuracy([], [sell], series).hits, 1);
// 가감점 누적 — 적중 2·빗나감 1 → 5 + 2 − 1 = 6점
const miss = buy({ id: "b3", price: 200, tradedAt: "2026-08-03T02:00:00.000Z" });
const graded3 = gradeAccuracy([early, miss], [sell], series);
assert.equal(graded3.graded, 3);
assert.equal(graded3.accuracy, 6);
// 상·하한은 다른 능력치와 같은 0~10 — 연속 적중·빗나감이 쌓여도 넘지 않는다
const manyHits = Array.from({ length: 7 }, (unused, i) => buy({ id: `h${i}`, tradedAt: "2026-08-03T02:00:00.000Z" }));
assert.equal(gradeAccuracy(manyHits, [], series).accuracy, 10);
const manyMisses = Array.from({ length: 7 }, (unused, i) => buy({ id: `m${i}`, price: 200, tradedAt: "2026-08-03T02:00:00.000Z" }));
assert.equal(gradeAccuracy(manyMisses, [], series).accuracy, 0);

// 캐릭터 — 동점 5:5 는 근거·집중 귀속
assert.equal(judgeCharacter({ evidence: 5, intuition: 5, focus: 5, diversification: 5 }), "sniper");
assert.equal(judgeCharacter({ evidence: 7, intuition: 3, focus: 4, diversification: 6 }), "strategist");
assert.equal(judgeCharacter({ evidence: 3, intuition: 7, focus: 6, diversification: 4 }), "challenger");
assert.equal(judgeCharacter({ evidence: 3, intuition: 7, focus: 4, diversification: 6 }), "explorer");

// 별 등급 경계 — 7점부터 ★★★, 4점부터 ★★☆
assert.equal(starGradeOf(7), 3);
assert.equal(starGradeOf(6), 2);
assert.equal(starGradeOf(4), 2);
assert.equal(starGradeOf(3), 1);

// 통합 — 매수 2건은 관찰 초기, 3건부터 캐릭터가 나온다
const baseInput = {
  userId: "child_minji",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-14",
  sells: [],
  tabViews: [view({}), view({ tab: "chart" })],
  holdings: [holding("A")],
  cash: 0,
  priceBySymbol: prices,
  sectorBySymbol,
  dailyClosesBySymbol: series,
};
const initial = computeBehaviorProfile({ ...baseInput, buys: [b1, b2] });
assert.equal(initial.observationState, "initial");
assert.equal(initial.character, null);
assert.equal(initial.starGrade, null);

const ready = computeBehaviorProfile({ ...baseInput, buys: [b1, b2, buy({ id: "b4", symbol: "035420" })] });
assert.equal(ready.observationState, "ready");
assert.equal(ready.sampleSize, 3);
// 근거력 = 2탭 매수 1/3 → 3점, 직관력 7점, 보유 1섹터 → 집중 9점 → 승부사
assert.equal(ready.abilities.evidence, 3);
assert.equal(ready.abilities.intuition, 7);
assert.equal(ready.abilities.focus, 9);
assert.equal(ready.character, "challenger");
// 채점된 매수 1건이 빗나가 5 − 1 = 4점, 나머지는 보류로 점수에 반영되지 않는다
assert.equal(ready.abilities.accuracy, 4);
assert.equal(ready.gradedTradeCount, 1);
assert.equal(ready.pendingTradeCount, 2);
assert.equal(ready.starGrade, 2);
assert.equal(ready.reasonDistribution.buy_news, 3);

// kw_proto_v1 원본 매핑 — 체결만, 단가 도출, 계정 분리, 이벤트 매핑
const rawState = {
  acc: {
    child: { name: "민지", cash: 500_000, holdings: [{ code: "005930", qty: 2, avg: 100_000 }] },
    parent: { name: "엄마", cash: 1_000_000, holdings: [] },
  },
  records: [
    {
      order_id: "ord_0001",
      user_id: "child_minji",
      symbol: "005930",
      amount_krw: 200_000,
      qty: 2,
      order_status: "filled",
      reason_code: "buy_intuition",
      ts: "2026-08-05T02:00:00.000Z",
    },
    { order_id: "ord_0002", user_id: "child_minji", symbol: "000660", amount_krw: 90_000, qty: 1, order_status: "pending", ts: "2026-08-05T03:00:00.000Z" },
    { order_id: "ord_0003", user_id: "parent_mom", symbol: "011200", amount_krw: 21_400, qty: 1, order_status: "filled", ts: "2026-08-06T04:00:00.000Z" },
  ],
  sellRecords: [
    { order_id: "ord_0004", user_id: "child_minji", symbol: "005930", qty: 1, plan_match: false, ts: "2026-08-07T02:00:00.000Z" },
  ],
  events: [
    { event: "news_detail_opened", symbol: "005930", user_id: "child_minji", ts: "2026-08-05T01:00:00.000Z", dwell_ms: 15_000 },
    { event: "info_detail_opened", symbol: "005930", user_id: "child_minji", ts: "2026-08-05T01:10:00.000Z", dwell_ms: 11_000 },
    { event: "chart_timeframe_changed", symbol: "005930", user_id: "child_minji", ts: "2026-08-05T01:20:00.000Z" },
    { event: "chart_detail_opened", symbol: "005930", user_id: "parent_mom", ts: "2026-08-05T01:30:00.000Z", dwell_ms: 20_000 },
  ],
};
const childInput = parsePrototypeProfileInput(rawState, "child");
assert.equal(childInput.buys.length, 1);
assert.equal(childInput.buys[0].price, 100_000);
assert.equal(childInput.sells.length, 1);
assert.equal(childInput.sells[0].planMatch, false);
assert.deepEqual(childInput.tabViews.map((item) => item.tab), ["news", "info"]);
assert.equal(childInput.cash, 500_000);
assert.equal(childInput.holdings[0].averagePrice, 100_000);
const parentInput = parsePrototypeProfileInput(rawState, "parent");
assert.equal(parentInput.buys.length, 1);
assert.deepEqual(parentInput.tabViews.map((item) => item.tab), ["chart"]);
assert.equal(parsePrototypeProfileInput(null, "child").buys.length, 0);

// F11 시드(Trade) → 엔진 표본
const seed: Trade[] = [
  { id: "seed-1", member: "parent", symbol: "005930", side: "buy", quantity: 2, price: 240_000, reason: "이 회사(제품)를 잘 알아", memo: "", tradedAt: "2026-08-04T01:12:00.000Z" },
  { id: "seed-2", member: "parent", symbol: "011200", side: "sell", quantity: 5, price: 21_400, reason: "목표한 만큼 와서", memo: "", tradedAt: "2026-08-06T04:35:00.000Z" },
  { id: "seed-3", member: "child", symbol: "035420", side: "buy", quantity: 1, price: 90_000, reason: "뉴스에서 봤어", memo: "", tradedAt: "2026-08-07T01:00:00.000Z" },
];
const parentEntries = profileEntriesFromTrades(seed, "parent");
assert.equal(parentEntries.buys.length, 1);
assert.equal(parentEntries.sells.length, 1);
assert.equal(profileEntriesFromTrades(seed, "child").buys.length, 1);

console.log("behavior profile engine tests passed");
