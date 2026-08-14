import assert from "node:assert/strict";
import test from "node:test";
import {
  ABILITY_ORDER,
  ACCURACY_PLACEHOLDER,
  computeAbilityScores,
  resolveCharacter,
} from "./archive-profile.js";

const SECTORS: Record<string, string> = {
  "259960": "game",
  "036570": "game",
  "005930": "semiconductor",
  "010140": "shipbuilding",
  "003490": "airline",
};
const sectorOf = (symbol: string) => SECTORS[symbol] ?? null;
const buy = (symbol: string, reason_code: string) => ({ symbol, reason_code });

test("기록이 없으면 근거 0, 집중은 최고값", () => {
  const out = computeAbilityScores([], sectorOf);
  assert.equal(out.count, 0);
  assert.equal(out.evidencePct, 0);
  assert.deepEqual(out.scores, [100, 0, ACCURACY_PLACEHOLDER, 100, 0]);
});

test("보완쌍은 합이 100 이다", () => {
  const out = computeAbilityScores(
    [buy("259960", "buy_news"), buy("005930", "buy_feeling"), buy("010140", "buy_chart")],
    sectorOf,
  );
  assert.equal(out.scores[0] + out.scores[1], 100);
  assert.equal(out.scores[3] + out.scores[4], 100);
  assert.equal(ABILITY_ORDER.length, out.scores.length);
});

test("섹터가 늘수록 집중이 22씩 내려간다", () => {
  const one = computeAbilityScores([buy("259960", "buy_news"), buy("036570", "buy_news")], sectorOf);
  const two = computeAbilityScores([buy("259960", "buy_news"), buy("005930", "buy_news")], sectorOf);
  const three = computeAbilityScores(
    [buy("259960", "buy_news"), buy("005930", "buy_news"), buy("010140", "buy_news")],
    sectorOf,
  );
  assert.equal(one.focus, 100);
  assert.equal(two.focus, 78);
  assert.equal(three.focus, 56);
});

test("집중은 0 아래로 내려가지 않는다", () => {
  const many = Array.from({ length: 6 }, (_, i) => buy(`s${i}`, "buy_news"));
  const out = computeAbilityScores(many, (symbol) => `sector-${symbol}`);
  assert.equal(out.focus, 0);
  assert.equal(out.scores[1], 100);
});

test("섹터를 모르는 종목은 섹터 수에 넣지 않는다", () => {
  const out = computeAbilityScores([buy("없는코드", "buy_news")], sectorOf);
  assert.equal(out.focus, 100);
});

test("근거 비율은 반올림한다", () => {
  const out = computeAbilityScores(
    [buy("259960", "buy_news"), buy("036570", "buy_feeling"), buy("259960", "buy_hot")],
    sectorOf,
  );
  assert.equal(out.evidencePct, 33);
  assert.equal(out.scores[4], 33);
  assert.equal(out.scores[3], 67);
});

test("캐릭터는 두 보완쌍의 우세로 정하고 동점은 근거·집중 쪽이다", () => {
  const at = (focus: number, evidence: number) => [focus, 100 - focus, 50, 100 - evidence, evidence];
  assert.equal(resolveCharacter(at(80, 80)).key, "sniper");
  assert.equal(resolveCharacter(at(20, 80)).key, "strategist");
  assert.equal(resolveCharacter(at(80, 20)).key, "fighter");
  assert.equal(resolveCharacter(at(20, 20)).key, "explorer");
  assert.equal(resolveCharacter(at(50, 50)).key, "sniper");
});

test("레벨은 정확 40·70 을 경계로 나뉜다", () => {
  const withAccuracy = (accuracy: number) => [100, 0, accuracy, 0, 100];
  assert.equal(resolveCharacter(withAccuracy(39)).level, 1);
  assert.equal(resolveCharacter(withAccuracy(40)).level, 2);
  assert.equal(resolveCharacter(withAccuracy(69)).level, 2);
  assert.equal(resolveCharacter(withAccuracy(70)).level, 3);
});

test("정확 기본값은 레벨 2 다", () => {
  assert.equal(resolveCharacter(computeAbilityScores([], sectorOf).scores).level, 2);
});
