import { COMPANIES, EVENTS } from '../data';
import { dealNews } from './news';
import { shuffle } from './rng';
import { RULES } from './rules';
import type { GameState, PlayerState } from './types';

export interface SetupPlayer {
  id: string;
  nickname: string;
}

export interface SetupOptions {
  seed: number;
  players: SetupPlayer[];
}

/**
 * 새 판 생성 — 이벤트 5개 비복원 추첨(비공개), 시세판 초기화, 1턴 뉴스 배정까지.
 * 이후의 모든 상태 변화는 reduce()로만 일어난다.
 */
export function createInitialState(opts: SetupOptions): GameState {
  const n = opts.players.length;
  if (n < RULES.minPlayers || n > RULES.maxPlayers) {
    throw new Error(`인원은 ${RULES.minPlayers}~${RULES.maxPlayers}명이다 (현재 ${n}명)`);
  }
  if (new Set(opts.players.map((p) => p.id)).size !== n) {
    throw new Error('플레이어 id가 겹친다');
  }

  const rng = { seed: opts.seed | 0 };

  const players: PlayerState[] = opts.players.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    cash: RULES.seedCash,
    holdings: [],
    news: [],
    forecasts: [],
    infoBoughtThisTurn: false,
  }));

  const state: GameState = {
    poolId: '2011-2020',
    players,
    turn: 1,
    phase: 'prep',
    prices: Object.fromEntries(COMPANIES.map((c) => [c.id, c.basePrice])),
    // 역사 순서와 무관한 랜덤 배치 — 코로나 다음에 대지진이 올 수 있다 (기획서 §5.1)
    eventQueue: shuffle(rng, EVENTS.map((e) => e.id)).slice(0, RULES.turns),
    eventLog: [],
    purchases: [],
    rng,
  };

  dealNews(state);
  return state;
}
