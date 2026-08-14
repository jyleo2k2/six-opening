/**
 * F9 투자성향 엔진.
 *
 * 설계 원칙: **모든 축은 0~10 이고 5가 중립이다.** 표본이 없으면 5에서 시작하고,
 * 기록이 쌓일수록 5에서 멀어진다. 극단값은 증거가 있을 때만 나온다.
 *
 * 기간 자르기와 점수 계산을 분리한다 — `computeAbilities` 는 기간을 모르고 표본만 받는다.
 * 그래서 주간 결산 카드와 누적 카드가 **같은 함수**를 쓴다.
 *
 * 화면(`app.html`)이 쓰는 구버전 엔진은 아직 `archive-profile.js` 다. 화면 이관이 끝나면
 * 그 파일을 지운다. 그때까지 두 엔진의 점수는 서로 다르다 (구버전은 0~100·정확 5거래일).
 */
import type {
  AbilityCard,
  AbilitySamples,
  BehaviorAbilities,
  BehaviorCharacter,
  BehaviorProfileInput,
  BehaviorProfileSnapshot,
  DailyClose,
  EvidenceTab,
  ObservationState,
  ProfileBuy,
  ProfileHolding,
  ProfileSell,
  ProfileTabView,
  WeekCard,
} from "../types/behavior-profile";
import type { Trade } from "../types/trade";

// ── 상수 ────────────────────────────────────────────────────────────────────
// 전부 [가정] 이다. 실사용 분포를 보기 전까지는 여기 값만 바꿔 조정한다.

/** 모든 축의 중립값 */
export const NEUTRAL = 5;
/** 표본 축소 강도. "미리 k/2 건 성공, k/2 건 실패를 봤다"고 두는 것과 같다 */
export const SHRINKAGE_K = 4;
/** 유효 섹터수가 이 값이면 집중력이 중립(5)이 된다 */
export const FOCUS_ANCHOR_ES = 3;
/** 유효 섹터수가 앵커의 3배가 될 때마다 이만큼 내려간다 */
export const FOCUS_SPAN = 5;
/** 정확 채점 — 체결 다음 거래일부터 세어 이만큼 뒤 종가로 판정한다 (월 매수 → 수 종가) */
export const ACCURACY_WAIT_TRADING_DAYS = 2;
/** 탭 열람이 근거로 인정되는 최소 체류 */
export const VALID_DWELL_MS = 10_000;
/** 매수 하나가 근거로 인정되려면 3탭 중 이만큼을 유효 열람해야 한다 */
export const EVIDENCE_TAB_MIN = 2;
/** 캐릭터를 확정하는 최소 체결 매수 수 */
export const MIN_BUYS_FOR_PROFILE = 3;
/** 보완쌍 차이가 이 값 미만이면 동점대로 보고 캐릭터를 확정하지 않는다 */
export const TIE_BAND = 1;
/** 정확 레벨 경계 — 기존 적중 비율 1/3·2/3 을 0~10 으로 옮긴 값 */
export const ACCURACY_LEVEL_3_SCORE = 20 / 3;
export const ACCURACY_LEVEL_2_SCORE = 10 / 3;

/** app.html 이벤트명 → 3탭. 기업정보 탭(info_detail_opened)은 화면 출시 전에 미리 등록해 둔다. */
export const TAB_BY_EVENT: Record<string, EvidenceTab> = {
  news_detail_opened: "news",
  info_detail_opened: "info",
  chart_detail_opened: "chart",
};

// ── 스케일 ──────────────────────────────────────────────────────────────────

const clamp10 = (value: number) => Math.max(0, Math.min(10, value));

/** 0~10 으로 자르고 소수점 한 자리로 반올림한다. 화면 표시는 다시 정수로 줄여도 된다. */
export const score10 = (value: number) => Math.round(clamp10(value) * 10) / 10;

/**
 * 표본 축소. 표본이 적을 때 0·10 같은 극단값이 나오지 않게 중립으로 끌어당긴다.
 * 표본이 하나도 없으면 정확히 중립(5)이다.
 */
export function shrink(hits: number, total: number, k: number = SHRINKAGE_K): number {
  return score10((10 * (hits + k / 2)) / (total + k));
}

// ── 날짜 ────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** ISO 시각 → KST 날짜(YYYY-MM-DD). 일봉 `date` 와 같은 축이다. */
export function kstDateOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

// KST 날짜 문자열끼리의 산술이라 UTC 자정으로 파싱해도 시차가 생기지 않는다.
const parseDay = (date: string) => Date.parse(`${date}T00:00:00Z`);
const formatDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 그 날짜가 속한 주의 월요일 (KST 기준) */
export function mondayOf(date: string): string {
  const ms = parseDay(date);
  const backToMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return formatDay(ms - backToMonday * DAY_MS);
}

export type Window = { start: string; end: string };

/** `from`~`to` 를 덮는 월요일 시작 주 목록. 양끝 주를 모두 포함한다 */
export function weekBucketsKST(from: string, to: string): Window[] {
  if (!from || !to || from > to) return [];
  const last = parseDay(mondayOf(to));
  const weeks: Window[] = [];
  for (let cursor = parseDay(mondayOf(from)); cursor <= last; cursor += 7 * DAY_MS) {
    weeks.push({ start: formatDay(cursor), end: formatDay(cursor + 6 * DAY_MS) });
  }
  return weeks;
}

const inWindow = (date: string, window: Window) => date >= window.start && date <= window.end;

const shortDay = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

const weekLabel = (window: Window) => `${shortDay(window.start)} – ${shortDay(window.end)}`;

// ── 종가 ────────────────────────────────────────────────────────────────────

/** `date` 다음 거래일부터 세어 `days` 번째 캔들. 아직 안 지났으면 null */
export function settlementAfter(
  closes: DailyClose[],
  date: string,
  days: number = ACCURACY_WAIT_TRADING_DAYS,
): DailyClose | null {
  let seen = 0;
  for (const candle of closes) {
    if (candle.date > date && (seen += 1) === days) return candle;
  }
  return null;
}

/** `date` 당일 종가, 없으면 직전 거래일 종가 */
export function closeOnOrBefore(closes: DailyClose[], date: string): number | null {
  let last: number | null = null;
  for (const candle of closes) {
    if (candle.date > date) break;
    last = candle.close;
  }
  return last;
}

// ── 근거력 ──────────────────────────────────────────────────────────────────

/** 매수 이전에 같은 종목을 10초 이상 본 탭 종류 수 (0~3) */
export function viewedTabCount(buy: ProfileBuy, tabViews: ProfileTabView[]): number {
  const tabs = new Set<EvidenceTab>();
  const boughtAt = new Date(buy.tradedAt).getTime();
  for (const view of tabViews) {
    if (view.symbol !== buy.symbol) continue;
    if (view.dwellMs < VALID_DWELL_MS) continue;
    if (new Date(view.viewedAt).getTime() >= boughtAt) continue;
    tabs.add(view.tab);
  }
  return tabs.size;
}

/** 근거력 = 3탭 중 2개 이상을 유효 열람한 매수의 비율. 매수가 없으면 중립 5 */
export function computeEvidence(buys: ProfileBuy[], tabViews: ProfileTabView[]): number {
  const evidenced = buys.filter((buy) => viewedTabCount(buy, tabViews) >= EVIDENCE_TAB_MIN).length;
  return shrink(evidenced, buys.length);
}

// ── 집중력 ──────────────────────────────────────────────────────────────────

const holdingValue = (holding: ProfileHolding, priceBySymbol: Record<string, number>) =>
  holding.quantity * (priceBySymbol[holding.symbol] ?? holding.averagePrice);

/** 보유 주식 평가액 합계 (섹터를 몰라도 포함한다 — 투자한 돈은 투자한 돈이다) */
export function holdingsValue(
  holdings: ProfileHolding[],
  priceBySymbol: Record<string, number>,
): number {
  return holdings
    .filter((holding) => holding.quantity > 0)
    .reduce((sum, holding) => sum + Math.max(0, holdingValue(holding, priceBySymbol)), 0);
}

/**
 * 유효 섹터수 = 1 / HHI. 가짓수가 아니라 **비중까지 반영한 실질 분산 정도**다.
 * 반도체 900만 + 게임 1만은 섹터가 둘이지만 유효 섹터수는 1.0 에 가깝다.
 * 섹터를 모르는 종목은 제외한다. 판정할 보유가 없으면 0.
 */
export function effectiveSectorCount(
  holdings: ProfileHolding[],
  priceBySymbol: Record<string, number>,
  sectorBySymbol: Record<string, string>,
): number {
  const bySector: Record<string, number> = {};
  let total = 0;
  for (const holding of holdings) {
    if (holding.quantity <= 0) continue;
    const sector = sectorBySymbol[holding.symbol];
    if (!sector) continue;
    const value = holdingValue(holding, priceBySymbol);
    if (value <= 0) continue;
    bySector[sector] = (bySector[sector] ?? 0) + value;
    total += value;
  }
  if (total <= 0) return 0;
  const hhi = Object.values(bySector).reduce((sum, value) => sum + (value / total) ** 2, 0);
  return 1 / hhi;
}

/**
 * 집중력 = 유효 섹터수를 로그로 0~10 에 얹고, 현금 비중만큼 중립으로 끌어당긴다.
 *
 * 유효 섹터수 1 → 10점, 3 → 5점(앵커), 9 → 0점. 계단이 없다.
 * 전량 현금이면 판단할 근거가 없으므로 정확히 중립 5가 된다.
 */
export function computeFocus(
  holdings: ProfileHolding[],
  cash: number,
  priceBySymbol: Record<string, number>,
  sectorBySymbol: Record<string, string>,
): number {
  const held = holdings.filter((holding) => holding.quantity > 0);
  const effectiveSectors = effectiveSectorCount(held, priceBySymbol, sectorBySymbol);
  if (effectiveSectors <= 0) return NEUTRAL;

  const raw = clamp10(10 - FOCUS_SPAN * (Math.log(effectiveSectors) / Math.log(FOCUS_ANCHOR_ES)));
  const stockValue = holdingsValue(held, priceBySymbol);
  const total = stockValue + Math.max(0, cash);
  const invested = total > 0 ? stockValue / total : 0;
  return score10(NEUTRAL + (raw - NEUTRAL) * invested);
}

// ── 정확력 ──────────────────────────────────────────────────────────────────

/** 채점이 끝난 거래 한 건. `settledOn` 이 주간 카드 귀속의 기준이다. */
export type GradedTrade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  tradedAt: string;
  /** 적중 판정이 확정된 KST 날짜 */
  settledOn: string;
  hit: boolean;
};

export type GradeResult = { graded: GradedTrade[]; pendingIds: Set<string> };

/**
 * 체결 2거래일 뒤 종가로 맞았는지 본다. 매수는 오르면, 매도는 내리면 적중이다.
 * 2거래일이 안 지났거나 종가가 없으면 채점하지 않고 보류한다.
 */
export function gradeTrades(
  buys: ProfileBuy[],
  sells: ProfileSell[],
  closesBySymbol: Record<string, DailyClose[]>,
): GradeResult {
  const graded: GradedTrade[] = [];
  const pendingIds = new Set<string>();

  for (const buy of buys) {
    const closes = closesBySymbol[buy.symbol] ?? [];
    const settlement = settlementAfter(closes, kstDateOf(buy.tradedAt));
    if (!settlement) {
      pendingIds.add(buy.id);
      continue;
    }
    graded.push({
      id: buy.id,
      symbol: buy.symbol,
      side: "buy",
      tradedAt: buy.tradedAt,
      settledOn: settlement.date,
      hit: settlement.close > buy.price,
    });
  }

  for (const sell of sells) {
    const closes = closesBySymbol[sell.symbol] ?? [];
    const soldOn = kstDateOf(sell.tradedAt);
    const sellPrice = sell.price ?? closeOnOrBefore(closes, soldOn);
    const settlement = settlementAfter(closes, soldOn);
    if (sellPrice === null || !settlement) {
      pendingIds.add(sell.id);
      continue;
    }
    graded.push({
      id: sell.id,
      symbol: sell.symbol,
      side: "sell",
      tradedAt: sell.tradedAt,
      settledOn: settlement.date,
      hit: settlement.close < sellPrice,
    });
  }

  return { graded, pendingIds };
}

/** 적중률 → 0~10. 채점된 거래가 없으면 중립 5 */
export function scoreAccuracy(graded: GradedTrade[]): number {
  return shrink(graded.filter((trade) => trade.hit).length, graded.length);
}

export function accuracyLevelOf(score: number): 1 | 2 | 3 {
  if (score >= ACCURACY_LEVEL_3_SCORE) return 3;
  if (score >= ACCURACY_LEVEL_2_SCORE) return 2;
  return 1;
}

// ── 캐릭터 ──────────────────────────────────────────────────────────────────

/**
 * 두 보완쌍의 우세로 캐릭터를 정한다.
 * 어느 한 쌍이라도 동점대(차이 < TIE_BAND)면 아직 말할 수 없으므로 null 이다.
 */
export function judgeCharacter(
  abilities: Pick<BehaviorAbilities, "evidence" | "intuition" | "focus" | "diversification">,
): BehaviorCharacter | null {
  if (Math.abs(abilities.evidence - abilities.intuition) < TIE_BAND) return null;
  if (Math.abs(abilities.focus - abilities.diversification) < TIE_BAND) return null;
  const evidenceLeads = abilities.evidence > abilities.intuition;
  const focusLeads = abilities.focus > abilities.diversification;
  if (evidenceLeads) return focusLeads ? "sniper" : "strategist";
  return focusLeads ? "challenger" : "explorer";
}

// ── 카드 한 장 ──────────────────────────────────────────────────────────────

/** 한 기간의 표본. 기간을 어떻게 잘랐는지는 여기 담기지 않는다. */
export type AbilitySample = {
  buys: ProfileBuy[];
  sells: ProfileSell[];
  tabViews: ProfileTabView[];
  graded: GradedTrade[];
  pending: number;
  holdings: ProfileHolding[];
  cash: number;
  priceBySymbol: Record<string, number>;
  sectorBySymbol: Record<string, string>;
};

/** 표본만 보고 다섯 축을 낸다. 주간이든 누적이든 이 함수 하나를 쓴다. */
export function computeAbilities(sample: AbilitySample): BehaviorAbilities {
  const evidence = computeEvidence(sample.buys, sample.tabViews);
  const focus = computeFocus(
    sample.holdings,
    sample.cash,
    sample.priceBySymbol,
    sample.sectorBySymbol,
  );
  return {
    evidence,
    intuition: score10(10 - evidence),
    focus,
    diversification: score10(10 - focus),
    accuracy: scoreAccuracy(sample.graded),
  };
}

function observationOf(buyCount: number): ObservationState {
  if (buyCount === 0) return "none";
  return buyCount < MIN_BUYS_FOR_PROFILE ? "low" : "ready";
}

export function buildCard(sample: AbilitySample): AbilityCard {
  const scores = computeAbilities(sample);
  const observation = observationOf(sample.buys.length);
  const ready = observation === "ready";
  const samples: AbilitySamples = {
    buys: sample.buys.length,
    sells: sample.sells.length,
    graded: sample.graded.length,
    pending: sample.pending,
    hits: sample.graded.filter((trade) => trade.hit).length,
  };
  return {
    scores,
    character: ready ? judgeCharacter(scores) : null,
    level: ready ? accuracyLevelOf(scores.accuracy) : null,
    samples,
    observation,
  };
}

// ── 과거 시점 포트폴리오 복원 ───────────────────────────────────────────────

function sellPriceOf(sell: ProfileSell, closes: DailyClose[], fallbackAverage: number): number {
  if (sell.price !== null) return sell.price;
  return closeOnOrBefore(closes, kstDateOf(sell.tradedAt)) ?? fallbackAverage;
}

/**
 * 현재 보유·현금에서 `asOf` 이후 거래를 최신순으로 되돌려 그 시점 포트폴리오를 만든다.
 * 주간 카드의 집중력은 그 주 마지막 날 기준이어야 하므로 이 복원이 필요하다.
 *
 * 매도 대금은 `sell.price` → 매도일 종가 → 평균단가 순으로 잡는다 **[가정]**.
 * 되살아난 보유의 평균단가도 그 값으로 근사한다.
 */
export function replayPortfolio(
  current: { holdings: ProfileHolding[]; cash: number },
  buys: ProfileBuy[],
  sells: ProfileSell[],
  asOf: string,
  closesBySymbol: Record<string, DailyClose[]> = {},
): { holdings: ProfileHolding[]; cash: number } {
  const held = new Map<string, ProfileHolding>();
  for (const holding of current.holdings) held.set(holding.symbol, { ...holding });
  let cash = current.cash;

  const undoable = [
    ...buys
      .filter((buy) => kstDateOf(buy.tradedAt) > asOf)
      .map((buy) => ({
        at: buy.tradedAt,
        side: "buy" as const,
        symbol: buy.symbol,
        quantity: buy.quantity,
        price: buy.price,
      })),
    ...sells
      .filter((sell) => kstDateOf(sell.tradedAt) > asOf)
      .map((sell) => ({
        at: sell.tradedAt,
        side: "sell" as const,
        symbol: sell.symbol,
        quantity: sell.quantity,
        price: sellPriceOf(
          sell,
          closesBySymbol[sell.symbol] ?? [],
          held.get(sell.symbol)?.averagePrice ?? 0,
        ),
      })),
    // 최신 거래부터 되돌려야 같은 종목을 샀다 판 경우가 어긋나지 않는다.
  ].sort((a, b) => b.at.localeCompare(a.at));

  for (const entry of undoable) {
    const holding = held.get(entry.symbol);
    if (entry.side === "buy") {
      if (holding) holding.quantity -= entry.quantity;
      cash += entry.price * entry.quantity;
    } else if (holding) {
      holding.quantity += entry.quantity;
      cash -= entry.price * entry.quantity;
    } else {
      held.set(entry.symbol, {
        symbol: entry.symbol,
        quantity: entry.quantity,
        averagePrice: entry.price,
      });
      cash -= entry.price * entry.quantity;
    }
  }

  return {
    holdings: [...held.values()].filter((holding) => holding.quantity > 0),
    cash: Math.max(0, cash),
  };
}

// ── 주간 결산 + 누적 ────────────────────────────────────────────────────────

export function computeBehaviorProfile(input: BehaviorProfileInput): BehaviorProfileSnapshot {
  const { graded, pendingIds } = gradeTrades(input.buys, input.sells, input.dailyClosesBySymbol);
  const shared = {
    tabViews: input.tabViews,
    priceBySymbol: input.priceBySymbol,
    sectorBySymbol: input.sectorBySymbol,
  };

  const tradedDates = [...input.buys, ...input.sells]
    .map((trade) => kstDateOf(trade.tradedAt))
    .sort();
  const periodStart = input.periodStart ?? tradedDates[0] ?? input.periodEnd;

  const weeks: WeekCard[] = weekBucketsKST(periodStart, input.periodEnd).map((window) => {
    const current = inWindow(input.periodEnd, window);
    const weekBuys = input.buys.filter((buy) => inWindow(kstDateOf(buy.tradedAt), window));
    const weekSells = input.sells.filter((sell) => inWindow(kstDateOf(sell.tradedAt), window));
    // 정확력은 **채점이 끝난 주**에 귀속한다. 그래야 끝난 주 카드가 나중에 바뀌지 않는다.
    const weekGraded = graded.filter((trade) => inWindow(trade.settledOn, window));
    // 보류는 반대로 **그 주에 한 거래 중 아직 판정이 안 난 것**을 센다.
    const weekPending = [...weekBuys, ...weekSells].filter((trade) => pendingIds.has(trade.id)).length;
    const portfolio = replayPortfolio(
      { holdings: input.holdings, cash: input.cash },
      input.buys,
      input.sells,
      current ? input.periodEnd : window.end,
      input.dailyClosesBySymbol,
    );
    return {
      ...buildCard({
        ...shared,
        buys: weekBuys,
        sells: weekSells,
        graded: weekGraded,
        pending: weekPending,
        holdings: portfolio.holdings,
        cash: portfolio.cash,
      }),
      weekStart: window.start,
      weekEnd: window.end,
      label: weekLabel(window),
      status: current ? "current" : "closed",
    };
  });

  const cumulative = buildCard({
    ...shared,
    buys: input.buys,
    sells: input.sells,
    graded,
    pending: pendingIds.size,
    holdings: input.holdings,
    cash: input.cash,
  });

  const reasonDistribution: Record<string, number> = {};
  for (const buy of input.buys) {
    if (!buy.reason) continue;
    reasonDistribution[buy.reason] = (reasonDistribution[buy.reason] ?? 0) + 1;
  }
  const judgedSells = input.sells.filter((sell) => sell.planMatch !== null);
  const matched = judgedSells.filter((sell) => sell.planMatch === true).length;

  return {
    userId: input.userId,
    periodStart,
    periodEnd: input.periodEnd,
    cumulative,
    weeks,
    reasonDistribution,
    actionAlignment: judgedSells.length ? Math.round((matched / judgedSells.length) * 100) / 100 : 0,
  };
}

// ── app.html(kw_proto_v1) 원본 → 엔진 입력 매핑 ──────────────────────────────

const USER_ID_BY_ACCOUNT = { child: "child_minji", parent: "parent_mom" } as const;
export type PrototypeAccount = keyof typeof USER_ID_BY_ACCOUNT;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const str = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * `localStorage["kw_proto_v1"]` JSON을 계정 하나의 엔진 입력으로 바꾼다.
 * 시세·섹터·캔들은 서버가 따로 주입한다 — 여기서는 기록만 옮긴다.
 */
export function parsePrototypeProfileInput(
  raw: unknown,
  account: PrototypeAccount,
): Pick<BehaviorProfileInput, "buys" | "sells" | "tabViews" | "holdings" | "cash"> {
  const state = isRecord(raw) ? raw : {};
  const userId = USER_ID_BY_ACCOUNT[account];

  const buys: ProfileBuy[] = [];
  for (const record of asRecords(state.records)) {
    if (record.user_id !== userId) continue;
    // 지정가 대기 주문은 체결이 아니므로 표본에서 뺀다
    if (record.order_status !== "filled") continue;
    const quantity = num(record.qty);
    const amount = num(record.amount_krw);
    if (quantity <= 0 || amount <= 0) continue;
    buys.push({
      id: str(record.order_id) || `buy_${buys.length}`,
      symbol: str(record.symbol),
      price: amount / quantity,
      quantity,
      reason: str(record.reason_code) || null,
      tradedAt: str(record.ts),
    });
  }

  const sells: ProfileSell[] = [];
  for (const record of asRecords(state.sellRecords)) {
    if (record.user_id !== userId) continue;
    if (record.order_status !== "filled") continue;
    const quantity = num(record.qty);
    if (quantity <= 0) continue;
    // 화면은 매도 체결가를 남기지 않는다. 평균단가와 매도 시점 손익률로 되짚고,
    // 둘 중 하나라도 없으면 null 로 두어 매도일 종가 근사에 맡긴다.
    const average = num(record.avg);
    const pnlPct = record.pnl_pct_at_sell;
    sells.push({
      id: str(record.order_id) || `sell_${sells.length}`,
      symbol: str(record.symbol),
      quantity,
      price:
        average > 0 && typeof pnlPct === "number"
          ? Math.round(average * (1 + pnlPct / 100))
          : null,
      tradedAt: str(record.ts),
      planMatch: typeof record.plan_match === "boolean" ? record.plan_match : null,
    });
  }

  const tabViews: ProfileTabView[] = [];
  for (const event of asRecords(state.events)) {
    if (event.user_id !== userId) continue;
    const tab = TAB_BY_EVENT[str(event.event)];
    if (!tab) continue;
    tabViews.push({
      tab,
      symbol: str(event.symbol),
      viewedAt: str(event.ts),
      dwellMs: num(event.dwell_ms),
    });
  }

  const accounts = isRecord(state.acc) ? state.acc : {};
  const accountState = isRecord(accounts[account])
    ? (accounts[account] as Record<string, unknown>)
    : {};
  const holdings: ProfileHolding[] = asRecords(accountState.holdings).map((holding) => ({
    symbol: str(holding.code),
    quantity: num(holding.qty),
    averagePrice: num(holding.avg),
  }));

  return { buys, sells, tabViews, holdings, cash: num(accountState.cash) };
}

/** F11 시드(`Trade[]`)를 엔진 표본으로 바꾼다. 시드와 라이브 기록을 한 표본으로 합칠 때 쓴다. */
export function profileEntriesFromTrades(
  trades: Trade[],
  member: Trade["member"],
): { buys: ProfileBuy[]; sells: ProfileSell[] } {
  const buys: ProfileBuy[] = [];
  const sells: ProfileSell[] = [];
  for (const trade of trades) {
    if (trade.member !== member) continue;
    if (trade.side === "buy") {
      buys.push({
        id: trade.id,
        symbol: trade.symbol,
        price: trade.price,
        quantity: trade.quantity,
        reason: trade.reason,
        tradedAt: trade.tradedAt,
      });
    } else {
      sells.push({
        id: trade.id,
        symbol: trade.symbol,
        quantity: trade.quantity,
        price: trade.price,
        tradedAt: trade.tradedAt,
        planMatch: null,
      });
    }
  }
  return { buys, sells };
}
