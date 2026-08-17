import assert from "node:assert/strict";
import { applyServerAccount, type ServerAccount } from "./server-account";
import { availableHoldingQty, reservedHoldingQty, type Account } from "./portfolio-view";

// 이관 뒤 계좌·상세·탐색이 DB 보유 대신 시드값을 그리던 원인을 막는 자리다.
// `app.html` 의 applyServerHoldings 는 메모리에만 쓰고 localStorage 에 남기지 않으므로,
// 옮겨 온 화면이 서버 값을 보려면 여기서 덮어야 한다.

const seed: Record<string, Account> = {
  child: {
    name: "김찬영",
    cash: 9_339_500,
    holdings: [{ code: "259960", qty: 2, avg: 232000 }],
    pending: [{ id: "p1", side: "buy", code: "005930" }],
  },
  parent: { name: "엄마", cash: 9_540_250, holdings: [], pending: [] },
};

const dbChild: ServerAccount = {
  user_id: 7,
  name: "김찬영",
  parent_child: "child",
  guardian_role: null,
  balance: 4_120_000,
  reserved: 920_000,
  available: 3_200_000,
  holdings: [
    {
      stock_code: "005930", stock_name: "삼성전자", quantity: 3,
      reserved_quantity: 1, available_quantity: 2, avg_price: 71_000,
    },
    { stock_code: null, stock_name: null, quantity: 5, avg_price: 100 },
  ],
};

// 로그인한 역할만 서버 값으로 덮는다.
const applied = applyServerAccount(seed, dbChild);
assert.equal(applied.child.cash, 3_200_000);
assert.equal(applied.child.reservedCash, 920_000);
assert.deepEqual(applied.child.holdings, [
  { code: "005930", qty: 3, avg: 71_000, reservedQty: 1, availableQty: 2 },
]);
// 종목 코드가 없는 행은 버린다 — 화면이 코드로 종목을 찾는다.
assert.equal(applied.child.holdings.length, 1);
// 주문 목록 조회가 실패해도 계좌 응답의 예약 필드가 정확한 한도와 총자산을 지킨다.
// 서버에 없는 시드 주문은 목록에 섞지 않는다.
assert.deepEqual(applied.child.pending, []);
assert.equal(reservedHoldingQty(applied.child, "005930"), 1);
assert.equal(availableHoldingQty(applied.child, "005930"), 2);
// 반대쪽 역할은 로컬 데모 그대로다.
assert.deepEqual(applied.parent, seed.parent);

// 부모로 로그인하면 부모 칸만 바뀐다.
const dbParent: ServerAccount = {
  user_id: 8,
  name: "찬영엄마",
  parent_child: "parent",
  guardian_role: "mom",
  balance: 8_000_000,
  holdings: [],
};
const parentApplied = applyServerAccount(seed, dbParent);
assert.equal(parentApplied.parent.cash, 8_000_000);
assert.equal(parentApplied.parent.name, "찬영엄마");
assert.deepEqual(parentApplied.child, seed.child);

// 주문가능금액이 오면 그쪽이 화면의 cash 다. 총 현금(balance)을 쓰면 미체결 주문이 잠근
// 돈까지 주문에 쓰려 들고 reserve_order 가 거절한다.
assert.equal(
  applyServerAccount(seed, { ...dbChild, balance: 5_000_000, available: 3_200_000 }).child.cash,
  3_200_000,
);
// 잠긴 돈이 없으면 둘이 같다.
assert.equal(
  applyServerAccount(seed, { ...dbChild, balance: 5_000_000, available: 5_000_000 }).child.cash,
  5_000_000,
);
// 전부 잠겨 0 이어도 0 이다 — 총 현금으로 되돌리면 안 된다.
assert.equal(
  applyServerAccount(seed, { ...dbChild, balance: 5_000_000, available: 0 }).child.cash,
  0,
);

// 응답을 못 받았거나 로그인 전이면 지갑을 그대로 둔다.
assert.equal(applyServerAccount(seed, null), seed);
assert.equal(applyServerAccount(seed, { ...dbChild, user_id: 0 }), seed);
assert.equal(applyServerAccount(seed, { ...dbChild, parent_child: "guest" }), seed);

// 잔액이 숫자가 아니면 덮지 않는다. NaN 총자산이 화면 전체를 망친다.
assert.equal(
  applyServerAccount(seed, { ...dbChild, balance: null, available: null }).child.cash,
  9_339_500,
);
assert.equal(
  applyServerAccount(seed, { ...dbChild, balance: undefined, available: undefined }).child.cash,
  9_339_500,
);
// 잔액이 0 이면 0 이다 — 떨어진 잔고를 시드로 되돌리면 안 된다.
assert.equal(applyServerAccount(seed, { ...dbChild, balance: 0, available: undefined }).child.cash, 0);

// 보유가 비면 비운다. 다 팔았는데 시드 보유가 남아 있으면 안 된다.
assert.deepEqual(applyServerAccount(seed, { ...dbChild, holdings: [] }).child.holdings, []);

// 구형 응답에는 예약 수량이 없을 수 있다. 그때만 주문 목록으로 계산한다.
const legacy = applyServerAccount(
  seed,
  {
    ...dbChild,
    reserved: undefined,
    holdings: [{ stock_code: "005930", stock_name: "삼성전자", quantity: 3, avg_price: 71_000 }],
  },
  [{ side: "sell", code: "005930", reservedQty: 2 }],
).child;
assert.equal(reservedHoldingQty(legacy, "005930"), 2);
assert.equal(availableHoldingQty(legacy, "005930"), 1);
