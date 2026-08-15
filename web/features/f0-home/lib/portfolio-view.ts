import { SECTORS } from "../../../shared/data/sectors";
import { STOCKS } from "../../../shared/data/stocks";
import { reservedSellQty } from "../../f2-trade/lib/scheduled-orders.js";
import { SEED, accountTotalAsset } from "../../../shared/store/prototype-account.js";

/**
 * 계좌 화면이 그릴 값. `ui-src/methods/renderVals-compute.js` 와
 * `renderVals-return-6-sell.js` 에서 그대로 옮겨 왔다.
 *
 * 계산을 화면에서 떼어 두는 이유는 브라우저 없이 확인하기 위해서다 — 여기가 틀리면
 * 지갑이 틀린 금액을 보여 주는데, 화면만 봐서는 어느 항목이 틀렸는지 알기 어렵다.
 */

const UP = "#E8322E";
const DOWN = "#1668DC";

export type Holding = { code: string; qty: number; avg: number };
export type PendingOrder = {
  id?: string;
  side?: string;
  kind?: string;
  code?: string;
  price?: number;
  amount?: number;
  qty?: number;
  reservedAmount?: number;
  reservedQty?: number;
  scheduledFor?: string;
};
export type Account = {
  name?: string;
  cash: number;
  holdings: Holding[];
  pending: PendingOrder[];
};

/** 종목 코드 → 이름·업종. 이름은 `shared/data/stocks.ts` 가 원본이다. */
const STOCK_BY_CODE = new Map(STOCKS.map((stock) => [stock.symbol, stock]));
const SECTOR_LABEL = new Map(SECTORS.map((sector) => [sector.key, sector.label]));

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export function priceOfFrom(prices: Record<string, number>) {
  return (code: string) => prices[code] ?? 0;
}

export function accountSummary(account: Account, prices: Record<string, number>) {
  const total = accountTotalAsset(account, priceOfFrom(prices));
  const pnl = total - SEED;
  return {
    meName: account.name ?? "",
    totalAssetText: won(total),
    cashText: won(account.cash),
    pnlText: `${pnl >= 0 ? "▲ +" : "▼ "}${Math.abs(Math.round(pnl)).toLocaleString("ko-KR")}원`,
    pnlStyle:
      "font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:" +
      (pnl >= 0 ? UP : DOWN),
  };
}

export function holdingCards(account: Account, prices: Record<string, number>, locked: boolean) {
  return account.holdings
    .map((h) => {
      const stock = STOCK_BY_CODE.get(h.code);
      // 유니버스에 없는 종목은 그리지 않는다. 화면도 그랬다 — 이름도 가격도 댈 수 없다.
      if (!stock) return null;
      const price = prices[h.code] ?? 0;
      const val = price * h.qty;
      const cost = h.avg * h.qty;
      const d = val - cost;
      const pct = cost > 0 ? (d / cost) * 100 : 0;
      const sectorLabel = SECTOR_LABEL.get(stock.sector) ?? "";
      const reserved = reservedSellQty(account.pending || [], h.code);
      const available = Math.max(0, h.qty - reserved);
      return {
        code: h.code,
        name: stock.name,
        emoji: sectorLabel.charAt(0),
        qtyText: `${h.qty.toFixed(2)}주${reserved > 0 ? ` · ${reserved.toFixed(2)}주 예약` : ""}`,
        avgText: `${Math.round(h.avg).toLocaleString("ko-KR")}원`,
        valueText: won(val),
        pnlText: `${d >= 0 ? "▲ +" : "▼ "}${Math.abs(pct).toFixed(1)}%`,
        pnlStyle:
          "font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;margin-top:3px;white-space:nowrap;color:" +
          (d >= 0 ? UP : DOWN),
        // [옮기면서 발견] 아래 background 값은 쉼표 뒤에 box-shadow 조각이 붙어 있어 CSS 가
        // 통째로 버린다. 즉 지금도 배지에 배경이 안 깔린다. 화면을 그대로 옮기는 게 먼저라
        // 고치지 않고 같은 값을 쓴다 — 고칠지는 PR 에서 따로 묻는다.
        badgeStyle:
          "width:40px;height:40px;flex:none;border-radius:14px;display:flex;align-items:center;" +
          "justify-content:center;font-size:19px;background:#F4F4FA,0 0 0 1.5px #8E93A833",
        canBuy: !locked,
        canSell: !locked && available >= 0.01,
        buyStyle:
          "flex:1;text-align:center;border-radius:14px;padding:12px;font-size:14.5px;font-weight:700;" +
          (locked ? "color:#B9BDCE;cursor:not-allowed;background:#F1F2F8" : "color:#01185A;cursor:pointer;background:#F1F2F8"),
        sellStyle:
          "flex:1;text-align:center;border-radius:14px;padding:12px;font-size:14.5px;font-weight:700;" +
          (locked || available < 0.01
            ? "color:#E4B7CD;cursor:not-allowed;background:#FAF2F6"
            : "color:#D5327A;cursor:pointer;background:#FDECF4"),
      };
    })
    .filter((card): card is NonNullable<typeof card> => card !== null);
}

export function pendingCards(account: Account) {
  return (account.pending || []).map((order) => {
    const stock = order.code ? STOCK_BY_CODE.get(order.code) : undefined;
    const side = order.side || "buy";
    const reservedAmount = Number(order.reservedAmount ?? order.amount) || 0;
    const reservedQty = Number(order.reservedQty ?? order.qty) || 0;
    const target =
      side === "sell" ? `${reservedQty.toFixed(2)}주 매도` : `${won(reservedAmount)} 매수`;
    return {
      order,
      name: stock ? stock.name : order.code ?? "",
      desc:
        order.kind === "next_open"
          ? `${order.scheduledFor} 장 시작 시가 · ${target} 예약`
          : `${(Number(order.price) || 0).toLocaleString("ko-KR")}원이 되면 ${target}`,
    };
  });
}
