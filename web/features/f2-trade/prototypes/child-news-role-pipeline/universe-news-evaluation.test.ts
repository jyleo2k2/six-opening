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

test("최신 기사가 거부되면 과거 후보를 순서대로 평가해 첫 통과 기사에서 멈춘다", async () => {
  const input = collection();
  const target = input.candidates[0];
  const fallbackArticle = {
    articleId: "FALLBACK-000001",
    runDateKst: input.runDateKst,
    scope: "company" as const,
    title: "테스트기업1, 2분기 실적 발표",
    publisher: "테스트뉴스",
    publishedAt: "2026-08-12T00:00:00.000Z",
    sourceUrl: "https://news.example.com/fallback-000001",
    sourceUnits: [
      { id: "S1", text: "테스트기업1은 2분기 매출 100억원을 기록했다." },
      { id: "S2", text: "영업이익은 20억원이었다." },
      { id: "S3", text: "당기순이익은 15억원이었다." },
      { id: "S4", text: "해외 매출 비중은 30%였다." },
    ],
  };
  target.fallbackCandidates = [{
    selectionScore: 80,
    selectionSignals: ["이전 날짜의 직접 실적 기사"],
    article: fallbackArticle,
  }];

  const runRole: NewsRoleRunner = async (request) => {
    if (request.role === "headline_screener") {
      return request.article.articleId === fallbackArticle.articleId
        ? { articleId: fallbackArticle.articleId, decision: "pass", reasonCodes: [], reasons: ["본문 확인"] }
        : { articleId: request.article.articleId, decision: "reject", reasonCodes: ["ROUTINE_OR_PROMOTIONAL"], reasons: ["행사 기사"] };
    }
    if (request.role === "relevance_selector") {
      return {
        articleId: fallbackArticle.articleId,
        decision: "accept",
        kind: "company",
        primaryStockIds: [target.stock.stockId],
        eventType: "earnings",
        focusStatement: "테스트기업1이 2분기 실적을 발표했다.",
        anchorSourceId: "S1",
        includedSourceIds: ["S1", "S2", "S3", "S4"],
        excludedSourceIds: [],
        difficultTerms: [],
        reasonCodes: [],
        reasons: [],
      };
    }
    if (request.role === "child_news_editor") {
      return {
        articleId: fallbackArticle.articleId,
        headline: { text: "테스트기업1, 2분기 매출 100억원", sourceIds: ["S1"] },
        homeSummary: { text: "테스트기업1, 2분기 매출 100억원", sourceIds: ["S1"] },
        body: [
          { role: "key_detail", factKey: "operating_profit", text: "영업이익은 20억원이었어요.", sourceIds: ["S2"] },
          { role: "business_detail", factKey: "net_income", text: "당기순이익은 15억원이었어요.", sourceIds: ["S3"] },
          { role: "context", factKey: "overseas_sales", text: "해외 매출 비중은 30%였어요.", sourceIds: ["S4"] },
        ],
        priceConnection: {
          kind: "business_performance",
          basis: "event_education",
          text: "매출과 이익은 회사의 사업 결과를 보여줘요.",
          sourceIds: ["S1", "S2"],
        },
        termTreatments: [],
      };
    }
    return {
      articleId: fallbackArticle.articleId,
      independentKind: "company",
      primaryStockIds: [target.stock.stockId],
      eventType: "earnings",
      focusStatement: "테스트기업1이 2분기 실적을 발표했다.",
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
        sameHeadlineAcrossSurfaces: true,
        distinctSummaryFacts: true,
        priceConnectionGrounded: true,
        termExplanationCoverage: true,
        investmentSafety: true,
        noSentimentLabel: true,
      },
      issues: [],
    };
  };

  const report = await runUniverseNewsEvaluation(input, {
    runRole,
    universe: input.candidates.map((item) => ({ stockId: item.stock.stockId, name: item.stock.name })),
  });
  assert.equal(report.readyForStorageCount, 1);
  assert.equal(report.rejectedCount, 50);
  assert.equal(report.cases[0].inputArticle.articleId, fallbackArticle.articleId);
  assert.equal(report.cases[0].articleAttempts?.length, 2);
  assert.deepEqual(
    report.cases[0].articleAttempts?.map((item) => item.pipelineResult.status),
    ["rejected", "ready_for_storage"],
  );
});

test("최신 기사 역할 호출이 실패하면 오래된 기사로 숨기지 않고 재시도 대상으로 남긴다", async () => {
  const input = collection();
  const target = input.candidates[0];
  target.fallbackCandidates = [{
    selectionScore: 5,
    selectionSignals: ["과거 후보"],
    article: {
      ...target.article,
      articleId: "SHOULD-NOT-RUN",
      publishedAt: "2026-08-12T00:00:00.000Z",
    },
  }];
  const runRole: NewsRoleRunner = async (request) => {
    if (request.article.articleId === target.article.articleId) {
      throw new Error("temporary API failure");
    }
    return {
      articleId: request.article.articleId,
      decision: "reject",
      reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
      reasons: ["행사 기사"],
    };
  };

  const report = await runUniverseNewsEvaluation(input, {
    runRole,
    universe: input.candidates.map((item) => ({ stockId: item.stock.stockId, name: item.stock.name })),
  });
  assert.equal(report.cases[0].pipelineResult.status, "rejected");
  if (report.cases[0].pipelineResult.status === "rejected") {
    assert.ok(report.cases[0].pipelineResult.reasonCodes.includes("ROLE_ERROR"));
  }
  assert.equal(report.cases[0].articleAttempts?.length, 1);
  assert.equal(report.cases[0].inputArticle.articleId, target.article.articleId);
});
