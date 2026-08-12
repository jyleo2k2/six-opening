import { config } from "dotenv";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getQuoteFixture } from "./fixtures";

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  rate: number;
  updatedAt: string;
  source: "kiwoom" | "fixture";
};

export type ChartPeriod = "minute" | "daily" | "weekly";

let accessToken = "";
let tokenExpiresAt = 0;
let queue = Promise.resolve<unknown>(undefined);
let lastRequestAt = 0;
let environmentLoaded = false;
const quoteCache = new Map<string, { value: Quote; at: number }>();
const chartCache = new Map<
  string,
  { value: { time: string; price: number }[]; at: number }
>();

function resolveEnvironmentCandidates(cwd = process.cwd()) {
  const repositoryRoot = path.resolve(cwd, "..");
  const roots = [repositoryRoot];
  const gitPath = path.resolve(repositoryRoot, ".git");

  if (existsSync(gitPath) && statSync(gitPath).isFile()) {
    const gitdir = /gitdir:\s*(.+)/.exec(readFileSync(gitPath, "utf8"))?.[1]?.trim();
    if (gitdir) {
      roots.push(path.resolve(repositoryRoot, gitdir, "..", "..", ".."));
    }
  }

  return Array.from(
    new Set(
      roots.flatMap((root) => [
        path.resolve(root, ".env.kiwoom.local"),
        path.resolve(root, ".env"),
      ]),
    ),
  );
}

function loadDevelopmentEnvironment() {
  if (environmentLoaded) return;
  environmentLoaded = true;
  for (const candidate of resolveEnvironmentCandidates()) {
    if (existsSync(candidate)) config({ path: candidate, quiet: true });
  }
}

function baseUrl() {
  loadDevelopmentEnvironment();
  return (process.env.KIWOOM_ENV ?? "real").toLowerCase() === "mock"
    ? "https://mockapi.kiwoom.com"
    : "https://api.kiwoom.com";
}

export function hasKiwoomCredentials() {
  loadDevelopmentEnvironment();
  const appKey = process.env.KIWOOM_APP_KEY;
  const secretKey = process.env.KIWOOM_SECRET_KEY;
  return Boolean(
    appKey &&
      secretKey &&
      !appKey.includes("your_") &&
      !secretKey.includes("your_"),
  );
}

async function post(pathname: string, body: object, apiId?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json;charset=UTF-8",
  };
  if (apiId) {
    headers.authorization = `Bearer ${await getToken()}`;
    headers["api-id"] = apiId;
  }
  const response = await fetch(`${baseUrl()}${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (
    !response.ok ||
    (data.return_code != null && Number(data.return_code) !== 0)
  ) {
    throw new Error(String(data.return_msg ?? `Kiwoom HTTP ${response.status}`));
  }
  return data;
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const data = await post("/oauth2/token", {
    grant_type: "client_credentials",
    appkey: process.env.KIWOOM_APP_KEY,
    secretkey: process.env.KIWOOM_SECRET_KEY,
  });
  accessToken = String(data.token);
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return accessToken;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = Math.max(0, 2600 - (Date.now() - lastRequestAt));
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
  for (const key of keys) {
    if (data[key] != null && data[key] !== "") return data[key];
  }
  return null;
}

function fixtureQuote(
  fixture: NonNullable<Awaited<ReturnType<typeof getQuoteFixture>>>,
): Quote {
  return {
    symbol: fixture.symbol,
    name: fixture.name,
    price: fixture.price,
    change: fixture.change,
    rate: fixture.rate,
    updatedAt: new Date().toISOString(),
    source: "fixture",
  };
}

export async function getQuote(symbol: string): Promise<Quote> {
  const fixture = await getQuoteFixture(symbol);
  if (!fixture) throw new Error("등록되지 않은 종목입니다.");
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.at < 900) return cached.value;
  if (!hasKiwoomCredentials()) return fixtureQuote(fixture);

  try {
    const data = (await enqueue(() =>
      post("/api/dostk/stkinfo", { stk_cd: symbol }, "ka10001"),
    )) as Record<string, unknown>;
    const change =
      numeric(first(data, ["pred_pre", "change", "prdy_vrss"])) ?? fixture.change;
    const price =
      numeric(first(data, ["cur_prc", "stck_prpr", "price"]), true) ?? fixture.price;
    const rate =
      numeric(first(data, ["flu_rt", "change_rate", "prdy_ctrt"])) ??
      (price - change ? (change / (price - change)) * 100 : fixture.rate);
    if (!price) throw new Error("현재가가 없습니다.");
    const value: Quote = {
      symbol,
      name: fixture.name,
      price,
      change,
      rate,
      updatedAt: new Date().toISOString(),
      source: "kiwoom",
    };
    quoteCache.set(symbol, { value, at: Date.now() });
    return value;
  } catch {
    return cached?.value ?? fixtureQuote(fixture);
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
  const selected =
    period === "minute"
      ? values.slice(-6)
      : period === "weekly"
        ? values.filter((_, index) => index % 2 === 0 || index === values.length - 1)
        : values;
  return selected.map((price, index) => ({ time: String(index), price }));
}

export async function getChart(symbol: string, period: ChartPeriod) {
  const fixture = await getQuoteFixture(symbol);
  if (!fixture) throw new Error("등록되지 않은 종목입니다.");
  const cacheKey = `${symbol}:${period}`;
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.value;
  if (!hasKiwoomCredentials()) return fixtureChart(period, fixture.chart);

  try {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replaceAll("-", "");
    const request =
      period === "minute"
        ? {
            apiId: "ka10080",
            body: { stk_cd: symbol, tic_scope: "1", upd_stkpc_tp: "1" },
            limit: 80,
          }
        : period === "weekly"
          ? {
              apiId: "ka10082",
              body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" },
              limit: 52,
            }
          : {
              apiId: "ka10081",
              body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" },
              limit: 40,
            };
    const data = await enqueue(() =>
      post("/api/dostk/chart", request.body, request.apiId),
    );
    const points = findRows(data)
      .map((row) => ({
        time: String(
          (period === "minute"
            ? first(row, ["cntr_tm", "stck_cntg_hour", "time", "dt"])
            : first(row, ["dt", "stck_bsop_date", "date"])) ?? "",
        ),
        price:
          numeric(
            first(row, ["cur_prc", "stck_prpr", "close_pric", "close"]),
            true,
          ) ?? 0,
      }))
      .filter((point) => point.time && point.price)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-request.limit);
    if (!points.length) throw new Error("차트 데이터가 없습니다.");
    chartCache.set(cacheKey, { value: points, at: Date.now() });
    return points;
  } catch {
    return cached?.value ?? fixtureChart(period, fixture.chart);
  }
}
