import assert from "node:assert/strict";
import { filterGeneratedText, gateChatOutput } from "./filter";

assert.equal(filterGeneratedText("PER은 회사 이익과 주가를 비교하는 숫자야."), true);
assert.equal(filterGeneratedText("이 종목을 지금 사는 게 좋아."), false);
assert.equal(filterGeneratedText("지금 이 종목을 사는 게 좋아."), false);
assert.equal(filterGeneratedText("목표가는 10,000원이야."), false);
assert.equal(filterGeneratedText("삼성전자를 사는 게 좋아."), false);
assert.equal(filterGeneratedText("삼성전자를 사·는 게 좋아."), false);
assert.equal(filterGeneratedText("앞으로 오를 가능성이 높아."), false);
assert.equal(filterGeneratedText("엄마에게 숨기지 마."), false);
assert.equal(filterGeneratedText("보호자에게 솔직하게 말해."), false);
assert.equal(filterGeneratedText("어른에게 먼저 말해."), false);
assert.equal(filterGeneratedText("어른에게 말해."), false);
assert.equal(filterGeneratedText("주문 수량을 확인하는 게 좋아요."), true);
assert.equal(filterGeneratedText("화면에서 확인하면 돼요."), true);
assert.equal(filterGeneratedText("주문 수량을 확인해야 해요."), true);

assert.deepEqual(gateChatOutput({ text: "PER은 이익과 주가를 비교하는 숫자야.", source: "model" }), {
  ok: true,
  text: "PER은 이익과 주가를 비교하는 숫자야.",
});
assert.equal(
  gateChatOutput({ text: "지금 사는 게 좋아.", source: "model" }).ok,
  false,
);
assert.equal(
  gateChatOutput({ text: "수익률은 12%야.", source: "model" }).ok,
  false,
);
assert.equal(
  gateChatOutput({ text: "화면에 표시된 수량은 10주야.", source: "model", allowedNumbers: [10] }).ok,
  true,
);
assert.equal(
  gateChatOutput({ text: "하나야. 둘이야. 셋이야. 넷이야.", source: "model" }).ok,
  false,
);
assert.equal(
  gateChatOutput({ text: "하나야. 둘이야. 셋이야. 🐻", source: "model" }).ok,
  true,
);
assert.equal(gateChatOutput({ text: "🐻", source: "model" }).ok, false);

console.log("llm filter tests passed");
