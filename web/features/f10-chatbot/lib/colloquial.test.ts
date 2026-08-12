import assert from "node:assert/strict";
import {
  looksLikeNewQuestion,
  matchColloquialIntent,
  normalizeReply,
} from "./colloquial";

// 정규화: 반복 축약·이모지 치환·기호 제거
assert.equal(normalizeReply("응응응응"), "응응");
assert.equal(normalizeReply("  응!  "), "응");
assert.equal(normalizeReply("👍"), "응");
assert.equal(normalizeReply("ＯＫ"), "ok");
assert.equal(normalizeReply("...."), "");
// NFKC가 호환 자모를 조합용 자모로 바꾸므로 raw 비교 대신 정규화끼리 비교한다.
assert.equal(normalizeReply("ㅇㅇㅇㅇㅇ"), normalizeReply("ㅇㅇ"));
assert.notEqual(normalizeReply("ㅇㅇ"), "ㅇㅇ");

// 긍정 — 초성체·구어·존댓말·외래어·이모지
for (const yes of [
  "ㅇㅇ", "ㅇ", "ㅇㅋ", "ㄱㄱ",
  "응", "웅", "엉", "어", "응응", "웅웅", "으응", "응응응응",
  "네", "넹", "넵", "넴", "예",
  "그래", "맞아", "알겠어", "알았어", "이해했어", "좋아",
  "오케이", "오키", "ok", "yes",
  "응!", "ㅇㅇ...", "👍",
]) {
  assert.equal(matchColloquialIntent(yes), "yes", `긍정 실패: ${yes}`);
}

// 부정 — "모르겠다" 계열은 4단계에서 예시로 내려가야 한다
for (const no of [
  "ㄴㄴ", "ㄴ",
  "아니", "아냐", "아니야", "아니요", "아뇨", "노노", "no",
  "몰라", "모르겠어", "모름", "잘모르겠어", "잘 모르겠어",
  "어려워", "헷갈려", "이해안돼", "못알아들었어",
  "아니...", "ㄴㄴㄴㄴ", "👎",
]) {
  assert.equal(matchColloquialIntent(no), "no", `부정 실패: ${no}`);
}

// 판단 불가 — 추측하지 않는다
for (const unclear of [
  "", "   ", "ㅋㅋ", "ㄱㅊ", "음...뭐지", "삼성전자", "1", "글쎄",
]) {
  assert.equal(matchColloquialIntent(unclear), null, `오판: ${unclear}`);
}

// 부분 일치로 오판하지 않는다
assert.equal(matchColloquialIntent("아니면 뭐야?"), null);
assert.equal(matchColloquialIntent("응 근데 PER은 뭐야?"), null);

// 새 질문 판별
assert.equal(looksLikeNewQuestion("PER이 뭐야?"), true);
assert.equal(looksLikeNewQuestion("왜 그래"), true);
assert.equal(looksLikeNewQuestion("어떻게 사"), true);
assert.equal(looksLikeNewQuestion("알려줘"), true);
assert.equal(looksLikeNewQuestion("ㅇㅇ"), false);
assert.equal(looksLikeNewQuestion("몰라"), false);

console.log("colloquial tests passed");
