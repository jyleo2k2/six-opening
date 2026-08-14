import type { NextRequest } from "next/server";
import { insertRow, selectRows, sessionUserId } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 기업정보·차트·뉴스 한 번의 방문이 유효하려면 이 시간 이상 머물러야 한다. */
export const MIN_DURATION_MS = 10_000;

type StockRow = { stock_id: number };
type TabViewRow = { id: string; tab_count: number };

const parseTime = (value: unknown) => {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const isQualifyingView = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const view = value as Record<string, unknown>;
  const openedAt = parseTime(view.opened_at);
  const closedAt = parseTime(view.closed_at);
  return openedAt !== null && closedAt !== null && closedAt - openedAt >= MIN_DURATION_MS;
};

/**
 * 프론트는 기업정보·차트·뉴스 중 10초 이상 머문 방문 구간만 골라 보내지만,
 * 서버가 각 구간을 다시 계산해 진짜 10초 이상인 것만 센다.
 * 몇 초 머물렀는지는 저장하지 않고 최종 개수(tab_count)만 종목별로 저장한다.
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
  const stockCode = payload.stock_code;
  const views = payload.views;

  if (typeof stockCode !== "string" || !/^\d{6}$/.test(stockCode)) {
    return Response.json({ error: "종목 코드가 올바르지 않습니다." }, { status: 400 });
  }
  if (!Array.isArray(views)) {
    return Response.json({ error: "체류 기록이 올바르지 않습니다." }, { status: 400 });
  }

  const tabCount = views.filter(isQualifyingView).length;
  if (tabCount === 0) return Response.json({ skipped: "no_qualifying_view" });

  try {
    const stocks = await selectRows<StockRow>("stocks", {
      stock_code: `eq.${stockCode}`,
      select: "stock_id",
      limit: "1",
    });
    const stockId = stocks[0]?.stock_id;
    if (!stockId) return Response.json({ error: "등록되지 않은 종목입니다." }, { status: 400 });

    const row = await insertRow<TabViewRow>("stock_tab_views", {
      user_id: userId,
      stock_id: stockId,
      tab_count: tabCount,
    });
    console.info(
      JSON.stringify({ event: "tab_view_saved", userId, stockCode, id: row.id, tabCount: row.tab_count }),
    );
    return Response.json({ id: row.id, tab_count: row.tab_count });
  } catch (error) {
    console.error(JSON.stringify({ event: "tab_view_saved", result: "error", message: String(error) }));
    return Response.json({ error: "행동 기록을 저장하지 못했습니다." }, { status: 502 });
  }
}
