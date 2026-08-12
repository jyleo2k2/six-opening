import { readFile } from "node:fs/promises";
import path from "node:path";
import { STOCKS } from "../../../shared/data/stocks";

export type QuoteFixture = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  rate: number;
  chart: number[];
};

const ROW_PATTERN =
  /\['(\d{6})',\s*"([^"]+)",\s*"([^"]+)",\s*"[^"]*",\s*(-?[\d.]+),\s*(-?[\d.]+)\]/g;
const UI_COMPATIBILITY_SYMBOLS = new Set(["039490"]);

let fixturePromise: Promise<Map<string, QuoteFixture>> | undefined;

function makeChart(symbol: string, price: number, rate: number) {
  let seed = Number(symbol);
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const previousClose = rate === -100 ? price : price / (1 + rate / 100);
  const points = Array.from({ length: 16 }, (_, index) => {
    const progress = index / 15;
    const trend = previousClose + (price - previousClose) * progress;
    const jitter = price * (random() - 0.5) * 0.018 * (1 - progress * 0.7);
    return Math.max(1, Math.round(trend + jitter));
  });
  points[points.length - 1] = price;
  return points;
}

async function readFixtures() {
  const source = await readFile(
    path.join(process.cwd(), "public", "ui", "assets", "universe.js"),
    "utf8",
  );
  const approvedStocks = new Map(STOCKS.map((stock) => [stock.symbol, stock]));
  const fixtures = new Map<string, QuoteFixture>();

  for (const match of source.matchAll(ROW_PATTERN)) {
    const [, symbol, name, , priceText, rateText] = match;
    const approved = approvedStocks.get(symbol);
    if (!approved && !UI_COMPATIBILITY_SYMBOLS.has(symbol)) continue;
    const price = Number(priceText);
    const rate = Number(rateText);
    if (!Number.isFinite(price) || !Number.isFinite(rate) || price <= 0) continue;
    const previousClose = rate === -100 ? price : price / (1 + rate / 100);
    fixtures.set(symbol, {
      symbol,
      name: approved?.name ?? name,
      price,
      change: Math.round(price - previousClose),
      rate,
      chart: makeChart(symbol, price, rate),
    });
  }

  const expectedSize = new Set([
    ...STOCKS.map((stock) => stock.symbol),
    ...UI_COMPATIBILITY_SYMBOLS,
  ]).size;
  if (fixtures.size !== expectedSize) {
    throw new Error(
      `종목 픽스처가 51종 유니버스와 다릅니다. expected=${expectedSize} actual=${fixtures.size}`,
    );
  }
  return fixtures;
}

export function getQuoteFixtures() {
  fixturePromise ??= readFixtures();
  return fixturePromise;
}

export async function getQuoteFixture(symbol: string) {
  return (await getQuoteFixtures()).get(symbol);
}
