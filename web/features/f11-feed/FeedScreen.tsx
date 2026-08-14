"use client";

import { useEffect, useMemo, useState } from "react";
import { COMMENT_MAX_LENGTH } from "../../shared/engine/comment-filter";
import type { FamilyMember } from "../../shared/types/trade";
import { Card, PhoneShell, ScreenHeader, TabBar } from "../../shared/ui";

type FamilyTrade = {
  id: string;
  userId: number;
  memberName: string;
  memberRole: FamilyMember;
  symbol: string;
  stockName: string;
  side: "buy" | "sell";
  price: number | null;
  quantity: number | null;
  reason: string;
  tradedAt: string;
};
type FamilyData = {
  viewer: { id: number; name: string; role: FamilyMember };
  members: Array<{ id: number; name: string; role: FamilyMember }>;
  trades: FamilyTrade[];
};
type FeedComment = {
  id: string | number;
  transactionId: string;
  author: FamilyMember;
  authorName: string;
  body: string;
  createdAt: string;
  mine: boolean;
};
type LikeSummary = { transactionId: string; count: number; liked: boolean };
type SubmitResult = { ok: true } | { ok: false; message: string };

function formatWhen(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

async function responseBody(response: Response) {
  return response.json().catch(() => null) as Promise<Record<string, unknown> | null>;
}

function messageOf(payload: Record<string, unknown> | null, fallback: string) {
  return typeof payload?.error === "string" ? payload.error : fallback;
}

function CommentList({ comments, deletingId, onDelete }: {
  comments: FeedComment[];
  deletingId?: string;
  onDelete: (comment: FeedComment) => void;
}) {
  if (comments.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-gray/40 pt-3">
      {comments.map((comment) => (
        <li className="flex items-start justify-between gap-2 text-xs leading-5" key={comment.id}>
          <p className="min-w-0 flex-1">
            <span className="font-bold text-navy">{comment.authorName}</span>
            <span className="ml-2 break-words text-ink">{comment.body}</span>
          </p>
          {comment.mine && (
            <button
              className="shrink-0 text-[11px] font-bold text-ink/50 disabled:opacity-40"
              disabled={deletingId === String(comment.id)}
              onClick={() => onDelete(comment)}
              type="button"
            >삭제</button>
          )}
        </li>
      ))}
    </ul>
  );
}

function CommentComposer({ transactionId, onSubmit }: {
  transactionId: string;
  onSubmit: (transactionId: string, body: string) => Promise<SubmitResult>;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <form className="mt-3 space-y-2" onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      const result = await onSubmit(transactionId, body);
      setBusy(false);
      if (result.ok) { setBody(""); setError(undefined); } else setError(result.message);
    }}>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-gray bg-white px-3 py-2 text-xs text-ink"
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(event) => setBody(event.target.value)}
          placeholder="궁금한 점을 물어보세요"
          value={body}
        />
        <button
          className="rounded-xl bg-navy px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={busy || body.trim().length === 0}
          type="submit"
        >{busy ? "저장 중" : "남기기"}</button>
      </div>
      {error && <p className="rounded-xl bg-bg px-3 py-2 text-xs leading-5 text-magenta" role="alert">{error}</p>}
    </form>
  );
}

function TradeCard({ trade, viewerId, comments, like, liking, deletingCommentId, onAddComment, onDeleteComment, onToggleLike, onOpenChart }: {
  trade: FamilyTrade;
  viewerId: number;
  comments: FeedComment[];
  like?: LikeSummary;
  liking: boolean;
  deletingCommentId?: string;
  onAddComment: (transactionId: string, body: string) => Promise<SubmitResult>;
  onDeleteComment: (comment: FeedComment) => void;
  onToggleLike: (transactionId: string) => void;
  onOpenChart: (symbol: string) => void;
}) {
  const own = trade.userId === viewerId;
  return (
    <Card id={`trade-${trade.id}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-navy">{trade.memberName} · {trade.stockName || trade.symbol}</p>
        <p className="text-xs text-ink/60">{formatWhen(trade.tradedAt)}</p>
      </div>
      <p className={`mt-1 text-sm font-bold ${trade.side === "buy" ? "text-up" : "text-down"}`}>
        {trade.side === "buy" ? "매수" : "매도"}
        {own && trade.quantity !== null && trade.price !== null &&
          ` · ${trade.quantity}주 · 주당 ${formatWon(trade.price)}`}
      </p>
      <dl className="mt-2 text-xs text-ink">
        <div className="flex gap-2"><dt className="shrink-0 text-ink/60">고른 이유</dt><dd className="font-medium">{trade.reason}</dd></div>
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          aria-pressed={like?.liked ?? false}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${like?.liked ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"}`}
          disabled={liking}
          onClick={() => onToggleLike(trade.id)}
          type="button"
        >좋아요 {like?.count ?? 0}</button>
        <span className="self-center text-xs text-ink/50">댓글 {comments.length}</span>
      </div>
      <CommentList comments={comments} deletingId={deletingCommentId} onDelete={onDeleteComment} />
      <CommentComposer onSubmit={onAddComment} transactionId={trade.id} />
      <button
        className="mt-3 w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-xs font-bold text-navy"
        onClick={() => onOpenChart(trade.symbol)} type="button"
      >종목 자세히 보기</button>
    </Card>
  );
}

export function FeedScreen({ onClose, onOpenChart }: {
  onClose: () => void;
  onOpenChart: (symbol: string) => void;
}) {
  const [family, setFamily] = useState<FamilyData>();
  const [error, setError] = useState<string>();
  const [reactionError, setReactionError] = useState<string>();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [likes, setLikes] = useState<Record<string, LikeSummary>>({});
  const [selectedMember, setSelectedMember] = useState<number | "all">("all");
  const [likingId, setLikingId] = useState<string>();
  const [deletingCommentId, setDeletingCommentId] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const familyResponse = await fetch("/api/family", { cache: "no-store", signal: controller.signal });
        const familyPayload = await responseBody(familyResponse);
        if (!familyResponse.ok) throw new Error(messageOf(familyPayload, "가족 기록을 불러오지 못했습니다."));
        const data = familyPayload as unknown as FamilyData;
        if (!Array.isArray(data.members) || !Array.isArray(data.trades)) throw new Error("가족 기록 형식이 올바르지 않습니다.");
        setFamily(data);
        if (data.trades.length === 0) return;

        const ids = encodeURIComponent(data.trades.map((trade) => trade.id).join(","));
        const [commentResponse, likeResponse] = await Promise.all([
          fetch(`/api/comments?transaction_id=${ids}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/likes?transaction_id=${ids}`, { cache: "no-store", signal: controller.signal }),
        ]);
        const [commentPayload, likePayload] = await Promise.all([
          responseBody(commentResponse), responseBody(likeResponse),
        ]);
        const failures: string[] = [];
        if (commentResponse.ok && Array.isArray(commentPayload?.comments)) {
          setComments(commentPayload.comments as FeedComment[]);
        } else failures.push(messageOf(commentPayload, "댓글을 불러오지 못했습니다."));
        if (likeResponse.ok && Array.isArray(likePayload?.likes)) {
          const next: Record<string, LikeSummary> = {};
          for (const item of likePayload.likes as LikeSummary[]) next[item.transactionId] = item;
          setLikes(next);
        } else failures.push(messageOf(likePayload, "좋아요를 불러오지 못했습니다."));
        if (failures.length > 0) setReactionError(failures.join(" "));
      } catch (cause) {
        if ((cause as { name?: string })?.name !== "AbortError") {
          setError(cause instanceof Error ? cause.message : "가족 기록을 불러오지 못했습니다.");
        }
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const addComment = async (transactionId: string, body: string): Promise<SubmitResult> => {
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transactionId, body }),
      });
      const payload = await responseBody(response);
      if (!response.ok) return { ok: false, message: messageOf(payload, "코멘트를 저장하지 못했습니다.") };
      setComments((current) => [...current, payload as unknown as FeedComment]);
      setReactionError(undefined);
      return { ok: true };
    } catch {
      return { ok: false, message: "코멘트를 저장하지 못했습니다." };
    }
  };

  const deleteComment = async (comment: FeedComment) => {
    const id = String(comment.id);
    setDeletingCommentId(id);
    try {
      const response = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const payload = await responseBody(response);
      if (!response.ok) throw new Error(messageOf(payload, "코멘트를 지우지 못했습니다."));
      setComments((current) => current.filter((item) => String(item.id) !== id));
      setReactionError(undefined);
    } catch (cause) {
      setReactionError(cause instanceof Error ? cause.message : "코멘트를 지우지 못했습니다.");
    } finally {
      setDeletingCommentId(undefined);
    }
  };

  const toggleLike = async (transactionId: string) => {
    setLikingId(transactionId);
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transactionId }),
      });
      const payload = await responseBody(response);
      if (!response.ok) throw new Error(messageOf(payload, "좋아요를 저장하지 못했습니다."));
      setLikes((current) => ({ ...current, [transactionId]: payload as unknown as LikeSummary }));
      setReactionError(undefined);
    } catch (cause) {
      setReactionError(cause instanceof Error ? cause.message : "좋아요를 저장하지 못했습니다.");
    } finally {
      setLikingId(undefined);
    }
  };

  const feed = useMemo(() => (family?.trades ?? [])
    .filter((trade) => selectedMember === "all" || trade.userId === selectedMember)
    .sort((left, right) => right.tradedAt.localeCompare(left.tradedAt)), [family, selectedMember]);

  return (
    <PhoneShell>
      <ScreenHeader title="가족 기록" onBack={onClose} />
      <p className="px-4 text-xs text-ink/70">같은 가족의 판단을 보고 이야기해요</p>
      {family && (
        <div className="mt-3 flex flex-wrap gap-2 px-4">
          <button className={`rounded-full border px-3 py-2 text-xs font-bold ${selectedMember === "all" ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"}`} onClick={() => setSelectedMember("all")} type="button">전체</button>
          {family.members.map((member) => (
            <button className={`rounded-full border px-3 py-2 text-xs font-bold ${selectedMember === member.id ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"}`} key={member.id} onClick={() => setSelectedMember(member.id)} type="button">{member.name}</button>
          ))}
        </div>
      )}
      <div className="space-y-3 p-4">
        {!family && !error && <Card><p className="text-sm text-ink">가족 기록을 불러오는 중이에요.</p></Card>}
        {error && <Card><p className="text-sm text-magenta" role="alert">{error}</p></Card>}
        {reactionError && <Card><p className="text-xs text-magenta" role="alert">{reactionError}</p></Card>}
        {family && feed.length === 0 && <Card><p className="text-sm text-ink">아직 체결된 거래가 없어요.</p></Card>}
        {family && feed.map((trade) => (
          <TradeCard
            comments={comments.filter((comment) => comment.transactionId === trade.id)}
            deletingCommentId={deletingCommentId}
            key={trade.id}
            like={likes[trade.id]}
            liking={likingId === trade.id}
            onAddComment={addComment}
            onDeleteComment={(comment) => { void deleteComment(comment); }}
            onOpenChart={onOpenChart}
            onToggleLike={(transactionId) => { void toggleLike(transactionId); }}
            trade={trade}
            viewerId={family.viewer.id}
          />
        ))}
      </div>
      <TabBar active="records" />
    </PhoneShell>
  );
}
