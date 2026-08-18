import assert from "node:assert/strict";
import test from "node:test";
import { isOnTick, snapToTick, tickSize } from "./tick-size";

test("호가단위: KOSPI 구간 경계는 '이상'이다", () => {
  // 경계 바로 아래는 아직 아래 단위다. 여기서 한 칸이라도 밀리면 51종목 중
  // 20만원 언저리(삼성전자·크래프톤·LG전자…)가 통째로 틀린다.
  assert.equal(tickSize(1_999, "KOSPI"), 1);
  assert.equal(tickSize(2_000, "KOSPI"), 5);
  assert.equal(tickSize(4_999, "KOSPI"), 5);
  assert.equal(tickSize(5_000, "KOSPI"), 10);
  assert.equal(tickSize(19_999, "KOSPI"), 10);
  assert.equal(tickSize(20_000, "KOSPI"), 50);
  assert.equal(tickSize(49_999, "KOSPI"), 50);
  assert.equal(tickSize(50_000, "KOSPI"), 100);
  assert.equal(tickSize(199_999, "KOSPI"), 100);
  assert.equal(tickSize(200_000, "KOSPI"), 500);
  assert.equal(tickSize(499_999, "KOSPI"), 500);
  assert.equal(tickSize(500_000, "KOSPI"), 1_000);
});

test("호가단위: KOSDAQ 은 5만원 위로 100원 하나뿐이라 20만원부터 갈린다", () => {
  // 5만원 아래는 두 시장이 같다.
  assert.equal(tickSize(19_999, "KOSDAQ"), 10);
  assert.equal(tickSize(20_000, "KOSDAQ"), 50);
  assert.equal(tickSize(49_999, "KOSDAQ"), 50);
  // 여기부터 KOSPI 와 갈린다. 에스엠·JYP·와이지가 이 표를 탄다.
  assert.equal(tickSize(50_000, "KOSDAQ"), 100);
  assert.equal(tickSize(200_000, "KOSDAQ"), 100);
  assert.equal(tickSize(200_000, "KOSPI"), 500);
  assert.equal(tickSize(1_000_000, "KOSDAQ"), 100);
  assert.equal(tickSize(1_000_000, "KOSPI"), 1_000);
});

test("스냅: 매수는 내리고 매도는 올린다", () => {
  // 삼성전자 270,750원의 -3%(262,627.5원)와 +3%(278,872.5원). 500원 단위다.
  assert.equal(snapToTick(262_627.5, "KOSPI", "down"), 262_500);
  assert.equal(snapToTick(278_872.5, "KOSPI", "up"), 279_000);
  // 이미 단위에 맞는 값은 어느 방향이든 그대로 둔다 — `지금값` 이 흔들리면 안 된다.
  assert.equal(snapToTick(270_500, "KOSPI", "down"), 270_500);
  assert.equal(snapToTick(270_500, "KOSPI", "up"), 270_500);
});

test("스냅: 구간 경계를 넘어도 결과가 유효 호가다", () => {
  // 단위는 **받은 가격**에서 고른다. 내려서 아래 구간에 떨어져도 큰 단위의 배수는
  // 언제나 작은 단위의 배수라 유효하다.
  const cases: readonly [number, Parameters<typeof snapToTick>[2]][] = [
    [200_100, "down"],
    [199_950, "up"],
    [500_100, "down"],
    [499_999, "up"],
    [50_050, "down"],
    [49_999, "up"],
    [20_010, "down"],
    [19_999, "up"],
    [5_001, "down"],
    [4_999, "up"],
    [2_001, "down"],
    [1_999, "up"],
  ];
  for (const [price, dir] of cases) {
    const snapped = snapToTick(price, "KOSPI", dir);
    assert.equal(isOnTick(snapped, "KOSPI"), true, `${price} ${dir} → ${snapped}`);
    if (dir === "down") assert.ok(snapped <= price, `${price} → ${snapped}`);
    else assert.ok(snapped >= price, `${price} → ${snapped}`);
  }
});

test("스냅: 내림이 0 으로 떨어지지 않는다", () => {
  // 아시아나항공(6,930원)에서 -100% 같은 값이 들어와도 살 수 없는 0원을 내지 않는다.
  // 4원은 1원 단위 구간이라 그대로 4원이 맞다 — 한 틱 아래로 내려갈 때만 바닥이 걸린다.
  assert.equal(snapToTick(4, "KOSPI", "down"), 4);
  assert.equal(snapToTick(0.4, "KOSPI", "down"), 1);
  assert.equal(snapToTick(0, "KOSPI", "down"), 0);
  assert.equal(snapToTick(-1, "KOSPI", "down"), 0);
  assert.equal(snapToTick(Number.NaN, "KOSPI", "up"), 0);
});

test("판정: 소수·0·음수는 접수할 수 없는 가격이다", () => {
  // 화면이 내는 값은 정수지만 게이트는 API 로도 들어온다.
  assert.equal(isOnTick(262_500, "KOSPI"), true);
  assert.equal(isOnTick(262_385, "KOSPI"), false);
  assert.equal(isOnTick(262_500.5, "KOSPI"), false);
  assert.equal(isOnTick(0, "KOSPI"), false);
  assert.equal(isOnTick(-500, "KOSPI"), false);
  assert.equal(isOnTick(Number.NaN, "KOSPI"), false);
  // 같은 값이 시장에 따라 갈린다 — 에스엠이 20만원을 넘으면 이 줄이 산다.
  assert.equal(isOnTick(200_100, "KOSDAQ"), true);
  assert.equal(isOnTick(200_100, "KOSPI"), false);
});
