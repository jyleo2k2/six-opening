import assert from "node:assert/strict";
import { buildChartView, PLOT_W, type ChartViewPoint, type ChartViewTrade } from "./chart-view";
import { PIN_COLORS } from "./detail-chart";

const DAY = 86_400;
const START = Date.UTC(2026, 6, 1) / 1000;

/** 오르내리는 봉 `count` 개. `close` 는 `base + i` 라 마지막 봉이 늘 최고가다. */
function bars(count: number, base = 10_000): ChartViewPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    time: START + i * DAY,
    open: base + i,
    high: base + i + 30,
    low: base + i - 30,
    close: base + i,
  }));
}

const daily = { period: "daily" as const, chartType: "line" as const, trades: [] };

// 봉이 하나뿐이면 x 를 나눌 수 없다 — 선도 캔들도 그리지 않는다.
assert.equal(buildChartView({ ...daily, points: [], price: 10_000 }), null);
assert.equal(buildChartView({ ...daily, points: bars(1), price: 10_000 }), null);

const view = buildChartView({ ...daily, points: bars(40), price: 10_500 });
assert.ok(view);

// 눈금은 다섯 줄이고, 가격 글자는 현재가 태그와 겹치는 줄만큼 적다.
assert.equal(view!.grid.length, 5);
assert.ok(view!.axis.length <= 5);
for (const tick of view!.axis) {
  assert.ok(Math.abs(tick.y - view!.nowY) >= 15, `현재가 태그와 겹치는 눈금: ${tick.y}`);
  assert.match(tick.text, /^[\d,]+원$/u);
}

// 선은 봉 개수만큼 좌표쌍을 내고 플롯 폭을 꽉 채운다. 캔들은 그리지 않는다.
const pairs = view!.linePoints.split(" ");
assert.equal(pairs.length, 40);
assert.equal(pairs[0].split(",")[0], "0.0");
assert.equal(pairs[39].split(",")[0], PLOT_W.toFixed(1));
assert.equal(view!.candles.length, 0);

// 마지막 봉의 종가는 지금 가격으로 맞춘다 — 그래야 현재가 태그가 선 끝에 붙는다.
assert.equal(view!.nowText, "10,500원");
assert.equal(Number(pairs[39].split(",")[1]).toFixed(1), view!.nowY.toFixed(1));

// 지금 가격이 곧 최고가면 이름표를 숨긴다. 현재가 태그가 이미 같은 말을 한다.
assert.equal(view!.hi.visible, false);
assert.ok(view!.lo.visible);
assert.match(view!.lo.text, /^최저 [\d,]+원$/u);

// 이름표는 좌우 끝에서 안쪽으로 끌려 들어온다. 점은 제자리에 남는다.
assert.equal(view!.lo.x, 0);
assert.equal(view!.lo.labelX, 42);

// 기간이 길수록 띄우는 봉이 많다 — 시안의 밀도(분 99 · 일 72 · 주 43)를 따른다.
const many = bars(300);
assert.equal(buildChartView({ ...daily, points: many, price: 10_299 })!.linePoints.split(" ").length, 72);
assert.equal(
  buildChartView({ ...daily, period: "minute", points: many, price: 10_299 })!.linePoints.split(" ").length,
  99,
);
assert.equal(
  buildChartView({ ...daily, period: "weekly", points: many, price: 10_299 })!.linePoints.split(" ").length,
  43,
);

// 캔들차트는 선을 그리지 않고 몸통을 낸다. 최고·최저 이름표는 캔들에서 숨는다.
const candle = buildChartView({ ...daily, chartType: "candlestick", points: many, price: 10_299 });
assert.equal(candle!.linePoints, "");
assert.equal(candle!.candles.length, 24);
assert.equal(candle!.hi.visible, false);
assert.equal(candle!.lo.visible, false);
// 도지(시가=종가)도 보이게 몸통 높이는 최소 1.5px 이다.
for (const bar of candle!.candles) {
  assert.ok(bar.bodyH >= 1.5, `몸통이 너무 얇다: ${bar.bodyH}`);
  assert.ok(bar.highY <= bar.lowY, "고가가 저가보다 아래에 있다");
  assert.equal(bar.up, true);
}

// 핀은 체결 시각의 봉에 붙고 y 는 그 봉의 종가다 — 범례 날짜와 자리가 맞아야 한다.
const trades: ChartViewTrade[] = [
  {
    id: "t1",
    name: "찬영 엄마",
    member: "parent",
    role: "mom",
    side: "buy",
    price: 9_000,
    quantity: 3,
    tradedAt: new Date((START + 10 * DAY) * 1000).toISOString(),
  },
];
const pinned = buildChartView({ ...daily, points: bars(40), price: 10_500, trades });
assert.equal(pinned!.pins.length, 1);
assert.equal(pinned!.pins[0].label, "B");
assert.equal(pinned!.pins[0].color, PIN_COLORS.mom);
assert.equal(pinned!.pins[0].x, (10 * PLOT_W) / 39);
// 체결가(9,000원)가 아니라 **선 위**에 앉는다 — 얼마에 샀는지는 아래 범례가 말한다.
const onLine = pinned!.linePoints.split(" ")[10].split(",");
assert.equal(pinned!.pins[0].x.toFixed(1), onLine[0]);
assert.equal(pinned!.pins[0].y.toFixed(1), onLine[1]);

// 잘려 나간 구간의 체결은 핀도 없다 — 안 보이는 봉을 가리킬 수 없다.
const old: ChartViewTrade[] = [{ ...trades[0], tradedAt: "2020-01-01T00:00:00Z" }];
assert.equal(buildChartView({ ...daily, points: bars(40), price: 10_500, trades: old })!.pins.length, 0);

// ── 확대·축소와 좌우 이동이 바꾸는 것 ────────────────────────────────────────
// 구간 계산 자체는 `chart-window.test.ts` 가 지킨다. 여기서는 **그 구간이 좌표와 글자에
// 어떻게 닿는지**만 본다.

// 창을 주면 그만큼만 그린다. 안 주면 기본 창이라 위의 단정이 그대로 산다.
const zoomed = buildChartView({ ...daily, points: many, price: 10_299, window: { endTime: null, barCount: 20 } });
assert.equal(zoomed!.linePoints.split(" ").length, 20);
assert.equal(zoomed!.nowVisible, true);

// 과거로 끌어다 놓으면 현재가 태그를 감춘다 — 그 구간의 값이 아니기 때문이다.
const past = buildChartView({
  ...daily,
  points: many,
  price: 10_299,
  window: { endTime: many[199].time, barCount: 20 },
});
assert.equal(past!.nowVisible, false);
assert.equal(past!.linePoints.split(" ").length, 20);

// 마지막 봉의 종가를 지금 가격으로 맞추는 것도 맨 오른쪽에 붙어 있을 때뿐이다.
// 200번째 봉의 종가는 `10_000 + 199` 이고, 지금 가격 10,299 원이 얹히면 안 된다.
const lastY = Number(past!.linePoints.split(" ")[19].split(",")[1]);
assert.notEqual(lastY.toFixed(1), past!.nowY.toFixed(1));

// 태그가 없으면 그 자리 가격 글자를 지울 이유도 없다 — 눈금 다섯 줄이 모두 값을 갖는다.
assert.equal(past!.axis.length, 5);
assert.equal(zoomed!.axis.length < 5, true);

// 태그가 없는 구간에서는 최고·최저 이름표가 값이 같아도 남는다. 대신 말해 줄 것이 없다.
const flat = Array.from({ length: 300 }, (_, i) => ({
  time: START + i * DAY,
  open: 10_000,
  high: 10_000,
  low: 10_000,
  close: 10_000,
}));
const flatPast = buildChartView({
  ...daily,
  points: flat,
  price: 10_000,
  window: { endTime: flat[199].time, barCount: 20 },
});
assert.equal(flatPast!.hi.visible, true);
assert.equal(flatPast!.lo.visible, true);

// 봉이 몇 개 없는 종목(픽스처 폴백 16개)도 기본 창 그대로 그려진다 — 51종 어디서나 열린다.
const few = buildChartView({ ...daily, points: bars(16), price: 10_015 });
assert.equal(few!.linePoints.split(" ").length, 16);
