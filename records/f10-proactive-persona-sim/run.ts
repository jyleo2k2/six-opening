// 고정 시나리오의 판정 결과를 마크다운으로 출력한다.
import { renderEvaluationReport, runPersonaEvaluation } from "./evaluate";

console.log(renderEvaluationReport(runPersonaEvaluation()));
