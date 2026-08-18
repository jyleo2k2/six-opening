/**
 * 차트 화면(`ChartScreen`)이 그리는 선·캔들 차트의 기하.
 *
 * 시안(서비스 개요 HTML)의 "차트 화면" 계산을 그대로 옮겼다. 시안은 축을 라이브러리에
 * 맡기지 않고 **직접 그린다**: 세로 축선도 시간축도 없고, 가로 눈금선 다섯 줄 위에
 * 가격 글자를 오른쪽 여백(`left:285px`)에 HTML 로 얹는다. 그래서 여기서 돌려주는 것은
 * 픽셀 좌표뿐이고 색·글꼴은 그리는 쪽(`ChartScreen`)이 정한다.
 *
 * 시안과 갈리는 곳은 **데이터의 출처** 하나다. 시안은 종목코드를 시드로 만든 가짜 시세를
 * 그리지만(디자인 문서라 시세가 없다) 여기서는 `GET /api/quote/{symbol}/chart` 가 준
 * 진짜 봉을 받는다. 모양은 시안이, 값은 API 가 원본이다.
 *
 * 핀 x 도 같은 이유로 시안을 따르지 않는다. 시안은 체결 순번을 폭에 비례 배분해
 * (`0.22 + 0.68 * …`) 체결일과 무관한 자리에 찍는데, 우리 봉에는 시각이 있으므로
 * `buildTradeMarkers` 로 **체결 시각의 봉**에 붙인다 — 그래야 아래 범례의 날짜와
 * 핀 자리가 서로 맞는다(`chart-trade-legend` 의 같은 결정).
 *
 * **어느 구간을 그릴지는 여기서 정하지 않는다.** 예전에는 `slice(-N)` 으로 늘 최근 N 개를
 * 잡았는데 확대·축소와 좌우 이동이 생기면서 그 구간이 손짓에 따라 바뀐다. 구간 계산은
 * `chart-window.ts` 가 갖고 이 파일은 받은 구간을 좌표로 바꾸기만 한다.
 */
import type { PrototypeChartPeriod, PrototypeChartType } from "../../f2-trade/chart-data";
import { buildTradeMarkers, type ChartTrade } from "../../../shared/engine/trade-markers";
import type { PinRole } from "./chart-trade-legend";
import { defaultChartWindow, resolveChartWindow, type ChartWindow } from "./chart-window";
import { PIN_COLORS } from "./detail-chart";
import { won } from "./portfolio-view";

/** `GET /api/trades` 응답 한 줄. 마커 계산이 읽는 부분에 핀 색을 정하는 `role` 만 얹었다. */
export type ChartViewTrade = ChartTrade & { role: PinRole };

/** `GET /api/quote/{symbol}/chart` 의 봉 하나 중 이 계산이 읽는 부분. */
export type ChartViewPoint = {
  /** 봉의 시각(초). 핀을 붙일 봉을 찾는 데 쓴다. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type ChartViewCandle = {
  x: number;
  /** 꼬리 — 그 봉의 고가·저가. */
  highY: number;
  lowY: number;
  /** 몸통 — 시가와 종가 사이. 도지도 보이게 최소 1.5px 은 남긴다. */
  bodyX: number;
  bodyY: number;
  bodyW: number;
  bodyH: number;
  /** 종가가 시가 이상이면 빨강, 아니면 파랑. 색 상수는 그리는 쪽이 갖는다. */
  up: boolean;
};

export type ChartViewMark = {
  /** 점(작은 원)의 자리. 실제 최고·최저가 찍힌 봉이다. */
  x: number;
  y: number;
  text: string;
  /** 캔들차트이거나 그 값이 곧 현재가면 이름표를 감춘다(시안 `chartHiTextStyle`). */
  visible: boolean;
  /** 이름표 자리. 좌우 끝에서는 잘리지 않게 안쪽으로 끌려 들어오므로 점과 갈린다. */
  labelX: number;
  labelY: number;
};

export type ChartViewPin = {
  id: string;
  x: number;
  y: number;
  label: "B" | "S";
  title: string;
  color: string;
};

export type ChartView = {
  /** 가로 눈금선의 y. 다섯 줄이고 가로로는 플롯 폭(`PLOT_W`)까지만 긋는다. */
  grid: number[];
  /** 오른쪽 가격 글자. 현재가 태그와 겹치는 줄은 선만 남기고 글자를 뺀다. */
  axis: { y: number; text: string }[];
  /** 기간 첫 값에 깔리는 점선. "여기서 시작했다"를 읽는 기준선이다. */
  baseY: number;
  /** 선차트일 때만 채운다. */
  linePoints: string;
  /** 캔들차트일 때만 채운다. */
  candles: ChartViewCandle[];
  /** 현재가 태그의 y 와 글자. */
  nowY: number;
  nowText: string;
  /**
   * 현재가 태그를 띄울지. 창이 맨 오른쪽(가장 최근 봉)에 붙어 있을 때만 참이다.
   * 과거로 끌어다 놓은 구간에 지금 가격표가 떠 있으면 그 구간의 값과 섞여 읽히고,
   * 지금 가격이 그 구간의 눈금 범위 밖이면 태그가 아예 플롯 밖으로 나간다.
   */
  nowVisible: boolean;
  hi: ChartViewMark;
  lo: ChartViewMark;
  pins: ChartViewPin[];
};

/** 플롯 폭. SVG 는 이보다 넓고(`SVG_W`) 남는 오른쪽이 가격 글자 자리다. */
export const PLOT_W = 278;
export const PLOT_H = 250;
export const SVG_W = 334;
/** 가격 글자·현재가 태그의 왼쪽 자리. 시안의 `left:285px`·`left:281px` 그대로다. */
export const AXIS_LEFT = 285;
export const NOW_LEFT = 281;

const TOP = 26;
const BOT = 28;
/** 위아래로 남기는 여유. 선이 눈금 맨 끝에 닿지 않게 한다. */
const PAD_RATIO = 0.08;
/** 눈금 칸 수. 선은 다섯 줄(`g = 0..4`)이다. */
const STEPS = 4;
/** 현재가 태그가 덮는 높이. 이보다 가까운 눈금은 글자를 지운다. */
const NOW_TAG_GAP = 15;
/** 최고·최저 이름표가 좌우로 잘리지 않게 끌어들이는 여백. */
const CLAMP_X = 42;
/** 이름표를 점에서 띄우는 거리. 최고는 위, 최저는 아래다. */
const HI_LABEL_UP = 24;
const LO_LABEL_DOWN = 9;

/**
 * 캔들 몸통의 최소 폭. 이보다 좁아지면 몸통끼리 붙어 한 덩어리로 보이므로, 축소해서
 * 담을 수 있는 캔들 개수의 상한(`chart-window` 의 `MAX_CANDLE_BARS`)이 여기서 나온다.
 */
export const MIN_BODY_W = 3.5;

/** 몸통 폭 — 봉 간격의 60%, 최소 3.5px. 시안의 `bw` 와 같은 식이다. */
function bodyWidth(count: number) {
  return Math.max(MIN_BODY_W, (PLOT_W / count) * 0.6);
}

export function buildChartView(options: {
  points: readonly ChartViewPoint[];
  /** 지금 가격. 마지막 봉의 종가를 여기에 맞춘다(시안 `vals[n-1] = st.price`). */
  price: number;
  period: PrototypeChartPeriod;
  chartType: PrototypeChartType;
  trades: readonly ChartViewTrade[];
  /**
   * 볼 구간. 주지 않으면 기간마다 정해진 기본 창(맨 오른쪽에 붙은 최근 N개)이라
   * 확대·축소가 없던 때와 같은 그림이 나온다.
   */
  window?: ChartWindow;
}): ChartView | null {
  const { points, price, period, chartType, trades } = options;
  const candle = chartType === "candlestick";

  const { start, end, live } = resolveChartWindow(
    points.map((point) => point.time),
    options.window ?? defaultChartWindow(period, chartType),
    chartType,
  );
  const visible = points.slice(start, end);
  const n = visible.length;
  // 봉이 하나뿐이면 x 를 나눌 수 없다. 선도 캔들도 그리지 않는다.
  if (n < 2) return null;

  /**
   * 마지막 봉의 종가를 지금 가격으로 맞춘다.
   *
   * 봉은 1초마다 다시 받지만 체결 시각과 시세 갱신 시각이 어긋나 마지막 종가가 헤더의
   * 가격과 몇 원 갈릴 수 있다. 그대로 두면 현재가 태그가 선 끝에서 떠 있고, 값이 눈금
   * 범위를 벗어나면 태그가 플롯 밖으로 나간다. 고가·저가도 같이 넓혀 캔들 몸통이
   * 꼬리를 뚫지 않게 한다.
   *
   * **맨 오른쪽에 붙어 있을 때만** 그렇게 한다. 과거로 끌어다 놓은 구간의 마지막 봉은
   * 지금 봉이 아니므로 거기에 지금 가격을 얹으면 없던 값이 생긴다.
   */
  const bars = visible.map((point, i) =>
    live && i === n - 1
      ? {
          ...point,
          close: price,
          high: Math.max(point.high, price),
          low: Math.min(point.low, price),
        }
      : point,
  );

  // 선차트는 종가만 그리므로 눈금도 종가로 잡는다. 캔들은 꼬리까지 담아야 잘리지 않는다.
  let hi = candle ? bars[0].high : bars[0].close;
  let lo = candle ? bars[0].low : bars[0].close;
  let hiIndex = 0;
  let loIndex = 0;
  for (let i = 0; i < n; i++) {
    const high = candle ? bars[i].high : bars[i].close;
    const low = candle ? bars[i].low : bars[i].close;
    if (high > hi) {
      hi = high;
      hiIndex = i;
    }
    if (low < lo) {
      lo = low;
      loIndex = i;
    }
  }

  const pad = (hi - lo) * PAD_RATIO || 1;
  const top = hi + pad;
  const bot = lo - pad;
  const x = (i: number) => (i * PLOT_W) / (n - 1);
  const y = (value: number) => TOP + ((top - value) / (top - bot)) * (PLOT_H - TOP - BOT);
  const clampX = (px: number) => Math.max(CLAMP_X, Math.min(PLOT_W - CLAMP_X, px));

  const nowY = y(price);
  const grid: number[] = [];
  const axis: { y: number; text: string }[] = [];
  for (let step = 0; step <= STEPS; step++) {
    const value = top - (top - bot) * (step / STEPS);
    const gy = y(value);
    grid.push(gy);
    // 현재가 태그와 겹치는 눈금은 글자만 지운다. 선은 남겨야 칸이 고르게 보인다.
    // 태그를 띄우지 않는 과거 구간에서는 지울 이유가 없다 — 지우면 가격 글자 한 줄이
    // 까닭 없이 비어 눈금 다섯 줄 중 하나를 읽지 못한다.
    if (live && Math.abs(gy - nowY) < NOW_TAG_GAP) continue;
    axis.push({ y: gy, text: won(value) });
  }

  const candles: ChartViewCandle[] = [];
  if (candle) {
    const width = bodyWidth(n);
    for (let i = 0; i < n; i++) {
      const bar = bars[i];
      const cx = x(i);
      const openY = y(bar.open);
      const closeY = y(bar.close);
      candles.push({
        x: cx,
        highY: y(bar.high),
        lowY: y(bar.low),
        bodyX: cx - width / 2,
        bodyY: Math.min(openY, closeY),
        bodyW: width,
        bodyH: Math.max(1.5, Math.abs(closeY - openY)),
        up: bar.close >= bar.open,
      });
    }
  }

  /**
   * 핀은 체결 시각의 봉에 붙이고 y 는 **그 봉의 종가**로 잡는다.
   *
   * 체결가가 아니라 선 위에 앉히는 것이 시안이다. 체결가와 그날 종가는 원래 다른 값이고,
   * 핀이 답하는 질문은 "언제 샀나"다 — 얼마에 샀는지는 차트 아래 범례가 정확한 숫자로
   * 말한다. 체결가를 y 로 삼으면 핀이 선에서 떨어져 어느 날인지 되레 읽기 어렵다.
   */
  const byTime = new Map(bars.map((bar, i) => [bar.time, i]));
  const pins: ChartViewPin[] = [];
  for (const marker of buildTradeMarkers({ trades, candleTimes: bars.map((bar) => bar.time) })) {
    const at = byTime.get(marker.time);
    if (at === undefined) continue;
    const role = trades.find((trade) => trade.id === marker.id)?.role;
    pins.push({
      id: marker.id,
      x: x(at),
      y: y(bars[at].close),
      label: marker.side === "buy" ? "B" : "S",
      title: marker.label,
      // 색을 못 찾으면 부모·자녀 둘로 접는다 — 핀이 통째로 사라지는 것보다 낫다.
      color: PIN_COLORS[role ?? (marker.member === "child" ? "child" : "mom")],
    });
  }

  return {
    grid,
    axis,
    baseY: y(candle ? bars[0].open : bars[0].close),
    linePoints: candle ? "" : bars.map((bar, i) => `${x(i).toFixed(1)},${y(bar.close).toFixed(1)}`).join(" "),
    candles,
    nowY,
    nowText: won(price),
    nowVisible: live,
    hi: {
      x: x(hiIndex),
      y: y(hi),
      text: `최고 ${won(hi)}`,
      // 최고가 곧 현재가면 현재가 태그가 같은 말을 이미 하고 있다. 태그가 없는 과거
      // 구간에서는 그 말을 대신 해 줄 것이 없으므로 값이 같아도 이름표를 남긴다.
      visible: !candle && (!live || Math.round(hi) !== Math.round(price)),
      labelX: clampX(x(hiIndex)),
      labelY: y(hi) - HI_LABEL_UP,
    },
    lo: {
      x: x(loIndex),
      y: y(lo),
      text: `최저 ${won(lo)}`,
      visible: !candle && (!live || Math.round(lo) !== Math.round(price)),
      labelX: clampX(x(loIndex)),
      labelY: y(lo) + LO_LABEL_DOWN,
    },
    pins,
  };
}
