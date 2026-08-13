import type { FamilyMember, Trade } from "../types/trade";

/**
 * 차트 위 가족 매매 지점 마커 계산. 통합문서 v2.7 §10 · F11 SPEC §6
 *
 * 예전에는 app.html 안의 SVG 차트에 직접 그리려고 픽셀 좌표(x·y·삼각형 points)를
 * 계산했다. 차트가 lightweight-charts 로 바뀌면서 좌표는 라이브러리가 잡는다.
 * 여기서는 **무엇을 언제 어떤 라벨로 찍을지**만 정한다.
 *
 * x 를 거래 순번으로 균등 분할하던 방식도 같이 없앴다. 마커를 봉의 시각에 붙이므로
 * 체결이 몰려도 시간 간격이 왜곡되지 않는다 (SPEC §7.2 우선순위 5).
 *
 * 마커의 y 위치가 곧 체결가이므로 단가는 가릴 수 없고 가릴 이유도 없다. 그러나
 * 수량은 자산 규모를 드러내므로 본인 마커에만 붙인다 — 실잔액을 연동하지 않기로 한
 * §8과 같은 이유다. 비교 대상은 판단이지 금액이 아니다.
 */

export type TradeMarker = {
  id: string;
  member: FamilyMember;
  side: Trade["side"];
  /** 마커를 붙일 봉의 시각(초). 라이브러리의 `time`. */
  time: number;
  /** 체결가. 라이브러리의 `price`. */
  price: number;
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

/**
 * 체결 시각을 그 시각 이하의 마지막 봉에 붙인다.
 *
 * 일봉·주봉은 봉 하나가 하루·한 주를 덮으므로 체결 시각과 정확히 같은 봉은 없다.
 * 첫 봉보다 이른 체결은 차트 범위 밖이라 `null` 을 돌려 걸러낸다 — 억지로 첫 봉에
 * 붙이면 있지도 않은 날짜에 마커가 찍힌다.
 */
function snapToCandle(tradedAt: number, candleTimes: readonly number[]) {
  let picked: number | null = null;
  for (const time of candleTimes) {
    if (time > tradedAt) break;
    picked = time;
  }
  return picked;
}

export function buildTradeMarkers(options: {
  trades: readonly Trade[];
  /** 열람 계정. 모르면 `null` 을 넘긴다 — 어느 마커에도 수량을 붙이지 않는다. */
  viewer: FamilyMember | null;
  /** 차트에 실제로 그려진 봉의 시각들. 오름차순이어야 한다. */
  candleTimes: readonly number[];
}): TradeMarker[] {
  const { trades, viewer, candleTimes } = options;
  if (trades.length === 0 || candleTimes.length === 0) return [];

  const markers: TradeMarker[] = [];
  for (const trade of trades) {
    const tradedAt = Math.floor(new Date(trade.tradedAt).getTime() / 1000);
    if (!Number.isFinite(tradedAt)) continue;
    const time = snapToCandle(tradedAt, candleTimes);
    if (time === null) continue;

    const own = viewer !== null && trade.member === viewer;
    markers.push({
      id: trade.id,
      member: trade.member,
      side: trade.side,
      time,
      price: trade.price,
      label: `${MEMBER_NAME[trade.member]} ${trade.side === "buy" ? "매수" : "매도"}${
        own ? ` ${trade.quantity}주` : ""
      }`,
    });
  }
  return markers;
}
