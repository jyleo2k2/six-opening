// 프로토타입 지갑(계좌)의 단일 원본.
//
// 화면을 하나씩 실제 라우트로 옮기는 동안 계좌는 두 곳에서 읽힌다 — 아직 `app.html`
// 안에 있는 화면과, 이미 React 로 옮긴 화면이다. 시드와 총자산 계산이 두 벌로 갈라지면
// 같은 지갑이 화면마다 다른 값을 보인다. 그래서 여기 하나만 둔다.
//
// 이 파일은 브라우저(`public/ui/app.html`)와 서버·테스트가 함께 쓴다.
// `scripts/ui-build.mjs` 가 `export` 를 떼고 app.html 안으로 복사하므로
// **TypeScript 문법과 import 를 쓰지 않는다.** 고칠 때는 이 파일만 고치고
// `node scripts/ui-build.mjs build` 로 화면을 다시 만든다.

/**
 * 타입은 JSDoc 으로 단다 — TypeScript 문법을 쓰면 그대로 화면에 들어가 문법이 깨진다.
 *
 * @typedef {{ code: string, qty: number, avg: number }} PrototypeHolding
 * @typedef {{ id?: string, side?: string, kind?: string, code?: string,
 *   amount?: number, qty?: number, reservedAmount?: number, reservedQty?: number }} PrototypePendingOrder
 * @typedef {{ name?: string, cash: number, holdings: PrototypeHolding[],
 *   pending: PrototypePendingOrder[] }} PrototypeAccount
 */

/** 시즌 시작 가상 자금. */
export const SEED = 10000000;

/**
 * 시드 2주치 거래(`shared/store/family-trade-seed.ts`)를 다 체결한 뒤의 잔고.
 *
 * 김찬영: 매수 891,000 − 매도 회수 230,500 / 엄마: 매수 690,750 − 매도 회수 231,000.
 * 보유 평균단가는 시드 체결가 기준이다. 손으로 적은 값이라 시드 파일과 어긋날 수 있어
 * `prototype-account.test.ts` 가 시드 거래에서 다시 계산해 맞는지 확인한다.
 *
 * @returns {{ child: PrototypeAccount, parent: PrototypeAccount }}
 */
export function seedAccounts() {
  return {
    child: {
      name: "김찬영",
      cash: SEED - 660500,
      holdings: [
        { code: "259960", qty: 2, avg: 232000 },
        { code: "352820", qty: 1, avg: 181000 },
      ],
      pending: [],
    },
    parent: {
      name: "엄마",
      cash: SEED - 459750,
      holdings: [
        { code: "005930", qty: 1, avg: 240000 },
        { code: "011200", qty: 10, avg: 21075 },
      ],
      pending: [],
    },
  };
}

/**
 * 저장된 **지갑**만 읽는다. 부수효과가 없어 아무 화면에서나 불러도 된다.
 *
 * 저장소에서 읽기만 하고 아무것도 지우지 않는다.
 *
 * @param {(account: any, sellRecords: any[]) => any} migrateAccount
 * @returns {Record<string, any>}
 */
export function readPersistedWallet(migrateAccount) {
  /** @type {Record<string, any>} */
  const wallet = {};
  try {
    const saved = JSON.parse(localStorage.getItem('kw_proto_v1') || "null");
    if (saved && saved.acc) {
      /** @type {Record<string, any>} */
      const acc = {};
      Object.keys(saved.acc).forEach((key) => {
        acc[key] = migrateAccount(saved.acc[key], saved.sellRecords || []);
      });
      wallet.acc = acc;
      wallet.records = saved.records || [];
      wallet.sellRecords = saved.sellRecords || [];
      wallet.events = saved.events || [];
      wallet.watchlist = saved.watchlist || [];
      if (saved.seq !== undefined && saved.seq !== null) wallet.seq = saved.seq;
    }
  } catch (e) {}
  return wallet;
}

/**
 * 지갑을 저장한다. `app.html` 의 `persist()` 가 쓰는 것과 **같은 칸**이라, 옮겨 온 화면에서
 * 예약 주문을 취소하면 아직 옮기지 않은 화면도 그 결과를 본다.
 *
 * 화면 상태는 저장하지 않는다 — 화면을 옮겨도 문서가 그대로라 메모리에 남아 있다.
 *
 * @param {Record<string, any>} wallet
 */
export function persistWallet(wallet) {
  try {
    localStorage.setItem('kw_proto_v1', JSON.stringify({
      acc: wallet.acc,
      records: wallet.records || [],
      sellRecords: wallet.sellRecords || [],
      events: wallet.events || [],
      seq: wallet.seq,
      watchlist: wallet.watchlist || [],
    }));
  } catch (e) {}
}

/**
 * 저장된 상태를 읽어 초기 상태에 덮을 조각으로 준다.
 *
 * **첫 렌더 전에** 불러야 한다. 예전에는 `componentDidMount` 에서 되살렸는데, 그러면 시드
 * 지갑이 한 프레임 먼저 그려졌다가 바뀐다.
 *
 * 화면 임시값은 더 이상 저장하지도 되살리지도 않는다 — 화면을 옮겨도 문서가 그대로라
 * 메모리 상태가 살아 있다. "F5 하면 처음부터"(F2 SPEC §6.2)는 진짜 새로고침에만 걸리는데,
 * 그때는 이 함수가 지갑만 되살리므로 화면은 홈에서 시작한다.
 *
 * 계좌 이관(`migrateAccount`)은 주문 엔진 몫이라 받아서 쓴다 — 이 파일은 import 를 못 쓴다.
 *
 * @param {(account: any, sellRecords: any[]) => any} migrateAccount
 * @returns {Record<string, any>}
 */
export function restorePrototypeState(migrateAccount) {
  return readPersistedWallet(migrateAccount);
}

/**
 * 총자산 = 현금 + 보유 평가액 + 매수 예약에 묶인 현금.
 *
 * 매수 예약 현금은 주문을 넣을 때 `cash` 에서 이미 빠져 있으므로 다시 더한다.
 * 매도 예약 수량은 `holdings` 에 그대로 남아 있어 보유 평가액에 이미 들어 있다 —
 * 여기서 또 더하면 두 번 센다.
 *
 * `priceOf(code)` 는 현재가를 준다. 모르는 종목은 0 으로 보고 넘어간다.
 *
 * @param {PrototypeAccount | null | undefined} account
 * @param {(code: string) => number} priceOf
 * @returns {number}
 */
export function accountTotalAsset(account, priceOf) {
  if (!account) return 0;
  const held = (account.holdings || []).reduce((sum, holding) => {
    const price = Number(priceOf(holding.code));
    return sum + (Number.isFinite(price) ? price * (Number(holding.qty) || 0) : 0);
  }, 0);
  const reserved = (account.pending || []).reduce((sum, order) => {
    if ((order.side || "buy") !== "buy") return sum;
    return sum + (Number(order.reservedAmount ?? order.amount) || 0);
  }, 0);
  return (Number(account.cash) || 0) + held + reserved;
}
