/** 모든 챗봇 출력은 화면에 노출되기 전 해요체로 맞춘다. */
export function toPoliteKorean(text: string): string {
  return text
    .replace(/아니야(?=[.!?]|$)/g, "아니에요")
    .replace(/이야(?=[.!?]|$)/g, "이에요")
    .replace(/거야(?=[.!?]|$)/g, "거예요")
    .replace(/야(?=[.!?]|$)/g, "예요")
    .replace(/않아(?=[.!?]|$)/g, "않아요")
    .replace(/없어(?=[.!?]|$)/g, "없어요")
    .replace(/있어(?=[.!?]|$)/g, "있어요")
    .replace(/구나(?=[.!?]|$)/g, "군요")
    .replace(/해(?=[.!?]|$)/g, "해요")
    .replace(/돼(?=[.!?]|$)/g, "돼요")
    .replace(/줘(?=[.!?]|$)/g, "주세요")
    .replace(/봐(?=[.!?]|$)/g, "봐요")
    .replace(/써(?=[.!?]|$)/g, "써요")
    .replace(/라(?=[.!?]|$)/g, "라요")
    .replace(/어(?=[.!?]|$)/g, "어요")
    .replace(/아(?=[.!?]|$)/g, "아요")
    .replace(/까\?/g, "까요?")
    .replace(/래\?/g, "래요?");
}

/** 문장마다 해요체 종결을 사용했는지 확인한다. 이모지는 말끝으로 보지 않는다. */
export function isHaeyoKorean(text: string): boolean {
  const sentences = text
    .replace(/[🐻]/g, "")
    .split(/(?:[!?]+|\.(?=\s|$))/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.length > 0 && sentences.every((sentence) => /요$/.test(sentence));
}
