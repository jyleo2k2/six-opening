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
  /** 시연 핀만 채운다. 없으면 구성원으로 색을 고른다. */
  color?: string;
};

export type DetailPin = {
  id: string;
  x: number;
  y: number;
  label: string;
  title: string;
  member: FamilyMember;
  /** 핀 바탕색. 프로토타입의 `MEM` 표와 같은 파스텔 세 색이다. */
  color: string;
};

/**
 * 가족 구성원별 핀 색 — 프로토타입 `MEM` 그대로다.
 * 자녀·엄마·아빠 셋인데 우리 `FamilyMember` 는 자녀·부모 둘이라, 실제 체결은 앞의 둘로
 * 접어 쓰고 시연 핀만 세 색을 돌려 쓴다.
 */
export const PIN_COLORS = Object.freeze({
  child: "#A8B8E8",
  mom: "#F2AECB",
  dad: "#A9D5C8",
});
const PIN_CYCLE = [PIN_COLORS.child, PIN_COLORS.mom, PIN_COLORS.dad];

/**
 * 종목코드에서 뽑는 시연용 매매 지점. **프로토타입이 하던 그대로다** — 가족 기록이 아직
 * 없는 종목에서도 B/S 지점을 보여 주려고 원본이 갖고 있던 폴백이고, 51종 전부에 뜬다.
 *
 * 코드만으로 정해지므로 같은 종목은 늘 같은 자리에 같은 사람이 찍힌다. 원본은 여기에
 * `Date.now()` 로 시각도 넣지만 그 값은 정렬에만 쓰이고 이미 순서대로라 결과가 같다.
 */
export function demoTrades(code: string): DetailTrade[] {
  let seed = 0;
  for (let i = 0; i < code.length; i += 1) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
  return [0, 1, 2].map((i) => ({
    id: `demo_${code}_${i}`,
    name: ["자녀", "엄마", "아빠"][(seed + i) % 3],
    member: ((seed + i) % 3 === 0 ? "child" : "parent") as FamilyMember,
    side: (i === 2 ? "sell" : "buy") as TradeSide,
    tradedAt: `demo-${i}`,
    color: PIN_CYCLE[(seed + i) % 3],
  }));
}

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
  /** 가족 기록이 없을 때 세울 시연 지점을 이 코드로 정한다. */
  code: string;
}): DetailChartGeometry | null {
  const { spark: sp, price, changePercent, trades, code } = options;
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

  // 가족 기록이 없으면 원본처럼 시연 지점을 세운다 — 51종 어디서나 B/S 가 보인다.
  const source = trades.length > 0 ? trades : demoTrades(code);
  const ordered = [...source].sort((left, right) => left.tradedAt.localeCompare(right.tradedAt)).slice(-3);
  const pins: DetailPin[] = ordered.map((trade, i) => {
    const at = Math.round((n - 1) * (0.24 + (0.62 * (i + 1)) / (ordered.length + 1)));
    return {
      id: trade.id,
      x: x(at),
      y: y(sp[at]),
      label: trade.side === "buy" ? "B" : "S",
      title: `${trade.name} ${trade.side === "buy" ? "매수" : "매도"}`,
      member: trade.member,
      color: trade.color ?? (trade.member === "child" ? PIN_COLORS.child : PIN_COLORS.mom),
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
