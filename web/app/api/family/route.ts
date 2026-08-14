import type { NextRequest } from "next/server";
import { buildSeasonCards } from "../profile/season-cards/route";
import { findProfileById, selectRows, sessionUserId, type Profile } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TransactionRow = {
  id: string;
  user_id: number;
  side: "buy" | "sell";
  trade_price: number | string;
  trade_quantity: number | string;
  trade_reason: string | null;
  plan_code: string | null;
  plan_target_price: number | string | null;
  memo: string | null;
  plan_match: boolean | null;
  plan_changed_reason: string | null;
  created_at: string;
  stocks: { stock_code: string; stock_name: string } | null;
};

export type FamilyDataDeps = {
  findProfileById(id: number): Promise<Profile | null>;
  selectProfiles(params: Record<string, string>): Promise<Profile[]>;
  selectTransactions(params: Record<string, string>): Promise<TransactionRow[]>;
  buildProfile(userId: number): Promise<Awaited<ReturnType<typeof buildSeasonCards>>>;
};

const defaultDeps: FamilyDataDeps = {
  findProfileById,
  selectProfiles: (params) => selectRows<Profile>("profiles", params),
  selectTransactions: (params) => selectRows<TransactionRow>("transactions", params),
  buildProfile: buildSeasonCards,
};

/** 로그인 세션의 family_tag 로만 가족 범위를 정한다. */
export async function buildFamilyData(userId: number, deps: FamilyDataDeps = defaultDeps) {
  const viewer = await deps.findProfileById(userId);
  if (!viewer) return null;

  const profiles = viewer.family_tag
    ? await deps.selectProfiles({
        select: "id,name,login_id,parent_child,family_tag",
        family_tag: `eq.${viewer.family_tag}`,
        order: "id.asc",
      })
    : [viewer];
  const members = profiles.length > 0 ? profiles : [viewer];
  const memberIds = members.map((member) => member.id);

  const [transactions, behaviorProfiles] = await Promise.all([
    deps.selectTransactions({
      select:
        "id,user_id,side,trade_price,trade_quantity,trade_reason,plan_code,plan_target_price," +
        "memo,plan_match,plan_changed_reason,created_at,stocks(stock_code,stock_name)",
      user_id: `in.(${memberIds.join(",")})`,
      order: "created_at.desc",
    }),
    Promise.all(members.map(async (member) => ({
      userId: member.id,
      behavior: (await deps.buildProfile(member.id)).cumulative,
    }))),
  ]);
  const behaviorByUser = new Map(behaviorProfiles.map((item) => [item.userId, item.behavior]));
  const memberById = new Map(members.map((member) => [member.id, member]));

  return {
    viewer: {
      id: viewer.id,
      name: viewer.name,
      role: viewer.parent_child === "parent" ? "parent" as const : "child" as const,
    },
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.parent_child === "parent" ? "parent" as const : "child" as const,
      behavior: behaviorByUser.get(member.id),
    })),
    trades: transactions.flatMap((row) => {
      const member = memberById.get(row.user_id);
      if (!member || !row.stocks) return [];
      const own = row.user_id === viewer.id;
      return [{
        id: row.id,
        userId: row.user_id,
        memberName: member.name,
        memberRole: member.parent_child === "parent" ? "parent" as const : "child" as const,
        symbol: row.stocks.stock_code,
        stockName: row.stocks.stock_name,
        side: row.side,
        // 타인의 자산 규모는 응답 자체에서 가려 화면 필터로 우회할 수 없게 한다.
        price: own ? Number(row.trade_price) : null,
        quantity: own ? Number(row.trade_quantity) : null,
        reason: row.trade_reason?.trim() || "이유를 남기지 않았어요.",
        // 이유 코드 원본. 화면이 코드를 문구로 바꾼다 — `reason` 은 코드가 없을 때의 대체 문구다.
        reasonCode: row.trade_reason?.trim() || null,
        // 계획·메모는 자산 규모가 아니라 가리지 않는다 (F2 SPEC §7.1).
        planCode: row.plan_code,
        planTargetPrice: row.plan_target_price === null ? null : Number(row.plan_target_price),
        memo: row.memo?.trim() || null,
        planMatch: row.plan_match,
        planChangedReason: row.plan_changed_reason,
        tradedAt: row.created_at,
      }];
    }),
  };
}

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const family = await buildFamilyData(userId);
    if (!family) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    return Response.json(family);
  } catch (error) {
    console.error(JSON.stringify({ event: "family_read", result: "error", message: String(error) }));
    return Response.json({ error: "가족 기록을 불러오지 못했습니다." }, { status: 502 });
  }
}
