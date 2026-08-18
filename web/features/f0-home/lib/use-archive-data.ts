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

/**
 * 마지막으로 본 아카이브 화면.
 *
 * `ArchiveScreen` 은 다른 화면으로 나가면 통째로 언마운트된다(`ConnectedPrototype` 이
 * 주소에 맞는 화면 하나만 그린다). 그래서 이 훅도 매번 다시 마운트되고, 예전에는 그때마다
 * 상태가 빈칸에서 시작해 **되돌아올 때마다 `기록을 불러오고 있어요` 부터 다시** 봤다.
 * 이미 받아 둔 것을 곧바로 다시 그리고 조회는 뒤에서 돌린다.
 *
 * 브라우저 저장소를 쓰지 않으므로 수명은 `candle-tip` 의 닫힘 표시와 같다 — **로그인
 * 세션의 수명**이다. 로그아웃은 `/` 로 나가며 전체 새로고침이라 여기도 함께 비워진다.
 */
type ArchiveSnapshot = {
  season: SeasonCards;
  family: ArchiveData["family"];
  comments: Record<string, FeedComment[]>;
  likes: Record<string, FeedLike>;
};
let snapshot: ArchiveSnapshot | null = null;

/** 지난번 화면. 아직 한 번도 안 봤으면 `null` 이다. */
export function readArchiveSnapshot() {
  return snapshot;
}

export function writeArchiveSnapshot(next: ArchiveSnapshot) {
  snapshot = next;
}

/** 세션이 갈릴 때 비운다. 화면은 부르지 않고 테스트만 쓴다 — 로그아웃은 문서를 새로 받는다. */
export function clearArchiveSnapshot() {
  snapshot = null;
}

export function useArchiveData() {
  const seeded = useRef(readArchiveSnapshot()).current;
  const [season, setSeason] = useState<SeasonCards>(seeded?.season ?? null);
  /**
   * `season` 조회가 아직 안 끝났는지. 화면이 이걸로 "아직 안 왔다"와 "정말 없다"를
   * 가른다 — 없이는 응답을 기다리는 1초 동안 중립 카드(`관찰 중` · 전부 5)가 먼저
   * 떴다가 진짜 카드로 바뀌어 화면이 깜빡인다.
   *
   * **되돌아온 화면은 기다리는 중이 아니다.** 지난번 카드를 이미 들고 있으므로 조회가
   * 다시 돌아도 안내 문구를 띄우지 않는다 — 띄우면 이미 그릴 수 있는 화면을 일부러 가린다.
   *
   * 남겨 둔 화면이 있는지가 아니라 **카드가 있는지**로 가른다. 첫 응답이 오기 전에 화면을
   * 나갔다 오면 카드 없는 화면이 남는데, 그걸 "받아 둔 것" 으로 치면 위 깜빡임이 그대로
   * 돌아온다 — 중립 카드가 먼저 뜨고 진짜 카드로 바뀐다.
   */
  const [seasonLoading, setSeasonLoading] = useState(!seeded?.season);
  const [family, setFamily] = useState<ArchiveData["family"]>(seeded?.family ?? null);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>(seeded?.comments ?? {});
  const [likes, setLikes] = useState<Record<string, FeedLike>>(seeded?.likes ?? {});
  const [loadingMore, setLoadingMore] = useState(false);
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const familyRef = useRef<ArchiveData["family"]>(seeded?.family ?? null);
  const loadingMoreRef = useRef(false);

  // 화면에 있는 것을 그대로 남긴다. 좋아요·댓글·글 올리기처럼 화면에서 바꾼 것도 같이 남아
  // 되돌아왔을 때 방금 한 일이 사라져 보이지 않는다.
  useEffect(() => {
    writeArchiveSnapshot({ season, family, comments, likes });
  }, [season, family, comments, likes]);

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

  /**
   * 마운트할 때마다 서버에 다시 묻는다 — 지난번 화면은 **먼저 그리려고** 들고 있는 것이지
   * 최신이라고 믿는 값이 아니다. 주문하고 돌아온 화면이 옛 기록을 보여 주면 안 된다.
   *
   * 피드는 첫 50건으로 갈아 끼운다. 더 내려 읽어 둔 뒷장은 이때 버려지는데, 되돌아온
   * 화면은 어차피 맨 위부터 보므로 그 자리에서 다시 내려 읽으면 된다.
   */
  useEffect(() => {
    let alive = true;
    fetch("/api/profile/season-cards", { cache: "no-store" })
      .then(json)
      .then((data) => {
        // 누적 카드가 있으면 받는다. 주차 수를 조건으로 걸면 아직 한 주도 채우지 못한
        // 사용자가 누적 카드까지 못 받아, 유형이 영영 `관찰 중` 에 머문다.
        if (alive && data?.cumulative) setSeason(data);
      })
      .catch(() => {})
      // 실패해도 기다림은 끝났다 — 그때는 중립 카드가 맞다(비로그인·조회 실패).
      .finally(() => { if (alive) setSeasonLoading(false); });
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
    seasonLoading,
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
