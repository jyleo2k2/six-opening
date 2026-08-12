import type { ExplainReply, ExplainScript, ExplainTurn } from "../../../shared/types/chatbot";

export function startExplain(script: ExplainScript): ExplainReply {
  return {
    text: `${script.brief} ${script.check.prompt}`,
    choices: script.check.choices.map(({ id, label }) => ({ id, label })),
    turn: { scriptId: script.id, stage: "brief" },
  };
}

export function advanceExplain(
  script: ExplainScript,
  turn: ExplainTurn,
  choiceId: string,
): ExplainReply | null {
  if (turn.scriptId !== script.id) return null;

  if (turn.stage === "brief") {
    const choice = script.check.choices.find((candidate) => candidate.id === choiceId);
    if (!choice) return null;
    if (choice.correct) return { text: "맞았어! 바로 그거야." };
    return {
      text: `음, 그건 아니야. ${script.detail}`,
      choices: [
        { id: "understood", label: "알겠어" },
        { id: "not-yet", label: "모르겠어" },
      ],
      turn: { scriptId: script.id, stage: "detail" },
    };
  }

  if (turn.stage !== "detail") return null;
  if (choiceId === "understood") return { text: "좋아, 잘 이해했어." };
  if (choiceId === "not-yet") return { text: script.example };
  return null;
}
