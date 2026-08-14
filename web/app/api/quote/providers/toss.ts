/**
 * 토스 REST 어댑터.
 *
 * [사실] 이 저장소에 토스 시세 API 규격 문서는 없다. 아래 경로·필드 이름은 **[가정]**이며
 *   OAuth2 client_credentials 로 토큰을 받고 REST 로 현재가·캔들을 읽는 흔한 모양을 따랐다.
 * [추론] 실제 규격이 다르면 고칠 곳은 이 파일의 `endpoint()` 와 `FIELDS` 두 군데다.
 *   응답 필드는 후보 목록으로 훑으므로 이름이 조금 달라도 대개 맞는다. 경로가 다르면
 *   코드를 고치지 않고 `.env` 의 `TOSS_*_PATH` 로 덮어쓸 수 있다.
 *
 * 규격이 확정되기 전에도 안전한 이유는 오케스트레이터의 폴백 사다리다. 이 어댑터가
 * 던지면 `QUOTE_PROVIDER_FALLBACK` 제공자로 넘어가고, 그것도 없으면 보관 캔들·픽스처로
 * 내려간다. 화면이 비는 경우는 없다.
 */

import { loadDevelopmentEnvironment } from "../../dev-env";
import { chartRetentionCutoff } from "../stock-candles";
import {
  createRequestQueue,
  filledCredential,
  first,
  findRows,
  numeric,
  toChartPoints,
} from "./shared";
import type { ChartPeriod, ChartPoint, LiveQuote, QuoteProvider } from "./types";

/**
 * 요청 간격. 토스로 바꾸는 목적이 곧 이 값이다.
 *
 * 키움의 2.6초를 그대로 물려주면 어댑터만 갈아끼우고 속도는 그대로다. 실제 한도를
 * 확인하기 전까지는 초당 5건으로 보수적으로 잡고 `.env` 로 조절한다.
 */
const DEFAULT_REQUEST_INTERVAL_MS = 200;

const DEFAULT_BASE_URL = "https://openapi.tossinvest.com";
const DEFAULT_TOKEN_PATH = "/oauth2/token";
const DEFAULT_QUOTE_PATH = "/v1/quotes/{symbol}";
const DEFAULT_CANDLE_PATH = "/v1/candles/{symbol}";

/** 분봉·일봉·주봉을 가리키는 질의값. [가정] */
const INTERVALS: Record<ChartPeriod, string> = {
  minute: "1m",
  daily: "1d",
  weekly: "1w",
};

const FIELDS = {
  time: ["timestamp", "datetime", "dt", "date", "candleTime", "baseDate"],
  minuteTime: ["timestamp", "datetime", "dt", "time", "candleTime"],
  open: ["open", "openPrice", "o"],
  high: ["high", "highPrice", "h"],
  low: ["low", "lowPrice", "l"],
  close: ["close", "closePrice", "price", "last", "c"],
  volume: ["volume", "accumulatedVolume", "v"],
};

let accessToken = "";
let tokenExpiresAt = 0;

function environment(name: string, fallback: string) {
  loadDevelopmentEnvironment();
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function requestIntervalMs() {
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

function endpoint(name: "token" | "quote" | "candle", symbol = "") {
  const base = environment("TOSS_BASE_URL", DEFAULT_BASE_URL).replace(/\/$/u, "");
  const path =
    name === "token"
      ? environment("TOSS_TOKEN_PATH", DEFAULT_TOKEN_PATH)
      : name === "quote"
        ? environment("TOSS_QUOTE_PATH", DEFAULT_QUOTE_PATH)
        : environment("TOSS_CANDLE_PATH", DEFAULT_CANDLE_PATH);
  return `${base}${path.replaceAll("{symbol}", encodeURIComponent(symbol))}`;
}

function hasCredentials() {
  loadDevelopmentEnvironment();
  return (
    filledCredential(process.env.TOSS_CLIENT_ID) &&
    filledCredential(process.env.TOSS_CLIENT_SECRET)
  );
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const response = await fetch(endpoint("token"), {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.TOSS_CLIENT_ID,
      client_secret: process.env.TOSS_CLIENT_SECRET,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(first(data, ["message", "error_description", "error"]) ?? `Toss HTTP ${response.status}`));
  }
  const token = first(data, ["access_token", "accessToken", "token"]);
  if (!token) throw new Error("토스 토큰 응답에 access_token 이 없습니다.");
  accessToken = String(token);
  // 만료를 모르면 1시간으로 본다. 짧게 잡아 다시 받는 편이 401 을 맞는 것보다 싸다.
  const lifetimeSeconds = numeric(first(data, ["expires_in", "expiresIn"])) ?? 3600;
  tokenExpiresAt = Date.now() + Math.max(60, lifetimeSeconds - 60) * 1000;
  return accessToken;
}

async function get(url: string) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${await getToken()}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(String(first(data, ["message", "error"]) ?? `Toss HTTP ${response.status}`));
  }
  return data;
}

async function fetchQuote(symbol: string, background = false): Promise<LiveQuote> {
  const data = await enqueue(() => get(endpoint("quote", symbol)), background);
  // 현재가가 `{ result: {...} }` 처럼 한 겹 싸여 오는 경우를 같이 받는다.
  const body = (first(data, ["result", "data", "quote"]) ?? data) as Record<string, unknown>;
  const price = numeric(first(body, ["price", "close", "last", "currentPrice", "tradePrice"]), true);
  if (!price) throw new Error("현재가가 없습니다.");
  const change = numeric(first(body, ["change", "changePrice", "prevDayChange"])) ?? 0;
  const rate =
    numeric(first(body, ["changeRate", "rate", "fluctuationRate"])) ??
    (price - change ? (change / (price - change)) * 100 : 0);
  // 등락률이 0.0123 처럼 비율로 오는 제공자가 있다. 퍼센트 축으로 맞춘다.
  return { price, change, rate: Math.abs(rate) < 1 && change ? rate * 100 : rate };
}

async function fetchChart(
  symbol: string,
  period: ChartPeriod,
  stopAtTimestamp?: number,
  background = false,
): Promise<ChartPoint[]> {
  const cutoffTimestamp = Math.max(chartRetentionCutoff(period), stopAtTimestamp ?? 0);
  const url = new URL(endpoint("candle", symbol));
  url.searchParams.set("interval", INTERVALS[period]);
  url.searchParams.set("from", new Date(cutoffTimestamp * 1000).toISOString());
  url.searchParams.set("count", "1000");

  const data = await enqueue(() => get(url.toString()), background);
  const points = toChartPoints(findRows(data), period, cutoffTimestamp, FIELDS);
  if (!points.length) throw new Error("차트 데이터가 없습니다.");
  return points;
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
      /** 캔들을 한 번에 1000개까지 받으므로 페이지를 나눌 이유가 없다. */
      minuteMaxPages: 1,
      /** 대기가 짧아 낡은 분봉을 오래 붙들 이유가 없다. 메모리 캐시 수명과 맞춘다. */
      minuteStaleMs: 5 * 60 * 1000,
    };
  },
  hasCredentials,
  fetchQuote,
  fetchChart,
};
