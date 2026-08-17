// 주문 화면(매수·매도)의 순수 계산. `ui-src/methods/renderVals-compute.js` 의
// 매수·매도 부분과 `judgePlanMatch`·`lastBuy` 를 그대로 옮겨 왔다.
import type { ChatContext } from "../../../shared/types/chatbot";
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

/**
 * 주문 화면이 챗봇에게 넘기는 맥락.
 *
 * 화면이 지금 보여 주는 값이 원본이다. 챗봇은 서버에서 돌아 아직 제출하지 않은
 * 이 화면의 주문 초안을 볼 수 없으므로 필요한 값을 맥락에 직접 싣는다.
 *
 * 수량·주문가는 반드시 `buyMath`·`sellMath` 를 거친다. 화면이 쓰는 계산을 여기서 다시
 * 적으면 두 벌이 갈라진다 — 실제로 갈라져서 `금액 ÷ 주문가` 만 아는 코드가 **주 수로 넣은
 * 주 수를 통째로 놓쳤고**, 화면에 "10주"가 떠 있어도 챗봇은 몰랐다.
 *
 * 수량은 소수가 정상이다(금액으로 사면 `금액 ÷ 주문가`). 자리 반올림은 요청 계약
 * (`f10-chatbot/lib/contracts.ts`)이 화면과 같은 소수 둘째 자리로 한 곳에서 맡는다.
 */
export function orderChatContext(input: {
  code: string;
  stockName: string;
  side: "buy" | "sell";
  draft: BuyDraft;
  sellDraft: SellDraft | null;
  price: number;
  account: Account;
  reservedQty: number;
  /** 화면이 계산한 총자산. 시세를 알아야 해서 여기서 구하지 않는다. */
  totalAsset: number;
  seed: number;
}): ChatContext {
  const { account, code, draft, price, sellDraft, side, stockName } = input;
  const context: ChatContext = { screen: "order", stockId: `KRX:${code}`, stockName };
  const held = account.holdings.find((holding) => holding.code === code);
  const math =
    side === "sell" && sellDraft
      ? sellMath(sellDraft, price, held?.qty ?? 0, input.reservedQty)
      : buyMath(draft, price, account.cash);

  if (Number.isFinite(math.qty) && math.qty > 0) context.quantity = math.qty;
  if (Number.isFinite(math.execPrice) && math.execPrice > 0) {
    context.unitPrice = math.execPrice;
  }
  if (Number.isFinite(input.totalAsset)) {
    context.pnlPercent =
      Math.round(((input.totalAsset - input.seed) / input.seed) * 10000) / 100;
  }
  // 소수 수량 매매로 현금에 소수점이 생긴다. 요청 계약은 현금을 정수로만 받는다.
  if (Number.isFinite(account.cash) && account.cash >= 0) {
    context.cash = Math.round(account.cash);
  }
  context.holdingCount = account.holdings.filter(
    (holding) => Number(holding.qty) > 0,
  ).length;
  return context;
}

/**
 * `GET /api/trades?symbol=` 한 줄 중 회고 판정이 읽는 부분.
 *
 * 예전에는 같은 값을 지갑(`kw_proto_v1.records`)에서 읽었다. 그러면 **이 브라우저에서 산
 * 것만** 기록이 있어서, DB 시드로 심어진 보유를 팔거나 기기를 바꾸면 판정이 통째로
 * `null` 이 됐다 — 회고 카드가 안 뜨고 `plan_match` 도 빈 채로 저장돼 F9 계획 준수
 * 표본에서 조용히 빠졌다.
 */
export type TradeHistoryRow = {
  side: "buy" | "sell";
  tradedAt: string;
  price: number;
  /** 남의 체결은 서버가 지운다. 내 기록만 쓰므로 회고 카드에서는 항상 숫자다. */
  quantity: number | null;
  reasonCode: string | null;
  planCode: string | null;
  planTargetPrice: number | null;
  memo: string | null;
  mine: boolean;
};

export type SellRetrospect = {
  /** 이 종목에서 내가 마지막으로 산 기록. 매도 2단계 "사던 날의 나" 카드가 읽는다. */
  buy: TradeHistoryRow | null;
  /** 그 매수 뒤로 아직 판 적이 없는지. 회고 카드는 첫 매도에만 뜬다. */
  firstSell: boolean;
};

/**
 * 종목 하나의 가족 체결 목록에서 내 회고 재료를 뽑는다.
 *
 * 응답은 `created_at.asc` 라 뒤로 갈수록 최신이다. 첫 매도 판정은 예전 로컬 기록의
 * `linked_buy_order_id` 대신 **그 매수 이후에 내 매도가 있었는지**로 본다 — 서버에는
 * 매수·매도를 잇는 칸이 없고, 같은 종목을 여러 번 사고판 사람에게는 "마지막 매수 뒤에
 * 팔았나" 가 화면이 물으려던 것과 같은 질문이다.
 */
export function sellRetrospect(trades: readonly TradeHistoryRow[]): SellRetrospect {
  let buy: TradeHistoryRow | null = null;
  for (const trade of trades) {
    if (trade.mine && trade.side === "buy") buy = trade;
  }
  if (!buy) return { buy: null, firstSell: true };
  // `let` 은 클로저 안에서 다시 넓어진다 — 좁힌 값을 그대로 넘긴다.
  const lastBuy = buy;
  const sold = trades.some(
    (trade) => trade.mine && trade.side === "sell" && trade.tradedAt > lastBuy.tradedAt,
  );
  return { buy: lastBuy, firstSell: !sold };
}

/** 계획 실천 판정. `plan_season` 은 시즌 중 매도이므로 항상 어긋남이다. */
export function judgePlanMatch(
  buy: TradeHistoryRow | null,
  price: number,
  now = Date.now(),
): boolean | null {
  if (!buy) return null;
  const days = Math.floor((now - new Date(buy.tradedAt).getTime()) / 86400000);
  switch (buy.planCode) {
    case "plan_short":
      return days <= SHORT_TERM_DAYS;
    case "plan_season":
      return false;
    case "plan_target":
      return buy.planTargetPrice ? price >= buy.planTargetPrice : false;
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
    holdings[index] = {
      ...h,
      qty: nextQty,
      avg: (h.avg * h.qty + amount) / nextQty,
      availableQty: Number.isFinite(h.availableQty) ? (h.availableQty as number) + qty : undefined,
    };
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
    else {
      const holding = holdings[index];
      holdings[index] = {
        ...holding,
        qty: left,
        availableQty: Number.isFinite(holding.availableQty)
          ? Math.max(0, (holding.availableQty as number) - qty)
          : undefined,
      };
    }
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
