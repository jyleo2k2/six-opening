import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cancelPendingOrder,
  findConfirmedOpeningCandle,
  isRegularMarketOpen,
  migrateLegacyAccount,
  nextOpeningDate,
  reservedSellQty,
  settleScheduledOrder,
} from "./scheduled-orders.js";

const date = (value: string) => new Date(value);
const candle = (day: string, open: number, volume = 10) => ({
  time: Math.floor(date(`${day}T00:00:00+09:00`).getTime() / 1000),
  open,
  high: open,
  low: open,
  close: open,
  price: open,
  volume,
});

test("정규장 경계는 KST 09:00 이상 15:30 미만이다", () => {
  assert.equal(isRegularMarketOpen(date("2026-08-14T08:59:59+09:00")), false);
  assert.equal(isRegularMarketOpen(date("2026-08-14T09:00:00+09:00")), true);
  assert.equal(isRegularMarketOpen(date("2026-08-14T15:29:59+09:00")), true);
  assert.equal(isRegularMarketOpen(date("2026-08-14T15:30:00+09:00")), false);
  assert.equal(isRegularMarketOpen(date("2026-08-15T10:00:00+09:00")), false);
});

test("장전은 당일, 금요일 장 마감 뒤는 월요일을 예약일로 잡는다", () => {
  assert.equal(nextOpeningDate(date("2026-08-14T08:00:00+09:00")), "2026-08-14");
  assert.equal(nextOpeningDate(date("2026-08-14T16:00:00+09:00")), "2026-08-17");
});

test("휴일·거래정지 봉은 건너뛰고 거래량이 확인된 첫 시가를 고른다", () => {
  const points = [candle("2026-08-17", 100, 0), candle("2026-08-18", 120, 5), candle("2026-08-19", 130, 5)];
  assert.equal(findConfirmedOpeningCandle(points, "2026-08-17", date("2026-08-18T09:05:00+09:00"))?.open, 120);
  assert.equal(findConfirmedOpeningCandle(points, "2026-08-17", date("2026-08-18T08:59:00+09:00")), null);
});

test("금액 매수는 가격 갭과 무관하게 예약 금액 전부를 소수 수량으로 체결한다", () => {
  const order = { id: "ord_1", kind: "next_open", side: "buy", code: "005930", requestMode: "amount", reservedAmount: 1000 };
  const result = settleScheduledOrder({
    account: { name: "아이", cash: 9000, holdings: [], pending: [order] },
    records: [{ order_id: "ord_1", order_status: "scheduled", reason_code: "buy_news" }],
    sellRecords: [], order, candle: candle("2026-08-17", 120), now: date("2026-08-17T09:01:00+09:00"),
  });
  assert.equal(result.account.cash, 9000);
  assert.equal(result.account.holdings[0].qty, 1000 / 120);
  assert.equal(result.records[0].order_status, "filled");
  assert.equal(result.effect?.type, "filled");
});

test("수량 매수는 시가 상승으로 예약 현금을 넘으면 거절하고 전액 반환한다", () => {
  const order = { id: "ord_2", kind: "next_open", side: "buy", code: "005930", requestMode: "qty", requestedQty: 10, reservedAmount: 1000 };
  const result = settleScheduledOrder({
    account: { name: "아이", cash: 9000, holdings: [], pending: [order] },
    records: [{ order_id: "ord_2", order_status: "scheduled" }], sellRecords: [], order,
    candle: candle("2026-08-17", 120), now: date("2026-08-17T09:01:00+09:00"),
  });
  assert.equal(result.account.cash, 10000);
  assert.equal(result.account.holdings.length, 0);
  assert.equal(result.records[0].order_status, "rejected");
});

test("매도 예약 수량은 사용 가능 수량에서 빠지고 취소해도 총 보유는 변하지 않는다", () => {
  const order = { id: "ord_3", kind: "next_open", side: "sell", code: "005930", reservedQty: 3, reservationMode: "held" };
  const account = { name: "아이", cash: 0, holdings: [{ code: "005930", qty: 5, avg: 80 }], pending: [order] };
  assert.equal(reservedSellQty(account.pending, "005930"), 3);
  assert.deepEqual(cancelPendingOrder(account, order).holdings, account.holdings);
});

test("매수 예약 취소는 맡아둔 현금을 정확히 돌려준다", () => {
  const order = { id: "ord_buy_cancel", kind: "next_open", side: "buy", code: "005930", reservedAmount: 1234 };
  const cancelled = cancelPendingOrder({ name: "아이", cash: 8766, holdings: [], pending: [order] }, order);
  assert.equal(cancelled.cash, 10000);
  assert.equal(cancelled.pending.length, 0);
});

test("매도 예약은 시가에 한 번 체결해 보유 수량과 현금을 함께 갱신한다", () => {
  const order = { id: "ord_sell", kind: "next_open", side: "sell", code: "005930", reservedQty: 2, reservationMode: "held" };
  const first = settleScheduledOrder({
    account: { name: "아이", cash: 100, holdings: [{ code: "005930", qty: 5, avg: 80 }], pending: [order] },
    records: [], sellRecords: [{ order_id: "ord_sell", order_status: "scheduled", sell_reason_code: "sell_plan_time" }],
    order, candle: candle("2026-08-17", 120), now: date("2026-08-17T09:01:00+09:00"),
  });
  assert.equal(first.account.cash, 340);
  assert.equal(first.account.holdings[0].qty, 3);
  assert.equal(first.sellRecords[0].order_status, "filled");
  const second = settleScheduledOrder({ account: first.account, records: first.records, sellRecords: first.sellRecords, order, candle: candle("2026-08-17", 120) });
  assert.equal(second.account, first.account);
  assert.equal(second.effect, null);
});

test("구버전 지정가 매도는 한 번만 보유 수량으로 복구해 자산 증발을 막는다", () => {
  const legacy = { name: "아이", cash: 0, holdings: [], pending: [{ id: "ord_4", side: "sell", code: "005930", qty: 2, price: 100 }] };
  const migrated = migrateLegacyAccount(legacy, [{ order_id: "ord_4", avg: 80 }]);
  assert.deepEqual(migrated.holdings, [{ code: "005930", qty: 2, avg: 80 }]);
  assert.deepEqual(migrateLegacyAccount(migrated, []).holdings, migrated.holdings);
});

test("이미 체결 상태인 주문은 다시 적용하지 않는다", () => {
  const order = { id: "ord_5", kind: "next_open", side: "buy", code: "005930", reservedAmount: 1000 };
  const account = { name: "아이", cash: 9000, holdings: [], pending: [order] };
  const result = settleScheduledOrder({
    account, records: [{ order_id: "ord_5", order_status: "filled" }], sellRecords: [], order,
    candle: candle("2026-08-17", 100), now: date("2026-08-17T09:01:00+09:00"),
  });
  assert.equal(result.account, account);
  assert.equal(result.effect, null);
});

test("생성된 프로토타입은 예약 엔진과 접수·체결 구분 문구를 포함하고 문법이 유효하다", () => {
  const html = readFileSync("public/ui/app.html", "utf8");
  assert.match(html, /GENERATED from features\/f2-trade\/lib\/scheduled-orders\.js/);
  assert.match(html, /주문 접수와 체결은 달라/);
  const start = html.indexOf('<script type="text/x-dc"');
  const body = html.indexOf(">", start) + 1;
  const end = html.indexOf("</script>", body);
  assert.ok(start >= 0 && body > start && end > body);
  assert.doesNotThrow(() => new Function(html.slice(body, end)));
});
