import { describe, expect, it } from 'vitest';
import {
  RULES,
  createInitialState,
  handKinds,
  reduce,
  settle,
  totalAssetKRW,
  type GameState,
} from '../src/index';

function endTurns(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) {
    const r = reduce(s, { type: 'endTurn' });
    if (!r.ok) throw new Error(r.reason);
    s = r.value;
  }
  return s;
}

describe('턴·라운드 진행 (기획서 §7.1)', () => {
  it('두 턴마다 라운드가 오른다', () => {
    const s = createInitialState({ seed: 11 });
    expect([s.turn, s.round, s.current]).toEqual([0, 1, 0]);

    expect(endTurns(s, 1)).toMatchObject({ turn: 1, round: 1, current: 1 });
    expect(endTurns(s, 2)).toMatchObject({ turn: 2, round: 2, current: 0 });
    expect(endTurns(s, 7)).toMatchObject({ turn: 7, round: 4, current: 1 });
  });

  it('10턴이면 종료된다', () => {
    const s = endTurns(createInitialState({ seed: 11 }), RULES.TOTAL_TURNS);
    expect(s.finished).toBe(true);
    expect(s.turn).toBe(RULES.TOTAL_TURNS);
  });

  it('종료된 게임은 더 이상 액션을 받지 않는다', () => {
    const s = endTurns(createInitialState({ seed: 11 }), RULES.TOTAL_TURNS);
    expect(reduce(s, { type: 'endTurn' }).ok).toBe(false);
  });

  it('턴이 넘어가면 다음 플레이어의 턴 제한이 풀린다', () => {
    let s = createInitialState({ seed: 11 });
    s.players[0].hand.push('sk-ai-doubt');

    const r = reduce(s, { type: 'playSkill', cardId: 'sk-ai-doubt' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.value.players[0].skillUsedThisTurn).toBe(true);
    s = endTurns(r.value, 1);
    expect(s.players[1].skillUsedThisTurn).toBe(false);
  });
});

describe('영역 전개 (기획서 §7.3 / Q4)', () => {
  it('시작 1회 + 1~4라운드 종료 4회 = 총 5회 발동한다', () => {
    const s = createInitialState({ seed: 5 });
    expect(s.eventLog).toHaveLength(1);

    expect(endTurns(s, 2).eventLog).toHaveLength(2); // 1라운드 종료
    expect(endTurns(s, 4).eventLog).toHaveLength(3);
    expect(endTurns(s, 6).eventLog).toHaveLength(4);
    expect(endTurns(s, 8).eventLog).toHaveLength(5); // 4라운드 종료

    // 5라운드 종료(정산 직전)에는 발동하지 않는다
    expect(endTurns(s, RULES.TOTAL_TURNS).eventLog).toHaveLength(5);
  });

  it('같은 이벤트가 두 번 나오지 않는다', () => {
    const log = endTurns(createInitialState({ seed: 9 }), RULES.TOTAL_TURNS).eventLog;
    expect(new Set(log).size).toBe(log.length);
  });

  it('경제환경이 섹터별로 다르게 가격을 움직인다 (§1.2 학습 목표)', () => {
    const s = createInitialState({ seed: 2 });
    const mods = Object.values(s.priceMods);
    expect(new Set(mods).size).toBeGreaterThan(1);
  });

  it('턴이 넘어가면 다음 플레이어의 패가 5종류로 다시 채워진다', () => {
    const s = endTurns(createInitialState({ seed: 4 }), 1);
    expect(handKinds(s.players[1]).size).toBe(RULES.HAND_KINDS);
  });
});

describe('정산 (기획서 §2)', () => {
  it('총자산 = 원화 + 달러×환율 + 보유 평가금액', () => {
    const s = createInitialState({ seed: 8 });
    const expected = RULES.START_KRW + RULES.START_USD * RULES.FX_RATE;
    expect(totalAssetKRW(s.players[0], s)).toBe(expected);
  });

  it('아무도 거래하지 않으면 무승부다 (Q10 추천안)', () => {
    const s = endTurns(createInitialState({ seed: 8 }), RULES.TOTAL_TURNS);
    const result = settle(s);
    expect(result.totals[0]).toBe(result.totals[1]);
    expect(result.winner).toBeNull();
  });

  it('보유 종목의 평가금액이 총자산에 반영된다', () => {
    const s = createInitialState({ seed: 8 });
    s.players[0].hand.push('kr-005930');

    const r = reduce(s, { type: 'buy', cardId: 'kr-005930', qty: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    // 산 직후에는 현금이 줄고 평가금액이 그만큼 늘어 총자산이 그대로다
    expect(totalAssetKRW(r.value.players[0], r.value)).toBe(totalAssetKRW(s.players[0], s));
  });
});
