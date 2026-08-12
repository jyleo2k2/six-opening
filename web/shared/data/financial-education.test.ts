import assert from "node:assert/strict";
import { FINANCIAL_EDUCATION, findFinancialEducation } from "./financial-education";
assert.deepEqual(FINANCIAL_EDUCATION.map((item) => item.stockId), ["KRX:105560", "KRX:055550", "KRX:086790", "KRX:316140", "KRX:402340", "KRX:039490"]);
for (const item of FINANCIAL_EDUCATION) {
  assert.equal(item.status, "reviewed");
  assert.ok(item.companySummary.length > 0 && item.businessModel.length > 0 && item.industryRole.length > 0);
  assert.ok(item.elementaryExplanation.length > 0 && item.middleSchoolExplanation.length > 0 && item.financialSummary.length > 0);
  assert.equal(item.financialSnapshot.period, "2024");
  assert.ok(item.financialSnapshot.netProfitKrwMillion !== 0);
  assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
}
assert.equal(findFinancialEducation("KRX:402340")?.stockId, "KRX:402340");
assert.equal(findFinancialEducation("KRX:039490")?.financialSnapshot.netProfitKrwMillion, 834900);
assert.equal(findFinancialEducation("KRX:259960"), undefined);
console.log("financial education data tests passed");

