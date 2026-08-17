// 시드 지갑과 총자산 산식.
//
// **현금·보유의 원본은 서버다**(`/api/account` + `GET /api/orders`). 여기 있는
// `seedAccounts()` 는 로그인 응답이 오기 전과 서버를 못 읽었을 때의 자리이고,
// `accountTotalAsset()` 은 그 값을 총자산으로 접는 산식 한 벌이다. 산식이 화면마다
// 갈라지면 같은 지갑이 다른 값을 보이므로 여기 하나만 둔다.
//
// **브라우저 저장소는 쓰지 않는다.** `kw_proto_v1` 에 지갑·매매 기록·관심 종목을 담던
// 경로는 전부 서버로 옮겼다 — `/api/account`·`GET /api/trades`·`/api/watchlist`.

/**
 * 타입은 JSDoc 으로 단다 — 이 파일은 `.js` 이고 `.ts` 쪽에서 그대로 import 한다.
 *
 * @typedef {{ code: string, qty: number, avg: number, reservedQty?: number,
 *   availableQty?: number }} PrototypeHolding
 * @typedef {{ id?: string, side?: string, kind?: string, code?: string,
 *   amount?: number, qty?: number, reservedAmount?: number, reservedQty?: number }} PrototypePendingOrder
 * @typedef {{ name?: string, cash: number, reservedCash?: number, holdings: PrototypeHolding[],
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
 * 총자산 = 주문 가능 현금 + 보유 평가액 + 매수 예약에 묶인 현금.
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
  const reserved = Number.isFinite(account.reservedCash)
    ? Math.max(0, Number(account.reservedCash))
    : (account.pending || []).reduce((sum, order) => {
        if ((order.side || "buy") !== "buy") return sum;
        return sum + (Number(order.reservedAmount ?? order.amount) || 0);
      }, 0);
  return (Number(account.cash) || 0) + held + reserved;
}
