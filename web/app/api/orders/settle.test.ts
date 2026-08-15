import assert from "node:assert/strict";
import { settleDueOrders, type ScheduledOrder, type SettleDeps } from "./settle";

const KST_NOON = (day: string) => new Date(`${day}T03:00:00Z`); // KST 12:00
const candle = (day: string, open: number, volume = 1000) => ({
  time: Math.floor(new Date(`${day}T00:30:00Z`).getTime() / 1000), // KST 09:30
  open,
  high: open,
  low: open,
  close: open,
  volume,
});

function deps(overrides: Partial<SettleDeps> = {}) {
  const settled: Array<{ orderId: string; price: number }> = [];
  const base: SettleDeps = {
    async loadDailyCandles() {
      return [candle("2026-08-14", 60000)];
    },
    async settle(orderId, fillPrice) {
      settled.push({ orderId, price: fillPrice });
      return { order_status: "filled", settled: true };
    },
    ...overrides,
  };
  return { deps: base, settled };
}

const order = (over: Partial<ScheduledOrder> = {}): ScheduledOrder => ({
  id: "o1",
  symbol: "005930",
  scheduledFor: "2026-08-14",
  ...over,
});

// 저장소 테스트는 cjs 로 변환되므로 최상위 await 를 쓸 수 없다 (다른 route 테스트와 같은 모양).
async function main() {

  // 예약일의 확인된 시가로 정산한다.
  {
    const { deps: d, settled } = deps();
    const result = await settleDueOrders(d, [order()], KST_NOON("2026-08-14"));
    assert.deepEqual(settled, [{ orderId: "o1", price: 60000 }]);
    assert.deepEqual(result, [{ orderId: "o1", status: "filled" }]);
  }

  // 시가 일봉이 아직 없으면 예약을 그대로 둔다 (휴일·거래정지).
  {
    const { deps: d, settled } = deps({ async loadDailyCandles() { return []; } });
    const result = await settleDueOrders(d, [order()], KST_NOON("2026-08-14"));
    assert.equal(settled.length, 0);
    assert.equal(result.length, 0);
  }

  // 거래량 0 인 일봉은 확인된 시가가 아니다.
  {
    const { deps: d, settled } = deps({
      async loadDailyCandles() { return [candle("2026-08-14", 60000, 0)]; },
    });
    await settleDueOrders(d, [order()], KST_NOON("2026-08-14"));
    assert.equal(settled.length, 0);
  }

  // 예약일보다 이른 일봉으로 체결하지 않는다.
  {
    const { deps: d, settled } = deps({
      async loadDailyCandles() { return [candle("2026-08-13", 55000)]; },
    });
    await settleDueOrders(d, [order({ scheduledFor: "2026-08-14" })], KST_NOON("2026-08-14"));
    assert.equal(settled.length, 0);
  }

  // 같은 종목 예약이 여러 건이어도 일봉은 한 번만 읽는다.
  {
    let reads = 0;
    const { deps: d, settled } = deps({
      async loadDailyCandles() {
        reads += 1;
        return [candle("2026-08-14", 60000)];
      },
    });
    await settleDueOrders(d, [order({ id: "a" }), order({ id: "b" })], KST_NOON("2026-08-14"));
    assert.equal(reads, 1);
    assert.equal(settled.length, 2);
  }

  // 이미 끝난 주문(settled:false)은 결과에 넣지 않는다 — 멱등.
  {
    const { deps: d } = deps({
      async settle() { return { order_status: "filled", settled: false }; },
    });
    const result = await settleDueOrders(d, [order()], KST_NOON("2026-08-14"));
    assert.equal(result.length, 0);
  }

  // 한 종목의 일봉 조회가 실패해도 나머지 예약은 정산한다.
  {
    const { deps: d, settled } = deps({
      async loadDailyCandles(symbol) {
        if (symbol === "005930") throw new Error("candle read failed");
        return [candle("2026-08-14", 70000)];
      },
    });
    const result = await settleDueOrders(
      d,
      [order({ id: "a" }), order({ id: "b", symbol: "000660" })],
      KST_NOON("2026-08-14"),
    );
    assert.deepEqual(settled, [{ orderId: "b", price: 70000 }]);
    assert.equal(result.length, 1);
  }

  // 정산 자체가 실패해도 다음 주문으로 넘어간다.
  {
    const calls: string[] = [];
    const { deps: d } = deps({
      async settle(orderId) {
        calls.push(orderId);
        if (orderId === "a") throw new Error("보유 수량이 부족합니다.");
        return { order_status: "filled", settled: true };
      },
    });
    const result = await settleDueOrders(d, [order({ id: "a" }), order({ id: "b" })], KST_NOON("2026-08-14"));
    assert.deepEqual(calls, ["a", "b"]);
    assert.deepEqual(result, [{ orderId: "b", status: "filled" }]);
  }

  console.log("orders settle tests passed");
}

void main();
