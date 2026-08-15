import assert from "node:assert/strict";
import {
  accuracyLevelOf,
  buildCard,
  computeBehaviorProfile,
  computeEvidence,
  computeFocus,
  effectiveSectorCount,
  gradeTrades,
  judgeCharacter,
  kstDateOf,
  mondayOf,
  replayPortfolio,
  scoreAccuracy,
  shrink,
  viewedTabCount,
  weekBucketsKST,
} from "./behavior-profile";
import type { DailyClose, ProfileBuy, ProfileSell, ProfileTabView } from "../types/behavior-profile";

const buy = (over: Partial<ProfileBuy>): ProfileBuy => ({
  id: "b1",
  symbol: "005930",
  price: 100,
  quantity: 1,
  reason: "buy_news",
  tradedAt: "2026-08-05T02:00:00.000Z",
  ...over,
});

const sell = (over: Partial<ProfileSell>): ProfileSell => ({
  id: "s1",
  symbol: "005930",
  quantity: 1,
  price: null,
  tradedAt: "2026-08-04T05:00:00.000Z",
  planMatch: true,
  ...over,
});

const view = (over: Partial<ProfileTabView>): ProfileTabView => ({
  tab: "news",
  symbol: "005930",
  viewedAt: "2026-08-05T01:00:00.000Z",
  dwellMs: 12_000,
  ...over,
});

// ── 스케일: 표본이 없으면 중립 5, 표본이 쌓여야 극단으로 간다 ────────────────
assert.equal(shrink(0, 0), 5);
assert.equal(shrink(1, 1), 6);
assert.equal(shrink(0, 1), 4);
assert.equal(shrink(2, 2), 6.7);
assert.equal(shrink(10, 10), 8.6);
assert.equal(shrink(0, 10), 1.4);
// 한두 건으로는 극단이 나오지 않고, 표본이 충분히 쌓이면 그때 극단에 닿는다
assert.ok(shrink(1, 1) < 10 && shrink(0, 1) > 0);
assert.equal(shrink(1000, 1000), 10);
assert.equal(shrink(0, 1000), 0);

// ── 날짜 ───────────────────────────────────────────────────────────────────
// KST 변환 — 16시 UTC 는 KST 다음날이다
assert.equal(kstDateOf("2026-08-04T16:00:00.000Z"), "2026-08-05");
assert.equal(kstDateOf("2026-08-04T02:00:00.000Z"), "2026-08-04");
// 2026-08-10 은 월요일이다
assert.equal(mondayOf("2026-08-10"), "2026-08-10");
assert.equal(mondayOf("2026-08-14"), "2026-08-10");
assert.equal(mondayOf("2026-08-09"), "2026-08-03");
assert.deepEqual(weekBucketsKST("2026-08-03", "2026-08-14"), [
  { start: "2026-08-03", end: "2026-08-09" },
  { start: "2026-08-10", end: "2026-08-16" },
]);
// 거래가 없어도 이번 주 한 장은 나온다
assert.equal(weekBucketsKST("2026-08-14", "2026-08-14").length, 1);
assert.deepEqual(weekBucketsKST("2026-08-15", "2026-08-14"), []);

// ── 근거력 ─────────────────────────────────────────────────────────────────
const b1 = buy({});
// 유효 열람 — 10초 미만·다른 종목·매수 이후 열람은 세지 않는다
assert.equal(viewedTabCount(b1, [view({}), view({ tab: "chart" })]), 2);
assert.equal(viewedTabCount(b1, [view({ dwellMs: 9_999 })]), 0);
assert.equal(viewedTabCount(b1, [view({ symbol: "000660" })]), 0);
assert.equal(viewedTabCount(b1, [view({ viewedAt: "2026-08-05T03:00:00.000Z" })]), 0);
// 기업정보 탭은 화면 출시 전이지만 이벤트 매핑이 이미 산다
assert.equal(viewedTabCount(b1, [view({ tab: "info" }), view({ tab: "chart" })]), 2);
// 같은 탭을 여러 번 봐도 종류는 1개다
assert.equal(viewedTabCount(b1, [view({}), view({ viewedAt: "2026-08-05T00:30:00.000Z" })]), 1);

// 매수가 없으면 중립, 1건 근거면 6, 1건 무근거면 4
assert.equal(computeEvidence([], []), 5);
assert.equal(computeEvidence([b1], [view({}), view({ tab: "chart" })]), 6);
assert.equal(computeEvidence([b1], [view({})]), 4);

// ── 집중력 ─────────────────────────────────────────────────────────────────
const sectorBySymbol = { A: "game", B: "ent", C: "food", D: "bank", E: "auto" };
const holding = (symbol: string, quantity = 1) => ({ symbol, quantity, averagePrice: 100 });
const prices = { A: 100, B: 100, C: 100, D: 100, E: 100 };

// 유효 섹터수는 가짓수가 아니라 비중을 본다 — 900:100 은 섹터가 둘이어도 1.2 다
assert.equal(effectiveSectorCount([holding("A")], prices, sectorBySymbol), 1);
assert.equal(effectiveSectorCount([holding("A"), holding("B")], prices, sectorBySymbol), 2);
assert.ok(
  Math.abs(effectiveSectorCount([holding("A", 9), holding("B")], prices, sectorBySymbol) - 1.2195) <
    0.001,
);
// 섹터를 모르는 종목은 제외한다
assert.equal(effectiveSectorCount([holding("Z")], prices, sectorBySymbol), 0);

// 1섹터 몰빵 = 10, 앵커인 3섹터 균등 = 중립 5, 2섹터 균등은 그 사이
assert.equal(computeFocus([holding("A")], 0, prices, sectorBySymbol), 10);
assert.equal(computeFocus([holding("A"), holding("B"), holding("C")], 0, prices, sectorBySymbol), 5);
assert.equal(computeFocus([holding("A"), holding("B")], 0, prices, sectorBySymbol), 6.8);
// 계단이 없다 — 3섹터에서 4섹터로 넘어가도 완만하게 내려간다
const three = computeFocus([holding("A"), holding("B"), holding("C")], 0, prices, sectorBySymbol);
const four = computeFocus(
  [holding("A"), holding("B"), holding("C"), holding("D")],
  0,
  prices,
  sectorBySymbol,
);
assert.ok(three - four > 0 && three - four < 2);
// 비중이 쏠려 있으면 섹터가 둘이어도 집중이다
assert.equal(computeFocus([holding("A", 9), holding("B")], 0, prices, sectorBySymbol), 9.1);
// 현금은 절벽 없이 중립으로 끌어당긴다 — 50% 현금이면 10점이 7.5로 내려온다
assert.equal(computeFocus([holding("A")], 100, prices, sectorBySymbol), 7.5);
// 전량 현금·판정할 보유 없음은 정확히 중립이다 (구버전은 1점으로 떨어졌다)
assert.equal(computeFocus([], 1_000_000, prices, sectorBySymbol), 5);
assert.equal(computeFocus([holding("Z")], 0, prices, sectorBySymbol), 5);
// 현재가가 없으면 averagePrice 로 평가한다 — 보유 200 / 현금 100 → invested 2/3
assert.equal(computeFocus([holding("A", 2)], 100, {}, sectorBySymbol), 8.3);

// ── 정확력: 체결 2거래일 뒤 종가 ────────────────────────────────────────────
const closes = (symbol: string, rows: [string, number][]): Record<string, DailyClose[]> => ({
  [symbol]: rows.map(([date, close]) => ({ date, close })),
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

// 08-03 매수 100원 → 2거래일 뒤는 08-05(102). 오르면 적중이고 채점일은 08-05 다
const early = buy({ tradedAt: "2026-08-03T02:00:00.000Z" });
const earlyGrade = gradeTrades([early], [], series);
assert.equal(earlyGrade.graded.length, 1);
assert.equal(earlyGrade.graded[0].settledOn, "2026-08-05");
assert.equal(earlyGrade.graded[0].hit, true);
// 같은 매수를 비싸게 샀으면 빗나감
assert.equal(gradeTrades([buy({ price: 200, tradedAt: "2026-08-03T02:00:00.000Z" })], [], series).graded[0].hit, false);
// 2거래일이 안 지났으면 보류 — 08-12 매수는 뒤에 봉이 없다
assert.ok(gradeTrades([buy({ id: "b9", tradedAt: "2026-08-12T02:00:00.000Z" })], [], series).pendingIds.has("b9"));
// 08-11 매수는 08-12 하나뿐이라 아직 보류다
assert.ok(gradeTrades([buy({ id: "b8", tradedAt: "2026-08-11T02:00:00.000Z" })], [], series).pendingIds.has("b8"));
// 캔들이 아예 없는 종목도 보류
assert.ok(gradeTrades([buy({ id: "b7", symbol: "999999" })], [], series).pendingIds.has("b7"));
// 매도는 내리면 적중 — 08-10 매도(종가 110 근사) → 2거래일 뒤 08-12(91)
assert.equal(gradeTrades([], [sell({ tradedAt: "2026-08-10T05:00:00.000Z" })], series).graded[0].hit, true);
// 매도 체결가가 있으면 종가 근사 대신 그 값을 쓴다 — 80원에 팔았으면 91은 상승이라 빗나감
assert.equal(
  gradeTrades([], [sell({ tradedAt: "2026-08-10T05:00:00.000Z", price: 80 })], series).graded[0].hit,
  false,
);

// 채점 0건은 중립, 표본이 쌓여야 극단으로 간다
assert.equal(scoreAccuracy([]), 5);
assert.equal(scoreAccuracy(earlyGrade.graded), 6);

// 레벨 경계 — 기존 적중 비율 1/3·2/3 을 0~10 으로 옮긴 값
assert.equal(accuracyLevelOf(10), 3);
assert.equal(accuracyLevelOf(20 / 3), 3);
assert.equal(accuracyLevelOf(6.6), 2);
assert.equal(accuracyLevelOf(5), 2);
assert.equal(accuracyLevelOf(10 / 3), 2);
assert.equal(accuracyLevelOf(3.3), 1);
assert.equal(accuracyLevelOf(0), 1);

// ── 캐릭터: 동점대는 확정하지 않는다 ────────────────────────────────────────
assert.equal(judgeCharacter({ evidence: 5, intuition: 5, focus: 5, diversification: 5 }), null);
assert.equal(judgeCharacter({ evidence: 8, intuition: 2, focus: 5.4, diversification: 4.6 }), null);
assert.equal(judgeCharacter({ evidence: 5.5, intuition: 4.5, focus: 8, diversification: 2 }), "sniper");
assert.equal(judgeCharacter({ evidence: 7, intuition: 3, focus: 4, diversification: 6 }), "strategist");
assert.equal(judgeCharacter({ evidence: 3, intuition: 7, focus: 6, diversification: 4 }), "challenger");
assert.equal(judgeCharacter({ evidence: 3, intuition: 7, focus: 4, diversification: 6 }), "explorer");

// ── 과거 시점 포트폴리오 복원 ───────────────────────────────────────────────
const emptySample = {
  sells: [],
  tabViews: [],
  graded: [],
  pending: 0,
  priceBySymbol: prices,
  sectorBySymbol,
};
// asOf 이후 매수·매도를 최신순으로 되돌린다
assert.deepEqual(
  replayPortfolio(
    { holdings: [holding("A", 2)], cash: 500 },
    [buy({ id: "x1", symbol: "A", price: 120, tradedAt: "2026-08-12T02:00:00.000Z" })],
    [sell({ id: "x2", symbol: "A", price: 130, tradedAt: "2026-08-13T02:00:00.000Z" })],
    "2026-08-10",
  ),
  { holdings: [holding("A", 2)], cash: 490 },
);
// asOf 이전 거래는 건드리지 않는다
assert.deepEqual(
  replayPortfolio(
    { holdings: [holding("A", 2)], cash: 500 },
    [buy({ id: "x3", symbol: "A", price: 120, tradedAt: "2026-08-05T02:00:00.000Z" })],
    [],
    "2026-08-10",
  ),
  { holdings: [holding("A", 2)], cash: 500 },
);
// asOf 이후 샀다가 전부 판 종목은 유령 보유로 남지 않는다
assert.deepEqual(
  replayPortfolio(
    { holdings: [], cash: 1000 },
    [buy({ id: "x4", symbol: "B", price: 100, tradedAt: "2026-08-12T02:00:00.000Z" })],
    [sell({ id: "x5", symbol: "B", price: 150, tradedAt: "2026-08-13T02:00:00.000Z" })],
    "2026-08-10",
  ),
  { holdings: [], cash: 950 },
);

// ── 카드 한 장: 표본이 모자라면 캐릭터를 주지 않는다 ────────────────────────
const lowCard = buildCard({ ...emptySample, buys: [b1], holdings: [holding("A")], cash: 0 });
assert.equal(lowCard.observation, "low");
assert.equal(lowCard.character, null);
assert.equal(lowCard.level, null);
const noneCard = buildCard({ ...emptySample, buys: [], holdings: [], cash: 1000 });
assert.equal(noneCard.observation, "none");
assert.deepEqual(noneCard.scores, {
  evidence: 5,
  intuition: 5,
  focus: 5,
  diversification: 5,
  accuracy: 5,
});

// ── 통합: 주간 결산 카드 + 누적 현재 카드 ───────────────────────────────────
const aCloses = closes("A", [
  ["2026-08-03", 100],
  ["2026-08-04", 101],
  ["2026-08-05", 102],
  ["2026-08-06", 103],
  ["2026-08-07", 104],
  ["2026-08-10", 110],
  ["2026-08-11", 90],
  ["2026-08-12", 91],
  ["2026-08-13", 95],
  ["2026-08-14", 99],
]);
const researchViews = [
  view({ symbol: "A", viewedAt: "2026-08-04T01:00:00.000Z" }),
  view({ symbol: "A", tab: "chart", viewedAt: "2026-08-04T01:10:00.000Z" }),
];
const weekly = computeBehaviorProfile({
  userId: "child_minji",
  periodEnd: "2026-08-14",
  buys: [
    buy({ id: "ba1", symbol: "A", tradedAt: "2026-08-04T02:00:00.000Z" }),
    buy({ id: "ba2", symbol: "A", tradedAt: "2026-08-05T02:00:00.000Z" }),
    buy({ id: "ba3", symbol: "A", tradedAt: "2026-08-11T02:00:00.000Z" }),
  ],
  sells: [],
  tabViews: researchViews,
  holdings: [holding("A", 3)],
  cash: 700,
  priceBySymbol: prices,
  sectorBySymbol,
  dailyClosesBySymbol: aCloses,
});

// 첫 거래(08-04)가 속한 주부터 이번 주까지
assert.equal(weekly.periodStart, "2026-08-04");
assert.equal(weekly.weeks.length, 2);
assert.deepEqual(
  weekly.weeks.map((week) => [week.label, week.status]),
  [
    ["8/3 – 8/9", "closed"],
    ["8/10 – 8/16", "current"],
  ],
);

// 누적 = 전체. 매수 3건이라 캐릭터가 나온다
assert.equal(weekly.cumulative.observation, "ready");
assert.deepEqual(weekly.cumulative.samples, { buys: 3, sells: 0, graded: 3, pending: 0, hits: 2 });
assert.deepEqual(weekly.cumulative.scores, {
  evidence: 7.1,
  intuition: 2.9,
  focus: 6.5,
  diversification: 3.5,
  accuracy: 5.7,
});
assert.equal(weekly.cumulative.character, "sniper");
assert.equal(weekly.cumulative.level, 2);

// 지난 주 카드 — 그 주 매수 2건, 그 주에 채점이 끝난 거래 2건 모두 적중
const [lastWeek, thisWeek] = weekly.weeks;
assert.deepEqual(lastWeek.samples, { buys: 2, sells: 0, graded: 2, pending: 0, hits: 2 });
assert.equal(lastWeek.scores.accuracy, 6.7);
assert.equal(lastWeek.scores.evidence, 6.7);
// 집중력은 그 주 마지막 날 보유로 낸다 — 08-11 매수를 되돌려 2주 보유·현금 800
assert.equal(lastWeek.scores.focus, 6);
// 매수 2건은 아직 표본 부족이라 캐릭터를 주지 않는다
assert.equal(lastWeek.observation, "low");
assert.equal(lastWeek.character, null);

// 이번 주 카드 — 08-11 매수는 08-13 에 채점이 끝나 이번 주에 귀속된다
assert.deepEqual(thisWeek.samples, { buys: 1, sells: 0, graded: 1, pending: 0, hits: 0 });
assert.equal(thisWeek.scores.accuracy, 4);
assert.equal(thisWeek.scores.evidence, 6);
// 이번 주 집중력은 오늘 보유 기준이라 누적과 같다
assert.equal(thisWeek.scores.focus, weekly.cumulative.scores.focus);

// 기록이 하나도 없어도 이번 주 카드 한 장은 나오고 전 축이 중립이다
const blank = computeBehaviorProfile({
  userId: "child_minji",
  periodEnd: "2026-08-14",
  buys: [],
  sells: [],
  tabViews: [],
  holdings: [],
  cash: 1_000_000,
  priceBySymbol: prices,
  sectorBySymbol,
  dailyClosesBySymbol: {},
});
assert.equal(blank.weeks.length, 1);
assert.equal(blank.weeks[0].status, "current");
assert.equal(blank.cumulative.observation, "none");
assert.deepEqual(blank.cumulative.scores, {
  evidence: 5,
  intuition: 5,
  focus: 5,
  diversification: 5,
  accuracy: 5,
});

console.log("behavior profile engine tests passed");
