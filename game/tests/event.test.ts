import { describe, expect, it } from 'vitest';
import { COMPANIES, getEvent } from '../data';
import { createInitialState, reduce, RULES, type GameState } from '../src';

const P = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, nickname: `봇${i}` }));

function must(state: GameState, action: Parameters<typeof reduce>[1]): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

/** 준비 → 채팅 → 이벤트까지 진행한 상태 */
function afterFirstEvent(seed = 5): GameState {
  let s = createInitialState({ seed, players: P });
  s = must(s, { type: 'advancePhase' }); // chat
  s = must(s, { type: 'advancePhase' }); // event 적용
  return s;
}

describe('페이즈 순환', () => {
  it('준비 → 채팅 → 이벤트 → 다음 턴 준비', () => {
    let s = createInitialState({ seed: 5, players: P });
    expect([s.turn, s.phase]).toEqual([1, 'prep']);
    s = must(s, { type: 'advancePhase' });
    expect(s.phase).toBe('chat');
    s = must(s, { type: 'advancePhase' });
    expect(s.phase).toBe('event');
    expect(s.eventLog).toHaveLength(1);
    s = must(s, { type: 'advancePhase' });
    expect([s.turn, s.phase]).toEqual([2, 'prep']);
  });

  it('채팅 페이즈는 엔진에 아무 일도 일으키지 않는다 (릴레이는 서버 몫)', () => {
    const prep = createInitialState({ seed: 5, players: P });
    const chat = must(prep, { type: 'advancePhase' });
    expect({ ...chat, phase: 'prep' }).toEqual(prep);
  });
});

describe('이벤트 적용', () => {
  it('방향은 역사(부호) 그대로, 폭은 범위 안 — 종목마다 개별 추첨', () => {
    const s = afterFirstEvent();
    const applied = s.eventLog[0];
    const event = getEvent(applied.eventId);

    const pcts = new Set<number>();
    for (const [companyId, change] of Object.entries(applied.changes)) {
      const company = COMPANIES.find((c) => c.id === companyId)!;
      const range = event.effects[company.sector]!;
      expect(change.pct).toBeGreaterThanOrEqual(range[0]);
      expect(change.pct).toBeLessThanOrEqual(range[1]);
      expect(change.after).toBe(Math.max(RULES.priceFloor, Math.round(change.before * (1 + change.pct))));
      expect(s.prices[companyId]).toBe(change.after);
      pcts.add(change.pct);
    }
    // 같은 섹터 2종목도 다른 폭 — 전 종목이 한 값으로 움직이지 않는다
    expect(pcts.size).toBeGreaterThan(1);
  });

  it('무영향 섹터 종목은 가격이 그대로다 (이벤트만 가격을 움직인다)', () => {
    const s = afterFirstEvent();
    const applied = s.eventLog[0];
    const event = getEvent(applied.eventId);
    for (const company of COMPANIES) {
      if (event.effects[company.sector]) continue;
      expect(applied.changes[company.id]).toBeUndefined();
      expect(s.prices[company.id]).toBe(company.basePrice);
    }
  });

  it('가격은 정수 원, 바닥 100원', () => {
    const s = afterFirstEvent();
    for (const price of Object.values(s.prices)) {
      expect(Number.isInteger(price)).toBe(true);
      expect(price).toBeGreaterThanOrEqual(RULES.priceFloor);
    }
  });
});

describe('턴 전환', () => {
  it('새 턴: 정보 구매 플래그 리셋 + 새 뉴스 배정 (같은 턴 내 중복 없음)', () => {
    let s = createInitialState({ seed: 9, players: P });
    s = must(s, { type: 'buyInfo', playerId: 'p0', tier: 1 });
    s = must(s, { type: 'advancePhase' }); // chat
    s = must(s, { type: 'advancePhase' }); // event
    s = must(s, { type: 'advancePhase' }); // turn 2 prep

    expect(s.players[0].infoBoughtThisTurn).toBe(false);
    const turn2 = s.players.map((p) => {
      const news = p.news.filter((n) => n.turn === 2);
      expect(news).toHaveLength(1);
      return news[0].newsId;
    });
    expect(new Set(turn2).size).toBe(P.length);
  });

  it('5턴 이벤트 후 종료 — 더 이상 진행되지 않는다', () => {
    let s = createInitialState({ seed: 9, players: P });
    for (let turn = 1; turn <= RULES.turns; turn++) {
      s = must(s, { type: 'advancePhase' });
      s = must(s, { type: 'advancePhase' });
      if (turn < RULES.turns) s = must(s, { type: 'advancePhase' });
    }
    s = must(s, { type: 'advancePhase' }); // 마지막 event → ended
    expect(s.phase).toBe('ended');
    expect(s.eventLog).toHaveLength(RULES.turns);
    expect(reduce(s, { type: 'advancePhase' }).ok).toBe(false);
    expect(reduce(s, { type: 'buy', playerId: 'p0', companyId: 'deundeun-bank', qty: 1 }).ok).toBe(false);
  });
});
