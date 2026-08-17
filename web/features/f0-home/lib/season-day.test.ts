import assert from "node:assert/strict";
import {
  SEASON_3_START,
  SEASON_DAYS,
  SEASON_WEEKS,
  seasonDay,
  seasonDayText,
} from "./season-day";

const at = (kst: string) => Date.parse(`${kst}+09:00`);

// 기준 — 2026-08-17 은 시즌 3의 3주차 월요일이다. 이 한 점에서 앞뒤가 다 나온다.
assert.deepEqual(seasonDay(at("2026-08-17T09:30:00")), { season: 3, day: 15, week: 3 });
assert.equal(seasonDayText(at("2026-08-17T09:30:00")), "시즌 3 · 15일째");

// 시즌은 4주 28일이다.
assert.equal(SEASON_WEEKS, 4);
assert.equal(SEASON_DAYS, 28);
assert.equal(SEASON_3_START, "2026-08-03");

// 시즌 3 의 양 끝. 첫날이 1일째, 마지막 날이 28일째다 — 0일째나 29일째가 없어야 한다.
assert.deepEqual(seasonDay(at("2026-08-03T00:00:00")), { season: 3, day: 1, week: 1 });
assert.deepEqual(seasonDay(at("2026-08-30T23:59:59")), { season: 3, day: 28, week: 4 });

// 28일이 지나면 다음 시즌 1일째로 넘어간다.
assert.deepEqual(seasonDay(at("2026-08-31T00:00:00")), { season: 4, day: 1, week: 1 });
assert.equal(seasonDayText(at("2026-09-28T00:00:00")), "시즌 5 · 1일째");

// 지난 시즌도 같은 눈금으로 되짚는다.
assert.deepEqual(seasonDay(at("2026-07-06T00:00:00")), { season: 2, day: 1, week: 1 });
assert.deepEqual(seasonDay(at("2026-06-08T00:00:00")), { season: 1, day: 1, week: 1 });

// 시즌 1 이전은 시즌 1 첫날로 묶는다. 시즌 0 이나 음수 일수를 화면에 세우지 않는다.
assert.deepEqual(seasonDay(at("2026-06-07T23:59:59")), { season: 1, day: 1, week: 1 });
assert.deepEqual(seasonDay(at("2020-01-01T00:00:00")), { season: 1, day: 1, week: 1 });

// 주차는 7일마다 넘어간다.
assert.equal(seasonDay(at("2026-08-09T12:00:00")).week, 1); // 7일째
assert.equal(seasonDay(at("2026-08-10T00:00:00")).week, 2); // 8일째
assert.equal(seasonDay(at("2026-08-24T00:00:00")).week, 4); // 22일째

// 날은 KST 자정에 넘어간다. 하루 안에서는 시각이 달라도 같은 값이다.
assert.equal(seasonDay(at("2026-08-16T23:59:59")).day, 14);
assert.equal(seasonDay(at("2026-08-17T00:00:00")).day, 15);
assert.equal(seasonDay(at("2026-08-17T23:59:59")).day, 15);

// 브라우저 시간대와 무관하게 한국 날짜로 끊긴다 — 같은 순간은 어떻게 적어도 같은 날짜다.
assert.equal(seasonDay(Date.parse("2026-08-16T15:00:00Z")).day, 15);
assert.equal(seasonDay(Date.parse("2026-08-16T14:59:59Z")).day, 14);

// 인자를 비우면 지금 시각이다. 값이 나오는지만 본다 — 오늘이 언제인지는 여기서 못 박지 않는다.
const today = seasonDay();
assert.ok(today.season >= 1);
assert.ok(today.day >= 1 && today.day <= SEASON_DAYS);
assert.ok(today.week >= 1 && today.week <= SEASON_WEEKS);
