import assert from "node:assert/strict";
import {
  HOME_HOLDING_LIMIT,
  HOME_INFO,
  homeRole,
  homeView,
  liveHoldings,
  pctTrend,
  popItems,
  trendColor,
  withStockCodes,
  type AccountUser,
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
// 계좌를 못 읽은 동안은 현금을 모른다 — 총자산은 데모 보유 평가금액만이다(238,500+124,000+96,500).
assert.equal(demo.totalAssetsText, "459,000원");
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
assert.equal(view.profitText, "+20,000원");
// 총자산 = 현금(balance) + 보유 평가금액(240,000+180,000). 현금이 없으면(undefined) 0으로 본다.
assert.equal(homeView(held, prices).totalAssetsText, "420,000원");
assert.equal(
  homeView({ ...held, balance: 1_000_000 }, prices).totalAssetsText,
  "1,420,000원",
);

// 손실이면 부호와 색이 함께 바뀌고 목표 개수는 0 아래로 내려가지 않는다.
const losing = homeView(held, { "005930": 50000, "259960": 100000 });
assert.ok(losing.rateText.startsWith("−"));
assert.equal(losing.rateColor, "#2E6BE6");
assert.equal(losing.goalCount, 0);
assert.ok(losing.profitText.startsWith("−"));

// 시세를 못 받은 종목은 평단가를 현재가로 본다 — 0원으로 그리지 않는다.
assert.equal(liveHoldings(held, {})[0].value, "200,000원");

// 계좌를 읽었는데 보유가 없으면 빈 상태다. 데모로 되돌아가지 않는다.
const empty = homeView({ ...held, holdings: [] }, prices);
assert.equal(empty.noHoldings, true);
assert.deepEqual(empty.holdings, []);
assert.deepEqual(empty.topHoldings, []);
assert.equal(empty.goalCount, 0);
assert.equal(empty.rateText, "+0.0%");
assert.equal(empty.profitText, "+0원");
// 오르지도 내리지도 않았으면 회색이다 — `+0.0%` 를 핑크로 적으면 숫자와 색이 다른 말을 한다.
assert.equal(empty.rateColor, "#8E93A8");

// 방향은 **화면에 찍히는 값**으로 정한다. 원값 +0.04% 는 화면에 `+0.0%` 로 적히므로 회색이다.
assert.deepEqual([pctTrend(0.4), pctTrend(0.04), pctTrend(0), pctTrend(-0.04), pctTrend(-0.4)], [1, 0, 0, 0, -1]);
assert.deepEqual(
  [trendColor(1), trendColor(0), trendColor(-1)],
  ["#D5327A", "#8E93A8", "#2E6BE6"],
);
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

console.log("home view tests passed");
