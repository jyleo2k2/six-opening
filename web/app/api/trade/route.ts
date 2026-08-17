import type { NextRequest } from "next/server";
import { callRpc, sessionUserId } from "../supabase";

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
    return Response.json({ error: "주문 정보가 올바르지 않습니다." }, { status: 400 });
  }
  const reason = typeof payload.reason === "string" ? payload.reason : null;

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
    // 잔액 부족·수량 부족·미등록 종목은 함수가 예외로 막는다.
    console.error(JSON.stringify({ event: "trade_saved", result: "error", message: String(error) }));
    return Response.json({ error: "주문을 저장하지 못했습니다." }, { status: 502 });
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * 이미 남긴 기록에 한 줄 메모를 단다 (F2 SPEC §5.3 매도 완료).
 *
 * 매도 메모는 **체결이 끝난 뒤** 완료 화면에서 적으므로 `apply_trade` 로는 들어올 수 없다
 * (그 함수는 메모를 매수 전용으로 막는다 — §7.1). 예전에는 `kw_proto_v1.sellRecords` 에만
 * 쌓였고 다시 읽는 곳이 없어, 화면이 적어 둔 "나중에 다시 보여줄게요" 가 지켜진 적이 없었다.
 *
 * 남의 기록은 고칠 수 없다 — 판정은 `set_trade_memo` 안의 `user_id` 대조가 한다.
 */
export async function PATCH(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const payload = (body ?? {}) as Record<string, unknown>;
  const transactionId = payload.transaction_id;
  if (typeof transactionId !== "string" || !UUID.test(transactionId)) {
    return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 400 });
  }
  const memo = typeof payload.memo === "string" ? payload.memo.trim() : "";
  // 길이는 여기서 잘라 저장하지 않고 거절한다. 주문 본문의 부가 필드와 달리 메모가 곧
  // 요청의 전부라, 조용히 자르면 사용자가 적은 것과 다른 문장이 남는다.
  if (memo.length > MEMO_MAX_LENGTH) {
    return Response.json({ error: "메모가 너무 깁니다." }, { status: 400 });
  }

  try {
    await callRpc("set_trade_memo", {
      p_user_id: userId,
      p_transaction_id: transactionId,
      p_memo: memo || null,
    });
    console.info(JSON.stringify({ event: "trade_memo_saved", userId, transactionId }));
    return Response.json({ transaction_id: transactionId });
  } catch (error) {
    console.error(JSON.stringify({ event: "trade_memo_saved", result: "error", message: String(error) }));
    return Response.json({ error: "메모를 저장하지 못했습니다." }, { status: 502 });
  }
}
