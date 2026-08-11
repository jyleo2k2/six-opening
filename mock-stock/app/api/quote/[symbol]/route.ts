import { NextResponse } from "next/server";
import { getQuote } from "../kiwoom";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    return NextResponse.json(await getQuote((await params).symbol), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "시세를 불러오지 못했습니다." }, { status: 404 });
  }
}
