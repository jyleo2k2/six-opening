import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, settle, totalAsset, RULES, type Action, type GameState } from '../src';

const P = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, nickname: `봇${i}` }));

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

/** 거부(잔고 부족 등)는 그대로 넘어간다 — 거부 여부도 시드에 결정적이라 재현성이 유지된다 */
function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  return result.ok ? result.value : state;
}

/** 8인 한 판 — 고정 스크립트 (매수·정보·매도 섞기) */
function playScripted(seed: number): GameState {
  let s = createInitialState({ seed, players: P });

  for (let turn = 1; turn <= RULES.turns; turn++) {
    s = apply(s, { type: 'buy', playerId: 'p0', companyId: 'hanbit-semi', qty: 2 });
    s = apply(s, { type: 'buy', playerId: 'p1', companyId: 'sopung-tour', qty: 20 });
    s = apply(s, { type: 'buy', playerId: 'p2', companyId: 'saessak-bio', qty: 10 });
    s = apply(s, { type: 'buyInfo', playerId: 'p3', tier: 3 });
    if (turn > 1) {
      const holding = s.players[1].holdings[0];
      if (holding && holding.qty >= 5) {
        s = apply(s, { type: 'sell', playerId: 'p1', companyId: holding.companyId, qty: 5 });
      }
    }
    s = must(s, { type: 'advancePhase' }); // 채팅
    s = must(s, { type: 'advancePhase' }); // 이벤트
    s = must(s, { type: 'advancePhase' }); // 다음 턴 | 종료
  }
  return s;
}

describe('한 판 완주', () => {
  it('5턴(준비·채팅·이벤트 × 5) 후 종료되고 정산이 나온다', () => {
    const s = playScripted(2026);
    expect(s.phase).toBe('ended');
    expect(s.eventLog).toHaveLength(RULES.turns);

    const { standings } = settle(s);
    expect(standings).toHaveLength(8);
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i - 1].totalAsset).toBeGreaterThanOrEqual(standings[i].totalAsset);
    }
    for (const row of standings) {
      expect(row.rank).toBe(1 + standings.filter((o) => o.totalAsset > row.totalAsset).length);
    }
  });

  it('이벤트 전 매매는 총자산을 바꾸지 않는다 (현금 ↔ 주식 등가 교환)', () => {
    let s = createInitialState({ seed: 8, players: P });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'dallim-motors', qty: 8 });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 30 });
    s = must(s, { type: 'sell', playerId: 'p0', companyId: 'dallim-motors', qty: 3 });
    expect(totalAsset(s, s.players[0])).toBe(RULES.seedCash);
  });

  it('아무것도 안 한 플레이어들은 끝까지 동점 — 공동 순위', () => {
    let s = createInitialState({ seed: 4, players: P.slice(0, 2) });
    for (let turn = 1; turn <= RULES.turns; turn++) {
      s = must(s, { type: 'advancePhase' });
      s = must(s, { type: 'advancePhase' });
      s = must(s, { type: 'advancePhase' });
    }
    const { standings } = settle(s);
    expect(standings.map((r) => r.rank)).toEqual([1, 1]);
    expect(standings.map((r) => r.totalAsset)).toEqual([RULES.seedCash, RULES.seedCash]);
  });

  it('같은 시드 + 같은 액션 = 같은 결과 (풀 게임 재현성)', () => {
    const a = playScripted(555);
    const b = playScripted(555);
    expect(a).toEqual(b);
  });

  it('다른 시드는 다른 결과를 만든다 (판마다 다른 10년)', () => {
    const a = playScripted(1);
    const b = playScripted(2);
    expect(a.eventLog.map((e) => e.eventId)).not.toEqual(b.eventLog.map((e) => e.eventId));
  });
});
