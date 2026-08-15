import assert from "node:assert/strict";
import { formatNewsDate, validNewsItem } from "./stock-news";

// `app.html` 의 validNewsItem 과 같은 판정을 해야 한다 — 계약이 어긋난 뉴스는 화면에 오르지 않는다.
const good = {
  newsId: 3,
  articleId: 7,
  scope: "company",
  stockCodes: ["005930"],
  headline: "삼성전자가 새 반도체 공장을 짓기로 했어",
  homeSummary: "새 공장을 짓기로 했어",
  summaryLines: ["새 공장을 짓기로 했어", "반도체를 더 많이 만들 수 있어", "완성까지는 몇 년 걸려"],
  publisher: "키움뉴스",
  sourcePublishedAt: "2026-08-14T09:00:00.000Z",
  sourceUrl: "https://example.com/a",
};

assert.equal(validNewsItem(good, "005930"), true);
// 다른 종목의 뉴스는 거른다.
assert.equal(validNewsItem(good, "000660"), false);
// 3줄 요약이 아니면 버린다.
assert.equal(validNewsItem({ ...good, summaryLines: good.summaryLines.slice(0, 2) }, "005930"), false);
// 한 줄 36자 초과도 버린다.
assert.equal(
  validNewsItem({ ...good, summaryLines: ["가".repeat(37), "둘", "셋"] }, "005930"),
  false,
);
// 원문 주소가 http(s) 가 아니면 버린다.
assert.equal(validNewsItem({ ...good, sourceUrl: "javascript:alert(1)" }, "005930"), false);
assert.equal(validNewsItem(null, "005930"), false);

// KST 날짜 표기.
assert.equal(formatNewsDate("2026-08-14T20:00:00.000Z"), "2026. 08. 15.");
assert.equal(formatNewsDate("not-a-date"), "");

console.log("stock news contract tests passed");
