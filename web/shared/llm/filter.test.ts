import assert from "node:assert/strict";
import { filterGeneratedText, takeCompleteSentences } from "./filter";

assert.equal(filterGeneratedText("PER은 회사 이익과 주가를 비교하는 숫자야."), true);
assert.equal(filterGeneratedText("이 종목을 지금 사는 게 좋아."), false);
assert.equal(filterGeneratedText("목표가는 10,000원이야."), false);

assert.deepEqual(takeCompleteSentences("첫 문장이야. 둘째 문장이야").complete, ["첫 문장이야."]);
assert.equal(takeCompleteSentences("첫 문장이야. 둘째 문장이야").remainder, "둘째 문장이야");

console.log("llm filter tests passed");
