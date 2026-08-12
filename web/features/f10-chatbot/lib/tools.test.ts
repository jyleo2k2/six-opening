import assert from "node:assert/strict";
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

  const profileResult = await runTool("own_behavior_profile", { screen: "archive" }, session);
  assert.equal(profileResult.response.text.includes("골고루 탐험형"), true);

  const archiveResult = await runTool("own_archive", { screen: "archive" }, session);
  assert.equal(archiveResult.response.text.includes("여름 시즌"), true);
  assert.deepEqual(requestedUserIds, ["session-child", "session-child", "session-child"]);

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
  );
  assert.equal(aviationStock.status, "ok");
  assert.equal(aviationStock.response.text.includes("16조 1,166억 원"), true);
  assert.ok(aviationStock.evidence.every((source) => source.startsWith("https://")));

  const cosmeticsStock = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:483650", stockName: "달바글로벌" },
    session,
  );
  assert.equal(cosmeticsStock.status, "ok");
  assert.equal(cosmeticsStock.response.text.includes("3,091억 원"), true);

  const reviewedStock = await runTool(
    "approved_stock_facts",
    { screen: "stock", stockId: "KRX:259960", stockName: "크래프톤" },
    session,
  );
  assert.equal(reviewedStock.status, "ok");
  assert.equal(reviewedStock.response.text.includes("2조 7,098억원"), true);
  assert.ok(reviewedStock.evidence.every((source) => source.startsWith("https://")));

  console.log("read-only chat tool tests passed");
}

void main();
