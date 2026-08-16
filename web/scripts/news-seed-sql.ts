/**
 * 뉴스 복구본 SQL 을 만드는 순수 함수들. DB 도 파일도 건드리지 않는다.
 *
 * 여기서 값 하나만 잘못 적어도 복구본 전체가 못 쓰게 된다 — 뉴스는 다시 받아올 수
 * 없으므로 그 순간 원본이 사라진다. 그래서 문자열 이스케이프와 배열·jsonb 구분은
 * 테스트로 고정한다(`news-seed-sql.test.ts`).
 */

/** 값이 배열이어도 `text[]` 가 아니라 jsonb 로 적어야 하는 칸. */
export const JSONB_COLUMNS = new Set(["term_treatments"]);

export type Row = Record<string, unknown>;

export function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function literal(column: string, value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${column}: 유한하지 않은 숫자`);
    return String(value);
  }
  if (typeof value === "string") return quote(value);
  if (Array.isArray(value) && !JSONB_COLUMNS.has(column)) {
    // 빈 배열은 원소 타입을 모르므로 캐스트를 붙여 준다.
    if (value.length === 0) return "'{}'::text[]";
    return `array[${value.map((item) => literal(column, item)).join(", ")}]::text[]`;
  }
  return `${quote(JSON.stringify(value))}::jsonb`;
}

export function insertStatements(
  table: string,
  rows: readonly Row[],
  overrideIdentity: boolean,
): string {
  if (rows.length === 0) return `-- ${table}: 행 없음\n`;
  const columns = Object.keys(rows[0]);
  const overriding = overrideIdentity ? "\noverriding system value" : "";
  const values = rows
    .map((row) => `  (${columns.map((column) => literal(column, row[column])).join(", ")})`)
    .join(",\n");
  return (
    `insert into public.${table} (\n  ${columns.join(", ")}\n)${overriding}\nvalues\n${values}\n` +
    `on conflict do nothing;\n`
  );
}

/**
 * 게시물은 `draft` 로 눕혀서 넣는다. 진짜 상태는 인용까지 채운 뒤 마지막에 올린다.
 * `published_at`·`ready_at` 같은 시각은 그대로 들고 들어가므로 복원본이 원본과 같다.
 */
export function publicationInsert(rows: readonly Row[]): string {
  return insertStatements(
    "news_publications",
    rows.map((row) => ({ ...row, status: "draft" })),
    true,
  );
}

export function publicationStatusUpdates(rows: readonly Row[]): string {
  const byStatus = new Map<string, number[]>();
  for (const row of rows) {
    const status = String(row.status);
    const ids = byStatus.get(status) ?? [];
    ids.push(Number(row.id));
    byStatus.set(status, ids);
  }
  return [...byStatus]
    .map(
      ([status, ids]) =>
        `update public.news_publications set status = ${quote(status)}\n` +
        `where id in (${ids.join(", ")}) and status = 'draft';\n`,
    )
    .join("\n");
}

/** 명시적 id 로 넣었으므로 identity 다음 값을 최대치 뒤로 밀어 준다. */
export function restartIdentity(table: string, rows: readonly Row[]): string {
  if (rows.length === 0) return "";
  const next = Math.max(...rows.map((row) => Number(row.id))) + 1;
  return `alter table public.${table} alter column id restart with ${next};\n`;
}
