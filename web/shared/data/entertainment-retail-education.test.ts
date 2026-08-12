import assert from "node:assert/strict";
import { ENTERTAINMENT_AND_RETAIL_EDUCATION, findEntertainmentAndRetailEducation } from "./entertainment-retail-education";
assert.deepEqual(ENTERTAINMENT_AND_RETAIL_EDUCATION.map((item) => item.stockId), ["KRX:352820", "KRX:041510", "KRX:035900", "KRX:122870", "KRX:021240", "KRX:004170", "KRX:282330"]);
for (const item of ENTERTAINMENT_AND_RETAIL_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}
assert.equal(findEntertainmentAndRetailEducation("KRX:282330")?.stockId, "KRX:282330");
assert.equal(findEntertainmentAndRetailEducation("KRX:259960"), undefined);
console.log("entertainment and retail education data tests passed");

