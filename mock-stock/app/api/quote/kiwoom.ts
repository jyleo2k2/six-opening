import { stockBySymbol } from "@/shared/data/stocks";
import type { Quote } from "@/shared/types";

const baseUrl = (process.env.KIWOOM_ENV ?? "real").toLowerCase() === "mock" ? "https://mockapi.kiwoom.com" : "https://api.kiwoom.com";
let accessToken = "";
let tokenExpiresAt = 0;
let queue = Promise.resolve<unknown>(undefined);
let lastRequestAt = 0;
const quoteCache = new Map<string, { value: Quote; at: number }>();
const chartCache = new Map<string, { value: { time: string; price: number }[]; at: number }>();
export type ChartPeriod = "minute" | "daily" | "weekly";

function credentialsAvailable() {
  const appKey = process.env.KIWOOM_APP_KEY;
  const secretKey = process.env.KIWOOM_SECRET_KEY;
  return Boolean(appKey && secretKey && !appKey.includes("your_") && !secretKey.includes("your_"));
}

async function post(path: string, body: object, apiId?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json;charset=UTF-8" };
  if (apiId) {
    headers.authorization = `Bearer ${await getToken()}`;
    headers["api-id"] = apiId;
  }
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  if (!response.ok || (data.return_code != null && Number(data.return_code) !== 0)) throw new Error(data.return_msg || `Kiwoom HTTP ${response.status}`);
  return data;
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
    const value: Quote = { symbol, name, price, change, rate, updatedAt: new Date().toISOString(), source: "kiwoom" };
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

function fixtureChart(period: ChartPeriod, values: number[]) {
  const selected = period === "minute" ? values.slice(-6) : period === "weekly" ? values.filter((_, index) => index % 2 === 0 || index === values.length - 1) : values;
  return selected.map((price, index) => ({ time: String(index), price }));
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
      ? { apiId: "ka10080", body: { stk_cd: symbol, tic_scope: "1", upd_stkpc_tp: "1" }, limit: 80 }
      : period === "weekly"
        ? { apiId: "ka10082", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" }, limit: 52 }
        : { apiId: "ka10081", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" }, limit: 40 };
    const data = await enqueue(() => post("/api/dostk/chart", request.body, request.apiId));
    const points = findRows(data).map((row) => ({
      time: String((period === "minute" ? first(row, ["cntr_tm", "stck_cntg_hour", "time", "dt"]) : first(row, ["dt", "stck_bsop_date", "date"])) ?? ""),
      price: numeric(first(row, ["cur_prc", "stck_prpr", "close_pric", "close"]), true) ?? 0,
    })).filter((point) => point.time && point.price).sort((a, b) => a.time.localeCompare(b.time)).slice(-request.limit);
    if (!points.length) throw new Error("차트 데이터가 없습니다.");
    chartCache.set(cacheKey, { value: points, at: Date.now() });
    return points;
  } catch {
    return fixtureChart(period, stock.chart);
  }
}
