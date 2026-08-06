/**
 * 룰 엔진 공용 타입 — 클라(web)·서버(game/server)·시뮬레이터가 모두 이 파일을 본다.
 * 여기가 바뀌면 세 소비자가 동시에 영향받는다. 계약 변경은 별도 PR로 분리할 것.
 */

// ── 섹터 ────────────────────────────────────────────────────────────────
// 기획서 §4.1 — 가격 효과는 항상 섹터 단위로만 지정한다. 종목 고유 지정 금지.
export const SECTORS = [
  'semiconductor',
  'energy',
  'auto',
  'consumer',
  'defense',
  'shipping',
  'finance',
] as const;

export type Sector = (typeof SECTORS)[number];

export const SECTOR_LABEL: Record<Sector, string> = {
  semiconductor: '반도체',
  energy: '에너지',
  auto: '자동차',
  consumer: '소비재/음식',
  defense: '방산/우주',
  shipping: '조선/해양',
  finance: '은행/금융',
};

// ── 시장·통화 ───────────────────────────────────────────────────────────
export type Market = 'KR' | 'US';
export type Currency = 'KRW' | 'USD';

export const MARKET_CURRENCY: Record<Market, Currency> = { KR: 'KRW', US: 'USD' };

// ── 카드 ────────────────────────────────────────────────────────────────
export interface StockCard {
  kind: 'stock';
  id: string;
  name: string;
  ticker: string;
  market: Market;
  sector: Sector;
  /** 게임 시작 시점의 전일 종가. 시장 통화 기준. pipelines/close_snapshot이 갱신한다 */
  basePrice: number;
  /** 아이 눈높이 설명 */
  blurb: string;
  keywords: [string, string, string];
}

/** 섹터 단위 가격 효과. delta 0.1 = +10% */
export interface SectorEffect {
  sector: Sector;
  delta: number;
}

export interface SkillCard {
  kind: 'skill';
  id: string;
  name: string;
  /** 뉴스 헤드라인 형태의 컨셉 문구 */
  headline: string;
  effects: SectorEffect[];
}

export interface HedgeCard {
  kind: 'hedge';
  id: string;
  name: string;
  headline: string;
  /** 무효화할 섹터. 비면 전 섹터 */
  sectors: Sector[];
}

export type Card = StockCard | SkillCard | HedgeCard;

// ── 경제환경(영역 전개) ─────────────────────────────────────────────────
export interface MacroEvent {
  id: string;
  /** 1970년대 석유파동 등 실제 경제사 이벤트명 */
  name: string;
  year: string;
  tone: 'good' | 'bad';
  /** 아이 눈높이 해설 — 도감·연출에서 재사용 */
  blurb: string;
  /** 섹터별 가격 효과. delta 0.1 = +10% */
  matrix: Record<Sector, number>;
}

// ── 게임 상태 ───────────────────────────────────────────────────────────
export interface Holding {
  cardId: string;
  qty: number;
  /** 평균단가 (해당 종목의 시장 통화 기준) — 기획서 Q11 */
  avgCost: number;
}

export interface PlayerState {
  id: string;
  cash: Record<Currency, number>;
  /** 카드 id 배열. 같은 종류가 여러 장 들어간다 */
  deck: string[];
  hand: string[];
  /** 종목카드 존 3개 = 최대 3종류 */
  field: Holding[];
  swapUsedThisTurn: boolean;
  skillUsedThisTurn: boolean;
}

export interface RngState {
  seed: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  /** 0-based 누적 턴 수. 10이면 종료 */
  turn: number;
  /** 1..5 */
  round: number;
  current: 0 | 1;
  /** 기준환율 원/$ — 기획서 Q9에서 변동제로 바뀌면 여기를 이벤트가 건드린다 */
  fxRate: number;
  /** 섹터별 누적 가격 배율 ∏(1 + 효과ᵢ) — 기획서 §8 */
  priceMods: Record<Sector, number>;
  activeEventId: string | null;
  eventLog: string[];
  rng: RngState;
  finished: boolean;
}

// ── 액션 ────────────────────────────────────────────────────────────────
export type Action =
  | { type: 'buy'; cardId: string; qty: number }
  | { type: 'sell'; cardId: string; qty: number }
  | { type: 'exchange'; from: Currency; amount: number }
  | { type: 'swapDeck'; handCardId: string; deckCardId: string }
  | { type: 'playSkill'; cardId: string }
  | { type: 'endTurn' };

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T>(reason: string): Result<T> => ({ ok: false, reason });
