import assert from "node:assert/strict";
import test from "node:test";
import {
  restrictionSummary,
  stepMinute,
  timeLabel,
  toggleWeekday,
  type TradeRestriction,
} from "./trade-restriction";

const rule: TradeRestriction = {
  enabled: true,
  weekdays: [1, 2, 3, 4, 5],
  start_minute: 9 * 60,
  end_minute: 15 * 60,
  block_buy: true,
  block_sell: true,
};

test("timeLabel 은 오전·오후로 읽고 정오·자정을 12시로 적는다", () => {
  assert.equal(timeLabel(9 * 60), "오전 9:00");
  assert.equal(timeLabel(15 * 60 + 30), "오후 3:30");
  assert.equal(timeLabel(12 * 60), "오후 12:00");
  assert.equal(timeLabel(0), "오전 12:00");
});

test("stepMinute 은 시작이 종료를 넘어서지 못하게 잡는다", () => {
  const tight = { ...rule, start_minute: 14 * 60 + 30 };
  assert.equal(stepMinute(tight, "start", 1), tight, "시작은 종료와 같아질 수 없다");
  assert.equal(stepMinute({ ...rule, end_minute: 9 * 60 + 30 }, "end", -1).end_minute, 9 * 60 + 30);
  assert.equal(stepMinute(rule, "start", -1).start_minute, 8 * 60 + 30);
  assert.equal(stepMinute({ ...rule, end_minute: 24 * 60 }, "end", 1).end_minute, 24 * 60);
});

test("toggleWeekday 는 켜고 끄며 정렬을 지킨다", () => {
  assert.deepEqual(toggleWeekday(rule, 3).weekdays, [1, 2, 4, 5]);
  assert.deepEqual(toggleWeekday(rule, 7).weekdays, [1, 2, 3, 4, 5, 7]);
});

test("restrictionSummary 는 막는 것이 없으면 꺼짐이라고 말한다", () => {
  assert.equal(restrictionSummary(rule), "월·화·수·목·금 오전 9:00~오후 3:00");
  assert.equal(restrictionSummary({ ...rule, enabled: false }), "꺼짐");
  assert.equal(restrictionSummary({ ...rule, weekdays: [] }), "꺼짐");
  assert.equal(restrictionSummary({ ...rule, block_buy: false, block_sell: false }), "꺼짐");
});
