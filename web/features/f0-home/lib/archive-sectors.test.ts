import assert from "node:assert/strict";
import { sectorCards } from "./archive-sectors";

// 005930 삼성전자·000660 SK하이닉스 = 반도체, 005380 현대차 = 자동차.
const prices = { "005930": 120000, "000660": 200000, "005380": 90000 };

// ── 같은 섹터는 한 칸으로 합친다 ────────────────────────────────────────
const cards = sectorCards(
  [
    { code: "005930", qty: 2, avg: 100000 }, // 평가 240,000 / 원금 200,000
    { code: "000660", qty: 1, avg: 250000 }, // 평가 200,000 / 원금 250,000
    { code: "005380", qty: 3, avg: 60000 }, // 평가 270,000 / 원금 180,000
  ],
  prices,
);

// 반도체 440,000 > 자동차 270,000.
assert.deepEqual(cards.map((c) => c.id), ["semiconductor", "automotive"], "평가액 큰 분야가 앞이다");

// 반도체는 두 종목이 한 칸으로 합쳐지고 **합계로** 손익을 낸다 — 종목별 수익률의
// 평균이 아니다. 평가 440,000 / 원금 450,000 → -2.2%.
const semi = cards[0];
assert.equal(semi.name, "반도체");
assert.equal(semi.emoji, "반");
assert.equal(semi.countText, "2개 종목");
assert.equal(semi.valueText, "440,000원");
assert.equal(semi.pctText, "−2.2%");
assert.equal(semi.positive, false);

const auto = cards[1];
assert.equal(auto.countText, "1개 종목");
assert.equal(auto.valueText, "270,000원");
assert.equal(auto.pctText, "+50.0%");
assert.equal(auto.positive, true);

// ── 셀 수 없는 것은 세지 않는다 ─────────────────────────────────────────
// 유니버스에 없는 종목은 이름도 섹터도 댈 수 없어 어느 칸에도 들어가지 않는다.
assert.deepEqual(sectorCards([{ code: "999999", qty: 5, avg: 1000 }], prices), []);
assert.deepEqual(sectorCards([], prices), []);

// 시세를 아직 못 받은 종목은 평가액 0 이다. 칸은 생기고 원금만큼 마이너스로 잡힌다.
const noPrice = sectorCards([{ code: "005930", qty: 1, avg: 100000 }], {});
assert.equal(noPrice[0].valueText, "0원");
assert.equal(noPrice[0].pctText, "−100.0%");

// 원금이 0 이면 0 으로 나누지 않고 0% 로 둔다.
const freeShares = sectorCards([{ code: "005930", qty: 1, avg: 0 }], prices);
assert.equal(freeShares[0].pctText, "+0.0%");

// ── 순서가 렌더마다 흔들리지 않는다 ────────────────────────────────────
// 평가액이 같으면 이름순이다. 레일이 다시 그려질 때마다 카드가 자리를 바꾸면 안 된다.
const tied = sectorCards(
  [
    { code: "005380", qty: 1, avg: 1 }, // 자동차 90,000
    { code: "005930", qty: 0.75, avg: 1 }, // 반도체 90,000
  ],
  prices,
);
assert.deepEqual(tied.map((c) => c.name), ["반도체", "자동차"]);

console.log("archive sector rail tests passed");
