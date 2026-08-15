import assert from "node:assert/strict";
import type { ProactiveSignal } from "../../../shared/types/chatbot";
import { createChatOutcome } from "./orchestrator";
import { PROACTIVE_SCRIPTS, PROACTIVE_SUGGESTED_QUESTIONS } from "./routing";
import type { ChatSession } from "./session";

/**
 * 선제 말풍선을 수락하면 붙는 추천 질문 칩은 **아이가 타이핑한 문장이 아니라 우리가 내민
 * 문장이다**(SPEC §7).
 *
 * 내민 칩이 거절·범위 밖으로 떨어지면 도우려고 먼저 말을 건 자리에서 아이가 거절당한다.
 *   "살지 말지 고민돼요?" → "네" → [칩] → "언제 사고팔지는 대신 정해 줄 수 없어요"
 * 라우터 게이트는 계속 조정되므로(REGRESSION.md 원인 1·3) 칩 문구를 그대로 둬도 어느 날
 * 이쪽으로 넘어갈 수 있다. 그 방향을 여기서 막는다.
 */
const session: ChatSession = {
  userId: "session-child",
  familyId: "demo-family",
  role: "child",
  source: "server_demo",
};

/** 내미는 칩이므로 모델을 타면 안 된다 — 승인된 고정 답변과 종목 사실 조회만 허용한다. */
const noModel = {
  generateAnswer: async () => {
    throw new Error("선제 추천 질문이 모델 경로로 빠졌다");
  },
  judgeOutput: async () => ({ violation: false, rule: 0 }),
  rewriteQuestion: async () => null,
  classifyTerm: async () => "none" as const,
  checkRelevance: async () => "on" as const,
};

const BLOCKED_ROUTES = ["refusal", "safety", "outOfScope", "fallback"];
const ALLOWED_SOURCES = ["fixed", "tool"];

const STOCK = { stockId: "KRX:005930" as const, stockName: "삼성전자" };

/**
 * 신호가 실제로 뜨는 화면. 칩이 그 화면 맥락에서 답에 닿아야 한다.
 * `dwell` 은 주문·상세 양쪽에서 뜨므로 둘 다 통과해야 한다.
 */
const SIGNAL_CONTEXTS: Record<ProactiveSignal, Record<string, unknown>[]> = {
  buyHesitation: [{ screen: "order" }],
  orderMethodConfusion: [{ screen: "order" }],
  dwell: [{ screen: "order" }, { screen: "stock", ...STOCK }],
  lossRevisit: [{ screen: "stock", ...STOCK }],
};

async function main() {
  let checked = 0;

  for (const signal of Object.keys(PROACTIVE_SCRIPTS) as ProactiveSignal[]) {
    const questions = PROACTIVE_SUGGESTED_QUESTIONS[signal];
    assert.ok(
      questions?.length > 0,
      `${signal} 에 추천 질문이 없다 — 수락하면 빈 대화창을 본다`,
    );

    for (const context of SIGNAL_CONTEXTS[signal]) {
      for (const question of questions) {
        const outcome = await createChatOutcome(
          { message: question, context: context as never },
          session,
          noModel,
        );
        const where = `${signal} / ${String(context.screen)} / "${question}"`;

        assert.ok(
          !BLOCKED_ROUTES.includes(outcome.route),
          `${where} 이 route=${outcome.route} 로 떨어졌다. ` +
            `말풍선을 수락한 아이가 내민 칩을 눌렀다가 거절·범위 밖 응답을 받는다`,
        );
        assert.ok(
          ALLOWED_SOURCES.includes(outcome.source),
          `${where} 이 승인 답변이 아니다 (source=${outcome.source})`,
        );
        assert.ok(outcome.response.text.length > 0, `${where} 의 답변이 비어 있다`);
        checked += 1;
      }
    }
  }

  console.log(`proactive-followup: 추천 질문 ${checked}건 통과`);
}

void main();
