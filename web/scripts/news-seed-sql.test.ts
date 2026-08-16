import assert from "node:assert/strict";
import {
  insertStatements,
  literal,
  publicationInsert,
  publicationStatusUpdates,
  restartIdentity,
} from "./news-seed-sql";

function test(name: string, run: () => void): void {
  run();
  console.log(`✓ ${name}`);
}

test("따옴표가 든 본문을 깨뜨리지 않는다 — 여기가 무너지면 복구본이 통째로 못 쓴다", () => {
  assert.equal(literal("headline", "아이's 뉴스"), "'아이''s 뉴스'");
  assert.equal(literal("headline", "'; drop table news_articles; --"), "'''; drop table news_articles; --'");
  // 줄바꿈은 Postgres 문자열 안에서 그대로 살아 있어도 된다. 잘라내면 원문이 바뀐다.
  assert.equal(literal("source_text", "첫 줄\n둘째 줄"), "'첫 줄\n둘째 줄'");
});

test("빈 값과 숫자·불리언을 타입 그대로 적는다", () => {
  assert.equal(literal("reject_stage", null), "null");
  assert.equal(literal("reject_stage", undefined), "null");
  assert.equal(literal("is_anchor", true), "true");
  assert.equal(literal("is_anchor", false), "false");
  assert.equal(literal("ordinal", 3), "3");
  assert.throws(() => literal("ordinal", Number.NaN), /유한하지 않은/u);
});

test("빈 배열도 원소 타입을 잃지 않는다 — 캐스트가 없으면 Postgres 가 거부한다", () => {
  assert.equal(literal("reject_codes", []), "'{}'::text[]");
  assert.equal(
    literal("selector_stock_codes", ["005930", "000660"]),
    "array['005930', '000660']::text[]",
  );
});

test("term_treatments 만 jsonb 로 적는다 — text[] 로 적으면 풀이가 사라진다", () => {
  const treatments = [{ term: "매출", treatment: "explained", easyText: "번 돈", sourceIds: ["S1"] }];
  const rendered = literal("term_treatments", treatments);
  assert.ok(rendered.endsWith("::jsonb"), "jsonb 캐스트가 붙어야 한다");
  assert.deepEqual(JSON.parse(rendered.slice(1, -"'::jsonb".length).replaceAll("''", "'")), treatments);
});

test("identity 열은 명시한 id 를 그대로 쓰도록 overriding 을 붙인다", () => {
  const sql = insertStatements("news_articles", [{ id: 5, scope: "market" }], true);
  assert.match(sql, /overriding system value/u);
  assert.match(sql, /\(5, 'market'\)/u);
  assert.match(sql, /on conflict do nothing;/u);

  // 합성키 표는 identity 가 없다. 그때 붙이면 Postgres 가 문법 오류를 낸다.
  const child = insertStatements("news_citations", [{ publication_id: 1 }], false);
  assert.doesNotMatch(child, /overriding system value/u);
});

test("행이 없으면 빈 insert 대신 주석을 남긴다", () => {
  assert.equal(insertStatements("news_citations", [], false), "-- news_citations: 행 없음\n");
  assert.equal(restartIdentity("news_articles", []), "");
});

test("게시물은 draft 로 눕혀 넣고 상태는 마지막에 올린다", () => {
  const rows = [
    { id: 1, status: "published", headline: "가" },
    { id: 2, status: "withdrawn", headline: "나" },
    { id: 3, status: "published", headline: "다" },
  ];
  // 증거(인용·근거문장)를 넣는 동안 게시물이 published 면 트리거가 INSERT 를 막는다.
  const insert = publicationInsert(rows);
  assert.doesNotMatch(insert, /'published'|'withdrawn'/u);
  assert.equal(insert.match(/'draft'/gu)?.length, 3);

  const updates = publicationStatusUpdates(rows);
  assert.match(updates, /set status = 'published'\nwhere id in \(1, 3\) and status = 'draft';/u);
  assert.match(updates, /set status = 'withdrawn'\nwhere id in \(2\) and status = 'draft';/u);
});

test("identity 다음 값을 최대 id 뒤로 민다 — 안 밀면 다음 적재가 충돌한다", () => {
  assert.equal(
    restartIdentity("news_articles", [{ id: 7 }, { id: 115 }, { id: 3 }]),
    "alter table public.news_articles alter column id restart with 116;\n",
  );
});

console.log("news-seed-sql tests passed");
