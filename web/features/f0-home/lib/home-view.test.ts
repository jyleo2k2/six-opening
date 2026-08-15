import assert from "node:assert/strict";
import {
  HOME_INFO,
  homeRole,
  homeView,
  liveHoldings,
  moodImg,
  popItems,
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
  { tick: "삼성", name: "삼성전자", qty: "3주", value: "238,500원", pct: "+4.3%", up: true },
  { tick: "롯데", name: "롯데웰푸드", qty: "2주", value: "124,000원", pct: "+2.1%", up: true },
  { tick: "오리", name: "오리온", qty: "1주", value: "96,500원", pct: "-0.8%", up: false },
]);
// 428,600 / 12,000 = 35.7 → 35개
assert.equal(demo.goalCount, 35);
assert.equal(demo.itemLine, "왁뿌볼 35개 살 수 있어요");
assert.equal(demo.noHoldings, false);

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
  live.map((h) => [h.name, h.qty, h.value, h.pct, h.up]),
  [
    ["삼성전자", "2주", "240,000원", "+20.0%", true],
    ["크래프톤", "1주", "180,000원", "−10.0%", false],
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
assert.equal(view.moodImg, "/ui/assets/goal-child.png");

// 손실이면 부호와 색이 함께 바뀌고 목표 개수는 0 아래로 내려가지 않는다.
const losing = homeView(held, { "005930": 50000, "259960": 100000 });
assert.ok(losing.rateText.startsWith("−"));
assert.equal(losing.rateColor, "#2E6BE6");
assert.equal(losing.goalCount, 0);
assert.ok(losing.profitText.startsWith("−"));
assert.equal(losing.moodImg, "/ui/assets/mascot-bull-bear-sad.png");

// 수익률 부호별 홈 마스코트 — 양수는 역할별 목표 이미지, 보합(0)은 걱정, 음수는 울음.
assert.equal(moodImg(4.8, "/ui/assets/goal-dad.png"), "/ui/assets/goal-dad.png");
assert.equal(moodImg(0, "/ui/assets/goal-dad.png"), "/ui/assets/mascot-bull-flat.png");
assert.equal(moodImg(-4.8, "/ui/assets/goal-dad.png"), "/ui/assets/mascot-bull-bear-sad.png");

// 시세를 못 받은 종목은 평단가를 현재가로 본다 — 0원으로 그리지 않는다.
assert.equal(liveHoldings(held, {})[0].value, "200,000원");

// 계좌를 읽었는데 보유가 없으면 빈 상태다. 데모로 되돌아가지 않는다.
const empty = homeView({ ...held, holdings: [] }, prices);
assert.equal(empty.noHoldings, true);
assert.deepEqual(empty.holdings, []);
assert.equal(empty.goalCount, 0);
assert.equal(empty.rateText, "+0.0%");
assert.equal(empty.profitText, "+0원");
assert.equal(empty.moodImg, "/ui/assets/mascot-bull-flat.png");

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
