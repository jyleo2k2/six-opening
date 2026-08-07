import { describe, expect, it } from 'vitest';
import { EVENTS, getEvent } from '../data';
import { createInitialState, reduce, RULES, type GameState } from '../src';

const P = [
  { id: 'p0', nickname: '가' },
  { id: 'p1', nickname: '나' },
];

function fresh(seed = 11): GameState {
  return createInitialState({ seed, players: P });
}

function must(state: GameState, action: Parameters<typeof reduce>[1]): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('정보소 구매', () => {
  it('현금 차감 + 예보는 본인만 + 구매 사실은 공개 기록', () => {
    const s = must(fresh(), { type: 'buyInfo', playerId: 'p0', tier: 3 });

    expect(s.players[0].cash).toBe(1_000_000 - RULES.infoTiers[2].price);
    expect(s.players[0].forecasts).toHaveLength(1);
    expect(s.players[0].infoBoughtThisTurn).toBe(true);
    expect(s.players[1].forecasts).toHaveLength(0);
    expect(s.purchases).toEqual([{ turn: 1, playerId: 'p0', tier: 3 }]);
  });

  it('턴당 1회 — 두 번째 구매는 거부한다', () => {
    const s = must(fresh(), { type: 'buyInfo', playerId: 'p0', tier: 1 });
    expect(reduce(s, { type: 'buyInfo', playerId: 'p0', tier: 2 }).ok).toBe(false);
  });

  it('현금이 모자라면 거부한다', () => {
    let s = fresh();
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'hanbit-semi', qty: 11 }); // 946,000원 지출 → 잔고 54,000
    expect(reduce(s, { type: 'buyInfo', playerId: 'p0', tier: 2 }).ok).toBe(false); // 80,000원
    expect(reduce(s, { type: 'buyInfo', playerId: 'p0', tier: 1 }).ok).toBe(true); // 30,000원
  });

  it('준비 페이즈 전용·없는 티어 거부', () => {
    const chat = must(fresh(), { type: 'advancePhase' });
    expect(reduce(chat, { type: 'buyInfo', playerId: 'p0', tier: 3 }).ok).toBe(false);
    expect(reduce(fresh(), { type: 'buyInfo', playerId: 'p0', tier: 4 as 1 }).ok).toBe(false);
  });
});

describe('예보 내용', () => {
  it('형태: 실존 이벤트 + 그 이벤트의 최대 상승/하락 섹터 (진위 구별 불가 — 미끼도 같은 형태)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = must(fresh(seed), { type: 'buyInfo', playerId: 'p0', tier: 1 });
      const forecast = s.players[0].forecasts[0];
      const event = getEvent(forecast.eventId); // 없는 이벤트면 throw
      expect(forecast.eventName).toBe(event.name);
      if (forecast.up) {
        expect(event.effects[forecast.up]![1]).toBeGreaterThan(0);
      }
      if (forecast.down) {
        expect(event.effects[forecast.down]![0]).toBeLessThan(0);
      }
    }
  });

  it('같은 시드 = 같은 예보 (재현성)', () => {
    const a = must(fresh(77), { type: 'buyInfo', playerId: 'p0', tier: 2 });
    const b = must(fresh(77), { type: 'buyInfo', playerId: 'p0', tier: 2 });
    expect(a.players[0].forecasts).toEqual(b.players[0].forecasts);
  });

  it('적중률 실측: 찌라시(40%)는 30~50%, 고급 정보(95%)는 88% 이상 (시드 300개)', () => {
    const rates = { 1: 0, 3: 0 };
    const trials = 300;
    for (const tier of [1, 3] as const) {
      let hits = 0;
      for (let seed = 0; seed < trials; seed++) {
        const s = must(fresh(seed), { type: 'buyInfo', playerId: 'p0', tier });
        const forecast = s.players[0].forecasts[0];
        if (forecast.eventId === s.eventQueue[0]) hits += 1;
      }
      rates[tier] = hits / trials;
    }
    expect(rates[1]).toBeGreaterThan(0.3);
    expect(rates[1]).toBeLessThan(0.5);
    expect(rates[3]).toBeGreaterThan(0.88);
  });

  it('빗나간 예보(미끼)는 실존하지만 이번 턴 사건이 아닌 이벤트다', () => {
    const ids = new Set(EVENTS.map((e) => e.id));
    let misses = 0;
    for (let seed = 0; seed < 100; seed++) {
      const s = must(fresh(seed), { type: 'buyInfo', playerId: 'p0', tier: 1 });
      const forecast = s.players[0].forecasts[0];
      if (forecast.eventId !== s.eventQueue[0]) {
        misses += 1;
        expect(ids.has(forecast.eventId)).toBe(true);
      }
    }
    expect(misses).toBeGreaterThan(0); // 40% 티어라 미끼가 반드시 나온다
  });

  it('티어 정의 자체의 무결성 — 가격 오름차순 = 정확도 오름차순', () => {
    const tiers = [...RULES.infoTiers];
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].price).toBeGreaterThan(tiers[i - 1].price);
      expect(tiers[i].accuracy).toBeGreaterThan(tiers[i - 1].accuracy);
    }
  });
});
