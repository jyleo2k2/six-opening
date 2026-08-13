"use client";

import { useEffect, useMemo, useState } from "react";
import { STOCKS } from "../../shared/data/stocks";
import { COMMENT_MAX_LENGTH } from "../../shared/engine/comment-filter";
import { MEMBER_LABEL, useFamilyFeedStore } from "../../shared/store/use-family-feed-store";
import { readPrototypeTrades } from "../../shared/store/prototype-trades";
import type { FamilyMember, Trade, TradeComment } from "../../shared/types/trade";
import { Button, Card, PhoneShell, ScreenHeader, TabBar } from "../../shared/ui";

/** 카드 제목에 회사명만 필요하다. 시세는 피드에 올리지 않는다. */
const NAME_BY_SYMBOL = new Map(STOCKS.map((stock) => [stock.symbol, stock.name]));

function formatWhen(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function CommentList({ comments }: { comments: TradeComment[] }) {
  if (comments.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2 border-t border-gray/40 pt-3">
      {comments.map((comment) => (
        <li key={comment.id} className="text-xs leading-5">
          <span className="font-bold text-navy">{MEMBER_LABEL[comment.author]}</span>
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
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const result = addComment(trade, body);
        if (result.ok) {
          setBody("");
          setError(undefined);
          return;
        }
        setError(result.message);
      }}
    >
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border border-gray bg-white px-3 py-2 text-xs text-ink"
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(event) => setBody(event.target.value)}
          placeholder="궁금한 점을 물어보세요"
          value={body}
        />
        <Button type="submit" variant="secondary">
          남기기
        </Button>
      </div>
      {error && (
        <p className="rounded-xl bg-bg px-3 py-2 text-xs leading-5 text-magenta" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function TradeCard({ trade, viewer, comments, highlighted, onOpenChart }: {
  trade: Trade;
  viewer: FamilyMember;
  comments: TradeComment[];
  highlighted: boolean;
  onOpenChart: (symbol: string) => void;
}) {
  const stockName = NAME_BY_SYMBOL.get(trade.symbol);
  const own = trade.member === viewer;

  return (
    <Card className={highlighted ? "border-2 border-magenta" : undefined} id={`trade-${trade.id}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-navy">
          {MEMBER_LABEL[trade.member]} · {stockName ?? trade.symbol}
        </p>
        <p className="text-xs text-ink/60">{formatWhen(trade.tradedAt)}</p>
      </div>

      <p className={`mt-1 text-sm font-bold ${trade.side === "buy" ? "text-up" : "text-down"}`}>
        {trade.side === "buy" ? "매수" : "매도"}
        {/* 수량·금액은 자산 규모를 드러내므로 본인 카드에만 표시한다 (v2.7 §11.4). */}
        {own && ` · ${trade.quantity}주 · ${formatWon(trade.price)}`}
      </p>

      <dl className="mt-2 space-y-1 text-xs text-ink">
        <div className="flex gap-2">
          <dt className="shrink-0 text-ink/60">고른 이유</dt>
          <dd className="font-medium">{trade.reason}</dd>
        </div>
        {trade.memo && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-ink/60">한 줄 생각</dt>
            <dd>{trade.memo}</dd>
          </div>
        )}
      </dl>

      <CommentList comments={comments} />
      <CommentComposer trade={trade} />

      <button
        className="mt-3 w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-xs font-bold text-navy"
        onClick={() => onOpenChart(trade.symbol)}
        type="button"
      >
        차트에서 이 지점 보기
      </button>
    </Card>
  );
}

export function FeedScreen({ onClose, onOpenChart }: {
  onClose: () => void;
  onOpenChart: (symbol: string) => void;
}) {
  // 본인 거래는 app.html 이 localStorage 에 쌓은 것이 원본이다.
  // 열 때마다 다시 읽어야 방금 한 거래가 바로 보인다.
  const [ownTrades, setOwnTrades] = useState<Trade[]>([]);
  useEffect(() => setOwnTrades(readPrototypeTrades()), []);

  const viewer = useFamilyFeedStore((state) => state.viewer);
  const setViewer = useFamilyFeedStore((state) => state.setViewer);
  const familyTrades = useFamilyFeedStore((state) => state.familyTrades);
  const comments = useFamilyFeedStore((state) => state.comments);

  const feed = useMemo(
    () =>
      [...ownTrades, ...familyTrades].sort((left, right) =>
        right.tradedAt.localeCompare(left.tradedAt),
      ),
    [familyTrades, ownTrades],
  );

  return (
    <PhoneShell>
      <ScreenHeader
        title="가족 기록"
        onBack={onClose}
      />

      <p className="px-4 text-xs text-ink/70">서로의 판단을 보고 이야기해요</p>

      <div className="mt-3 flex gap-2 px-4">
        {(["child", "parent"] as const).map((member) => (
          <button
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-bold ${
              viewer === member ? "border-magenta bg-magenta text-white" : "border-gray bg-white text-ink"
            }`}
            key={member}
            onClick={() => setViewer(member)}
            type="button"
          >
            {MEMBER_LABEL[member]}로 보기
          </button>
        ))}
      </div>

      <div className="space-y-3 p-4">
        {feed.length === 0 ? (
          <Card>
            <p className="text-sm text-ink">아직 기록이 없어요. 첫 거래를 하면 여기에 쌓여요.</p>
          </Card>
        ) : (
          feed.map((trade) => (
            <TradeCard
              comments={comments.filter((comment) => comment.tradeId === trade.id)}
              highlighted={false}
              key={trade.id}
              onOpenChart={onOpenChart}
              trade={trade}
              viewer={viewer}
            />
          ))
        )}
      </div>

      <TabBar active="records" />
    </PhoneShell>
  );
}
