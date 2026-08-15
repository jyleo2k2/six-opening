import { findConfirmedOpeningCandle } from "../../../features/f2-trade/lib/scheduled-orders.js";

/**
 * 장외 예약(`scheduled`) 주문을 다음 거래일 시가로 정산한다.
 *
 * 지금까지 이 판단은 화면(app.html)이 로컬 기록으로 했다. 예약이 DB 로 올라온 이상 정산도
 * 서버가 해야 한다 — 브라우저를 안 열면 영영 체결되지 않는 예약은 예약이 아니다.
 *
 * 체결 기준은 화면이 쓰던 규칙 그대로 `findConfirmedOpeningCandle` 하나를 공유한다. 예약일
 * 이후의 확인된 일봉(거래량이 있고, 오늘 것이라면 09:00 이후) 중 가장 이른 것을 쓴다.
 * 휴일·거래정지·시가 미확인이면 아무것도 하지 않고 예약을 그대로 둔다.
 *
 * 중복 체결은 `settle_order` 가 막는다. 이미 끝난 주문에는 `settled:false` 만 돌아오므로
 * 이 함수를 몇 번 불러도 결과가 같다.
 */

export type ScheduledOrder = {
  id: string;
  symbol: string;
  scheduledFor: string;
};

export type SettleDeps = {
  loadDailyCandles(symbol: string): Promise<unknown[]>;
  settle(orderId: string, fillPrice: number): Promise<{ order_status: string; settled: boolean }>;
};

export type SettleOutcome = {
  orderId: string;
  status: string;
};

export async function settleDueOrders(
  deps: SettleDeps,
  orders: ScheduledOrder[],
  now = new Date(),
): Promise<SettleOutcome[]> {
  const settled: SettleOutcome[] = [];
  // 같은 종목을 여러 번 예약했으면 일봉을 한 번만 읽는다.
  const candlesBySymbol = new Map<string, unknown[]>();

  for (const order of orders) {
    if (!candlesBySymbol.has(order.symbol)) {
      try {
        candlesBySymbol.set(order.symbol, await deps.loadDailyCandles(order.symbol));
      } catch {
        // 한 종목의 일봉을 못 읽어도 나머지 예약은 정산한다.
        candlesBySymbol.set(order.symbol, []);
      }
    }
    const candle = findConfirmedOpeningCandle(
      candlesBySymbol.get(order.symbol),
      order.scheduledFor,
      now,
    ) as { open?: number } | null;
    if (!candle || !Number.isFinite(Number(candle.open)) || Number(candle.open) <= 0) continue;

    try {
      const result = await deps.settle(order.id, Number(candle.open));
      if (result.settled) settled.push({ orderId: order.id, status: result.order_status });
    } catch {
      // 정산 실패(잔액·수량 변동 등)는 예약을 남긴 채 다음 조회에서 다시 시도한다.
    }
  }

  return settled;
}
