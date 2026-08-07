import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, type GameState } from '../src';

const P = [
  { id: 'p0', nickname: '가' },
  { id: 'p1', nickname: '나' },
];

function fresh(): GameState {
  return createInitialState({ seed: 7, players: P });
}

function must(state: GameState, action: Parameters<typeof reduce>[1]): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('매수', () => {
  it('시장가 즉시 체결 — 현금 차감, 보유 기록', () => {
    const s0 = fresh();
    const price = s0.prices['deundeun-bank'];
    const s1 = must(s0, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 10 });

    const me = s1.players[0];
    expect(me.cash).toBe(1_000_000 - price * 10);
    expect(me.holdings).toEqual([{ companyId: 'deundeun-bank', qty: 10, avgCost: price }]);
  });

  it('추가 매수는 평균단가 가중평균', () => {
    let s = fresh();
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 10 }); // @9,900
    // 가격이 변한 뒤 추가 매수 — 테스트에서만 시세판을 직접 조작한다
    s.prices['deundeun-bank'] = 19_900;
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 10 });

    const holding = s.players[0].holdings[0];
    expect(holding.qty).toBe(20);
    expect(holding.avgCost).toBeCloseTo((9_900 * 10 + 19_900 * 10) / 20);
  });

  it('현금 부족·비정수 수량·없는 종목을 거부한다', () => {
    const s = fresh();
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'hanbit-semi', qty: 12 }).ok).toBe(false); // 86,000×12 > 100만
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 0 }).ok).toBe(false);
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: -1 }).ok).toBe(false);
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 1.5 }).ok).toBe(false);
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'samsung', qty: 1 }).ok).toBe(false);
    expect(reduce(s, { type: 'buy', playerId: 'ghost', companyId: 'deundeun-bank', qty: 1 }).ok).toBe(false);
  });
});

describe('매도', () => {
  it('보유분 안에서 판다 — 현금 증가, 전량 매도 시 보유 제거', () => {
    let s = fresh();
    const price = s.prices['sopung-tour'];
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'sopung-tour', qty: 10 });
    s = must(s, { type: 'sell', playerId: 'p0', companyId: 'sopung-tour', qty: 4 });

    expect(s.players[0].holdings[0].qty).toBe(6);
    expect(s.players[0].cash).toBe(1_000_000 - price * 10 + price * 4);

    s = must(s, { type: 'sell', playerId: 'p0', companyId: 'sopung-tour', qty: 6 });
    expect(s.players[0].holdings).toEqual([]);
    expect(s.players[0].cash).toBe(1_000_000);
  });

  it('초과 매도·미보유 종목·비정수 수량을 거부한다 (공매도 없음)', () => {
    let s = fresh();
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'sopung-tour', qty: 3 });
    expect(reduce(s, { type: 'sell', playerId: 'p0', companyId: 'sopung-tour', qty: 4 }).ok).toBe(false);
    expect(reduce(s, { type: 'sell', playerId: 'p0', companyId: 'gureum-air', qty: 1 }).ok).toBe(false);
    expect(reduce(s, { type: 'sell', playerId: 'p0', companyId: 'sopung-tour', qty: 0.5 }).ok).toBe(false);
  });
});

describe('페이즈 제한', () => {
  it('매매는 준비 페이즈 전용이다', () => {
    const chat = must(fresh(), { type: 'advancePhase' });
    expect(chat.phase).toBe('chat');
    expect(reduce(chat, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 1 }).ok).toBe(false);
    expect(reduce(chat, { type: 'sell', playerId: 'p0', companyId: 'deundeun-bank', qty: 1 }).ok).toBe(false);
  });
});

describe('reduce 순수성', () => {
  it('입력 상태를 변형하지 않는다', () => {
    const s0 = fresh();
    const snapshot = structuredClone(s0);
    reduce(s0, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 5 });
    reduce(s0, { type: 'advancePhase' });
    expect(s0).toEqual(snapshot);
  });
});
