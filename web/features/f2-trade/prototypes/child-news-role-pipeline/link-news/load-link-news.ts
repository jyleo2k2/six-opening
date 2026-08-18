/**
 * 검수를 통과한 신규 뉴스를 Supabase 에 넣는다.
 *
 * 넣는 컬럼과 순서는 `manual-drafts/load.mjs` 와 같다. 로컬에 psql·supabase CLI 가 없어
 * `renderUniverseNewsStorageSql` 이 만든 SQL 을 실행할 방법이 없으므로 PostgREST 로 직접 넣는다.
 *
 * **트랜잭션이 아니다.** REST 호출은 하나씩 커밋되므로 기사 단위로 처리하고, 이미 있는
 * `source_key` 는 건너뛰어 다시 돌릴 수 있게 한다. 한 기사 안에서 실패하면 그 기사만
 * 지우고 멈춘다(부분 적재 방지).
 *
 * 순서가 이런 이유는 출고 불변성 트리거 때문이다. 게시물이 `ready_for_storage` 이상이면
 * 그 기사의 근거·인용을 **새로 넣지도** 못한다. 그래서 게시물을 `draft` 로 먼저 세우고
 * 증거를 다 채운 뒤 마지막에 상태를 올린다.
 *
 *   런 → 기사 → 근거 문장 → 종목 연결 → 게시물(draft) → 인용 → ready_for_storage → published
 *
 * 실행:
 *   cd web
 *   node features/f2-trade/prototypes/child-news-role-pipeline/link-news/load-link-news.cjs \
 *     --report features/f2-trade/prototypes/child-news-role-pipeline/reports/supplied-link-news-2026-08-18/report.json \
 *     --dry-run
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadDevelopmentEnvironment } from "../../../../../app/api/dev-env";
import { deleteRows, insertRow, selectRows, updateRow } from "../../../../../app/api/supabase";
import type { ReadyNews } from "../contracts";
import type { LinkNewsCase, LinkNewsReport } from "./run-link-pipeline";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/**
 * 선별자가 문장을 쪼개면 근거 id 가 `S3.2` 가 되는데 DB 는 점을 받지 않는다
 * (`source_unit_id ~ '^[A-Za-z0-9_-]{1,40}$'`). `universe-news-storage.ts` 와 같은 규칙으로 바꾼다.
 */
export function storageSourceId(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9_-]/gu, "_");
  if (!normalized || normalized.length > 40) {
    throw new Error(`DB에 저장할 수 없는 근거 id 입니다: ${value}`);
  }
  return normalized;
}

function citationPairs(ready: ReadyNews) {
  const { draft } = ready;
  return [
    ...draft.headline.sourceIds.map((id) => ["headline", id] as const),
    ...draft.homeSummary.sourceIds.map((id) => ["home_summary", id] as const),
    ...draft.body.flatMap((line, index) =>
      line.sourceIds.map((id) => [`summary_line_${index + 1}`, id] as const)),
    ...draft.priceConnection.sourceIds.map((id) => ["price_connection", id] as const),
  ].map(([field, id]) => [field, storageSourceId(id)] as const);
}

async function loadOne(
  item: LinkNewsCase,
  runId: number,
  readyAt: string,
): Promise<"inserted" | "skipped"> {
  const ready = item.pipelineResult as ReadyNews;
  const { article, selection, draft, review, editorAttempts } = ready;
  const sourceKey = sha256(article.sourceUrl);

  const [existing] = await selectRows<{ id: number }>("news_articles", {
    select: "id",
    source_key: `eq.${sourceKey}`,
  });
  if (existing) return "skipped";

  let articleId: number | null = null;
  try {
    const inserted = await insertRow<{ id: number }>("news_articles", {
      pipeline_run_id: runId,
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
    });
    articleId = inserted.id;

    for (const [index, unit] of article.sourceUnits.entries()) {
      await insertRow("news_source_units", {
        article_id: articleId,
        source_unit_id: storageSourceId(unit.id),
        // S1 이 1번이다. 0 을 넣으면 news_source_units_ordinal_check 에 걸린다.
        ordinal: index + 1,
        source_text: unit.text,
        source_text_hash: sha256(unit.text),
        is_selected: selection.includedSourceIds.includes(unit.id),
        is_anchor: unit.id === selection.anchorSourceId,
      });
    }

    // `news_article_stocks.stock_id` 는 종목코드가 아니라 stocks 의 정수 PK 다.
    const codes = [...new Set(selection.primaryStockIds.map((id) => id.slice(4)))];
    const stockRows = await selectRows<{ stock_id: number; stock_code: string }>("stocks", {
      select: "stock_id,stock_code",
      stock_code: `in.(${codes.join(",")})`,
    });
    const missing = codes.filter((code) => !stockRows.some((row) => row.stock_code === code));
    if (missing.length > 0) throw new Error(`stocks 에 없는 종목: ${missing.join(", ")}`);
    for (const row of stockRows) {
      await insertRow("news_article_stocks", {
        article_id: articleId,
        stock_id: row.stock_id,
        subject_role: "primary",
      });
    }

    const publication = await insertRow<{ id: number }>("news_publications", {
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
      term_treatments: draft.termTreatments.map((treatment) => ({
        ...treatment,
        sourceIds: treatment.sourceIds.map(storageSourceId),
      })),
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
      editor_attempts: editorAttempts,
      ready_at: readyAt,
    });

    for (const [field, sourceUnitId] of citationPairs(ready)) {
      await insertRow("news_citations", {
        publication_id: publication.id,
        article_id: articleId,
        output_field: field,
        source_unit_id: sourceUnitId,
      });
    }

    await updateRow("news_publications", { id: `eq.${publication.id}` }, { status: "ready_for_storage" });
    await updateRow("news_publications", { id: `eq.${publication.id}` }, {
      status: "published",
      published_at: new Date().toISOString(),
    });
    return "inserted";
  } catch (error) {
    // 반쯤 들어간 기사를 남기지 않는다. 게시물·근거·인용은 기사에 cascade 로 붙어 있다.
    if (articleId !== null) await deleteRows("news_articles", { id: `eq.${articleId}` });
    throw error;
  }
}

async function main() {
  loadDevelopmentEnvironment();
  const reportPath = resolve(option("--report") ?? "");
  if (!reportPath) throw new Error("--report 는 필수입니다.");
  const report = JSON.parse(await readFile(reportPath, "utf8")) as LinkNewsReport;
  const dryRun = process.argv.includes("--dry-run");

  if (report.technicalErrorCount > 0) {
    throw new Error(`기술 오류 ${report.technicalErrorCount}건이 남아 있어 적재하지 않습니다.`);
  }
  if (report.completedCount !== report.stockCount) {
    throw new Error(`판정이 ${report.completedCount}/${report.stockCount} 로 끝나지 않았습니다.`);
  }

  const only = option("--only")?.split(",").map((value) => value.trim()).filter(Boolean);
  const ready = report.cases.filter(
    (item) => item.pipelineResult.status === "ready_for_storage" &&
      (!only || only.includes(item.stock.symbol)),
  );
  console.log(`적재 대상 ${ready.length}건 (리포트 ${report.runId} · 통과 ${report.readyForStorageCount})`);

  // 링크가 겹치면 뒤엣것은 어차피 source_key 중복으로 건너뛴다. 미리 알려 준다.
  const urls = new Map<string, string[]>();
  for (const item of ready) {
    urls.set(item.article.sourceUrl, [...(urls.get(item.article.sourceUrl) ?? []), item.stock.name]);
  }
  for (const [url, names] of urls) {
    if (names.length > 1) console.log(`  주의: 같은 링크를 ${names.join("·")} 가 함께 씁니다 — 먼저 하나만 들어갑니다. ${url}`);
  }

  if (dryRun) {
    for (const item of ready) {
      const draft = (item.pipelineResult as ReadyNews).draft;
      console.log(`  [dry-run] ${item.stock.name}: ${draft.headline.text}`);
      draft.body.forEach((line, index) => console.log(`             ${index + 1}. ${line.text}`));
    }
    console.log("\n실제로 넣지 않았습니다. --dry-run 을 빼면 적재합니다.");
    return;
  }

  const [existingRun] = await selectRows<{ id: number }>("news_pipeline_runs", {
    select: "id",
    run_key: `eq.${report.runId}`,
  });
  const run = existingRun ?? await insertRow<{ id: number }>("news_pipeline_runs", {
    run_key: report.runId,
    run_date_kst: report.runDateKst,
    model: report.model,
    contract_version: report.contractVersion,
    prompt_version: report.promptVersion,
    source_count: report.stockCount,
    ready_count: report.readyForStorageCount,
    rejected_count: report.rejectedCount,
    criteria_passed: true,
    started_at: report.sourceRetrievedAt,
    completed_at: report.generatedAt,
  });

  let inserted = 0;
  let skipped = 0;
  for (const item of ready) {
    const outcome = await loadOne(item, run.id, report.generatedAt);
    if (outcome === "inserted") inserted += 1;
    else skipped += 1;
    console.log(`  ${outcome === "inserted" ? "넣음" : "건너뜀"} ${item.stock.name}`);
  }
  console.log(`\n적재 ${inserted}건 · 건너뜀 ${skipped}건`);
  console.log("다음: cd web && npm run news:audit 로 3줄 요약을 전수 검사하고, npm run seed:news:export 로 복구본을 갱신합니다.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
