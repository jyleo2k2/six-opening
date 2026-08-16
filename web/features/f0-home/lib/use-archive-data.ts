"use client";

import { useCallback, useEffect, useState } from "react";
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
  } | null;
  comments: Record<string, FeedComment[]>;
  likes: Record<string, FeedLike>;
};

const json = (response: Response) => (response.ok ? response.json() : null);

export function useArchiveData() {
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
    fetch("/api/profile/season-cards", { cache: "no-store" })
      .then(json)
      .then((data) => {
        // 누적 카드가 있으면 받는다. 주차 수를 조건으로 걸면 아직 한 주도 채우지 못한
        // 사용자가 누적 카드까지 못 받아, 유형이 영영 `관찰 중` 에 머문다.
        if (alive && data?.cumulative) setSeason(data);
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

  return {
    season,
    family,
    comments,
    likes,
    toggleLike,
    sendComment,
    editComment,
    deleteComment,
  };
}
