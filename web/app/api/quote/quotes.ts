/**
 * 시세 조회 오케스트레이터. 제공자 선택·캐시·폴백 사다리를 갖는다.
 *
 * 실제 API 호출은 `providers/` 의 어댑터가 하고, 여기서는 "어느 제공자를 어떤 순서로
 * 부르고, 실패하면 어디로 내려가고, 무엇을 얼마나 캐시하느냐"만 결정한다.
 */

import { loadDevelopmentEnvironment } from "../dev-env";
import { getQuoteFixture } from "./fixtures";
import { activeLimits, availableProviders, hasQuoteCredentials } from "./providers";
import type { ProviderId } from "./providers";
import type { ChartPeriod, ChartPoint, QuoteSource } from "./providers/types";
import {
  chartRetentionCutoff,
  readLatestCandles,
  readStoredCandles,
  syncStoredCandles,
} from "./stock-candles";

export type { ChartPeriod, ChartPoint } from "./providers/types";
export { hasQuoteCredentials } from "./providers";

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  rate: number;
  updatedAt: string;
  /** 실시간 값인지 대체 값인지. 어느 제공자였는지는 `provider` 를 본다. */
  source: QuoteSource;
  provider: ProviderId | null;
};

const CHART_CACHE_MS = 5 * 60 * 1000;
/**
 * 보관 캔들 재조회 최소 간격. 요청마다 큐에 넣으면 큐가 백그라운드로 가득 찬다.
 *
 * 장중에는 오늘 봉이 계속 자라므로 이 값이 곧 차트가 멈춰 보이는 시간이다.
 * 메모리 캐시(`CHART_CACHE_MS`)와 같은 5분으로 맞춰 둘 중 하나만 낡는 일이 없게 한다.
 */
const STORED_REFRESH_INTERVAL_MS = CHART_CACHE_MS;

/**
 * 캐시 키에 제공자를 넣는다.
 *
 * 넣지 않으면 폴백이 한 번 돌았을 때 남은 값이 어느 제공자 것인지 알 수 없다. 주 제공자가
 * 복구된 뒤에도 폴백이 남긴 값을 캐시 수명 내내 돌려주게 된다.
 */
type CacheEntry<T> = { value: T; at: number };
const quoteCache = new Map<string, CacheEntry<Quote>>();
const chartCache = new Map<string, CacheEntry<ChartPoint[]>>();
/** 보관 DB에서 읽은 캔들. 제공자와 무관하므로 제공자 캐시와 섞지 않는다. */
const storedChartCache = new Map<string, CacheEntry<ChartPoint[]>>();
const chartRefreshes = new Map<string, Promise<void>>();
const minuteRefreshes = new Map<string, Promise<void>>();
const storedRefreshedAt = new Map<string, number>();

function cacheKey(provider: ProviderId, symbol: string, period?: ChartPeriod) {
  return period ? `${provider}:${symbol}:${period}` : `${provider}:${symbol}`;
}

/**
 * 시도 순서대로 신선한 캐시를 찾는다.
 *
 * 주 제공자를 먼저 보므로 주 제공자가 살아 있으면 항상 그 값이 이긴다. 주 제공자가
 * 죽어 있는 동안에만 폴백이 남긴 값이 쓰이고, 복구되면 다음 성공 조회부터 다시 뒤집힌다.
 */
function freshest<T>(cache: Map<string, CacheEntry<T>>, symbol: string, period: ChartPeriod | undefined, maxAgeMs: number) {
  for (const provider of availableProviders()) {
    const entry = cache.get(cacheKey(provider.id, symbol, period));
    if (entry && Date.now() - entry.at < maxAgeMs) return entry;
  }
  return null;
}

/** 신선도와 무관하게 남아 있는 값. 조회가 전부 실패했을 때 마지막으로 붙잡는다. */
function anyCached<T>(cache: Map<string, CacheEntry<T>>, symbol: string, period?: ChartPeriod) {
  for (const provider of availableProviders()) {
    const entry = cache.get(cacheKey(provider.id, symbol, period));
    if (entry) return entry;
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
    provider: null,
  };
}

/**
 * 실시간 제공자 없이도 카드 시세를 보관 캔들의 최근 종가로 맞춘다.
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
      provider: null,
    };
  } catch {
    return null;
  }
}

/** `background`는 카드 시세 폴링처럼 아무도 기다리지 않는 호출에 쓴다. */
export async function getQuote(symbol: string, background = false): Promise<Quote> {
  loadDevelopmentEnvironment();
  const fixture = await getQuoteFixture(symbol);
  if (!fixture) throw new Error("등록되지 않은 종목입니다.");

  const cached = freshest(quoteCache, symbol, undefined, 900);
  if (cached) return cached.value;

  const providers = availableProviders();
  if (!providers.length) {
    const stored = await storedQuote(symbol, fixture);
    return stored ?? fixtureQuote(fixture);
  }

  for (const provider of providers) {
    try {
      const live = await provider.fetchQuote(symbol, background);
      const value: Quote = {
        symbol,
        name: fixture.name,
        price: live.price,
        change: live.change,
        rate: live.rate,
        updatedAt: new Date().toISOString(),
        source: "live",
        provider: provider.id,
      };
      quoteCache.set(cacheKey(provider.id, symbol), { value, at: Date.now() });
      return value;
    } catch {
      // 다음 제공자로 넘어간다. 전부 실패하면 아래 캐시·픽스처로 내려간다.
    }
  }

  return anyCached(quoteCache, symbol)?.value ?? fixtureQuote(fixture);
}

const PERIOD_STEP_SECONDS: Record<ChartPeriod, number> = {
  minute: 60,
  daily: 24 * 60 * 60,
  weekly: 7 * 24 * 60 * 60,
};

function seoulMidnight() {
  const digits = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  return Math.floor(
    (Date.UTC(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)) - 1,
      Number(digits.slice(6, 8)),
    ) -
      9 * 60 * 60 * 1000) /
      1000,
  );
}

/**
 * 픽스처 캔들. 제공자가 없거나 조회가 실패해도 데모가 죽지 않아야 한다.
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
  const lastTime = seoulMidnight();

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

/** 시도 순서대로 캔들을 받아 본다. 성공한 제공자와 값을 같이 돌려준다. */
async function fetchLiveChart(
  symbol: string,
  period: ChartPeriod,
  stopAtTimestamp?: number,
  background = false,
) {
  for (const provider of availableProviders()) {
    try {
      const points = await provider.fetchChart(symbol, period, stopAtTimestamp, background);
      return { provider: provider.id, points };
    } catch {
      // 다음 제공자로 넘어간다.
    }
  }
  return null;
}

function mergeChartPoints(...groups: ChartPoint[][]) {
  const byTime = new Map<number, ChartPoint>();
  for (const points of groups) for (const point of points) byTime.set(point.time, point);
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}

/**
 * 저장된 캔들 이후 구간만 받아 DB에 반영한다. 응답을 보낸 뒤 호출한다.
 *
 * 분봉은 보관하지 않는다 — 14일치를 매일 쌓을 이유가 없고 항상 실시간으로 받는다.
 *
 * 차트를 열 때마다 돌리면 조회 큐가 백그라운드 페이징으로 가득 차서 정작 사용자가 누른
 * 분봉이 그 뒤에 밀린다. 키별로 최소 간격을 두고, 실패해도 같은 간격만큼 쉰다.
 * 51종 전체 적재는 `web/scripts/seed-candles.ts` 배치가 맡는다.
 */
export function refreshStoredChart(symbol: string, period: Exclude<ChartPeriod, "minute">) {
  loadDevelopmentEnvironment();
  const lockKey = `${symbol}:${period}`;
  const pending = chartRefreshes.get(lockKey);
  if (pending) return pending;
  if (!hasQuoteCredentials()) return Promise.resolve();
  const refreshedAt = storedRefreshedAt.get(lockKey) ?? 0;
  if (Date.now() - refreshedAt < STORED_REFRESH_INTERVAL_MS) return Promise.resolve();
  storedRefreshedAt.set(lockKey, Date.now());

  const refresh = (async () => {
    const cutoff = chartRetentionCutoff(period);
    const stored = await readStoredCandles(symbol, period, cutoff);
    const fresh = await fetchLiveChart(symbol, period, stored.points.at(-1)?.time, true);
    if (!fresh) return;
    const points = mergeChartPoints(stored.points, fresh.points).filter(
      (point) => point.time >= cutoff,
    );
    await syncStoredCandles(stored.stockId, period, fresh.points, cutoff);
    // 방금 DB에 넣은 것과 같은 집합이므로 보관 캐시에 둔다. 제공자 캐시와 섞지 않는다.
    storedChartCache.set(lockKey, { value: points, at: Date.now() });
  })()
    .catch(() => undefined)
    .finally(() => chartRefreshes.delete(lockKey));

  chartRefreshes.set(lockKey, refresh);
  return refresh;
}

/** 분봉 캐시를 뒤에서 새로 채운다. 보관 DB가 없는 유일한 기간이라 따로 둔다. */
function refreshMinuteChart(symbol: string) {
  const lockKey = `${symbol}:minute`;
  const pending = minuteRefreshes.get(lockKey);
  if (pending) return pending;

  const refresh = fetchLiveChart(symbol, "minute", undefined, true)
    .then((fresh) => {
      if (fresh) {
        chartCache.set(cacheKey(fresh.provider, symbol, "minute"), {
          value: fresh.points,
          at: Date.now(),
        });
      }
    })
    .catch(() => undefined)
    .finally(() => minuteRefreshes.delete(lockKey));

  minuteRefreshes.set(lockKey, refresh);
  return refresh;
}

/**
 * 캔들 조회 순서: 5분 캐시 → (분봉) 낡은 캐시 → (일·주봉) 보관 DB → 제공자 → 픽스처.
 *
 * 분봉은 보관하지 않고 항상 제공자에게서 받는다. 일·주봉은 DB를 먼저 읽어 호출 수와
 * 초당 제한을 피하고, 최신 구간 반영은 `refreshStoredChart`가 응답 뒤에 처리한다.
 */
export async function getChart(symbol: string, period: ChartPeriod): Promise<ChartPoint[]> {
  // 보관 DB가 제공자보다 먼저 오므로 여기서 .env를 먼저 읽어야 한다.
  // 안 그러면 서버 기동 후 첫 요청만 Supabase 설정을 못 찾고 픽스처로 떨어진다.
  loadDevelopmentEnvironment();
  const fixture = await getQuoteFixture(symbol);
  if (!fixture) throw new Error("등록되지 않은 종목입니다.");

  const cached = freshest(chartCache, symbol, period, CHART_CACHE_MS);
  if (cached) return cached.value;

  // 분봉만 보관 DB가 없어 사용자가 조회 큐를 직접 기다린다. 최근에 본 적이 있으면
  // 낡은 값을 먼저 돌려주고 갱신은 뒤로 미룬다. 허용 한계는 제공자 대기시간에 달렸다.
  if (period === "minute") {
    const stale = freshest(chartCache, symbol, period, activeLimits().minuteStaleMs);
    if (stale) {
      if (hasQuoteCredentials()) void refreshMinuteChart(symbol);
      return stale.value;
    }
  }

  if (period !== "minute") {
    const storedKey = `${symbol}:${period}`;
    const storedCached = storedChartCache.get(storedKey);
    if (storedCached && Date.now() - storedCached.at < CHART_CACHE_MS) {
      return storedCached.value;
    }
    try {
      const stored = await readStoredCandles(symbol, period, chartRetentionCutoff(period));
      if (stored.points.length) {
        storedChartCache.set(storedKey, { value: stored.points, at: Date.now() });
        return stored.points;
      }
    } catch {
      // Supabase 미설정·일시 장애여도 아래 제공자 조회로 계속 간다.
    }
  }

  const fresh = await fetchLiveChart(symbol, period);
  if (fresh) {
    chartCache.set(cacheKey(fresh.provider, symbol, period), {
      value: fresh.points,
      at: Date.now(),
    });
    return fresh.points;
  }

  return anyCached(chartCache, symbol, period)?.value ?? fixtureChart(period, fixture.chart);
}
