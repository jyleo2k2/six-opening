/**
 * 뉴스가 실제로 풀어 쓴 어려운 말을 빈도로 집계한다 — **챗봇 금융 사전의 확장 근거**다.
 *
 * 사전을 무엇으로 채울지는 추측하기 쉽고 틀리기도 쉽다. 실제로 세어 보면 `상반기`가
 * 11번 나오는데 사전에 없고, 반대로 사람이 떠올린 목록에는 그 낱말이 없다.
 *
 * **방향은 한쪽이다.** 뉴스 → 사전은 *제안*이고, 사전 → 뉴스는 *구속*이다. 여기서 나온
 * 낱말을 자동으로 사전에 넣지 않는다 — `easyText` 는 그 기사 문맥에 묶여 있고(편집자
 * 프롬프트가 "문맥에 뜻이 없으면 뜻을 지어내지 마라"고 못박는다), 검수도 그 노출문
 * 기준으로 통과했다. 사전 문장은 문맥 없이 읽혀야 하고 출력 게이트를 면제받는
 * 승인 텍스트이므로 사람이 다시 쓰고 다시 본다.
 *
 *   npx tsx term-frequency.ts            # 빈도순 + 사전 보유 여부
 *   npx tsx term-frequency.ts --missing  # 사전에 없는 것만
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { findChatbotKnowledge } from "../../../../shared/data/chatbot-knowledge";

declare const __dirname: string;
const HERE = resolve(__dirname);

type TermTreatment = { term: string; easyText: string; treatment: string };

/** 수기 초안과 파이프라인 리포트 양쪽에서 모은다. 어느 쪽이든 노출문의 근거다. */
function collectTreatments(): TermTreatment[] {
  const found: TermTreatment[] = [];

  const itemsDir = resolve(HERE, "manual-drafts/items");
  if (existsSync(itemsDir)) {
    for (const file of readdirSync(itemsDir).filter((name) => name.endsWith(".json"))) {
      const parsed = JSON.parse(readFileSync(resolve(itemsDir, file), "utf8")) as {
        termTreatments?: TermTreatment[];
      };
      found.push(...(parsed.termTreatments ?? []));
    }
  }

  const reportsDir = resolve(HERE, "reports");
  if (existsSync(reportsDir)) {
    for (const dir of readdirSync(reportsDir)) {
      const path = resolve(reportsDir, dir, "report.json");
      if (!existsSync(path)) continue;
      const text = readFileSync(path, "utf8");
      // 리포트 구조가 실행마다 조금씩 달라 통째로 훑는다 — 집계 스크립트라 이 정도면 된다.
      // ponytail: 정규식 스캔, 리포트 스키마가 고정되면 파싱으로 바꾼다.
      for (const match of text.matchAll(
        /"term"\s*:\s*"([^"]+)"[^}]*?"easyText"\s*:\s*"([^"]*)"/g,
      )) {
        found.push({ term: match[1], easyText: match[2], treatment: "explained" });
      }
    }
  }

  return found;
}

function main() {
  const onlyMissing = process.argv.includes("--missing");
  const counts = new Map<string, { count: number; sample: string }>();

  for (const treatment of collectTreatments()) {
    const term = treatment.term.trim();
    if (!term) continue;
    const entry = counts.get(term) ?? { count: 0, sample: treatment.easyText };
    entry.count += 1;
    counts.set(term, entry);
  }

  const rows = [...counts.entries()]
    .map(([term, { count, sample }]) => ({
      term,
      count,
      sample,
      inDictionary: findChatbotKnowledge(`${term}가 뭐야?`) !== undefined,
    }))
    .filter((row) => (onlyMissing ? !row.inDictionary : true))
    .sort((left, right) => right.count - left.count || left.term.localeCompare(right.term));

  const missing = rows.filter((row) => !row.inDictionary);
  console.log(
    `용어 ${counts.size}종 · 사전 보유 ${counts.size - missing.length} · 미보유 ${missing.length}\n`,
  );
  console.log("빈도  사전  용어");
  for (const row of rows) {
    console.log(
      `${String(row.count).padStart(4)}  ${row.inDictionary ? " ✓ " : " · "}  ${row.term}`,
    );
  }

  const repeated = missing.filter((row) => row.count >= 2);
  console.log(
    `\n2회 이상 반복되는데 사전에 없는 말 ${repeated.length}종 — 사전 후보 큐다.`,
  );
  console.log(`  ${repeated.map((row) => `${row.term}(${row.count})`).join(" · ") || "없음"}`);
  console.log(
    "\n1회짜리 꼬리는 대개 기사 고유명사·산업 낱말이다(세포라·운반선·싱크대). 사전 재료가 아니다.",
  );
}

main();
