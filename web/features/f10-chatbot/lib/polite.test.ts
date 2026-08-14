import assert from "node:assert/strict";
import { isHaeyoKorean, toPoliteKorean } from "./polite";

const converted = toPoliteKorean(
  "나는 AI 도우미야. 혼자 결정하지 않아도 돼. 화면을 다시 봐. 궁금하면 물어봐.",
);

assert.equal(
  converted,
  "나는 AI 도우미예요. 혼자 결정하지 않아도 돼요. 화면을 다시 봐요. 궁금하면 물어봐요.",
);
assert.equal(toPoliteKorean("다른 종목도 알아볼까?"), "다른 종목도 알아볼까요?");
assert.equal(isHaeyoKorean(converted), true);
assert.equal(isHaeyoKorean("나는 AI 도우미야."), false);
assert.equal(isHaeyoKorean("답변을 준비했어요. 🐻"), true);

console.log("chatbot polite tests passed");
