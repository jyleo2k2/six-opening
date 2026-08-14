import "server-only";

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { UniverseNewsReport } from "./universe-news-evaluation";
import { renderUniverseNewsStorageSql } from "./universe-news-storage";

const here = dirname(fileURLToPath(import.meta.url));

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const reportPath = resolve(
    option("--report") ?? resolve(here, "reports", "selected-company-news-2026-08-13-luna", "report.json"),
  );
  const outputPath = resolve(
    option("--output") ?? resolve(dirname(reportPath), "storage.sql"),
  );
  if (existsSync(outputPath) && !process.argv.includes("--overwrite")) {
    throw new Error(`기존 SQL을 덮어쓰지 않습니다: ${outputPath} (--overwrite로 명시)`);
  }
  const report = JSON.parse(await readFile(reportPath, "utf8")) as UniverseNewsReport;
  await writeFile(outputPath, renderUniverseNewsStorageSql(report), "utf8");
  console.log(`Storage SQL: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
