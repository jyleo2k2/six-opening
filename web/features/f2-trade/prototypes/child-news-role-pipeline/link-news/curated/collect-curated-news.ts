/**
 * 대표 검수를 통과한 48종목 카드를 **적재할 수 있는 모양**으로 만든다.
 *
 * `run-link-format-only.ts` 는 초안 카드를 만들어 HTML 로 보여 드리는 데서 끝났다. 대표님이
 * 그 화면을 보고 문안을 다시 쓰셨고(`curated-cards-2026-08-18.json`), 그 최종본에는 근거 id 가
 * 없다. 여기서 하는 일은 딱 하나다 — **원문 기사를 다시 읽어 그 문안을 근거 문장에 묶는 것**.
 *
 * 문안은 한 글자도 고치지 않는다. 사람이 고른 말이 정본이고, 이 스크립트는 그 말이 어느
 * 문장에서 나왔는지만 채운다. 어느 줄도 뒷받침하는 문장을 못 찾으면 그 종목은 통째로
 * 실패로 남긴다 — 근거 없는 줄을 화면에 올리지 않는 것이 이 파이프라인의 전제다.
 *
 * 실행:
 *   cd web
 *   node features/f2-trade/prototypes/child-news-role-pipeline/link-news/curated/collect-curated-news.cjs \
 *     --overwrite
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STOCKS } from "../../../../../../shared/data/stocks";
import { MATERIAL_EVENT_TYPES, PRICE_CONNECTION_KINDS } from "../../contracts";
import { parseLinkArticleHtml, readAmpUrl } from "../link-article-parser";
import {
  chooseCitation,
  chooseTermCitation,
  factKeysFor,
  ungroundedNumbers,
} from "./citation-match";

const here = dirname(fileURLToPath(import.meta.url));
const REQUEST_TIMEOUT_MS = 25_000;
const REQUEST_DELAY_MS = 700;
/** 이보다 적으면 본문을 못 읽은 것으로 보고 AMP 판을 한 번 더 본다(뉴스1). */
const MIN_BODY_SEGMENTS = 6;
/**
 * DB 에 남길 근거 문장 수. 인용된 문장은 무조건 남기고, 남는 자리를 문서 순서로 채운다.
 * 기존 게시물이 기사당 6~10문장이라 같은 눈금을 쓴다.
 */
const MAX_STORED_UNITS = 12;
const MAX_UNIT_LENGTH = 700;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

type CuratedCard = {
  code: string;
  company: string;
  publisher: string;
  sourceUrl: string;
  headline: string;
  summaryLines: Array<{ text: string; originalText?: string }>;
  eventType: string;
  priceConnection: { kind: string; basis: string; text: string };
  terms: Array<{ term: string; easyText: string }>;
};

type CuratedInput = { runId: string; runDateKst: string; cards: CuratedCard[] };

export type CuratedCase = {
  stock: { stockId: string; symbol: string; name: string };
  article: {
    articleId: string;
    runDateKst: string;
    scope: "company";
    title: string;
    publisher: string;
    publishedAt: string;
    sourceUrl: string;
    sourceUnits: Array<{ id: string; text: string }>;
  };
  eventType: string;
  focusStatement: string;
  anchorSourceId: string;
  selectedSourceIds: string[];
  draft: {
    headline: { text: string; sourceIds: string[] };
    homeSummary: { text: string; sourceIds: string[] };
    body: Array<{ text: string; sourceIds: string[]; factKey: string; score: number }>;
    priceConnection: { text: string; sourceIds: string[]; kind: string; basis: string };
    termTreatments: Array<{ term: string; easyText: string; treatment: "explained"; sourceIds: string[] }>;
  };
};

export type CuratedReport = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  retrievedAt: string;
  cardCount: number;
  cases: CuratedCase[];
  failures: Array<{ symbol: string; company: string; sourceUrl: string; reason: string }>;
};

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const wait = (delayMs: number) => new Promise((done) => setTimeout(done, delayMs));

async function fetchText(url: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { "accept-language": "ko-KR,ko;q=0.9", "user-agent": USER_AGENT },
        redirect: "follow",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await wait(attempt * 1_500);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`기사 페이지를 읽지 못했습니다: ${String(lastError).slice(0, 120)}`);
}

/** 본문이 너무 적으면 언론사가 알려 준 AMP 주소를 한 번 더 읽는다. `collect-link-news.ts` 와 같다. */
async function readArticle(sourceUrl: string) {
  const html = await fetchText(sourceUrl);
  let parsed: ReturnType<typeof parseLinkArticleHtml> | null = null;
  let parseError: unknown;
  try {
    parsed = parseLinkArticleHtml(html, sourceUrl);
    if (parsed.bodySegments.length >= MIN_BODY_SEGMENTS) return parsed;
  } catch (error) {
    parseError = error;
  }
  const ampUrl = readAmpUrl(html);
  if (ampUrl) {
    await wait(REQUEST_DELAY_MS);
    const absolute = new URL(ampUrl, sourceUrl).toString();
    const ampParsed = parseLinkArticleHtml(await fetchText(absolute), absolute);
    if (ampParsed.bodySegments.length > (parsed?.bodySegments.length ?? 0)) return ampParsed;
  }
  if (parsed) return parsed;
  throw parseError;
}

/**
 * 인용된 문장은 반드시 남기고 남는 자리를 문서 순서로 채운 뒤 S1..Sn 으로 다시 번호를 매긴다.
 *
 * 후보를 전부 저장하지 않는 이유는 근거가 40문장씩 쌓이면 뭐가 실제 근거인지 안 보이기
 * 때문이다. 반대로 상위 10개만 미리 자르면 사람이 쓴 줄이 기댄 문장이 그 안에 없을 수 있다.
 * 그래서 **먼저 묶고 나중에 자른다.**
 */
function compactUnits(
  units: ReadonlyArray<{ id: string; text: string }>,
  citedIds: ReadonlySet<string>,
) {
  const cited = units.filter((unit) => citedIds.has(unit.id));
  const rest = units.filter((unit) => !citedIds.has(unit.id));
  const kept = [...cited, ...rest.slice(0, Math.max(0, MAX_STORED_UNITS - cited.length))].sort(
    (left, right) => units.indexOf(left) - units.indexOf(right),
  );
  const renamed = new Map(kept.map((unit, index) => [unit.id, `S${index + 1}`]));
  return {
    units: kept.map((unit) => ({ id: renamed.get(unit.id)!, text: unit.text })),
    rename: (id: string) => renamed.get(id) ?? id,
  };
}

export function buildCase(
  card: CuratedCard,
  stock: { id: string; symbol: string; name: string },
  parsed: { title: string; publisher: string; publishedAt: string; bodySegments: string[] },
  runDateKst: string,
): CuratedCase {
  if (!MATERIAL_EVENT_TYPES.includes(card.eventType as never)) {
    throw new Error(`저장할 수 없는 eventType 입니다: ${card.eventType}`);
  }
  if (!PRICE_CONNECTION_KINDS.includes(card.priceConnection.kind as never)) {
    throw new Error(`저장할 수 없는 priceConnection.kind 입니다: ${card.priceConnection.kind}`);
  }

  const candidates = parsed.bodySegments
    .map((text, index) => ({ id: `C${index + 1}`, text: text.slice(0, MAX_UNIT_LENGTH) }))
    .filter((unit) => unit.text.trim().length > 0);
  if (candidates.length === 0) throw new Error("본문 문장을 하나도 읽지 못했습니다.");

  /**
   * 먼저 **기사에 없는 숫자**부터 막는다. 이것이 유일하게 "거짓" 인 결함이라 가장 무겁고,
   * 낱말 겹침으로는 잡을 수 없다. 사람이 쓴 문안이라도 원문에 없는 값이면 화면에 못 올린다.
   */
  /**
   * 발행 날짜도 근거에 넣는다. 기사는 "오는 30일까지" 라고만 쓰지만 카드는 아이가 읽도록
   * "8월 30일까지" 라고 쓴다(신세계 실측). 그 `8` 은 지어낸 값이 아니라 기사에 찍힌 날짜다.
   */
  const articleText = [...candidates.map((unit) => unit.text), parsed.publishedAt].join(" ");
  const lines = card.summaryLines.map((line) => line.text);
  for (const text of [card.headline, ...lines]) {
    const invented = ungroundedNumbers(text, articleText);
    if (invented.length > 0) {
      throw new Error(`기사에 없는 숫자(${invented.join(", ")})를 쓴 줄입니다: ${text}`);
    }
  }

  const headlineChoice = chooseCitation(card.headline, candidates);
  if (!headlineChoice) throw new Error(`제목을 뒷받침하는 문장이 없습니다: ${card.headline}`);

  const used = new Set(headlineChoice.sourceIds);
  const body = lines.map((text) => {
    const choice = chooseCitation(text, candidates, used);
    if (!choice) throw new Error(`요약 줄을 뒷받침하는 문장이 없습니다: ${text}`);
    for (const id of choice.sourceIds) used.add(id);
    return { text, sourceIds: choice.sourceIds, score: choice.score };
  });

  const anchorId = headlineChoice.sourceIds[0];
  const terms = card.terms.map((term) => ({
    ...term,
    treatment: "explained" as const,
    sourceIds: chooseTermCitation(term.term, candidates, anchorId),
  }));

  const citedIds = new Set([
    ...headlineChoice.sourceIds,
    ...body.flatMap((line) => line.sourceIds),
    ...terms.flatMap((term) => term.sourceIds),
  ]);
  const { units, rename } = compactUnits(candidates, citedIds);

  const factKeys = factKeysFor(lines);
  const digest = createHash("sha256").update(card.sourceUrl).digest("hex").slice(0, 10).toUpperCase();
  const headlineIds = headlineChoice.sourceIds.map(rename);

  return {
    stock: { stockId: stock.id, symbol: stock.symbol, name: stock.name },
    article: {
      articleId: `CURATED-${card.code}-${digest}`,
      runDateKst,
      scope: "company",
      // 원문 제목은 기사 페이지에서 읽은 값을 쓴다. 카드 제목은 아이가 읽는 말이라 따로다.
      title: parsed.title,
      publisher: parsed.publisher || card.publisher,
      publishedAt: parsed.publishedAt,
      sourceUrl: card.sourceUrl,
      sourceUnits: units,
    },
    eventType: card.eventType,
    focusStatement: card.headline,
    anchorSourceId: rename(anchorId),
    selectedSourceIds: units.map((unit) => unit.id),
    draft: {
      headline: { text: card.headline, sourceIds: headlineIds },
      // 짧은 카드와 자세히보기가 같은 제목을 쓴다(F2 SPEC 7.3).
      homeSummary: { text: card.headline, sourceIds: headlineIds },
      body: body.map((line, index) => ({
        text: line.text,
        sourceIds: line.sourceIds.map(rename),
        factKey: factKeys[index],
        score: line.score,
      })),
      priceConnection: {
        text: card.priceConnection.text,
        sourceIds: headlineIds,
        kind: card.priceConnection.kind,
        basis: card.priceConnection.basis,
      },
      termTreatments: terms.map((term) => ({
        term: term.term,
        easyText: term.easyText,
        treatment: term.treatment,
        sourceIds: [...new Set(term.sourceIds.map(rename))],
      })),
    },
  };
}

async function main() {
  const inputPath = resolve(option("--input") ?? resolve(here, "curated-cards-2026-08-18.json"));
  const input = JSON.parse(await readFile(inputPath, "utf8")) as CuratedInput;
  const outputPath = resolve(
    option("--output") ?? resolve(here, "..", "..", "reports", input.runId, "curated-report.json"),
  );
  if (existsSync(outputPath) && !process.argv.includes("--overwrite")) {
    throw new Error(`기존 결과를 덮어쓰지 않습니다: ${outputPath} (--overwrite 로 명시)`);
  }

  const stocks = new Map(STOCKS.map((stock) => [stock.symbol, stock]));
  const cases: CuratedCase[] = [];
  const failures: CuratedReport["failures"] = [];

  for (const [index, card] of input.cards.entries()) {
    const stock = stocks.get(card.code);
    const label = `[${index + 1}/${input.cards.length}] ${card.company}`;
    if (!stock) {
      failures.push({ symbol: card.code, company: card.company, sourceUrl: card.sourceUrl, reason: "유니버스 51종목에 없습니다." });
      console.log(`${label}: 실패 — 유니버스에 없는 종목코드`);
      continue;
    }
    try {
      const parsed = await readArticle(card.sourceUrl);
      const built = buildCase(card, stock, parsed, input.runDateKst);
      cases.push(built);
      const weakest = Math.min(...built.draft.body.map((line) => line.score));
      console.log(
        `${label}: 본문 ${parsed.bodySegments.length}문장 → 근거 ${built.article.sourceUnits.length}개 · 최저 점수 ${weakest}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({ symbol: card.code, company: card.company, sourceUrl: card.sourceUrl, reason });
      console.log(`${label}: 실패 — ${reason.slice(0, 120)}`);
    }
    await wait(REQUEST_DELAY_MS);
  }

  const report: CuratedReport = {
    schemaVersion: 1,
    runId: input.runId,
    runDateKst: input.runDateKst,
    retrievedAt: new Date().toISOString(),
    cardCount: input.cards.length,
    cases,
    failures,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\n묶음 ${cases.length}건 · 실패 ${failures.length}건 → ${outputPath}`);
  for (const failure of failures) console.log(`  실패 ${failure.symbol} ${failure.company}: ${failure.reason.slice(0, 140)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
