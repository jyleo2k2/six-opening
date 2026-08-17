import type { NextRequest } from "next/server";
import { selectFilledTrades, sessionUserId, updateRow } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 가족 투자 피드에 올리는 글.
 *
 * **거래는 그 자체로 피드가 되지 않는다**(2026-08-17). 예전에는 체결이 곧 카드여서
 * 한 번 살 때마다 가족 피드에 저절로 올라갔고, 시험 삼아 눌러 본 매수까지 그대로 갔다.
 * 이제 `transactions.feed_body` 에 글을 쓴 거래만 피드가 된다 — 무엇을 남길지는 산 사람이
 * 정한다.
 *
 * 성향·수익률은 이 글과 무관하다. 그쪽은 체결 전부를 읽는다(`buildSeasonCards`) —
 * 피드에 안 올렸다고 안 산 것이 되면 안 된다.
 *
 * 남의 기록은 손댈 수 없다. 모든 수정은 `user_id` 를 함께 걸어 좁힌다.
 */
export const FEED_BODY_MAX_LENGTH = 300;
/** 글 쓸 거래를 고르는 목록의 길이. 피드에 올릴 만한 것은 대개 최근 것이다. */
export const FEED_CANDIDATE_LIMIT = 20;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CandidateRow = {
  id: string;
  side: "buy" | "sell";
  trade_price: number | string | null;
  trade_quantity: number | string | null;
  trade_reason: string | null;
  feed_body: string | null;
  created_at: string;
  stocks: { stock_code: string; stock_name: string } | null;
};

/**
 * 아직 피드에 안 올린 **내** 체결 기록. 글쓰기 화면이 고를 목록이다.
 *
 * 이미 올린 것은 빼고 준다 — 같은 거래로 카드를 두 장 세울 수 없기 때문이다.
 * 고치거나 내리는 것은 피드 카드 쪽에서 한다.
 */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const rows = await selectFilledTrades<CandidateRow>({
      select: "id,side,trade_price,trade_quantity,trade_reason,feed_body,created_at,stocks(stock_code,stock_name)",
      user_id: `eq.${userId}`,
      feed_body: "is.null",
      order: "created_at.desc",
      limit: String(FEED_CANDIDATE_LIMIT),
    });
    return Response.json({
      trades: rows.flatMap((row) =>
        row.stocks
          ? [{
              id: row.id,
              symbol: row.stocks.stock_code,
              stockName: row.stocks.stock_name,
              side: row.side,
              price: row.trade_price === null ? null : Number(row.trade_price),
              quantity: row.trade_quantity === null ? null : Number(row.trade_quantity),
              reasonCode: row.trade_reason?.trim() || null,
              tradedAt: row.created_at,
            }]
          : [],
      ),
    });
  } catch (error) {
    console.error(JSON.stringify({ event: "feed_candidates", result: "error", message: String(error) }));
    return Response.json({ error: "올릴 기록을 불러오지 못했습니다." }, { status: 502 });
  }
}

/** 요청 본문에서 거래 id 와 글을 꺼낸다. 형식이 틀리면 그 자리에서 거절 응답을 만든다. */
export function readFeedPayload(payload: Record<string, unknown>) {
  const transactionId = payload.transaction_id;
  if (typeof transactionId !== "string" || !UUID.test(transactionId)) {
    return { error: "기록을 찾을 수 없습니다.", status: 400 as const };
  }
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body) return { error: "올릴 글을 적어 주세요.", status: 400 as const };
  // 길이는 잘라 저장하지 않고 거절한다 — 조용히 자르면 쓴 것과 다른 글이 남는다.
  if (body.length > FEED_BODY_MAX_LENGTH) {
    return { error: "글이 너무 깁니다.", status: 400 as const };
  }
  return { transactionId, body };
}

/** 피드에 올린다. 이미 올린 거래면 글만 갈아 끼운다. */
export async function POST(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const parsed = readFeedPayload((raw ?? {}) as Record<string, unknown>);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: parsed.status });

  try {
    // `user_id` 를 함께 걸어 남의 기록에는 닿지 않는다. 없는 거래면 아무것도 안 바뀐다.
    const updated = await updateRow<{ id: string; feed_body: string }>(
      "transactions",
      { id: `eq.${parsed.transactionId}`, user_id: `eq.${userId}`, select: "id,feed_body" },
      { feed_body: parsed.body },
    );
    if (!updated) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    console.info(JSON.stringify({ event: "feed_posted", userId, transactionId: parsed.transactionId }));
    return Response.json({ transaction_id: updated.id, feedBody: updated.feed_body });
  } catch (error) {
    console.error(JSON.stringify({ event: "feed_posted", result: "error", message: String(error) }));
    return Response.json({ error: "피드에 올리지 못했습니다." }, { status: 502 });
  }
}

/**
 * 피드에서 내린다. **거래 기록은 지우지 않는다** — 성향·수익률은 체결을 그대로 읽어야 한다.
 * 내린 뒤에는 다시 글쓰기 목록에 나타난다.
 */
export async function DELETE(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const transactionId = request.nextUrl.searchParams.get("transaction_id");
  if (!transactionId || !UUID.test(transactionId)) {
    return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    const updated = await updateRow<{ id: string }>(
      "transactions",
      { id: `eq.${transactionId}`, user_id: `eq.${userId}`, select: "id" },
      { feed_body: null },
    );
    if (!updated) return Response.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    console.info(JSON.stringify({ event: "feed_removed", userId, transactionId }));
    return Response.json({ transaction_id: updated.id });
  } catch (error) {
    console.error(JSON.stringify({ event: "feed_removed", result: "error", message: String(error) }));
    return Response.json({ error: "피드에서 내리지 못했습니다." }, { status: 502 });
  }
}
