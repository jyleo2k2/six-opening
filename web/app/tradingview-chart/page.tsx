import { TradingViewChart } from "../../features/f2-trade/TradingViewChart";
import type {
  PrototypeChartPeriod,
  PrototypeChartType,
} from "../../features/f2-trade/chart-data";
import type { FamilyMember } from "../../shared/types/trade";

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

  // 열람 계정을 모르면 null 로 넘긴다. 어림짐작으로 넣으면 남의 수량이 노출된다 (F11 SPEC §6).
  const requestedViewer = single(query.viewer);
  const viewer: FamilyMember | null =
    requestedViewer === "child" || requestedViewer === "parent" ? requestedViewer : null;

  return (
    <TradingViewChart
      symbol={symbol}
      period={period}
      chartType={chartType}
      viewer={viewer}
    />
  );
}
