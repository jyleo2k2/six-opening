import type {
  NewsCriterionAssessment,
  NewsEvaluationCase,
  NewsEvaluationCaseResult,
  NewsEvaluationCriterion,
  NewsEvaluationReport,
  NewsEvaluationRoleAttempt,
  NewsPipelineResult,
  NewsRoleRunner,
  ReadyNews,
} from "./contracts";
import { CHILD_NEWS_SUMMARY_LINE_COUNT } from "./contracts";
import {
  processNewsCandidate,
  type NewsPipelineDependencies,
} from "./pipeline";

const ROUTINE_REASON_CODES = new Set(["ROUTINE_OR_PROMOTIONAL"]);
const SUBJECT_REASON_CODES = new Set([
  "COMPANY_NOT_PRIMARY_SUBJECT",
  "NO_SELECTED_COMPANY",
  "PRIMARY_SUBJECT_MISSING_FROM_HOME",
  "REVIEW_primarySubject",
  "REVIEW_DISAGREEMENT",
]);
const CONTEXT_REASON_CODES = new Set([
  "UNSELECTED_FACT_USED",
  "REVIEW_noIrrelevantDetail",
  "REVIEW_focusAlignment",
]);
const SUMMARY_REASON_CODES = new Set([
  "INVALID_DRAFT_SHAPE",
  "REDUNDANT_SUMMARY",
  "REVIEW_conciseThreeLineSummary",
]);
const TERM_REASON_CODES = new Set([
  "INVALID_TERM_AUDIT",
  "UNEXPLAINED_TERM",
  "REVIEW_allTermsEasy",
]);
const FIDELITY_REASON_CODES = new Set([
  "UNSUPPORTED_NUMBER",
  "REVIEW_sourceFidelity",
  "REVIEW_attributionAndTiming",
]);
const SCOPE_REASON_CODES = new Set([
  "OUTSIDE_ALLOWED_SCOPE",
  "NOT_TODAYS_MARKET",
  "NO_DIRECT_MATERIALITY",
  "INSUFFICIENT_EVIDENCE",
  "REVIEW_allowedScope",
  "REVIEW_directMateriality",
]);

function pass(evidence: string): NewsCriterionAssessment {
  return { outcome: "pass", evidence: [evidence] };
}

function fail(evidence: string): NewsCriterionAssessment {
  return { outcome: "fail", evidence: [evidence] };
}

function notApplicable(evidence: string): NewsCriterionAssessment {
  return { outcome: "not_applicable", evidence: [evidence] };
}

function reviewEvidence(result: ReadyNews, check: keyof ReadyNews["review"]["checks"]) {
  return result.review.checks[check]
    ? pass(`독립 출고 검수 ${check}=true`)
    : fail(`독립 출고 검수 ${check}=false`);
}

function assessRejectedCriterion(
  result: Extract<NewsPipelineResult, { status: "rejected" }>,
  expectedCodes: ReadonlySet<string>,
  label: string,
) {
  const matchingCodes = result.reasonCodes.filter((code) => expectedCodes.has(code));
  if (matchingCodes.length > 0) {
    return pass(`${label} 위반을 ${matchingCodes.join(", ")} 코드로 닫힌 실패 처리`);
  }
  return notApplicable(
    `${label} 검증 전에 ${result.stage} 단계에서 ${result.reasonCodes.join(", ") || "사유 없음"}로 종료`,
  );
}

function assessCriteria(
  result: NewsPipelineResult,
): Record<NewsEvaluationCriterion, NewsCriterionAssessment> {
  if (result.status === "ready_for_storage") {
    return {
      allowedScope: reviewEvidence(result, "allowedScope"),
      notRoutineOrPromotional: pass("선별자와 독립 검수자가 직접 중요 사건으로 통과"),
      primarySubjectMatches: reviewEvidence(result, "primarySubject"),
      noUnsupportedContext: reviewEvidence(result, "noIrrelevantDetail"),
      conciseThreeLineSummary: reviewEvidence(
        result,
        "conciseThreeLineSummary",
      ),
      allTermsEasy: reviewEvidence(result, "allTermsEasy"),
      factsMatchSource:
        result.review.checks.sourceFidelity &&
        result.review.checks.attributionAndTiming
          ? pass("독립 검수 sourceFidelity·attributionAndTiming=true")
          : fail("출처 충실성 또는 숫자·날짜·귀속 검수 실패"),
      storageDecisionExplained: pass("모든 게이트 통과로 ready_for_storage"),
    };
  }

  const reasonText = result.reasons.length > 0
    ? result.reasons.join(" | ")
    : "구체적인 reject 설명 없음";
  return {
    allowedScope: assessRejectedCriterion(result, SCOPE_REASON_CODES, "허용 범위"),
    notRoutineOrPromotional: assessRejectedCriterion(
      result,
      ROUTINE_REASON_CODES,
      "일상·채용·행사·사회공헌·홍보",
    ),
    primarySubjectMatches: assessRejectedCriterion(
      result,
      SUBJECT_REASON_CODES,
      "기사와 요약의 주인공",
    ),
    noUnsupportedContext: assessRejectedCriterion(
      result,
      CONTEXT_REASON_CODES,
      "주변 사실 혼입",
    ),
    conciseThreeLineSummary: assessRejectedCriterion(
      result,
      SUMMARY_REASON_CODES,
      "겹치지 않는 3줄 요약",
    ),
    allTermsEasy: assessRejectedCriterion(result, TERM_REASON_CODES, "전 용어 처리"),
    factsMatchSource: assessRejectedCriterion(
      result,
      FIDELITY_REASON_CODES,
      "숫자·날짜·출처 충실성",
    ),
    storageDecisionExplained:
      result.reasonCodes.length > 0 && result.reasons.length > 0
        ? pass(`rejected/${result.stage}: ${reasonText}`)
        : fail("reject 단계·코드·설명이 모두 필요"),
  };
}

function expectationMatched(
  result: NewsPipelineResult,
  evaluationCase: NewsEvaluationCase,
) {
  const { expectation } = evaluationCase;
  if (result.status !== expectation.expectedStatus) return false;
  if (result.status === "ready_for_storage") {
    return expectation.expectedStage === undefined &&
      (expectation.acceptableReasonCodes?.length ?? 0) === 0;
  }
  if (expectation.expectedStage && result.stage !== expectation.expectedStage) {
    return false;
  }
  const acceptableCodes = expectation.acceptableReasonCodes ?? [];
  return acceptableCodes.length === 0 ||
    acceptableCodes.some((code) => result.reasonCodes.includes(code));
}

export function evaluateNewsResult(
  evaluationCase: NewsEvaluationCase,
  result: NewsPipelineResult,
  roleAttempts: NewsEvaluationRoleAttempt[] = [],
): NewsEvaluationCaseResult {
  return {
    caseId: evaluationCase.caseId,
    inputArticle: evaluationCase.article,
    title: evaluationCase.article.title,
    sourceUrl: evaluationCase.article.sourceUrl,
    pipelineStatus: result.status,
    stage: result.status === "ready_for_storage" ? "complete" : result.stage,
    reasonCodes: result.status === "ready_for_storage" ? [] : result.reasonCodes,
    reasons: result.status === "ready_for_storage" ? [] : result.reasons,
    expectation: evaluationCase.expectation,
    expectationMatched: expectationMatched(result, evaluationCase),
    criteria: assessCriteria(result),
    roleAttempts,
    pipelineResult: result,
  };
}

export async function runNewsEvaluation(
  cases: readonly NewsEvaluationCase[],
  dependencies: NewsPipelineDependencies,
  metadata: {
    runId: string;
    runDateKst: string;
    sourceRetrievedAt: string;
    sourceBasis: string;
    generatedAt?: string;
  },
): Promise<NewsEvaluationReport> {
  if (cases.length !== 10) {
    throw new Error(`평가 입력은 정확히 10건이어야 합니다. 현재 ${cases.length}건입니다.`);
  }

  const results: NewsEvaluationCaseResult[] = [];
  for (const evaluationCase of cases) {
    const roleAttempts: NewsEvaluationRoleAttempt[] = [];
    const observedRunRole: NewsRoleRunner = async (request, signal) => {
      try {
        const response = await dependencies.runRole(request, signal);
        roleAttempts.push({
          role: request.role,
          reasoningEffort: request.reasoningEffort,
          outcome: "returned",
          response,
        });
        return response;
      } catch (error) {
        roleAttempts.push({
          role: request.role,
          reasoningEffort: request.reasoningEffort,
          outcome: "error",
          error: error instanceof Error ? error.message : "알 수 없는 역할 오류",
        });
        throw error;
      }
    };
    const pipelineResult = await processNewsCandidate(
      evaluationCase.article,
      { ...dependencies, runRole: observedRunRole },
    );
    results.push(
      evaluateNewsResult(evaluationCase, pipelineResult, roleAttempts),
    );
  }

  const expectationMatchedCount = results.filter(
    (result) => result.expectationMatched,
  ).length;
  const criteriaPassed = results.every(
    (result) => {
      if (
        !result.expectationMatched ||
        result.criteria.storageDecisionExplained.outcome !== "pass"
      ) {
        return false;
      }
      const substantive = Object.entries(result.criteria).filter(
        ([name]) => name !== "storageDecisionExplained",
      );
      return result.pipelineStatus === "ready_for_storage"
        ? substantive.every(([, assessment]) => assessment.outcome === "pass")
        : substantive.some(([, assessment]) => assessment.outcome === "pass");
    },
  );

  return {
    schemaVersion: 1,
    runId: metadata.runId,
    runDateKst: metadata.runDateKst,
    sourceRetrievedAt: metadata.sourceRetrievedAt,
    sourceBasis: metadata.sourceBasis,
    generatedAt: metadata.generatedAt ?? new Date().toISOString(),
    model: "gpt-5.6-luna",
    articleCount: results.length,
    expectationMatchedCount,
    readyForStorageCount: results.filter(
      (result) => result.pipelineStatus === "ready_for_storage",
    ).length,
    rejectedCount: results.filter(
      (result) => result.pipelineStatus === "rejected",
    ).length,
    criteriaPassed,
    cases: results,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? escapeHtml(value)
      : "#";
  } catch {
    return "#";
  }
}

function renderCriterion(name: string, assessment: NewsCriterionAssessment) {
  const labels: Record<string, string> = {
    allowedScope: "허용 범위",
    notRoutineOrPromotional: "일상·홍보 제외",
    primarySubjectMatches: "주인공 일치",
    noUnsupportedContext: "주변 사실 혼입 없음",
    conciseThreeLineSummary: "겹치지 않는 3줄 요약",
    allTermsEasy: "용어 처리",
    factsMatchSource: "숫자·날짜·출처 일치",
    storageDecisionExplained: "최종 판정 설명",
  };
  const mark = assessment.outcome === "pass"
    ? "통과"
    : assessment.outcome === "fail"
      ? "실패"
      : "해당 없음";
  return `<li class="${assessment.outcome}"><strong>${escapeHtml(labels[name] ?? name)}</strong><span>${mark}</span><small>${escapeHtml(assessment.evidence.join(" · "))}</small></li>`;
}

function renderRoleAttempts(item: NewsEvaluationCaseResult) {
  const labels: Record<string, string> = {
    headline_screener: "제목 1차 선별",
    relevance_selector: "본문 관련성 선별",
    child_news_editor: "어린이용 편집",
    publication_reviewer: "독립 출고 검수",
  };
  return item.roleAttempts
    .map((attempt, index) => {
      const value = attempt.outcome === "returned"
        ? attempt.response
        : { error: attempt.error };
      const rendered = JSON.stringify(value, null, 2) ?? String(value);
      return `<details><summary>${index + 1}. ${escapeHtml(labels[attempt.role] ?? attempt.role)} · 추론 ${escapeHtml(attempt.reasoningEffort)} · ${escapeHtml(attempt.outcome)}</summary><pre>${escapeHtml(rendered)}</pre></details>`;
    })
    .join("");
}

function renderSourceUnits(item: NewsEvaluationCaseResult) {
  return item.inputArticle.sourceUnits
    .map(
      (unit) =>
        `<p class="source-unit"><strong>${escapeHtml(unit.id)}</strong> ${escapeHtml(unit.text)}</p>`,
    )
    .join("");
}

function renderServiceNewsCard(
  item: NewsEvaluationCaseResult,
  index: number,
  total: number,
) {
  if (item.pipelineResult.status !== "ready_for_storage") return "";

  const { article, draft } = item.pipelineResult;
  const storyLabel = article.scope === "market"
    ? "오늘의 시장 이야기"
    : "회사 이야기";
  const summaryLines = draft.body
    .map(
      (line, lineIndex) =>
        `<li><span>${lineIndex + 1}</span><p>${escapeHtml(line.text)}</p></li>`,
    )
    .join("");

  return `<article class="service-news-card" data-case-id="${escapeHtml(item.caseId)}">
    <div class="service-topbar"><span>요즘 무슨 일이</span><small>${index + 1} / ${total}</small></div>
    <div class="headline-panel"><span>${escapeHtml(storyLabel)}</span><h2>${escapeHtml(draft.headline.text)}</h2></div>
    <div class="summary-panel"><strong>3줄 요약</strong><ol class="three-line-summary">${summaryLines}</ol><p class="byline">${escapeHtml(article.publisher)} · ${escapeHtml(article.runDateKst)} <a href="${safeHref(article.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기</a></p></div>
  </article>`;
}

function renderEvaluationCase(item: NewsEvaluationCaseResult) {
  const criteria = Object.entries(item.criteria)
    .map(([name, assessment]) => renderCriterion(name, assessment))
    .join("");
  const reason = item.reasons.length > 0
    ? `<p class="reason"><strong>판정 근거</strong> ${escapeHtml(item.reasons.join(" · "))}</p>`
    : "";
  const sourceUnits = renderSourceUnits(item);
  const roleAttempts = renderRoleAttempts(item);

  return `<article class="qa-card"><header><span class="case">${escapeHtml(item.caseId)}</span><span class="status ${item.pipelineStatus}">${escapeHtml(item.pipelineStatus)}</span><span class="match ${item.expectationMatched ? "pass" : "fail"}">${item.expectationMatched ? "기대 일치" : "기대 불일치"}</span></header><h3>${escapeHtml(item.title)}</h3><p><a href="${safeHref(item.sourceUrl)}">원문 출처</a> · 단계 ${escapeHtml(item.stage)}${item.reasonCodes.length ? ` · ${escapeHtml(item.reasonCodes.join(", "))}` : ""}</p><p><strong>사람 기준표</strong> ${escapeHtml(item.expectation.expectedStatus)} — ${escapeHtml(item.expectation.rationale)}</p>${reason}<ul class="criteria">${criteria}</ul><details><summary>원문 근거 문장</summary>${sourceUnits}</details><section class="attempts"><h4>역할별 판단과 초안</h4>${roleAttempts || "<p>모델 호출 없음</p>"}</section></article>`;
}

export function renderNewsEvaluationHtml(report: NewsEvaluationReport) {
  const readyItems = report.cases.filter(
    (item) =>
      item.pipelineResult.status === "ready_for_storage" &&
      item.pipelineResult.draft.body.length === CHILD_NEWS_SUMMARY_LINE_COUNT,
  );
  const serviceCards = readyItems.length > 0
    ? readyItems
      .map((item, index) => renderServiceNewsCard(item, index, readyItems.length))
      .join("")
    : `<p class="empty-state">현재 서비스에 노출할 통과 기사가 없습니다.</p>`;
  const auditCards = report.cases.map(renderEvaluationCase).join("");

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>키움 어린이 뉴스 미리보기 ${escapeHtml(report.runId)}</title><style>
    :root{color-scheme:light;font-family:Pretendard,"Segoe UI","Malgun Gothic",sans-serif;background:#e9e9f0;color:#1a2233}
    *{box-sizing:border-box}body{max-width:1280px;margin:0 auto;padding:40px 24px 80px;-webkit-font-smoothing:antialiased}.page-head{margin:0 auto 28px;max-width:920px;text-align:center}.page-head span{color:#d5327a;font-size:.82rem;font-weight:800}.page-head h1{color:#01185a;font-size:clamp(1.8rem,4vw,2.7rem);margin:8px 0}.page-head p{color:#6e7488;line-height:1.7;margin:0}.service-section-head{display:flex;align-items:end;justify-content:space-between;gap:20px;max-width:920px;margin:0 auto 18px}.service-section-head h2{color:#01185a;font-size:1.2rem;margin:0}.service-section-head p{color:#8e93a8;font-size:.86rem;margin:5px 0 0}.service-section-head strong{background:#f5327f;border-radius:999px;color:#fff;padding:7px 12px;white-space:nowrap}.service-note{align-items:flex-start;background:linear-gradient(157deg,#eff0fa 0%,#e7e8f5 46%,#dfe1f1 100%);border-radius:22px;display:flex;gap:10px;margin:0 auto 20px;max-width:920px;padding:14px 16px}.service-note p{color:#5c6280;font-size:.82rem;line-height:1.65;margin:0}.news-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),410px));gap:24px;justify-content:center}.service-news-card{background:#f5f2f8;border-radius:36px;box-shadow:0 18px 40px rgba(35,25,80,.16);overflow:hidden;padding:18px}.service-topbar{align-items:center;color:#01185a;display:flex;font-size:1rem;font-weight:800;justify-content:space-between;padding:3px 3px 15px}.service-topbar small{color:#a9aec4;font-size:.78rem}.headline-panel{background:linear-gradient(157deg,#fef3f7 0%,#fbe4ec 46%,#f6d5e3 100%);border-radius:28px;box-shadow:0 16px 34px rgba(90,25,70,.13),inset 0 2px 1px rgba(255,255,255,.95),inset 0 -11px 22px rgba(170,80,125,.14);padding:20px}.headline-panel span{color:#d5327a;font-size:.8rem;font-weight:800}.headline-panel h2{color:#01185a;font-size:1.32rem;letter-spacing:-.02em;line-height:1.48;margin:9px 0 0;text-wrap:pretty}.summary-panel{background:linear-gradient(157deg,#fff 0%,#fff 46%,#f6f6fc 100%);border-radius:26px;box-shadow:0 12px 28px rgba(35,25,80,.1),inset 0 2px 1px #fff;margin-top:12px;padding:18px 20px}.summary-panel>strong{color:#01185a;font-size:.9rem}.three-line-summary{display:flex;flex-direction:column;gap:12px;list-style:none;margin:14px 0 0;padding:0}.three-line-summary li{align-items:flex-start;display:flex;gap:10px}.three-line-summary li>span{align-items:center;background:linear-gradient(180deg,#ffa0c6 0%,#f663a1 100%);border-radius:999px;box-shadow:0 4px 8px -2px rgba(214,54,124,.4);color:#fff;display:flex;flex:none;font-size:.78rem;font-weight:800;height:23px;justify-content:center;width:23px}.three-line-summary p{color:#5c6280;display:-webkit-box;font-size:.91rem;font-weight:600;line-height:1.62;margin:0;overflow:hidden;text-wrap:pretty;-webkit-box-orient:vertical;-webkit-line-clamp:2}.byline{border-top:1px solid #eff0f5;color:#a9aec4;font-size:.78rem;margin:16px 0 0;padding-top:13px}.byline a{color:#01185a;font-weight:800;margin-left:6px}.empty-state{background:#fff;border-radius:28px;color:#6e7488;margin:0 auto;max-width:920px;padding:40px;text-align:center}.audit{margin:44px auto 0;max-width:1100px}.audit-shell{background:#fff;border:1px solid #dce2ec;border-radius:18px;box-shadow:0 8px 24px rgba(23,32,51,.08);padding:0}.audit-shell>summary{align-items:center;color:#01185a;cursor:pointer;display:flex;font-weight:800;justify-content:space-between;padding:20px}.audit-shell>summary small{color:#8e93a8;font-weight:600}.audit-body{border-top:1px solid #e2e7ef;padding:20px}.run-meta{color:#536078;line-height:1.7}.run-summary{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.run-summary span,.qa-card header span{background:#e7ebf3;border-radius:999px;padding:6px 10px}.qa-card{background:#fff;border:1px solid #dce2ec;border-radius:16px;box-shadow:0 5px 20px #1720330b;margin:16px 0;padding:20px}.qa-card header{align-items:center;display:flex;gap:8px;flex-wrap:wrap}.qa-card h3{font-size:1.06rem;margin:14px 0 8px}.qa-card h4{font-size:1rem;margin:20px 0 8px}.status.ready_for_storage,.match.pass,.pass span{background:#dff6e8;color:#166534}.status.rejected,.match.fail,.fail span{background:#fee2e2;color:#991b1b}.not_applicable span{background:#edf0f5;color:#536078}.qa-card a{color:#3157c8}.reason{background:#fff7db;border-radius:8px;padding:10px}.criteria{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));list-style:none;padding:0}.criteria li{border:1px solid #e2e7ef;border-radius:10px;display:grid;gap:6px;grid-template-columns:1fr auto;padding:10px}.criteria li span{border-radius:999px;font-size:.78rem;padding:2px 7px}.criteria small{color:#536078;grid-column:1/-1}.qa-card details{border:1px solid #e2e7ef;border-radius:10px;margin:8px 0;padding:10px}.qa-card summary{cursor:pointer;font-weight:650}.source-unit{background:#f7f9fc;border-radius:8px;margin:8px 0;padding:8px}.qa-card pre{background:#101827;border-radius:8px;color:#e7eefc;font-size:.8rem;overflow:auto;padding:12px;white-space:pre-wrap;word-break:break-word}
    @media(max-width:640px){body{padding:28px 14px 60px}.page-head{text-align:left}.service-section-head{align-items:center}.service-news-card{border-radius:30px;padding:14px}.audit-shell>summary{align-items:flex-start;flex-direction:column;gap:6px}.audit-body{padding:14px}}
  </style></head><body><header class="page-head"><span>키움 뉴스를 어린이 눈높이로</span><h1>서비스에 보이는 어린이 뉴스</h1><p>${escapeHtml(report.runDateKst)}에 파이프라인을 모두 통과한 기사만 보여줍니다.</p></header><main><section class="service-output" aria-labelledby="service-news-title"><div class="service-section-head"><div><h2 id="service-news-title">오늘의 통과 뉴스</h2><p>제목 아래에 겹치지 않는 세 가지 핵심만 보여줍니다.</p></div><strong>${readyItems.length}건</strong></div><div class="service-note"><span aria-hidden="true">🐻</span><p>이 뉴스는 무엇을 사거나 팔라고 권하는 글이 아니에요. 오늘 어떤 일이 있었는지만 알려줘요.</p></div><div class="news-grid">${serviceCards}</div></section><section class="audit"><details class="audit-shell"><summary><span>검수 상세 보기</span><small>${report.articleCount}건의 통과·거부 근거와 모델 출력</small></summary><div class="audit-body"><p class="run-meta">${escapeHtml(report.runDateKst)} · ${escapeHtml(report.model)} · ${escapeHtml(report.runId)}<br>출처 스냅샷 ${escapeHtml(report.sourceRetrievedAt)} · ${escapeHtml(report.sourceBasis)}</p><section class="run-summary"><span>기대 일치 ${report.expectationMatchedCount}건</span><span>ready ${report.readyForStorageCount}건</span><span>rejected ${report.rejectedCount}건</span><span>전체 판정 ${report.criteriaPassed ? "통과" : "실패"}</span></section>${auditCards}</div></details></section></main></body></html>`;
}
