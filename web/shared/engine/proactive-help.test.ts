import assert from "node:assert/strict";
import {
  createProactiveSession,
  detectProactiveSignals,
  PROACTIVE_LIMITS,
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

const lossEvents: ChatBehaviorEvent[] = [
  {
    type: "trade_filled",
    stockId: "KRX:005930",
    side: "sell",
    realizedPnlPct: -10,
    at: now - 6 * 60 * 1000,
  },
  ...Array.from({ length: 2 }, (_, index) => ({
    type: "screen_entered" as const,
    screen: "stock" as const,
    stockId: "KRX:005930",
    at: now - 2 + index,
  })),
];
assert.deepEqual(detectProactiveSignals(lossEvents, now), ["lossRevisit"]);
assert.deepEqual(detectProactiveSignals(lossEvents.slice(0, 2), now), []);
assert.deepEqual(
  detectProactiveSignals([
    ...lossEvents,
    { type: "screen_entered", screen: "home", at: now + 1 },
  ], now + 1),
  [],
);

let session = createProactiveSession(now);
assert.equal(selectProactiveSignal(["buyHesitation"]), "buyHesitation");
assert.equal(selectProactiveSignal(["buyHesitation"]), "buyHesitation");
assert.equal(selectProactiveSignal(["dwell"]), "dwell");
assert.equal(selectProactiveSignal(["lossRevisit"]), "lossRevisit");
assert.equal(selectProactiveSignal([]), null);

const reset = refreshProactiveSession(session, session.lastActivityAt + PROACTIVE_LIMITS.sessionIdleMs);
assert.deepEqual(reset, {
  lastActivityAt: session.lastActivityAt + PROACTIVE_LIMITS.sessionIdleMs,
});

console.log("proactive help tests passed");
