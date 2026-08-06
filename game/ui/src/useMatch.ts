import { useCallback, useRef, useState } from 'react';
import { CARDS } from '@engine/cards.ts';
import { botForDifficulty, DIFFICULTY_TIERS, type DifficultyTier } from '@engine/difficulty.ts';
import {
  assets,
  createGame,
  legalPlays,
  marketPhase,
  mulligan,
  playCard,
  resolveTimeout,
  startTurn,
  stockById,
} from '@engine/engine.ts';
import type { CardId, GameEvent, GameState, Play } from '@engine/types.ts';
import type { TaggedEvent } from './eventMessages.ts';
import { applyMatchResult, computeGoldReward, computeStars, type StoredProgress } from './progression.ts';

export type Phase = 'difficulty' | 'mulligan' | 'player' | 'bot' | 'report' | 'over';

export interface RoundReport {
  round: number;
  eventFired: string | null;
  moves: { id: string; name: string; before: number; after: number }[];
  me: { before: number; after: number };
  bot: { before: number; after: number };
  botPlays: string[];
  events: TaggedEvent[];
}

interface Match {
  game: GameState;
  /** stockId -> 정산 시점 종가 목록 (스파크라인용, [0]은 시작가) */
  history: Record<string, number[]>;
  costBasis: CostBasis;
  difficulty: DifficultyTier;
}

export interface CostBasisEntry {
  shares: number;
  invested: number;
}

export type CostBasis = Record<string, CostBasisEntry>;

export interface MatchSettlement {
  won: boolean;
  draw: boolean;
  stars: 1 | 2 | 3;
  returnRatio: number;
  goldEarned: number;
  newlyLearned: CardId[];
  progress: StoredProgress;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1e9);
}

function querySeed(): number {
  const value = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('seed');
  if (value !== null && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return randomSeed();
}

/** ?difficulty=easy|normal|hard 로 난이도 선택 화면을 건너뛸 수 있게(검증용). */
function queryDifficulty(): DifficultyTier | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('difficulty');
  return DIFFICULTY_TIERS.some((d) => d.tier === value) ? (value as DifficultyTier) : null;
}

function initMatch(seed: number, difficulty: DifficultyTier): Match {
  const game = createGame(seed);
  // round는 0으로 둔다 — 멀리건(T4)은 매치 시작(라운드 0) 손패에서만 허용.
  // 확정(confirmMulligan)에서 round=1 + startTurn으로 넘어간다.
  const history: Record<string, number[]> = {};
  for (const s of game.stocks) history[s.id] = [s.price];
  return { game, history, costBasis: {}, difficulty };
}

/** Keep player-0 purchase cost in the UI layer without changing the rules engine. */
function syncCostBasis(match: Match): void {
  const { game, costBasis } = match;
  for (const stock of game.stocks) {
    const shares = game.players[0].holdings[stock.id] ?? 0;
    const previous = costBasis[stock.id];
    if (shares <= 0) {
      delete costBasis[stock.id];
      continue;
    }
    if (!previous) {
      costBasis[stock.id] = { shares, invested: shares * stock.price };
      continue;
    }
    if (shares > previous.shares) {
      previous.invested += (shares - previous.shares) * stock.price;
    }
    previous.shares = shares;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function playText(g: GameState, play: Play): string {
  const name = CARDS[play.card].name;
  return play.target ? `${name} → ${stockById(g, play.target).name}` : name;
}

/** AI 대전 1판을 라운드 단위로 진행하는 훅. 룰은 전부 game/ 엔진에 위임한다. */
export function useMatch() {
  const matchRef = useRef<Match | null>(null);
  if (matchRef.current === null) matchRef.current = initMatch(querySeed(), 'normal');
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [phase, setPhase] = useState<Phase>(() => (queryDifficulty() ? 'mulligan' : 'difficulty'));
  const [report, setReport] = useState<RoundReport | null>(null);
  const [botFeed, setBotFeed] = useState<string[]>([]);
  const busyRef = useRef(false);
  // difficulty phase 없이 진입한 경우(URL로 난이도 지정)를 위해 초기 매치에 즉시 반영.
  const initialDifficulty = queryDifficulty();
  if (initialDifficulty && matchRef.current.difficulty !== initialDifficulty) {
    matchRef.current.difficulty = initialDifficulty;
  }
  // 이번 라운드(내 턴 시작 ~ 정산 완료)에 쌓인 이벤트. 정산 후 리포트에 실어 보내고 비운다.
  const roundEventsRef = useRef<TaggedEvent[]>([]);
  // 이번 판 전체에 걸쳐 내가 낸 카드 종류 (T3 "새로 배운 카드" 산출용).
  const myCardsUsedRef = useRef<Set<CardId>>(new Set());
  const [settlement, setSettlement] = useState<MatchSettlement | null>(null);
  const settledRef = useRef(false);

  const game = matchRef.current.game;
  const history = matchRef.current.history;
  const costBasis = matchRef.current.costBasis;

  const playerPlay = useCallback(
    (card: CardId, target?: string) => {
      const g = matchRef.current!.game;
      let events: GameEvent[];
      try {
        events = playCard(g, 0, card, target);
      } catch {
        return; // UI가 legalPlays로 걸러주므로 도달하면 무시
      }
      myCardsUsedRef.current.add(card);
      for (const event of events) roundEventsRef.current.push({ event, actingPlayer: 0 });
      syncCostBasis(matchRef.current!);
      bump();
    },
    [bump],
  );

  const endPlayerTurn = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const m = matchRef.current!;
    const g = m.game;
    setPhase('bot');
    setBotFeed([]);
    startTurn(g, 1);
    bump();
    await sleep(500);

    const botPlays: string[] = [];
    let guard = 0;
    const opponentBot = botForDifficulty(m.difficulty);
    while (guard++ < 30) {
      const play = opponentBot.choose(g, 1);
      if (!play) break;
      const events = playCard(g, 1, play.card, play.target);
      for (const event of events) roundEventsRef.current.push({ event, actingPlayer: 1 });
      syncCostBasis(m);
      const text = playText(g, play);
      botPlays.push(text);
      setBotFeed((f) => [...f, text]);
      bump();
      await sleep(650);
    }
    await sleep(300);

    const before = g.stocks.map((s) => ({ id: s.id, name: s.name, price: s.price }));
    const meBefore = assets(g, g.players[0]);
    const botBefore = assets(g, g.players[1]);
    const eventFired = g.round === g.nextEventRound ? g.upcomingEvent.headline : null;
    const marketEvents = marketPhase(g);
    for (const event of marketEvents) roundEventsRef.current.push({ event, actingPlayer: null });
    syncCostBasis(m);
    for (const s of g.stocks) m.history[s.id].push(s.price);
    if (g.winner === null && g.round >= g.config.maxRounds) resolveTimeout(g);

    setReport({
      round: g.round,
      eventFired,
      moves: before.map((b) => ({
        id: b.id,
        name: b.name,
        before: b.price,
        after: stockById(g, b.id).price,
      })),
      me: { before: meBefore, after: assets(g, g.players[0]) },
      bot: { before: botBefore, after: assets(g, g.players[1]) },
      botPlays,
      events: roundEventsRef.current,
    });
    roundEventsRef.current = [];
    setPhase('report');
    busyRef.current = false;
  }, [bump]);

  const nextRound = useCallback(() => {
    const g = matchRef.current!.game;
    setReport(null);
    if (g.winner !== null) {
      if (!settledRef.current) {
        settledRef.current = true;
        const finalAssets = assets(g, g.players[0]);
        const won = g.winner === 0;
        const draw = g.winner === 'draw';
        const stars = computeStars(finalAssets, g.config.startCash, won);
        const goldEarned = computeGoldReward(won, draw, stars);
        const { progress, newlyLearned } = applyMatchResult(goldEarned, [...myCardsUsedRef.current]);
        setSettlement({
          won,
          draw,
          stars,
          returnRatio: finalAssets / g.config.startCash - 1,
          goldEarned,
          newlyLearned,
          progress,
        });
      }
      setPhase('over');
      return;
    }
    g.round += 1;
    startTurn(g, 0);
    setPhase('player');
    bump();
  }, [bump]);

  const restart = useCallback(() => {
    matchRef.current = initMatch(randomSeed(), 'normal');
    roundEventsRef.current = [];
    myCardsUsedRef.current = new Set();
    settledRef.current = false;
    setSettlement(null);
    setReport(null);
    setBotFeed([]);
    setPhase(queryDifficulty() ? 'mulligan' : 'difficulty');
    bump();
  }, [bump]);

  const legal = phase === 'player' && game.winner === null ? legalPlays(game, 0) : [];

  /** 난이도 선택 확정. */
  const selectDifficulty = useCallback(
    (tier: DifficultyTier) => {
      matchRef.current!.difficulty = tier;
      setPhase('mulligan');
      bump();
    },
    [bump],
  );

  /** 멀리건 확정 (T4). 빈 배열이면 "교체 없이 시작"도 유효한 선택 — 그래도 1회 소모 처리. */
  const confirmMulligan = useCallback(
    (discardHandIndices: number[]) => {
      const g = matchRef.current!.game;
      mulligan(g, 0, discardHandIndices); // 빈 배열이어도 안전 — "교체 없이 시작"도 1회 소모로 기록
      g.round = 1;
      startTurn(g, 0);
      setPhase('player');
      bump();
    },
    [bump],
  );

  return {
    game,
    history,
    costBasis,
    phase,
    difficulty: matchRef.current.difficulty,
    report,
    botFeed,
    legal,
    settlement,
    confirmMulligan,
    selectDifficulty,
    playerPlay,
    endPlayerTurn,
    nextRound,
    restart,
  };
}
