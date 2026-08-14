import { filterGeneratedText } from "../../../../shared/llm/filter";
import {
  CHILD_NEWS_SUMMARY_LINE_COUNT,
  CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH,
  NEWS_BODY_ROLES,
  REVIEW_CHECK_NAMES,
  type ChildNewsDraft,
  type EditorRoleRequest,
  type HeadlineScreenResult,
  type MaterialEventType,
  type NewsPipelineResult,
  type NewsRoleRequest,
  type NewsRoleRunner,
  type NewsSourceArticle,
  type NewsSourceUnit,
  type NewsUniverseCompany,
  type PublicationReview,
  type PriceConnectionKind,
  type ReadyNews,
  type RejectedNews,
  type SelectorAccept,
  type SelectorReject,
  parseChildNewsDraft,
  parseHeadlineScreenResult,
  parsePublicationReview,
  parseSelectorResult,
} from "./contracts";
import { HEADLINE_SCREENING_EXAMPLES } from "./headline-screening-examples";
import { PRICE_LINKED_EDITOR_EXAMPLES } from "./price-linked-news-golden";

const DEFAULT_ROLE_TIMEOUT_MS = 90_000;
const MAX_SOURCE_UNIT_LENGTH = 700;
const MAX_EDITOR_ATTEMPTS = 2;

const EVENT_PRICE_CONNECTION_KINDS: Record<MaterialEventType, readonly PriceConnectionKind[]> = {
  observed_market_move: ["market_index", "observed_price_move"],
  earnings: ["business_performance"],
  sales_or_production: ["production_capacity", "recurring_sales", "business_performance"],
  binding_contract: ["contracted_business"],
  merger_or_ownership: ["business_combination", "ownership_and_credit"],
  capital_or_dividend: ["shareholder_return", "ownership_and_credit"],
  regulatory_decision: ["regulatory_permission"],
  litigation_or_recall: ["legal_or_recall_cost", "operational_continuity"],
  material_operational_risk: ["operational_continuity"],
};

type GateIssue = { code: string; message: string };

export type NewsPipelineDependencies = {
  runRole: NewsRoleRunner;
  universe: NewsUniverseCompany[];
  timeoutMs?: number;
  maxEditorAttempts?: 1 | 2;
  requiredPrimaryStockId?: string;
};

function normalizeText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
}

function compactText(value: string) {
  return normalizeText(value).replace(/[^\p{L}\p{N}]+/gu, "");
}

function compactSummaryClaim(value: string) {
  return compactText(
    normalizeText(value)
      .replace(/[.!?。！？]+$/gu, "")
      .replace(/(?:습니다|입니다|이에요|예요|어요|아요|했어|였어|이야|야|다)$/u, ""),
  );
}

function hasRedundantSummaryLines(lines: readonly string[]) {
  const claims = lines.map(compactSummaryClaim);
  return claims.some((claim, index) =>
    claims.slice(index + 1).some((other) => {
      if (claim === other) return true;
      const shorter = claim.length <= other.length ? claim : other;
      const longer = claim.length > other.length ? claim : other;
      return shorter.length >= 12 && longer.includes(shorter);
    })
  );
}

function hasRepeatedMarketMove(
  lines: readonly string[],
  universe: readonly NewsUniverseCompany[],
) {
  const marketMove = /(?:오르|올랐|상승|내리|내렸|하락|회복)/u;
  const subjects = unique([
    "코스피",
    "코스닥",
    ...universe.flatMap(companyNames),
  ]);
  const lineSubjects = lines.map((line) => {
    const normalized = compactText(line);
    return subjects.filter((subject) =>
      normalized.includes(compactText(subject)),
    );
  });

  return lines.some((line, index) =>
    marketMove.test(line) &&
    lines.slice(index + 1).some((other, offset) =>
      marketMove.test(other) &&
      lineSubjects[index].some((subject) =>
        lineSubjects[index + offset + 1].includes(subject),
      )
    )
  );
}

function isEasyKospiExplanation(value: string) {
  const normalized = normalizeText(value);
  return /(?:국내|우리나라)/u.test(normalized) &&
    normalized.includes("주식시장") &&
    /(?:대표|나타내|보여)/u.test(normalized) &&
    normalized.includes("숫자");
}

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function sameSet(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function termAppearsInVisibleText(text: string, term: string) {
  const normalizedTerm = term.normalize("NFKC").trim();
  if (!normalizedTerm) return false;
  const particle = /[\p{L}\p{N}]$/u.test(normalizedTerm)
    ? "(?:은|는|이|가|을|를|에|의|로|으로|와|과|도|만|에서)?"
    : "";
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(normalizedTerm)}${particle}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(text.normalize("NFKC"));
}

function isFamiliarNumericNotation(term: string) {
  const normalized = term.normalize("NFKC").replace(/\s+/gu, "");
  return /^(?:%|억원|조원|[1-4]분기|\d[\d,.]*%|\d[\d,.]*(?:억|조)원)$/u.test(
    normalized,
  );
}

function splitLongPiece(text: string) {
  if (text.length <= MAX_SOURCE_UNIT_LENGTH) return [text];

  const chunks: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/u)) {
    if (word.length > MAX_SOURCE_UNIT_LENGTH) {
      if (current) chunks.push(current);
      current = "";
      for (let index = 0; index < word.length; index += MAX_SOURCE_UNIT_LENGTH) {
        chunks.push(word.slice(index, index + MAX_SOURCE_UNIT_LENGTH));
      }
      continue;
    }
    const next = current ? `${current} ${word}` : word;
    if (next.length > MAX_SOURCE_UNIT_LENGTH) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitSourceText(text: string) {
  return text
    .replace(/\r/gu, "")
    .split(/\n+/u)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?。！？])\s+/u))
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap(splitLongPiece);
}

/** 기존 S3 본문 덩어리도 선별자가 문장 단위로 포함·제외할 수 있게 쪼갠다. */
export function atomizeSourceUnits(
  sourceUnits: readonly NewsSourceUnit[],
): NewsSourceUnit[] {
  return sourceUnits.flatMap((unit) => {
    const parts = splitSourceText(unit.text);
    if (parts.length <= 1) {
      return [{ ...unit, text: parts[0] ?? "" }];
    }
    return parts.map((text, index) => ({
      id: `${unit.id}.${index + 1}`,
      originId: unit.originId ?? unit.id,
      text,
    }));
  });
}

function validateArticle(article: NewsSourceArticle): GateIssue[] {
  const issues: GateIssue[] = [];
  const required: Array<[string, string]> = [
    ["articleId", article.articleId],
    ["runDateKst", article.runDateKst],
    ["title", article.title],
    ["publisher", article.publisher],
    ["publishedAt", article.publishedAt],
    ["sourceUrl", article.sourceUrl],
  ];
  for (const [name, value] of required) {
    if (!value.trim()) issues.push({ code: "INVALID_INPUT", message: `${name}이 비어 있습니다.` });
  }
  if (article.scope !== "market" && article.scope !== "company") {
    issues.push({ code: "INVALID_INPUT", message: "scope는 market 또는 company여야 합니다." });
  }
  if (article.sourceUnits.length === 0) {
    issues.push({ code: "INVALID_INPUT", message: "원문 근거 문장이 없습니다." });
  }
  const ids = article.sourceUnits.map((unit) => unit.id);
  if (hasDuplicates(ids)) {
    issues.push({ code: "INVALID_INPUT", message: "원문 근거 id가 중복됩니다." });
  }
  for (const unit of article.sourceUnits) {
    if (!unit.id.trim() || !unit.text.trim()) {
      issues.push({ code: "INVALID_INPUT", message: "비어 있는 원문 근거가 있습니다." });
      break;
    }
  }
  return issues;
}

function validateUniverse(universe: readonly NewsUniverseCompany[]): GateIssue[] {
  if (universe.length !== 51) {
    return [
      {
        code: "INVALID_INPUT",
        message: `선정 기업 목록은 정확히 51개여야 합니다. 현재 ${universe.length}개입니다.`,
      },
    ];
  }
  const stockIds = universe.map((company) => company.stockId);
  if (hasDuplicates(stockIds)) {
    return [{ code: "INVALID_INPUT", message: "선정 기업 stockId가 중복됩니다." }];
  }
  if (
    universe.some(
      (company) => !company.stockId.trim() || !company.name.trim(),
    )
  ) {
    return [{ code: "INVALID_INPUT", message: "선정 기업 식별자나 이름이 비어 있습니다." }];
  }
  return [];
}

function reject(
  articleId: string,
  stage: RejectedNews["stage"],
  issues: readonly GateIssue[],
  editorAttempts = 0,
): RejectedNews {
  return {
    status: "rejected",
    articleId,
    stage,
    reasonCodes: unique(issues.map((issue) => issue.code)),
    reasons: issues.map((issue) => issue.message),
    editorAttempts,
  };
}

function validateHeadlineScreen(
  result: HeadlineScreenResult,
  article: NewsSourceArticle,
): GateIssue[] {
  const issues: GateIssue[] = [];
  if (result.articleId !== article.articleId) {
    issues.push({
      code: "INVALID_ROLE_OUTPUT",
      message: "제목 선별 결과의 articleId가 다릅니다.",
    });
  }
  if (result.reasons.length === 0 || result.reasons.some((reason) => !reason.trim())) {
    issues.push({
      code: "INVALID_ROLE_OUTPUT",
      message: "제목 선별의 구체적인 판단 이유가 없습니다.",
    });
  }
  if (
    (result.decision === "pass" && result.reasonCodes.length > 0) ||
    (result.decision === "reject" && result.reasonCodes.length === 0)
  ) {
    issues.push({
      code: "INVALID_ROLE_OUTPUT",
      message: "제목 선별의 결정과 사유 코드가 일치하지 않습니다.",
    });
  }
  return issues;
}

function validateSelectorReject(
  result: SelectorReject,
  article: NewsSourceArticle,
): GateIssue[] {
  const issues: GateIssue[] = [];
  if (result.articleId !== article.articleId) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "선별 결과의 articleId가 다릅니다." });
  }
  if (
    result.primaryStockIds.length > 0 ||
    result.includedSourceIds.length > 0 ||
    result.difficultTerms.length > 0 ||
    result.focusStatement.trim() ||
    result.anchorSourceId.trim()
  ) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "탈락 결과에 통과용 필드가 남아 있습니다." });
  }
  if (result.reasonCodes.length === 0 || result.reasons.length === 0) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "탈락 근거가 없습니다." });
  }
  return issues;
}

function companyNames(company: NewsUniverseCompany) {
  return unique([company.name, ...(company.aliases ?? [])]).filter(
    (name) => compactText(name).length >= 2,
  );
}

function textMentionsCompany(text: string, company: NewsUniverseCompany) {
  const normalized = compactText(text);
  return companyNames(company).some((name) =>
    normalized.includes(compactText(name)),
  );
}

function validateSelectorAccept(
  result: SelectorAccept,
  article: NewsSourceArticle,
  universe: readonly NewsUniverseCompany[],
): GateIssue[] {
  const issues: GateIssue[] = [];
  const sourceIds = article.sourceUnits.map((unit) => unit.id);
  const sourceIdSet = new Set(sourceIds);
  const universeById = new Map(universe.map((company) => [company.stockId, company]));

  if (result.articleId !== article.articleId) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "선별 결과의 articleId가 다릅니다." });
  }
  if (result.kind !== article.scope) {
    issues.push({ code: "OUTSIDE_ALLOWED_SCOPE", message: "후보 범위와 선별 범위가 일치하지 않습니다." });
  }
  if (!result.focusStatement.trim()) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "중심 사건이 비어 있습니다." });
  }
  if (
    result.includedSourceIds.length === 0 ||
    hasDuplicates(result.includedSourceIds) ||
    hasDuplicates(result.excludedSourceIds) ||
    result.includedSourceIds.some((id) => !sourceIdSet.has(id)) ||
    result.excludedSourceIds.some((id) => !sourceIdSet.has(id)) ||
    !sameSet(
      unique([...result.includedSourceIds, ...result.excludedSourceIds]),
      sourceIds,
    ) ||
    result.includedSourceIds.some((id) => result.excludedSourceIds.includes(id))
  ) {
    issues.push({
      code: "INVALID_SOURCE_PARTITION",
      message: "모든 근거 문장은 포함 또는 제외 중 정확히 한 곳에 있어야 합니다.",
    });
  }
  if (!result.includedSourceIds.includes(result.anchorSourceId)) {
    issues.push({ code: "INVALID_ANCHOR", message: "중심 근거가 포함 근거에 없습니다." });
  }
  if (result.reasonCodes.length > 0) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "통과 결과에 탈락 코드가 남아 있습니다." });
  }

  if (result.kind === "market") {
    if (
      result.eventType !== "observed_market_move" ||
      result.primaryStockIds.length > 0
    ) {
      issues.push({
        code: "NOT_TODAYS_MARKET",
        message: "시장 뉴스는 관측된 오늘 시황이어야 하며 개별 종목을 주체로 두지 않습니다.",
      });
    }
  } else {
    if (
      result.eventType === "observed_market_move" ||
      result.primaryStockIds.length === 0 ||
      hasDuplicates(result.primaryStockIds) ||
      result.primaryStockIds.some((id) => !universeById.has(id))
    ) {
      issues.push({
        code: "NO_SELECTED_COMPANY",
        message: "회사 뉴스의 실제 주체는 선정 기업 목록에 있어야 합니다.",
      });
    } else {
      const lead = [article.title, ...article.sourceUnits.slice(0, 2).map((unit) => unit.text)].join(" ");
      if (
        !result.primaryStockIds.some((id) => {
          const company = universeById.get(id);
          return company ? textMentionsCompany(lead, company) : false;
        })
      ) {
        issues.push({
          code: "COMPANY_NOT_PRIMARY_SUBJECT",
          message: "선정 기업이 제목이나 기사 앞부분의 주체로 확인되지 않습니다.",
        });
      }
      const isCollectiveArticle = /(?:빅\s*\d+|\d+\s*사|업계|주요\s*(?:기업|회사)|비교)/u.test(
        article.title,
      );
      const fullArticleText = [article.title, ...article.sourceUnits.map((unit) => unit.text)].join(" ");
      const mentionedStockIds = universe
        .filter((company) => textMentionsCompany(fullArticleText, company))
        .map((company) => company.stockId);
      if (
        isCollectiveArticle &&
        (result.primaryStockIds.length === 1 ||
          (mentionedStockIds.length > 1 &&
            !sameSet(mentionedStockIds, result.primaryStockIds)))
      ) {
        issues.push({
          code: "COMPANY_NOT_PRIMARY_SUBJECT",
          message: "여러 회사를 함께 비교한 기사를 한 회사 뉴스로 잘라낼 수 없습니다.",
        });
      }
    }
  }

  const includedSet = new Set(result.includedSourceIds);
  const unitById = new Map(article.sourceUnits.map((unit) => [unit.id, unit]));
  const normalizedTerms = result.difficultTerms.map((item) => compactText(item.term));
  if (normalizedTerms.some((term) => !term) || hasDuplicates(normalizedTerms)) {
    issues.push({ code: "INVALID_TERM_AUDIT", message: "어려운 용어가 비어 있거나 중복됩니다." });
  }
  for (const item of result.difficultTerms) {
    if (
      item.sourceIds.length === 0 ||
      item.sourceIds.some((id) => !includedSet.has(id)) ||
      !item.sourceIds.some((id) => {
        const unit = unitById.get(id);
        return unit ? compactText(unit.text).includes(compactText(item.term)) : false;
      })
    ) {
      issues.push({
        code: "INVALID_TERM_AUDIT",
        message: `어려운 용어 '${item.term}'의 포함 근거가 올바르지 않습니다.`,
      });
    }
  }

  return issues;
}

function extractNumbers(text: string) {
  return text.match(/\d[\d,.]*%?/gu)?.map((value) => {
    const [integer, fraction] = value.replace(/[,%]/gu, "").split(".");
    const normalizedInteger = integer.replace(/^0+(?=\d)/u, "");
    if (fraction === undefined) return normalizedInteger;
    const normalizedFraction = fraction.replace(/0+$/u, "");
    return normalizedFraction
      ? `${normalizedInteger}.${normalizedFraction}`
      : normalizedInteger;
  }) ?? [];
}

function visibleDraftText(draft: ChildNewsDraft, includeTerms = true) {
  return [
    draft.headline.text,
    ...draft.body.map((block) => block.text),
    draft.priceConnection.text,
    ...(includeTerms
      ? draft.termTreatments.flatMap((item) => [item.term, item.easyText])
      : []),
  ].join("\n");
}

function validateDraft(
  draft: ChildNewsDraft,
  article: NewsSourceArticle,
  selection: SelectorAccept,
  universe: readonly NewsUniverseCompany[],
): GateIssue[] {
  const issues: GateIssue[] = [];
  const allowedIds = new Set(selection.includedSourceIds);
  const citedBlocks = [draft.headline, ...draft.body, draft.priceConnection];
  const visibleText = visibleDraftText(draft);

  if (draft.articleId !== article.articleId) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "편집 결과의 articleId가 다릅니다." });
  }
  if (!draft.headline.text.trim() || draft.headline.text.length > 44) {
    issues.push({ code: "INVALID_DRAFT_SHAPE", message: "제목은 1~44자여야 합니다." });
  }
  if (
    draft.homeSummary.text !== draft.headline.text ||
    !sameSet(draft.homeSummary.sourceIds, draft.headline.sourceIds)
  ) {
    issues.push({
      code: "HEADLINE_SURFACE_MISMATCH",
      message: "짧은 카드와 상세 화면은 같은 제목을 사용해야 합니다.",
    });
  }
  if (
    draft.body.length !== CHILD_NEWS_SUMMARY_LINE_COUNT ||
    draft.body[0]?.role !== "key_detail" ||
    draft.body.some((block, index) => block.role !== NEWS_BODY_ROLES[index]) ||
    draft.body.some(
      (block) =>
        !/^[a-z][a-z0-9_]*$/u.test(block.factKey) ||
        !block.text.trim() ||
        block.text.length > CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH,
    )
  ) {
    issues.push({
      code: "INVALID_DRAFT_SHAPE",
      message: `본문은 key_detail, business_detail, context 순서의 3줄 요약이어야 하며 각 줄은 ${CHILD_NEWS_SUMMARY_LINE_MAX_LENGTH}자 이하여야 합니다.`,
    });
  }
  const summaryLines = draft.body.map((block) => block.text);
  if (
    new Set(draft.body.map((block) => block.factKey)).size !== CHILD_NEWS_SUMMARY_LINE_COUNT ||
    hasRedundantSummaryLines(summaryLines) ||
    summaryLines.some((line) => compactSummaryClaim(line) === compactSummaryClaim(draft.headline.text)) ||
    (selection.kind === "market" &&
      hasRepeatedMarketMove(summaryLines, universe))
  ) {
    issues.push({
      code: "REDUNDANT_SUMMARY",
      message: "제목과 3줄 요약은 서로 다른 사실 역할을 가져야 합니다.",
    });
  }
  if (!draft.headline.sourceIds.includes(selection.anchorSourceId)) {
    issues.push({
      code: "ANCHOR_MISSING_FROM_HOME",
      message: "제목은 중심 사건의 근거를 포함해야 합니다.",
    });
  }
  if (
    citedBlocks.some(
      (block) =>
        block.sourceIds.length === 0 ||
        hasDuplicates(block.sourceIds) ||
        block.sourceIds.some((id) => !allowedIds.has(id)),
    )
    || draft.termTreatments.some(
      (item) =>
        item.sourceIds.length === 0 ||
        hasDuplicates(item.sourceIds) ||
        item.sourceIds.some((id) => !allowedIds.has(id)),
    )
  ) {
    issues.push({
      code: "UNSELECTED_FACT_USED",
      message: "편집자가 선별되지 않은 원문 사실을 사용했습니다.",
    });
  }

  if (selection.kind === "company") {
    const universeById = new Map(universe.map((company) => [company.stockId, company]));
    const lead = draft.headline.text;
    if (
      selection.primaryStockIds.some((id) => {
        const company = universeById.get(id);
        return !company || !textMentionsCompany(lead, company);
      })
    ) {
      issues.push({
        code: "PRIMARY_SUBJECT_MISSING_FROM_HOME",
        message: "제목에 모든 중심 기업이 분명히 드러나야 합니다.",
      });
    }
  }

  const expectedTerms = selection.difficultTerms.map((item) => compactText(item.term));
  const treatedTerms = draft.termTreatments.map((item) => compactText(item.term));
  if (
    hasDuplicates(treatedTerms) ||
    expectedTerms.some((term) => !treatedTerms.includes(term)) ||
    draft.termTreatments.some((item) => !item.easyText.trim())
  ) {
    issues.push({
      code: "UNEXPLAINED_TERM",
      message: "선별된 어려운 용어를 모두 쉬운 말로 처리하지 않았습니다.",
    });
  }
  for (const treatment of draft.termTreatments) {
    const selectedTerm = selection.difficultTerms.find(
      (item) => compactText(item.term) === compactText(treatment.term),
    );
    const citedSourceText = article.sourceUnits
      .filter((unit) => treatment.sourceIds.includes(unit.id))
      .map((unit) => unit.text)
      .join(" ");
    if (
      selectedTerm
        ? !sameSet(selectedTerm.sourceIds, treatment.sourceIds)
        : !termAppearsInVisibleText(citedSourceText, treatment.term)
    ) {
      issues.push({
        code: "UNEXPLAINED_TERM",
        message: `'${treatment.term}'의 풀이 근거가 선별 결과와 다릅니다.`,
      });
    }
  }

  const selectedSourceText = article.sourceUnits
    .filter((unit) => allowedIds.has(unit.id))
    .map((unit) => unit.text)
    .join(" ");
  if (termAppearsInVisibleText(selectedSourceText, "코스피")) {
    const kospiTreatment = draft.termTreatments.find(
      (item) => compactText(item.term) === compactText("코스피"),
    );
    if (
      !termAppearsInVisibleText(visibleDraftText(draft, false), "코스피") ||
      kospiTreatment?.treatment !== "explained" ||
      !isEasyKospiExplanation(kospiTreatment.easyText)
    ) {
      issues.push({
        code: "UNEXPLAINED_TERM",
        message: "코스피는 이름을 유지하고 별도 풀이에서 국내 주식시장을 대표하는 숫자라고 설명해야 합니다.",
      });
    }
  }
  if (!EVENT_PRICE_CONNECTION_KINDS[selection.eventType].includes(draft.priceConnection.kind)) {
    issues.push({
      code: "INVALID_PRICE_CONNECTION",
      message: "주가 연결 설명의 유형이 중심 사건과 맞지 않습니다.",
    });
  }
  const allowedNumbers = new Set(
    extractNumbers(
      `${selectedSourceText} ${article.runDateKst} ${article.publishedAt}`,
    ),
  );
  if (extractNumbers(visibleText).some((number) => !allowedNumbers.has(number))) {
    issues.push({
      code: "UNSUPPORTED_NUMBER",
      message: "선별 근거에 없는 숫자가 노출문에 추가됐습니다.",
    });
  }

  // 공통 챗 필터는 관측된 "주가 상승/하락"도 전망으로 본다. 오늘 시황일 때만
  // 해당 과거 변동 표현을 중립 표식으로 바꿔 공통 필터에 넣고, 원문은 아래
  // 뉴스 전용 규칙으로 미래 방향·조언을 별도 차단한다.
  const commonFilterInput =
    selection.eventType === "observed_market_move"
      ? visibleText.replace(
          /((?:주가|가격|수익률).{0,12})(?:상승|하락|올랐|내렸)/gu,
          "$1변동",
        )
      : visibleText;
  if (!filterGeneratedText(commonFilterInput)) {
    issues.push({
      code: "INVESTMENT_SAFETY",
      message: "공통 LLM 금지 표현 필터를 통과하지 못했습니다.",
    });
  }
  if (
    /(?:호재|악재|긍정적|부정적|(?:매수|매도|보유).{0,12}(?:추천|해야|하자|시점|기회)|(?:사라|팔아라|팔아야|팔자|추천해)|목표가|(?:수익률|주가|가격).{0,16}(?:예상|전망|오를\s*것|내릴\s*것|상승할|하락할)|(?:앞으로|향후|전망|예상|가능성).{0,20}(?:상승|하락|오를|내릴)|(?:상승|하락|오를|내릴).{0,8}(?:전망|예상|가능성))/u.test(
      visibleText,
    )
  ) {
    issues.push({
      code: "SENTIMENT_OR_ADVICE",
      message: "긍정·부정 라벨, 투자 지시 또는 주가 전망이 포함됐습니다.",
    });
  }

  return issues;
}

function assessReview(
  review: PublicationReview,
  article: NewsSourceArticle,
  selection: SelectorAccept,
  universe: readonly NewsUniverseCompany[],
) {
  const issues: GateIssue[] = [];
  const sourceIds = new Set(article.sourceUnits.map((unit) => unit.id));
  const universeIds = new Set(universe.map((company) => company.stockId));
  let semanticFailure = false;

  if (review.articleId !== article.articleId) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "검수 결과의 articleId가 다릅니다." });
    semanticFailure = true;
  }
  if (
    review.primaryStockIds.some((id) => !universeIds.has(id)) ||
    review.anchorSourceIds.length === 0 ||
    review.anchorSourceIds.some((id) => !sourceIds.has(id)) ||
    review.issues.some((issue) => issue.sourceIds.some((id) => !sourceIds.has(id)))
  ) {
    issues.push({ code: "INVALID_ROLE_OUTPUT", message: "검수 결과가 존재하지 않는 id를 참조합니다." });
    semanticFailure = true;
  }
  for (const check of REVIEW_CHECK_NAMES) {
    if (!review.checks[check]) {
      issues.push({ code: `REVIEW_${check}`, message: `독립 검수 실패: ${check}` });
    }
  }
  issues.push(
    ...review.issues.map((issue) => ({
      code: issue.code || "REVIEW_ISSUE",
      message: issue.explanation,
    })),
  );

  if (
    review.independentKind !== selection.kind ||
    review.eventType !== selection.eventType ||
    !sameSet(review.primaryStockIds, selection.primaryStockIds) ||
    !review.anchorSourceIds.some((id) =>
      selection.includedSourceIds.includes(id),
    )
  ) {
    issues.push({
      code: "REVIEW_DISAGREEMENT",
      message: "선별자와 독립 검수자가 기사 주체 또는 중심 사건에 합의하지 못했습니다.",
    });
    semanticFailure = true;
  }
  if (
    !review.checks.allowedScope ||
    !review.checks.primarySubject ||
    !review.checks.directMateriality
  ) {
    semanticFailure = true;
  }

  return { passed: issues.length === 0, semanticFailure, issues };
}

async function invokeRole(
  runRole: NewsRoleRunner,
  request: NewsRoleRequest,
  timeoutMs: number,
) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, rejectPromise) => {
    timeout = setTimeout(() => {
      controller.abort();
      rejectPromise(new Error(`${request.role} timed out`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([runRole(request, controller.signal), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function editorRequest(
  article: NewsSourceArticle,
  selection: SelectorAccept,
  universe: readonly NewsUniverseCompany[],
  revisionReasons: string[],
): EditorRoleRequest {
  const selectedIds = new Set(selection.primaryStockIds);
  const includedIds = new Set(selection.includedSourceIds);
  return {
    role: "child_news_editor",
    reasoningEffort: "max",
    article: {
      articleId: article.articleId,
      runDateKst: article.runDateKst,
      scope: article.scope,
      publisher: article.publisher,
      publishedAt: article.publishedAt,
    },
    selection: {
      kind: selection.kind,
      primaryStockIds: selection.primaryStockIds,
      eventType: selection.eventType,
      focusStatement: selection.focusStatement,
      anchorSourceId: selection.anchorSourceId,
      difficultTerms: selection.difficultTerms,
    },
    selectedCompanies: universe.filter((company) => selectedIds.has(company.stockId)),
    sourceUnits: article.sourceUnits.filter((unit) => includedIds.has(unit.id)),
    examples: PRICE_LINKED_EDITOR_EXAMPLES,
    revisionReasons,
  };
}

export async function processNewsCandidate(
  inputArticle: NewsSourceArticle,
  dependencies: NewsPipelineDependencies,
): Promise<NewsPipelineResult> {
  const article = {
    ...inputArticle,
    sourceUnits: atomizeSourceUnits(inputArticle.sourceUnits),
  };
  const inputIssues = [
    ...validateArticle(article),
    ...validateUniverse(dependencies.universe),
  ];
  if (inputIssues.length > 0) {
    return reject(article.articleId, "input", inputIssues);
  }

  const timeoutMs = dependencies.timeoutMs ?? DEFAULT_ROLE_TIMEOUT_MS;
  let rawHeadlineScreen: unknown;
  try {
    rawHeadlineScreen = await invokeRole(
      dependencies.runRole,
      {
        role: "headline_screener",
        reasoningEffort: "max",
        article: {
          articleId: article.articleId,
          runDateKst: article.runDateKst,
          scope: article.scope,
          title: article.title,
          publisher: article.publisher,
          publishedAt: article.publishedAt,
        },
        universe: dependencies.universe,
        examples: HEADLINE_SCREENING_EXAMPLES,
      },
      timeoutMs,
    );
  } catch (error) {
    return reject(article.articleId, "prefilter", [
      {
        code: "ROLE_ERROR",
        message: error instanceof Error ? error.message : "제목 선별 호출에 실패했습니다.",
      },
    ]);
  }

  const headlineScreen = parseHeadlineScreenResult(rawHeadlineScreen);
  if (!headlineScreen) {
    return reject(article.articleId, "prefilter", [
      { code: "INVALID_ROLE_OUTPUT", message: "제목 선별 결과 스키마가 올바르지 않습니다." },
    ]);
  }
  const headlineIssues = validateHeadlineScreen(headlineScreen, article);
  if (headlineIssues.length > 0) {
    return reject(article.articleId, "prefilter", headlineIssues);
  }
  if (headlineScreen.decision === "reject") {
    return reject(
      article.articleId,
      "prefilter",
      headlineScreen.reasons.map((message, index) => ({
        code:
          headlineScreen.reasonCodes[index] ??
          headlineScreen.reasonCodes[0] ??
          "HEADLINE_REJECTED",
        message,
      })),
    );
  }

  let rawSelection: unknown;
  try {
    rawSelection = await invokeRole(
      dependencies.runRole,
      {
        role: "relevance_selector",
        reasoningEffort: "max",
        article,
        universe: dependencies.universe,
      },
      timeoutMs,
    );
  } catch (error) {
    return reject(article.articleId, "selector", [
      {
        code: "ROLE_ERROR",
        message: error instanceof Error ? error.message : "관련성 선별 호출에 실패했습니다.",
      },
    ]);
  }

  const parsedSelection = parseSelectorResult(rawSelection);
  if (!parsedSelection) {
    return reject(article.articleId, "selector", [
      { code: "INVALID_ROLE_OUTPUT", message: "관련성 선별 결과 스키마가 올바르지 않습니다." },
    ]);
  }
  if (parsedSelection.decision === "reject") {
    const selection = parsedSelection;
    const invalidReject = validateSelectorReject(selection, article);
    if (invalidReject.length > 0) {
      return reject(article.articleId, "selector", invalidReject);
    }
    return reject(
      article.articleId,
      "selector",
      selection.reasons.map((message, index) => ({
        code: selection.reasonCodes[index] ?? selection.reasonCodes[0] ?? "SELECTOR_REJECTED",
        message,
      })),
    );
  }

  const selection: SelectorAccept = {
    ...parsedSelection,
    difficultTerms: parsedSelection.difficultTerms.filter(
      (item) => !isFamiliarNumericNotation(item.term),
    ),
  };

  const selectionIssues = validateSelectorAccept(
    selection,
    article,
    dependencies.universe,
  );
  if (selectionIssues.length > 0) {
    return reject(article.articleId, "selector", selectionIssues);
  }
  if (
    dependencies.requiredPrimaryStockId &&
    !selection.primaryStockIds.includes(dependencies.requiredPrimaryStockId)
  ) {
    return reject(article.articleId, "selector", [
      {
        code: "TARGET_STOCK_NOT_PRIMARY",
        message: "이 기사의 실제 주인공이 이 행의 대상 종목과 일치하지 않습니다.",
      },
    ]);
  }

  const maxAttempts = Math.min(
    dependencies.maxEditorAttempts ?? MAX_EDITOR_ATTEMPTS,
    MAX_EDITOR_ATTEMPTS,
  );
  let revisionReasons: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let rawDraft: unknown;
    try {
      rawDraft = await invokeRole(
        dependencies.runRole,
        editorRequest(
          article,
          selection,
          dependencies.universe,
          revisionReasons,
        ),
        timeoutMs,
      );
    } catch (error) {
      return reject(
        article.articleId,
        "editor",
        [
          {
            code: "ROLE_ERROR",
            message: error instanceof Error ? error.message : "어린이용 편집 호출에 실패했습니다.",
          },
        ],
        attempt,
      );
    }

    const draft = parseChildNewsDraft(rawDraft);
    if (!draft) {
      return reject(
        article.articleId,
        "editor",
        [{ code: "INVALID_ROLE_OUTPUT", message: "어린이용 편집 결과 스키마가 올바르지 않습니다." }],
        attempt,
      );
    }

    const draftIssues = validateDraft(
      draft,
      article,
      selection,
      dependencies.universe,
    );
    if (draftIssues.length > 0) {
      if (attempt < maxAttempts) {
        revisionReasons = draftIssues.map((issue) => issue.message);
        continue;
      }
      return reject(article.articleId, "editor", draftIssues, attempt);
    }

    let rawReview: unknown;
    try {
      rawReview = await invokeRole(
        dependencies.runRole,
        {
          role: "publication_reviewer",
          reasoningEffort: "max",
          article,
          universe: dependencies.universe,
          draft,
        },
        timeoutMs,
      );
    } catch (error) {
      return reject(
        article.articleId,
        "reviewer",
        [
          {
            code: "ROLE_ERROR",
            message: error instanceof Error ? error.message : "독립 출고 검수 호출에 실패했습니다.",
          },
        ],
        attempt,
      );
    }

    const review = parsePublicationReview(rawReview);
    if (!review) {
      return reject(
        article.articleId,
        "reviewer",
        [{ code: "INVALID_ROLE_OUTPUT", message: "독립 검수 결과 스키마가 올바르지 않습니다." }],
        attempt,
      );
    }
    const assessment = assessReview(
      review,
      article,
      selection,
      dependencies.universe,
    );
    if (assessment.passed) {
      return {
        status: "ready_for_storage",
        article,
        selection,
        draft,
        review,
        editorAttempts: attempt,
      };
    }
    if (assessment.semanticFailure || attempt >= maxAttempts) {
      return reject(article.articleId, "reviewer", assessment.issues, attempt);
    }
    revisionReasons = assessment.issues.map((issue) => issue.message);
  }

  return reject(article.articleId, "editor", [
    { code: "EDITOR_ATTEMPTS_EXHAUSTED", message: "편집 재시도 횟수를 모두 사용했습니다." },
  ], maxAttempts);
}

export async function runNewsPipeline(
  candidates: readonly NewsSourceArticle[],
  dependencies: NewsPipelineDependencies & { maxReady?: number },
) {
  const readyForStorage: ReadyNews[] = [];
  const rejected: RejectedNews[] = [];
  const maxReady = Math.max(1, Math.floor(dependencies.maxReady ?? 10));
  let nextIndex = 0;

  for (; nextIndex < candidates.length; nextIndex += 1) {
    if (readyForStorage.length >= maxReady) break;
    const result = await processNewsCandidate(candidates[nextIndex], dependencies);
    if (result.status === "ready_for_storage") readyForStorage.push(result);
    else rejected.push(result);
  }

  return {
    readyForStorage,
    rejected,
    unprocessedArticleIds: candidates.slice(nextIndex).map((article) => article.articleId),
  };
}

export function isReadyForStorage(
  result: NewsPipelineResult,
): result is ReadyNews {
  return result.status === "ready_for_storage";
}
