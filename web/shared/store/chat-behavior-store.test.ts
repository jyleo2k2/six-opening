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

  useChatBehaviorStore.getState().dismissActiveSignal();
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "order",
    durationMs: 5 * 60 * 1000 + 1,
    at: start + 7,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "dwell");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 3);

  useChatBehaviorStore.getState().dismissActiveSignal();
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_dwell_completed",
    screen: "stock",
    durationMs: 5 * 60 * 1000 + 1,
    at: start + 8,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "dwell");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 4);

  useChatBehaviorStore.getState().dismissActiveSignal();
  useChatBehaviorStore.getState().recordEvent({
    type: "trade_filled",
    stockId: "KRX:005930",
    side: "sell",
    realizedPnlPct: -12,
    at: start + 9,
  });
  for (let offset = 10; offset <= 11; offset += 1) {
    useChatBehaviorStore.getState().recordEvent({
      type: "screen_entered",
      screen: "stock",
      stockId: "KRX:005930",
      at: start + offset,
    });
  }
  assert.equal(useChatBehaviorStore.getState().activeSignal, "lossRevisit");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 5);

  useChatBehaviorStore.getState().dismissActiveSignal();
  useChatBehaviorStore.getState().recordEvent({
    type: "screen_entered",
    screen: "stock",
    stockId: "KRX:005930",
    at: start + 14,
  });
  assert.equal(useChatBehaviorStore.getState().activeSignal, "lossRevisit");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 6);

  useChatBehaviorStore.getState().dismissActiveSignal();
  for (const [offset, orderType] of [
    [15, "limit"],
    [16, "market"],
    [17, "limit"],
  ] as const) {
    useChatBehaviorStore.getState().recordEvent({
      type: "order_method_selected",
      stockId: "KRX:005930",
      orderFlowId: "buy_1",
      orderType,
      at: start + offset,
    });
  }
  assert.equal(useChatBehaviorStore.getState().activeSignal, "orderMethodConfusion");
  assert.equal(useChatBehaviorStore.getState().activeSignalVersion, 7);

  console.log("chat behavior store tests passed");
}

void run();
