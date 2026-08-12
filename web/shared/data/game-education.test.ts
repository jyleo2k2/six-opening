import assert from "node:assert/strict";
import { findGameEducation, GAME_EDUCATION } from "./game-education";

assert.deepEqual(
  GAME_EDUCATION.map((education) => education.stockId),
  ["KRX:259960", "KRX:036570", "KRX:251270", "KRX:263750"],
);

for (const education of GAME_EDUCATION) {
  assert.equal(education.status, "reviewed");
  assert.ok(education.companySummary.length > 0);
  assert.ok(education.businessModel.length > 0);
  assert.ok(education.industryRole.length > 0);
  assert.ok(education.elementaryExplanation.length > 0);
  assert.ok(education.middleSchoolExplanation.length > 0);
  assert.ok(education.financialSummary.length > 0);
  assert.equal(education.financialSnapshot.period, "2024");
  assert.ok(education.sources.length > 0);
  assert.ok(education.sources.every((source) => source.url.startsWith("https://")));
}

assert.equal(findGameEducation("KRX:263750")?.stockId, "KRX:263750");
assert.equal(findGameEducation("KRX:005930"), undefined);

console.log("game education data tests passed");

