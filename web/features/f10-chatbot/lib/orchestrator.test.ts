import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import { STOCKS } from "../../../shared/data/stocks";
import { gateChatOutput, SAFE_REFUSAL } from "../../../shared/llm/filter";
import { isExplainAction, isStockExploreAction } from "./contracts";
import { CHAT_FALLBACK, createChatOutcome } from "./orchestrator";
import { advanceExplain } from "./explain";
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
  assert.equal(faq.response.text.startsWith("궁금한 걸 잘 짚었어 —"), true);
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
  assert.equal(continued.response.text.includes("PER에는 회사가 번 돈"), true);
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

  // 버튼 대신 작은 질문의 선택지 라벨을 타이핑해도 알아듣는다.
  const typedYes = await createChatOutcome(
    {
      message: "들어가지 않아",
      context,
      explain: { scriptId: "term:per", stage: "detail" },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(typedYes.response.text.includes("맞아, 그 단서를 잘 연결했어."), true);
  assert.equal(typedYes.response.text.includes("같은 업종"), true);
  assert.equal(isExplainAction(typedYes.action), true);
  if (isExplainAction(typedYes.action)) {
    assert.equal(typedYes.action.turn.stage, "followup");
  }
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
  assert.equal(isExplainAction(refusal.action), false);
  assert.equal(modelCalls, 0);

  // 전용 진단 스크립트가 없는 용어·FAQ도 공통 DAPIE 유도 턴으로 이어진다.
  const genericTerm = await createChatOutcome(
    { message: "주식이 뭐야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(genericTerm.action), true);
  if (isExplainAction(genericTerm.action)) {
    assert.equal(genericTerm.action.turn.scriptId, "flow:guided");
  }

  const serviceHelp = await createChatOutcome(
    { message: "매수 어떻게 해?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(serviceHelp.action), true);
  if (isExplainAction(serviceHelp.action)) {
    assert.equal(serviceHelp.action.uiAction?.target, "order");
  }

  const ownRecords = await createChatOutcome(
    { message: "내 거래 기록 보여줘", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(ownRecords.source, "tool");
  assert.equal(isExplainAction(ownRecords.action), true);
  if (isExplainAction(ownRecords.action)) {
    assert.equal(ownRecords.action.uiAction?.target, "archive");
  }

  const screenAmount = await createChatOutcome(
    {
      message: "예상 금액이 얼마야?",
      context: { screen: "order", quantity: 10, unitPrice: 12_500 },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(screenAmount.route, "context");
  assert.equal(isExplainAction(screenAmount.action), true);

  const stockFacts = await createChatOutcome(
    { message: "이 회사는 뭐 하는 회사야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(stockFacts.source, "tool");
  assert.equal(stockFacts.gate, "passed");
  assert.equal(isStockExploreAction(stockFacts.action), true);
  assert.equal(stockFacts.response.text.startsWith("궁금한 회사를 잘 짚었어 —"), true);

  // 51종 모두 네 주제를 한 번씩만 제공하고 마지막에는 다른 종목 전환을 제안한다.
  for (const stock of STOCKS) {
    const stockContext = {
      screen: "stock" as const,
      stockId: stock.id,
      stockName: stock.name,
    };
    let outcome = await createChatOutcome(
      { message: "이 회사는 뭐 하는 회사야?", context: stockContext },
      session,
      { generateAnswer: noModel },
    );
    const seenTexts = new Set<string>();

    for (let turnIndex = 0; turnIndex < 4; turnIndex += 1) {
      assert.equal(outcome.source, "tool", `${stock.name} ${turnIndex + 1}번째 주제가 Tool 응답이 아니야`);
      assert.equal(outcome.gate, "passed", `${stock.name} ${turnIndex + 1}번째 주제가 게이트를 통과하지 못했어`);
      assert.equal(isStockExploreAction(outcome.action), true, `${stock.name} 탐색 action이 없어`);
      assert.equal(seenTexts.has(outcome.response.text), false, `${stock.name}에서 같은 설명이 반복됐어`);
      seenTexts.add(outcome.response.text);
      if (!isStockExploreAction(outcome.action)) break;

      const { turn } = outcome.action;
      assert.equal(new Set(turn.shownTopics).size, turn.shownTopics.length);
      assert.equal(turn.shownTopics.length, turnIndex + 1);
      if (turnIndex === 3) {
        assert.equal(turn.choices[0]?.id, "ask-other");
        assert.equal(turn.prompt.includes("모두 살펴봤어"), true);
        break;
      }

      const nextChoice = turn.choices[0];
      outcome = await createChatOutcome(
        {
          message: nextChoice.label,
          context: stockContext,
          stockExplore: {
            stockId: turn.stockId,
            shownTopics: [...turn.shownTopics],
            choiceId: nextChoice.id,
          },
        },
        session,
        { generateAnswer: noModel },
      );
    }
    assert.equal(seenTexts.size, 4, `${stock.name} 네 주제가 모두 제공되지 않았어`);
  }

  const simpler = await createChatOutcome(
    {
      message: "더 쉽게 볼래",
      context,
      explain: {
        scriptId: "flow:guided",
        stage: "brief",
        choiceId: "simpler",
      },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(simpler.response.text.includes("헷갈린 단어"), true);
  assert.equal(isExplainAction(simpler.action), true);

  const interruptedByQuestion = await createChatOutcome(
    {
      message: "주가와 회사 이익은 어떻게 달라?",
      context,
      explain: { scriptId: "flow:guided", stage: "detail" },
    },
    session,
    {
      generateAnswer: async () =>
        "주가는 시장에서 거래된 가격이야. 회사 이익은 회사가 번 돈을 계산한 결과야.",
    },
  );
  assert.equal(interruptedByQuestion.source, "model");
  assert.equal(isExplainAction(interruptedByQuestion.action), true);

  const interruptedByScriptedQuestion = await createChatOutcome(
    {
      message: "PER이 뭐야?",
      context,
      explain: { scriptId: "flow:guided", stage: "detail" },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(interruptedByScriptedQuestion.action), true);
  if (isExplainAction(interruptedByScriptedQuestion.action)) {
    assert.equal(interruptedByScriptedQuestion.action.turn.scriptId, "term:per");
  }

  // 사전·FAQ의 모든 승인 항목은 전용 진단 또는 공통 유도 DAPIE 턴을 제공한다.
  for (const entry of CHATBOT_KNOWLEDGE) {
    if (entry.explainScript && entry.explainScript.check.kind !== "guiding") {
      const script = entry.explainScript;
      const adjust = script.adjust;
      assert.ok(adjust, `${entry.id}에 오답 조정 질문이 없어`);
      const wrongChoice = script.check.choices.find(
        (choice) => choice.id !== script.check.answerId,
      );
      assert.ok(wrongChoice);
      const adjusted = advanceExplain(script, {
        scriptId: script.id,
        stage: "brief",
        choiceId: wrongChoice.id,
      });
      assert.equal(adjusted?.kind, "turn");
      if (adjusted?.kind === "turn") {
        assert.equal(gateChatOutput({ text: adjusted.text, source: "fixed" }).ok, true);
        assert.equal(gateChatOutput({ text: adjusted.turn.prompt, source: "fixed" }).ok, true);
      }
      const smallerWrong = adjust.choices.find(
        (choice) => choice.id !== adjust.answerId,
      );
      assert.ok(smallerWrong);
      const exampleRetry = advanceExplain(script, {
        scriptId: script.id,
        stage: "detail",
        choiceId: smallerWrong.id,
      });
      assert.equal(exampleRetry?.kind, "turn");
      assert.equal(
        gateChatOutput({ text: exampleRetry?.text ?? "", source: "fixed" }).ok,
        true,
      );
    }
    const outcome = await createChatOutcome(
      { message: entry.triggers[0], context },
      session,
      { generateAnswer: noModel },
    );
    assert.equal(isExplainAction(outcome.action), true, `${entry.id}에 DAPIE action이 없어`);
    if (isExplainAction(outcome.action)) {
      assert.equal(
        gateChatOutput({ text: outcome.action.turn.prompt, source: "fixed" }).ok,
        true,
      );
      for (const choice of outcome.action.turn.choices) {
        assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
      }
    }
  }

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
  assert.equal(isExplainAction(model.action), true);

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
  assert.equal(timedOut.response.text.includes(CHAT_FALLBACK), true);
  assert.equal(isExplainAction(timedOut.action), true);

  console.log("chat orchestrator tests passed");
}

void main();
