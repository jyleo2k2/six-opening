export type PrototypeChartPeriod = "minute" | "daily" | "weekly";
export type PrototypeChartType = "line" | "candlestick";

export type ChartPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  price: number;
};

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isChartPoint(value: unknown): value is ChartPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<ChartPoint>;
  return (
    typeof point.time === "number" &&
    Number.isFinite(point.time) &&
    isFinitePositive(point.open) &&
    isFinitePositive(point.high) &&
    isFinitePositive(point.low) &&
    isFinitePositive(point.close) &&
    typeof point.volume === "number" &&
    Number.isFinite(point.volume)
  );
}

export function parseChartPoints(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const points = (value as { points?: unknown }).points;
  if (!Array.isArray(points)) return [];
  return points.filter(isChartPoint).sort((left, right) => left.time - right.time);
}
