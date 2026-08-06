import { CARDS } from './cards.ts';
import { holdingsValue, legalPlays, sectorExposure, stockById } from './engine.ts';
import type { Bot, GameState, Play, Sector, Stock } from './types.ts';

const SECTORS: Sector[] = ['반도체', '플랫폼', '게임', '식품'];

function find(plays: Play[], card: string, target?: string): Play | null {
  return plays.find((p) => p.card === card && (target === undefined || p.target === target)) ?? null;
}

function mostDipped(state: GameState): Stock {
  return [...state.stocks].sort((a, b) => a.price / a.basePrice - b.price / b.basePrice)[0];
}

function highestMomentum(state: GameState): Stock {
  return [...state.stocks].sort((a, b) => b.price / b.basePrice - a.price / a.basePrice)[0];
}

function sectorStock(state: GameState, sector: Sector): Stock {
  return state.stocks.find((s) => s.sector === sector)!;
}

/** 기준 봇: 저가 매수·익절·섹터 이벤트를 포지션 보고 사용. */
function greedyChoose(state: GameState, me: 0 | 1): Play | null {
  const plays = legalPlays(state, me);
  if (plays.length === 0) return null;
  const p = state.players[me];
  const opp = state.players[(1 - me) as 0 | 1];

  // 호재 이벤트: 내 노출이 상대보다 클 때
  for (const [card, sector] of [
    ['gameHit', '게임'],
    ['chickenMukbang', '식품'],
  ] as const) {
    const play = find(plays, card);
    if (play && sectorExposure(state, p, sector) > sectorExposure(state, opp, sector)) return play;
  }

  // 악재 이벤트: 상대 노출이 클 때. 내가 물려 있으면 먼저 매도.
  for (const [card, sector] of [
    ['semiShock', '반도체'],
    ['platReg', '플랫폼'],
  ] as const) {
    if (!p.hand.includes(card)) continue;
    const mine = sectorExposure(state, p, sector);
    const theirs = sectorExposure(state, opp, sector);
    if (theirs - mine > 150_000) {
      const play = find(plays, card);
      if (play) return play;
    }
    if (theirs > 150_000 && mine > 0) {
      const sellMine = find(plays, 'sell', sectorStock(state, sector).id);
      if (sellMine) return sellMine;
    }
  }

  // 배당: 보유가 충분할 때
  if (holdingsValue(state, p) > 800_000) {
    const play = find(plays, 'dividend');
    if (play) return play;
  }

  // 손절 예약: 제일 많이 든 종목에 보험
  {
    let best: Stock | null = null;
    let bestValue = 300_000;
    for (const s of state.stocks) {
      const v = (p.holdings[s.id] ?? 0) * s.price;
      if (v > bestValue) {
        bestValue = v;
        best = s;
      }
    }
    if (best) {
      const play = find(plays, 'stoploss', best.id);
      if (play) return play;
    }
  }

  // 익절: 35% 이상 오른 종목 매도
  for (const s of state.stocks) {
    if ((p.holdings[s.id] ?? 0) > 0 && s.price / s.basePrice > 1.35) {
      const play = find(plays, 'sell', s.id);
      if (play) return play;
    }
  }

  // 저가 매수
  if (p.cash > 300_000) {
    const play = find(plays, 'buy', mostDipped(state).id);
    if (play) return play;
  }

  // 관망: 드로우
  if (p.hand.length < 6) {
    const play = find(plays, 'watch');
    if (play) return play;
  }
  return null;
}

export const GreedyBot: Bot = { name: 'greedy', choose: greedyChoose };

/** 현금만 들고 버티는 봇 (터틀 방지 검증용). */
export const TurtleBot: Bot = {
  name: 'turtle',
  choose(state, me) {
    return find(legalPlays(state, me), 'watch');
  },
};

/** 한 종목 몰빵 봇 (분산투자 교육 메시지 검증용). */
export const YoloBot: Bot = {
  name: 'yolo',
  choose(state, me) {
    const plays = legalPlays(state, me);
    const p = state.players[me];
    const fav = highestMomentum(state);
    if (p.cash > 200_000) {
      const allin = find(plays, 'allin', fav.id);
      if (allin) return allin;
    }
    if (p.cash > 1) {
      const buy = find(plays, 'buy', fav.id);
      if (buy) return buy;
    }
    if (fav.sector === '게임') {
      const play = find(plays, 'gameHit');
      if (play) return play;
    }
    if (fav.sector === '식품') {
      const play = find(plays, 'chickenMukbang');
      if (play) return play;
    }
    const reels = find(plays, 'reels', fav.id);
    if (reels) return reels;
    return find(plays, 'watch');
  },
};

/** 분산 + 손절 예약 중심 봇. */
export const DiversifyBot: Bot = {
  name: 'diversify',
  choose(state, me) {
    const plays = legalPlays(state, me);
    const p = state.players[me];
    if (p.cash >= 400_000) {
      const play = find(plays, 'diversify');
      if (play) return play;
    }
    // 노출이 가장 적은 섹터에 매수
    if (p.cash > 250_000) {
      const least = [...SECTORS].sort(
        (a, b) => sectorExposure(state, p, a) - sectorExposure(state, p, b),
      )[0];
      const play = find(plays, 'buy', sectorStock(state, least).id);
      if (play) return play;
    }
    return greedyChoose(state, me);
  },
};

/** 내부자거래를 볼 때마다 쓰는 봇 (불법 = 손해 검증용). */
export const IllegalBot: Bot = {
  name: 'illegal',
  choose(state, me) {
    const insider = find(legalPlays(state, me), 'insider');
    if (insider) return insider;
    return greedyChoose(state, me);
  },
};

/** 예고된 월드 이벤트(시그널)를 읽고 선제 대응하는 봇. */
export const SignalBot: Bot = {
  name: 'signal',
  choose(state, me) {
    const plays = legalPlays(state, me);
    const p = state.players[me];
    const ev = state.upcomingEvent;
    for (const [sector, pct] of Object.entries(ev.effects) as [Sector, number][]) {
      if (pct <= -0.1) {
        const s = sectorStock(state, sector);
        if ((p.holdings[s.id] ?? 0) > 0) {
          const sell = find(plays, 'sell', s.id);
          if (sell) return sell;
        }
        const short = find(plays, 'short', s.id);
        if (short && state.round >= state.nextEventRound - 1) return short;
      }
      if (pct >= 0.08 && p.cash > 250_000) {
        const buy = find(plays, 'buy', sectorStock(state, sector).id);
        if (buy) return buy;
      }
    }
    return greedyChoose(state, me);
  },
};

/** 공매도→쇼크 콤보로 상대 파산을 노리는 어그로 봇 (킬 조건 검증용). */
export const SharkBot: Bot = {
  name: 'shark',
  choose(state, me) {
    const plays = legalPlays(state, me);
    const p = state.players[me];
    const opp = state.players[(1 - me) as 0 | 1];
    for (const [card, sector] of [
      ['semiShock', '반도체'],
      ['platReg', '플랫폼'],
    ] as const) {
      if (!p.hand.includes(card)) continue;
      const theirs = sectorExposure(state, opp, sector);
      const mine = sectorExposure(state, p, sector);
      if (theirs > 200_000 && mine < 50_000) {
        const stock = sectorStock(state, sector);
        // 콤보: 쇼크 전에 공매도 깔기
        if (p.hand.includes('short') && p.energy >= CARDS[card].cost + CARDS.short.cost) {
          const sh = find(plays, 'short', stock.id);
          if (sh) return sh;
        }
        const play = find(plays, card);
        if (play) return play;
      }
    }
    // 자기 쇼크에 안 맞는 섹터에만 투자, 콤보용 에너지·현금은 아껴둠
    if (p.cash > 500_000) {
      for (const t of ['krafton', 'kyochon']) {
        const play = find(plays, 'buy', t);
        if (play) return play;
      }
    }
    if (p.hand.length < 6) {
      const w = find(plays, 'watch');
      if (w) return w;
    }
    return null;
  },
};

/** 무작위 봇 (스모크 테스트용). */
export const RandomBot: Bot = {
  name: 'random',
  choose(state, me) {
    if (state.rng() < 0.25) return null;
    const plays = legalPlays(state, me);
    if (plays.length === 0) return null;
    return plays[Math.floor(state.rng() * plays.length)];
  },
};
