import { NextRequest } from "next/server";
import {
  fallbackNarration,
  generateProfileNarration,
  type ProfileNarration,
} from "../../../features/f9-archive/lib/narration";
import { STOCKS } from "../../../shared/data/stocks";
import {
  computeBehaviorProfile,
  kstDateOf,
  parsePrototypeProfileInput,
  profileEntriesFromTrades,
  type PrototypeAccount,
} from "../../../shared/engine/behavior-profile";
import { FAMILY_SEED_TAB_VIEWS, FAMILY_SEED_TRADES } from "../../../shared/store/family-trade-seed";
import type { BehaviorProfileSnapshot, DailyClose } from "../../../shared/types/behavior-profile";
import { chartRetentionCutoff, readStoredCandles } from "../quote/stock-candles";
import { getUniverseSnapshot } from "../universe/service";

export const runtime = "nodejs";

const USER_ID_BY_ACCOUNT: Record<PrototypeAccount, string> = {
  child: "child_minji",
  parent: "parent_mom",
};

const SECTOR_BY_SYMBOL: Record<string, string> = Object.fromEntries(
  STOCKS.map((stock) => [stock.symbol, stock.sector]),
);

export type ProfileRouteDeps = {
  loadPrices(): Promise<Record<string, number>>;
  loadDailyCloses(symbol: string): Promise<DailyClose[]>;
  narrate(snapshot: BehaviorProfileSnapshot): Promise<ProfileNarration>;
  /** 주간 카드의 마지막 주와 보유 스냅샷 기준일. 테스트가 고정할 수 있게 주입받는다 */
  now(): Date;
};

const defaultDeps: ProfileRouteDeps = {
  now: () => new Date(),
  async loadPrices() {
    const snapshot = await getUniverseSnapshot(null, false);
    return Object.fromEntries(
      Object.entries(snapshot.quotes).map(([symbol, quote]) => [symbol, quote.price]),
    );
  },
  async loadDailyCloses(symbol) {
    const { points } = await readStoredCandles(symbol, "daily", chartRetentionCutoff("daily"));
    return points.map((point) => ({
      date: kstDateOf(new Date(point.time * 1000).toISOString()),
      close: point.close,
    }));
  },
  narrate: generateProfileNarration,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAccount = (value: unknown): value is PrototypeAccount =>
  value === "child" || value === "parent";

export type ProfileResult =
  | { status: 400 }
  | { status: 200; payload: { snapshot: BehaviorProfileSnapshot; narration: ProfileNarration } };

export async function buildProfilePayload(
  body: unknown,
  deps: ProfileRouteDeps = defaultDeps,
): Promise<ProfileResult> {
  if (!isRecord(body) || !isAccount(body.account)) return { status: 400 };
  const account = body.account;

  // 시드(과거 2주치)와 화면이 보낸 라이브 기록을 한 표본으로 합친다.
  const live = parsePrototypeProfileInput(body.state, account);
  const seed = profileEntriesFromTrades(FAMILY_SEED_TRADES, account);
  const buys = [...seed.buys, ...live.buys];
  const sells = [...seed.sells, ...live.sells];
  const seedTabViews = FAMILY_SEED_TAB_VIEWS.filter((view) => view.member === account).map(
    ({ tab, symbol, viewedAt, dwellMs }) => ({ tab, symbol, viewedAt, dwellMs }),
  );

  // 시세 조회가 먼저다: kiwoom 모듈이 이때 루트 .env 를 프로세스에 로드하고,
  // 뒤이은 보관 종가 조회(Supabase)가 같은 env 를 쓴다. 순서를 바꾸면 첫 요청의
  // 정확력이 전부 판정 보류가 된다.
  let priceBySymbol: Record<string, number> = {};
  try {
    priceBySymbol = await deps.loadPrices();
  } catch {
    // 시세가 없으면 엔진이 평균단가로 평가한다.
  }
  const symbols = Array.from(
    new Set([...buys, ...sells].map((trade) => trade.symbol).filter(Boolean)),
  );
  const dailyClosesBySymbol: Record<string, DailyClose[]> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        dailyClosesBySymbol[symbol] = await deps.loadDailyCloses(symbol);
      } catch {
        // 종가가 없으면 해당 거래는 엔진이 판정 보류로 처리한다.
        dailyClosesBySymbol[symbol] = [];
      }
    }),
  );

  // periodStart 는 엔진이 첫 거래일로 채운다. 주간 카드는 그 주부터 오늘까지 만들어진다.
  const snapshot = computeBehaviorProfile({
    userId: USER_ID_BY_ACCOUNT[account],
    periodEnd: kstDateOf(deps.now().toISOString()),
    buys,
    sells,
    tabViews: [...seedTabViews, ...live.tabViews],
    holdings: live.holdings,
    cash: live.cash,
    priceBySymbol,
    sectorBySymbol: SECTOR_BY_SYMBOL,
    dailyClosesBySymbol,
  });

  const narration: ProfileNarration =
    body.narrate === false
      ? { text: fallbackNarration(snapshot), source: "fallback" }
      : await deps.narrate(snapshot);
  return { status: 200, payload: { snapshot, narration } };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await buildProfilePayload(body);
  if (result.status !== 200) {
    console.info(JSON.stringify({ event: "f9_profile", result: "invalid_payload" }));
    return Response.json({ error: "Invalid profile payload" }, { status: 400 });
  }
  const { snapshot, narration } = result.payload;
  console.info(
    JSON.stringify({
      event: "f9_profile",
      result: "ok",
      userId: snapshot.userId,
      observation: snapshot.cumulative.observation,
      gradedTradeCount: snapshot.cumulative.samples.graded,
      weeks: snapshot.weeks.length,
      narration: narration.source,
    }),
  );
  return Response.json(result.payload);
}
