import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { buildProfilePayload, POST, type ProfileRouteDeps } from "./route";
import { fallbackNarration } from "../../../features/f9-archive/lib/narration";
import { gateChatOutput } from "../../../shared/llm/filter";
import type { DailyClose } from "../../../shared/types/behavior-profile";

const CLOSES_005930: DailyClose[] = [
  { date: "2026-08-03", close: 100_000 },
  { date: "2026-08-04", close: 101_000 },
  { date: "2026-08-05", close: 102_000 },
  { date: "2026-08-06", close: 103_000 },
  { date: "2026-08-07", close: 104_000 },
  { date: "2026-08-10", close: 110_000 },
  { date: "2026-08-11", close: 111_000 },
];

const deps: ProfileRouteDeps = {
  // 주간 카드가 오늘에 매달리므로 시각을 고정한다. 2026-08-14 는 금요일이다.
  now: () => new Date("2026-08-14T09:00:00.000Z"),
  async loadPrices() {
    return { "259960": 100_000 };
  },
  async loadDailyCloses(symbol) {
    if (symbol === "005930") return CLOSES_005930;
    // 나머지 종목은 조회 실패 → 라우트가 빈 종가로 흡수하고 엔진이 판정 보류한다
    throw new Error(`no candles: ${symbol}`);
  },
  async narrate() {
    throw new Error("narrate must not be called when narrate:false");
  },
};

const childState = {
  acc: {
    child: { name: "민지", cash: 500_000, holdings: [{ code: "259960", qty: 1, avg: 100_000 }] },
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
      reason_code: "buy_news",
      ts: "2026-08-03T02:00:00.000Z",
    },
    {
      order_id: "ord_0002",
      user_id: "child_minji",
      symbol: "035420",
      amount_krw: 90_000,
      qty: 1,
      order_status: "filled",
      reason_code: "buy_intuition",
      ts: "2026-08-12T02:00:00.000Z",
    },
    {
      order_id: "ord_0003",
      user_id: "child_minji",
      symbol: "000660",
      amount_krw: 190_000,
      qty: 1,
      order_status: "filled",
      reason_code: "buy_familiar",
      ts: "2026-08-12T03:00:00.000Z",
    },
  ],
  sellRecords: [],
  events: [
    { event: "news_detail_opened", symbol: "005930", user_id: "child_minji", ts: "2026-08-03T01:00:00.000Z", dwell_ms: 12_000 },
    { event: "chart_detail_opened", symbol: "005930", user_id: "child_minji", ts: "2026-08-03T01:30:00.000Z", dwell_ms: 15_000 },
  ],
};

async function main() {
  // 잘못된 요청 — account 없음·이상값은 400
  assert.equal((await buildProfilePayload({}, deps)).status, 400);
  assert.equal((await buildProfilePayload({ account: "hacker" }, deps)).status, 400);

  // 자녀 — 시드 매수 4건·매도 1건에 라이브 매수 3건이 합산된다
  const child = await buildProfilePayload({ account: "child", state: childState, narrate: false }, deps);
  assert.equal(child.status, 200);
  if (child.status !== 200) return;
  const snapshot = child.payload.snapshot;
  assert.equal(snapshot.userId, "child_minji");
  // 기간은 첫 거래일(시드 08-03)부터 고정한 오늘까지다
  assert.equal(snapshot.periodStart, "2026-08-03");
  assert.equal(snapshot.periodEnd, "2026-08-14");

  const cumulative = snapshot.cumulative;
  assert.equal(cumulative.observation, "ready");
  assert.deepEqual(cumulative.samples, { buys: 7, sells: 1, graded: 3, pending: 5, hits: 2 });
  // 매수 7건 중 5건이 두 탭 이상 보고 산 것 → shrink(5,7)
  assert.equal(cumulative.scores.evidence, 6.4);
  assert.equal(cumulative.scores.intuition, 3.6);
  // 크래프톤 1종목(유효 섹터수 1 → 10점)이지만 현금이 6분의 5라 중립 쪽으로 당겨진다
  assert.equal(cumulative.scores.focus, 5.8);
  assert.equal(cumulative.character, "sniper");
  // 스텁 종가는 005930뿐이라 3건만 채점(2적중) → shrink(2,3), 레벨 2
  assert.equal(cumulative.scores.accuracy, 5.7);
  assert.equal(cumulative.level, 2);
  // 시드 병합 증거 — 시드 매수 이유가 분포에 들어온다
  assert.equal(snapshot.reasonDistribution["내가 아는 회사라서"], 1);

  // 주간 결산 카드 — 첫 거래 주부터 이번 주까지, 마지막 한 장만 current 다
  assert.deepEqual(
    snapshot.weeks.map((week) => [week.label, week.status]),
    [
      ["8/3 – 8/9", "closed"],
      ["8/10 – 8/16", "current"],
    ],
  );
  const [lastWeek, thisWeek] = snapshot.weeks;
  // 지난 주 = 그 주 매수 5건, 그 주에 채점이 끝난 2건(1적중)
  assert.deepEqual(lastWeek.samples, { buys: 5, sells: 1, graded: 2, pending: 3, hits: 1 });
  assert.equal(lastWeek.scores.evidence, 7.8);
  assert.equal(lastWeek.scores.accuracy, 5);
  // 집중력은 그 주 마지막 날 보유 기준 — 08-12 매수 두 건을 되돌린 값이라 누적과 다르다
  assert.equal(lastWeek.scores.focus, 5.6);
  assert.notEqual(lastWeek.scores.focus, cumulative.scores.focus);
  // 이번 주 = 08-12 매수 2건뿐이라 표본 부족, 08-06 매도가 08-10 에 채점돼 이번 주로 귀속된다
  assert.deepEqual(thisWeek.samples, { buys: 2, sells: 0, graded: 1, pending: 2, hits: 1 });
  assert.equal(thisWeek.observation, "low");
  assert.equal(thisWeek.character, null);
  assert.equal(thisWeek.scores.evidence, 3.3);
  assert.equal(thisWeek.scores.accuracy, 6);
  // 이번 주 집중력은 오늘 보유 기준이라 누적과 같다
  assert.equal(thisWeek.scores.focus, cumulative.scores.focus);

  // narrate:false 는 Luna 를 부르지 않고 고정 폴백을 쓴다
  assert.equal(child.payload.narration.source, "fallback");
  assert.equal(child.payload.narration.text.includes("채점"), true);

  // 부모 — 라이브 기록이 없어도 시드 매수 3건으로 표본은 찬다
  const parent = await buildProfilePayload({ account: "parent", state: {}, narrate: false }, deps);
  assert.equal(parent.status, 200);
  if (parent.status !== 200) return;
  const parentCard = parent.payload.snapshot.cumulative;
  assert.equal(parent.payload.snapshot.userId, "parent_mom");
  assert.equal(parentCard.observation, "ready");
  assert.deepEqual(parentCard.samples, { buys: 3, sells: 1, graded: 2, pending: 2, hits: 1 });
  // 시드 열람만으로 매수 3건 전부 근거형(같은 종목의 이전 열람이 이어진다) → shrink(3,3)
  assert.equal(parentCard.scores.evidence, 7.1);
  // 라이브 보유·현금이 없으면 판정할 포트폴리오가 없다 → 집중·분산이 중립 동점이라 캐릭터를 주지 않는다
  assert.equal(parentCard.scores.focus, 5);
  assert.equal(parentCard.scores.diversification, 5);
  assert.equal(parentCard.character, null);
  // 채점 2건 중 1적중 → shrink(1,2) = 중립, 레벨 2
  assert.equal(parentCard.scores.accuracy, 5);
  assert.equal(parentCard.level, 2);
  assert.equal(parent.payload.narration.source, "fallback");

  // 고정 폴백 문구는 공통 출력 게이트를 통과해야 한다 (SPEC §7)
  assert.equal(gateChatOutput({ text: fallbackNarration(snapshot), source: "fixed" }).ok, true);
  assert.equal(
    gateChatOutput({ text: fallbackNarration(parent.payload.snapshot), source: "fixed" }).ok,
    true,
  );
  // 동점대·표본 부족·기록 없음 각각의 문구가 준비돼 있다
  assert.equal(fallbackNarration(parent.payload.snapshot).includes("비슷하게"), true);
  const lowText = fallbackNarration({
    ...snapshot,
    cumulative: { ...cumulative, observation: "low" },
  });
  assert.equal(lowText.includes("관찰 초기"), true);
  assert.equal(gateChatOutput({ text: lowText, source: "fixed" }).ok, true);
  const noneText = fallbackNarration({
    ...snapshot,
    cumulative: { ...cumulative, observation: "none" },
  });
  assert.equal(noneText.includes("아직 산 기록이 없어요"), true);
  assert.equal(gateChatOutput({ text: noneText, source: "fixed" }).ok, true);

  // POST — 깨진 JSON 은 400
  const badJson = await POST(
    new NextRequest("http://localhost/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{{{",
    }),
  );
  assert.equal(badJson.status, 400);

  console.log("profile route tests passed");
}

void main();
