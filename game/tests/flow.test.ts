import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, settle, totalAsset, RULES, type Action, type GameState } from '../src';
import { players } from './setup.test';

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

/** 거부는 그대로 넘어간다 — 거부 여부도 시드에 결정적이라 재현성이 유지된다 */
function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  return result.ok ? result.value : state;
}

/** 8인 정규전 — 매수·정보·거짓말 섞인 고정 스크립트 */
function playScripted(seed: number): GameState {
  let s = createInitialState({ seed, players: players(8) });

  for (let turn = 1; turn <= s.turns; turn++) {
    s = apply(s, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 300_000 });
    s = apply(s, { type: 'buy', playerId: 'p1', companyId: 'bio2', amount: 500_000 });
    s = apply(s, { type: 'buy', playerId: 'p2', companyId: 'trv1', amount: 200_000 });
    s = apply(s, { type: 'buyInfo', playerId: 'p3', tab: 'analysis', tier: 3 });
    s = must(s, { type: 'advancePhase' }); // 회의
    s = apply(s, { type: 'chat', playerId: 'p4', subject: '나는', sector: 'bat', verb: '샀어' }); // 상습 거짓말
    s = apply(s, { type: 'chat', playerId: 'p0', subject: '얘들아', sector: 'trv', verb: '조심해' });
    s = must(s, { type: 'advancePhase' }); // 사건
    s = must(s, { type: 'advancePhase' }); // 순위
    s = must(s, { type: 'advancePhase' }); // 다음 | 종료
  }
  return s;
}

describe('한 판 완주 (정규 5R)', () => {
  it('완주 후 정산 — 순위 정렬·수익률·시상식 3관왕', () => {
    const s = playScripted(2026);
    expect(s.phase).toBe('ended');
    expect(s.eventLog).toHaveLength(RULES.turnsRegular);

    const { standings, awards } = settle(s);
    expect(standings).toHaveLength(8);
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i - 1].totalAsset).toBeGreaterThanOrEqual(standings[i].totalAsset);
    }
    expect(awards.profitKing.playerId).toBe(standings[0].playerId);
    expect(awards.truthEye.value).toMatch(/회$/);
    expect(awards.steady.value).toMatch(/^MDD/);
    // p4가 매턴 거짓말 → 마지막 턴 것 빼고 정산 → 누군가는 안 속았어야 한다
    const eyeCount = Math.max(...s.players.map((p) => p.notFooled));
    expect(eyeCount).toBeGreaterThan(0);
  });

  it('사건 전 매매는 총자산을 바꾸지 않는다 (현금 ↔ 주식 등가)', () => {
    let s = createInitialState({ seed: 8, players: players(2) });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'car1', amount: 400_000 });
    s = must(s, { type: 'sell', playerId: 'p0', companyId: 'car1', amount: 150_000 });
    expect(totalAsset(s, s.players[0])).toBe(RULES.seedCash);
  });

  it('아무것도 안 한 두 사람은 노이즈에도 불구하고 순위가 존재한다', () => {
    let s = createInitialState({ seed: 4, players: players(2), turns: 3 });
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < 4; i++) s = must(s, { type: 'advancePhase' });
    }
    const { standings } = settle(s);
    // 현금만 들고 있으면 사건과 무관 — 둘 다 100만 그대로, 공동 1위
    expect(standings.map((r) => r.totalAsset)).toEqual([RULES.seedCash, RULES.seedCash]);
    expect(standings.map((r) => r.rank)).toEqual([1, 1]);
  });

  it('같은 시드 + 같은 액션 = 같은 결과 (풀 게임 재현성)', () => {
    expect(playScripted(555)).toEqual(playScripted(555));
  });

  it('다른 시드는 다른 10년을 만든다', () => {
    expect(playScripted(1).eventLog.map((e) => e.eventId)).not.toEqual(
      playScripted(2).eventLog.map((e) => e.eventId),
    );
  });
});
