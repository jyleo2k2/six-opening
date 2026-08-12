import {
  getExplanationNode,
  GUIDED_TOPIC_STARTS,
} from "./explanation-graph";
import type { GuidedOptionId, GuidedTopicId } from "./explanation-graph";

export type GuidedDialogueState = {
  topicId: GuidedTopicId;
  currentNodeId: string;
};

export type GuidedDialogueOption = {
  id: GuidedOptionId;
  label: string;
};

export type GuidedDialogueTurn = {
  text: string;
  state: GuidedDialogueState | null;
  options: GuidedDialogueOption[];
};

const TOPIC_PATTERNS: Array<[GuidedTopicId, RegExp]> = [
  ["per", /(?:^|[^a-z])per(?:$|[^a-z])/i],
  ["etf", /(?:^|[^a-z])etf(?:$|[^a-z])/i],
  ["diversification", /분산\s*투자|분산투자/],
];

function toTurn(topicId: GuidedTopicId, nodeId: string): GuidedDialogueTurn | null {
  const node = getExplanationNode(topicId, nodeId);
  if (!node) return null;

  return {
    text: node.text,
    state: { topicId, currentNodeId: node.id },
    options: node.options.map(({ id, label }) => ({ id, label })),
  };
}

export function startGuidedDialogue(message: string): GuidedDialogueTurn | null {
  const topicId = TOPIC_PATTERNS.find(([, pattern]) => pattern.test(message))?.[0];
  if (!topicId) return null;
  return toTurn(topicId, GUIDED_TOPIC_STARTS[topicId]);
}

export function advanceGuidedDialogue(
  state: GuidedDialogueState,
  optionId: GuidedOptionId,
): GuidedDialogueTurn | null {
  const node = getExplanationNode(state.topicId, state.currentNodeId);
  const option = node?.options.find((candidate) => candidate.id === optionId);
  if (!node || !option) return null;

  if (!option.targetNodeId) {
    return {
      text: "좋아, 여기까지 볼게. 다른 궁금한 점이 생기면 이어서 물어봐 줘! 🐻",
      state: null,
      options: [],
    };
  }

  return toTurn(state.topicId, option.targetNodeId);
}

export function isGuidedTopicId(value: unknown): value is GuidedTopicId {
  return value === "per" || value === "etf" || value === "diversification";
}

export function isGuidedOptionId(value: unknown): value is GuidedOptionId {
  return value === "simpler" || value === "example" || value === "detail" || value === "understood";
}
