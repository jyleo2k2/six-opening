import assert from "node:assert/strict";
import {
  MINIMUM_RESPONSE_PREPARATION_MS,
  MINIMUM_STEP_DWELL_MS,
  getPreparationStepIndex,
  nextStatusDisplayDelayMs,
  remainingPreparationMs,
} from "./response-preparation";

assert.equal(getPreparationStepIndex("질문을 안전하게 확인하는 중"), 0);
assert.equal(getPreparationStepIndex("승인된 종목 정보를 확인하는 중"), 1);
assert.equal(getPreparationStepIndex("답변을 준비하는 중"), 1);
assert.equal(getPreparationStepIndex("안전 점검 통과"), 2);
assert.equal(getPreparationStepIndex("알 수 없는 서버 상태"), 0);

assert.equal(remainingPreparationMs(1_000, 1_000), MINIMUM_RESPONSE_PREPARATION_MS);
assert.equal(remainingPreparationMs(1_000, 2_500), 500);
assert.equal(remainingPreparationMs(1_000, 3_000), 0);

// 다음 단계로 넘어갈 때만 최소 체류 시간을 요구한다 — 고정 응답처럼 상태 4개가
// 같은 밀리초에 와도 단계가 눈에 보이게 지나가야 한다.
assert.equal(nextStatusDisplayDelayMs(0, 1, 0), MINIMUM_STEP_DWELL_MS);
assert.equal(nextStatusDisplayDelayMs(0, 1, 200), MINIMUM_STEP_DWELL_MS - 200);
assert.equal(nextStatusDisplayDelayMs(0, 1, MINIMUM_STEP_DWELL_MS), 0);
assert.equal(nextStatusDisplayDelayMs(0, 1, MINIMUM_STEP_DWELL_MS + 500), 0);
// 같은 단계거나 이미 지난 단계로 "후퇴"하는 문구는 지연 없이 바로 보여준다.
assert.equal(nextStatusDisplayDelayMs(1, 1, 0), 0);
assert.equal(nextStatusDisplayDelayMs(2, 0, 0), 0);

console.log("response preparation tests passed");
