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

// "오를지 내릴지"처럼 양쪽 방향을 함께 말하는 용어 설명은 전망이 아니므로 통과한다.
for (const text of [
  "주가 전망은 앞으로 주식 가격이 오를지 내릴지 예상해 보는 뜻이에요.",
  "‘주가 전망’은 앞으로 주식 가격이 오를지 내릴지 예상해 보는 뜻이에요. 여러 정보로 판단하지만 실제 결과는 다를 수 있어요.",
  "변동성은 가격이 상승할까 하락할까 얼마나 흔들리는지를 말해요.",
  "주가 전망은 앞으로 주식 가격이 어떻게 움직일지 예상하는 말이에요.",
]) {
  assert.equal(filterGeneratedText(text), true, `용어 설명이 차단됐어: ${text}`);
}

// 방향을 하나로 고른 실제 전망 문장은 계속 막힌다.
for (const text of [
  "삼성전자 주가는 앞으로 오를 거예요.",
  "이 회사 주가는 곧 하락해요.",
  "앞으로 가격이 상승할 가능성이 높아요.",
  "수익률이 앞으로 오를 것 같아요.",
  "주가가 오를지 내릴지 보면 앞으로 오를 거예요.",
]) {
  assert.equal(filterGeneratedText(text), false, `전망 문장이 통과했어: ${text}`);
}

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

// 단위 없는 설명용 숫자와 `N주당` 관용구는 화면 수치 주장이 아니므로 통과한다.
for (const text of [
  "PER은 주가를 1주당 순이익으로 나눈 값이에요.",
  "분산투자는 2개 이상 회사에 나누는 거예요.",
  "주식은 회사를 100조각으로 나눈 것 중 1조각이에요.",
]) {
  assert.equal(
    gateChatOutput({ text, source: "model" }).ok,
    true,
    `설명용 숫자가 차단됐어: ${text}`,
  );
}

// 단위가 붙은 주장값은 허용 목록에 없으면 계속 막는다.
for (const text of [
  "삼성전자는 지금 78,000원이에요.",
  "지금 수익률은 12%예요.",
  "민지는 15주를 갖고 있어요.",
]) {
  assert.equal(
    gateChatOutput({ text, source: "model" }).ok,
    false,
    `위조 수치가 통과했어: ${text}`,
  );
}

assert.equal(
  gateChatOutput({
    text: "지금 화면에는 3주, 78,000원으로 적혀 있어요.",
    source: "model",
    allowedNumbers: [3, 78000],
  }).ok,
  true,
);
assert.equal(
  gateChatOutput({
    text: "지금 화면에는 5주로 적혀 있어요.",
    source: "model",
    allowedNumbers: [3, 78000],
  }).ok,
  false,
);

console.log("llm filter tests passed");
