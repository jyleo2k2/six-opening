import { NextResponse } from "next/server";
import { getUniverseSnapshot } from "../service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const symbol = searchParams.get("symbol");
  const preferredSymbol = symbol && /^\d{6}$/.test(symbol) ? symbol : null;
  const includeChart = searchParams.get("chart") === "1";
  return NextResponse.json(
    await getUniverseSnapshot(preferredSymbol, includeChart),
    { headers: { "Cache-Control": "no-store" } },
  );
}
