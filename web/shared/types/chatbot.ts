export const CHAT_SCREENS = ["home", "stock", "order", "archive"] as const;

export type ChatScreen = (typeof CHAT_SCREENS)[number];

export const CHAT_ACTION_TARGETS = [...CHAT_SCREENS, "portfolio"] as const;
export type ChatActionTarget = (typeof CHAT_ACTION_TARGETS)[number];

export const CHAT_ORDER_SIDES = ["buy", "sell"] as const;
export type ChatOrderSide = (typeof CHAT_ORDER_SIDES)[number];

export const CHAT_ORDER_STEPS = [
  "quantity",
  "reason",
  "confirmation",
  "memo",
] as const;
export type ChatOrderStep = (typeof CHAT_ORDER_STEPS)[number];

export const CHAT_ARCHIVE_TABS = ["report", "return", "compare", "season"] as const;
export type ChatArchiveTab = (typeof CHAT_ARCHIVE_TABS)[number];

export type ChatContext = {
  screen: ChatScreen;
  stockId?: `KRX:${string}`;
  stockName?: string;
  quantity?: number;
  unitPrice?: number;
};

export type ChatUiAction = {
  type: "open_screen";
  target: ChatActionTarget;
  label?: string;
  stockId?: `KRX:${string}`;
  orderSide?: ChatOrderSide;
  orderStep?: ChatOrderStep;
  sectorId?: string;
  archiveTab?: ChatArchiveTab;
};

export const STOCK_FACT_TOPICS = [
  "company",
  "business",
  "industry",
  "financial",
] as const;

export type StockFactTopic = (typeof STOCK_FACT_TOPICS)[number];
export type StockExploreChoiceId = StockFactTopic | "ask-other" | "done";

export type StockExploreReply = {
  stockId: `KRX:${string}`;
  shownTopics: StockFactTopic[];
  choiceId: StockExploreChoiceId;
};

export type StockExploreTurn = {
  stockId: `KRX:${string}`;
  shownTopics: readonly StockFactTopic[];
  prompt: string;
  choices: readonly { id: StockExploreChoiceId; label: string }[];
};

export const SECTOR_EXPLORE_CHOICES = ["yes", "no"] as const;
export type SectorExploreChoiceId = (typeof SECTOR_EXPLORE_CHOICES)[number];

export type SectorExploreReply = {
  sectorId: string;
  choiceId: SectorExploreChoiceId;
};

export type SectorExploreTurn = {
  sectorId: string;
  prompt: string;
  choices: readonly { id: SectorExploreChoiceId; label: string }[];
};

export const EXPLAIN_STAGES = ["brief", "detail", "example", "followup"] as const;

export type ExplainStage = (typeof EXPLAIN_STAGES)[number];

export type ExplainChoice = { id: string; label: string };

/** 사전 저작·검수된 정적 데이터. 런타임 생성 금지. */
export type ExplainScript = {
  id: string;
  feedback?: string;
  brief: string;
  check: {
    kind?: "diagnosis" | "guiding";
    question: string;
    choices: readonly ExplainChoice[];
    answerId: string;
  };
  adjust?: {
    explanation: string;
    question: string;
    choices: readonly ExplainChoice[];
    answerId: string;
  };
  detail: string;
  example: string;
};

/** 서버가 내보내는 진행 중 턴. 아이는 choices 중 하나를 눌러 응답한다. */
export type ExplainTurn = {
  scriptId: string;
  stage: ExplainStage;
  prompt: string;
  choices: readonly ExplainChoice[];
};

/**
 * 아이가 보내는 응답. example 단계는 응답을 받지 않는다.
 * `choiceId`가 없으면 버튼 대신 직접 타이핑한 경우이며 서버가 message를 해석한다.
 */
export type ExplainReply = {
  scriptId: string;
  stage: Exclude<ExplainStage, "example">;
  choiceId?: string;
};

/** 선택지 id가 확정된 응답. 전이 함수는 이것만 받는다. */
export type ResolvedExplainReply = ExplainReply & { choiceId: string };

export type ChatResponse = {
  text: string;
  suggestedQuestions?: string[];
  uiAction?: ChatUiAction;
  explain?: ExplainTurn;
};

export const READ_ONLY_CHAT_TOOLS = [
  "approved_stock_facts",
  "own_trade_records",
  "own_holdings",
  "own_behavior_profile",
  "own_archive",
] as const;

export type ReadOnlyChatToolName = (typeof READ_ONLY_CHAT_TOOLS)[number];

export type ProactiveSignal =
  | "buyHesitation"
  | "orderMethodConfusion"
  | "dwell"
  | "lossRevisit";

export type ChatBehaviorEvent =
  | {
      type: "buy_confirmation_abandoned";
      stockId: string;
      at: number;
    }
  | {
      type: "order_method_selected";
      stockId: string;
      orderFlowId: string;
      orderType: "market" | "limit";
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
};
