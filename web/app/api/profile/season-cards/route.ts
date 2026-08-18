import type { NextRequest } from "next/server";
import {
  computeBehaviorProfile,
  kstDateOf,
  VALID_DWELL_MS,
} from "../../../../shared/engine/behavior-profile";
import type {
  DailyClose,
  EvidenceTab,
  ProfileBuy,
  ProfileHolding,
  ProfileSell,
  ProfileTabView,
} from "../../../../shared/types/behavior-profile";
import { computePortfolioReturn } from "../../../../shared/engine/portfolio-return";
import { selectFilledTrades, selectRows, sessionUserId } from "../../supabase";
import { readDailyCloses } from "../../quote/stock-candles";
import { getSeasonCardsCached } from "./cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_BALANCE = 10_000_000;

type TransactionRow = {
  user_id: number;
  id: string;
  stock_id: number;
  side: "buy" | "sell";
  trade_price: number | string;
  trade_quantity: number | string;
  trade_reason: string | null;
  plan_match: boolean | null;
  created_at: string;
};
type StockRow = { stock_id: number; stock_code: string; category: string | null };
type HoldingRow = { user_id: number; stock_id: number; quantity: number | string; avg_price: number | string };
type AccountRow = { user_id: number; balance: number | string };
type TabViewRow = { user_id: number; stock_id: number; tab_count: number; created_at: string };

/** 한 사람의 성향 입력 원본. `loadProfileRows` 가 구성원 전체분을 한 번에 읽어 나눈다. */
export type ProfileRows = {
  transactions: TransactionRow[];
  holdings: HoldingRow[];
  balance: number | null;
  tabViews: TabViewRow[];
};

const emptyRows = (): ProfileRows => ({
  transactions: [],
  holdings: [],
  balance: null,
  tabViews: [],
});

const asNumber = (value: number | string) => Number(value) || 0;
const byTime = (a: { at: number }, b: { at: number }) => a.at - b.at;

/**
 * 화면은 `flushTabViews` 를 **매수할 때만** 부른다. 그래서 `stock_tab_views` 한 행은
 * "이 매수 직전에 10초 넘게 본 방문 N번"을 뜻한다. 행 자체에는 어느 탭인지·언제 봤는지가
 * 없으므로, 그 뜻을 엔진 입력 형태로 되살린다 **[가정]**:
 *
 * - 행을 시간순으로 매수에 짝지운다. 체결과 flush 가 거의 동시라 여유를 조금 둔다.
 * - `tab_count` 만큼(최대 3) 서로 다른 탭을 매수 직전 시각으로 만든다.
 *   엔진은 **종류 수**만 보므로 라벨이 무엇인지는 결과를 바꾸지 않는다.
 * - 체류 시간은 서버가 이미 10초 이상을 검산해 저장한 것이라 기준값을 그대로 넣는다.
 *
 * 한계: 같은 탭을 세 번 본 것과 세 탭을 한 번씩 본 것을 구분하지 못한다.
 * 구분하려면 `stock_tab_views` 에 탭 종류 컬럼이 필요하다 (SPEC §6.8).
 */
export const TAB_FLUSH_TOLERANCE_MS = 60_000;
const TAB_ORDER: EvidenceTab[] = ["news", "info", "chart"];

export function synthesizeTabViews(
  buys: ProfileBuy[],
  rowsBySymbol: Map<string, { at: number; count: number }[]>,
): ProfileTabView[] {
  const views: ProfileTabView[] = [];
  for (const [symbol, rows] of rowsBySymbol) {
    const symbolBuys = buys
      .filter((buy) => buy.symbol === symbol)
      .map((buy) => ({ buy, at: Date.parse(buy.tradedAt) }))
      .sort(byTime);
    const sorted = [...rows].sort(byTime);
    let cursor = 0;
    for (const { buy, at } of symbolBuys) {
      let counted = 0;
      while (cursor < sorted.length && sorted[cursor].at <= at + TAB_FLUSH_TOLERANCE_MS) {
        counted += sorted[cursor].count;
        cursor += 1;
      }
      const viewedAt = new Date(at - 1000).toISOString();
      for (const tab of TAB_ORDER.slice(0, Math.min(counted, TAB_ORDER.length))) {
        views.push({ tab, symbol, viewedAt, dwellMs: VALID_DWELL_MS });
      }
    }
  }
  return views;
}

export type SeasonCardsDeps = {
  now(): Date;
  loadStocks(): Promise<StockRow[]>;
  loadProfileRows(userIds: number[]): Promise<Map<number, ProfileRows>>;
  loadDailyCloses(symbols: string[], cutoff: number): Promise<Map<string, DailyClose[]>>;
};

/**
 * 51종 유니버스는 시즌 내내 그대로다. 구성원마다·요청마다 전체를 다시 읽을 이유가 없다 —
 * `/api/family` 한 번에 이 표만 다섯 번 나가고 있었다. 종가 배치가 종목코드를 id 로 바꿀
 * 때도 같은 표를 보므로, 캐시가 있으면 그 왕복 하나가 통째로 사라진다.
 */
export const STOCKS_TTL_MS = 60_000;
let stocksCache: { at: number; rows: StockRow[] } | null = null;

const defaultDeps: SeasonCardsDeps = {
  now: () => new Date(),
  async loadStocks() {
    if (!stocksCache || Date.now() - stocksCache.at > STOCKS_TTL_MS) {
      stocksCache = {
        at: Date.now(),
        rows: await selectRows<StockRow>("stocks", { select: "stock_id,stock_code,category" }),
      };
    }
    return stocksCache.rows;
  },
  /**
   * 구성원 전체의 입력을 **표마다 한 쿼리**로 읽는다 (`user_id=in.(…)`).
   *
   * 사람마다 따로 읽으면 네 표 × 인원 수 만큼 왕복이 생긴다. 4인 가족이면 16번이고,
   * 그만큼 동시 요청이 몰려 한 요청당 지연까지 함께 늘었다.
   */
  async loadProfileRows(userIds) {
    const scope = `in.(${userIds.join(",")})`;
    const [transactions, holdings, accounts, tabViews] = await Promise.all([
      selectFilledTrades<TransactionRow>({
        select: "user_id,id,stock_id,side,trade_price,trade_quantity,trade_reason,plan_match,created_at",
        user_id: scope,
        order: "created_at.asc",
      }),
      selectRows<HoldingRow>("holdings", {
        select: "user_id,stock_id,quantity,avg_price",
        user_id: scope,
      }),
      selectRows<AccountRow>("account", { select: "user_id,balance", user_id: scope }),
      selectRows<TabViewRow>("stock_tab_views", {
        select: "user_id,stock_id,tab_count,created_at",
        user_id: scope,
        order: "created_at.asc",
      }),
    ]);

    const byUser = new Map(userIds.map((id) => [id, emptyRows()]));
    for (const row of transactions) byUser.get(row.user_id)?.transactions.push(row);
    for (const row of holdings) byUser.get(row.user_id)?.holdings.push(row);
    for (const row of tabViews) byUser.get(row.user_id)?.tabViews.push(row);
    // 계좌는 한 사람에 한 행이다. 여러 행이 있어도 먼저 온 것만 쓴다 — 예전 `limit=1` 과 같다.
    for (const row of accounts) {
      const rows = byUser.get(row.user_id);
      if (rows && rows.balance === null) rows.balance = asNumber(row.balance);
    }
    return byUser;
  },
  async loadDailyCloses(symbols, cutoff) {
    const bySymbol = await readDailyCloses(symbols, cutoff);
    return new Map(
      symbols.map((symbol) => [
        symbol,
        (bySymbol.get(symbol) ?? []).map((point) => ({
          date: kstDateOf(new Date(point.time * 1000).toISOString()),
          close: point.close,
        })),
      ]),
    );
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 종가를 언제부터 읽을지. **첫 거래 열흘 전**이다.
 *
 * 예전에는 보관 구간 전체(1년)를 종목마다 통째로 받아 종목당 250행 가까이 읽고 수십 행만
 * 썼다. 엔진이 실제로 보는 구간은 첫 거래일부터다 — 채점(`settlementAfter`)은 체결일
 * **뒤** 종가만, 매도가 대체(`closeOnOrBefore`)는 체결일 당일이나 **직전** 거래일만 본다.
 * 연휴로 직전 거래일이 멀 수 있어 앞으로 열흘을 더 준다.
 */
export const CLOSE_LOOKBACK_DAYS = 10;
/** 거래가 없으면 현재가만 쓴다. 한 달이면 마지막 종가가 반드시 한 개는 들어온다. */
export const CLOSE_MIN_WINDOW_DAYS = 30;

export function closesCutoff(tradedAt: string[], now: Date) {
  const earliest = tradedAt.reduce((min, at) => {
    const time = Date.parse(at);
    return Number.isFinite(time) && time < min ? time : min;
  }, now.getTime());
  return Math.floor(
    Math.min(
      earliest - CLOSE_LOOKBACK_DAYS * DAY_MS,
      now.getTime() - CLOSE_MIN_WINDOW_DAYS * DAY_MS,
    ) / 1000,
  );
}

/**
 * 한 사람의 원본 행을 엔진 입력으로 옮긴다. Supabase 조회는 하지 않는다 —
 * 구성원 여러 명을 한 번에 계산하려면 읽기와 계산이 갈라져 있어야 한다.
 */
function toEngineInput(rows: ProfileRows, stocks: StockRow[]) {
  const stockById = new Map(stocks.map((row) => [row.stock_id, row]));
  const codeOf = (stockId: number) => stockById.get(stockId)?.stock_code ?? String(stockId);
  const sectorBySymbol: Record<string, string> = {};
  for (const row of stocks) {
    if (row.category) sectorBySymbol[row.stock_code] = row.category;
  }

  const buys: ProfileBuy[] = [];
  const sells: ProfileSell[] = [];
  for (const row of rows.transactions) {
    const symbol = codeOf(row.stock_id);
    const quantity = asNumber(row.trade_quantity);
    const price = asNumber(row.trade_price);
    if (quantity <= 0) continue;
    if (row.side === "buy") {
      buys.push({
        id: row.id,
        symbol,
        price,
        quantity,
        reason: row.trade_reason,
        tradedAt: row.created_at,
      });
    } else {
      // 계획 준수 여부는 F2 SPEC §7.1 이후 `transactions.plan_match` 에 있다.
      // 그 전에 저장된 매도는 여전히 null 이고, 엔진은 null 을 판정 대상에서 뺀다.
      sells.push({
        id: row.id,
        symbol,
        quantity,
        price,
        tradedAt: row.created_at,
        planMatch: typeof row.plan_match === "boolean" ? row.plan_match : null,
      });
    }
  }

  const rowsBySymbol = new Map<string, { at: number; count: number }[]>();
  for (const row of rows.tabViews) {
    const symbol = codeOf(row.stock_id);
    const bucket = rowsBySymbol.get(symbol) ?? [];
    bucket.push({ at: Date.parse(row.created_at), count: Number(row.tab_count) || 0 });
    rowsBySymbol.set(symbol, bucket);
  }

  const holdings: ProfileHolding[] = rows.holdings
    .map((row) => ({
      symbol: codeOf(row.stock_id),
      quantity: asNumber(row.quantity),
      averagePrice: asNumber(row.avg_price),
    }))
    .filter((holding) => holding.quantity > 0);

  const symbols = Array.from(
    new Set([...buys, ...sells].map((trade) => trade.symbol).concat(holdings.map((h) => h.symbol))),
  );

  return {
    buys,
    sells,
    holdings,
    symbols,
    sectorBySymbol,
    tabViews: synthesizeTabViews(buys, rowsBySymbol),
    cash: rows.balance ?? SEED_BALANCE,
  };
}

type EngineInput = ReturnType<typeof toEngineInput>;

function composeCards(
  userId: number,
  input: EngineInput,
  closesBySymbol: Map<string, DailyClose[]>,
  now: Date,
) {
  const dailyClosesBySymbol: Record<string, DailyClose[]> = {};
  // 현재가는 보관 종가의 마지막 값을 쓴다. 없으면 엔진이 평균단가로 평가한다.
  const priceBySymbol: Record<string, number> = {};
  for (const symbol of input.symbols) {
    const closes = closesBySymbol.get(symbol) ?? [];
    dailyClosesBySymbol[symbol] = closes;
    const last = closes[closes.length - 1];
    if (last) priceBySymbol[symbol] = last.close;
  }

  const snapshot = computeBehaviorProfile({
    userId: String(userId),
    periodEnd: kstDateOf(now.toISOString()),
    buys: input.buys,
    sells: input.sells,
    tabViews: input.tabViews,
    holdings: input.holdings,
    cash: input.cash,
    priceBySymbol,
    sectorBySymbol: input.sectorBySymbol,
    dailyClosesBySymbol,
  });

  return {
    // 가족 달리기 트랙(F9 수익률 탭)이 쓰는 평가값. `/api/family` 는 이 중 비율만
    // 타인에게 넘기고 금액은 본인에게만 준다 — 자산 규모 마스킹 규칙 그대로다.
    valuation: computePortfolioReturn(input.holdings, priceBySymbol, input.cash),
    // 화면은 `card`(0~10, 신버전 그대로)를 읽는다. 호환용 0~100 배열은 없앴다.
    weeks: snapshot.weeks.map((week) => ({
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      label: week.label,
      status: week.status,
      count: week.samples.buys,
      card: week,
    })),
    cumulative: snapshot.cumulative,
  };
}

/**
 * 여러 사람의 주차 결산 카드를 **한 번의 조회 묶음으로** 만든다.
 * 산식은 로컬 경로(`POST /api/profile`)와 **같은 엔진**을 쓴다 — F9-archive SPEC §6.
 *
 * 가족 아카이브가 구성원마다 이 계산을 돌린다. 사람마다 따로 읽으면 표 네 개 × 인원 수
 * 만큼 왕복이 생기므로, 읽기는 `loadProfileRows` 한 묶음으로 모으고 종가도 구성원 전체의
 * 종목을 합쳐 한 번만 읽는다.
 */
async function buildSeasonCardsForUncached(userIds: number[], deps: SeasonCardsDeps) {
  const ids = [...new Set(userIds)];
  const [rowsByUser, stocks] = await Promise.all([deps.loadProfileRows(ids), deps.loadStocks()]);
  const now = deps.now();
  const inputs = ids.map((userId) => ({
    userId,
    input: toEngineInput(rowsByUser.get(userId) ?? emptyRows(), stocks),
  }));

  /**
   * 종가는 구성원 전체의 종목을 합쳐 한 번에 읽는다. 구간은 **가장 이른 거래** 기준이라
   * 늦게 시작한 사람에게는 앞쪽 종가가 더 붙지만, 채점은 체결일 뒤만 보고 현재가는 마지막
   * 값만 보므로 결과가 달라지지 않는다.
   */
  const symbols = [...new Set(inputs.flatMap((entry) => entry.input.symbols))];
  const tradedAt = inputs.flatMap((entry) =>
    [...entry.input.buys, ...entry.input.sells].map((trade) => trade.tradedAt),
  );
  let closesBySymbol = new Map<string, DailyClose[]>();
  if (symbols.length) {
    try {
      closesBySymbol = await deps.loadDailyCloses(symbols, closesCutoff(tradedAt, now));
    } catch {
      // 종가가 없으면 그 거래는 엔진이 판정 보류로 처리한다.
    }
  }

  return new Map(
    inputs.map(({ userId, input }) => [userId, composeCards(userId, input, closesBySymbol, now)]),
  );
}

export async function buildSeasonCardsFor(userIds: number[], deps: SeasonCardsDeps = defaultDeps) {
  const ids = [...new Set(userIds)];
  if (deps !== defaultDeps) return buildSeasonCardsForUncached(ids, deps);
  return getSeasonCardsCached(ids, () => buildSeasonCardsForUncached(ids, deps));
}

/** 로그인 사용자 한 사람의 주차 결산 카드. */
export async function buildSeasonCards(userId: number, deps: SeasonCardsDeps = defaultDeps) {
  const cards = (await buildSeasonCardsFor([userId], deps)).get(userId);
  if (!cards) throw new Error("주차 카드를 만들지 못했습니다.");
  return cards;
}

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    return Response.json(await buildSeasonCards(userId));
  } catch (error) {
    console.error(
      JSON.stringify({ event: "profile_season_cards", result: "error", message: String(error) }),
    );
    return Response.json({ error: "지난 주차 카드를 불러오지 못했습니다." }, { status: 502 });
  }
}
