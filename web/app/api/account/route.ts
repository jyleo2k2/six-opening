import type { NextRequest } from "next/server";
import { findProfileById, selectRows, sessionUserId } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_BALANCE = 10_000_000;

type AccountRow = { balance: number | string; reserved_balance: number | string | null };
type HoldingRow = {
  stock_id: number;
  quantity: number | string;
  reserved_quantity: number | string | null;
  avg_price: number | string;
  stocks: { stock_code: string; stock_name: string } | null;
};

const amount = (value: number | string | null | undefined) =>
  value === null || value === undefined ? 0 : Number(value);

/**
 * 로그인한 사용자의 잔액과 보유 종목. 계좌 행이 아직 없으면 최초 잔액을 그대로 돌려준다.
 *
 * **`balance` 는 총 현금이고 주문에 쓸 수 있는 돈이 아니다.** 미체결 주문이 잡아 둔 현금은
 * `reserved_balance` 로 잠겨 있다(기능명세 §6.4). 주문 화면이 총 현금을 주문가능금액으로
 * 알면 잠긴 돈까지 쓰려 들고 `reserve_order` 가 그때 거절한다. 그래서 잠긴 양과 쓸 수 있는
 * 양을 함께 준다 — 총자산은 `balance` 로, 주문 한도는 `available` 로 계산한다.
 *
 * 보유 수량도 같다. `quantity` 는 총 보유이고 매도에 쓸 수 있는 몫은
 * `available_quantity` 다 — 매도 예약이 잡은 수량은 총 보유에 남아 있어 평가액에는
 * 들어가지만 다시 팔 수는 없다.
 *
 * **보유 목록은 마지막으로 움직인 순서(`updated_at.desc`)로 준다.** 홈의 `내 보유 종목`
 * 카드는 이 응답의 앞 세 줄만 세우므로(`home-view` 의 `HOME_HOLDING_LIMIT`) 순서가 곧
 * 무엇이 보이느냐다. 정렬을 비워 두면 PostgREST 가 힙 순서로 돌려주는데, Postgres 는
 * 행을 UPDATE 할 때 새 튜플을 힙 끝에 쓴다 — 즉 **방금 매매한 종목일수록 뒤로 밀려**
 * 카드 밖으로 나간다. 매수하고 홈에 와도 목록이 그대로라 "주문이 반영되지 않는다" 로
 * 보였던 자리가 여기다(차트는 `GET /api/trades` 를 새로 읽어 핀이 바로 떴다).
 *
 * `holdings.updated_at` 은 `apply_trade`·`reserve_order`·`settle_order` 가 모두
 * 갱신하므로 체결뿐 아니라 예약을 걸어도 그 종목이 맨 위로 온다 — 방금 손댄 종목이
 * 먼저 보이는 것이 이 자리에서 원하는 바다.
 */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const [profile, accounts, holdings] = await Promise.all([
      findProfileById(userId),
      selectRows<AccountRow>("account", {
        select: "balance,reserved_balance",
        user_id: `eq.${userId}`,
        limit: "1",
      }),
      selectRows<HoldingRow>("holdings", {
        select: "stock_id,quantity,reserved_quantity,avg_price,stocks(stock_code,stock_name)",
        user_id: `eq.${userId}`,
        order: "updated_at.desc",
      }),
    ]);
    if (!profile) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    const balance = accounts[0] ? Number(accounts[0].balance) : SEED_BALANCE;
    const reserved = accounts[0] ? amount(accounts[0].reserved_balance) : 0;

    return Response.json({
      user_id: profile.id,
      name: profile.name,
      parent_child: profile.parent_child,
      guardian_role: profile.guardian_role,
      balance,
      reserved,
      available: Math.max(0, balance - reserved),
      holdings: holdings.map((row) => {
        const quantity = Number(row.quantity);
        const reservedQuantity = amount(row.reserved_quantity);
        return {
          stock_id: row.stock_id,
          stock_code: row.stocks?.stock_code ?? null,
          stock_name: row.stocks?.stock_name ?? null,
          quantity,
          reserved_quantity: reservedQuantity,
          available_quantity: Math.max(0, quantity - reservedQuantity),
          avg_price: Number(row.avg_price),
        };
      }),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "account_read", result: "error", message: String(error) }));
    return Response.json({ error: "계좌를 불러오지 못했습니다." }, { status: 502 });
  }
}
