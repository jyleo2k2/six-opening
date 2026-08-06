import { beforeEach, describe, expect, it } from 'vitest';
import {
  SECTORS,
  applyEvent,
  createInitialState,
  currentPlayer,
  priceOf,
  reduce,
  type GameState,
  type Result,
} from '../src/index';

/** 가격 배율을 1로 되돌려 결정적으로 만든 상태 */
function freshState(): GameState {
  const s = createInitialState({ seed: 1 });
  for (const sector of SECTORS) s.priceMods[sector] = 1;
  s.eventLog = [];
  s.activeEventId = null;
  s.players[0].hand = [];
  s.players[1].hand = [];
  return s;
}

function unwrap(r: Result<GameState>): GameState {
  if (!r.ok) throw new Error(`실패해선 안 되는 액션: ${r.reason}`);
  return r.value;
}

const SAMSUNG = 'kr-005930'; // 반도체, 78,000원
const NVIDIA = 'us-NVDA'; //   반도체, $175
const HYUNDAI = 'kr-005380'; // 자동차, 245,000원
const KB = 'kr-105560'; //     금융, 92,000원

describe('매수 (기획서 §7.2)', () => {
  let s: GameState;
  beforeEach(() => {
    s = freshState();
    currentPlayer(s).hand = [SAMSUNG, SAMSUNG, SAMSUNG, HYUNDAI, KB, NVIDIA, NVIDIA];
  });

  it('현금을 지불하고 필드에 올린다', () => {
    const next = unwrap(reduce(s, { type: 'buy', cardId: SAMSUNG, qty: 2 }));
    const p = currentPlayer(next);

    expect(p.cash.KRW).toBe(1_000_000 - 78_000 * 2);
    expect(p.field).toHaveLength(1);
    expect(p.field[0]).toMatchObject({ cardId: SAMSUNG, qty: 2, avgCost: 78_000 });
    expect(p.hand.filter((id) => id === SAMSUNG)).toHaveLength(1);
  });

  it('미국주식은 달러로 결제한다', () => {
    const next = unwrap(reduce(s, { type: 'buy', cardId: NVIDIA, qty: 2 }));
    const p = currentPlayer(next);
    expect(p.cash.USD).toBe(1_000 - 175 * 2);
    expect(p.cash.KRW).toBe(1_000_000);
  });

  it('추가 매수 시 매수가격이 평균단가로 갱신된다 (Q11)', () => {
    let next = unwrap(reduce(s, { type: 'buy', cardId: SAMSUNG, qty: 2 }));

    applyEvent(next, 'ev-ai-boom'); // 반도체 +35% → 105,300원
    expect(priceOf(SAMSUNG, next)).toBe(105_300);

    next = unwrap(reduce(next, { type: 'buy', cardId: SAMSUNG, qty: 1 }));
    const holding = currentPlayer(next).field[0];

    expect(holding.qty).toBe(3);
    expect(holding.avgCost).toBe((78_000 * 2 + 105_300) / 3); // 87,100
  });

  it('패에 없는 수량은 살 수 없다', () => {
    const r = reduce(s, { type: 'buy', cardId: SAMSUNG, qty: 4 });
    expect(r.ok).toBe(false);
  });

  it('현금이 부족하면 거절한다', () => {
    const r = reduce(s, { type: 'buy', cardId: HYUNDAI, qty: 5 });
    expect(r.ok).toBe(false);
  });

  it('종목카드 존 3개를 넘길 수 없다 (§6)', () => {
    let next = s;
    currentPlayer(next).hand = [SAMSUNG, HYUNDAI, KB, NVIDIA];

    next = unwrap(reduce(next, { type: 'buy', cardId: SAMSUNG, qty: 1 }));
    next = unwrap(reduce(next, { type: 'buy', cardId: HYUNDAI, qty: 1 }));
    next = unwrap(reduce(next, { type: 'buy', cardId: KB, qty: 1 }));
    expect(currentPlayer(next).field).toHaveLength(3);

    const r = reduce(next, { type: 'buy', cardId: NVIDIA, qty: 1 });
    expect(r.ok).toBe(false);
  });
});

describe('매도 (기획서 §7.2)', () => {
  it('평가금액으로 팔고 카드는 덱으로 돌아간다', () => {
    const s = freshState();
    currentPlayer(s).hand = [SAMSUNG, SAMSUNG];
    const deckBefore = currentPlayer(s).deck.length;

    let next = unwrap(reduce(s, { type: 'buy', cardId: SAMSUNG, qty: 2 }));
    applyEvent(next, 'ev-ai-boom'); // 105,300원
    next = unwrap(reduce(next, { type: 'sell', cardId: SAMSUNG, qty: 2 }));

    const p = currentPlayer(next);
    expect(p.cash.KRW).toBe(1_000_000 - 78_000 * 2 + 105_300 * 2);
    expect(p.field).toHaveLength(0);
    expect(p.deck.length).toBe(deckBefore + 2);
  });

  it('일부만 팔면 존이 남는다', () => {
    const s = freshState();
    currentPlayer(s).hand = [SAMSUNG, SAMSUNG, SAMSUNG];

    let next = unwrap(reduce(s, { type: 'buy', cardId: SAMSUNG, qty: 3 }));
    next = unwrap(reduce(next, { type: 'sell', cardId: SAMSUNG, qty: 1 }));

    expect(currentPlayer(next).field[0].qty).toBe(2);
  });

  it('없는 종목은 팔 수 없다', () => {
    expect(reduce(freshState(), { type: 'sell', cardId: SAMSUNG, qty: 1 }).ok).toBe(false);
  });
});

describe('환전 (기획서 §7.2)', () => {
  it('기준환율로 원↔달러를 수수료 없이 바꾼다', () => {
    const s = freshState();

    const toUsd = unwrap(reduce(s, { type: 'exchange', from: 'KRW', amount: 145_000 }));
    expect(currentPlayer(toUsd).cash.USD).toBe(1_100);
    expect(currentPlayer(toUsd).cash.KRW).toBe(855_000);

    const toKrw = unwrap(reduce(s, { type: 'exchange', from: 'USD', amount: 100 }));
    expect(currentPlayer(toKrw).cash.KRW).toBe(1_145_000);
    expect(currentPlayer(toKrw).cash.USD).toBe(900);
  });

  it('잔액을 넘으면 거절한다', () => {
    expect(reduce(freshState(), { type: 'exchange', from: 'USD', amount: 2_000 }).ok).toBe(false);
  });
});

describe('스킬카드 (기획서 §4.2 / Q1)', () => {
  it('섹터 단위로 가격을 움직이고 양쪽 필드에 함께 적용된다', () => {
    const s = freshState();
    currentPlayer(s).hand = ['sk-ai-doubt'];

    const next = unwrap(reduce(s, { type: 'playSkill', cardId: 'sk-ai-doubt' }));

    expect(priceOf(SAMSUNG, next)).toBe(Math.round(78_000 * 0.9)); // 70,200
    expect(priceOf(NVIDIA, next)).toBe(157.5); // 175 * 0.9 — 상대 종목도 같이 움직인다
    expect(priceOf(HYUNDAI, next)).toBe(245_000); // 다른 섹터는 그대로
  });

  it('턴당 1장까지만 발동한다', () => {
    const s = freshState();
    currentPlayer(s).hand = ['sk-ai-doubt', 'sk-oil-cut'];

    const next = unwrap(reduce(s, { type: 'playSkill', cardId: 'sk-ai-doubt' }));
    expect(reduce(next, { type: 'playSkill', cardId: 'sk-oil-cut' }).ok).toBe(false);
  });

  it('사용한 스킬카드는 덱으로 돌아가지 않는다', () => {
    const s = freshState();
    currentPlayer(s).hand = ['sk-ai-doubt'];
    const deckBefore = currentPlayer(s).deck.length;

    const next = unwrap(reduce(s, { type: 'playSkill', cardId: 'sk-ai-doubt' }));
    expect(currentPlayer(next).deck.length).toBe(deckBefore);
    expect(currentPlayer(next).hand).not.toContain('sk-ai-doubt');
  });
});

describe('패↔덱 교체 (기획서 §5 / Q7)', () => {
  it('종류 단위로 전량이 함께 이동한다', () => {
    const s = freshState();
    const p = currentPlayer(s);
    p.hand = [SAMSUNG, SAMSUNG];
    p.deck = [HYUNDAI, HYUNDAI, HYUNDAI, KB];

    const next = unwrap(reduce(s, { type: 'swapDeck', handCardId: SAMSUNG, deckCardId: HYUNDAI }));
    const np = currentPlayer(next);

    expect(np.hand.filter((id) => id === HYUNDAI)).toHaveLength(3);
    expect(np.hand).not.toContain(SAMSUNG);
    expect(np.deck.filter((id) => id === SAMSUNG)).toHaveLength(2);
    expect(np.deck).not.toContain(HYUNDAI);
  });

  it('턴당 1회로 제한된다', () => {
    const s = freshState();
    const p = currentPlayer(s);
    p.hand = [SAMSUNG, KB];
    p.deck = [HYUNDAI, NVIDIA];

    const next = unwrap(reduce(s, { type: 'swapDeck', handCardId: SAMSUNG, deckCardId: HYUNDAI }));
    expect(reduce(next, { type: 'swapDeck', handCardId: KB, deckCardId: NVIDIA }).ok).toBe(false);
  });
});
