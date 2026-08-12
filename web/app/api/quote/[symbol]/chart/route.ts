import { NextResponse } from "next/server";
import { getChart, type ChartPeriod } from "../../kiwoom";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  try {
    const { symbol } = await params;
    const requestedPeriod =
      new URL(request.url).searchParams.get("period") ?? "daily";
    if (!(["minute", "daily", "weekly"] as const).includes(requestedPeriod as ChartPeriod)) {
      return NextResponse.json(
        { error: "지원하지 않는 차트 기간입니다." },
        { status: 400 },
      );
    }
    const period = requestedPeriod as ChartPeriod;
    return NextResponse.json(
      { symbol, period, points: await getChart(symbol, period) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "차트를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}
