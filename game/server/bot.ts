/**
 * 봇 두뇌 (영웅키움 v2) — 혼자서도 게임이 돌게 하는 AI 플레이어.
 *
 * ★ 봇을 고치고 싶으면 이 파일만 보면 된다. 서버(GameRoom)는 타이밍만 관리한다:
 *   - 성격 추가·조정  → PERSONAS (수치 전부 0~1)
 *   - 행동 확률·강도  → TUNE
 *   - 매매            → infoAction() · tradeActions()
 *   - 회의 발화(템플릿·거짓말·뉴스 공유) → chatMove()
 *   - 감정 표현       → eventEmote()
 *
 * 봇은 치팅하지 않는다 — 사람과 똑같이 viewFor() 뷰만 본다. 자기 뉴스가 진짜 전조인지,
 * 이번 사건이 뭔지 봇도 모른다. (프로토의 봇은 정답을 훔쳐봤다 — 여기선 금지)
 */
import { COMPANIES, getCompany } from '../data';
import {
  RULES,
  SECTORS,
  nextFloat,
  nextInt,
  pick,
  type Action,
  type ChatVerb,
  type Emote,
  type GameView,
  type RngState,
  type Sector,
} from '../src/index';

export interface BotPersona {
  id: string;
  nickname: string;
  color: string;
  ch: string;
  /** 정보소 이용 성향 */
  info: number;
  /** 공격성 — 몰빵 vs 관망 */
  aggro: number;
  /** 수다 — 회의에서 말할 확률 */
  chatty: number;
  /** 허풍 — 발화가 거짓 찌라시일 확률 */
  bluff: number;
}

export const PERSONAS: readonly BotPersona[] = [
  { id: 'bot-mir', nickname: '미르봇', color: '#a78bfa', ch: '미', info: 0.5, aggro: 0.85, chatty: 0.8, bluff: 0.5 },
  { id: 'bot-suri', nickname: '수리봇', color: '#ff8fab', ch: '수', info: 0.8, aggro: 0.4, chatty: 0.5, bluff: 0.1 },
  { id: 'bot-hanbyeol', nickname: '한별봇', color: '#6ee7b7', ch: '한', info: 0.3, aggro: 0.65, chatty: 0.9, bluff: 0.65 },
  { id: 'bot-banjjak', nickname: '반짝봇', color: '#ffd166', ch: '반', info: 0.6, aggro: 1.0, chatty: 0.6, bluff: 0.35 },
  { id: 'bot-mujigae', nickname: '무지개봇', color: '#5aa9ff', ch: '무', info: 0.4, aggro: 0.2, chatty: 0.4, bluff: 0.0 },
  { id: 'bot-ddakkong', nickname: '딱콩봇', color: '#f2a03d', ch: '딱', info: 0.2, aggro: 0.75, chatty: 0.7, bluff: 0.45 },
  { id: 'bot-chorok', nickname: '초록봇', color: '#35e08c', ch: '초', info: 0.7, aggro: 0.55, chatty: 0.55, bluff: 0.2 },
];

export const TUNE = {
  /** 예보 없이 관망할 기본 확률 — 공격성이 깎는다 */
  idleChance: 0.4,
  /** 투자 비중 = base + aggro × scale */
  investBase: 0.25,
  investScale: 0.55,
  /** 뉴스 섹터를 믿을 확률 (노이즈일 수도 있는데도) */
  newsTrust: 0.55,
  /** 직전 사건 +5% 이상 오른 보유는 이 확률로 익절 */
  takeProfitChance: 0.45,
  /** 정보소: 2회 중 첫 사용을 앞라운드에 몰아주는 가중치 */
  infoEarlyBias: 0.6,
  /** 이벤트 반응 문턱 */
  emoteGainPct: 0.03,
  emoteLossPct: -0.03,
  emoteIdleChance: 0.35,
  /** 회의에서 뉴스 원문을 공유할 확률 (발화 대신) */
  shareNewsChance: 0.25,
  /** 행동 딜레이(ms) — 페이즈보다 짧아야 잘리지 않는다 */
  actDelayMinMs: 1000,
  actDelayMaxMs: 5000,
  chatDelayMinMs: 1500,
  chatDelayMaxMs: 8000,
  emoteDelayMinMs: 400,
  emoteDelayMaxMs: 2500,
} as const;

/** 준비 1단계 — 정보소. (적용돼야 결과가 생기므로 매매와 분리) */
export function infoAction(view: GameView, persona: BotPersona, rng: RngState): Action | null {
  const me = view.me;
  if (me.infoLeft <= 0) return null;
  const urge = persona.info * (view.turn <= 2 ? 1 : 1 - TUNE.infoEarlyBias);
  if (nextFloat(rng) >= urge) return null;

  const tab = nextFloat(rng) < 0.7 ? 'analysis' : 'scout';
  const tier = ([3, 2, 1] as const).find((t) => RULES.infoPrices[t - 1] <= me.cash * 0.4);
  if (!tier) return null;
  return { type: 'buyInfo', playerId: me.id, tab, tier };
}

/** 준비 2단계 — 매매. 뉴스 신봉·추격·익절을 성격대로 섞는다 */
export function tradeActions(view: GameView, persona: BotPersona, rng: RngState): Action[] {
  const me = view.me;
  const actions: Action[] = [];
  let cash = me.cash;

  // 익절 — 직전 사건에 크게 오른 보유는 확률적으로 정리
  const last = view.eventLog.at(-1);
  for (const holding of me.holdings) {
    const change = last?.changes[holding.companyId];
    if (change && change.pct > 0.05 && nextFloat(rng) < TUNE.takeProfitChance) {
      const value = holding.qty * view.prices[holding.companyId];
      actions.push({ type: 'sell', playerId: me.id, companyId: holding.companyId, amount: Math.ceil(value) });
      cash += value;
    }
  }

  if (nextFloat(rng) < TUNE.idleChance * (1 - persona.aggro)) return actions;

  // 타깃 섹터: 산 정보의 힌트 > 내 뉴스(진짜인지 모른 채) > 직전 상승 추격 > 아무 데나
  let sector: Sector;
  const news = me.news.find((n) => n.turn === view.turn);
  const hint = me.intel.find((iv) => iv.turn === view.turn && iv.hint)?.hint;
  if (hint) {
    if (!hint.up) {
      // 하락 예보 — 그 섹터 보유를 정리하고 이번 턴은 관망
      for (const holding of me.holdings) {
        if (getCompany(holding.companyId).sector === hint.sector) {
          const value = holding.qty * view.prices[holding.companyId];
          actions.push({ type: 'sell', playerId: me.id, companyId: holding.companyId, amount: Math.ceil(value) });
        }
      }
      return actions;
    }
    sector = hint.sector;
  } else if (news && nextFloat(rng) < TUNE.newsTrust) {
    sector = news.sector;
  } else if (last && nextFloat(rng) < 0.5) {
    const bySector = new Map<Sector, number>();
    for (const [companyId, change] of Object.entries(last.changes)) {
      const s = getCompany(companyId).sector;
      bySector.set(s, (bySector.get(s) ?? 0) + change.pct);
    }
    const ranked = [...bySector.entries()].sort((a, b) => b[1] - a[1]);
    sector = nextFloat(rng) < 0.7 ? ranked[0][0] : ranked[ranked.length - 1][0];
  } else {
    sector = pick(rng, SECTORS);
  }

  const budget = cash * (TUNE.investBase + persona.aggro * TUNE.investScale);
  const targets = COMPANIES.filter((c) => c.sector === sector);
  const per = Math.floor(budget / targets.length / RULES.tradeStep) * RULES.tradeStep;
  if (per >= RULES.minTradeAmount) {
    for (const company of targets) {
      actions.push({ type: 'buy', playerId: me.id, companyId: company.id, amount: per });
    }
  }
  return actions;
}

export type ChatMove =
  | { kind: 'template'; subject: string; sector: Sector; verb: ChatVerb }
  | { kind: 'shareNews' };

/** 회의 발화 — 참말·유도·거짓 찌라시. 거짓말 판정은 엔진이 한다 */
export function chatMove(view: GameView, persona: BotPersona, rng: RngState): ChatMove | null {
  if (nextFloat(rng) >= persona.chatty) return null;
  if (nextFloat(rng) < TUNE.shareNewsChance && view.me.news.some((n) => n.turn === view.turn)) {
    return { kind: 'shareNews' };
  }

  const heldSectors = [...new Set(view.me.holdings.map((h) => getCompany(h.companyId).sector))];

  // 허풍 — 안 든 섹터를 "샀어"라고 뻥친다 (엔진이 거짓말로 기록)
  if (nextFloat(rng) < persona.bluff) {
    const fake = pick(rng, SECTORS.filter((s) => !heldSectors.includes(s)));
    return { kind: 'template', subject: '나는', sector: fake, verb: '샀어' };
  }

  const roll = nextFloat(rng);
  if (roll < 0.4 && heldSectors.length > 0) {
    return { kind: 'template', subject: '나는', sector: pick(rng, heldSectors), verb: '샀어' };
  }
  const news = view.me.news.find((n) => n.turn === view.turn);
  if (roll < 0.75 && news) {
    return {
      kind: 'template',
      subject: '얘들아',
      sector: news.sector,
      verb: pick(rng, ['조심해', '믿지 마', '사지 마'] as const),
    };
  }
  return {
    kind: 'template',
    subject: '얘들아',
    sector: pick(rng, SECTORS),
    verb: pick(rng, ['살 거야', '조심해'] as const),
  };
}

/** 사건·순위 — 내 보유분 등락에 따라 웃고 운다 */
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

  if (ratio > TUNE.emoteGainPct) return pick(rng, ['fire', 'laugh'] as const);
  if (ratio < TUNE.emoteLossPct) return pick(rng, ['cry', 'scream'] as const);
  return nextFloat(rng) < TUNE.emoteIdleChance ? 'thumbsup' : null;
}
