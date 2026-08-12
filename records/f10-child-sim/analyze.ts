import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { routeMessage, type ChatContext, type ChatRoute } from "../../web/features/f10-chatbot/lib/routing";
import { CHATBOT_KNOWLEDGE, findChatbotKnowledge } from "../../web/shared/data/chatbot-knowledge";

type Intent = "term" | "howto" | "company" | "mydata" | "rule" | "recommend" | "offtopic" | "unsafe" | "meta";
type Screen = ChatContext["screen"];
type RawQuestion = { q: string; screen: Screen; intent: Intent };
type RawPersona = { id: string; name: string; grade: string; questions: RawQuestion[] };
type RawWorker = { worker: string; personas: RawPersona[] };

declare const __dirname: string;
const HERE = resolve(__dirname);
const OUT = resolve(HERE, "out");

/** 데모 화면이 실제로 챗봇에 넘기는 컨텍스트 (F10ChatbotDemo.tsx 기준) */
function contextFor(screen: Screen): ChatContext {
  return {
    screen,
    stockName: screen === "stock" ? "키움테크" : undefined,
    quantity: screen === "order" ? 10 : undefined,
    unitPrice: screen === "order" ? 12500 : undefined,
  };
}

/** 각 intent가 도달해야 하는 라우트. null이면 어떤 정보성 라우트든 허용 */
const EXPECTED: Record<Intent, ChatRoute | null> = {
  term: null,
  howto: null,
  company: null,
  mydata: null,
  rule: null,
  recommend: "refusal",
  offtopic: "outOfScope",
  unsafe: "safety",
  meta: null,
};

const BLOCKING_ROUTES: ChatRoute[] = ["refusal", "safety", "outOfScope"];
const INFO_INTENTS: Intent[] = ["term", "howto", "company", "mydata", "rule", "meta"];

const rows = readdirSync(OUT)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => {
    const parsed = JSON.parse(readFileSync(resolve(OUT, f), "utf8")) as RawWorker;
    return parsed.personas.flatMap((p) =>
      p.questions.map((item) => {
        const reply = routeMessage(item.q, contextFor(item.screen));
        return {
          persona: p.id,
          name: p.name,
          grade: p.grade,
          ...item,
          route: reply.route,
          entryId: reply.route === "faq" ? findChatbotKnowledge(item.q)?.id : undefined,
        };
      }),
    );
  });

const count = <T extends string>(values: T[]) =>
  values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});

const pct = (n: number) => `${((n / rows.length) * 100).toFixed(1)}%`;

const routeCounts = count(rows.map((r) => r.route));
const intentCounts = count(rows.map((r) => r.intent));

/** 가드레일 누수: 차단돼야 할 질문이 통과 */
const leaks = rows.filter((r) => {
  const expected = EXPECTED[r.intent];
  return expected !== null && r.route !== expected;
});

/** 오탐: 정상 질문인데 차단됨 */
const falseBlocks = rows.filter((r) => INFO_INTENTS.includes(r.intent) && BLOCKING_ROUTES.includes(r.route));

/** 지식 사전 구멍: 정보성 질문인데 fallback */
const knowledgeGaps = rows.filter((r) => INFO_INTENTS.includes(r.intent) && r.route === "fallback");

const entryHits = count(rows.map((r) => r.entryId).filter((v): v is string => Boolean(v)));
const deadEntries = CHATBOT_KNOWLEDGE.filter((e) => !entryHits[e.id]);

const ROUTES: ChatRoute[] = [
  "faq",
  "context",
  "tool",
  "refusal",
  "safety",
  "outOfScope",
  "fallback",
];
const INTENTS = Object.keys(EXPECTED) as Intent[];

const lines: string[] = [];
const w = (s = "") => lines.push(s);

w("# F10 키웅이 — 아이 질문 시뮬레이션 커버리지 리포트");
w();
w(`생성일 2026-08-13 · 페르소나 ${new Set(rows.map((r) => r.persona)).size}종 · 질문 ${rows.length}개`);
w();
w("`web/features/f10-chatbot/lib/routing.ts`의 `routeMessage()`에 전량 통과시킨 결과다. LLM 호출은 없다.");
w();

w("## 1. 라우트 분포");
w();
w("| 라우트 | 건수 | 비율 | 의미 |");
w("|---|---:|---:|---|");
const ROUTE_MEANING: Record<ChatRoute, string> = {
  faq: "사전·FAQ가 즉답",
  context: "화면 맥락으로 즉답",
  tool: "승인 데이터·본인 기록 조회",
  refusal: "추천·예측 고정 거절",
  safety: "위기·개인정보·유해 고정 응답",
  outOfScope: "도메인 밖 고정 응답",
  fallback: "매칭 실패 → Luna 호출 대상",
};
for (const r of ROUTES) w(`| \`${r}\` | ${routeCounts[r] ?? 0} | ${pct(routeCounts[r] ?? 0)} | ${ROUTE_MEANING[r]} |`);
w();

w("## 2. intent × route 교차표");
w();
w(`| intent | 합계 | ${ROUTES.map((r) => `\`${r}\``).join(" | ")} |`);
w(`|---|---:|${ROUTES.map(() => "---:").join("|")}|`);
for (const intent of INTENTS) {
  const subset = rows.filter((r) => r.intent === intent);
  if (!subset.length) continue;
  const c = count(subset.map((r) => r.route));
  w(`| ${intent} | ${subset.length} | ${ROUTES.map((r) => c[r] ?? 0).join(" | ")} |`);
}
w();

w("## 3. 가드레일 누수 — 차단돼야 하는데 통과한 질문");
w();
w(`**${leaks.length}건 / ${rows.length} (${pct(leaks.length)})**`);
w();
if (leaks.length) {
  w("| intent | 기대 | 실제 | 질문 | 페르소나 |");
  w("|---|---|---|---|---|");
  for (const r of leaks) w(`| ${r.intent} | \`${EXPECTED[r.intent]}\` | \`${r.route}\` | ${r.q} | ${r.persona} ${r.name} |`);
} else {
  w("없음.");
}
w();

w("## 4. 오탐 — 정상 질문인데 차단된 것");
w();
w(`**${falseBlocks.length}건 (${pct(falseBlocks.length)})**`);
w();
if (falseBlocks.length) {
  w("| intent | 잘못 걸린 라우트 | 질문 | 페르소나 |");
  w("|---|---|---|---|");
  for (const r of falseBlocks) w(`| ${r.intent} | \`${r.route}\` | ${r.q} | ${r.persona} ${r.name} |`);
} else {
  w("없음.");
}
w();

w("## 5. 지식 사전 구멍 — 정보성 질문인데 fallback");
w();
w(`**${knowledgeGaps.length}건 (${pct(knowledgeGaps.length)})** — 전부 Luna 호출로 넘어간다.`);
w();
w("| intent | 건수 |");
w("|---|---:|");
for (const [k, v] of Object.entries(count(knowledgeGaps.map((r) => r.intent))).sort((a, b) => b[1] - a[1])) {
  w(`| ${k} | ${v} |`);
}
w();
w("### 전체 목록");
w();
for (const intent of INFO_INTENTS) {
  const subset = knowledgeGaps.filter((r) => r.intent === intent);
  if (!subset.length) continue;
  w(`**${intent}** (${subset.length})`);
  w();
  for (const r of subset) w(`- ${r.q}  <sub>${r.persona} ${r.grade}</sub>`);
  w();
}

w("## 6. 지식 엔트리 사용률");
w();
w(`전체 ${CHATBOT_KNOWLEDGE.length}개 중 **${CHATBOT_KNOWLEDGE.length - deadEntries.length}개 히트 / ${deadEntries.length}개 미사용**`);
w();
w("### 히트 상위");
w();
w("| 엔트리 | 종류 | 히트 |");
w("|---|---|---:|");
for (const [id, n] of Object.entries(entryHits).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  w(`| \`${id}\` | ${CHATBOT_KNOWLEDGE.find((e) => e.id === id)?.kind} | ${n} |`);
}
w();
w("### 한 번도 안 걸린 엔트리");
w();
w(deadEntries.length ? deadEntries.map((e) => `\`${e.id}\``).join(" · ") : "없음.");
w();

w("## 7. 학년별 라우트 분포");
w();
w(`| 학년 | 질문 | ${ROUTES.map((r) => `\`${r}\``).join(" | ")} |`);
w(`|---|---:|${ROUTES.map(() => "---:").join("|")}|`);
for (const grade of [...new Set(rows.map((r) => r.grade))].sort()) {
  const subset = rows.filter((r) => r.grade === grade);
  const c = count(subset.map((r) => r.route));
  w(`| ${grade} | ${subset.length} | ${ROUTES.map((r) => c[r] ?? 0).join(" | ")} |`);
}
w();

w("## 8. 페르소나별 전체 질문");
w();
for (const persona of [...new Set(rows.map((r) => r.persona))].sort()) {
  const subset = rows.filter((r) => r.persona === persona);
  const head = subset[0];
  w(`### ${persona} ${head.name} (${head.grade})`);
  w();
  w("| # | 질문 | screen | intent | route |");
  w("|---:|---|---|---|---|");
  subset.forEach((r, i) => w(`| ${i + 1} | ${r.q} | ${r.screen} | ${r.intent} | \`${r.route}\` |`));
  w();
}

const REPORT = resolve(HERE, "..", "..", "docs", "F10_아이질문_시뮬레이션_커버리지리포트.md");

writeFileSync(REPORT, lines.join("\n"), "utf8");
writeFileSync(resolve(HERE, "questions.json"), JSON.stringify(rows, null, 2), "utf8");

console.log(`질문 ${rows.length}개 / 페르소나 ${new Set(rows.map((r) => r.persona)).size}종`);
console.log("\n라우트 분포");
for (const r of ROUTES) console.log(`  ${r.padEnd(11)} ${String(routeCounts[r] ?? 0).padStart(4)}  ${pct(routeCounts[r] ?? 0)}`);
console.log(`\n가드레일 누수   ${leaks.length}건 (${pct(leaks.length)})`);
console.log(`오탐            ${falseBlocks.length}건 (${pct(falseBlocks.length)})`);
console.log(`지식 사전 구멍  ${knowledgeGaps.length}건 (${pct(knowledgeGaps.length)})`);
console.log(`미사용 엔트리   ${deadEntries.length}/${CHATBOT_KNOWLEDGE.length}`);
console.log(`\nintent 분포: ${JSON.stringify(intentCounts)}`);
console.log("\n→ docs/F10_아이질문_시뮬레이션_커버리지리포트.md");
console.log("→ records/f10-child-sim/questions.json");
