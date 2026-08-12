import assert from "node:assert/strict";
import { AUTOMOTIVE_AND_SHIPBUILDING_EDUCATION, findAutomotiveAndShipbuildingEducation } from "./automotive-shipbuilding-education";
assert.deepEqual(AUTOMOTIVE_AND_SHIPBUILDING_EDUCATION.map((item) => item.stockId), ["KRX:000270", "KRX:005380", "KRX:089860", "KRX:012330", "KRX:329180", "KRX:009540", "KRX:042660", "KRX:010140"]);
for (const item of AUTOMOTIVE_AND_SHIPBUILDING_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}
assert.equal(findAutomotiveAndShipbuildingEducation("KRX:010140")?.stockId, "KRX:010140");
assert.equal(findAutomotiveAndShipbuildingEducation("KRX:259960"), undefined);
console.log("automotive and shipbuilding education data tests passed");

