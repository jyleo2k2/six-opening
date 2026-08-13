import { NextRequest } from "next/server";
import { loadPublishedNewsForStock, stockCodeFromId } from "./service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const stockId = request.nextUrl.searchParams.get("stockId");
  if (!stockCodeFromId(stockId)) {
    return Response.json({ error: "잘못된 종목 ID입니다." }, { status: 400 });
  }

  try {
    return Response.json(
      { item: await loadPublishedNewsForStock(stockId!) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "news_lookup_failed",
        message: error instanceof Error ? error.message : "unknown",
      }),
    );
    return Response.json({ error: "뉴스를 불러오지 못했습니다." }, { status: 503 });
  }
}
