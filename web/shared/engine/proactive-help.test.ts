import assert from "node:assert/strict";
import {
  createProactiveMute,
  createProactiveSession,
  declineProactive,
  detectProactiveSignals,
  enableProactive,
  isProactiveSilenced,
  PROACTIVE_LIMITS,
  PROACTIVE_OFF_DECLINES,
  refreshProactiveMute,
  refreshProactiveSession,
  selectProactiveSignal,
} from "./proactive-help";
import type { ChatBehaviorEvent } from "../types/chatbot";

const now = 1_000_000_000;
const buyHesitationEvents: ChatBehaviorEvent[] = [
  { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
  { type: "buy_confirmation_abandoned", stockId: "KRX:000660", at: now - 2 },
  { type: "buy_confirmation_abandoned", stockId: "KRX:035420", at: now - 1 },
];
assert.deepEqual(detectProactiveSignals(buyHesitationEvents, now), ["buyHesitation"]);
assert.deepEqual(detectProactiveSignals(buyHesitationEvents.slice(0, 2), now), []);
assert.deepEqual(
  detectProactiveSignals(
    [
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:000660", at: now - 2 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 1 },
    ],
    now,
  ),
  ["buyHesitation"],
);
assert.deepEqual(
  detectProactiveSignals(
    [
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:000660", at: now - 1 },
    ],
    now,
  ),
  [],
);
const orderMethodConfusionEvents: ChatBehaviorEvent[] = [
  {
    type: "order_method_selected",
    stockId: "KRX:005930",
    orderFlowId: "buy-1",
    orderType: "limit",
    at: now - 3,
  },
  {
    type: "order_method_selected",
    stockId: "KRX:005930",
    orderFlowId: "buy-1",
    orderType: "market",
    at: now - 2,
  },
  {
    type: "order_method_selected",
    stockId: "KRX:005930",
    orderFlowId: "buy-1",
    orderType: "limit",
    at: now - 1,
  },
];
assert.deepEqual(
  detectProactiveSignals(orderMethodConfusionEvents, now),
  ["orderMethodConfusion"],
);
assert.deepEqual(
  detectProactiveSignals(orderMethodConfusionEvents.slice(0, 2), now),
  [],
);
assert.deepEqual(
  detectProactiveSignals(
    [
      ...orderMethodConfusionEvents,
      {
        type: "order_method_selected",
        stockId: "KRX:005930",
        orderFlowId: "buy-1",
        orderType: "market",
        at: now,
      },
    ],
    now,
  ),
  [],
);
assert.deepEqual(
  detectProactiveSignals(
    [
      ...orderMethodConfusionEvents,
      { type: "screen_entered", screen: "home", at: now },
      {
        type: "order_method_selected",
        stockId: "KRX:005930",
        orderFlowId: "buy-1",
        orderType: "limit",
        at: now + 1,
      },
      {
        type: "order_method_selected",
        stockId: "KRX:005930",
        orderFlowId: "buy-1",
        orderType: "market",
        at: now + 2,
      },
      {
        type: "order_method_selected",
        stockId: "KRX:005930",
        orderFlowId: "buy-1",
        orderType: "limit",
        at: now + 3,
      },
    ],
    now + 3,
  ),
  ["orderMethodConfusion"],
);
assert.deepEqual(
  detectProactiveSignals(
    [
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
      { type: "trade_filled", stockId: "KRX:005930", side: "buy", at: now - 2 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:000660", at: now - 1 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:035420", at: now },
    ],
    now,
  ),
  [],
);

const dwellEvents: ChatBehaviorEvent[] = [
  {
    type: "screen_dwell_completed",
    screen: "order",
    durationMs: PROACTIVE_LIMITS.dwellMs + 1,
    at: now,
  },
];
assert.deepEqual(detectProactiveSignals(dwellEvents, now), ["dwell"]);
assert.deepEqual(
  detectProactiveSignals([
    ...dwellEvents,
    { type: "screen_entered", screen: "home", at: now + 1 },
  ], now + 1),
  [],
);

let session = createProactiveSession(now);
assert.equal(selectProactiveSignal(["buyHesitation"]), "buyHesitation");
assert.equal(selectProactiveSignal(["buyHesitation"]), "buyHesitation");
assert.equal(selectProactiveSignal(["dwell"]), "dwell");
assert.equal(selectProactiveSignal([]), null);

const reset = refreshProactiveSession(session, session.lastActivityAt + PROACTIVE_LIMITS.sessionIdleMs);
assert.deepEqual(reset, {
  lastActivityAt: session.lastActivityAt + PROACTIVE_LIMITS.sessionIdleMs,
});

// ── 선제 도움 끄기 ───────────────────────────────────────────────────────
// 거절 1회는 그 신호만 재운다. 다른 신호는 그대로 뜬다.
const once = declineProactive(createProactiveMute(), "dwell");
assert.equal(once.off, false);
assert.equal(isProactiveSilenced(once, "dwell"), true);
assert.equal(isProactiveSilenced(once, "orderMethodConfusion"), false);

// 같은 신호를 또 거절해도 목록이 불어나지 않는다.
const twiceSame = declineProactive(once, "dwell");
assert.deepEqual(twiceSame.mutedSignals, ["dwell"]);
assert.equal(twiceSame.declines, 2);

// 3회째 거절이면 전체가 꺼진다. 누적과 목록은 함께 비운다 —
// 다시 켠 아이가 한 번 거절했다고 곧바로 또 꺼지면 안 된다.
const off = declineProactive(twiceSame, "buyHesitation");
assert.equal(twiceSame.declines + 1, PROACTIVE_OFF_DECLINES);
assert.equal(off.declines, 0);
assert.equal(off.off, true);
assert.deepEqual(off.mutedSignals, []);
for (const signal of ["buyHesitation", "orderMethodConfusion", "dwell"] as const) {
  assert.equal(isProactiveSilenced(off, signal), true, `꺼진 뒤에도 ${signal} 이 뜬다`);
}
assert.equal(declineProactive(enableProactive(), "dwell").off, false);

// 세션이 갈리면 신호별 침묵만 풀린다. 전체 끄기는 아이가 켤 때까지 유지된다.
assert.equal(isProactiveSilenced(refreshProactiveMute(once), "dwell"), false);
assert.equal(refreshProactiveMute(off).off, true);
assert.equal(enableProactive().off, false);

console.log("proactive help tests passed");
