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

  // 자녀 — 매수 3건이라 캐릭터가 나오고, 새 거래 위주라 정확력은 판정 중이다
  const child = await buildProfilePayload({ account: "child", state: childState, narrate: false }, deps);
  assert.equal(child.status, 200);
  if (child.status !== 200) return;
  const snapshot = child.payload.snapshot;
  assert.equal(snapshot.userId, "child_minji");
  assert.equal(snapshot.observationState, "ready");
  assert.equal(snapshot.sampleSize, 3);
  // 근거력 = 2탭 유효 열람 매수 1/3 → 3점, 보완쌍 성립
  assert.equal(snapshot.abilities.evidence, 3);
  assert.equal(snapshot.abilities.intuition, 7);
  // 1섹터(9점) − 현금비중 83% 패널티 2 = 7점
  assert.equal(snapshot.abilities.focus, 7);
  assert.equal(snapshot.character, "challenger");
  // 08-03 매수만 5거래일이 지나 채점(적중)됐고 표본 3건 미만이라 정확력은 null
  assert.equal(snapshot.gradedTradeCount, 1);
  assert.equal(snapshot.abilities.accuracy, null);
  assert.equal(snapshot.accuracyState, "pending");
  assert.equal(snapshot.starGrade, null);
  assert.equal(snapshot.confidencePattern.average, 50);
  // narrate:false 는 Luna 를 부르지 않고 고정 폴백을 쓴다
  assert.equal(child.payload.narration.source, "fallback");
  assert.equal(child.payload.narration.text.includes("채점"), true);

  // 부모 — 라이브 기록이 없어도 시드(매수 2건)가 합산되고, 3건 미만이라 관찰 초기다
  const parent = await buildProfilePayload({ account: "parent", state: {}, narrate: false }, deps);
  assert.equal(parent.status, 200);
  if (parent.status !== 200) return;
  assert.equal(parent.payload.snapshot.userId, "parent_mom");
  assert.equal(parent.payload.snapshot.sampleSize, 2);
  assert.equal(parent.payload.snapshot.observationState, "initial");
  assert.equal(parent.payload.snapshot.character, null);
  assert.equal(parent.payload.narration.text.includes("관찰 초기"), true);

  // 고정 폴백 문구도 공통 출력 게이트를 통과해야 한다 (SPEC §7)
  assert.equal(gateChatOutput({ text: fallbackNarration(snapshot), source: "fixed" }).ok, true);
  assert.equal(
    gateChatOutput({ text: fallbackNarration(parent.payload.snapshot), source: "fixed" }).ok,
    true,
  );

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
