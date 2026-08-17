import assert from "node:assert/strict";
import { planFields, rejectionReason } from "./route";

// F2 SPEC §7.1 — 질문식 기록의 부가 필드를 apply_trade 인자로 옮기는 규칙.
function main() {
  // 매수: 계획·목표가·메모를 그대로 넘기고 메모는 앞뒤 공백을 지운다
  assert.deepEqual(
    planFields("buy", {
      plan_code: "plan_target",
      plan_target_price: 1200,
      memo: "  목표 오면 팔기  ",
    }),
    {
      p_plan_code: "plan_target",
      p_plan_target_price: 1200,
      p_memo: "목표 오면 팔기",
      p_plan_match: null,
      p_plan_changed_reason: null,
    },
  );

  // 매도: 계획 준수 여부와 변경 이유
  assert.deepEqual(
    planFields("sell", { plan_match: false, plan_changed_reason: "change_price_emotion" }),
    {
      p_plan_code: null,
      p_plan_target_price: null,
      p_memo: null,
      p_plan_match: false,
      p_plan_changed_reason: "change_price_emotion",
    },
  );

  // 계획을 지킨 매도에는 변경 이유를 남기지 않는다
  assert.equal(
    planFields("sell", { plan_match: true, plan_changed_reason: "change_new_info" })
      .p_plan_changed_reason,
    null,
  );
  // 판정 자체가 없으면(null) 변경 이유도 없다
  assert.equal(
    planFields("sell", { plan_changed_reason: "change_new_info" }).p_plan_changed_reason,
    null,
  );

  // 반대쪽 전용 필드는 버린다
  assert.equal(planFields("buy", { plan_match: true }).p_plan_match, null);
  const sellWithBuyFields = planFields("sell", {
    plan_code: "plan_short",
    plan_target_price: 999,
    memo: "무시돼야 함",
    plan_match: true,
  });
  assert.equal(sellWithBuyFields.p_plan_code, null);
  assert.equal(sellWithBuyFields.p_plan_target_price, null);
  assert.equal(sellWithBuyFields.p_memo, null);

  // 목록에 없는 코드·0 이하 목표가·빈 메모는 주문을 거절하지 않고 그 필드만 버린다
  assert.equal(planFields("buy", { plan_code: "plan_bogus" }).p_plan_code, null);
  assert.equal(planFields("buy", { plan_code: 42 }).p_plan_code, null);
  assert.equal(planFields("buy", { plan_target_price: 0 }).p_plan_target_price, null);
  assert.equal(planFields("buy", { plan_target_price: -5 }).p_plan_target_price, null);
  assert.equal(planFields("buy", { plan_target_price: "1200" }).p_plan_target_price, null);
  assert.equal(planFields("buy", { memo: "   " }).p_memo, null);
  assert.equal(
    planFields("sell", { plan_match: false, plan_changed_reason: "change_bogus" })
      .p_plan_changed_reason,
    null,
  );

  // 200자까지 받고 그 위는 버린다
  assert.equal(planFields("buy", { memo: "가".repeat(200) }).p_memo, "가".repeat(200));
  assert.equal(planFields("buy", { memo: "가".repeat(201) }).p_memo, null);

  // 아무것도 안 보내면 전부 null — 옛 호출과 같은 모양이다
  assert.deepEqual(planFields("buy", {}), {
    p_plan_code: null,
    p_plan_target_price: null,
    p_memo: null,
    p_plan_match: null,
    p_plan_changed_reason: null,
  });

  // 확신도·자신감 값은 어떤 이름으로 와도 통과하지 않는다 (F2 SPEC §5.4)
  const fields = planFields("buy", { confidence: 5, conviction: 3, 확신도: 4 });
  assert.equal(Object.keys(fields).length, 5);
  assert.equal(JSON.stringify(fields).includes("5"), false);

  // 거절 사유 — `apply_trade`·`reserve_order` 가 던지는 문구를 화면이 아는 코드로 옮긴다.
  // 실제 오류는 `Supabase HTTP 400: {"code":"P0001","message":"..."}` 모양으로 감싸여 온다.
  const dbError = (message: string) =>
    new Error(`Supabase HTTP 400: {"code":"P0001","message":"${message}"}`);
  assert.equal(rejectionReason(dbError("잔액이 부족합니다.")), "insufficient_balance");
  assert.equal(rejectionReason(dbError("보유 수량이 부족합니다.")), "insufficient_quantity");
  assert.equal(rejectionReason(dbError("등록되지 않은 종목입니다: 999999")), "unknown_stock");
  assert.equal(rejectionReason(dbError("가격과 수량은 0보다 커야 합니다.")), "invalid_amount");
  assert.equal(rejectionReason(dbError("예약 수량은 0보다 커야 합니다.")), "invalid_amount");
  // 모르는 예외를 억지로 분류하지 않는다 — 화면이 기존 문구를 쓴다.
  assert.equal(rejectionReason(new Error("fetch failed")), "server_error");

  console.log("trade plan field tests passed");
}

main();
