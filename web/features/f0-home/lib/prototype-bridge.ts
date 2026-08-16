import type { ChatBehaviorEvent, ChatContext } from "../../../shared/types/chatbot";

const STOCK_ID_PATTERN = /^KRX:\d{6}$/;

/** 폰 프레임 안 402×874 화면 div. `PhoneFrame` 이 이 id 로 그린다. */
export const PROTOTYPE_SCREEN_ID = "kw-screen";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBehaviorEvent(
  value: unknown,
  now: number,
  context?: ChatContext,
): ChatBehaviorEvent | null {
  if (!isRecord(value)) return null;
  if (
    value.kind !== "buy_confirmation_abandoned" &&
    value.kind !== "order_confirmation_cancelled" &&
    value.kind !== "order_method_selected" &&
    value.kind !== "trade_filled"
  ) {
    return null;
  }
  if (typeof value.stockId !== "string" || !STOCK_ID_PATTERN.test(value.stockId)) {
    return null;
  }

  if (value.kind === "buy_confirmation_abandoned") {
    return {
      type: value.kind,
      stockId: value.stockId,
      at: now,
    };
  }

  if (value.kind === "order_confirmation_cancelled") {
    if (value.side !== "buy" || context?.screen !== "order") return null;
    return {
      type: "buy_confirmation_abandoned",
      stockId: value.stockId,
      at: now,
    };
  }

  if (value.kind === "order_method_selected") {
    if (
      typeof value.orderFlowId !== "string" ||
      !/^[a-z0-9_-]{1,80}$/i.test(value.orderFlowId) ||
      (value.orderType !== "market" && value.orderType !== "limit")
    ) {
      return null;
    }
    return {
      type: "order_method_selected",
      stockId: value.stockId,
      orderFlowId: value.orderFlowId,
      orderType: value.orderType,
      at: now,
    };
  }

  if (value.side !== "buy" && value.side !== "sell") return null;

  const event: Extract<ChatBehaviorEvent, { type: "trade_filled" }> = {
    type: value.kind,
    stockId: value.stockId,
    side: value.side,
    at: now,
  };
  if (
    typeof value.realizedPnlPct === "number" &&
    Number.isFinite(value.realizedPnlPct) &&
    value.realizedPnlPct >= -100 &&
    value.realizedPnlPct <= 100
  ) {
    event.realizedPnlPct = value.realizedPnlPct;
  }
  return event;
}
