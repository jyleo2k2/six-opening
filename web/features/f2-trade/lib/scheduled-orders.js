const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function shiftedKst(value) {
  return new Date(asDate(value).getTime() + KST_OFFSET_MS);
}

export function kstDateKey(value) {
  const date = shiftedKst(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function kstDay(value) {
  return shiftedKst(value).getUTCDay();
}

function kstMinute(value) {
  const date = shiftedKst(value);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function keyAtNoonUtc(key) {
  return new Date(`${key}T12:00:00Z`);
}

function addDays(key, count) {
  return kstDateKey(new Date(keyAtNoonUtc(key).getTime() + count * DAY_MS - KST_OFFSET_MS));
}

export function isWeekdayKey(key) {
  const day = keyAtNoonUtc(key).getUTCDay();
  return day >= 1 && day <= 5;
}

export function isRegularMarketOpen(value = new Date()) {
  const minute = kstMinute(value);
  const day = kstDay(value);
  return day >= 1 && day <= 5 && minute >= 9 * 60 && minute < 15 * 60 + 30;
}

export function nextOpeningDate(value = new Date()) {
  const key = kstDateKey(value);
  const minute = kstMinute(value);
  if (isWeekdayKey(key) && minute < 9 * 60) return key;
  let next = addDays(key, 1);
  while (!isWeekdayKey(next)) next = addDays(next, 1);
  return next;
}

export function findConfirmedOpeningCandle(points, scheduledFor, now = new Date()) {
  if (!Array.isArray(points) || !scheduledFor) return null;
  const today = kstDateKey(now);
  const nowMinute = kstMinute(now);
  return points
    .filter((point) => {
      if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.open) || point.open <= 0) return false;
      if (!Number.isFinite(point.volume) || point.volume <= 0) return false;
      const candleDate = kstDateKey(point.time * 1000);
      if (candleDate < scheduledFor || candleDate > today) return false;
      return candleDate < today || nowMinute >= 9 * 60;
    })
    .sort((left, right) => left.time - right.time)[0] || null;
}

export function reservedSellQty(pending, code) {
  return (Array.isArray(pending) ? pending : []).reduce((sum, order) => {
    if (order && order.side === "sell" && order.code === code) {
      return sum + (Number(order.reservedQty ?? order.qty) || 0);
    }
    return sum;
  }, 0);
}

function cloneAccount(account) {
  return {
    ...account,
    cash: Number(account.cash) || 0,
    holdings: (account.holdings || []).map((holding) => ({ ...holding })),
    pending: (account.pending || []).map((order) => ({ ...order })),
  };
}

function addHolding(holdings, code, qty, price, cost) {
  const index = holdings.findIndex((holding) => holding.code === code);
  if (index < 0) {
    holdings.push({ code, qty, avg: price });
    return;
  }
  const holding = holdings[index];
  const nextQty = holding.qty + qty;
  holdings[index] = {
    code,
    qty: nextQty,
    avg: nextQty > 0 ? (holding.avg * holding.qty + cost) / nextQty : price,
  };
}

function matchingRecord(records, orderId) {
  return (records || []).find((record) => record.order_id === orderId) || null;
}

export function migrateLegacyAccount(account, sellRecords = []) {
  const next = cloneAccount(account);
  next.pending = next.pending.map((order) => {
    if (order.side === "sell" && !order.reservationMode) {
      const record = matchingRecord(sellRecords, order.id);
      const qty = Number(order.qty) || 0;
      if (qty > 0) addHolding(next.holdings, order.code, qty, Number(record && record.avg) || Number(order.price) || 0, (Number(record && record.avg) || Number(order.price) || 0) * qty);
      return { ...order, kind: order.kind || "limit", reservedQty: qty, reservationMode: "held" };
    }
    if (order.side !== "sell" && !order.reservationMode) {
      return { ...order, side: "buy", kind: order.kind || "limit", reservedAmount: Number(order.amount) || 0, reservationMode: "cash" };
    }
    return order;
  });
  return next;
}


/**
 * `GET /api/orders` 의 미체결 주문을 화면이 이미 쓰는 `pending` 모양으로 바꾼다.
 *
 * 지정가·예약 주문은 증권사가 보관하는 지시라 브라우저에 두면 안 된다. 서버로 옮기면서
 * **소비자는 그대로 둔다** — `reservedSellQty`·`pendingCards`·`accountTotalAsset` 이 읽는
 * 필드 이름을 여기서 맞춰 주면 목록의 출처만 바뀐다.
 *
 * 매수는 현금을 잠그고(`cash`) 매도는 보유 수량을 잠근다(`held`).
 *
 * @param {Array<Record<string, any>>} orders
 * @returns {Array<Record<string, any>>}
 */
export function pendingFromServerOrders(orders) {
  return (Array.isArray(orders) ? orders : []).map((order) => {
    const shared = {
      id: order.id,
      kind: order.orderType === "limit" ? "limit" : "next_open",
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
      // 서버는 `quantity`, 화면은 `qty` 를 쓴다. 값이 어긋나면 수량 예약이 금액으로 읽힌다.
      requestMode: order.requestMode === "quantity" ? "qty" : "amount",
      requestedQty: order.requestedQuantity ?? null,
      reservationMode: "cash",
    };
  });
}
