import assert from "node:assert/strict";
import { PRICE_LINKED_GOLDEN_CASES } from "./price-linked-news-golden";
import {
  createPriceLinkedReviewReport,
  renderPriceLinkedReviewHtml,
  validatePriceLinkedGoldenCases,
} from "./price-linked-news-review";

const cases = validatePriceLinkedGoldenCases();
assert.equal(cases.length, 10);
assert.equal(cases.filter((item) => item.status === "ready_for_human_review").length, 9);
assert.equal(cases.filter((item) => item.status === "rejected").length, 1);
assert.equal(new Set(cases.map((item) => item.eventType)).size >= 7, true);

const marketCase = cases.find((item) => item.caseId === "market-kospi-close");
assert.equal(marketCase?.scope, "market");
assert.deepEqual(marketCase?.stockIds, []);

const jypCase = cases.find((item) => item.caseId === "jyp-price-reaction");
assert.equal(jypCase?.status, "ready_for_human_review");
if (jypCase?.status === "ready_for_human_review") {
  assert.equal(jypCase.priceConnection.basis, "article_fact");
  assert.match(jypCase.priceConnection.text, /기사에서는/u);
}

const rejected = cases.find((item) => item.caseId === "hanwha-ocean-tender-not-awarded");
assert.equal(rejected?.status, "rejected");
if (rejected?.status === "rejected") assert.match(rejected.reasonCodes.join(" "), /NOT_AWARDED/u);

const report = createPriceLinkedReviewReport();
const html = renderPriceLinkedReviewHtml(report);
assert.match(html, /종목 화면 · 한 줄 뉴스/u);
assert.match(html, /뉴스 상세 · 같은 제목/u);
assert.match(html, /왜 주가와 관련 있어\?/u);
assert.match(html, /기사 속 말 배우기/u);
assert.match(html, /코스피는 국내 대표 기업들의 주가 흐름을 모아 보여주는 숫자예요/u);
assert.match(html, /시장 뉴스 사용 위치/u);
assert.match(html, /CONTRACT_NOT_AWARDED/u);
assert.doesNotMatch(html, /목표가|수익률 전망|사야 해|팔아야 해/u);
for (const item of cases) {
  if (item.status !== "ready_for_human_review") continue;
  assert.equal(html.split(item.headline.text).length - 1, 2);
}

const duplicateHeadline = PRICE_LINKED_GOLDEN_CASES.map((item) => item.status === "ready_for_human_review"
  ? { ...item, summaryLines: [{ ...item.summaryLines[0], text: item.headline.text }, ...item.summaryLines.slice(1)] }
  : item);
assert.throws(() => validatePriceLinkedGoldenCases(duplicateHeadline), /제목을 요약에서 그대로 반복/u);

console.log("price-linked child news golden tests passed");
