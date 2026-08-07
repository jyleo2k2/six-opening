import { describe, expect, it } from 'vitest';
import { createInitialState, reduce, type Action, type GameState } from '../src';
import { players } from './setup.test';

function must(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

function atChat(seed = 3): GameState {
  return must(createInitialState({ seed, players: players(3) }), { type: 'advancePhase' });
}

describe('작전 회의 — 템플릿 검증', () => {
  it('템플릿 조합만 허용 — 주어는 고정어 + 참가자 닉네임', () => {
    const s = atChat();
    expect(reduce(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'semi', verb: '샀어' }).ok).toBe(true);
    expect(reduce(s, { type: 'chat', playerId: 'p0', subject: '봇1', sector: 'ent', verb: '믿지 마' }).ok).toBe(true);
    expect(reduce(s, { type: 'chat', playerId: 'p0', subject: '아무거나', sector: 'semi', verb: '샀어' }).ok).toBe(false);
    expect(reduce(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'x' as 'semi', verb: '샀어' }).ok).toBe(false);
    expect(reduce(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'semi', verb: '몰빵해' as '샀어' }).ok).toBe(false);
  });

  it('회의 페이즈에서만 말할 수 있다', () => {
    const prep = createInitialState({ seed: 3, players: players(3) });
    expect(reduce(prep, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'semi', verb: '샀어' }).ok).toBe(false);
  });
});

describe('거짓말 기록과 정산 — 진실의 눈', () => {
  it('"[나는][X][샀어]" 미보유 발화는 거짓말로 기록된다 (보유 발화는 아님)', () => {
    let s = createInitialState({ seed: 3, players: players(3) });
    s = must(s, { type: 'buy', playerId: 'p0', companyId: 'sec1', amount: 100_000 });
    s = must(s, { type: 'advancePhase' }); // chat

    s = must(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'semi', verb: '샀어' }); // 참말
    expect(s.lies).toHaveLength(0);
    s = must(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'bio', verb: '샀어' }); // 거짓말
    expect(s.lies).toEqual([{ playerId: 'p0', sector: 'bio', turn: 1 }]);
    // '살 거야'는 미래 얘기라 거짓말이 아니다
    s = must(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'cos', verb: '살 거야' });
    expect(s.lies).toHaveLength(1);
  });

  it('다음 라운드 사건에서 안 넘어간 사람들의 notFooled가 오른다', () => {
    let s = createInitialState({ seed: 3, players: players(3) });
    s = must(s, { type: 'advancePhase' }); // chat
    s = must(s, { type: 'chat', playerId: 'p0', subject: '나는', sector: 'bio', verb: '샀어' }); // 거짓말
    s = must(s, { type: 'advancePhase' }); // event (turn1 — 아직 정산 아님)
    s = must(s, { type: 'advancePhase' }); // rank
    s = must(s, { type: 'advancePhase' }); // turn2 prep

    // p1은 바이오를 사서 속고, p2는 안 사서 안 속는다
    s = must(s, { type: 'buy', playerId: 'p1', companyId: 'bio1', amount: 50_000 });
    s = must(s, { type: 'advancePhase' }); // chat
    s = must(s, { type: 'advancePhase' }); // event — 여기서 turn1 거짓말 정산

    expect(s.players.find((p) => p.id === 'p1')!.notFooled).toBe(0);
    expect(s.players.find((p) => p.id === 'p2')!.notFooled).toBe(1);
    expect(s.players.find((p) => p.id === 'p0')!.notFooled).toBe(0); // 발화자 제외
    expect(s.lies).toHaveLength(0); // 정산 후 소멸
  });
});
