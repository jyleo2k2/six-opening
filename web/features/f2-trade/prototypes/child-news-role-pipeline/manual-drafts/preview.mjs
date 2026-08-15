/**
 * 수기 초안을 아이가 보는 카드 모양으로 렌더링한다.
 *
 * `news_publications` 는 넣으면 못 고치므로 적재 전에 눈으로 볼 창이 필요하다.
 * 화면(`ui-src/screens/news.html`)이 실제로 그리는 것 — 제목·3줄·출처·주가연결·용어 —
 * 만 보여준다. 저장은 하지 않는다.
 *
 * 사용: node manual-drafts/preview.mjs  → manual-drafts/preview.html
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const itemsDir = resolve(here, "items");

const escape = (value) =>
  String(value).replace(/[&<>"]/gu, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

const files = (await readdir(itemsDir)).filter((name) => name.endsWith(".json")).sort();
const items = await Promise.all(
  files.map(async (name) => JSON.parse(await readFile(resolve(itemsDir, name), "utf8"))),
);

const cards = items.map((item) => {
  const code = item.stockId.slice(4);
  const lines = item.body
    .map((line, index) => `
      <div class="line">
        <span class="num">${index + 1}</span>
        <span class="text">${escape(line.text)}</span>
        <span class="meta">${escape(line.factKey)} · ${line.sourceIds.join(",")} · ${line.text.length}자</span>
      </div>`)
    .join("");
  const terms = item.termTreatments
    .map((treatment) => `<li><b>${escape(treatment.term)}</b> — ${escape(treatment.easyText)}</li>`)
    .join("");

  return `
  <article class="card${item.replaces ? " replace" : ""}">
    <header>
      <span class="code">${escape(code)}</span>
      <span class="event">${escape(item.eventType)}</span>
      ${item.replaces ? '<span class="tag">교체</span>' : ""}
    </header>
    <h2>${escape(item.headline.text)}</h2>
    <div class="len">제목 ${item.headline.text.length}자</div>
    <section class="lines">${lines}</section>
    <section class="why"><b>왜 주가와 관련 있어?</b><br>${escape(item.priceConnection.text)}</section>
    <section class="terms"><b>어려운 말</b><ul>${terms}</ul></section>
    <footer>
      <span>${escape(item.article.publisher)} · ${escape(item.article.publishedAt.slice(0, 10))}</span>
      <a href="${escape(item.article.sourceUrl)}">원문 보기 ↗</a>
    </footer>
    ${item.replaces ? `<div class="note">${escape(item.replaces)}</div>` : ""}
  </article>`;
}).join("");

const html = `<!doctype html><html lang="ko"><meta charset="utf-8">
<title>수기 뉴스 초안 ${items.length}건</title>
<style>
  body{margin:0;padding:24px;background:#F4F5FB;font:15px/1.6 Pretendard,system-ui,sans-serif;color:#01185A}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#8E93A8;font-size:13px;margin-bottom:20px}
  .grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(360px,1fr))}
  .card{background:#fff;border-radius:20px;padding:18px 20px;box-shadow:0 2px 10px rgba(30,25,60,.06)}
  .card.replace{box-shadow:0 0 0 2px #F5327F inset,0 2px 10px rgba(30,25,60,.06)}
  header{display:flex;gap:8px;align-items:center;font-size:12px;color:#8E93A8}
  .code{font-weight:700;color:#01185A}
  .tag{background:#FDEFF5;color:#D5327A;border-radius:99px;padding:2px 8px;font-weight:700}
  h2{font-size:17px;line-height:1.45;margin:8px 0 2px}
  .len,.meta{font-size:11px;color:#A9AEC4}
  .lines{margin:12px 0}
  .line{display:grid;grid-template-columns:20px 1fr;gap:8px;margin-bottom:8px}
  .num{width:20px;height:20px;border-radius:99px;background:#ECEDF7;text-align:center;font-size:12px;font-weight:700}
  .text{font-size:14px;color:#5C6280}
  .meta{grid-column:2}
  .why{background:#F7F8FD;border-radius:12px;padding:10px 12px;font-size:13px;color:#5C6280}
  .terms{margin-top:10px;font-size:13px}
  .terms ul{margin:6px 0 0;padding-left:18px;color:#5C6280}
  footer{display:flex;justify-content:space-between;margin-top:12px;font-size:12px;color:#A9AEC4}
  footer a{color:#D5327A;text-decoration:none}
  .note{margin-top:10px;font-size:12px;color:#D5327A}
</style>
<h1>수기 뉴스 초안 ${items.length}건</h1>
<div class="sub">적재 전 검토용. 분홍 테두리는 이미 적재된 기사를 갈아끼우는 건이다.</div>
<div class="grid">${cards}</div>
</html>`;

const outputPath = resolve(here, "preview.html");
await writeFile(outputPath, html, "utf8");
console.log(`${items.length}건 → ${outputPath}`);
