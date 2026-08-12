import type {
  ExplainChoice,
  ExplainReply,
  ExplainScript,
  ExplainTurn,
  ResolvedExplainReply,
} from "../../../shared/types/chatbot";
import {
  looksLikeNewQuestion,
  matchColloquialIntent,
  normalizeReply,
} from "./colloquial";

const CONFIRM_PROMPT = "이제 알겠어?";
const CONFIRM_CHOICES: readonly ExplainChoice[] = [
  { id: "yes", label: "알겠어" },
  { id: "no", label: "모르겠어" },
];

/** 논문 §3.2.2의 Feedback 서브턴. 각 전이의 첫 고정 문장이며 3문장 예산에 포함된다. */
const FEEDBACK = {
  correct: "맞았어! 바로 그거야.",
  wrong: "음, 그건 아니야.",
  understood: "좋아, 이제 알겠네!",
  example: "그럼 예를 들어볼게.",
} as const;

/** 타이핑을 알아듣지 못했을 때. 추측하지 않고 선택지를 다시 보여준다. */
export const EXPLAIN_REASK = "아래에서 하나만 골라 줄래?";

export type ExplainStep =
  | { kind: "turn"; text: string; turn: ExplainTurn }
  | { kind: "end"; text: string };

function turnStep(
  script: ExplainScript,
  stage: ExplainTurn["stage"],
  text: string,
  prompt: string,
  choices: readonly ExplainChoice[],
): ExplainStep {
  return {
    kind: "turn",
    text,
    turn: { scriptId: script.id, stage, prompt, choices },
  };
}

function stageChoices(script: ExplainScript, stage: ExplainReply["stage"]) {
  return stage === "brief" ? script.check.choices : CONFIRM_CHOICES;
}

/** ① 1줄 설명 + ② 이해 확인 재질문. */
export function startExplain(script: ExplainScript): ExplainStep {
  return turnStep(
    script,
    "brief",
    script.brief,
    script.check.question,
    script.check.choices,
  );
}

/**
 * 버튼을 누르지 않고 타이핑한 답을 선택지 id로 바꾼다.
 *
 * - 확인 단계(`detail`)는 구어체 긍정·부정을 받는다 ("ㅇㅇ", "웅", "몰라"…).
 * - 이해 확인 단계(`brief`)는 선택지 라벨이 정확히 일치할 때만 받는다.
 * - 새 질문으로 보이거나 애매하면 `null` — 호출부가 되묻거나 일반 라우팅으로 보낸다.
 */
export function resolveTextReply(
  script: ExplainScript,
  stage: ExplainReply["stage"],
  message: string,
): string | null {
  if (looksLikeNewQuestion(message)) return null;

  const normalized = normalizeReply(message);
  if (!normalized) return null;

  const labelMatch = stageChoices(script, stage).find(
    (choice) => normalizeReply(choice.label) === normalized,
  );
  if (labelMatch) return labelMatch.id;

  if (stage !== "detail") return null;
  const intent = matchColloquialIntent(message);
  return intent === "yes" ? "yes" : intent === "no" ? "no" : null;
}

/**
 * 아이 응답을 다음 단계로 옮긴다. 전이 계산과 위조 검증을 함께 수행하며,
 * 불법 전이는 `null`을 돌려 호출부가 일반 라우팅으로 폴백하게 한다.
 */
export function advanceExplain(
  script: ExplainScript,
  reply: ResolvedExplainReply,
): ExplainStep | null {
  if (reply.scriptId !== script.id) return null;

  if (reply.stage === "brief") {
    if (!script.check.choices.some((choice) => choice.id === reply.choiceId)) {
      return null;
    }
    if (reply.choiceId === script.check.answerId) {
      return { kind: "end", text: FEEDBACK.correct };
    }
    return turnStep(
      script,
      "detail",
      `${FEEDBACK.wrong} ${script.detail}`,
      CONFIRM_PROMPT,
      CONFIRM_CHOICES,
    );
  }

  if (reply.stage === "detail") {
    if (!CONFIRM_CHOICES.some((choice) => choice.id === reply.choiceId)) {
      return null;
    }
    if (reply.choiceId === "yes") {
      return { kind: "end", text: FEEDBACK.understood };
    }
    return { kind: "end", text: `${FEEDBACK.example} ${script.example}` };
  }

  return null;
}

/** 같은 단계를 유지한 채 선택지만 다시 보여준다. */
export function reaskExplain(
  script: ExplainScript,
  stage: ExplainReply["stage"],
): ExplainStep {
  return turnStep(
    script,
    stage,
    EXPLAIN_REASK,
    stage === "brief" ? script.check.question : CONFIRM_PROMPT,
    stageChoices(script, stage),
  );
}
