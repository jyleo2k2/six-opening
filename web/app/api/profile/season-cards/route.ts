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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_BALANCE = 10_000_000;

type TransactionRow = {
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
type HoldingRow = { stock_id: number; quantity: number | string; avg_price: number | string };
type AccountRow = { balance: number | string };
type TabViewRow = { stock_id: number; tab_count: number; created_at: string };

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
  loadDailyCloses(symbols: string[], cutoff: number): Promise<Map<string, DailyClose[]>>;
};

const defaultDeps: SeasonCardsDeps = {
  now: () => new Date(),
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
 * 로그인 사용자의 Supabase 기록으로 주차 결산 카드를 만든다.
 * 산식은 로컬 경로(`POST /api/profile`)와 **같은 엔진**을 쓴다 — F9-archive SPEC §6.
 * 지난 주 정확도 실제로 채점된다(구현 전에는 기본값이었다).
 */
export async function buildSeasonCards(userId: number, deps: SeasonCardsDeps = defaultDeps) {
  const [transactions, stocks, holdingRows, accounts, tabViewRows] = await Promise.all([
    selectFilledTrades<TransactionRow>({
      select: "id,stock_id,side,trade_price,trade_quantity,trade_reason,plan_match,created_at",
      user_id: `eq.${userId}`,
      order: "created_at.asc",
    }),
    selectRows<StockRow>("stocks", { select: "stock_id,stock_code,category" }),
    selectRows<HoldingRow>("holdings", {
      select: "stock_id,quantity,avg_price",
      user_id: `eq.${userId}`,
    }),
    selectRows<AccountRow>("account", { select: "balance", user_id: `eq.${userId}`, limit: "1" }),
    selectRows<TabViewRow>("stock_tab_views", {
      select: "stock_id,tab_count,created_at",
      user_id: `eq.${userId}`,
      order: "created_at.asc",
    }),
  ]);

  const stockById = new Map(stocks.map((row) => [row.stock_id, row]));
  const codeOf = (stockId: number) => stockById.get(stockId)?.stock_code ?? String(stockId);
  const sectorBySymbol: Record<string, string> = {};
  for (const row of stocks) {
    if (row.category) sectorBySymbol[row.stock_code] = row.category;
  }

  const buys: ProfileBuy[] = [];
  const sells: ProfileSell[] = [];
  for (const row of transactions) {
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
  for (const row of tabViewRows) {
    const symbol = codeOf(row.stock_id);
    const bucket = rowsBySymbol.get(symbol) ?? [];
    bucket.push({ at: Date.parse(row.created_at), count: Number(row.tab_count) || 0 });
    rowsBySymbol.set(symbol, bucket);
  }

  const holdings: ProfileHolding[] = holdingRows
    .map((row) => ({
      symbol: codeOf(row.stock_id),
      quantity: asNumber(row.quantity),
      averagePrice: asNumber(row.avg_price),
    }))
    .filter((holding) => holding.quantity > 0);

  const symbols = Array.from(
    new Set([...buys, ...sells].map((trade) => trade.symbol).concat(holdings.map((h) => h.symbol))),
  );
  const now = deps.now();
  const dailyClosesBySymbol: Record<string, DailyClose[]> = Object.fromEntries(
    symbols.map((symbol) => [symbol, [] as DailyClose[]]),
  );
  if (symbols.length) {
    try {
      const cutoff = closesCutoff([...buys, ...sells].map((trade) => trade.tradedAt), now);
      for (const [symbol, closes] of await deps.loadDailyCloses(symbols, cutoff)) {
        dailyClosesBySymbol[symbol] = closes;
      }
    } catch {
      // 종가가 없으면 그 거래는 엔진이 판정 보류로 처리한다.
    }
  }
  // 현재가는 보관 종가의 마지막 값을 쓴다. 없으면 엔진이 평균단가로 평가한다.
  const priceBySymbol: Record<string, number> = {};
  for (const [symbol, closes] of Object.entries(dailyClosesBySymbol)) {
    const last = closes[closes.length - 1];
    if (last) priceBySymbol[symbol] = last.close;
  }

  const cash = accounts[0] ? asNumber(accounts[0].balance) : SEED_BALANCE;
  const snapshot = computeBehaviorProfile({
    userId: String(userId),
    periodEnd: kstDateOf(now.toISOString()),
    buys,
    sells,
    tabViews: synthesizeTabViews(buys, rowsBySymbol),
    holdings,
    cash,
    priceBySymbol,
    sectorBySymbol,
    dailyClosesBySymbol,
  });

  return {
    // 가족 달리기 트랙(F9 수익률 탭)이 쓰는 평가값. `/api/family` 는 이 중 비율만
    // 타인에게 넘기고 금액은 본인에게만 준다 — 자산 규모 마스킹 규칙 그대로다.
    valuation: computePortfolioReturn(holdings, priceBySymbol, cash),
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

const inFlightByUser = new Map<number, Promise<Awaited<ReturnType<typeof buildSeasonCards>>>>();

/**
 * 같은 사용자의 주차 카드를 **동시에 두 번 계산하지 않는다.**
 *
 * 아카이브는 진입할 때 `GET /api/profile/season-cards` 와 `GET /api/family` 를 함께 부르고,
 * `/api/family` 는 구성원마다 다시 `buildSeasonCards` 를 돈다 — 본인 몫이 늘 두 번 계산됐다.
 *
 * **묵은 값을 주는 캐시가 아니다.** 아직 끝나지 않은 계산에만 올라타고 끝나면 바로 버린다.
 * 다음 요청은 처음부터 다시 계산하므로 방금 한 거래가 빠지는 일이 없다.
 */
export function buildSeasonCardsShared(userId: number) {
  const running = inFlightByUser.get(userId);
  if (running) return running;
  const started = buildSeasonCards(userId).finally(() => {
    inFlightByUser.delete(userId);
  });
  inFlightByUser.set(userId, started);
  return started;
}

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    return Response.json(await buildSeasonCardsShared(userId));
  } catch (error) {
    console.error(
      JSON.stringify({ event: "profile_season_cards", result: "error", message: String(error) }),
    );
    return Response.json({ error: "지난 주차 카드를 불러오지 못했습니다." }, { status: 502 });
  }
}
