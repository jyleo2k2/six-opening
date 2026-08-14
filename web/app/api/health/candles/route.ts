import { NextResponse } from "next/server";
import { STOCKS } from "../../../../shared/data/stocks";
import { availableProviders } from "../../quote/providers";
import { readLatestDailyCloses } from "../../quote/stock-candles";

export const dynamic = "force-dynamic";

/**
 * 배포 뒤 51종 일봉이 보관 DB에 들어 있는지 한 번에 확인한다.
 *
 * 보관 DB는 배포·재기동과 무관하게 남으므로 기동 시 워밍업은 필요 없다. 필요한 것은
 * "지금 채워져 있나"를 즉시 보는 수단이고, `readLatestDailyCloses`가 51종 상태를
 * 요청 한 번으로 읽으므로 여기서는 집계만 한다.
 *
 * `readLatestDailyCloses`는 최근 열흘치만 읽는다(그 위로 올리면 2000행 상한에 잘려
 * 오래된 봉을 최신으로 오인한다). 그래서 이 응답의 판정은 "데이터가 있나"가 아니라
 * **"최근 열흘 안에 갱신됐나"**다. 배치가 멈춘 것도 같이 잡힌다.
 */
const WINDOW_DAYS = 10;

function seoulDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export async function GET() {
  const symbols = STOCKS.map((stock) => stock.symbol);
  // 루트 .env 를 읽어들이는 부수효과가 있다. 로컬 개발에서 Supabase 설정보다 먼저 와야 한다.
  // 키가 채워진 제공자를 시도 순서대로 싣는다. 비어 있으면 픽스처로만 도는 상태다.
  const quoteProviders = availableProviders().map((provider) => provider.id);

  try {
    const stored = await readLatestDailyCloses(WINDOW_DAYS);
    const staleOrMissing = symbols.filter((symbol) => !stored.has(symbol));
    const times = symbols.map((symbol) => stored.get(symbol)?.time).filter((time) => time != null);
    const ok = staleOrMissing.length === 0;

    return NextResponse.json(
      {
        ok,
        freshSymbols: symbols.length - staleOrMissing.length,
        totalSymbols: symbols.length,
        windowDays: WINDOW_DAYS,
        // 최댓값만 보면 한 종목만 당일 봉을 받아도 전체가 최신인 것처럼 보인다.
        // 배치 성공 판정에 쓸 값은 "전 종목이 최소 여기까지" 쪽이다.
        latestDaily: times.length ? seoulDate(Math.max(...times)) : null,
        allSymbolsThrough: times.length ? seoulDate(Math.min(...times)) : null,
        staleOrMissing,
        quoteProviders,
      },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // 보관 DB를 못 읽으면 차트가 픽스처로 조용히 폴백한다. 그 상태를 여기서만은 드러낸다.
    return NextResponse.json(
      {
        ok: false,
        freshSymbols: 0,
        totalSymbols: symbols.length,
        windowDays: WINDOW_DAYS,
        latestDaily: null,
        allSymbolsThrough: null,
        staleOrMissing: symbols,
        quoteProviders,
        error: error instanceof Error ? error.message : "보관 DB를 읽지 못했습니다.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
