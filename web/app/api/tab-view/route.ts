import type { NextRequest } from "next/server";
import { insertRow, sessionUserId } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 종목 카드 목록 진입부터 매수 화면 도달까지 이 시간을 넘겨야 저장한다. */
export const MIN_DURATION_MS = 10_000;

type TabViewRow = { id: string; duration_seconds: number | string | null };

const parseTime = (value: unknown) => {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

/**
 * 저장 대상은 매수 화면까지 도달한 관찰 구간뿐이다.
 * 10초 판정은 화면에서도 하지만 서버에서 다시 확인한다.
 * duration_seconds 는 generated 컬럼이라 보내지 않는다.
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
  const openedAt = parseTime(payload.opened_at);
  const closedAt = parseTime(payload.closed_at);
  const tabCount = payload.tab_count;

  if (openedAt === null || closedAt === null) {
    return Response.json({ error: "시각 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!Number.isInteger(tabCount) || (tabCount as number) < 0) {
    return Response.json({ error: "탭 횟수가 올바르지 않습니다." }, { status: 400 });
  }
  if (closedAt - openedAt < MIN_DURATION_MS) {
    return Response.json({ skipped: "too_short" });
  }

  try {
    const row = await insertRow<TabViewRow>("stock_tab_views", {
      user_id: userId,
      opened_at: new Date(openedAt).toISOString(),
      closed_at: new Date(closedAt).toISOString(),
      tab_count: tabCount,
    });
    console.info(
      JSON.stringify({ event: "tab_view_saved", userId, id: row.id, seconds: row.duration_seconds }),
    );
    return Response.json({ id: row.id, duration_seconds: row.duration_seconds });
  } catch (error) {
    console.error(JSON.stringify({ event: "tab_view_saved", result: "error", message: String(error) }));
    return Response.json({ error: "행동 기록을 저장하지 못했습니다." }, { status: 502 });
  }
}
