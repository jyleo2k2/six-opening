import assert from "node:assert/strict";
import { findLogisticsAndSemiconductorEducation, LOGISTICS_AND_SEMICONDUCTOR_EDUCATION } from "./logistics-semiconductor-education";
assert.deepEqual(LOGISTICS_AND_SEMICONDUCTOR_EDUCATION.map((item) => item.stockId), ["KRX:000120", "KRX:011200", "KRX:086280", "KRX:005930", "KRX:000660", "KRX:066570"]);
for (const item of LOGISTICS_AND_SEMICONDUCTOR_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}
assert.equal(findLogisticsAndSemiconductorEducation("KRX:066570")?.stockId, "KRX:066570");
assert.equal(findLogisticsAndSemiconductorEducation("KRX:259960"), undefined);
console.log("logistics and semiconductor education data tests passed");

