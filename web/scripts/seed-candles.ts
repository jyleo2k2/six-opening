/**
 * 장 마감 캔들 적재 배치.
 *
 * 지금까지 보관 DB는 요청 유발형으로만 채워졌다 — 누군가 그 종목 차트를 열어야
 * `after()`가 `refreshStoredChart`를 돌렸다. 그래서 아무도 안 열어본 종목은 비어 있고,
 * 열어본 종목도 오늘 봉이 한 박자 늦게 들어온다. 이 스크립트가 51종을 미리 채운다.
 *
 * 실행:
 *   cd web && npm run seed:candles          # 51종 일봉·주봉
 *   cd web && npm run seed:candles -- 005930 000660
 *
 * 증분이다. `refreshStoredChart`가 저장된 마지막 봉에 닿으면 페이징을 멈추므로
 * 둘째 날부터는 종목당 한 페이지만 받는다.
 */

import { STOCKS } from "../shared/data/stocks";
import { hasQuoteCredentials, refreshStoredChart } from "../app/api/quote/quotes";
import { readLatestDailyCloses } from "../app/api/quote/stock-candles";

const PERIODS = ["daily", "weekly"] as const;

function seoulDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp * 1000));
}

async function main() {
  const requested = process.argv.slice(2).filter((argument) => /^\d{6}$/.test(argument));
  const symbols = requested.length ? requested : STOCKS.map((stock) => stock.symbol);

  if (!hasQuoteCredentials()) {
    console.error(
      "시세 제공자 자격증명이 없습니다. .env 의 KIWOOM_APP_KEY·KIWOOM_SECRET_KEY 또는 TOSS_CLIENT_ID·TOSS_CLIENT_SECRET 를 채우고 다시 실행하세요.",
    );
    process.exitCode = 1;
    return;
  }

  const before = await readLatestDailyCloses().catch(() => new Map());
  console.log(`적재 시작 — 종목 ${symbols.length}개 × 기간 ${PERIODS.length}개`);

  const failures: string[] = [];
  let done = 0;

  for (const symbol of symbols) {
    for (const period of PERIODS) {
      try {
        await refreshStoredChart(symbol, period);
      } catch (error) {
        // refreshStoredChart 는 내부에서 실패를 삼키므로 여기 오는 일은 드물다.
        failures.push(`${symbol}:${period} ${error instanceof Error ? error.message : error}`);
      }
    }
    done += 1;
    if (done % 10 === 0 || done === symbols.length) {
      console.log(`  ${done}/${symbols.length}`);
    }
  }

  // refreshStoredChart 는 실패를 삼킨다. 실제로 반영됐는지는 DB를 다시 읽어서 판정한다.
  const after = await readLatestDailyCloses().catch(() => new Map());
  const missing = symbols.filter((symbol) => !after.has(symbol));
  const advanced = symbols.filter((symbol) => {
    const previous = before.get(symbol)?.time;
    const current = after.get(symbol)?.time;
    return current != null && (previous == null || current > previous);
  });
  const latest = Math.max(0, ...symbols.map((symbol) => after.get(symbol)?.time ?? 0));

  console.log(`갱신된 종목 ${advanced.length}개 · 일봉 최신일 ${latest ? seoulDate(latest) : "없음"}`);
  if (missing.length) console.warn(`일봉이 비어 있는 종목 ${missing.length}개: ${missing.join(", ")}`);
  for (const failure of failures) console.warn(`  실패 ${failure}`);

  if (missing.length || failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
