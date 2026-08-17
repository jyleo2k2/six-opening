import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * 아카이브 수익률 탭의 가족 피드는 **서버가 원본**이다. 반응(댓글·좋아요)을 로컬 상태로
 * 흉내 내면 새로고침에 사라지고 다른 가족에게는 보이지도 않는다.
 *
 * 화면의 가족 피드 읽기와 추가 페이지 병합은 `use-archive-data.ts` 가 담당한다.
 */
const root = new URL("../../f0-home/lib/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("archive family feed reads and mutates server reactions", () => {
  const data = read("use-archive-data.ts");
  const feed = read("archive-feed.ts");

  // 첫 50건과 아래로 내려가서 받은 다음 50건의 반응을 각각 서버에서 읽는다.
  assert.match(data, /fetch\("\/api\/family\?offset=0"/u);
  assert.match(data, /void loadReactions\(first\.trades\)/u);
  assert.match(data, /fetch\(`\/api\/family\?offset=\$\{nextOffset\}`/u);
  assert.match(data, /trades: \[\.\.\.current\.trades, \.\.\.added\]/u);
  assert.match(data, /await loadReactions\(added\)/u);
  assert.match(data, /\/api\/comments\?transaction_id=/u);
  assert.match(data, /\/api\/likes\?transaction_id=/u);

  // 쓰기는 모두 서버를 지난다.
  assert.match(data, /fetch\("\/api\/likes", \{\s*method: "POST"/u);
  assert.match(data, /fetch\("\/api\/comments", \{\s*method: "POST"/u);
  assert.match(data, /method: "DELETE"/u);

  // 좋아요 개수는 서버 응답으로만 갱신한다 — 화면에서 세면 다른 가족의 수를 잃는다.
  assert.match(data, /setLikes\(\(current\) => \(\{ \.\.\.current, \[transactionId\]: payload \}\)\)/u);
  assert.doesNotMatch(data, /likeCount \+ 1|count: .*\+ 1/u);

  // 카드가 보는 거래·반응은 서버가 준 것뿐이다.
  assert.match(feed, /export function feedCards\(/u);
  assert.match(feed, /likes\[trade\.id\]/u);
  assert.match(feed, /comments\[trade\.id\]/u);
  // 남의 체결가는 서버가 이미 지운 채 내려온다. 화면에서 되살리지 않는다.
  assert.match(feed, /trade\.price === null \|\| trade\.price === undefined \? null/u);
  assert.match(feed, /"비공개"/u);
});
