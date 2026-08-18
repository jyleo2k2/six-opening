/**
 * 대표님 검수용 비교 화면. 종목마다 한 줄에 세 칸을 둔다.
 *
 *   왼쪽·중앙 = 지금 DB 에 게시된 기존 뉴스(최신 두 건)
 *   오른쪽    = 이번 링크로 만든 신규 카드
 *
 * 카드 모양은 실제 화면(`web/features/f0-home/NewsScreen.tsx`)을 그대로 옮겼다. 검수는
 * 아이가 볼 것과 같은 모양에서 해야 의미가 있다 — 제목, 3줄 요약, 용어 최대 3개,
 * 언론사·날짜, 원문 보기까지 같은 자리에 둔다.
 *
 * 기존 뉴스는 지우지 않는다(대표님 결정). `/api/news` 가 종목별 최신 10건 중 하나를
 * 무작위로 고르므로, 신규가 들어가면 기존과 번갈아 나온다. 왼쪽·중앙에 기존을 함께
 * 두는 이유가 그것이다 — 셋이 한 종목에서 돌아가며 나올 카드다.
 *
 * 두 실행기의 결과를 모두 그린다.
 *
 * - `run-link-format-only` (기본): 48종목 전부 카드. 기사 자격은 사람이 이 화면에서 고른다.
 * - `run-link-pipeline`: 기사 자격까지 기계가 보고 통과·거부를 낸다. 거부는 사유를 보여 준다.
 *
 * 실행:
 *   cd web
 *   node features/f2-trade/prototypes/child-news-role-pipeline/link-news/render-review-html.cjs \
 *     --report features/f2-trade/prototypes/child-news-role-pipeline/reports/supplied-link-news-2026-08-18/format-report.json
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { loadDevelopmentEnvironment } from "../../../../../app/api/dev-env";
import { selectRows } from "../../../../../app/api/supabase";
import { visibleTermTreatments } from "../../../lib/news/contracts";
import { selectVisibleTermTreatments } from "../visible-term-treatments";
import type { FormatOnlyCase, FormatOnlyReport } from "./run-link-format-only";
import type { LinkNewsCase, LinkNewsReport } from "./run-link-pipeline";

type ExistingNewsRow = {
  news_id: number;
  stock_codes: string[] | null;
  headline: string;
  summary_lines: string[] | null;
  publisher: string;
  source_published_at: string;
  source_url: string;
  term_treatments: unknown;
};

type Card = {
  badge: string;
  headline: string;
  summaryLines: string[];
  terms: Array<{ term: string; easyText: string }>;
  publisher: string;
  publishedAt: string;
  sourceUrl: string;
};

/** 두 실행기의 결과를 한 모양으로 맞춘 뒤 그린다. */
type ReviewItem = {
  stock: LinkNewsCase["stock"];
  article: LinkNewsCase["article"];
  card: Card | null;
  rejection: { stage: string; reasonCodes: string[]; reasons: string[]; editorAttempts: number } | null;
  /** 카드가 몇 번 고쳐 나왔는지. 여러 번 고친 카드는 사람이 더 눈여겨봐야 한다. */
  attempts: number;
};

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

async function loadExistingByStock() {
  const rows: ExistingNewsRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await selectRows<ExistingNewsRow>("news_feed_items", {
      select: "news_id,stock_codes,headline,summary_lines,publisher,source_published_at,source_url,term_treatments",
      scope: "eq.company",
      order: "source_published_at.desc,news_id.desc",
      limit: "500",
      offset: String(offset),
    });
    rows.push(...page);
    if (page.length < 500) break;
  }
  const byStock = new Map<string, ExistingNewsRow[]>();
  for (const row of rows) {
    for (const code of row.stock_codes ?? []) {
      byStock.set(code, [...(byStock.get(code) ?? []), row]);
    }
  }
  return byStock;
}

function existingCard(row: ExistingNewsRow, index: number): Card {
  const summaryLines = row.summary_lines ?? [];
  const treatments = Array.isArray(row.term_treatments)
    ? (row.term_treatments as Array<{ term?: unknown; easyText?: unknown }>).flatMap((entry) =>
        typeof entry?.term === "string" && typeof entry?.easyText === "string"
          ? [{ term: entry.term, easyText: entry.easyText }]
          : [])
    : [];
  return {
    badge: `기존 뉴스 ${index + 1} · #${row.news_id}`,
    headline: row.headline,
    summaryLines,
    terms: visibleTermTreatments({ headline: row.headline, summaryLines, termTreatments: treatments }),
    publisher: row.publisher,
    publishedAt: row.source_published_at,
    sourceUrl: row.source_url,
  };
}

function cardFromDraft(draft: FormatOnlyCase["draft"], article: LinkNewsCase["article"]): Card {
  return {
    badge: "신규 (이번 링크)",
    headline: draft.headline.text,
    summaryLines: draft.body.map((line) => line.text),
    terms: selectVisibleTermTreatments(draft).map((treatment) => ({
      term: treatment.term,
      easyText: treatment.easyText,
    })),
    publisher: article.publisher,
    publishedAt: article.publishedAt,
    sourceUrl: article.sourceUrl,
  };
}

function fromPipelineCase(item: LinkNewsCase): ReviewItem {
  const result = item.pipelineResult;
  if (result.status === "ready_for_storage") {
    return {
      stock: item.stock,
      article: item.article,
      card: cardFromDraft(result.draft, item.article),
      rejection: null,
      attempts: result.editorAttempts,
    };
  }
  return {
    stock: item.stock,
    article: item.article,
    card: null,
    rejection: {
      stage: result.stage,
      reasonCodes: result.reasonCodes,
      reasons: result.reasons,
      editorAttempts: result.editorAttempts,
    },
    attempts: result.editorAttempts,
  };
}

function fromFormatCase(item: FormatOnlyCase): ReviewItem {
  return {
    stock: item.stock,
    article: item.article,
    card: cardFromDraft(item.draft, item.article),
    rejection: null,
    attempts: item.editorAttempts,
  };
}

function renderCard(card: Card, tone: "existing" | "fresh") {
  const terms = card.terms.length === 0 ? "" : `
      <div class="card-box">
        <div class="card-box-title">이 말은 무슨 뜻이야?</div>
        <div class="terms">
          ${card.terms.map((treatment) => `
          <div class="term"><span class="term-word">${escapeHtml(treatment.term)}</span><span class="term-text">${escapeHtml(treatment.easyText)}</span></div>`).join("")}
        </div>
      </div>`;
  return `
    <div class="card ${tone}">
      <div class="badge">${escapeHtml(card.badge)}</div>
      <div class="hero"><div class="headline">${escapeHtml(card.headline)}</div></div>
      <div class="card-box">
        <div class="card-box-title">3줄 요약</div>
        <div class="lines">
          ${card.summaryLines.map((line, index) => `
          <div class="line"><span class="num">${index + 1}</span><span class="line-text">${escapeHtml(line)}</span></div>`).join("")}
        </div>
      </div>${terms}
      <div class="source">
        <span>${escapeHtml(card.publisher)} · ${escapeHtml(formatDate(card.publishedAt))}</span>
        <a href="${escapeHtml(card.sourceUrl)}" target="_blank" rel="noopener">원문 보기 ↗</a>
      </div>
    </div>`;
}

function renderRejected(item: ReviewItem) {
  if (!item.rejection) return "";
  const { stage, reasonCodes, reasons, editorAttempts } = item.rejection;
  return `
    <div class="card rejected">
      <div class="badge">신규 (이번 링크) — 카드 없음</div>
      <div class="reject-head">서비스 카드 없음</div>
      <div class="reject-meta">단계 <b>${escapeHtml(stage)}</b> · 편집 시도 ${editorAttempts}회</div>
      <div class="codes">${reasonCodes.map((code) => `<span class="code">${escapeHtml(code)}</span>`).join("")}</div>
      <ul class="reasons">${reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      <div class="source">
        <span>${escapeHtml(item.article.publisher)} · ${escapeHtml(formatDate(item.article.publishedAt))}</span>
        <a href="${escapeHtml(item.article.sourceUrl)}" target="_blank" rel="noopener">원문 보기 ↗</a>
      </div>
      <div class="original">원문 제목: ${escapeHtml(item.article.title)}</div>
    </div>`;
}

function renderRow(item: ReviewItem, existing: ExistingNewsRow[]) {
  const ready = item.card !== null;
  const slots = [0, 1].map((index) => {
    const row = existing[index];
    return row
      ? renderCard(existingCard(row, index), "existing")
      : `<div class="card empty">기존 뉴스 ${index + 1}<div class="empty-text">DB 에 없음</div></div>`;
  });
  const fresh = item.card ? renderCard(item.card, "fresh") : renderRejected(item);
  const retried = item.attempts > 1 ? `<span class="retry">편집 ${item.attempts}회</span>` : "";
  return `
  <section class="row" data-status="${ready ? "ready" : "rejected"}" data-name="${escapeHtml(`${item.stock.name} ${item.stock.symbol} ${item.article.title}`)}">
    <h2><span class="stock">${escapeHtml(item.stock.name)}</span><span class="symbol">${escapeHtml(item.stock.symbol)}</span>
      <span class="status ${ready ? "ok" : "no"}">${ready ? "카드 있음" : "카드 없음"}</span>${retried}</h2>
    <div class="cards">${slots[0]}${slots[1]}${fresh}</div>
  </section>`;
}

export function renderReviewHtml(
  meta: { runId: string; model: string; runDateKst: string; formatOnly: boolean },
  items: readonly ReviewItem[],
  existingByStock: Map<string, ExistingNewsRow[]>,
) {
  const rows = items
    .map((item) => renderRow(item, (existingByStock.get(item.stock.symbol) ?? []).slice(0, 2)))
    .join("");
  const withCard = items.filter((item) => item.card !== null).length;
  const notice = meta.formatOnly
    ? `주신 기사에서 중심 사건을 뽑아 기존 카드와 <b>같은 양식</b>으로 옮긴 검수 초안입니다.
       기사 자격(오늘 시황인가 · 이 회사가 주인공인가 · 홍보성인가)은 기계가 판단하지 않았으니
       무엇을 서비스에 올릴지는 이 화면에서 직접 고르십시오.
       원문에 없는 사실 금지와 추천·매매 시점·목표가·전망 금지는 초안에도 그대로 적용했습니다.`
    : `네 역할(제목 선별 · 본문 선별 · 어린이 편집 · 독립 검수)을 모두 max 추론으로 실행한 결과입니다.
       통과한 카드만 DB 적재 후보이며, 기존 뉴스는 지우지 않고 함께 남습니다.`;
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>지정 링크 뉴스 검수 — ${escapeHtml(meta.runId)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px; background:#F4F3FA; color:#01185A;
    font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif; }
  header.top { max-width:1500px; margin:0 auto 20px; }
  h1 { font-size:22px; margin:0 0 8px; letter-spacing:-0.02em; }
  .meta { font-size:13.5px; color:#5C6280; line-height:1.7; }
  .tally { display:flex; gap:10px; flex-wrap:wrap; margin-top:12px; }
  .tally span { background:#fff; border-radius:999px; padding:7px 14px; font-size:13px; font-weight:700;
    box-shadow:0 2px 8px rgba(30,25,60,0.06); }
  .controls { display:flex; gap:10px; flex-wrap:wrap; margin-top:14px; }
  .controls input, .controls select { font:inherit; font-size:13.5px; padding:9px 13px; border-radius:12px;
    border:1px solid #DDDCEC; background:#fff; }
  .controls input { min-width:280px; }
  main { max-width:1500px; margin:0 auto; }
  .row { background:#fff; border-radius:22px; padding:16px 18px 20px; margin-bottom:18px;
    box-shadow:0 2px 12px rgba(30,25,60,0.05); }
  .row h2 { display:flex; align-items:center; gap:10px; font-size:17px; margin:0 0 14px; }
  .symbol { font-size:13px; font-weight:600; color:#8E93A8; }
  .status { font-size:12px; font-weight:800; border-radius:999px; padding:4px 10px; }
  .status.ok { color:#0B6B3A; background:#DFF3E7; }
  .status.no { color:#8A2B2B; background:#FBE4E4; }
  .retry { font-size:11.5px; font-weight:700; color:#8A6B1F; background:#FBF0D8;
    border-radius:999px; padding:4px 10px; }
  .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; align-items:start; }
  .card { background:#F7F6FC; border-radius:20px; padding:14px; display:flex; flex-direction:column; gap:10px; }
  .card.fresh { background:#FDF3F8; outline:2px solid #F5327F33; }
  .card.rejected { background:#FBF1F1; outline:2px solid #8A2B2B22; }
  .card.empty { color:#8E93A8; font-size:13px; font-weight:700; align-items:center; justify-content:center;
    min-height:150px; text-align:center; }
  .empty-text { font-weight:500; margin-top:6px; }
  .badge { font-size:11.5px; font-weight:800; color:#8E93A8; letter-spacing:0.02em; }
  .hero { background:#FDEFF5; border-radius:18px; padding:13px 15px; }
  .headline { font-size:16.5px; font-weight:800; line-height:1.45; letter-spacing:-0.02em; text-wrap:pretty; }
  .card-box { background:#fff; border-radius:18px; padding:13px 15px; }
  .card-box-title { font-size:13.5px; font-weight:800; }
  .lines, .terms { display:flex; flex-direction:column; gap:8px; margin-top:10px; }
  .line, .term { display:flex; align-items:flex-start; gap:9px; }
  .num { flex:none; width:19px; height:19px; border-radius:999px; display:flex; align-items:center;
    justify-content:center; font-size:11.5px; font-weight:700; color:#fff; background:#F5327F; }
  .line-text { flex:1; font-size:13px; font-weight:500; color:#5C6280; line-height:1.6; }
  .term-word { flex:none; font-size:11.5px; font-weight:800; color:#D5327A; background:#FDEFF5;
    border-radius:999px; padding:4px 9px; }
  .term-text { flex:1; font-size:12.5px; font-weight:500; color:#5C6280; line-height:1.6; }
  .source { display:flex; align-items:center; justify-content:space-between; gap:10px; background:#fff;
    border-radius:16px; padding:11px 13px; font-size:12px; color:#8E93A8; }
  .source a { color:#D5327A; font-weight:800; text-decoration:none; white-space:nowrap; }
  .reject-head { font-size:16px; font-weight:800; color:#8A2B2B; }
  .reject-meta { font-size:12.5px; color:#5C6280; }
  .codes { display:flex; flex-wrap:wrap; gap:6px; }
  .code { font-size:11.5px; font-weight:800; color:#8A2B2B; background:#F6DADA; border-radius:999px; padding:4px 9px; }
  .reasons { margin:0; padding-left:18px; font-size:12.5px; color:#5C6280; line-height:1.65; }
  .original { font-size:12px; color:#8E93A8; line-height:1.5; }
  @media (max-width:1100px) { .cards { grid-template-columns:1fr; } }
</style></head><body>
<header class="top">
  <h1>지정 링크 뉴스 검수 — 기존(왼쪽·중앙) 대 신규(오른쪽)</h1>
  <div class="meta">
    실행 ${escapeHtml(meta.runId)} · 모델 ${escapeHtml(meta.model)} · 기준일 ${escapeHtml(meta.runDateKst)}<br>
    ${notice}
  </div>
  <div class="tally">
    <span>대상 ${items.length}종목</span>
    <span>카드 ${withCard}건</span>
    <span>카드 없음 ${items.length - withCard}건</span>
  </div>
  <div class="controls">
    <input id="q" type="search" placeholder="종목명 · 종목코드 · 기사 제목 검색">
    <select id="status">
      <option value="">전체 보기</option>
      <option value="ready">카드 있는 종목만</option>
      <option value="rejected">카드 없는 종목만</option>
    </select>
  </div>
</header>
<main>${rows}</main>
<script>
  const query = document.getElementById("q");
  const status = document.getElementById("status");
  const rows = [...document.querySelectorAll(".row")];
  function apply() {
    const text = query.value.trim().toLowerCase();
    for (const row of rows) {
      const matchText = !text || row.dataset.name.toLowerCase().includes(text);
      const matchStatus = !status.value || row.dataset.status === status.value;
      row.style.display = matchText && matchStatus ? "" : "none";
    }
  }
  query.addEventListener("input", apply);
  status.addEventListener("change", apply);
</script>
</body></html>
`;
}

async function main() {
  loadDevelopmentEnvironment();
  const reportPath = resolve(option("--report") ?? "");
  if (!reportPath) throw new Error("--report 는 필수입니다.");
  const raw = JSON.parse(await readFile(reportPath, "utf8")) as LinkNewsReport | FormatOnlyReport;
  const formatOnly = "formatOnly" in raw && raw.formatOnly === true;
  const items = formatOnly
    ? (raw as FormatOnlyReport).cases.map(fromFormatCase)
    : (raw as LinkNewsReport).cases.map(fromPipelineCase);

  const existingByStock = await loadExistingByStock();
  const outputPath = resolve(option("--output") ?? resolve(dirname(reportPath), "index.html"));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    renderReviewHtml(
      { runId: raw.runId, model: raw.model, runDateKst: raw.runDateKst, formatOnly },
      items,
      existingByStock,
    ),
    "utf8",
  );

  const withCard = items.filter((item) => item.card !== null).length;
  console.log(`검수 화면: ${outputPath}`);
  console.log(`종목 ${items.length}건 · 카드 ${withCard}건 · 카드 없음 ${items.length - withCard}건`);
  if (formatOnly) {
    for (const failure of (raw as FormatOnlyReport).failures) {
      console.log(`  카드 실패 ${failure.name}: ${failure.reason.slice(0, 160)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
