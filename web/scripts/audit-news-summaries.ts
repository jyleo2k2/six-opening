/**
 * 게시된 어린이 뉴스의 3줄 요약을 전수 검사한다.
 *
 * 판정은 `news-audit-rules.ts` 가 하고 여기서는 DB 를 읽어 넣기만 한다.
 * 적재 전에 돌려 빈약한 요약이 화면까지 가지 않게 막는 용도다.
 *
 * 실행:
 *   cd web && npm run news:audit          # 요약만
 *   cd web && npm run news:audit -- --all # 결함 있는 기사 전부 자세히
 */

import { loadDevelopmentEnvironment } from "../app/api/dev-env";
import { selectRows } from "../app/api/supabase";
import { auditSummary, severityOf, type Issue } from "./news-audit-rules";

type FeedRow = {
  news_id: number;
  article_id: number;
  stock_codes: string[] | null;
  event_type: string;
  headline: string;
  summary_lines: string[] | null;
};

const readAll = async <T,>(table: string, params: Record<string, string>): Promise<T[]> => {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await selectRows<T>(table, { ...params, limit: "500", offset: String(offset) });
    rows.push(...page);
    if (page.length < 500) return rows;
  }
};

async function main() {
  loadDevelopmentEnvironment();
  const verbose = process.argv.includes("--all");

  const feed = await readAll<FeedRow>("news_feed_items", {
    select: "news_id,article_id,stock_codes,event_type,headline,summary_lines",
    order: "news_id.asc",
  });
  const citations = await readAll<{ publication_id: number; output_field: string; source_unit_id: string }>(
    "news_citations", { select: "publication_id,output_field,source_unit_id" });
  const units = await readAll<{ article_id: number; source_unit_id: string; source_text: string }>(
    "news_source_units", { select: "article_id,source_unit_id,source_text" });

  const unitsByArticle = new Map<number, Record<string, string>>();
  for (const unit of units) {
    const map = unitsByArticle.get(unit.article_id) ?? {};
    map[unit.source_unit_id] = unit.source_text;
    unitsByArticle.set(unit.article_id, map);
  }
  const citesByPublication = new Map<number, Record<number, string[]>>();
  for (const cite of citations) {
    const match = /^summary_line_([123])$/u.exec(cite.output_field);
    if (!match) continue;
    const map = citesByPublication.get(cite.publication_id) ?? {};
    const line = Number(match[1]);
    map[line] = [...(map[line] ?? []), cite.source_unit_id];
    citesByPublication.set(cite.publication_id, map);
  }

  const results = feed.map((row) => ({
    row,
    issues: auditSummary({
      headline: row.headline,
      lines: row.summary_lines ?? [],
      citations: citesByPublication.get(row.news_id) ?? {},
      sourceUnits: unitsByArticle.get(row.article_id) ?? {},
    }),
  }));
  const defective = results.filter((r) => r.issues.length > 0)
    .sort((a, b) => severityOf(b.issues) - severityOf(a.issues));

  const tally = new Map<Issue["kind"], number>();
  for (const { issues } of defective) {
    for (const issue of issues) tally.set(issue.kind, (tally.get(issue.kind) ?? 0) + 1);
  }

  console.log(`검사 ${feed.length}건 · 결함 ${defective.length}건 · 무결점 ${feed.length - defective.length}건\n`);
  for (const [kind, count] of [...tally].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind.padEnd(7)} ${String(count).padStart(3)}건`);
  }

  for (const { row, issues } of verbose ? defective : defective.slice(0, 5)) {
    console.log(`\n[${severityOf(issues)}] #${row.news_id} ${(row.stock_codes ?? [])[0] ?? "-"} — ${row.headline}`);
    (row.summary_lines ?? []).forEach((line, i) => console.log(`    ${i + 1}. ${line}`));
    for (const issue of issues) console.log(`    └ ${issue.kind}: ${issue.detail}`);
  }
  if (!verbose && defective.length > 5) {
    console.log(`\n… 나머지 ${defective.length - 5}건은 --all 로 본다.`);
  }

  // 게이트로 쓸 때 결함이 있으면 실패로 끝낸다.
  if (defective.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
