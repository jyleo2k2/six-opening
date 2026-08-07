import { describe, expect, it } from 'vitest';
import { COMPANIES, getEvent } from '../data';
import { createInitialState, reduce, RULES, type Action, type GameState } from '../src';
import { players } from './setup.test';

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

/** 준비 → 회의 → 사건까지 진행 */
function afterFirstEvent(seed = 5): GameState {
  let s = createInitialState({ seed, players: players(4) });
  s = must(s, { type: 'advancePhase' });
  s = must(s, { type: 'advancePhase' });
  return s;
}

const EPS = 0.003; // 원 단위 반올림 여유

describe('페이즈 순환 — 준비→회의→사건→순위', () => {
  it('4페이즈가 돌고 순위 후 다음 라운드로', () => {
    let s = createInitialState({ seed: 5, players: players(4) });
    expect([s.turn, s.phase]).toEqual([1, 'prep']);
    s = must(s, { type: 'advancePhase' });
    expect(s.phase).toBe('chat');
    s = must(s, { type: 'advancePhase' });
    expect(s.phase).toBe('event');
    expect(s.eventLog).toHaveLength(1);
    s = must(s, { type: 'advancePhase' });
    expect(s.phase).toBe('rank');
    s = must(s, { type: 'advancePhase' });
    expect([s.turn, s.phase]).toEqual([2, 'prep']);
  });
});

describe('사건 적용 — 실제 등락률 × 밴드 0.7~1.3', () => {
  it('영향 섹터: 방향은 imp 부호 그대로, 폭은 밴드 안', () => {
    const s = afterFirstEvent();
    const applied = s.eventLog[0];
    const event = getEvent(applied.eventId);

    const pcts = new Set<number>();
    for (const company of COMPANIES) {
      const imp = event.imp[company.sector];
      const change = applied.changes[company.id];
      if (imp === undefined) continue;
      const lo = Math.min(imp * RULES.bandMin, imp * RULES.bandMax);
      const hi = Math.max(imp * RULES.bandMin, imp * RULES.bandMax);
      expect(change.pct).toBeGreaterThanOrEqual(lo - EPS);
      expect(change.pct).toBeLessThanOrEqual(hi + EPS);
      expect(Math.sign(change.pct)).toBe(Math.sign(imp));
      pcts.add(change.pct);
    }
    expect(pcts.size).toBeGreaterThan(1); // 같은 섹터 2종목도 다른 폭
  });

  it('무영향 섹터도 ±2% 노이즈로 흔들린다 — 가격 동결은 없다', () => {
    const s = afterFirstEvent();
    const applied = s.eventLog[0];
    const event = getEvent(applied.eventId);
    let moved = 0;
    for (const company of COMPANIES) {
      if (event.imp[company.sector] !== undefined) continue;
      const change = applied.changes[company.id];
      expect(Math.abs(change.pct)).toBeLessThanOrEqual(RULES.noisePct + EPS);
      if (change.after !== change.before) moved += 1;
    }
    expect(moved).toBeGreaterThan(0);
  });

  it('가격은 정수 원, 바닥 100원, MDD가 갱신된다', () => {
    let s = createInitialState({ seed: 9, players: players(2) });
    // p0을 여행주에 몰빵시켜 낙폭을 만든다 — 사건이 뭐든 MDD ≥ 0
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'trv1', amount: 990_000 });
    s = must(s, { type: 'advancePhase' });
    s = must(s, { type: 'advancePhase' });
    for (const price of Object.values(s.prices)) {
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThanOrEqual(RULES.priceFloor);
    }
    const me = s.players[0];
    expect(me.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(me.peak).toBeGreaterThanOrEqual(RULES.seedCash);
  });
});

describe('라운드 전환·종료', () => {
  it('새 라운드: boughtSectors 리셋 + 새 뉴스(진짜 2명)', () => {
    let s = createInitialState({ seed: 9, players: players(4) });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 50_000 });
    for (const t of ['chat', 'event', 'rank', 'prep'] as const) {
      s = must(s, { type: 'advancePhase' });
      void t;
    }
    expect(s.turn).toBe(2);
    expect(s.players[0].boughtSectors).toEqual([]);
    const turn2 = s.players.map((p) => p.news.filter((n) => n.turn === 2));
    expect(turn2.every((n) => n.length === 1)).toBe(true);
    expect(turn2.filter((n) => n[0].real).length).toBe(RULES.clueHolders);
  });

  it('퀵(3R)·정규(5R) 각각 라운드 수만큼 돌고 종료된다', () => {
    for (const turns of [RULES.turnsQuick, RULES.turnsRegular]) {
      let s = createInitialState({ seed: 9, players: players(2), turns });
      for (let t = 0; t < turns; t++) {
        s = must(s, { type: 'advancePhase' }); // chat
        s = must(s, { type: 'advancePhase' }); // event
        s = must(s, { type: 'advancePhase' }); // rank
        s = must(s, { type: 'advancePhase' }); // next | ended
      }
      expect(s.phase).toBe('ended');
      expect(s.eventLog).toHaveLength(turns);
      expect(reduce(s, { type: 'advancePhase' }).ok).toBe(false);
    }
  });
});
