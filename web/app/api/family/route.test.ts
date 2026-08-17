import assert from "node:assert/strict";
import { buildFamilyData, parseFamilyOffset, type FamilyDataDeps } from "./route";
import type { AbilityCard } from "../../../shared/types/behavior-profile";
import type { Profile } from "../supabase";

const neutral: AbilityCard = {
  scores: { focus: 5, diversification: 5, accuracy: 5, intuition: 5, evidence: 5 },
  character: null,
  level: null,
  samples: { buys: 0, sells: 0, graded: 0, pending: 0, hits: 0 },
  observation: "none",
};
/** 주차 카드 한 장. 서버는 `WeekCard`(= 능력치 카드 + 주차 정보)를 그대로 싣는다. */
const weekOf = (
  weekStart: string,
  weekEnd: string,
  label: string,
  status: "closed" | "current",
  count: number,
) => ({ weekStart, weekEnd, label, status, count, card: { ...neutral, weekStart, weekEnd, label, status } });

const profiles: Profile[] = [
  { id: 1, name: "찬영", login_id: "child", parent_child: "child", family_tag: "찬영가족", guardian_role: null },
  { id: 2, name: "찬영엄마", login_id: "mom", parent_child: "parent", family_tag: "찬영가족", guardian_role: "mom" },
  { id: 3, name: "찬영아빠", login_id: "dad", parent_child: "parent", family_tag: "찬영가족", guardian_role: "dad" },
];

let profileFilter = "";
let transactionFilter = "";
let holdingFilter = "";
let transactionOffset = "";
let transactionLimit = "";
let transactionFeedFilter = "";
const deps: FamilyDataDeps = {
  findProfileById: async (id) => profiles.find((profile) => profile.id === id) ?? null,
  selectProfiles: async (params) => {
    profileFilter = params.family_tag;
    return profiles;
  },
  selectTransactions: async (params) => {
    transactionFilter = params.user_id;
    transactionOffset = params.offset;
    transactionLimit = params.limit;
    transactionFeedFilter = params.feed_body;
    return [
      {
        id: "mine", user_id: 1, stock_id: 7, side: "buy", trade_price: 70000, trade_quantity: 2,
        trade_reason: "buy_news", plan_code: "plan_target", plan_target_price: "84000",
        memo: " 목표 오면 팔기 ", plan_match: null, plan_changed_reason: null, feed_body: "목표 오면 팔기",
        created_at: "2026-08-14T00:00:00.000Z",
        stocks: { stock_code: "005930", stock_name: "삼성전자" },
      },
      {
        id: "dad", user_id: 3, stock_id: 11, side: "sell", trade_price: 120000, trade_quantity: 4,
        trade_reason: null, plan_code: null, plan_target_price: null, memo: null,
        plan_match: false, plan_changed_reason: "change_price_emotion", feed_body: "정리했어",
        created_at: "2026-08-13T00:00:00.000Z",
        stocks: { stock_code: "035420", stock_name: "NAVER" },
      },
      // 다 팔아 보유가 없는 종목. 피드에 남으면 아무도 안 가진 회사가 섞인다.
      {
        id: "sold-out", user_id: 1, stock_id: 3, side: "sell", trade_price: 137500,
        trade_quantity: 17, trade_reason: null, plan_code: null, plan_target_price: null,
        memo: null, plan_match: null, plan_changed_reason: null, feed_body: "다 팔았어",
        created_at: "2026-08-15T00:00:00.000Z",
        stocks: { stock_code: "271560", stock_name: "오리온" },
      },
    ];
  },
  selectHoldings: async (params) => {
    holdingFilter = params.user_id;
    return [
      { user_id: 1, stock_id: 7, quantity: 9, avg_price: "68000" },
      { user_id: 3, stock_id: 11, quantity: 4, avg_price: "100000" },
      // 수량 0 은 이미 다 판 것이다. `holdings` 는 행을 0 으로 남기기도 한다.
      { user_id: 1, stock_id: 3, quantity: 0, avg_price: "130300" },
    ];
  },
  buildProfile: async (userId) => ({
    // 주차 카드도 구성원마다 다르게 줘서 어느 사람 것이 어디로 가는지 구분한다.
    weeks: [
      weekOf("2026-08-03", "2026-08-09", "8/3 – 8/9", "closed", userId),
      weekOf("2026-08-10", "2026-08-16", "8/10 – 8/16", "current", 0),
    ],
    cumulative: { ...neutral, samples: { ...neutral.samples, buys: userId } },
    // 구성원마다 다른 수익률을 줘서 어느 값이 어디로 가는지 구분한다.
    valuation: {
      marketValue: 1_000_000 + userId, cost: 1_000_000, cash: 500_000,
      profit: userId, returnRate: userId * 1.5, valuedCount: 1, pricelessCount: 0,
    },
  }),
};

async function main() {
  const family = await buildFamilyData(1, deps);
  assert.ok(family);
  assert.equal(profileFilter, "eq.찬영가족");
  assert.equal(transactionFilter, "in.(1,2,3)");
  assert.equal(transactionOffset, "0");
  assert.equal(transactionLimit, "51");
  /**
   * **피드에 올린 거래만 읽는다.** 이 필터가 빠지면 한 번 살 때마다 카드가 저절로 생겨,
   * 시험 삼아 눌러 본 매수까지 가족 피드로 간다 — 2026-08-17 에 그래서 고친 자리다.
   */
  assert.equal(transactionFeedFilter, "not.is.null");
  assert.deepEqual(family.members.map((member) => member.name), ["찬영", "찬영엄마", "찬영아빠"]);
  assert.equal(family.members[2].behavior?.samples.buys, 3);

  /**
   * 주차 카드도 구성원마다 내려간다. 지난 주차 리포트가 이 값으로 끝난 주를 되짚는다 —
   * 예전에는 여기서 계산해 놓고 버려서 화면이 사람이 적어 둔 표본을 그리고 있었다.
   */
  assert.deepEqual(family.members.map((member) => member.weeks.length), [2, 2, 2]);
  assert.deepEqual(family.members.map((member) => member.weeks[0].count), [1, 2, 3]);
  assert.deepEqual(family.members[0].weeks.map((week) => week.status), ["closed", "current"]);
  // 주차 카드에 금액이 실리면 안 된다 — 자산 규모는 계속 `total` 합계로만 나간다.
  const weekKeys = new Set(family.members.flatMap((m) => m.weeks.flatMap((w) => Object.keys(w))));
  for (const banned of ["marketValue", "cost", "cash", "profit", "valuation"]) {
    assert.equal(weekKeys.has(banned), false, `주차 카드에 ${banned} 가 실렸다`);
  }

  // 수익률은 타인 것도 내려간다 — 트랙이 구성원을 나란히 세우는 화면이라 필요하다.
  assert.deepEqual(family.members.map((member) => member.returnRate), [1.5, 3, 4.5]);

  // 원금이 0이면 0% 가 아니라 null 이다. 본전인 사람과 아직 안 산 사람을 구분해야
  // 화면이 "아직" 으로 그린다.
  const noCost = await buildFamilyData(1, {
    ...deps,
    buildProfile: async () => ({
      weeks: [], cumulative: neutral,
      valuation: {
        marketValue: 0, cost: 0, cash: 10_000_000,
        profit: 0, returnRate: 0, valuedCount: 0, pricelessCount: 0,
      },
    }),
  });
  assert.deepEqual(noCost?.members.map((member) => member.returnRate), [null, null, null]);
  // 자산 규모는 **구성원 줄에서는** 계속 가린다. 평가금액·원금·현금은 실리지 않는다.
  for (const member of family.members) {
    assert.equal("marketValue" in member, false);
    assert.equal("cost" in member, false);
    assert.equal("cash" in member, false);
  }

  // 같은 family_tag 세 사람의 자산을 합쳐서만 낸다 (2026-08-16 유저 확정).
  // 평가 1,000,001+1,000,002+1,000,003 에 현금 500,000×3 을 더한 값이다.
  assert.equal(family.total.assets, 3_000_006 + 1_500_000);
  assert.equal(family.total.cost, 3_000_000);
  assert.equal(family.total.profit, 6);
  assert.equal(family.total.memberCount, 3);
  // 가족 예수금 합계 — 투자 현황의 `투자 가능 금액` 이 이 값이다. 구성원 3명 × 50만원.
  assert.equal(family.total.cash, 1_500_000);
  // 합계 수익률은 구성원 수익률(1.5·3·4.5)의 평균이 아니라 합계 원금 대비 합계 손익이다.
  assert.equal(family.total.returnRate, (6 / 3_000_000) * 100);

  // 아직 아무도 안 샀으면 합계 수익률은 0% 가 아니라 null 이다. 현금은 그대로 합친다.
  assert.equal(noCost?.total.returnRate, null);
  assert.equal(noCost?.total.assets, 30_000_000);
  assert.equal(holdingFilter, "in.(1,2,3)");
  // 아직 들고 있는 종목만 남는다. 다 판 오리온은 빠지고, 평단가가 함께 실린다.
  assert.deepEqual(family.trades.map((trade) => trade.id), ["mine", "dad"]);
  assert.equal(family.trades[0].avgPrice, 68000);
  assert.equal(family.trades[1].avgPrice, 100000);

  assert.equal(family.trades[0].price, 70000);
  assert.equal(family.trades[0].quantity, 2);
  // 남의 체결가·수량도 그대로 내려보낸다 (2026-08-17 유저 확정). 자산 규모는 `members`·
  // `total` 이 지킨다 — 체결 한 건으로는 그 사람이 얼마를 굴리는지 알 수 없다.
  assert.equal(family.trades[1].price, 120000);
  assert.equal(family.trades[1].quantity, 4);
  assert.equal(family.trades[1].reason, "이유를 남기지 않았어요.");

  // 계획·메모는 자산 규모가 아니므로 남의 거래에서도 가리지 않는다 (F2 SPEC §7.1)
  assert.equal(family.trades[0].reasonCode, "buy_news");
  assert.equal(family.trades[0].planCode, "plan_target");
  assert.equal(family.trades[0].planTargetPrice, 84000);
  assert.equal(family.trades[0].memo, "목표 오면 팔기");
  // 카드 본문은 피드에 올린 글이다. 메모와 별개 컬럼이라 둘이 달라도 각자 나간다.
  assert.equal(family.trades[0].feedBody, "목표 오면 팔기");
  assert.equal(family.trades[1].feedBody, "정리했어");
  assert.equal(family.trades[0].planMatch, null);
  assert.equal(family.trades[1].planMatch, false);
  assert.equal(family.trades[1].planChangedReason, "change_price_emotion");
  assert.equal(family.trades[1].reasonCode, null);
  assert.equal(family.trades[1].memo, null);
  assert.deepEqual(family.page, { offset: 0, limit: 50, hasMore: false, nextOffset: null });

  // `stock_id` 는 위 `selectHoldings` 가 보유로 준 것과 같아야 한다. 아니면 보유 종목
  // 필터에 걸려 페이지가 통째로 비고, 세는 것이 페이지가 아니라 필터가 돼 버린다.
  const fiftyOne = Array.from({ length: 51 }, (_, index) => ({
    id: `page-${index}`,
    user_id: 1,
    stock_id: 7,
    side: "buy" as const,
    trade_price: 70_000,
    trade_quantity: 1,
    trade_reason: null,
    plan_code: null,
    plan_target_price: null,
    memo: null,
    plan_match: null,
    plan_changed_reason: null,
    feed_body: "올린 글",
    created_at: `2026-08-14T00:${String(index).padStart(2, "0")}:00.000Z`,
    stocks: { stock_code: "005930", stock_name: "삼성전자" },
  }));
  const firstPage = await buildFamilyData(1, {
    ...deps,
    selectTransactions: async (params) => {
      transactionOffset = params.offset;
      return fiftyOne;
    },
  });
  assert.equal(firstPage?.trades.length, 50);
  assert.deepEqual(firstPage?.page, { offset: 0, limit: 50, hasMore: true, nextOffset: 50 });

  // `hasMore` 는 **거르기 전** 행 수로 센다. 보유 종목 필터가 한 페이지를 통째로 비워도
  // 다음 페이지는 있다 — 걸러진 수로 세면 거기서 페이지 넘김이 멎어 뒤가 영영 안 보인다.
  const allFiltered = await buildFamilyData(1, {
    ...deps,
    selectTransactions: async () => fiftyOne.map((row) => ({ ...row, stock_id: 999 })),
  });
  assert.equal(allFiltered?.trades.length, 0);
  assert.equal(allFiltered?.page.hasMore, true);
  assert.equal(allFiltered?.page.nextOffset, 50);

  await buildFamilyData(1, {
    ...deps,
    selectTransactions: async (params) => {
      transactionOffset = params.offset;
      return [];
    },
  }, 50);
  assert.equal(transactionOffset, "50");
  assert.equal(parseFamilyOffset(null), 0);
  assert.equal(parseFamilyOffset("50"), 50);
  assert.equal(parseFamilyOffset("-1"), null);
  assert.equal(parseFamilyOffset("abc"), null);

  // 값이 없는 옛 행은 `null` 그대로 나가야 한다. `Number(null)` 은 0 이라, 형변환을 무조건
  // 걸면 체결가를 안 남긴 거래가 `0원` 에 체결된 것처럼 보인다.
  const priceless = await buildFamilyData(1, {
    ...deps,
    selectTransactions: async () => [{
      id: "old", user_id: 2, stock_id: 7, side: "sell", trade_price: null as unknown as number,
      trade_quantity: null as unknown as number, trade_reason: null, plan_code: null,
      plan_target_price: null, memo: null, plan_match: null, plan_changed_reason: null,
      feed_body: "올린 글", created_at: "2026-08-12T00:00:00.000Z",
      stocks: { stock_code: "005930", stock_name: "삼성전자" },
    }],
    selectHoldings: async () => [{ user_id: 2, stock_id: 7, quantity: 1, avg_price: "270000" }],
  });
  assert.equal(priceless?.trades[0].price, null);
  assert.equal(priceless?.trades[0].quantity, null);

  const solo: Profile = { ...profiles[0], id: 9, family_tag: null };
  let selectedProfiles = false;
  const soloFamily = await buildFamilyData(9, {
    ...deps,
    findProfileById: async () => solo,
    selectProfiles: async () => { selectedProfiles = true; return []; },
    selectTransactions: async (params) => { transactionFilter = params.user_id; return []; },
  });
  assert.ok(soloFamily);
  assert.equal(selectedProfiles, false);
  assert.equal(transactionFilter, "in.(9)");
  assert.deepEqual(soloFamily.members.map((member) => member.id), [9]);

  console.log("family route tests passed");
}

void main();
