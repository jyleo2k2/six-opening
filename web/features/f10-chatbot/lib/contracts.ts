import {
  CHAT_ACTION_TARGETS,
  CHAT_ARCHIVE_TABS,
  CHAT_ORDER_SIDES,
  CHAT_ORDER_STEPS,
  CHAT_SCREENS,
  CHAT_STOCK_VIEWS,
  CHAT_ARCHIVE_OVERLAYS,
  type ChatContext,
  type ChatResponse,
  type ChatScreen,
  type ChatUiAction,
  type ExplainReply,
  type ExplainTurn,
  EXPLAIN_STAGES,
  STOCK_FACT_TOPICS,
  SECTOR_EXPLORE_CHOICES,
  type SectorExploreReply,
  type SectorExploreTurn,
  type StockExploreReply,
  type StockExploreTurn,
  type StockFactTopic,
} from "../../../shared/types/chatbot";
import { STOCKS } from "../../../shared/data/stocks";
import { SECTORS } from "../../../shared/data/sectors";
import { findExplainScript } from "../../../shared/data/chatbot-knowledge";
import { MAX_REASK_COUNT } from "./explain";
import { findNextStockExploreTopic } from "./stock-explore";

const MAX_MESSAGE_LENGTH = 500;
const MAX_LABEL_LENGTH = 60;
const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_PRICE = 1_000_000_000;
const MAX_PNL_PERCENT = 100_000;
const MAX_CASH = 1_000_000_000_000;
/** 화이트리스트 51종을 넘는 보유 수는 화면 값이 아니다. */
const MAX_HOLDING_COUNT = 51;
const MAX_EXPLAIN_ID_LENGTH = 80;
const MAX_PREVIOUS_ANSWER_LENGTH = 800;
const CLIENT_IDENTITY_FIELDS = [
  "userId",
  "familyId",
  "familyMemberId",
  "targetUserId",
] as const;

type ChatExplainReply = ExplainReply & { previousAnswer?: string };

export type ChatRequest = {
  message: string;
  context: ChatContext;
  /**
   * 직전에 서버가 보낸 답변 한 건. 지시어("이게"·"그거")를 푸는 재작성 입력으로만
   * 쓴다. 아이가 쓴 말은 담지 않으므로 입력 게이트를 통과한 적 없는 텍스트가
   * 모델로 되돌아가지 않는다. 대화 이력 전체는 받지 않는다.
   */
  lastAnswer?: string;
  /** 직전에 다룬 용어 스크립트 id. 재작성이 같은 정의를 되풀이하는지 판정한다. */
  lastTopicId?: string;
  explain?: ChatExplainReply;
  stockExplore?: StockExploreReply;
  sectorExplore?: SectorExploreReply;
};

export type StandardChatActionPayload = Pick<
  ChatResponse,
  "suggestedQuestions" | "uiAction"
>;

export type ExplainActionPayload = {
  kind: "explain";
  turn: ExplainTurn;
} & Pick<ChatResponse, "suggestedQuestions" | "uiAction">;

export type StockExploreActionPayload = {
  kind: "stock-explore";
  turn: StockExploreTurn;
} & Pick<ChatResponse, "suggestedQuestions" | "uiAction">;

export type SectorExploreActionPayload = {
  kind: "sector-explore";
  turn: SectorExploreTurn;
} & Pick<ChatResponse, "suggestedQuestions" | "uiAction">;

export type ChatActionPayload =
  | StandardChatActionPayload
  | ExplainActionPayload
  | StockExploreActionPayload
  | SectorExploreActionPayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasClientIdentity(value: Record<string, unknown>) {
  return CLIENT_IDENTITY_FIELDS.some((field) => field in value);
}

function optionalString(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function optionalPositiveInteger(value: unknown, maximum: number) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || Number(value) <= 0 || Number(value) > maximum) {
    return null;
  }
  return Number(value);
}

/**
 * 주문 수량은 정수가 아니다.
 *
 * 금액으로 사면 화면이 `금액 ÷ 주문가` 를 그대로 수량으로 쓴다(`f0-home/lib/order-view.ts`
 * 의 `buyMath`). 0.39주는 그 화면에서 정상값이고 실제로 그렇게 체결된다. 정수만 받던
 * 동안에는 금액으로 사는 화면에서 온 질문이 통째로 `400` 이 됐고, 화면은 그것을 다른
 * 실패와 구분하지 못해 "키웅이가 잠깐 낮잠 중이에요" 로 보여 줬다.
 *
 * 화면이 수량을 소수 둘째 자리까지 보여 주므로(`Math.round(qty * 100) / 100`) 같은 자리에서
 * 끊는다. 답변 문구도 같은 값을 그대로 옮겨야 화면과 챗봇이 다른 수량을 말하지 않는다.
 */
function optionalQuantity(value: unknown, maximum: number) {
  if (value === undefined) return undefined;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > maximum
  ) {
    return null;
  }
  const rounded = Math.round(value * 100) / 100;
  // 화면에서도 살 수 없는 양(`buyMath` 의 `tooSmall`, 0.01주 미만)은 버리되 요청은 살린다.
  // 여기서 거절하면 "너무 적은 금액"을 띄운 화면에서 아무 질문도 못 하게 된다 — 지금
  // 고치는 것과 똑같은 종류의 사고다.
  return rounded > 0 ? rounded : undefined;
}

/** 잔고·보유 종목 수는 0 이 정상값이라 `optionalPositiveInteger` 를 쓸 수 없다. */
function optionalNonNegativeInteger(value: unknown, maximum: number) {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > maximum) {
    return null;
  }
  return Number(value);
}

/** 수익률은 음수와 소수를 모두 허용한다. 소수 둘째 자리까지만 남긴다. */
function optionalPercent(value: unknown, limit: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) {
    return null;
  }
  return Math.round(value * 100) / 100;
}

function parseExplainReply(value: unknown): ChatExplainReply | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const { scriptId, stage, choiceId, previousAnswer, reaskCount } = value;
  if (
    typeof scriptId !== "string" ||
    !/^(term|stock|sector|flow):\S{1,80}$/.test(scriptId) ||
    scriptId.length > MAX_EXPLAIN_ID_LENGTH ||
    typeof stage !== "string" ||
    !EXPLAIN_STAGES.includes(stage as (typeof EXPLAIN_STAGES)[number]) ||
    stage === "example" ||
    (choiceId !== undefined &&
      (typeof choiceId !== "string" ||
        choiceId.length < 1 ||
        choiceId.length > MAX_EXPLAIN_ID_LENGTH ||
        choiceId.trim() !== choiceId)) ||
    (reaskCount !== undefined &&
      (typeof reaskCount !== "number" ||
        !Number.isInteger(reaskCount) ||
        reaskCount < 0 ||
        reaskCount > MAX_REASK_COUNT))
  ) {
    return null;
  }

  const parsedPreviousAnswer = optionalString(
    previousAnswer,
    MAX_PREVIOUS_ANSWER_LENGTH,
  );
  if (
    parsedPreviousAnswer === null ||
    (parsedPreviousAnswer !== undefined &&
      (scriptId !== "flow:guided" || stage !== "brief"))
  ) {
    return null;
  }

  return {
    scriptId,
    stage: stage as ExplainReply["stage"],
    ...(choiceId ? { choiceId: choiceId as string } : {}),
    ...(typeof reaskCount === "number" ? { reaskCount } : {}),
    ...(parsedPreviousAnswer
      ? { previousAnswer: parsedPreviousAnswer }
      : {}),
  };
}

function parseStockExploreReply(
  value: unknown,
): StockExploreReply | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const { stockId, shownTopics, choiceId } = value;
  if (
    typeof stockId !== "string" ||
    !/^KRX:\d{6}$/.test(stockId) ||
    !STOCKS.some((stock) => stock.id === stockId) ||
    !Array.isArray(shownTopics) ||
    shownTopics.length < 1 ||
    shownTopics.length > STOCK_FACT_TOPICS.length ||
    !shownTopics.every(
      (topic): topic is StockFactTopic =>
        typeof topic === "string" &&
        STOCK_FACT_TOPICS.includes(topic as StockFactTopic),
    ) ||
    new Set(shownTopics).size !== shownTopics.length ||
    typeof choiceId !== "string"
  ) {
    return null;
  }

  const nextTopic = findNextStockExploreTopic(shownTopics);
  const allowedChoices = nextTopic
    ? [nextTopic, "done"]
    : ["ask-other", "done"];
  if (!allowedChoices.includes(choiceId)) return null;

  return {
    stockId: stockId as `KRX:${string}`,
    shownTopics,
    choiceId: choiceId as StockExploreReply["choiceId"],
  };
}

function parseSectorExploreReply(
  value: unknown,
): SectorExploreReply | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const { sectorId, choiceId } = value;
  if (
    typeof sectorId !== "string" ||
    !SECTORS.some((sector) => sector.key === sectorId) ||
    typeof choiceId !== "string" ||
    !SECTOR_EXPLORE_CHOICES.includes(choiceId as SectorExploreReply["choiceId"])
  ) {
    return null;
  }
  return { sectorId, choiceId: choiceId as SectorExploreReply["choiceId"] };
}

export function parseChatRequest(value: unknown): ChatRequest | null {
  if (!isRecord(value) || hasClientIdentity(value)) return null;
  if (typeof value.message !== "string" || !isRecord(value.context)) return null;
  if (hasClientIdentity(value.context)) return null;

  const message = value.message.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return null;

  const screen = String(value.context.screen) as ChatScreen;
  if (!CHAT_SCREENS.includes(screen)) return null;

  const stockId = optionalString(value.context.stockId, 10);
  const stockName = optionalString(value.context.stockName, MAX_LABEL_LENGTH);
  const quantity = optionalQuantity(value.context.quantity, MAX_QUANTITY);
  const unitPrice = optionalPositiveInteger(
    value.context.unitPrice,
    MAX_UNIT_PRICE,
  );
  // 화면이 지금 보여주는 내 지갑 값 (SPEC §5.1). 서버 DB 대신 화면을 원본으로 쓴다.
  const pnlPercent = optionalPercent(value.context.pnlPercent, MAX_PNL_PERCENT);
  const cash = optionalNonNegativeInteger(value.context.cash, MAX_CASH);
  const holdingCount = optionalNonNegativeInteger(
    value.context.holdingCount,
    MAX_HOLDING_COUNT,
  );
  if (
    stockId === null ||
    stockName === null ||
    quantity === null ||
    unitPrice === null ||
    pnlPercent === null ||
    cash === null ||
    holdingCount === null ||
    (stockId !== undefined && !/^KRX:\d{6}$/.test(stockId))
  ) {
    return null;
  }

  // 재작성 입력은 서버가 직전에 내보낸 답변이어야 한다. 길이만 검증하고 모델
  // 프롬프트에만 쓰며, 라우팅·수치 허용 목록에는 절대 넣지 않는다.
  const lastAnswer = optionalString(value.lastAnswer, MAX_PREVIOUS_ANSWER_LENGTH);
  const lastTopicId = optionalString(value.lastTopicId, MAX_EXPLAIN_ID_LENGTH);
  if (
    lastAnswer === null ||
    lastTopicId === null ||
    (lastTopicId !== undefined && !findExplainScript(lastTopicId))
  ) {
    return null;
  }

  const explain = parseExplainReply(value.explain);
  const stockExplore = parseStockExploreReply(value.stockExplore);
  const sectorExplore = parseSectorExploreReply(value.sectorExplore);
  if (
    explain === null ||
    stockExplore === null ||
    sectorExplore === null ||
    [explain, stockExplore, sectorExplore].filter((item) => item !== undefined).length > 1
  ) {
    return null;
  }

  return {
    message,
    context: {
      screen,
      ...(stockId ? { stockId: stockId as `KRX:${string}` } : {}),
      ...(stockName ? { stockName } : {}),
      ...(quantity ? { quantity } : {}),
      ...(unitPrice ? { unitPrice } : {}),
      // 0 도 정상값이라 truthy 검사를 쓰지 않는다 (현금 0원, 보유 0곳, 수익률 0%).
      ...(pnlPercent !== undefined ? { pnlPercent } : {}),
      ...(cash !== undefined ? { cash } : {}),
      ...(holdingCount !== undefined ? { holdingCount } : {}),
    },
    ...(lastAnswer ? { lastAnswer } : {}),
    ...(lastTopicId ? { lastTopicId } : {}),
    ...(explain ? { explain } : {}),
    ...(stockExplore ? { stockExplore } : {}),
    ...(sectorExplore ? { sectorExplore } : {}),
  };
}

export function isExplainAction(
  value: unknown,
): value is ExplainActionPayload {
  if (!isRecord(value) || value.kind !== "explain") return false;
  const turn = value.turn;
  if (!isRecord(turn)) return false;
  return (
    typeof turn.scriptId === "string" &&
    typeof turn.stage === "string" &&
    EXPLAIN_STAGES.includes(turn.stage as (typeof EXPLAIN_STAGES)[number]) &&
    typeof turn.prompt === "string" &&
    Array.isArray(turn.choices) &&
    turn.choices.length > 0 &&
    turn.choices.every(
      (choice) =>
        isRecord(choice) &&
        typeof choice.id === "string" &&
        typeof choice.label === "string",
    )
  );
}

export function isStockExploreAction(
  value: unknown,
): value is StockExploreActionPayload {
  if (!isRecord(value) || value.kind !== "stock-explore") return false;
  const turn = value.turn;
  if (!isRecord(turn)) return false;
  return (
    typeof turn.stockId === "string" &&
    /^KRX:\d{6}$/.test(turn.stockId) &&
    Array.isArray(turn.shownTopics) &&
    turn.shownTopics.length > 0 &&
    turn.shownTopics.length <= STOCK_FACT_TOPICS.length &&
    new Set(turn.shownTopics).size === turn.shownTopics.length &&
    turn.shownTopics.every(
      (topic) =>
        typeof topic === "string" &&
        STOCK_FACT_TOPICS.includes(topic as StockFactTopic),
    ) &&
    typeof turn.prompt === "string" &&
    Array.isArray(turn.choices) &&
    turn.choices.length > 0 &&
    turn.choices.every(
      (choice) =>
        isRecord(choice) &&
        typeof choice.id === "string" &&
        [...STOCK_FACT_TOPICS, "ask-other", "done"].includes(choice.id) &&
        typeof choice.label === "string",
    )
  );
}

export function isSectorExploreAction(
  value: unknown,
): value is SectorExploreActionPayload {
  if (!isRecord(value) || value.kind !== "sector-explore" || !isRecord(value.turn)) return false;
  const { sectorId, prompt, choices } = value.turn;
  return (
    typeof sectorId === "string" &&
    SECTORS.some((sector) => sector.key === sectorId) &&
    typeof prompt === "string" &&
    Array.isArray(choices) &&
    choices.length === 2 &&
    choices.every(
      (choice) =>
        isRecord(choice) &&
        typeof choice.id === "string" &&
        SECTOR_EXPLORE_CHOICES.includes(choice.id as SectorExploreReply["choiceId"]) &&
        typeof choice.label === "string",
    )
  );
}

export function isAllowedUiAction(value: unknown): value is ChatUiAction {
  if (!isRecord(value) || value.type !== "open_screen") return false;
  if (!CHAT_ACTION_TARGETS.includes(String(value.target) as ChatUiAction["target"])) {
    return false;
  }

  const { label, stockId, orderSide, orderStep, stockView, sectorId, archiveTab, archiveOverlay } = value;
  return (
    (label === undefined ||
      (typeof label === "string" && label.trim().length > 0 && label.length <= MAX_LABEL_LENGTH)) &&
    (stockId === undefined ||
      (typeof stockId === "string" && STOCKS.some((stock) => stock.id === stockId))) &&
    (orderSide === undefined ||
      CHAT_ORDER_SIDES.includes(String(orderSide) as ChatUiAction["orderSide"] & string)) &&
    (orderStep === undefined ||
      CHAT_ORDER_STEPS.includes(String(orderStep) as ChatUiAction["orderStep"] & string)) &&
    (stockView === undefined ||
      CHAT_STOCK_VIEWS.includes(String(stockView) as ChatUiAction["stockView"] & string)) &&
    (sectorId === undefined ||
      (typeof sectorId === "string" &&
        (SECTORS.some((sector) => sector.key === sectorId) || ["rank", "watch"].includes(sectorId)))) &&
    (archiveTab === undefined ||
      CHAT_ARCHIVE_TABS.includes(String(archiveTab) as ChatUiAction["archiveTab"] & string)) &&
    (archiveOverlay === undefined ||
      CHAT_ARCHIVE_OVERLAYS.includes(
        String(archiveOverlay) as ChatUiAction["archiveOverlay"] & string,
      ))
  );
}

export function sanitizeActionPayload(
  response: ChatResponse,
): StandardChatActionPayload | undefined {
  const suggestedQuestions = response.suggestedQuestions
    ?.filter((question) => typeof question === "string")
    .map((question) => question.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);
  const uiAction = isAllowedUiAction(response.uiAction)
    ? response.uiAction
    : undefined;

  if (!suggestedQuestions?.length && !uiAction) return undefined;
  return {
    ...(suggestedQuestions?.length ? { suggestedQuestions } : {}),
    ...(uiAction ? { uiAction } : {}),
  };
}
