import type { NextRequest } from "next/server";
import { computeAbilityScores, weekStartKstOf } from "../../../../shared/engine/archive-profile.js";
import { selectRows, sessionUserId } from "../../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TransactionRow = { stock_id: number; trade_reason: string | null; created_at: string };
type StockRow = { stock_id: number; category: string | null };

/**
 * 로그인 사용자의 Supabase 매수 거래를 KST 주 단위로 묶어 지난 주차 카드 점수를 낸다.
 * F9-archive SPEC §3.1과 같은 산식(computeAbilityScores)을 쓰되 입력이 로컬 records
 * 대신 Supabase transactions 다. 과거 주차 공통 관례대로 정확은 채점하지 않고 기본값을
 * 쓴다(§3.3, §7). 이번 주는 이 API가 다루지 않는다 — 화면이 로컬 계산과 §3.2 행동 데이터
 * 오버라이드를 그대로 쓴다.
 */
export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const [transactions, stocks] = await Promise.all([
      selectRows<TransactionRow>("transactions", {
        select: "stock_id,trade_reason,created_at",
        user_id: `eq.${userId}`,
        side: "eq.buy",
      }),
      selectRows<StockRow>("stocks", { select: "stock_id,category" }),
    ]);

    const categoryByStock = new Map(stocks.map((row) => [String(row.stock_id), row.category]));
    const sectorOf = (symbol: string) => categoryByStock.get(symbol) || null;

    const thisWeekStart = weekStartKstOf(new Date().toISOString());
    const byWeek = new Map<string, Array<{ symbol: string; reason_code: string }>>();
    for (const tx of transactions) {
      const weekStart = weekStartKstOf(tx.created_at);
      if (weekStart === thisWeekStart) continue; // 이번 주는 화면이 로컬 계산을 쓴다
      const bucket = byWeek.get(weekStart) ?? [];
      bucket.push({ symbol: String(tx.stock_id), reason_code: tx.trade_reason ?? "" });
      byWeek.set(weekStart, bucket);
    }

    const weeks = Array.from(byWeek.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([weekStart, records]) => {
        const out = computeAbilityScores(records, sectorOf);
        return { weekStart, count: out.count, scores: out.scores };
      });

    return Response.json({ weeks });
  } catch (error) {
    console.error(JSON.stringify({ event: "profile_season_cards", result: "error", message: String(error) }));
    return Response.json({ error: "지난 주차 카드를 불러오지 못했습니다." }, { status: 502 });
  }
}
