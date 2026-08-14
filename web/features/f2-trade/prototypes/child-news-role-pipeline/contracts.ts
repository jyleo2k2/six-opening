export const MATERIAL_EVENT_TYPES = [
  "observed_market_move",
  "earnings",
  "sales_or_production",
  "binding_contract",
  "merger_or_ownership",
  "capital_or_dividend",
  "regulatory_decision",
  "litigation_or_recall",
  "material_operational_risk",
] as const;

export type MaterialEventType = (typeof MATERIAL_EVENT_TYPES)[number];

export const SELECTOR_REJECT_CODES = [
  "OUTSIDE_ALLOWED_SCOPE",
  "NOT_TODAYS_MARKET",
  "NO_SELECTED_COMPANY",
  "COMPANY_NOT_PRIMARY_SUBJECT",
  "NO_DIRECT_MATERIALITY",
  "ROUTINE_OR_PROMOTIONAL",
  "INSUFFICIENT_EVIDENCE",
] as const;

export type SelectorRejectCode = (typeof SELECTOR_REJECT_CODES)[number];
export type NewsArticleScope = "market" | "company";
export type NewsRole =
  | "headline_screener"
  | "relevance_selector"
  | "child_news_editor"
  | "publication_reviewer";
export type NewsReasoningEffort = "medium" | "high" | "max";

export type NewsSourceUnit = {
  id: string;
  text: string;
  originId?: string;
};

export type NewsSourceArticle = {
  articleId: string;
  runDateKst: string;
  scope: NewsArticleScope;
  title: string;
  publisher: string;
  publishedAt: string;
  sourceUrl: string;
  sourceUnits: NewsSourceUnit[];
};

export type NewsUniverseCompany = {
  stockId: string;
  name: string;
  aliases?: string[];
};

export type DifficultTerm = {
  term: string;
  sourceIds: string[];
};

export type HeadlineScreeningExample = {
  title: string;
  decision: "pass" | "reject";
  reasonCodes: SelectorRejectCode[];
  reason: string;
};

export type HeadlineScreenResult = {
  articleId: string;
  decision: "pass" | "reject";
  reasonCodes: SelectorRejectCode[];
  reasons: string[];
};

type SelectorBase = {
  articleId: string;
  primaryStockIds: string[];
  focusStatement: string;
  anchorSourceId: string;
  includedSourceIds: string[];
  excludedSourceIds: string[];
  difficultTerms: DifficultTerm[];
  reasonCodes: SelectorRejectCode[];
  reasons: string[];
};

export type SelectorAccept = SelectorBase & {
  decision: "accept";
  kind: NewsArticleScope;
  eventType: MaterialEventType;
};

export type SelectorReject = SelectorBase & {
  decision: "reject";
  kind: "ineligible";
  eventType: "none";
};

export type SelectorResult = SelectorAccept | SelectorReject;

export type CitedText = {
  text: string;
  sourceIds: string[];
};

export const PRICE_CONNECTION_KINDS = [
  "market_index",
  "observed_price_move",
  "production_capacity",
  "contracted_business",
  "business_combination",
  "operational_continuity",
  "shareholder_return",
  "recurring_sales",
  "ownership_and_credit",
  "business_performance",
  "regulatory_permission",
  "legal_or_recall_cost",
] as const;

export type PriceConnectionKind = (typeof PRICE_CONNECTION_KINDS)[number];

export const NEWS_BODY_ROLES = [
  "key_detail",
  "business_detail",
  "context",
] as const;

export const CHILD_NEWS_SUMMARY_LINE_COUNT = 3;
export const CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH = 36;

export type NewsBodyRole = (typeof NEWS_BODY_ROLES)[number];

export type ChildNewsDraft = {
  articleId: string;
  headline: CitedText;
  /** DB 하위 호환 필드. 파서가 headline과 같은 값으로만 만든다. */
  homeSummary: CitedText;
  body: Array<CitedText & { role: NewsBodyRole; factKey: string }>;
  priceConnection: CitedText & {
    kind: PriceConnectionKind;
    basis: "article_fact" | "event_education";
  };
  termTreatments: Array<{
    term: string;
    treatment: "explained";
    easyText: string;
    sourceIds: string[];
  }>;
};

export const REVIEW_CHECK_NAMES = [
  "allowedScope",
  "primarySubject",
  "directMateriality",
  "sourceFidelity",
  "focusAlignment",
  "conciseThreeLineSummary",
  "noIrrelevantDetail",
  "attributionAndTiming",
  "allTermsEasy",
  "sameHeadlineAcrossSurfaces",
  "distinctSummaryFacts",
  "priceConnectionGrounded",
  "termExplanationCoverage",
  "investmentSafety",
  "noSentimentLabel",
] as const;

export type ReviewCheckName = (typeof REVIEW_CHECK_NAMES)[number];

export type PublicationReview = {
  articleId: string;
  independentKind: NewsArticleScope | "ineligible";
  primaryStockIds: string[];
  eventType: MaterialEventType | "none";
  focusStatement: string;
  anchorSourceIds: string[];
  checks: Record<ReviewCheckName, boolean>;
  issues: Array<{
    code: string;
    explanation: string;
    sourceIds: string[];
  }>;
};

export type HeadlineScreenRoleRequest = {
  role: "headline_screener";
  reasoningEffort: "max";
  article: Pick<
    NewsSourceArticle,
    "articleId" | "runDateKst" | "scope" | "title" | "publisher" | "publishedAt"
  >;
  universe: NewsUniverseCompany[];
  examples: HeadlineScreeningExample[];
};

export type SelectorRoleRequest = {
  role: "relevance_selector";
  reasoningEffort: "max";
  article: NewsSourceArticle;
  universe: NewsUniverseCompany[];
};

export type EditorRoleRequest = {
  role: "child_news_editor";
  reasoningEffort: "max";
  article: Pick<
    NewsSourceArticle,
    "articleId" | "runDateKst" | "scope" | "publisher" | "publishedAt"
  >;
  selection: Pick<
    SelectorAccept,
    | "kind"
    | "primaryStockIds"
    | "eventType"
    | "focusStatement"
    | "anchorSourceId"
    | "difficultTerms"
  >;
  selectedCompanies: NewsUniverseCompany[];
  sourceUnits: NewsSourceUnit[];
  examples: ChildNewsStyleExample[];
  revisionReasons: string[];
};

export type ChildNewsStyleExample = {
  scope: NewsArticleScope;
  eventType: MaterialEventType;
  headline: string;
  summaryLines: Array<{ factKey: string; text: string }>;
  priceConnection: {
    kind: PriceConnectionKind;
    basis: "article_fact" | "event_education";
    text: string;
  };
  termExplanations: Array<{ term: string; easyText: string }>;
};

export type ReviewerRoleRequest = {
  role: "publication_reviewer";
  reasoningEffort: "max";
  article: NewsSourceArticle;
  universe: NewsUniverseCompany[];
  draft: ChildNewsDraft;
};

export type NewsRoleRequest =
  | HeadlineScreenRoleRequest
  | SelectorRoleRequest
  | EditorRoleRequest
  | ReviewerRoleRequest;

export type NewsRoleRunner = (
  request: NewsRoleRequest,
  signal: AbortSignal,
) => Promise<unknown>;

export type NewsPipelineStage =
  | "input"
  | "prefilter"
  | "selector"
  | "editor"
  | "reviewer";

export type RejectedNews = {
  status: "rejected";
  articleId: string;
  stage: NewsPipelineStage;
  reasonCodes: string[];
  reasons: string[];
  editorAttempts: number;
};

export type ReadyNews = {
  status: "ready_for_storage";
  article: NewsSourceArticle;
  selection: SelectorAccept;
  draft: ChildNewsDraft;
  review: PublicationReview;
  editorAttempts: number;
};

export type NewsPipelineResult = ReadyNews | RejectedNews;

export const NEWS_EVALUATION_CRITERIA = [
  "allowedScope",
  "notRoutineOrPromotional",
  "primarySubjectMatches",
  "noUnsupportedContext",
  "conciseThreeLineSummary",
  "allTermsEasy",
  "factsMatchSource",
  "storageDecisionExplained",
] as const;

export type NewsEvaluationCriterion =
  (typeof NEWS_EVALUATION_CRITERIA)[number];

export type NewsEvaluationExpectation = {
  expectedStatus: NewsPipelineResult["status"];
  expectedStage?: NewsPipelineStage;
  acceptableReasonCodes?: string[];
  rationale: string;
};

export type NewsEvaluationCase = {
  caseId: string;
  article: NewsSourceArticle;
  expectation: NewsEvaluationExpectation;
};

export type NewsEvaluationInput = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  retrievedAt: string;
  sourceBasis: string;
  cases: NewsEvaluationCase[];
};

export type NewsCriterionAssessment = {
  outcome: "pass" | "fail" | "not_applicable";
  evidence: string[];
};

export type NewsEvaluationRoleAttempt = {
  role: NewsRole;
  reasoningEffort: NewsReasoningEffort;
  outcome: "returned" | "error";
  response?: unknown;
  error?: string;
};

export type NewsEvaluationCaseResult = {
  caseId: string;
  inputArticle: NewsSourceArticle;
  title: string;
  sourceUrl: string;
  pipelineStatus: NewsPipelineResult["status"];
  stage: NewsPipelineStage | "complete";
  reasonCodes: string[];
  reasons: string[];
  expectation: NewsEvaluationExpectation;
  expectationMatched: boolean;
  criteria: Record<NewsEvaluationCriterion, NewsCriterionAssessment>;
  roleAttempts: NewsEvaluationRoleAttempt[];
  pipelineResult: NewsPipelineResult;
};

export type NewsEvaluationReport = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  sourceRetrievedAt: string;
  sourceBasis: string;
  generatedAt: string;
  model: "gpt-5.6-luna";
  articleCount: number;
  expectationMatchedCount: number;
  readyForStorageCount: number;
  rejectedCount: number;
  criteriaPassed: boolean;
  cases: NewsEvaluationCaseResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  return value as string[];
}

function parseDifficultTerms(value: unknown) {
  if (!Array.isArray(value)) return null;
  const terms: DifficultTerm[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const term = readString(item.term);
    const sourceIds = readStringArray(item.sourceIds);
    if (term === null || sourceIds === null) return null;
    terms.push({ term, sourceIds });
  }
  return terms;
}

export function parseHeadlineScreenResult(
  value: unknown,
): HeadlineScreenResult | null {
  if (!isRecord(value)) return null;
  const articleId = readString(value.articleId);
  const reasons = readStringArray(value.reasons);
  const rawReasonCodes = readStringArray(value.reasonCodes);
  if (
    articleId === null ||
    reasons === null ||
    rawReasonCodes === null ||
    (value.decision !== "pass" && value.decision !== "reject") ||
    !rawReasonCodes.every((code) =>
      SELECTOR_REJECT_CODES.includes(code as SelectorRejectCode),
    )
  ) {
    return null;
  }
  return {
    articleId,
    decision: value.decision,
    reasonCodes: rawReasonCodes as SelectorRejectCode[],
    reasons,
  };
}

export function parseSelectorResult(value: unknown): SelectorResult | null {
  if (!isRecord(value)) return null;
  const articleId = readString(value.articleId);
  const primaryStockIds = readStringArray(value.primaryStockIds);
  const focusStatement = readString(value.focusStatement);
  const anchorSourceId = readString(value.anchorSourceId);
  const includedSourceIds = readStringArray(value.includedSourceIds);
  const excludedSourceIds = readStringArray(value.excludedSourceIds);
  const difficultTerms = parseDifficultTerms(value.difficultTerms);
  const reasons = readStringArray(value.reasons);
  const rawReasonCodes = readStringArray(value.reasonCodes);

  if (
    articleId === null ||
    primaryStockIds === null ||
    focusStatement === null ||
    anchorSourceId === null ||
    includedSourceIds === null ||
    excludedSourceIds === null ||
    difficultTerms === null ||
    reasons === null ||
    rawReasonCodes === null ||
    !rawReasonCodes.every((code) =>
      SELECTOR_REJECT_CODES.includes(code as SelectorRejectCode),
    )
  ) {
    return null;
  }

  const base: SelectorBase = {
    articleId,
    primaryStockIds,
    focusStatement,
    anchorSourceId,
    includedSourceIds,
    excludedSourceIds,
    difficultTerms,
    reasonCodes: rawReasonCodes as SelectorRejectCode[],
    reasons,
  };

  if (
    value.decision === "accept" &&
    isOneOf(value.kind, ["market", "company"] as const) &&
    isOneOf(value.eventType, MATERIAL_EVENT_TYPES)
  ) {
    return {
      ...base,
      decision: "accept",
      kind: value.kind,
      eventType: value.eventType,
    };
  }

  if (
    value.decision === "reject" &&
    value.kind === "ineligible" &&
    value.eventType === "none"
  ) {
    return {
      ...base,
      decision: "reject",
      kind: "ineligible",
      eventType: "none",
    };
  }

  return null;
}

function parseCitedText(value: unknown): CitedText | null {
  if (!isRecord(value)) return null;
  const text = readString(value.text);
  const sourceIds = readStringArray(value.sourceIds);
  return text === null || sourceIds === null ? null : { text, sourceIds };
}

export function parseChildNewsDraft(value: unknown): ChildNewsDraft | null {
  if (!isRecord(value)) return null;
  const articleId = readString(value.articleId);
  const headline = parseCitedText(value.headline);
  const priceConnection = parseCitedText(value.priceConnection);
  if (
    articleId === null ||
    headline === null ||
    priceConnection === null ||
    !isRecord(value.priceConnection) ||
    !isOneOf(value.priceConnection.kind, PRICE_CONNECTION_KINDS) ||
    !isOneOf(value.priceConnection.basis, ["article_fact", "event_education"] as const) ||
    !Array.isArray(value.body) ||
    !Array.isArray(value.termTreatments)
  ) {
    return null;
  }

  const body: ChildNewsDraft["body"] = [];
  for (const item of value.body) {
    const cited = parseCitedText(item);
    const factKey = isRecord(item) ? readString(item.factKey) : null;
    if (
      cited === null ||
      !isRecord(item) ||
      factKey === null ||
      !isOneOf(item.role, NEWS_BODY_ROLES)
    ) {
      return null;
    }
    body.push({ ...cited, role: item.role, factKey });
  }

  const termTreatments: ChildNewsDraft["termTreatments"] = [];
  for (const item of value.termTreatments) {
    if (!isRecord(item)) return null;
    const term = readString(item.term);
    const easyText = readString(item.easyText);
    const sourceIds = readStringArray(item.sourceIds);
    if (
      term === null ||
      easyText === null ||
      sourceIds === null ||
      item.treatment !== "explained"
    ) {
      return null;
    }
    termTreatments.push({
      term,
      easyText,
      treatment: item.treatment,
      sourceIds,
    });
  }

  return {
    articleId,
    headline,
    homeSummary: { ...headline, sourceIds: [...headline.sourceIds] },
    body,
    priceConnection: {
      ...priceConnection,
      kind: value.priceConnection.kind,
      basis: value.priceConnection.basis,
    },
    termTreatments,
  };
}

export function parsePublicationReview(value: unknown): PublicationReview | null {
  if (!isRecord(value) || !isRecord(value.checks) || !Array.isArray(value.issues)) {
    return null;
  }

  const articleId = readString(value.articleId);
  const primaryStockIds = readStringArray(value.primaryStockIds);
  const focusStatement = readString(value.focusStatement);
  const anchorSourceIds = readStringArray(value.anchorSourceIds);
  if (
    articleId === null ||
    primaryStockIds === null ||
    focusStatement === null ||
    anchorSourceIds === null ||
    !isOneOf(value.independentKind, ["market", "company", "ineligible"] as const) ||
    !isOneOf(value.eventType, [...MATERIAL_EVENT_TYPES, "none"] as const)
  ) {
    return null;
  }

  const checks = {} as Record<ReviewCheckName, boolean>;
  for (const name of REVIEW_CHECK_NAMES) {
    if (typeof value.checks[name] !== "boolean") return null;
    checks[name] = value.checks[name];
  }

  const issues: PublicationReview["issues"] = [];
  for (const item of value.issues) {
    if (!isRecord(item)) return null;
    const code = readString(item.code);
    const explanation = readString(item.explanation);
    const sourceIds = readStringArray(item.sourceIds);
    if (code === null || explanation === null || sourceIds === null) return null;
    issues.push({ code, explanation, sourceIds });
  }

  return {
    articleId,
    independentKind: value.independentKind,
    primaryStockIds,
    eventType: value.eventType,
    focusStatement,
    anchorSourceIds,
    checks,
    issues,
  };
}
