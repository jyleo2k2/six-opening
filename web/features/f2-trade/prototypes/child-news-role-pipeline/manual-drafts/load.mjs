/**
 * 병합 리포트의 `ready_for_storage` 기사를 Supabase PostgREST 로 적재한다.
 *
 * `storage.sql` 은 한 트랜잭션이지만 로컬에 psql·supabase CLI 가 없고 `.env` 에 DB
 * 비밀번호도 없다. 대신 `.env` 의 `SUPABASE_URL` + `SUPABASE_SECRET_KEY` 로 PostgREST 에
 * 직접 넣는다. 넣는 내용은 `renderUniverseNewsStorageSql` 과 같은 컬럼·같은 순서다.
 *
 * **트랜잭션이 아니다.** REST 호출은 하나씩 커밋되므로 중간에 끊기면 일부만 들어간다.
 * 그래서 기사 단위로 처리하고, 이미 있는 `source_key` 는 건너뛰어 다시 돌릴 수 있게 했다.
 * 한 기사 안에서 실패하면 그 기사만 지우고 멈춘다(부분 적재 방지).
 *
 * 사용: node manual-drafts/load.mjs --report <병합 report.json> [--dry-run]
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), "..", ".env"), quiet: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL 과 SUPABASE_SECRET_KEY 가 필요합니다.");

const dryRun = process.argv.includes("--dry-run");
const reportPath = resolve(
  process.argv[process.argv.indexOf("--report") + 1] ?? "",
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function rest(path, init) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${path} → ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const select = (path) => rest(path, { method: "GET" });
const insert = (table, rows) =>
  rest(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
const patch = (path, row) =>
  rest(path, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });

const report = JSON.parse(await readFile(reportPath, "utf8"));
const ready = report.cases.filter((item) => item.pipelineResult.status === "ready_for_storage");
console.log(`대상 ${ready.length}건 (리포트 ${report.runId})`);

// 파이프라인 실행 기록. 같은 run_key 가 있으면 그걸 쓴다.
let [run] = await select(`news_pipeline_runs?run_key=eq.${encodeURIComponent(report.runId)}&select=id`);
if (!run) {
  if (dryRun) {
    console.log(`[dry-run] news_pipeline_runs 생성 예정: ${report.runId}`);
    run = { id: 0 };
  } else {
    [run] = await insert("news_pipeline_runs", [{
      run_key: report.runId,
      run_date_kst: report.runDateKst,
      model: report.model,
      contract_version: "child-news-role-pipeline-v2",
      prompt_version: "approved-price-linked-max-v2",
      source_count: report.stockCount,
      ready_count: report.readyForStorageCount,
      rejected_count: report.rejectedCount,
      criteria_passed: true,
      started_at: report.sourceRetrievedAt,
      completed_at: report.generatedAt,
    }]);
  }
}

let inserted = 0;
let skipped = 0;

for (const item of ready) {
  const { article, selection, draft, review, editorAttempts } = item.pipelineResult;
  const sourceKey = sha256(article.sourceUrl);
  const stockCode = item.stock.symbol;

  const [existing] = await select(`news_articles?source_key=eq.${sourceKey}&select=id`);
  if (existing) {
    skipped += 1;
    console.log(`  건너뜀 ${item.stock.name} (이미 있음)`);
    continue;
  }
  if (dryRun) {
    console.log(`  [dry-run] ${item.stock.name}: ${draft.headline.text}`);
    inserted += 1;
    continue;
  }

  let articleId = null;
  try {
    [{ id: articleId }] = await insert("news_articles", [{
      pipeline_run_id: run.id,
      source_key: sourceKey,
      external_article_id: article.articleId,
      run_date_kst: article.runDateKst,
      scope: article.scope,
      source_event_type: selection.eventType,
      original_title: article.title,
      publisher: article.publisher,
      source_published_at: article.publishedAt,
      source_url: article.sourceUrl,
      evidence_hash: sha256(JSON.stringify(article.sourceUnits)),
      pipeline_result: "ready_for_storage",
    }]);

    await insert("news_source_units", article.sourceUnits.map((unit, index) => ({
      article_id: articleId,
      source_unit_id: unit.id,
      // S1 이 1번이다. 0 을 넣으면 news_source_units_ordinal_check 에 걸린다.
      ordinal: index + 1,
      source_text: unit.text,
      source_text_hash: sha256(unit.text),
      is_selected: selection.includedSourceIds.includes(unit.id),
      is_anchor: unit.id === selection.anchorSourceId,
    })));

    // 합병 기사처럼 주인공이 둘 이상인 기사가 있다. publication 의 stock_codes 와
    // news_article_stocks 가 어긋나면 NEWS_PUBLICATION_SUBJECT_MISMATCH 로 막힌다.
    // news_article_stocks.stock_id 는 종목코드가 아니라 stocks 의 정수 PK 다.
    const codes = [...new Set(selection.primaryStockIds.map((id) => id.slice(4)))];
    const stockRows = await select(
      `stocks?stock_code=in.(${codes.join(",")})&select=stock_id,stock_code`,
    );
    const missing = codes.filter((code) => !stockRows.some((row) => row.stock_code === code));
    if (missing.length > 0) throw new Error(`stocks 에 없는 종목: ${missing.join(", ")}`);
    // selection.primaryStockIds 는 전부 주인공이다. subject_role 은 primary/mentioned 만 받는다.
    await insert("news_article_stocks", stockRows.map((row) => ({
      article_id: articleId,
      stock_id: row.stock_id,
      subject_role: "primary",
    })));

    const [publication] = await insert("news_publications", [{
      article_id: articleId,
      status: "draft",
      selector_event_type: selection.eventType,
      reviewer_event_type: review.eventType,
      selector_stock_codes: selection.primaryStockIds.map((id) => id.slice(4)),
      reviewer_stock_codes: review.primaryStockIds.map((id) => id.slice(4)),
      focus_statement: selection.focusStatement,
      headline: draft.headline.text,
      home_summary: draft.homeSummary.text,
      summary_line_1: draft.body[0].text,
      summary_line_1_fact_key: draft.body[0].factKey,
      summary_line_2: draft.body[1].text,
      summary_line_2_fact_key: draft.body[1].factKey,
      summary_line_3: draft.body[2].text,
      summary_line_3_fact_key: draft.body[2].factKey,
      price_connection_kind: draft.priceConnection.kind,
      price_connection_basis: draft.priceConnection.basis,
      price_connection_text: draft.priceConnection.text,
      term_treatments: draft.termTreatments,
      deterministic_facts_pass: true,
      review_allowed_scope: review.checks.allowedScope,
      review_primary_subject: review.checks.primarySubject,
      review_direct_materiality: review.checks.directMateriality,
      review_source_fidelity: review.checks.sourceFidelity,
      review_focus_alignment: review.checks.focusAlignment,
      review_concise_three_line_summary: review.checks.conciseThreeLineSummary,
      review_no_irrelevant_detail: review.checks.noIrrelevantDetail,
      review_attribution_and_timing: review.checks.attributionAndTiming,
      review_all_terms_easy: review.checks.allTermsEasy,
      review_same_headline_across_surfaces: review.checks.sameHeadlineAcrossSurfaces,
      review_distinct_summary_facts: review.checks.distinctSummaryFacts,
      review_price_connection_grounded: review.checks.priceConnectionGrounded,
      review_term_explanation_coverage: review.checks.termExplanationCoverage,
      review_investment_safety: review.checks.investmentSafety,
      review_no_sentiment_label: review.checks.noSentimentLabel,
      editor_attempts: editorAttempts ?? 0,
      ready_at: report.generatedAt,
    }]);

    const citations = [
      ...draft.headline.sourceIds.map((id) => ["headline", id]),
      ...draft.homeSummary.sourceIds.map((id) => ["home_summary", id]),
      ...draft.body.flatMap((line, index) =>
        line.sourceIds.map((id) => [`summary_line_${index + 1}`, id])),
      ...draft.priceConnection.sourceIds.map((id) => ["price_connection", id]),
    ];
    await insert("news_citations", citations.map(([field, sourceUnitId]) => ({
      publication_id: publication.id,
      article_id: articleId,
      output_field: field,
      source_unit_id: sourceUnitId,
    })));

    // draft → ready_for_storage → published. 출고 불변성 트리거가 이 순서를 요구한다.
    await patch(`news_publications?id=eq.${publication.id}`, { status: "ready_for_storage" });
    await patch(`news_publications?id=eq.${publication.id}`, {
      status: "published",
      published_at: new Date().toISOString(),
    });

    inserted += 1;
    console.log(`  적재 ${item.stock.name}: ${draft.headline.text}`);
  } catch (error) {
    // 트랜잭션이 없으므로 실패한 기사의 잔해를 직접 지운다. 자식 행은 FK cascade 로 따라 지워진다.
    if (articleId) {
      await rest(`news_articles?id=eq.${articleId}`, { method: "DELETE" }).catch(() => {});
      console.error(`  되돌림 ${item.stock.name} (article ${articleId})`);
    }
    throw error;
  }
}

console.log(`\n${dryRun ? "[dry-run] " : ""}적재 ${inserted}건 · 건너뜀 ${skipped}건`);
