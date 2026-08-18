/**
 * 차트 화면의 **시간축(X축) 눈금**. 어느 봉 아래에 어떤 시각 글자를 놓을지만 정한다.
 *
 * 예전 시안에는 시간축이 아예 없었다. 가로 눈금 다섯 줄과 오른쪽 가격 글자뿐이라 "이
 * 봉이 언제인지"를 화면에서 읽을 길이 없었고, 확대·축소와 좌우 이동이 붙으면서 지금
 * 보고 있는 구간이 어디인지가 더 알 수 없게 됐다.
 *
 * ## 눈금 단위는 기간이 정한다 — 그리고 배율에 따라 사다리를 오르내린다
 *
 * 기준 단위는 분봉 15분·일봉 1개월·주봉 3개월이다. 이 값이 기본 배율에서 보이는 눈금이고,
 * 축소해서 눈금이 서로 붙으면 배수(30분·1시간…)로 올라가고, 확대해서 눈금이 한 개 이하로
 * 남으면 약수(5분·1주…)로 내려간다. 어느 배율에서도 라벨이 겹치지도 사라지지도 않게 하는
 * 것이 목적이라 상수 하나로 못 박지 않는다.
 *
 * ## 왜 "경계에 있는 봉" 이 아니라 "경계를 넘긴 첫 봉" 인가
 *
 * 09:15 정각 봉이나 매달 1일 봉이 늘 있는 것이 아니다. 장은 09:00 에 열고 주말·공휴일에는
 * 봉이 없다. 그래서 이웃한 두 봉 사이를 경계가 지나면 **뒤쪽 봉**을 그 눈금으로 삼는다.
 * 이렇게 하면 창을 좌우로 옮겨도 같은 봉이 늘 같은 눈금을 갖는다 — 창의 시작 위치에 따라
 * 눈금이 한 칸씩 흔들리면 끌 때마다 글자가 춤춘다.
 *
 * 그래서 창의 첫 봉을 판정하려면 **창 바로 앞 봉**이 필요하다(`previousTime`). 없으면
 * (데이터의 맨 앞) 첫 봉은 눈금이 되지 않는다 — 경계를 넘었는지 알 길이 없다.
 *
 * 시각은 전부 한국 시간(UTC+9, 서머타임 없음) 기준이다.
 */
import type { PrototypeChartPeriod } from "../../f2-trade/chart-data";

export type ChartTimeTick = {
  /** 라벨의 가운데 x. 그 봉의 x 와 같다. */
  x: number;
  text: string;
};

/**
 * 눈금 단위. `minute` 은 자정부터 센 분, `week` 는 월요일, `month` 는 달력 달이다.
 * 어느 것이든 "몇 번째 칸인가"(`bucket`)로 바꿔 이웃 봉과 견주기만 한다.
 */
type TickUnit = { kind: "minute"; span: number } | { kind: "week" } | { kind: "month"; span: number };

const KST_OFFSET = 9 * 60 * 60;
const DAY = 86_400;

/**
 * 기간별 눈금 사다리와 그 안의 기준 단위. 가운데(`base`)가 기본 배율에서 보이는 눈금이고
 * 좌우가 확대·축소했을 때 옮겨 가는 자리다.
 */
const LADDERS: Readonly<Record<PrototypeChartPeriod, { units: readonly TickUnit[]; base: number }>> =
  Object.freeze({
    minute: {
      units: [
        { kind: "minute", span: 1 },
        { kind: "minute", span: 5 },
        { kind: "minute", span: 15 },
        { kind: "minute", span: 30 },
        { kind: "minute", span: 60 },
        { kind: "minute", span: 120 },
        { kind: "minute", span: 240 },
        { kind: "minute", span: 1440 },
      ],
      base: 2,
    },
    daily: {
      units: [
        { kind: "week" },
        { kind: "month", span: 1 },
        { kind: "month", span: 2 },
        { kind: "month", span: 3 },
        { kind: "month", span: 6 },
        { kind: "month", span: 12 },
      ],
      base: 1,
    },
    weekly: {
      units: [
        { kind: "month", span: 1 },
        { kind: "month", span: 3 },
        { kind: "month", span: 6 },
        { kind: "month", span: 12 },
        { kind: "month", span: 24 },
      ],
      base: 1,
    },
  });

/**
 * 라벨 두 개가 서로 붙지 않는 최소 거리(px). 10px 글자로 `09:15` 가 약 28px 이므로 이보다
 * 가까워지면 글자끼리 닿는다. 이 값이 곧 "언제 배수로 올라가는가" 다.
 */
const MIN_TICK_GAP = 38;
/**
 * 이보다 적게 남으면 축이 있으나 마나다. 눈금이 하나뿐이면 그 옆 칸이 얼마짜리 시간인지
 * 견줄 데가 없으므로 한 단계 촘촘한 단위로 내려간다.
 */
const MIN_TICK_COUNT = 2;
/**
 * 플롯 좌우 끝에서 라벨을 버리는 여백. 가운데 정렬이라 끝에 붙은 라벨은 절반이 플롯 밖으로
 * 나가고, 오른쪽은 가격 글자 자리(`AXIS_LEFT`)와 겹친다. 끌어들이지 않고 버리는 이유는
 * 라벨을 옮기면 그 글자가 가리키는 봉이 달라져 거짓말이 되기 때문이다.
 */
const EDGE_PAD = 14;

/** 한국 시간 기준 연·월·일·시·분. `Date` 의 UTC 접근자에 9시간을 더해 읽는다. */
function kstParts(time: number) {
  const at = new Date((time + KST_OFFSET) * 1000);
  return {
    year: at.getUTCFullYear(),
    month: at.getUTCMonth(),
    day: at.getUTCDate(),
    hour: at.getUTCHours(),
    minute: at.getUTCMinutes(),
  };
}

/**
 * 그 시각이 몇 번째 칸에 있는지. 이웃한 두 봉의 값이 다르면 그 사이를 경계가 지난 것이다.
 *
 * 달 단위는 `연*12 + 월` 을 쓴다 — 어떤 배수든 1월이 늘 경계가 되므로(연도×12 는 2·3·6·
 * 12·24 로 나누어떨어진다) 해가 바뀌는 자리에 반드시 눈금이 선다.
 */
function bucketOf(unit: TickUnit, time: number) {
  if (unit.kind === "minute") {
    return Math.floor((time + KST_OFFSET) / (unit.span * 60));
  }
  if (unit.kind === "week") {
    // 1970-01-01 은 목요일이라 4일을 밀어야 월요일이 칸의 시작이 된다.
    return Math.floor((time + KST_OFFSET - 4 * DAY) / (7 * DAY));
  }
  const { year, month } = kstParts(time);
  return Math.floor((year * 12 + month) / unit.span);
}

/**
 * 눈금 글자. 날짜가 바뀌는 자리는 시각 대신 날짜를, 해가 바뀌는 자리는 달 대신 해를 적는다
 * — 09:15 만 늘어놓으면 어느 날 09:15 인지 알 수 없다.
 */
function tickText(unit: TickUnit, time: number, previous: number | null) {
  const now = kstParts(time);
  if (unit.kind === "month" || unit.kind === "week") {
    if (unit.kind === "month" && (unit.span >= 12 || now.month === 0)) {
      return `${String(now.year % 100).padStart(2, "0")}년`;
    }
    if (unit.kind === "week") return `${now.month + 1}/${now.day}`;
    return `${now.month + 1}월`;
  }
  const newDay = previous === null || kstParts(previous).day !== now.day;
  if (unit.span >= 1440 || newDay) return `${now.month + 1}/${now.day}`;
  return `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`;
}

/** 이 단위로 눈금을 뽑는다. 좌우 끝에 걸린 것은 버린다. */
function ticksFor(
  unit: TickUnit,
  times: readonly number[],
  previousTime: number | null,
  x: (index: number) => number,
  plotWidth: number,
) {
  const picked: number[] = [];
  let before = previousTime === null ? null : bucketOf(unit, previousTime);
  for (let i = 0; i < times.length; i++) {
    const bucket = bucketOf(unit, times[i]);
    if (before !== null && bucket !== before) {
      const px = x(i);
      if (px >= EDGE_PAD && px <= plotWidth - EDGE_PAD) picked.push(i);
    }
    before = bucket;
  }
  return picked;
}

/** 뽑은 눈금들이 서로 얼마나 떨어져 있는지. 하나 이하면 붙을 일이 없다. */
function narrowestGap(indexes: readonly number[], x: (index: number) => number) {
  let gap = Number.POSITIVE_INFINITY;
  for (let i = 1; i < indexes.length; i++) {
    gap = Math.min(gap, x(indexes[i]) - x(indexes[i - 1]));
  }
  return gap;
}

export function buildChartTimeAxis(options: {
  /** 창에 보이는 봉의 시각(초). 오름차순이어야 한다. */
  times: readonly number[];
  /** 창 바로 앞 봉의 시각. 데이터의 맨 앞을 보고 있으면 `null` 이다. */
  previousTime: number | null;
  period: PrototypeChartPeriod;
  /** 봉 인덱스를 픽셀 x 로. `chart-view` 의 배치식을 그대로 넘겨야 캔들과 어긋나지 않는다. */
  x: (index: number) => number;
  /** 봉을 늘어놓는 폭(`chart-view` 의 `PLOT_W`). 좌우 끝 판정에 쓴다. */
  plotWidth: number;
}): ChartTimeTick[] {
  const { times, previousTime, period, x, plotWidth } = options;
  if (times.length < 2) return [];

  const ladder = LADDERS[period];
  const pick = (at: number) => ticksFor(ladder.units[at], times, previousTime, x, plotWidth);

  let at = ladder.base;
  let indexes = pick(at);
  // 라벨이 서로 닿으면 성긴 쪽(배수)으로 올라간다. 사다리 끝까지 가도 안 되면 거기서 멈춘다.
  while (narrowestGap(indexes, x) < MIN_TICK_GAP && at < ladder.units.length - 1) {
    at += 1;
    indexes = pick(at);
  }
  // 너무 성글면 촘촘한 쪽(약수)으로 내려가되, 내려간 자리가 붙어 버리면 되돌린다.
  while (indexes.length < MIN_TICK_COUNT && at > 0) {
    const finer = pick(at - 1);
    if (narrowestGap(finer, x) < MIN_TICK_GAP) break;
    at -= 1;
    indexes = finer;
  }

  const unit = ladder.units[at];
  return indexes.map((index, order) => ({
    x: x(index),
    text: tickText(unit, times[index], order === 0 ? previousTime : times[indexes[order - 1]]),
  }));
}
