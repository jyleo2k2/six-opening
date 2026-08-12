import {
  CHAT_SCREENS,
  type ChatContext,
  type ChatResponse,
  type ExplainReply,
  type ExplainTurn,
  type ChatScreen,
  type ChatUiAction,
} from "../../../shared/types/chatbot";
import type { GuidedDialogueState } from "./dialogue-engine";

const MAX_MESSAGE_LENGTH = 500;
const MAX_LABEL_LENGTH = 60;
const MAX_QUANTITY = 1_000_000;
const MAX_UNIT_PRICE = 1_000_000_000;
const MAX_GUIDED_NODE_IDS = 8;
const MAX_GUIDED_ID_LENGTH = 80;
const CLIENT_IDENTITY_FIELDS = [
  "userId",
  "familyId",
  "familyMemberId",
  "targetUserId",
] as const;

export type ChatRequest = {
  message: string;
  context: ChatContext;
  guidedDialogue?: GuidedDialogueState;
  explain?: ExplainReply;
};

export type StandardChatActionPayload = Pick<
  ChatResponse,
  "suggestedQuestions" | "uiAction"
>;

export type GuidedDialogueActionPayload = {
  kind: "guided_dialogue";
  state: GuidedDialogueState;
};

export type ChatActionPayload =
  | StandardChatActionPayload
  | GuidedDialogueActionPayload
  | ExplainActionPayload;

export type ExplainActionPayload = {
  kind: "explain";
  turn: ExplainTurn;
};

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

function parseGuidedDialogue(
  value: unknown,
): GuidedDialogueState | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;

  const { topicId, explainedNodeIds, pendingNodeId } = value;
  if (
    typeof topicId !== "string" ||
    !/^(term|stock):\S{1,80}$/.test(topicId) ||
    !Array.isArray(explainedNodeIds) ||
    explainedNodeIds.length < 1 ||
    explainedNodeIds.length > MAX_GUIDED_NODE_IDS ||
    !explainedNodeIds.every(
      (nodeId) =>
        typeof nodeId === "string" &&
        nodeId.length > 0 &&
        nodeId.length <= MAX_GUIDED_ID_LENGTH &&
        nodeId.trim() === nodeId,
    ) ||
    typeof pendingNodeId !== "string" ||
    pendingNodeId.length < 1 ||
    pendingNodeId.length > MAX_GUIDED_ID_LENGTH ||
    pendingNodeId.trim() !== pendingNodeId
  ) {
    return null;
  }

  return {
    topicId: topicId as GuidedDialogueState["topicId"],
    explainedNodeIds,
    pendingNodeId,
  };
}

function parseExplainReply(value: unknown): ExplainReply | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  if (
    typeof value.scriptId !== "string" ||
    !/^term:\S{1,80}$/.test(value.scriptId) ||
    (value.stage !== "brief" && value.stage !== "detail")
  ) return null;
  const choiceId = optionalString(value.choiceId, MAX_GUIDED_ID_LENGTH);
  if (!choiceId) return null;
  return {
    scriptId: value.scriptId,
    stage: value.stage,
    choiceId,
  };
}

function parseExplainTurn(value: unknown): ExplainTurn | null | undefined {
  if (!isRecord(value)) return null;
  if (
    typeof value.scriptId !== "string" ||
    (value.stage !== "brief" && value.stage !== "detail") ||
    typeof value.prompt !== "string" ||
    !value.prompt.trim() ||
    !Array.isArray(value.choices) ||
    !value.choices.length ||
    !value.choices.every(
      (choice) =>
        isRecord(choice) &&
        typeof choice.id === "string" &&
        choice.id.length > 0 &&
        typeof choice.label === "string" &&
        choice.label.trim().length > 0,
    )
  ) return null;
  return value as ExplainTurn;
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

  const guidedDialogue = parseGuidedDialogue(value.guidedDialogue);
  if (guidedDialogue === null) return null;
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
    ...(guidedDialogue ? { guidedDialogue } : {}),
    ...(explain ? { explain } : {}),
  };
}

export function isGuidedDialogueAction(
  value: unknown,
): value is GuidedDialogueActionPayload {
  if (!isRecord(value) || value.kind !== "guided_dialogue") return false;
  const state = parseGuidedDialogue(value.state);
  return state !== undefined && state !== null;
}

export function isExplainAction(value: unknown): value is ExplainActionPayload {
  if (!isRecord(value) || value.kind !== "explain") return false;
  const turn = parseExplainTurn(value.turn);
  return turn !== undefined && turn !== null;
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
