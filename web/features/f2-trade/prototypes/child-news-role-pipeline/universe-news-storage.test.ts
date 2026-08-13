import assert from "node:assert/strict";
import test from "node:test";
import type { ReviewCheckName } from "./contracts";
import { REVIEW_CHECK_NAMES } from "./contracts";
import type {
  UniverseNewsCaseResult,
  UniverseNewsReport,
} from "./universe-news-evaluation";
import { renderUniverseNewsStorageSql } from "./universe-news-storage";

const allChecks = Object.fromEntries(
  REVIEW_CHECK_NAMES.map((name) => [name, true]),
) as Record<ReviewCheckName, boolean>;

function baseCase(index: number): Omit<UniverseNewsCaseResult, "pipelineResult"> {
  const symbol = String(index).padStart(6, "0");
  return {
    stock: {
      stockId: `KRX:${symbol}`,
      symbol,
      name: `테스트기업${index}`,
      aliases: [],
      sector: "game",
      market: "KOSPI",
    },
    searchUrl: `https://search.example.com/${symbol}`,
    inspectedArticleUrls: [],
    candidateCount: 1,
    selectionScore: 100,
    selectionSignals: [],
    inputArticle: {
      articleId: `A${index}`,
      runDateKst: "2026-08-13",
      scope: "company",
      title: `테스트기업${index} 기사`,
      publisher: "테스트뉴스",
      publishedAt: "2026-08-13T00:00:00.000Z",
      sourceUrl: `https://news.example.com/${symbol}`,
      sourceUnits: [{ id: "S1", text: `테스트기업${index}의 매출은 100억원이다.` }],
    },
    roleAttempts: [],
  };
}

function reportWithOneReady(): UniverseNewsReport {
  const first = baseCase(1);
  const sourceId = "S1.1";
  first.inputArticle.sourceUnits[0].id = sourceId;
  const readyCase: UniverseNewsCaseResult = {
    ...first,
    pipelineResult: {
      status: "ready_for_storage",
      article: first.inputArticle,
      selection: {
        articleId: "A1",
        decision: "accept",
        kind: "company",
        primaryStockIds: ["KRX:000001"],
        eventType: "earnings",
        focusStatement: "테스트기업1의 매출이 100억원이다.",
        anchorSourceId: sourceId,
        includedSourceIds: [sourceId],
        excludedSourceIds: [],
        difficultTerms: [{ term: "매출", sourceIds: [sourceId] }],
        reasonCodes: [],
        reasons: [],
      },
      draft: {
        articleId: "A1",
        headline: { text: "테스트기업1이 100억원을 팔았어", sourceIds: [sourceId] },
        homeSummary: { text: "테스트기업1이 물건을 팔아 100억원을 받았어.", sourceIds: [sourceId] },
        body: [
          { role: "core_event", text: "테스트기업1이 100억원을 팔았어.", sourceIds: [sourceId] },
          { role: "business_connection", text: "매출은 물건을 팔아 받은 돈이야.", sourceIds: [sourceId] },
          { role: "context", text: "기사에 나온 확정 숫자만 전했어.", sourceIds: [sourceId] },
        ],
        termTreatments: [{ term: "매출", treatment: "replaced", easyText: "물건을 팔아 받은 돈" }],
      },
      review: {
        articleId: "A1",
        independentKind: "company",
        primaryStockIds: ["KRX:000001"],
        eventType: "earnings",
        focusStatement: "테스트기업1의 매출이 100억원이다.",
        anchorSourceIds: [sourceId],
        checks: allChecks,
        issues: [],
      },
      editorAttempts: 1,
    },
  };
  const rejected = Array.from({ length: 50 }, (_, offset): UniverseNewsCaseResult => {
    const item = baseCase(offset + 2);
    return {
      ...item,
      pipelineResult: {
        status: "rejected",
        articleId: item.inputArticle.articleId,
        stage: "prefilter",
        reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
        reasons: ["일상 행사 기사입니다."],
        editorAttempts: 0,
      },
    };
  });
  return {
    schemaVersion: 1,
    runId: "storage-test",
    runDateKst: "2026-08-13",
    sourceRetrievedAt: "2026-08-13T00:00:00.000Z",
    sourceBasis: "테스트",
    generatedAt: "2026-08-13T01:00:00.000Z",
    model: "gpt-5.6-luna",
    stockCount: 51,
    completedCount: 51,
    readyForStorageCount: 1,
    rejectedCount: 50,
    decisionComplete: true,
    cases: [readyCase, ...rejected],
  };
}

test("통과 기사만 같은 article_id의 원문·요약·인용으로 적재 SQL을 만든다", () => {
  const sql = renderUniverseNewsStorageSql(reportWithOneReady());
  assert.match(sql, /insert into public\.news_pipeline_runs/u);
  assert.match(sql, /51, 1, 50, true/u);
  assert.match(sql, /insert into public\.news_articles/u);
  assert.match(sql, /insert into public\.news_source_units/u);
  assert.match(sql, /insert into public\.news_publications/u);
  assert.match(sql, /insert into public\.news_citations/u);
  assert.match(sql, /'S1_1'/u);
  assert.doesNotMatch(sql, /'S1\.1'/u);
  assert.match(sql, /join public\.news_articles as article on article\.id = publication\.article_id/u);
  assert.match(sql, /where status = 'ready_for_storage'/u);
  assert.doesNotMatch(sql, /테스트기업2 기사/u);
});

test("51종목이 끝나지 않았거나 실행 오류가 있으면 SQL 생성을 막는다", () => {
  const incomplete = reportWithOneReady();
  incomplete.completedCount = 50;
  incomplete.decisionComplete = false;
  assert.throws(
    () => renderUniverseNewsStorageSql(incomplete),
    /51종목 판정이 모두 끝난/u,
  );

  const technicalFailure = reportWithOneReady();
  technicalFailure.cases[1].pipelineResult = {
    status: "rejected",
    articleId: "A2",
    stage: "selector",
    reasonCodes: ["ROLE_ERROR"],
    reasons: ["모델 호출 실패"],
    editorAttempts: 0,
  };
  assert.throws(
    () => renderUniverseNewsStorageSql(technicalFailure),
    /실행 오류가 남아/u,
  );
});
