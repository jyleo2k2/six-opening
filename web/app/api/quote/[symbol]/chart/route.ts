import { after, NextResponse } from "next/server";
import { getChart, refreshStoredChart, type ChartPeriod } from "../../quotes";

export const dynamic = "force-dynamic";

/**
 * 일·주봉도 장중에는 오늘 봉이 계속 자란다. "하루 한 번 바뀐다"고 보고 길게 잡으면
 * 장 열린 동안 차트가 멈춘 것처럼 보인다. 연타만 걸러낼 만큼 짧게 잡는다.
 * 분봉은 매초 바뀌므로 캐시하지 않는다.
 */
function cacheControl(period: ChartPeriod) {
  return period === "minute"
    ? "no-store"
    : "public, max-age=60, stale-while-revalidate=240";
}

function parseSince(value: string | null) {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) return undefined;
  const since = Number(value);
  return Number.isSafeInteger(since) ? since : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await params;
    const searchParams = new URL(request.url).searchParams;
    const requestedPeriod = searchParams.get("period") ?? "daily";
    const since = parseSince(searchParams.get("since"));
    if (!(["minute", "daily", "weekly"] as const).includes(requestedPeriod as ChartPeriod)) {
      return NextResponse.json(
        { error: "지원하지 않는 차트 기간입니다." },
        { status: 400 },
      );
    }
    if (since === undefined) {
      return NextResponse.json(
        { error: "since 파라미터가 올바르지 않습니다." },
        { status: 400 },
      );
    }
    const period = requestedPeriod as ChartPeriod;
    const points = await getChart(symbol, period);
    const responsePoints = since === null ? points : points.filter((point) => point.time >= since);
    // 응답을 먼저 보내고 보관 DB의 최신 구간을 뒤에서 채운다.
    if (period !== "minute") after(() => refreshStoredChart(symbol, period));
    return NextResponse.json(
      { symbol, period, points: responsePoints },
      { headers: { "Cache-Control": cacheControl(period) } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "차트를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}
