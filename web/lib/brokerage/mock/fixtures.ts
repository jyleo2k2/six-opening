import { RULES } from 'game';
import { STOCK_CARDS } from 'game/data';
import type { Account, AccountHolding, Proposal } from '../types';

/**
 * 시연용 자녀 계좌 시드.
 *
 * 게임에 나오는 종목과 같은 카드 풀을 쓴다 — 게임에서 배운 회사가 내 계좌에 그대로 있어야
 * "게임 → 도감 → 내 계좌 → 제안"의 흐름이 하나로 이어진다.
 *
 * TODO(T4): 데모 스크립트 확정 후 보유종목·손익을 시나리오에 맞게 조정한다.
 *   지금은 '수익 종목 1 · 손실 종목 1 · 현금 여유'로 잡아 제안서 대화가 자연스럽게 나오게 했다.
 */
const pick = (id: string) => {
  const card = STOCK_CARDS.find((c) => c.id === id);
  if (!card) throw new Error(`시드에 없는 카드: ${id}`);
  return card;
};

function holding(id: string, qty: number, costRatio: number): AccountHolding {
  const card = pick(id);
  return {
    ticker: card.ticker,
    name: card.name,
    market: card.market,
    sector: card.sector,
    qty,
    avgCost: Math.round(card.basePrice * costRatio * 100) / 100,
    price: card.basePrice,
  };
}

export const CHILD_ACCOUNT: Account = {
  id: 'acct-child-001',
  ownerName: '이서준',
  cash: { KRW: 320_000, USD: 40 },
  holdings: [
    holding('kr-005930', 4, 0.88), // 삼성전자 — 수익 중
    holding('us-KO', 3, 1.12), //     코카콜라 — 손실 중
    holding('kr-105560', 2, 1.0), //  KB금융 — 본전
  ],
  fxRate: RULES.FX_RATE,
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
    ticker: 'NVDA',
    name: '엔비디아',
    qty: 1,
    reason: 'AI 반도체 열풍 카드가 나왔을 때 제일 많이 올랐어요.',
    status: 'approved',
    createdAt: '2026-07-28T20:03:00+09:00',
    decidedAt: '2026-07-29T07:40:00+09:00',
    parentNote: '이유를 잘 설명했네. 한 주만 사보자.',
  },
];
