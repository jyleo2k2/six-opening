import assert from "node:assert/strict";
import {
  buildExploreCard,
  cardDots,
  emptyState,
  exploreList,
  hasManySectors,
  sectorChips,
} from "./explore-cards";
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

// 많이 오른 순 — 실시간 등락률 내림차순, 시세는 폴링 값이 픽스처를 덮는다.
const rank = exploreList(universe, live, "all", "", [], "change");
assert.deepEqual(rank.map((s) => s.code), ["005930", "259960", "036570"]);
assert.equal(rank[0].price, 210);
assert.deepEqual(rank[0].spark, [10, 90]);

// 섹터 필터 — 업종이 하나뿐이라 업종별 정렬은 유니버스 차례를 그대로 남긴다(안정 정렬).
assert.deepEqual(exploreList(universe, live, "game", "", []).map((s) => s.code), ["259960", "036570"]);

// 관심 필터는 담아둔 종목만.
assert.deepEqual(exploreList(universe, live, "watch", "", ["036570"]).map((s) => s.code), ["036570"]);

// 검색이 섹터·관심 선택보다 앞선다.
assert.deepEqual(exploreList(universe, live, "game", "삼성", ["036570"]).map((s) => s.code), ["005930"]);

// 별칭도 이름처럼 찾는다 — `shared/data/stocks`의 searchAliases를 그대로 쓴다(엔씨소프트 = "NC").
assert.deepEqual(exploreList(universe, live, "game", "nc", []).map((s) => s.code), ["036570"]);

// 자음만 쳐도(초성) 찾는다 — 삼성전자 = ㅅㅅㅈㅈ.
assert.deepEqual(exploreList(universe, live, "semi", "ㅅㅅㅈㅈ", []).map((s) => s.code), ["005930"]);

// 붙어 있지 않아도 순서만 맞으면 찾는다 — 엔씨소프트에서 "엔"(1번째)·"프"(4번째)를 그 순서로.
// 실제 서비스에서는 "SK하이닉스"→"하닉", "현대차"→"현차" 같은 준말이 이 규칙으로 걸린다.
assert.deepEqual(exploreList(universe, live, "game", "엔프", []).map((s) => s.code), ["036570"]);

// 순서가 뒤집히면 붙어 있어도 찾지 않는다.
assert.deepEqual(exploreList(universe, live, "game", "프엔", []), []);

// 업종별(기본) — 유니버스 업종 차례로 묶인다. 같은 업종 안에서는 원래 차례가 남는다.
assert.deepEqual(exploreList(universe, live, "all", "", []).map((s) => s.code), [
  "259960",
  "036570",
  "005930",
]);

// 가나다순 — 정렬은 필터와 다른 축이라 섹터를 골라도 같이 간다.
assert.deepEqual(exploreList(universe, live, "all", "", [], "name").map((s) => s.name), [
  "삼성전자",
  "엔씨소프트",
  "크래프톤",
]);
assert.deepEqual(exploreList(universe, live, "game", "", [], "name").map((s) => s.name), [
  "엔씨소프트",
  "크래프톤",
]);

// 업종 헤더는 목록에 업종이 둘 이상일 때만 세운다 — 섹터 하나를 고른 화면에서 세우면
// 이번에 걷어낸 "게임 회사 2곳" 제목이 그대로 되살아난다.
assert.equal(hasManySectors(exploreList(universe, live, "all", "", [])), true);
assert.equal(hasManySectors(exploreList(universe, live, "game", "", [])), false);
assert.equal(hasManySectors([]), false);

// 칩 줄 — 고른 섹터가 전체 바로 뒤로 올라오고 원래 자리에서는 빠진다. 목록 위 제목을
// 걷어냈으므로 이 자리가 "지금 무엇을 보고 있는지"를 말하는 유일한 곳이다.
assert.deepEqual(sectorChips(universe, "semi").map((chip) => chip.id), [
  "all",
  "semi",
  "watch",
  "game",
]);
// 섹터가 아닌 필터에는 끌어올릴 칩이 없다.
assert.deepEqual(sectorChips(universe, "all").map((chip) => chip.id), ["all", "watch", "game", "semi"]);

// 고른 칩은 채워진 배경 위 흰 글자다. `background` 선언이 깨져 있으면 흰 글자만 남아 안 보인다.
const picked = sectorChips(universe, "semi").find((chip) => chip.id === "semi")!;
assert.match(picked.style, /background:#F5327F;/u);
assert.match(picked.style, /color:#FFFFFF/u);
assert.equal(picked.active, true);

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

// `showGroups` 를 켠 목록에서만 업종이 바뀌는 첫 카드에 구분 헤더를 세우고, 맨 첫 카드는
// 위에 아무것도 없으니 선을 생략한다. 켤지 말지는 화면이 정렬을 보고 정한다.
const all = exploreList(universe, live, "all", "", []);
const allCards = all.map((_, i) => buildExploreCard(all, i, universe, false, true));
assert.deepEqual(allCards.map((c) => c.groupShow), [true, false, true]);
assert.deepEqual(allCards.map((c) => c.groupShowLine), [false, false, true]);
const noGroup = buildExploreCard(all, 1, universe, false, false);
assert.equal(noGroup.groupShow, false);

console.log("explore cards tests passed");
