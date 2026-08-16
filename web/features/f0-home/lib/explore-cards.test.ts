import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildExploreCard,
  cardDots,
  emptyState,
  exploreList,
  hasManySectors,
  showSectorGroups,
  stackOffset,
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

// "오늘 많이 오른 순"은 카테고리다 — 전체 종목을 실시간 등락률 내림차순으로 세우고,
// 시세는 폴링 값이 픽스처를 덮는다(삼성전자 3.2% → 4.0% 라 맨 앞이다).
const rank = exploreList(universe, live, "rank", "", []);
assert.deepEqual(rank.map((s) => s.code), ["005930", "259960", "036570"]);
assert.equal(rank[0].price, 210);
assert.deepEqual(rank[0].spark, [10, 90]);
// 보는 종목은 `전체` 와 같다. 다른 것은 줄 세우는 차례뿐이다.
assert.deepEqual(
  [...rank.map((s) => s.code)].sort(),
  [...exploreList(universe, live, "all", "", []).map((s) => s.code)].sort(),
);

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

// 이름을 줄여 표시하는 종목(079550 = LIG D&A)은 풀네임·영문·옛 이름 어느 쪽으로 쳐도 찾아야 한다.
// 화면에 뜨는 이름 하나만 보고 검색하면 아이는 아는 이름(풀네임)으로 못 찾는다.
const defenseUniverse: Universe = {
  sectors: [{ id: "defense", name: "방산", emoji: "🛡️", accent: "#4E5C78" }],
  stocks: [
    { code: "079550", name: "LIG D&A", sector: "defense", desc: "미사일 같은 걸 만들어요", price: 815000, change: -2.63 },
  ],
  logos: {},
};
const noLive = { quotes: {}, sparks: {} };
for (const query of [
  "LIG디펜스앤에어로스페이스",
  "LIG 디펜스앤에어로스페이스",
  "LIG Defense&Aerospace",
  "LIG D&A",
  "lig d&a",
  "디펜스",
  "LIG넥스원",
  // 이름에 한글이 없어도 별칭 초성으로 걸린다 — 디펜스 = ㄷㅍㅅ.
  "ㄷㅍㅅ",
]) {
  assert.deepEqual(
    exploreList(defenseUniverse, noLive, "all", query, []).map((s) => s.code),
    ["079550"],
    `"${query}" 검색이 079550 을 찾지 못해`,
  );
}

// 업종별(기본) — 유니버스 업종 차례로 묶인다. 같은 업종 안에서는 원래 차례가 남는다.
assert.deepEqual(exploreList(universe, live, "all", "", []).map((s) => s.code), [
  "259960",
  "036570",
  "005930",
]);

// 업종 헤더는 목록에 업종이 둘 이상일 때만 세운다 — 섹터 하나를 고른 화면에서 세우면
// 이번에 걷어낸 "게임 회사 2곳" 제목이 그대로 되살아난다.
assert.equal(hasManySectors(exploreList(universe, live, "all", "", [])), true);
assert.equal(hasManySectors(exploreList(universe, live, "game", "", [])), false);
assert.equal(hasManySectors([]), false);

// "오늘 많이 오른 순"은 업종이 여럿 섞여 있어도 헤더를 세우지 않는다 — 등락률로 줄을
// 세운 목록이라 같은 업종이 흩어지고, 헤더가 곳곳에 서면 없는 묶음을 있다고 말한다.
assert.equal(showSectorGroups("all", exploreList(universe, live, "all", "", [])), true);
assert.equal(showSectorGroups("rank", rank), false);
assert.equal(showSectorGroups("game", exploreList(universe, live, "game", "", [])), false);

// 칩 줄 — **무엇을 골라도 순서가 같다.** 원본 프로토타입처럼 고른 칩은 자리를 옮기지 않고
// 점등만 한다. 끌어올리면 누르는 순간 그 칩이 손가락 밑에서 튀고 옆 칩들이 밀린다.
// "오늘 많이 오른 순"은 `전체` 와 `관심 기업` 사이 둘째 자리에 선다.
const ORDER = ["all", "rank", "watch", "game", "semi"];
assert.deepEqual(sectorChips(universe, "all").map((chip) => chip.id), ORDER);
assert.deepEqual(sectorChips(universe, "semi").map((chip) => chip.id), ORDER);
assert.deepEqual(sectorChips(universe, "game").map((chip) => chip.id), ORDER);
assert.deepEqual(sectorChips(universe, "watch").map((chip) => chip.id), ORDER);
assert.equal(sectorChips(universe, "all")[1].name, "오늘 많이 오른 순");
// 필터 칩은 고른 하나만 켜진다.
assert.deepEqual(sectorChips(universe, "semi").map((chip) => chip.active), [
  false,
  false,
  false,
  false,
  true,
]);
// "오늘 많이 오른 순"도 다른 칩과 같은 규칙이다 — 고르면 그 칩만 켜지고 `전체` 는 꺼진다.
assert.deepEqual(sectorChips(universe, "rank").map((chip) => chip.active), [
  false,
  true,
  false,
  false,
  false,
]);
// 꺼진 칩은 흰 배경 위 회색 글자, 켜진 칩은 분홍 배경 위 흰 글자다.
const rankOff = sectorChips(universe, "all")[1];
assert.equal(rankOff.active, false);
assert.match(rankOff.style, /background:#FFFFFF/u);
assert.match(rankOff.style, /color:#5C6280/u);
const rankOn = sectorChips(universe, "rank")[1];
assert.match(rankOn.style, /background:#F5327F;/u);
assert.match(rankOn.style, /color:#FFFFFF/u);

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
const up = buildExploreCard(rank, 0, universe, 0, false);
assert.equal(up.lineColor, "#E8322E");
assert.equal(up.emoji, "🔬");
assert.equal(up.changeText, "▲ 8원");
assert.equal(up.changePctText, "+4.00%");
assert.equal(up.codeText, "005930 · KOSPI");
const down = buildExploreCard(rank, 2, universe, 0, false);
assert.equal(down.lineColor, "#1668DC");
const bigList = [{ ...rank[0], price: 123_456_789 }];
const bigPrice = buildExploreCard(bigList, 0, universe, 0, false);
assert.match(bigPrice.priceStyle, /font-size:36px/u);

// 로고 — 가로만 84px 로 잡고 세로는 원본 비율에 맡긴다. 정사각으로 못 박으면 가로형
// 원본(에이피알·LG·S-Oil …)이 세로로 늘어난다.
assert.equal(up.hasLogo, false);
assert.doesNotMatch(up.artStyle, /url\(/u);
const withLogo = buildExploreCard(rank, 0, { ...universe, logos: { "005930": "assets/logos/005930.png" } }, 0, false);
assert.equal(withLogo.hasLogo, true);
assert.match(withLogo.artStyle, /url\(\/ui\/assets\/logos\/005930\.png\) center\/84px auto no-repeat,/u);

// 입체 스택 — 중앙에서 멀어진 칸수가 눕는 양을, 방향이 회전축을 정한다.
assert.deepEqual(stackOffset(4, 4), { signed: 0, steps: 0 });
assert.deepEqual(stackOffset(6, 4), { signed: 2, steps: 2 });
assert.deepEqual(stackOffset(2, 4), { signed: -2, steps: 2 });
// 51장짜리 목록에서도 끝 카드가 뒤집히지 않게 3칸에서 자른다.
assert.deepEqual(stackOffset(50, 0), { signed: 3, steps: 3 });
assert.deepEqual(stackOffset(0, 50), { signed: -3, steps: 3 });

// 활성 카드는 눕지 않고, 아래 카드는 윗변을 축으로 뒤로 눕는다(각도가 음수).
assert.match(up.slideStyle, /rotateX\(-?0\.00deg\) translateZ\(-?0\.0px\) scale\(1\.000\)/u);
assert.match(up.slideStyle, /transform-origin:50% 50%/u);
assert.match(up.slideStyle, /opacity:1;/u);
assert.match(down.slideStyle, /perspective\(1150px\) rotateX\(-22\.00deg\)/u);
assert.match(down.slideStyle, /translateZ\(-92\.0px\) scale\(0\.910\)/u);
assert.match(down.slideStyle, /transform-origin:50% 0%/u);
assert.match(down.slideStyle, /opacity:0\.55/u);
// 위쪽 카드는 반대 축이어야 활성 카드에서 멀어지는 쪽으로 눕는다.
const above = buildExploreCard(rank, 0, universe, 1, false);
assert.match(above.slideStyle, /rotateX\(11\.00deg\)/u);
assert.match(above.slideStyle, /transform-origin:50% 100%/u);
assert.match(above.slideStyle, /opacity:0\.82/u);

// ── 디자인 원본 대조 ────────────────────────────────────────────────────
// 이 연출은 claude.ai/design 프로토타입에서 **손으로** 옮겨 온 것이다. 옮기다 빠뜨려도
// 알려 주는 것이 없어서, `transform` 한 덩어리가 통째로 빠진 채 병합돼 카드가 흐려지기만
// 한 적이 있다(PR #283 이 되돌렸다). 위 단언들은 숫자를 여기 또 적어 둔 것이라 원본이
// 바뀌면 같이 틀려진다 — 그래서 원본 파일에서 계수를 직접 읽어 같은 식을 세우고 코드가
// 만든 문자열과 **글자 하나까지** 맞춘다.
//
// 이 검사가 깨지는 경우는 둘이다.
//   - 디자인을 다시 반입해 값이 바뀌었다 → `STACK` 상수를 원본에 맞춘다
//   - 원본 코드의 생김새가 바뀌어 정규식이 못 읽는다 → `grab` 이 그렇게 말해 준다
const prototype = readFileSync(
  new URL("../../../design-system/prototype/모의투자-화면-프로토타입.html", import.meta.url),
  "utf8",
);

function grab(re: RegExp, what: string) {
  const match = prototype.match(re);
  assert.ok(
    match,
    `프로토타입에서 ${what} 를 찾지 못했다 — 원본 형태가 바뀌었으면 이 정규식부터 맞춘다`,
  );
  return match;
}

const clamp = grab(/const d = Math\.max\(-(\d+), Math\.min\((\d+), ci - s\.cardIndex\)\);/u, "스택 clamp");
assert.equal(clamp[1], clamp[2], "원본 clamp 의 위아래 한계가 다르다");
const reach = Number(clamp[1]);
const knobs = grab(
  /transform:perspective\((\d+)px\) rotateX\(' \+ \(-d \* ([\d.]+) \* depth\)\.toFixed\(2\) \+ 'deg\) translateZ\(' \+ \(-a \* ([\d.]+) \* depth\)\.toFixed\(1\) \+ 'px\) scale\(' \+ \(1 - a \* ([\d.]+) \* depth\)\.toFixed\(3\)/u,
  "perspective·기울기·깊이·크기",
);
const origin = grab(
  /transform-origin:50% ' \+ \(d > 0 \? '(\d+%)' : d < 0 \? '(\d+%)' : '(\d+%)'\)/u,
  "회전축",
);
const fade = grab(/opacity:' \+ \(a === 0 \? ([\d.]+) : a === 1 \? ([\d.]+) : ([\d.]+)\)/u, "투명도 3단");
const base = grab(/return '(position:relative;isolation:isolate;[^']*)'/u, "슬라이드 기본 스타일");
const pad = grab(/\+ 'padding-top:' \+ \(isAll \? '(\d+px)' : '(\d+)'\) \+ ';'/u, "구분 헤더 여백");
const motion = grab(
  /transition:(transform \d+ms cubic-bezier\([^)]+\),opacity \d+ms ease)'/u,
  "전환",
);

/** 원본 식 그대로. `depth` 는 앱에 없는 Tweaks 노브라 기본값 1 이다. */
function designSlideStyle(offset: number) {
  const d = Math.max(-reach, Math.min(reach, offset));
  const a = Math.abs(d);
  return (
    base[1] +
    "padding-top:" + pad[2] +
    ";transform:perspective(" + knobs[1] + "px) rotateX(" + (-d * Number(knobs[2])).toFixed(2) +
    "deg) translateZ(" + (-a * Number(knobs[3])).toFixed(1) +
    "px) scale(" + (1 - a * Number(knobs[4])).toFixed(3) + ")" +
    ";transform-origin:50% " + (d > 0 ? origin[1] : d < 0 ? origin[2] : origin[3]) +
    ";opacity:" + (a === 0 ? fade[1] : a === 1 ? fade[2] : fade[3]) +
    ";transition:" + motion[1]
  );
}

// clamp 밖(±5)까지 넣어 양끝이 원본과 같은 자리에서 멎는지 함께 본다.
for (const offset of [-5, -3, -2, -1, 0, 1, 2, 3, 5]) {
  // `signed = index - activeIndex` 이므로 activeIndex 를 밀어 원하는 칸수를 만든다.
  const card = buildExploreCard(rank, 1, universe, 1 - offset, false);
  assert.equal(card.slideStyle, designSlideStyle(offset), `스택 연출이 원본과 다르다 (${offset}칸)`);
}

// `showGroups` 를 켠 목록에서만 업종이 바뀌는 첫 카드에 구분 헤더를 세우고, 맨 첫 카드는
// 위에 아무것도 없으니 선을 생략한다. 켤지 말지는 화면이 정렬을 보고 정한다.
const all = exploreList(universe, live, "all", "", []);
const allCards = all.map((_, i) => buildExploreCard(all, i, universe, 0, true));
assert.deepEqual(allCards.map((c) => c.groupShow), [true, false, true]);
assert.deepEqual(allCards.map((c) => c.groupShowLine), [false, false, true]);
const noGroup = buildExploreCard(all, 1, universe, 0, false);
assert.equal(noGroup.groupShow, false);

console.log("explore cards tests passed");
