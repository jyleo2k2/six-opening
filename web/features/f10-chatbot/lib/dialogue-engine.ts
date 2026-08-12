import {
  findGuidedTopic,
  getExplanationNode,
  isGuidedOptionId,
  isGuidedTopicId,
} from "./explanation-graph";
import type { GuidedOptionId, GuidedTopicId } from "./explanation-graph";
import type { ChatContext } from "./routing";

export type { GuidedOptionId, GuidedTopicId } from "./explanation-graph";

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

function toTurn(topicId: GuidedTopicId, nodeId: string): GuidedDialogueTurn | null {
  const node = getExplanationNode(topicId, nodeId);
  if (!node) return null;
  return {
    text: node.text,
    state: { topicId, currentNodeId: node.id },
    options: node.options.map(({ id, label }) => ({ id, label })),
  };
}

export function startGuidedDialogue(message: string, context?: ChatContext): GuidedDialogueTurn | null {
  const topicId = findGuidedTopic(message, context?.stockName);
  return topicId ? toTurn(topicId, "main") : null;
}

export function advanceGuidedDialogue(
  state: GuidedDialogueState,
  optionId: GuidedOptionId,
): GuidedDialogueTurn | null {
  const node = getExplanationNode(state.topicId, state.currentNodeId);
  const option = node?.options.find((candidate) => candidate.id === optionId);
  if (!node || !option) return null;
  if (!option.targetNodeId) {
    return { text: "좋아, 여기까지 볼게. 다른 종목이나 용어도 궁금하면 이어서 물어봐 줘! 🐻", state: null, options: [] };
  }
  return toTurn(state.topicId, option.targetNodeId);
}

export { isGuidedOptionId, isGuidedTopicId };
