import type { NextRequest } from "next/server";
import { findProfileById, selectRows, sessionUserId } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_BALANCE = 10_000_000;

type AccountRow = { balance: number | string };
type HoldingRow = {
  stock_id: number;
  quantity: number | string;
  avg_price: number | string;
  stocks: { stock_code: string; stock_name: string } | null;
};

/** 로그인한 사용자의 잔액과 보유 종목. 계좌 행이 아직 없으면 최초 잔액을 그대로 돌려준다. */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const [profile, accounts, holdings] = await Promise.all([
      findProfileById(userId),
      selectRows<AccountRow>("account", {
        select: "balance",
        user_id: `eq.${userId}`,
        limit: "1",
      }),
      selectRows<HoldingRow>("holdings", {
        select: "stock_id,quantity,avg_price,stocks(stock_code,stock_name)",
        user_id: `eq.${userId}`,
      }),
    ]);
    if (!profile) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    return Response.json({
      user_id: profile.id,
      name: profile.name,
      parent_child: profile.parent_child,
      balance: accounts[0] ? Number(accounts[0].balance) : SEED_BALANCE,
      holdings: holdings.map((row) => ({
        stock_id: row.stock_id,
        stock_code: row.stocks?.stock_code ?? null,
        stock_name: row.stocks?.stock_name ?? null,
        quantity: Number(row.quantity),
        avg_price: Number(row.avg_price),
      })),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "account_read", result: "error", message: String(error) }));
    return Response.json({ error: "계좌를 불러오지 못했습니다." }, { status: 502 });
  }
}
