import { CARDS, DEFAULT_DECK, STOCKS, WORLD_EVENTS } from './cards.ts';
import type {
  Bot,
  CardId,
  GameConfig,
  GameEvent,
  GameState,
  Play,
  PlayerState,
  Sector,
  SectorEventSource,
  SectorHitImpact,
  Stock,
} from './types.ts';

export const DEFAULT_CONFIG: GameConfig = {
  startCash: 1_000_000,
  livingCost: 15_000,
  targetAssets: 1_500_000,
  maxRounds: 15,
  energyCap: 5,
  handCap: 7,
  buyAmount: 250_000,
  shortAmount: 200_000,
  eventEvery: 2,
  noisePct: 0.05,
  marketDrift: 0.03,
  bankruptThreshold: 500_000, // 시작 자금의 반토막 = 신용위기(마진콜) 패배
  stopLossTrigger: 0.12,
  insiderCatchPerSuspicion: 0.15,
  insiderFinePct: 0.4,
  insiderGain: 250_000,
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makePlayer(id: 0 | 1, cfg: GameConfig, deck: CardId[], rng: () => number): PlayerState {
  return {
    id,
    cash: cfg.startCash,
    holdings: {},
    shorts: [],
    stopLosses: [],
    suspicion: 0,
    interestNextPhase: false,
    energy: 0,
    deck: shuffle([...deck], rng),
    hand: [],
    discard: [],
    mulliganUsed: false,
  };
}

export function createGame(
  seed: number,
  config: Partial<GameConfig> = {},
  decks: [CardId[], CardId[]] = [DEFAULT_DECK, DEFAULT_DECK],
): GameState {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const rng = mulberry32(seed);
  const state: GameState = {
    round: 0,
    stocks: STOCKS.map((s) => ({ ...s, basePrice: s.price })),
    players: [makePlayer(0, cfg, decks[0], rng), makePlayer(1, cfg, decks[1], rng)],
    upcomingEvent: WORLD_EVENTS[Math.floor(rng() * WORLD_EVENTS.length)],
    nextEventRound: cfg.eventEvery,
    winner: null,
    winReason: null,
    rng,
    config: cfg,
  };
  for (const p of state.players) for (let i = 0; i < 4; i++) drawCard(state, p);
  return state;
}

export function stockById(state: GameState, id: string): Stock {
  const s = state.stocks.find((s) => s.id === id);
  if (!s) throw new Error(`unknown stock: ${id}`);
  return s;
}

export function holdingsValue(state: GameState, p: PlayerState): number {
  let v = 0;
  for (const s of state.stocks) v += (p.holdings[s.id] ?? 0) * s.price;
  return v;
}

export function assets(state: GameState, p: PlayerState): number {
  let v = p.cash + holdingsValue(state, p);
  for (const sh of p.shorts) {
    const cur = stockById(state, sh.stockId).price;
    v += (sh.amount * (sh.entryPrice - cur)) / sh.entryPrice;
  }
  return v;
}

export function sectorExposure(state: GameState, p: PlayerState, sector: Sector): number {
  let v = 0;
  for (const s of state.stocks) if (s.sector === sector) v += (p.holdings[s.id] ?? 0) * s.price;
  return v;
}

function drawCard(state: GameState, p: PlayerState): void {
  if (p.deck.length === 0) {
    p.deck = shuffle(p.discard, state.rng);
    p.discard = [];
  }
  const c = p.deck.pop();
  if (!c) return;
  if (p.hand.length >= state.config.handCap) p.discard.push(c);
  else p.hand.push(c);
}

/** 가격 변동 적용. 급락 시 손절 예약(함정) 발동 처리 포함. */
export function applyStockPct(state: GameState, stock: Stock, pct: number, events: GameEvent[]): void {
  const before = stock.price;
  stock.price = Math.max(1, stock.price * (1 + pct));
  if (pct <= -state.config.stopLossTrigger) {
    for (const p of state.players) {
      const idx = p.stopLosses.indexOf(stock.id);
      const shares = p.holdings[stock.id] ?? 0;
      if (idx >= 0 && shares > 0) {
        // 하락분의 절반만 반영된 가격에 자동 매도 (제때 걸린 손절)
        const saleProceeds = shares * before * (1 + pct * 0.5);
        const fullLossProceeds = shares * before * (1 + pct);
        p.cash += saleProceeds;
        p.holdings[stock.id] = 0;
        p.stopLosses.splice(idx, 1);
        events.push({
          type: 'stopLossTriggered',
          player: p.id,
          stockId: stock.id,
          shares,
          saleProceeds,
          savedAmount: saleProceeds - fullLossProceeds,
        });
      }
    }
  }
}

export function applySectorPct(
  state: GameState,
  sector: Sector,
  pct: number,
  source: SectorEventSource,
  events: GameEvent[],
): void {
  // 분산 효과 계산용 스냅샷: 발동 직전 섹터 노출·보유 평가액·자산
  const totalHoldingsBefore = state.players.map((p) => holdingsValue(state, p));
  const exposureBefore = state.players.map((p) => sectorExposure(state, p, sector));
  const assetsBefore = state.players.map((p) => assets(state, p));

  for (const s of state.stocks) if (s.sector === sector) applyStockPct(state, s, pct, events);

  const impacts: SectorHitImpact[] = state.players.map((p, i) => ({
    player: p.id,
    pnlAmount: assets(state, p) - assetsBefore[i],
    exposureRatio: totalHoldingsBefore[i] > 0 ? exposureBefore[i] / totalHoldingsBefore[i] : 0,
  }));
  events.push({ type: 'sectorHit', sector, pct, source, impacts });
}

function sellAll(state: GameState, p: PlayerState, stockId: string): void {
  const shares = p.holdings[stockId] ?? 0;
  if (shares <= 0) throw new Error('no shares to sell');
  p.cash += shares * stockById(state, stockId).price;
  p.holdings[stockId] = 0;
}

export function playCard(state: GameState, me: 0 | 1, cardId: CardId, target?: string): GameEvent[] {
  const p = state.players[me];
  const def = CARDS[cardId];
  const handIdx = p.hand.indexOf(cardId);
  if (handIdx < 0) throw new Error(`card not in hand: ${cardId}`);
  if (p.energy < def.cost) throw new Error(`not enough energy for ${cardId}`);
  if (def.needsTarget && !target) throw new Error(`card needs target: ${cardId}`);

  const events: GameEvent[] = [];

  switch (cardId) {
    case 'buy': {
      const amount = Math.min(state.config.buyAmount, p.cash);
      if (amount < 1) throw new Error('no cash');
      const s = stockById(state, target!);
      p.holdings[s.id] = (p.holdings[s.id] ?? 0) + amount / s.price;
      p.cash -= amount;
      break;
    }
    case 'sell':
      sellAll(state, p, target!);
      break;
    case 'watch':
      drawCard(state, p);
      break;
    case 'diversify': {
      const total = Math.min(state.config.buyAmount * 2, p.cash);
      if (total < 1) throw new Error('no cash');
      const per = total / state.stocks.length;
      for (const s of state.stocks) p.holdings[s.id] = (p.holdings[s.id] ?? 0) + per / s.price;
      p.cash -= total;
      break;
    }
    case 'dividend':
      p.cash += holdingsValue(state, p) * 0.08;
      break;
    case 'short': {
      const s = stockById(state, target!);
      p.shorts.push({
        stockId: s.id,
        entryPrice: s.price,
        amount: state.config.shortAmount,
        phasesLeft: 2,
      });
      break;
    }
    case 'stoploss': {
      if ((p.holdings[target!] ?? 0) <= 0) throw new Error('need shares for stoploss');
      if (!p.stopLosses.includes(target!)) p.stopLosses.push(target!);
      break;
    }
    case 'semiShock':
      applySectorPct(state, '반도체', -0.25, { kind: 'card', cardId }, events);
      break;
    case 'platReg':
      applySectorPct(state, '플랫폼', -0.2, { kind: 'card', cardId }, events);
      break;
    case 'gameHit':
      applySectorPct(state, '게임', 0.2, { kind: 'card', cardId }, events);
      break;
    case 'chickenMukbang':
      applySectorPct(state, '식품', 0.1, { kind: 'card', cardId }, events);
      break;
    case 'rateHike':
      for (const s of state.stocks) applyStockPct(state, s, -0.1, events);
      for (const pl of state.players) pl.interestNextPhase = true;
      break;
    case 'insider':
      p.cash += state.config.insiderGain;
      p.suspicion += 1;
      break;
    case 'reels': {
      const s = stockById(state, target!);
      if (state.rng() < 0.7) applyStockPct(state, s, 0.15, events);
      break;
    }
    case 'allin': {
      if (p.cash < 1) throw new Error('no cash');
      const s = stockById(state, target!);
      p.holdings[s.id] = (p.holdings[s.id] ?? 0) + p.cash / s.price;
      p.cash = 0;
      break;
    }
  }

  p.hand.splice(handIdx, 1);
  p.discard.push(cardId);
  p.energy -= def.cost;
  return events;
}

/** 현재 손에서 낼 수 있는 모든 합법 플레이 나열 (봇용). */
export function legalPlays(state: GameState, me: 0 | 1): Play[] {
  const p = state.players[me];
  const plays: Play[] = [];
  const seen = new Set<CardId>();
  for (const c of p.hand) {
    if (seen.has(c)) continue;
    seen.add(c);
    const def = CARDS[c];
    if (p.energy < def.cost) continue;
    if (!def.needsTarget) {
      if (c === 'diversify' && p.cash < 1) continue;
      if (c === 'dividend' && holdingsValue(state, p) <= 0) continue;
      plays.push({ card: c });
      continue;
    }
    for (const s of state.stocks) {
      if (c === 'buy' && p.cash < 1) continue;
      if (c === 'allin' && p.cash < 1) continue;
      if (c === 'sell' && (p.holdings[s.id] ?? 0) <= 0) continue;
      if (c === 'stoploss' && ((p.holdings[s.id] ?? 0) <= 0 || p.stopLosses.includes(s.id))) continue;
      plays.push({ card: c, target: s.id });
    }
  }
  return plays;
}

/** 라운드 종료 정산: 월드 이벤트 → 노이즈 → 숏 청산 → 이자 → 생활비 → 조사 → 승패. */
export function marketPhase(state: GameState): GameEvent[] {
  const cfg = state.config;
  const events: GameEvent[] = [];

  // 1. 예고된 월드 이벤트 발동
  if (state.round === state.nextEventRound) {
    const ev = state.upcomingEvent;
    events.push({ type: 'worldEventTriggered', eventId: ev.id, headline: ev.headline, effects: ev.effects });
    for (const [sector, pct] of Object.entries(ev.effects)) {
      applySectorPct(state, sector as Sector, pct!, { kind: 'worldEvent', eventId: ev.id }, events);
    }
    state.nextEventRound += cfg.eventEvery;
    state.upcomingEvent = WORLD_EVENTS[Math.floor(state.rng() * WORLD_EVENTS.length)];
  }

  // 2. 노이즈 + 시장 우상향 드리프트
  for (const s of state.stocks) {
    applyStockPct(state, s, cfg.marketDrift + (state.rng() * 2 - 1) * cfg.noisePct, events);
  }

  // 3. 숏 포지션 청산
  for (const p of state.players) {
    p.shorts = p.shorts.filter((sh) => {
      sh.phasesLeft -= 1;
      if (sh.phasesLeft > 0) return true;
      const cur = stockById(state, sh.stockId).price;
      const pnl = (sh.amount * (sh.entryPrice - cur)) / sh.entryPrice;
      p.cash += pnl;
      events.push({
        type: 'shortClosed',
        player: p.id,
        stockId: sh.stockId,
        entryPrice: sh.entryPrice,
        exitPrice: cur,
        amount: sh.amount,
        pnl,
      });
      return false;
    });
  }

  // 4. 금리 인상 후 현금 이자
  for (const p of state.players) {
    if (p.interestNextPhase) {
      if (p.cash > 0) p.cash *= 1.05;
      p.interestNextPhase = false;
    }
  }

  // 5. 생활비 (현금 부족 시 강제 매도)
  for (const p of state.players) {
    p.cash -= cfg.livingCost;
    while (p.cash < 0) {
      let best: Stock | null = null;
      let bestValue = 0;
      for (const s of state.stocks) {
        const v = (p.holdings[s.id] ?? 0) * s.price;
        if (v > bestValue) {
          bestValue = v;
          best = s;
        }
      }
      if (!best) break;
      const shares = p.holdings[best.id]!;
      const proceeds = shares * best.price;
      p.cash += proceeds;
      p.holdings[best.id] = 0;
      events.push({ type: 'forcedSale', player: p.id, stockId: best.id, shares, proceeds });
    }
  }

  // 6. 금융감독원 조사 (내부자거래 의혹)
  for (const p of state.players) {
    if (p.suspicion > 0 && state.rng() < p.suspicion * cfg.insiderCatchPerSuspicion) {
      const cashBefore = p.cash;
      const holdingsBefore = holdingsValue(state, p);
      if (p.cash > 0) p.cash *= 1 - cfg.insiderFinePct;
      for (const k of Object.keys(p.holdings)) p.holdings[k]! *= 1 - cfg.insiderFinePct;
      p.suspicion = 0;
      const fineAmount = cashBefore - p.cash + (holdingsBefore - holdingsValue(state, p));
      events.push({ type: 'insiderCaught', player: p.id, fineAmount });
    }
  }

  // 7. 승패 판정
  const a0 = assets(state, state.players[0]);
  const a1 = assets(state, state.players[1]);
  const bankrupt0 = a0 <= cfg.bankruptThreshold;
  const bankrupt1 = a1 <= cfg.bankruptThreshold;
  if (bankrupt0 || bankrupt1) {
    state.winReason = 'bankrupt';
    state.winner = bankrupt0 && bankrupt1 ? 'draw' : bankrupt0 ? 1 : 0;
    events.push({ type: 'gameOver', winner: state.winner, reason: state.winReason });
    return events;
  }
  const t0 = a0 >= cfg.targetAssets;
  const t1 = a1 >= cfg.targetAssets;
  if (t0 || t1) {
    state.winReason = 'target';
    state.winner = t0 && t1 ? (a0 > a1 ? 0 : a1 > a0 ? 1 : 'draw') : t0 ? 0 : 1;
    events.push({ type: 'gameOver', winner: state.winner, reason: state.winReason });
  }
  return events;
}

export function startTurn(state: GameState, me: 0 | 1): void {
  const p = state.players[me];
  p.energy = Math.min(state.round, state.config.energyCap);
  drawCard(state, p);
}

/**
 * 멀리건 (T4): 매치 시작 손패 중 원하는 카드를 버리고 같은 수만큼 새로 뽑는다.
 * 매치당 1회. 시작 손패(라운드 0)에만 허용 — 게임이 진행된 후에는 불가.
 * 버린 카드는 즉시 덱에 섞여 들어가므로(discard를 거치지 않음) 재드로우 확률에서 배제되지 않는다.
 */
export function mulligan(state: GameState, me: 0 | 1, discardHandIndices: number[]): void {
  const p = state.players[me];
  if (p.mulliganUsed) throw new Error('mulligan already used');
  if (state.round !== 0) throw new Error('mulligan only allowed before the match starts');
  const uniqueIndices = [...new Set(discardHandIndices)].sort((a, b) => b - a);
  const toReshuffle: CardId[] = [];
  for (const idx of uniqueIndices) {
    if (idx < 0 || idx >= p.hand.length) throw new Error(`invalid hand index: ${idx}`);
    toReshuffle.push(...p.hand.splice(idx, 1));
  }
  // 버릴 카드가 없으면 RNG를 소비하지 않는다 — "교체 없이 시작"이 이후 판 전개(시드 재현성)에
  // 영향을 주지 않아야 한다.
  if (toReshuffle.length > 0) {
    p.deck = shuffle([...p.deck, ...toReshuffle], state.rng);
    for (let i = 0; i < toReshuffle.length; i++) drawCard(state, p);
  }
  p.mulliganUsed = true;
}

/** 마지막 라운드까지 승자가 없을 때 자산 비교로 마무리. UI·시뮬레이터 공용. */
export function resolveTimeout(state: GameState): void {
  if (state.winner !== null) return;
  const a0 = assets(state, state.players[0]);
  const a1 = assets(state, state.players[1]);
  state.winReason = 'timeout';
  state.winner = a0 > a1 ? 0 : a1 > a0 ? 1 : 'draw';
}

export interface GameResult {
  winner: 0 | 1 | 'draw';
  reason: 'bankrupt' | 'target' | 'timeout';
  rounds: number;
  finalAssets: [number, number];
  cardPlays: [Map<CardId, number>, Map<CardId, number>];
}

export function runGame(
  bots: [Bot, Bot],
  seed: number,
  config: Partial<GameConfig> = {},
  decks?: [CardId[], CardId[]],
): GameResult {
  const state = createGame(seed, config, decks);
  const cardPlays: [Map<CardId, number>, Map<CardId, number>] = [new Map(), new Map()];

  outer: for (let round = 1; round <= state.config.maxRounds; round++) {
    state.round = round;
    for (const me of [0, 1] as const) {
      startTurn(state, me);
      let guard = 0;
      while (guard++ < 30) {
        const play = bots[me].choose(state, me);
        if (!play) break;
        playCard(state, me, play.card, play.target);
        cardPlays[me].set(play.card, (cardPlays[me].get(play.card) ?? 0) + 1);
      }
    }
    marketPhase(state);
    if (state.winner !== null) break outer;
  }

  const a0 = assets(state, state.players[0]);
  const a1 = assets(state, state.players[1]);
  resolveTimeout(state);
  return {
    winner: state.winner!, // resolveTimeout이 null을 해소함
    reason: state.winReason!,
    rounds: state.round,
    finalAssets: [a0, a1],
    cardPlays,
  };
}
