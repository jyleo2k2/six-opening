import type { PendingOrder } from "./portfolio-view";

/**
 * `GET /api/orders` 의 미체결 주문을 화면이 이미 쓰는 `pending` 모양으로 바꾼다.
 *
 * 지정가·예약 주문은 증권사가 보관하는 지시라 브라우저에 두면 안 된다(§10-7). 서버로
 * 옮기면서 **소비자는 그대로 둔다** — `reservedSellQty`·`pendingCards`·`renderVals` 가
 * 읽는 필드 이름을 여기서 맞춰 주면 목록의 출처만 바뀐다.
 *
 * 필드 대응은 `renderVals-return-3-buy.js` 와 `renderVals-return-6-sell.js` 가 만들던
 * 항목과 같다. 매수는 현금을 잠그고(`cash`) 매도는 보유 수량을 잠근다(`held`).
 */
export type ServerOrder = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  status: string;
  orderType: "market" | "limit";
  limitPrice: number | null;
  scheduledFor: string | null;
  reservedAmount: number | null;
  requestMode: string | null;
  requestedQuantity: number | null;
  createdAt?: string;
};

/** 서버는 `quantity`, 화면은 `qty` 를 쓴다. 값이 어긋나면 예약 수량이 금액으로 읽힌다. */
const requestMode = (mode: string | null) => (mode === "quantity" ? "qty" : "amount");

export function pendingFromServerOrders(orders: ServerOrder[]): PendingOrder[] {
  return orders.map((order) => {
    const kind = order.orderType === "limit" ? "limit" : "next_open";
    const shared = {
      id: order.id,
      kind,
      side: order.side,
      code: order.symbol,
      price: order.limitPrice ?? undefined,
      scheduledFor: order.scheduledFor ?? undefined,
      createdAt: order.createdAt,
    };
    if (order.side === "sell") {
      const qty = order.requestedQuantity ?? 0;
      return { ...shared, qty, reservedQty: qty, reservationMode: "held" };
    }
    const amount = order.reservedAmount ?? 0;
    return {
      ...shared,
      amount,
      reservedAmount: amount,
      requestMode: requestMode(order.requestMode),
      requestedQty: order.requestedQuantity ?? null,
      reservationMode: "cash",
    };
  });
}
