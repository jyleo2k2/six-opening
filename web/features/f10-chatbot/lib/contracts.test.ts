import assert from "node:assert/strict";
import {
  isAllowedUiAction,
  isExplainAction,
  parseChatRequest,
  sanitizeActionPayload,
} from "./contracts";

assert.deepEqual(
  parseChatRequest({
    message: "  PER이 뭐야?  ",
    context: {
      screen: "stock",
      stockId: "KRX:005930",
      stockName: "삼성전자",
    },
  }),
  {
    message: "PER이 뭐야?",
    context: {
      screen: "stock",
      stockId: "KRX:005930",
      stockName: "삼성전자",
    },
  },
);
assert.equal(parseChatRequest({ message: "", context: { screen: "home" } }), null);
assert.equal(parseChatRequest({ message: "안녕", context: { screen: "admin" } }), null);
assert.equal(parseChatRequest({ message: "안녕", context: { screen: "order", quantity: -1 } }), null);
assert.equal(parseChatRequest({ message: "안녕", context: { screen: "stock", stockId: "005930" } }), null);
assert.equal(
  parseChatRequest({ message: "내 기록", userId: "another-user", context: { screen: "archive" } }),
  null,
);
assert.equal(
  parseChatRequest({ message: "내 기록", context: { screen: "archive", targetUserId: "parent" } }),
  null,
);

const explainReply = {
  scriptId: "term:per",
  stage: "brief" as const,
  choiceId: "high",
};

assert.deepEqual(
  parseChatRequest({ message: "높은 편이야", context: { screen: "stock" }, explain: explainReply }),
  { message: "높은 편이야", context: { screen: "stock" }, explain: explainReply },
);
// choiceId 없이 타이핑한 경우도 허용한다.
assert.deepEqual(
  parseChatRequest({
    message: "ㅇㅇ",
    context: { screen: "stock" },
    explain: { scriptId: "term:per", stage: "detail" },
  }),
  { message: "ㅇㅇ", context: { screen: "stock" }, explain: { scriptId: "term:per", stage: "detail" } },
);
// example 단계는 응답을 받지 않는다.
assert.equal(
  parseChatRequest({
    message: "응",
    context: { screen: "stock" },
    explain: { ...explainReply, stage: "example" },
  }),
  null,
);
// 공통 유도형 DAPIE의 후속 단계는 허용한다.
assert.deepEqual(
  parseChatRequest({
    message: "여기까지 볼래",
    context: { screen: "home" },
    explain: { scriptId: "flow:guided", stage: "followup", choiceId: "done" },
  }),
  {
    message: "여기까지 볼래",
    context: { screen: "home" },
    explain: { scriptId: "flow:guided", stage: "followup", choiceId: "done" },
  },
);
assert.equal(
  parseChatRequest({
    message: "응",
    context: { screen: "stock" },
    explain: { ...explainReply, scriptId: "javascript:alert(1)" },
  }),
  null,
);
assert.equal(
  isExplainAction({
    kind: "explain",
    turn: {
      scriptId: "term:per",
      stage: "brief",
      prompt: "PER이 크면 어떨까?",
      choices: [{ id: "high", label: "높은 편이야" }],
    },
  }),
  true,
);
assert.equal(isExplainAction({ kind: "explain", turn: { scriptId: "term:per", stage: "brief", prompt: "?", choices: [] } }), false);

assert.equal(isAllowedUiAction({ type: "open_screen", target: "archive" }), true);
assert.equal(isAllowedUiAction({ type: "open_url", target: "https://example.com" }), false);
assert.deepEqual(
  sanitizeActionPayload({
    text: "기록을 볼 수 있어.",
    suggestedQuestions: [" 첫 질문 ", "둘째", "셋째", "넷째"],
    uiAction: { type: "open_screen", target: "archive" },
  }),
  {
    suggestedQuestions: ["첫 질문", "둘째", "셋째"],
    uiAction: { type: "open_screen", target: "archive" },
  },
);

console.log("chat contracts tests passed");
