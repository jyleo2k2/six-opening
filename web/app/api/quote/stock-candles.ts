import type { ChartPeriod, ChartPoint } from "./providers/types";

type StoredPeriod = Exclude<ChartPeriod, "minute">;

type CandleRow = {
  stock_id: number;
  timeframe: StoredPeriod;
  candle_time: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
};

type StockRow = { stock_id: number; stock_code: string };
const stockIdCache = new Map<string, Promise<number>>();

function configuration() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase 서버 환경변수가 없습니다.");
  return { url: url.replace(/\/$/u, ""), key, legacyJwt: !key.startsWith("sb_secret_") };
}

async function supabaseRequest(path: string, init?: RequestInit) {
  const { url, key, legacyJwt } = configuration();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      ...(legacyJwt ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase candles HTTP ${response.status}: ${await response.text()}`);
  return response;
}

async function stockIdForSymbol(symbol: string) {
  const cached = stockIdCache.get(symbol);
  if (cached) return cached;
  const request = (async () => {
    const params = new URLSearchParams({ select: "stock_id", stock_code: `eq.${symbol}`, limit: "1" });
    const rows = await (await supabaseRequest(`stocks?${params}`)).json() as StockRow[];
    if (!rows[0]) throw new Error("Supabase에 등록되지 않은 종목입니다.");
    return rows[0].stock_id;
  })().catch((error) => {
    stockIdCache.delete(symbol);
    throw error;
  });
  stockIdCache.set(symbol, request);
  return request;
}

function toPoint(row: CandleRow): ChartPoint {
  const close = Number(row.close);
  return {
    time: Math.floor(new Date(row.candle_time).getTime() / 1000),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close,
    volume: Number(row.volume),
    price: close,
  };
}

/**
 * 분봉 조회 구간. 분봉은 보관하지 않으므로 이 값은 곧 키움에서 몇 페이지를 받느냐다.
 *
 * 14일이면 4천 봉 가까이 되고 연속조회가 다섯 번 넘게 돈다. 요청 간격이 2.6초라 그게
 * 그대로 첫 진입 대기시간이었다. 1분봉 차트가 2주치를 보여줄 이유도 없다.
 */
const MINUTE_WINDOW_DAYS = 2;

export function chartRetentionCutoff(period: ChartPeriod, now = new Date()) {
  if (period === "minute") {
    return Math.floor((now.getTime() - MINUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000) / 1000);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = value("year") - (period === "daily" ? 1 : 3);
  const month = value("month");
  const day = value("day");
  return Math.floor((Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000) / 1000);
}

export async function readStoredCandles(symbol: string, period: StoredPeriod, cutoff: number) {
  const stockId = await stockIdForSymbol(symbol);
  const params = new URLSearchParams({
    select: "stock_id,timeframe,candle_time,open,high,low,close,volume",
    stock_id: `eq.${stockId}`,
    timeframe: `eq.${period}`,
    candle_time: `gte.${new Date(cutoff * 1000).toISOString()}`,
    order: "candle_time.asc",
    limit: "1000",
  });
  const rows = await (await supabaseRequest(`stock_candles?${params}`)).json() as CandleRow[];
  return { stockId, points: rows.map(toPoint) };
}

export type DailyClosePoint = { time: number; close: number };

/**
 * 종가만 필요한 곳(성향 채점·평가금액)이 쓰는 배치 조회.
 *
 * 아카이브 한 번 진입에 `buildSeasonCards` 가 **가족 인원 + 1** 번 돈다. 종목마다 따로
 * 읽으면 (인원+1) × 종목 수 만큼 Supabase 왕복이 생기고 그게 그대로 첫 화면 대기시간이다.
 * 여기서 두 가지를 막는다 — 종목을 한 쿼리로 묶고, 같은 종목을 동시에 찾는 호출은 그
 * 요청 하나에 태운다.
 */
const closesCache = new Map<string, { at: number; cutoff: number; points: DailyClosePoint[] }>();
const closesInFlight = new Map<string, Promise<DailyClosePoint[]>>();

/**
 * 일봉 종가는 하루 한 번 확정된다. 한 진입 안의 중복 조회와 곧바로 되돌아오는 재진입만
 * 막으면 되므로 짧게 잡는다 — 길게 잡아 평가금액이 묵을 이유가 없다.
 */
export const DAILY_CLOSE_TTL_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchDailyCloses(symbols: string[], cutoff: number) {
  const empty = new Map(symbols.map((symbol) => [symbol, [] as DailyClosePoint[]]));
  const codeParams = new URLSearchParams({
    select: "stock_id,stock_code",
    stock_code: `in.(${symbols.join(",")})`,
    limit: String(symbols.length),
  });
  const codeRows = await (await supabaseRequest(`stocks?${codeParams}`)).json() as StockRow[];
  if (!codeRows.length) return empty;

  const symbolById = new Map(codeRows.map((row) => [row.stock_id, row.stock_code]));
  const since = new Date(cutoff * 1000);
  /**
   * 한 종목의 하루 일봉은 최대 하나라 **종목 수 × 달력 일수**가 행 수의 정확한 상한이다.
   * 넉넉한 어림수를 넣고 마는 대신 상한을 그대로 넣어 응답이 잘릴 여지를 없앤다 —
   * `candle_time.asc` 로 잘리면 최신 종가부터 사라져 평가금액이 조용히 어긋난다.
   */
  const days = Math.ceil((Date.now() - since.getTime()) / DAY_MS) + 2;
  const candleParams = new URLSearchParams({
    select: "stock_id,candle_time,close",
    stock_id: `in.(${[...symbolById.keys()].join(",")})`,
    timeframe: "eq.daily",
    candle_time: `gte.${since.toISOString()}`,
    order: "candle_time.asc",
    limit: String(symbolById.size * Math.max(days, 1)),
  });
  const rows = await (await supabaseRequest(`stock_candles?${candleParams}`)).json() as CandleRow[];

  const bySymbol = new Map(empty);
  for (const row of rows) {
    const symbol = symbolById.get(row.stock_id);
    if (!symbol) continue;
    const close = Number(row.close);
    if (!Number.isFinite(close)) continue;
    bySymbol.get(symbol)?.push({ time: Math.floor(new Date(row.candle_time).getTime() / 1000), close });
  }
  return bySymbol;
}

/**
 * `cutoff` 이후의 일봉 종가를 종목별로 준다. 한 종목이라도 못 읽으면 그 종목만 빈 배열이다.
 *
 * 캐시가 요청보다 **더 이른** 구간을 들고 있으면 그대로 준다. 앞쪽에 종가가 더 붙어도
 * 쓰는 쪽이 달라지지 않는다 — 채점은 체결일 뒤만 보고, 현재가는 마지막 값만 본다.
 */
export async function readDailyCloses(symbols: string[], cutoff: number) {
  const now = Date.now();
  const pending = new Map<string, Promise<DailyClosePoint[]>>();
  const missing: string[] = [];

  for (const symbol of new Set(symbols)) {
    const cached = closesCache.get(symbol);
    if (cached && cached.cutoff <= cutoff && now - cached.at < DAILY_CLOSE_TTL_MS) {
      pending.set(symbol, Promise.resolve(cached.points));
      continue;
    }
    const inFlight = closesInFlight.get(symbol);
    if (inFlight) {
      pending.set(symbol, inFlight);
      continue;
    }
    missing.push(symbol);
  }

  if (missing.length) {
    const batch = fetchDailyCloses(missing, cutoff);
    for (const symbol of missing) {
      const one = batch
        .then((bySymbol) => {
          const points = bySymbol.get(symbol) ?? [];
          closesCache.set(symbol, { at: Date.now(), cutoff, points });
          return points;
        })
        // 한 번의 조회 실패로 성향 카드 전체를 막지 않는다. 종가가 없는 종목은 엔진이
        // 판정 보류로 처리한다 — 캐시에 남기지 않으므로 다음 요청이 다시 시도한다.
        .catch(() => [] as DailyClosePoint[])
        .finally(() => {
          closesInFlight.delete(symbol);
        });
      closesInFlight.set(symbol, one);
      pending.set(symbol, one);
    }
  }

  const entries = await Promise.all(
    [...pending].map(async ([symbol, points]) => [symbol, await points] as const),
  );
  return new Map(entries);
}

/**
 * 51종의 최근 종가와 직전 종가를 한 번에 읽는다.
 *
 * 종목별로 따로 조회하면 카드 51장이 채워지는 데 요청이 51번 필요하다. 최근 열흘치
 * 일봉만 통째로 받아 JS에서 종목별 마지막 두 개를 고른다 (51종 × 약 7행).
 */
export async function readLatestDailyCloses(days = 10) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const codeParams = new URLSearchParams({ select: "stock_id,stock_code", limit: "1000" });
  const candleParams = new URLSearchParams({
    select: "stock_id,candle_time,close",
    timeframe: "eq.daily",
    candle_time: `gte.${since}`,
    order: "candle_time.asc",
    limit: "2000",
  });

  const [codeRows, candleRows] = await Promise.all([
    supabaseRequest(`stocks?${codeParams}`).then((response) => response.json() as Promise<StockRow[]>),
    supabaseRequest(`stock_candles?${candleParams}`).then((response) => response.json() as Promise<CandleRow[]>),
  ]);

  const symbolById = new Map(codeRows.map((row) => [row.stock_id, row.stock_code]));
  const byStock = new Map<number, { close: number; previousClose: number; time: number }>();
  for (const row of candleRows) {
    const close = Number(row.close);
    if (!Number.isFinite(close) || close <= 0) continue;
    const seen = byStock.get(row.stock_id);
    byStock.set(row.stock_id, {
      close,
      previousClose: seen?.close ?? close,
      time: Math.floor(new Date(row.candle_time).getTime() / 1000),
    });
  }

  return new Map(
    Array.from(byStock, ([stockId, value]) => [symbolById.get(stockId) ?? "", value] as const).filter(
      ([symbol]) => symbol,
    ),
  );
}

/** 현재가 폴백용. 키움 자격증명이 없을 때 카드 시세를 보관 캔들의 종가로 맞춘다. */
export async function readLatestCandles(symbol: string, period: StoredPeriod, limit: number) {
  const stockId = await stockIdForSymbol(symbol);
  const params = new URLSearchParams({
    select: "stock_id,timeframe,candle_time,open,high,low,close,volume",
    stock_id: `eq.${stockId}`,
    timeframe: `eq.${period}`,
    order: "candle_time.desc",
    limit: String(limit),
  });
  const rows = await (await supabaseRequest(`stock_candles?${params}`)).json() as CandleRow[];
  return rows.map(toPoint);
}

export async function syncStoredCandles(stockId: number, period: StoredPeriod, points: ChartPoint[], cutoff: number) {
  if (points.length) {
    const rows = points.map((point) => ({
      stock_id: stockId,
      timeframe: period,
      candle_time: new Date(point.time * 1000).toISOString(),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
    const params = new URLSearchParams({ on_conflict: "stock_id,timeframe,candle_time" });
    await supabaseRequest(`stock_candles?${params}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }

  const deleteParams = new URLSearchParams({
    stock_id: `eq.${stockId}`,
    timeframe: `eq.${period}`,
    candle_time: `lt.${new Date(cutoff * 1000).toISOString()}`,
  });
  await supabaseRequest(`stock_candles?${deleteParams}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
