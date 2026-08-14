// >>> scheduled-order-engine — GENERATED from features/f2-trade/lib/scheduled-orders.js
// 여기를 고치지 말고 원본을 고친 뒤 `node scripts/ui-build.mjs build` 를 돌린다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function shiftedKst(value) {
  return new Date(asDate(value).getTime() + KST_OFFSET_MS);
}

function kstDateKey(value) {
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

function isWeekdayKey(key) {
  const day = keyAtNoonUtc(key).getUTCDay();
  return day >= 1 && day <= 5;
}

function isRegularMarketOpen(value = new Date()) {
  const minute = kstMinute(value);
  const day = kstDay(value);
  return day >= 1 && day <= 5 && minute >= 9 * 60 && minute < 15 * 60 + 30;
}

function nextOpeningDate(value = new Date()) {
  const key = kstDateKey(value);
  const minute = kstMinute(value);
  if (isWeekdayKey(key) && minute < 9 * 60) return key;
  let next = addDays(key, 1);
  while (!isWeekdayKey(next)) next = addDays(next, 1);
  return next;
}

function findConfirmedOpeningCandle(points, scheduledFor, now = new Date()) {
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

function reservedSellQty(pending, code) {
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

function removeHolding(holdings, code, qty) {
  const index = holdings.findIndex((holding) => holding.code === code);
  if (index < 0 || holdings[index].qty + 0.000001 < qty) return false;
  const left = holdings[index].qty - qty;
  if (left < 0.005) holdings.splice(index, 1);
  else holdings[index] = { ...holdings[index], qty: left };
  return true;
}

function replaceRecord(records, orderId, patch) {
  return (records || []).map((record) => record.order_id === orderId ? { ...record, ...patch } : record);
}

function matchingRecord(records, orderId) {
  return (records || []).find((record) => record.order_id === orderId) || null;
}

function migrateLegacyAccount(account, sellRecords = []) {
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

function cancelPendingOrder(account, order) {
  const next = cloneAccount(account);
  if ((order.side || "buy") === "buy") {
    next.cash += Number(order.reservedAmount ?? order.amount) || 0;
  }
  next.pending = next.pending.filter((item) => item.id !== order.id);
  return next;
}

function markOrderCancelled(records, orderId, at = new Date()) {
  return replaceRecord(records, orderId, { order_status: "cancelled", cancelled_at: asDate(at).toISOString() });
}

function settleScheduledOrder({ account, records, sellRecords, order, candle, now = new Date() }) {
  const unchanged = { account, records, sellRecords, effect: null };
  if (!order || order.kind !== "next_open" || !candle) return unchanged;
  const sourceRecords = order.side === "sell" ? sellRecords : records;
  const record = matchingRecord(sourceRecords, order.id);
  if (!record || record.order_status !== "scheduled") return unchanged;
  const price = Number(candle.open);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(candle.volume) || candle.volume <= 0) return unchanged;

  const next = cloneAccount(account);
  next.pending = next.pending.filter((item) => item.id !== order.id);
  const filledAt = asDate(now).toISOString();

  if (order.side === "sell") {
    const qty = Number(order.reservedQty ?? order.qty) || 0;
    if (qty <= 0 || !removeHolding(next.holdings, order.code, qty)) {
      const rejected = { order_status: "rejected", rejection_reason: "insufficient_shares", rejected_at: filledAt };
      return { account: next, records, sellRecords: replaceRecord(sellRecords, order.id, rejected), effect: { type: "rejected", side: "sell", orderId: order.id } };
    }
    const proceeds = price * qty;
    next.cash += proceeds;
    const patch = { order_status: "filled", amount_krw: proceeds, filled_at: filledAt, filled_price: price };
    return {
      account: next,
      records,
      sellRecords: replaceRecord(sellRecords, order.id, patch),
      // plan 은 서버 저장 계약(F2 SPEC §7.1)이 요구하는 부가 필드다. 주문 접수 때 고른 값을
      // 그대로 옮긴다 — 예약 체결은 사용자가 다시 답하지 않으므로 새로 판정하지 않는다.
      effect: {
        type: "filled", side: "sell", orderId: order.id, code: order.code, price, qty,
        reason: record.sell_reason_code,
        plan: {
          plan_match: typeof record.plan_match === "boolean" ? record.plan_match : null,
          plan_changed_reason: record.change_reason_code ?? null,
        },
      },
    };
  }

  const reservedAmount = Number(order.reservedAmount ?? order.amount) || 0;
  const requestedQty = Number(order.requestedQty) || 0;
  const byQty = order.requestMode === "qty" && requestedQty > 0;
  const cost = byQty ? requestedQty * price : reservedAmount;
  if (reservedAmount <= 0 || (byQty && cost > reservedAmount + 0.000001)) {
    next.cash += reservedAmount;
    const rejected = { order_status: "rejected", rejection_reason: "opening_price_exceeds_reserved_cash", rejected_at: filledAt };
    return { account: next, records: replaceRecord(records, order.id, rejected), sellRecords, effect: { type: "rejected", side: "buy", orderId: order.id } };
  }
  const qty = byQty ? requestedQty : reservedAmount / price;
  if (byQty) next.cash += reservedAmount - cost;
  addHolding(next.holdings, order.code, qty, price, cost);
  const patch = { order_status: "filled", amount_krw: cost, qty: Math.round(qty * 10000) / 10000, filled_at: filledAt, filled_price: price };
  return {
    account: next,
    records: replaceRecord(records, order.id, patch),
    sellRecords,
    effect: {
      type: "filled", side: "buy", orderId: order.id, code: order.code, price, qty,
      reason: record.reason_code,
      plan: {
        plan_code: record.plan_code ?? null,
        plan_target_price: record.plan_target_price ?? null,
        memo: record.memo ?? null,
      },
    },
  };
}
// <<< scheduled-order-engine
