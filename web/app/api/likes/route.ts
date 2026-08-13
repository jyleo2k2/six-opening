import type { NextRequest } from "next/server";
import { deleteRows, findProfileById, insertRow, selectRows, sessionUserId } from "../supabase";
import {
  authorizeFeedTarget,
  filterFamilyTransactionIds,
  isTransactionId,
  parseTransactionIds,
} from "../feed/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 가족 거래 피드의 좋아요. F11 SPEC §3 피드 카드 액션.
 *
 * 화면 상태로만 두면 누른 사람 기기에서만 보이고 개수도 항상 0 또는 1이다.
 * 가족이 서로의 기록에 반응하는 게 F11 의 취지라 서버에 남긴다.
 *
 * 같은 체결에 같은 사람이 두 번 누르면 취소로 처리한다(토글).
 * 중복은 `trade_likes (transaction_id, user_id)` 유니크 제약이 최종적으로 막는다.
 */
type LikeRow = { transaction_id: string; user_id: number };

export type LikeSummary = { transactionId: string; count: number; liked: boolean };

export function summarize(rows: LikeRow[], ids: string[], userId: number): LikeSummary[] {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const row of rows) {
    counts.set(row.transaction_id, (counts.get(row.transaction_id) ?? 0) + 1);
    if (row.user_id === userId) mine.add(row.transaction_id);
  }
  return ids.map((id) => ({
    transactionId: id,
    count: counts.get(id) ?? 0,
    liked: mine.has(id),
  }));
}

/** GET /api/likes?transaction_id=a,b,c — 피드가 카드마다 요청하지 않도록 한 번에 받는다. */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const ids = parseTransactionIds(request.nextUrl.searchParams.get("transaction_id"));
  if (!ids) return Response.json({ error: "거래 id 가 올바르지 않습니다." }, { status: 400 });

  try {
    const viewer = await findProfileById(userId);
    if (!viewer) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    // 남의 가족 체결 id 를 섞어 보내도 그 개수는 돌려주지 않는다.
    const allowed = await filterFamilyTransactionIds(viewer, ids);
    if (allowed.length === 0) return Response.json({ likes: [] });

    const rows = await selectRows<LikeRow>("trade_likes", {
      select: "transaction_id,user_id",
      transaction_id: `in.(${allowed.join(",")})`,
    });
    return Response.json({ likes: summarize(rows, allowed, userId) });
  } catch (error) {
    console.error(JSON.stringify({ event: "likes_read", result: "error", message: String(error) }));
    return Response.json({ error: "좋아요를 불러오지 못했습니다." }, { status: 502 });
  }
}

/** POST /api/likes { transaction_id } — 누르면 켜고 다시 누르면 끈다. */
export async function POST(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const transactionId = (body as Record<string, unknown> | null)?.transaction_id;
  if (!isTransactionId(transactionId)) {
    return Response.json({ error: "거래 id 가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const access = await authorizeFeedTarget(userId, transactionId);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const existing = await selectRows<LikeRow>("trade_likes", {
      select: "transaction_id,user_id",
      transaction_id: `eq.${transactionId}`,
      user_id: `eq.${userId}`,
      limit: "1",
    });

    if (existing.length > 0) {
      await deleteRows("trade_likes", {
        transaction_id: `eq.${transactionId}`,
        user_id: `eq.${userId}`,
      });
    } else {
      await insertRow<LikeRow>("trade_likes", { transaction_id: transactionId, user_id: userId });
    }

    const rows = await selectRows<LikeRow>("trade_likes", {
      select: "transaction_id,user_id",
      transaction_id: `eq.${transactionId}`,
    });
    const [summary] = summarize(rows, [transactionId], userId);
    console.info(JSON.stringify({ event: "like_toggled", userId, transactionId, liked: summary.liked }));
    return Response.json(summary);
  } catch (error) {
    console.error(JSON.stringify({ event: "like_toggled", result: "error", message: String(error) }));
    return Response.json({ error: "좋아요를 저장하지 못했습니다." }, { status: 502 });
  }
}
