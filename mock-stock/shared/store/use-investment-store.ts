"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Holding, ReasonRecord, Trade, TradeSide } from "@/shared/types";

type Store = {
  cash: number;
  holdings: Holding[];
  trades: Trade[];
  detailEvents: { symbol: string; type: "view" | "tab"; at: string }[];
  recordDetailEvent: (symbol: string, type: "view" | "tab") => void;
  executeTrade: (symbol: string, side: TradeSide, quantity: number, price: number, record: ReasonRecord) => void;
};

const initialHoldings: Holding[] = [
  { symbol: "005930", quantity: 3, averagePrice: 71680 },
  { symbol: "000660", quantity: 2, averagePrice: 192550 },
  { symbol: "005380", quantity: 1, averagePrice: 238800 },
];

export const useInvestmentStore = create<Store>()(persist((set) => ({
  cash: 168500,
  holdings: initialHoldings,
  trades: [],
  detailEvents: [],
  recordDetailEvent: (symbol, type) => set((state) => ({
    detailEvents: [...state.detailEvents, { symbol, type, at: new Date().toISOString() }].slice(-100),
  })),
  executeTrade: (symbol, side, quantity, price, record) => set((state) => {
    const current = state.holdings.find((holding) => holding.symbol === symbol);
    let holdings = state.holdings;
    if (side === "buy") {
      const previousQuantity = current?.quantity ?? 0;
      const nextQuantity = previousQuantity + quantity;
      const averagePrice = ((current?.averagePrice ?? 0) * previousQuantity + price * quantity) / nextQuantity;
      holdings = current
        ? state.holdings.map((holding) => holding.symbol === symbol ? { ...holding, quantity: nextQuantity, averagePrice } : holding)
        : [...state.holdings, { symbol, quantity, averagePrice: price }];
    } else if (current) {
      const nextQuantity = current.quantity - quantity;
      holdings = nextQuantity > 0
        ? state.holdings.map((holding) => holding.symbol === symbol ? { ...holding, quantity: nextQuantity } : holding)
        : state.holdings.filter((holding) => holding.symbol !== symbol);
    }
    const trade: Trade = { ...record, id: crypto.randomUUID(), symbol, quantity, price, tradedAt: new Date().toISOString() };
    return {
      cash: state.cash + (side === "buy" ? -price * quantity : price * quantity),
      holdings,
      trades: [trade, ...state.trades],
    };
  }),
}), {
  name: "kiwoom-family-league",
  storage: createJSONStorage(() => localStorage),
}));
