import type { NextRequest } from "next/server";
import { buildSeasonCards, buildSeasonCardsFor } from "../profile/season-cards/route";
import { findProfileById, selectFilledTrades, selectRows, sessionUserId, type Profile } from "../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const FAMILY_TRADE_PAGE_SIZE = 50;

type TransactionRow = {
  id: string;
  user_id: number;
  stock_id: number;
  side: "buy" | "sell";
  trade_price: number | string;
  trade_quantity: number | string;
  trade_reason: string | null;
  plan_code: string | null;
  plan_target_price: number | string | null;
  memo: string | null;
  plan_match: boolean | null;
  plan_changed_reason: string | null;
  feed_body: string | null;
  feed_posted_at: string | null;
  created_at: string;
  stocks: { stock_code: string; stock_name: string } | null;
};

type HoldingRow = {
  user_id: number;
  stock_id: number;
  quantity: number | string;
  avg_price: number | string;
};

export type FamilyDataDeps = {
  findProfileById(id: number): Promise<Profile | null>;
  selectProfiles(params: Record<string, string>): Promise<Profile[]>;
  selectTransactions(params: Record<string, string>): Promise<TransactionRow[]>;
  selectHoldings(params: Record<string, string>): Promise<HoldingRow[]>;
  buildProfiles(userIds: number[]): Promise<Map<number, Awaited<ReturnType<typeof buildSeasonCards>>>>;
};

const defaultDeps: FamilyDataDeps = {
  findProfileById,
  selectProfiles: (params) => selectRows<Profile>("profiles", params),
  selectTransactions: (params) => selectFilledTrades<TransactionRow>(params),
  selectHoldings: (params) => selectRows<HoldingRow>("holdings", params),
  /**
   * 구성원 전체를 한 묶음으로 계산한다. 사람마다 따로 돌리면 성향 입력 표 네 개를 인원
   * 수만큼 다시 읽어, 4인 가족이면 그것만으로 왕복이 16번이었다.
   */
  buildProfiles: buildSeasonCardsFor,
};

/** 로그인 세션의 family_tag 로만 가족 범위를 정한다. */
export async function buildFamilyData(
  userId: number,
  deps: FamilyDataDeps = defaultDeps,
  offset = 0,
) {
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

  const [transactions, holdings, behaviorProfiles] = await Promise.all([
    deps.selectTransactions({
      select:
        "id,user_id,stock_id,side,trade_price,trade_quantity,trade_reason,plan_code,plan_target_price," +
        "memo,plan_match,plan_changed_reason,feed_body,feed_posted_at,created_at,stocks(stock_code,stock_name)",
      user_id: `in.(${memberIds.join(",")})`,
      /**
       * **피드에 올린 것만 읽는다** (2026-08-17). 예전에는 체결이 곧 피드여서 한 번 살
       * 때마다 카드가 저절로 생겼다 — 시험 삼아 눌러 본 매수까지 가족에게 그대로 갔다.
       * 이제 `feed_body` 에 글을 쓴 거래만 피드가 된다(`POST /api/feed`).
       *
       * 성향·수익률은 이 필터와 무관하다. 그쪽은 `buildSeasonCards` 가 체결 전부를 읽는다 —
       * 피드에 안 올렸다고 해서 안 산 것이 되면 안 된다.
       */
      feed_body: "not.is.null",
      /**
       * **피드는 글을 올린 순서다.** 체결 순서(`created_at`)로 세우면 지난주에 산 종목을
       * 오늘 올린 글이 카드 아래쪽에 묻힌다 — 피드는 체결과 따로 놀기 때문이다.
       *
       * 값이 없는 행은 뒤로 보내고 체결 순서로 이어 붙인다. 마이그레이션이 이미 올라가
       * 있던 글을 `created_at` 으로 채웠으니 실제로는 시드가 `feed_body` 만 직접 넣은
       * 경우에나 나온다 — 그때도 페이지 순서가 흔들리지 않아야 한다.
       */
      order: "feed_posted_at.desc.nullslast,created_at.desc",
      offset: String(offset),
      // 한 건을 더 읽어 다음 페이지가 있는지만 확인하고, 화면에는 50건만 보낸다.
      limit: String(FAMILY_TRADE_PAGE_SIZE + 1),
    }),
    deps.selectHoldings({
      select: "user_id,stock_id,quantity,avg_price",
      user_id: `in.(${memberIds.join(",")})`,
    }),
    deps.buildProfiles(memberIds).then((profiles) => members.map((member) => {
      const profile = profiles.get(member.id);
      return {
        userId: member.id,
        behavior: profile?.cumulative,
        /**
         * 주차 카드도 함께 넘긴다 (2026-08-17). 지난 주차 리포트(F9 아카이브)가 구성원마다
         * 끝난 주를 되짚는데, 그 값을 여기서 이미 계산해 놓고 버리고 있었다 — 화면은
         * 그래서 사람이 적어 둔 표본을 그리고 있었다.
         *
         * **금액은 실리지 않는다.** 주차 카드에는 성향 점수·유형·거래 건수만 있고, 이는
         * 이미 내려보내던 누적 카드(`behavior`)와 같은 종류다. 자산 규모를 드러내는
         * 평가금액·원금·현금은 계속 `total` 합계로만 나간다.
         */
        weeks: profile?.weeks ?? [],
        // 원금이 0이면 잰 것이 없다는 뜻이라 0% 가 아니라 null 이다 — 화면은 이걸 "아직" 으로
        // 그린다. 0% 로 내려보내면 본전인 사람과 아직 안 산 사람이 같아 보인다.
        returnRate: profile?.valuation && profile.valuation.cost > 0
          ? profile.valuation.returnRate
          : null,
        // 금액은 **합계를 내는 데만** 쓰고 구성원 줄에는 싣지 않는다 (아래 `total` 주석).
        valuation: profile?.valuation ?? null,
      };
    })),
  ]);
  const behaviorByUser = new Map(behaviorProfiles.map((item) => [item.userId, item.behavior]));
  const returnRateByUser = new Map(behaviorProfiles.map((item) => [item.userId, item.returnRate]));
  const weeksByUser = new Map(behaviorProfiles.map((item) => [item.userId, item.weeks]));
  const memberById = new Map(members.map((member) => [member.id, member]));

  /**
   * **지금 들고 있는 종목의 평단가.** 가족 피드가 두 가지로 쓴다.
   *
   * 1. 거를 기준 — 피드는 **아직 들고 있는 종목의 기록만** 보여 준다. 다 팔아 치운 종목이
   *    카드로 남으면, 지금 우리 가족이 무엇을 들고 있는지 견주어 보라는 화면에 이제 아무도
   *    안 가진 회사가 섞인다.
   * 2. 손익을 낼 밑값 — 매도 카드의 실현 손익은 `판 가격 − 평단가` 다. 체결 행에는 살 때
   *    가격이 없어서 이 표 없이는 낼 수 없었다.
   *
   * 수량이 0인 행은 이미 다 판 것이므로 없는 것으로 친다 — `holdings` 는 0으로 남기도 한다.
   *
   * **이 평단가는 지금 값이지 그 매도 시점 값이 아니다.** 이동평균법에서 매도는 평단가를
   * 바꾸지 않으니 그 뒤로 더 사지 않았으면 같은 값이고, 더 샀으면 어긋난다.
   */
  const avgByHolding = new Map(
    holdings
      .filter((row) => Number(row.quantity) > 0)
      .map((row) => [`${row.user_id}:${row.stock_id}`, Number(row.avg_price)]),
  );

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
  const cash = valuations.reduce((sum, v) => sum + v.cash, 0);
  const total = {
    /** 평가금액 + 예수금 합계 */
    assets,
    cost,
    profit,
    /**
     * 가족 예수금 합계 (2026-08-17). 투자 현황의 `투자 가능 금액` 이 가족 전체가 쓸 수
     * 있는 현금을 보여 준다. 합계라 개별 자산 마스킹 규칙은 그대로다 — 누가 얼마 들고
     * 있는지는 여기서도 안 갈린다.
     */
    cash,
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
    // 구성원 줄에서 가린다.
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.parent_child === "parent" ? "parent" as const : "child" as const,
      behavior: behaviorByUser.get(member.id),
      returnRate: returnRateByUser.get(member.id) ?? null,
      weeks: weeksByUser.get(member.id) ?? [],
    })),
    trades: transactions.slice(0, FAMILY_TRADE_PAGE_SIZE).flatMap((row) => {
      const member = memberById.get(row.user_id);
      if (!member || !row.stocks) return [];
      // 아직 들고 있는 종목만 남긴다 (위 `avgByHolding` 주석). 여기서 걸러야 화면 필터로
      // 우회할 수 없고, 밑에서 쓰는 평단가가 늘 있다는 것도 같은 조건으로 보장된다.
      const avgPrice = avgByHolding.get(`${row.user_id}:${row.stock_id}`);
      if (avgPrice === undefined) return [];
      return [{
        id: row.id,
        userId: row.user_id,
        memberName: member.name,
        memberRole: member.parent_child === "parent" ? "parent" as const : "child" as const,
        symbol: row.stocks.stock_code,
        stockName: row.stocks.stock_name,
        side: row.side,
        /**
         * 체결가·수량을 가족 전원에게 그대로 내려보낸다 (2026-08-17 유저 확정).
         *
         * 예전에는 타인 것을 `null` 로 지웠고 화면은 그 자리에 `비공개` 를 찍었다. 그래서
         * 가족 피드에서 **자기 카드만 숫자가 있고 나머지는 전부 `비공개`** 였다 — 서로의
         * 기록을 견주어 보라고 만든 화면인데 견줄 것이 없었다.
         *
         * 자산 규모는 여기가 아니라 위 `members`·`total` 이 지킨다. 구성원 줄에는 평가금액·
         * 원금·현금을 싣지 않고 합계만 낸다. 한 건의 체결가·수량으로는 그 사람이 얼마를
         * 굴리는지 알 수 없다.
         *
         * **DB 값이 없으면 그대로 `null` 이다.** `Number(null)` 은 0 이라 형변환을 무조건
         * 걸면 안 된다 — 값이 없는 옛 행이 `0원` 에 체결된 것처럼 보인다.
         */
        price: row.trade_price === null ? null : Number(row.trade_price),
        quantity: row.trade_quantity === null ? null : Number(row.trade_quantity),
        /** 지금 이 사람이 이 종목을 들고 있는 평단가. 매도 카드의 실현 손익이 이걸로 난다. */
        avgPrice,
        reason: row.trade_reason?.trim() || "이유를 남기지 않았어요.",
        // 이유 코드 원본. 화면이 코드를 문구로 바꾼다 — `reason` 은 코드가 없을 때의 대체 문구다.
        reasonCode: row.trade_reason?.trim() || null,
        // 계획·메모는 자산 규모가 아니라 가리지 않는다 (F2 SPEC §7.1).
        planCode: row.plan_code,
        planTargetPrice: row.plan_target_price === null ? null : Number(row.plan_target_price),
        memo: row.memo?.trim() || null,
        /** 피드에 올린 글. 카드 본문이 이 값이다 — 위 필터 때문에 늘 있다. */
        feedBody: row.feed_body ?? "",
        planMatch: row.plan_match,
        planChangedReason: row.plan_changed_reason,
        tradedAt: row.created_at,
        /**
         * 피드에 글을 올린 시각. 카드 머리의 `3일 전` 이 이 값으로 뜬다 — 체결 시각은
         * 카드 안 날짜 라벨(`8월 13일 매수`)이 따로 말한다.
         *
         * 마이그레이션 전에 올라간 글만 값이 없어 체결 시각으로 접는다.
         */
        feedPostedAt: row.feed_posted_at ?? row.created_at,
      }];
    }),
    page: {
      offset,
      limit: FAMILY_TRADE_PAGE_SIZE,
      hasMore: transactions.length > FAMILY_TRADE_PAGE_SIZE,
      nextOffset:
        transactions.length > FAMILY_TRADE_PAGE_SIZE ? offset + FAMILY_TRADE_PAGE_SIZE : null,
    },
  };
}

export function parseFamilyOffset(raw: string | null): number | null {
  if (raw === null) return 0;
  if (!/^\d+$/.test(raw)) return null;
  const offset = Number(raw);
  return Number.isSafeInteger(offset) ? offset : null;
}

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const offset = parseFamilyOffset(request.nextUrl.searchParams.get("offset"));
  if (offset === null) return Response.json({ error: "offset이 올바르지 않습니다." }, { status: 400 });
  try {
    const family = await buildFamilyData(userId, defaultDeps, offset);
    if (!family) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    return Response.json(family);
  } catch (error) {
    console.error(JSON.stringify({ event: "family_read", result: "error", message: String(error) }));
    return Response.json({ error: "가족 기록을 불러오지 못했습니다." }, { status: 502 });
  }
}
