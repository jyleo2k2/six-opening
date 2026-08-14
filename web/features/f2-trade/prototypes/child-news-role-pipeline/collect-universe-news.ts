import "server-only";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STOCKS } from "../../../../shared/data/stocks";
import {
  collectLatestUniverseNews,
  type UniverseNewsCollection,
} from "./naver-news-collector";

const here = dirname(fileURLToPath(import.meta.url));

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

async function main() {
  const runDateKst = option("--date") ?? todayKst();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(runDateKst)) {
    throw new Error("--date는 YYYY-MM-DD 형식이어야 합니다.");
  }
  const runId = option("--run-id") ?? `selected-company-news-${runDateKst}-luna`;
  const outputPath = resolve(
    option("--output") ??
      resolve(here, "evaluation-fixtures", `${runId}.json`),
  );
  const resume = process.argv.includes("--resume");
  if (existsSync(outputPath) && !process.argv.includes("--overwrite") && !resume) {
    throw new Error(`기존 수집 결과를 덮어쓰지 않습니다: ${outputPath} (--overwrite로 명시)`);
  }
  const existing = resume && existsSync(outputPath)
    ? JSON.parse(await readFile(outputPath, "utf8")) as UniverseNewsCollection
    : undefined;
  if (existing && (existing.runId !== runId || existing.runDateKst !== runDateKst)) {
    throw new Error("재개할 수집 결과의 runId 또는 날짜가 현재 명령과 다릅니다.");
  }
  const retrievedAt = existing?.retrievedAt ?? new Date().toISOString();
  const sourceBasis = "네이버 뉴스 최신순 검색으로 후보 URL을 찾고, 네이버 표준 기사 페이지에서 제목·언론사·발행 시각·언론사 원문 링크·본문 근거를 다시 확인한 뒤 최신 날짜부터 최대 8개 후보를 과거 순으로 평가함";
  async function writeCheckpoint(candidates: readonly UniverseNewsCollection["candidates"][number][]) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify({
        schemaVersion: 1,
        runId,
        runDateKst,
        retrievedAt,
        sourceBasis,
        candidates,
      }, null, 2)}\n`,
      "utf8",
    );
  }

  const collection = await collectLatestUniverseNews(STOCKS, {
    runDateKst,
    runId,
    existingCandidates: existing?.candidates,
    async onProgress(completed, total, candidate, candidates) {
      await writeCheckpoint(candidates);
      console.log(
        `[${completed}/${total}] ${candidate.stock.name}: ${candidate.article.title} (점수 ${candidate.selectionScore}, 폴백 ${candidate.fallbackCandidates?.length ?? 0}건)`,
      );
    },
  });
  await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
  console.log(`수집 JSON: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
