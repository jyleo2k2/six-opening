import assert from "node:assert/strict";
import { COMMENT_MAX_LENGTH, gateComment } from "./comment-filter";

const parentToChild = { author: "parent" as const, target: "child" as const };
const childToParent = { author: "child" as const, target: "parent" as const };

// 부모 -> 자녀: 추천·매매 지시 차단
for (const body of [
  "이거 지금 사라",
  "그냥 팔아라",
  "손절해야지",
  "엄마 생각엔 이 종목 추천해",
  "지금 사는게 좋아",
]) {
  const result = gateComment({ body, ...parentToChild });
  assert.equal(result.ok, false, `차단 실패: ${body}`);
  if (!result.ok) assert.equal(result.reason, "recommendation", body);
}

// 부모 -> 자녀: 시점·전망 차단
for (const body of ["내일 팔아", "이거 곧 오를거야", "더 떨어질거야"]) {
  const result = gateComment({ body, ...parentToChild });
  assert.equal(result.ok, false, `차단 실패: ${body}`);
  if (!result.ok) assert.equal(result.reason, "timing", body);
}

// 부모 -> 자녀: 훈계 차단
for (const body of ["그러니까 내가 뭐랬어", "왜 샀어 진짜", "엄마 말을 들어야지", "좀 답답하네"]) {
  const result = gateComment({ body, ...parentToChild });
  assert.equal(result.ok, false, `차단 실패: ${body}`);
  if (!result.ok) assert.equal(result.reason, "scolding", body);
}

// 부모 -> 자녀: 성적 평가 차단
for (const body of ["이번엔 못했네", "완전 틀렸어", "몇점짜리 판단이니"]) {
  const result = gateComment({ body, ...parentToChild });
  assert.equal(result.ok, false, `차단 실패: ${body}`);
  if (!result.ok) assert.equal(result.reason, "grading", body);
}

// 부모 -> 자녀: 질문·관찰은 통과해야 한다
for (const body of [
  "왜 이 회사를 골랐는지 더 듣고 싶어",
  "확신도를 꽤로 고른 이유가 궁금해",
  "엄마는 뉴스만 보고 골랐는데 민지는 어땠어?",
  "포켓몬빵 회사인 줄 몰랐네. 재밌다",
]) {
  assert.equal(gateComment({ body, ...parentToChild }).ok, true, `오차단: ${body}`);
}

// 자녀 -> 부모는 검사하지 않는다
assert.equal(gateComment({ body: "엄마 이거 팔아라", ...childToParent }).ok, true);
assert.equal(gateComment({ body: "왜 샀어?", ...childToParent }).ok, true);

// 길이·공백
assert.equal(gateComment({ body: "   ", ...parentToChild }).ok, false);
assert.equal(gateComment({ body: "가".repeat(COMMENT_MAX_LENGTH + 1), ...parentToChild }).ok, false);
assert.equal(gateComment({ body: "가".repeat(COMMENT_MAX_LENGTH), ...parentToChild }).ok, true);

// 통과 시 공백을 정리해 돌려준다
const trimmed = gateComment({ body: "  좋은 기록이야  ", ...parentToChild });
assert.equal(trimmed.ok, true);
if (trimmed.ok) assert.equal(trimmed.body, "좋은 기록이야");

console.log("comment filter tests passed");
