import { PROACTIVE_LIMITS } from "../../web/shared/engine/proactive-help";
import type { ChatBehaviorEvent, ProactiveSignal } from "../../web/shared/types/chatbot";
import type { MatrAIxDimensionId } from "./personas";

export type ThresholdRelation = "crosses" | "below";

export type PersonaEvaluationScenario = {
  id: string;
  personaId: string;
  signal: ProactiveSignal;
  oracleNeedsHelp: boolean;
  thresholdRelation: ThresholdRelation;
  situation: string;
  personaEvidence: readonly MatrAIxDimensionId[];
  now: number;
  events: readonly ChatBehaviorEvent[];
};

const BASE_NOW = 1_700_000_000_000;
const STOCK_ID = "KRX:005930";

const scenarioNow = (index: number) => BASE_NOW + index * 1_000_000;

function switchEvents(now: number, count: number): ChatBehaviorEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    type: "order_confirmation_cancelled" as const,
    stockId: STOCK_ID,
    side: index % 2 === 0 ? ("buy" as const) : ("sell" as const),
    at: now - (count - index) * 1_000,
  }));
}

function dwellEvents(now: number, durationMs: number): ChatBehaviorEvent[] {
  return [
    {
      type: "screen_dwell_completed",
      screen: "order",
      stockId: STOCK_ID,
      durationMs,
      at: now,
    },
  ];
}

function lossRevisitEvents(now: number, revisitCount: number): ChatBehaviorEvent[] {
  const lossAt = now - 4 * 60 * 1_000;
  return [
    {
      type: "trade_filled",
      stockId: STOCK_ID,
      side: "sell",
      realizedPnlPct: -12,
      at: lossAt,
    },
    ...Array.from({ length: revisitCount }, (_, index) => ({
      type: "screen_entered" as const,
      screen: "stock" as const,
      stockId: STOCK_ID,
      at: lossAt + 30_000 + index * 60_000,
    })),
  ];
}

/**
 * 신호마다 도움 필요 2건과 의도적 행동 2건을 둔다.
 * 각 쌍은 임계값 통과 1건과 바로 아래 1건으로 구성해 오탐·미탐을 함께 본다.
 */
export const PERSONA_EVALUATION_SCENARIOS: readonly PersonaEvaluationScenario[] = [
  {
    id: "switch-help-cross",
    personaId: "0151",
    signal: "switch",
    oracleNeedsHelp: true,
    thresholdRelation: "crosses",
    situation: "매수와 매도 의미를 확신하지 못해 확인창을 번갈아 세 번 취소한다.",
    personaEvidence: ["skill_investing", "big5_anxiety", "cog_confidence_calibration"],
    now: scenarioNow(1),
    events: switchEvents(scenarioNow(1), 3),
  },
  {
    id: "switch-help-near",
    personaId: "0193",
    signal: "switch",
    oracleNeedsHelp: true,
    thresholdRelation: "below",
    situation: "매수와 매도를 헷갈렸지만 두 번째 취소 뒤 멈춰 임계값에는 닿지 않는다.",
    personaEvidence: ["skill_investing", "cog_decision_speed", "cog_attention_span"],
    now: scenarioNow(2),
    events: switchEvents(scenarioNow(2), 2),
  },
  {
    id: "switch-control-cross",
    personaId: "0182",
    signal: "switch",
    oracleNeedsHelp: false,
    thresholdRelation: "crosses",
    situation: "매수·매도 확인 내용을 비교 기록하려고 의도적으로 세 번 번갈아 열고 취소한다.",
    personaEvidence: ["decision_style", "skill_investing", "cog_confidence_calibration"],
    now: scenarioNow(3),
    events: switchEvents(scenarioNow(3), 3),
  },
  {
    id: "switch-control-near",
    personaId: "0165",
    signal: "switch",
    oracleNeedsHelp: false,
    thresholdRelation: "below",
    situation: "보호자와 주문 절차를 비교 학습하며 두 번 번갈아 취소하고 계획대로 종료한다.",
    personaEvidence: ["skill_investing", "cog_decision_speed", "trait_self_regulation"],
    now: scenarioNow(4),
    events: switchEvents(scenarioNow(4), 2),
  },
  {
    id: "dwell-help-cross",
    personaId: "0152",
    signal: "dwell",
    oracleNeedsHelp: true,
    thresholdRelation: "crosses",
    situation: "주문 화면에서 다음 단계를 찾지 못한 채 5분을 넘긴다.",
    personaEvidence: ["tech_savviness", "cog_attention_span", "skill_investing"],
    now: scenarioNow(5),
    events: dwellEvents(scenarioNow(5), PROACTIVE_LIMITS.dwellMs + 1),
  },
  {
    id: "dwell-help-near",
    personaId: "0160",
    signal: "dwell",
    oracleNeedsHelp: true,
    thresholdRelation: "below",
    situation: "주문 화면에서 막혀 있지만 체류 시간이 정확히 5분이라 현재 초과 조건에는 걸리지 않는다.",
    personaEvidence: ["tech_savviness", "cog_ambiguity_tolerance", "skill_investing"],
    now: scenarioNow(6),
    events: dwellEvents(scenarioNow(6), PROACTIVE_LIMITS.dwellMs),
  },
  {
    id: "dwell-control-cross",
    personaId: "0200",
    signal: "dwell",
    oracleNeedsHelp: false,
    thresholdRelation: "crosses",
    situation: "주문 전 정보를 읽고 계산하는 계획된 검토라 5분을 넘겨도 도움이 필요하지 않다.",
    personaEvidence: ["decision_style", "learning_style", "cog_attention_span", "cog_patience"],
    now: scenarioNow(7),
    events: dwellEvents(scenarioNow(7), PROACTIVE_LIMITS.dwellMs + 120_000),
  },
  {
    id: "dwell-control-near",
    personaId: "0178",
    signal: "dwell",
    oracleNeedsHelp: false,
    thresholdRelation: "below",
    situation: "승인된 회사 설명을 계획대로 읽고 5분 전에 다음 화면으로 이동한다.",
    personaEvidence: ["learning_style", "cog_attention_span", "trait_self_regulation"],
    now: scenarioNow(8),
    events: dwellEvents(scenarioNow(8), PROACTIVE_LIMITS.dwellMs - 1),
  },
  {
    id: "loss-help-cross",
    personaId: "0189",
    signal: "lossRevisit",
    oracleNeedsHelp: true,
    thresholdRelation: "crosses",
    situation: "-12% 손실 실현 뒤 불안해서 같은 종목을 5분 안에 네 번 다시 연다.",
    personaEvidence: ["risk_tolerance", "big5_anxiety", "health_stress_level", "trait_self_regulation"],
    now: scenarioNow(9),
    events: lossRevisitEvents(scenarioNow(9), 4),
  },
  {
    id: "loss-help-near",
    personaId: "0196",
    signal: "lossRevisit",
    oracleNeedsHelp: true,
    thresholdRelation: "below",
    situation: "-12% 손실 뒤 계속 신경 쓰여 세 번 재진입하지만 현재 네 번 기준에는 못 미친다.",
    personaEvidence: ["big5_anxiety", "health_stress_level", "cog_confidence_calibration"],
    now: scenarioNow(10),
    events: lossRevisitEvents(scenarioNow(10), 3),
  },
  {
    id: "loss-control-cross",
    personaId: "0185",
    signal: "lossRevisit",
    oracleNeedsHelp: false,
    thresholdRelation: "crosses",
    situation: "미리 만든 사후 검토표에 따라 손실 종목의 네 화면 항목을 차례로 확인한다.",
    personaEvidence: ["skill_investing", "risk_tolerance", "trait_self_regulation"],
    now: scenarioNow(11),
    events: lossRevisitEvents(scenarioNow(11), 4),
  },
  {
    id: "loss-control-near",
    personaId: "0190",
    signal: "lossRevisit",
    oracleNeedsHelp: false,
    thresholdRelation: "below",
    situation: "보호자와 정한 세 항목만 확인하고 손실 종목 검토를 계획대로 끝낸다.",
    personaEvidence: ["decision_style", "cog_patience", "cog_attention_span"],
    now: scenarioNow(12),
    events: lossRevisitEvents(scenarioNow(12), 3),
  },
];
