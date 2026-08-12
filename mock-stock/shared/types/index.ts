export type TradeSide = "buy" | "sell";

/** 가족 구성원. 데모는 부모 1 + 자녀 1이다. */
export type FamilyMember = "child" | "parent";

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
  member: FamilyMember;
  symbol: string;
  quantity: number;
  price: number;
  tradedAt: string;
};

/** 가족 거래 피드의 코멘트. 통합문서 v2.7 §11.4 */
export type TradeComment = {
  id: string;
  tradeId: string;
  author: FamilyMember;
  body: string;
  createdAt: string;
};
