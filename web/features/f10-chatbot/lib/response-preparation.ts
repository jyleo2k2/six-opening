export const MINIMUM_RESPONSE_PREPARATION_MS = 2_000;

export const RESPONSE_PREPARATION_STEPS = [
  "질문을 안전하게 확인하고 있어요",
  "승인된 정보를 확인하고 있어요",
  "답변을 안전하게 점검하고 있어요",
] as const;

export function getPreparationStepIndex(status: string): number {
  if (
    status.includes("안전하게 점검") ||
    status.includes("안전 점검 통과") ||
    status.includes("안전한 답변")
  ) {
    return 2;
  }

  if (
    status.includes("승인된") ||
    status.includes("내 자료") ||
    status.includes("더 쉬운 설명") ||
    status.includes("단계별 설명") ||
    status.includes("답변을 준비")
  ) {
    return 1;
  }

  return 0;
}

export function remainingPreparationMs(startedAt: number, now: number): number {
  return Math.max(0, MINIMUM_RESPONSE_PREPARATION_MS - (now - startedAt));
}
