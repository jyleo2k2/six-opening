import type {
  BehaviorAbilities,
  BehaviorCharacter,
  BehaviorProfileInput,
  BehaviorProfileSnapshot,
  DailyClose,
  EvidenceTab,
  ProfileBuy,
  ProfileHolding,
  ProfileSell,
  ProfileTabView,
} from "../types/behavior-profile";
import type { Trade } from "../types/trade";

// 임계값은 2026-08-13 개요 확정값이다 (f9-archive/SPEC.md §4.1). 임의로 바꾸지 않는다.
export const VALID_DWELL_MS = 10_000;
export const EVIDENCE_TAB_MIN = 2;
export const FOCUS_SECTOR_HIGH_MAX = 3;
export const CASH_HEAVY_RATIO = 0.5;
export const ACCURACY_WAIT_TRADING_DAYS = 5;
// [가정] 표본 임계 — 제품 확정 시 상수만 바꾼다 (SPEC §4.2·§4.3).
export const MIN_BUYS_FOR_PROFILE = 3;
export const MIN_GRADED_FOR_ACCURACY = 3;

/** app.html 이벤트명 → 3탭. 기업정보 탭(info_detail_opened)은 화면 출시 전에 미리 등록해 둔다. */
export const TAB_BY_EVENT: Record<string, EvidenceTab> = {
  news_detail_opened: "news",
  info_detail_opened: "info",
  chart_detail_opened: "chart",
};

const clampScore = (value: number) => Math.max(0, Math.min(10, Math.round(value)));

const timeOf = (iso: string) => new Date(iso).getTime();

/** ISO 시각 → KST 날짜(YYYY-MM-DD). 캔들 `DailyClose.date` 와 같은 축이다. */
export function kstDateOf(iso: string): string {
  return new Date(timeOf(iso) + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** 매수 이전에 같은 종목을 10초 이상 본 탭 종류 수 */
export function viewedTabCount(buy: ProfileBuy, tabViews: ProfileTabView[]): number {
  const tabs = new Set<EvidenceTab>();
  const boughtAt = timeOf(buy.tradedAt);
  for (const view of tabViews) {
    if (view.symbol !== buy.symbol) continue;
    if (view.dwellMs < VALID_DWELL_MS) continue;
    if (timeOf(view.viewedAt) >= boughtAt) continue;
    tabs.add(view.tab);
  }
  return tabs.size;
}

/** 근거력 = 3탭 중 2개 이상을 유효 열람한 매수의 비율 × 10 */
export function computeEvidence(buys: ProfileBuy[], tabViews: ProfileTabView[]): number {
  if (buys.length === 0) return 0;
  const evidenced = buys.filter((buy) => viewedTabCount(buy, tabViews) >= EVIDENCE_TAB_MIN).length;
  return clampScore((evidenced / buys.length) * 10);
}

/** 집중력 = 보유 섹터 수·현금비중 환산. 섹터 ≤3 높음, ≥4 또는 현금 50%+ 낮음 */
export function computeFocus(
  holdings: ProfileHolding[],
  cash: number,
  priceBySymbol: Record<string, number>,
  sectorBySymbol: Record<string, string>,
): number {
  const held = holdings.filter((holding) => holding.quantity > 0);
  const sectors = new Set(
    held.map((holding) => sectorBySymbol[holding.symbol]).filter((sector): sector is string => Boolean(sector)),
  );
  const value = held.reduce(
    (sum, holding) => sum + holding.quantity * (priceBySymbol[holding.symbol] ?? holding.averagePrice),
    0,
  );
  const total = cash + value;
  const cashRatio = total > 0 ? cash / total : 1;
  // [가정] 환산 곡선 — 개요는 방향만 확정했다. 1~3섹터 = 9·8·7점, 4섹터부터 8−n(하한 1), 전량 현금 = 1점.
  const count = sectors.size;
  let score = count === 0 ? 1 : count <= FOCUS_SECTOR_HIGH_MAX ? 10 - count : Math.max(1, 8 - count);
  if (cashRatio >= CASH_HEAVY_RATIO) score = Math.max(1, score - 2);
  return clampScore(score);
}

function closeAfterTradingDays(closes: DailyClose[], date: string, days: number): number | null {
  let seen = 0;
  for (const candle of closes) {
    if (candle.date > date && ++seen === days) return candle.close;
  }
  return null;
}

function closeOnOrBefore(closes: DailyClose[], date: string): number | null {
  let last: number | null = null;
  for (const candle of closes) {
    if (candle.date > date) break;
    last = candle.close;
  }
  return last;
}

export type AccuracyResult = {
  accuracy: number | null;
  graded: number;
  pending: number;
  hits: number;
};

/** 정확력 = 체결 후 5거래일 종가 기준 적중률 × 10. 판정 가능 거래가 표본 미만이면 null */
export function gradeAccuracy(
  buys: ProfileBuy[],
  sells: ProfileSell[],
  dailyClosesBySymbol: Record<string, DailyClose[]>,
): AccuracyResult {
  let graded = 0;
  let hits = 0;
  let pending = 0;
  for (const buy of buys) {
    const closes = dailyClosesBySymbol[buy.symbol] ?? [];
    const settle = closeAfterTradingDays(closes, kstDateOf(buy.tradedAt), ACCURACY_WAIT_TRADING_DAYS);
    if (settle === null) {
      pending += 1;
      continue;
    }
    graded += 1;
    if (settle > buy.price) hits += 1;
  }
  for (const sell of sells) {
    const closes = dailyClosesBySymbol[sell.symbol] ?? [];
    const soldDate = kstDateOf(sell.tradedAt);
    // 매도 체결가는 매도 당일(없으면 직전 거래일) 종가로 근사한다 [가정]
    const sellPrice = closeOnOrBefore(closes, soldDate);
    const settle = closeAfterTradingDays(closes, soldDate, ACCURACY_WAIT_TRADING_DAYS);
    if (sellPrice === null || settle === null) {
      pending += 1;
      continue;
    }
    graded += 1;
    if (settle < sellPrice) hits += 1;
  }
  const accuracy = graded >= MIN_GRADED_FOR_ACCURACY ? clampScore((hits / graded) * 10) : null;
  return { accuracy, graded, pending, hits };
}

/** 두 쌍의 우세로 캐릭터 결정. 5:5 동점은 근거·집중 쪽으로 귀속한다 */
export function judgeCharacter(
  abilities: Pick<BehaviorAbilities, "evidence" | "intuition" | "focus" | "diversification">,
): BehaviorCharacter {
  const evidenceLeads = abilities.evidence >= abilities.intuition;
  const focusLeads = abilities.focus >= abilities.diversification;
  if (evidenceLeads) return focusLeads ? "sniper" : "strategist";
  return focusLeads ? "challenger" : "explorer";
}

export function starGradeOf(accuracy: number | null): 1 | 2 | 3 | null {
  if (accuracy === null) return null;
  if (accuracy >= 7) return 3;
  if (accuracy >= 4) return 2;
  return 1;
}

export function computeBehaviorProfile(input: BehaviorProfileInput): BehaviorProfileSnapshot {
  const evidence = computeEvidence(input.buys, input.tabViews);
  const focus = computeFocus(input.holdings, input.cash, input.priceBySymbol, input.sectorBySymbol);
  const { accuracy, graded, pending } = gradeAccuracy(input.buys, input.sells, input.dailyClosesBySymbol);
  const abilities: BehaviorAbilities = {
    evidence,
    intuition: 10 - evidence,
    focus,
    diversification: 10 - focus,
    accuracy,
  };

  const reasonDistribution: Record<string, number> = {};
  for (const buy of input.buys) {
    if (!buy.reason) continue;
    reasonDistribution[buy.reason] = (reasonDistribution[buy.reason] ?? 0) + 1;
  }
  const confidences = input.buys
    .map((buy) => buy.confidence)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const average = confidences.length
    ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
    : 0;
  const judgedSells = input.sells.filter((sell) => sell.planMatch !== null);
  const matched = judgedSells.filter((sell) => sell.planMatch === true).length;
  const actionAlignment = judgedSells.length ? Math.round((matched / judgedSells.length) * 100) / 100 : 0;

  const ready = input.buys.length >= MIN_BUYS_FOR_PROFILE;
  return {
    userId: input.userId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    sampleSize: input.buys.length,
    abilities,
    character: ready ? judgeCharacter(abilities) : null,
    starGrade: ready ? starGradeOf(accuracy) : null,
    accuracyState: accuracy === null ? "pending" : "graded",
    gradedTradeCount: graded,
    pendingTradeCount: pending,
    reasonDistribution,
    confidencePattern: { average, actionAlignment },
    observationState: ready ? "ready" : "initial",
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
      confidence: Number.isFinite(Number(record.confidence_raw)) ? Number(record.confidence_raw) : null,
      tradedAt: str(record.ts),
    });
  }

  const sells: ProfileSell[] = [];
  for (const record of asRecords(state.sellRecords)) {
    if (record.user_id !== userId) continue;
    sells.push({
      id: str(record.order_id) || `sell_${sells.length}`,
      symbol: str(record.symbol),
      tradedAt: str(record.ts),
      planMatch: typeof record.plan_match === "boolean" ? record.plan_match : null,
    });
  }

  const tabViews: ProfileTabView[] = [];
  for (const event of asRecords(state.events)) {
    if (event.user_id !== userId) continue;
    const tab = TAB_BY_EVENT[str(event.event)];
    if (!tab) continue;
    tabViews.push({ tab, symbol: str(event.symbol), viewedAt: str(event.ts), dwellMs: num(event.dwell_ms) });
  }

  const accounts = isRecord(state.acc) ? state.acc : {};
  const accountState = isRecord(accounts[account]) ? (accounts[account] as Record<string, unknown>) : {};
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
        confidence: trade.confidence ?? null,
        tradedAt: trade.tradedAt,
      });
    } else {
      sells.push({ id: trade.id, symbol: trade.symbol, tradedAt: trade.tradedAt, planMatch: null });
    }
  }
  return { buys, sells };
}
