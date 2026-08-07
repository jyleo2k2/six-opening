/**
 * 룰 엔진 공용 타입 — 클라(web)·서버(game/server)·시뮬레이터가 모두 이 파일을 본다.
 * 여기가 바뀌면 세 소비자가 동시에 영향받는다. 계약 변경은 별도 PR로 분리할 것.
 */

// ── 섹터 ────────────────────────────────────────────────────────────────
// 기획서 §7.2 — 8종. 이벤트 효과는 항상 섹터 단위로 정의한다 (종목 고유 지정 금지).
export const SECTORS = [
  'semi',
  'auto',
  'chem',
  'bio',
  'travel',
  'enter',
  'defense',
  'finance',
] as const;

export type Sector = (typeof SECTORS)[number];

export const SECTOR_LABEL: Record<Sector, string> = {
  semi: '반도체/IT',
  auto: '자동차',
  chem: '정유/화학',
  bio: '바이오/제약',
  travel: '항공/여행',
  enter: '엔터/콘텐츠',
  defense: '방산',
  finance: '은행/금융',
};

// ── 이모티콘 — 모든 페이즈 상시 사용 (기획서 §4) ─────────────────────────
export const EMOTES = ['laugh', 'cry', 'despair', 'thumbsup', 'yar'] as const;

export type Emote = (typeof EMOTES)[number];

export const EMOTE_LABEL: Record<Emote, string> = {
  laugh: '웃음',
  cry: '울음',
  despair: '절망',
  thumbsup: '따봉',
  yar: '야르',
};

// ── 데이터 팩 (기획서 §7) ────────────────────────────────────────────────
export interface Company {
  id: string;
  /** 익명 가상 회사 — 실존 기업명·상표 연상 금지 (기획서 §7.1) */
  name: string;
  sector: Sector;
  /** 시작가(원). 5,000~100,000 스케일 — 시드 100만원으로 정수 주 매매가 성립하는 범위 */
  basePrice: number;
  /** 아이 눈높이 한 줄 소개 */
  blurb: string;
}

/** 섹터별 등락 범위. 부호는 동일해야 한다(방향 = 역사 고정), 폭은 발동 시 종목마다 개별 추첨 */
export type EffectRange = readonly [min: number, max: number];

export interface GameEvent {
  id: string;
  name: string;
  /** 실제 연도 표기 — 연출·교육 프레임용 */
  year: string;
  tone: 'good' | 'bad' | 'mixed';
  /** 실제 역사 한 줄 설명 — 사건 배너에 반드시 병기, 희화화 금지 (기획서 §8) */
  blurb: string;
  effects: Partial<Record<Sector, EffectRange>>;
}

export interface NewsItem {
  id: string;
  /** 어느 사건의 단서인가. null = 이벤트와 무관한 시대 배경 뉴스 */
  eventId: string | null;
  /** 사실만, 주가 얘기 없음 (기획서 §3.1) */
  text: string;
}

// ── 플레이어 ────────────────────────────────────────────────────────────
export interface Holding {
  companyId: string;
  qty: number;
  /** 평균 매수 단가 — 추가 매수 시 가중평균 */
  avgCost: number;
}

/**
 * 정보소 예보 (기획서 §3.3). 빗나가면 미끼 사건 기준으로 만들어진다 —
 * 수신자는 payload만으로 진위를 구별할 수 없다.
 */
export interface InfoForecast {
  turn: number;
  tier: 1 | 2 | 3;
  eventId: string;
  eventName: string;
  /** 가장 크게 오를/내릴 섹터. 해당 방향 효과가 없으면 null */
  up: Sector | null;
  down: Sector | null;
}

export interface NewsDelivery {
  turn: number;
  /**
   * 서버 내부 식별용(같은 턴 중복 배달 방지 검증 등). **viewFor가 제거한다** —
   * id에 단서/배경 여부와 사건명이 들어 있어 클라이언트로 나가면 정보 설계가 깨진다.
   */
  newsId?: string;
  text: string;
}

export interface PlayerState {
  id: string;
  nickname: string;
  cash: number;
  holdings: Holding[];
  /** 내 뉴스함 — 나만 본다 (기획서 §9) */
  news: NewsDelivery[];
  /** 내 예보함 — 나만 본다 (기획서 §9) */
  forecasts: InfoForecast[];
  infoBoughtThisTurn: boolean;
}

// ── 게임 상태 ───────────────────────────────────────────────────────────
export type Phase = 'prep' | 'chat' | 'event' | 'ended';

export interface AppliedChange {
  before: number;
  after: number;
  /** 실제 적용 등락률 */
  pct: number;
}

export interface AppliedEvent {
  turn: number;
  eventId: string;
  changes: Record<string, AppliedChange>;
}

/** 정보소 구매 사실 — 전원 공개, 내용은 비공개 (기획서 §3.3) */
export interface PurchaseRecord {
  turn: number;
  playerId: string;
  tier: 1 | 2 | 3;
}

export interface RngState {
  seed: number;
}

export interface GameState {
  /** 연대 데이터 팩 (1차: '2011-2020') */
  poolId: string;
  players: PlayerState[];
  /** 1..RULES.turns */
  turn: number;
  phase: Phase;
  /** companyId → 현재가(원). 이벤트만 가격을 움직인다 (기획서 §3.2) */
  prices: Record<string, number>;
  /** 이번 판 사건들(턴 순서, 비복원 추첨). 서버만 안다 — viewFor가 제거한다 */
  eventQueue: string[];
  eventLog: AppliedEvent[];
  purchases: PurchaseRecord[];
  rng: RngState;
}

// ── 액션 ────────────────────────────────────────────────────────────────
export type Action =
  | { type: 'buy'; playerId: string; companyId: string; qty: number }
  | { type: 'sell'; playerId: string; companyId: string; qty: number }
  | { type: 'buyInfo'; playerId: string; tier: 1 | 2 | 3 }
  /** 페이즈 전환 — 서버(타이머·전원 준비)만 보낸다. 클라이언트 발신 금지 */
  | { type: 'advancePhase' };

// ── 뷰 — 정보 비대칭 필터 결과 (기획서 §9) ──────────────────────────────
export interface Standing {
  playerId: string;
  nickname: string;
  totalAsset: number;
  /** 동점 공동 순위 */
  rank: number;
}

/** 타인 요약 — 현금·보유 내역은 비공개, 총자산만 공개 */
export interface OpponentSummary {
  id: string;
  nickname: string;
  totalAsset: number;
  /** 구매 사실은 공개 — "쟤 뭔가 샀다"가 채팅 소재가 된다 */
  infoBoughtThisTurn: boolean;
}

export interface GameView {
  poolId: string;
  turn: number;
  phase: Phase;
  prices: Record<string, number>;
  eventLog: AppliedEvent[];
  purchases: PurchaseRecord[];
  standings: Standing[];
  me: PlayerState;
  others: OpponentSummary[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T>(reason: string): Result<T> => ({ ok: false, reason });
