export type TradeSide = "buy" | "sell";

export type Stock = {
  symbol: string;
  name: string;
  sector: string;
  logo: string;
  price: number;
  change: number;
  rate: number;
  description: string;
  recent: string;
  chart: number[];
};

export type Quote = Pick<Stock, "symbol" | "name" | "price" | "change" | "rate"> & {
  updatedAt: string;
  source: "kiwoom" | "fixture";
};

export type Holding = { symbol: string; quantity: number; averagePrice: number };

export type ReasonRecord = {
  side: TradeSide;
  reason: string;
  confidence?: 25 | 50 | 75 | 100;
  memo: string;
};

export type Trade = ReasonRecord & {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  tradedAt: string;
};
