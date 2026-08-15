/**
 * 사람이 쓴 초안(`items.json`)을 파이프라인 리포트에 합쳐 적재용 리포트를 만든다.
 *
 * 파이프라인이 거부한 종목 중 사람이 직접 기사를 찾아 쓴 것만 `ready_for_storage` 로 바꾼다.
 * 적재 SQL 생성기(`renderUniverseNewsStorageSql`)가 51종목 완전 리포트 하나만 받으므로
 * 여기서 합쳐 준다. 통과 판정이 난 종목은 손대지 않는다.
 *
 * **주의**: 이 경로로 들어간 항목은 독립 검수자(publication_reviewer)를 거치지 않았다.
 * `review.checks` 는 사람이 확인했다는 선언이지 모델 판정이 아니다. 근거 문장(sourceUnits)은
 * 실제 기사 본문에서 그대로 따온 것만 쓴다.
 *
 * 사용: node manual-drafts/build.mjs --report <파이프라인 report.json> --output <합친 report.json>
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const MAX_ARTICLE_AGE_MONTHS = 6;

const CHECK_NAMES = [
  "allowedScope", "primarySubject", "directMateriality", "sourceFidelity", "focusAlignment",
  "conciseThreeLineSummary", "noIrrelevantDetail", "attributionAndTiming", "allTermsEasy",
  "sameHeadlineAcrossSurfaces", "distinctSummaryFacts", "priceConnectionGrounded",
  "termExplanationCoverage", "investmentSafety", "noSentimentLabel",
];

/** 초안이 결정적 규칙을 어기면 여기서 멈춘다. 불변 테이블에 들어가므로 사후 수정이 안 된다. */
function assertDraft(item, runDateKst) {
  const where = `${item.stockId}`;
  const ids = new Set(item.article.sourceUnits.map((unit) => unit.id));
  const checkIds = (sourceIds, field) => {
    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      throw new Error(`${where}: ${field} 의 sourceIds 가 비었습니다.`);
    }
    for (const id of sourceIds) {
      if (!ids.has(id)) throw new Error(`${where}: ${field} 가 없는 근거 ${id} 를 가리킵니다.`);
    }
  };

  if (item.article.runDateKst && item.article.runDateKst !== runDateKst) {
    throw new Error(`${where}: runDateKst 가 리포트와 다릅니다.`);
  }
  // 화면 제목이 "요즘 무슨 일이 있었어?" 다. 실적은 분기마다 나오지만 공장·계약 같은
  // 사건은 드물어서, 그냥 두면 두 번째 뉴스가 몇 해 전 기사로 밀린다. 6개월로 끊는다.
  const oldest = new Date(runDateKst);
  oldest.setMonth(oldest.getMonth() - MAX_ARTICLE_AGE_MONTHS);
  const published = new Date(item.article.publishedAt);
  if (!Number.isFinite(published.getTime())) throw new Error(`${where}: publishedAt 을 읽을 수 없습니다.`);
  if (published < oldest) {
    throw new Error(
      `${where}: 기사가 ${MAX_ARTICLE_AGE_MONTHS}개월보다 오래됐습니다(${item.article.publishedAt.slice(0, 10)} < ${oldest.toISOString().slice(0, 10)}).`,
    );
  }
  if (item.headline.text.length > 60) throw new Error(`${where}: 제목이 60자를 넘습니다.`);
  checkIds(item.headline.sourceIds, "headline");

  if (item.body.length !== 3) throw new Error(`${where}: 요약은 정확히 3줄이어야 합니다.`);
  const factKeys = new Set();
  for (const [index, line] of item.body.entries()) {
    if (line.text.length > 36) throw new Error(`${where}: ${index + 1}번째 줄이 36자를 넘습니다(${line.text.length}).`);
    if (!/^[a-z][a-z0-9_]*$/u.test(line.factKey)) throw new Error(`${where}: factKey 형식이 잘못됐습니다(${line.factKey}).`);
    if (factKeys.has(line.factKey)) throw new Error(`${where}: factKey 가 겹칩니다(${line.factKey}).`);
    factKeys.add(line.factKey);
    if (line.text === item.headline.text) throw new Error(`${where}: 요약이 제목을 그대로 반복합니다.`);
    checkIds(line.sourceIds, `body[${index}]`);
  }
  checkIds(item.priceConnection.sourceIds, "priceConnection");

  // 아이가 보는 카드에는 최대 3개만 뜬다(README 노출 규칙). 수기 항목은 애초에 그만큼만 쓴다.
  if (item.termTreatments.length > 3) {
    throw new Error(`${where}: 용어 풀이는 3개까지입니다(${item.termTreatments.length}개).`);
  }
  // 화면에 안 나오는 낱말을 풀어 주면 아이가 찾을 수 없는 설명이 된다.
  const visible = [item.headline.text, ...item.body.map((line) => line.text), item.priceConnection.text].join(" ");
  const terms = new Set();
  for (const treatment of item.termTreatments) {
    if (terms.has(treatment.term)) throw new Error(`${where}: 용어가 중복됩니다(${treatment.term}).`);
    if (!visible.includes(treatment.term)) {
      throw new Error(`${where}: '${treatment.term}' 은 제목·3줄·주가연결 어디에도 안 나옵니다.`);
    }
    terms.add(treatment.term);
    checkIds(treatment.sourceIds, `term:${treatment.term}`);
  }
  if (!ids.has(item.anchorSourceId)) throw new Error(`${where}: anchorSourceId 가 없는 근거입니다.`);
}

const reportPath = resolve(option("--report", ""));
const outputPath = resolve(option("--output", ""));
if (!reportPath || !outputPath) throw new Error("--report 와 --output 은 필수입니다.");

const report = JSON.parse(await readFile(reportPath, "utf8"));

// 종목당 파일 하나. 한 파일이 깨져도 나머지가 안 죽고, 어디까지 썼는지 파일 수로 바로 보인다.
const itemsDir = resolve(here, "items");
const items = await Promise.all(
  (await readdir(itemsDir))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map(async (name) => JSON.parse(await readFile(resolve(itemsDir, name), "utf8"))),
);

// 종목당 뉴스는 하나가 아니다. 리포트 cases 는 종목당 한 건만 담을 수 있으므로
// 첫 건만 리포트에 넣고, `second` 를 단 추가분은 따로 모아 적재기가 직접 읽게 한다.
const primaries = items.filter((item) => !item.second);
const extras = items.filter((item) => item.second);
const duplicate = primaries.map((item) => item.stockId)
  .find((id, index, all) => all.indexOf(id) !== index);
if (duplicate) throw new Error(`${duplicate}: 대표 초안이 둘 이상입니다. 추가분에는 second 를 다세요.`);

const byStock = new Map(primaries.map((item) => [item.stockId, item]));
let replaced = 0;

const cases = report.cases.map((caseResult) => {
  const item = byStock.get(caseResult.stock.stockId);
  if (!item) return caseResult;
  // 통과분을 실수로 덮어쓰는 걸 막는다. 일부러 갈아끼울 때만 `replaces` 에 이유를 적는다
  // (적재된 쪽은 published → withdrawn 으로 회수해야 화면에서 사라진다).
  if (caseResult.pipelineResult.status === "ready_for_storage" && !item.replaces) {
    throw new Error(`${item.stockId}: 이미 파이프라인이 통과시킨 종목입니다. 갈아끼우려면 replaces 에 이유를 적으세요.`);
  }
  assertDraft(item, report.runDateKst);
  replaced += 1;

  return { ...caseResult, pipelineResult: readyResult(item, report.runDateKst) };
});

/** 사람이 쓴 초안을 파이프라인 통과 결과와 같은 모양으로 바꾼다. */
function readyResult(item, runDateKst) {
  const article = {
    ...item.article,
    runDateKst,
    scope: "company",
  };
  const sourceIds = item.article.sourceUnits.map((unit) => unit.id);

  return {
      status: "ready_for_storage",
      article,
      selection: {
        articleId: article.articleId,
        primaryStockIds: [item.stockId],
        focusStatement: item.focusStatement,
        anchorSourceId: item.anchorSourceId,
        includedSourceIds: sourceIds,
        excludedSourceIds: [],
        difficultTerms: item.termTreatments.map((treatment) => treatment.term),
        reasonCodes: [],
        reasons: [],
        decision: "accept",
        kind: "company",
        eventType: item.eventType,
      },
      draft: {
        articleId: article.articleId,
        headline: item.headline,
        // 짧은 카드와 상세가 같은 제목을 쓰도록 DB 하위 호환 필드를 같은 값으로 둔다.
        homeSummary: { text: item.headline.text, sourceIds: item.headline.sourceIds },
        body: item.body,
        priceConnection: item.priceConnection,
        termTreatments: item.termTreatments,
      },
      review: {
        articleId: article.articleId,
        independentKind: "company",
        primaryStockIds: [item.stockId],
        eventType: item.eventType,
        focusStatement: item.focusStatement,
        anchorSourceIds: [item.anchorSourceId],
        checks: Object.fromEntries(CHECK_NAMES.map((name) => [name, true])),
        issues: [],
      },
      editorAttempts: 0,
  };
}

const missing = [...byStock.keys()].filter(
  (stockId) => !report.cases.some((caseResult) => caseResult.stock.stockId === stockId),
);
if (missing.length > 0) throw new Error(`리포트에 없는 종목 초안입니다: ${missing.join(", ")}`);

// 추가분은 리포트가 아니라 별도 목록으로 낸다. 적재기가 이 목록도 같은 방식으로 넣는다.
const stockByStockId = new Map(report.cases.map((item) => [item.stock.stockId, item.stock]));
const extraCases = extras.map((item) => {
  const stock = stockByStockId.get(item.stockId);
  if (!stock) throw new Error(`리포트에 없는 종목 추가분입니다: ${item.stockId}`);
  assertDraft(item, report.runDateKst);
  return { stock, pipelineResult: readyResult(item, report.runDateKst) };
});

const merged = {
  ...report,
  runId: `${report.runId}-with-manual`,
  generatedAt: new Date().toISOString(),
  readyForStorageCount: cases.filter((item) => item.pipelineResult.status === "ready_for_storage").length,
  rejectedCount: cases.filter((item) => item.pipelineResult.status === "rejected").length,
  cases,
};

await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
const extraPath = resolve(dirname(outputPath), "extra-items.json");
await writeFile(extraPath, `${JSON.stringify({ runId: merged.runId, cases: extraCases }, null, 2)}\n`, "utf8");

console.log(`수기 대표 ${replaced}건 반영 → ${outputPath}`);
console.log(`통과 ${merged.readyForStorageCount} · 거부 ${merged.rejectedCount} · decisionComplete ${merged.decisionComplete}`);
console.log(`추가 뉴스 ${extraCases.length}건 → ${extraPath}`);
