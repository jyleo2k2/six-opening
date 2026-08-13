import assert from "node:assert/strict";
import test from "node:test";
import type { NewsRoleRunner } from "./contracts";
import type { UniverseNewsCollection } from "./naver-news-collector";
import {
  renderUniverseComparisonHtml,
  runUniverseNewsEvaluation,
} from "./universe-news-evaluation";

function collection(): UniverseNewsCollection {
  return {
    schemaVersion: 1,
    runId: "universe-test",
    runDateKst: "2026-08-13",
    retrievedAt: "2026-08-13T00:00:00.000Z",
    sourceBasis: "테스트 원문",
    candidates: Array.from({ length: 51 }, (_, index) => {
      const ordinal = String(index + 1).padStart(6, "0");
      return {
        stock: {
          stockId: `KRX:${ordinal}`,
          symbol: ordinal,
          name: `테스트기업${index + 1}`,
          aliases: [],
          sector: "game" as const,
          market: "KOSPI" as const,
        },
        searchUrl: `https://search.example.com/${ordinal}`,
        inspectedArticleUrls: [`https://n.news.naver.com/mnews/article/001/${ordinal.padStart(10, "0")}`],
        candidateCount: 1,
        selectionScore: 10,
        selectionSignals: ["홍보·일상 감점: 행사"],
        article: {
          articleId: `TEST-${ordinal}`,
          runDateKst: "2026-08-13",
          scope: "company" as const,
          title: `테스트기업${index + 1}, 체험 행사 개최`,
          publisher: "테스트뉴스",
          publishedAt: "2026-08-13T00:00:00.000Z",
          sourceUrl: `https://news.example.com/${ordinal}`,
          sourceUnits: [{ id: "S1", text: `테스트기업${index + 1}은 체험 행사를 열었다.` }],
        },
      };
    }),
  };
}

test("51종목을 모두 판정하고 종목마다 체크포인트를 만든다", async () => {
  const input = collection();
  const calls: string[] = [];
  const runRole: NewsRoleRunner = async (request) => {
    calls.push(`${request.role}:${request.reasoningEffort}`);
    assert.equal(request.role, "headline_screener");
    return {
      articleId: request.article.articleId,
      decision: "reject",
      reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
      reasons: ["행사 안내가 중심이라 회사의 직접적인 중요 사건이 아닙니다."],
    };
  };
  let checkpoints = 0;
  const report = await runUniverseNewsEvaluation(
    input,
    {
      runRole,
      universe: input.candidates.map((item) => ({
        stockId: item.stock.stockId,
        name: item.stock.name,
      })),
    },
    {
      onCaseCompleted(partial) {
        checkpoints += 1;
        assert.equal(partial.completedCount, checkpoints);
      },
    },
  );
  assert.equal(checkpoints, 51);
  assert.equal(report.completedCount, 51);
  assert.equal(report.readyForStorageCount, 0);
  assert.equal(report.rejectedCount, 51);
  assert.equal(report.decisionComplete, true);
  assert.deepEqual(new Set(calls), new Set(["headline_screener:max"]));
});

test("비교 HTML은 거부 기사에 서비스 카드 없음과 원문 링크를 표시한다", () => {
  const input = collection();
  const report = {
    schemaVersion: 1 as const,
    runId: input.runId,
    runDateKst: input.runDateKst,
    sourceRetrievedAt: input.retrievedAt,
    sourceBasis: input.sourceBasis,
    generatedAt: "2026-08-13T01:00:00.000Z",
    model: "gpt-5.6-luna" as const,
    stockCount: 51 as const,
    completedCount: 1,
    readyForStorageCount: 0,
    rejectedCount: 1,
    decisionComplete: false,
    cases: [{
      ...input.candidates[0],
      inputArticle: input.candidates[0].article,
      pipelineResult: {
        status: "rejected" as const,
        articleId: input.candidates[0].article.articleId,
        stage: "prefilter" as const,
        reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
        reasons: ["행사 안내 기사입니다."],
        editorAttempts: 0,
      },
      roleAttempts: [],
    }],
  };
  const html = renderUniverseComparisonHtml(report, new Map());
  assert.match(html, /서비스 카드 없음/u);
  assert.match(html, /ROUTINE_OR_PROMOTIONAL/u);
  assert.match(html, /href="https:\/\/news\.example\.com\/000001"/u);
  assert.match(html, /data-filter="ready"/u);
});
