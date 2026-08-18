import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSeasonCardsCache,
  getSeasonCardsCached,
  invalidateSeasonCards,
  SEASON_CARDS_TTL_MS,
} from "./cache";

test("성향 카드 캐시는 ID 정규화·동시 병합·TTL·무효화를 처리한다", async () => {
  clearSeasonCardsCache();
  let now = 1_000;
  let loads = 0;
  const load = async () => ({ load: ++loads });
  const clock = () => now;

  const first = await getSeasonCardsCached([2, 1, 2], load, clock);
  const cached = await getSeasonCardsCached([1, 2], load, clock);
  assert.deepEqual(first, { load: 1 });
  assert.deepEqual(cached, { load: 1 });
  assert.equal(loads, 1);

  now += SEASON_CARDS_TTL_MS;
  const afterTtl = await getSeasonCardsCached([1, 2], load, clock);
  assert.deepEqual(afterTtl, { load: 2 });
  assert.equal(loads, 2);

  clearSeasonCardsCache();
  let resolvePending!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    resolvePending = resolve;
  });
  const firstPromise = getSeasonCardsCached([2, 1], () => {
    loads += 1;
    return pending;
  }, clock);
  const secondPromise = getSeasonCardsCached([1, 2], () => {
    loads += 1;
    return pending;
  }, clock);
  assert.strictEqual(firstPromise, secondPromise);
  resolvePending("shared");
  assert.equal(await firstPromise, "shared");
  assert.equal(loads, 3);

  invalidateSeasonCards([2]);
  await getSeasonCardsCached([1, 2], load, clock);
  assert.equal(loads, 4);

  clearSeasonCardsCache();
});
