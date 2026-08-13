import { TradingViewChart } from "../../features/f2-trade/TradingViewChart";
import type {
  PrototypeChartPeriod,
  PrototypeChartType,
} from "../../features/f2-trade/chart-data";

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TradingViewChartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedSymbol = single(query.symbol) ?? "";
  const requestedPeriod = single(query.period) ?? "daily";
  const requestedType = single(query.type) ?? "line";
  const symbol = /^\d{6}$/.test(requestedSymbol) ? requestedSymbol : "005930";
  const period: PrototypeChartPeriod = (["minute", "daily", "weekly"] as const).includes(
    requestedPeriod as PrototypeChartPeriod,
  ) ? requestedPeriod as PrototypeChartPeriod : "daily";
  const chartType: PrototypeChartType = (["line", "candlestick"] as const).includes(
    requestedType as PrototypeChartType,
  ) ? requestedType as PrototypeChartType : "line";

  return <TradingViewChart symbol={symbol} period={period} chartType={chartType} />;
}
