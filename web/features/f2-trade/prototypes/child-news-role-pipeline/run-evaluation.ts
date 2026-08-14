import "server-only";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STOCKS } from "../../../../shared/data/stocks";
import type { NewsEvaluationInput } from "./contracts";
import { renderNewsEvaluationHtml, runNewsEvaluation } from "./evaluation";
import { runOpenAiNewsRole } from "./server";

const here = dirname(fileURLToPath(import.meta.url));
const defaultInput = resolve(
  here,
  "evaluation-fixtures/latest-economic-news-2026-08-12.json",
);
const EVALUATION_ROLE_TIMEOUT_MS = 180_000;
const MAX_EVALUATION_ROLE_TIMEOUT_MS = 900_000;

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function roleTimeoutMs() {
  const raw = option("--role-timeout-ms");
  if (raw === undefined) return EVALUATION_ROLE_TIMEOUT_MS;
  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed < EVALUATION_ROLE_TIMEOUT_MS ||
    parsed > MAX_EVALUATION_ROLE_TIMEOUT_MS
  ) {
    throw new Error(
      `--role-timeout-ms는 ${EVALUATION_ROLE_TIMEOUT_MS}~${MAX_EVALUATION_ROLE_TIMEOUT_MS} 사이의 정수여야 합니다.`,
    );
  }
  return parsed;
}

function parseInput(value: unknown): NewsEvaluationInput {
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("runId" in value) ||
    typeof value.runId !== "string" ||
    !("runDateKst" in value) ||
    typeof value.runDateKst !== "string" ||
    !("retrievedAt" in value) ||
    typeof value.retrievedAt !== "string" ||
    !("sourceBasis" in value) ||
    typeof value.sourceBasis !== "string" ||
    !("cases" in value) ||
    !Array.isArray(value.cases)
  ) {
    throw new Error("평가 입력 메타데이터가 올바르지 않습니다.");
  }
  return value as NewsEvaluationInput;
}

async function main() {
  const inputPath = resolve(option("--input") ?? defaultInput);
  const input = parseInput(JSON.parse(await readFile(inputPath, "utf8")));
  const outputDirectory = resolve(
    option("--output") ?? resolve(here, "reports", input.runId),
  );
  const jsonPath = resolve(outputDirectory, "report.json");
  const htmlPath = resolve(outputDirectory, "index.html");
  const overwrite = process.argv.includes("--overwrite");

  if (!overwrite && (existsSync(jsonPath) || existsSync(htmlPath))) {
    throw new Error(
      `기존 평가 결과를 덮어쓰지 않습니다: ${outputDirectory} (--overwrite로 명시)`,
    );
  }

  const universe = STOCKS.map((stock) => ({
    stockId: stock.id,
    name: stock.name,
    aliases: [...stock.searchAliases],
  }));
  const report = await runNewsEvaluation(
    input.cases,
    {
      runRole: runOpenAiNewsRole,
      universe,
      timeoutMs: roleTimeoutMs(),
    },
    {
      runId: input.runId,
      runDateKst: input.runDateKst,
      sourceRetrievedAt: input.retrievedAt,
      sourceBasis: input.sourceBasis,
    },
  );

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(htmlPath, renderNewsEvaluationHtml(report), "utf8");

  console.log(`JSON: ${jsonPath}`);
  console.log(`HTML: ${htmlPath}`);
  console.log(
    `기대 일치 ${report.expectationMatchedCount}/${report.articleCount}, ready ${report.readyForStorageCount}, rejected ${report.rejectedCount}`,
  );
  if (!report.criteriaPassed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
