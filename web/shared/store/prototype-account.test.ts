import assert from "node:assert/strict";
import { FAMILY_SEED_TRADES } from "./family-trade-seed";
import {
  SEED,
  accountTotalAsset,
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
 * 복원은 이제 **첫 렌더 전에** 돈다. 여기가 조용히 깨지면 화면을 옮길 때마다
 * 시드 지갑이 한 프레임 보이거나(복원 실패), 새로고침해도 초기화되지 않는다(표시 무시).
 */
function restoreTests() {
  const store = { acc: { child: { cash: 7, holdings: [], pending: [] } }, records: [{ id: "r" }], seq: 9 };
  const ui = { screen: "archive", arcTab: "return", draft: { amount: 30000 }, code: null };
  const passThrough = (account: unknown) => account;

  // 앱 안에서 넘어왔다 → 계좌도 화면 임시값도 되살린다.
  let local = fakeStorage({ kw_proto_v1: JSON.stringify(store) });
  let session = fakeStorage({ kw_proto_ui_v1: JSON.stringify(ui), kw_proto_nav_v1: "1" });
  Object.assign(globalThis, { localStorage: local, sessionStorage: session });
  let restored = restorePrototypeState(passThrough);
  assert.equal(restored.seq, 9);
  assert.deepEqual(restored.records, [{ id: "r" }]);
  assert.equal(restored.screen, "archive");
  assert.deepEqual(restored.draft, { amount: 30000 });
  // null 은 되살리지 않는다 — 초기값을 덮어 화면이 종목을 잃는다.
  assert.ok(!("code" in restored));
  // 표시는 한 번 쓰고 버린다.
  assert.equal(session.box.has("kw_proto_nav_v1"), false);

  // 표시가 없다(F5·새 탭) → 계좌만 남고 화면 임시값은 버린다.
  local = fakeStorage({ kw_proto_v1: JSON.stringify(store) });
  session = fakeStorage({ kw_proto_ui_v1: JSON.stringify(ui) });
  Object.assign(globalThis, { localStorage: local, sessionStorage: session });
  restored = restorePrototypeState(passThrough);
  assert.equal(restored.seq, 9);
  assert.ok(!("screen" in restored), "F5 하면 처음부터여야 한다 (F2 SPEC §6.2)");
  assert.equal(session.box.has("kw_proto_ui_v1"), false);

  // 저장값이 깨졌어도 죽지 않는다. 첫 렌더 전에 도는 코드라 던지면 화면이 통째로 안 뜬다.
  Object.assign(globalThis, {
    localStorage: fakeStorage({ kw_proto_v1: "{oops" }),
    sessionStorage: fakeStorage({ kw_proto_nav_v1: "1", kw_proto_ui_v1: "nope" }),
  });
  assert.deepEqual(restorePrototypeState(passThrough), {});

  // seq 가 없는 옛 저장값이 초기 seq 를 undefined 로 덮으면 안 된다.
  Object.assign(globalThis, {
    localStorage: fakeStorage({ kw_proto_v1: JSON.stringify({ acc: {} }) }),
    sessionStorage: fakeStorage(),
  });
  assert.ok(!("seq" in restorePrototypeState(passThrough)));
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
