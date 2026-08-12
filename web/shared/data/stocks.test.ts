import assert from "node:assert/strict";
import { SECTORS } from "./sectors";
import { findStock, STOCKS } from "./stocks";

assert.equal(STOCKS.length, 51);
assert.equal(SECTORS.length, 13);
assert.equal(new Set(STOCKS.map((stock) => stock.id)).size, STOCKS.length);
assert.equal(new Set(STOCKS.map((stock) => stock.symbol)).size, STOCKS.length);
assert.deepEqual(new Set(STOCKS.map((stock) => stock.sector)), new Set(SECTORS.map((sector) => sector.key)));

for (const stock of STOCKS) {
  assert.equal(stock.companySummary, "");
  assert.equal(stock.offerings.length, 0);
  assert.equal(stock.everydayTouchpoints.length, 0);
  assert.equal(stock.status, "draft");
}

assert.deepEqual(
  STOCKS.map((stock) => `${stock.symbol}:${stock.sector}`),
  [
    "259960:game", "036570:game", "251270:game", "192080:game",
    "000120:logistics", "011200:logistics", "086280:logistics",
    "005930:semiconductor", "000660:semiconductor", "066570:semiconductor",
    "064350:defense", "012450:defense", "079550:defense", "047810:defense",
    "003230:food", "271560:food", "097950:food", "004370:food",
    "015760:energy", "010950:energy", "078930:energy", "096770:energy",
    "047050:logistics",
    "352820:entertainment", "041510:entertainment", "035900:entertainment", "122870:entertainment",
    "021240:retail", "004170:retail", "282330:retail",
    "105560:finance", "039490:finance", "055550:finance", "086790:finance", "316140:finance",
    "402340:semiconductor",
    "000270:automotive", "005380:automotive",
    "089860:retail",
    "012330:automotive",
    "329180:shipbuilding", "009540:shipbuilding", "042660:shipbuilding", "010140:shipbuilding",
    "003490:airline", "020560:airline", "180640:airline",
    "278470:cosmetics", "090430:cosmetics", "483650:cosmetics", "051900:cosmetics",
  ],
);

const jyp = findStock("JYP");
assert.ok(jyp);
assert.equal(jyp.name, "JYP Ent.");

const samsung = findStock("삼성 전자");
assert.ok(samsung);
assert.equal(samsung.symbol, "005930");

console.log("stock data tests passed");
