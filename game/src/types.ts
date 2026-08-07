/**
 * 룰 엔진 공용 타입 — 클라(web)·서버(game/server)·시뮬레이터가 모두 이 파일을 본다.
 * 여기가 바뀌면 세 소비자가 동시에 영향받는다. 계약 변경은 별도 PR로 분리할 것.
 * 근거: docs/기획서.md v2 (영웅키움 — 프로토 병합판)
 */

// ── 섹터 8종 (기획서 §7) ────────────────────────────────────────────────
export const SECTORS = ['semi', 'ent', 'net', 'trv', 'bio', 'cos', 'car', 'bat'] as const;

export type Sector = (typeof SECTORS)[number];

export interface SectorInfo {
  id: Sector;
  name: string;
  emoji: string;
  /** 도감 — 오를 때 */
  up: string;
  /** 도감 — 조심할 때 */
  down: string;
}

// ── 이모티콘 — 모든 페이즈 상시 (기획서 §4) ─────────────────────────────
export const EMOTES = ['laugh', 'cry', 'scream', 'thumbsup', 'fire'] as const;

export type Emote = (typeof EMOTES)[number];

export const EMOTE_ICON: Record<Emote, string> = {
  laugh: '😂',
  cry: '😭',
  scream: '😱',
  thumbsup: '👍',
  fire: '🔥',
};

// ── 작전 회의 템플릿 (기획서 §4 — 자유 텍스트 없음) ─────────────────────
export const CHAT_VERBS = ['샀어', '살 거야', '팔았어', '사지 마', '조심해', '믿지 마'] as const;

export type ChatVerb = (typeof CHAT_VERBS)[number];

export const CHAT_SUBJECT_FIXED = ['나는', '얘들아'] as const;

// ── 데이터 팩 (기획서 §7·§8) ────────────────────────────────────────────
export interface Company {
  id: string;
  /** 실명 종목 (v2 확정). 소개는 사실 서술만 — 추천·전망 표현 금지 */
  name: string;
  sector: Sector;
  /** 시연 시점 근사가(원). 정적 팩 — 게임은 실시세를 호출하지 않는다 */
  basePrice: number;
  blurb: string;
}

export interface GameEvent {
  id: string;
  name: string;
  /** 사건 카드 부제 (한 줄) */
  subtitle: string;
  /** 관찰 구간 표기 — "5거래일" 등 */
  window: string;
  /**
   * 사건 전후 실제 관찰 등락률(원값). 발동 시 종목마다 × 밴드(0.7~1.3).
   * 부호(방향)는 역사 그대로 — 바꾸려면 사료 근거를 PR에 첨부 (game/AGENTS.md)
   */
  imp: Partial<Record<Sector, number>>;
  /** 진짜 전조 뉴스가 가리키는 섹터 */
  clueSector: Sector;
  /** 전조 뉴스 본문 — 사실만, 주가 얘기 없음 */
  clueText: string;
}

export interface NoiseNews {
  sector: Sector;
  text: string;
}

// ── 플레이어 ────────────────────────────────────────────────────────────
export interface Holding {
  companyId: string;
  /** 금액 기반 매매 → 소수점 주식 (기획서 §3.2) */
  qty: number;
}

export interface NewsDelivery {
  turn: number;
  sector: Sector;
  text: string;
  /**
   * 진짜 전조 여부 — 서버 내부용. **viewFor가 제거한다.**
   * 새는 순간 "절반만 진짜" 설계가 죽는다.
   */
  real?: boolean;
}

export type InfoTab = 'analysis' | 'scout';

/** 정보소 결과 — 구매자 전용. 등급은 보여도 진위는 안 보인다 */
export interface InfoRecord {
  turn: number;
  tab: InfoTab;
  tier: 1 | 2 | 3;
  text: string;
  /** 해설 탭의 핵심 요지(UI 하이라이트·봇용). 미끼도 같은 형태 — 진위 구별 불가 */
  hint?: { sector: Sector; up: boolean };
}

/** 구매 사실 — 전원 공개, 내용은 비공개 (기획서 §9) */
export interface PurchaseRecord {
  turn: number;
  playerId: string;
  tab: InfoTab;
  tier: 1 | 2 | 3;
}

/** 회의 거짓말 기록 — "[나는][X][샀어]"인데 미보유. 서버 내부용(viewFor 제거) */
export interface Lie {
  playerId: string;
  sector: Sector;
  turn: number;
}

export interface PlayerState {
  id: string;
  nickname: string;
  /** UI 식별 색·글자칩 (아바타 대용) */
  color: string;
  ch: string;
  bot: boolean;
  cash: number;
  holdings: Holding[];
  news: NewsDelivery[];
  intel: InfoRecord[];
  /** 정보소 잔여 횟수 — 게임당 2회 (기획서 §3.3) */
  infoLeft: number;
  /** 최대 낙폭(MDD) 추적 — 든든이 상 */
  peak: number;
  maxDrawdown: number;
  /** 안 속은 횟수 — 진실의 눈 상 */
  notFooled: number;
  /** 이번 라운드에 매수한 섹터 (거짓말 정산용, 라운드마다 리셋) */
  boughtSectors: Sector[];
  /** 이 판에서 한 번이라도 보유했던 종목 — 도감 해금·귀환 랜딩 */
  heldEver: string[];
}

// ── 게임 상태 ───────────────────────────────────────────────────────────
export type Phase = 'prep' | 'chat' | 'event' | 'rank' | 'ended';

export interface AppliedChange {
  before: number;
  after: number;
  pct: number;
}

export interface AppliedEvent {
  turn: number;
  eventId: string;
  changes: Record<string, AppliedChange>;
}

export interface RngState {
  seed: number;
}

export interface GameState {
  poolId: string;
  players: PlayerState[];
  /** 1..turns */
  turn: number;
  /** 이 판의 라운드 수 — 퀵 3 / 정규 5 (기획서 §1) */
  turns: number;
  phase: Phase;
  prices: Record<string, number>;
  /** 서버만 안다 — viewFor가 제거한다 */
  eventQueue: string[];
  eventLog: AppliedEvent[];
  purchases: PurchaseRecord[];
  /** 서버 내부용 — viewFor가 제거한다 */
  lies: Lie[];
  rng: RngState;
}

// ── 액션 ────────────────────────────────────────────────────────────────
export type Action =
  | { type: 'buy'; playerId: string; companyId: string; amount: number }
  | { type: 'sell'; playerId: string; companyId: string; amount: number }
  | { type: 'buyInfo'; playerId: string; tab: InfoTab; tier: 1 | 2 | 3 }
  /** 작전 회의 템플릿 발화 — 자산 무영향, 거짓말 기록용. 릴레이는 서버 몫 */
  | { type: 'chat'; playerId: string; subject: string; sector: Sector; verb: ChatVerb }
  /** 서버(타이머·전원 준비)만 보낸다 */
  | { type: 'advancePhase' };

// ── 뷰 — 정보 비대칭 필터 결과 (기획서 §9) ──────────────────────────────
export interface Standing {
  playerId: string;
  nickname: string;
  color: string;
  ch: string;
  bot: boolean;
  totalAsset: number;
  returnPct: number;
  rank: number;
}

export interface AwardRow {
  playerId: string;
  nickname: string;
  color: string;
  ch: string;
  value: string;
}

export interface Awards {
  /** 🏆 수익왕 — 최종 자산 1위 */
  profitKing: AwardRow;
  /** 🔍 진실의 눈 — 안 속은 횟수 1위 */
  truthEye: AwardRow;
  /** 🛡️ 든든이 — 최대 낙폭 최소 */
  steady: AwardRow;
}

/** 타인 요약 — 섹터 보유 칩은 공개, 종목·수량·현금은 비공개 (기획서 §9) */
export interface OpponentSummary {
  id: string;
  nickname: string;
  color: string;
  ch: string;
  bot: boolean;
  totalAsset: number;
  heldSectors: Sector[];
  infoLeft: number;
}

export interface GameView {
  poolId: string;
  turn: number;
  turns: number;
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
