import assert from "node:assert/strict";
import { countDistinctStocks, sumTabCounts } from "./route";

// 라우트의 401·502 분기는 세션·DB 에 의존한다. 순수 집계만 고정한다 (likes/route.test.ts 와 같은 방식).
function main() {
  assert.equal(sumTabCounts([]), 0);
  assert.equal(sumTabCounts([{ tab_count: 1 }, { tab_count: 2 }, { tab_count: 0 }]), 3);

  assert.equal(countDistinctStocks([]), 0);
  assert.equal(countDistinctStocks([{ stock_id: 1 }, { stock_id: 1 }, { stock_id: 2 }]), 2);

  console.log("profile/behavior route tests passed");
}

main();
