import { describe, expect, it } from 'vitest';
import { getEvent, sectorName } from '../data';
import { createInitialState, infoPrice, reduce, RULES, type Action, type GameState } from '../src';
import { players } from './setup.test';

function fresh(seed = 11, n = 3): GameState {
  return createInitialState({ seed, players: players(n) });
}

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('정보소 — 게임당 2회, 해설/정찰 2탭', () => {
  it('구매: 현금 차감·잔여 횟수 감소·결과는 본인만·사실은 공개', () => {
    const s = must(fresh(), { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 3 });
    expect(s.players[0].cash).toBe(1_000_000 - RULES.infoPrices[2]);
    expect(s.players[0].infoLeft).toBe(1);
    expect(s.players[0].intel).toHaveLength(1);
    expect(s.players[1].intel).toHaveLength(0);
    expect(s.purchases).toEqual([{ turn: 1, playerId: 'p0', tab: 'analysis', tier: 3 }]);
  });

  it('게임당 2회 — 세 번째 구매는 거부', () => {
    let s = fresh();
    s = must(s, { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 1 });
    s = must(s, { type: 'buyInfo', playerId: 'p0', tab: 'scout', tier: 1 });
    expect(reduce(s, { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 1 }).ok).toBe(false);
  });

  it('꼴찌는 50% 할인', () => {
    const full = RULES.infoPrices[2];
    const half = Math.round(full * RULES.catchupDiscount);
    let s = fresh();
    expect(infoPrice(s, 'p0', 3)).toBe(full);
    s = must(s, { type: 'buy', playerId: 'p1', companyId: 'sec1', amount: 10_000 }); // 매수는 총자산 불변 → 아직 공동
    expect(infoPrice(s, 'p0', 3)).toBe(full);
    // p0이 정보를 사서 현금이 줄면 단독 꼴찌가 된다
    s = must(s, { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 1 });
    expect(infoPrice(s, 'p0', 3)).toBe(half);
    expect(infoPrice(s, 'p1', 3)).toBe(full);
  });

  it('🥇 해설 보고서 — hint 동봉, 95%는 이번 사건의 모든 영향 섹터를 언급', () => {
    const trials = 100;
    let full = 0;
    for (let seed = 0; seed < trials; seed++) {
      const s = must(fresh(seed), { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 3 });
      const event = getEvent(s.eventQueue[0]);
      const record = s.players[0].intel[0];
      expect(record.hint).toBeDefined();
      expect(record.text).toContain(sectorName(record.hint!.sector)); // 힌트는 텍스트 요지와 일치
      if (Object.keys(event.imp).every((sec) => record.text.includes(sectorName(sec as never)))) full += 1;
    }
    expect(full / trials).toBeGreaterThan(0.88); // 명목 95% − 표본 오차
  });

  it('정찰 결과에는 hint가 없다 (해설 전용)', () => {
    const s = must(fresh(), { type: 'buyInfo', playerId: 'p0', tab: 'scout', tier: 1 });
    expect(s.players[0].intel[0].hint).toBeUndefined();
  });

  it('🥇 전체 정찰은 전원의 실제 보유를 요약한다', () => {
    let s = fresh();
    s = must(s, { type: 'buy', playerId: 'p1', companyId: 'ent1', amount: 100_000 });
    s = must(s, { type: 'buyInfo', playerId: 'p0', tab: 'scout', tier: 3 });
    const text = s.players[0].intel[0].text;
    expect(text).toContain('하이브');
    expect(text).toContain('봇2'); // 빈손 플레이어는 '전액 현금'으로
    expect(text).toContain('전액 현금');
  });

  it('페이즈 제한·티어/탭 검증·재현성', () => {
    const chatPhase = must(fresh(), { type: 'advancePhase' });
    expect(reduce(chatPhase, { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 1 }).ok).toBe(false);
    expect(reduce(fresh(), { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 4 as 1 }).ok).toBe(false);
    expect(reduce(fresh(), { type: 'buyInfo', playerId: 'p0', tab: 'x' as 'scout', tier: 1 }).ok).toBe(false);

    const a = must(fresh(77), { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 1 });
    const b = must(fresh(77), { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier: 1 });
    expect(a.players[0].intel).toEqual(b.players[0].intel);
  });

  it('찌라시(~50%)·리포트(~75%) 적중률 실측 — 핵심 섹터를 맞히는 비율', () => {
    const trials = 200;
    const rates: number[] = [];
    for (const tier of [1, 2] as const) {
      let hits = 0;
      for (let seed = 0; seed < trials; seed++) {
        const s = must(fresh(seed), { type: 'buyInfo', playerId: 'p0', tab: 'analysis', tier });
        const event = getEvent(s.eventQueue[0]);
        const text = s.players[0].intel[0].text;
        const mentioned = Object.keys(event.imp).some((sec) => text.includes(sectorName(sec as never)));
        if (mentioned) hits += 1;
      }
      rates.push(hits / trials);
    }
    // 빗나가도 우연히 영향 섹터를 찍을 수 있어 명목치보다 다소 높게 나온다
    expect(rates[0]).toBeGreaterThan(0.45);
    expect(rates[1]).toBeGreaterThan(rates[0] - 0.05);
    expect(rates[1]).toBeGreaterThan(0.7);
  });
});
