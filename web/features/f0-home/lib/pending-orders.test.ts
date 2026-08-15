import assert from "node:assert/strict";
import {
  pendingFromServerOrders,
  reservedSellQty,
} from "../../f2-trade/lib/scheduled-orders.js";
import { pendingCards } from "./portfolio-view";

// 서버 주문 잔고를 화면이 이미 쓰는 pending 모양으로 옮긴다. 이 변환이 틀리면 예약 수량이
// 금액으로 읽히거나(requestMode) 매도 예약이 사용 가능 수량에서 안 빠진다(reservedQty).

const limitBuy = {
  id: "o1",
  symbol: "005930",
  side: "buy",
  status: "pending",
  orderType: "limit",
  limitPrice: 70_000,
  scheduledFor: null,
  reservedAmount: 210_000,
  requestMode: "amount",
  requestedQuantity: null,
  createdAt: "2026-08-15T01:00:00.000Z",
};

const scheduledSell = {
  id: "o2",
  symbol: "259960",
  side: "sell",
  status: "scheduled",
  orderType: "market",
  limitPrice: null,
  scheduledFor: "2026-08-17",
  reservedAmount: null,
  requestMode: "quantity",
  requestedQuantity: 2,
  createdAt: "2026-08-15T02:00:00.000Z",
};

const [buy, sell] = pendingFromServerOrders([limitBuy, scheduledSell]);

// 매수 지정가 — 현금을 잠근다.
assert.equal(buy.id, "o1");
assert.equal(buy.kind, "limit");
assert.equal(buy.code, "005930");
assert.equal(buy.price, 70_000);
assert.equal(buy.amount, 210_000);
assert.equal(buy.reservedAmount, 210_000);
assert.equal(buy.reservationMode, "cash");

// 매도 예약 — 보유 수량을 잠근다. 지정가가 아니므로 price 는 없고 체결 예정일이 있다.
assert.equal(sell.kind, "next_open");
assert.equal(sell.price, undefined);
assert.equal(sell.scheduledFor, "2026-08-17");
assert.equal(sell.qty, 2);
assert.equal(sell.reservedQty, 2);
assert.equal(sell.reservationMode, "held");

// 사용 가능 수량 계산이 서버 목록에서도 그대로 돌아야 한다 — 여기가 어긋나면 이미 팔기로
// 한 수량을 다시 팔 수 있게 된다.
assert.equal(reservedSellQty([buy, sell], "259960"), 2);
assert.equal(reservedSellQty([buy, sell], "005930"), 0);

// 계좌 화면 카드도 같은 목록으로 그려진다.
const cards = pendingCards({ cash: 0, holdings: [], pending: [buy, sell] });
assert.equal(cards.length, 2);

// 서버는 quantity, 화면은 qty 다. 매수 수량 예약이 금액 예약으로 읽히면 안 된다.
const qtyBuy = pendingFromServerOrders([
  { ...limitBuy, orderType: "market", scheduledFor: "2026-08-17", requestMode: "quantity", requestedQuantity: 3 },
])[0];
assert.equal(qtyBuy.requestMode, "qty");
assert.equal(qtyBuy.requestedQty, 3);

// 금액 예약은 수량을 남기지 않는다.
assert.equal(buy.requestMode, "amount");
assert.equal(buy.requestedQty, null);

// 빈 목록은 빈 배열이다 — 예약이 없을 때 화면이 옛 목록을 들고 있으면 안 된다.
assert.deepEqual(pendingFromServerOrders([]), []);
