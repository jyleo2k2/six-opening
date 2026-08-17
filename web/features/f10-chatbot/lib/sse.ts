/** HTTP 본문이 끝난 것과 서버가 답변 완료를 선언한 것은 다르다. 둘을 함께 확인한다. */
export function isCompleteChatStream(
  receivedDone: boolean,
  pending: string,
  text: string,
): boolean {
  return receivedDone && pending.trim() === "" && text.trim() !== "";
}
