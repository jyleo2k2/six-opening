import assert from "node:assert/strict";
import {
  loadPublishedNewsById,
  loadPublishedNewsForStock,
  parseNewsId,
  stockCodeFromId,
  type SelectNewsRows,
} from "./service";

const marketRow = {
  news_id: 1,
  article_id: 2,
  scope: "market",
  stock_codes: [],
  event_type: "observed_market_move",
  original_title: "코스피 마감",
  headline: "코스피가 올라 마감했어요",
  home_summary: "코스피가 전날보다 올라 마감했어요.",
  summary_lines: [
    "코스피가 전날보다 올라 마감했어요.",
    "다른 국내 주식시장 숫자도 올랐어요.",
    "코스피는 국내 주식시장 대표 숫자예요.",
  ],
  publisher: "테스트신문",
  source_published_at: "2026-08-13T01:00:00.000Z",
  source_url: "https://example.com/market",
  published_at: "2026-08-13T02:00:00.000Z",
};

const companyRow = {
  ...marketRow,
  news_id: 3,
  article_id: 4,
  scope: "company",
  stock_codes: ["015760"],
  event_type: "earnings",
  original_title: "한국전력 실적",
  headline: "한국전력의 본업에서 번 돈이 줄었어요",
};

async function main() {
  assert.equal(stockCodeFromId("KRX:015760"), "015760");
  assert.equal(stockCodeFromId("015760"), null);
  assert.equal(parseNewsId("3"), 3);
  assert.equal(parseNewsId("3x"), null);

  const companyQueries: Record<string, string>[] = [];
  const companySelect: SelectNewsRows = async (params) => {
    companyQueries.push(params);
    return [companyRow];
  };
  assert.equal((await loadPublishedNewsForStock("KRX:015760", companySelect))?.newsId, 3);
  assert.equal(companyQueries.length, 1);
  assert.equal(companyQueries[0].stock_codes, "cs.{015760}");

  let emptyCall = 0;
  const emptySelect: SelectNewsRows = async (params) => {
    emptyCall += 1;
    assert.equal(params.scope, "eq.company");
    assert.equal(params.stock_codes, "cs.{005930}");
    return [];
  };
  assert.equal(await loadPublishedNewsForStock("KRX:005930", emptySelect), null);
  assert.equal(emptyCall, 1);

  const detailSelect: SelectNewsRows = async (params) => {
    assert.equal(params.news_id, "eq.3");
    return [companyRow];
  };
  assert.equal((await loadPublishedNewsById(3, detailSelect))?.newsId, 3);

  await assert.rejects(
    () => loadPublishedNewsById(3, async () => [{ ...companyRow, summary_lines: ["두 줄", "뿐"] }]),
    /계약/u,
  );

  console.log("news service tests passed");
}

void main();
