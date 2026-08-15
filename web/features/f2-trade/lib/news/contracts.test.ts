import assert from "node:assert/strict";
import { parsePublishedNewsRow, visibleTermTreatments } from "./contracts";

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

// 용어 풀이가 없던 시절의 행도 그대로 통과한다.
assert.deepEqual(parsePublishedNewsRow(row)?.termTreatments, []);
assert.deepEqual(
  parsePublishedNewsRow({ ...row, term_treatments: "배열이 아니다" })?.termTreatments,
  [],
);

// 깨진 항목은 버리되 뉴스 자체는 살린다.
const withTerms = {
  ...row,
  term_treatments: [
    { term: "판매량", easyText: "판 물건의 개수", treatment: "explained", sourceIds: ["S1"] },
    { term: "연료비", easyText: "발전에 쓰는 연료 값", treatment: "explained", sourceIds: ["S2"] },
    { term: "판매량", easyText: "중복이라 버린다", treatment: "explained", sourceIds: ["S3"] },
    { term: "", easyText: "빈 낱말이라 버린다", treatment: "explained", sourceIds: ["S4"] },
    { term: "빈 풀이", easyText: "   ", treatment: "explained", sourceIds: ["S5"] },
    "문자열은 항목이 아니다",
  ],
};
assert.deepEqual(parsePublishedNewsRow(withTerms)?.termTreatments, [
  { term: "판매량", easyText: "판 물건의 개수" },
  { term: "연료비", easyText: "발전에 쓰는 연료 값" },
]);

// 화면(제목·3줄)에 나온 낱말만, 나온 순서대로, 최대 3개.
const shown = {
  headline: "넷째가 제목에 있어요",
  summaryLines: ["첫째와 둘째가 나와요.", "셋째도 나와요.", "마지막 줄이에요."],
  termTreatments: [
    { term: "셋째", easyText: "3" },
    { term: "다섯째", easyText: "화면에 없는 낱말" },
    { term: "둘째", easyText: "2" },
    { term: "넷째", easyText: "4" },
    { term: "첫째", easyText: "1" },
  ],
};
assert.deepEqual(
  visibleTermTreatments(shown).map((treatment) => treatment.term),
  ["넷째", "첫째", "둘째"],
);
assert.deepEqual(visibleTermTreatments({ ...shown, termTreatments: [] }), []);
assert.deepEqual(visibleTermTreatments({ headline: "제목", summaryLines: ["가", "나", "다"] }), []);

// 한쪽이 다른 쪽에 통째로 들어 있으면 먼저 나온 것만 남기고 자리를 다른 낱말에 준다.
assert.deepEqual(
  visibleTermTreatments({
    headline: "연결 매출액이 늘었어요",
    summaryLines: ["영업이익도 늘었어요.", "직원 수는 그대로예요.", "내년에도 볼 일이에요."],
    termTreatments: [
      { term: "매출", easyText: "판 돈" },
      { term: "연결 매출액", easyText: "본사와 자회사를 합친 판 돈" },
      { term: "영업이익", easyText: "남은 돈" },
      { term: "직원 수", easyText: "일하는 사람 수" },
    ],
  }).map((treatment) => treatment.term),
  ["연결 매출액", "영업이익", "직원 수"],
);

console.log("news contract tests passed");
