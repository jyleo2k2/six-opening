import assert from "node:assert/strict";
import {
  MINIMUM_RESPONSE_PREPARATION_MS,
  getPreparationStepIndex,
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

console.log("response preparation tests passed");
