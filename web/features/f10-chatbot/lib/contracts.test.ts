import assert from "node:assert/strict";
import {
  isAllowedUiAction,
  isExplainAction,
  isStockExploreAction,
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
// 공통 guided 설명은 직전 서버 답변 한 건만 쉬운 재설명 입력으로 돌려보낼 수 있다.
assert.deepEqual(
  parseChatRequest({
    message: "더 쉽게 볼래요",
    context: { screen: "home" },
    explain: {
      scriptId: "flow:guided",
      stage: "brief",
      choiceId: "simpler",
      previousAnswer: "주식은 회사의 작은 조각이라고 생각하면 돼요.",
    },
  }),
  {
    message: "더 쉽게 볼래요",
    context: { screen: "home" },
    explain: {
      scriptId: "flow:guided",
      stage: "brief",
      choiceId: "simpler",
      previousAnswer: "주식은 회사의 작은 조각이라고 생각하면 돼요.",
    },
  },
);
assert.equal(
  parseChatRequest({
    message: "더 쉽게 볼래요",
    context: { screen: "home" },
    explain: {
      scriptId: "flow:guided",
      stage: "brief",
      choiceId: "simpler",
      previousAnswer: "가".repeat(801),
    },
  }),
  null,
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

const stockExplore = {
  stockId: "KRX:316140" as const,
  shownTopics: ["company"] as const,
  choiceId: "business" as const,
};
assert.deepEqual(
  parseChatRequest({
    message: "우리금융지주는 어떻게 돈을 벌어?",
    context: { screen: "stock" },
    stockExplore,
  }),
  {
    message: "우리금융지주는 어떻게 돈을 벌어?",
    context: { screen: "stock" },
    stockExplore,
  },
);
assert.equal(
  parseChatRequest({
    message: "실적 알려줘",
    context: { screen: "stock" },
    stockExplore: { ...stockExplore, choiceId: "financial" },
  }),
  null,
);
assert.notEqual(
  parseChatRequest({
    message: "다른 종목 볼래",
    context: { screen: "stock" },
    stockExplore: {
      stockId: "KRX:316140",
      shownTopics: ["company", "business", "industry"],
      choiceId: "ask-other",
    },
  }),
  null,
);
assert.notEqual(
  parseChatRequest({
    message: "다른 종목 볼래",
    context: { screen: "stock" },
    stockExplore: {
      stockId: "KRX:316140",
      shownTopics: ["financial"],
      choiceId: "ask-other",
    },
  }),
  null,
);
assert.equal(
  parseChatRequest({
    message: "계속",
    context: { screen: "stock" },
    stockExplore: { ...stockExplore, stockId: "KRX:999999" },
  }),
  null,
);
assert.equal(
  isStockExploreAction({
    kind: "stock-explore",
    turn: {
      stockId: "KRX:316140",
      shownTopics: ["company"],
      prompt: "이것도 알려줄까?",
      choices: [{ id: "business", label: "어떻게 돈을 벌어?" }],
    },
  }),
  true,
);

assert.equal(isAllowedUiAction({ type: "open_screen", target: "archive" }), true);
assert.equal(
  isAllowedUiAction({
    type: "open_screen",
    target: "order",
    label: "주문 수량 입력하기",
    stockId: "KRX:005930",
    orderSide: "buy",
    orderStep: "quantity",
  }),
  true,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "stock", sectorId: "energy" }),
  true,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "portfolio", label: "기다리는 주문 보기" }),
  true,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "order", orderStep: "filled" }),
  false,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "stock", sectorId: "../energy" }),
  false,
);
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
