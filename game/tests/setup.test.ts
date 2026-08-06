import { describe, expect, it } from 'vitest';
import { MACRO_EVENTS, STARTER_DECK, STOCK_CARDS } from '../data/index';
import { RULES, SECTORS, createInitialState, handKinds, validateDeck } from '../src/index';

describe('데이터 정합성', () => {
  it('기본 덱이 룰을 만족한다', () => {
    const result = validateDeck(STARTER_DECK);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  });

  it('경제환경 13종이 모든 섹터에 값을 가진다', () => {
    expect(MACRO_EVENTS).toHaveLength(13);
    expect(MACRO_EVENTS.filter((e) => e.tone === 'bad')).toHaveLength(7);
    expect(MACRO_EVENTS.filter((e) => e.tone === 'good')).toHaveLength(6);

    for (const event of MACRO_EVENTS) {
      for (const sector of SECTORS) {
        expect(typeof event.matrix[sector], `${event.id}/${sector}`).toBe('number');
      }
    }
  });

  it('종목카드가 섹터 7종을 모두 덮는다', () => {
    const covered = new Set(STOCK_CARDS.map((c) => c.sector));
    expect(covered.size).toBe(SECTORS.length);
  });

  it('카드 id가 중복되지 않는다', () => {
    const ids = STOCK_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('게임 시작 (기획서 §3)', () => {
  it('시작 자금과 라운드가 규칙대로다', () => {
    const s = createInitialState({ seed: 1 });
    expect(s.players[0].cash.KRW).toBe(RULES.START_KRW);
    expect(s.players[0].cash.USD).toBe(RULES.START_USD);
    expect(s.fxRate).toBe(RULES.FX_RATE);
    expect(s.turn).toBe(0);
    expect(s.round).toBe(1);
    expect(s.finished).toBe(false);
  });

  it('양쪽 패가 5종류로 채워진다', () => {
    const s = createInitialState({ seed: 7 });
    expect(handKinds(s.players[0]).size).toBe(RULES.HAND_KINDS);
    expect(handKinds(s.players[1]).size).toBe(RULES.HAND_KINDS);
  });

  it('시작 시 영역 전개가 1회 발동한다 (Q4 추천안)', () => {
    const s = createInitialState({ seed: 3 });
    expect(s.eventLog).toHaveLength(1);
    expect(s.activeEventId).not.toBeNull();
  });

  it('같은 시드는 같은 판을 만든다', () => {
    const a = createInitialState({ seed: 42 });
    const b = createInitialState({ seed: 42 });
    expect(a.eventLog).toEqual(b.eventLog);
    expect(a.players[0].hand).toEqual(b.players[0].hand);
  });
});
