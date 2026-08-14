import type {
  NewsEvaluationRoleAttempt,
  NewsPipelineResult,
  NewsRoleRunner,
  RejectedNews,
} from "./contracts";
import type {
  CollectedStockNewsCandidate,
  UniverseNewsCollection,
} from "./naver-news-collector";
import {
  processNewsCandidate,
  type NewsPipelineDependencies,
} from "./pipeline";

export type CurrentMockNews = {
  sectorKey: string;
  sectorName: string;
  homeSummary: string;
  headline: string;
  body: string[];
  points: string[];
};

export type UniverseNewsCaseResult = {
  stock: CollectedStockNewsCandidate["stock"];
  searchUrl: string;
  inspectedArticleUrls: string[];
  candidateCount: number;
  selectionScore: number;
  selectionSignals: string[];
  inputArticle: CollectedStockNewsCandidate["article"];
  pipelineResult: NewsPipelineResult;
  roleAttempts: NewsEvaluationRoleAttempt[];
};

export type UniverseNewsReport = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  sourceRetrievedAt: string;
  sourceBasis: string;
  generatedAt: string;
  model: "gpt-5.6-luna";
  stockCount: 51;
  completedCount: number;
  readyForStorageCount: number;
  rejectedCount: number;
  decisionComplete: boolean;
  cases: UniverseNewsCaseResult[];
};

export const FIXED_HOME_SUMMARIES: Record<string, string> = {
  semi: "요즘 인공지능 때문에 반도체가 많이 필요해졌대. 공장을 더 짓는다는 이야기도 나왔어.",
  game: "새로 만든 게임을 곧 보여준대. 사람들이 재미있을지 궁금해하고 있어.",
  food: "외국에서도 이 회사 과자랑 라면을 많이 사 간대. 수출이 늘었대.",
  auto: "전기차를 더 많이 만들기로 했대. 새 공장 이야기도 나왔어.",
  enter: "소속 가수가 월드투어를 시작한대. 콘서트 표가 빨리 팔렸대.",
  beauty: "외국 사람들이 한국 화장품을 좋아해서 많이 사 간대.",
  air: "여행 가는 사람이 늘어서 비행기가 꽉 찼대.",
  ship: "외국에서 큰 배를 여러 척 주문했대.",
  defense: "다른 나라에 무기를 수출하기로 했대.",
  energy: "전기차 배터리를 더 많이 만들기로 했대.",
  retail: "편의점이랑 마트에 손님이 조금 늘었대.",
  logi: "택배랑 배로 실어 나르는 짐이 많아졌대.",
  bank: "은행이 번 돈이 지난해보다 늘었대.",
};

const PIPELINE_ROLE_LABELS: Record<string, string> = {
  headline_screener: "제목 1차 선별",
  relevance_selector: "본문 관련성 선별",
  child_news_editor: "어린이용 3줄 편집",
  publication_reviewer: "독립 출고 검수",
};

function targetStockGate(
  result: NewsPipelineResult,
  targetStockId: string,
): NewsPipelineResult {
  if (
    result.status === "ready_for_storage" &&
    !result.selection.primaryStockIds.includes(targetStockId)
  ) {
    const rejected: RejectedNews = {
      status: "rejected",
      articleId: result.article.articleId,
      stage: "reviewer",
      reasonCodes: ["TARGET_STOCK_NOT_PRIMARY"],
      reasons: ["이 기사의 실제 주인공이 이 행의 대상 종목과 일치하지 않습니다."],
      editorAttempts: result.editorAttempts,
    };
    return rejected;
  }
  return result;
}

function buildReport(
  collection: UniverseNewsCollection,
  cases: UniverseNewsCaseResult[],
): UniverseNewsReport {
  return {
    schemaVersion: 1,
    runId: collection.runId,
    runDateKst: collection.runDateKst,
    sourceRetrievedAt: collection.retrievedAt,
    sourceBasis: collection.sourceBasis,
    generatedAt: new Date().toISOString(),
    model: "gpt-5.6-luna",
    stockCount: 51,
    completedCount: cases.length,
    readyForStorageCount: cases.filter(
      (item) => item.pipelineResult.status === "ready_for_storage",
    ).length,
    rejectedCount: cases.filter(
      (item) => item.pipelineResult.status === "rejected",
    ).length,
    decisionComplete:
      cases.length === 51 &&
      cases.every((item) =>
        item.pipelineResult.status === "ready_for_storage" ||
        (item.pipelineResult.reasonCodes.length > 0 && item.pipelineResult.reasons.length > 0),
      ),
    cases,
  };
}

export async function runUniverseNewsEvaluation(
  collection: UniverseNewsCollection,
  dependencies: NewsPipelineDependencies,
  options: {
    existingCases?: UniverseNewsCaseResult[];
    onCaseCompleted?: (report: UniverseNewsReport, latest: UniverseNewsCaseResult) => Promise<void> | void;
  } = {},
) {
  if (collection.candidates.length !== 51) {
    throw new Error(`51종목 수집 결과가 필요합니다. 현재 ${collection.candidates.length}건입니다.`);
  }
  const stockIds = collection.candidates.map((item) => item.stock.stockId);
  if (new Set(stockIds).size !== 51) {
    throw new Error("51종목 수집 결과에 중복 종목이 있습니다.");
  }

  const existingByStock = new Map(
    (options.existingCases ?? []).map((item) => [item.stock.stockId, item]),
  );
  const cases: UniverseNewsCaseResult[] = [];
  for (const candidate of collection.candidates) {
    const existing = existingByStock.get(candidate.stock.stockId);
    if (existing) {
      if (existing.inputArticle.articleId !== candidate.article.articleId) {
        throw new Error(`${candidate.stock.name}: 재개 결과와 입력 기사 ID가 다릅니다.`);
      }
      cases.push(existing);
      continue;
    }

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
          error: error instanceof Error ? error.message : "알 수 없는 역할 실행 오류",
        });
        throw error;
      }
    };

    let pipelineResult: NewsPipelineResult;
    try {
      pipelineResult = targetStockGate(
        await processNewsCandidate(candidate.article, {
          ...dependencies,
          runRole: observedRunRole,
          requiredPrimaryStockId: candidate.stock.stockId,
        }),
        candidate.stock.stockId,
      );
    } catch (error) {
      pipelineResult = {
        status: "rejected",
        articleId: candidate.article.articleId,
        stage: "input",
        reasonCodes: ["PIPELINE_EXECUTION_ERROR"],
        reasons: [error instanceof Error ? error.message : "파이프라인 실행 중 알 수 없는 오류가 발생했습니다."],
        editorAttempts: 0,
      };
    }

    const latest: UniverseNewsCaseResult = {
      stock: candidate.stock,
      searchUrl: candidate.searchUrl,
      inspectedArticleUrls: candidate.inspectedArticleUrls,
      candidateCount: candidate.candidateCount,
      selectionScore: candidate.selectionScore,
      selectionSignals: candidate.selectionSignals,
      inputArticle: candidate.article,
      pipelineResult,
      roleAttempts,
    };
    cases.push(latest);
    await options.onCaseCompleted?.(buildReport(collection, cases), latest);
  }
  return buildReport(collection, cases);
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
    return url.protocol === "http:" || url.protocol === "https:" ? escapeHtml(value) : "#";
  } catch {
    return "#";
  }
}

function formatPublishedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function renderLines(lines: readonly string[]) {
  return lines.map((line, index) => `<li><span>${index + 1}</span><p>${escapeHtml(line)}</p></li>`).join("");
}

function renderMockSide(mock: CurrentMockNews | undefined) {
  if (!mock) return `<div class="empty">이 종목의 기존 목업을 읽지 못했습니다.</div>`;
  return `<section class="side mock-side">
    <div class="side-title"><span>기존 고정 목업</span><small>종목별 사실이 아닌 업종 공통 문구</small></div>
    <div class="short-card"><small>짧은 뉴스 카드</small><p>${escapeHtml(mock.homeSummary)}</p></div>
    <div class="detail-card"><small>자세히 보기</small><h3>${escapeHtml(mock.headline)}</h3><ol>${renderLines(mock.body)}</ol>${mock.points.length > 0 ? `<div class="points">${mock.points.map((point) => `<span>${escapeHtml(point)}</span>`).join("")}</div>` : ""}</div>
  </section>`;
}

function renderRoleAttempts(item: UniverseNewsCaseResult) {
  return item.roleAttempts.map((attempt, index) => {
    const output = attempt.outcome === "returned" ? attempt.response : { error: attempt.error };
    return `<details><summary>${index + 1}. ${escapeHtml(PIPELINE_ROLE_LABELS[attempt.role] ?? attempt.role)} · 추론 ${escapeHtml(attempt.reasoningEffort)} · ${escapeHtml(attempt.outcome)}</summary><pre>${escapeHtml(JSON.stringify(output, null, 2) ?? String(output))}</pre></details>`;
  }).join("");
}

function renderActualSide(item: UniverseNewsCaseResult) {
  const result = item.pipelineResult;
  if (result.status === "rejected") {
    return `<section class="side actual-side rejected-side">
      <div class="side-title"><span>실제 파이프라인</span><small class="reject-badge">거부</small></div>
      <div class="no-card"><strong>서비스 카드 없음</strong><p>검수를 통과하지 못한 기사는 짧은 카드와 자세히 보기에 모두 노출하지 않습니다.</p></div>
      <div class="reject-box"><b>${escapeHtml(result.stage)} 단계</b><div class="codes">${result.reasonCodes.map((code) => `<code>${escapeHtml(code)}</code>`).join("")}</div>${result.reasons.map((reason) => `<p>${escapeHtml(reason)}</p>`).join("")}</div>
    </section>`;
  }
  const lines = result.draft.body.map((line) => line.text);
  return `<section class="side actual-side ready-side">
    <div class="side-title"><span>실제 파이프라인</span><small class="ready-badge">통과</small></div>
    <div class="short-card"><small>짧은 뉴스 카드 · 같은 articleId</small><p>${escapeHtml(result.draft.homeSummary.text)}</p></div>
    <div class="detail-card"><small>자세히 보기 · 같은 articleId</small><h3>${escapeHtml(result.draft.headline.text)}</h3><ol>${renderLines(lines)}</ol>${result.draft.termTreatments.length > 0 ? `<div class="terms"><b>쉬운 말 처리</b>${result.draft.termTreatments.map((term) => `<p><span>${escapeHtml(term.term)}</span> → ${escapeHtml(term.easyText)}</p>`).join("")}</div>` : ""}</div>
  </section>`;
}

function renderCase(item: UniverseNewsCaseResult, mock: CurrentMockNews | undefined) {
  const result = item.pipelineResult;
  const status = result.status === "ready_for_storage" ? "ready" : "rejected";
  const evidence = item.inputArticle.sourceUnits.map((unit) => `<p><b>${escapeHtml(unit.id)}</b> ${escapeHtml(unit.text)}</p>`).join("");
  return `<article class="comparison" data-status="${status}" data-sector="${escapeHtml(item.stock.sector)}" data-search="${escapeHtml(`${item.stock.name} ${item.inputArticle.title}`.toLocaleLowerCase("ko-KR"))}">
    <header><div><span class="market">${escapeHtml(item.stock.market)}</span><h2>${escapeHtml(item.stock.name)}</h2><small>${escapeHtml(item.stock.symbol)} · ${escapeHtml(mock?.sectorName ?? item.stock.sector)}</small></div><span class="result ${status}">${status === "ready" ? "ready_for_storage" : "rejected"}</span></header>
    <div class="candidate"><div><small>실제 검사 기사</small><h3>${escapeHtml(item.inputArticle.title)}</h3><p>${escapeHtml(item.inputArticle.publisher)} · ${escapeHtml(formatPublishedAt(item.inputArticle.publishedAt))}</p></div><a href="${safeHref(item.inputArticle.sourceUrl)}" target="_blank" rel="noreferrer">원문 보기 ↗</a></div>
    <div class="compare-grid">${renderMockSide(mock)}${renderActualSide(item)}</div>
    <details class="audit"><summary>후보 선택·원문 근거·에이전트 판단 보기</summary><div class="audit-content"><section><h4>후보 선택</h4><p>검색 후보 ${item.candidateCount}건 중 점수 ${item.selectionScore}</p><ul>${item.selectionSignals.map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")}</ul><a href="${safeHref(item.searchUrl)}" target="_blank" rel="noreferrer">검색 결과 확인 ↗</a></section><section><h4>원문 근거 문장</h4>${evidence}</section><section><h4>역할별 출력</h4>${renderRoleAttempts(item) || "<p>모델 호출 전에 거부되었습니다.</p>"}</section></div></details>
  </article>`;
}

export function renderUniverseComparisonHtml(
  report: UniverseNewsReport,
  mocks: ReadonlyMap<string, CurrentMockNews>,
) {
  const cases = report.cases.map((item) => renderCase(item, mocks.get(item.stock.sector))).join("");
  const sectors = unique(report.cases.map((item) => item.stock.sector));
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>51종목 뉴스 목업 비교 · ${escapeHtml(report.runDateKst)}</title><style>
  :root{font-family:Pretendard,"Segoe UI","Malgun Gothic",sans-serif;color:#172033;background:#eef0f7;font-synthesis:none}*{box-sizing:border-box}body{margin:0;padding:42px 24px 90px}.wrap{max-width:1260px;margin:0 auto}.hero{background:linear-gradient(135deg,#061b5d,#233c94 62%,#d9347d);border-radius:32px;color:#fff;padding:32px;box-shadow:0 24px 60px #17265e38}.eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffb8d4}.hero h1{font-size:clamp(1.8rem,4vw,3rem);margin:8px 0 12px}.hero p{line-height:1.7;margin:0;color:#e7eafa;max-width:880px}.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.stats span{background:#ffffff1c;border:1px solid #ffffff30;border-radius:999px;padding:8px 13px;font-weight:750}.controls{position:sticky;top:12px;z-index:5;background:#ffffffeb;backdrop-filter:blur(14px);border:1px solid #dfe3ef;border-radius:20px;box-shadow:0 12px 30px #28375e1c;margin:22px 0;padding:14px;display:flex;gap:10px;flex-wrap:wrap}.controls input,.controls select,.controls button{border:1px solid #d9deea;background:#fff;border-radius:12px;color:#172033;font:inherit;min-height:42px;padding:9px 12px}.controls input{flex:1;min-width:220px}.controls button{cursor:pointer;font-weight:750}.controls button.active{background:#061b5d;color:#fff}.comparison{background:#fff;border:1px solid #dfe3ed;border-radius:26px;box-shadow:0 12px 32px #26325213;margin:22px 0;overflow:hidden}.comparison>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 24px;border-bottom:1px solid #edf0f5}.comparison h2{display:inline;font-size:1.35rem;margin:0 8px}.comparison header small{color:#8890a4}.market{background:#edf0fb;color:#16306f;border-radius:999px;font-size:.7rem;font-weight:800;padding:5px 8px}.result{border-radius:999px;font-size:.76rem;font-weight:850;padding:7px 10px}.result.ready,.ready-badge{background:#ddf7e8;color:#17633b}.result.rejected,.reject-badge{background:#fee5e8;color:#a51d34}.candidate{display:flex;align-items:center;justify-content:space-between;gap:18px;background:#f8f9fc;padding:18px 24px}.candidate small,.side-title small,.short-card small,.detail-card>small{color:#8a92a6;font-weight:700}.candidate h3{font-size:1rem;margin:5px 0}.candidate p{color:#737c91;font-size:.82rem;margin:0}.candidate a,.audit a{background:#fff;border:1px solid #d8ddea;border-radius:999px;color:#061b5d;font-size:.82rem;font-weight:800;padding:9px 12px;text-decoration:none;white-space:nowrap}.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}.side{padding:22px 24px 26px}.side+ .side{border-left:1px solid #e4e7ef}.side-title{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#061b5d;font-weight:850;margin-bottom:14px}.side-title small{border-radius:999px;padding:5px 8px}.short-card{background:linear-gradient(150deg,#fff2f7,#f8dce8);border-radius:20px;box-shadow:inset 0 1px #fff,0 10px 24px #6b315618;padding:17px 18px}.short-card p{color:#061b5d;font-size:1rem;font-weight:750;line-height:1.62;margin:7px 0 0}.detail-card{border:1px solid #e5e8f0;border-radius:20px;margin-top:13px;padding:18px}.detail-card h3{color:#061b5d;line-height:1.45;margin:7px 0 15px}.detail-card ol{list-style:none;padding:0;margin:0;display:grid;gap:10px}.detail-card li{display:flex;gap:10px;align-items:flex-start}.detail-card li>span{display:flex;align-items:center;justify-content:center;flex:none;width:23px;height:23px;border-radius:50%;background:#ef5e9c;color:#fff;font-size:.75rem;font-weight:800}.detail-card li p{line-height:1.6;margin:0;color:#4f596e}.points{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}.points span{background:#f0f2f7;border-radius:999px;color:#596278;font-size:.76rem;padding:6px 9px}.terms{border-top:1px solid #edf0f5;margin-top:15px;padding-top:13px}.terms>b{color:#061b5d}.terms p{font-size:.82rem;margin:7px 0}.terms span{font-weight:800;color:#d62f77}.no-card{background:#f3f4f8;border:1px dashed #cbd1df;border-radius:20px;color:#626b7f;padding:24px;text-align:center}.no-card strong{color:#9b1f39}.no-card p{font-size:.84rem;line-height:1.6;margin:7px 0 0}.reject-box{background:#fff6f7;border-radius:18px;margin-top:12px;padding:16px}.reject-box b{color:#9b1f39}.reject-box p{font-size:.86rem;line-height:1.55;margin:8px 0 0}.codes{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.codes code{background:#fee5e8;border-radius:6px;color:#8b1730;padding:4px 6px}.audit{border-top:1px solid #edf0f5}.audit>summary{cursor:pointer;color:#061b5d;font-weight:800;padding:18px 24px}.audit-content{background:#f8f9fc;border-top:1px solid #edf0f5;display:grid;gap:16px;grid-template-columns:repeat(3,1fr);padding:20px 24px}.audit-content section{min-width:0}.audit-content h4{color:#061b5d;margin:0 0 10px}.audit-content p,.audit-content li{font-size:.81rem;line-height:1.55}.audit-content details{background:#fff;border:1px solid #dfe3ed;border-radius:10px;margin:7px 0;padding:9px}.audit-content summary{cursor:pointer;font-size:.8rem;font-weight:700}.audit-content pre{background:#101827;border-radius:8px;color:#e8edf8;font-size:.72rem;max-height:360px;overflow:auto;padding:10px;white-space:pre-wrap;word-break:break-word}.hidden{display:none!important}.empty-run{background:#fff;border-radius:20px;margin-top:20px;padding:30px;text-align:center;color:#697287}
  @media(max-width:850px){body{padding:24px 12px 60px}.hero{border-radius:24px;padding:24px}.controls{top:6px}.compare-grid{grid-template-columns:1fr}.side+.side{border-left:0;border-top:1px solid #e4e7ef}.audit-content{grid-template-columns:1fr}.candidate{align-items:flex-start;flex-direction:column}.candidate a{align-self:stretch;text-align:center}.comparison>header{align-items:flex-start}.result{font-size:.68rem}}
  </style></head><body><div class="wrap"><header class="hero"><span class="eyebrow">51 selected companies · child news QA</span><h1>고정 목업 vs 실제 뉴스 파이프라인</h1><p>왼쪽은 현재 저장소에 남은 업종 공통 목업입니다. 오른쪽은 ${escapeHtml(report.runDateKst)}에 종목별 최신 후보를 실제 원문으로 검사한 결과입니다. 통과 기사는 짧은 카드와 자세히 보기가 같은 articleId·같은 근거를 쓰고, 거부 기사는 서비스에 노출하지 않습니다.</p><div class="stats"><span>완료 ${report.completedCount}/51</span><span>통과 ${report.readyForStorageCount}</span><span>거부 ${report.rejectedCount}</span><span>모델 ${escapeHtml(report.model)}</span></div></header><nav class="controls" aria-label="결과 필터"><input id="search" type="search" placeholder="종목명이나 기사 제목 검색"><button class="active" data-filter="all">전체</button><button data-filter="ready">통과</button><button data-filter="rejected">거부</button><select id="sector"><option value="all">모든 업종</option>${sectors.map((sector) => `<option value="${escapeHtml(sector)}">${escapeHtml(sector)}</option>`).join("")}</select></nav><main id="cases">${cases || `<p class="empty-run">아직 완료된 종목이 없습니다.</p>`}</main></div><script>
  (()=>{let status='all';const cards=[...document.querySelectorAll('.comparison')];const search=document.querySelector('#search');const sector=document.querySelector('#sector');function apply(){const q=search.value.trim().toLocaleLowerCase('ko-KR');for(const card of cards){const statusOk=status==='all'||card.dataset.status===status;const sectorOk=sector.value==='all'||card.dataset.sector===sector.value;const searchOk=!q||card.dataset.search.includes(q);card.classList.toggle('hidden',!(statusOk&&sectorOk&&searchOk));}}document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{status=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.classList.toggle('active',item===button));apply();}));search.addEventListener('input',apply);sector.addEventListener('change',apply);})();
  </script></body></html>`;
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}
