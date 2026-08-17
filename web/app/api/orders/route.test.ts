import assert from "node:assert/strict";
import test from "node:test";
import { reconcileOpenOrders } from "./route";

type Row = { id: string; order_status: string };

test("만기 주문을 봤으면 내가 정산하지 못했어도 최신 목록을 다시 읽는다", async () => {
  const before: Row[] = [{ id: "due-1", order_status: "scheduled" }];
  let reloads = 0;
  const result = await reconcileOpenOrders(before, true, async () => {
    reloads += 1;
    return [];
  });

  assert.equal(reloads, 1);
  assert.deepEqual(result, { rows: [], changed: true });
});

test("만기 주문이 없으면 같은 목록을 쓰고 추가 조회하지 않는다", async () => {
  const before: Row[] = [{ id: "wait-1", order_status: "pending" }];
  let reloads = 0;
  const result = await reconcileOpenOrders(before, false, async () => {
    reloads += 1;
    return [];
  });

  assert.equal(reloads, 0);
  assert.equal(result.rows, before);
  assert.equal(result.changed, false);
});

test("만기 주문이 아직 그대로면 계좌 재조회 신호를 만들지 않는다", async () => {
  const before: Row[] = [{ id: "due-1", order_status: "scheduled" }];
  const result = await reconcileOpenOrders(before, true, async () => [...before]);
  assert.equal(result.changed, false);
});
