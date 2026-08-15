import assert from "node:assert/strict";
import { createChatOutcome } from "./orchestrator";
import { PROACTIVE_FOLLOWUP_QUESTION, PROACTIVE_SCRIPTS } from "./routing";
import type { ChatSession } from "./session";

/**
 * 선제 말풍선 수락 뒤 자동으로 던지는 질문은 **아이가 고른 문장이 아니다**(SPEC §7).
 *
 * 이 질문이 거절·범위 밖으로 떨어지면 도우려고 먼저 말을 건 자리에서 아이가 거절당한다.
 *   "살지 말지 고민돼요?" → "응!" → "언제 사고팔지는 대신 정해 줄 수 없어요"
 * 라우터의 게이트는 계속 조정되므로(REGRESSION.md 원인 1·3) 문구를 그대로 둬도 어느 날
 * 이쪽으로 넘어갈 수 있다. 그 방향을 여기서 막는다.
 */
const session: ChatSession = {
  userId: "session-child",
  familyId: "demo-family",
  role: "child",
  source: "server_demo",
};

/** 자동 질문이므로 모델을 타면 안 된다 — 고정 답변만 허용한다. */
const noModel = {
  generateAnswer: async () => {
    throw new Error("선제 후속 질문이 모델 경로로 빠졌다");
  },
  judgeOutput: async () => ({ violation: false, rule: 0 }),
  rewriteQuestion: async () => null,
  classifyTerm: async () => "none" as const,
  checkRelevance: async () => "on" as const,
};

const BLOCKED_ROUTES = ["refusal", "safety", "outOfScope", "fallback"];

async function main() {
  const entries = Object.entries(PROACTIVE_FOLLOWUP_QUESTION);
  assert.ok(entries.length > 0, "후속 질문이 하나도 없다");

  for (const [signal, question] of entries) {
    assert.ok(
      signal in PROACTIVE_SCRIPTS,
      `${signal} 은 선제 신호가 아니다 — 고정 발화 없이 후속만 있을 수 없다`,
    );

    const outcome = await createChatOutcome(
      { message: question as string, context: { screen: "order" } },
      session,
      noModel,
    );

    assert.ok(
      !BLOCKED_ROUTES.includes(outcome.route),
      `${signal} 후속 "${question}" 이 route=${outcome.route} 로 떨어졌다. ` +
        `말풍선을 수락한 아이가 곧바로 거절·범위 밖 응답을 받는다`,
    );
    assert.equal(
      outcome.source,
      "fixed",
      `${signal} 후속 "${question}" 이 고정 답변이 아니다 (source=${outcome.source})`,
    );
    assert.ok(
      outcome.response.text.length > 0,
      `${signal} 후속 "${question}" 의 답변이 비어 있다`,
    );
  }

  console.log(`proactive-followup: ${entries.length}건 통과`);
}

void main();
