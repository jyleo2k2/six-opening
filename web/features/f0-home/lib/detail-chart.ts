/**
 * 상세 화면 미니 가격차트의 기하 — 최고·최저 값·위치와 최근 매매 지점(B/S 핀) 3개.
 * 프로토타입(`web/design-system/prototype`)의 즉석 계산을 그대로 옮겼다. `spark` 는
 * 시각이 없는 0~100 지수라 핀도 실제 체결 시각이 아니라 **최근 순서를 배열 안 위치에
 * 비례 배분**한다 — 정밀한 시간축이 아니라 "최근에 이런 매매가 있었다"는 표시다.
 *
 * 값 자체는 `GET /api/trades` 가 준 진짜 가족 체결이다(F11 SPEC §6.1). 기록이 없으면
 * 핀 없이 선만 그린다 — 없는 체결을 지어내지 않는다.
 */
import type { FamilyMember, TradeSide } from "../../../shared/types/trade";

export type DetailTrade = {
  id: string;
  name: string;
  member: FamilyMember;
  side: TradeSide;
  tradedAt: string;
};

export type DetailPin = {
  id: string;
  x: number;
  y: number;
  label: string;
  title: string;
  member: FamilyMember;
};

export type DetailChartGeometry = {
  linePoints: string;
  hi: { x: number; y: number; text: string; visible: boolean; labelY: number };
  lo: { x: number; y: number; text: string; visible: boolean; labelY: number };
  pins: DetailPin[];
};

const W = 336;
const H = 164;
const TOP = 26;
const BOT = 30;

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
      member: trade.member,
    };
  });

  // 최고·최저 글씨가 B/S 핀과 겹치면 선 반대쪽으로 옮긴다.
  const pinNear = (px: number, py: number) =>
    pins.some((pin) => Math.abs(pin.x - px) < 46 && pin.y - py > -34 && pin.y - py < 26);
  const hiFlip = pinNear(x(hiI), y(hi));
  const loFlip = pinNear(x(loI), y(lo));

  return {
    linePoints: sp.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
    hi: {
      x: clampX(x(hiI)),
      y: y(hi),
      text: wonText(hi),
      visible: hiI !== n - 1,
      labelY: y(hi) + (hiFlip ? 22 : -22),
    },
    lo: {
      x: clampX(x(loI)),
      y: y(lo),
      text: `최저 ${toWon(lo).toLocaleString("ko-KR")}원`,
      visible: loI !== n - 1,
      labelY: y(lo) + (loFlip ? -34 : 9),
    },
    pins,
  };
}
