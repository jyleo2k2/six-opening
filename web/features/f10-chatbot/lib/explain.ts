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

export type ExplainStep =
  | { kind: "turn"; text: string; turn: ExplainTurn }
  | { kind: "end"; text: string };

function turnStep(
  script: ExplainScript,
  stage: Exclude<ExplainTurn["stage"], "example">,
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

export function startExplain(script: ExplainScript): ExplainStep {
  return turnStep(
    script,
    "brief",
    script.brief,
    script.check.question,
    script.check.choices,
  );
}

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
      return { kind: "end", text: "맞았어! 바로 그거야." };
    }
    return turnStep(
      script,
      "detail",
      `음, 그건 아니야. ${script.detail}`,
      CONFIRM_PROMPT,
      CONFIRM_CHOICES,
    );
  }

  if (reply.stage === "detail") {
    if (!CONFIRM_CHOICES.some((choice) => choice.id === reply.choiceId)) {
      return null;
    }
    if (reply.choiceId === "yes") return { kind: "end", text: "좋아, 잘 이해했어." };
    return { kind: "end", text: `그럼 예를 들어볼게. ${script.example}` };
  }

  return null;
}
