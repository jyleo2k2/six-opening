import assert from "node:assert/strict";
import { isRegularMarketOpen } from "../../f2-trade/lib/scheduled-orders.js";
import { canTrade, isSchoolTime } from "./use-wallet";

const wed = (hour: number, minute = 0) => new Date(2026, 7, 12, hour, minute); // 수요일
const sun = (hour: number) => new Date(2026, 7, 16, hour); // 일요일

// ── 스쿨락은 꺼져 있다 ──────────────────────────────────────────────────
// 예전 규칙은 평일 09:00~15:30 자녀 주문 차단이었다. 그 시간대에도 이제 안 잠긴다.
assert.equal(isSchoolTime(wed(9)), false);
assert.equal(isSchoolTime(wed(12)), false);
assert.equal(isSchoolTime(wed(15, 29)), false);
assert.equal(isSchoolTime(sun(12)), false);

assert.equal(canTrade("child", wed(10)), true, "자녀도 장중에 주문할 수 있다");
assert.equal(canTrade("child", wed(20)), true);
assert.equal(canTrade("parent", wed(10)), true);

// ── 껐어야 하는 이유 ────────────────────────────────────────────────────
// 스쿨락 창과 정규장 창이 **정확히 같았다.** 그래서 스쿨락을 켜면 자녀 계정으로
// 즉시 체결을 볼 수 있는 시간대가 존재하지 않는다 — 장중이면 주문이 막히고,
// 장외면 주문은 되지만 다음 거래일 시가 예약이 된다.
//
// 이 대조가 깨지면(예: 스쿨락 창만 15:00 으로 바뀌면) 다시 켤 수 있는지 검토할 값어치가
// 생긴다. 그래서 두 창이 같다는 사실 자체를 여기 남긴다.
const SCHOOL_WINDOW = [
  [wed(9), true],
  [wed(12), true],
  [wed(15, 29), true],
  [wed(8, 59), false],
  [wed(15, 30), false],
  [sun(12), false],
] as const;

for (const [at, inSchoolWindow] of SCHOOL_WINDOW) {
  assert.equal(
    isRegularMarketOpen(at),
    inSchoolWindow,
    `정규장 창이 옛 스쿨락 창과 어긋났다: ${at.toISOString()}`,
  );
}

console.log("school lock disabled tests passed");
