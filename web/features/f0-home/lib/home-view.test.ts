import assert from "node:assert/strict";
import {
  basisTimeText,
  HOME_HOLDING_LIMIT,
  HOME_INFO,
  homeRole,
  homeView,
  liveHoldings,
  moodArt,
  MOOD_FLAT_IMG,
  MOOD_SAD_IMG,
  pctTrend,
  popItems,
  trendColor,
  withStockCodes,
  type AccountUser,
  type Trend,
} from "./home-view";

// 홈 보유종목 카드는 두 번이나 고정 데모로 되돌아간 적이 있다(PR #180·#186·#187 복구 이력).
// 그 감시는 조립된 app.html 마크업을 읽는 `home-holdings-ui.test.ts` 가 했는데, 홈이 React 로
// 옮겨 오면서 여기가 이어받는다 — 실제 계좌에서 보유·수익·부호·빈 상태가 나오는지 본다.

// 역할 판정 — 아이는 parent_child, 부모는 guardian_role 이 정한다.
const child: AccountUser = { user_id: 1, parent_child: "child", guardian_role: null, holdings: [] };
const mom: AccountUser = { user_id: 2, parent_child: "parent", guardian_role: "mom", holdings: [] };
const dad: AccountUser = { user_id: 3, parent_child: "parent", guardian_role: "dad", holdings: [] };
assert.equal(homeRole(child), "child");
assert.equal(homeRole(mom), "mom");
assert.equal(homeRole(dad), "dad");
// 보호자인데 guardian_role 이 비면 홈을 고를 수 없다 — 데모로 폴백한다.
assert.equal(homeRole({ ...mom, guardian_role: null }), null);
assert.equal(homeRole(null), null);

// 계좌를 못 읽었으면 데모 보유·데모 수익을 쓴다.
const demo = homeView(null, {});
assert.equal(demo.loaded, false);
assert.equal(demo.role, "child");
assert.deepEqual(demo.holdings, [
  { tick: "삼성", name: "삼성전자", qty: "3주", value: "238,500원", pct: "+4.3%", trend: 1 },
  { tick: "롯데", name: "롯데웰푸드", qty: "2주", value: "124,000원", pct: "+2.1%", trend: 1 },
  { tick: "오리", name: "오리온", qty: "1주", value: "96,500원", pct: "-0.8%", trend: -1 },
]);
// 428,600 / 12,000 = 35.7 → 35개
assert.equal(demo.goalCount, 35);
assert.equal(demo.itemLine, "왁뿌볼 35개 살 수 있어요");
assert.equal(demo.noHoldings, false);
// 계좌를 못 읽은 동안은 데모 지갑을 쓴다 — 총자산 = 지갑 90,000 + 평가금액(238,500+124,000+96,500).
assert.equal(demo.totalAssetsText, "549,000원");
assert.equal(demo.walletText, "90,000원");
// 총자산은 헤더 프로필 옆에 이름과 함께 선다 — 가운데 두면 바로 아래 수익금액과 헷갈린다.
assert.equal(demo.totalAssetsLabel, "김찬영 총자산");

// 시즌 칩은 오늘 날짜에서 나온다(`season-day.ts`) — 예전에는 역할별 데모 상수라 날이 가도
// "시즌 3 · 28일째" 로 굳어 있었고, 아이만 14일째로 남아 있던 적도 있다. 계정이 아니라
// 시각만 값을 바꾸므로 세 계정을 같은 시각으로 물어 같은 답이 나오는지 본다.
const chipAt = Date.parse("2026-08-17T09:30:00+09:00");
assert.equal(homeView(null, {}, [], chipAt).dayCount, "시즌 3 · 15일째");
assert.deepEqual(
  [child, mom, dad].map((u) => homeView(u, {}, [], chipAt).dayCount),
  ["시즌 3 · 15일째", "시즌 3 · 15일째", "시즌 3 · 15일째"],
);
// 다음 시즌으로 넘어가는 것도 화면 값에서 확인한다.
assert.equal(homeView(null, {}, [], Date.parse("2026-08-31T00:00:00+09:00")).dayCount, "시즌 4 · 1일째");

// 부모 목표 아이템의 기준가 — 향수 14만원, 신발 8만원.
assert.equal(HOME_INFO.mom.unitPrice, 140_000);
assert.equal(HOME_INFO.dad.unitPrice, 80_000);
const momDemo = homeView({ user_id: 2, parent_child: "parent", guardian_role: "mom" } as AccountUser, {});
const dadDemo = homeView({ user_id: 3, parent_child: "parent", guardian_role: "dad" } as AccountUser, {});
// 211,000 / 140,000 = 1.5 → 1개, 452,000 / 80,000 = 5.65 → 5개
assert.equal(momDemo.itemLine, "샤넬 향수 1개 살 수 있어요");
assert.equal(dadDemo.itemLine, "나이키 신발 5개 살 수 있어요");
assert.equal(momDemo.totalAssetsLabel, "찬영 어머님 총자산");
assert.equal(dadDemo.totalAssetsLabel, "찬영 아버님 총자산");
// 데모에서도 총자산 = 지갑 + 평가금액이 맞아떨어진다. 지갑을 0원으로 두면 두 숫자가
// 같아져 나눠 적을 이유가 사라지고, 펼친 지갑이 고장난 것처럼 보인다.
assert.equal(momDemo.walletText, "320,000원");
assert.equal(momDemo.totalAssetsText, "1,296,000원");
assert.equal(dadDemo.walletText, "540,000원");
assert.equal(dadDemo.totalAssetsText, "1,617,000원");

// 카드에는 세 줄까지만 세운다. 나머지는 `전체보기` 시트가 맡는다 — 카드가 보유 개수만큼
// 길어지면 그 위 캐릭터 그림이 계정마다 다른 자리에 선다.
assert.equal(HOME_HOLDING_LIMIT, 3);
assert.equal(dadDemo.holdings.length, 4);
assert.equal(dadDemo.topHoldings.length, 3);
assert.deepEqual(demo.topHoldings, demo.holdings);
// 시트는 카드에 다 담긴 계정에서도 연다 — `전체보기` 는 "넘친 나머지" 가 아니라
// "가진 전부" 를 보여 주는 자리다. 세 줄뿐인 아이 계정에서도 버튼이 서야 한다.
assert.ok(demo.holdings.length > 0);

// 실제 계좌 — 평가금액과 수익률은 현재가·평단가로 낸다.
const held: AccountUser = {
  user_id: 1,
  parent_child: "child",
  guardian_role: null,
  holdings: [
    { stock_code: "005930", stock_name: "삼성전자", quantity: 2, avg_price: 100000 },
    { stock_code: "259960", stock_name: "크래프톤", quantity: 1, avg_price: 200000 },
  ],
};
const prices = { "005930": 120000, "259960": 180000 };
const live = liveHoldings(held, prices);
assert.deepEqual(
  live.map((h) => [h.name, h.qty, h.value, h.pct, h.trend]),
  [
    ["삼성전자", "2주", "240,000원", "+20.0%", 1],
    ["크래프톤", "1주", "180,000원", "−10.0%", -1],
  ],
);
// 홈에서 한 줄을 누르면 상세로 간다 — 실제 보유는 계좌의 종목코드를 그대로 싣는다.
assert.deepEqual(
  live.map((h) => h.code),
  ["005930", "259960"],
);
// 수익 = (120000-100000)*2 + (180000-200000)*1 = 20,000
const view = homeView(held, prices);
assert.equal(view.loaded, true);
assert.equal(view.goalCount, Math.floor(20000 / 12000)); // 1개
// 수익률 = 20,000 / (240,000+180,000) * 100 = 4.8%
assert.equal(view.rateText, "+4.8%");
assert.equal(view.rateColor, "#D5327A");
// 수익금액 앞은 부호가 아니라 아카이브 가족 시트와 같은 ▲▼ 다.
assert.equal(view.profitText, "▲ 20,000원");
// 올랐으면 가운데 그림은 역할별 목표 그림 그대로고 배율도 건드리지 않는다.
assert.equal(view.moodImg, "/ui/assets/goal-child.png");
assert.equal(view.moodScale, 1);
// 총자산 = 현금(balance) + 보유 평가금액(240,000+180,000). 현금이 없으면(undefined) 0으로 본다.
assert.equal(homeView(held, prices).totalAssetsText, "420,000원");
assert.equal(
  homeView({ ...held, balance: 1_000_000 }, prices).totalAssetsText,
  "1,420,000원",
);

// 내 지갑은 **주문에 쓸 수 있는 현금**(`available`)이다. 매수 화면의 `내 지갑` 이 같은 값을
// 적으므로(`applyServerAccount` 의 cash), 여기서 총 현금을 쓰면 미체결이 잠근 돈만큼 홈이
// 더 크게 적는다 — 같은 이름의 숫자가 화면마다 달라진다. 총자산 쪽은 총 현금 그대로다.
const reservedUser = { ...held, balance: 1_000_000, reserved: 300_000, available: 700_000 };
assert.equal(homeView(reservedUser, prices).walletText, "700,000원");
assert.equal(homeView(reservedUser, prices).totalAssetsText, "1,420,000원");
// `available` 을 안 주던 옛 응답은 총 현금으로 떨어진다. 둘 다 없으면 0원이다.
assert.equal(homeView({ ...held, balance: 1_000_000 }, prices).walletText, "1,000,000원");
assert.equal(homeView(held, prices).walletText, "0원");

// 손실이면 부호와 색이 함께 바뀌고 목표 개수는 0 아래로 내려가지 않는다.
const losing = homeView(held, { "005930": 50000, "259960": 100000 });
assert.ok(losing.rateText.startsWith("−"));
assert.equal(losing.rateColor, "#2E6BE6");
assert.equal(losing.goalCount, 0);
assert.ok(losing.profitText.startsWith("▼ "));
// 내렸으면 목표 그림 대신 우는 황소·곰이다. 살 수 있는 개수가 0인데 목표를 든 그림이
// 웃고 있으면 화면이 앞뒤가 다른 말을 한다 — 2026-08-16 에 이 분기가 통째로 지워진 적 있다.
assert.equal(losing.moodImg, MOOD_SAD_IMG);

// 시세를 못 받은 종목은 평단가를 현재가로 본다 — 0원으로 그리지 않는다.
assert.equal(liveHoldings(held, {})[0].value, "200,000원");

// 계좌를 읽었는데 보유가 없으면 빈 상태다. 데모로 되돌아가지 않는다.
const empty = homeView({ ...held, holdings: [] }, prices);
assert.equal(empty.noHoldings, true);
assert.deepEqual(empty.holdings, []);
assert.deepEqual(empty.topHoldings, []);
assert.equal(empty.goalCount, 0);
assert.equal(empty.rateText, "+0.0%");
// 본전에는 도형이 없다 — `▲ 0원` 은 오르지 않았는데 오른 것처럼 읽힌다.
assert.equal(empty.profitText, "0원");
// 오르지도 내리지도 않았으면 회색이다 — `+0.0%` 를 핑크로 적으면 숫자와 색이 다른 말을 한다.
assert.equal(empty.rateColor, "#8E93A8");
assert.equal(empty.moodImg, MOOD_FLAT_IMG);

// 방향은 **화면에 찍히는 값**으로 정한다. 원값 +0.04% 는 화면에 `+0.0%` 로 적히므로 회색이다.
assert.deepEqual([pctTrend(0.4), pctTrend(0.04), pctTrend(0), pctTrend(-0.04), pctTrend(-0.4)], [1, 0, 0, 0, -1]);
assert.deepEqual(
  [trendColor(1), trendColor(0), trendColor(-1)],
  ["#D5327A", "#8E93A8", "#2E6BE6"],
);
// 가운데 그림은 방향과 목표 개수를 함께 본다 — 목표를 1개라도 살 수 있는 이익일 때만
// 목표 그림이고, 보합이거나 아직 1개도 못 사면 시무룩, 손실이면 우는 황소·곰이다.
assert.deepEqual(
  [1, 0, -1].map((t) => moodArt(t as Trend, "/ui/assets/goal-dad.png", 1).src),
  ["/ui/assets/goal-dad.png", MOOD_FLAT_IMG, MOOD_SAD_IMG],
);
// 이익이어도 아직 1개도 못 사면 목표 그림을 세우지 않는다 — 목표 그림은 목표를 **든**
// 그림이라 `나이키 신발 0개 살 수 있어요` 아래에서 웃고 있으면 문장을 뒤집는다.
assert.equal(moodArt(1, "/ui/assets/goal-dad.png", 0).src, MOOD_FLAT_IMG);
// 세 계정 모두 같은 규칙이다. 보합·손실에서는 역할별 목표 아이템이 아니라 무드 그림이 선다.
const flatAll = [child, mom, dad].map((u) => homeView({ ...u, holdings: [] }, prices).moodImg);
assert.deepEqual(flatAll, Array(3).fill(MOOD_FLAT_IMG));
const losingAll = [child, mom, dad].map(
  (u) => homeView({ ...held, ...u, holdings: held.holdings }, { "005930": 50000, "259960": 100000 }).moodImg,
);
assert.deepEqual(losingAll, Array(3).fill(MOOD_SAD_IMG));

// 같은 이익이라도 목표 단가가 달라 그림이 갈린다. 수익 20,000 원이면 왁뿌볼(12,000)은 한 개
// 사지지만 샤넬 향수(140,000)·나이키 신발(80,000)은 아직 0개다 — 부모 홈은 시무룩이 선다.
const gainAll = [child, mom, dad].map((u) => homeView({ ...held, ...u, holdings: held.holdings }, prices));
assert.deepEqual(
  gainAll.map((v) => [v.rateText, v.goalCount, v.moodImg]),
  [
    ["+4.8%", 1, "/ui/assets/goal-child.png"],
    ["+4.8%", 0, MOOD_FLAT_IMG],
    ["+4.8%", 0, MOOD_FLAT_IMG],
  ],
);
// 아이 계정도 수익이 왁뿌볼 한 개 값에 못 미치면 마찬가지다. 이익이라는 사실보다
// 아직 못 산다는 사실이 이 자리의 주인공이다.
const tinyGain = homeView(held, { "005930": 102_500, "259960": 200_000 }); // 수익 5,000 원
assert.equal(tinyGain.rateText, "+1.2%");
assert.equal(tinyGain.goalCount, 0);
assert.equal(tinyGain.itemLine, "왁뿌볼 0개 살 수 있어요");
assert.equal(tinyGain.moodImg, MOOD_FLAT_IMG);
// 목표 그림이 서면 눌렀을 때 반드시 하나는 튄다 — 그림과 팝업이 같은 조건에서 논다.
for (const v of [...gainAll, tinyGain, view, losing, empty]) {
  if (v.moodImg !== MOOD_FLAT_IMG && v.moodImg !== MOOD_SAD_IMG) assert.ok(v.goalCount >= 1);
}

// 그림 크기는 캔버스가 아니라 **캐릭터**로 맞춘다. 배율을 안 걸면 손실 그림 캐릭터가 아이
// 목표 그림의 63% 로, 아빠 목표 그림 캐릭터가 엄마의 86% 로 쪼그라든다 — 여백이 넓은
// 캔버스를 상자에 맞추기 때문이다. 아래는 그 배율이 실제로 높이를 맞추는지, 그리고 키운
// 그림의 캐릭터가 상자 밖으로 잘려 나가지 않는지 원본 픽셀로 되짚는 검산이다.
const GOAL_BOX_H = 240; // HomeScreen 의 `GOAL_BOX` 높이
const GOAL_CHILD = "/ui/assets/goal-child.png";
const GOAL_MOM = "/ui/assets/goal-mom.png";
const GOAL_DAD = "/ui/assets/goal-dad.png";
/** 원본 PNG 의 알파 경계. `top` 은 캔버스 위끝에서 캐릭터 위끝까지의 투명 여백이다. */
const CANVAS = {
  [GOAL_CHILD]: { w: 524, h: 654, art: 509, top: 71 },
  [GOAL_MOM]: { w: 524, h: 654, art: 479, top: 112 },
  [GOAL_DAD]: { w: 368, h: 655, art: 411, top: 109 },
  [MOOD_FLAT_IMG]: { w: 722, h: 722, art: 499, top: 116 },
  [MOOD_SAD_IMG]: { w: 542, h: 722, art: 356, top: 194 },
} as const;
type ArtSrc = keyof typeof CANVAS;
/** `contain` 으로 상자에 맞춘 뒤 배율을 건 캐릭터의 실제 세로 픽셀. */
const artHeight = (src: ArtSrc, scale: number) =>
  (CANVAS[src].art / CANVAS[src].h) * GOAL_BOX_H * scale;
/** 상자 한가운데를 0 으로 본 캐릭터의 위·아래 끝. `scale` 은 요소 중심에서 걸린다. */
const artSpan = (src: ArtSrc, scale: number) => {
  const px = (GOAL_BOX_H / CANVAS[src].h) * scale; // 원본 1px 이 화면에서 차지하는 길이
  const top = CANVAS[src].top * px - (CANVAS[src].h * px) / 2;
  return { top, bottom: top + CANVAS[src].art * px };
};

// 보합·손실 그림은 **세 계정에서 같은 크기**로 선다. 같은 그림이 계정마다 다른 크기면
// 아이 화면에서 본 우는 황소와 아빠 화면의 우는 황소가 다른 그림처럼 읽힌다.
const MOOD_H = artHeight(GOAL_CHILD, 1); // 아이 목표 그림과 같은 187px — 지금 크기 그대로다.
for (const goalImg of [GOAL_CHILD, GOAL_MOM, GOAL_DAD] as const) {
  // 무드 그림이 서는 세 경우 — 보합·손실·"이익이지만 아직 0개".
  for (const [trend, goalCount] of [[0, 0], [-1, 0], [1, 0]] as [Trend, number][]) {
    const art = moodArt(trend, goalImg, goalCount);
    // 반올림한 배율이라 정확히 같지는 않다. 1px 안이면 눈으로는 같은 크기다.
    assert.ok(
      Math.abs(artHeight(art.src as ArtSrc, art.scale) - MOOD_H) < 1,
      `${goalImg} ${trend} 무드 캐릭터 높이가 어긋난다`,
    );
  }
}

// 목표 그림은 원본 크기 그대로 서되, 여백이 넓은 아빠 그림만 엄마와 같은 높이로 키운다.
const goalScale = (img: ArtSrc) => moodArt(1, img, 1).scale;
assert.equal(goalScale(GOAL_CHILD), 1);
assert.equal(goalScale(GOAL_MOM), 1);
assert.ok(goalScale(GOAL_DAD) > 1);
assert.ok(
  Math.abs(artHeight(GOAL_DAD, goalScale(GOAL_DAD)) - artHeight(GOAL_MOM, 1)) < 1,
  "아빠 목표 그림 캐릭터가 엄마와 다른 높이다",
);

// 키운 그림의 캔버스는 상자를 넘지만 넘치는 것은 투명 여백뿐이어야 한다. 캐릭터가 상자
// 밖으로 나가면 위아래가 잘린다.
for (const [src, scale] of [
  [GOAL_CHILD, goalScale(GOAL_CHILD)],
  [GOAL_MOM, goalScale(GOAL_MOM)],
  [GOAL_DAD, goalScale(GOAL_DAD)],
  [MOOD_FLAT_IMG, moodArt(0, GOAL_CHILD, 0).scale],
  [MOOD_SAD_IMG, moodArt(-1, GOAL_CHILD, 0).scale],
] as [ArtSrc, number][]) {
  const span = artSpan(src, scale);
  assert.ok(span.top >= -GOAL_BOX_H / 2, `${src} 캐릭터 위쪽이 잘린다: ${span.top}`);
  assert.ok(span.bottom <= GOAL_BOX_H / 2, `${src} 캐릭터 아래쪽이 잘린다: ${span.bottom}`);
  // 가로로 화면을 넘으면 좌우가 잘린다(폰 화면 402 − 좌우 여백 16×2).
  const width = (CANVAS[src].w / CANVAS[src].h) * GOAL_BOX_H * scale;
  assert.ok(width <= 402 - 32, `${src} 그림이 화면보다 넓다: ${width}`);
}

// 재 두지 않은 그림에는 배율을 지어내지 않는다.
assert.equal(moodArt(1, "/ui/assets/goal-unknown.png", 1).scale, 1);
// 원값 +0.04% 는 화면에 `+0.0%` 로 적히므로 그림도 보합이다 — 숫자가 0인데 웃는 그림이
// 서면 안 된다. 이 어긋남이 `rate` 원값 부호로 그림을 고르던 첫 구현의 결함이었다.
const nearZero = homeView(
  { ...held, holdings: [{ stock_code: "005930", stock_name: "삼성전자", quantity: 1, avg_price: 100_000 }] },
  { "005930": 100_040 },
);
assert.equal(nearZero.rateText, "+0.0%");
assert.equal(nearZero.moodImg, "/ui/assets/mascot-bull-flat.png");

// 반올림해서 0.0% 가 되는 보유도 회색이다 — 총 수익률과 같은 규칙을 쓴다.
assert.equal(
  liveHoldings(
    { ...held, holdings: [{ stock_code: "005930", stock_name: "삼성전자", quantity: 1, avg_price: 100_000 }] },
    { "005930": 100_020 },
  )[0].trend,
  0,
);

// 소수 수량은 두 자리로 적는다.
const frac = liveHoldings(
  { ...held, holdings: [{ stock_code: "005930", stock_name: "삼성전자", quantity: 0.37, avg_price: 100000 }] },
  prices,
);
assert.equal(frac[0].qty, "0.37주");

// 데모 보유는 코드가 없다. 유니버스에서 이름이 같은 종목을 찾았을 때만 붙고, 못 찾으면
// 그 줄은 code 가 없어 눌리지 않는다 — 코드를 데모 값에 적어 두지 않기 위한 규칙이다.
const universeStocks = [
  { code: "005930", name: "삼성전자" },
  { code: "271560", name: "오리온" },
];
const demoCoded = withStockCodes(HOME_INFO.child.holdings, universeStocks);
assert.deepEqual(
  demoCoded.map((h) => [h.name, h.code]),
  [
    ["삼성전자", "005930"],
    ["롯데웰푸드", undefined],
    ["오리온", "271560"],
  ],
);
// 유니버스를 아직 못 받았으면 데모 보유를 그대로 둔다(코드 키가 생기지 않는다).
assert.deepEqual(withStockCodes(HOME_INFO.child.holdings, []), HOME_INFO.child.holdings);
// 홈 화면도 같은 길로 코드를 받는다.
assert.equal(homeView(null, {}, universeStocks).holdings[0].code, "005930");

// 튀어오르는 아이템은 목표 개수만큼만, 최대 6개. 자리는 순번이 정하므로 다시 눌러도 같다.
assert.equal(popItems(true, 3).filter((p) => p.on).length, 3);
assert.equal(popItems(true, 99).filter((p) => p.on).length, 6);
assert.equal(popItems(false, 3).filter((p) => p.on).length, 0);
assert.deepEqual(popItems(true, 6)[0], popItems(true, 6)[0]);

// 지갑 밑의 결제기준. 계좌를 읽은 **그 시각**을 적는다 — 로컬 시각으로 만들어 물어야
// 표준시가 다른 기계에서도 같은 답이 나온다.
assert.equal(basisTimeText(new Date(2026, 7, 17, 13, 48).getTime()), "08.17(월) 13:48");
// 한 자리 월·일·시·분은 0을 채운다. 자리 수가 흔들리면 숫자가 아니라 문장처럼 읽힌다.
assert.equal(basisTimeText(new Date(2026, 0, 5, 9, 7).getTime()), "01.05(월) 09:07");
// 요일은 일요일부터 센다.
assert.equal(basisTimeText(new Date(2026, 7, 16, 0, 0).getTime()), "08.16(일) 00:00");

console.log("home view tests passed");
