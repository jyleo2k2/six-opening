import type { NextRequest } from "next/server";
import { deleteRows, insertRow, selectRows, sessionUserId } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 관심 종목(종목 상세의 하트, 탐색의 `관심 기업` 필터). 원본은 서버다.
 *
 * 예전에는 지갑(`kw_proto_v1.watchlist`)에만 있어서 브라우저를 바꾸면 통째로 사라졌다.
 *
 * 토글 응답으로 **목록 전체**를 돌려준다. 화면이 자기 배열을 직접 고치면 서버와
 * 어긋날 길이 생기므로, 좋아요(`/api/likes`)와 같이 서버가 만든 결과만 쓰게 한다.
 */
type WatchRow = { stocks: { stock_code: string } | null };
type StockRow = { stock_id: number };

const SELECT = "stock_id,stocks!inner(stock_code)";

/**
 * 조인 행을 종목 코드 목록으로 접는다.
 *
 * 종목이 딸려 오지 않은 행은 **버린다**. `undefined` 가 목록에 섞이면 탐색의 관심 기업
 * 필터가 그 자리에서 빈 카드를 그리고, 하트 판정(`includes`)도 어긋난다.
 */
export function watchlistCodes(rows: WatchRow[]): string[] {
  return rows
    .map((row) => row.stocks?.stock_code)
    .filter((code): code is string => typeof code === "string" && code.length > 0);
}

async function listCodes(userId: number): Promise<string[]> {
  return watchlistCodes(
    await selectRows<WatchRow>("watchlist", {
      select: SELECT,
      user_id: `eq.${userId}`,
      order: "created_at.asc",
    }),
  );
}

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    return Response.json({ codes: await listCodes(userId) });
  } catch (error) {
    console.error(JSON.stringify({ event: "watchlist_read", result: "error", message: String(error) }));
    return Response.json({ error: "관심 종목을 불러오지 못했습니다." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const stockCode = (body as Record<string, unknown> | null)?.stock_code;
  if (typeof stockCode !== "string" || !/^\d{6}$/u.test(stockCode)) {
    return Response.json({ error: "종목 코드가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const stocks = await selectRows<StockRow>("stocks", {
      select: "stock_id",
      stock_code: `eq.${stockCode}`,
      limit: "1",
    });
    const stockId = stocks[0]?.stock_id;
    if (!stockId) return Response.json({ error: "등록되지 않은 종목입니다." }, { status: 400 });

    const existing = await selectRows<{ id: number }>("watchlist", {
      select: "id",
      user_id: `eq.${userId}`,
      stock_id: `eq.${stockId}`,
      limit: "1",
    });
    if (existing.length > 0) {
      await deleteRows("watchlist", { user_id: `eq.${userId}`, stock_id: `eq.${stockId}` });
    } else {
      await insertRow("watchlist", { user_id: userId, stock_id: stockId });
    }

    const codes = await listCodes(userId);
    console.info(
      JSON.stringify({ event: "watchlist_toggled", userId, stockCode, watched: codes.includes(stockCode) }),
    );
    return Response.json({ codes });
  } catch (error) {
    console.error(JSON.stringify({ event: "watchlist_toggled", result: "error", message: String(error) }));
    return Response.json({ error: "관심 종목을 저장하지 못했습니다." }, { status: 502 });
  }
}
