import type { ChartPeriod, ChartPoint } from "./kiwoom";

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

type StockRow = { stock_id: number };
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

export function chartRetentionCutoff(period: ChartPeriod, now = new Date()) {
  if (period === "minute") return Math.floor((now.getTime() - 14 * 24 * 60 * 60 * 1000) / 1000);

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
