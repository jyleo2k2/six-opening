import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, totalAsset, viewFor, type Action, type GameState } from '../src';
import { players } from './setup.test';

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('viewFor — 정보 비대칭 무결성 (기획서 §9)', () => {
  it('사건 큐·rng·거짓말 기록은 어떤 뷰에도 실리지 않는다', () => {
    const s = createInitialState({ seed: 3, players: players(3) });
    for (const p of players(3)) {
      const view = viewFor(s, p.id) as unknown as Record<string, unknown>;
      expect(view.eventQueue).toBeUndefined();
      expect(view.rng).toBeUndefined();
      expect(view.lies).toBeUndefined();
    }
  });

  it('내 뉴스의 real 플래그는 제거된다 — "절반만 진짜"의 심장', () => {
    const s = createInitialState({ seed: 3, players: players(3) });
    for (const p of players(3)) {
      const view = viewFor(s, p.id);
      expect(view.me.news[0].text.length).toBeGreaterThan(0);
      expect('real' in view.me.news[0]).toBe(false);
    }
  });

  it('타인: 섹터 보유 칩·총자산·정보 잔여만 공개 — 현금·종목·뉴스·정보 내용은 비공개', () => {
    let s = createInitialState({ seed: 3, players: players(3) });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 100_000 });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'ent1', amount: 100_000 });
    s = must(s, { type: 'buyInfo', playerId: 'p0', tab: 'scout', tier: 2 });

    const view = viewFor(s, 'p1');
    const p0 = view.others.find((o) => o.id === 'p0')!;
    expect(p0.heldSectors.sort()).toEqual(['ent', 'semi']);
    expect(p0.totalAsset).toBe(totalAsset(s, s.players[0]));
    expect(p0.infoLeft).toBe(1);
    const raw = p0 as unknown as Record<string, unknown>;
    expect(raw.cash).toBeUndefined();
    expect(raw.holdings).toBeUndefined();
    expect(raw.news).toBeUndefined();
    expect(raw.intel).toBeUndefined();
    // 구매 사실은 공개
    expect(view.purchases).toEqual([{ turn: 1, playerId: 'p0', tab: 'scout', tier: 2 }]);
  });

  it('순위는 전원 동일 — 시작 시 공동 1위·수익률 0%', () => {
    const s = createInitialState({ seed: 3, players: players(3) });
    const a = viewFor(s, 'p0').standings;
    expect(a).toEqual(viewFor(s, 'p2').standings);
    for (const row of a) {
      expect(row.rank).toBe(1);
      expect(row.returnPct).toBe(0);
    }
  });

  it('없는 플레이어의 뷰는 만들 수 없다', () => {
    expect(() => viewFor(createInitialState({ seed: 3, players: players(2) }), 'ghost')).toThrow();
  });
});
