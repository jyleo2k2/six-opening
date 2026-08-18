/**
 * 아이가 버튼을 누르지 않고 직접 타이핑했을 때 긍정·부정을 판정한다.
 *
 * 버튼이 주 경로이고 이 판정은 보조 경로다. 따라서 애매하면 추측하지 않고
 * `null`을 돌려 호출부가 선택지를 다시 보여주게 한다. LLM을 쓰지 않는다.
 */

/** 이모지는 문자 제거 단계에서 사라지므로 미리 낱말로 바꾼다. */
const EMOJI_REPLACEMENTS: readonly (readonly [string, string])[] = [
  ["👍", "응"],
  ["🙆", "응"],
  ["⭕", "응"],
  ["✅", "응"],
  ["🆗", "응"],
  ["👎", "아니"],
  ["🙅", "아니"],
  ["❌", "아니"],
];

/**
 * 판정 전에 입력을 납작하게 만든다.
 * 1) 이모지를 낱말로   2) 유니코드 정규화·소문자   3) 3회 이상 반복을 2회로
 * 4) 문자·숫자만 남기고 제거(공백·문장부호)
 *
 * NFKC는 전각 `ＯＫ`를 `ok`로 펴 주지만, 호환 자모 `ㅇ`(U+3147)을 조합용 자모
 * `ᄋ`(U+1100)으로도 바꾼다. 그래서 아래 사전도 반드시 같은 함수를 통과시킨다.
 */
export function normalizeReply(input: string) {
  let text = input;
  for (const [emoji, word] of EMOJI_REPLACEMENTS) {
    text = text.replaceAll(emoji, word);
  }
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(.)\1{2,}/gu, "$1$1")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function lexicon(words: readonly string[]) {
  return new Set(words.map(normalizeReply));
}

const AFFIRMATIVE = lexicon([
  // 초성체
  "ㅇㅇ", "ㅇ", "ㅇㅋ", "ㅇㅈ", "ㄱㄱ", "ㅇㅇㅋ",
  // 구어 감탄
  "응", "웅", "엉", "음", "어", "응응", "웅웅", "어어", "으응",
  // 존댓말·변형
  "네", "넹", "넵", "넴", "예", "옙", "녜",
  // 서술형
  "그래", "그렇지", "그러네", "맞아", "맞어", "맞다", "맞네",
  "알겠어", "알겠다", "알겠", "알았어", "알아", "알아들었어",
  "이해했어", "이해했다", "이해돼", "이해됐어", "이해",
  "좋아", "좋아요",
  // 외래어
  "오케이", "오키", "오케", "ok", "okay", "yes", "yep", "y",
]);

const NEGATIVE = lexicon([
  // 초성체
  "ㄴㄴ", "ㄴ",
  // 구어
  "아니", "아냐", "아니야", "아니요", "아뇨", "아닌데", "아니당",
  "노", "노노", "no", "nope", "n",
  "다시", "다시설명", "다시말해줘", "다시알려줘",
]);

/**
 * "모르겠다" 계열 — 정답도 오답도 아닌 세 번째 반응이다. 순수 부정("아니")과
 * 섞으면 안 된다: "아니야"는 brief 단계에서 여전히 모호해서 되물어야 하지만,
 * "몰라요"는 어느 단계에서든 바로 인정하고 도움을 줘야 한다.
 */
const UNSURE = lexicon([
  "ㅁㄹ",
  "몰라", "몰라요", "모르겠어", "모르겠다", "모르겠는데", "모름", "모르겠어요",
  "잘모르겠어", "하나도모르겠어", "아직모르겠어", "여전히모르겠어",
  "어려워", "어렵다", "어려운데", "어려워요",
  "헷갈려", "헷갈린다", "헷갈리는데",
  "이해안돼", "이해안됨", "이해못했어", "못알아들었어",
]);

/**
 * 선택지 라벨 대조용. 라벨은 해요체지만 아이는 반말로 고쳐 칠 수 있으므로
 * ("들어가지 않아요" 버튼을 보고 "들어가지 않아"라고 침) 끝의 "요"를 떼고 견준다.
 */
export function normalizeChoiceLabel(input: string) {
  return normalizeReply(input).replace(/요$/u, "");
}

/** 새 질문으로 보이면 응답이 아니라 새 대화로 넘긴다. */
export function looksLikeNewQuestion(input: string) {
  return /[?？]|뭐|무엇|왜|어떻게|어디|누가|언제|알려\s*줘|설명/.test(input);
}

/**
 * 진행 중인 설명을 그만두고 다른 질문으로 넘어가려는 표현이다.
 *
 * 새 질문 판정과 섞지 않고, 정규화한 전체 입력이 사전 항목과 같을 때만
 * 인식한다. 따라서 "다른 거 궁금해" 같은 문장은 추측으로 이탈시키지 않는다.
 */
const QUIZ_EXIT_INTENTS = lexicon([
  "그만",
  "그만할래",
  "그만할래요",
  "됐어",
  "됐어요",
  "안 할래",
  "안 할래요",
  "안할래",
  "안할래요",
  "다른 거",
  "다른거",
  "딴 거",
  "딴거",
  "배당 궁금해",
  "배당이 궁금해",
]);

export function looksLikeQuizExitIntent(input: string) {
  const normalized = normalizeReply(input);
  return Boolean(normalized) && QUIZ_EXIT_INTENTS.has(normalized);
}

export type ColloquialIntent = "yes" | "no" | "unsure";

/**
 * 긍정·부정·모르겠음을 판정한다. 확실하지 않으면 `null`.
 * 부분 일치는 쓰지 않는다 — "아니면 뭐야?"가 부정으로 잡히면 안 된다.
 */
export function matchColloquialIntent(input: string): ColloquialIntent | null {
  const normalized = normalizeReply(input);
  if (!normalized) return null;
  if (AFFIRMATIVE.has(normalized)) return "yes";
  if (UNSURE.has(normalized)) return "unsure";
  if (NEGATIVE.has(normalized)) return "no";
  return null;
}
