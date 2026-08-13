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
  const mark = assessment.outcome === "pass"
    ? "통과"
    : assessment.outcome === "fail"
      ? "실패"
      : "해당 없음";
  return `<li class="${assessment.outcome}"><strong>${escapeHtml(name)}</strong><span>${mark}</span><small>${escapeHtml(assessment.evidence.join(" · "))}</small></li>`;
}

export function renderNewsEvaluationHtml(report: NewsEvaluationReport) {
  const cards = report.cases
    .map((item) => {
      const criteria = Object.entries(item.criteria)
        .map(([name, assessment]) => renderCriterion(name, assessment))
        .join("");
      const reason = item.reasons.length > 0
        ? `<p class="reason"><strong>판정 근거</strong> ${escapeHtml(item.reasons.join(" · "))}</p>`
        : "";
      return `<article><header><span class="case">${escapeHtml(item.caseId)}</span><span class="status ${item.pipelineStatus}">${escapeHtml(item.pipelineStatus)}</span><span class="match ${item.expectationMatched ? "pass" : "fail"}">${item.expectationMatched ? "기대 일치" : "기대 불일치"}</span></header><h2>${escapeHtml(item.title)}</h2><p><a href="${safeHref(item.sourceUrl)}">원문 출처</a> · 단계 ${escapeHtml(item.stage)}${item.reasonCodes.length ? ` · ${escapeHtml(item.reasonCodes.join(", "))}` : ""}</p><p><strong>사람 기준표</strong> ${escapeHtml(item.expectation.rationale)}</p>${reason}<ul>${criteria}</ul></article>`;
    })
    .join("");

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>어린이 뉴스 품질 평가 ${escapeHtml(report.runId)}</title><style>:root{color-scheme:light;font-family:system-ui,sans-serif;background:#f5f7fb;color:#172033}body{max-width:1100px;margin:0 auto;padding:32px 20px 80px}h1{margin-bottom:8px}.summary{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.summary span,header span{border-radius:999px;padding:6px 10px;background:#e7ebf3}article{background:#fff;border:1px solid #dce2ec;border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 5px 20px #1720330b}article header{display:flex;gap:8px;align-items:center}.status.ready_for_storage,.match.pass,.pass span{background:#dff6e8;color:#166534}.status.rejected,.match.fail,.fail span{background:#fee2e2;color:#991b1b}.not_applicable span{background:#edf0f5;color:#536078}h2{font-size:1.12rem;margin:14px 0 8px}a{color:#3157c8}.reason{background:#fff7db;padding:10px;border-radius:8px}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:8px}li{border:1px solid #e2e7ef;border-radius:10px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:6px}li span{padding:2px 7px;border-radius:999px;font-size:.78rem}small{grid-column:1/-1;color:#536078}</style></head><body><h1>어린이 뉴스 품질 평가</h1><p>${escapeHtml(report.runDateKst)} · ${escapeHtml(report.model)} · ${escapeHtml(report.runId)}</p><p>출처 스냅샷 ${escapeHtml(report.sourceRetrievedAt)} · ${escapeHtml(report.sourceBasis)}</p><section class="summary"><span>10건 중 기대 일치 ${report.expectationMatchedCount}건</span><span>ready ${report.readyForStorageCount}건</span><span>rejected ${report.rejectedCount}건</span><span>전체 판정 ${report.criteriaPassed ? "통과" : "실패"}</span></section>${cards}</body></html>`;
}
