import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  NewsEvaluationCase,
  NewsEvaluationInput,
  NewsUniverseCompany,
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
    runRole: async () => {
      throw new Error("prefilter 이후 역할을 호출하면 안 됩니다.");
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
assert.match(html, /기대 일치 10건/u);
assert.equal(html.includes("<검증>"), false);
assert.equal(html.includes("&lt;검증&gt;"), true);

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
