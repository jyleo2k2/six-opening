import assert from "node:assert/strict";
import { findExplainScript } from "../../../shared/data/chatbot-knowledge";
import { gateChatOutput } from "../../../shared/llm/filter";
import { advanceExplain, startExplain } from "./explain";

const per = findExplainScript("term:per");
assert.ok(per);

const started = startExplain(per);
assert.equal(started.turn?.stage, "brief");
assert.equal(started.choices?.length, 2);
assert.equal(gateChatOutput({ text: started.text, source: "fixed" }).ok, true);

for (const choice of started.choices ?? []) {
  assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
}

const correct = advanceExplain(per, started.turn!, "profit-and-price");
assert.equal(correct?.text, "맞았어! 바로 그거야.");

const detail = advanceExplain(per, started.turn!, "employee-count");
assert.equal(detail?.turn?.stage, "detail");
assert.equal(gateChatOutput({ text: detail?.text ?? "", source: "fixed" }).ok, true);
for (const choice of detail?.choices ?? []) {
  assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
}

assert.equal(advanceExplain(per, detail!.turn!, "understood")?.text, "좋아, 잘 이해했어.");
assert.equal(advanceExplain(per, detail!.turn!, "not-yet")?.text, per.example);
assert.equal(advanceExplain(per, started.turn!, "forged"), null);
assert.equal(advanceExplain(per, { ...started.turn!, scriptId: "term:forged" }, "profit-and-price"), null);

console.log("four-stage explain tests passed");
