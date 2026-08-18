import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_RESTRICTION, blockedSides, isRestrictedNow, kstMoment, parseRestriction } from "./rule";

/** 2026-08-18 은 KST 화요일이다. UTC 로 적어 서버 시간대와 무관하게 판정되는지 함께 본다. */
const kst = (iso: string) => new Date(iso);

test("kstMoment 는 UTC 시각을 KST 요일·분으로 옮긴다", () => {
  // KST 화 10:30 = UTC 화 01:30
  assert.deepEqual(kstMoment(kst("2026-08-18T01:30:00Z")), { weekday: 2, minute: 630 });
  // KST 로 넘어가며 요일이 바뀌는 자리 — UTC 월 15:00 은 KST 화 00:00 이다.
  assert.deepEqual(kstMoment(kst("2026-08-17T15:00:00Z")), { weekday: 2, minute: 0 });
  // KST 일요일은 7 이다(getUTCDay 의 0 이 아니다).
  assert.deepEqual(kstMoment(kst("2026-08-16T03:00:00Z")), { weekday: 7, minute: 720 });
});

test("꺼 두면 어느 시각에도 막지 않는다", () => {
  assert.equal(isRestrictedNow(DEFAULT_RESTRICTION, kst("2026-08-18T01:30:00Z")), false);
  assert.deepEqual(blockedSides(DEFAULT_RESTRICTION, kst("2026-08-18T01:30:00Z")), {
    buy: false,
    sell: false,
  });
});

const on = { ...DEFAULT_RESTRICTION, enabled: true };

test("켜면 정한 요일의 시작~종료 사이만 막는다", () => {
  assert.equal(isRestrictedNow(on, kst("2026-08-18T01:30:00Z")), true, "KST 화 10:30 은 창 안");
  assert.equal(isRestrictedNow(on, kst("2026-08-18T00:00:00Z")), true, "KST 화 09:00 은 시작 포함");
  assert.equal(isRestrictedNow(on, kst("2026-08-18T06:00:00Z")), false, "KST 화 15:00 은 종료 제외");
  assert.equal(isRestrictedNow(on, kst("2026-08-17T23:59:00Z")), false, "KST 화 08:59 는 창 앞");
  assert.equal(isRestrictedNow(on, kst("2026-08-16T03:00:00Z")), false, "일요일은 제한 요일이 아니다");
});

test("막는 기능은 따로 고를 수 있다", () => {
  const buyOnly = { ...on, block_sell: false };
  assert.deepEqual(blockedSides(buyOnly, kst("2026-08-18T01:30:00Z")), { buy: true, sell: false });
});

test("parseRestriction 은 창이 뒤집힌 값과 범위 밖 요일을 거절한다", () => {
  assert.equal(parseRestriction({ start_minute: 900, end_minute: 540, weekdays: [1] }), null);
  assert.equal(parseRestriction({ start_minute: 540, end_minute: 900, weekdays: [0] }), null);
  assert.equal(parseRestriction({ start_minute: 540, end_minute: 1500, weekdays: [1] }), null);
  assert.equal(parseRestriction(null), null);
});

test("parseRestriction 은 요일을 중복 없이 정렬해 담는다", () => {
  const parsed = parseRestriction({
    enabled: true,
    weekdays: [5, 1, 1, 3],
    start_minute: 540,
    end_minute: 900,
    block_buy: true,
    block_sell: false,
  });
  assert.deepEqual(parsed, {
    enabled: true,
    weekdays: [1, 3, 5],
    start_minute: 540,
    end_minute: 900,
    block_buy: true,
    block_sell: false,
  });
});
