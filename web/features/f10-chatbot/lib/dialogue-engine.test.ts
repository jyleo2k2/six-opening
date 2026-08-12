import assert from "node:assert/strict";
import { advanceGuidedDialogue, startGuidedDialogue } from "./dialogue-engine";

const perStart = startGuidedDialogue("PER이 뭐야?");
assert.equal(perStart?.state?.currentNodeId, "per-main");
assert.deepEqual(perStart?.options.map(({ id }) => id), ["simpler", "example", "detail", "understood"]);

const simpler = advanceGuidedDialogue(perStart!.state!, "simpler");
assert.equal(simpler?.state?.currentNodeId, "per-simpler");
assert.equal(simpler?.text.includes("가격표"), true);

assert.equal(
  advanceGuidedDialogue({ topicId: "per", currentNodeId: "per-detail" }, "example"),
  null,
);

const completed = advanceGuidedDialogue(
  { topicId: "etf", currentNodeId: "etf-main" },
  "understood",
);
assert.equal(completed?.state, null);
assert.deepEqual(completed?.options, []);

assert.equal(startGuidedDialogue("분산 투자를 쉽게 알려줘")?.state?.topicId, "diversification");
assert.equal(startGuidedDialogue("시장가가 뭐야?"), null);

console.log("dialogue engine tests passed");
