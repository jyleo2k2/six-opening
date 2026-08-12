import assert from "node:assert/strict";
import { findExplainScript } from "../../../shared/data/chatbot-knowledge";
import { gateChatOutput } from "../../../shared/llm/filter";
import { advanceExplain, startExplain } from "./explain";

const per = findExplainScript("term:per");
assert.ok(per);

const first = startExplain(per);
assert.equal(first.kind, "turn");
if (first.kind !== "turn") throw new Error("first turn missing");
assert.equal(first.text, per.brief);
assert.equal(first.turn.prompt, per.check.question);
assert.equal(gateChatOutput({ text: first.text, source: "fixed" }).ok, true);

const correct = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "profit-and-price",
});
assert.deepEqual(correct, { kind: "end", text: "맞았어! 바로 그거야." });

const detail = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "employee-count",
});
assert.equal(detail?.kind, "turn");
assert.equal(detail?.text.includes("같은 업종"), true);
if (detail?.kind !== "turn") throw new Error("detail turn missing");
assert.equal(detail.turn.stage, "detail");
assert.equal(advanceExplain(per, { scriptId: "term:per", stage: "detail", choiceId: "yes" })?.text, "좋아, 잘 이해했어.");
assert.equal(advanceExplain(per, { scriptId: "term:per", stage: "detail", choiceId: "no" })?.text, `그럼 예를 들어볼게. ${per.example}`);

assert.equal(advanceExplain(per, { scriptId: "term:per", stage: "brief", choiceId: "forged" }), null);
assert.equal(advanceExplain(per, { scriptId: "term:forged", stage: "brief", choiceId: "profit-and-price" }), null);

for (const text of [
  first.text,
  first.turn.prompt,
  ...first.turn.choices.map((choice) => choice.label),
  detail.text,
  detail.turn.prompt,
  ...detail.turn.choices.map((choice) => choice.label),
  correct!.text,
]) {
  assert.equal(gateChatOutput({ text, source: "fixed" }).ok, true);
}

console.log("four-stage explain tests passed");
