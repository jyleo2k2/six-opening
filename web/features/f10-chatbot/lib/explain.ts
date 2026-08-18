import type {
  ExplainChoice,
  ExplainReply,
  ExplainScript,
  ExplainTurn,
  ResolvedExplainReply,
} from "../../../shared/types/chatbot";
import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import {
  looksLikeNewQuestion,
  looksLikeQuizExitIntent,
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
const REASK_EXIT_CHOICE: ExplainChoice = {
  id: "ask",
  label: "다른 걸 물어볼래요",
};

/**
 * 설명이 끝난 자리에 붙이는 비슷한 용어 추천 (SPEC §3.4.1).
 *
 * 세 번 틀린 뒤 "다른 것도 물어볼래요"만 있으면 아이가 직접 타이핑해야 해서 대화가 끊긴다.
 * 같은 범주에서 아직 안 본 용어를 카드로 내면 다음 걸음을 고르기만 하면 된다.
 *
 * 추천은 `category`가 같은 승인 용어에서만 고르므로 LLM을 부르지 않고 결정적이다.
 * 카드는 `suggestedQuestions`(자유 문장)가 아니라 선택지라, 문구가 라우터를 다시 타지 않고
 * 서버가 등록된 스크립트 id 로 대조한다.
 */
const RELATED_CARD_LIMIT = 2;
const RELATED_CARD_LIMIT_ON_ASK = 3;
const RELATED_PREFIX = "term:";

export function relatedTermChoices(scriptId: string, limit: number): ExplainChoice[] {
  const current = CHATBOT_KNOWLEDGE.find((entry) => entry.explainScript?.id === scriptId);
  if (!current?.category) return [];
  const family = CHATBOT_KNOWLEDGE.filter(
    (entry) => entry.category === current.category && entry.termLabel && entry.explainScript,
  );
  const at = family.findIndex((entry) => entry.id === current.id);
  if (at < 0) return [];
  // 앞에서 자르면 PER 에 늘 "시가총액"이 붙는다. 자기 바로 뒤부터 순환해 이웃한 말을 먼저 준다.
  return Array.from({ length: Math.min(limit, family.length - 1) }, (_, step) => {
    const entry = family[(at + step + 1) % family.length];
    return { id: entry.explainScript!.id, label: `${entry.termLabel} 볼래요` };
  });
}

/** 같은 단계에서 이 횟수만큼 되물은 뒤에는 더 안 묻고 정답을 바로 알려준다. */
export const MAX_REASK_COUNT = 2;

export const GUIDED_SCRIPT_ID = "flow:guided";

const GUIDED_SCRIPT: ExplainScript = {
  id: GUIDED_SCRIPT_ID,
  feedback: "좋은 질문이에요!",
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

/**
 * 논문 §3.2.2의 Feedback 서브턴. **문장이 아니라 머리말이다** (SPEC §3.4.4).
 *
 * 예전에는 각 전이의 첫 고정 문장이라 3문장 예산의 1문장을 정보 0으로 먹었다
 * ("맞아요, 그 단서를 잘 연결했어요." + 본문 2문장 = 3문장). 서브턴 계약은
 * 살리고 길이만 한 마디로 내려, 본문이 예산을 온전히 쓰게 한다.
 */
const FEEDBACK = {
  correct: "맞아요!",
  /** 오답을 판정하지 않는다. 아이의 생각을 인정하고 다음 단계로 넘긴다. */
  wrong: "그렇게 볼 수도 있어요.",
  understood: "좋아요!",
  /** 뒤에 오는 예시와 한 문장으로 이어지도록 종결부호를 두지 않는다. */
  example: "예를 들면요,",
  /** 정답·오답이 아니라 "모르겠어요"에 쓴다. 틀렸다고 말하지 않는다. */
  unsure: "괜찮아요!",
  /** 되묻기 상한(MAX_REASK_COUNT)에 닿아 정답을 바로 보여줄 때 쓴다. */
  giveUp: "답을 같이 볼게요.",
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

/** 진단형 선택지에는 아이가 모를 때 고를 수 있는 카드를 항상 붙인다. */
function withUnsureChoice(choices: readonly ExplainChoice[]) {
  return choices.some((choice) => choice.id === UNSURE_CHOICE.id)
    ? choices
    : [...choices, UNSURE_CHOICE];
}

/**
 * guiding 스크립트는 "더 쉽게 볼래요"가 같은 역할을 하므로 제외한다.
 * 진단형 스크립트는 brief뿐 아니라 오답 뒤 detail을 다시 물을 때도
 * "잘 모르겠어요"를 유지해야 한다.
 */
function detailChoices(script: ExplainScript) {
  if (script.check.kind === "guiding") return GUIDED_DETAIL_CHOICES;
  return withUnsureChoice(script.adjust?.choices ?? CONFIRM_CHOICES);
}

function stageChoices(script: ExplainScript, stage: ExplainReply["stage"]) {
  if (stage === "brief") {
    return script.check.kind === "guiding"
      ? script.check.choices
      : withUnsureChoice(script.check.choices);
  }
  if (stage === "followup") {
    return [...relatedTermChoices(script.id, RELATED_CARD_LIMIT), ...FOLLOWUP_CHOICES];
  }
  return detailChoices(script);
}

function reaskChoices(script: ExplainScript, stage: ExplainReply["stage"]) {
  const choices = stageChoices(script, stage);
  // 이미 ask가 있는 단계(detail guiding/followup)는 그 버튼이 같은 이탈 문이다.
  return choices.some((choice) => choice.id === REASK_EXIT_CHOICE.id)
    ? choices
    : [...choices, REASK_EXIT_CHOICE];
}

/**
 * ① 피드백 머리말 + ② 한 조각 설명 + ③ 이해 확인 재질문.
 *
 * 머리말은 종결부호를 갖고 공백으로 이어 붙인다. 예전의 ` — ` 이음새는 머리말을
 * 본문과 같은 무게로 읽히게 해 첫 답이 늘 두 마디로 시작했다 (SPEC §3.4.4).
 */
export function startExplain(script: ExplainScript): ExplainStep {
  return turnStep(
    script,
    "brief",
    `${script.feedback ?? "좋은 질문이에요!"} ${script.brief}`,
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
    stageChoices(script, "followup"),
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
  if (looksLikeNewQuestion(message) || looksLikeQuizExitIntent(message)) return null;

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

  // 추천 카드를 고르면 그 용어 설명을 처음부터 시작한다. 등록된 스크립트 id 일 때만 받는다.
  if (reply.choiceId?.startsWith(RELATED_PREFIX)) {
    const allowed = relatedTermChoices(script.id, RELATED_CARD_LIMIT_ON_ASK);
    if (!allowed.some((choice) => choice.id === reply.choiceId)) return null;
    const next = CHATBOT_KNOWLEDGE.find(
      (entry) => entry.explainScript?.id === reply.choiceId,
    )?.explainScript;
    return next ? startExplain(next) : null;
  }

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
            detailChoices(script),
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
        detailChoices(script),
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
    const choices = detailChoices(script);
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
        detailChoices(script),
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
    if (reply.choiceId !== "ask") {
      return { kind: "end", text: "좋아요, 궁금한 게 생기면 다시 불러 주세요." };
    }
    // "다른 것도 물어볼래요"에서 대화를 끊지 않는다. 비슷한 용어를 더 펼쳐 고르게 한다.
    const related = relatedTermChoices(script.id, RELATED_CARD_LIMIT_ON_ASK);
    return related.length
      ? turnStep(script, "followup", "비슷한 말도 같이 볼 수 있어요.", "무엇이 궁금해요?", [
          ...related,
          { id: "done", label: "여기까지 볼래요" },
        ])
      : { kind: "end", text: "좋아요, 다음에 궁금한 걸 그대로 적어 주세요." };
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
    reaskChoices(script, stage),
    reaskCount + 1,
  );
}
