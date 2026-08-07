/**
 * 실계좌(mock) 도메인 타입 — 제안서 트랙 소유.
 * 게임 타입과 일부러 분리한다: 게임 종목은 익명 가상 회사(기획서 §7.1)지만
 * 여기는 실제 시장을 보여주는 자녀 영웅문 셸이다.
 */
export interface AccountHolding {
  ticker: string;
  name: string;
  /** 섹터 표시 문자열 (예: '반도체') — 게임 섹터 enum에 묶지 않는다 */
  sector: string;
  qty: number;
  /** 평균 매수 단가(원) */
  avgCost: number;
  /** 현재가(원) */
  price: number;
}

export interface Account {
  id: string;
  ownerName: string;
  /** 예수금(원) — 국내 계좌만 다룬다 */
  cash: number;
  holdings: AccountHolding[];
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
