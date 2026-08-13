import "server-only";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { STOCKS } from "../../../../shared/data/stocks";
import type { UniverseNewsCollection } from "./naver-news-collector";
import { runOpenAiNewsRole } from "./server";
import {
  FIXED_HOME_SUMMARIES,
  renderUniverseComparisonHtml,
  runUniverseNewsEvaluation,
  type CurrentMockNews,
  type UniverseNewsReport,
} from "./universe-news-evaluation";

const here = dirname(fileURLToPath(import.meta.url));
const ROLE_TIMEOUT_MS = 180_000;

type RawMockUniverse = {
  sectors?: Array<{ id?: unknown; name?: unknown }>;
  newsDetail?: Record<string, { headline?: unknown; body?: unknown; points?: unknown }>;
};

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function todayKst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseCollection(value: unknown): UniverseNewsCollection {
  if (
    typeof value !== "object" || value === null ||
    !("schemaVersion" in value) || value.schemaVersion !== 1 ||
    !("runId" in value) || typeof value.runId !== "string" ||
    !("runDateKst" in value) || typeof value.runDateKst !== "string" ||
    !("retrievedAt" in value) || typeof value.retrievedAt !== "string" ||
    !("sourceBasis" in value) || typeof value.sourceBasis !== "string" ||
    !("candidates" in value) || !Array.isArray(value.candidates)
  ) {
    throw new Error("51종목 수집 JSON의 메타데이터가 올바르지 않습니다.");
  }
  return value as UniverseNewsCollection;
}

function parseExistingReport(value: unknown, collection: UniverseNewsCollection) {
  if (
    typeof value !== "object" || value === null ||
    !("runId" in value) || value.runId !== collection.runId ||
    !("model" in value) || value.model !== "gpt-5.6-luna" ||
    !("cases" in value) || !Array.isArray(value.cases)
  ) {
    throw new Error("재개할 report.json이 현재 수집 입력과 일치하지 않습니다.");
  }
  return value as UniverseNewsReport;
}

async function loadCurrentMocks() {
  const source = await readFile(
    resolve(here, "../../../../public/ui/assets/universe.js"),
    "utf8",
  );
  const sandbox: { window: { KW_UNIVERSE?: RawMockUniverse } } = { window: {} };
  runInNewContext(source, sandbox, { timeout: 1_000 });
  const raw = sandbox.window.KW_UNIVERSE;
  if (!raw?.sectors || !raw.newsDetail) {
    throw new Error("현재 universe.js의 뉴스 목업을 읽지 못했습니다.");
  }
  const sectorNames = new Map(
    raw.sectors.flatMap((sector) =>
      typeof sector.id === "string" && typeof sector.name === "string"
        ? [[sector.id, sector.name] as const]
        : [],
    ),
  );
  const mocks = new Map<string, CurrentMockNews>();
  for (const [sectorKey, detail] of Object.entries(raw.newsDetail)) {
    if (
      typeof detail.headline !== "string" ||
      !Array.isArray(detail.body) || !detail.body.every((item) => typeof item === "string") ||
      !Array.isArray(detail.points) || !detail.points.every((item) => typeof item === "string")
    ) {
      throw new Error(`${sectorKey}: 현재 뉴스 목업 구조가 올바르지 않습니다.`);
    }
    mocks.set(sectorKey, {
      sectorKey,
      sectorName: sectorNames.get(sectorKey) ?? sectorKey,
      homeSummary: FIXED_HOME_SUMMARIES[sectorKey] ?? "기존 짧은 뉴스 문구 없음",
      headline: detail.headline,
      body: detail.body as string[],
      points: detail.points as string[],
    });
  }
  return mocks;
}

async function writeReport(
  outputDirectory: string,
  report: UniverseNewsReport,
  mocks: ReadonlyMap<string, CurrentMockNews>,
) {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(outputDirectory, "report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      resolve(outputDirectory, "index.html"),
      renderUniverseComparisonHtml(report, mocks),
      "utf8",
    ),
  ]);
}

async function main() {
  const date = option("--date") ?? todayKst();
  const defaultRunId = `selected-company-news-${date}-luna`;
  const inputPath = resolve(
    option("--input") ?? resolve(here, "evaluation-fixtures", `${defaultRunId}.json`),
  );
  const collection = parseCollection(JSON.parse(await readFile(inputPath, "utf8")));
  const outputDirectory = resolve(
    option("--output") ?? resolve(here, "reports", collection.runId),
  );
  const jsonPath = resolve(outputDirectory, "report.json");
  const htmlPath = resolve(outputDirectory, "index.html");
  const resume = process.argv.includes("--resume");
  const overwrite = process.argv.includes("--overwrite");
  if (!resume && !overwrite && (existsSync(jsonPath) || existsSync(htmlPath))) {
    throw new Error(`기존 결과를 덮어쓰지 않습니다: ${outputDirectory} (--resume 또는 --overwrite로 명시)`);
  }
  const existingReport = resume && existsSync(jsonPath)
    ? parseExistingReport(JSON.parse(await readFile(jsonPath, "utf8")), collection)
    : undefined;
  const mocks = await loadCurrentMocks();
  const universe = STOCKS.map((stock) => ({
    stockId: stock.id,
    name: stock.name,
    aliases: [...stock.searchAliases],
  }));

  const report = await runUniverseNewsEvaluation(
    collection,
    {
      runRole: runOpenAiNewsRole,
      universe,
      timeoutMs: ROLE_TIMEOUT_MS,
    },
    {
      existingCases: existingReport?.cases,
      async onCaseCompleted(partial, latest) {
        await writeReport(outputDirectory, partial, mocks);
        console.log(
          `[${partial.completedCount}/51] ${latest.stock.name}: ${latest.pipelineResult.status}`,
        );
      },
    },
  );
  await writeReport(outputDirectory, report, mocks);
  console.log(`JSON: ${jsonPath}`);
  console.log(`HTML: ${htmlPath}`);
  console.log(
    `완료 ${report.completedCount}/51, ready ${report.readyForStorageCount}, rejected ${report.rejectedCount}`,
  );
  if (!report.decisionComplete) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
