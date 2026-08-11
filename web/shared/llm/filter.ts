const PROHIBITED_OUTPUT_PATTERNS = [
  /(?:이|그) 종목(?:을|은)?\s*(?:사|매수)/,
  /(?:지금|오늘|당장)\s*(?:사|매수|팔|매도)/,
  /매수\s*(?:기회|추천|적기)/,
  /매도\s*(?:기회|추천|적기)/,
  /(?:주가|가격|수익률).{0,12}(?:오를|상승|내릴|하락)/,
  /(?:목표가|손절가)/,
  /(?:\d+[,.]?\d*원).{0,12}(?:사|팔|매수|매도)/,
];

export const SAFE_REFUSAL =
  "특정 종목을 고르거나 사고팔 시점을 정해 줄 수는 없어. 대신 회사 정보와 확인할 기준은 함께 볼 수 있어. 🐻";

export function filterGeneratedText(text: string) {
  const normalized = text.replaceAll(" ", "");
  return !PROHIBITED_OUTPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function takeCompleteSentences(buffer: string) {
  const match = buffer.match(/^(.*?[.!?](?:\s+|$))+/s);
  if (!match) return { complete: [], remainder: buffer };

  const completedText = match[0];
  return {
    complete: completedText
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean),
    remainder: buffer.slice(completedText.length),
  };
}
