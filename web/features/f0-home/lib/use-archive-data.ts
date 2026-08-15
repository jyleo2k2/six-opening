"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedComment, FeedLike, FamilyTrade } from "./archive-feed";
import type { FamilyRow, SeasonCards } from "./archive-profile-view";

/**
 * 아카이브가 서버에서 읽는 것 전부. `ui-src/methods/load*.js` 넷을 한 훅으로 모았다.
 *
 * 네 경로는 서로 기다리지 않는다 — 성향 카드가 가족 응답을 기다리면 화면이 늦게 뜬다.
 * 다만 반응(댓글·좋아요)만은 가족 체결 id 를 알아야 부를 수 있어 그 뒤에 이어 붙인다.
 */
export type ArchiveData = {
  behaviorCharacter: string | null;
  season: SeasonCards;
  family: { viewer?: { id: number }; members: FamilyRow[]; trades: FamilyTrade[] } | null;
  comments: Record<string, FeedComment[]>;
  likes: Record<string, FeedLike>;
};

const json = (response: Response) => (response.ok ? response.json() : null);

export function useArchiveData() {
  const [behaviorCharacter, setBehaviorCharacter] = useState<string | null>(null);
  const [season, setSeason] = useState<SeasonCards>(null);
  const [family, setFamily] = useState<ArchiveData["family"]>(null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [likes, setLikes] = useState<Record<string, FeedLike>>({});

  /** 거래 id 별 댓글·좋아요를 한 번에 읽는다. 카드마다 부르면 12번 왕복한다. */
  const loadReactions = useCallback((trades: FamilyTrade[]) => {
    const ids = [...new Set(trades.map((t) => t.id).filter(Boolean))];
    if (!ids.length) {
      setComments({});
      setLikes({});
      return;
    }
    const query = encodeURIComponent(ids.join(","));
    Promise.all([
      fetch(`/api/comments?transaction_id=${query}`, { cache: "no-store" }).then(json),
      fetch(`/api/likes?transaction_id=${query}`, { cache: "no-store" }).then(json),
    ])
      .then(([commentPayload, likePayload]) => {
        if (Array.isArray(commentPayload?.comments)) {
          const grouped: Record<string, FeedComment[]> = {};
          for (const comment of commentPayload.comments as FeedComment[]) {
            grouped[comment.transactionId] = [...(grouped[comment.transactionId] ?? []), comment];
          }
          setComments(grouped);
        }
        if (Array.isArray(likePayload?.likes)) {
          setLikes(
            Object.fromEntries((likePayload.likes as FeedLike[]).map((l) => [l.transactionId, l])),
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/profile/behavior", { cache: "no-store" })
      .then(json)
      .then((data) => {
        if (alive && data?.character) setBehaviorCharacter(data.character);
      })
      .catch(() => {});
    fetch("/api/profile/season-cards", { cache: "no-store" })
      .then(json)
      .then((data) => {
        // 주차가 하나도 없으면 없는 것으로 본다 — 빈 목록으로 카드 모아보기를 덮으면
        // 로컬 기록으로 그리던 주차가 통째로 사라진다.
        if (alive && Array.isArray(data?.weeks) && data.weeks.length) setSeason(data);
      })
      .catch(() => {});
    fetch("/api/family", { cache: "no-store" })
      .then(json)
      .then((data) => {
        if (!alive || !data?.viewer || !Array.isArray(data.members)) return;
        setFamily(data);
        loadReactions(Array.isArray(data.trades) ? data.trades : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
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

  return {
    behaviorCharacter,
    season,
    family,
    comments,
    likes,
    toggleLike,
    sendComment,
    deleteComment,
  };
}
