import type { NextRequest } from "next/server";
import { callRpc, sessionUserId } from "../supabase";
import { blockedBySchoolHours } from "../trade-restriction/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TradeResult = { transaction_id: string; balance: number; realized_profit: number | null };

const isSide = (value: unknown): value is "buy" | "sell" => value === "buy" || value === "sell";

const positiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/** F2 SPEC §5.2 보유 계획. 문구 원본(`shared/data/trade-copy.js`)의 `PLANS` 와 같은 목록이다. */
const PLAN_CODES = ["plan_short", "plan_season", "plan_target", "plan_none"];
/** F2 SPEC §5.3 계획 변경 이유. 같은 파일의 `CHANGES` 와 같은 목록이다. */
const PLAN_CHANGED_REASONS = [
  "change_new_info",
  "change_view_shift",
  "change_price_emotion",
  "change_alternative",
  "change_plan_revision",
];
const MEMO_MAX_LENGTH = 200;

const codeIn = (allowed: readonly string[], value: unknown) =>
  typeof value === "string" && allowed.includes(value) ? value : null;

/**
 * 질문식 기록의 부가 필드를 RPC 인자로 옮긴다 (F2 SPEC §7.1).
 *
 * 하나가 틀려도 주문을 거절하지 않고 그 필드만 버린다. 서버 저장은 best-effort 이고
 * 로컬 체결은 이미 끝났으므로, 메모 한 줄 때문에 체결 기록 전체를 잃는 쪽이 더 나쁘다.
 * 매수 전용·매도 전용 필드는 반대쪽에서 오면 여기서 지운다. DB 함수도 같은 판단을 한 번 더 한다.
 */
export function planFields(side: "buy" | "sell", payload: Record<string, unknown>) {
  if (side === "buy") {
    const memo = typeof payload.memo === "string" ? payload.memo.trim() : "";
    return {
      p_plan_code: codeIn(PLAN_CODES, payload.plan_code),
      p_plan_target_price: positiveNumber(payload.plan_target_price),
      p_memo: memo && memo.length <= MEMO_MAX_LENGTH ? memo : null,
      p_plan_match: null,
      p_plan_changed_reason: null,
    };
  }
  const planMatch = typeof payload.plan_match === "boolean" ? payload.plan_match : null;
  return {
    p_plan_code: null,
    p_plan_target_price: null,
    p_memo: null,
    p_plan_match: planMatch,
    // 계획을 지켰거나 판정 자체가 없으면 변경 이유는 남기지 않는다.
    p_plan_changed_reason:
      planMatch === false ? codeIn(PLAN_CHANGED_REASONS, payload.plan_changed_reason) : null,
  };
}

/**
 * DB 예외를 화면이 구분할 수 있는 사유 코드로 옮긴다.
 *
 * 예전에는 어떤 이유로 거절됐든 502 한 덩어리였고 화면도 `주문을 넣지 못했어` 하나만
 * 띄웠다. 잔액이 모자란 건지, 매도 예약이 수량을 잠근 건지, 아예 요청이 나가지도 않은
 * 건지 **화면에서 구분할 방법이 없어서** 매도가 막혔을 때 원인을 서버 로그 없이는 댈 수
 * 없었다.
 *
 * 문구는 `apply_trade`·`reserve_order` 의 `raise exception` 과 짝이다 — 그쪽을 고치면
 * 여기도 함께 고친다. 모르는 예외는 `server_error` 로 두고 화면이 기존 문구를 쓴다.
 */
export function rejectionReason(error: unknown): string {
  const message = String(error);
  if (message.includes("잔액이 부족합니다")) return "insufficient_balance";
  if (message.includes("보유 수량이 부족합니다")) return "insufficient_quantity";
  if (message.includes("등록되지 않은 종목입니다")) return "unknown_stock";
  if (message.includes("0보다 커야 합니다")) return "invalid_amount";
  return "server_error";
}

/**
 * 체결된 주문 하나를 저장한다.
 * 잔액 차감·보유수량 갱신·transactions 기록은 apply_trade 함수 한 트랜잭션에서 처리하므로
 * 같은 주문을 두 번 눌러도 잔액이 어긋나지 않는다. 지정가 대기 주문은 체결 시점에 보낸다.
 */
export async function POST(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const payload = (body ?? {}) as Record<string, unknown>;
  const side = payload.side;
  const stockCode = payload.stock_code;
  const price = positiveNumber(payload.price);
  const quantity = positiveNumber(payload.quantity);

  if (!isSide(side) || typeof stockCode !== "string" || !stockCode || !price || !quantity) {
    return Response.json({ error: "주문 정보가 올바르지 않습니다.", reason: "invalid_amount" }, { status: 400 });
  }
  const reason = typeof payload.reason === "string" ? payload.reason : null;

  // 학교 시간 거래 제한(부모 설정). 체결 전에 본다 — `apply_trade` 는 되돌릴 수 없다.
  if (await blockedBySchoolHours(userId, side)) {
    return Response.json(
      { error: "지금은 보호자가 정한 거래 제한 시간이에요.", reason: "school_hours" },
      { status: 403 },
    );
  }

  try {
    const result = await callRpc<TradeResult>("apply_trade", {
      p_user_id: userId,
      p_stock_code: stockCode,
      p_side: side,
      p_price: price,
      p_quantity: quantity,
      p_reason: reason,
      ...planFields(side, payload),
    });
    console.info(
      JSON.stringify({ event: "trade_saved", userId, stockCode, side, transactionId: result.transaction_id }),
    );
    return Response.json(result);
  } catch (error) {
    // 잔액 부족·수량 부족·미등록 종목은 함수가 예외로 막는다. 어느 쪽이었는지 화면도 알아야 한다.
    const reason = rejectionReason(error);
    console.error(JSON.stringify({ event: "trade_saved", result: "error", reason, message: String(error) }));
    return Response.json({ error: "주문을 저장하지 못했습니다.", reason }, { status: 502 });
  }
}
