import assert from "node:assert/strict";
import { findGameEducation, GAME_EDUCATION } from "./game-education";

assert.deepEqual(
  GAME_EDUCATION.map((education) => education.stockId),
  ["KRX:259960", "KRX:036570", "KRX:251270", "KRX:192080"],
);

for (const education of GAME_EDUCATION) {
  // 더블유게임즈는 아동 적합성 판단이 남아 draft다. 나머지는 검수를 마쳤다.
  assert.equal(education.status, education.stockId === "KRX:192080" ? "draft" : "reviewed");
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

// 더블유게임즈는 소셜 카지노 게임 회사다. 사실대로 적었을 뿐 아동용 검수를
// 거치지 않았으므로 draft로 고정한다. 사람이 적합성을 판단하기 전까지 유지한다.
const doubleu = findGameEducation("KRX:192080");
assert.equal(doubleu?.stockId, "KRX:192080");
assert.equal(doubleu?.status, "draft");
assert.equal(findGameEducation("KRX:005930"), undefined);

console.log("game education data tests passed");

