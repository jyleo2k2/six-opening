import assert from "node:assert/strict";
import { parsePublishedNewsRow } from "./contracts";

const row = {
  news_id: 7,
  article_id: 11,
  scope: "company",
  stock_codes: ["015760"],
  event_type: "earnings",
  original_title: "한국전력 2분기 실적",
  headline: "한국전력의 본업에서 번 돈이 줄었어요",
  home_summary: "한국전력의 2분기 본업에서 번 돈이 지난해보다 줄었어요.",
  summary_lines: [
    "한국전력의 본업에서 번 돈이 줄었어요.",
    "판매액과 최종적으로 남은 돈도 줄었어요.",
    "회사는 판매량과 연료비를 원인으로 들었어요.",
  ],
  publisher: "테스트신문",
  source_published_at: "2026-08-13T01:00:00.000Z",
  source_url: "https://example.com/news/11",
  published_at: "2026-08-13T02:00:00.000Z",
};

assert.deepEqual(parsePublishedNewsRow(row)?.summaryLines, row.summary_lines);
assert.equal(parsePublishedNewsRow({ ...row, summary_lines: row.summary_lines.slice(0, 2) }), null);
assert.equal(parsePublishedNewsRow({ ...row, source_url: "javascript:alert(1)" }), null);
assert.equal(parsePublishedNewsRow({ ...row, stock_codes: [] }), null);
assert.equal(
  parsePublishedNewsRow({ ...row, scope: "market", stock_codes: [] })?.scope,
  "market",
);

console.log("news contract tests passed");
