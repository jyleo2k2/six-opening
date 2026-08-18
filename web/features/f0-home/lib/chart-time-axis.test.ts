import assert from "node:assert/strict";
import { buildChartTimeAxis } from "./chart-time-axis";
import { PLOT_W } from "./chart-view";

/** 한국 시간으로 만드는 epoch 초. 봉의 시각은 전부 KST 로 읽힌다(UTC+9, 서머타임 없음). */
const kst = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  Date.UTC(year, month - 1, day, hour - 9, minute) / 1000;

const partsOf = (time: number) => {
  const at = new Date((time + 9 * 3600) * 1000);
  return {
    year: at.getUTCFullYear(),
    month: at.getUTCMonth() + 1,
    day: at.getUTCDate(),
    hour: at.getUTCHours(),
    minute: at.getUTCMinutes(),
    weekday: at.getUTCDay(),
  };
};

/** 장중 1분봉. 09:00~15:30 만 있고 밤과 주말에는 봉이 없다 — 실제 분봉과 같은 구멍이다. */
function minuteTimes(count: number, from = kst(2026, 8, 17, 9, 0)) {
  const times: number[] = [];
  let at = from;
  while (times.length < count) {
    times.push(at);
    at += 60;
    const next = partsOf(at);
    if (next.hour > 15 || (next.hour === 15 && next.minute > 30)) {
      // 장이 닫히면 다음 거래일 09:00 으로 건너뛴다.
      at = kst(next.year, next.month, next.day, 9, 0) + 24 * 3600;
      while (partsOf(at).weekday % 6 === 0) at += 24 * 3600;
    }
  }
  return times;
}

/** 거래일(월~금) 일봉. 공휴일은 따지지 않는다 — 구멍이 있다는 사실만 있으면 된다. */
function dailyTimes(count: number, from = kst(2026, 1, 2)) {
  const times: number[] = [];
  let at = from;
  while (times.length < count) {
    if (partsOf(at).weekday % 6 !== 0) times.push(at);
    at += 24 * 3600;
  }
  return times;
}

/** 매주 월요일 주봉. */
function weeklyTimes(count: number, from = kst(2024, 1, 1)) {
  return Array.from({ length: count }, (_, i) => from + i * 7 * 24 * 3600);
}

/** 화면과 같은 배치식으로 축을 뽑는다. 창은 `times` 의 뒤에서 `bars` 개다. */
function axisOf(period: "minute" | "daily" | "weekly", times: number[], bars: number) {
  const start = Math.max(0, times.length - bars);
  const visible = times.slice(start);
  const x = (index: number) => (index * PLOT_W) / (visible.length - 1);
  const ticks = buildChartTimeAxis({
    times: visible,
    previousTime: times[start - 1] ?? null,
    period,
    x,
    plotWidth: PLOT_W,
  });
  /** 라벨이 가리키는 봉의 시각. x 를 인덱스로 되돌린다. */
  const timeAt = (tick: { x: number }) => visible[Math.round((tick.x * (visible.length - 1)) / PLOT_W)];
  return { ticks, visible, timeAt };
}

/** 라벨끼리 닿지 않는지. 어느 배율에서도 이것만은 지켜야 한다. */
function assertReadable(ticks: { x: number }[], label: string) {
  for (let i = 1; i < ticks.length; i++) {
    assert.ok(ticks[i].x - ticks[i - 1].x >= 38, `${label}: 라벨이 붙었다 (${ticks[i].x})`);
  }
}

// ── 기본 배율에서는 기간이 정한 기준 단위 그대로다 ──────────────────────────────

// 분봉 기본(캔들 34봉·선 99봉) — 15분 경계에만 눈금이 선다.
for (const bars of [34, 99]) {
  const { ticks, timeAt } = axisOf("minute", minuteTimes(bars + 30), bars);
  assert.ok(ticks.length >= 2, `분봉 ${bars}봉: 눈금이 ${ticks.length}개뿐이다`);
  assertReadable(ticks, `분봉 ${bars}봉`);
  for (const tick of ticks) {
    const { minute } = partsOf(timeAt(tick));
    assert.equal(minute % 15, 0, `분봉 눈금이 15분 경계가 아니다: ${tick.text}`);
  }
  assert.ok(
    ticks.every((tick) => /^(?:\d{2}:\d{2}|\d{1,2}\/\d{1,2})$/u.test(tick.text)),
    `분봉 라벨 형식: ${ticks.map((tick) => tick.text).join(",")}`,
  );
}

// 일봉 기본(선 72봉) — 달이 바뀌는 자리에만 눈금이 선다.
{
  const { ticks, visible, timeAt } = axisOf("daily", dailyTimes(200), 72);
  assert.ok(ticks.length >= 2);
  assertReadable(ticks, "일봉 72봉");
  assert.ok(
    ticks.every((tick) => /^(?:\d{1,2}월|\d{2}년)$/u.test(tick.text)),
    `일봉 라벨 형식: ${ticks.map((tick) => tick.text).join(",")}`,
  );
  // 눈금이 붙은 봉은 앞 봉과 달이 다르다 — 달 경계를 넘긴 첫 봉이라는 뜻이다.
  for (const tick of ticks) {
    const index = visible.indexOf(timeAt(tick));
    assert.notEqual(partsOf(visible[index]).month, partsOf(visible[index - 1]).month);
  }
}

// 주봉 기본(선 43봉) — 분기(1·4·7·10월) 경계에만 눈금이 선다.
{
  const { ticks, timeAt } = axisOf("weekly", weeklyTimes(160), 43);
  assert.ok(ticks.length >= 2);
  assertReadable(ticks, "주봉 43봉");
  for (const tick of ticks) {
    assert.equal((partsOf(timeAt(tick)).month - 1) % 3, 0, `주봉 눈금이 분기 경계가 아니다: ${tick.text}`);
  }
}

// ── 축소하면 배수로 성기게, 확대하면 약수로 촘촘하게 ────────────────────────────

// 선차트 최대(400봉)까지 축소하면 15분으로는 라벨이 겹친다 — 30분 이상으로 올라간다.
{
  const { ticks, timeAt } = axisOf("minute", minuteTimes(500), 400);
  assert.ok(ticks.length >= 2);
  assertReadable(ticks, "분봉 400봉");
  const minutes = ticks.map((tick) => partsOf(timeAt(tick)).minute);
  assert.ok(minutes.every((minute) => minute % 30 === 0), `축소했는데 15분 눈금이 남았다: ${minutes}`);
}

// 1년치 일봉·3년치 주봉을 한 화면에 담아도 라벨은 겹치지 않는다.
{
  const daily = axisOf("daily", dailyTimes(250), 250);
  assert.ok(daily.ticks.length >= 2);
  assertReadable(daily.ticks, "일봉 250봉");

  const weekly = axisOf("weekly", weeklyTimes(156), 156);
  assert.ok(weekly.ticks.length >= 2);
  assertReadable(weekly.ticks, "주봉 156봉");
}

// 확대해서 15분 눈금이 한 개 이하로 남으면 약수(5분)로 내려가 축을 살린다.
{
  const { ticks, timeAt } = axisOf("minute", minuteTimes(60), 20);
  assert.ok(ticks.length >= 2, `분봉 20봉: 눈금 ${ticks.length}개`);
  assertReadable(ticks, "분봉 20봉");
  const minutes = ticks.map((tick) => partsOf(timeAt(tick)).minute);
  assert.ok(minutes.every((minute) => minute % 5 === 0), `약수(5분)로 내려가지 않았다: ${minutes}`);
  assert.ok(minutes.some((minute) => minute % 15 !== 0), `15분 눈금에 머물렀다: ${minutes}`);
}

// 최대 확대(10봉)는 10분짜리 창이라 5분 경계가 한 번밖에 없을 수 있다. 그 한 개는 남긴다 —
// 1분까지 내려가면 봉마다 라벨이 붙어 서로 닿는다.
{
  const { ticks, timeAt } = axisOf("minute", minuteTimes(60), 10);
  assert.ok(ticks.length >= 1, "분봉 10봉: 눈금이 하나도 없다");
  assertReadable(ticks, "분봉 10봉");
  assert.ok(ticks.every((tick) => partsOf(timeAt(tick)).minute % 5 === 0));
}

// 일봉 캔들 기본(24봉)은 한 달 남짓이라 1개월 눈금이 하나뿐이다 — 주 단위로 내려간다.
{
  const { ticks } = axisOf("daily", dailyTimes(120), 24);
  assert.ok(ticks.length >= 2, `일봉 24봉: 눈금 ${ticks.length}개`);
  assertReadable(ticks, "일봉 24봉");
  assert.ok(ticks.every((tick) => /^\d{1,2}\/\d{1,2}$/u.test(tick.text)), "주 단위 라벨은 8/17 꼴이다");
}

// 어느 배율에서든 라벨은 겹치지 않는다.
for (const bars of [10, 16, 24, 34, 43, 72, 79, 99, 150, 250, 400]) {
  assertReadable(axisOf("minute", minuteTimes(bars + 40), bars).ticks, `분봉 ${bars}봉`);
  assertReadable(axisOf("daily", dailyTimes(Math.max(bars + 5, 260)), bars).ticks, `일봉 ${bars}봉`);
  assertReadable(axisOf("weekly", weeklyTimes(Math.max(bars + 5, 160)), bars).ticks, `주봉 ${bars}봉`);
}

// ── 좌우로 넘겨도 같은 봉은 같은 눈금이다 ──────────────────────────────────────

// 창을 한 봉씩 밀어도 어떤 시각의 봉이 갖는 라벨은 바뀌지 않는다. 창의 시작 위치가 눈금을
// 정하면 끌 때마다 글자가 한 칸씩 춤춘다.
{
  const times = minuteTimes(400);
  const bars = 60;
  const labels = new Map<number, string>();
  for (let start = 40; start + bars <= times.length; start += 1) {
    const visible = times.slice(start, start + bars);
    const x = (index: number) => (index * PLOT_W) / (bars - 1);
    const ticks = buildChartTimeAxis({
      times: visible,
      previousTime: times[start - 1],
      period: "minute",
      x,
      plotWidth: PLOT_W,
    });
    for (const tick of ticks) {
      const time = visible[Math.round((tick.x * (bars - 1)) / PLOT_W)];
      const seen = labels.get(time);
      if (seen !== undefined) assert.equal(tick.text, seen, `같은 봉의 라벨이 갈렸다: ${seen} ≠ ${tick.text}`);
      labels.set(time, tick.text);
    }
  }
  assert.ok(labels.size > 5);
}

// ── 경계에 봉이 없을 때 ────────────────────────────────────────────────────────

// 2026-08-01 은 토요일이라 그날 봉이 없다. 눈금은 경계를 넘긴 첫 거래일(8/3)에 붙는다.
{
  const { ticks, timeAt } = axisOf("daily", dailyTimes(50, kst(2026, 7, 1)), 50);
  const august = ticks.find((tick) => tick.text === "8월");
  assert.ok(august, "8월 눈금이 없다");
  assert.equal(partsOf(timeAt(august)).day, 3);
}

// 해가 바뀌는 자리는 달이 아니라 해를 적는다 — 1월만 열두 번 나오면 어느 해인지 모른다.
{
  const { ticks } = axisOf("daily", dailyTimes(72, kst(2025, 11, 3)), 72);
  assert.ok(
    ticks.some((tick) => tick.text === "26년"),
    `해 라벨이 없다: ${ticks.map((tick) => tick.text).join(",")}`,
  );
}

// 밤을 건너뛰어 날짜가 바뀌는 첫 눈금은 시각이 아니라 날짜를 적는다.
{
  const { ticks } = axisOf("minute", minuteTimes(500), 400);
  assert.ok(
    ticks.some((tick) => /^\d{1,2}\/\d{1,2}$/u.test(tick.text)),
    `날짜가 바뀌는 눈금이 없다: ${ticks.map((tick) => tick.text).join(",")}`,
  );
}

// ── 판정할 앞 봉이 없으면 첫 봉은 눈금이 아니다 ────────────────────────────────

{
  const times = dailyTimes(72, kst(2026, 3, 2));
  const x = (index: number) => (index * PLOT_W) / (times.length - 1);
  const ticks = buildChartTimeAxis({ times, previousTime: null, period: "daily", x, plotWidth: PLOT_W });
  assert.ok(ticks.every((tick) => tick.x > 0));
}

// 봉이 하나뿐이면 x 를 나눌 수 없다 — 축도 없다.
assert.deepEqual(
  buildChartTimeAxis({
    times: [kst(2026, 8, 17)],
    previousTime: null,
    period: "daily",
    x: () => 0,
    plotWidth: PLOT_W,
  }),
  [],
);

console.log("chart-time-axis 테스트 통과");
