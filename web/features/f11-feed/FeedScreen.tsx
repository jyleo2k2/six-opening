"use client";

import { useEffect, useMemo, useState } from "react";
import { COMMENT_MAX_LENGTH } from "../../shared/engine/comment-filter";
import { useFamilyFeedStore } from "../../shared/store/use-family-feed-store";
import type { FamilyMember, Trade, TradeComment } from "../../shared/types/trade";
import { Button, Card, PhoneShell, ScreenHeader, TabBar } from "../../shared/ui";

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

function formatWhen(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function CommentList({ comments, labels }: {
  comments: TradeComment[];
  labels: Record<FamilyMember, string>;
}) {
  if (comments.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-gray/40 pt-3">
      {comments.map((comment) => (
        <li key={comment.id} className="text-xs leading-5">
          <span className="font-bold text-navy">{labels[comment.author]}</span>
          <span className="ml-2 text-ink">{comment.body}</span>
        </li>
      ))}
    </ul>
  );
}

function CommentComposer({ trade }: { trade: Trade }) {
  const addComment = useFamilyFeedStore((state) => state.addComment);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  return (
    <form className="mt-3 space-y-2" onSubmit={(event) => {
      event.preventDefault();
      const result = addComment(trade, body);
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
        <Button type="submit" variant="secondary">남기기</Button>
      </div>
      {error && <p className="rounded-xl bg-bg px-3 py-2 text-xs leading-5 text-magenta" role="alert">{error}</p>}
    </form>
  );
}

function TradeCard({ trade, viewerId, comments, labels, onOpenChart }: {
  trade: FamilyTrade;
  viewerId: number;
  comments: TradeComment[];
  labels: Record<FamilyMember, string>;
  onOpenChart: (symbol: string) => void;
}) {
  const own = trade.userId === viewerId;
  const commentTrade: Trade = {
    id: trade.id, member: trade.memberRole, symbol: trade.symbol, side: trade.side,
    quantity: trade.quantity ?? 0, price: trade.price ?? 0, reason: trade.reason, memo: "",
    tradedAt: trade.tradedAt,
  };
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
      <CommentList comments={comments} labels={labels} />
      <CommentComposer trade={commentTrade} />
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
  const [selectedMember, setSelectedMember] = useState<number | "all">("all");
  const comments = useFamilyFeedStore((state) => state.comments);
  const setViewer = useFamilyFeedStore((state) => state.setViewer);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/family", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "가족 기록을 불러오지 못했습니다.");
        return response.json() as Promise<FamilyData>;
      })
      .then((data) => {
        if (!Array.isArray(data.members) || !Array.isArray(data.trades)) throw new Error("가족 기록 형식이 올바르지 않습니다.");
        setFamily(data);
        setViewer(data.viewer.role);
      })
      .catch((cause) => { if (cause?.name !== "AbortError") setError(cause instanceof Error ? cause.message : "가족 기록을 불러오지 못했습니다."); });
    return () => controller.abort();
  }, [setViewer]);

  const feed = useMemo(() => (family?.trades ?? [])
    .filter((trade) => selectedMember === "all" || trade.userId === selectedMember)
    .sort((left, right) => right.tradedAt.localeCompare(left.tradedAt)), [family, selectedMember]);
  const labels: Record<FamilyMember, string> = {
    child: family?.viewer.role === "child" ? family.viewer.name : "자녀",
    parent: family?.viewer.role === "parent" ? family.viewer.name : "부모",
  };

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
        {family && feed.length === 0 && <Card><p className="text-sm text-ink">아직 체결된 거래가 없어요.</p></Card>}
        {family && feed.map((trade) => (
          <TradeCard
            comments={comments.filter((comment) => comment.tradeId === trade.id)}
            key={trade.id} labels={labels} onOpenChart={onOpenChart}
            trade={trade} viewerId={family.viewer.id}
          />
        ))}
      </div>
      <TabBar active="records" />
    </PhoneShell>
  );
}
