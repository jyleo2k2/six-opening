// 실제 사용자 효과가 아닌 고정 경계 시나리오의 재현성을 검증한다.
import assert from "node:assert/strict";
import {
  calculateMetrics,
  calculateMetricsBySignal,
  renderEvaluationReport,
  runPersonaEvaluation,
} from "./evaluate";
import {
  MATRAIX_CHILD_PERSONAS,
  MATRAIX_DIMENSION_IDS,
  MATRAIX_SOURCE,
  getMatrAIxPersona,
} from "./personas";
import { PERSONA_EVALUATION_SCENARIOS } from "./scenarios";

assert.equal(PERSONA_EVALUATION_SCENARIOS.length, 12);
assert.equal(MATRAIX_CHILD_PERSONAS.length, 12);
assert.equal(new Set(MATRAIX_CHILD_PERSONAS.map((persona) => persona.personaId)).size, 12);
assert.equal(MATRAIX_SOURCE.commit.length, 40);

const ageCounts = Object.groupBy(
  MATRAIX_CHILD_PERSONAS,
  (persona) => persona.dimensions.age_bracket,
);
assert.equal(ageCounts["5-12"]?.length, 6);
assert.equal(ageCounts["13-17"]?.length, 6);

for (const persona of MATRAIX_CHILD_PERSONAS) {
  assert.deepEqual(Object.keys(persona.dimensions).sort(), [...MATRAIX_DIMENSION_IDS].sort());
  assert.equal("displayName" in persona, false);
  assert.equal("region" in persona.dimensions, false);
  assert.equal("gender_identity" in persona.dimensions, false);
}

for (const signal of ["switch", "dwell", "lossRevisit"] as const) {
  const scenarios = PERSONA_EVALUATION_SCENARIOS.filter((scenario) => scenario.signal === signal);
  assert.equal(scenarios.length, 4);
  assert.equal(scenarios.filter((scenario) => scenario.oracleNeedsHelp).length, 2);
  assert.equal(scenarios.filter((scenario) => !scenario.oracleNeedsHelp).length, 2);
  assert.equal(scenarios.filter((scenario) => scenario.thresholdRelation === "crosses").length, 2);
  assert.equal(scenarios.filter((scenario) => scenario.thresholdRelation === "below").length, 2);
}

for (const scenario of PERSONA_EVALUATION_SCENARIOS) {
  const persona = getMatrAIxPersona(scenario.personaId);
  assert.ok(scenario.personaEvidence.length > 0);
  scenario.personaEvidence.forEach((dimensionId) => {
    assert.ok(persona.dimensions[dimensionId]);
  });
}

const firstRun = runPersonaEvaluation();
const secondRun = runPersonaEvaluation();
assert.deepEqual(secondRun, firstRun);

for (const result of firstRun) {
  const crossesThreshold = result.thresholdRelation === "crosses";
  assert.equal(result.engineOffersHelp, crossesThreshold);
  assert.deepEqual(result.detectedSignals, crossesThreshold ? [result.signal] : []);
}

assert.deepEqual(calculateMetrics(firstRun), {
  truePositive: 3,
  falsePositive: 3,
  trueNegative: 3,
  falseNegative: 3,
  total: 12,
  precision: 0.5,
  sensitivity: 0.5,
  specificity: 0.5,
  accuracy: 0.5,
});

const metricsBySignal = calculateMetricsBySignal(firstRun);
for (const metrics of Object.values(metricsBySignal)) {
  assert.deepEqual(metrics, {
    truePositive: 1,
    falsePositive: 1,
    trueNegative: 1,
    falseNegative: 1,
    total: 4,
    precision: 0.5,
    sensitivity: 0.5,
    specificity: 0.5,
    accuracy: 0.5,
  });
}

const report = renderEvaluationReport(firstRun);
assert.match(report, /실제 아동 정확도가 아니라/);
assert.match(report, /TP 3 \/ FP 3 \/ TN 3 \/ FN 3/);

console.log("persona proactive help evaluation tests passed");
