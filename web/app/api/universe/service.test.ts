import assert from "node:assert/strict";
import test from "node:test";
import { getUniverseSnapshot, renderUniverseScript } from "./service";

test("universe data provides backend quote and chart fallbacks for all stocks", async () => {
  const snapshot = await getUniverseSnapshot(null, false);

  assert.equal(Object.keys(snapshot.quotes).length, 51);
  assert.equal(Object.keys(snapshot.sparks).length, 51);
  assert.equal(snapshot.quotes["039490"].source, "fixture");
  assert.equal(snapshot.quotes["005930"].source, "fixture");
  assert.equal(snapshot.sparks["005930"].length, 16);
});

test("the compatibility script still initializes the PR UI contract", async () => {
  const script = await renderUniverseScript();

  assert.match(script, /window\.KW_UNIVERSE/);
  assert.match(script, /005930/);
});
