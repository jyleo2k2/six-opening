import type {
  ChatBehaviorEvent,
  ProactiveSessionState,
  ProactiveSignal,
} from "../types/chatbot";

export const PROACTIVE_LIMITS = {
  dwellMs: 5 * 60 * 1000,
  lossRevisitWindowMs: 5 * 60 * 1000,
  sessionIdleMs: 30 * 60 * 1000,
} as const;

export function createProactiveSession(now: number): ProactiveSessionState {
  return {
    lastActivityAt: now,
  };
}

export function refreshProactiveSession(
  state: ProactiveSessionState,
  now: number,
): ProactiveSessionState {
  if (now - state.lastActivityAt >= PROACTIVE_LIMITS.sessionIdleMs) {
    return createProactiveSession(now);
  }

  return { ...state, lastActivityAt: now };
}

export function detectProactiveSignals(
  events: readonly ChatBehaviorEvent[],
  now: number,
): ProactiveSignal[] {
  const signals: ProactiveSignal[] = [];
  const latestEvent = events.at(-1);
  let lastBuyFillIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "trade_filled" && event.side === "buy") {
      lastBuyFillIndex = index;
      break;
    }
  }
  const recentAbandonedBuys = events
    .slice(lastBuyFillIndex + 1)
    .filter(
      (event): event is Extract<
        ChatBehaviorEvent,
        { type: "buy_confirmation_abandoned" }
      > => event.type === "buy_confirmation_abandoned",
    )
    .slice(-3);

  if (
    latestEvent?.type === "buy_confirmation_abandoned" &&
    recentAbandonedBuys.length === 3
  ) {
    signals.push("buyHesitation");
  }

  if (latestEvent?.type === "order_method_selected") {
    let lastOrderFlowBoundary = -1;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type === "screen_entered" && event.screen !== "order") {
        lastOrderFlowBoundary = index;
        break;
      }
    }
    const orderMethodSelections = events.slice(lastOrderFlowBoundary + 1).filter(
      (event): event is Extract<
        ChatBehaviorEvent,
        { type: "order_method_selected" }
      > =>
        event.type === "order_method_selected" &&
        event.orderFlowId === latestEvent.orderFlowId,
    );
    const isAlternating = orderMethodSelections.every(
      (event, index) =>
        index === 0 ||
        event.orderType !== orderMethodSelections[index - 1]?.orderType,
    );

    // 세 번째 실제 변경에서만 발화한다. 이 주문 흐름 안에서는 한 번만
    // 보여 주므로 시간·횟수 기반 발화 제한을 둘 필요가 없다.
    if (orderMethodSelections.length === 3 && isAlternating) {
      signals.push("orderMethodConfusion");
    }
  }

  if (
    latestEvent?.type === "screen_dwell_completed" &&
    latestEvent.durationMs > PROACTIVE_LIMITS.dwellMs
  ) {
    signals.push("dwell");
  }

  const realizedLoss = [...events].reverse().find(
    (event): event is Extract<ChatBehaviorEvent, { type: "trade_filled" }> =>
      event.type === "trade_filled" &&
      event.side === "sell" &&
      event.realizedPnlPct !== undefined &&
      event.realizedPnlPct <= -10,
  );

  if (
    realizedLoss &&
    latestEvent?.type === "screen_entered" &&
    latestEvent.screen === "stock" &&
    latestEvent.stockId === realizedLoss.stockId &&
    now >= realizedLoss.at &&
    now - realizedLoss.at <= PROACTIVE_LIMITS.lossRevisitWindowMs
  ) {
    const revisitCount = events.filter(
      (event) =>
        event.type === "screen_entered" &&
        event.screen === "stock" &&
        event.stockId === realizedLoss.stockId &&
        event.at >= realizedLoss.at &&
        event.at <= now,
    ).length;
    if (revisitCount >= 4) signals.push("lossRevisit");
  }

  return signals;
}

export function selectProactiveSignal(
  signals: readonly ProactiveSignal[],
): ProactiveSignal | null {
  return signals[0] ?? null;
}
