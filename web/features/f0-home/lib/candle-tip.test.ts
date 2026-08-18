import assert from "node:assert/strict";
import {
  candleTipCopy,
  closeCandleTip,
  isCandleTipClosed,
  NO_CANDLE_TIPS_CLOSED,
} from "./candle-tip";

// 막대 하나가 덮는 시간은 기간마다 다르다. 전에는 셋 다 "하루" 라고 말해 분봉·주봉에서
// 틀린 설명이었다.
assert.equal(candleTipCopy("minute").title, "막대 하나가 1분이에요");
assert.equal(candleTipCopy("weekly").title, "막대 하나가 1주일이에요");

// 일봉은 원래 화면에 있던 말 그대로다 — 맞는 말이라 고치지 않는다.
assert.equal(candleTipCopy("daily").title, "막대 하나가 하루예요");
assert.equal(candleTipCopy("daily").span, "그날");

// 꼬리 문장("위아래로 나온 선은 {span} 가장 비쌌던 값과 가장 쌌던 값이에요")도 같은 기간을
// 가리켜야 한다. 제목은 1분인데 꼬리는 그날이면 어느 쪽을 믿어야 할지 알 수 없다.
assert.equal(candleTipCopy("minute").span, "1분간");
assert.equal(candleTipCopy("weekly").span, "1주일간");

// 문구는 비어 있지 않고 훈계·전망을 담지 않는다.
for (const period of ["minute", "daily", "weekly"] as const) {
  const copy = candleTipCopy(period);
  assert.ok(copy.title.length > 0 && copy.span.length > 0);
  assert.doesNotMatch(`${copy.title} ${copy.span}`, /추천|사세요|파세요|오를|내릴/u);
}

// ── 닫힘 표시 ──────────────────────────────────────────────────────────────────

// 처음에는 셋 다 열려 있다.
for (const period of ["minute", "daily", "weekly"] as const) {
  assert.equal(isCandleTipClosed(NO_CANDLE_TIPS_CLOSED, period), false);
}

// X 를 누른 기간만 닫힌다. 분봉 안내를 닫았다고 주봉 막대가 1주일이라는 말까지 못 보고
// 지나가면 안 된다.
const afterMinute = closeCandleTip(NO_CANDLE_TIPS_CLOSED, "minute");
assert.equal(isCandleTipClosed(afterMinute, "minute"), true);
assert.equal(isCandleTipClosed(afterMinute, "daily"), false);
assert.equal(isCandleTipClosed(afterMinute, "weekly"), false);

// 닫은 것은 쌓인다.
const afterWeekly = closeCandleTip(afterMinute, "weekly");
assert.equal(isCandleTipClosed(afterWeekly, "minute"), true);
assert.equal(isCandleTipClosed(afterWeekly, "weekly"), true);
assert.equal(isCandleTipClosed(afterWeekly, "daily"), false);

// 받은 값을 고치지 않는다 — 상태는 갈아 끼우는 것이라 그 자리에서 바꾸면 React 가 다시
// 그리지 않는다.
assert.equal(isCandleTipClosed(NO_CANDLE_TIPS_CLOSED, "minute"), false);
assert.notEqual(afterWeekly, afterMinute);

// 이미 닫은 기간을 또 닫으면 같은 값을 그대로 돌려준다 — 새 객체를 만들 이유가 없다.
assert.equal(closeCandleTip(afterMinute, "minute"), afterMinute);

console.log("candle-tip 테스트 통과");
