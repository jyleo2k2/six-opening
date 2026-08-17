import assert from "node:assert/strict";
import test from "node:test";
import type { Account } from "./portfolio-view";
import {
  appendQtyKey,
  applyBuyFill,
  applySellFill,
  blankBuyDraft,
  blankSellDraft,
  buyMath,
  buyStepOk,
  formatQty,
  judgePlanMatch,
  orderChatContext,
  sellMath,
  sellRetrospect,
  shuffledIndexes,
  type TradeHistoryRow,
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

test("주 수 키패드: 소수점은 한 번, 둘째 자리까지만 받는다", () => {
  assert.equal(appendQtyKey("", "."), "0."); // 점부터 눌러도 `0.` 으로 시작한다
  assert.equal(appendQtyKey("0.", "5"), "0.5");
  assert.equal(appendQtyKey("0.5", "."), "0.5"); // 두 번째 점은 무시
  assert.equal(appendQtyKey("0.57", "3"), "0.57"); // 셋째 자리는 무시
  assert.equal(appendQtyKey("0", "5"), "5"); // 앞의 0 은 남기지 않는다
  assert.equal(appendQtyKey("1.5", "←"), "1.");
  assert.equal(appendQtyKey("1", "←"), "");
  assert.equal(appendQtyKey("1", "00"), "1"); // 없어진 키가 남아 있어도 값을 바꾸지 않는다
});

test("주 수 표시: 최소 단위까지만 남긴다", () => {
  assert.equal(formatQty(0.5), "0.5");
  assert.equal(formatQty(1), "1");
  assert.equal(formatQty(0.567), "0.57"); // 금액으로 산 소수 수량도 최소 단위로 접는다
  assert.equal(formatQty(0), "0");
});

test("매수: 주 수도 0.01 주 단위로 살 수 있다", () => {
  const half = buyMath({ ...blankBuyDraft(), buyBy: "qty", shares: 0.5 }, 60_000, 100_000);
  assert.equal(half.amount, 30_000);
  assert.equal(half.qty, 0.5);
  assert.equal(half.warn, "");
  assert.equal(half.canConfirm, true);

  // 주가가 지갑보다 비싸도 소수로는 살 수 있다 — 상한이 0 이면 이 주문이 통째로 막혔다.
  const pricey = buyMath({ ...blankBuyDraft(), buyBy: "qty", shares: 0.5 }, 200_000, 100_000);
  assert.equal(pricey.maxShares, 0.5);
  assert.equal(pricey.canConfirm, true);
});

test("챗봇 맥락: 주 수로 넣은 주 수를 그대로 싣는다", () => {
  // 이 화면이 `금액 ÷ 주문가` 로 수량을 다시 계산하던 동안, 주 수로 넣은 값은 통째로
  // 사라졌다 — 화면에 "10주"가 떠 있어도 챗봇은 몰랐다.
  const context = orderChatContext({
    account: account(),
    code: "096770",
    draft: { ...blankBuyDraft(), buyBy: "qty", shares: 10 },
    price: 128_700,
    reservedQty: 0,
    seed: 1_000_000,
    sellDraft: null,
    side: "buy",
    stockName: "SK이노베이션",
    totalAsset: 1_200_000,
  });
  assert.equal(context.quantity, 10);
  assert.equal(context.unitPrice, 128_700);
  assert.equal(context.screen, "order");
  assert.equal(context.stockId, "KRX:096770");
  assert.equal(context.pnlPercent, 20);
  assert.equal(context.holdingCount, 1);
});

test("챗봇 맥락: 금액으로 넣으면 소수 수량이 그대로 간다", () => {
  const context = orderChatContext({
    account: account(),
    code: "096770",
    draft: { ...blankBuyDraft(), amount: 50_000 },
    price: 128_700,
    reservedQty: 0,
    seed: 1_000_000,
    sellDraft: null,
    side: "buy",
    stockName: "SK이노베이션",
    totalAsset: 1_000_000,
  });
  // 자리 반올림은 요청 계약이 한 곳에서 맡는다. 화면은 계산한 값을 그대로 넘긴다.
  assert.equal(context.quantity, 50_000 / 128_700);
  assert.equal(context.pnlPercent, 0);
});

test("챗봇 맥락: 지정가는 주문 가격을, 매도는 팔 수 있는 수량을 싣는다", () => {
  const limit = orderChatContext({
    account: account(),
    code: "096770",
    draft: { ...blankBuyDraft(), buyBy: "qty", shares: 1, orderType: "limit", limitPct: -10 },
    price: 100_000,
    reservedQty: 0,
    seed: 1_000_000,
    sellDraft: null,
    side: "buy",
    stockName: "SK이노베이션",
    totalAsset: 1_000_000,
  });
  assert.equal(limit.unitPrice, 90_000);

  // 예약이 잡은 수량은 팔 수 없다. 화면이 막는 값을 챗봇이 말하면 안 된다.
  const sell = orderChatContext({
    account: account(),
    code: "259960",
    draft: blankBuyDraft(),
    price: 240_000,
    reservedQty: 1,
    seed: 1_000_000,
    sellDraft: { ...blankSellDraft(2), qty: 2 },
    side: "sell",
    stockName: "크래프톤",
    totalAsset: 1_000_000,
  });
  assert.equal(sell.quantity, 1);
  assert.equal(sell.unitPrice, 240_000);
});

test("챗봇 맥락: 살 수 없는 상태에서는 수량을 싣지 않는다", () => {
  const empty = orderChatContext({
    account: account(),
    code: "096770",
    draft: blankBuyDraft(),
    price: 128_700,
    reservedQty: 0,
    seed: 1_000_000,
    sellDraft: null,
    side: "buy",
    stockName: "SK이노베이션",
    totalAsset: 1_000_000,
  });
  assert.equal(empty.quantity, undefined);
  assert.equal(empty.unitPrice, 128_700);

  // 시세를 아직 못 받았으면 주문 가격도 싣지 않는다 — 0원을 화면 값이라고 말할 수 없다.
  const noPrice = orderChatContext({
    account: account(),
    code: "096770",
    draft: { ...blankBuyDraft(), buyBy: "qty", shares: 3 },
    price: 0,
    reservedQty: 0,
    seed: 1_000_000,
    sellDraft: null,
    side: "buy",
    stockName: "SK이노베이션",
    totalAsset: 1_000_000,
  });
  assert.equal(noPrice.unitPrice, undefined);
});

test("챗봇 맥락: 소수 수량 매매로 생긴 현금 소수점은 정수로 맞춘다", () => {
  const context = orderChatContext({
    account: { ...account(), cash: 3_055_000.4237 },
    code: "096770",
    draft: blankBuyDraft(),
    price: 128_700,
    reservedQty: 0,
    seed: 1_000_000,
    sellDraft: null,
    side: "buy",
    stockName: "SK이노베이션",
    totalAsset: 1_000_000,
  });
  assert.equal(context.cash, 3_055_000);
});

test("매수: 지정가는 주문 가격 기준으로 수량·최대 주 수를 센다", () => {
  const math = buyMath(
    { ...blankBuyDraft(), amount: 30_000, orderType: "limit", limitPct: -10 },
    60_000,
    100_000,
  );
  assert.equal(math.limPrice, 54_000);
  assert.equal(math.execPrice, 54_000);
  assert.equal(math.maxShares, 1.85);
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

const row = (patch: Partial<TradeHistoryRow> = {}): TradeHistoryRow => ({
  side: "buy",
  tradedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  price: 240_000,
  quantity: 1,
  reasonCode: "buy_news",
  planCode: "plan_short",
  planTargetPrice: null,
  memo: null,
  mine: true,
  ...patch,
});

test("계획 실천 판정: 단기는 7일, 시즌은 항상 어긋남, 목표가는 도달 여부", () => {
  assert.equal(judgePlanMatch(row(), 240_000), true);
  assert.equal(
    judgePlanMatch(row({ tradedAt: new Date(Date.now() - 9 * 86_400_000).toISOString() }), 240_000),
    false,
  );
  assert.equal(judgePlanMatch(row({ planCode: "plan_season" }), 240_000), false);
  assert.equal(judgePlanMatch(row({ planCode: "plan_target", planTargetPrice: 250_000 }), 260_000), true);
  assert.equal(judgePlanMatch(row({ planCode: "plan_target", planTargetPrice: 250_000 }), 240_000), false);
  assert.equal(judgePlanMatch(row({ planCode: "plan_none" }), 240_000), null);
  assert.equal(judgePlanMatch(null, 240_000), null);
});

test("회고 재료는 내 마지막 매수다 — 가족 체결이 섞여 있어도 남의 것은 안 본다", () => {
  const trades = [
    row({ tradedAt: "2026-08-01T00:00:00Z", planCode: "plan_short" }),
    // 같은 종목을 가족이 더 최근에 샀어도 내 회고는 내 기록으로 한다.
    row({ tradedAt: "2026-08-05T00:00:00Z", mine: false, planCode: "plan_season" }),
    row({ tradedAt: "2026-08-03T00:00:00Z", planCode: "plan_target" }),
  ];
  const { buy, firstSell } = sellRetrospect(trades);
  assert.equal(buy?.planCode, "plan_target");
  assert.equal(firstSell, true);
});

test("내 매수 뒤에 내 매도가 있으면 첫 매도가 아니다", () => {
  const buy = row({ tradedAt: "2026-08-03T00:00:00Z" });
  // 그 매수 **이전**의 매도는 판정을 뒤집지 않는다. 이번에 파는 몫과 무관한 거래다.
  assert.equal(
    sellRetrospect([row({ tradedAt: "2026-08-01T00:00:00Z", side: "sell" }), buy]).firstSell,
    true,
  );
  assert.equal(
    sellRetrospect([buy, row({ tradedAt: "2026-08-04T00:00:00Z", side: "sell" })]).firstSell,
    false,
  );
  // 남의 매도도 내 판정을 뒤집지 않는다.
  assert.equal(
    sellRetrospect([buy, row({ tradedAt: "2026-08-04T00:00:00Z", side: "sell", mine: false })]).firstSell,
    true,
  );
});

test("내 매수 기록이 없으면 판정도 카드도 없다", () => {
  assert.deepEqual(sellRetrospect([]), { buy: null, firstSell: true });
  assert.deepEqual(sellRetrospect([row({ mine: false })]), { buy: null, firstSell: true });
});

test("이유 섞기는 자리만 바꾸고 전부 남긴다", () => {
  const order = shuffledIndexes(6, () => 0.42);
  assert.deepEqual([...order].sort(), [0, 1, 2, 3, 4, 5]);
});
