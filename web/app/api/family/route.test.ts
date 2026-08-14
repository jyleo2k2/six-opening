import assert from "node:assert/strict";
import { buildFamilyData, type FamilyDataDeps } from "./route";
import type { AbilityCard } from "../../../shared/types/behavior-profile";
import type { Profile } from "../supabase";

const neutral: AbilityCard = {
  scores: { focus: 5, diversification: 5, accuracy: 5, intuition: 5, evidence: 5 },
  character: null,
  level: null,
  samples: { buys: 0, sells: 0, graded: 0, pending: 0, hits: 0 },
  observation: "none",
};
const profiles: Profile[] = [
  { id: 1, name: "찬영", login_id: "child", parent_child: "child", family_tag: "찬영가족", guardian_role: null },
  { id: 2, name: "찬영엄마", login_id: "mom", parent_child: "parent", family_tag: "찬영가족", guardian_role: "mom" },
  { id: 3, name: "찬영아빠", login_id: "dad", parent_child: "parent", family_tag: "찬영가족", guardian_role: "dad" },
];

let profileFilter = "";
let transactionFilter = "";
const deps: FamilyDataDeps = {
  findProfileById: async (id) => profiles.find((profile) => profile.id === id) ?? null,
  selectProfiles: async (params) => {
    profileFilter = params.family_tag;
    return profiles;
  },
  selectTransactions: async (params) => {
    transactionFilter = params.user_id;
    return [
      {
        id: "mine", user_id: 1, side: "buy", trade_price: 70000, trade_quantity: 2,
        trade_reason: "buy_news", plan_code: "plan_target", plan_target_price: "84000",
        memo: " 목표 오면 팔기 ", plan_match: null, plan_changed_reason: null,
        created_at: "2026-08-14T00:00:00.000Z",
        stocks: { stock_code: "005930", stock_name: "삼성전자" },
      },
      {
        id: "dad", user_id: 3, side: "sell", trade_price: 120000, trade_quantity: 4,
        trade_reason: null, plan_code: null, plan_target_price: null, memo: null,
        plan_match: false, plan_changed_reason: "change_price_emotion",
        created_at: "2026-08-13T00:00:00.000Z",
        stocks: { stock_code: "035420", stock_name: "NAVER" },
      },
    ];
  },
  buildProfile: async (userId) => ({
    weeks: [], cumulative: { ...neutral, samples: { ...neutral.samples, buys: userId } },
  }),
};

async function main() {
  const family = await buildFamilyData(1, deps);
  assert.ok(family);
  assert.equal(profileFilter, "eq.찬영가족");
  assert.equal(transactionFilter, "in.(1,2,3)");
  assert.deepEqual(family.members.map((member) => member.name), ["찬영", "찬영엄마", "찬영아빠"]);
  assert.equal(family.members[2].behavior?.samples.buys, 3);
  assert.equal(family.trades[0].price, 70000);
  assert.equal(family.trades[0].quantity, 2);
  assert.equal(family.trades[1].price, null);
  assert.equal(family.trades[1].quantity, null);
  assert.equal(family.trades[1].reason, "이유를 남기지 않았어요.");

  // 계획·메모는 자산 규모가 아니므로 남의 거래에서도 가리지 않는다 (F2 SPEC §7.1)
  assert.equal(family.trades[0].reasonCode, "buy_news");
  assert.equal(family.trades[0].planCode, "plan_target");
  assert.equal(family.trades[0].planTargetPrice, 84000);
  assert.equal(family.trades[0].memo, "목표 오면 팔기");
  assert.equal(family.trades[0].planMatch, null);
  assert.equal(family.trades[1].planMatch, false);
  assert.equal(family.trades[1].planChangedReason, "change_price_emotion");
  assert.equal(family.trades[1].reasonCode, null);
  assert.equal(family.trades[1].memo, null);

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
