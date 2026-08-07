/**
 * 봇 두뇌 — 혼자서도 게임이 돌게 하는 AI 플레이어.
 *
 * ★ 봇을 고치고 싶으면 이 파일만 보면 된다. 서버(GameRoom)는 여기 함수를 부를 뿐이다:
 *   - 성격 추가·조정  → PERSONAS (수치 전부 0~1)
 *   - 행동 확률·강도  → TUNE
 *   - 매매 로직       → infoAction() · tradeActions()
 *   - 채팅(찌라시)    → chatLine()
 *   - 감정 표현       → eventEmote()
 *
 * 봇은 치팅하지 않는다 — 사람과 똑같이 viewFor()를 거친 자기 뷰만 보고,
 * 같은 reduce() 액션으로 판정받는다. 이벤트 큐·남의 정보는 봇도 모른다.
 */
import { COMPANIES } from '../data';
import {
  RULES,
  SECTORS,
  SECTOR_LABEL,
  nextFloat,
  nextInt,
  pick,
  type Action,
  type Emote,
  type GameView,
  type RngState,
  type Sector,
} from '../src/index';

export interface BotPersona {
  id: string;
  nickname: string;
  /** 정보소 이용 성향 — 높을수록 자주, 비싼 티어를 산다 */
  info: number;
  /** 공격성 — 높을수록 몰빵, 낮을수록 관망 */
  aggro: number;
  /** 수다 — 채팅 페이즈에 말할 확률 */
  chatty: number;
  /** 허풍 — 말할 때 거짓 찌라시일 확률 */
  bluff: number;
}

export const PERSONAS: readonly BotPersona[] = [
  { id: 'bot-gaemi', nickname: '🤖왕개미', info: 0.35, aggro: 0.95, chatty: 0.7, bluff: 0.6 },
  { id: 'bot-sinjung', nickname: '🤖신중이', info: 0.85, aggro: 0.3, chatty: 0.35, bluff: 0.05 },
  { id: 'bot-somun', nickname: '🤖소문통', info: 0.6, aggro: 0.55, chatty: 0.95, bluff: 0.55 },
  { id: 'bot-hangang', nickname: '🤖한강뷰', info: 0.15, aggro: 1.0, chatty: 0.5, bluff: 0.35 },
  { id: 'bot-jeokgum', nickname: '🤖적금이', info: 0.5, aggro: 0.1, chatty: 0.3, bluff: 0.0 },
  { id: 'bot-chart', nickname: '🤖차트박사', info: 0.4, aggro: 0.6, chatty: 0.6, bluff: 0.25 },
  { id: 'bot-yolo', nickname: '🤖욜로', info: 0.2, aggro: 0.85, chatty: 0.8, bluff: 0.45 },
];

export const TUNE = {
  /** 예보가 없을 때 관망할 기본 확률 — 공격성이 깎는다 */
  idleChance: 0.45,
  /** 예보 없이 움직일 때 현금 투자 비중 = base + aggro × scale */
  investBase: 0.2,
  investScale: 0.5,
  /** 예보를 믿고 움직일 때 투자 비중 */
  forecastInvestBase: 0.45,
  forecastInvestScale: 0.5,
  /** 정보소: 현금의 이 비율까지만 정보에 쓴다 */
  infoBudgetRatio: 0.5,
  /** 익절: 평단 대비 이 배율을 넘으면 확률적으로 판다 */
  takeProfitRatio: 1.1,
  takeProfitChance: 0.4,
  /** 이벤트 반응 이모티콘 문턱 (내 보유분 등락률) */
  emoteGainPct: 0.03,
  emoteLossPct: -0.03,
  emoteIdleChance: 0.3,
  /** 행동 딜레이(ms) — 사람 냄새. 빠른 방(전원 준비 즉시 전환)에서도 잘리지 않게 짧게 */
  actDelayMinMs: 1000,
  actDelayMaxMs: 5000,
  chatDelayMinMs: 1500,
  chatDelayMaxMs: 8000,
  emoteDelayMinMs: 400,
  emoteDelayMaxMs: 2500,
} as const;

/** 준비 1단계 — 정보소에 갈까? (서버가 적용해야 예보 내용이 생기므로 매매와 분리) */
export function infoAction(view: GameView, persona: BotPersona, rng: RngState): Action | null {
  const me = view.me;
  if (me.infoBoughtThisTurn) return null;
  if (nextFloat(rng) >= persona.info) return null;

  const affordable = [...RULES.infoTiers]
    .reverse()
    .find((tier) => tier.price <= me.cash * TUNE.infoBudgetRatio);
  if (!affordable) return null;
  return { type: 'buyInfo', playerId: me.id, tier: affordable.tier };
}

/** 준비 2단계 — 매매 계획. 예보가 있으면 믿고, 없으면 성격대로 움직인다 */
export function tradeActions(view: GameView, persona: BotPersona, rng: RngState): Action[] {
  const me = view.me;
  const actions: Action[] = [];
  let cash = me.cash;

  const sellAll = (companyId: string, qty: number) => {
    actions.push({ type: 'sell', playerId: me.id, companyId, qty });
    cash += qty * view.prices[companyId];
  };
  const buyInto = (targets: readonly (typeof COMPANIES)[number][], fraction: number) => {
    if (targets.length === 0) return;
    const budget = Math.floor((cash * fraction) / targets.length);
    for (const company of targets) {
      const qty = Math.floor(budget / view.prices[company.id]);
      if (qty >= 1) {
        actions.push({ type: 'buy', playerId: me.id, companyId: company.id, qty });
        cash -= qty * view.prices[company.id];
      }
    }
  };

  const forecast = me.forecasts.find((f) => f.turn === view.turn);

  if (forecast) {
    // 예보 플레이 — 수혜 섹터로 갈아타거나 피해 섹터만 피한다
    const targets = forecast.up
      ? COMPANIES.filter((c) => c.sector === forecast.up)
      : COMPANIES.filter((c) => c.sector !== forecast.down);
    const targetIds = new Set(targets.map((c) => c.id));
    for (const holding of me.holdings) {
      if (targetIds.has(holding.companyId)) continue;
      if (nextFloat(rng) < 0.5 + persona.aggro / 2) sellAll(holding.companyId, holding.qty);
    }
    buyInto(targets, TUNE.forecastInvestBase + persona.aggro * TUNE.forecastInvestScale);
    return actions;
  }

  // 익절 — 평단보다 충분히 오른 보유분은 확률적으로 정리
  for (const holding of me.holdings) {
    const price = view.prices[holding.companyId];
    if (price >= holding.avgCost * TUNE.takeProfitRatio && nextFloat(rng) < TUNE.takeProfitChance) {
      sellAll(holding.companyId, holding.qty);
    }
  }

  // 관망파는 여기서 끝
  if (nextFloat(rng) < TUNE.idleChance * (1 - persona.aggro)) return actions;

  // 전략 룰렛: 직전 사건의 상승 섹터 추격 / 하락 섹터 저가매수 / 아무 섹터나
  const lastChanges = view.eventLog.at(-1)?.changes;
  let sector: Sector = pick(rng, SECTORS);
  if (lastChanges) {
    const sectorOf = new Map(COMPANIES.map((c) => [c.id, c.sector] as const));
    const sums = new Map<Sector, { total: number; n: number }>();
    for (const [companyId, change] of Object.entries(lastChanges)) {
      const s = sectorOf.get(companyId);
      if (!s) continue;
      const entry = sums.get(s) ?? { total: 0, n: 0 };
      entry.total += change.pct;
      entry.n += 1;
      sums.set(s, entry);
    }
    const ranked = [...sums.entries()].sort(
      (a, b) => b[1].total / b[1].n - a[1].total / a[1].n,
    );
    if (ranked.length > 0) {
      const roll = nextInt(rng, 3);
      if (roll === 0) sector = ranked[0][0]; // 추격 매수
      else if (roll === 1) sector = ranked[ranked.length - 1][0]; // 저가 매수
    }
  }
  buyInto(
    COMPANIES.filter((c) => c.sector === sector),
    TUNE.investBase + persona.aggro * TUNE.investScale,
  );
  return actions;
}

const GENERIC_LINES = [
  '지난 턴에 판 게 제일 아프다…',
  '이번엔 진짜 감이 온다',
  '다들 뭐 샀어? 난 비밀ㅎ',
  '역시 현금이 최고야, 현금이',
  '비싼 정보 산 사람 손?',
  '찌라시는 찌라시일 뿐… 이겠지?',
  '올라라 올라라 올라라',
  '왜 내가 사면 떨어질까',
  '이 흐름 어디서 본 것 같은데',
  '분산투자가 답이라고 배웠는데 말이지',
] as const;

/** 채팅 페이즈 — 진실·힌트·거짓 찌라시를 성격대로 섞는다 */
export function chatLine(view: GameView, persona: BotPersona, rng: RngState): string | null {
  if (nextFloat(rng) >= persona.chatty) return null;

  const forecast = view.me.forecasts.find((f) => f.turn === view.turn);

  // 거짓 찌라시 — 예보가 있든 없든, 허풍쟁이는 아무 섹터나 찍어준다
  if (nextFloat(rng) < persona.bluff) {
    const exclude = forecast?.up ?? null;
    const fake = pick(rng, SECTORS.filter((s) => s !== exclude));
    return pick(rng, [
      `${SECTOR_LABEL[fake]} 쪽이 곧 터진다는 얘기가 있던데…`,
      `아는 형이 ${SECTOR_LABEL[fake]} 담으라더라. 난 몰라~`,
      `어젯밤 꿈에 ${SECTOR_LABEL[fake]} 나왔다. 이건 계시다`,
    ]);
  }

  if (forecast?.up) {
    return pick(rng, [
      `오늘따라 ${SECTOR_LABEL[forecast.up]} 느낌이 좋단 말이지`,
      `나만 알기 아깝긴 한데… ${SECTOR_LABEL[forecast.up]}이야`,
    ]);
  }
  if (forecast?.down) {
    return `왠지 ${SECTOR_LABEL[forecast.down]}는 피하고 싶은 날이네`;
  }
  return pick(rng, GENERIC_LINES);
}

/** 이벤트 직후 — 내 보유분이 얼마나 움직였는지에 따라 웃거나 운다 */
export function eventEmote(view: GameView, persona: BotPersona, rng: RngState): Emote | null {
  const last = view.eventLog.at(-1);
  if (!last) return null;

  let pnl = 0;
  let basis = 0;
  for (const holding of view.me.holdings) {
    const change = last.changes[holding.companyId];
    if (!change) continue;
    pnl += (change.after - change.before) * holding.qty;
    basis += change.before * holding.qty;
  }
  const ratio = basis > 0 ? pnl / basis : 0;

  if (ratio > TUNE.emoteGainPct) return pick(rng, ['yar', 'laugh'] as const);
  if (ratio < TUNE.emoteLossPct) return pick(rng, ['cry', 'despair'] as const);
  return nextFloat(rng) < TUNE.emoteIdleChance ? 'thumbsup' : null;
}
