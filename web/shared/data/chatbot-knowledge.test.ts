import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE, findChatbotKnowledge } from "./chatbot-knowledge";

assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary").length >= 30);
assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "faq").length >= 15);
assert.equal(new Set(CHATBOT_KNOWLEDGE.map((entry) => entry.id)).size, CHATBOT_KNOWLEDGE.length);
assert.ok(CHATBOT_KNOWLEDGE.every((entry) => entry.answer.split(/[.!?]/).filter(Boolean).length <= 3));
assert.equal(findChatbotKnowledge("PER이 뭐야?")?.id, "per");
assert.equal(findChatbotKnowledge("이 회사 비싼지 어떻게 알아?")?.id, "per");
assert.equal(findChatbotKnowledge("평가 손익이 뭐야?")?.id, "unrealized-profit");
assert.equal(findChatbotKnowledge("차트는 미래를 알려줘?")?.id, "chart");
assert.equal(findChatbotKnowledge("매수 어떻게 해?")?.id, "buy-flow");
assert.equal(findChatbotKnowledge("가족 비교는 어디서 해?")?.actionTarget, "archive");

console.log("chatbot knowledge tests passed");
