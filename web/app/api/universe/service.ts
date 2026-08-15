import { readFile } from "node:fs/promises";
import path from "node:path";
import { getChart, getQuote } from "../quote/quotes";
import { activeLimits, hasQuoteCredentials } from "../quote/providers";
import type { ProviderId } from "../quote/providers";
import type { QuoteSource } from "../quote/providers/types";
import { getQuoteFixtures } from "../quote/fixtures";
import { readLatestDailyCloses } from "../quote/stock-candles";

type WarmQuote = {
  price: number;
  rate: number;
  source: QuoteSource;
  provider: ProviderId | null;
  updatedAt: string;
};

const warmQuotes: Record<string, WarmQuote> = {};
const sparks: Record<string, number[]> = {};
const chartUpdatedAt: Record<string, number> = {};
let codes: string[] = [];
let quoteCursor = 0;
let refreshInFlight: Promise<void> | null = null;
let storedCloses: {
  at: number;
  value: Awaited<ReturnType<typeof readLatestDailyCloses>>;
} | null = null;

async function loadBase() {
  const text = await readFile(
    path.join(process.cwd(), "public", "ui", "assets", "universe.js"),
    "utf8",
  );
  codes = Array.from(text.matchAll(/\['(\d{6})'/g)).map((match) => match[1]);
  return text;
}

function toSpark(prices: number[]) {
  const points = prices.slice(-16);
  if (points.length < 2) return [];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min;
  if (span <= 0) return points.map(() => 50);
  return points.map(
    (price) => Math.round((6 + ((price - min) / span) * 88) * 10) / 10,
  );
}

/**
 * 이번 폴링에서 데울 종목. 사용자가 보고 있는 종목이 항상 먼저다.
 *
 * 나머지는 커서로 돌아가며 채운다. 몇 개를 데울지는 제공자의 초당 제한에 달렸다 —
 * 초당 1건인 키움에서는 1개, 여유가 있는 제공자에서는 여러 개를 한 바퀴에 넣는다.
 */
function refreshTargets(preferredSymbol: string | null) {
  const size = Math.max(1, Math.min(activeLimits().refreshBatchSize, codes.length));
  const targets: string[] = [];
  if (preferredSymbol && codes.includes(preferredSymbol)) targets.push(preferredSymbol);
  while (targets.length < size) {
    const symbol = codes[quoteCursor++ % codes.length];
    if (!targets.includes(symbol)) targets.push(symbol);
  }
  return targets;
}

async function refreshSymbol(symbol: string, includeChart: boolean) {
  try {
    // 카드 시세 폴링은 5초마다 돈다. 사용자가 누른 차트가 이 뒤에 밀리지 않도록 후순위로 보낸다.
    const quote = await getQuote(symbol, true);
    warmQuotes[symbol] = {
      price: quote.price,
      rate: quote.rate,
      source: quote.source,
      provider: quote.provider,
      updatedAt: quote.updatedAt,
    };
    const chartIsStale =
      !chartUpdatedAt[symbol] || Date.now() - chartUpdatedAt[symbol] > 5 * 60 * 1000;
    if (includeChart && chartIsStale) {
      const points = await getChart(symbol, "daily");
      const spark = toSpark(points.map((point) => point.price));
      if (spark.length) {
        sparks[symbol] = spark;
        chartUpdatedAt[symbol] = Date.now();
      }
    }
  } catch {
    // 제공자를 못 쓰면 공개 픽스처가 그대로 보인다.
  }
}

async function refresh(preferredSymbol: string | null, includeChart: boolean) {
  if (!hasQuoteCredentials() || codes.length === 0) return;
  // 제공자 어댑터가 자체 큐로 간격을 지키므로 여기서는 한 번에 넣어도 된다.
  await Promise.all(
    refreshTargets(preferredSymbol).map((symbol) => refreshSymbol(symbol, includeChart)),
  );
}

/**
 * 제공자 갱신은 응답을 막지 않는다. 이미 도는 중이면 이번 틱은 건너뛴다.
 *
 * 전에는 모든 요청이 직렬 큐에서 자기 refresh(~2.6초)를 기다렸다. 폴러가 둘만 돼도
 * 유입이 배출을 넘어 큐가 영영 안 빠지고, 응답이 요청당 +2.6초씩 선형으로 늘었다.
 */
function kickRefresh(preferredSymbol: string | null, includeChart: boolean) {
  if (refreshInFlight) return;
  refreshInFlight = refresh(preferredSymbol, includeChart)
    .catch(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
}

/** 보관 종가는 5초(폴링 주기)만 기억한다. 폴러마다 Supabase 왕복을 새로 하지 않는다. */
async function readStoredCloses() {
  if (!storedCloses || Date.now() - storedCloses.at > 5000) {
    storedCloses = { at: Date.now(), value: await readLatestDailyCloses() };
  }
  return storedCloses.value;
}

export async function getUniverseSnapshot(
  preferredSymbol: string | null,
  includeChart: boolean,
) {
  await loadBase();
  const fixtures = await getQuoteFixtures();
  kickRefresh(preferredSymbol, includeChart);
  const updatedAt = new Date().toISOString();
  const fixtureQuotes = Object.fromEntries(
    Array.from(fixtures, ([symbol, fixture]) => [
      symbol,
      {
        price: fixture.price,
        rate: fixture.rate,
        source: "fixture" as const,
        provider: null,
        updatedAt,
      },
    ]),
  );
  const fixtureSparks = Object.fromEntries(
    Array.from(fixtures, ([symbol, fixture]) => [symbol, toSpark(fixture.chart)]),
  );

  // 차트가 보관 캔들을 쓰므로 카드 시세도 같은 출처를 써야 한 화면에서 값이 어긋나지 않는다.
  // 종목별 조회는 카드 51장을 채우는 데 요청이 51번 필요해서 한 번에 읽는다.
  let storedQuotes: Record<string, WarmQuote> = {};
  try {
    storedQuotes = Object.fromEntries(
      Array.from(await readStoredCloses(), ([symbol, candle]) => [
        symbol,
        {
          price: candle.close,
          rate: candle.previousClose
            ? ((candle.close - candle.previousClose) / candle.previousClose) * 100
            : 0,
          source: "fixture" as const,
          provider: null,
          updatedAt: new Date(candle.time * 1000).toISOString(),
        },
      ]),
    );
  } catch {
    // Supabase 미설정·장애면 픽스처 시세를 그대로 쓴다.
  }

  const live = Object.values(warmQuotes).find((quote) => quote.source === "live");

  return {
    // 제공자 이름이 아니라 실시간 여부다. 어느 제공자였는지는 `provider` 로 싣는다.
    source: live ? ("live" as const) : ("fixture" as const),
    provider: live?.provider ?? null,
    quotes: { ...fixtureQuotes, ...storedQuotes, ...warmQuotes },
    sparks: { ...fixtureSparks, ...sparks },
    updatedAt,
  };
}

export async function renderUniverseScript() {
  let output = await loadBase();
  for (const code of codes) {
    const quote = warmQuotes[code];
    if (!quote) continue;
    const row = new RegExp(
      "(\\['" + code + "',[^\\]]*?,\\s*)[-\\d.]+(\\s*,\\s*)[-\\d.]+(\\s*\\])",
    );
    output = output.replace(
      row,
      `$1${Math.round(quote.price)}$2${quote.rate}$3`,
    );
  }
  if (Object.keys(sparks).length) {
    output += `\n;(function(){var S=${JSON.stringify(sparks)};var u=window.KW_UNIVERSE;if(u&&u.stocks)u.stocks.forEach(function(x){if(S[x.code])x.spark=S[x.code];});})();\n`;
  }
  return output;
}
