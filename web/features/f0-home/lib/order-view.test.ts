import assert from "node:assert/strict";
import test from "node:test";
import type { Account } from "./portfolio-view";
import {
  applyBuyFill,
  applySellFill,
  blankBuyDraft,
  blankSellDraft,
  buyMath,
  buyStepOk,
  judgePlanMatch,
  lastBuyRecord,
  sellMath,
  shuffledIndexes,
  type BuyRecordRow,
} from "./order-view";

const account = (): Account => ({
  name: "김찬영",
  cash: 100_000,
  holdings: [{ code: "259960", qty: 2, avg: 232_000 }],
  pending: [],
});

test("매수: 금액으로 넣으면 소수 수량, 주 수로 넣으면 금액이 따라온다", () => {
  const byAmount = buyMath({ ...blankBuyDraft(), amount: 30_000 }, 60_000, 100_000);
  assert.equal(byAmount.qty, 0.5);
  assert.equal(byAmount.amount, 30_000);
  assert.equal(byAmount.canConfirm, true);

  const byQty = buyMath({ ...blankBuyDraft(), buyBy: "qty", shares: 2 }, 60_000, 100_000);
  assert.equal(byQty.amount, 120_000);
  assert.equal(byQty.warn, "지갑으로 살 수 있는 주 수보다 많아!");
  assert.equal(byQty.canConfirm, false);
});

test("매수: 지정가는 주문 가격 기준으로 수량·최대 주 수를 센다", () => {
  const math = buyMath(
    { ...blankBuyDraft(), amount: 30_000, orderType: "limit", limitPct: -10 },
    60_000,
    100_000,
  );
  assert.equal(math.limPrice, 54_000);
  assert.equal(math.execPrice, 54_000);
  assert.equal(math.maxShares, 1);
});

test("매수: 지갑 초과·티끌 주문은 경고와 함께 막힌다", () => {
  const over = buyMath({ ...blankBuyDraft(), amount: 200_000 }, 60_000, 100_000);
  assert.equal(over.warn, "지갑보다 많이 살 수는 없어!");
  assert.equal(over.canConfirm, false);

  const tiny = buyMath({ ...blankBuyDraft(), amount: 100 }, 60_000_000, 100_000_000);
  assert.equal(tiny.warn, "이 금액으로는 아직 살 수 없어. 조금 더 올려볼까?");
  assert.equal(tiny.canConfirm, false);
});

test("매수 2단계는 이유·계획(목표가는 퍼센트까지)이 있어야 넘어간다", () => {
  const draft = { ...blankBuyDraft(), amount: 30_000 };
  const math = buyMath(draft, 60_000, 100_000);
  assert.equal(buyStepOk(2, draft, math), false);
  assert.equal(buyStepOk(2, { ...draft, reason: "buy_news", plan: "plan_target" }, math), false);
  assert.equal(
    buyStepOk(2, { ...draft, reason: "buy_news", plan: "plan_target", targetPct: 10 }, math),
    true,
  );
});

test("매도: 예약이 잡은 수량은 팔 수 없고 초과는 경고한다", () => {
  const math = sellMath(blankSellDraft(2), 240_000, 2, 1.5);
  assert.equal(math.maxQty, 0.5);
  assert.equal(math.qty, 0.5);
  assert.equal(math.warn, "가진 것보다 많이 팔 수는 없어!");
  assert.equal(math.canConfirm, false);
});

test("매도: 금액으로 넣으면 주문 가격으로 수량을 되센다", () => {
  const draft = { ...blankSellDraft(0), sellBy: "amount" as const, amountInput: 120_000 };
  const math = sellMath(draft, 240_000, 2, 0);
  assert.equal(math.qty, 0.5);
  assert.equal(math.proceeds, 120_000);
  assert.equal(math.canConfirm, true);
});

test("즉시 체결은 평균단가를 섞고, 잔량 0.005 미만이면 보유를 지운다", () => {
  const bought = applyBuyFill(account(), "259960", 240_000, 0.125, 30_000);
  assert.equal(bought.cash, 70_000);
  assert.equal(bought.holdings[0].qty, 2.125);
  assert.equal(Math.round(bought.holdings[0].avg), Math.round((232_000 * 2 + 30_000) / 2.125));

  const soldAll = applySellFill(account(), "259960", 1.999, 479_760);
  assert.equal(soldAll.holdings.length, 0);
  assert.equal(soldAll.cash, 100_000 + 479_760);
});

test("계획 실천 판정: 단기는 7일, 시즌은 항상 어긋남, 목표가는 도달 여부", () => {
  const rec = (patch: Partial<BuyRecordRow>): BuyRecordRow => ({
    order_id: "ord_0001",
    symbol: "259960",
    qty: 1,
    amount_krw: 240_000,
    reason_code: "buy_news",
    plan_code: "plan_short",
    plan_target_price: null,
    memo: null,
    ts: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    ...patch,
  });
  assert.equal(judgePlanMatch(rec({}), 240_000), true);
  assert.equal(
    judgePlanMatch(rec({ ts: new Date(Date.now() - 9 * 86_400_000).toISOString() }), 240_000),
    false,
  );
  assert.equal(judgePlanMatch(rec({ plan_code: "plan_season" }), 240_000), false);
  assert.equal(judgePlanMatch(rec({ plan_code: "plan_target", plan_target_price: 250_000 }), 260_000), true);
  assert.equal(judgePlanMatch(rec({ plan_code: "plan_target", plan_target_price: 250_000 }), 240_000), false);
  assert.equal(judgePlanMatch(rec({ plan_code: "plan_none" }), 240_000), null);
  assert.equal(judgePlanMatch(null, 240_000), null);
});

test("마지막 매수 기록은 같은 역할·같은 종목에서 최신 것을 준다", () => {
  const records = [
    { order_id: "a", symbol: "259960", user_id: "child_minji", ts: "2026-08-01" },
    { order_id: "b", symbol: "259960", user_id: "parent_mom", ts: "2026-08-02" },
    { order_id: "c", symbol: "259960", user_id: "child_minji", ts: "2026-08-03" },
  ] as unknown as BuyRecordRow[];
  assert.equal(lastBuyRecord(records, "259960", "child_minji")?.order_id, "c");
  assert.equal(lastBuyRecord(records, "005930", "child_minji"), null);
});

test("이유 섞기는 자리만 바꾸고 전부 남긴다", () => {
  const order = shuffledIndexes(6, () => 0.42);
  assert.deepEqual([...order].sort(), [0, 1, 2, 3, 4, 5]);
});
