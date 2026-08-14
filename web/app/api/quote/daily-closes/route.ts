import { NextResponse } from "next/server";
import { loadDevelopmentEnvironment } from "../../dev-env";
import { chartRetentionCutoff, readStoredCandles } from "../stock-candles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 한 번에 받을 종목 수 상한. 유니버스가 51종이라 그보다 넉넉하게 둔다. */
const MAX_SYMBOLS = 60;

/**
 * 아카이브 정확 채점용 일봉 종가.
 *
 * 화면이 `shared/engine/archive-profile.js` 의 `gradeAccuracy` 를 직접 돌리려면
 * 사고판 종목의 종가 계열이 필요하다. 종목마다 따로 부르면 요청이 거래 종목 수만큼
 * 늘어나므로 한 번에 받는다. 보관 캔들만 읽고 키움을 부르지 않는다.
 *
 *   GET /api/quote/daily-closes?symbols=259960,005930
 *   -> { closes: { "259960": [{ date: "2026-08-11", close: 123400 }, ...] } }
 */
export async function GET(request: Request) {
  // 로컬에서 이 라우트가 Supabase 를 처음 부르는 경로일 수 있다. 순서에 기대지 않는다
  // (`api/dev-env.ts` 주석 참고). 배포 환경에서는 아무 일도 하지 않는다.
  loadDevelopmentEnvironment();

  const raw = new URL(request.url).searchParams.get("symbols") ?? "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean),
    ),
  );

  if (symbols.length === 0) return NextResponse.json({ closes: {} });
  if (symbols.length > MAX_SYMBOLS) {
    return NextResponse.json(
      { error: `종목은 한 번에 ${MAX_SYMBOLS}개까지 조회합니다.` },
      { status: 400 },
    );
  }

  const cutoff = chartRetentionCutoff("daily");
  const closes: Record<string, { date: string; close: number }[]> = {};

  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const { points } = await readStoredCandles(symbol, "daily", cutoff);
        closes[symbol] = points.map((point) => ({
          date: new Date(point.time * 1000 + 9 * 3_600_000).toISOString().slice(0, 10),
          close: point.close,
        }));
      } catch (error) {
        // 종가가 없으면 그 거래는 엔진이 채점 보류로 처리한다. 조용히 비우면 화면에서는
        // "아직 채점 전"과 구분이 안 되므로 서버 로그에는 남긴다.
        console.error(`[daily-closes] ${symbol} 종가 조회 실패`, error);
        closes[symbol] = [];
      }
    }),
  );

  return NextResponse.json(
    { closes },
    // 일봉은 장 마감 뒤에만 늘어난다. 아카이브를 오가며 연타하는 것만 막으면 된다.
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } },
  );
}
