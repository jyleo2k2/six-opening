const PROHIBITED_OUTPUT_PATTERNS = [
  /(?:이|그)종목(?:을|은)?\s*(?:사|매수)/,
  /(?:지금|오늘|당장)\s*(?:사|매수|팔|매도)/,
  /(?:사는|매수하는)(?:게|것이)?(?:좋|괜찮|추천)/,
  /(?:파는|매도하는)(?:게|것이)?(?:좋|괜찮|추천)/,
  /(?:사도|팔아도)(?:돼|괜찮)/,
  /(?:보유|존버)(?:해|하자|추천)/,
  /매수\s*(?:기회|추천|적기)/,
  /매도\s*(?:기회|추천|적기)/,
  /(?:주가|가격|수익률).{0,12}(?:오를|상승|내릴|하락)/,
  /앞으로.{0,12}(?:오를|상승|내릴|하락)/,
  /(?:오를|상승할|내릴|하락할)(?:것|가능성)/,
  /(?:목표가|손절가)/,
  /(?:\d+[,.]?\d*원).{0,12}(?:사|팔|매수|매도)/,
  /숨기지마/,
  /솔직하게말해/,
  /어른에게(?:먼저)?말해/,
];

export const SAFE_REFUSAL =
  "특정 종목을 고르거나 사고팔 시점을 정해 줄 수는 없어요. 대신 회사 정보와 확인할 기준은 함께 볼 수 있어요. 🐻";

export type ChatOutputSource = "fixed" | "tool" | "model";

export type ChatOutputGateResult =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long" | "too_many_sentences" | "prohibited" | "unverified_number" };

export function filterGeneratedText(text: string) {
  const normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return !PROHIBITED_OUTPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function countSentences(text: string) {
  const parts = text
    .split(/[.!?]+|\n+/)
    .map((part) => part.trim())
    .filter((part) => /[\p{L}\p{N}]/u.test(part));
  return parts.length;
}

function normalizeNumber(value: string | number) {
  return String(value).replace(/[,%\s]/g, "");
}

/**
 * 화면 수치 주장으로 볼 값만 고른다. 단위가 붙은 값(`78,000원`·`12%`·`10주`)은
 * 사용자 자산·시세 주장이므로 허용 목록과 대조하고, 단위 없는 숫자와 `1주당`
 * 같은 관용구는 개념 설명이므로 통과시킨다. 모든 숫자를 막으면 "PER은 주가를
 * 1주당 순이익으로 나눈 값이에요" 같은 정상 설명까지 폐기된다.
 */
const CLAIM_NUMBER = /(\d[\d,.]*)\s*(?:원|%|주(?!당))/g;

export function gateChatOutput(options: {
  text: string;
  source: ChatOutputSource;
  allowedNumbers?: readonly (string | number)[];
}): ChatOutputGateResult {
  const text = options.text.trim();
  if (!text || countSentences(text) === 0) {
    return { ok: false, reason: "empty" };
  }
  if (text.length > 800) return { ok: false, reason: "too_long" };
  if (countSentences(text) > 3) {
    return { ok: false, reason: "too_many_sentences" };
  }
  if (!filterGeneratedText(text)) return { ok: false, reason: "prohibited" };

  if (options.source === "model") {
    const allowed = new Set((options.allowedNumbers ?? []).map(normalizeNumber));
    for (const match of text.matchAll(CLAIM_NUMBER)) {
      if (!allowed.has(normalizeNumber(match[1]))) {
        return { ok: false, reason: "unverified_number" };
      }
    }
  }

  return { ok: true, text };
}
