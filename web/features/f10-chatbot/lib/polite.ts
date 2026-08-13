/** 고정 문구가 반말로 남아도 화면에 노출되기 전 해요체로 맞춘다. */
export function toPoliteKorean(text: string): string {
  return text
    .replace(/아니야(?=[.!?]|$)/g, "아니에요")
    .replace(/이야(?=[.!?]|$)/g, "이에요")
    .replace(/거야(?=[.!?]|$)/g, "거예요")
    .replace(/야(?=[?!]|$)/g, "예요")
    .replace(/않아(?=[.!?]|$)/g, "않아요")
    .replace(/없어(?=[.!?]|$)/g, "없어요")
    .replace(/있어(?=[.!?]|$)/g, "있어요")
    .replace(/돼(?=[.!?]|$)/g, "돼요")
    .replace(/해(?=[.!?]|$)/g, "해요")
    .replace(/줘(?=[.!?]|$)/g, "주세요")
    .replace(/볼까\?/g, "볼까요?")
    .replace(/할까\?/g, "할까요?")
    .replace(/알려줘/g, "알려 주세요");
}
