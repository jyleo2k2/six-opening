"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedComment, FeedLike, FamilyTotal, FamilyTrade } from "./archive-feed";
import type { FamilyRow, SeasonCards } from "./archive-profile-view";

/**
 * 아카이브가 서버에서 읽는 것 전부. `ui-src/methods/load*.js` 넷을 한 훅으로 모았다.
 *
 * 세 경로는 서로 기다리지 않는다 — 성향 카드가 가족 응답을 기다리면 화면이 늦게 뜬다.
 * 다만 반응(댓글·좋아요)만은 가족 체결 id 를 알아야 부를 수 있어 그 뒤에 이어 붙인다.
 *
 * **성향 캐릭터는 `season-cards` 하나만 읽는다.** 예전에는 `GET /api/profile/behavior` 도
 * 함께 불러 그 캐릭터를 먼저 표시했는데, 두 응답이 순서대로 도착하며 캐릭터 이름이
 * 바뀌어 보였다. 그 API 는 신버전 엔진이 없던 시절의 근사라 F9 SPEC §3.2 에서 삭제했다.
 */
export type ArchiveData = {
  season: SeasonCards;
  family: {
    viewer?: { id: number };
    members: FamilyRow[];
    trades: FamilyTrade[];
    total?: FamilyTotal;
    page?: {
      offset: number;
      limit: number;
      hasMore: boolean;
      nextOffset: number | null;
    };
  } | null;
  comments: Record<string, FeedComment[]>;
  likes: Record<string, FeedLike>;
};

/** 아직 피드에 안 올린 내 체결 기록. 글쓰기 시트가 고를 목록이다. */
export type FeedCandidate = {
  id: string;
  symbol: string;
  stockName: string;
  side: "buy" | "sell";
  price: number | null;
  quantity: number | null;
  reasonCode: string | null;
  tradedAt: string;
};

const json = (response: Response) => (response.ok ? response.json() : null);

export function useArchiveData() {
  const [season, setSeason] = useState<SeasonCards>(null);
  const [family, setFamily] = useState<ArchiveData["family"]>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [likes, setLikes] = useState<Record<string, FeedLike>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const familyRef = useRef<ArchiveData["family"]>(null);
  const loadingMoreRef = useRef(false);

  /** 한 페이지(최대 50건)의 댓글·좋아요를 묶어 읽고 기존 페이지 뒤에 합친다. */
  const loadReactions = useCallback((trades: FamilyTrade[]) => {
    const ids = [...new Set(trades.map((t) => t.id).filter(Boolean))];
    if (!ids.length) return Promise.resolve();
    const query = encodeURIComponent(ids.join(","));
    return Promise.all([
      fetch(`/api/comments?transaction_id=${query}`, { cache: "no-store" }).then(json),
      fetch(`/api/likes?transaction_id=${query}`, { cache: "no-store" }).then(json),
    ])
      .then(([commentPayload, likePayload]) => {
        if (Array.isArray(commentPayload?.comments)) {
          const grouped: Record<string, FeedComment[]> = {};
          for (const comment of commentPayload.comments as FeedComment[]) {
            grouped[comment.transactionId] = [...(grouped[comment.transactionId] ?? []), comment];
          }
          setComments((current) => ({ ...current, ...grouped }));
        }
        if (Array.isArray(likePayload?.likes)) {
          const next = Object.fromEntries(
            (likePayload.likes as FeedLike[]).map((like) => [like.transactionId, like]),
          );
          setLikes((current) => ({ ...current, ...next }));
        }
      })
      .catch(() => {});
  }, []);

  /**
   * 피드 첫 페이지를 다시 읽는다. 글을 올리거나 내린 직후에 부른다 — 화면에서 카드를
   * 만들어 끼우지 않는 이유는 서버가 거른 뒤라야 그 거래가 정말 피드에 올랐는지 알기
   * 때문이다(`feed_body` 가 빈 거래는 애초에 안 내려온다).
   */
  const refreshFamily = useCallback(async () => {
    const data = await fetch("/api/family?offset=0", { cache: "no-store" }).then(json);
    if (!data?.viewer || !Array.isArray(data.members)) return;
    const next = { ...data, trades: Array.isArray(data.trades) ? data.trades : [] };
    familyRef.current = next;
    setFamily(next);
    await loadReactions(next.trades);
  }, [loadReactions]);

  /** 글쓰기 시트가 열릴 때 부른다. 이미 올린 거래는 서버가 빼고 준다. */
  const loadCandidates = useCallback(async () => {
    const data = await fetch("/api/feed", { cache: "no-store" }).then(json);
    setCandidates(Array.isArray(data?.trades) ? (data.trades as FeedCandidate[]) : []);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/profile/season-cards", { cache: "no-store" })
      .then(json)
      .then((data) => {
        // 누적 카드가 있으면 받는다. 주차 수를 조건으로 걸면 아직 한 주도 채우지 못한
        // 사용자가 누적 카드까지 못 받아, 유형이 영영 `관찰 중` 에 머문다.
        if (alive && data?.cumulative) setSeason(data);
      })
      .catch(() => {});
    fetch("/api/family?offset=0", { cache: "no-store" })
      .then(json)
      .then((data) => {
        if (!alive || !data?.viewer || !Array.isArray(data.members)) return;
        const first = { ...data, trades: Array.isArray(data.trades) ? data.trades : [] };
        familyRef.current = first;
        setFamily(first);
        void loadReactions(first.trades);
      })
      .catch(() => {});
    return () => {
      alive = false;
      familyRef.current = null;
    };
  }, [loadReactions]);

  /** 아래 끝까지 내려왔을 때만 다음 50건을 읽는다. 빠른 연속 스크롤은 한 요청으로 합친다. */
  const loadMoreFamily = useCallback(async () => {
    const current = familyRef.current;
    if (!current || loadingMoreRef.current) return;
    const nextOffset = current.page?.nextOffset;
    if (nextOffset === null || nextOffset === undefined) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/family?offset=${nextOffset}`, { cache: "no-store" });
      const data = await json(response);
      if (!data?.viewer || !Array.isArray(data.members) || !Array.isArray(data.trades)) return;

      const known = new Set(current.trades.map((trade) => trade.id));
      const added = (data.trades as FamilyTrade[]).filter((trade) => !known.has(trade.id));
      const next = { ...data, trades: [...current.trades, ...added] } as NonNullable<ArchiveData["family"]>;
      familyRef.current = next;
      setFamily(next);
      await loadReactions(added);
    } catch {
      // 기존 50건은 그대로 둔다. 다음 스크롤에서 같은 페이지를 다시 시도할 수 있다.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loadReactions]);

  /** 좋아요는 서버가 돌려준 개수·상태로만 갱신한다 — 눌린 수를 화면에서 세지 않는다. */
  const toggleLike = useCallback((transactionId: string) => {
    return fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId }),
    })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error || "좋아요를 저장하지 못했습니다.");
        setLikes((current) => ({ ...current, [transactionId]: payload }));
      });
  }, []);

  const sendComment = useCallback((transactionId: string, body: string) => {
    return fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transaction_id: transactionId, body }),
    })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error || "댓글을 저장하지 못했습니다.");
        setComments((current) => ({
          ...current,
          [transactionId]: [...(current[transactionId] ?? []), payload],
        }));
      });
  }, []);

  /** 고친 댓글도 서버가 돌려준 본문으로 갈아 끼운다 — 게이트가 다듬은 문장이 원본이다. */
  const editComment = useCallback(
    (transactionId: string, commentId: string | number, body: string) => {
      return fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: String(commentId), body }),
      })
        .then((response) => response.json().then((payload) => ({ response, payload })))
        .then(({ response, payload }) => {
          if (!response.ok) throw new Error(payload.error || "댓글을 고치지 못했습니다.");
          setComments((current) => ({
            ...current,
            [transactionId]: (current[transactionId] ?? []).map((comment) =>
              String(comment.id) === String(commentId) ? { ...comment, ...payload } : comment,
            ),
          }));
        });
    },
    [],
  );

  const deleteComment = useCallback((transactionId: string, commentId: string | number) => {
    return fetch(`/api/comments?id=${encodeURIComponent(String(commentId))}`, { method: "DELETE" })
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!response.ok) throw new Error(payload.error || "댓글을 지우지 못했습니다.");
        setComments((current) => ({
          ...current,
          [transactionId]: (current[transactionId] ?? []).filter(
            (comment) => String(comment.id) !== String(commentId),
          ),
        }));
      });
  }, []);

  /** 피드에 올린다. 올린 뒤 첫 페이지와 후보 목록을 함께 다시 읽는다. */
  const postFeed = useCallback(
    (transactionId: string, body: string) => {
      return fetch("/api/feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: transactionId, body }),
      })
        .then((response) => response.json().then((payload) => ({ response, payload })))
        .then(async ({ response, payload }) => {
          if (!response.ok) throw new Error(payload.error || "피드에 올리지 못했습니다.");
          await Promise.all([refreshFamily(), loadCandidates()]);
        });
    },
    [refreshFamily, loadCandidates],
  );

  /** 피드에서 내린다. 거래 기록은 남고 다시 후보 목록으로 돌아간다. */
  const removeFeed = useCallback(
    (transactionId: string) => {
      return fetch(`/api/feed?transaction_id=${encodeURIComponent(transactionId)}`, { method: "DELETE" })
        .then((response) => response.json().then((payload) => ({ response, payload })))
        .then(async ({ response, payload }) => {
          if (!response.ok) throw new Error(payload.error || "피드에서 내리지 못했습니다.");
          await Promise.all([refreshFamily(), loadCandidates()]);
        });
    },
    [refreshFamily, loadCandidates],
  );

  return {
    season,
    family,
    comments,
    likes,
    loadingMore,
    candidates,
    loadCandidates,
    postFeed,
    removeFeed,
    viewerId: family?.viewer?.id ?? null,
    hasMore: family?.page?.hasMore ?? false,
    loadMoreFamily,
    toggleLike,
    sendComment,
    editComment,
    deleteComment,
  };
}
