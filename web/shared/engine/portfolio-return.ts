/**
 * 보유 종목의 평가·원금·수익률. F9 아카이브 수익률 탭의 가족 달리기 트랙이 쓴다.
 *
 * 트랙은 가족 구성원끼리 수익률을 나란히 세우는 화면이라 **타인의 값도 계산**한다.
 * 그래서 금액(평가·원금·현금)과 비율(%)을 나눠서 돌려준다 — 서버는 본인에게만
 * 금액을 주고 타인에게는 `returnRate` 만 넘긴다 (F11 SPEC 마스킹 규칙).
 */

export type ReturnHolding = {
  symbol: string;
  quantity: number;
  averagePrice: number;
};

export type PortfolioReturn = {
  /** 현재가 × 수량 합계 */
  marketValue: number;
  /** 평균단가 × 수량 합계 */
  cost: number;
  /** 예수금 */
  cash: number;
  /** 평가차익 = marketValue − cost */
  profit: number;
  /** 수익률 % = profit / cost × 100. 원금이 0이면 0 */
  returnRate: number;
  /** 평가에 쓴 보유 종목 수 */
  valuedCount: number;
  /** 현재가를 못 구해 평균단가로 대신한 종목 수 */
  pricelessCount: number;
};

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * 현재가가 없는 종목은 평균단가로 평가한다 — 그 종목의 손익을 0으로 두는 것과 같다.
 * 임의로 빼면 원금만 줄어 수익률이 부풀기 때문에, 분자·분모에 같이 남긴다.
 */
export function computePortfolioReturn(
  holdings: readonly ReturnHolding[],
  priceBySymbol: Readonly<Record<string, number>>,
  cash: number,
): PortfolioReturn {
  let marketValue = 0;
  let cost = 0;
  let valuedCount = 0;
  let pricelessCount = 0;

  for (const holding of holdings) {
    const quantity = finite(holding.quantity);
    if (quantity <= 0) continue;
    const averagePrice = finite(holding.averagePrice);
    const quoted = finite(priceBySymbol[holding.symbol]);
    const price = quoted > 0 ? quoted : averagePrice;
    if (quoted > 0) valuedCount += 1;
    else pricelessCount += 1;
    marketValue += price * quantity;
    cost += averagePrice * quantity;
  }

  const profit = marketValue - cost;
  return {
    marketValue,
    cost,
    cash: finite(cash),
    profit,
    returnRate: cost > 0 ? (profit / cost) * 100 : 0,
    valuedCount,
    pricelessCount,
  };
}
