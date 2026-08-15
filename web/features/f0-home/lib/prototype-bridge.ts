import {
  PROTOTYPE_PHONE,
  type PrototypeScreenRect,
} from "../../f10-chatbot/lib/bottom-sheet";
import {
  CHAT_SCREENS,
  type ChatBehaviorEvent,
  type ChatContext,
  type ChatScreen,
} from "../../../shared/types/chatbot";

const STOCK_ID_PATTERN = /^KRX:\d{6}$/;

/** `ui-src/template/shell-0.html` 의 402×874 화면 div. 두 곳이 같은 값을 써야 한다. */
export const PROTOTYPE_SCREEN_ID = "kw-screen";

type MeasurableFrame = {
  contentDocument: Document | null;
  getBoundingClientRect(): DOMRect;
};

/**
 * 폰 프레임 안 화면의 **실제** 화면 좌표를 잰다.
 *
 * `app.html` 은 자기 뷰포트에 맞춰 프레임을 `--runtime-scale` 로 줄인다. 부모에서 같은 식을
 * 다시 계산하면 iframe 과 부모의 뷰포트가 조금만 달라도 배율이 어긋나 챗봇 시트가 프레임
 * 밖으로 나온다. 그래서 계산하지 않고 요소를 직접 잰다 — 기하의 원본은 언제나 DOM 하나다.
 *
 * 같은 출처 iframe 이라 `contentDocument` 를 읽을 수 있다. 아직 로드 전이면 `null` 을
 * 돌려주고, 호출한 쪽이 창 크기 기반 근사값으로 대신한다.
 */
export function readPrototypeScreenRect(
  frame: MeasurableFrame | null,
): PrototypeScreenRect | null {
  const screen = frame?.contentDocument?.getElementById(PROTOTYPE_SCREEN_ID);
  if (!frame || !screen) return null;

  const box = screen.getBoundingClientRect();
  if (!(box.width > 0) || !(box.height > 0)) return null;

  // iframe 안의 좌표라 iframe 자신의 위치를 더해 부모 뷰포트 좌표로 옮긴다.
  const frameBox = frame.getBoundingClientRect();
  return {
    left: frameBox.left + box.left,
    top: frameBox.top + box.top,
    width: box.width,
    height: box.height,
    scale: box.width / PROTOTYPE_PHONE.screenWidth,
  };
}

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
