import assert from "node:assert/strict";
import { SECTORS } from "./sectors";
import { findStock, STOCKS } from "./stocks";

assert.equal(STOCKS.length, 51);
assert.equal(SECTORS.length, 13);
assert.equal(new Set(STOCKS.map((stock) => stock.id)).size, STOCKS.length);
assert.equal(new Set(STOCKS.map((stock) => stock.symbol)).size, STOCKS.length);
assert.deepEqual(new Set(STOCKS.map((stock) => stock.sector)), new Set(SECTORS.map((sector) => sector.key)));

for (const stock of STOCKS) {
  assert.ok(stock.companySummary.length > 0);
  assert.ok(stock.offerings.length > 0);
  assert.ok(stock.everydayTouchpoints.length > 0);
  assert.equal(stock.status, "draft");
}

const jyp = findStock("JYP");
assert.ok(jyp);
assert.equal(jyp.name, "JYP Ent.");

const samsung = findStock("삼성 전자");
assert.ok(samsung);
assert.equal(samsung.symbol, "005930");

console.log("stock data tests passed");
