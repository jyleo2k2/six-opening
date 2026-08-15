import assert from "node:assert/strict";
import { FAMILY_SEED_TRADES } from "./family-trade-seed";
import {
  SEED,
  accountTotalAsset,
  persistWallet,
  restorePrototypeState,
  seedAccounts,
} from "./prototype-account.js";

/**
 * 시드 잔고는 `seedAccounts()` 에 손으로 적혀 있고, 그 값이 나온 거래는
 * `family-trade-seed.ts` 에 따로 있다. 한쪽만 고치면 지갑과 피드·차트 마커가
 * 서로 다른 이야기를 하는데, 화면만 봐서는 한참 뒤에나 드러난다.
 * 그래서 여기서 시드 거래로 잔고를 다시 계산해 맞는지 확인한다.
 */
type Wallet = { cash: number; holdings: { code: string; qty: number; avg: number }[] };

function walletFromSeedTrades(member: "child" | "parent"): Wallet {
  const wallet: Wallet = { cash: SEED, holdings: [] };
  for (const trade of FAMILY_SEED_TRADES) {
    if (trade.member !== member) continue;
    const amount = trade.price * trade.quantity;
    const at = wallet.holdings.findIndex((h) => h.code === trade.symbol);
    if (trade.side === "buy") {
      wallet.cash -= amount;
      if (at < 0) wallet.holdings.push({ code: trade.symbol, qty: trade.quantity, avg: trade.price });
      else {
        const held = wallet.holdings[at];
        const qty = held.qty + trade.quantity;
        wallet.holdings[at] = { code: trade.symbol, qty, avg: (held.avg * held.qty + amount) / qty };
      }
      continue;
    }
    wallet.cash += amount;
    if (at < 0) continue;
    const left = wallet.holdings[at].qty - trade.quantity;
    if (left <= 0) wallet.holdings.splice(at, 1);
    else wallet.holdings[at] = { ...wallet.holdings[at], qty: left };
  }
  return wallet;
}

/** 브라우저 저장소 흉내. 노드에는 없다. */
function fakeStorage(seed: Record<string, string> = {}) {
  const box = new Map(Object.entries(seed));
  return {
    box,
    getItem: (k: string) => box.get(k) ?? null,
    setItem: (k: string, v: string) => void box.set(k, v),
    removeItem: (k: string) => void box.delete(k),
  };
}

/**
 * 복원은 **첫 렌더 전에** 돈다. 여기가 조용히 깨지면 화면을 열 때 시드 지갑이 한 프레임
 * 보이거나(복원 실패), 저장값이 깨졌을 때 화면이 통째로 안 뜬다(예외).
 *
 * 화면 상태는 더 이상 넘겨받지 않는다 — 화면을 옮겨도 문서가 그대로라 메모리에 남아 있다.
 */
function restoreTests() {
  const store = { acc: { child: { cash: 7, holdings: [], pending: [] } }, records: [{ id: "r" }], seq: 9 };
  const passThrough = (account: unknown) => account;

  Object.assign(globalThis, {
    localStorage: fakeStorage({ kw_proto_v1: JSON.stringify(store) }),
    sessionStorage: fakeStorage(),
  });
  let restored = restorePrototypeState(passThrough);
  assert.equal(restored.seq, 9);
  assert.deepEqual(restored.records, [{ id: "r" }]);
  assert.deepEqual(restored.acc.child.cash, 7);
  // 화면 상태는 저장하지도 되살리지도 않는다.
  assert.ok(!("screen" in restored));
  assert.ok(!("draft" in restored));

  // 저장값이 깨졌어도 죽지 않는다. 첫 렌더 전에 도는 코드라 던지면 화면이 통째로 안 뜬다.
  Object.assign(globalThis, {
    localStorage: fakeStorage({ kw_proto_v1: "{oops" }),
    sessionStorage: fakeStorage(),
  });
  assert.deepEqual(restorePrototypeState(passThrough), {});

  // seq 가 없는 옛 저장값이 초기 seq 를 undefined 로 덮으면 안 된다.
  Object.assign(globalThis, {
    localStorage: fakeStorage({ kw_proto_v1: JSON.stringify({ acc: {} }) }),
    sessionStorage: fakeStorage(),
  });
  assert.ok(!("seq" in restorePrototypeState(passThrough)));

  // 저장 → 읽기 왕복. 옮긴 화면이 예약 주문을 취소하면 app.html 도 같은 값을 본다.
  const box = fakeStorage();
  Object.assign(globalThis, { localStorage: box, sessionStorage: fakeStorage() });
  persistWallet({ acc: { child: { cash: 5, holdings: [], pending: [] } }, records: [], seq: 3 });
  assert.equal(restorePrototypeState(passThrough).acc.child.cash, 5);
  assert.equal(restorePrototypeState(passThrough).seq, 3);
}

function main() {
  const seeded = seedAccounts();

  for (const member of ["child", "parent"] as const) {
    const expected = walletFromSeedTrades(member);
    const actual = seeded[member];
    assert.equal(actual.cash, expected.cash, `${member} 현금이 시드 거래와 다르다`);
    assert.deepEqual(
      [...actual.holdings].sort((a, b) => a.code.localeCompare(b.code)),
      [...expected.holdings].sort((a, b) => a.code.localeCompare(b.code)),
      `${member} 보유가 시드 거래와 다르다`,
    );
  }

  // 총자산 — 현금 + 보유 평가액.
  const prices: Record<string, number> = { "259960": 240000, "352820": 200000 };
  const child = seeded.child;
  assert.equal(
    accountTotalAsset(child, (code) => prices[code] ?? 0),
    child.cash + 240000 * 2 + 200000,
  );

  // 모르는 종목은 0 으로 본다. 값이 없다고 총자산이 NaN 이 되면 화면 전체가 깨진다.
  assert.equal(accountTotalAsset(child, () => Number.NaN), child.cash);
  assert.equal(accountTotalAsset(child, () => undefined as unknown as number), child.cash);

  // 매수 예약 현금은 cash 에서 빠져 있으므로 다시 더한다.
  const withBuyOrder = {
    ...child,
    holdings: [],
    cash: 1000,
    pending: [{ side: "buy", reservedAmount: 500 }],
  };
  assert.equal(accountTotalAsset(withBuyOrder, () => 0), 1500);

  // 매도 예약 수량은 holdings 에 남아 있다. 여기서 또 더하면 두 번 센다.
  const withSellOrder = {
    ...child,
    holdings: [{ code: "259960", qty: 1, avg: 100 }],
    cash: 1000,
    pending: [{ side: "sell", reservedQty: 1, code: "259960" }],
  };
  assert.equal(accountTotalAsset(withSellOrder, () => 300), 1300);

  assert.equal(accountTotalAsset(null, () => 0), 0);

  restoreTests();
  console.log("prototype account tests passed");
}

main();
