import { config } from "dotenv";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getQuoteFixture } from "./fixtures";
import {
  chartRetentionCutoff,
  readLatestCandles,
  readStoredCandles,
  syncStoredCandles,
} from "./stock-candles";

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

export type ChartPoint = {
  /** 초 단위 epoch. 캔들 렌더와 보관 키가 같은 축을 쓴다. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** 스파크라인 소비자와의 호환용 종가 별칭. */
  price: number;
};

let accessToken = "";
let tokenExpiresAt = 0;
let queue = Promise.resolve<unknown>(undefined);
let lastRequestAt = 0;
let environmentLoaded = false;
const quoteCache = new Map<string, { value: Quote; at: number }>();
const chartCache = new Map<string, { value: ChartPoint[]; at: number }>();
const chartRefreshes = new Map<string, Promise<void>>();

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

/** 키움 연속조회 커서. 한 종목의 과거 캔들은 한 응답에 다 오지 않는다. */
type Continuation = { contYn: string; nextKey: string };

async function requestPage(
  pathname: string,
  body: object,
  apiId?: string,
  continuation?: Continuation,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json;charset=UTF-8",
  };
  if (apiId) {
    headers.authorization = `Bearer ${await getToken()}`;
    headers["api-id"] = apiId;
  }
  if (continuation) {
    headers["cont-yn"] = continuation.contYn;
    headers["next-key"] = continuation.nextKey;
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
  return {
    data,
    contYn: response.headers.get("cont-yn") ?? "N",
    nextKey: response.headers.get("next-key") ?? "",
  };
}

async function post(pathname: string, body: object, apiId?: string) {
  return (await requestPage(pathname, body, apiId)).data;
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

/**
 * 키움 없이도 카드 시세를 보관 캔들의 최근 종가로 맞춘다.
 *
 * universe.js 픽스처 가격은 실제 시세와 크게 다를 수 있어서, 차트만 실데이터로
 * 바꾸면 카드와 차트가 서로 다른 값을 보여준다. 같은 출처를 쓰게 한다.
 */
async function storedQuote(
  symbol: string,
  fixture: NonNullable<Awaited<ReturnType<typeof getQuoteFixture>>>,
): Promise<Quote | null> {
  try {
    const [latest, previous] = await readLatestCandles(symbol, "daily", 2);
    if (!latest?.close) return null;
    const change = previous?.close ? latest.close - previous.close : 0;
    return {
      symbol,
      name: fixture.name,
      price: latest.close,
      change,
      rate: previous?.close ? (change / previous.close) * 100 : 0,
      updatedAt: new Date(latest.time * 1000).toISOString(),
      source: "fixture",
    };
  } catch {
    return null;
  }
}

export async function getQuote(symbol: string): Promise<Quote> {
  loadDevelopmentEnvironment();
  const fixture = await getQuoteFixture(symbol);
  if (!fixture) throw new Error("등록되지 않은 종목입니다.");
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() - cached.at < 900) return cached.value;
  if (!hasKiwoomCredentials()) {
    const stored = await storedQuote(symbol, fixture);
    if (stored) {
      quoteCache.set(symbol, { value: stored, at: Date.now() });
      return stored;
    }
    return fixtureQuote(fixture);
  }

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

function koreaTimestamp(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  return Math.floor(
    (Date.UTC(year, month - 1, day, hour, minute, second) - 9 * 60 * 60 * 1000) / 1000,
  );
}

function seoulDateDigits(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");
}

/** 키움은 `20260812` 또는 `202608120931` 처럼 자릿수가 섞여 온다. */
function chartTimestamp(value: unknown, period: ChartPeriod) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length >= 8) {
    const timestamp = koreaTimestamp(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)),
      Number(digits.slice(6, 8)),
      Number(digits.slice(8, 10) || 0),
      Number(digits.slice(10, 12) || 0),
      Number(digits.slice(12, 14) || 0),
    );
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  // 분봉은 날짜 없이 시각만 오는 경우가 있다. 오늘 날짜를 붙인다.
  if (period === "minute" && digits.length >= 4) {
    return chartTimestamp(`${seoulDateDigits()}${digits.padStart(6, "0")}`, period);
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

const PERIOD_STEP_SECONDS: Record<ChartPeriod, number> = {
  minute: 60,
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
};

/**
 * 픽스처 캔들. 키움 자격증명이 없거나 조회가 실패해도 데모가 죽지 않아야 한다.
 *
 * 픽스처는 종가 배열만 갖고 있으므로 시가는 직전 종가, 고저는 두 값의 바깥으로 잡는다.
 * 실제 체결 범위가 아니라 종가 흐름을 캔들 형태로 보여주는 것이며 거래량은 넣지 않는다.
 */
function fixtureChart(period: ChartPeriod, values: number[]): ChartPoint[] {
  const closes =
    period === "minute"
      ? values.slice(-6)
      : period === "weekly"
        ? values.filter((_, index) => index % 2 === 0 || index === values.length - 1)
        : values;
  const step = PERIOD_STEP_SECONDS[period];
  const digits = seoulDateDigits();
  const lastTime = koreaTimestamp(
    Number(digits.slice(0, 4)),
    Number(digits.slice(4, 6)),
    Number(digits.slice(6, 8)),
  );

  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1];
    return {
      time: lastTime - (closes.length - 1 - index) * step,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: 0,
      price: close,
    };
  });
}

async function fetchKiwoomChart(
  symbol: string,
  period: ChartPeriod,
  stopAtTimestamp?: number,
): Promise<ChartPoint[]> {
  const date = seoulDateDigits();
  const request =
    period === "minute"
      ? { apiId: "ka10080", body: { stk_cd: symbol, tic_scope: "1", upd_stkpc_tp: "1" } }
      : period === "weekly"
        ? { apiId: "ka10082", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" } }
        : { apiId: "ka10081", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" } };

  const rows: Record<string, unknown>[] = [];
  const seenContinuationKeys = new Set<string>();
  const cutoffTimestamp = chartRetentionCutoff(period);
  let continuation: Continuation | undefined;

  do {
    const page = await enqueue(() =>
      requestPage("/api/dostk/chart", request.body, request.apiId, continuation),
    );
    const pageRows = findRows(page.data);
    rows.push(...pageRows);
    // 이미 가진 구간에 닿으면 더 받지 않는다 — 증분 조회.
    const reachedStop = pageRows.some((row) => {
      const timestamp = chartRowTimestamp(row, period);
      return timestamp != null && timestamp <= (stopAtTimestamp ?? cutoffTimestamp);
    });
    if (reachedStop) break;
    if (
      page.contYn.toUpperCase() !== "Y" ||
      !page.nextKey ||
      seenContinuationKeys.has(page.nextKey)
    ) {
      break;
    }
    seenContinuationKeys.add(page.nextKey);
    continuation = { contYn: "Y", nextKey: page.nextKey };
  } while (continuation);

  const points = rows
    .map((row) => {
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
    })
    .filter(
      (point): point is ChartPoint =>
        point.time != null && point.time >= cutoffTimestamp && point.close > 0,
    )
    .sort((left, right) => left.time - right.time)
    .filter((point, index, sorted) => index === sorted.length - 1 || point.time !== sorted[index + 1].time);

  if (!points.length) throw new Error("차트 데이터가 없습니다.");
  return points;
}

function mergeChartPoints(...groups: ChartPoint[][]) {
  const byTime = new Map<number, ChartPoint>();
  for (const points of groups) for (const point of points) byTime.set(point.time, point);
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

/**
 * 저장된 캔들 이후 구간만 키움에서 받아 DB에 반영한다. 응답을 보낸 뒤 호출한다.
 *
 * 분봉은 보관하지 않는다 — 14일치를 매일 쌓을 이유가 없고 항상 실시간으로 받는다.
 */
export function refreshStoredChart(symbol: string, period: Exclude<ChartPeriod, "minute">) {
  loadDevelopmentEnvironment();
  const cacheKey = `${symbol}:${period}`;
  const pending = chartRefreshes.get(cacheKey);
  if (pending) return pending;
  if (!hasKiwoomCredentials()) return Promise.resolve();

  const refresh = (async () => {
    const cutoff = chartRetentionCutoff(period);
    const stored = await readStoredCandles(symbol, period, cutoff);
    const fresh = await fetchKiwoomChart(symbol, period, stored.points.at(-1)?.time);
    const points = mergeChartPoints(stored.points, fresh).filter((point) => point.time >= cutoff);
    await syncStoredCandles(stored.stockId, period, fresh, cutoff);
    chartCache.set(cacheKey, { value: points, at: Date.now() });
  })()
    .catch(() => undefined)
    .finally(() => chartRefreshes.delete(cacheKey));

  chartRefreshes.set(cacheKey, refresh);
  return refresh;
}

/**
 * 캔들 조회 순서: 5분 캐시 → (일·주봉) 보관 DB → 키움 → 픽스처.
 *
 * 분봉은 보관하지 않고 항상 키움에서 받는다. 일·주봉은 DB를 먼저 읽어 키움 호출과
 * 초당 1건 제한을 피하고, 최신 구간 반영은 `refreshStoredChart`가 응답 뒤에 처리한다.
 */
export async function getChart(symbol: string, period: ChartPeriod): Promise<ChartPoint[]> {
  // 보관 DB가 키움보다 먼저 오므로 여기서 .env를 먼저 읽어야 한다.
  // 안 그러면 서버 기동 후 첫 요청만 Supabase 설정을 못 찾고 픽스처로 떨어진다.
  loadDevelopmentEnvironment();
  const fixture = await getQuoteFixture(symbol);
  if (!fixture) throw new Error("등록되지 않은 종목입니다.");
  const cacheKey = `${symbol}:${period}`;
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.value;

  if (period !== "minute") {
    try {
      const stored = await readStoredCandles(symbol, period, chartRetentionCutoff(period));
      if (stored.points.length) {
        chartCache.set(cacheKey, { value: stored.points, at: Date.now() });
        return stored.points;
      }
    } catch {
      // Supabase 미설정·일시 장애여도 아래 키움 조회로 계속 간다.
    }
  }

  if (hasKiwoomCredentials()) {
    try {
      const points = await fetchKiwoomChart(symbol, period);
      chartCache.set(cacheKey, { value: points, at: Date.now() });
      return points;
    } catch {
      // 키움 장애·장외에는 아래 픽스처로 폴백한다.
    }
  }

  return cached?.value ?? fixtureChart(period, fixture.chart);
}
