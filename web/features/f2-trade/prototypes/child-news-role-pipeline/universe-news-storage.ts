import { createHash } from "node:crypto";
import type { ReadyNews } from "./contracts";
import type {
  UniverseNewsCaseResult,
  UniverseNewsReport,
} from "./universe-news-evaluation";

type ReadyStorageItem = {
  caseResult: UniverseNewsCaseResult;
  ready: ReadyNews;
  sourceKey: string;
  evidenceHash: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlTextArray(values: readonly string[]) {
  return values.length === 0
    ? "'{}'::text[]"
    : `array[${values.map(sqlText).join(", ")}]::text[]`;
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

function storageSourceId(value: string) {
  const normalized = value.replace(/[^A-Za-z0-9_-]/gu, "_");
  if (!normalized || normalized.length > 40) {
    throw new Error(`DB에 저장할 수 없는 source unit id입니다: ${value}`);
  }
  return normalized;
}

function sourceIdsForField(ready: ReadyNews, outputField: string) {
  if (outputField === "headline") return ready.draft.headline.sourceIds;
  if (outputField === "home_summary") return ready.draft.homeSummary.sourceIds;
  const match = outputField.match(/^summary_line_(\d)$/u);
  const index = match ? Number(match[1]) - 1 : -1;
  if (index < 0 || index >= ready.draft.body.length) {
    throw new Error(`지원하지 않는 출력 필드입니다: ${outputField}`);
  }
  return ready.draft.body[index].sourceIds;
}

function readyStorageItems(report: UniverseNewsReport) {
  const items = report.cases.flatMap((caseResult) => {
    if (caseResult.pipelineResult.status !== "ready_for_storage") return [];
    const ready = caseResult.pipelineResult;
    if (!ready.selection.primaryStockIds.includes(caseResult.stock.stockId)) {
      throw new Error(`${caseResult.stock.name}: 대상 종목이 ready 결과의 주인공이 아닙니다.`);
    }
    return [{
      caseResult,
      ready,
      sourceKey: sha256(ready.article.sourceUrl),
      evidenceHash: sha256(JSON.stringify(ready.article.sourceUnits)),
    } satisfies ReadyStorageItem];
  });

  const bySourceKey = new Map<string, ReadyStorageItem>();
  for (const item of items) {
    const existing = bySourceKey.get(item.sourceKey);
    if (!existing) {
      bySourceKey.set(item.sourceKey, item);
      continue;
    }
    if (
      existing.evidenceHash !== item.evidenceHash ||
      JSON.stringify(existing.ready.draft) !== JSON.stringify(item.ready.draft) ||
      JSON.stringify(existing.ready.selection) !== JSON.stringify(item.ready.selection) ||
      JSON.stringify(existing.ready.review) !== JSON.stringify(item.ready.review)
    ) {
      throw new Error(
        `${item.ready.article.articleId}: 같은 원문이 서로 다른 파이프라인 결과로 통과했습니다. 저장 전에 수동 검수가 필요합니다.`,
      );
    }
  }
  for (const item of bySourceKey.values()) {
    const ids = item.ready.article.sourceUnits.map((unit) => storageSourceId(unit.id));
    if (new Set(ids).size !== ids.length) {
      throw new Error(`${item.ready.article.articleId}: DB용 source unit id가 중복됩니다.`);
    }
  }
  return [...bySourceKey.values()];
}

function renderRunInsert(report: UniverseNewsReport, criteriaPassed: boolean) {
  return `insert into public.news_pipeline_runs (
  run_key, run_date_kst, model, contract_version, prompt_version,
  source_count, ready_count, rejected_count, criteria_passed,
  started_at, completed_at
) values (
  ${sqlText(report.runId)}, ${sqlText(report.runDateKst)}::date,
  'gpt-5.6-luna', 'child-news-role-pipeline-v1',
  'selected-company-max-reasoning-and-three-line-summary-v1',
  51, ${report.readyForStorageCount}, ${report.rejectedCount}, ${criteriaPassed},
  ${sqlText(report.sourceRetrievedAt)}::timestamptz,
  ${sqlText(report.generatedAt)}::timestamptz
)
on conflict (run_key) do nothing;`;
}

function renderArticleInsert(report: UniverseNewsReport, items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- ready_for_storage 기사가 없어 news_articles insert를 생략합니다.";
  const values = items.map(({ ready, sourceKey, evidenceHash }) => `(
      ${sqlText(sourceKey)}, ${sqlText(ready.article.articleId)},
      ${sqlText(ready.article.runDateKst)}::date, ${sqlText(ready.article.scope)},
      ${sqlText(ready.selection.eventType)}, ${sqlText(ready.article.title)},
      ${sqlText(ready.article.publisher)}, ${sqlText(ready.article.publishedAt)}::timestamptz,
      ${sqlText(ready.article.sourceUrl)}, ${sqlText(evidenceHash)}
    )`).join(",\n    ");
  return `insert into public.news_articles (
  pipeline_run_id, source_key, external_article_id, run_date_kst, scope,
  source_event_type, original_title, publisher, source_published_at,
  source_url, evidence_hash, pipeline_result
)
select
  run.id, item.source_key, item.external_article_id, item.run_date_kst,
  item.scope, item.source_event_type, item.original_title, item.publisher,
  item.source_published_at, item.source_url, item.evidence_hash,
  'ready_for_storage'
from public.news_pipeline_runs as run
cross join (
  values
    ${values}
) as item(
  source_key, external_article_id, run_date_kst, scope, source_event_type,
  original_title, publisher, source_published_at, source_url, evidence_hash
)
where run.run_key = ${sqlText(report.runId)}
on conflict (source_key) do nothing;

do $$
begin
  if exists (
    select 1
    from public.news_articles as article
    join (
      values
        ${items.map((item) => `(${sqlText(item.sourceKey)}, ${sqlText(item.evidenceHash)})`).join(",\n        ")}
    ) as expected(source_key, evidence_hash)
      on expected.source_key = article.source_key
    where article.evidence_hash <> expected.evidence_hash
  ) then
    raise exception 'NEWS_SOURCE_EVIDENCE_HASH_MISMATCH';
  end if;
end;
$$;`;
}

function renderSourceUnitInsert(items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- ready_for_storage 기사가 없어 news_source_units insert를 생략합니다.";
  const rows = items.flatMap(({ ready, sourceKey }) => {
    const selected = new Set(ready.selection.includedSourceIds);
    return ready.article.sourceUnits.map((unit, index) => `(
      ${sqlText(sourceKey)}, ${sqlText(storageSourceId(unit.id))}, ${index + 1}::smallint,
      ${sqlText(unit.text)}, ${sqlText(sha256(unit.text))},
      ${selected.has(unit.id)}, ${unit.id === ready.selection.anchorSourceId}
    )`);
  });
  return `insert into public.news_source_units (
  article_id, source_unit_id, ordinal, source_text, source_text_hash,
  is_selected, is_anchor
)
select article.id, unit.source_unit_id, unit.ordinal, unit.source_text,
  unit.source_text_hash, unit.is_selected, unit.is_anchor
from public.news_articles as article
join (
  values
    ${rows.join(",\n    ")}
) as unit(
  source_key, source_unit_id, ordinal, source_text, source_text_hash,
  is_selected, is_anchor
) on unit.source_key = article.source_key
where not exists (
  select 1 from public.news_source_units as existing
  where existing.article_id = article.id
    and existing.source_unit_id = unit.source_unit_id
)
on conflict (article_id, source_unit_id) do nothing;`;
}

function renderStockInsert(items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- ready_for_storage 기사가 없어 news_article_stocks insert를 생략합니다.";
  const rows = items.flatMap(({ ready, sourceKey }) =>
    ready.selection.primaryStockIds.map((stockId) => {
      const stockCode = stockId.replace(/^KRX:/u, "");
      if (!/^\d{6}$/u.test(stockCode)) {
        throw new Error(`지원하지 않는 stockId입니다: ${stockId}`);
      }
      return `(${sqlText(sourceKey)}, ${sqlText(stockCode)})`;
    }),
  );
  return `insert into public.news_article_stocks (article_id, stock_id, subject_role)
select article.id, stock.stock_id, 'primary'
from public.news_articles as article
join (
  values
    ${rows.join(",\n    ")}
) as subject(source_key, stock_code) on subject.source_key = article.source_key
join public.stocks as stock on stock.stock_code = subject.stock_code
where not exists (
  select 1 from public.news_article_stocks as existing
  where existing.article_id = article.id
    and existing.stock_id = stock.stock_id
)
on conflict (article_id, stock_id) do nothing;`;
}

function renderExistingPublicationGuard(items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- 기존 publication 동일성 검사를 생략합니다.";
  const values = items.map(({ ready, sourceKey }) => {
    const codes = [...ready.selection.primaryStockIds]
      .map((stockId) => stockId.replace(/^KRX:/u, ""))
      .sort();
    return `(
      ${sqlText(sourceKey)}, ${sqlText(ready.selection.eventType)},
      ${sqlTextArray(codes)}, ${sqlText(ready.selection.focusStatement)},
      ${sqlText(ready.draft.headline.text)}, ${sqlText(ready.draft.homeSummary.text)},
      ${sqlText(ready.draft.body[0].text)}, ${sqlText(ready.draft.body[1].text)},
      ${sqlText(ready.draft.body[2].text)}, ${sqlJson(ready.draft.termTreatments)}
    )`;
  }).join(",\n      ");
  return `do $$
begin
  if exists (
    select 1
    from public.news_articles as article
    join public.news_publications as publication
      on publication.article_id = article.id
    join (
      values
      ${values}
    ) as expected(
      source_key, event_type, stock_codes, focus_statement,
      headline, home_summary, summary_line_1, summary_line_2,
      summary_line_3, term_treatments
    ) on expected.source_key = article.source_key
    where publication.selector_event_type <> expected.event_type
      or publication.reviewer_event_type <> expected.event_type
      or publication.selector_stock_codes <> expected.stock_codes
      or publication.reviewer_stock_codes <> expected.stock_codes
      or publication.focus_statement <> expected.focus_statement
      or publication.headline <> expected.headline
      or publication.home_summary <> expected.home_summary
      or publication.summary_line_1 <> expected.summary_line_1
      or publication.summary_line_2 <> expected.summary_line_2
      or publication.summary_line_3 <> expected.summary_line_3
      or publication.term_treatments <> expected.term_treatments
  ) then
    raise exception 'NEWS_SOURCE_PUBLICATION_OUTPUT_MISMATCH';
  end if;
end;
$$;`;
}

function renderPublicationInsert(items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- ready_for_storage 기사가 없어 news_publications insert를 생략합니다.";
  const values = items.map(({ ready, sourceKey }) => {
    const codes = [...ready.selection.primaryStockIds]
      .map((stockId) => stockId.replace(/^KRX:/u, ""))
      .sort();
    const checks = ready.review.checks;
    return `(
      ${sqlText(sourceKey)}, ${sqlText(ready.selection.eventType)},
      ${sqlTextArray(codes)}, ${sqlText(ready.selection.focusStatement)},
      ${sqlText(ready.draft.headline.text)}, ${sqlText(ready.draft.homeSummary.text)},
      ${sqlText(ready.draft.body[0].text)}, ${sqlText(ready.draft.body[1].text)},
      ${sqlText(ready.draft.body[2].text)}, ${sqlJson(ready.draft.termTreatments)},
      ${checks.allowedScope}, ${checks.primarySubject}, ${checks.directMateriality},
      ${checks.sourceFidelity}, ${checks.focusAlignment},
      ${checks.conciseThreeLineSummary}, ${checks.noIrrelevantDetail},
      ${checks.attributionAndTiming}, ${checks.allTermsEasy},
      ${checks.investmentSafety}, ${checks.noSentimentLabel},
      ${ready.editorAttempts}::smallint
    )`;
  });
  return `insert into public.news_publications (
  article_id, status, selector_event_type, reviewer_event_type,
  selector_stock_codes, reviewer_stock_codes, focus_statement,
  headline, home_summary, summary_line_1, summary_line_2, summary_line_3,
  term_treatments, deterministic_facts_pass,
  review_allowed_scope, review_primary_subject, review_direct_materiality,
  review_source_fidelity, review_focus_alignment,
  review_concise_three_line_summary, review_no_irrelevant_detail,
  review_attribution_and_timing, review_all_terms_easy,
  review_investment_safety, review_no_sentiment_label,
  editor_attempts, ready_at
)
select
  article.id, 'draft', publication.event_type, publication.event_type,
  publication.stock_codes, publication.stock_codes,
  publication.focus_statement, publication.headline, publication.home_summary,
  publication.summary_line_1, publication.summary_line_2,
  publication.summary_line_3, publication.term_treatments,
  true, publication.allowed_scope, publication.primary_subject,
  publication.direct_materiality, publication.source_fidelity,
  publication.focus_alignment, publication.concise_three_line_summary,
  publication.no_irrelevant_detail, publication.attribution_and_timing,
  publication.all_terms_easy, publication.investment_safety,
  publication.no_sentiment_label, publication.editor_attempts, now()
from public.news_articles as article
join (
  values
    ${values.join(",\n    ")}
) as publication(
  source_key, event_type, stock_codes, focus_statement, headline, home_summary,
  summary_line_1, summary_line_2, summary_line_3, term_treatments,
  allowed_scope, primary_subject, direct_materiality, source_fidelity,
  focus_alignment, concise_three_line_summary, no_irrelevant_detail,
  attribution_and_timing, all_terms_easy, investment_safety,
  no_sentiment_label, editor_attempts
) on publication.source_key = article.source_key
on conflict (article_id) do nothing;`;
}

function renderCitationInsert(items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- ready_for_storage 기사가 없어 news_citations insert를 생략합니다.";
  const outputFields = [
    "headline",
    "home_summary",
    "summary_line_1",
    "summary_line_2",
    "summary_line_3",
  ] as const;
  const rows = items.flatMap(({ ready, sourceKey }) =>
    outputFields.flatMap((outputField) =>
      sourceIdsForField(ready, outputField).map((sourceId) =>
        `(${sqlText(sourceKey)}, ${sqlText(outputField)}, ${sqlText(storageSourceId(sourceId))})`,
      ),
    ),
  );
  return `insert into public.news_citations (
  publication_id, article_id, output_field, source_unit_id
)
select publication.id, publication.article_id,
  citation.output_field, citation.source_unit_id
from public.news_publications as publication
join public.news_articles as article on article.id = publication.article_id
join (
  values
    ${rows.join(",\n    ")}
) as citation(source_key, output_field, source_unit_id)
  on citation.source_key = article.source_key
where not exists (
  select 1 from public.news_citations as existing
  where existing.publication_id = publication.id
    and existing.output_field = citation.output_field
    and existing.source_unit_id = citation.source_unit_id
)
on conflict (publication_id, output_field, source_unit_id) do nothing;`;
}

function renderPublish(items: readonly ReadyStorageItem[]) {
  if (items.length === 0) return "-- 통과 기사가 없으므로 publication 상태 전환을 생략합니다.";
  const sourceKeys = items.map((item) => sqlText(item.sourceKey)).join(",\n      ");
  return `update public.news_publications
set status = 'ready_for_storage', updated_at = now()
where status = 'draft'
  and article_id in (
    select id from public.news_articles
    where source_key in (
      ${sourceKeys}
    )
  );

update public.news_publications
set status = 'published', published_at = now(), updated_at = now()
where status = 'ready_for_storage'
  and article_id in (
    select id from public.news_articles
    where source_key in (
      ${sourceKeys}
    )
  );`;
}

export function renderUniverseNewsStorageSql(report: UniverseNewsReport) {
  if (
    report.stockCount !== 51 ||
    report.completedCount !== 51 ||
    report.readyForStorageCount + report.rejectedCount !== 51 ||
    !report.decisionComplete
  ) {
    throw new Error("51종목 판정이 모두 끝난 완전한 보고서만 DB 적재 SQL로 만들 수 있습니다.");
  }
  const technicalFailureCodes = new Set([
    "PIPELINE_EXECUTION_ERROR",
    "ROLE_ERROR",
  ]);
  const criteriaPassed = report.cases.every((item) =>
    item.pipelineResult.status === "ready_for_storage" ||
    item.pipelineResult.reasonCodes.every((code) => !technicalFailureCodes.has(code)),
  );
  if (!criteriaPassed) {
    throw new Error("모델 또는 파이프라인 실행 오류가 남아 있어 DB 적재 SQL을 만들지 않습니다.");
  }
  if (report.readyForStorageCount > 0) {
    throw new Error(
      "주가 연결 설명과 factKey를 저장할 DB 계약이 아직 없어 적재 SQL을 만들지 않습니다.",
    );
  }
  const items = readyStorageItems(report);
  return `-- ${report.runId}
-- JSON/HTML 검수 결과에서 ready_for_storage인 기사만 공개 DB에 적재합니다.
-- rejected 판정의 상세 감사 기록은 report.json에만 남깁니다.
begin;

${renderRunInsert(report, criteriaPassed)}

${renderArticleInsert(report, items)}

${renderExistingPublicationGuard(items)}

${renderSourceUnitInsert(items)}

${renderStockInsert(items)}

${renderPublicationInsert(items)}

${renderCitationInsert(items)}

${renderPublish(items)}

commit;
`;
}
