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
  normalizeChoiceLabel,
  normalizeReply,
} from "./colloquial";
import { toPoliteKorean } from "./polite";

const CONFIRM_PROMPT = "이제 알겠어요?";
const CONFIRM_CHOICES: readonly ExplainChoice[] = [
  { id: "yes", label: "알겠어요" },
  { id: "no", label: "모르겠어요" },
];
const GUIDED_CHOICES: readonly ExplainChoice[] = [
  { id: "understood", label: "이해했어요" },
  { id: "simpler", label: "더 쉽게 볼래요" },
];
const GUIDED_DETAIL_CHOICES: readonly ExplainChoice[] = [
  { id: "ask", label: "직접 물어볼게요" },
  { id: "done", label: "여기까지 볼래요" },
];
const FOLLOWUP_PROMPT = "다음에는 어떻게 할까요?";
const FOLLOWUP_CHOICES: readonly ExplainChoice[] = [
  { id: "ask", label: "다른 것도 물어볼래요" },
  { id: "done", label: "여기까지 볼래요" },
];
const UNSURE_CHOICE: ExplainChoice = { id: "unsure", label: "잘 모르겠어요" };

/** 같은 단계에서 이 횟수만큼 되물은 뒤에는 더 안 묻고 정답을 바로 알려준다. */
export const MAX_REASK_COUNT = 2;

export const GUIDED_SCRIPT_ID = "flow:guided";

const GUIDED_SCRIPT: ExplainScript = {
  id: GUIDED_SCRIPT_ID,
  feedback: "궁금한 지점을 잘 짚었어요",
  brief: "함께 한 조각씩 살펴볼까요.",
  check: {
    kind: "guiding",
    question: "설명을 이해했어요, 아니면 더 쉽게 다시 볼까요?",
    choices: GUIDED_CHOICES,
    answerId: "understood",
  },
  detail:
    "괜찮아요 — 헷갈린 단어나 문장을 그대로 적어 주면 한 조각씩 다시 설명해 드릴게요.",
  example: "궁금한 말을 그대로 적어 주셔도 돼요.",
};

/** 논문 §3.2.2의 Feedback 서브턴. 각 전이의 첫 고정 문장이며 3문장 예산에 포함된다. */
const FEEDBACK = {
  correct: "맞아요, 그 단서를 잘 연결했어요.",
  /** 오답을 판정하지 않는다. 아이의 생각을 인정하고 다음 단계로 넘긴다. */
  wrong: "그렇게 생각할 수 있어요.",
  understood: "좋아요, 이제 알겠네요!",
  example: "그럼 예를 들어볼게요.",
  /** 정답·오답이 아니라 "모르겠어요"에 쓴다. 틀렸다고 말하지 않는다. */
  unsure: "괜찮아요, 같이 찾아봐요.",
  /** 되묻기 상한(MAX_REASK_COUNT)에 닿아 정답을 바로 보여줄 때 쓴다. */
  giveUp: "그럼 답을 같이 확인해 볼게요.",
} as const;

/** 타이핑을 알아듣지 못했을 때. 추측하지 않고 선택지를 다시 보여준다. */
export const EXPLAIN_REASK = "아래에서 하나만 골라 주세요.";

export type ExplainStep =
  | { kind: "turn"; text: string; turn: ExplainTurn }
  | { kind: "end"; text: string };

function turnStep(
  script: ExplainScript,
  stage: ExplainTurn["stage"],
  text: string,
  prompt: string,
  choices: readonly ExplainChoice[],
  reaskCount?: number,
): ExplainStep {
  return {
    kind: "turn",
    // 🤖 본문은 승인 데이터에 아직 반말 원문이 남아 있어 변환을 유지한다.
    // 🤖 prompt 와 🧒 선택지 라벨은 데이터가 이미 최종 형태라 손대지 않는다(SPEC §3.3.2).
    text: toPoliteKorean(text),
    turn: {
      scriptId: script.id,
      stage,
      prompt,
      choices,
      ...(reaskCount ? { reaskCount } : {}),
    },
  };
}

/**
 * brief 단계의 진단형 퀴즈(guiding 아님)에는 "잘 모르겠어요"를 항상 붙인다.
 * guiding 스크립트는 "더 쉽게 볼래요"가 이미 같은 역할을 한다.
 */
function stageChoices(script: ExplainScript, stage: ExplainReply["stage"]) {
  if (stage === "brief") {
    return script.check.kind === "guiding"
      ? script.check.choices
      : [...script.check.choices, UNSURE_CHOICE];
  }
  if (stage === "followup") return FOLLOWUP_CHOICES;
  return script.check.kind === "guiding"
    ? GUIDED_DETAIL_CHOICES
    : script.adjust?.choices ?? CONFIRM_CHOICES;
}

/** ① 구체적 피드백 + ② 한 조각 설명 + ③ 이해 확인 재질문. */
export function startExplain(script: ExplainScript): ExplainStep {
  return turnStep(
    script,
    "brief",
    `${script.feedback ?? "궁금한 걸 잘 짚었어요"} — ${script.brief}`,
    script.check.question,
    stageChoices(script, "brief"),
  );
}

/** 정적 전용 스크립트가 없는 정보성 답변을 공통 DAPIE 유도 턴으로 감싼다. */
export function startGuidedExplain(
  explanation: string,
  feedback = GUIDED_SCRIPT.feedback,
): ExplainStep {
  return startExplain({
    ...GUIDED_SCRIPT,
    feedback,
    brief: explanation,
  });
}

export function findCommonExplainScript(id: string) {
  return id === GUIDED_SCRIPT_ID ? GUIDED_SCRIPT : undefined;
}

function followupExplain(script: ExplainScript, text: string): ExplainStep {
  return turnStep(
    script,
    "followup",
    text,
    FOLLOWUP_PROMPT,
    FOLLOWUP_CHOICES,
  );
}

/**
 * 버튼을 누르지 않고 타이핑한 답을 선택지 id로 바꾼다.
 *
 * - "몰라요"·"모르겠어요"·"어려워요" 계열은 단계·정답 여부와 무관하게 항상
 *   `unsure`로 받는다(guiding 스크립트는 제외 — "더 쉽게 볼래요"가 같은 역할).
 *   정답도 오답도 아닌 세 번째 반응이라 추측 없이 바로 인정해야 한다.
 * - 진단형 확인 단계(`detail`)는 그 밖의 구어체 긍정·부정도 받는다 ("ㅇㅇ", "웅"…).
 * - 이해 확인 단계(`brief`)의 그 밖의 응답은 선택지 라벨이 정확히 일치할 때만 받는다.
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

  // 라벨은 해요체지만 아이는 반말로 칠 수 있다("들어가지 않아요" 버튼 → "들어가지 않아").
  // 끝의 "요"를 떼고 견주되, 두 선택지가 같아지면 추측하지 않고 되묻는다.
  const target = normalizeChoiceLabel(message);
  const politeTarget = normalizeChoiceLabel(toPoliteKorean(message));
  const labelMatches = stageChoices(script, stage).filter(
    (choice) =>
      normalizeChoiceLabel(choice.label) === target ||
      normalizeChoiceLabel(toPoliteKorean(choice.label)) === target ||
      normalizeChoiceLabel(toPoliteKorean(choice.label)) === politeTarget,
  );
  if (labelMatches.length === 1) return labelMatches[0].id;
  if (labelMatches.length > 1) return null;

  if (script.check.kind !== "guiding" && matchColloquialIntent(message) === "unsure") {
    return "unsure";
  }

  if (stage !== "detail" || script.check.kind === "guiding") return null;
  const intent = matchColloquialIntent(message);
  if (script.adjust) return intent === "no" ? "unsure" : null;
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
    if (
      reply.choiceId !== "unsure" &&
      !script.check.choices.some((choice) => choice.id === reply.choiceId)
    ) {
      return null;
    }
    if (reply.choiceId === "unsure" && script.check.kind !== "guiding") {
      return script.adjust
        ? turnStep(
            script,
            "detail",
            `${FEEDBACK.unsure} ${script.adjust.explanation}`,
            script.adjust.question,
            script.adjust.choices,
          )
        : turnStep(
            script,
            "detail",
            `${FEEDBACK.unsure} ${script.detail}`,
            CONFIRM_PROMPT,
            CONFIRM_CHOICES,
          );
    }
    if (reply.choiceId === script.check.answerId) {
      return followupExplain(
        script,
        script.check.kind === "guiding"
          ? `${FEEDBACK.understood} 방금 본 핵심을 기준으로 다음 질문을 이어갈 수 있어요.`
          : `${FEEDBACK.correct} ${script.detail}`,
      );
    }
    if (script.check.kind === "guiding") {
      return turnStep(
        script,
        "detail",
        script.detail,
        "어떻게 이어갈까요?",
        GUIDED_DETAIL_CHOICES,
      );
    }
    if (script.adjust) {
      return turnStep(
        script,
        "detail",
        `${FEEDBACK.wrong} ${script.adjust.explanation}`,
        script.adjust.question,
        script.adjust.choices,
      );
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
    const choices =
      script.check.kind === "guiding"
        ? GUIDED_DETAIL_CHOICES
        : script.adjust?.choices ?? CONFIRM_CHOICES;
    if (
      reply.choiceId !== "unsure" &&
      !choices.some((choice) => choice.id === reply.choiceId)
    ) {
      return null;
    }
    if (script.check.kind === "guiding") {
      return reply.choiceId === "ask"
        ? { kind: "end", text: "좋아요, 헷갈린 말을 그대로 적어 주세요." }
        : { kind: "end", text: "좋아요, 궁금한 게 생기면 다시 불러 주세요." };
    }
    if (script.adjust) {
      if (reply.choiceId === script.adjust.answerId) {
        return followupExplain(
          script,
          `${FEEDBACK.correct} ${script.detail}`,
        );
      }
      // 오답이 반복되면 같은 질문으로 무한히 돌지 않는다 — 예시로 한 번만 다시
      // 묻고, 또 틀리면 정답 설명을 주고 원래 흐름(followup)으로 돌아간다.
      if ((reply.reaskCount ?? 0) >= 1) {
        return followupExplain(script, `${FEEDBACK.giveUp} ${script.detail}`);
      }
      return turnStep(
        script,
        "detail",
        `${FEEDBACK.example} ${script.example}`,
        script.adjust.question,
        script.adjust.choices,
        (reply.reaskCount ?? 0) + 1,
      );
    }
    if (reply.choiceId === "yes") {
      return followupExplain(script, FEEDBACK.understood);
    }
    return followupExplain(
      script,
      `${FEEDBACK.example} ${script.example}`,
    );
  }

  if (reply.stage === "followup") {
    if (!FOLLOWUP_CHOICES.some((choice) => choice.id === reply.choiceId)) {
      return null;
    }
    return reply.choiceId === "ask"
      ? { kind: "end", text: "좋아요, 다음에 궁금한 걸 그대로 적어 주세요." }
      : { kind: "end", text: "좋아요, 궁금한 게 생기면 다시 불러 주세요." };
  }

  return null;
}

/**
 * 같은 단계를 유지한 채 선택지만 다시 보여준다. 같은 단계에서
 * `MAX_REASK_COUNT`번 되물었으면 더 묻지 않고 정답과 설명을 바로 주고
 * followup으로 넘긴다 — 어떤 입력이든 무한히 되묻지 않는다.
 */
export function reaskExplain(
  script: ExplainScript,
  stage: ExplainReply["stage"],
  reaskCount = 0,
): ExplainStep {
  if (reaskCount >= MAX_REASK_COUNT) {
    return followupExplain(script, `${FEEDBACK.giveUp} ${script.detail}`);
  }
  return turnStep(
    script,
    stage,
    EXPLAIN_REASK,
    stage === "brief"
      ? script.check.question
      : stage === "followup"
        ? FOLLOWUP_PROMPT
        : script.check.kind === "guiding"
          ? "어떻게 이어갈까요?"
          : script.adjust
            ? script.adjust.question
            : CONFIRM_PROMPT,
    stageChoices(script, stage),
    reaskCount + 1,
  );
}
