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
const switchEvents: ChatBehaviorEvent[] = [
  { type: "order_confirmation_cancelled", stockId: "KRX:005930", side: "buy", at: now - 3 },
  { type: "order_confirmation_cancelled", stockId: "KRX:005930", side: "sell", at: now - 2 },
  { type: "order_confirmation_cancelled", stockId: "KRX:005930", side: "buy", at: now - 1 },
];
assert.deepEqual(detectProactiveSignals(switchEvents, now), ["switch"]);

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
assert.equal(selectProactiveSignal(["switch"], session, now), "switch");
session = markProactiveSignalShown(session, "switch", now);
assert.equal(selectProactiveSignal(["dwell"], session, now + PROACTIVE_LIMITS.minimumGapMs - 1), null);
assert.equal(selectProactiveSignal(["switch"], session, now + PROACTIVE_LIMITS.sameSignalGapMs - 1), null);
session = muteProactiveSignal(session, "dwell", now + PROACTIVE_LIMITS.minimumGapMs);
assert.equal(selectProactiveSignal(["dwell"], session, now + PROACTIVE_LIMITS.sameSignalGapMs), null);

session = markProactiveSignalShown(session, "lossRevisit", now + PROACTIVE_LIMITS.minimumGapMs);
assert.equal(selectProactiveSignal(["switch"], session, now + PROACTIVE_LIMITS.sameSignalGapMs), null);

const reset = refreshProactiveSession(session, session.lastActivityAt + PROACTIVE_LIMITS.sessionIdleMs);
assert.equal(reset.shownCount, 0);
assert.deepEqual(reset.mutedSignals, []);

console.log("proactive help tests passed");
