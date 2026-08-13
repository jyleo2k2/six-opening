// 피드 반응(좋아요·코멘트)의 공통 접근 검증.
// 좋아요와 코멘트가 같은 규칙을 쓰므로 한곳에 둔다.
import { findProfileById, selectRows, type Profile } from "../supabase";

/** 반응을 달 수 있는 대상 체결 한 건과, 그 체결 주인의 역할. */
export type FeedTarget = {
  transactionId: string;
  /** 요청한 사람 */
  viewer: Profile;
  /** 체결 주인의 역할. 코멘트 게이트의 target 이 된다. */
  ownerRole: "parent" | "child";
  ownerUserId: number;
};

export type FeedAccessResult =
  | { ok: true; target: FeedTarget }
  | { ok: false; status: number; error: string };

type OwnerRow = {
  id: string;
  user_id: number;
  profiles: { parent_child: "parent" | "child" | null; family_tag: string | null } | null;
};

/** 체결 id 는 서버가 만든 값이라 형식을 좁게 못 박지 않는다. 빈 값·과도한 길이만 막는다. */
export function isTransactionId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 64;
}

/**
 * 이 체결에 반응을 달아도 되는지 확인한다.
 *
 * 같은 `family_tag` 안의 체결에만 허용한다. 체결 id 만 알면 남의 가족 기록에
 * 코멘트를 달 수 있으면 안 되고, 열람 범위는 `/api/trades` 와 같아야 한다.
 * `family_tag` 가 없는 계정은 본인 체결에만 반응할 수 있다.
 */
export async function authorizeFeedTarget(
  userId: number,
  transactionId: string,
): Promise<FeedAccessResult> {
  const viewer = await findProfileById(userId);
  if (!viewer) return { ok: false, status: 404, error: "사용자를 찾을 수 없습니다." };

  const scope: Record<string, string> = viewer.family_tag
    ? { "profiles.family_tag": `eq.${viewer.family_tag}` }
    : { user_id: `eq.${userId}` };

  const rows = await selectRows<OwnerRow>("transactions", {
    select: "id,user_id,profiles!inner(parent_child,family_tag)",
    id: `eq.${transactionId}`,
    ...scope,
    limit: "1",
  });

  const row = rows[0];
  // 없는 체결과 남의 가족 체결을 같은 404 로 답한다. 구분해 주면 id 를 넣어 보며
  // 남의 가족에 그 체결이 있는지 알아낼 수 있다.
  if (!row) return { ok: false, status: 404, error: "거래를 찾을 수 없습니다." };

  return {
    ok: true,
    target: {
      transactionId: row.id,
      viewer,
      ownerRole: row.profiles?.parent_child === "parent" ? "parent" : "child",
      ownerUserId: row.user_id,
    },
  };
}

/** 쉼표로 이어 붙인 체결 id 목록을 읽는다. 피드가 카드마다 요청하지 않도록 한 번에 받는다. */
export function parseTransactionIds(raw: string | null, limit = 50): string[] | null {
  if (!raw) return null;
  const ids = raw.split(",").map((value) => value.trim());
  if (ids.length === 0 || ids.length > limit) return null;
  // 빈 조각도 거절한다. 화면이 `ids.join(",")` 로 만들다 값 하나가 비면 여기서 드러나야지,
  // 조용히 버리면 요청한 카드 하나가 이유 없이 반응 없는 상태로 남는다.
  if (!ids.every((id) => isTransactionId(id))) return null;
  return [...new Set(ids)];
}

/** 같은 가족 안에서 요청한 체결 id 중 실제로 존재하는 것만 남긴다. */
export async function filterFamilyTransactionIds(
  viewer: Profile,
  ids: string[],
): Promise<string[]> {
  const scope: Record<string, string> = viewer.family_tag
    ? { "profiles.family_tag": `eq.${viewer.family_tag}` }
    : { user_id: `eq.${viewer.id}` };

  const rows = await selectRows<{ id: string }>("transactions", {
    select: "id,profiles!inner(family_tag)",
    id: `in.(${ids.join(",")})`,
    ...scope,
  });
  return rows.map((row) => row.id);
}
