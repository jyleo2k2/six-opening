import type { NextRequest } from "next/server";
import { callRpc, sessionUserId } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TradeResult = { transaction_id: string; balance: number; realized_profit: number | null };

const isSide = (value: unknown): value is "buy" | "sell" => value === "buy" || value === "sell";

const positiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

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
  const confidence =
    typeof payload.confidence === "number" && Number.isFinite(payload.confidence)
      ? payload.confidence
      : null;

  try {
    const result = await callRpc<TradeResult>("apply_trade", {
      p_user_id: userId,
      p_stock_code: stockCode,
      p_side: side,
      p_price: price,
      p_quantity: quantity,
      p_reason: reason,
      p_confidence: confidence,
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
