/**
 * 대표 검수를 통과한 48종목 카드 중 **근거에 묶인 것만** Supabase 에 넣는다.
 *
 * 넣는 컬럼과 순서는 `link-news/load-link-news.ts`·`manual-drafts/load.mjs` 와 같다.
 *
 *   런 → 기사 → 근거 문장 → 종목 연결 → 게시물(draft) → 인용 → ready_for_storage → published
 *
 * 게시물을 `draft` 로 먼저 세우는 이유는 출고 불변성 트리거 때문이다. 게시물이
 * `ready_for_storage` 이상이면 그 기사의 근거·인용을 **새로 넣지도** 못한다. 검증을 피하는
 * 게 아니라 검증이 성립하는 순서로 쌓는 것이다.
 *
 * **트랜잭션이 아니다.** REST 호출은 하나씩 커밋되므로 기사 단위로 처리하고, 이미 있는
 * `source_key` 는 건너뛰어 다시 돌릴 수 있게 한다. 한 기사 안에서 실패하면 그 기사만
 * 지우고 멈춘다(부분 적재 방지).
 *
 * **주의**: 이 경로로 들어간 항목은 독립 검수자(`publication_reviewer`)를 거치지 않았다.
 * `review_*` 컬럼은 대표님이 HTML 검수 화면에서 확인하셨다는 선언이지 모델 판정이 아니다
 * (`manual-drafts/build.mjs` 와 같은 전제). 근거 문장은 실제 기사 본문에서 그대로 따온 것만
 * 쓰고, 기사에 없는 숫자를 쓴 카드는 수집 단계에서 이미 떨어뜨렸다.
 *
 * 실행:
 *   cd web
 *   node features/f2-trade/prototypes/child-news-role-pipeline/link-news/curated/load-curated-news.cjs --dry-run
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevelopmentEnvironment } from "../../../../../../app/api/dev-env";
import { deleteRows, insertRow, selectRows, updateRow } from "../../../../../../app/api/supabase";
import type { CuratedCase, CuratedReport } from "./collect-curated-news";

const here = dirname(fileURLToPath(import.meta.url));
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** `news_pipeline_runs.model` 은 `gpt-5.6-luna` 만 받는다. 문안을 만든 초안 실행이 그 모델이었다. */
const RUN_MODEL = "gpt-5.6-luna";
const CONTRACT_VERSION = "child-news-role-pipeline-v2";
const PROMPT_VERSION = "curated-supplied-link-2026-08-18";

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** DB 는 `source_unit_id ~ '^[A-Za-z0-9_-]{1,40}$'` 만 받는다. `load-link-news.ts` 와 같은 규칙이다. */
export function storageSourceId(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9_-]/gu, "_");
  if (!normalized || normalized.length > 40) {
    throw new Error(`DB에 저장할 수 없는 근거 id 입니다: ${value}`);
  }
  return normalized;
}

export function citationPairs(item: CuratedCase) {
  const { draft } = item;
  return [
    ...draft.headline.sourceIds.map((id) => ["headline", id] as const),
    ...draft.homeSummary.sourceIds.map((id) => ["home_summary", id] as const),
    ...draft.body.flatMap((line, index) =>
      line.sourceIds.map((id) => [`summary_line_${index + 1}`, id] as const),
    ),
    ...draft.priceConnection.sourceIds.map((id) => ["price_connection", id] as const),
  ].map(([field, id]) => [field, storageSourceId(id)] as const);
}

async function loadOne(item: CuratedCase, runId: number, readyAt: string) {
  const { article, draft } = item;
  const sourceKey = sha256(article.sourceUrl);

  const [existing] = await selectRows<{ id: number }>("news_articles", {
    select: "id",
    source_key: `eq.${sourceKey}`,
  });
  if (existing) return "skipped" as const;

  let articleId: number | null = null;
  try {
    const inserted = await insertRow<{ id: number }>("news_articles", {
      pipeline_run_id: runId,
      source_key: sourceKey,
      external_article_id: article.articleId,
      run_date_kst: article.runDateKst,
      scope: article.scope,
      source_event_type: item.eventType,
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
        // S1 이 1번이다. 0 을 넣으면 ordinal 검사에 걸린다.
        ordinal: index + 1,
        source_text: unit.text,
        source_text_hash: sha256(unit.text),
        is_selected: item.selectedSourceIds.includes(unit.id),
        is_anchor: unit.id === item.anchorSourceId,
      });
    }

    // `news_article_stocks.stock_id` 는 종목코드가 아니라 stocks 의 정수 PK 다.
    const [stockRow] = await selectRows<{ stock_id: number; stock_code: string }>("stocks", {
      select: "stock_id,stock_code",
      stock_code: `eq.${item.stock.symbol}`,
    });
    if (!stockRow) throw new Error(`stocks 에 없는 종목: ${item.stock.symbol}`);
    await insertRow("news_article_stocks", {
      article_id: articleId,
      stock_id: stockRow.stock_id,
      subject_role: "primary",
    });

    const stockCodes = [item.stock.symbol];
    const publication = await insertRow<{ id: number }>("news_publications", {
      article_id: articleId,
      status: "draft",
      selector_event_type: item.eventType,
      reviewer_event_type: item.eventType,
      selector_stock_codes: stockCodes,
      reviewer_stock_codes: stockCodes,
      focus_statement: item.focusStatement,
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
      // 아래 boolean 은 대표님 검수 선언이다. 모델 독립 검수 판정이 아니다(파일 머리말 참고).
      deterministic_facts_pass: true,
      review_allowed_scope: true,
      review_primary_subject: true,
      review_direct_materiality: true,
      review_source_fidelity: true,
      review_focus_alignment: true,
      review_concise_three_line_summary: true,
      review_no_irrelevant_detail: true,
      review_attribution_and_timing: true,
      review_all_terms_easy: true,
      review_same_headline_across_surfaces: true,
      review_distinct_summary_facts: true,
      review_price_connection_grounded: true,
      review_term_explanation_coverage: true,
      review_investment_safety: true,
      review_no_sentiment_label: true,
      editor_attempts: 1,
      ready_at: readyAt,
    });

    for (const [field, sourceUnitId] of citationPairs(item)) {
      await insertRow("news_citations", {
        publication_id: publication.id,
        article_id: articleId,
        output_field: field,
        source_unit_id: sourceUnitId,
      });
    }

    await updateRow("news_publications", { id: `eq.${publication.id}` }, { status: "ready_for_storage" });
    await updateRow(
      "news_publications",
      { id: `eq.${publication.id}` },
      { status: "published", published_at: new Date().toISOString() },
    );
    return "inserted" as const;
  } catch (error) {
    // 반쯤 들어간 기사를 남기지 않는다. 게시물·근거·인용은 기사에 cascade 로 붙어 있다.
    if (articleId !== null) await deleteRows("news_articles", { id: `eq.${articleId}` });
    throw error;
  }
}

async function main() {
  loadDevelopmentEnvironment();
  const reportPath = resolve(
    option("--report") ??
      resolve(here, "..", "..", "reports", "curated-link-news-2026-08-18", "curated-report.json"),
  );
  const report = JSON.parse(await readFile(reportPath, "utf8")) as CuratedReport;
  const dryRun = process.argv.includes("--dry-run");

  const only = option("--only")?.split(",").map((value) => value.trim()).filter(Boolean);
  const ready = report.cases.filter((item) => !only || only.includes(item.stock.symbol));
  console.log(
    `적재 대상 ${ready.length}건 (리포트 ${report.runId} · 카드 ${report.cardCount} · 근거 못 묶음 ${report.failures.length})`,
  );
  for (const failure of report.failures) {
    console.log(`  제외 ${failure.symbol} ${failure.company}: ${failure.reason.slice(0, 120)}`);
  }

  if (dryRun) {
    for (const item of ready) {
      console.log(`\n  [dry-run] ${item.stock.name} — ${item.draft.headline.text}`);
      item.draft.body.forEach((line, index) =>
        console.log(`             ${index + 1}. ${line.text}  (${line.sourceIds.join(",")})`),
      );
    }
    console.log("\n실제로 넣지 않았습니다. --dry-run 을 빼면 적재합니다.");
    return;
  }

  const [existingRun] = await selectRows<{ id: number }>("news_pipeline_runs", {
    select: "id",
    run_key: `eq.${report.runId}`,
  });
  const run =
    existingRun ??
    (await insertRow<{ id: number }>("news_pipeline_runs", {
      run_key: report.runId,
      run_date_kst: report.runDateKst,
      model: RUN_MODEL,
      contract_version: CONTRACT_VERSION,
      prompt_version: PROMPT_VERSION,
      source_count: report.cardCount,
      ready_count: report.cases.length,
      rejected_count: report.failures.length,
      criteria_passed: true,
      started_at: report.retrievedAt,
      completed_at: report.retrievedAt,
    }));

  let inserted = 0;
  let skipped = 0;
  for (const item of ready) {
    const outcome = await loadOne(item, run.id, report.retrievedAt);
    if (outcome === "inserted") inserted += 1;
    else skipped += 1;
    console.log(`  ${outcome === "inserted" ? "넣음" : "건너뜀"} ${item.stock.name}`);
  }
  console.log(`\n적재 ${inserted}건 · 건너뜀 ${skipped}건`);
  console.log("다음: npm run news:audit 로 전수 검사하고, npm run seed:news:export 로 복구본을 갱신합니다.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
