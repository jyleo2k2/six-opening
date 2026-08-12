import assert from "node:assert/strict";
import { stocks, stockBySymbol } from "./stocks";
import type { Stock } from "@/shared/types";

/**
 * 통합문서 v2.9 §10 확정 51종. 자동 선발 49 + 수기 편입 2.
 * 목록을 바꾸려면 통합문서를 먼저 고친다.
 */
const EXPECTED_BY_SECTOR: Record<string, readonly string[]> = {
  식품: ["003230", "271560", "097950", "004370"],
  게임: ["259960", "036570", "251270", "192080"],
  엔터: ["352820", "041510", "035900", "122870"],
  자동차: ["000270", "005380", "012330"],
  반도체: ["005930", "066570", "000660", "402340"],
  화장품: ["278470", "090430", "483650", "051900"],
  유통: ["021240", "089860", "004170", "282330"],
  항공: ["003490", "020560", "180640"],
  방산: ["064350", "012450", "079550", "047810"],
  "은행·금융": ["105560", "055550", "086790", "316140", "039490"],
  에너지: ["015760", "010950", "078930", "096770"],
  물류: ["000120", "011200", "086280", "047050"],
  조선: ["329180", "009540", "042660", "010140"],
};

const expected = Object.values(EXPECTED_BY_SECTOR).flat();

assert.equal(expected.length, 51, "확정 종목은 51종이다");
assert.equal(new Set(expected).size, 51, "종목 코드에 중복이 없다");
assert.equal(stocks.length, 51);

// 섹터별 배분 — v2.9는 3~5종목이며 은행·금융만 5종이다.
for (const [sector, symbols] of Object.entries(EXPECTED_BY_SECTOR)) {
  const actual = stocks.filter((stock: Stock) => stock.sector === sector).map((stock: Stock) => stock.symbol);
  assert.deepEqual(actual, symbols, `${sector} 섹터 구성이 다르다`);
  assert.ok(symbols.length >= 3 && symbols.length <= 5, `${sector} 섹터는 3~5종목이어야 한다`);
}
assert.equal(Object.keys(EXPECTED_BY_SECTOR).length, 13, "섹터는 13개다");

// v2.8에서 빠진 종목이 되살아나지 않았는지 확인한다.
for (const removed of ["002320", "007070", "007310", "011070", "023530", "035760", "089590", "139480", "161390", "323410", "263750", "035250"]) {
  assert.equal(stockBySymbol.has(removed), false, `제외 종목이 남아 있다: ${removed}`);
}

// 수기 편입 2종은 반드시 들어 있어야 한다 (v2.9 §10).
for (const manual of ["122870", "039490"]) {
  assert.ok(stockBySymbol.has(manual), `수기 편입 종목이 빠졌다: ${manual}`);
}

// 픽스처 무결성 — 모든 종목이 이름·차트·가격을 갖는다.
for (const stock of stocks) {
  assert.ok(stock.name.length > 0, `${stock.symbol} 이름 없음`);
  assert.ok(stock.price > 0, `${stock.symbol} 가격 비정상`);
  assert.ok(stock.chart.length > 1, `${stock.symbol} 차트 데이터 부족`);
  assert.equal(stockBySymbol.get(stock.symbol)?.symbol, stock.symbol);
}

console.log("stock universe tests passed");
