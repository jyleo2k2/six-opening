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
      confidence_raw: 25,
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
      confidence_raw: 50,
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
      confidence_raw: 75,
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
  assert.equal(snapshot.observationState, "ready");
  assert.equal(snapshot.sampleSize, 7);
  // 시드 열람(크래프톤×2·하이브) + 라이브 열람(005930)으로 매수 7건 중 5건이 근거형 매수 → 7점
  assert.equal(snapshot.abilities.evidence, 7);
  assert.equal(snapshot.abilities.intuition, 3);
  // 라이브 보유 1섹터(9점) − 현금비중 83% 패널티 2 = 7점
  assert.equal(snapshot.abilities.focus, 7);
  assert.equal(snapshot.character, "sniper");
  // 스텁 종가는 005930뿐이라 라이브 08-03 매수 1건만 채점(적중)되고 나머지는 보류
  assert.equal(snapshot.gradedTradeCount, 1);
  assert.equal(snapshot.abilities.accuracy, null);
  assert.equal(snapshot.accuracyState, "pending");
  assert.equal(snapshot.starGrade, null);
  assert.equal(snapshot.confidencePattern.average, 54);
  // 시드 병합 증거 — 시드 매수 이유가 분포에 들어온다
  assert.equal(snapshot.reasonDistribution["내가 아는 회사라서"], 1);
  // narrate:false 는 Luna 를 부르지 않고 고정 폴백을 쓴다
  assert.equal(child.payload.narration.source, "fallback");
  assert.equal(child.payload.narration.text.includes("채점"), true);

  // 부모 — 라이브 기록이 없어도 시드 매수 3건으로 캐릭터가 나온다
  const parent = await buildProfilePayload({ account: "parent", state: {}, narrate: false }, deps);
  assert.equal(parent.status, 200);
  if (parent.status !== 200) return;
  const parentSnapshot = parent.payload.snapshot;
  assert.equal(parentSnapshot.userId, "parent_mom");
  assert.equal(parentSnapshot.sampleSize, 3);
  assert.equal(parentSnapshot.observationState, "ready");
  // 시드 열람만으로 매수 3건 전부 근거형(같은 종목의 이전 열람이 이어진다) → 10점
  assert.equal(parentSnapshot.abilities.evidence, 10);
  // 라이브 보유·현금이 없으면 전량 현금 취급 → 분산 우세 → 전략가
  assert.equal(parentSnapshot.character, "strategist");
  assert.equal(parentSnapshot.gradedTradeCount, 1);
  assert.equal(parentSnapshot.abilities.accuracy, null);
  assert.equal(parent.payload.narration.source, "fallback");

  // 고정 폴백 문구는 공통 출력 게이트를 통과해야 하고, 관찰 초기 문구도 준비돼 있다 (SPEC §7)
  assert.equal(gateChatOutput({ text: fallbackNarration(snapshot), source: "fixed" }).ok, true);
  assert.equal(gateChatOutput({ text: fallbackNarration(parentSnapshot), source: "fixed" }).ok, true);
  const initialText = fallbackNarration({ ...snapshot, observationState: "initial" });
  assert.equal(initialText.includes("관찰 초기"), true);
  assert.equal(gateChatOutput({ text: initialText, source: "fixed" }).ok, true);

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
