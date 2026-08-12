import { STOCKS } from "../../../shared/data/stocks";
import { findAviationAndCosmeticsEducation } from "../../../shared/data/aviation-cosmetics-education";
import { findAutomotiveAndShipbuildingEducation } from "../../../shared/data/automotive-shipbuilding-education";
import { findDefenseEducation } from "../../../shared/data/defense-education";
import { findEntertainmentAndRetailEducation } from "../../../shared/data/entertainment-retail-education";
import { findFinancialEducation } from "../../../shared/data/financial-education";
import { findFoodAndEnergyEducation } from "../../../shared/data/food-energy-education";
import { findGameEducation } from "../../../shared/data/game-education";
import { findLogisticsAndSemiconductorEducation } from "../../../shared/data/logistics-semiconductor-education";
import type {
  ChatContext,
  ChatResponse,
  ReadOnlyChatToolName,
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

export type PersonalChatDataSource = {
  getTradeRecordSummary: (userId: string) => Promise<TradeRecordSummary | null>;
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
  getBehaviorProfileSummary: async () => null,
  getArchiveSummary: async () => null,
};

function unavailable(
  tool: ReadOnlyChatToolName,
  text: string,
  target: "stock" | "archive",
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
  ): Promise<ToolExecution> {
    if (tool === "approved_stock_facts") {
      const approvedEducation = context.stockId
        ? [
            findAviationAndCosmeticsEducation(context.stockId),
            findGameEducation(context.stockId),
            findLogisticsAndSemiconductorEducation(context.stockId),
            findDefenseEducation(context.stockId),
            findFoodAndEnergyEducation(context.stockId),
            findEntertainmentAndRetailEducation(context.stockId),
            findFinancialEducation(context.stockId),
            findAutomotiveAndShipbuildingEducation(context.stockId),
          ].find(Boolean)
        : undefined;
      if (approvedEducation) {
        return {
          tool,
          status: "ok",
          response: {
            text: [
              approvedEducation.companySummary,
              approvedEducation.businessModel,
              approvedEducation.industryRole,
              approvedEducation.financialSummary,
            ].join(" "),
            uiAction: { type: "open_screen", target: "stock" },
          },
          evidence: approvedEducation.sources.map((source) => source.url),
        };
      }

      const stock = STOCKS.find((item) => item.id === context.stockId);
      if (!stock || stock.status !== "reviewed") {
        return unavailable(
          tool,
          "이 종목 설명은 아직 사실 검수 중이야. 검수가 끝나기 전에는 회사 정보를 지어내서 말하지 않을게.",
          "stock",
        );
      }

      return {
        tool,
        status: "ok",
        response: {
          text: `${stock.companySummary} 일상에서는 ${stock.everydayTouchpoints[0]} 만날 수 있어.`,
          uiAction: { type: "open_screen", target: "stock" },
        },
        evidence: [stock.id],
      };
    }

    if (tool === "own_trade_records") {
      const summary = await dataSource.getTradeRecordSummary(session.userId);
      if (!summary) {
        return unavailable(
          tool,
          "아직 연결된 투자 기록이 없어. 거래 기능이 연결되면 네가 남긴 이유만 되짚어 줄게.",
          "archive",
        );
      }
      return {
        tool,
        status: "ok",
        response: {
          text: `네 투자 기록은 ${summary.recordCount}개야.${summary.latestReasonLabel ? ` 가장 최근에는 “${summary.latestReasonLabel}”라고 이유를 남겼어.` : ""}`,
          uiAction: { type: "open_screen", target: "archive" },
        },
        evidence: [`trade-record-count:${summary.recordCount}`],
      };
    }

    if (tool === "own_behavior_profile") {
      const profile = await dataSource.getBehaviorProfileSummary(session.userId);
      if (!profile || profile.observationState === "initial") {
        return unavailable(
          tool,
          "아직 관찰 초기라 투자 성향을 단정할 수 없어. 기록이 쌓이면 기간을 표시해서 네 행동 특징을 설명해 줄게.",
          "archive",
        );
      }
      return {
        tool,
        status: "ok",
        response: {
          text: `${profile.periodLabel}의 성향은 “${profile.typeLabel ?? "관찰 중"}”으로 정리됐어. 이건 실력 점수가 아니라 그 기간에 보인 행동 특징이야.`,
          uiAction: { type: "open_screen", target: "archive" },
        },
        evidence: [`behavior-profile:${profile.periodLabel}`],
      };
    }

    const archive = await dataSource.getArchiveSummary(session.userId);
    if (!archive) {
      return unavailable(
        tool,
        "아직 저장된 시즌 기록이 없어. 시즌 기록이 생기면 네 기록만 찾아서 보여 줄게.",
        "archive",
      );
    }
    return {
      tool,
      status: "ok",
      response: {
        text: `네 아카이브에는 시즌 기록이 ${archive.seasonCount}개 있어.${archive.latestSeasonLabel ? ` 가장 최근 기록은 ${archive.latestSeasonLabel}이야.` : ""}`,
        uiAction: { type: "open_screen", target: "archive" },
      },
      evidence: [`archive-season-count:${archive.seasonCount}`],
    };
  };
}

export const runReadOnlyTool = createReadOnlyToolRunner();
