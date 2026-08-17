/**
 * 상세 화면 미니 가격차트의 기하 — 최고·최저 값·위치와 최근 매매 지점(B/S 핀) 3개.
 * 프로토타입(`web/design-system/prototype`)의 즉석 계산을 그대로 옮겼다. `spark` 는
 * 시각이 없는 0~100 지수라 핀도 실제 체결 시각이 아니라 **최근 순서를 배열 안 위치에
 * 비례 배분**한다 — 정밀한 시간축이 아니라 "최근에 이런 매매가 있었다"는 표시다.
 *
 * 값 자체는 `GET /api/trades` 가 준 진짜 가족 체결이다(F11 SPEC §6.1). 기록이 없으면
 * 핀 없이 선만 그린다 — 없는 체결을 지어내지 않는다.
 */
import type { TradeSide } from "../../../shared/types/trade";
import type { PinRole } from "./chart-trade-legend";

export type DetailTrade = {
  id: string;
  name: string;
  /** 핀 색을 정한다. 차트 화면 마커·범례와 같은 기준이다 (F11 SPEC §5.1). */
  role: PinRole;
  side: TradeSide;
  tradedAt: string;
};

export type DetailPin = {
  id: string;
  x: number;
  y: number;
  label: string;
  title: string;
  role: PinRole;
  /** 핀 바탕색. 프로토타입의 `MEM` 표와 같은 파스텔 세 색이다. */
  color: string;
};

/**
 * 가족 구성원별 핀 색 — 프로토타입 `MEM` 그대로다. `GET /api/trades` 의 `role` 이
 * 셋을 갈라 주므로 실제 체결도 세 색을 그대로 받는다 (F11 SPEC §5.1).
 *
 * 값은 `app/globals.css` 의 `--color-trade-*` 와 같아야 한다. 여기서 토큰을 못 읽는
 * 이유는 이 파일이 브라우저 없이 도는 순수 계산이라서다 — 두 곳을 함께 고친다.
 */
export const PIN_COLORS: Readonly<Record<PinRole, string>> = Object.freeze({
  child: "#A8B8E8",
  mom: "#F2AECB",
  dad: "#A9D5C8",
});


/**
 * 최고·최저 이름표 하나.
 *
 * **`x` 는 이름표 자리다.** 가장자리 값은 글씨가 카드 밖으로 잘리므로 `clampX` 로 안쪽에
 * 끌어들인 좌표이고, 따라서 실제 최고·최저가 찍힌 자리와는 다를 수 있다. 여기에 안 끌린
 * `y` 를 짝지어 점을 찍으면 선에서 떨어진 허공에 뜬다 — 상세 미니 차트가 점을 그리지 않는
 * 이유이고, 점이 필요한 차트 화면(`chart-view.ts`)은 점용 `x` 와 이름표용 `labelX` 를
 * 따로 낸다.
 *
 * `y` 는 값의 실제 높이다. 이름표를 핀에서 비켜 세우는 계산이 이 값을 기준으로 잰다.
 */
type DetailChartMark = { x: number; y: number; text: string; visible: boolean; labelY: number };

export type DetailChartGeometry = {
  linePoints: string;
  hi: DetailChartMark;
  lo: DetailChartMark;
  pins: DetailPin[];
};

const W = 336;
const H = 164;
const TOP = 26;
const BOT = 30;

// 아래 값들은 `DetailScreen` 의 `HI_LO_LABEL`·`PIN`·`PIN_BODY`·`PIN_TAIL` 이 실제로
// 그리는 상자다. 겹침 판정은 그 상자를 그대로 재현해야만 맞으므로 한쪽을 고치면
// 반드시 함께 고친다. svg 는 `viewBox="0 0 336 164"` 를 같은 크기로 그리니 1:1 이다.
const LABEL_FONT = 11.5;
/** `HI_LO_LABEL` 의 `line-height` 와 같은 값. 라벨은 `top` 기준으로 아래로 자란다. */
const LABEL_H = 14;
/** 핀은 `translate(-50%,-100%)` 로 `(x, y-7)` 에 붙는다. 몸통 23 + 꼬리 7 − 겹침 1 = 29. */
const PIN_HALF_W = 11.5;
const PIN_TOP = 36;
const PIN_BOT = 7;
/** 딱 붙기만 해도 읽기 어렵다 — 상자 사이에 이만큼은 띄운다. */
const GAP = 3;
/** 최고 라벨 자리 후보: 선 위 → 선 아래 → 더 위. 최저는 선 아래를 가장 먼저 본다. */
const HI_OFFSETS = [-22, 22, -40] as const;
const LO_OFFSETS = [9, 25, -34] as const;

/**
 * 폰트를 실측할 수 없는 순수 계산이라 글자 폭을 어림한다. 한글은 정사각, 숫자와 쉼표는
 * 좁다. 좁게 잡으면 겹치므로 넉넉한 쪽으로 반올림한다.
 */
function labelHalfWidth(text: string): number {
  let em = 0;
  for (const ch of text) {
    if (ch === " ") em += 0.3;
    else if (ch === ",") em += 0.32;
    else if (ch >= "0" && ch <= "9") em += 0.6;
    else em += 1;
  }
  return (em * LABEL_FONT) / 2;
}

export function buildDetailChart(options: {
  spark: readonly number[];
  price: number;
  changePercent: number;
  trades: readonly DetailTrade[];
}): DetailChartGeometry | null {
  const { spark: sp, price, changePercent, trades } = options;
  const n = sp.length;
  if (n < 2) return null;

  let hi = sp[0];
  let lo = sp[0];
  let hiI = 0;
  let loI = 0;
  for (let i = 0; i < n; i++) {
    if (sp[i] > hi) {
      hi = sp[i];
      hiI = i;
    }
    if (sp[i] < lo) {
      lo = sp[i];
      loI = i;
    }
  }
  const pad = (hi - lo) * 0.1 || 1;
  const topV = hi + pad;
  const botV = lo - pad;
  const x = (i: number) => (i * W) / (n - 1);
  const y = (v: number) => TOP + ((topV - v) / (topV - botV)) * (H - TOP - BOT);
  // spark 마지막 값을 지금 가격에 맞추고, 등락 규모에 비례하는 범위로 눌러 금액으로 읽는다.
  const amp = (price * (Math.abs(changePercent) * 0.6 + 2.4)) / 100;
  const toWon = (v: number) => Math.round(price + ((v - sp[n - 1]) / (hi - lo || 1)) * amp);
  const wonText = (v: number) => `최고 ${toWon(v).toLocaleString("ko-KR")}원`;
  const clampX = (px: number) => Math.max(44, Math.min(W - 44, px));

  const ordered = [...trades].sort((left, right) => left.tradedAt.localeCompare(right.tradedAt)).slice(-3);
  const pins: DetailPin[] = ordered.map((trade, i) => {
    const at = Math.round((n - 1) * (0.24 + (0.62 * (i + 1)) / (ordered.length + 1)));
    return {
      id: trade.id,
      x: x(at),
      y: y(sp[at]),
      label: trade.side === "buy" ? "B" : "S",
      title: `${trade.name} ${trade.side === "buy" ? "매수" : "매도"}`,
      role: trade.role,
      color: PIN_COLORS[trade.role],
    };
  });

  // 최고·최저 글씨가 B/S 핀과 겹치는지는 **그려지는 자리**로 판정한다. 라벨은 가장자리에서
  // `clampX` 로 끌려 들어오므로 점(`x(hiI)`)이 아니라 끌려온 뒤 좌표로 재야 한다.
  const hits = (lx: number, ly: number, halfW: number) =>
    pins.some(
      (pin) =>
        Math.abs(pin.x - lx) < halfW + PIN_HALF_W + GAP &&
        pin.y - PIN_TOP - GAP < ly + LABEL_H &&
        pin.y - PIN_BOT + GAP > ly,
    );
  /** 후보 자리를 순서대로 재 보고 처음으로 핀을 비켜 가는 자리를 쓴다. 다 막히면 첫 후보. */
  const labelY = (lx: number, dotY: number, text: string, offsets: readonly number[]) => {
    const halfW = labelHalfWidth(text);
    const free = offsets.find((d) => !hits(lx, dotY + d, halfW));
    return dotY + (free ?? offsets[0]);
  };

  const hiX = clampX(x(hiI));
  const loX = clampX(x(loI));
  const hiText = wonText(hi);
  const loText = `최저 ${toWon(lo).toLocaleString("ko-KR")}원`;

  return {
    linePoints: sp.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
    hi: {
      x: hiX,
      y: y(hi),
      text: hiText,
      visible: hiI !== n - 1,
      labelY: labelY(hiX, y(hi), hiText, HI_OFFSETS),
    },
    lo: {
      x: loX,
      y: y(lo),
      text: loText,
      visible: loI !== n - 1,
      labelY: labelY(loX, y(lo), loText, LO_OFFSETS),
    },
    pins,
  };
}
