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

/**
 * 고정·Tool 응답은 서버가 status 이벤트 4개를 같은 밀리초에 다 흘려보낸다 —
 * 그대로 표시하면 3단계 카드가 마지막 단계에 멈춘 것처럼 보인다. 새 단계로
 * 넘어갈 때만 최소 체류 시간을 강제해, 실제로 빠르게 끝난 요청도 단계가
 * 눈에 보이게 지나가도록 한다. 이미 같은 단계거나 그 이전 문구가 늦게 와도
 * (표시할 단계가 후퇴하지 않는다) 지연 없이 바로 보여준다.
 */
export const MINIMUM_STEP_DWELL_MS = 500;

export function nextStatusDisplayDelayMs(
  currentStepIndex: number,
  candidateStepIndex: number,
  msSinceCurrentStepShown: number,
): number {
  if (candidateStepIndex <= currentStepIndex) return 0;
  return Math.max(0, MINIMUM_STEP_DWELL_MS - msSinceCurrentStepShown);
}
