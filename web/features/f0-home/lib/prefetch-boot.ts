"use client";

import type { FeedComment, FeedLike, FamilyTrade } from "./archive-feed";
import { loadAccount } from "./use-account";
import { writeArchiveSnapshot, type ArchiveData } from "./use-archive-data";
import { prefetchLiveQuotes, prefetchUniverse } from "./use-universe";
import { loadOpenOrders } from "./use-wallet";

/**
 * 로그인 직후 로딩 화면이 미리 받아 두는 것들.
 *
 * 이 파일은 **새 저장소가 아니다.** 홈과 아카이브가 평소에 읽는 그 경로(`use-account`·
 * `use-wallet`·`use-universe`·`use-archive-data`)를 로딩 화면이 한 번 먼저 눌러 줄 뿐이고,
 * 응답은 각 훅이 이미 갖고 있는 모듈 캐시에 그대로 담긴다. 로그인 뒤 화면 전환은
 * `router.refresh()` 라 문서를 새로 받지 않으므로 그 캐시가 그대로 살아 넘어간다 —
 * 홈은 시드 지갑이 스치지 않고, 아카이브는 `기록을 불러오고 있어요` 를 건너뛴다.
 *
 * 실패한 조회는 담지 않는다. 각 훅이 마운트 때 어차피 다시 읽으므로 여기서 못 받은 것은
 * 화면이 뜬 다음 채워진다 — 로딩 화면이 조회 실패로 멈춰 있으면 안 된다.
 */

/** 진행 막대가 세는 칸. 늘리거나 줄이면 막대의 눈금도 함께 바뀐다. */
const BOOT_STEPS = ["account", "orders", "universe", "quotes", "season", "family"] as const;

export type BootStep = (typeof BOOT_STEPS)[number];

export const BOOT_STEP_COUNT = BOOT_STEPS.length;

const json = (response: Response) => (response.ok ? response.json() : null);

const get = (path: string) =>
  fetch(path, { cache: "no-store" })
    .then(json)
    .catch(() => null);

/** 한 페이지의 댓글·좋아요. `use-archive-data` 의 `loadReactions` 와 같은 묶음 조회다. */
async function loadReactions(trades: FamilyTrade[]) {
  const ids = [...new Set(trades.map((trade) => trade.id).filter(Boolean))];
  if (!ids.length) return { comments: {}, likes: {} };

  const query = encodeURIComponent(ids.join(","));
  const [commentPayload, likePayload] = await Promise.all([
    get(`/api/comments?transaction_id=${query}`),
    get(`/api/likes?transaction_id=${query}`),
  ]);

  const comments: Record<string, FeedComment[]> = {};
  if (Array.isArray(commentPayload?.comments)) {
    for (const comment of commentPayload.comments as FeedComment[]) {
      comments[comment.transactionId] = [...(comments[comment.transactionId] ?? []), comment];
    }
  }
  const likes = Array.isArray(likePayload?.likes)
    ? Object.fromEntries((likePayload.likes as FeedLike[]).map((like) => [like.transactionId, like]))
    : {};
  return { comments, likes };
}

/**
 * 아카이브 첫 화면. 성향 카드와 가족 피드는 서로 기다리지 않고, 반응(댓글·좋아요)만
 * 체결 id 를 알아야 해서 피드 뒤에 이어 붙는다 — 화면이 하는 순서 그대로다.
 *
 * 담는 것은 마지막에 **한 번**이다. 성향만 먼저 담으면 그 사이에 아카이브가 마운트됐을 때
 * 피드 없는 화면을 지난번 화면으로 알고 그린다.
 */
async function prefetchArchive(done: (step: BootStep) => void) {
  const seasonTask = get("/api/profile/season-cards").then((data) => {
    done("season");
    // 누적 카드가 없는 응답은 화면도 안 받는다(`use-archive-data`). 여기서도 같게 둔다.
    return data?.cumulative ? (data as NonNullable<ArchiveData["season"]>) : null;
  });

  const familyTask = get("/api/family?offset=0").then(async (data) => {
    if (!data?.viewer || !Array.isArray(data.members)) return null;
    const family = { ...data, trades: Array.isArray(data.trades) ? data.trades : [] };
    const reactions = await loadReactions(family.trades as FamilyTrade[]);
    return { family: family as NonNullable<ArchiveData["family"]>, ...reactions };
  });

  const [season, feed] = await Promise.all([
    seasonTask,
    familyTask.finally(() => done("family")),
  ]);

  if (!season && !feed) return;
  writeArchiveSnapshot({
    season,
    family: feed?.family ?? null,
    comments: feed?.comments ?? {},
    likes: feed?.likes ?? {},
  });
}

/**
 * 로딩 화면이 부른다. `done` 은 칸이 하나 찰 때마다 불리고, 반환한 약속은 **전부 끝났을
 * 때** 풀린다 — 성공·실패를 가리지 않는다.
 */
export function prefetchBoot(done: (step: BootStep) => void): Promise<void> {
  return Promise.all([
    loadAccount().finally(() => done("account")),
    loadOpenOrders().finally(() => done("orders")),
    prefetchUniverse().finally(() => done("universe")),
    prefetchLiveQuotes().finally(() => done("quotes")),
    prefetchArchive(done),
  ]).then(() => undefined);
}
