import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { ReviewCheckName } from "./contracts";
import { REVIEW_CHECK_NAMES } from "./contracts";
import type {
  UniverseNewsCaseResult,
  UniverseNewsReport,
} from "./universe-news-evaluation";
import { renderUniverseComparisonHtml } from "./universe-news-evaluation";
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
        homeSummary: { text: "테스트기업1이 100억원을 팔았어", sourceIds: [sourceId] },
        body: [
          { role: "key_detail", factKey: "revenue", text: "기사에 나온 매출은 100억원이에요.", sourceIds: [sourceId] },
          { role: "business_detail", factKey: "revenue_definition", text: "매출은 물건을 팔아 받은 돈이야.", sourceIds: [sourceId] },
          { role: "context", factKey: "source_scope", text: "기사에 나온 확정 숫자만 전했어.", sourceIds: [sourceId] },
        ],
        priceConnection: {
          kind: "business_performance",
          basis: "event_education",
          text: "매출은 회사의 사업 규모와 연결돼요.",
          sourceIds: [sourceId],
        },
        termTreatments: [{
          term: "매출",
          treatment: "explained",
          easyText: "물건을 팔아 받은 전체 금액",
          sourceIds: [sourceId],
        }],
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

test("v2 DB 계약으로 factKey·주가 연결·용어 근거를 적재한다", () => {
  const sql = renderUniverseNewsStorageSql(reportWithOneReady());
  assert.match(sql, /child-news-role-pipeline-v2/u);
  assert.match(sql, /summary_line_1_fact_key/u);
  assert.match(sql, /price_connection_kind/u);
  assert.match(sql, /review_same_headline_across_surfaces/u);
  assert.match(sql, /'price_connection'/u);
  assert.match(sql, /"sourceIds":\["S1_1"\]/u);
});

test("Supabase 마이그레이션과 시드가 v2 공개 계약을 보존한다", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "../supabase/migrations/20260814044114_upgrade_news_pipeline_v2_contract.sql",
    ),
    "utf8",
  );
  const seed = readFileSync(resolve(process.cwd(), "../supabase/seed.sql"), "utf8");

  assert.match(migration, /summary_line_1_fact_key text/u);
  assert.match(migration, /price_connection_kind text/u);
  assert.match(migration, /home_summary = headline/u);
  assert.match(migration, /valid_term_treatments_v2\(term_treatments\)/u);
  assert.match(migration, /with \(security_invoker = true\)/u);
  assert.match(migration, /review_term_explanation_coverage/u);
  assert.match(seed, /child-news-role-pipeline-v2/u);
  assert.match(seed, /"sourceIds":\["S1"\]/u);
  assert.match(seed, /'price_connection', 'S1'/u);
});

test("51종목 비교 HTML은 짧은 카드와 상세에 같은 제목과 주가 연결을 표시한다", () => {
  const html = renderUniverseComparisonHtml(reportWithOneReady(), new Map());
  assert.equal(html.split("테스트기업1이 100억원을 팔았어").length - 1, 2);
  assert.match(html, /왜 주가와 관련 있어\?/u);
  assert.match(html, /매출은 회사의 사업 규모와 연결돼요/u);
  assert.match(html, /기사 속 말 배우기/u);
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
