import { describe, expect, it } from 'vitest';
import { COMPANIES, EVENTS, NOISE_NEWS, SECTOR_INFOS, getEvent } from '../data';
import { createInitialState, RULES, SECTORS, type SetupPlayer } from '../src';

export function players(n: number): SetupPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    nickname: `봇${i}`,
    color: '#4dc8ff',
    ch: String(i),
  }));
}

describe('데이터 팩 (2011-2020, 영웅키움 v2)', () => {
  it('실명 종목 16 = 8섹터 × 2', () => {
    expect(COMPANIES).toHaveLength(16);
    for (const sector of SECTORS) {
      expect(COMPANIES.filter((c) => c.sector === sector)).toHaveLength(2);
    }
  });

  it('사건 12종 — imp는 실제 관찰 등락률(±50% 이내), 전조 섹터는 imp에 포함된다', () => {
    expect(EVENTS).toHaveLength(12);
    for (const event of EVENTS) {
      const entries = Object.entries(event.imp);
      expect(entries.length).toBeGreaterThan(0);
      for (const [, imp] of entries) {
        expect(Math.abs(imp!)).toBeLessThanOrEqual(0.5);
        expect(imp).not.toBe(0);
      }
      expect(event.imp[event.clueSector]).toBeDefined();
      expect(event.clueText.length).toBeGreaterThan(0);
      expect(event.window).toMatch(/거래일/);
    }
  });

  it('노이즈 뉴스는 섹터당 1개 — 어느 사건이 와도 배달 풀이 인원수를 감당한다', () => {
    expect(NOISE_NEWS).toHaveLength(8);
    expect(new Set(NOISE_NEWS.map((n) => n.sector)).size).toBe(8);
    expect(SECTOR_INFOS).toHaveLength(8);
  });
});

describe('createInitialState', () => {
  it('2~8인, 라운드 수 옵션(퀵 3/정규 5)', () => {
    expect(() => createInitialState({ seed: 1, players: players(1) })).toThrow();
    expect(() => createInitialState({ seed: 1, players: players(9) })).toThrow();
    expect(createInitialState({ seed: 1, players: players(2), turns: RULES.turnsQuick }).turns).toBe(3);
    expect(createInitialState({ seed: 1, players: players(8) }).turns).toBe(RULES.turnsRegular);
    expect(() => createInitialState({ seed: 1, players: players(2), turns: 99 })).toThrow();
  });

  it('시드 100만 · 정보 2회 · MDD 0 · 시세판 basePrice', () => {
    const state = createInitialState({ seed: 7, players: players(4) });
    for (const player of state.players) {
      expect(player.cash).toBe(RULES.seedCash);
      expect(player.infoLeft).toBe(RULES.infoUsesPerGame);
      expect(player.holdings).toEqual([]);
      expect(player.maxDrawdown).toBe(0);
      expect(player.notFooled).toBe(0);
    }
    for (const company of COMPANIES) {
      expect(state.prices[company.id]).toBe(company.basePrice);
    }
  });

  it('사건은 비복원 추첨 — 라운드 수만큼, 중복 없음', () => {
    const state = createInitialState({ seed: 42, players: players(8), turns: 5 });
    expect(state.eventQueue).toHaveLength(5);
    expect(new Set(state.eventQueue).size).toBe(5);
  });

  it('같은 시드 = 같은 판 (사건 큐·뉴스 배정까지 전부 재현)', () => {
    const a = createInitialState({ seed: 123, players: players(8) });
    const b = createInitialState({ seed: 123, players: players(8) });
    expect(a).toEqual(b);
  });

  it('뉴스: 전원 1개씩 — 진짜 전조는 딱 2명, 나머지는 사건 섹터가 아닌 노이즈', () => {
    const state = createInitialState({ seed: 99, players: players(8) });
    const event = getEvent(state.eventQueue[0]);
    const reals = state.players.filter((p) => p.news[0].real === true);
    const noises = state.players.filter((p) => p.news[0].real === false);

    expect(reals).toHaveLength(RULES.clueHolders);
    expect(noises).toHaveLength(8 - RULES.clueHolders);
    for (const p of reals) {
      expect(p.news[0].sector).toBe(event.clueSector);
      expect(p.news[0].text).toBe(event.clueText);
    }
    for (const p of noises) {
      expect(p.news[0].sector).not.toBe(event.clueSector);
    }
  });

  it('2인 게임이면 둘 다 진짜 전조를 받는다', () => {
    const state = createInitialState({ seed: 5, players: players(2) });
    expect(state.players.every((p) => p.news[0].real === true)).toBe(true);
  });
});
