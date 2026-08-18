import assert from "node:assert/strict";
import test from "node:test";
import { MIN_BODY_W, PLOT_W } from "./chart-view";
import {
  barsFromPixels,
  clampChartBars,
  DEFAULT_CHART_BARS,
  defaultChartWindow,
  MAX_CANDLE_BARS,
  MIN_CHART_BARS,
  maxChartBars,
  panChartWindow,
  resolveChartWindow,
  zoomChartWindow,
  type ChartWindow,
} from "./chart-window";

const DAY = 86_400;
const START = Date.UTC(2026, 6, 1) / 1000;

/** 하루 간격 봉 `count` 개의 시각. 창 계산은 시각만 본다. */
const times = (count: number) => Array.from({ length: count }, (_, i) => START + i * DAY);

/** 일봉 1년치 — 실제 API 가 주는 규모다. 기본 창(선 72개)보다 훨씬 많다. */
const YEAR = times(245);

test("기본 창은 맨 오른쪽에 붙고 개수는 시안 밀도 그대로다", () => {
  assert.deepEqual(defaultChartWindow("daily", "line"), { endTime: null, barCount: 72 });
  assert.deepEqual(defaultChartWindow("minute", "candlestick"), { endTime: null, barCount: 34 });

  const view = resolveChartWindow(YEAR, defaultChartWindow("daily", "line"), "line");
  assert.deepEqual(view, { start: 173, end: 245, barCount: 72, live: true });
});

test("캔들 상한은 `chart-view` 의 몸통 최소 폭에서 나온다", () => {
  // 두 파일이 각자 상수를 갖고 있으므로 여기서 대조한다. 한쪽만 고치면 캔들이 붙어 버린다.
  assert.equal(MAX_CANDLE_BARS, Math.floor(PLOT_W / MIN_BODY_W));
  assert.equal(maxChartBars("candlestick", 1_000), MAX_CANDLE_BARS);
  // 선차트는 캔들보다 훨씬 촘촘해도 읽히므로 상한이 따로다.
  assert.ok(maxChartBars("line", 1_000) > MAX_CANDLE_BARS);
});

test("옆으로 끌면 과거가 열리고, 오른쪽 끝에 닿으면 다시 지금을 따라간다", () => {
  const start = defaultChartWindow("daily", "line");
  // 30개 과거로. 담는 개수는 그대로이고 오른쪽 끝만 옮겨 간다.
  const back = panChartWindow(YEAR, start, -30, "line");
  const view = resolveChartWindow(YEAR, back, "line");
  assert.deepEqual(view, { start: 143, end: 215, barCount: 72, live: false });
  assert.equal(back.endTime, YEAR[214]);

  // 다시 오른쪽으로 끌어 끝에 닿으면 `endTime` 을 놓는다 — 새 봉을 따라가야 하기 때문이다.
  assert.equal(panChartWindow(YEAR, back, 30, "line").endTime, null);
  assert.equal(panChartWindow(YEAR, back, 9_999, "line").endTime, null);
});

test("맨 왼쪽에서 더 끌어도 없는 과거로 넘어가지 않는다", () => {
  const far = panChartWindow(YEAR, defaultChartWindow("daily", "line"), -9_999, "line");
  const view = resolveChartWindow(YEAR, far, "line");
  assert.deepEqual(view, { start: 0, end: 72, barCount: 72, live: false });
  // 한 번 더 밀어도 같은 자리다.
  assert.deepEqual(resolveChartWindow(YEAR, panChartWindow(YEAR, far, -50, "line"), "line"), view);
});

test("확대하면 붙잡은 자리의 봉이 제자리에 남는다", () => {
  const start = defaultChartWindow("daily", "line");
  // 오른쪽 끝(비율 1)을 붙잡고 두 배로 확대하면 담는 개수가 절반이 되고 끝은 그대로다.
  const zoomed = zoomChartWindow(YEAR, start, 2, 1, "line");
  assert.deepEqual(resolveChartWindow(YEAR, zoomed, "line"), {
    start: 209,
    end: 245,
    barCount: 36,
    live: true,
  });

  // 왼쪽 끝(비율 0)을 붙잡으면 왼쪽이 그대로고 오른쪽이 당겨진다.
  const left = zoomChartWindow(YEAR, start, 2, 0, "line");
  assert.equal(resolveChartWindow(YEAR, left, "line").start, 173);
  assert.equal(resolveChartWindow(YEAR, left, "line").barCount, 36);
});

test("축소는 데이터가 있는 만큼만, 확대는 눈금이 살아 있는 만큼만 한다", () => {
  const start = defaultChartWindow("daily", "line");
  // 아무리 벌려도 있는 봉(245)을 넘지 않는다.
  assert.equal(resolveChartWindow(YEAR, zoomChartWindow(YEAR, start, 0.001, 0.5, "line"), "line").barCount, 245);
  // 아무리 오므려도 `MIN_CHART_BARS` 아래로는 안 간다.
  assert.equal(resolveChartWindow(YEAR, zoomChartWindow(YEAR, start, 999, 0.5, "line"), "line").barCount, MIN_CHART_BARS);
  // 캔들은 몸통이 붙기 전에 멈춘다.
  const candle = defaultChartWindow("daily", "candlestick");
  const wide = zoomChartWindow(YEAR, candle, 0.001, 0.5, "candlestick");
  assert.equal(resolveChartWindow(YEAR, wide, "candlestick").barCount, MAX_CANDLE_BARS);
});

test("픽스처 폴백처럼 봉이 몇 개 없어도 창이 데이터 밖으로 나가지 않는다", () => {
  // 시세 제공자도 보관 DB 도 없으면 한 종목의 봉은 16개(분봉은 6개)뿐이다.
  const few = times(16);
  const start = defaultChartWindow("daily", "line");
  const view = resolveChartWindow(few, start, "line");
  assert.deepEqual(view, { start: 0, end: 16, barCount: 16, live: true });
  // 끌어도 축소해도 그 자리를 벗어나지 않는다. 확대는 있는 봉 안에서 되어야 한다.
  assert.deepEqual(resolveChartWindow(few, panChartWindow(few, start, -10, "line"), "line"), view);
  assert.deepEqual(resolveChartWindow(few, zoomChartWindow(few, start, 0.1, 0.5, "line"), "line"), view);
  assert.equal(resolveChartWindow(few, zoomChartWindow(few, start, 2, 1, "line"), "line").barCount, 10);

  const six = times(6);
  const tiny = resolveChartWindow(six, defaultChartWindow("minute", "line"), "line");
  assert.deepEqual(tiny, { start: 0, end: 6, barCount: 6, live: true });
  assert.equal(clampChartBars(MIN_CHART_BARS, "line", 6), 6);

  // 봉이 아직 하나도 없을 때(첫 로딩)도 계산이 터지지 않는다.
  assert.deepEqual(resolveChartWindow([], defaultChartWindow("daily", "line"), "line"), {
    start: 0,
    end: 0,
    barCount: 0,
    live: true,
  });
});

test("봉이 늘어도 보던 자리는 그대로다 — 창을 시각으로 붙잡기 때문", () => {
  const back = panChartWindow(YEAR, defaultChartWindow("daily", "line"), -30, "line");
  const before = resolveChartWindow(YEAR, back, "line");

  // 1초 폴링으로 새 봉이 셋 붙었다. 인덱스로 잡았다면 창이 셋씩 과거로 밀렸을 자리다.
  const grown = [...YEAR, ...times(3).map((_, i) => YEAR[244] + (i + 1) * DAY)];
  const after = resolveChartWindow(grown, back, "line");
  assert.deepEqual(after, before);
  assert.equal(grown[after.end - 1], YEAR[before.end - 1]);

  // 맨 오른쪽에 붙어 있던 창은 반대로 새 봉을 따라가야 한다.
  const live = resolveChartWindow(grown, defaultChartWindow("daily", "line"), "line");
  assert.equal(live.end, grown.length);
  assert.equal(live.live, true);
});

test("보관 구간이 잘려 사라진 봉을 보고 있었으면 그보다 이른 봉으로 대신 잡는다", () => {
  const missing: ChartWindow = { endTime: YEAR[100] + DAY / 2, barCount: 20 };
  // 정확히 그 시각의 봉은 없다. 그보다 이르면서 가장 늦은 봉(100)이 오른쪽 끝이 된다.
  assert.equal(resolveChartWindow(YEAR, missing, "line").end, 101);

  // 창 전체가 데이터보다 이르면 맨 앞으로 접힌다.
  const tooOld: ChartWindow = { endTime: YEAR[0] - 10 * DAY, barCount: 20 };
  assert.deepEqual(resolveChartWindow(YEAR, tooOld, "line"), {
    start: 0,
    end: 20,
    barCount: 20,
    live: false,
  });
});

test("픽셀을 봉 개수로 바꾸는 식이 `chart-view` 의 x 배치와 같다", () => {
  // `chart-view` 는 봉을 `i * PLOT_W / (n - 1)` 에 놓는다. 플롯 폭을 통째로 끌면 창 하나가
  // 통째로 넘어가야 하므로 `barCount - 1` 개가 나와야 한다.
  assert.equal(barsFromPixels(PLOT_W, PLOT_W, 72), 71);
  assert.equal(barsFromPixels(PLOT_W / 2, PLOT_W, 11), 5);
  // 나눌 수 없는 값에서는 0 이다 — 무한이 창으로 새어 들어가면 안 된다.
  assert.equal(barsFromPixels(100, PLOT_W, 1), 0);
  assert.equal(barsFromPixels(100, 0, 72), 0);
});

test("기본 창은 선차트가 캔들보다 촘촘하다 — 시안의 밀도 그대로다", () => {
  for (const period of ["minute", "daily", "weekly"] as const) {
    assert.ok(DEFAULT_CHART_BARS.line[period] > DEFAULT_CHART_BARS.candlestick[period]);
    // 기본 캔들 개수는 상한 안에 있어야 처음부터 몸통이 붙지 않는다.
    assert.ok(DEFAULT_CHART_BARS.candlestick[period] <= MAX_CANDLE_BARS);
  }
});
