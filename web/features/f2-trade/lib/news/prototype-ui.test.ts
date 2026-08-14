import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../../../public/ui/app.html", import.meta.url),
  "utf8",
);

assert.match(source, /fetch\('\/api\/news\?stockId='/u);
assert.match(source, /fetch\('\/api\/news\/'/u);
assert.match(source, /stockNews: newsItem \? newsItem\.headline/u);
assert.match(source, /if \(item\.scope !== 'company'\) return false/u);
assert.doesNotMatch(source, /detailNews\.scope === 'market'/u);
assert.match(source, /activeNewsId:item\.newsId, activeNews:item/u);
assert.match(
  source,
  /fresh\.newsId !== item\.newsId \|\| fresh\.articleId !== item\.articleId/u,
);
assert.match(source, /newsHeadline: detailNews \? detailNews\.headline/u);
assert.match(source, /newsLines: detailNews \? detailNews\.summaryLines\.map/u);
assert.match(source, /window\.location\.assign\(detailNews\.sourceUrl\)/u);
assert.match(source, /timeZone:'Asia\/Seoul'/u);
assert.match(source, />3줄 요약</u);
assert.match(source, />원문 보기 ↗</u);
assert.doesNotMatch(source, /const NEWS =/u);
assert.doesNotMatch(source, /newsBody|newsPoints/u);

console.log("news prototype UI contract tests passed");
