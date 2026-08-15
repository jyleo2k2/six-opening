import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * 아카이브 수익률 탭의 가족 피드는 **서버가 원본**이다. 반응(댓글·좋아요)을 로컬 상태로
 * 흉내 내면 새로고침에 사라지고 다른 가족에게는 보이지도 않는다.
 *
 * 화면이 `ui-src` 에서 React 로 옮겨 오면서(아카이브 이관) 감시 대상도 옮겼다. 예전에는
 * 조립된 `methods/*.js` 를 읽었고, 지금은 그 일을 하는 `use-archive-data.ts` 를 읽는다.
 */
const root = new URL("../../f0-home/lib/", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

test("archive family feed reads and mutates server reactions", () => {
  const data = read("use-archive-data.ts");
  const feed = read("archive-feed.ts");

  // 가족 응답을 받은 뒤 그 체결 id 로 반응을 한 번에 읽는다.
  assert.match(data, /loadReactions\(Array\.isArray\(data\.trades\)/u);
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
