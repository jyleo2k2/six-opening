import assert from "node:assert/strict";
import { watchlistCodes } from "./route";

// 라우트의 401·502 분기와 토글은 세션·DB 에 기댄다(`comments/route.test.ts` 와 같은 이유로
// 여기서 검사하지 않는다). 응답을 만드는 순수 조각만 고정한다.
function main() {
  // 담은 순서를 그대로 유지한다 — 탐색의 관심 기업 줄이 이 순서로 선다.
  assert.deepEqual(
    watchlistCodes([
      { stocks: { stock_code: "005930" } },
      { stocks: { stock_code: "259960" } },
    ]),
    ["005930", "259960"],
  );

  // 종목이 딸려 오지 않은 행은 버린다. 남기면 목록에 undefined 가 섞여 하트 판정이 어긋난다.
  assert.deepEqual(
    watchlistCodes([
      { stocks: null },
      { stocks: { stock_code: "352820" } },
      { stocks: { stock_code: "" } },
    ]),
    ["352820"],
  );

  assert.deepEqual(watchlistCodes([]), []);

  console.log("watchlist route tests passed");
}

main();
