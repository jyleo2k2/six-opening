import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { detectProactiveSignals } from "../../../shared/engine/proactive-help";
import type { ChatBehaviorEvent } from "../../../shared/types/chatbot";
import { parseBehaviorEvent, parseChatContext } from "./prototype-bridge";

const NOW = 1_000_000;

function test(name: string, run: () => void): void {
  run();
  console.log(`✓ ${name}`);
}

function parsedBehavior(value: unknown, now: number): ChatBehaviorEvent {
  const event = parseBehaviorEvent(value, now);
  if (!event) throw new Error("행동 이벤트 파싱 실패");
  return event;
}

test("매수 최종 확인 이탈 이벤트를 수신 시각으로 파싱한다", () => {
  assert.deepEqual(
    parseBehaviorEvent(
      {
        kind: "buy_confirmation_abandoned",
        stockId: "KRX:005930",
        at: 1,
      },
      NOW,
    ),
    {
      type: "buy_confirmation_abandoned",
      stockId: "KRX:005930",
      at: NOW,
    },
  );
});

test("프로토타입의 주문 화면 매수 취소만 최종 확인 이탈로 변환한다", () => {
  const legacyEvent = {
    kind: "order_confirmation_cancelled",
    stockId: "KRX:005930",
    side: "buy",
  };
  assert.deepEqual(parseBehaviorEvent(legacyEvent, NOW, { screen: "order" }), {
    type: "buy_confirmation_abandoned",
    stockId: "KRX:005930",
    at: NOW,
  });
  assert.equal(parseBehaviorEvent(legacyEvent, NOW, { screen: "home" }), null);
  assert.equal(
    parseBehaviorEvent({ ...legacyEvent, side: "sell" }, NOW, { screen: "order" }),
    null,
  );
});

test("주문 방식 변경은 같은 주문 화면의 market·limit 값만 받는다", () => {
  const event = {
    kind: "order_method_selected",
    stockId: "KRX:005930",
    orderFlowId: "buy_1",
    orderType: "limit",
  };
  assert.deepEqual(parseBehaviorEvent(event, NOW, { screen: "order" }), {
    type: "order_method_selected",
    stockId: "KRX:005930",
    orderFlowId: "buy_1",
    orderType: "limit",
    at: NOW,
  });
  assert.equal(parseBehaviorEvent(event, NOW, { screen: "home" }), null);
  assert.equal(
    parseBehaviorEvent({ ...event, orderType: "next" }, NOW, { screen: "order" }),
    null,
  );
});

test("체결 이벤트의 실현손익을 포함하거나 생략한다", () => {
  assert.deepEqual(
    parseBehaviorEvent(
      {
        kind: "trade_filled",
        stockId: "KRX:000660",
        side: "sell",
        realizedPnlPct: -12,
      },
      NOW,
    ),
    {
      type: "trade_filled",
      stockId: "KRX:000660",
      side: "sell",
      realizedPnlPct: -12,
      at: NOW,
    },
  );
  assert.deepEqual(
    parseBehaviorEvent(
      { kind: "trade_filled", stockId: "KRX:035420", side: "buy" },
      NOW,
    ),
    {
      type: "trade_filled",
      stockId: "KRX:035420",
      side: "buy",
      at: NOW,
    },
  );
});

test("주문 맥락의 수량과 단가를 파싱한다", () => {
  assert.deepEqual(
    parseChatContext({
      screen: "order",
      stockId: "KRX:005930",
      stockName: "삼성전자",
      quantity: 3,
      unitPrice: 72_500,
    }),
    {
      screen: "order",
      stockId: "KRX:005930",
      stockName: "삼성전자",
      quantity: 3,
      unitPrice: 72_500,
    },
  );
});

test("핵심 행동 필드가 잘못되면 이벤트를 거부한다", () => {
  const invalidValues = [
    null,
    [],
    "event",
    { kind: "screen_entered", stockId: "KRX:005930", side: "buy" },
    { kind: "trade_filled", stockId: "KRX:005930", side: "hold" },
    { kind: "trade_filled", stockId: "005930", side: "buy" },
    { kind: "trade_filled", stockId: "KRX:5930", side: "buy" },
    { kind: "trade_filled", stockId: "KRX:0059300", side: "buy" },
  ];
  for (const value of invalidValues) {
    assert.equal(parseBehaviorEvent(value, NOW), null);
  }
});

test("잘못된 실현손익 필드만 제거한다", () => {
  for (const realizedPnlPct of [-101, 101, Number.POSITIVE_INFINITY, "-12"]) {
    assert.deepEqual(
      parseBehaviorEvent(
        {
          kind: "trade_filled",
          stockId: "KRX:005930",
          side: "sell",
          realizedPnlPct,
        },
        NOW,
      ),
      {
        type: "trade_filled",
        stockId: "KRX:005930",
        side: "sell",
        at: NOW,
      },
    );
  }
});

test("잘못된 주문 숫자 필드만 제거한다", () => {
  const base = {
    screen: "order",
    stockId: "KRX:005930",
    stockName: "삼성전자",
  };
  for (const quantity of [-1, 0, 1.5, 100_001, Number.POSITIVE_INFINITY, "3"]) {
    assert.deepEqual(parseChatContext({ ...base, quantity }), base);
  }
  for (const unitPrice of [
    -1,
    0,
    100_000_001,
    Number.POSITIVE_INFINITY,
    "72500",
  ]) {
    assert.deepEqual(parseChatContext({ ...base, unitPrice }), base);
  }
});

test("종목과 무관하게 매수 최종 확인 이탈 3회에서 buyHesitation 신호가 발화한다", () => {
  const events = [
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:005930" },
      NOW,
    ),
    {
      type: "screen_entered" as const,
      screen: "home" as const,
      at: NOW + 1,
    },
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:005930" },
      NOW + 2,
    ),
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:000660" },
      NOW + 3,
    ),
  ];
  assert.ok(detectProactiveSignals(events, NOW + 3).includes("buyHesitation"));
});

test("종목과 무관하게 최종 확인 이탈 2회까지는 발화하지 않는다", () => {
  const events = [
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:005930" },
      NOW,
    ),
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:005930" },
      NOW + 1,
    ),
  ];
  assert.equal(detectProactiveSignals(events, NOW + 1).includes("buyHesitation"), false);
});

test("실제 유니버스 51종목 모두 5/5 뒤로가기 세 번에 발화한다", () => {
  const universeSource = readFileSync(
    new URL("../../../public/ui/assets/universe.js", import.meta.url),
    "utf8",
  );
  const stockIds = Array.from(
    universeSource.matchAll(/\['(\d{6})'/g),
    (match) => `KRX:${match[1]}` as `KRX:${string}`,
  );

  assert.equal(stockIds.length, 51);
  assert.equal(new Set(stockIds).size, 51);
  for (const stockId of stockIds) {
    const events = [
      parseBehaviorEvent(
        { kind: "order_confirmation_cancelled", stockId, side: "buy" },
        NOW,
        { screen: "order", stockId },
      ),
      parseBehaviorEvent(
        { kind: "order_confirmation_cancelled", stockId, side: "buy" },
        NOW + 1,
        { screen: "order", stockId },
      ),
      parseBehaviorEvent(
        { kind: "order_confirmation_cancelled", stockId, side: "buy" },
        NOW + 2,
        { screen: "order", stockId },
      ),
    ].filter((event): event is ChatBehaviorEvent => event !== null);

    assert.equal(
      detectProactiveSignals(events, NOW + 2).includes("buyHesitation"),
      true,
      stockId,
    );
  }
});

test("매수 체결 뒤 첫 이탈에는 buyHesitation 신호가 발화하지 않는다", () => {
  const events = [
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:005930" },
      NOW,
    ),
    parsedBehavior(
      { kind: "trade_filled", stockId: "KRX:005930", side: "buy" },
      NOW + 1,
    ),
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:005930" },
      NOW + 2,
    ),
    parsedBehavior(
      { kind: "buy_confirmation_abandoned", stockId: "KRX:000660" },
      NOW + 3,
    ),
  ];
  assert.equal(detectProactiveSignals(events, NOW + 3).includes("buyHesitation"), false);
});

test("-12% 매도 체결 후 동일 종목 4회 재진입에서 lossRevisit 신호가 발화한다", () => {
  const stockId = "KRX:005930";
  const filled = parsedBehavior(
    { kind: "trade_filled", stockId, side: "sell", realizedPnlPct: -12 },
    NOW,
  );
  const revisits: ChatBehaviorEvent[] = [1, 2, 3, 4].map((offset) => ({
    type: "screen_entered",
    screen: "stock",
    stockId,
    at: NOW + offset,
  }));
  assert.ok(
    detectProactiveSignals([filled, ...revisits], NOW + 4).includes("lossRevisit"),
  );
});

console.log("prototype-bridge tests passed");
