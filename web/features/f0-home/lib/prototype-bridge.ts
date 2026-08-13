import {
  CHAT_SCREENS,
  type ChatBehaviorEvent,
  type ChatContext,
  type ChatScreen,
} from "../../../shared/types/chatbot";

const STOCK_ID_PATTERN = /^KRX:\d{6}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseChatContext(value: unknown): ChatContext | null {
  if (!isRecord(value) || typeof value.screen !== "string") return null;
  if (!CHAT_SCREENS.includes(value.screen as ChatScreen)) return null;

  const screen = value.screen as ChatScreen;
  if (screen === "home" || screen === "archive") return { screen };
  if (
    typeof value.stockId !== "string" ||
    !STOCK_ID_PATTERN.test(value.stockId) ||
    typeof value.stockName !== "string" ||
    !value.stockName.trim() ||
    value.stockName.length > 60
  ) {
    return null;
  }

  const context: ChatContext = {
    screen,
    stockId: value.stockId as ChatContext["stockId"],
    stockName: value.stockName.trim(),
  };

  if (screen === "order") {
    if (
      typeof value.quantity === "number" &&
      Number.isFinite(value.quantity) &&
      Number.isInteger(value.quantity) &&
      value.quantity >= 1 &&
      value.quantity <= 100_000
    ) {
      context.quantity = value.quantity;
    }
    if (
      typeof value.unitPrice === "number" &&
      Number.isFinite(value.unitPrice) &&
      value.unitPrice >= 1 &&
      value.unitPrice <= 100_000_000
    ) {
      context.unitPrice = value.unitPrice;
    }
  }

  return context;
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
      context?.screen !== "order" ||
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
