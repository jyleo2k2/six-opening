// 주문 화면(매수·매도)의 순수 계산. `ui-src/methods/renderVals-compute.js` 의
// 매수·매도 부분과 `judgePlanMatch`·`lastBuy` 를 그대로 옮겨 왔다.
import type { ChatContext } from "../../../shared/types/chatbot";
import type { Account, Holding, PendingOrder } from "./portfolio-view";

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

/**
 * 금액 매수의 빠른선택 칩. 예약을 되돌릴 때 어느 칩을 켤지 정하는 데 쓴다.
 *
 * 화면(`OrderScreen`)은 이 상수를 읽지 않고 같은 값을 직접 적는다 —
 * `f2-trade/lib/buy-amount-ui.test.ts` 가 소스 글자 그대로 `[10000, "1만원"]` 을 지키는
 * 계약이라 그렇다. 두 자리가 갈라지지 않도록 이 값도 `order-view.test.ts` 가 못 박는다.
 */
export const BUY_AMOUNT_PRESETS = [10000, 30000, 50000] as const;

/**
 * 지정가로 고를 수 있는 값. 화면은 가격을 직접 받지 않고 `현재가 × (1+%)` 로만 만든다.
 * 매수는 싸게 사려고 내려 잡고 매도는 비싸게 팔려고 올려 잡아 부호가 반대다.
 */
export const BUY_LIMIT_PCTS = [-10, -5, -3, 0] as const;
export const SELL_LIMIT_PCTS = [0, 3, 5, 10] as const;

/**
 * 기다리는 주문을 다시 고치러 갈 때 주문 화면에 넘기는 값.
 *
 * 같은 종목·같은 방향이면 주문 화면이 다시 마운트되지 않으므로(`key={side-code}`) 회차를
 * 세어 새 요청을 가른다 — 챗봇의 `ChatOrderRequest` 가 같은 이유로 쓰는 방법이다.
 */
export type OrderPrefill = {
  id: number;
  code: string;
  side: "buy" | "sell";
  order: PendingOrder;
};

/**
 * 예약해 둔 가격을 다시 고를 때 켜 둘 칩.
 *
 * 화면이 가격을 %로만 받아서 옛 지정가를 그대로 되살릴 수는 없다. 지금 가격 기준으로 가장
 * 가까운 칸을 켜 두고 실제 가격은 `buyMath`·`sellMath` 가 다시 계산해 보여 준다.
 */
export function nearestLimitPct(limitPrice: number, price: number, choices: readonly number[]): number {
  const want = price > 0 && limitPrice > 0 ? (limitPrice / price - 1) * 100 : 0;
  return choices.reduce(
    (best, pct) => (Math.abs(pct - want) < Math.abs(best - want) ? pct : best),
    choices[0] ?? 0,
  );
}

/**
 * 매수 예약 → 1단계 초안.
 *
 * 이유·계획은 예약 주문에 실려 오지 않으므로(`pendingFromServerOrders`) 2단계에서 다시
 * 고른다. 금액·주 수·주문 방식만 채워 두는 것이 지금 되살릴 수 있는 전부다.
 */
export function buyDraftFromPending(order: PendingOrder, price: number): BuyDraft {
  const limit = order.kind === "limit";
  const shares = Number(order.requestedQty ?? 0) || 0;
  const byQty = order.requestMode === "qty" && shares > 0;
  const amount = Math.round(Number(order.reservedAmount ?? order.amount) || 0);
  const preset = !byQty && (BUY_AMOUNT_PRESETS as readonly number[]).includes(amount);
  return {
    ...blankBuyDraft(),
    buyBy: byQty ? "qty" : "amount",
    amount: byQty ? 0 : amount,
    shares: byQty ? shares : 0,
    amountSource: preset ? "preset" : "custom",
    orderType: limit ? "limit" : "market",
    limitPct: limit ? nearestLimitPct(Number(order.price) || 0, price, BUY_LIMIT_PCTS) : 0,
  };
}

/** 매도 예약 → 1단계 초안. 잠겨 있던 수량은 예약을 취소한 뒤라 그대로 다시 팔 수 있다. */
export function sellDraftFromPending(
  order: PendingOrder,
  price: number,
  availableQty: number,
): SellDraft {
  const limit = order.kind === "limit";
  return {
    ...blankSellDraft(availableQty),
    sellBy: "qty",
    qty: Number(order.reservedQty ?? order.qty) || 0,
    orderType: limit ? "limit" : "market",
    limitPct: limit ? nearestLimitPct(Number(order.price) || 0, price, SELL_LIMIT_PCTS) : 0,
  };
}

/**
 * 주 수 입력의 최소 단위. 0.01 주다.
 *
 * 화면과 계약이 이미 이 자리에서 끊고 있다 — `buyMath`·`sellMath` 의 티끌 경고(`< 0.01`),
 * 챗봇 요청 계약(`f10-chatbot/lib/contracts.ts`)의 소수 둘째 자리 반올림, 확인 화면의
 * `toFixed(2)` 가 모두 같은 자리다. 키패드만 더 잘게 받으면 화면에 적힌 수와 주문에
 * 들어간 수가 갈린다.
 */
export const QTY_DECIMALS = 2;

/**
 * 주 수 키패드 한 타. 매수·매도가 같은 규칙을 쓰도록 계산만 여기에 둔다.
 *
 * 문자열이 원본인 것은 `0.` 처럼 **아직 숫자가 아닌 중간 상태**가 있기 때문이다. 숫자
 * 상태만 두면 소수점을 누른 순간 값이 그대로라 아무 일도 안 일어난 것처럼 보인다.
 */
export function appendQtyKey(current: string, key: string): string {
  if (key === "←") return current.slice(0, -1);
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  if (!/^[0-9]$/.test(key)) return current;
  // `0` 뒤에 숫자를 이어 붙이면 `05` 가 된다. 소수점 뒤(`0.`)는 그대로 이어 붙인다.
  if (current === "0") return key;
  const dot = current.indexOf(".");
  if (dot >= 0 && current.length - dot - 1 >= QTY_DECIMALS) return current;
  return current + key;
}

/** 화면에 그리는 주 수. 최소 단위까지만 남기고 불필요한 0 은 붙이지 않는다. */
export function formatQty(qty: number): string {
  const unit = 10 ** QTY_DECIMALS;
  return String(Math.round((qty || 0) * unit) / unit);
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
  // 주 수도 0.01 주까지 살 수 있으므로 상한을 정수로 깎지 않는다. 정수로 깎으면 주가가
  // 지갑보다 비쌀 때 상한이 0 이 돼서 소수 주문이 통째로 막힌다.
  const maxShares = execPrice > 0 ? Math.floor((availableCash / execPrice) * 10 ** QTY_DECIMALS) / 10 ** QTY_DECIMALS : 0;
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
