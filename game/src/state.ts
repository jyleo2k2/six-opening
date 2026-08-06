import { STARTER_DECK } from '../data/decks';
import { expandDomain } from './domain';
import { refillHand } from './hand';
import { RULES } from './rules';
import { SECTORS, type GameState, type PlayerState, type Sector } from './types';

export interface NewGameOptions {
  seed?: number;
  playerIds?: [string, string];
  decks?: [string[], string[]];
}

function createPlayer(id: string, deck: string[]): PlayerState {
  return {
    id,
    cash: { KRW: RULES.START_KRW, USD: RULES.START_USD },
    deck: [...deck],
    hand: [],
    field: [],
    swapUsedThisTurn: false,
    skillUsedThisTurn: false,
  };
}

function neutralMods(): Record<Sector, number> {
  return Object.fromEntries(SECTORS.map((s) => [s, 1])) as Record<Sector, number>;
}

/**
 * 게임 시작 — 기획서 §3.
 *   · 각자 원화 1,000,000 + $1,000, 덱 30장
 *   · 선공/후공은 호출자가 정한다(랜덤 매칭은 서버 책임)
 *   · 시작 시 패가 5종류가 되도록 드로우
 *   · 영역 전개 1회 발동 (Q4 추천안)
 */
export function createInitialState(options: NewGameOptions = {}): GameState {
  const { seed = Date.now() & 0x7fffffff, playerIds = ['p0', 'p1'], decks } = options;

  const state: GameState = {
    players: [
      createPlayer(playerIds[0], decks?.[0] ?? STARTER_DECK),
      createPlayer(playerIds[1], decks?.[1] ?? STARTER_DECK),
    ],
    turn: 0,
    round: 1,
    current: 0,
    fxRate: RULES.FX_RATE,
    priceMods: neutralMods(),
    activeEventId: null,
    eventLog: [],
    rng: { seed },
    finished: false,
  };

  expandDomain(state);
  refillHand(state.players[0], state);
  refillHand(state.players[1], state);

  return state;
}

export const currentPlayer = (state: GameState): PlayerState => state.players[state.current];
export const opponent = (state: GameState): PlayerState =>
  state.players[state.current === 0 ? 1 : 0];
