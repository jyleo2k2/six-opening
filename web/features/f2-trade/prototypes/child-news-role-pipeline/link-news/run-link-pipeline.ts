import "server-only";

/**
 * 대표님이 주신 링크를 4역할 파이프라인에 태워 종목별 판정을 만든다.
 *
 * `run-universe-evaluation.ts` 와 하는 일이 같지만 두 가지가 다르다.
 *
 * 1. 후보가 종목마다 하나뿐이다. 거부돼도 과거 기사로 물러설 곳이 없으므로 폴백이 없다.
 * 2. 종목을 동시에 여러 개 돌린다. 역할 하나가 `max` 추론으로 수 분씩 걸려, 48종목을
 *    한 줄로 세우면 몇 시간이 된다. 종목끼리는 서로 의존하지 않아 나눠 돌려도 결과가 같다.
 *
 * 판정 기준은 그대로다. `requiredPrimaryStockId` 로 그 종목이 주인공인 기사만 통과시키고,
 * 통과·거부 모두 감사 기록으로 남긴다.
 *
 * 실행:
 *   cd web
 *   node features/f2-trade/prototypes/child-news-role-pipeline/link-news/run-link-pipeline.cjs \
 *     --input features/f2-trade/prototypes/child-news-role-pipeline/evaluation-fixtures/supplied-link-news-2026-08-18.json \
 *     --output features/f2-trade/prototypes/child-news-role-pipeline/reports/supplied-link-news-2026-08-18 \
 *     --overwrite
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { STOCKS } from "../../../../../shared/data/stocks";
import type { NewsPipelineResult } from "../contracts";
import { processNewsCandidate } from "../pipeline";
import { runOpenAiNewsRole } from "../server";
import type { LinkNewsCandidate, LinkNewsCollection } from "./collect-link-news";

const ROLE_TIMEOUT_MS = 360_000;
const DEFAULT_CONCURRENCY = 4;

export type LinkNewsCase = {
  stock: LinkNewsCandidate["stock"];
  suppliedUrl: string;
  article: LinkNewsCandidate["article"];
  pipelineResult: NewsPipelineResult;
};

export type LinkNewsReport = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  model: "gpt-5.6-luna";
  contractVersion: "child-news-role-pipeline-v2";
  promptVersion: "approved-price-linked-max-v2";
  sourceRetrievedAt: string;
  generatedAt: string;
  stockCount: number;
  completedCount: number;
  readyForStorageCount: number;
  rejectedCount: number;
  technicalErrorCount: number;
  cases: LinkNewsCase[];
};

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const TECHNICAL_CODES = new Set(["ROLE_ERROR", "PIPELINE_EXECUTION_ERROR"]);

export function isTechnicalError(result: NewsPipelineResult) {
  return result.status === "rejected" && result.reasonCodes.some((code) => TECHNICAL_CODES.has(code));
}

function summarize(runId: string, collection: LinkNewsCollection, cases: LinkNewsCase[]): LinkNewsReport {
  return {
    schemaVersion: 1,
    runId,
    runDateKst: collection.runDateKst,
    model: "gpt-5.6-luna",
    contractVersion: "child-news-role-pipeline-v2",
    promptVersion: "approved-price-linked-max-v2",
    sourceRetrievedAt: collection.retrievedAt,
    generatedAt: new Date().toISOString(),
    stockCount: collection.candidates.length,
    completedCount: cases.length,
    readyForStorageCount: cases.filter((item) => item.pipelineResult.status === "ready_for_storage").length,
    rejectedCount: cases.filter((item) => item.pipelineResult.status === "rejected").length,
    technicalErrorCount: cases.filter((item) => isTechnicalError(item.pipelineResult)).length,
    cases: [...cases].sort((left, right) => left.stock.symbol.localeCompare(right.stock.symbol)),
  };
}

/** 동시에 `limit` 개까지만 돌린다. 하나가 끝나면 다음 종목이 바로 들어간다. */
async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let index = next++; index < items.length; index = next++) {
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const inputPath = resolve(option("--input") ?? "");
  if (!inputPath) throw new Error("--input 은 필수입니다.");
  const collection = JSON.parse(await readFile(inputPath, "utf8")) as LinkNewsCollection;
  const outputDirectory = resolve(option("--output") ?? "");
  if (!outputDirectory) throw new Error("--output 은 필수입니다.");

  const roleTimeoutMs = Number(option("--role-timeout-ms") ?? ROLE_TIMEOUT_MS);
  if (!Number.isSafeInteger(roleTimeoutMs) || roleTimeoutMs < 60_000 || roleTimeoutMs > 900_000) {
    throw new Error("--role-timeout-ms 는 60000~900000 사이의 정수여야 합니다.");
  }
  const concurrency = Number(option("--concurrency") ?? DEFAULT_CONCURRENCY);
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error("--concurrency 는 1~8 사이의 정수여야 합니다.");
  }

  const jsonPath = resolve(outputDirectory, "report.json");
  const resume = process.argv.includes("--resume");
  const overwrite = process.argv.includes("--overwrite");
  if (!resume && !overwrite && existsSync(jsonPath)) {
    throw new Error(`기존 결과를 덮어쓰지 않습니다: ${jsonPath} (--resume 또는 --overwrite 로 명시)`);
  }

  // 재개할 때 기술 오류는 다시 돌린다. 판단으로 거부된 종목은 그대로 둔다.
  const retryTechnicalErrors = process.argv.includes("--retry-technical-errors");
  const done = new Map<string, LinkNewsCase>();
  if (resume && existsSync(jsonPath)) {
    const previous = JSON.parse(await readFile(jsonPath, "utf8")) as LinkNewsReport;
    for (const item of previous.cases) {
      if (retryTechnicalErrors && isTechnicalError(item.pipelineResult)) continue;
      done.set(item.stock.symbol, item);
    }
  }

  const only = option("--only")?.split(",").map((value) => value.trim()).filter(Boolean);
  const pending = collection.candidates.filter(
    (candidate) => !done.has(candidate.stock.symbol) && (!only || only.includes(candidate.stock.symbol)),
  );
  const universe = STOCKS.map((stock) => ({
    stockId: stock.id,
    name: stock.name,
    aliases: [...stock.searchAliases],
  }));

  await mkdir(outputDirectory, { recursive: true });
  const write = async () =>
    writeFile(
      jsonPath,
      `${JSON.stringify(summarize(collection.runId, collection, [...done.values()]), null, 2)}\n`,
      "utf8",
    );

  console.log(`대상 ${pending.length}종목 (이미 끝난 ${done.size}종목은 건너뜁니다) · 동시 ${concurrency}개`);
  await runWithConcurrency(pending, concurrency, async (candidate) => {
    let pipelineResult: NewsPipelineResult;
    try {
      pipelineResult = await processNewsCandidate(candidate.article, {
        runRole: runOpenAiNewsRole,
        universe,
        timeoutMs: roleTimeoutMs,
        requiredPrimaryStockId: candidate.stock.stockId,
      });
    } catch (error) {
      pipelineResult = {
        status: "rejected",
        articleId: candidate.article.articleId,
        stage: "input",
        reasonCodes: ["PIPELINE_EXECUTION_ERROR"],
        reasons: [error instanceof Error ? error.message : String(error)],
        editorAttempts: 0,
      };
    }
    done.set(candidate.stock.symbol, {
      stock: candidate.stock,
      suppliedUrl: candidate.suppliedUrl,
      article: candidate.article,
      pipelineResult,
    });
    await write();
    const detail = pipelineResult.status === "ready_for_storage"
      ? pipelineResult.draft.headline.text
      : `${pipelineResult.stage}/${pipelineResult.reasonCodes.join(",")}`;
    console.log(`[${done.size}/${collection.candidates.length}] ${candidate.stock.name}: ${pipelineResult.status} — ${detail}`);
  });

  const report = summarize(collection.runId, collection, [...done.values()]);
  await write();
  console.log(`\nJSON: ${jsonPath}`);
  console.log(
    `완료 ${report.completedCount}/${report.stockCount} · 통과 ${report.readyForStorageCount} · 거부 ${report.rejectedCount} · 기술오류 ${report.technicalErrorCount}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
