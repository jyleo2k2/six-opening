/**
 * 대표님이 직접 주신 종목별 기사 링크를 파이프라인 입력으로 바꾼다.
 *
 * `collect-universe-news.ts` 는 네이버 검색으로 후보를 **찾는** 일이 절반이다. 여기서는
 * 찾을 필요가 없다. 종목마다 기사 하나가 이미 정해져 있으므로 그 페이지를 읽어
 * 근거 문장으로 쪼개는 일만 한다.
 *
 * 실행:
 *   cd web
 *   node features/f2-trade/prototypes/child-news-role-pipeline/link-news/collect-link-news.cjs \
 *     --input features/f2-trade/prototypes/child-news-role-pipeline/link-news/supplied-links.tsv \
 *     --run-id supplied-link-news-2026-08-18 --overwrite
 *
 * 한 종목이 실패해도 멈추지 않는다. 실패는 `failures` 에 남겨 두고 나머지를 계속 모은다.
 * 어느 링크가 왜 안 됐는지 대표님께 그대로 보여 드려야 다음 링크를 고를 수 있다.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STOCKS } from "../../../../../shared/data/stocks";
import type { NewsSourceArticle } from "../contracts";
import { selectSourceUnits } from "../naver-news-collector";
import { parseLinkArticleHtml, readAmpUrl } from "./link-article-parser";

const here = dirname(fileURLToPath(import.meta.url));
const REQUEST_TIMEOUT_MS = 25_000;
const REQUEST_DELAY_MS = 700;
/** 이보다 적으면 본문을 못 읽은 것으로 보고 AMP 판을 한 번 더 본다(뉴스1). */
const MIN_BODY_SEGMENTS = 6;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type LinkNewsCandidate = {
  stock: {
    stockId: string;
    symbol: string;
    name: string;
    aliases: string[];
    sector: string;
    market: string;
  };
  suppliedUrl: string;
  readUrl: string;
  bodySegmentCount: number;
  article: NewsSourceArticle;
};

export type LinkNewsFailure = {
  symbol: string;
  suppliedUrl: string;
  reason: string;
};

export type LinkNewsCollection = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  retrievedAt: string;
  sourceBasis: string;
  candidates: LinkNewsCandidate[];
  failures: LinkNewsFailure[];
};

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function todayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
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
  throw new Error(`기사 페이지를 읽지 못했습니다(${url}): ${String(lastError).slice(0, 120)}`);
}

export function parseSuppliedLinks(text: string) {
  const rows: Array<{ symbol: string; url: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [symbol, url] = trimmed.split(/\s+/u);
    if (!/^\d{6}$/u.test(symbol ?? "")) throw new Error(`종목코드 형식이 아닙니다: ${line}`);
    if (!/^https?:\/\//u.test(url ?? "")) throw new Error(`링크 형식이 아닙니다: ${line}`);
    rows.push({ symbol, url });
  }
  return rows;
}

/**
 * 본문이 너무 적으면 언론사가 알려 준 AMP 주소를 한 번 더 읽는다.
 *
 * 뉴스1은 본문을 브라우저에서 그려서 서버 HTML 에는 사진 설명과 회사 정보밖에 없다.
 * 그대로 두면 "사업자등록번호 …" 가 근거 문장이 된다.
 */
async function readArticle(suppliedUrl: string) {
  const html = await fetchText(suppliedUrl);
  // 본문이 아예 없으면 파서가 던진다. 그것도 AMP 를 볼 이유이므로 여기서는 삼킨다.
  let parsed: ReturnType<typeof parseLinkArticleHtml> | null = null;
  let parseError: unknown;
  try {
    parsed = parseLinkArticleHtml(html, suppliedUrl);
    if (parsed.bodySegments.length >= MIN_BODY_SEGMENTS) return { parsed, readUrl: suppliedUrl };
  } catch (error) {
    parseError = error;
  }

  const ampUrl = readAmpUrl(html);
  if (ampUrl) {
    await wait(REQUEST_DELAY_MS);
    const absoluteAmpUrl = new URL(ampUrl, suppliedUrl).toString();
    const ampParsed = parseLinkArticleHtml(await fetchText(absoluteAmpUrl), absoluteAmpUrl);
    if (ampParsed.bodySegments.length > (parsed?.bodySegments.length ?? 0)) {
      return { parsed: ampParsed, readUrl: absoluteAmpUrl };
    }
  }
  if (parsed) return { parsed, readUrl: suppliedUrl };
  throw parseError;
}

async function main() {
  const runDateKst = option("--date") ?? todayKst();
  const runId = option("--run-id") ?? `supplied-link-news-${runDateKst}`;
  const inputPath = resolve(option("--input") ?? resolve(here, "supplied-links.tsv"));
  const outputPath = resolve(
    option("--output") ?? resolve(here, "..", "evaluation-fixtures", `${runId}.json`),
  );
  if (existsSync(outputPath) && !process.argv.includes("--overwrite")) {
    throw new Error(`기존 수집 결과를 덮어쓰지 않습니다: ${outputPath} (--overwrite 로 명시)`);
  }

  const links = parseSuppliedLinks(await readFile(inputPath, "utf8"));
  const stocks = new Map(STOCKS.map((stock) => [stock.symbol, stock]));
  const candidates: LinkNewsCandidate[] = [];
  const failures: LinkNewsFailure[] = [];

  for (const [index, { symbol, url }] of links.entries()) {
    const stock = stocks.get(symbol);
    if (!stock) {
      failures.push({ symbol, suppliedUrl: url, reason: "유니버스 51종목에 없는 종목코드입니다." });
      continue;
    }
    try {
      const { parsed, readUrl } = await readArticle(url);
      const digest = createHash("sha256").update(url).digest("hex").slice(0, 10).toUpperCase();
      const article: NewsSourceArticle = {
        articleId: `LINK-${symbol}-${digest}`,
        runDateKst,
        scope: "company",
        title: parsed.title,
        publisher: parsed.publisher,
        publishedAt: parsed.publishedAt,
        // 저장하는 원문 주소는 늘 대표님이 주신 링크다. AMP 는 읽기용일 뿐이다.
        sourceUrl: url,
        sourceUnits: selectSourceUnits(
          { articleId: "", title: "", publisher: "", publishedAt: "", sourceUrl: url, naverUrl: url, bodySegments: parsed.bodySegments },
          stock,
        ),
      };
      candidates.push({
        stock: {
          stockId: stock.id,
          symbol: stock.symbol,
          name: stock.name,
          aliases: [...stock.searchAliases],
          sector: stock.sector,
          market: stock.market,
        },
        suppliedUrl: url,
        readUrl,
        bodySegmentCount: parsed.bodySegments.length,
        article,
      });
      console.log(
        `[${index + 1}/${links.length}] ${stock.name}: 본문 ${parsed.bodySegments.length}문장 → 근거 ${article.sourceUnits.length}개 · ${parsed.publishedAt.slice(0, 10)}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      failures.push({ symbol, suppliedUrl: url, reason });
      console.log(`[${index + 1}/${links.length}] ${stock.name}: 실패 — ${reason.slice(0, 110)}`);
    }
    await wait(REQUEST_DELAY_MS);
  }

  const collection: LinkNewsCollection = {
    schemaVersion: 1,
    runId,
    runDateKst,
    retrievedAt: new Date().toISOString(),
    sourceBasis: `대표님이 지정한 종목별 기사 링크 ${links.length}건 (${inputPath})`,
    candidates,
    failures,
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
  console.log(`\n수집 ${candidates.length}건 · 실패 ${failures.length}건 → ${outputPath}`);
  for (const failure of failures) console.log(`  실패 ${failure.symbol}: ${failure.reason.slice(0, 140)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
