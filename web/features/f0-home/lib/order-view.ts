// 주문 화면(매수·매도)의 순수 계산. `ui-src/methods/renderVals-compute.js` 의
// 매수·매도 부분과 `judgePlanMatch`·`lastBuy` 를 그대로 옮겨 왔다.
import type { Account, Holding } from "./portfolio-view";

/** `ui-src/logic/constants.js` 와 같은 값 — 단기 계획(plan_short)의 실천 판정 기한. */
export const SHORT_TERM_DAYS = 7;

export type BuyDraft = {
  buyBy: "amount" | "qty";
  amount: number;
  shares: number;
  /** 빠른선택 칩과 직접 입력을 구분한다 — 직접 넣은 3만원에 3만원 칩이 켜지지 않는다. */
  amountSource: "preset" | "custom" | null;
  reason: string | null;
  plan: string | null;
  targetPct: number | null;
  memo: string;
  orderType: "market" | "limit";
  limitPct: number;
};

export type SellDraft = {
  sellBy: "qty" | "amount";
  qty: number;
  amountInput: number;
  orderType: "market" | "limit";
  limitPct: number;
  reason: string | null;
  change: string | null;
  memo: string;
};

export function blankBuyDraft(): BuyDraft {
  return {
    buyBy: "amount",
    amount: 0,
    shares: 0,
    amountSource: null,
    reason: null,
    plan: null,
    targetPct: null,
    memo: "",
    orderType: "market",
    limitPct: 0,
  };
}

export function blankSellDraft(availableQty: number): SellDraft {
  return {
    sellBy: "qty",
    qty: availableQty,
    amountInput: 0,
    orderType: "market",
    limitPct: 0,
    reason: null,
    change: null,
    memo: "",
  };
}

/** 매수 1단계의 돈 계산. `renderVals-compute.js` 의 amount·qty·warn 부분 그대로. */
export function buyMath(draft: BuyDraft, price: number, cash: number) {
  const availableCash = Math.max(0, Math.floor(cash));
  const limPrice = Math.round(price * (1 + (draft.limitPct ?? 0) / 100));
  const execPrice = draft.orderType === "limit" ? limPrice : price;
  const byQty = draft.buyBy === "qty";
  const shares = draft.shares || 0;
  // 주 수로 넣을 때는 주 수 × 주문 가격이 곧 주문 금액이다
  const amount = byQty ? Math.round(shares * execPrice) : draft.amount;
  const qty = byQty ? shares : execPrice > 0 ? amount / execPrice : 0;
  const overCash = amount > cash;
  const tooSmall = amount > 0 && qty < 0.01;
  const warn = overCash
    ? byQty
      ? "지갑으로 살 수 있는 주 수보다 많아!"
      : "지갑보다 많이 살 수는 없어!"
    : tooSmall
      ? "이 금액으로는 아직 살 수 없어. 조금 더 올려볼까?"
      : "";
  const maxShares = execPrice > 0 ? Math.floor(availableCash / execPrice) : 0;
  return {
    availableCash,
    limPrice,
    execPrice,
    byQty,
    amount,
    qty,
    warn,
    maxShares,
    canConfirm: amount > 0 && !overCash && !tooSmall,
  };
}

export function buyStepOk(step: number, draft: BuyDraft, math: ReturnType<typeof buyMath>) {
  if (step === 1) return math.canConfirm;
  if (step === 2) {
    return !!draft.reason && !!draft.plan && (draft.plan !== "plan_target" || draft.targetPct !== null);
  }
  return true;
}

/** 매도 1단계의 돈 계산. 예약이 잡은 수량은 팔 수 없다. */
export function sellMath(draft: SellDraft, price: number, heldQty: number, reservedQty: number) {
  const limPct = draft.limitPct ?? 0;
  const limPrice = Math.round(price * (1 + limPct / 100));
  const execPrice = draft.orderType === "limit" ? limPrice : price;
  const byQty = draft.sellBy !== "amount";
  const maxQty = Math.max(0, heldQty - reservedQty);
  const want = byQty ? draft.qty || 0 : execPrice > 0 ? (draft.amountInput || 0) / execPrice : 0;
  const qty = Math.min(maxQty, Math.max(0, want));
  const proceeds = qty * execPrice;
  const over = want > maxQty + 0.0001;
  const warn = over
    ? "가진 것보다 많이 팔 수는 없어!"
    : want > 0 && qty < 0.01
      ? "이 금액으로는 아직 팔 수 없어. 조금 더 올려볼까?"
      : "";
  return { limPct, limPrice, execPrice, byQty, maxQty, want, qty, proceeds, warn, canConfirm: qty > 0 && !over };
}

export type BuyRecordRow = {
  order_id: string;
  symbol: string;
  qty: number;
  amount_krw: number;
  reason_code: string | null;
  plan_code: string | null;
  plan_target_price: number | null;
  memo: string | null;
  ts: string;
  user_id?: string;
  order_status?: string;
};

/** 이 종목의 마지막 매수 기록 — 매도 2단계 "사던 날의 나" 카드가 읽는다. */
export function lastBuyRecord(records: BuyRecordRow[], code: string, userId: string) {
  const mine = (records || []).filter((r) => r.symbol === code && r.user_id === userId);
  return mine.length ? mine[mine.length - 1] : null;
}

/** 계획 실천 판정. `plan_season` 은 시즌 중 매도이므로 항상 어긋남이다. */
export function judgePlanMatch(
  buyRec: BuyRecordRow | null,
  price: number,
  now = Date.now(),
): boolean | null {
  if (!buyRec) return null;
  const days = Math.floor((now - new Date(buyRec.ts).getTime()) / 86400000);
  switch (buyRec.plan_code) {
    case "plan_short":
      return days <= SHORT_TERM_DAYS;
    case "plan_season":
      return false;
    case "plan_target":
      return buyRec.plan_target_price ? price >= buyRec.plan_target_price : false;
    default:
      return null;
  }
}

/** 즉시 매수 체결을 보유·현금에 반영한다. `buyNext` 의 즉시 체결 분기 그대로. */
export function applyBuyFill(account: Account, code: string, price: number, qty: number, amount: number): Account {
  const holdings: Holding[] = account.holdings.map((h) => ({ ...h }));
  const index = holdings.findIndex((h) => h.code === code);
  if (index >= 0) {
    const h = holdings[index];
    const nextQty = h.qty + qty;
    holdings[index] = { code: h.code, qty: nextQty, avg: (h.avg * h.qty + amount) / nextQty };
  } else {
    holdings.push({ code, qty, avg: price });
  }
  return { ...account, cash: account.cash - amount, holdings };
}

/** 즉시 매도 체결을 보유·현금에 반영한다. 0.005주 미만 잔량은 정리한다. */
export function applySellFill(account: Account, code: string, qty: number, proceeds: number): Account {
  const holdings: Holding[] = account.holdings.map((h) => ({ ...h }));
  const index = holdings.findIndex((h) => h.code === code);
  if (index >= 0) {
    const left = holdings[index].qty - qty;
    if (left < 0.005) holdings.splice(index, 1);
    else holdings[index] = { ...holdings[index], qty: left };
  }
  return { ...account, cash: account.cash + proceeds, holdings };
}

/** 매수 이유 버튼 순서는 진입마다 섞는다 (F3 SPEC). 매도는 앞 5개만 섞고 6번은 고정이다. */
export function shuffledIndexes(count: number, random = Math.random) {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  return order;
}
