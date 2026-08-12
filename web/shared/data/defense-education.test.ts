import assert from "node:assert/strict";
import { DEFENSE_EDUCATION, findDefenseEducation } from "./defense-education";
assert.deepEqual(DEFENSE_EDUCATION.map((item) => item.stockId), ["KRX:064350", "KRX:012450", "KRX:079550", "KRX:047810"]);
for (const item of DEFENSE_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}
assert.equal(findDefenseEducation("KRX:047810")?.stockId, "KRX:047810");
assert.equal(findDefenseEducation("KRX:259960"), undefined);
console.log("defense education data tests passed");

