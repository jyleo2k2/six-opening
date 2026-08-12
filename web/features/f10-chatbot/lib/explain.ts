import type {
  ExplainChoice,
  ExplainReply,
  ExplainScript,
  ExplainTurn,
} from "../../../shared/types/chatbot";

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
 * 아이 응답을 다음 단계로 옮긴다. 전이 계산과 위조 검증을 함께 수행하며,
 * 불법 전이는 `null`을 돌려 호출부가 일반 라우팅으로 폴백하게 한다.
 */
export function advanceExplain(
  script: ExplainScript,
  reply: ExplainReply,
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
