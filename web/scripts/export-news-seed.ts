/**
 * 게시된 어린이 뉴스를 복구용 SQL 로 내보낸다.
 *
 * 뉴스는 다시 받아올 수 없다. 시세·캔들은 키움에서 언제든 다시 긁으면 되지만
 * (`seed-candles.ts`), 뉴스 본문은 파이프라인이 고른 문장을 LLM 이 고쳐 쓰고 사람이
 * 손본 결과다. 같은 입력으로 다시 돌려도 같은 글이 나오지 않는다. **지금 DB 에 있는
 * 것이 유일한 원본이다.**
 *
 * 그런데 리포지터리에 커밋된 적재 SQL(`manual-drafts/storage.sql`)은 25종목 시절에
 * 멈춰 있다. 그 뒤 수기 초안과 두 번째 기사가 계속 들어갔지만 SQL 은 다시 만들지
 * 않았다. DB 가 날아가면 복구할 방법이 없다는 뜻이다. 이 스크립트가 그 구멍을 메운다.
 *
 * 실행:
 *   cd web && npm run seed:news:export
 *
 * 결과는 `scripts/news-seed/published-news.sql` 이고 커밋 대상이다. 뉴스를 새로
 * 적재하거나 철회한 뒤에는 다시 돌려서 커밋한다.
 *
 * ## 복원 순서가 왜 이런가
 *
 * 게시된 뉴스는 스키마가 불변으로 잠근다(`harden_news_release_immutability`).
 * `news_source_units`·`news_article_stocks`·`news_citations` 는 **INSERT 에도** 트리거가
 * 걸려 있어서, 그 기사의 게시물이 이미 `ready_for_storage`·`published`·`withdrawn`
 * 이면 증거를 새로 넣지 못한다. 그래서 게시물을 마지막에 세운다.
 *
 *   런 → 기사 → 근거 문장 → 종목 연결 → 게시물(`draft`) → 인용 → 상태 올리기
 *
 * `draft` 로 넣으면 무결성 트리거(`assert_news_publication_integrity`)가 그냥 통과시키고,
 * 마지막 `update ... set status` 에서 인용·앵커까지 갖춘 상태로 전체 검증이 돈다.
 * 검증을 우회하는 게 아니라 **검증이 성립하는 순서로 쌓는 것**이다.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadDevelopmentEnvironment } from "../app/api/dev-env";
import { selectRows } from "../app/api/supabase";
import {
  insertStatements,
  publicationInsert,
  publicationStatusUpdates,
  restartIdentity,
  type Row,
} from "./news-seed-sql";

/** PostgREST 한 번에 가져올 행 수. 인용이 800 행 가까이 되므로 나눠 받는다. */
const PAGE = 500;

async function readAll(table: string, order: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await selectRows<Row>(table, {
      select: "*",
      order,
      limit: String(PAGE),
      offset: String(offset),
    });
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function main() {
  loadDevelopmentEnvironment();

  const runs = await readAll("news_pipeline_runs", "id.asc");
  const articles = await readAll("news_articles", "id.asc");
  const sourceUnits = await readAll("news_source_units", "article_id.asc,ordinal.asc");
  const articleStocks = await readAll("news_article_stocks", "article_id.asc,stock_id.asc");
  const publications = await readAll("news_publications", "id.asc");
  const citations = await readAll(
    "news_citations",
    "publication_id.asc,output_field.asc,source_unit_id.asc",
  );

  const counts = {
    runs: runs.length,
    articles: articles.length,
    sourceUnits: sourceUnits.length,
    articleStocks: articleStocks.length,
    publications: publications.length,
    citations: citations.length,
  };
  const published = publications.filter((row) => row.status === "published").length;

  const sql = [
    "-- 게시된 어린이 뉴스 복구본. `npm run seed:news:export` 가 만든다 — 손으로 고치지 않는다.",
    `-- 내보낸 시각: ${new Date().toISOString()}`,
    `-- 런 ${counts.runs} · 기사 ${counts.articles} · 근거문장 ${counts.sourceUnits} · ` +
      `종목연결 ${counts.articleStocks} · 게시물 ${counts.publications}(게시 ${published}) · 인용 ${counts.citations}`,
    "--",
    "-- 전제: `supabase/migrations` 를 모두 적용했고 `public.stocks` 에 51종이 들어 있다",
    "--       (`news_article_stocks.stock_id` 가 그 표를 참조한다).",
    "-- 순서: 런 → 기사 → 근거문장 → 종목연결 → 게시물(draft) → 인용 → 상태.",
    "--       게시물이 published 면 증거를 못 넣게 트리거가 막으므로 게시물을 마지막에 세운다.",
    "",
    "begin;",
    "",
    insertStatements("news_pipeline_runs", runs, true),
    insertStatements("news_articles", articles, true),
    insertStatements("news_source_units", sourceUnits, false),
    insertStatements("news_article_stocks", articleStocks, false),
    publicationInsert(publications),
    insertStatements("news_citations", citations, false),
    publicationStatusUpdates(publications),
    restartIdentity("news_pipeline_runs", runs),
    restartIdentity("news_articles", articles),
    restartIdentity("news_publications", publications),
    "",
    "commit;",
    "",
  ].join("\n");

  // `npm run` 은 `web/` 에서 돈다. tsx 는 CJS 로 옮기므로 `import.meta` 에 기대지 않는다.
  const output = path.resolve(process.cwd(), "scripts/news-seed/published-news.sql");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, sql, "utf8");

  console.log(`복구본을 썼다: ${output}`);
  console.log(
    `런 ${counts.runs} · 기사 ${counts.articles} · 근거문장 ${counts.sourceUnits} · ` +
      `종목연결 ${counts.articleStocks} · 게시물 ${counts.publications}(게시 ${published}) · 인용 ${counts.citations}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
