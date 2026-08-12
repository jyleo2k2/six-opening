import assert from "node:assert/strict";
import { SAFE_REFUSAL } from "../../../shared/llm/filter";
import { isExplainAction } from "./contracts";
import { CHAT_FALLBACK, createChatOutcome } from "./orchestrator";
import type { ChatSession } from "./session";

const session: ChatSession = {
  userId: "session-child",
  familyId: "demo-family",
  role: "child",
  source: "server_demo",
};
const context = {
  screen: "stock" as const,
  stockId: "KRX:005930" as const,
  stockName: "삼성전자",
};

async function main() {
  let modelCalls = 0;
  const noModel = async () => {
    modelCalls += 1;
    return "호출되면 안 돼.";
  };

  const faq = await createChatOutcome(
    { message: "PER이 뭐야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(faq.route, "faq");
  assert.equal(modelCalls, 0);
  assert.equal(isExplainAction(faq.action), true);
  if (!isExplainAction(faq.action)) throw new Error("explain action missing");

  const continued = await createChatOutcome(
    {
      message: "회사의 직원 수와 주가",
      context,
      explain: {
        scriptId: faq.action.turn.scriptId,
        stage: "brief",
        choiceId: "employee-count",
      },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(continued.response.text.includes("같은 업종"), true);
  assert.equal(isExplainAction(continued.action), true);
  assert.equal(modelCalls, 0);

  const forgedTransition = await createChatOutcome(
    {
      message: "응",
      context,
      explain: { scriptId: "term:per", stage: "brief", choiceId: "forged" },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(forgedTransition.response.text.includes("이어 갈 수 없어"), true);
  assert.equal(forgedTransition.action, undefined);
  assert.equal(modelCalls, 0);

  // 버튼 대신 "ㅇㅇ"라고 타이핑해도 알아듣는다.
  const typedYes = await createChatOutcome(
    { message: "ㅇㅇ", context, explain: { scriptId: "term:per", stage: "detail" } },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(typedYes.response.text, "좋아, 이제 알겠네!");
  assert.equal(modelCalls, 0);

  // "몰라"는 예시 단계로 내려간다.
  const typedNo = await createChatOutcome(
    { message: "몰라", context, explain: { scriptId: "term:per", stage: "detail" } },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(typedNo.response.text.startsWith("그럼 예를 들어볼게."), true);

  // 알아듣지 못하면 추측하지 않고 선택지를 다시 보여준다.
  const unclear = await createChatOutcome(
    { message: "냠냠", context, explain: { scriptId: "term:per", stage: "detail" } },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(unclear.action), true);
  assert.equal(modelCalls, 0);

  const refusal = await createChatOutcome(
    { message: "뭐 사면 돼?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(refusal.route, "refusal");
  assert.equal(modelCalls, 0);

  const model = await createChatOutcome(
    {
      message: "주가와 회사 이익은 어떻게 달라?",
      context: { screen: "home" },
    },
    session,
    { generateAnswer: async () => "주가는 시장에서 거래된 가격이야. 회사 이익은 회사가 번 돈을 계산한 결과야." },
  );
  assert.equal(model.gate, "passed");
  assert.equal(model.source, "model");

  const blocked = await createChatOutcome(
    { message: "조금 더 설명해 줘", context },
    session,
    { generateAnswer: async () => "회사를 먼저 살펴봐. 지금 이 종목을 사는 게 좋아." },
  );
  assert.equal(blocked.gate, "replaced");
  assert.equal(blocked.gateReason, "prohibited");
  assert.equal(blocked.response.text, SAFE_REFUSAL);
  assert.equal(blocked.response.text.includes("회사를 먼저"), false);

  const unverifiedNumber = await createChatOutcome(
    { message: "숫자로 알려줘", context },
    session,
    { generateAnswer: async () => "수익률은 12%야." },
  );
  assert.equal(unverifiedNumber.response.text, CHAT_FALLBACK);

  const timedOut = await createChatOutcome(
    { message: "길게 알려줘", context },
    session,
    {
      timeoutMs: 5,
      generateAnswer: async () => new Promise<string>(() => undefined),
    },
  );
  assert.equal(timedOut.failure, "timeout");
  assert.equal(timedOut.response.text, CHAT_FALLBACK);

  console.log("chat orchestrator tests passed");
}

void main();
