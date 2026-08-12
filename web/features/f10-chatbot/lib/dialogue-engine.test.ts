import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import { STOCKS } from "../../../shared/data/stocks";
import { advanceGuidedDialogue, startGuidedDialogue } from "./dialogue-engine";

const perStart = startGuidedDialogue("PER이 뭐야?");
assert.equal(perStart?.state?.topicId, "term:per");
assert.deepEqual(perStart?.state?.explainedNodeIds, ["main"]);
assert.equal(perStart?.text.includes("eps"), true);

const eps = advanceGuidedDialogue(perStart!.state!, "응");
assert.equal(eps?.state?.explainedNodeIds.includes("related:eps"), true);
assert.equal(eps?.text.includes("EPS"), true);

assert.equal(advanceGuidedDialogue(perStart!.state!, "잘 모르겠어")?.text.includes("응 또는 아니"), true);
assert.equal(
  advanceGuidedDialogue({ topicId: "term:per", explainedNodeIds: ["related:eps"], pendingNodeId: "related:pbr" }, "응"),
  null,
);

const completed = advanceGuidedDialogue(perStart!.state!, "아니");
assert.equal(completed?.state, null);

const samsung = startGuidedDialogue("삼성 전자는 무엇을 만들어?");
assert.equal(samsung?.state?.topicId, "stock:KRX:005930");
assert.equal(samsung?.text.includes("제공 제품·서비스"), true);
assert.equal(advanceGuidedDialogue(samsung!.state!, "네")?.text.includes("전자기기"), true);

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
