import type { NextRequest } from "next/server";
import { callRpc, selectRows, sessionUserId } from "../supabase";
import { chartRetentionCutoff, readStoredCandles } from "../quote/stock-candles";
import { planFields } from "../trade/route";
import { settleDueOrders, type ScheduledOrder } from "./settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 미체결 주문(지정가 대기·장외 예약)의 서버 경계.
 *
 * `transactions` 를 주문 단위로 읽는 유일한 곳이라 `selectFilledTrades` 가 아니라
 * `selectRows` 를 직접 쓴다. 다른 경로는 전부 체결분만 봐야 한다.
 */

type OrderRow = {
  id: string;
  side: "buy" | "sell";
  order_status: string;
  order_type: "market" | "limit";
  limit_price: number | string | null;
  scheduled_for: string | null;
  reserved_amount: number | string | null;
  request_mode: string | null;
  requested_quantity: number | string | null;
  trade_reason: string | null;
  plan_code: string | null;
  plan_target_price: number | string | null;
  memo: string | null;
  plan_match: boolean | null;
  plan_changed_reason: string | null;
  created_at: string;
  stocks: { stock_code: string } | null;
};

const SELECT =
  "id,side,order_status,order_type,limit_price,scheduled_for,reserved_amount,request_mode," +
  "requested_quantity,trade_reason,plan_code,plan_target_price,memo,plan_match," +
  "plan_changed_reason,created_at,stocks!inner(stock_code)";

const num = (value: number | string | null) => (value === null ? null : Number(value));

const positive = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

function toOrder(row: OrderRow) {
  return {
    id: row.id,
    symbol: row.stocks?.stock_code ?? "",
    side: row.side,
    status: row.order_status,
    orderType: row.order_type,
    limitPrice: num(row.limit_price),
    scheduledFor: row.scheduled_for,
    reservedAmount: num(row.reserved_amount),
    requestMode: row.request_mode,
    requestedQuantity: num(row.requested_quantity),
    reasonCode: row.trade_reason?.trim() || null,
    planCode: row.plan_code,
    planTargetPrice: num(row.plan_target_price),
    memo: row.memo?.trim() || null,
    planMatch: row.plan_match,
    planChangedReason: row.plan_changed_reason,
    createdAt: row.created_at,
  };
}

const openOrders = (userId: number) =>
  selectRows<OrderRow>("transactions", {
    select: SELECT,
    user_id: `eq.${userId}`,
    order_status: "in.(pending,scheduled)",
    order: "created_at.asc",
  });

/**
 * 미체결 주문 목록. 읽기 전에 정산이 끝난 예약을 먼저 처리한다.
 *
 * 조회가 쓰기를 겸하는 모양이지만, 그렇게 두면 화면은 이 경로 하나만 부르면 되고 정산
 * 트리거를 클라이언트가 들고 있지 않아도 된다. `settle_order` 가 멱등이라 동시에 두 번
 * 들어와도 중복 체결되지 않는다.
 */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const before = await openOrders(userId);
    const due: ScheduledOrder[] = before
      .filter((row) => row.order_status === "scheduled" && row.scheduled_for && row.stocks?.stock_code)
      .map((row) => ({
        id: row.id,
        symbol: row.stocks!.stock_code,
        scheduledFor: row.scheduled_for!,
      }));

    const settled = await settleDueOrders(
      {
        async loadDailyCandles(symbol) {
          const { points } = await readStoredCandles(symbol, "daily", chartRetentionCutoff("daily"));
          return points;
        },
        settle: (orderId, fillPrice) =>
          callRpc<{ order_status: string; settled: boolean }>("settle_order", {
            p_order_id: orderId,
            p_fill_price: fillPrice,
          }),
      },
      due,
    );

    // 정산이 있었으면 목록을 다시 읽는다. 방금 체결된 주문이 대기 목록에 남으면 안 된다.
    const rows = settled.length > 0 ? await openOrders(userId) : before;
    return Response.json({ orders: rows.map(toOrder), settled });
  } catch (error) {
    console.error(JSON.stringify({ event: "orders_read", result: "error", message: String(error) }));
    return Response.json({ error: "주문을 불러오지 못했습니다." }, { status: 502 });
  }
}

/** 지정가 대기 또는 장외 예약 접수. 자원 잠금은 `reserve_order` 가 한 트랜잭션에서 한다. */
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
  const orderType = payload.order_type === "limit" ? "limit" : "market";
  if ((side !== "buy" && side !== "sell") || typeof stockCode !== "string" || !stockCode) {
    return Response.json({ error: "주문 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const limitPrice = positive(payload.limit_price);
  const reservedAmount = positive(payload.reserved_amount);
  const requestedQuantity = positive(payload.requested_quantity);
  const scheduledFor = typeof payload.scheduled_for === "string" ? payload.scheduled_for : null;
  const requestMode = payload.request_mode === "quantity" ? "quantity" : "amount";

  if (orderType === "limit" && !limitPrice) {
    return Response.json({ error: "지정가는 한도가격이 필요합니다." }, { status: 400 });
  }
  if (orderType === "market" && !scheduledFor) {
    return Response.json({ error: "예약 시장가는 체결 예정일이 필요합니다." }, { status: 400 });
  }
  // 매수는 잠글 금액이, 매도는 잠글 수량이 있어야 예약을 되돌릴 수 있다 (DB 제약과 같은 판단).
  if (side === "buy" ? !reservedAmount : !requestedQuantity) {
    return Response.json({ error: "예약할 금액이나 수량이 없습니다." }, { status: 400 });
  }

  const plan = planFields(side, payload);

  try {
    const result = await callRpc<{ order_id: string; order_status: string }>("reserve_order", {
      p_user_id: userId,
      p_stock_code: stockCode,
      p_side: side,
      p_order_type: orderType,
      p_limit_price: limitPrice,
      p_reserved_amount: side === "buy" ? reservedAmount : null,
      p_request_mode: requestMode,
      p_requested_quantity: requestedQuantity,
      p_scheduled_for: orderType === "market" ? scheduledFor : null,
      p_reason: typeof payload.reason === "string" ? payload.reason : null,
      ...plan,
    });
    console.info(JSON.stringify({ event: "order_reserved", userId, stockCode, side, ...result }));
    return Response.json(result);
  } catch (error) {
    console.error(JSON.stringify({ event: "order_reserved", result: "error", message: String(error) }));
    return Response.json({ error: "주문을 접수하지 못했습니다." }, { status: 502 });
  }
}

/** 예약 취소. 남의 주문을 못 지우게 `cancel_order` 가 user_id 까지 대조한다. */
export async function DELETE(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const orderId = request.nextUrl.searchParams.get("id") ?? "";
  if (!orderId) return Response.json({ error: "주문 번호가 필요합니다." }, { status: 400 });

  try {
    const result = await callRpc<{ order_status: string; cancelled: boolean }>("cancel_order", {
      p_order_id: orderId,
      p_user_id: userId,
    });
    return Response.json(result);
  } catch (error) {
    console.error(JSON.stringify({ event: "order_cancelled", result: "error", message: String(error) }));
    return Response.json({ error: "주문을 취소하지 못했습니다." }, { status: 502 });
  }
}
