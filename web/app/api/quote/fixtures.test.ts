import assert from "node:assert/strict";
import test from "node:test";
import { STOCKS } from "../../../shared/data/stocks";
import { getQuoteFixture, getQuoteFixtures } from "./fixtures";

test("PR UI quote fixtures cover the approved 51-stock universe", async () => {
  const fixtures = await getQuoteFixtures();

  assert.equal(fixtures.size, STOCKS.length);
  assert.deepEqual(
    [...fixtures.keys()].sort(),
    STOCKS.map((stock) => stock.symbol).sort(),
  );
});

test("a fixture exposes price, rate, change and a deterministic chart", async () => {
  const fixture = await getQuoteFixture("005930");

  assert.ok(fixture);
  assert.equal(fixture.symbol, "005930");
  assert.equal(fixture.name, "삼성전자");
  assert.ok(fixture.price > 0);
  assert.ok(Number.isFinite(fixture.change));
  assert.ok(Number.isFinite(fixture.rate));
  assert.equal(fixture.chart.length, 16);
  assert.equal(fixture.chart.at(-1), fixture.price);
});

