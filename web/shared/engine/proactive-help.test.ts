import assert from "node:assert/strict";
import {
  createProactiveSession,
  detectProactiveSignals,
  markProactiveSignalShown,
  muteProactiveSignal,
  PROACTIVE_LIMITS,
  refreshProactiveSession,
  selectProactiveSignal,
} from "./proactive-help";
import type { ChatBehaviorEvent } from "../types/chatbot";

const now = 1_000_000_000;
const buyHesitationEvents: ChatBehaviorEvent[] = [
  { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
  { type: "screen_entered", screen: "home", at: now - 2 },
  { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 1 },
];
assert.deepEqual(detectProactiveSignals(buyHesitationEvents, now), ["buyHesitation"]);
assert.deepEqual(detectProactiveSignals(buyHesitationEvents.slice(0, 2), now), []);
assert.deepEqual(
  detectProactiveSignals(
    [
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 1 },
    ],
    now,
  ),
  [],
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
assert.deepEqual(
  detectProactiveSignals(
    [
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 3 },
      { type: "trade_filled", stockId: "KRX:005930", side: "buy", at: now - 2 },
      { type: "buy_confirmation_abandoned", stockId: "KRX:005930", at: now - 1 },
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

const lossEvents: ChatBehaviorEvent[] = [
  { type: "trade_filled", stockId: "KRX:005930", side: "sell", realizedPnlPct: -10, at: now - 100 },
  ...Array.from({ length: 4 }, (_, index) => ({
    type: "screen_entered" as const,
    screen: "stock" as const,
    stockId: "KRX:005930",
    at: now - 4 + index,
  })),
];
assert.deepEqual(detectProactiveSignals(lossEvents, now), ["lossRevisit"]);

let session = createProactiveSession(now);
assert.equal(selectProactiveSignal(["buyHesitation"], session, now), "buyHesitation");
session = markProactiveSignalShown(session, "buyHesitation", now);
assert.equal(selectProactiveSignal(["dwell"], session, now + PROACTIVE_LIMITS.minimumGapMs - 1), null);
assert.equal(selectProactiveSignal(["buyHesitation"], session, now + PROACTIVE_LIMITS.sameSignalGapMs - 1), null);
session = muteProactiveSignal(session, "dwell", now + PROACTIVE_LIMITS.minimumGapMs);
assert.equal(selectProactiveSignal(["dwell"], session, now + PROACTIVE_LIMITS.sameSignalGapMs), null);

session = markProactiveSignalShown(session, "lossRevisit", now + PROACTIVE_LIMITS.minimumGapMs);
assert.equal(selectProactiveSignal(["buyHesitation"], session, now + PROACTIVE_LIMITS.sameSignalGapMs), null);

const reset = refreshProactiveSession(session, session.lastActivityAt + PROACTIVE_LIMITS.sessionIdleMs);
assert.equal(reset.shownCount, 0);
assert.deepEqual(reset.mutedSignals, []);

console.log("proactive help tests passed");
