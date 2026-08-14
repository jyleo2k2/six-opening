import type { NextRequest } from "next/server";
import { findProfileById, selectRows, sessionUserId } from "../supabase";
import type { ChartTrade } from "../../../shared/engine/trade-markers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 한 종목의 가족 체결 목록. 차트 매매 지점 마커의 유일한 출처다 (F11 SPEC §6.1).
 *
 * `transactions` 에는 체결만 들어가므로 미체결 예약주문은 애초에 섞이지 않는다.
 * 수량은 여기서 지운다 — 열람 계정을 클라이언트에 넘겨 가리게 하면 남의 수량이
 * 응답에는 실려 오므로 가리는 시늉일 뿐이다. 세션은 서버가 이미 안다.
 */
type TransactionRow = {
  id: string;
  user_id: number;
  side: "buy" | "sell";
  trade_price: number | string;
  trade_quantity: number | string;
  trade_reason: string | null;
  plan_code: string | null;
  plan_target_price: number | string | null;
  memo: string | null;
  plan_match: boolean | null;
  plan_changed_reason: string | null;
  created_at: string;
  profiles: { name: string; parent_child: "parent" | "child" | null } | null;
};

/**
 * 마커 계산에 필요한 `ChartTrade` 에 질문식 기록을 얹은 모양 (F2 SPEC §7.1).
 * `buildTradeMarkers` 는 이 필드를 읽지 않으므로 `ChartTrade` 자체는 그대로 둔다.
 */
type TradeResponseRow = ChartTrade & {
  reasonCode: string | null;
  planCode: string | null;
  planTargetPrice: number | null;
  memo: string | null;
  planMatch: boolean | null;
  planChangedReason: string | null;
};

const SELECT =
  "id,user_id,side,trade_price,trade_quantity,trade_reason,plan_code,plan_target_price," +
  "memo,plan_match,plan_changed_reason,created_at," +
  "stocks!inner(stock_code),profiles!inner(name,parent_child,family_tag)";

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const symbol = request.nextUrl.searchParams.get("symbol") ?? "";
  if (!/^\d{6}$/u.test(symbol)) {
    return Response.json({ error: "종목 코드가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const profile = await findProfileById(userId);
    if (!profile) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    // 가족 묶음이 없는 계정은 본인 체결만 본다. 빈 family_tag 로 넓게 훑으면 남의 가족이 섞인다.
    const scope: Record<string, string> = profile.family_tag
      ? { "profiles.family_tag": `eq.${profile.family_tag}` }
      : { user_id: `eq.${userId}` };

    const rows = await selectRows<TransactionRow>("transactions", {
      select: SELECT,
      "stocks.stock_code": `eq.${symbol}`,
      ...scope,
      order: "created_at.asc",
    });

    const trades: TradeResponseRow[] = rows.map((row) => ({
      id: row.id,
      name: row.profiles?.name ?? "가족",
      member: row.profiles?.parent_child === "parent" ? "parent" : "child",
      side: row.side,
      price: Number(row.trade_price),
      // 남의 체결 수량은 지운다 — 자산 규모 비노출 (SPEC §6).
      quantity: row.user_id === userId ? Number(row.trade_quantity) : null,
      tradedAt: row.created_at,
      // 이유·계획·메모는 자산 규모가 아니라 가리지 않는다 (F2 SPEC §7.1).
      reasonCode: row.trade_reason?.trim() || null,
      planCode: row.plan_code,
      planTargetPrice: row.plan_target_price === null ? null : Number(row.plan_target_price),
      memo: row.memo?.trim() || null,
      planMatch: row.plan_match,
      planChangedReason: row.plan_changed_reason,
    }));

    return Response.json({ symbol, trades });
  } catch (error) {
    console.error(JSON.stringify({ event: "trades_read", result: "error", message: String(error) }));
    return Response.json({ error: "거래 내역을 불러오지 못했습니다." }, { status: 502 });
  }
}
