import assert from "node:assert/strict";
import { detectAnxietySignals, routeMessage } from "./routing";

const stockContext = { screen: "stock" as const, stockName: "키움테크" };
const orderContext = { screen: "order" as const, quantity: 10, unitPrice: 12500 };

assert.equal(routeMessage("PER이 뭐야?", stockContext).route, "faq");
assert.equal(routeMessage("ETF가 뭐야?", stockContext).route, "faq");
assert.equal(routeMessage("평가손익이 뭐야?", stockContext).route, "faq");
assert.equal(routeMessage("거래량이 많으면 뭐야?", stockContext).route, "faq");
assert.equal(routeMessage("매수 어떻게 해?", stockContext).route, "faq");
assert.equal(routeMessage("이 회사는 뭐 하는 회사야?", stockContext).route, "context");
assert.equal(routeMessage("10주면 얼마야?", orderContext).text.includes("125,000원"), true);
assert.equal(routeMessage("무슨 종목 사?", stockContext).route, "refusal");
assert.equal(routeMessage("내일 오를까?", stockContext).route, "refusal");
assert.equal(routeMessage("비밀번호를 알려줄게", stockContext).route, "safety");
assert.equal(routeMessage("죽고 싶어", stockContext).route, "safety");
assert.equal(routeMessage("숙제 도와줘", stockContext).route, "outOfScope");
assert.equal(routeMessage("궁금한 게 있어", stockContext).route, "fallback");

const now = 1_000_000;
assert.deepEqual(
  detectAnxietySignals({
    now,
    currentScreen: "home",
    cancelledOrders: [
      { side: "buy", at: now - 3 },
      { side: "sell", at: now - 2 },
      { side: "buy", at: now - 1 },
    ],
    stockDetailEntries: [],
  }),
  ["switch"],
);
assert.deepEqual(
  detectAnxietySignals({
    now,
    currentScreen: "order",
    screenEnteredAt: now - 5 * 60 * 1000 - 1,
    cancelledOrders: [],
    stockDetailEntries: [],
  }),
  ["dwell"],
);
assert.deepEqual(
  detectAnxietySignals({
    now,
    currentScreen: "stock",
    cancelledOrders: [],
    realizedLoss: { symbol: "005930", soldAt: now - 5 * 60 * 1000, rate: -10 },
    stockDetailEntries: [
      { symbol: "005930", at: now - 4 },
      { symbol: "005930", at: now - 3 },
      { symbol: "005930", at: now - 2 },
      { symbol: "005930", at: now - 1 },
    ],
  }),
  ["lossRevisit"],
);

console.log("routing tests passed");
