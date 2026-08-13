/**
 * F9 투자성향 — 능력치 5개·캐릭터 4종·정확 등급 계약.
 * 산식과 임계값의 단일 원본은 `web/features/f9-archive/SPEC.md` §4다.
 */

export type EvidenceTab = "news" | "info" | "chart";

/** 저격수·전략가·승부사·탐험가 */
export type BehaviorCharacter = "sniper" | "strategist" | "challenger" | "explorer";

export type BehaviorAbilities = {
  /** 근거력 0~10 */
  evidence: number;
  /** 직관력 = 10 − evidence */
  intuition: number;
  /** 집중력 0~10 */
  focus: number;
  /** 분산력 = 10 − focus */
  diversification: number;
  /** 정확력 0~10. 기본 5점에서 시작해 채점된 거래가 적중하면 +1, 빗나가면 −1 */
  accuracy: number;
};

export type BehaviorProfileSnapshot = {
  userId: string;
  periodStart: string;
  periodEnd: string;
  /** 판정에 사용한 체결 매수 수 */
  sampleSize: number;
  abilities: BehaviorAbilities;
  character: BehaviorCharacter | null;
  /** 정확 등급 별 개수. 관찰 초기면 null */
  starGrade: 1 | 2 | 3 | null;
  /** 적중 판정이 끝난 거래 수 */
  gradedTradeCount: number;
  /** 5거래일 미경과 등으로 판정을 보류한 거래 수 */
  pendingTradeCount: number;
  reasonDistribution: Record<string, number>;
  /** 계획대로 판 매도의 비율 0~1. 판정 가능한 매도가 없으면 0 */
  actionAlignment: number;
  observationState: "initial" | "ready";
};

/** 체결된 매수 한 건. price 는 체결 단가다. */
export type ProfileBuy = {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  reason: string | null;
  tradedAt: string;
};

export type ProfileSell = {
  id: string;
  symbol: string;
  tradedAt: string;
  planMatch: boolean | null;
};

/** 유효 열람 판정용 탭 열람 한 건 */
export type ProfileTabView = {
  tab: EvidenceTab;
  symbol: string;
  viewedAt: string;
  dwellMs: number;
};

export type ProfileHolding = {
  symbol: string;
  quantity: number;
  averagePrice: number;
};

/** KST 거래일 종가. date 는 YYYY-MM-DD 이고 배열은 날짜 오름차순이다. */
export type DailyClose = { date: string; close: number };

export type BehaviorProfileInput = {
  userId: string;
  periodStart: string;
  periodEnd: string;
  buys: ProfileBuy[];
  sells: ProfileSell[];
  tabViews: ProfileTabView[];
  holdings: ProfileHolding[];
  cash: number;
  /** 보유 평가액 계산용 현재가. 없는 종목은 averagePrice 로 평가한다 */
  priceBySymbol: Record<string, number>;
  sectorBySymbol: Record<string, string>;
  dailyClosesBySymbol: Record<string, DailyClose[]>;
};
