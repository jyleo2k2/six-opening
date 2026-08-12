import { readFile } from "node:fs/promises";
import path from "node:path";
import { getChart, getQuote, hasKiwoomCredentials } from "../quote/kiwoom";
import { getQuoteFixtures } from "../quote/fixtures";
import { readLatestDailyCloses } from "../quote/stock-candles";

type WarmQuote = {
  price: number;
  rate: number;
  source: "kiwoom" | "fixture";
  updatedAt: string;
};

const warmQuotes: Record<string, WarmQuote> = {};
const sparks: Record<string, number[]> = {};
const chartUpdatedAt: Record<string, number> = {};
let codes: string[] = [];
let quoteCursor = 0;
let refreshQueue = Promise.resolve<unknown>(undefined);

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

async function refresh(preferredSymbol: string | null, includeChart: boolean) {
  if (!hasKiwoomCredentials() || codes.length === 0) return;
  const symbol =
    preferredSymbol && codes.includes(preferredSymbol)
      ? preferredSymbol
      : codes[quoteCursor++ % codes.length];

  try {
    const quote = await getQuote(symbol);
    warmQuotes[symbol] = {
      price: quote.price,
      rate: quote.rate,
      source: quote.source,
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
    // The public fixture remains visible when Kiwoom is unavailable.
  }
}

export async function getUniverseSnapshot(
  preferredSymbol: string | null,
  includeChart: boolean,
) {
  await loadBase();
  const fixtures = await getQuoteFixtures();
  const run = () => refresh(preferredSymbol, includeChart);
  const result = refreshQueue.then(run, run);
  refreshQueue = result.catch(() => undefined);
  await result;
  const updatedAt = new Date().toISOString();
  const fixtureQuotes = Object.fromEntries(
    Array.from(fixtures, ([symbol, fixture]) => [
      symbol,
      {
        price: fixture.price,
        rate: fixture.rate,
        source: "fixture" as const,
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
      Array.from(await readLatestDailyCloses(), ([symbol, candle]) => [
        symbol,
        {
          price: candle.close,
          rate: candle.previousClose
            ? ((candle.close - candle.previousClose) / candle.previousClose) * 100
            : 0,
          source: "fixture" as const,
          updatedAt: new Date(candle.time * 1000).toISOString(),
        },
      ]),
    );
  } catch {
    // Supabase 미설정·장애면 픽스처 시세를 그대로 쓴다.
  }

  return {
    source: Object.values(warmQuotes).some((quote) => quote.source === "kiwoom")
      ? ("kiwoom" as const)
      : ("fixture" as const),
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
