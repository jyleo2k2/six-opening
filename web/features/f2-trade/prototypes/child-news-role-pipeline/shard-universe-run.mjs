/**
 * 51종목 판정을 N개 프로세스로 쪼개 돌리고 리포트 하나로 합친다.
 *
 * `run-universe-evaluation` 은 종목을 순차로 돈다(종목당 3~5분). 51종목이면 3시간이
 * 넘는데 종목끼리는 서로를 참조하지 않으므로 쪼개도 결과가 같다. 판정 로직은 건드리지
 * 않고 입력을 나눠 여러 인스턴스에 주고, 나온 리포트를 원래 종목 순서로 다시 잇는다.
 *
 * 합치는 단계가 필요한 이유는 적재 게이트(`renderUniverseNewsStorageSql`)가 51종목이
 * 한 리포트에 있어야만 SQL 을 만들기 때문이다. 그래서 카운트도 원본과 같은 규칙으로
 * 다시 센다 — 조각 리포트는 `completedCount` 가 5~6 이고 `decisionComplete` 가 false 다.
 *
 * 사용:
 *   node shard-universe-run.mjs --input <수집.json> --output-root <디렉터리> [--shards 10] [--resume]
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const inputPath = resolve(option("--input", ""));
const outputRoot = resolve(option("--output-root", ""));
const shardCount = Number(option("--shards", "10"));
const resume = process.argv.includes("--resume");
const roleTimeoutMs = option("--role-timeout-ms", null);

if (!inputPath || !outputRoot) throw new Error("--input 과 --output-root 는 필수입니다.");
if (!Number.isInteger(shardCount) || shardCount < 1 || shardCount > 51) {
  throw new Error("--shards 는 1~51 사이 정수여야 합니다.");
}

/** 종목 수가 조각 수로 안 나눠떨어져도 한 조각에 몰리지 않게 고르게 나눈다. */
function shardRanges(total, count) {
  const base = Math.floor(total / count);
  const extra = total % count;
  const ranges = [];
  let start = 0;
  for (let index = 0; index < count; index += 1) {
    const size = base + (index < extra ? 1 : 0);
    if (size > 0) ranges.push([start, start + size]);
    start += size;
  }
  return ranges;
}

function shardName(index) {
  return `shard-${String(index + 1).padStart(2, "0")}`;
}

async function writeShardInputs(collection) {
  const ranges = shardRanges(collection.candidates.length, shardCount);
  const shards = [];
  for (const [index, [from, to]] of ranges.entries()) {
    const path = resolve(outputRoot, "shards", `${shardName(index)}.json`);
    await mkdir(dirname(path), { recursive: true });
    // runId 를 그대로 두면 조각 리포트끼리도 같은 실행으로 남아 재개 검사가 통과한다.
    await writeFile(
      path,
      `${JSON.stringify({ ...collection, candidates: collection.candidates.slice(from, to) }, null, 2)}\n`,
      "utf8",
    );
    shards.push({ name: shardName(index), input: path, output: resolve(outputRoot, shardName(index)) });
  }
  return shards;
}

function runShard(shard) {
  const args = [
    resolve(here, "run-universe-evaluation.cjs"),
    "--input", shard.input,
    "--output", shard.output,
    resume && existsSync(resolve(shard.output, "report.json")) ? "--resume" : "--overwrite",
  ];
  if (roleTimeoutMs) args.push("--role-timeout-ms", roleTimeoutMs);
  if (process.argv.includes("--retry-technical-errors")) args.push("--retry-technical-errors");

  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, args, { cwd: resolve(here, "../../../.."), stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      for (const line of String(chunk).split("\n")) {
        if (line.trim()) console.log(`[${shard.name}] ${line.trim()}`);
      }
    });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      // 조각은 51종목을 다 갖지 못하므로 `decisionComplete` 가 false 이고, CLI 는 그때 1로 끝낸다.
      // 조각 실행에서는 정상이다. 진짜 실패는 리포트가 아예 안 나온 경우라 그것만 알린다.
      const wrote = existsSync(resolve(shard.output, "report.json"));
      if (!wrote) console.error(`[${shard.name}] 리포트 없이 종료 코드 ${code}\n${stderr.trim().slice(-2000)}`);
      resolveRun({ shard, ok: wrote });
    });
  });
}

/** 조각 리포트를 원래 종목 순서로 잇고 카운트를 원본 규칙대로 다시 센다. */
async function mergeReports(collection, shards) {
  const byStockId = new Map();
  let model = "gpt-5.6-luna";
  let generatedAt = new Date().toISOString();
  for (const shard of shards) {
    const path = resolve(shard.output, "report.json");
    if (!existsSync(path)) continue;
    const report = JSON.parse(await readFile(path, "utf8"));
    model = report.model;
    generatedAt = report.generatedAt > generatedAt ? report.generatedAt : generatedAt;
    for (const item of report.cases) byStockId.set(item.stock.stockId, item);
  }

  const cases = collection.candidates
    .map((candidate) => byStockId.get(candidate.stock.stockId))
    .filter((item) => item !== undefined);

  return {
    schemaVersion: 1,
    runId: collection.runId,
    runDateKst: collection.runDateKst,
    sourceRetrievedAt: collection.retrievedAt,
    sourceBasis: collection.sourceBasis,
    generatedAt,
    model,
    stockCount: 51,
    completedCount: cases.length,
    readyForStorageCount: cases.filter((item) => item.pipelineResult.status === "ready_for_storage").length,
    rejectedCount: cases.filter((item) => item.pipelineResult.status === "rejected").length,
    decisionComplete:
      cases.length === 51 &&
      cases.every((item) =>
        item.pipelineResult.status === "ready_for_storage" ||
        (item.pipelineResult.reasonCodes.length > 0 && item.pipelineResult.reasons.length > 0),
      ),
    cases,
  };
}

const collection = JSON.parse(await readFile(inputPath, "utf8"));
if (collection.candidates.length !== 51) {
  console.warn(`경고: 수집 종목이 51개가 아닙니다(${collection.candidates.length}). 적재 게이트는 51종목만 통과시킵니다.`);
}

const shards = await writeShardInputs(collection);
console.log(`${shards.length}개 조각으로 ${collection.candidates.length}종목을 나눠 실행합니다.`);

const results = await Promise.all(shards.map(runShard));
const failed = results.filter((result) => !result.ok);

const merged = await mergeReports(collection, shards);
const mergedPath = resolve(outputRoot, "report.json");
await writeFile(mergedPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

console.log(`\n병합 리포트: ${mergedPath}`);
console.log(`완료 ${merged.completedCount}/51 · 통과 ${merged.readyForStorageCount} · 거부 ${merged.rejectedCount} · decisionComplete ${merged.decisionComplete}`);
if (failed.length > 0) {
  console.log(`리포트를 못 낸 조각 ${failed.length}개: ${failed.map((result) => result.shard.name).join(", ")} — --resume 으로 이어서 실행하세요.`);
}
