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

  // 열람 계정은 쿼리로 받지 않는다. 마커 수량 마스킹은 세션을 아는 서버가 한다 (F11 SPEC §6.1).
  return <TradingViewChart symbol={symbol} period={period} chartType={chartType} />;
}
