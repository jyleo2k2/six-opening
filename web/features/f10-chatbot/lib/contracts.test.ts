import assert from "node:assert/strict";
import { STOCKS } from "../../../shared/data/stocks";
import {
  isAllowedUiAction,
  isExplainAction,
  isStockExploreAction,
  isSectorExploreAction,
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

// 금액으로 사는 화면은 `금액 ÷ 주문가` 를 수량으로 쓴다. 소수를 거절하면 그 화면에서 온
// 질문이 통째로 400 이 되고, 화면은 그것을 "낮잠" 으로 보여 준다 — 실제로 그렇게 새어 나갔다.
assert.deepEqual(
  parseChatRequest({
    message: "예상 금액 얼마예요?",
    context: { screen: "order", quantity: 50_000 / 128_700, unitPrice: 128_700 },
  }),
  {
    message: "예상 금액 얼마예요?",
    context: { screen: "order", quantity: 0.39, unitPrice: 128_700 },
  },
);
// 화면이 보여 주는 자리(소수 둘째)까지만 남긴다. 화면과 챗봇이 다른 수량을 말하면 안 된다.
assert.equal(
  parseChatRequest({
    message: "얼마예요?",
    context: { screen: "order", quantity: 1.239 },
  })?.context.quantity,
  1.24,
);
// 주 수로 사면 그대로 정수다.
assert.equal(
  parseChatRequest({ message: "얼마예요?", context: { screen: "order", quantity: 10 } })
    ?.context.quantity,
  10,
);
// 화면에서도 살 수 없는 양(0.01주 미만)은 버리되 질문 자체는 살린다. 여기서 거절하면
// "이 금액으로는 아직 살 수 없어" 를 띄운 화면에서 아무 것도 못 묻게 된다.
const tooSmall = parseChatRequest({
  message: "얼마예요?",
  context: { screen: "order", quantity: 0.004, unitPrice: 128_700 },
});
assert.equal(tooSmall?.context.quantity, undefined);
assert.equal(tooSmall?.context.unitPrice, 128_700);
// 화면이 낼 수 없는 값은 그대로 거절한다 — 생산자가 깨진 것을 조용히 덮지 않는다.
for (const quantity of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY, 1_000_001, "10"]) {
  assert.equal(
    parseChatRequest({ message: "얼마예요?", context: { screen: "order", quantity } }),
    null,
  );
}
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
  isAllowedUiAction({ type: "open_screen", target: "stock", stockView: "explore", sectorId: "rank" }),
  true,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "ranking" }),
  true,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "archive", archiveOverlay: "cards" }),
  true,
);
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "stock", sectorId: "unknown" }),
  false,
);
assert.deepEqual(
  parseChatRequest({
    message: "응",
    context: { screen: "home" },
    sectorExplore: { sectorId: "semiconductor", choiceId: "yes" },
  }),
  {
    message: "응",
    context: { screen: "home" },
    sectorExplore: { sectorId: "semiconductor", choiceId: "yes" },
  },
);
assert.equal(
  parseChatRequest({
    message: "응",
    context: { screen: "home" },
    sectorExplore: { sectorId: "unknown", choiceId: "yes" },
  }),
  null,
);
assert.equal(
  isSectorExploreAction({
    kind: "sector-explore",
    turn: {
      sectorId: "semiconductor",
      prompt: "우리 종목 유니버스에서 반도체 회사도 볼래?",
      choices: [{ id: "yes", label: "응" }, { id: "no", label: "아니" }],
    },
  }),
  true,
);
for (const stock of STOCKS) {
  assert.equal(
    isAllowedUiAction({ type: "open_screen", target: "stock", stockId: stock.id }),
    true,
    `${stock.name} 화면 액션이 거부됐어`,
  );
}
assert.equal(
  isAllowedUiAction({ type: "open_screen", target: "stock", stockId: "KRX:999999" }),
  false,
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
