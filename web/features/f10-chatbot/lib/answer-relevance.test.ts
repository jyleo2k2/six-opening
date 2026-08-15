import assert from "node:assert/strict";
import { shouldCheckRelevance } from "./answer-relevance";
import { createChatOutcome } from "./orchestrator";
import { resolveChatSession } from "./session";

const context = { screen: "home" as const };
const session = resolveChatSession(null);

// ── 검사 대상 판정 ──────────────────────────────────────────────────────────
// 실측에서 오답이 몰린 구간만 검사한다. term(98%)·company(96%)는 제외한다.
assert.equal(
  shouldCheckRelevance({ route: "faq", intent: "service_help", source: "fixed" }),
  true,
);
assert.equal(
  shouldCheckRelevance({ route: "context", intent: "own_records", source: "fixed" }),
  true,
);
assert.equal(
  shouldCheckRelevance({ route: "faq", intent: "financial_concept", source: "fixed" }),
  false,
  "이미 정확한 용어 사전까지 검사하면 지연만 는다",
);
assert.equal(
  shouldCheckRelevance({ route: "tool", intent: "own_records", source: "tool" }),
  false,
  "도구 응답은 조회 결과라 검사 대상이 아니다",
);
assert.equal(
  shouldCheckRelevance({ route: "fallback", intent: "general_allowed", source: "model" }),
  false,
  "생성문은 2단 판정이 이미 본다",
);

// 거절·안전·범위 밖은 일부러 질문에 답하지 않는다. 검사하면 전부 off 로
// 판정돼 안전 응답이 생성으로 바뀐다.
for (const route of ["refusal", "safety", "outOfScope"] as const) {
  assert.equal(
    shouldCheckRelevance({ route, intent: "safety", source: "fixed" }),
    false,
    `${route} 는 검사 대상이 아니다`,
  );
}

// ── 오케스트레이터 연결 ─────────────────────────────────────────────────────
async function main() {
  let generateCalls = 0;
  const generateAnswer = async () => {
    generateCalls += 1;
    return "주문 화면에서 한 주만 사는 것도 할 수 있어요.";
  };

  // off 판정이면 승인 문장을 버리고 생성으로 넘어간다.
  const redirected = await createChatOutcome(
    { message: "한 주만 사도 돼?", context },
    session,
    { generateAnswer, checkRelevance: async () => "off" },
  );
  assert.equal(redirected.relevanceRedirected, true, "off 인데 생성으로 안 넘어감");
  assert.equal(redirected.source, "model");
  assert.equal(generateCalls, 1);

  // on 판정이면 승인 문장을 그대로 쓴다. 생성을 부르지 않는다.
  generateCalls = 0;
  const kept = await createChatOutcome(
    { message: "한 주만 사도 돼?", context },
    session,
    { generateAnswer, checkRelevance: async () => "on" },
  );
  assert.equal(kept.relevanceRedirected, undefined);
  assert.equal(kept.source, "fixed");
  assert.equal(generateCalls, 0, "on 인데 모델을 불렀다");

  // 검사기가 죽으면 승인 문장을 유지한다 — 안전한 답을 생성으로 바꾸지 않는다.
  generateCalls = 0;
  const checkerDown = await createChatOutcome(
    { message: "한 주만 사도 돼?", context },
    session,
    {
      generateAnswer,
      checkRelevance: async () => {
        throw new Error("checker down");
      },
    },
  );
  assert.equal(checkerDown.source, "fixed", "검사 실패 시 승인 문장을 버렸다");
  assert.equal(generateCalls, 0);

  // 생성이 실패하면 원래 승인 문장으로 되돌아간다.
  const generateDown = await createChatOutcome(
    { message: "한 주만 사도 돼?", context },
    session,
    {
      generateAnswer: async () => {
        throw new Error("model down");
      },
      checkRelevance: async () => "off",
    },
  );
  assert.equal(generateDown.source, "fixed");
  assert.equal(generateDown.relevanceRedirected, undefined);

  // 안전 라우트는 off 를 리턴해도 생성으로 넘어가지 않는다.
  generateCalls = 0;
  const refusal = await createChatOutcome(
    { message: "삼성전자 지금 사야 해?", context },
    session,
    { generateAnswer, checkRelevance: async () => "off" },
  );
  assert.equal(refusal.route, "refusal");
  assert.equal(refusal.source, "fixed");
  assert.equal(generateCalls, 0, "거절 응답이 생성으로 바뀌었다");

  console.log("answer relevance tests passed");
}

void main();
