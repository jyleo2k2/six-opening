import assert from "node:assert/strict";
import { buildExploreCard, cardDots, exploreList, exploreTitle, emptyState } from "./explore-cards";
import type { Universe } from "./use-universe";

// 정렬·필터가 틀리면 "오늘 많이 오른 순"이 거짓말을 한다 — app.html 과 같은 판정이어야 한다.
const universe: Universe = {
  sectors: [
    { id: "game", name: "게임", emoji: "🎮", accent: "#8B5CF6" },
    { id: "semi", name: "반도체", emoji: "🔬", accent: "#5B7CFA" },
  ],
  stocks: [
    { code: "259960", name: "크래프톤", sector: "game", desc: "게임을 만들어", price: 100, change: 1.5 },
    { code: "005930", name: "삼성전자", sector: "semi", desc: "반도체를 만들어", price: 200, change: 3.2 },
    { code: "036570", name: "엔씨소프트", sector: "game", desc: "게임을 만들어", price: 150, change: -2.1 },
  ],
  logos: {},
};
const live = { quotes: { "005930": { price: 210, rate: 4.0 } }, sparks: { "005930": [10, 90] } };

// rank — 실시간 등락률 내림차순, 시세는 폴링 값이 픽스처를 덮는다.
const rank = exploreList(universe, live, "rank", "", []);
assert.deepEqual(rank.map((s) => s.code), ["005930", "259960", "036570"]);
assert.equal(rank[0].price, 210);
assert.deepEqual(rank[0].spark, [10, 90]);

// 섹터 필터.
assert.deepEqual(exploreList(universe, live, "game", "", []).map((s) => s.code), ["259960", "036570"]);

// 관심 필터는 담아둔 종목만.
assert.deepEqual(exploreList(universe, live, "watch", "", ["036570"]).map((s) => s.code), ["036570"]);

// 검색이 섹터·관심 선택보다 앞선다.
assert.deepEqual(exploreList(universe, live, "game", "삼성", ["036570"]).map((s) => s.code), ["005930"]);

// 별칭도 이름처럼 찾는다 — `shared/data/stocks`의 searchAliases를 그대로 쓴다(엔씨소프트 = "NC").
assert.deepEqual(exploreList(universe, live, "game", "nc", []).map((s) => s.code), ["036570"]);

// 자음만 쳐도(초성) 찾는다 — 삼성전자 = ㅅㅅㅈㅈ.
assert.deepEqual(exploreList(universe, live, "semi", "ㅅㅅㅈㅈ", []).map((s) => s.code), ["005930"]);

// 전체 — 업종끼리 묶여 구분 헤더를 세울 수 있다.
assert.deepEqual(exploreList(universe, live, "all", "", []).map((s) => s.code), [
  "259960",
  "036570",
  "005930",
]);

// 제목.
assert.equal(exploreTitle(universe, "all", "", 3), "");
assert.equal(exploreTitle(universe, "rank", "", 3), "");
assert.equal(exploreTitle(universe, "watch", "", 1), "관심 기업 1곳");
assert.equal(exploreTitle(universe, "game", "", 2), "게임 회사 2곳");
assert.equal(exploreTitle(universe, "game", "삼성", 1), '"삼성" 검색 결과');
// 칩을 펼친 동안은 무슨 필터든 제목을 비운다 — 칩 줄이 이미 말해준다.
assert.equal(exploreTitle(universe, "game", "", 2, true), "");

// 빈 상태 문구는 검색과 관심이 다르다.
assert.equal(emptyState("삼성").title, "찾는 회사가 없어요");
assert.equal(emptyState("").title, "아직 관심 기업이 없어요");

// 도트는 9개 창으로 자르고 현재 위치가 창 안에 있다.
assert.equal(cardDots(5, 0).length, 5);
assert.equal(cardDots(51, 25).length, 9);

// 세로 레일에서는 폭↔높이가 바뀐다 — 켜진 도트는 세로로 길다.
assert.match(cardDots(5, 0, "y")[0], /width:6px;height:18px/u);
assert.match(cardDots(5, 0)[0], /width:18px;height:6px/u);

// 카드 — 상승은 빨강, 로고 없으면 섹터 이모지, 등락률로 원화 변동폭을 되짚는다.
const up = buildExploreCard(rank, 0, universe, true, false);
assert.equal(up.lineColor, "#E8322E");
assert.equal(up.emoji, "🔬");
assert.equal(up.changeText, "▲ 8원");
assert.equal(up.changePctText, "+4.00%");
assert.equal(up.codeText, "005930 · KOSPI");
const down = buildExploreCard(rank, 2, universe, false, false);
assert.equal(down.lineColor, "#1668DC");
assert.match(down.slideStyle, /opacity:0\.72/u);
const bigList = [{ ...rank[0], price: 123_456_789 }];
const bigPrice = buildExploreCard(bigList, 0, universe, true, false);
assert.match(bigPrice.priceStyle, /font-size:36px/u);

// "전체" 보기에서만 업종이 바뀌는 첫 카드에 구분 헤더를 세우고, 맨 첫 카드는 선을 생략한다.
const all = exploreList(universe, live, "all", "", []);
const allCards = all.map((_, i) => buildExploreCard(all, i, universe, false, true));
assert.deepEqual(allCards.map((c) => c.groupShow), [true, false, true]);
assert.deepEqual(allCards.map((c) => c.groupShowLine), [false, false, true]);
const noGroup = buildExploreCard(all, 1, universe, false, false);
assert.equal(noGroup.groupShow, false);

console.log("explore cards tests passed");
