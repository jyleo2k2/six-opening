import type { FamilyMember, Trade } from "../types/trade";

/**
 * 차트 위 가족 매매 지점 마커 계산. 통합문서 v2.7 §10
 *
 * 마커의 y 위치가 곧 체결가이므로 단가는 가릴 수 없고 가릴 이유도 없다.
 * 그러나 수량·금액은 자산 규모를 드러내므로 본인 마커에만 붙인다 — 실잔액을
 * 연동하지 않기로 한 §8과 같은 이유다. 비교 대상은 판단이지 금액이 아니다.
 */

export type TradeMarker = {
  id: string;
  member: FamilyMember;
  side: Trade["side"];
  x: number;
  y: number;
  /** 삼각형 좌표. 매수는 위로(▲), 매도는 아래로(▼). */
  points: string;
  label: string;
};

export const MEMBER_NAME: Record<FamilyMember, string> = {
  child: "민지",
  parent: "엄마",
};

/** 이 종목의 체결만 시간순으로 모은다. 미체결 주문은 넣지 않는다. */
export function symbolTrades(trades: readonly Trade[], symbol: string) {
  return trades
    .filter((trade) => trade.symbol === symbol)
    .sort((left, right) => left.tradedAt.localeCompare(right.tradedAt));
}

export function buildTradeMarkers(options: {
  trades: readonly Trade[];
  viewer: FamilyMember;
  min: number;
  range: number;
  width: number;
  height: number;
}): TradeMarker[] {
  const { trades, viewer, min, range, width, height } = options;
  if (trades.length === 0) return [];

  return trades.map((trade, index) => {
    const x =
      trades.length === 1 ? width / 2 : (index / (trades.length - 1)) * (width - 24) + 12;
    const ratio = Math.min(Math.max((trade.price - min) / range, 0), 1);
    const y = height - ratio * (height - 18) - 9;
    const own = trade.member === viewer;

    return {
      id: trade.id,
      member: trade.member,
      side: trade.side,
      x,
      y,
      points:
        trade.side === "buy"
          ? `${x},${y - 9} ${x - 7},${y + 4} ${x + 7},${y + 4}`
          : `${x},${y + 9} ${x - 7},${y - 4} ${x + 7},${y - 4}`,
      label: `${MEMBER_NAME[trade.member]} ${trade.side === "buy" ? "매수" : "매도"}${
        own ? ` ${trade.quantity}주` : ""
      }`,
    };
  });
}

/** 체결가가 차트 값 범위 밖일 수 있으므로 마커 가격까지 포함해 축을 잡는다. */
export function chartBounds(values: readonly number[], trades: readonly Trade[]) {
  const prices = [...values, ...trades.map((trade) => trade.price)];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, range: max - min || 1 };
}
