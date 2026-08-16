import type { NextRequest } from "next/server";
import { buildSeasonCards } from "../profile/season-cards/route";
import { findProfileById, selectFilledTrades, selectRows, sessionUserId, type Profile } from "../supabase";

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
  selectTransactions: (params) => selectFilledTrades<TransactionRow>(params),
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
    Promise.all(members.map(async (member) => {
      const profile = await deps.buildProfile(member.id);
      return {
        userId: member.id,
        behavior: profile.cumulative,
        // 원금이 0이면 잰 것이 없다는 뜻이라 0% 가 아니라 null 이다 — 화면은 이걸 "아직" 으로
        // 그린다. 0% 로 내려보내면 본전인 사람과 아직 안 산 사람이 같아 보인다.
        returnRate: profile.valuation && profile.valuation.cost > 0
          ? profile.valuation.returnRate
          : null,
        // 금액은 **합계를 내는 데만** 쓰고 구성원 줄에는 싣지 않는다 (아래 `total` 주석).
        valuation: profile.valuation ?? null,
      };
    })),
  ]);
  const behaviorByUser = new Map(behaviorProfiles.map((item) => [item.userId, item.behavior]));
  const returnRateByUser = new Map(behaviorProfiles.map((item) => [item.userId, item.returnRate]));
  const memberById = new Map(members.map((member) => [member.id, member]));

  /**
   * 같은 `family_tag` 인 사람들의 자산을 **합쳐서만** 내려보낸다 (2026-08-16 유저 확정).
   *
   * 구성원 줄에는 여전히 금액을 싣지 않는다 — 누가 얼마인지는 가린 채 "우리 가족이 얼마"
   * 만 낸다. **다만 구성원이 둘뿐이면 합계에서 자기 것을 빼 상대 자산을 알 수 있다.**
   * 셋 이상이면 개별 값까지는 못 가른다. 이 한계는 F11 SPEC §5 에 적어 뒀다.
   *
   * `cost` 가 0인 사람(아직 안 산 사람)의 현금도 합계에는 넣는다 — 지갑에 든 돈은 든 돈이다.
   * 수익률은 합계 원금 대비 합계 손익이라 **구성원 수익률의 평균이 아니다**. 많이 넣은
   * 사람 쪽으로 기운 값이 맞다.
   */
  const valuations = behaviorProfiles.map((item) => item.valuation).filter((v) => v !== null);
  const assets = valuations.reduce((sum, v) => sum + v.marketValue + v.cash, 0);
  const cost = valuations.reduce((sum, v) => sum + v.cost, 0);
  const profit = valuations.reduce((sum, v) => sum + v.profit, 0);
  const total = {
    /** 평가금액 + 예수금 합계 */
    assets,
    cost,
    profit,
    /** 원금이 0이면 잰 것이 없다 — 0% 가 아니라 null 이다. */
    returnRate: cost > 0 ? (profit / cost) * 100 : null,
    /** 합계에 든 사람 수. 둘이면 뺄셈으로 상대가 드러난다는 걸 화면이 알 수 있게 준다. */
    memberCount: valuations.length,
  };

  return {
    total,
    viewer: {
      id: viewer.id,
      name: viewer.name,
      role: viewer.parent_child === "parent" ? "parent" as const : "child" as const,
    },
    // 수익률(%)은 타인 것도 내려보낸다 — 가족 달리기 트랙이 구성원을 나란히 세우는 화면이라
    // 없으면 기능 자체가 성립하지 않는다. 자산 규모를 드러내는 평가금액·원금·현금은 계속
    // 가리므로, 아래 `trades` 의 price·quantity 마스킹과 어긋나지 않는다.
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.parent_child === "parent" ? "parent" as const : "child" as const,
      behavior: behaviorByUser.get(member.id),
      returnRate: returnRateByUser.get(member.id) ?? null,
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
