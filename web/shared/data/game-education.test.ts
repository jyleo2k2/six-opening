import assert from "node:assert/strict";
import { findGameEducation, GAME_EDUCATION } from "./game-education";

assert.deepEqual(
  GAME_EDUCATION.map((education) => education.stockId),
  ["KRX:259960", "KRX:036570", "KRX:251270"],
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

// 더블유게임즈(KRX:192080)는 아직 교육 데이터가 없다. 소셜 카지노 게임 회사라
// 아이 눈높이 설명과 화이트리스트 적합성을 사람이 먼저 판단해야 한다.
assert.equal(findGameEducation("KRX:192080"), undefined);
assert.equal(findGameEducation("KRX:005930"), undefined);

console.log("game education data tests passed");

