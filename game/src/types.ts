export type Sector = '반도체' | '플랫폼' | '게임' | '식품';

export interface Stock {
  id: string;
  name: string;
  sector: Sector;
  price: number;
  basePrice: number;
}

export type CardId =
  | 'buy'
  | 'sell'
  | 'watch'
  | 'diversify'
  | 'dividend'
  | 'short'
  | 'stoploss'
  | 'semiShock'
  | 'platReg'
  | 'gameHit'
  | 'chickenMukbang'
  | 'rateHike'
  | 'insider'
  | 'reels'
  | 'allin';

export type CardKind = 'action' | 'event' | 'trap' | 'fun' | 'illegal';

export interface CardDef {
  id: CardId;
  name: string;
  cost: number;
  kind: CardKind;
  needsTarget: boolean;
}

export interface ShortPosition {
  stockId: string;
  entryPrice: number;
  amount: number;
  phasesLeft: number;
}

export interface PlayerState {
  id: 0 | 1;
  cash: number;
  holdings: Record<string, number>; // stockId -> shares (소수 허용)
  shorts: ShortPosition[];
  stopLosses: string[]; // stockId 목록
  suspicion: number;
  interestNextPhase: boolean;
  energy: number;
  deck: CardId[];
  hand: CardId[];
  discard: CardId[];
  mulliganUsed: boolean;
}

export interface WorldEvent {
  id: string;
  headline: string;
  effects: Partial<Record<Sector, number>>; // 섹터별 등락률 (예: -0.15)
}

export interface GameConfig {
  startCash: number;
  livingCost: number;
  targetAssets: number;
  maxRounds: number;
  energyCap: number;
  handCap: number;
  buyAmount: number;
  shortAmount: number;
  eventEvery: number; // N라운드마다 월드 이벤트
  noisePct: number; // 정산마다 종목별 ±noisePct 노이즈
  marketDrift: number; // 정산마다 전 종목 기본 상승률 (시장 우상향)
  bankruptThreshold: number; // 자산이 이 값 이하면 파산(마진콜)
  stopLossTrigger: number; // 이 비율 이상 급락 시 손절 예약 발동
  insiderCatchPerSuspicion: number;
  insiderFinePct: number;
  insiderGain: number;
}

export type WinReason = 'bankrupt' | 'target' | 'timeout';

export interface GameState {
  round: number;
  stocks: Stock[];
  players: [PlayerState, PlayerState];
  upcomingEvent: WorldEvent; // 다음 발동 예정 이벤트 (시그널/예고)
  nextEventRound: number;
  winner: 0 | 1 | 'draw' | null;
  winReason: WinReason | null;
  rng: () => number;
  config: GameConfig;
}

export interface Play {
  card: CardId;
  target?: string; // stockId
}

export interface Bot {
  name: string;
  choose(state: GameState, me: 0 | 1): Play | null; // null = 턴 종료
}

/** 섹터 이벤트로 발생한 플레이어별 손익과, 그 시점 보유 분산도(해당 섹터 노출 비중). */
export interface SectorHitImpact {
  player: 0 | 1;
  pnlAmount: number; // 이 섹터 가격 변동으로 인한 자산 증감액(원). 손절 자동매도로 인한 효과 포함.
  exposureRatio: number; // 발동 직전 보유 주식 평가액 중 이 섹터가 차지하던 비중 (0~1). 미보유면 0.
}

export type SectorEventSource =
  | { kind: 'card'; cardId: CardId }
  | { kind: 'worldEvent'; eventId: string };

/** 엔진이 상태 변경과 함께 내보내는 사건 로그. 문구는 만들지 않고 숫자·식별자만 싣는다. */
export type GameEvent =
  | {
      type: 'stopLossTriggered';
      player: 0 | 1;
      stockId: string;
      shares: number;
      saleProceeds: number; // 손절 매도로 받은 현금
      savedAmount: number; // 손절 예약이 없었을 때보다 덜 잃은 금액
    }
  | {
      type: 'sectorHit';
      sector: Sector;
      pct: number;
      source: SectorEventSource;
      impacts: SectorHitImpact[];
    }
  | {
      type: 'shortClosed';
      player: 0 | 1;
      stockId: string;
      entryPrice: number;
      exitPrice: number;
      amount: number;
      pnl: number;
    }
  | {
      type: 'insiderCaught';
      player: 0 | 1;
      fineAmount: number; // 몰수된 현금+평가액 합계
    }
  | {
      type: 'forcedSale';
      player: 0 | 1;
      stockId: string;
      shares: number;
      proceeds: number;
    }
  | {
      type: 'worldEventTriggered';
      eventId: string;
      headline: string;
      effects: Partial<Record<Sector, number>>;
    }
  | {
      type: 'gameOver';
      winner: 0 | 1 | 'draw';
      reason: WinReason;
    };
