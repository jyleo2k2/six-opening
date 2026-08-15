import { STOCKS } from "../../../shared/data/stocks";
import { findApprovedStockEducation } from "../../../shared/data/stock-education";
import type {
  ChatArchiveTab,
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
  archiveTab?: ChatArchiveTab,
): ToolExecution {
  return {
    tool,
    status: "unavailable",
    response: {
      text,
      uiAction: { type: "open_screen", target, ...(archiveTab ? { archiveTab } : {}) },
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
        // 주문의 서버 저장은 best-effort 라 방금 한 거래가 여기 없을 수 있다.
        // "기록이 없다" 고 단정하지 않고 화면을 원본으로 안내한다.
        return unavailable(
          tool,
          "서버에 저장된 거래 기록을 찾지 못했어요. 방금 한 거래는 아카이브 화면에 먼저 보이니 거기서 확인해 주세요.",
          "archive",
          "return",
        );
      }
      return {
        tool,
        status: "ok",
        response: {
          text: `투자 기록은 ${summary.recordCount}개예요.${summary.latestReasonLabel ? ` 가장 최근에는 “${summary.latestReasonLabel}”라고 이유를 남겼어요.` : ""}`,
          // 거래 하나하나와 그때 고른 이유는 아카이브 **수익률 탭**의 피드에 있다.
          // 탭을 비워 보내면 화면이 성향 탭으로 폴백해 엉뚱한 곳이 열린다.
          uiAction: {
            type: "open_screen",
            target: "archive",
            archiveTab: "return",
            label: "거래 기록 보기",
          },
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
          "서버에 저장된 보유 종목을 찾지 못했어요. 지금 가진 주식은 내 자산 화면에서 바로 확인할 수 있어요.",
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

    // 성향과 시즌 기록은 챗봇이 값을 읽어 주지 않고 그 화면으로 보낸다.
    // 아카이브가 캐릭터·오각형 레이더·서술을 이미 그리므로 같은 값을 문장으로
    // 옮기면 두 곳이 어긋날 뿐이다. 결과는 화면에서 직접 본다.
    if (tool === "own_behavior_profile") {
      return {
        tool,
        status: "ok",
        response: {
          text: "내 성향 결과는 아카이브의 성향 화면에서 볼 수 있어요. 캐릭터와 능력치 그림으로 한눈에 정리돼 있어요.",
          uiAction: {
            type: "open_screen",
            target: "archive",
            archiveTab: "report",
            label: "성향 화면 열기",
          },
          suggestedQuestions: ["성향이 뭐예요?", "내 거래 기록 보여주세요"],
        },
        evidence: ["archive-screen:report"],
      };
    }

    return {
      tool,
      status: "ok",
      response: {
        text: "지난 시즌 기록은 아카이브의 수익률 화면에서 볼 수 있어요. 시즌마다 어떻게 달라졌는지 그대로 남아 있어요.",
        uiAction: {
          type: "open_screen",
          target: "archive",
          archiveTab: "return",
          label: "수익률 화면 열기",
        },
        suggestedQuestions: ["시즌 기록이 뭐예요?", "내 성향 결과 알려주세요"],
      },
      evidence: ["archive-screen:return"],
    };
  };
}

export const runReadOnlyTool = createReadOnlyToolRunner();
