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

/**
 * Polling 응답을 기존 차트에 합친다.
 *
 * 현재 봉은 매 요청마다 같은 `time`으로 갱신될 수 있으므로, 같은 시각의
 * 데이터는 새 응답으로 교체하고 새 봉만 뒤에 추가한다.
 */
export function mergeChartPoints(existing: ChartPoint[], incoming: ChartPoint[]) {
  const byTime = new Map(existing.map((point) => [point.time, point]));
  for (const point of incoming) byTime.set(point.time, point);
  return [...byTime.values()].sort((left, right) => left.time - right.time);
}
