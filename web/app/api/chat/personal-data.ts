import type { NextRequest } from "next/server";
import { selectRows, sessionUserId } from "../supabase";
import type {
  HoldingSummary,
  PersonalChatDataSource,
  TradeRecordSummary,
} from "../../../features/f10-chatbot/lib/tools";

/**
 * F10 의 본인 전용 읽기 툴에 실제 저장소를 붙인다.
 *
 * 조회 대상 사용자는 요청 쿠키(`sessionUserId`)로만 정한다 — 챗봇 요청 본문의
 * 식별자는 `contracts.ts` 가 이미 거부하므로 여기서도 인자로 받지 않는다.
 * 가족 구성원의 행은 어떤 경우에도 조회하지 않는다 (SPEC §1.3).
 */

/**
 * app.html 의 `REASONS`·`SELL_REASONS` 코드 계약. 라벨 원본은
 * `shared/store/prototype-trades.ts` 이지만 그 모듈은 클라이언트 전용이라
 * 서버 라우트에서 불러오지 않는다. 코드가 바뀌면 두 곳을 함께 고친다.
 */
const REASON_LABEL: Record<string, string> = {
  buy_news: "뉴스에서 봐서",
  buy_chart: "그래프가 좋아 보여서",
  buy_familiar: "내가 아는 회사라서",
  buy_ranking: "인기 순위에서 봐서",
  buy_social: "친구·가족이 말해줘서",
  buy_intuition: "그냥 느낌이 좋아서",
  sell_target_hit: "목표한 만큼 와서",
  sell_plan_time: "정한 날짜가 돼서",
  sell_rebalance: "더 좋아 보이는 회사를 찾아서",
  sell_fear_drop: "더 떨어질까 봐",
  sell_anxiety: "그냥 불안해서",
  sell_liquidity: "다른 데 쓸 돈이 필요해서",
};

const MAX_TRANSACTION_ROWS = 200;

type TransactionRow = { trade_reason: string | null; created_at: string };
type HoldingRow = {
  quantity: number | string;
  avg_price: number | string;
  stocks: { stock_code: string; stock_name: string } | null;
};

/** `KRX:000660` → `000660`. 형식이 다르면 현재 종목 없음으로 본다. */
function symbolOf(stockId: string | undefined) {
  const match = /^KRX:(\d{6})$/.exec(stockId ?? "");
  return match ? match[1] : null;
}

export function createSupabasePersonalData(
  request: NextRequest,
): PersonalChatDataSource {
  const userId = sessionUserId(request);

  async function getTradeRecordSummary(): Promise<TradeRecordSummary | null> {
    if (!userId) return null;
    const rows = await selectRows<TransactionRow>("transactions", {
      select: "trade_reason,created_at",
      user_id: `eq.${userId}`,
      order: "created_at.desc",
      limit: String(MAX_TRANSACTION_ROWS),
    });
    if (rows.length === 0) return null;

    // 승인 목록에 없는 코드는 라벨을 만들지 않는다. 손으로 넣은 시험 행과
    // 인코딩이 깨진 값이 그대로 아이 화면에 나가면 안 된다.
    const latestReasonLabel =
      rows
        .map((row) => REASON_LABEL[String(row.trade_reason ?? "")])
        .find((label) => Boolean(label)) ?? null;

    return { recordCount: rows.length, latestReasonLabel };
  }

  async function getHoldingSummary(
    _userId: string,
    stockId: string | undefined,
  ): Promise<HoldingSummary | null> {
    if (!userId) return null;
    const rows = await selectRows<HoldingRow>("holdings", {
      select: "quantity,avg_price,stocks!inner(stock_code,stock_name)",
      user_id: `eq.${userId}`,
    });

    // 전량 매도 뒤 남는 0주 행은 보유로 세지 않는다.
    const held = rows.filter((row) => Number(row.quantity) > 0);
    if (held.length === 0) return null;

    const symbol = symbolOf(stockId);
    const match = symbol
      ? held.find((row) => row.stocks?.stock_code === symbol)
      : undefined;

    return {
      current: match
        ? {
            stockName: match.stocks?.stock_name ?? "이 회사",
            quantity: Number(match.quantity),
            averagePrice: Number(match.avg_price),
          }
        : null,
      holdingCount: held.length,
    };
  }

  return {
    getTradeRecordSummary,
    getHoldingSummary,
    // F9 성향·시즌 기록은 아직 서버 저장소가 없다. 초기 상태를 그대로 둔다.
    getBehaviorProfileSummary: async () => null,
    getArchiveSummary: async () => null,
  };
}
