import assert from "node:assert/strict";
import { readPrototypeTrades } from "./prototype-trades";

type Storage = { getItem(key: string): string | null };

function withStorage(value: unknown, run: () => void) {
  const globals = globalThis as { window?: { localStorage: Storage } };
  const previous = globals.window;
  globals.window = {
    localStorage: { getItem: () => (value === undefined ? null : JSON.stringify(value)) },
  };
  try {
    run();
  } finally {
    if (previous === undefined) delete globals.window;
    else globals.window = previous;
  }
}

const buy = {
  order_id: "ord_0001",
  user_id: "child_minji",
  symbol: "005930",
  amount_krw: 143800,
  qty: 2,
  order_status: "filled",
  reason_code: "buy_intuition",
  memo: null,
  ts: "2026-08-12T01:00:00.000Z",
};

withStorage({ records: [buy], sellRecords: [] }, () => {
  const [trade] = readPrototypeTrades();
  assert.equal(trade.id, "ord_0001");
  assert.equal(trade.member, "child");
  assert.equal(trade.side, "buy");
  assert.equal(trade.quantity, 2);
  assert.equal(trade.price, 71900, "단가는 체결금액을 수량으로 나눈 값이다");
  assert.equal(trade.reason, "그냥 느낌이 좋아서", "reason_code 는 라벨로 바뀐다");
  assert.equal(trade.memo, "");
});

withStorage({ records: [{ ...buy, user_id: "parent_mom" }], sellRecords: [] }, () => {
  assert.equal(readPrototypeTrades()[0].member, "parent");
});

// 미체결 지정가는 피드에 올리지 않는다 (SPEC §6 — 실시간 따라하기 방지).
withStorage({ records: [{ ...buy, order_status: "pending" }], sellRecords: [] }, () => {
  assert.deepEqual(readPrototypeTrades(), []);
});

withStorage(
  {
    records: [],
    sellRecords: [{ ...buy, order_id: "ord_0002", sell_reason_code: "sell_anxiety", reason_code: undefined }],
  },
  () => {
    const [trade] = readPrototypeTrades();
    assert.equal(trade.side, "sell");
    assert.equal(trade.reason, "그냥 불안해서");
  },
);

// 깨진 저장값·종목코드에도 화면이 죽지 않아야 한다.
withStorage(undefined, () => assert.deepEqual(readPrototypeTrades(), []));
withStorage({ records: [{ ...buy, symbol: "abc" }], sellRecords: [] }, () =>
  assert.deepEqual(readPrototypeTrades(), []),
);
withStorage({}, () => assert.deepEqual(readPrototypeTrades(), []));

console.log("prototype trade adapter tests passed");
