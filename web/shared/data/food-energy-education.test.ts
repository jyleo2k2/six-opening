import assert from "node:assert/strict";
import { findFoodAndEnergyEducation, FOOD_AND_ENERGY_EDUCATION } from "./food-energy-education";
assert.deepEqual(FOOD_AND_ENERGY_EDUCATION.map((item) => item.stockId), ["KRX:003230", "KRX:271560", "KRX:097950", "KRX:004370", "KRX:015760", "KRX:010950", "KRX:078930", "KRX:096770", "KRX:047050"]);
for (const item of FOOD_AND_ENERGY_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}
assert.equal(findFoodAndEnergyEducation("KRX:047050")?.stockId, "KRX:047050");
assert.equal(findFoodAndEnergyEducation("KRX:259960"), undefined);
console.log("food and energy education data tests passed");

