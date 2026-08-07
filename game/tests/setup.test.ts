import { describe, expect, it } from 'vitest';
import { COMPANIES, EVENTS, NEWS } from '../data';
import { createInitialState, RULES, SECTORS, type SetupPlayer } from '../src';

function players(n: number): SetupPlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, nickname: `봇${i}` }));
}

describe('데이터 팩 (2011-2020)', () => {
  it('종목은 8섹터 × 2 = 16, 시작가는 5,000~100,000원', () => {
    expect(COMPANIES).toHaveLength(16);
    for (const sector of SECTORS) {
      expect(COMPANIES.filter((c) => c.sector === sector)).toHaveLength(2);
    }
    for (const company of COMPANIES) {
      expect(company.basePrice).toBeGreaterThanOrEqual(5_000);
      expect(company.basePrice).toBeLessThanOrEqual(100_000);
    }
  });

  it('이벤트 13종 — 효과 범위는 min ≤ max이고 부호가 같다 (방향 = 역사 고정)', () => {
    expect(EVENTS).toHaveLength(13);
    for (const event of EVENTS) {
      const ranges = Object.values(event.effects);
      expect(ranges.length).toBeGreaterThan(0);
      for (const [min, max] of ranges) {
        expect(min).toBeLessThanOrEqual(max);
        // 한 범위 안에서 방향이 갈리면 안 된다 — 방향은 데이터, 폭만 랜덤
        expect(min < 0 && max > 0).toBe(false);
      }
    }
  });

  it('뉴스 풀 — 사건마다 단서 ≥ 2, 단서+배경 ≥ 최대 인원 (같은 턴 중복 배달 없음 보장)', () => {
    const backgrounds = NEWS.filter((n) => n.eventId === null);
    for (const event of EVENTS) {
      const clues = NEWS.filter((n) => n.eventId === event.id);
      expect(clues.length).toBeGreaterThanOrEqual(2);
      expect(clues.length + backgrounds.length).toBeGreaterThanOrEqual(RULES.maxPlayers);
    }
  });
});

describe('createInitialState', () => {
  it('2~8인만 허용한다', () => {
    expect(() => createInitialState({ seed: 1, players: players(1) })).toThrow();
    expect(() => createInitialState({ seed: 1, players: players(9) })).toThrow();
    expect(createInitialState({ seed: 1, players: players(2) }).players).toHaveLength(2);
    expect(createInitialState({ seed: 1, players: players(8) }).players).toHaveLength(8);
  });

  it('플레이어 id 중복을 거부한다', () => {
    expect(() =>
      createInitialState({
        seed: 1,
        players: [
          { id: 'a', nickname: '가' },
          { id: 'a', nickname: '나' },
        ],
      }),
    ).toThrow();
  });

  it('시드 100만원 · 보유 없음 · 시세판은 basePrice에서 시작한다', () => {
    const state = createInitialState({ seed: 7, players: players(4) });
    for (const player of state.players) {
      expect(player.cash).toBe(RULES.seedCash);
      expect(player.holdings).toEqual([]);
      expect(player.forecasts).toEqual([]);
    }
    for (const company of COMPANIES) {
      expect(state.prices[company.id]).toBe(company.basePrice);
    }
    expect(state.turn).toBe(1);
    expect(state.phase).toBe('prep');
  });

  it('이벤트는 풀에서 5개 비복원 추첨된다', () => {
    const state = createInitialState({ seed: 42, players: players(8) });
    expect(state.eventQueue).toHaveLength(RULES.turns);
    expect(new Set(state.eventQueue).size).toBe(RULES.turns);
    const ids = new Set(EVENTS.map((e) => e.id));
    for (const eventId of state.eventQueue) {
      expect(ids.has(eventId)).toBe(true);
    }
  });

  it('같은 시드 = 같은 판 (이벤트 큐·뉴스 배정까지 전부 재현)', () => {
    const a = createInitialState({ seed: 123, players: players(8) });
    const b = createInitialState({ seed: 123, players: players(8) });
    expect(a).toEqual(b);
  });

  it('다른 시드는 다른 판을 만든다', () => {
    const a = createInitialState({ seed: 1, players: players(8) });
    const b = createInitialState({ seed: 2, players: players(8) });
    expect(a.eventQueue).not.toEqual(b.eventQueue);
  });

  it('1턴 뉴스: 전원 1개씩, 같은 턴 안에서 서로 다른 뉴스', () => {
    const state = createInitialState({ seed: 99, players: players(8) });
    const ids = state.players.map((p) => {
      expect(p.news).toHaveLength(1);
      expect(p.news[0].turn).toBe(1);
      return p.news[0].newsId;
    });
    expect(new Set(ids).size).toBe(8);
  });
});
