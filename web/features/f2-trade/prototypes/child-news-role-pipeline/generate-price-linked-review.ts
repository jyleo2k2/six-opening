import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createPriceLinkedReviewReport,
  renderPriceLinkedReviewHtml,
} from "./price-linked-news-review";

const outputDir = fileURLToPath(new URL("./reports/price-linked-news-golden-2026-08-13/", import.meta.url));

async function main() {
  const report = createPriceLinkedReviewReport();
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(`${outputDir}report.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(`${outputDir}index.html`, renderPriceLinkedReviewHtml(report), "utf8"),
  ]);
  console.log(`골든 뉴스 ${report.caseCount}건 생성 완료: ${outputDir}`);
}

void main();
