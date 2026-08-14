import { STOCKS } from "../../../shared/data/stocks";
import { findApprovedStockEducation } from "../../../shared/data/stock-education";
import type {
  ChatContext,
  ChatResponse,
  ReadOnlyChatToolName,
  StockFactTopic,
} from "../../../shared/types/chatbot";
import type { ChatSession } from "./session";

export type TradeRecordSummary = {
  recordCount: number;
  latestReasonLabel: string | null;
};

export type BehaviorProfileSummary = {
  observationState: "initial" | "ready";
  periodLabel: string;
  typeLabel: string | null;
};

export type ArchiveSummary = {
  seasonCount: number;
  latestSeasonLabel: string | null;
};

/**
 * 세션 사용자 본인의 보유 현황. `current`는 지금 보고 있는 종목의 보유이며,
 * 화면 종목이 없거나 그 종목을 갖고 있지 않으면 `null`이다.
 */
export type HoldingSummary = {
  current: { stockName: string; quantity: number; averagePrice: number } | null;
  holdingCount: number;
};

export type PersonalChatDataSource = {
  getTradeRecordSummary: (userId: string) => Promise<TradeRecordSummary | null>;
  getHoldingSummary: (
    userId: string,
    stockId: string | undefined,
  ) => Promise<HoldingSummary | null>;
  getBehaviorProfileSummary: (
    userId: string,
  ) => Promise<BehaviorProfileSummary | null>;
  getArchiveSummary: (userId: string) => Promise<ArchiveSummary | null>;
};

export type ToolExecution = {
  tool: ReadOnlyChatToolName;
  status: "ok" | "unavailable";
  response: ChatResponse;
  evidence: readonly string[];
};

const EMPTY_PERSONAL_DATA: PersonalChatDataSource = {
  getTradeRecordSummary: async () => null,
  getHoldingSummary: async () => null,
  getBehaviorProfileSummary: async () => null,
  getArchiveSummary: async () => null,
};

/** 화면에 쓰는 천 단위 구분. 값은 서버 조회 결과이며 모델이 만들지 않는다. */
function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function unavailable(
  tool: ReadOnlyChatToolName,
  text: string,
  target: "stock" | "archive" | "portfolio",
): ToolExecution {
  return {
    tool,
    status: "unavailable",
    response: {
      text,
      uiAction: { type: "open_screen", target },
    },
    evidence: [],
  };
}

export function createReadOnlyToolRunner(
  dataSource: PersonalChatDataSource = EMPTY_PERSONAL_DATA,
) {
  return async function runReadOnlyTool(
    tool: ReadOnlyChatToolName,
    context: ChatContext,
    session: ChatSession,
    stockFactTopic: StockFactTopic = "company",
  ): Promise<ToolExecution> {
    if (tool === "approved_stock_facts") {
      const approvedEducation = context.stockId
        ? findApprovedStockEducation(context.stockId)
        : undefined;
      if (approvedEducation) {
        const textByTopic: Record<StockFactTopic, string> = {
          company: approvedEducation.companySummary,
          business: approvedEducation.businessModel,
          industry: approvedEducation.industryRole,
          financial: approvedEducation.financialSummary,
        };
        return {
          tool,
          status: "ok",
          response: {
            text: textByTopic[stockFactTopic],
            uiAction: {
              type: "open_screen",
              target: "stock",
              stockId: approvedEducation.stockId,
            },
          },
          evidence: approvedEducation.sources.map((source) => source.url),
        };
      }

      const stock = STOCKS.find((item) => item.id === context.stockId);
      if (!stock || stock.status !== "reviewed") {
        return unavailable(
          tool,
          "이 종목 설명은 아직 사실 검수 중이에요. 검수가 끝나기 전에는 회사 정보를 지어내서 말하지 않을게요.",
          "stock",
        );
      }

      return {
        tool,
        status: "ok",
        response: {
          text: `${stock.companySummary} 일상에서는 ${stock.everydayTouchpoints[0]} 만날 수 있어요.`,
          uiAction: { type: "open_screen", target: "stock", stockId: stock.id },
        },
        evidence: [stock.id],
      };
    }

    if (tool === "own_trade_records") {
      const summary = await dataSource.getTradeRecordSummary(session.userId);
      if (!summary) {
        return unavailable(
          tool,
          "아직 연결된 투자 기록이 없어요. 거래 기능이 연결되면 남긴 이유만 되짚어 줄게요.",
          "archive",
        );
      }
      return {
        tool,
        status: "ok",
        response: {
          text: `투자 기록은 ${summary.recordCount}개예요.${summary.latestReasonLabel ? ` 가장 최근에는 “${summary.latestReasonLabel}”라고 이유를 남겼어요.` : ""}`,
          uiAction: { type: "open_screen", target: "archive" },
        },
        evidence: [`trade-record-count:${summary.recordCount}`],
      };
    }

    if (tool === "own_holdings") {
      const holdings = await dataSource.getHoldingSummary(
        session.userId,
        context.stockId,
      );
      if (!holdings || holdings.holdingCount === 0) {
        return unavailable(
          tool,
          "아직 갖고 있는 주식이 없어요. 주식을 사면 여기에서 수량과 평균 매수가를 알려 줄게요.",
          "portfolio",
        );
      }

      if (holdings.current) {
        const { stockName, quantity, averagePrice } = holdings.current;
        return {
          tool,
          status: "ok",
          response: {
            text: `${stockName}는 ${quantity}주 갖고 있고, 평균 매수가는 ${formatWon(averagePrice)}이에요. 지금 값어치는 포트폴리오에서 볼 수 있어요.`,
            uiAction: { type: "open_screen", target: "portfolio" },
          },
          evidence: [`holding:${context.stockId}:${quantity}`],
        };
      }

      return {
        tool,
        status: "ok",
        response: {
          text: `지금 보고 있는 회사는 아직 갖고 있지 않고, 다른 회사 ${holdings.holdingCount}곳을 갖고 있어요. 포트폴리오에서 전부 볼 수 있어요.`,
          uiAction: { type: "open_screen", target: "portfolio" },
        },
        evidence: [`holding-count:${holdings.holdingCount}`],
      };
    }

    if (tool === "own_behavior_profile") {
      const profile = await dataSource.getBehaviorProfileSummary(session.userId);
      if (!profile || profile.observationState === "initial") {
        return unavailable(
          tool,
          "아직 관찰 초기라 투자 성향을 단정할 수 없어요. 기록이 쌓이면 기간을 표시해서 행동 특징을 설명해 줄게요.",
          "archive",
        );
      }
      return {
        tool,
        status: "ok",
        response: {
          text: `${profile.periodLabel}의 성향은 “${profile.typeLabel ?? "관찰 중"}”으로 정리됐어요. 이건 실력 점수가 아니라 그 기간에 보인 행동 특징이에요.`,
          uiAction: { type: "open_screen", target: "archive" },
        },
        evidence: [`behavior-profile:${profile.periodLabel}`],
      };
    }

    const archive = await dataSource.getArchiveSummary(session.userId);
    if (!archive) {
      return unavailable(
        tool,
        "아직 저장된 시즌 기록이 없어요. 시즌 기록이 생기면 기록만 찾아서 보여 줄게요.",
        "archive",
      );
    }
    return {
      tool,
      status: "ok",
      response: {
        text: `아카이브에는 시즌 기록이 ${archive.seasonCount}개 있어요.${archive.latestSeasonLabel ? ` 가장 최근 기록은 ${archive.latestSeasonLabel}이에요.` : ""}`,
        uiAction: { type: "open_screen", target: "archive" },
      },
      evidence: [`archive-season-count:${archive.seasonCount}`],
    };
  };
}

export const runReadOnlyTool = createReadOnlyToolRunner();
