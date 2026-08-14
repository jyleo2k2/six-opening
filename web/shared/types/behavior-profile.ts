/**
 * F9 투자성향 — 능력치 5개·캐릭터 4종·정확 레벨 계약.
 * 산식과 임계값의 단일 원본은 `web/features/f9-archive/SPEC.md` §4다.
 *
 * 모든 능력치는 0~10 이고 **5가 중립**이다. 표본이 없으면 5에서 시작해
 * 기록이 쌓일수록 5에서 멀어진다. 극단값은 증거가 있을 때만 나온다.
 */

export type EvidenceTab = "news" | "info" | "chart";

/** 저격수·전략가·승부사·탐험가 */
export type BehaviorCharacter = "sniper" | "strategist" | "challenger" | "explorer";

/** none = 표본 0, low = 표본 부족, ready = 판정 가능 */
export type ObservationState = "none" | "low" | "ready";

export type BehaviorAbilities = {
  /** 근거력 0~10 (5 중립) */
  evidence: number;
  /** 직관력 = 10 − evidence */
  intuition: number;
  /** 집중력 0~10 (5 중립) */
  focus: number;
  /** 분산력 = 10 − focus */
  diversification: number;
  /** 정확력 0~10 (5 중립). 채점 0건이면 5 */
  accuracy: number;
};

export type AbilitySamples = {
  /** 판정에 사용한 체결 매수 수 */
  buys: number;
  sells: number;
  /** 적중 판정이 끝난 거래 수 */
  graded: number;
  /** 2거래일 미경과 등으로 판정을 보류한 거래 수 */
  pending: number;
  hits: number;
};

/** 한 기간의 성향 한 장. 주간 카드와 누적 카드가 같은 모양을 쓴다. */
export type AbilityCard = {
  scores: BehaviorAbilities;
  /** 표본이 모자라거나 두 축이 동점대면 null */
  character: BehaviorCharacter | null;
  /** 정확 레벨 1~3. 판정 불가면 null */
  level: 1 | 2 | 3 | null;
  samples: AbilitySamples;
  observation: ObservationState;
};

/** 주간 결산 카드. 끝난 주(`status: "closed"`)는 다시 계산해도 값이 같다. */
export type WeekCard = AbilityCard & {
  /** 월요일 KST 날짜 YYYY-MM-DD */
  weekStart: string;
  /** 일요일 KST 날짜 YYYY-MM-DD */
  weekEnd: string;
  /** "8/10 – 8/16" */
  label: string;
  status: "closed" | "current";
};

export type BehaviorProfileSnapshot = {
  userId: string;
  periodStart: string;
  periodEnd: string;
  /** 현재 카드 = 기간 전체 누적 */
  cumulative: AbilityCard;
  /** 주간 결산 카드. 첫 거래가 있는 주부터 이번 주까지 오름차순 */
  weeks: WeekCard[];
  reasonDistribution: Record<string, number>;
  /** 계획대로 판 매도의 비율 0~1. 판정 가능한 매도가 없으면 0 */
  actionAlignment: number;
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

/**
 * 체결된 매도 한 건.
 * `price` 는 매도 체결 단가다. 화면이 저장하지 않는 경우가 있어 null 을 허용하고,
 * 그때는 매도일 종가로 근사한다 **[가정]**.
 */
export type ProfileSell = {
  id: string;
  symbol: string;
  quantity: number;
  price: number | null;
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
  /** 비우면 첫 거래일로 채운다 */
  periodStart?: string;
  /** 오늘(KST). 주간 카드의 마지막 주와 보유 스냅샷 기준일이다 */
  periodEnd: string;
  buys: ProfileBuy[];
  sells: ProfileSell[];
  tabViews: ProfileTabView[];
  /** `periodEnd` 시점의 현재 보유. 과거 주는 여기서 거래를 되돌려 복원한다 */
  holdings: ProfileHolding[];
  cash: number;
  /** 보유 평가액 계산용 현재가. 없는 종목은 averagePrice 로 평가한다 */
  priceBySymbol: Record<string, number>;
  sectorBySymbol: Record<string, string>;
  dailyClosesBySymbol: Record<string, DailyClose[]>;
};
