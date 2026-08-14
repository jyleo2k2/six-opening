import type { FamilyMember } from "../types/trade";

/**
 * 차트 위 가족 매매 지점 마커 계산. 통합문서 v2.7 §10 · F11 SPEC §6
 *
 * 예전에는 app.html 안의 SVG 차트에 직접 그리려고 픽셀 좌표(x·y·삼각형 points)를
 * 계산했다. 차트가 lightweight-charts 로 바뀌면서 좌표는 라이브러리가 잡는다.
 * 여기서는 **무엇을 언제 어떤 라벨로** 찍을지만 정한다.
 *
 * x 를 거래 순번으로 균등 분할하던 방식도 같이 없앴다. 마커를 봉의 시각에 붙이므로
 * 체결이 몰려도 시간 간격이 왜곡되지 않는다.
 *
 * 마커의 y 위치가 곧 체결가이므로 단가는 가릴 수 없고 가릴 이유도 없다. 가리는 것은
 * 수량이며 — 자산 규모를 드러내므로 — **그 마스킹은 서버가 한다**. `GET /api/trades`
 * 가 남의 체결에서 `quantity` 를 지우고 보내므로 여기서는 있으면 쓰고 없으면 만다.
 * 열람 계정을 클라이언트가 받아 가리던 방식은 걷어냈다 (SPEC §6.1).
 */

/** 마커 하나의 원본. `GET /api/trades` 응답 한 줄과 같은 모양이다. */
export type ChartTrade = {
  id: string;
  /** 체결한 사람 이름. `profiles.name` 을 그대로 라벨에 쓴다. */
  name: string;
  /** 마커 색을 정한다. `profiles.parent_child`. */
  member: FamilyMember;
  side: "buy" | "sell";
  /** 체결가. 마커의 y 가 된다. */
  price: number;
  /** 본인 체결만 수량이 온다. 남의 것은 `null` — 서버가 지운 자리다. */
  quantity: number | null;
  /** ISO 8601 체결 시각. `transactions.created_at`. */
  tradedAt: string;
};

export type TradeMarker = {
  id: string;
  member: FamilyMember;
  side: ChartTrade["side"];
  /** 마커를 붙일 봉의 시각(초). 라이브러리의 `time`. */
  time: number;
  /** 체결가. 라이브러리의 `price`. */
  price: number;
  label: string;
};

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
  /** 이 종목의 체결. 종목 필터는 서버가 이미 했다 (SPEC §6.1). */
  trades: readonly ChartTrade[];
  /** 차트에 실제로 그려진 봉의 시각들. 오름차순이어야 한다. */
  candleTimes: readonly number[];
}): TradeMarker[] {
  const { trades, candleTimes } = options;
  if (trades.length === 0 || candleTimes.length === 0) return [];

  /**
   * 봉 하나에 방향 하나씩만 남긴다. 키는 `봉 시각|매수·매도`.
   *
   * 같은 날 다섯 번 산 체결은 x 가 모두 같고, 가격이 달라도 세로 차이가 몇 px 에 그쳐
   * 뱃지가 한 덩어리로 뭉갠다. 겹쳐 봐야 몇 건인지 못 읽으므로 대표 하나만 찍는다.
   *
   * 매수·매도는 키를 나눠 따로 남긴다. 화면에서 위아래로 갈라 놓았으므로 서로 가리지
   * 않고, 하나로 합치면 "그날 사고팔았다"가 통째로 사라진다.
   *
   * 대표는 **그 봉의 마지막 체결**이다. 오름차순으로 돌며 덮어쓰므로 뒤가 이긴다.
   * `Map` 은 처음 넣은 자리를 지키므로 덮어써도 마커 순서는 시간순 그대로다.
   */
  const byCandleSide = new Map<string, TradeMarker>();
  // 서버가 created_at 오름차순으로 주지만, 마커 순서가 응답 순서에 매달리지 않게 한 번 더 세운다.
  const ordered = [...trades].sort((left, right) => left.tradedAt.localeCompare(right.tradedAt));

  for (const trade of ordered) {
    const tradedAt = Math.floor(new Date(trade.tradedAt).getTime() / 1000);
    if (!Number.isFinite(tradedAt)) continue;
    const time = snapToCandle(tradedAt, candleTimes);
    if (time === null) continue;

    const quantity = trade.quantity === null ? "" : ` ${trade.quantity}주`;
    byCandleSide.set(`${time}|${trade.side}`, {
      id: trade.id,
      member: trade.member,
      side: trade.side,
      time,
      price: trade.price,
      label: `${trade.name} ${trade.side === "buy" ? "매수" : "매도"}${quantity}`,
    });
  }
  return [...byCandleSide.values()];
}
