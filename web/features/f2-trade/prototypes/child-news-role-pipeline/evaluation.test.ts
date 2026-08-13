import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  NewsEvaluationCase,
  NewsEvaluationInput,
  NewsRoleRequest,
  NewsUniverseCompany,
  ReadyNews,
  RejectedNews,
} from "./contracts";
import {
  evaluateNewsResult,
  renderNewsEvaluationHtml,
  runNewsEvaluation,
} from "./evaluation";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(
    resolve(
      here,
      "evaluation-fixtures/latest-economic-news-2026-08-12.json",
    ),
    "utf8",
  ),
) as NewsEvaluationInput;

async function main() {

assert.equal(fixture.schemaVersion, 1);
assert.equal(fixture.cases.length, 10);
assert.equal(new Set(fixture.cases.map((item) => item.caseId)).size, 10);
assert.equal(new Set(fixture.cases.map((item) => item.article.articleId)).size, 10);
assert.equal(
  fixture.cases.every(
    (item) =>
      item.article.runDateKst === fixture.runDateKst &&
      item.article.sourceUrl.startsWith("http") &&
      item.expectation.rationale.length > 0,
  ),
  true,
);

const routineCase = fixture.cases[2];
const routineReject: RejectedNews = {
  status: "rejected",
  articleId: routineCase.article.articleId,
  stage: "prefilter",
  reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
  reasons: ["채용 행사는 게시하지 않습니다."],
  editorAttempts: 0,
};
const evaluated = evaluateNewsResult(routineCase, routineReject);
assert.equal(evaluated.expectationMatched, true);
assert.equal(evaluated.criteria.notRoutineOrPromotional.outcome, "pass");
assert.equal(evaluated.criteria.conciseThreeLineSummary.outcome, "not_applicable");
assert.equal(evaluated.criteria.allTermsEasy.outcome, "not_applicable");
assert.equal(evaluated.criteria.storageDecisionExplained.outcome, "pass");

const universe: NewsUniverseCompany[] = Array.from(
  { length: 51 },
  (_, index) => ({
    stockId: `KRX:TEST${String(index + 1).padStart(3, "0")}`,
    name: `테스트기업${index + 1}`,
  }),
);
const routineCases: NewsEvaluationCase[] = Array.from(
  { length: 10 },
  (_, index) => ({
    ...routineCase,
    caseId: `routine-${index + 1}`,
    article: {
      ...routineCase.article,
      articleId: `routine-${index + 1}`,
      title:
        index === 0
          ? "<검증> CJ대한통운 채용설명회"
          : `CJ대한통운 채용설명회 ${index + 1}`,
    },
  }),
);
const report = await runNewsEvaluation(
  routineCases,
  {
    universe,
    runRole: async (request: NewsRoleRequest) => {
      assert.equal(request.role, "headline_screener");
      return {
        articleId: request.article.articleId,
        decision: "reject",
        reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
        reasons: ["채용 행사는 게시하지 않습니다."],
      };
    },
  },
  {
    runId: "deterministic-evaluation-test",
    runDateKst: "2026-08-12",
    sourceRetrievedAt: "2026-08-12T01:33:39.485Z",
    sourceBasis: "테스트 사실 단위",
    generatedAt: "2026-08-12T02:00:00.000Z",
  },
);
assert.equal(report.expectationMatchedCount, 10);
assert.equal(report.rejectedCount, 10);
assert.equal(report.criteriaPassed, true);
assert.equal(JSON.parse(JSON.stringify(report)).cases.length, 10);

const html = renderNewsEvaluationHtml(report);
assert.match(html, /<!doctype html>/u);
assert.match(html, /서비스에 보이는 어린이 뉴스/u);
assert.match(html, /현재 서비스에 노출할 통과 기사가 없습니다/u);
assert.match(html, /검수 상세 보기/u);
assert.match(html, /기대 일치 10건/u);
assert.equal(html.includes("<검증>"), false);
assert.equal(html.includes("&lt;검증&gt;"), true);

const readyCase = fixture.cases[0];
const readyResult: ReadyNews = {
  status: "ready_for_storage",
  article: readyCase.article,
  selection: {
    articleId: readyCase.article.articleId,
    decision: "accept",
    kind: "market",
    primaryStockIds: [],
    eventType: "observed_market_move",
    focusStatement: "오늘 국내 시장의 움직임",
    anchorSourceId: "S1",
    includedSourceIds: ["S1"],
    excludedSourceIds: readyCase.article.sourceUnits.slice(1).map((unit) => unit.id),
    difficultTerms: [],
    reasonCodes: [],
    reasons: [],
  },
  draft: {
    articleId: readyCase.article.articleId,
    headline: { text: "<아이>가 읽는 오늘의 시장 뉴스", sourceIds: ["S1"] },
    homeSummary: { text: "홈에서 먼저 읽는 한 줄 요약입니다.", sourceIds: ["S1"] },
    body: [
      { role: "core_event", text: "서비스 뉴스 상세에 보이는 본문입니다.", sourceIds: ["S1"] },
      { role: "business_connection", text: "두 번째 핵심 사실을 짧게 보여줍니다.", sourceIds: ["S1"] },
      { role: "context", text: "어려운 말은 마지막 줄에서 설명합니다.", sourceIds: ["S1"] },
    ],
    termTreatments: [],
  },
  review: {
    articleId: readyCase.article.articleId,
    independentKind: "market",
    primaryStockIds: [],
    eventType: "observed_market_move",
    focusStatement: "오늘 국내 시장의 움직임",
    anchorSourceIds: ["S1"],
    checks: {
      allowedScope: true,
      primarySubject: true,
      directMateriality: true,
      sourceFidelity: true,
      focusAlignment: true,
      conciseThreeLineSummary: true,
      noIrrelevantDetail: true,
      attributionAndTiming: true,
      allTermsEasy: true,
      investmentSafety: true,
      noSentimentLabel: true,
    },
    issues: [],
  },
  editorAttempts: 1,
};
const readyHtml = renderNewsEvaluationHtml({
  ...report,
  readyForStorageCount: 1,
  rejectedCount: 9,
  cases: [
    evaluateNewsResult(readyCase, readyResult),
    ...report.cases.slice(1),
  ],
});
const auditStart = readyHtml.indexOf('<section class="audit">');
assert.ok(auditStart > readyHtml.indexOf('<section class="service-output"'));
assert.match(readyHtml, /3줄 요약/u);
assert.match(readyHtml, /서비스 뉴스 상세에 보이는 본문입니다/u);
assert.match(readyHtml, /두 번째 핵심 사실을 짧게 보여줍니다/u);
assert.match(readyHtml, /어려운 말은 마지막 줄에서 설명합니다/u);
assert.equal(readyHtml.includes("<아이>"), false);
assert.equal(readyHtml.includes("&lt;아이&gt;가 읽는 오늘의 시장 뉴스"), true);
assert.equal(readyHtml.slice(0, auditStart).includes("채용설명회"), false);
assert.equal(readyHtml.slice(0, auditStart).includes("홈에서 먼저 읽는 한 줄 요약입니다"), false);
assert.equal(
  (readyHtml.slice(0, auditStart).match(/<li>/gu) ?? []).length,
  3,
);

await assert.rejects(
  () =>
    runNewsEvaluation(routineCases.slice(0, 9), { universe, runRole: async () => ({}) }, {
      runId: "invalid-count",
      runDateKst: "2026-08-12",
      sourceRetrievedAt: "2026-08-12T01:33:39.485Z",
      sourceBasis: "테스트 사실 단위",
    }),
  /정확히 10건/u,
);

console.log("news evaluation harness tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
