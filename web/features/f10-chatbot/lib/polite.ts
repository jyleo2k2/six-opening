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
    // 물음표 앞에서는 바꾸지 않는다. "도와줘?" -> "도와주세요?" 는 질문을 지시로 바꿔
    // SPEC §3.3 이 금지한 "~하세요" 체가 된다.
    .replace(/줘(?=[.!]|$)/g, "주세요")
    .replace(/봐(?=[.!?]|$)/g, "봐요")
    .replace(/써(?=[.!?]|$)/g, "써요")
    .replace(/라(?=[.!?]|$)/g, "라요")
    .replace(/어(?=[.!?]|$)/g, "어요")
    .replace(/아(?=[.!?]|$)/g, "아요")
    .replace(/까\?/g, "까요?")
    .replace(/래\?/g, "래요?");
}

/**
 * 2인칭 대명사를 지운다. 어미만 해요체로 맞춰도 "네가 남긴 거래 이유는 볼 수 있어요"처럼
 * 반말 대명사가 남으면 말투가 섞인다. 한국어는 주어를 생략해도 문장이 성립하므로 지우는
 * 쪽이 가장 자연스럽다 — 생략이 어색한 자리는 고정 문구에서 부사·명사구로 바꿨다.
 *
 * 관형어 "네 "(네 거래·네 성향)는 수사 "네"(네 가지·네 곳)와 형태가 같아 여기서 가릴 수
 * 없다. 고정 문구는 소스에서 직접 고쳤고 이 함수는 모델이 만든 문장을 위한 안전망이다.
 * 앞에 한글이 붙으면 건드리지 않는다 — 그러지 않으면 "디자이너가"의 "너가"까지 지워진다.
 */
export function withoutSecondPerson(text: string): string {
  return text
    .replace(/(?<![가-힣])네가\s*/g, "")
    .replace(/(?<![가-힣])너[가는를의]\s*/g, "");
}

/**
 * 문장마다 해요체 종결을 사용했는지 확인한다. 이모지는 말끝으로 보지 않는다.
 * "~죠"는 "~지요"의 준말이라 해요체로 인정한다. 빼면 "정해지죠." 같은 정상 문장이
 * 반말로 오판돼 답변 전체가 폐기된다.
 */
export function isHaeyoKorean(text: string): boolean {
  const sentences = text
    .replace(/[🐻]/g, "")
    .split(/(?:[!?]+|\.(?=\s|$))/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.length > 0 && sentences.every((sentence) => /(요|죠)$/.test(sentence));
}
