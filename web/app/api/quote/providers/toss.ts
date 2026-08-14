/**
 * 토스증권 Open API 어댑터.
 *
 * 규격 출처: `https://openapi.tossinvest.com/openapi-docs/latest/openapi.json`
 * (canonical, server-owned OpenAPI 3.0 문서, 확인 시점 버전 1.2.14). 경로·파라미터·
 * 응답 필드는 이 문서를 그대로 옮긴 것이며 가정이 아니다.
 *
 * - 토큰: `POST /oauth2/token`, `application/x-www-form-urlencoded` 바디로
 *   `grant_type=client_credentials&client_id=...&client_secret=...`.
 * - 현재가: `GET /api/v1/prices?symbols=005930` → `{ result: [{ symbol, lastPrice, ... }] }`.
 *   전일 대비 등락은 이 응답에 없어서 일봉 캔들의 전일 종가로 계산한다.
 * - 캔들: `GET /api/v1/candles?symbol=005930&interval=1d|1m&count=..&before=..`
 *   → `{ result: { candles: [...], nextBefore } }`. **주봉 interval 은 없다** — 토스가
 *   지원하지 않으므로 이 어댑터는 주봉을 던지고, 오케스트레이터가 다음 제공자(키움)로 넘긴다.
 * - 에러: 4xx/5xx 는 `{ error: { requestId, code, message, data } }`.
 */

import { loadDevelopmentEnvironment } from "../../dev-env";
import { chartRetentionCutoff } from "../stock-candles";
import { createRequestQueue, filledCredential, numeric } from "./shared";
import type { ChartPeriod, ChartPoint, LiveQuote, QuoteProvider } from "./types";

const BASE_URL = "https://openapi.tossinvest.com";
/** 토스가 실제로 지원하는 봉 단위. 주봉은 없다. */
const CANDLE_INTERVAL: Partial<Record<ChartPeriod, "1m" | "1d">> = {
  minute: "1m",
  daily: "1d",
};
/** 한 페이지 최대 200개. 분봉 2일치(최대 약 780개)·일봉 1년치(약 250개)를 담으려면 페이징이 필요하다. */
const CANDLES_PER_PAGE = 200;
const MAX_PAGES = 6;

/**
 * 요청 간격. 토스로 바꾸는 목적이 곧 이 값이다.
 *
 * 키움의 2.6초를 그대로 물려주면 어댑터만 갈아끼우고 속도는 그대로다. 실제 한도를
 * 확인하기 전까지는 넉넉히 잡고 `.env` 로 조절한다.
 */
const DEFAULT_REQUEST_INTERVAL_MS = 200;

let accessToken = "";
let tokenExpiresAt = 0;

function requestIntervalMs() {
  loadDevelopmentEnvironment();
  const parsed = Number(process.env.TOSS_REQUEST_INTERVAL_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_REQUEST_INTERVAL_MS;
}

/**
 * 큐 간격은 `.env` 로 조절하는데 큐 자체는 모듈이 한 번만 만든다.
 *
 * 첫 사용 시점에 만들어야 `.env` 가 먼저 로드된다. 값을 바꾸면 서버를 다시 켜야 반영된다 —
 * 제공자 전환 자체가 재기동을 전제하므로 여기서 더 복잡하게 만들지 않는다.
 */
let queue: ReturnType<typeof createRequestQueue> | null = null;
function enqueue<T>(task: () => Promise<T>, background = false) {
  queue ??= createRequestQueue(requestIntervalMs());
  return queue(task, background);
}

function hasCredentials() {
  loadDevelopmentEnvironment();
  return (
    filledCredential(process.env.TOSS_CLIENT_ID) &&
    filledCredential(process.env.TOSS_CLIENT_SECRET)
  );
}

/** 에러 응답은 `{ error: { code, message, requestId, ... } }` 하나뿐이다. */
function errorMessage(body: unknown, status: number) {
  const error = (body as { error?: { message?: string; code?: string } } | undefined)?.error;
  return error?.message || error?.code || `Toss HTTP ${status}`;
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TOSS_CLIENT_ID ?? "",
    client_secret: process.env.TOSS_CLIENT_SECRET ?? "",
  });
  const response = await fetch(`${BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: string };
  };
  if (!response.ok || !data.access_token) {
    throw new Error(errorMessage(data, response.status));
  }
  accessToken = data.access_token;
  // 만료 30초 전에 새로 받는다. 토스는 refresh token을 주지 않아 재발급이 곧 재인증이다.
  tokenExpiresAt = Date.now() + Math.max(60, (data.expires_in ?? 3600) - 30) * 1000;
  return accessToken;
}

async function get(path: string, query: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${await getToken()}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as { result?: unknown; error?: unknown };
  if (!response.ok) throw new Error(errorMessage(data, response.status));
  return data.result;
}

type PriceRow = { symbol: string; lastPrice: string };
type CandleRow = {
  timestamp: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  volume: string;
};
type CandlePage = { candles: CandleRow[]; nextBefore: string | null };

function toChartPoint(row: CandleRow): ChartPoint {
  const close = numeric(row.closePrice, true) ?? 0;
  return {
    time: Math.floor(Date.parse(row.timestamp) / 1000),
    open: numeric(row.openPrice, true) ?? close,
    high: numeric(row.highPrice, true) ?? close,
    low: numeric(row.lowPrice, true) ?? close,
    close,
    volume: numeric(row.volume, true) ?? 0,
    price: close,
  };
}

/**
 * 현재가는 `/api/v1/prices`, 전일 대비는 일봉 캔들 두 개(오늘·전일)로 만든다.
 *
 * `/api/v1/prices` 는 `lastPrice` 만 주고 전일 대비를 주지 않는다. 두 요청을 동시에
 * 보내되 큐는 하나만 거친다 — `enqueue` 가 간격을 지키므로 순서만 앞뒤로 밀린다.
 */
async function fetchQuote(symbol: string, background = false): Promise<LiveQuote> {
  const [prices, candlePage] = await Promise.all([
    enqueue(() => get("/api/v1/prices", { symbols: symbol }), background),
    enqueue(() => get("/api/v1/candles", { symbol, interval: "1d", count: "2" }), background),
  ]);
  const price = numeric((prices as PriceRow[] | undefined)?.[0]?.lastPrice, true);
  if (!price) throw new Error("현재가가 없습니다.");

  const previousClose = (candlePage as CandlePage | undefined)?.candles
    .map(toChartPoint)
    .sort((left, right) => right.time - left.time)[1]?.close;
  const change = previousClose ? price - previousClose : 0;
  const rate = previousClose ? (change / previousClose) * 100 : 0;
  return { price, change, rate };
}

async function fetchChart(
  symbol: string,
  period: ChartPeriod,
  stopAtTimestamp?: number,
  background = false,
): Promise<ChartPoint[]> {
  const interval = CANDLE_INTERVAL[period];
  if (!interval) throw new Error("토스는 주봉을 지원하지 않습니다.");

  const cutoffTimestamp = Math.max(chartRetentionCutoff(period), stopAtTimestamp ?? 0);
  const points: ChartPoint[] = [];
  let before: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await enqueue(
      () =>
        get("/api/v1/candles", {
          symbol,
          interval,
          count: String(CANDLES_PER_PAGE),
          ...(before ? { before } : {}),
        }),
      background,
    );
    const data = result as CandlePage | undefined;
    const rows = data?.candles ?? [];
    if (!rows.length) break;
    points.push(...rows.map(toChartPoint));
    // 가장 오래된 봉이 이미 커버한 구간에 닿으면 더 받지 않는다 — 증분 조회.
    const oldest = rows.at(-1);
    if (!data?.nextBefore || (oldest && Math.floor(Date.parse(oldest.timestamp) / 1000) <= cutoffTimestamp)) {
      break;
    }
    before = data.nextBefore;
  }

  const filtered = points
    .filter((point) => point.time >= cutoffTimestamp && point.close > 0)
    .sort((left, right) => left.time - right.time)
    .filter(
      (point, index, sorted) =>
        index === sorted.length - 1 || point.time !== sorted[index + 1].time,
    );
  if (!filtered.length) throw new Error("차트 데이터가 없습니다.");
  return filtered;
}

export const tossProvider: QuoteProvider = {
  id: "toss",
  get limits() {
    return {
      requestIntervalMs: requestIntervalMs(),
      /**
       * 초당 여러 건을 보낼 수 있으므로 카드 폴링에서 한 번에 여러 종목을 데운다.
       * 51종을 5초 폴링으로 채우는 데 한 바퀴면 충분한 크기다.
       */
      refreshBatchSize: 8,
      /** 분봉 2일치가 한 페이지(200개)를 넘을 수 있어 페이지 상한을 조금 더 둔다. */
      minuteMaxPages: MAX_PAGES,
      /** 대기가 짧아 낡은 분봉을 오래 붙들 이유가 없다. 메모리 캐시 수명과 맞춘다. */
      minuteStaleMs: 5 * 60 * 1000,
    };
  },
  hasCredentials,
  fetchQuote,
  fetchChart,
};
