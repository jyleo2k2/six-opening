import assert from "node:assert/strict";
import { canTrade, isSchoolTime, schoolOverride, setSchoolOverride } from "./use-wallet";

// 이 테스트는 `window` 가 없는 환경에서 돈다. 강제 설정은 모듈 변수에만 남고
// `localStorage` 는 건드리지 않는다 — 저장은 브라우저에서만 일어난다.

// ── 시계 판정 ───────────────────────────────────────────────────────────
// 평일 09:00 이상 15:30 미만이 학교 시간이다. 경계는 포함/미포함이 갈린다.
const wed = (hour: number, minute = 0) => new Date(2026, 7, 12, hour, minute); // 수요일
const sun = (hour: number) => new Date(2026, 7, 16, hour); // 일요일

assert.equal(isSchoolTime(wed(9)), true, "09:00 은 학교 시간에 든다");
assert.equal(isSchoolTime(wed(15, 29)), true);
assert.equal(isSchoolTime(wed(15, 30)), false, "15:30 은 이미 하교 후다");
assert.equal(isSchoolTime(wed(8, 59)), false);
assert.equal(isSchoolTime(sun(12)), false, "주말은 종일 매매할 수 있다");

// 자녀만 잠긴다.
assert.equal(canTrade("child", wed(10)), false);
assert.equal(canTrade("parent", wed(10)), true);
assert.equal(canTrade("child", wed(20)), true);

// ── 시연용 강제 설정 ────────────────────────────────────────────────────
assert.equal(schoolOverride(), "auto", "기본값은 시계를 따른다");

// `on` 이면 시계를 무시하고 잠근다 — 밤에 발표해도 잠금 화면을 보여 줄 수 있다.
setSchoolOverride("on");
assert.equal(schoolOverride(), "on");
assert.equal(isSchoolTime(wed(20)), true);
assert.equal(isSchoolTime(sun(3)), true);
assert.equal(canTrade("child", sun(3)), false);
// 부모는 강제 설정과 무관하게 열려 있다.
assert.equal(canTrade("parent", sun(3)), true);

// `off` 는 반대다. 장중에도 매매 화면을 보여 줄 수 있다.
setSchoolOverride("off");
assert.equal(isSchoolTime(wed(10)), false);
assert.equal(canTrade("child", wed(10)), true);

// `auto` 로 되돌리면 다시 시계만 본다.
setSchoolOverride("auto");
assert.equal(isSchoolTime(wed(10)), true);
assert.equal(isSchoolTime(wed(20)), false);

console.log("school lock override tests passed");
