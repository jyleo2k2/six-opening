import assert from "node:assert/strict";
import test from "node:test";
import {
  ABILITY_ORDER,
  ACCURACY_PLACEHOLDER,
  computeAbilityScores,
  gradeAccuracy,
  kstDateOf,
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

test("레벨은 적중 비율 1/3·2/3 을 경계로 나뉜다", () => {
  const withAccuracy = (accuracy: number) => [100, 0, accuracy, 0, 100];
  assert.equal(resolveCharacter(withAccuracy(33)).level, 1);
  assert.equal(resolveCharacter(withAccuracy(34)).level, 2);
  assert.equal(resolveCharacter(withAccuracy(66)).level, 2);
  assert.equal(resolveCharacter(withAccuracy(67)).level, 3);
});

test("채점 결과가 있으면 그 레벨을 그대로 쓴다", () => {
  const scores = [100, 0, 80, 0, 100];
  assert.equal(resolveCharacter(scores, 1).level, 1);
  assert.equal(resolveCharacter(scores).level, 3);
});

test("정확 기본값은 레벨 2 다", () => {
  assert.equal(resolveCharacter(computeAbilityScores([], sectorOf).scores).level, 2);
});

// ── 정확 채점 ────────────────────────────────────────────────────────
const closes = (...pairs: [string, number][]) => pairs.map(([date, close]) => ({ date, close }));
// 8/3 에 사면 다음 거래일부터 다섯 번째인 8/10 종가로 채점한다.
const WEEK = closes(
  ["2026-08-03", 100],
  ["2026-08-04", 101],
  ["2026-08-05", 102],
  ["2026-08-06", 103],
  ["2026-08-07", 104],
  ["2026-08-10", 120],
  ["2026-08-11", 121],
);
const buyAt = (date: string, price: number) => ({ symbol: "A", price, tradedAt: `${date}T01:00:00.000Z` });
const sellAt = (date: string) => ({ symbol: "A", tradedAt: `${date}T01:00:00.000Z` });

test("매수는 5거래일 뒤 종가가 체결가보다 높으면 적중", () => {
  const hit = gradeAccuracy([buyAt("2026-08-03", 100)], [], { A: WEEK });
  assert.deepEqual([hit.graded, hit.hits, hit.pending], [1, 1, 0]);
  assert.equal(hit.accuracy, 100);
  assert.equal(hit.level, 3);

  const miss = gradeAccuracy([buyAt("2026-08-03", 130)], [], { A: WEEK });
  assert.deepEqual([miss.graded, miss.hits], [1, 0]);
  assert.equal(miss.accuracy, 0);
  assert.equal(miss.level, 1);
});

test("매도는 5거래일 뒤 종가가 매도일 종가보다 낮으면 적중", () => {
  const falling = closes(
    ["2026-08-03", 100],
    ["2026-08-04", 99],
    ["2026-08-05", 98],
    ["2026-08-06", 97],
    ["2026-08-07", 96],
    ["2026-08-10", 80],
  );
  const hit = gradeAccuracy([], [sellAt("2026-08-03")], { A: falling });
  assert.deepEqual([hit.graded, hit.hits], [1, 1]);

  const miss = gradeAccuracy([], [sellAt("2026-08-03")], { A: WEEK });
  assert.deepEqual([miss.graded, miss.hits], [1, 0]);
});

test("5거래일이 안 지났으면 채점하지 않고 보류한다", () => {
  const short = closes(["2026-08-03", 100], ["2026-08-04", 101]);
  const out = gradeAccuracy([buyAt("2026-08-03", 100)], [], { A: short });
  assert.deepEqual([out.graded, out.pending], [0, 1]);
  assert.equal(out.accuracy, 50);
  assert.equal(out.level, 2);
});

test("종가가 없는 종목은 보류로 빠진다", () => {
  const out = gradeAccuracy([{ symbol: "없음", price: 100, tradedAt: "2026-08-03T01:00:00.000Z" }], [], {});
  assert.deepEqual([out.graded, out.pending], [0, 1]);
});

test("적중률은 채점된 거래만으로 낸다", () => {
  const short = closes(["2026-08-03", 100]);
  const out = gradeAccuracy(
    [buyAt("2026-08-03", 100), { symbol: "B", price: 100, tradedAt: "2026-08-03T01:00:00.000Z" }],
    [],
    { A: WEEK, B: short },
  );
  assert.deepEqual([out.graded, out.hits, out.pending], [1, 1, 1]);
  assert.equal(out.accuracy, 100);
});

test("채점 결과가 다섯 축의 정확 자리에 들어간다", () => {
  const grade = gradeAccuracy([buyAt("2026-08-03", 100)], [], { A: WEEK });
  const out = computeAbilityScores([buy("259960", "buy_news")], sectorOf, grade.accuracy);
  assert.equal(out.scores[2], 100);
});

test("kstDateOf 는 UTC 시각을 KST 날짜로 옮긴다", () => {
  assert.equal(kstDateOf("2026-08-03T16:00:00.000Z"), "2026-08-04");
  assert.equal(kstDateOf("2026-08-03T14:59:00.000Z"), "2026-08-03");
});
