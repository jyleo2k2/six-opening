import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import { STOCKS } from "../../../shared/data/stocks";
import { advanceGuidedDialogue, startGuidedDialogue } from "./dialogue-engine";

const perStart = startGuidedDialogue("PER이 뭐야?");
assert.equal(perStart?.state?.topicId, "term:per");
assert.equal(perStart?.state?.currentNodeId, "main");
assert.deepEqual(perStart?.options.map(({ id }) => id), ["simpler", "example", "detail", "understood"]);

const simpler = advanceGuidedDialogue(perStart!.state!, "simpler");
assert.equal(simpler?.state?.currentNodeId, "simpler");
assert.equal(simpler?.text.includes("PER"), true);

assert.equal(
  advanceGuidedDialogue({ topicId: "term:per", currentNodeId: "detail" }, "example"),
  null,
);

const completed = advanceGuidedDialogue(
  { topicId: "term:etf", currentNodeId: "main" },
  "understood",
);
assert.equal(completed?.state, null);
assert.deepEqual(completed?.options, []);

const samsung = startGuidedDialogue("삼성 전자는 무엇을 만들어?");
assert.equal(samsung?.state?.topicId, "stock:KRX:005930");
assert.deepEqual(samsung?.options.map(({ id }) => id), ["offerings", "touchpoint", "sector", "understood"]);
assert.equal(advanceGuidedDialogue(samsung!.state!, "offerings")?.text.includes("전자기기"), true);

assert.equal(startGuidedDialogue("분산 투자를 쉽게 알려줘")?.state?.topicId, "term:diversification");
assert.equal(startGuidedDialogue("이 회사는 뭐 하는 회사야?", { screen: "stock", stockName: "삼성전자" })?.state?.topicId, "stock:KRX:005930");
assert.equal(startGuidedDialogue("시장가가 뭐야?")?.state?.topicId, "term:market-order");
assert.equal(startGuidedDialogue("GS리테일은 뭐 하는 회사야?")?.state?.topicId, "stock:KRX:007070");
assert.equal(startGuidedDialogue("삼성전자와 SK하이닉스는 뭐 해?"), null);

for (const stock of STOCKS) {
  assert.equal(startGuidedDialogue(`${stock.name}은 뭐 하는 회사야?`)?.state?.topicId, `stock:${stock.id}`);
}

for (const term of CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary" && entry.status === "reviewed")) {
  assert.equal(startGuidedDialogue(`${term.triggers[0]}이 뭐야?`)?.state?.topicId, `term:${term.id}`);
}

console.log("dialogue engine tests passed");
