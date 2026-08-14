import assert from "node:assert/strict";
import { STOCKS } from "../../../shared/data/stocks";
import { createReadOnlyToolRunner } from "./tools";
import type { PersonalChatDataSource } from "./tools";
import type { ChatSession } from "./session";

const requestedUserIds: string[] = [];
const dataSource: PersonalChatDataSource = {
  getTradeRecordSummary: async (userId) => {
    requestedUserIds.push(userId);
    return { recordCount: 2, latestReasonLabel: "이 회사 제품을 잘 알아" };
  },
  getBehaviorProfileSummary: async (userId) => {
    requestedUserIds.push(userId);
    return {
      observationState: "ready",
      periodLabel: "이번 주",
      typeLabel: "골고루 탐험형",
    };
  },
  getHoldingSummary: async (userId, stockId) => {
    requestedUserIds.push(userId);
    if (stockId === "KRX:000660") {
      return {
        current: { stockName: "SK하이닉스", quantity: 3, averagePrice: 178_000 },
        holdingCount: 2,
      };
    }
    return { current: null, holdingCount: 2 };
  },
  getArchiveSummary: async (userId) => {
    requestedUserIds.push(userId);
    return { seasonCount: 1, latestSeasonLabel: "여름 시즌" };
  },
};
const session: ChatSession = {
  userId: "session-child",
  familyId: "family-1",
  role: "child",
  source: "server_demo",
};
const runTool = createReadOnlyToolRunner(dataSource);

async function main() {
  const tradeResult = await runTool("own_trade_records", { screen: "archive" }, session);
  assert.equal(tradeResult.status, "ok");
  assert.equal(tradeResult.response.text.includes("2개"), true);

  // 성향은 값을 읽어 주지 않고 성향 화면으로 보낸다. 저장된 요약이 있어도 마찬가지다.
  const profileResult = await runTool("own_behavior_profile", { screen: "archive" }, session);
  assert.equal(profileResult.status, "ok");
  assert.equal(profileResult.response.text.includes("성향 화면"), true);
  assert.equal(profileResult.response.text.includes("골고루 탐험형"), false);
  assert.deepEqual(profileResult.response.uiAction, {
    type: "open_screen",
    target: "archive",
    archiveTab: "report",
    label: "성향 화면 열기",
  });
  assert.equal(profileResult.response.suggestedQuestions?.length, 2);

  const heldStock = await runTool(
    "own_holdings",
    { screen: "stock", stockId: "KRX:000660", stockName: "SK하이닉스" },
    session,
  );
  assert.equal(heldStock.status, "ok");
  assert.equal(heldStock.response.text.includes("3주"), true);
  assert.equal(heldStock.response.text.includes("178,000원"), true);
  assert.deepEqual(heldStock.response.uiAction, {
    type: "open_screen",
    target: "portfolio",
  });

  // 화면 종목을 갖고 있지 않으면 그 사실을 밝히고 보유 종목 수만 알린다.
  const notHeld = await runTool(
    "own_holdings",
    { screen: "stock", stockId: "KRX:259960", stockName: "크래프톤" },
    session,
  );
  assert.equal(notHeld.status, "ok");
  assert.equal(notHeld.response.text.includes("2곳"), true);

  const noHolding = await createReadOnlyToolRunner()(
    "own_holdings",
    { screen: "home" },
    session,
  );
  assert.equal(noHolding.status, "unavailable");
  assert.equal(noHolding.evidence.length, 0);

  const archiveResult = await runTool("own_archive", { screen: "archive" }, session);
  assert.equal(archiveResult.status, "ok");
  assert.equal(archiveResult.response.text.includes("수익률 화면"), true);
  assert.deepEqual(archiveResult.response.uiAction, {
    type: "open_screen",
    target: "archive",
    archiveTab: "return",
    label: "수익률 화면 열기",
  });

  // 성향·아카이브는 개인 데이터를 조회하지 않는다. 거래·보유만 세션 사용자를 읽는다.
  assert.deepEqual(requestedUserIds, [
    "session-child",
    "session-child",
    "session-child",
  ]);

  const draftStock = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:007070", stockName: "GS리테일" },
    session,
  );
  assert.equal(draftStock.status, "unavailable");
  assert.equal(draftStock.evidence.length, 0);

  const aviationStock = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:003490", stockName: "대한항공" },
    session,
    "financial",
  );
  assert.equal(aviationStock.status, "ok");
  assert.equal(aviationStock.response.text.includes("16조 1,166억 원"), true);
  assert.ok(aviationStock.evidence.every((source) => source.startsWith("https://")));

  const cosmeticsStock = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:483650", stockName: "달바글로벌" },
    session,
    "financial",
  );
  assert.equal(cosmeticsStock.status, "ok");
  assert.equal(cosmeticsStock.response.text.includes("3,091억 원"), true);

  const reviewedStock = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:259960", stockName: "크래프톤" },
    session,
    "financial",
  );
  assert.equal(reviewedStock.status, "ok");
  assert.equal(reviewedStock.response.text.includes("2조 7,098억원"), true);
  assert.ok(reviewedStock.evidence.every((source) => source.startsWith("https://")));

  const kiwoomBusiness = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:039490", stockName: "키움증권" },
    session,
    "business",
  );
  assert.equal(kiwoomBusiness.status, "ok");
  assert.equal(kiwoomBusiness.response.text.includes("주문을 중개"), true);

  for (const stock of STOCKS) {
    const stockResult = await runTool(
      "approved_stock_facts",
      { screen: "stock", stockId: stock.id, stockName: stock.name },
      session,
    );
    assert.equal(stockResult.status, "ok", `${stock.name} 승인 응답이 없어`);
    assert.deepEqual(
      stockResult.response.uiAction,
      { type: "open_screen", target: "stock", stockId: stock.id },
      `${stock.name} 관련 화면 ID가 달라`,
    );
  }

  console.log("read-only chat tool tests passed");
}

void main();
