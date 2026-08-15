export const CHAT_SCREENS = ["home", "stock", "order", "archive"] as const;

export type ChatScreen = (typeof CHAT_SCREENS)[number];

export const CHAT_ACTION_TARGETS = [...CHAT_SCREENS, "portfolio", "ranking"] as const;
export type ChatActionTarget = (typeof CHAT_ACTION_TARGETS)[number];

export const CHAT_STOCK_VIEWS = ["explore", "detail"] as const;
export type ChatStockView = (typeof CHAT_STOCK_VIEWS)[number];

export const CHAT_ARCHIVE_OVERLAYS = ["cards"] as const;
export type ChatArchiveOverlay = (typeof CHAT_ARCHIVE_OVERLAYS)[number];

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
  /**
   * 아래 셋은 지금 화면이 보여주고 있는 내 지갑 값이다. 서버 DB 가 아니라
   * `app.html` 이 원본인데, 주문의 서버 저장이 best-effort 라 DB 가 최신이
   * 아닐 수 있기 때문이다. `quantity`·`unitPrice` 와 같은 성격이며 조회 대상
   * 사용자는 여전히 서버가 쿠키로만 정한다 — 남의 값을 지정하는 통로가 아니다.
   * 출력 게이트의 허용 숫자 목록에 들어가므로 화면과 다른 값을 말할 수 없다.
   */
  pnlPercent?: number;
  cash?: number;
  holdingCount?: number;
};

export type ChatUiAction = {
  type: "open_screen";
  target: ChatActionTarget;
  label?: string;
  stockId?: `KRX:${string}`;
  orderSide?: ChatOrderSide;
  orderStep?: ChatOrderStep;
  /** 종목 상세와 종목 탐색을 분명히 구분한다. */
  stockView?: ChatStockView;
  sectorId?: string;
  archiveTab?: ChatArchiveTab;
  /** 아카이브 탭 안의 사용자 도달 가능 오버레이. */
  archiveOverlay?: ChatArchiveOverlay;
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
  /** 같은 단계에서 되묻은 횟수. 클라이언트는 다음 요청에 그대로 되돌려 보낸다. */
  reaskCount?: number;
};

/**
 * 아이가 보내는 응답. example 단계는 응답을 받지 않는다.
 * `choiceId`가 없으면 버튼 대신 직접 타이핑한 경우이며 서버가 message를 해석한다.
 */
export type ExplainReply = {
  scriptId: string;
  stage: Exclude<ExplainStage, "example">;
  choiceId?: string;
  reaskCount?: number;
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
