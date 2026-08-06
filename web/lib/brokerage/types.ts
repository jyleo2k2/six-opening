import type { Market, Sector } from 'game';

export interface AccountHolding {
  ticker: string;
  name: string;
  market: Market;
  sector: Sector;
  qty: number;
  /** 평균 매수 단가 (시장 통화) */
  avgCost: number;
  /** 현재가 (시장 통화) */
  price: number;
}

export interface Account {
  id: string;
  ownerName: string;
  cash: { KRW: number; USD: number };
  holdings: AccountHolding[];
  fxRate: number;
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

/** 자녀가 부모에게 보내는 투자 제안서 */
export interface Proposal {
  id: string;
  childId: string;
  ticker: string;
  name: string;
  qty: number;
  /** 왜 사고 싶은지 — 아이가 직접 쓴다 */
  reason: string;
  status: ProposalStatus;
  createdAt: string;
  decidedAt?: string;
  /** 부모가 남기는 한마디 */
  parentNote?: string;
}

export interface ProposalInput {
  childId: string;
  ticker: string;
  qty: number;
  reason: string;
}
