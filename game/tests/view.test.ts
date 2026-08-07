import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, totalAsset, viewFor, type GameState } from '../src';

const P = [
  { id: 'p0', nickname: '가' },
  { id: 'p1', nickname: '나' },
  { id: 'p2', nickname: '다' },
];

function must(state: GameState, action: Parameters<typeof reduce>[1]): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('viewFor — 정보 비대칭 무결성 (기획서 §9)', () => {
  it('이벤트 큐와 rng 시드는 어떤 뷰에도 실리지 않는다', () => {
    const s = createInitialState({ seed: 3, players: P });
    for (const p of P) {
      const view = viewFor(s, p.id) as unknown as Record<string, unknown>;
      expect(view.eventQueue).toBeUndefined();
      expect(view.rng).toBeUndefined();
    }
  });

  it('내 뉴스·예보는 보이고, 타인 것은 내용이 아예 없다', () => {
    let s = createInitialState({ seed: 3, players: P });
    s = must(s, { type: 'buyInfo', playerId: 'p0', tier: 3 });

    const mine = viewFor(s, 'p0');
    expect(mine.me.forecasts).toHaveLength(1);
    expect(mine.me.news).toHaveLength(1);
    // newsId는 단서/배경 여부를 누설하므로 뷰에서 제거된다 — 본문만 남는다
    expect(mine.me.news[0].newsId).toBeUndefined();
    expect(mine.me.news[0].text.length).toBeGreaterThan(0);

    const theirs = viewFor(s, 'p1');
    expect(theirs.me.forecasts).toHaveLength(0);
    const p0 = theirs.others.find((o) => o.id === 'p0')! as unknown as Record<string, unknown>;
    expect(p0.forecasts).toBeUndefined();
    expect(p0.news).toBeUndefined();
  });

  it('타인의 현금·보유 내역은 비공개 — 공개는 총자산·구매 사실뿐', () => {
    let s = createInitialState({ seed: 3, players: P });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'hanbit-semi', qty: 5 });
    s = must(s, { type: 'buyInfo', playerId: 'p0', tier: 2 });

    const view = viewFor(s, 'p1');
    const p0 = view.others.find((o) => o.id === 'p0')!;
    expect((p0 as unknown as Record<string, unknown>).cash).toBeUndefined();
    expect((p0 as unknown as Record<string, unknown>).holdings).toBeUndefined();
    expect(p0.totalAsset).toBe(totalAsset(s, s.players[0]));
    expect(p0.infoBoughtThisTurn).toBe(true);
    expect(view.purchases).toEqual([{ turn: 1, playerId: 'p0', tier: 2 }]);
  });

  it('순위는 전원에게 같은 값으로 공개된다 — 시작 시 전원 공동 1위', () => {
    const s = createInitialState({ seed: 3, players: P });
    const a = viewFor(s, 'p0').standings;
    const b = viewFor(s, 'p2').standings;
    expect(a).toEqual(b);
    for (const row of a) {
      expect(row.rank).toBe(1);
      expect(row.totalAsset).toBe(1_000_000);
    }
  });

  it('없는 플레이어의 뷰는 만들 수 없다', () => {
    const s = createInitialState({ seed: 3, players: P });
    expect(() => viewFor(s, 'ghost')).toThrow();
  });
});
