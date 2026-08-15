import type { NextRequest } from "next/server";
import { resolveCharacterFromBehaviorSignals } from "../../../../shared/engine/archive-profile.js";
import { selectFilledTrades, selectRows, sessionUserId } from "../../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TabViewRow = { tab_count: number };
type TransactionRow = { stock_id: number };

export const sumTabCounts = (rows: TabViewRow[]): number =>
  rows.reduce((sum, row) => sum + (Number(row.tab_count) || 0), 0);

export const countDistinctStocks = (rows: TransactionRow[]): number =>
  new Set(rows.map((row) => row.stock_id)).size;

/**
 * 로그인 사용자의 실제 행동 데이터(F9-archive SPEC §3.2 대체 입력)로 캐릭터를 정한다.
 * 기간 제한 없이 전체 누적을 집계한다 — 주 단위 등 리셋은 운영이 원본 데이터를
 * 직접 관리하는 별도 절차다.
 *
 * 거래 기록이 하나도 없으면 판정할 표본이 없으므로 `character: null` 을 돌려
 * 화면이 기존 로컬 계산으로 폴백하게 한다.
 */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const [tabViews, transactions] = await Promise.all([
      selectRows<TabViewRow>("stock_tab_views", { select: "tab_count", user_id: `eq.${userId}` }),
      selectFilledTrades<TransactionRow>({ select: "stock_id", user_id: `eq.${userId}` }),
    ]);

    const tabCountTotal = sumTabCounts(tabViews);
    const distinctSymbolCount = countDistinctStocks(transactions);

    if (distinctSymbolCount === 0) {
      return Response.json({ character: null, tabCountTotal, distinctSymbolCount });
    }

    const character = resolveCharacterFromBehaviorSignals(tabCountTotal, distinctSymbolCount);
    return Response.json({ character, tabCountTotal, distinctSymbolCount });
  } catch (error) {
    console.error(JSON.stringify({ event: "profile_behavior_read", result: "error", message: String(error) }));
    return Response.json({ error: "행동 데이터를 불러오지 못했습니다." }, { status: 502 });
  }
}
