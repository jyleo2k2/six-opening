import type { Account, AccountHolding, Proposal } from '../types';

/**
 * 시연용 자녀 계좌 시드.
 *
 * 게임 종목은 익명 가상 회사가 됐으므로(기획서 §7.1) 계좌는 게임 데이터와 분리된
 * 실종목 mock 카탈로그를 쓴다. 게임과의 연결고리는 종목이 아니라 **개념**이다 —
 * 제안 사유가 게임에서 겪은 사건(한류 열풍, 반도체 슈퍼사이클…)을 근거로 나온다.
 *
 * TODO(T4): 데모 스크립트 확정 후 보유종목·손익을 시나리오에 맞게 조정한다.
 *   지금은 '수익 종목 1 · 손실 종목 1 · 본전 1 · 현금 여유'로 잡아 제안서 대화가 자연스럽게 나오게 했다.
 */
export interface MockStock {
  ticker: string;
  name: string;
  sector: string;
  /** 현재가(원) — 시연용 근사값. 실연동 시 어댑터가 대체한다 */
  price: number;
  blurb: string;
}

export const STOCKS: readonly MockStock[] = [
  {
    ticker: '005930',
    name: '삼성전자',
    sector: '반도체',
    price: 79_800,
    blurb: '우리나라에서 제일 큰 전자 회사예요. 메모리 반도체를 세계에서 가장 많이 만들어요.',
  },
  {
    ticker: '035720',
    name: '카카오',
    sector: 'IT·플랫폼',
    price: 51_000,
    blurb: '메신저부터 택시 호출까지, 스마트폰 속 생활 서비스를 만들어요.',
  },
  {
    ticker: '105560',
    name: 'KB금융',
    sector: '금융',
    price: 78_500,
    blurb: '은행·카드·증권을 거느린 금융 그룹이에요.',
  },
  {
    ticker: '005380',
    name: '현대차',
    sector: '자동차',
    price: 213_000,
    blurb: '우리나라 대표 자동차 회사예요. 전기차와 수소차도 만들어요.',
  },
  {
    ticker: '352820',
    name: '하이브',
    sector: '엔터테인먼트',
    price: 265_000,
    blurb: '세계 무대에서 활약하는 아이돌 그룹들이 소속된 회사예요.',
  },
] as const;

export function findStock(ticker: string): MockStock | undefined {
  return STOCKS.find((s) => s.ticker === ticker);
}

function holding(ticker: string, qty: number, costRatio: number): AccountHolding {
  const stock = findStock(ticker);
  if (!stock) throw new Error(`시드에 없는 종목: ${ticker}`);
  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    qty,
    avgCost: Math.round(stock.price * costRatio),
    price: stock.price,
  };
}

export const CHILD_ACCOUNT: Account = {
  id: 'acct-child-001',
  ownerName: '이서준',
  cash: 320_000,
  holdings: [
    holding('005930', 4, 0.88), // 삼성전자 — 수익 중
    holding('035720', 3, 1.12), // 카카오 — 손실 중
    holding('105560', 2, 1.0), //  KB금융 — 본전
  ],
};

export const SEED_PROPOSALS: Proposal[] = [
  {
    id: 'prop-001',
    childId: CHILD_ACCOUNT.id,
    ticker: '005380',
    name: '현대차',
    qty: 1,
    reason: '게임에서 자동차 섹터가 경기가 좋아질 때 많이 올랐어요. 아빠 차도 현대차예요.',
    status: 'pending',
    createdAt: '2026-08-05T09:12:00+09:00',
  },
  {
    id: 'prop-002',
    childId: CHILD_ACCOUNT.id,
    ticker: '352820',
    name: '하이브',
    qty: 1,
    reason: '게임에서 한류 열풍 사건이 터졌을 때 엔터 회사가 제일 많이 올랐어요. 저 그 가수 팬이기도 해요.',
    status: 'approved',
    createdAt: '2026-07-28T20:03:00+09:00',
    decidedAt: '2026-07-29T07:40:00+09:00',
    parentNote: '이유를 잘 설명했네. 한 주만 사보자.',
  },
];
