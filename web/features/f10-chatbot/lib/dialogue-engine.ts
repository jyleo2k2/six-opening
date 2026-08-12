import { findGuidedTopic, getGuidedSections, isGuidedTopicId } from "./explanation-graph";
import type { GuidedTopicId } from "./explanation-graph";
import type { ChatContext } from "./routing";

export type { GuidedTopicId } from "./explanation-graph";

export type GuidedDialogueState = {
  topicId: GuidedTopicId;
  explainedNodeIds: string[];
  pendingNodeId: string;
};

export type GuidedDialogueTurn = {
  text: string;
  state: GuidedDialogueState | null;
};

type ReplyIntent = "yes" | "no" | "unknown";

function replyIntent(message: string): ReplyIntent {
  const normalized = message.replaceAll(" ", "").toLowerCase();
  if (["아니", "아니요", "괜찮아", "됐어", "그만", "끝"].some((word) => normalized.includes(word))) return "no";
  if (["응", "네", "예", "좋아", "알려줘", "더알고싶", "더궁금해"].some((word) => normalized.includes(word))) return "yes";
  return "unknown";
}

function toTurn(topicId: GuidedTopicId, explainedNodeIds: string[]): GuidedDialogueTurn | null {
  const sections = getGuidedSections(topicId);
  if (!sections) return null;
  const current = sections.find((section) => section.id === explainedNodeIds.at(-1));
  const next = sections.find((section) => !explainedNodeIds.includes(section.id));
  if (!current) return null;
  if (!next) return { text: `${current.text} 여기까지야. 다른 종목이나 용어가 궁금하면 물어봐 줘! 🐻`, state: null };
  return {
    text: `${current.text}\n‘${next.keyword}’ 쪽도 더 알아볼까?`,
    state: { topicId, explainedNodeIds, pendingNodeId: next.id },
  };
}

export function startGuidedDialogue(message: string, context?: ChatContext): GuidedDialogueTurn | null {
  const topicId = findGuidedTopic(message, context?.stockName);
  const sections = topicId ? getGuidedSections(topicId) : null;
  return topicId && sections ? toTurn(topicId, [sections[0].id]) : null;
}

export function advanceGuidedDialogue(state: GuidedDialogueState, message: string): GuidedDialogueTurn | null {
  const sections = getGuidedSections(state.topicId);
  if (!sections || state.explainedNodeIds.length === 0) return null;
  const expectedExplained = sections.slice(0, state.explainedNodeIds.length).map((section) => section.id);
  const pending = sections[state.explainedNodeIds.length];
  if (
    !pending ||
    state.pendingNodeId !== pending.id ||
    state.explainedNodeIds.length !== expectedExplained.length ||
    state.explainedNodeIds.some((nodeId, index) => nodeId !== expectedExplained[index])
  ) return null;
  const intent = replyIntent(message);
  if (intent === "no") return { text: "좋아, 여기까지 볼게. 다른 종목이나 용어가 궁금하면 이어서 물어봐 줘! 🐻", state: null };
  if (intent === "unknown") return { text: `‘${pending.keyword}’ 쪽을 더 알아볼까? 응 또는 아니라고 말해 줘.`, state };
  return toTurn(state.topicId, [...state.explainedNodeIds, pending.id]);
}

export { isGuidedTopicId };
