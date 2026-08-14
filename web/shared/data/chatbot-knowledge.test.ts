import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE, findChatbotKnowledge } from "./chatbot-knowledge";

assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary").length >= 30);
assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "faq").length >= 15);
assert.equal(new Set(CHATBOT_KNOWLEDGE.map((entry) => entry.id)).size, CHATBOT_KNOWLEDGE.length);
assert.ok(CHATBOT_KNOWLEDGE.every((entry) => entry.answer.split(/[.!?]/).filter(Boolean).length <= 3));
assert.ok(
  CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary").every(
    (entry) => entry.explainScript?.id === `term:${entry.id}`,
  ),
);
const DAPIE_SCREEN_TERM_IDS = [
  "mock-investing", "total-assets", "available-cash", "holdings", "pending-order", "order-cancel", "sell-proceeds", "goal-price", "holding-period", "buy-day-record", "plan-badge", "line-chart", "candle-chart", "minute-chart", "daily-chart", "weekly-chart", "delayed-price", "child-news", "season", "trade-lock", "ranking", "family-feed", "profile-abilities", "profile-definition", "profile-status", "profile-character", "season-record",
];
for (const id of DAPIE_SCREEN_TERM_IDS) {
  assert.equal(
    CHATBOT_KNOWLEDGE.find((entry) => entry.id === id)?.explainScript?.id,
    `term:${id}`,
  );
}
assert.equal(findChatbotKnowledge("PER이 뭐야?")?.id, "per");
assert.equal(findChatbotKnowledge("이 회사 비싼지 어떻게 알아?")?.id, "per");
assert.equal(findChatbotKnowledge("평가 손익이 뭐야?")?.id, "unrealized-profit");
assert.equal(findChatbotKnowledge("차트는 미래를 알려줘?")?.id, "chart");
assert.equal(findChatbotKnowledge("매수 어떻게 해?")?.id, "buy-flow");
assert.equal(findChatbotKnowledge("가족 비교는 어디서 해?")?.actionTarget, "archive");
assert.equal(findChatbotKnowledge("너랑 한 얘기 엄마도 봐?")?.id, "privacy-chat");
assert.equal(findChatbotKnowledge("내가 뭐 샀는지 엄마도 봐?")?.id, "privacy-trade");
assert.equal(findChatbotKnowledge("종목 고를 때 뭘 확인해?")?.id, "stock-pick-criteria");
assert.equal(findChatbotKnowledge("주문 전에 뭘 확인해?")?.id, "order-check");
assert.equal(findChatbotKnowledge("지금 가격이 뭐야?")?.id, "current-price");
assert.equal(findChatbotKnowledge("지금 값어치가 뭐야?")?.id, "evaluation-amount");
assert.equal(findChatbotKnowledge("번 돈이 뭐야?")?.id, "unrealized-profit");
assert.equal(findChatbotKnowledge("기다리는 주문이 뭐야?")?.id, "pending-order");
assert.equal(findChatbotKnowledge("15분 지연 시세가 뭐야?")?.id, "delayed-price");
assert.equal(findChatbotKnowledge("학교 시간엔 매매 쉬기가 뭐야?")?.id, "trade-lock");
assert.equal(findChatbotKnowledge("근거력이 뭐야?")?.id, "profile-abilities");
assert.equal(findChatbotKnowledge("관찰 초기면 무슨 뜻이야?")?.id, "profile-status");
assert.equal(findChatbotKnowledge("전략가는 뭐야?")?.id, "profile-character");
assert.equal(findChatbotKnowledge("목표 가격이 뭐야?")?.id, "goal-price");
assert.equal(findChatbotKnowledge("사던 날의 나가 뭐야?")?.id, "buy-day-record");
assert.equal(findChatbotKnowledge("성향이 뭐야?")?.id, "profile-definition");
assert.equal(findChatbotKnowledge("시즌 기록이 뭐야?")?.id, "season-record");

assert.equal(findChatbotKnowledge("선차트가 뭐야")?.id, "line-chart");
assert.equal(findChatbotKnowledge("캔들차트가 뭐야")?.id, "candle-chart");
assert.equal(findChatbotKnowledge("분봉이 뭐야")?.id, "minute-chart");
assert.equal(findChatbotKnowledge("일봉이 뭐야")?.id, "daily-chart");
assert.equal(findChatbotKnowledge("주봉이 뭐야")?.id, "weekly-chart");
assert.notEqual(
  findChatbotKnowledge("분봉이 뭐야")?.explainScript?.check.question,
  findChatbotKnowledge("주봉이 뭐야")?.explainScript?.check.question,
);

console.log("chatbot knowledge tests passed");
