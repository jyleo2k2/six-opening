import {
  createProactiveSession,
  detectProactiveSignals,
  selectProactiveSignal,
} from "../../web/shared/engine/proactive-help";
import type { ProactiveSignal } from "../../web/shared/types/chatbot";
import { MATRAIX_SOURCE, getMatrAIxPersona } from "./personas";
import {
  PERSONA_EVALUATION_SCENARIOS,
  type PersonaEvaluationScenario,
} from "./scenarios";

export type Classification = "true-positive" | "false-positive" | "true-negative" | "false-negative";

export type PersonaEvaluationResult = {
  scenarioId: string;
  personaId: string;
  ageBracket: string;
  signal: ProactiveSignal;
  oracleNeedsHelp: boolean;
  thresholdRelation: PersonaEvaluationScenario["thresholdRelation"];
  detectedSignals: readonly ProactiveSignal[];
  selectedSignal: ProactiveSignal | null;
  engineOffersHelp: boolean;
  classification: Classification;
};

export type ConfusionMatrix = {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
};

export type EvaluationMetrics = ConfusionMatrix & {
  total: number;
  precision: number;
  sensitivity: number;
  specificity: number;
  accuracy: number;
};

const SIGNALS: readonly ProactiveSignal[] = ["switch", "dwell", "lossRevisit"];

function classify(oracleNeedsHelp: boolean, engineOffersHelp: boolean): Classification {
  if (oracleNeedsHelp) return engineOffersHelp ? "true-positive" : "false-negative";
  return engineOffersHelp ? "false-positive" : "true-negative";
}

export function evaluateScenario(scenario: PersonaEvaluationScenario): PersonaEvaluationResult {
  const detectedSignals = detectProactiveSignals(scenario.events, scenario.now);
  const session = createProactiveSession(scenario.now);
  const selectedSignal = selectProactiveSignal(detectedSignals, session, scenario.now);
  const engineOffersHelp = selectedSignal === scenario.signal;
  const persona = getMatrAIxPersona(scenario.personaId);

  return {
    scenarioId: scenario.id,
    personaId: scenario.personaId,
    ageBracket: persona.dimensions.age_bracket,
    signal: scenario.signal,
    oracleNeedsHelp: scenario.oracleNeedsHelp,
    thresholdRelation: scenario.thresholdRelation,
    detectedSignals,
    selectedSignal,
    engineOffersHelp,
    classification: classify(scenario.oracleNeedsHelp, engineOffersHelp),
  };
}

export function runPersonaEvaluation(
  scenarios: readonly PersonaEvaluationScenario[] = PERSONA_EVALUATION_SCENARIOS,
): PersonaEvaluationResult[] {
  return scenarios.map(evaluateScenario);
}

function emptyMatrix(): ConfusionMatrix {
  return { truePositive: 0, falsePositive: 0, trueNegative: 0, falseNegative: 0 };
}

function addResult(matrix: ConfusionMatrix, result: PersonaEvaluationResult): void {
  if (result.classification === "true-positive") matrix.truePositive += 1;
  if (result.classification === "false-positive") matrix.falsePositive += 1;
  if (result.classification === "true-negative") matrix.trueNegative += 1;
  if (result.classification === "false-negative") matrix.falseNegative += 1;
}

const safeRate = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;

export function calculateMetrics(results: readonly PersonaEvaluationResult[]): EvaluationMetrics {
  const matrix = emptyMatrix();
  results.forEach((result) => addResult(matrix, result));
  const total = results.length;

  return {
    ...matrix,
    total,
    precision: safeRate(matrix.truePositive, matrix.truePositive + matrix.falsePositive),
    sensitivity: safeRate(matrix.truePositive, matrix.truePositive + matrix.falseNegative),
    specificity: safeRate(matrix.trueNegative, matrix.trueNegative + matrix.falsePositive),
    accuracy: safeRate(matrix.truePositive + matrix.trueNegative, total),
  };
}

export function calculateMetricsBySignal(
  results: readonly PersonaEvaluationResult[],
): Record<ProactiveSignal, EvaluationMetrics> {
  return Object.fromEntries(
    SIGNALS.map((signal) => [signal, calculateMetrics(results.filter((result) => result.signal === signal))]),
  ) as Record<ProactiveSignal, EvaluationMetrics>;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function renderEvaluationReport(results: readonly PersonaEvaluationResult[]): string {
  const metrics = calculateMetrics(results);
  const bySignal = calculateMetricsBySignal(results);
  const lines = [
    "# MatrAIx 아동 페르소나 × 키웅이 행동 신호 경계 평가",
    "",
    `원본: ${MATRAIX_SOURCE.repository}@${MATRAIX_SOURCE.commit}`,
    "",
    "이 결과는 실제 아동 정확도가 아니라, 같은 행동이 ‘헤맴’과 ‘의도적 탐색’ 둘 다 될 수 있는지 보는 사전 스트레스 테스트다.",
    "",
    "## 전체 혼동행렬",
    "",
    `- TP ${metrics.truePositive} / FP ${metrics.falsePositive} / TN ${metrics.trueNegative} / FN ${metrics.falseNegative}`,
    `- 정밀도 ${percent(metrics.precision)} / 민감도 ${percent(metrics.sensitivity)} / 특이도 ${percent(metrics.specificity)} / 정확도 ${percent(metrics.accuracy)}`,
    "",
    "## 신호별",
    "",
    "| 신호 | TP | FP | TN | FN |",
    "|---|---:|---:|---:|---:|",
    ...SIGNALS.map((signal) => {
      const item = bySignal[signal];
      return `| ${signal} | ${item.truePositive} | ${item.falsePositive} | ${item.trueNegative} | ${item.falseNegative} |`;
    }),
    "",
    "## 시나리오별",
    "",
    "| 시나리오 | 페르소나 | 연령 | 신호 | 관찰자 라벨 | 임계값 | 엔진 | 판정 |",
    "|---|---:|---|---|---|---|---|---|",
    ...results.map(
      (result) =>
        `| ${result.scenarioId} | ${result.personaId} | ${result.ageBracket} | ${result.signal} | ${result.oracleNeedsHelp ? "도움 필요" : "의도적 행동"} | ${result.thresholdRelation} | ${result.engineOffersHelp ? "도움 제안" : "미제안"} | ${result.classification} |`,
    ),
  ];

  return lines.join("\n");
}
