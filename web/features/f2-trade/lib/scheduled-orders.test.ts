import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  findConfirmedOpeningCandle,
  isRegularMarketOpen,
  migrateLegacyAccount,
  nextOpeningDate,
  reservedSellQty,
} from "./scheduled-orders.js";

// 예약 체결·취소 규칙은 서버로 갔다(`settle_order`·`cancel_order`). 여기 남은 것은 주문을
// 넣을 때 화면이 판단하는 시각 규칙과, 서버 주문 목록을 읽는 쪽이 쓰는 계산이다.
// 정산 흐름은 `app/api/orders/settle.test.ts`, 목록 변환은
// `features/f0-home/lib/pending-orders.test.ts` 가 본다.

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

test("매도 예약 수량은 사용 가능 수량에서 빠진다", () => {
  const pending = [{ id: "ord_3", kind: "next_open", side: "sell", code: "005930", reservedQty: 3, reservationMode: "held" }];
  assert.equal(reservedSellQty(pending, "005930"), 3);
  assert.equal(reservedSellQty(pending, "000660"), 0);
});

test("구버전 지정가 매도는 한 번만 보유 수량으로 복구해 자산 증발을 막는다", () => {
  const legacy = { name: "아이", cash: 0, holdings: [], pending: [{ id: "ord_4", side: "sell", code: "005930", qty: 2, price: 100 }] };
  const migrated = migrateLegacyAccount(legacy, [{ order_id: "ord_4", avg: 80 }]);
  assert.deepEqual(migrated.holdings, [{ code: "005930", qty: 2, avg: 80 }]);
  assert.deepEqual(migrateLegacyAccount(migrated, []).holdings, migrated.holdings);
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

// 화면이 예약을 스스로 만들지 않는다는 것은 조립 결과로 확인한다 — 로컬 pending 을 만드는
// 코드가 되살아나면 서버와 브라우저에 같은 주문이 둘 생긴다.
test("생성된 프로토타입은 예약을 로컬에 만들거나 스스로 정산하지 않는다", () => {
  const html = readFileSync("public/ui/app.html", "utf8");
  assert.doesNotMatch(html, /settleScheduledOrder|cancelPendingOrder|processScheduledOrders\(/);
  assert.match(html, /pendingFromServerOrders/);
  assert.match(html, /loadOpenOrders/);
});
