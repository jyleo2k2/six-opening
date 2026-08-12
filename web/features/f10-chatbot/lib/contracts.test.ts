import assert from "node:assert/strict";
import {
  isAllowedUiAction,
  isExplainAction,
  isGuidedDialogueAction,
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

const explain = { scriptId: "term:per", stage: "brief" as const, choiceId: "profit-and-price" };
assert.deepEqual(
  parseChatRequest({
    message: "회사가 번 이익과 주가",
    context: { screen: "stock" },
    explain,
  })?.explain,
  explain,
);
assert.equal(parseChatRequest({ message: "알겠어", context: { screen: "stock" }, explain: { ...explain, choiceId: "" } }), null);
assert.equal(
  isExplainAction({
    kind: "explain",
    turn: {
      scriptId: "term:per",
      stage: "brief",
      prompt: "PER은 무엇을 비교하는 숫자일까?",
      choices: [{ id: "profit-and-price", label: "회사가 번 이익과 주가" }],
    },
  }),
  true,
);
assert.equal(
  parseChatRequest({ message: "내 기록", context: { screen: "archive", targetUserId: "parent" } }),
  null,
);

const guidedDialogue = {
  topicId: "term:per" as const,
  explainedNodeIds: ["main"],
  pendingNodeId: "related:eps",
};
assert.deepEqual(
  parseChatRequest({
    message: "응",
    context: { screen: "stock" },
    guidedDialogue,
  }),
  {
    message: "응",
    context: { screen: "stock" },
    guidedDialogue,
  },
);
assert.equal(
  parseChatRequest({
    message: "응",
    context: { screen: "stock" },
    guidedDialogue: { ...guidedDialogue, explainedNodeIds: [] },
  }),
  null,
);
assert.equal(
  isGuidedDialogueAction({ kind: "guided_dialogue", state: guidedDialogue }),
  true,
);
assert.equal(
  isGuidedDialogueAction({ kind: "guided_dialogue", state: { ...guidedDialogue, pendingNodeId: "" } }),
  false,
);

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
