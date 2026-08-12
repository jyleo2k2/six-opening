import {
  CHAT_SCREENS,
  type ChatContext,
  type ChatResponse,
  type ChatScreen,
  type ChatUiAction,
  type ExplainReply,
  type ExplainTurn,
  EXPLAIN_STAGES,
} from "../../../shared/types/chatbot";

const MAX_MESSAGE_LENGTH = 500;
const MAX_LABEL_LENGTH = 60;
const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_PRICE = 1_000_000_000;
const MAX_EXPLAIN_ID_LENGTH = 80;
const CLIENT_IDENTITY_FIELDS = [
  "userId",
  "familyId",
  "familyMemberId",
  "targetUserId",
] as const;

export type ChatRequest = {
  message: string;
  context: ChatContext;
  explain?: ExplainReply;
};

export type StandardChatActionPayload = Pick<
  ChatResponse,
  "suggestedQuestions" | "uiAction"
>;

export type ExplainActionPayload = {
  kind: "explain";
  turn: ExplainTurn;
};

export type ChatActionPayload =
  | StandardChatActionPayload
  | ExplainActionPayload;

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

function parseExplainReply(value: unknown): ExplainReply | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const { scriptId, stage, choiceId } = value;
  if (
    typeof scriptId !== "string" ||
    !/^(term|stock|sector):\S{1,80}$/.test(scriptId) ||
    scriptId.length > MAX_EXPLAIN_ID_LENGTH ||
    typeof stage !== "string" ||
    !EXPLAIN_STAGES.includes(stage as (typeof EXPLAIN_STAGES)[number]) ||
    stage === "example" ||
    (choiceId !== undefined &&
      (typeof choiceId !== "string" ||
        choiceId.length < 1 ||
        choiceId.length > MAX_EXPLAIN_ID_LENGTH ||
        choiceId.trim() !== choiceId))
  ) {
    return null;
  }

  return {
    scriptId,
    stage: stage as ExplainReply["stage"],
    ...(choiceId ? { choiceId: choiceId as string } : {}),
  };
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
  const quantity = optionalPositiveInteger(value.context.quantity, MAX_QUANTITY);
  const unitPrice = optionalPositiveInteger(
    value.context.unitPrice,
    MAX_UNIT_PRICE,
  );
  if (
    stockId === null ||
    stockName === null ||
    quantity === null ||
    unitPrice === null ||
    (stockId !== undefined && !/^KRX:\d{6}$/.test(stockId))
  ) {
    return null;
  }

  const explain = parseExplainReply(value.explain);
  if (explain === null) return null;

  return {
    message,
    context: {
      screen,
      ...(stockId ? { stockId: stockId as `KRX:${string}` } : {}),
      ...(stockName ? { stockName } : {}),
      ...(quantity ? { quantity } : {}),
      ...(unitPrice ? { unitPrice } : {}),
    },
    ...(explain ? { explain } : {}),
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

export function isAllowedUiAction(value: unknown): value is ChatUiAction {
  if (!isRecord(value) || value.type !== "open_screen") return false;
  return CHAT_SCREENS.includes(String(value.target) as ChatScreen);
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
