import { stockBySymbol } from "@/shared/data/stocks";
import type { Quote } from "@/shared/types";

const baseUrl = (process.env.KIWOOM_ENV ?? "real").toLowerCase() === "mock" ? "https://mockapi.kiwoom.com" : "https://api.kiwoom.com";
let accessToken = "";
let tokenExpiresAt = 0;
let queue = Promise.resolve<unknown>(undefined);
let lastRequestAt = 0;
const quoteCache = new Map<string, { value: Quote; at: number }>();
export type ChartPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** 기존 스파크라인 소비자와의 호환용 종가 별칭. */
  price: number;
};
const chartCache = new Map<string, { value: ChartPoint[]; at: number }>();
export type ChartPeriod = "minute" | "daily" | "weekly";

function credentialsAvailable() {
  const appKey = process.env.KIWOOM_APP_KEY;
  const secretKey = process.env.KIWOOM_SECRET_KEY;
  return Boolean(appKey && secretKey && !appKey.includes("your_") && !secretKey.includes("your_"));
}

type Continuation = { contYn: string; nextKey: string };

async function requestPage(path: string, body: object, apiId?: string, continuation?: Continuation) {
  const headers: Record<string, string> = { "Content-Type": "application/json;charset=UTF-8" };
  if (apiId) {
    headers.authorization = `Bearer ${await getToken()}`;
    headers["api-id"] = apiId;
  }
  if (continuation) {
    headers["cont-yn"] = continuation.contYn;
    headers["next-key"] = continuation.nextKey;
  }
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10000) });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok || (data.return_code != null && Number(data.return_code) !== 0)) throw new Error(String(data.return_msg ?? `Kiwoom HTTP ${response.status}`));
  return {
    data,
    contYn: response.headers.get("cont-yn") ?? "N",
    nextKey: response.headers.get("next-key") ?? "",
  };
}

async function post(path: string, body: object, apiId?: string) {
  return (await requestPage(path, body, apiId)).data;
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const data = await post("/oauth2/token", { grant_type: "client_credentials", appkey: process.env.KIWOOM_APP_KEY, secretkey: process.env.KIWOOM_SECRET_KEY });
  accessToken = String(data.token);
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return accessToken;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, 1050 - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

function numeric(value: unknown, absolute = false) {
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  if (!Number.isFinite(parsed)) return null;
  return absolute ? Math.abs(parsed) : parsed;
}

function first(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (data[key] != null && data[key] !== "") return data[key];
  return null;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const stock = stockBySymbol.get(symbol);
  const name = stock?.name ?? symbol;
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.at < 900) return cached.value;
  if (!credentialsAvailable()) {
    if (stock) return { symbol, name, price: stock.price, change: stock.change, rate: stock.rate, updatedAt: new Date().toISOString(), source: "fixture" };
    throw new Error("등록되지 않은 종목입니다.");
  }
  try {
    const data = await enqueue(() => post("/api/dostk/stkinfo", { stk_cd: symbol }, "ka10001")) as Record<string, unknown>;
    const change = numeric(first(data, ["pred_pre", "change", "prdy_vrss"])) ?? stock?.change ?? 0;
    const price = numeric(first(data, ["cur_prc", "stck_prpr", "price"]), true) ?? stock?.price ?? 0;
    const rate = numeric(first(data, ["flu_rt", "change_rate", "prdy_ctrt"])) ?? (price - change ? change / (price - change) * 100 : stock?.rate ?? 0);
    if (!price) throw new Error("no price");
    const apiName = first(data, ["stk_nm", "stk_name", "hts_kor_isnm"]);
    const value: Quote = { symbol, name: stock?.name ?? (apiName ? String(apiName) : name), price, change, rate, updatedAt: new Date().toISOString(), source: "kiwoom" };
    quoteCache.set(symbol, { value, at: Date.now() });
    return value;
  } catch {
    if (stock) return { symbol, name, price: stock.price, change: stock.change, rate: stock.rate, updatedAt: new Date().toISOString(), source: "fixture" };
    throw new Error("시세를 불러오지 못했습니다.");
  }
}

function findRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (!value || typeof value !== "object") return [];
  for (const child of Object.values(value)) {
    const rows = findRows(child);
    if (rows.length) return rows;
  }
  return [];
}

function periodSeconds(period: ChartPeriod) {
  if (period === "minute") return 60;
  if (period === "weekly") return 7 * 24 * 60 * 60;
  return 24 * 60 * 60;
}

function currentBucket(period: ChartPeriod) {
  const seconds = periodSeconds(period);
  return Math.floor(Date.now() / 1000 / seconds) * seconds;
}

function fixtureChart(period: ChartPeriod, values: number[]): ChartPoint[] {
  const selected = period === "minute" ? values.slice(-6) : period === "weekly" ? values.filter((_, index) => index % 2 === 0 || index === values.length - 1) : values;
  const lastTime = currentBucket(period);
  const interval = periodSeconds(period);
  return selected.map((close, index) => {
    const open = selected[index - 1] ?? close;
    return {
      time: lastTime - (selected.length - 1 - index) * interval,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 0,
      price: close,
    };
  });
}

function koreaTimestamp(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  return Math.floor((Date.UTC(year, month - 1, day, hour, minute, second) - 9 * 60 * 60 * 1000) / 1000);
}

function chartTimestamp(value: unknown, period: ChartPeriod) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length >= 8) {
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const hour = Number(digits.slice(8, 10) || 0);
    const minute = Number(digits.slice(10, 12) || 0);
    const second = Number(digits.slice(12, 14) || 0);
    const timestamp = koreaTimestamp(year, month, day, hour, minute, second);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (period === "minute" && digits.length >= 4) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
    return chartTimestamp(`${today}${digits.padStart(6, "0")}`, period);
  }
  return null;
}

function chartRowTimestamp(row: Record<string, unknown>, period: ChartPeriod) {
  return chartTimestamp(
    period === "minute"
      ? first(row, ["cntr_tm", "stck_cntg_hour", "time", "dt"])
      : first(row, ["dt", "stck_bsop_date", "date"]),
    period,
  );
}

function chartCutoffTimestamp(period: ChartPeriod) {
  const cutoff = new Date();
  if (period === "minute") cutoff.setUTCDate(cutoff.getUTCDate() - 14);
  else if (period === "daily") cutoff.setUTCDate(cutoff.getUTCDate() - 365);
  else cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 3);
  return Math.floor(cutoff.getTime() / 1000);
}

export async function getChart(symbol: string, period: ChartPeriod) {
  const stock = stockBySymbol.get(symbol);
  if (!stock) throw new Error("등록되지 않은 종목입니다.");
  const cacheKey = `${symbol}:${period}`;
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.value;
  if (!credentialsAvailable()) return fixtureChart(period, stock.chart);
  try {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("-", "");
    const request = period === "minute"
      ? { apiId: "ka10080", body: { stk_cd: symbol, tic_scope: "1", upd_stkpc_tp: "1" } }
      : period === "weekly"
        ? { apiId: "ka10082", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" } }
        : { apiId: "ka10081", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" } };
    const rows: Record<string, unknown>[] = [];
    const seenContinuationKeys = new Set<string>();
    const cutoffTimestamp = chartCutoffTimestamp(period);
    let continuation: Continuation | undefined;
    do {
      const page = await enqueue(() => requestPage("/api/dostk/chart", request.body, request.apiId, continuation));
      const pageRows = findRows(page.data);
      rows.push(...pageRows);
      const reachedCutoff = pageRows.some((row) => {
        const timestamp = chartRowTimestamp(row, period);
        return timestamp != null && timestamp <= cutoffTimestamp;
      });
      if (reachedCutoff) break;
      if (page.contYn.toUpperCase() !== "Y" || !page.nextKey || seenContinuationKeys.has(page.nextKey)) break;
      seenContinuationKeys.add(page.nextKey);
      continuation = { contYn: "Y", nextKey: page.nextKey };
    } while (continuation);
    const points = rows.map((row) => {
      const close = numeric(first(row, ["cur_prc", "stck_prpr", "close_pric", "close"]), true) ?? 0;
      const open = numeric(first(row, ["open_pric", "open", "stck_oprc"]), true) ?? close;
      const high = numeric(first(row, ["high_pric", "high", "stck_hgpr"]), true) ?? Math.max(open, close);
      const low = numeric(first(row, ["low_pric", "low", "stck_lwpr"]), true) ?? Math.min(open, close);
      return {
        time: chartRowTimestamp(row, period),
        open,
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close,
        volume: numeric(first(row, ["trde_qty", "volume", "acml_vol"]), true) ?? 0,
        price: close,
      };
    }).filter((point): point is ChartPoint => point.time != null && point.time >= cutoffTimestamp && point.close > 0).sort((a, b) => a.time - b.time).filter((point, index, sortedRows) => index === sortedRows.length - 1 || point.time !== sortedRows[index + 1].time);
    if (!points.length) throw new Error("차트 데이터가 없습니다.");
    chartCache.set(cacheKey, { value: points, at: Date.now() });
    return points;
  } catch {
    return fixtureChart(period, stock.chart);
  }
}
