import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE, findChatbotKnowledge } from "./chatbot-knowledge";

assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary").length >= 30);
assert.equal(new Set(CHATBOT_KNOWLEDGE.map((entry) => entry.id)).size, CHATBOT_KNOWLEDGE.length);
assert.ok(CHATBOT_KNOWLEDGE.every((entry) => entry.answer.split(/[.!?]/).filter(Boolean).length <= 3));
assert.equal(findChatbotKnowledge("PER이 뭐야?")?.id, "per");
assert.equal(findChatbotKnowledge("평가 손익이 뭐야?")?.id, "unrealized-profit");
assert.equal(findChatbotKnowledge("차트는 미래를 알려줘?")?.id, "chart");

console.log("chatbot knowledge tests passed");
