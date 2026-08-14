import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { NewsEvaluationInput, NewsSourceArticle } from "./contracts";
import {
  PRICE_LINKED_GOLDEN_CASES,
  type GoldenArticleRef,
  type GoldenReadyCase,
  type PriceLinkedGoldenCase,
} from "./price-linked-news-golden";

const FORBIDDEN_ADVICE = /매수|매도|사야|팔아야|목표가|수익률 전망/u;
const fixturesDir = fileURLToPath(new URL("./evaluation-fixtures/", import.meta.url));

type UniverseFixture = {
  candidates: Array<{ stock: { name: string }; article: NewsSourceArticle }>;
};

export type ResolvedGoldenCase = PriceLinkedGoldenCase & {
  article: NewsSourceArticle;
};

export type PriceLinkedReviewReport = {
  schemaVersion: 1;
  title: string;
  generatedAt: string;
  caseCount: number;
  readyCount: number;
  rejectedCount: number;
  cases: ResolvedGoldenCase[];
};

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(`${fixturesDir}${name}`, "utf8")) as T;
}

function resolveArticle(ref: GoldenArticleRef): NewsSourceArticle {
  if (ref.fixture === "universe-2026-08-13") {
    const input = readJson<UniverseFixture>("selected-company-news-2026-08-13-luna.json");
    const found = input.candidates.find((candidate) => candidate.stock.name === ref.stockName);
    if (!found) throw new Error(`골든 기사 종목을 찾지 못했습니다: ${ref.stockName}`);
    return found.article;
  }

  const fileName = ref.fixture === "daily-2026-08-12"
    ? "latest-economic-news-2026-08-12.json"
    : "latest-economic-news-2026-08-13.json";
  const input = readJson<NewsEvaluationInput>(fileName);
  const found = input.cases.find((item) => item.caseId === ref.caseId);
  if (!found) throw new Error(`골든 기사 케이스를 찾지 못했습니다: ${ref.caseId}`);
  return found.article;
}

function citedIds(item: GoldenReadyCase) {
  return [
    ...item.headline.sourceIds,
    ...item.summaryLines.flatMap((line) => line.sourceIds),
    ...item.priceConnection.sourceIds,
    ...item.termExplanations.flatMap((term) => term.sourceIds),
  ];
}

export function validatePriceLinkedGoldenCases(
  cases: PriceLinkedGoldenCase[] = PRICE_LINKED_GOLDEN_CASES,
): ResolvedGoldenCase[] {
  if (cases.length !== 10) throw new Error(`골든 검수 대상은 정확히 10건이어야 합니다: ${cases.length}`);
  if (new Set(cases.map((item) => item.caseId)).size !== cases.length) {
    throw new Error("골든 케이스 ID가 중복됐습니다.");
  }

  const resolved = cases.map((item) => ({ ...item, article: resolveArticle(item.articleRef) }));
  for (const item of resolved) {
    const sourceIds = new Set(item.article.sourceUnits.map((unit) => unit.id));
    if (item.scope !== item.article.scope) throw new Error(`${item.caseId}: 기사 범위가 다릅니다.`);
    if (item.scope === "company" && item.stockIds.length === 0) {
      throw new Error(`${item.caseId}: 회사 뉴스에 종목 ID가 없습니다.`);
    }
    if (item.scope === "market" && item.stockIds.length !== 0) {
      throw new Error(`${item.caseId}: 시장 뉴스를 종목 화면에 연결하면 안 됩니다.`);
    }
    if (item.status === "rejected") {
      if (item.reasonCodes.length === 0 || item.reasons.length === 0 || item.reasonSourceIds.length === 0) {
        throw new Error(`${item.caseId}: 거부 사유가 없습니다.`);
      }
      if (item.reasonSourceIds.some((id) => !sourceIds.has(id))) {
        throw new Error(`${item.caseId}: 거부 판단에 원문에 없는 근거 ID를 사용했습니다.`);
      }
      continue;
    }

    if (item.summaryLines.length !== 3) throw new Error(`${item.caseId}: 요약은 3줄이어야 합니다.`);
    if (item.headline.text.length > 44) throw new Error(`${item.caseId}: 제목이 너무 깁니다.`);
    if (item.summaryLines.some((line) => line.text.length > 36)) {
      throw new Error(`${item.caseId}: 요약 한 줄이 36자를 넘습니다.`);
    }
    if (new Set(item.summaryLines.map((line) => line.factKey)).size !== 3) {
      throw new Error(`${item.caseId}: 세 줄의 사실 역할이 겹칩니다.`);
    }
    if (new Set(item.summaryLines.map((line) => line.text.trim())).size !== 3) {
      throw new Error(`${item.caseId}: 같은 요약 문장이 반복됩니다.`);
    }
    if (item.summaryLines.some((line) => line.text.trim() === item.headline.text.trim())) {
      throw new Error(`${item.caseId}: 제목을 요약에서 그대로 반복합니다.`);
    }
    if (citedIds(item).some((id) => !sourceIds.has(id))) {
      throw new Error(`${item.caseId}: 원문에 없는 근거 ID를 사용했습니다.`);
    }
    for (const term of item.termExplanations) {
      const sourceText = item.article.sourceUnits
        .filter((unit) => term.sourceIds.includes(unit.id))
        .map((unit) => unit.text)
        .join(" ");
      if (!sourceText.includes(term.term)) {
        throw new Error(`${item.caseId}: 용어 '${term.term}'의 원문 근거가 없습니다.`);
      }
    }
    const visible = [
      item.headline.text,
      ...item.summaryLines.map((line) => line.text),
      item.priceConnection.text,
      ...item.termExplanations.map((term) => term.text),
    ].join(" ");
    if (FORBIDDEN_ADVICE.test(visible)) throw new Error(`${item.caseId}: 투자 조언 표현이 있습니다.`);
  }
  return resolved;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function renderEvidence(article: NewsSourceArticle, ids: string[]) {
  const wanted = new Set(ids);
  return article.sourceUnits
    .filter((unit) => wanted.has(unit.id))
    .map((unit) => `<p><b>${escapeHtml(unit.id)}</b> ${escapeHtml(unit.text)}</p>`)
    .join("");
}

function renderReady(item: ResolvedGoldenCase & GoldenReadyCase) {
  const usedIds = [...new Set(citedIds(item))];
  return `<article class="case ready" data-status="ready" data-event="${escapeHtml(item.eventType)}">
    <div class="case-head"><div><span class="badge">사람 검수 대기</span><h2>${escapeHtml(item.companyNames.join(" · ") || "오늘 국내 시황")}</h2><p>${escapeHtml(item.article.title)}</p></div><a href="${escapeHtml(item.article.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기 ↗</a></div>
    <div class="screens"><section class="phone short"><small>종목 화면 · 한 줄 뉴스</small><h3>${escapeHtml(item.headline.text)}</h3><span>자세히 보기 ›</span></section><section class="phone detail"><small>뉴스 상세 · 같은 제목</small><h3>${escapeHtml(item.headline.text)}</h3><ol>${item.summaryLines.map((line, index) => `<li><b>${index + 1}</b><p>${escapeHtml(line.text)}</p></li>`).join("")}</ol><div class="price-link"><b>왜 주가와 관련 있어?</b><p>${escapeHtml(item.priceConnection.text)}</p><small>${item.priceConnection.basis === "article_fact" ? "기사에서 확인된 연결" : "사건 유형에 따른 교육 설명"}</small></div><div class="terms"><b>기사 속 말 배우기</b>${item.termExplanations.map((term) => `<p><span>${escapeHtml(term.term)}</span>${escapeHtml(term.text)}</p>`).join("")}</div></section></div>
    <details><summary>원문 근거 확인</summary><div class="evidence">${renderEvidence(item.article, usedIds)}</div></details>
  </article>`;
}

function renderRejected(item: ResolvedGoldenCase & Extract<PriceLinkedGoldenCase, { status: "rejected" }>) {
  return `<article class="case rejected" data-status="rejected" data-event="${escapeHtml(item.eventType)}"><div class="case-head"><div><span class="badge">서비스 노출 안 함</span><h2>${escapeHtml(item.companyNames.join(" · "))}</h2><p>${escapeHtml(item.article.title)}</p></div><a href="${escapeHtml(item.article.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기 ↗</a></div><div class="reject-box"><strong>중요해 보여도 아직 확정된 회사 사건이 아니에요.</strong>${item.reasons.map((reason) => `<p>${escapeHtml(reason)}</p>`).join("")}<div>${item.reasonCodes.map((code) => `<code>${escapeHtml(code)}</code>`).join("")}</div></div><details><summary>거부 판단 원문 근거</summary><div class="evidence">${renderEvidence(item.article, item.reasonSourceIds)}</div></details></article>`;
}

export function createPriceLinkedReviewReport(): PriceLinkedReviewReport {
  const cases = validatePriceLinkedGoldenCases();
  return {
    schemaVersion: 1,
    title: "주가와 연결해 쉽게 읽는 어린이 뉴스 · 골든 10건",
    generatedAt: new Date().toISOString(),
    caseCount: cases.length,
    readyCount: cases.filter((item) => item.status === "ready_for_human_review").length,
    rejectedCount: cases.filter((item) => item.status === "rejected").length,
    cases,
  };
}

export function renderPriceLinkedReviewHtml(report: PriceLinkedReviewReport) {
  const cards = report.cases.map((item) => item.status === "ready_for_human_review"
    ? renderReady(item as ResolvedGoldenCase & GoldenReadyCase)
    : renderRejected(item as ResolvedGoldenCase & Extract<PriceLinkedGoldenCase, { status: "rejected" }>)).join("");
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(report.title)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f6fa;color:#14213d;font-family:Pretendard,"Noto Sans KR",sans-serif}.wrap{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:48px 0 80px}.hero{background:#fff;border:1px solid #e5e8f1;border-radius:28px;padding:30px;box-shadow:0 16px 40px rgba(30,45,85,.08)}.eyebrow{color:#d5327a;font-size:13px;font-weight:800}.hero h1{font-size:34px;line-height:1.25;margin:10px 0}.hero p{color:#65708a;line-height:1.7;margin:0;max-width:820px}.stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}.stats span,.badge{background:#eef1f8;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:800}.notice{margin:18px 0 26px;padding:15px 18px;background:#fff8dd;border:1px solid #f0df9d;border-radius:16px;line-height:1.6}.case{background:#fff;border:1px solid #e5e8f1;border-radius:24px;padding:24px;margin-top:18px}.case-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.case-head h2{margin:10px 0 5px;font-size:23px}.case-head p{margin:0;color:#7b8498;line-height:1.5}.case-head a{color:#d5327a;text-decoration:none;font-weight:800;white-space:nowrap}.screens{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:16px;margin-top:20px}.phone{border:1px solid #e3e6ef;border-radius:22px;padding:20px;background:linear-gradient(155deg,#fff,#f7f8fc)}.phone small{color:#9299aa;font-weight:700}.phone h3{font-size:20px;line-height:1.45;margin:12px 0;color:#01185a}.short span{display:inline-block;color:#d5327a;font-weight:800;margin-top:12px}.detail ol{list-style:none;padding:0;margin:18px 0;display:grid;gap:10px}.detail li{display:flex;gap:10px;align-items:flex-start}.detail li>b{display:grid;place-items:center;flex:none;width:24px;height:24px;background:#f5327f;color:#fff;border-radius:50%;font-size:12px}.detail li p{margin:0;line-height:1.55}.price-link{background:#eef4ff;border-radius:16px;padding:15px;margin-top:16px}.price-link p{margin:7px 0;line-height:1.55}.price-link small{color:#66738f}.terms{border-top:1px solid #e7e9f0;margin-top:16px;padding-top:15px}.terms p{display:grid;grid-template-columns:100px 1fr;gap:10px;margin:9px 0;line-height:1.5}.terms span{font-weight:800;color:#d5327a}details{margin-top:18px;border-top:1px solid #e7e9f0;padding-top:15px}summary{cursor:pointer;font-weight:800}.evidence{margin-top:12px;color:#59637a;line-height:1.6}.evidence p{margin:8px 0}.reject-box{background:#fff1f3;border:1px solid #f3cbd2;border-radius:18px;padding:18px;margin-top:20px}.reject-box p{margin:8px 0}.reject-box code{display:inline-block;margin:8px 6px 0 0;padding:5px 8px;background:#fff;border-radius:8px;color:#a42846}.rejected .badge{background:#ffe3e8;color:#a42846}@media(max-width:760px){.wrap{width:min(100% - 20px,1180px);padding-top:20px}.hero{padding:22px}.hero h1{font-size:27px}.case{padding:18px}.case-head{display:block}.case-head a{display:inline-block;margin-top:10px}.screens{grid-template-columns:1fr}.terms p{grid-template-columns:86px 1fr}}
  </style></head><body><main class="wrap"><header class="hero"><span class="eyebrow">PRICE-LINKED CHILD NEWS · GOLDEN REVIEW</span><h1>${escapeHtml(report.title)}</h1><p>실적만 나열하지 않고 생산·합병·파업·배당·해외 판매·최대주주 변경·실제 주가 움직임을 함께 다룹니다. 종목 화면과 상세 화면은 같은 제목을 쓰고, 세 줄은 서로 다른 사실만 설명합니다.</p><div class="stats"><span>전체 ${report.caseCount}건</span><span>사람 검수 대기 ${report.readyCount}건</span><span>의도적 거부 ${report.rejectedCount}건</span></div></header><div class="notice"><b>시장 뉴스 사용 위치</b><br>코스피 시황은 오늘 시장 화면에서만 보여주며, 개별 종목에 회사 뉴스 대신 반복해서 붙이지 않습니다.</div>${cards}</main></body></html>`;
}
