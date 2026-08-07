import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, RULES, type Action, type GameState } from '../src';
import { players } from './setup.test';

function fresh(): GameState {
  return createInitialState({ seed: 7, players: players(2) });
}

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('금액 기반 매수 (소수점 주식)', () => {
  it('10만원어치 삼성전자 — 현금 차감, 수량 = 금액/가격', () => {
    const s0 = fresh();
    const s1 = must(s0, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 100_000 });
    const me = s1.players[0];
    expect(me.cash).toBe(1_000_000 - 100_000);
    expect(me.holdings[0].qty).toBeCloseTo(100_000 / 71_000, 6);
    expect(me.boughtSectors).toEqual(['semi']);
    expect(me.heldEver).toEqual(['sec1']);
  });

  it('고가주(삼성바이오 78만원)도 1만원어치 살 수 있다', () => {
    const s = must(fresh(), { type: 'buy', playerId: 'p0', companyId: 'bio2', amount: 10_000 });
    expect(s.players[0].holdings[0].qty).toBeCloseTo(10_000 / 780_000, 8);
  });

  it('잔고 초과 금액은 잔고로 캡, 최소 1만원 미만은 거부', () => {
    let s = fresh();
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'net2', amount: 5_000_000 });
    expect(s.players[0].cash).toBe(0);
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'net2', amount: 10_000 }).ok).toBe(false);
    expect(reduce(fresh(), { type: 'buy', playerId: 'p0', companyId: 'net2', amount: 9_999 }).ok).toBe(false);
    expect(reduce(fresh(), { type: 'buy', playerId: 'p0', companyId: 'ghost', amount: 10_000 }).ok).toBe(false);
  });
});

describe('매도', () => {
  it('부분 매도 후 잔량 유지, 전액 매도 시 보유 정리(먼지 포함)', () => {
    let s = fresh();
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'trv1', amount: 200_000 });
    s = must(s, { type: 'sell', playerId: 'p0', companyId: 'trv1', amount: 50_000 });
    expect(s.players[0].cash).toBe(1_000_000 - 200_000 + 50_000);
    expect(s.players[0].holdings[0].qty * s.prices.trv1).toBeCloseTo(150_000, 4);

    s = must(s, { type: 'sell', playerId: 'p0', companyId: 'trv1', amount: 999_999_999 });
    expect(s.players[0].holdings).toEqual([]);
    expect(s.players[0].cash).toBe(1_000_000);
  });

  it('미보유 종목 매도 거부', () => {
    expect(reduce(fresh(), { type: 'sell', playerId: 'p0', companyId: 'trv1', amount: 10_000 }).ok).toBe(false);
  });
});

describe('페이즈 제한·순수성', () => {
  it('매매는 준비 페이즈 전용', () => {
    const chat = must(fresh(), { type: 'advancePhase' });
    expect(chat.phase).toBe('chat');
    expect(reduce(chat, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 10_000 }).ok).toBe(false);
  });

  it('reduce는 입력을 변형하지 않는다', () => {
    const s0 = fresh();
    const snapshot = structuredClone(s0);
    reduce(s0, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 50_000 });
    reduce(s0, { type: 'advancePhase' });
    expect(s0).toEqual(snapshot);
  });

  it('최소 거래 단위 상수 정합성', () => {
    expect(RULES.minTradeAmount).toBe(RULES.tradeStep);
  });
});
