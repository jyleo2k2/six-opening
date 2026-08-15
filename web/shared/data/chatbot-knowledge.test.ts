import assert from "node:assert/strict";
import {
  CHATBOT_KNOWLEDGE,
  findChatbotKnowledge,
  findChatbotQuestionForm,
} from "./chatbot-knowledge";

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

const buyQuestionForms = [
  ["매수가 뭐임", "definition", "buy"],
  ["매수는 어떻게 하나요?", "procedure", "buy-flow"],
] as const;
for (const [question, questionForm, knowledgeId] of buyQuestionForms) {
  assert.equal(findChatbotQuestionForm(question), questionForm, question);
  assert.equal(findChatbotKnowledge(question)?.id, knowledgeId, question);
}
for (const [question, questionForm] of [
  ["매수는 어디서 해?", "location"],
  ["매수는 왜 해?", "reason"],
  ["매수는 언제 해?", "time"],
  ["매수는 몇 주 해?", "quantity"],
  ["매수해도 돼?", "confirmation"],
] as const) {
  assert.equal(findChatbotQuestionForm(question), questionForm, question);
}

// 차트도 매수와 같은 짝을 갖는다 — 뜻은 chart, 보는 방법은 chart-read.
// 짝이 없어서 "차트는 어떻게 봐요?" 에 차트의 **정의**가 나가던 자리다.
const chartQuestionForms = [
  ["차트가 뭐야?", "definition", "chart"],
  ["차트는 어떻게 봐요?", "procedure", "chart-read"],
  ["차트 보는 법 알려줘", "procedure", "chart-read"],
  ["차트 어디서 봐요?", "location", "chart-read"],
] as const;
for (const [question, questionForm, knowledgeId] of chartQuestionForms) {
  assert.equal(findChatbotQuestionForm(question), questionForm, question);
  assert.equal(findChatbotKnowledge(question)?.id, knowledgeId, question);
}

// 형태가 잡히지 않은 입력(낱말만 던진 것)은 정의형으로 본다. 예전에는 형태가 null 이면
// `questionForms` 선언을 통째로 무시해서, 선언이 있어도 아무 질문에나 답할 수 있었다.
assert.equal(findChatbotQuestionForm("차트"), null);
assert.equal(findChatbotKnowledge("차트")?.id, "chart");

// 절차 표현은 `어떻게`·`하는법` 만이 아니다. 여기서 놓치면 형태가 null 이 되고,
// null 은 위 정의형 폴백을 타서 절차 질문이 정의 답으로 샌다.
for (const question of [
  "차트 보는 법 알려줘",
  "차트 읽는 법 알려줘",
  "차트 보려면요",
]) {
  assert.equal(findChatbotQuestionForm(question), "procedure", question);
}

// 이 서비스에 없는 화면은 형태와 무관하게 "없다"를 먼저 말한다.
// `매수호가`·`매도호가`는 낱말 `호가`만으로는 용어 사전(`매수`·`매도`)에 트리거 길이가
// 밀려 "매수는 주식을 사는 거래예요" 가 나가던 자리다.
for (const question of [
  "호가창이 뭐야?",
  "호가창은 어떻게 봐요?",
  "호가창 어디서 봐요?",
  "호가가 뭐야?",
  "매수호가 보여줘",
  "매도호가 보여줘",
]) {
  assert.equal(findChatbotKnowledge(question)?.id, "orderbook-unsupported", question);
}

// 답변을 선언한 형태 밖으로 내보내지 않는다.
for (const entry of CHATBOT_KNOWLEDGE) {
  if (!entry.questionForms) continue;
  assert.ok(entry.questionForms.length > 0, `${entry.id} 의 questionForms 가 비었다`);
}

console.log("chatbot knowledge tests passed");
