import assert from "node:assert/strict";
import test from "node:test";
import { MAX_TRANSACTION_ROWS, summarizeTradeRecords, type TransactionRow } from "./personal-data";

const row = (tradeReason: string | null): TransactionRow => ({
  trade_reason: tradeReason,
  created_at: "2026-08-17T00:00:00.000Z",
});

test("200건 이하는 정확한 전체 개수로 표시한다", () => {
  assert.deepEqual(summarizeTradeRecords([row("buy_news"), row(null)]), {
    recordCount: 2,
    recordCountIsExact: true,
    latestReasonLabel: "뉴스에서 봐서",
  });
});

test("201번째 행이 있으면 200을 전체 개수라고 단정하지 않는다", () => {
  const summary = summarizeTradeRecords(
    Array.from({ length: MAX_TRANSACTION_ROWS + 1 }, () => row(null)),
  );
  assert.equal(summary?.recordCount, 200);
  assert.equal(summary?.recordCountIsExact, false);
});
