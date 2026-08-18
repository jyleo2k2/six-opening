import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isRegularMarketOpen } from "../../f2-trade/lib/scheduled-orders.js";
import { invalidateOpenOrders, loadOpenOrders, shouldRefreshAccount } from "./use-wallet";

// `isRegularMarketOpen`은 절대 시각을 KST로 환산해 비교한다(scheduled-orders.js).
// 로컬 타임존으로 필드를 만들면 UTC 러너(CI)에서 9시간 어긋나므로, UTC 필드에서
// KST 9시간을 미리 빼 절대 시각을 만든다 — 실행 환경의 타임존과 무관하다.
const wed = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 12, hour - 9, minute)); // 수요일 KST
const sun = (hour: number) => new Date(Date.UTC(2026, 7, 16, hour - 9, 0)); // 일요일 KST

// ── 학교 시간 거래 제한은 여기 없다 ────────────────────────────────────
// 예전에는 `평일 09:00~15:30` 이 이 파일에 박혀 있었고(`isSchoolTime`·`canTrade`),
// 그 창이 정규장 창과 **정확히 같아서** 켜면 자녀가 즉시 체결을 볼 수 있는 시간대가
// 사라졌다. 그래서 상수로 꺼 둔 채였다.
//
// 이제 창·요일·막을 기능을 부모가 정하고 판정은 서버가 한다
// (`app/api/trade-restriction/rule.ts` 와 그 테스트). 기본값이 꺼짐이라 아무도 켜지
// 않은 가족은 아래 두 창이 겹치든 말든 영향을 받지 않는다.
//
// 기본 제한 창(09:00~15:00)이 정규장 창 안에 들어 있다는 사실은 그대로다 —
// 부모가 켜면 그 시간의 즉시 체결이 막히는 게 이 기능이 하려는 일이다.
assert.equal(isRegularMarketOpen(wed(9)), true);
assert.equal(isRegularMarketOpen(wed(14, 59)), true);
assert.equal(isRegularMarketOpen(wed(15, 30)), false);
assert.equal(isRegularMarketOpen(sun(12)), false);

console.log("school lock moved to api/trade-restriction");

// ── 열린 주문 조회 캐시 ─────────────────────────────────────────────────
//
// `GET /api/orders` 는 목록을 읽는 김에 **만기 지난 예약을 정산**한다. 화면을 오갈 때마다
// 다시 부르면 정산할 것이 없는데도 그 왕복을 매번 기다리게 되고, 지갑을 기다리는 화면은
// 그만큼 늦게 뜬다. 브라우저 없이 확인하려고 `fetch` 를 갈아 끼워 센다.

let calls: string[] = [];
let nextBody: unknown = { orders: [] };
let nextOk = true;

const realFetch = globalThis.fetch;
globalThis.fetch = ((input: Parameters<typeof fetch>[0]) => {
  calls.push(String(input));
  return Promise.resolve({ ok: nextOk, json: () => Promise.resolve(nextBody) } as Response);
}) as typeof fetch;

const resetOrders = () => {
  calls = [];
  nextBody = { orders: [] };
  nextOk = true;
  invalidateOpenOrders();
};

async function openOrdersCacheTests() {
  // 여러 화면이 동시에 마운트돼도 서버 왕복은 한 번이다.
  resetOrders();
  const [first, second] = await Promise.all([loadOpenOrders(), loadOpenOrders()]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], "/api/orders");
  assert.deepEqual(first, { orders: [] });
  assert.equal(first, second);

  // 화면을 오가며 다시 불러도 담아 둔 값을 준다 — 정산을 다시 돌리지 않는다.
  await loadOpenOrders();
  await loadOpenOrders();
  assert.equal(calls.length, 1);

  // 주문을 넣거나 취소한 쪽이 비우면 그때 다시 읽는다.
  invalidateOpenOrders();
  await loadOpenOrders();
  assert.equal(calls.length, 2);

  // 못 읽었으면 담아 두지 않는다. 한 번 실패한 채로 굳으면 예약이 사라진 것처럼 보인다.
  resetOrders();
  nextOk = false;
  assert.equal(await loadOpenOrders(), null);
  assert.equal(calls.length, 1);
  nextOk = true;
  assert.deepEqual(await loadOpenOrders(), { orders: [] });
  assert.equal(calls.length, 2);

  // 정산이 일어난 응답도 그대로 전달한다. 이 값을 본 쪽이 `refresh()` 로 캐시를 비우고
  // 한 번 더 도는데, 그때 주문 캐시가 안 비워지면 같은 `settled` 를 다시 보고 무한히 돈다.
  resetOrders();
  nextBody = { orders: [], settled: [{ id: "1" }] };
  const settled = (await loadOpenOrders()) as { settled?: unknown[] };
  assert.equal(settled.settled?.length, 1);
  assert.equal(shouldRefreshAccount({ orders: [], settled: [{ id: "1" }] }), true);
  // 내가 체결하지 못했어도 동시 요청이 먼저 정산해 계좌가 바뀐 경우다.
  assert.equal(shouldRefreshAccount({ orders: [], settled: [], accountChanged: true }), true);
  assert.equal(shouldRefreshAccount({ orders: [], settled: [], accountChanged: false }), false);

  // 그래서 `refresh()` 가 계좌와 주문 캐시를 **둘 다** 비우는지 소스로 못 박는다.
  const source = readFileSync(new URL("./use-wallet.ts", import.meta.url), "utf8");
  const at = source.indexOf("const refresh = useCallback");
  const refreshBody = source.slice(at, source.indexOf("}, []);", at));
  assert.match(refreshBody, /invalidateAccount\(\)/u);
  assert.match(refreshBody, /invalidateOpenOrders\(\)/u);

  // 저장소는 여전히 쓰지 않는다 — `screen-state-handoff` 와 같은 계약이다.
  assert.doesNotMatch(source, /localStorage|sessionStorage/u);

  globalThis.fetch = realFetch;
  console.log("open orders cache tests passed");
}

// tsx 는 CJS 로 트랜스파일해서 최상위 `await` 를 쓸 수 없다. 실패는 종료 코드로 알린다.
openOrdersCacheTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
