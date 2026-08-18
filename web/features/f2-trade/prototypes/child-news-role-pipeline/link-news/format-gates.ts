/**
 * 검수 초안 카드가 화면 양식을 지키는지 확인한다.
 *
 * 쓰이는 곳은 `run-link-format-only.ts` 하나뿐이다. 그 실행기는 **대표님이 눈으로 고르실
 * 초안**을 48종목 전부에 대해 만든다. 어떤 기사를 실제로 서비스에 올릴지는 사람이 정하고,
 * 그래서 여기서는 기사 자격(오늘 시황인가·이 회사가 주인공인가·홍보성인가)을 판단하지
 * 않는다. 그 판단은 사람이 HTML 을 보고 한다.
 *
 * 이 파일이 DB 적재 게이트를 대신하지 않는다. 적재 경로(`load-link-news.ts`)는 지금처럼
 * 파이프라인 전체를 통과한 결과만 받고, 스키마의 출고 조건(독립 검수 11개 boolean)도
 * 그대로다. 초안을 그대로 넣으려 하면 DB 가 막는다.
 *
 * 검사하는 것은 둘이다.
 *
 * 1. 화면 양식 — 제목·3줄 길이, 서로 다른 사실, 근거 인용, 사건 유형과 주가 연결의 짝.
 *    기존 카드와 나란히 놓고 비교하려면 같은 틀이어야 한다.
 * 2. 투자 권유 금지 — 양식 문제가 아니라 제품 레드라인이라 초안에도 그대로 적용한다.
 *    아이가 읽을 문장을 만드는 이상 종목 추천·매매 시점·목표가·수익률 전망은 안 된다.
 */

import { filterGeneratedText } from "../../../../../shared/llm/filter";
import type { ChildNewsDraft, MaterialEventType, PriceConnectionKind } from "../contracts";

/** DB 의 `news_publications_event_price_connection_check` 와 같은 짝이다. */
export const PRICE_CONNECTION_BY_EVENT: Record<MaterialEventType, readonly PriceConnectionKind[]> = {
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

export const HEADLINE_MAX_LENGTH = 44;
export const SUMMARY_LINE_MAX_LENGTH = 36;

const compact = (value: string) => value.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "");

/** 화면에 실제로 보이는 글 전부. 금지 표현 검사와 용어 노출 검사가 이 범위를 본다. */
export function visibleText(draft: ChildNewsDraft) {
  return [
    draft.headline.text,
    ...draft.body.map((line) => line.text),
    draft.priceConnection.text,
    ...draft.termTreatments.map((treatment) => treatment.easyText),
  ].join("\n");
}

export function checkDraftFormat(
  draft: ChildNewsDraft,
  eventType: MaterialEventType,
  availableSourceIds: readonly string[],
): string[] {
  const problems: string[] = [];
  const ids = new Set(availableSourceIds);
  const citations = (sourceIds: readonly string[], where: string) => {
    if (sourceIds.length === 0) problems.push(`${where}에 근거 sourceIds 가 없습니다.`);
    const unknown = sourceIds.filter((id) => !ids.has(id));
    if (unknown.length > 0) problems.push(`${where}가 없는 근거 ${unknown.join(", ")} 를 가리킵니다.`);
  };

  const headline = draft.headline.text.trim();
  if (!headline) problems.push("제목이 비었습니다.");
  if (headline.length > HEADLINE_MAX_LENGTH) {
    problems.push(`제목이 ${HEADLINE_MAX_LENGTH}자를 넘습니다(${headline.length}자). 더 줄이세요.`);
  }
  citations(draft.headline.sourceIds, "제목");

  // 짧은 카드와 상세가 같은 제목을 쓴다. 파이프라인도 이 둘을 같은 값으로만 만든다.
  if (draft.homeSummary.text.trim() !== headline) {
    problems.push("homeSummary 는 headline 과 글자까지 같아야 합니다.");
  }

  if (draft.body.length !== 3) {
    problems.push(`요약은 정확히 3줄이어야 합니다(${draft.body.length}줄).`);
  }
  const headlineKey = compact(headline);
  const factKeys = new Set<string>();
  const citationKeys = new Set<string>();
  for (const [index, line] of draft.body.entries()) {
    const where = `${index + 1}번째 줄`;
    const text = line.text.trim();
    if (!text) problems.push(`${where}이 비었습니다.`);
    if (text.length > SUMMARY_LINE_MAX_LENGTH) {
      problems.push(`${where}이 ${SUMMARY_LINE_MAX_LENGTH}자를 넘습니다(${text.length}자). 더 줄이세요.`);
    }
    if (!/^[a-z][a-z0-9_]*$/u.test(line.factKey)) {
      problems.push(`${where}의 factKey 가 snake_case 가 아닙니다(${line.factKey}).`);
    }
    if (factKeys.has(line.factKey)) problems.push(`${where}의 factKey 가 앞줄과 겹칩니다(${line.factKey}).`);
    factKeys.add(line.factKey);
    if (compact(text) === headlineKey) problems.push(`${where}이 제목을 그대로 반복합니다.`);
    citations(line.sourceIds, where);

    // 한 문장을 둘로 쪼갠 줄을 막는다. 2026-08-16 전수 검사에서 33건이 이 형태였다.
    const key = [...line.sourceIds].sort().join("|");
    if (key && citationKeys.has(key)) {
      problems.push(`${where}이 앞줄과 똑같은 근거만 인용합니다. 다른 사실을 쓰세요.`);
    }
    citationKeys.add(key);
  }

  if (!draft.priceConnection.text.trim()) problems.push("주가 연결 설명이 비었습니다.");
  citations(draft.priceConnection.sourceIds, "주가 연결 설명");
  const allowed = PRICE_CONNECTION_BY_EVENT[eventType];
  if (!allowed) {
    problems.push(`모르는 사건 유형입니다(${eventType}).`);
  } else if (!allowed.includes(draft.priceConnection.kind)) {
    problems.push(
      `사건 유형 ${eventType} 에는 priceConnection.kind 가 ${allowed.join(" 또는 ")} 여야 합니다(${draft.priceConnection.kind}).`,
    );
  }

  const terms = new Set<string>();
  const visible = visibleText(draft).normalize("NFKC");
  for (const treatment of draft.termTreatments) {
    const term = treatment.term.trim();
    if (!term) problems.push("용어 풀이에 빈 용어가 있습니다.");
    if (!treatment.easyText.trim()) problems.push(`'${term}' 의 쉬운 설명이 비었습니다.`);
    if (terms.has(term)) problems.push(`용어가 중복됩니다(${term}).`);
    terms.add(term);
    citations(treatment.sourceIds, `용어 '${term}'`);
    if (term && !visible.includes(term.normalize("NFKC"))) {
      problems.push(`'${term}' 은 제목·3줄·주가 연결 어디에도 나오지 않습니다. 화면에 없는 말은 풀지 마세요.`);
    }
  }

  if (!filterGeneratedText(visibleText(draft))) {
    problems.push("추천·매매 시점·목표가·주가 전망으로 읽히는 표현이 있습니다. 사실만 쓰세요.");
  }
  return problems;
}
