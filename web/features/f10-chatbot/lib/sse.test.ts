import assert from "node:assert/strict";
import test from "node:test";
import { isCompleteChatStream } from "./sse";

test("done 이벤트와 답변이 모두 있어야 완료다", () => {
  assert.equal(isCompleteChatStream(true, "", "답변이에요."), true);
  assert.equal(isCompleteChatStream(false, "", "중간까지만 온 답변"), false);
  assert.equal(isCompleteChatStream(true, "event: do", "답변이에요."), false);
  assert.equal(isCompleteChatStream(true, "", "   "), false);
});
