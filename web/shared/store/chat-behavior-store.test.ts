import assert from "node:assert/strict";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

async function run() {
  const { useChatBehaviorStore } = await import("./chat-behavior-store");
  const { PROACTIVE_LIMITS } = await import("../engine/proactive-help");

  const start = 1_000_000;
  useChatBehaviorStore.getState().clearSession(start);

  function abandon(at: number) {
    useChatBehaviorStore.getState().recordEvent({
      type: "buy_confirmation_abandoned",
      stockId: "KRX:005930",
      at,
    });
  }

  abandon(start + 1);
  abandon(start + 2);
  abandon(start + 3);
  assert.equal(useChatBehaviorStore.getState().activeSignal, "buyHesitation");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 1);

  abandon(start + 4);
  abandon(start + 5);
  abandon(start + 6);
  assert.equal(useChatBehaviorStore.getState().activeSignal, "buyHesitation");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 2);

  // ── "아니요" 는 그 신호를 이번 세션 동안 재운다 ───────────────────────────
  // 거절 1회. buyHesitation 은 조건을 다시 채워도 뜨지 않는다.
  useChatBehaviorStore.getState().dismissActiveSignal("buyHesitation");
  abandon(start + 7);
  abandon(start + 8);
  abandon(start + 9);
  assert.equal(useChatBehaviorStore.getState().activeSignal, null);
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 2);

  // 재운 것은 그 신호뿐이다. 다른 신호는 그대로 뜬다.
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "order",
    durationMs: 5 * 60 * 1000 + 1,
    at: start + 10,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "dwell");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 3);

  useChatBehaviorStore.getState().acceptActiveSignal();
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "stock",
    durationMs: 5 * 60 * 1000 + 1,
    at: start + 11,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "dwell");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 4);

  useChatBehaviorStore.getState().acceptActiveSignal();
  const flow = (offset: number, orderType: "limit" | "market", orderFlowId: string) =>
    useChatBehaviorStore.getState().recordEvent({
      type: "order_method_selected",
      stockId: "KRX:005930",
      orderFlowId,
      orderType,
      at: start + offset,
    });
  flow(12, "limit", "buy_1");
  flow(13, "market", "buy_1");
  flow(14, "limit", "buy_1");
  assert.equal(useChatBehaviorStore.getState().activeSignal, "orderMethodConfusion");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 5);

  // ── 거절 3회면 선제 도움 전체가 꺼진다 ──────────────────────────────────
  // 거절 2회.
  useChatBehaviorStore.getState().dismissActiveSignal("orderMethodConfusion");
  assert.equal(useChatBehaviorStore.getState().proactiveMute.off, false);
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "order",
    durationMs: 5 * 60 * 1000 + 1,
    at: start + 15,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "dwell");

  // 거절 3회 → 전체 OFF. 재운 신호 목록과 누적 거절은 함께 비워진다.
  useChatBehaviorStore.getState().dismissActiveSignal("dwell");
  assert.equal(useChatBehaviorStore.getState().proactiveMute.off, true);
  assert.equal(useChatBehaviorStore.getState().proactiveMute.declines, 0);
  assert.deepEqual(useChatBehaviorStore.getState().proactiveMute.mutedSignals, []);

  // 꺼진 동안에는 어떤 신호도 뜨지 않는다.
  flow(16, "market", "buy_2");
  flow(17, "limit", "buy_2");
  flow(18, "market", "buy_2");
  assert.equal(useChatBehaviorStore.getState().activeSignal, null);

  // ── 끄기는 세션이 갈려도 유지된다 — 아이가 직접 켤 때까지다 ─────────────
  const later = start + PROACTIVE_LIMITS.sessionIdleMs + 1000;
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "order",
    durationMs: 5 * 60 * 1000 + 1,
    at: later,
  });
  assert.equal(useChatBehaviorStore.getState().proactiveMute.off, true);
  assert.equal(useChatBehaviorStore.getState().activeSignal, null);

  // ── 다시 켜면 원래대로 돈다 ────────────────────────────────────────────
  useChatBehaviorStore.getState().enableProactiveHelp();
  assert.equal(useChatBehaviorStore.getState().proactiveMute.off, false);
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "order",
    durationMs: 5 * 60 * 1000 + 1,
    at: later + 1,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "dwell");

  console.log("chat behavior store tests passed");
}

void run();
