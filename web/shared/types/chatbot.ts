export const CHAT_SCREENS = ["home", "stock", "order", "archive"] as const;

export type ChatScreen = (typeof CHAT_SCREENS)[number];

export type ChatContext = {
  screen: ChatScreen;
  stockId?: `KRX:${string}`;
  stockName?: string;
  quantity?: number;
  unitPrice?: number;
};

export type ChatUiAction = {
  type: "open_screen";
  target: ChatScreen;
};

export type ChatResponse = {
  text: string;
  suggestedQuestions?: string[];
  uiAction?: ChatUiAction;
};

export const READ_ONLY_CHAT_TOOLS = [
  "approved_stock_facts",
  "own_trade_records",
  "own_behavior_profile",
  "own_archive",
] as const;

export type ReadOnlyChatToolName = (typeof READ_ONLY_CHAT_TOOLS)[number];

export type ProactiveSignal = "switch" | "dwell" | "lossRevisit";

export type ChatBehaviorEvent =
  | {
      type: "order_confirmation_cancelled";
      stockId: string;
      side: "buy" | "sell";
      at: number;
    }
  | {
      type: "screen_entered";
      screen: ChatScreen;
      stockId?: string;
      at: number;
    }
  | {
      type: "screen_dwell_completed";
      screen: "order" | "stock";
      stockId?: string;
      durationMs: number;
      at: number;
    }
  | {
      type: "trade_filled";
      stockId: string;
      side: "buy" | "sell";
      realizedPnlPct?: number;
      at: number;
    };

export type ProactiveSessionState = {
  lastActivityAt: number;
  lastShownAt: number | null;
  shownAtBySignal: Partial<Record<ProactiveSignal, number>>;
  shownCount: number;
  mutedSignals: ProactiveSignal[];
};
