/**
 * 차트 화면이 **봉 목록의 어느 구간을 보고 있는지**. 확대·축소와 좌우 이동이 바꾸는 값이
 * 여기 있고, 그 구간을 실제 좌표로 바꾸는 일은 `chart-view.ts` 가 한다.
 *
 * 예전에는 `points.slice(-N)` 의 `N` 이 상수라 늘 최근 구간만 보였다. 서버는 일봉 1년·
 * 주봉 3년·분봉 이틀치를 주는데 화면은 그중 72·43개만 쓰고 있었으므로, **새 API 없이**
 * 이 파일이 창을 옮기고 넓히기만 하면 나머지 과거가 그대로 열린다.
 *
 * ## 창을 인덱스가 아니라 시각(`endTime`)으로 붙잡는 이유
 *
 * `ChartScreen` 은 1초마다 봉 전체를 다시 받는다. 새 봉이 뒤에 붙으면 인덱스로 잡아 둔
 * 창은 매초 한 칸씩 과거로 밀려 가만히 있어도 화면이 흔들린다. 그래서 창의 오른쪽 끝을
 * **그 자리 봉의 시각**으로 기억하고, 봉이 늘어도 같은 봉을 다시 찾는다.
 *
 * `endTime === null` 은 "맨 오른쪽(지금)에 붙어 있다"는 뜻이다. 이 상태에서만 새 봉이
 * 화면을 따라오고, 현재가 태그도 이때만 뜬다 — 과거를 보고 있는데 지금 가격표가 떠 있으면
 * 그 구간의 값과 섞여 읽힌다.
 */
import type { PrototypeChartPeriod, PrototypeChartType } from "../../f2-trade/chart-data";

export type ChartWindow = {
  /**
   * 창의 오른쪽 끝 봉의 시각(초). `null` 이면 맨 오른쪽(가장 최근 봉)에 붙어 있다.
   * 정확히 그 시각의 봉이 사라졌으면 **그보다 이르면서 가장 늦은 봉**으로 대신 잡는다.
   */
  endTime: number | null;
  /** 창에 담는 봉 개수. 확대하면 줄고 축소하면 는다. */
  barCount: number;
};

/**
 * 기본으로 보여 주는 봉 개수 — 시안이 기간마다 정해 둔 밀도 그대로다. 선은
 * `spec[0] * tfMul`(분 62×1.6, 일 72×1, 주 78×0.55), 캔들은 `G`(분 34, 일 24, 주 16).
 * 확대·축소가 생기기 전에는 이 값이 `chart-view.ts` 의 상수였고, 지금은 창의 출발점이다.
 */
export const DEFAULT_CHART_BARS: Readonly<
  Record<PrototypeChartType, Readonly<Record<PrototypeChartPeriod, number>>>
> = Object.freeze({
  line: Object.freeze({ minute: 99, daily: 72, weekly: 43 }),
  candlestick: Object.freeze({ minute: 34, daily: 24, weekly: 16 }),
});

/** 이보다 적게 담으면 봉 몇 개만 남아 눈금 다섯 줄이 값을 말해 주지 못한다. */
export const MIN_CHART_BARS = 10;

/**
 * 캔들을 담을 수 있는 최대 개수. `chart-view.ts` 의 `bodyWidth` 가 몸통을 최소
 * `MIN_BODY_W`(3.5px)로 지키므로 그보다 촘촘해지면 몸통끼리 붙어 한 덩어리가 된다.
 * 두 파일이 같은 값을 보는지는 `chart-window.test.ts` 가 대조한다.
 */
export const MAX_CANDLE_BARS = 79;

/**
 * 선차트에서 한 번에 담는 최대 개수. 분봉 이틀치는 이보다 훨씬 많을 수 있는데, 278px 에
 * 400개를 넣으면 이미 한 획당 0.7px 라 더 넣어도 읽을 것이 늘지 않는다.
 */
export const MAX_LINE_BARS = 400;

/** 지금 있는 봉으로 담을 수 있는 최대 개수. 데이터가 적으면 그만큼만 담는다. */
export function maxChartBars(chartType: PrototypeChartType, total: number) {
  return Math.min(total, chartType === "candlestick" ? MAX_CANDLE_BARS : MAX_LINE_BARS);
}

/**
 * 담을 봉 개수를 실제로 담을 수 있는 범위로 접는다.
 *
 * 하한을 `MIN_CHART_BARS` 로 못 박지 않고 `total` 과 견주는 이유는 픽스처 폴백 때문이다.
 * 시세 제공자도 보관 DB도 없으면 한 종목의 봉은 16개(분봉은 6개)뿐인데, 하한을 10으로
 * 고정하면 6개짜리 종목에서 창이 데이터보다 커져 빈 자리를 담게 된다.
 */
export function clampChartBars(count: number, chartType: PrototypeChartType, total: number) {
  const max = maxChartBars(chartType, total);
  const min = Math.min(MIN_CHART_BARS, max);
  if (!Number.isFinite(count)) return min;
  return Math.max(min, Math.min(max, Math.round(count)));
}

export function defaultChartWindow(
  period: PrototypeChartPeriod,
  chartType: PrototypeChartType,
): ChartWindow {
  return { endTime: null, barCount: DEFAULT_CHART_BARS[chartType][period] };
}

/**
 * 창을 봉 목록의 실제 구간으로 바꾼다. `end` 는 **포함하지 않는** 끝이라 `slice(start, end)`
 * 에 그대로 넣을 수 있다.
 *
 * `live` 는 이 창이 가장 최근 봉을 담고 있는지다. 현재가 태그를 띄울지, 마지막 봉의 종가를
 * 지금 가격으로 맞출지가 여기에 달렸다 — 과거 구간에 지금 가격을 얹으면 없던 봉이 생긴다.
 */
export function resolveChartWindow(
  times: readonly number[],
  window: ChartWindow,
  chartType: PrototypeChartType,
) {
  const total = times.length;
  const barCount = clampChartBars(window.barCount, chartType, total);
  if (total === 0) return { start: 0, end: 0, barCount, live: true };

  // 찾는 시각의 봉이 사라졌으면 그보다 이른 봉 중 가장 늦은 것으로 대신 잡는다. 보관 구간이
  // 잘려 나가도 보던 자리 근처에 남으려는 것이고, 그보다 이른 봉조차 없으면 맨 앞이다.
  let end = total;
  if (window.endTime !== null) {
    let at = -1;
    for (let i = 0; i < total; i++) {
      if (times[i] <= window.endTime) at = i;
      else break;
    }
    end = Math.max(1, at + 1);
  }

  end = Math.max(barCount, Math.min(total, end));
  return { start: end - barCount, end, barCount, live: end >= total };
}

/** 구간을 다시 창으로 접는다. 맨 오른쪽에 닿으면 `endTime` 을 놓아 새 봉을 다시 따라간다. */
function toWindow(times: readonly number[], end: number, barCount: number): ChartWindow {
  return { endTime: end >= times.length ? null : (times[end - 1] ?? null), barCount };
}

/**
 * 창을 `deltaBars` 만큼 옮긴다. 양수가 미래(오른쪽), 음수가 과거(왼쪽)다.
 *
 * 손짓이 시작할 때의 창을 그대로 넘겨 매번 다시 재야 한다 — 옮긴 값에 다시 옮기면 반올림이
 * 쌓여 손가락과 그림이 어긋난다(`rail-drag` 의 `startLeft` 와 같은 이유다).
 */
export function panChartWindow(
  times: readonly number[],
  from: ChartWindow,
  deltaBars: number,
  chartType: PrototypeChartType,
): ChartWindow {
  const { end, barCount } = resolveChartWindow(times, from, chartType);
  if (!times.length) return from;
  const moved = Math.max(barCount, Math.min(times.length, end + Math.round(deltaBars)));
  return toWindow(times, moved, barCount);
}

/**
 * 창을 넓히거나 좁힌다. `factor` 가 1보다 크면 확대(담는 봉이 준다).
 *
 * `anchorRatio` 는 플롯 폭에서 붙잡을 자리(0=왼쪽 끝, 1=오른쪽 끝)다. 두 손가락 사이나
 * 마우스 포인터가 가리키던 봉이 제자리에 남아야 어디를 키운 것인지 눈으로 따라갈 수 있다.
 */
export function zoomChartWindow(
  times: readonly number[],
  from: ChartWindow,
  factor: number,
  anchorRatio: number,
  chartType: PrototypeChartType,
): ChartWindow {
  const total = times.length;
  const { start, barCount } = resolveChartWindow(times, from, chartType);
  if (!total || !Number.isFinite(factor) || factor <= 0) return from;

  const nextCount = clampChartBars(barCount / factor, chartType, total);
  const ratio = Math.max(0, Math.min(1, anchorRatio));
  // 붙잡은 봉(소수 자리까지)이 새 창에서도 같은 비율에 오도록 왼쪽 끝을 정한다.
  const anchor = start + ratio * (barCount - 1);
  const nextStart = Math.round(anchor - ratio * (nextCount - 1));
  const nextEnd = Math.max(nextCount, Math.min(total, nextStart + nextCount));
  return toWindow(times, nextEnd, nextCount);
}

/**
 * 화면에서 움직인 픽셀을 봉 개수로 바꾼다. 봉 사이 간격은 `chart-view` 의 x 배치와 같은
 * `PLOT_W / (barCount - 1)` 이다 — 여기서 다른 식을 쓰면 끈 만큼과 움직인 만큼이 갈린다.
 */
export function barsFromPixels(pixels: number, plotWidth: number, barCount: number) {
  if (barCount < 2 || plotWidth <= 0) return 0;
  return (pixels * (barCount - 1)) / plotWidth;
}
