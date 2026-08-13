import type { NextRequest } from "next/server";
import { deleteRows, insertRow, selectRows, sessionUserId } from "../supabase";
import { authorizeFeedTarget, isTransactionId } from "../feed/access";
import { COMMENT_MAX_LENGTH, gateComment } from "../../../shared/engine/comment-filter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 가족 거래 피드의 코멘트. F11 SPEC §4.
 *
 * 지금까지 코멘트는 `localStorage` 에만 있어서 기기가 다르면 서로 보이지 않았다.
 * "부모와 자녀가 서로의 기록을 보고 대화한다"는 F11 의 핵심이 실제로는 동작하지
 * 않던 상태라 서버에 남긴다.
 *
 * 부모→자녀 게이트를 **서버에서 다시 건다**. `comment-filter` 는 순수 함수라
 * 화면에서도 돌지만, 저장 경로가 생긴 이상 화면 검사만 믿으면 우회된다.
 * 자녀→부모는 검사하지 않는다 (SPEC §4.1).
 */
type CommentRow = {
  id: string;
  transaction_id: string;
  user_id: number;
  body: string;
  created_at: string;
  profiles: { name: string; parent_child: "parent" | "child" | null } | null;
};

const SELECT = "id,transaction_id,user_id,body,created_at,profiles!inner(name,parent_child)";

export type FeedComment = {
  id: string;
  transactionId: string;
  author: "parent" | "child";
  authorName: string;
  body: string;
  createdAt: string;
  /** 삭제 버튼 노출 판단용. 삭제 권한은 서버가 다시 확인한다. */
  mine: boolean;
};

function toComment(row: CommentRow, userId: number): FeedComment {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    author: row.profiles?.parent_child === "parent" ? "parent" : "child",
    authorName: row.profiles?.name ?? "가족",
    body: row.body,
    createdAt: row.created_at,
    mine: row.user_id === userId,
  };
}

/**
 * 게이트를 걸 방향을 정한다. 검사 자체는 `comment-filter` 가 하고 여기서는
 * 누가 누구에게 쓰는지만 정확히 넘긴다 — 이 매핑이 틀리면 게이트가 통째로 무력해진다.
 */
export function resolveCommentGate(input: {
  body: string;
  viewerRole: "parent" | "child" | null;
  ownerRole: "parent" | "child";
}) {
  const author: "parent" | "child" = input.viewerRole === "parent" ? "parent" : "child";
  return { author, result: gateComment({ body: input.body, author, target: input.ownerRole }) };
}

/** GET /api/comments?transaction_id=<id> */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const transactionId = request.nextUrl.searchParams.get("transaction_id");
  if (!isTransactionId(transactionId)) {
    return Response.json({ error: "거래 id 가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const access = await authorizeFeedTarget(userId, transactionId);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const rows = await selectRows<CommentRow>("trade_comments", {
      select: SELECT,
      transaction_id: `eq.${transactionId}`,
      order: "created_at.asc",
    });
    return Response.json({ transactionId, comments: rows.map((row) => toComment(row, userId)) });
  } catch (error) {
    console.error(JSON.stringify({ event: "comments_read", result: "error", message: String(error) }));
    return Response.json({ error: "코멘트를 불러오지 못했습니다." }, { status: 502 });
  }
}

/** POST /api/comments { transaction_id, body } */
export async function POST(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const input = (payload ?? {}) as Record<string, unknown>;
  const transactionId = input.transaction_id;
  const rawBody = input.body;

  if (!isTransactionId(transactionId) || typeof rawBody !== "string") {
    return Response.json({ error: "코멘트 내용이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const access = await authorizeFeedTarget(userId, transactionId);
    if (!access.ok) return Response.json({ error: access.error }, { status: access.status });

    const { author, result: gate } = resolveCommentGate({
      body: rawBody,
      viewerRole: access.target.viewer.parent_child,
      ownerRole: access.target.ownerRole,
    });
    if (!gate.ok) {
      // 차단은 서버 오류가 아니라 내용 문제다. 화면이 안내 문구를 그대로 보여 준다.
      console.info(JSON.stringify({ event: "comment_blocked", userId, transactionId, reason: gate.reason }));
      return Response.json({ error: gate.message, reason: gate.reason }, { status: 422 });
    }

    const row = await insertRow<CommentRow>("trade_comments", {
      transaction_id: transactionId,
      user_id: userId,
      body: gate.body,
    });
    console.info(JSON.stringify({ event: "comment_saved", userId, transactionId, id: row.id }));
    return Response.json({
      id: row.id,
      transactionId,
      author,
      authorName: access.target.viewer.name,
      body: gate.body,
      createdAt: row.created_at,
      mine: true,
    } satisfies FeedComment);
  } catch (error) {
    console.error(JSON.stringify({ event: "comment_saved", result: "error", message: String(error) }));
    return Response.json({ error: "코멘트를 저장하지 못했습니다." }, { status: 502 });
  }
}

/** DELETE /api/comments?id=<id> — 작성자 본인만. 수정은 없다 (SPEC §4). */
export async function DELETE(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!isTransactionId(id)) {
    return Response.json({ error: "코멘트 id 가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    // 작성자 확인을 서버가 한다. 화면이 보낸 작성자 값은 믿지 않는다.
    const rows = await selectRows<{ id: string; user_id: number }>("trade_comments", {
      select: "id,user_id",
      id: `eq.${id}`,
      limit: "1",
    });
    if (rows.length === 0) return Response.json({ error: "코멘트를 찾을 수 없습니다." }, { status: 404 });
    if (rows[0].user_id !== userId) {
      return Response.json({ error: "본인이 쓴 코멘트만 지울 수 있습니다." }, { status: 403 });
    }

    await deleteRows("trade_comments", { id: `eq.${id}`, user_id: `eq.${userId}` });
    console.info(JSON.stringify({ event: "comment_deleted", userId, id }));
    return Response.json({ id, deleted: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "comment_deleted", result: "error", message: String(error) }));
    return Response.json({ error: "코멘트를 지우지 못했습니다." }, { status: 502 });
  }
}

export { COMMENT_MAX_LENGTH };
