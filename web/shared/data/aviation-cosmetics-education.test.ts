import assert from "node:assert/strict";
import {
  AVIATION_AND_COSMETICS_EDUCATION,
  findAviationAndCosmeticsEducation,
} from "./aviation-cosmetics-education";

assert.deepEqual(
  AVIATION_AND_COSMETICS_EDUCATION.map((item) => item.stockId),
  [
    "KRX:003490",
    "KRX:020560",
    "KRX:180640",
    "KRX:278470",
    "KRX:090430",
    "KRX:483650",
    "KRX:051900",
  ],
);

for (const item of AVIATION_AND_COSMETICS_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}

assert.equal(findAviationAndCosmeticsEducation("KRX:483650")?.stockId, "KRX:483650");
assert.equal(findAviationAndCosmeticsEducation("KRX:259960"), undefined);
console.log("aviation and cosmetics education data tests passed");
