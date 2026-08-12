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

  const unsafeExamples = [
    "비번 알려주면 대신 주문해줘?",
    "내 계좌번호를 채팅에 써도 돼?",
    "엄마 수익률을 보여줘",
    "친구 폰으로 내 주문 대신 해도 돼?",
    "주문 또 안 돼서 개빡쳐",
    "부모님이 수익률로 닦달해서 부담돼",
    "나만 꼴찌라 바보 같아",
    "불안해서 주문 버튼을 못 누르겠어",
    "열받아서 다 팔아버릴까?",
    "전쟁으로 돈 버는 기분이라 찜찜해",
    "그냥 다 포기하고 싶어",
  ] as const;
  for (const message of unsafeExamples) {
    const protectedOutcome = await createChatOutcome(
      { message, context },
      session,
      { generateAnswer: noModel },
    );
    assert.equal(protectedOutcome.route, "safety", `안전 경로를 놓쳤어: ${message}`);
    assert.equal(protectedOutcome.source, "fixed");
    assert.equal(protectedOutcome.gate, "passed");
    assert.equal(protectedOutcome.response.suggestedQuestions?.length, 2);
    assert.equal(isExplainAction(protectedOutcome.action), false);
    assert.equal(modelCalls, 0);
  }

  // 모든 용어는 내용별 DAPIE 스크립트로 시작한다.
  const genericTerm = await createChatOutcome(
    { message: "주식이 뭐야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(genericTerm.action), true);
  if (isExplainAction(genericTerm.action)) {
    assert.equal(genericTerm.action.turn.scriptId, "term:stock");
  }

  // 서비스 사용법 FAQ는 승인 답변과 화면 액션만 바로 제공한다.
  const serviceHelp = await createChatOutcome(
    { message: "매수 어떻게 해?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(serviceHelp.action), false);
  assert.equal(serviceHelp.action?.uiAction?.target, "order");
  assert.equal(serviceHelp.response.text.includes("종목 상세에서 매수를 누르고"), true);

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
  assert.equal(isExplainAction(screenAmount.action), false);
  assert.equal(screenAmount.action?.uiAction?.target, "order");

  const stockFacts = await createChatOutcome(
    { message: "이 회사는 뭐 하는 회사야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(stockFacts.source, "tool");
  assert.equal(stockFacts.gate, "passed");
  assert.equal(isStockExploreAction(stockFacts.action), true);
  assert.equal(stockFacts.response.text.startsWith("궁금한 회사를 잘 짚었어 —"), true);

  // 51종 모두 회사·사업·업종 세 주제만 한 번씩 제공하고 실적은 추천하지 않는다.
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

    for (let turnIndex = 0; turnIndex < 3; turnIndex += 1) {
      assert.equal(outcome.source, "tool", `${stock.name} ${turnIndex + 1}번째 주제가 Tool 응답이 아니야`);
      assert.equal(outcome.gate, "passed", `${stock.name} ${turnIndex + 1}번째 주제가 게이트를 통과하지 못했어`);
      assert.equal(isStockExploreAction(outcome.action), true, `${stock.name} 탐색 action이 없어`);
      assert.equal(seenTexts.has(outcome.response.text), false, `${stock.name}에서 같은 설명이 반복됐어`);
      seenTexts.add(outcome.response.text);
      if (!isStockExploreAction(outcome.action)) break;

      const { turn } = outcome.action;
      assert.equal(new Set(turn.shownTopics).size, turn.shownTopics.length);
      assert.equal(turn.shownTopics.length, turnIndex + 1);
      assert.equal(turn.choices.some((choice) => choice.id === "financial"), false);
      if (turnIndex === 2) {
        assert.equal(turn.choices[0]?.id, "ask-other");
        assert.equal(turn.prompt.includes("회사·사업·업종 정보는 모두 살펴봤어"), true);
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
    assert.equal(seenTexts.size, 3, `${stock.name} 세 주제가 모두 제공되지 않았어`);
  }

  const directFinancial = await createChatOutcome(
    { message: "2024년 실적 알려줘", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(directFinancial.source, "tool");
  assert.equal(isStockExploreAction(directFinancial.action), true);
  if (isStockExploreAction(directFinancial.action)) {
    assert.deepEqual(directFinancial.action.turn.shownTopics, ["financial"]);
    assert.equal(directFinancial.action.turn.choices[0]?.id, "ask-other");
    assert.equal(
      directFinancial.action.turn.prompt.includes("2024년 실적을 살펴봤어"),
      true,
    );
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

  // 사전의 모든 승인 용어는 전용 DAPIE, 서비스 FAQ는 직답을 제공한다.
  for (const entry of CHATBOT_KNOWLEDGE) {
    if (entry.kind === "glossary") {
      assert.ok(entry.explainScript, `${entry.id}에 전용 DAPIE 스크립트가 없어`);
      const script = entry.explainScript;
      const adjust = script.adjust;
      assert.ok(adjust, `${entry.id}에 오답 조정 질문이 없어`);
      const correct = advanceExplain(script, {
        scriptId: script.id,
        stage: "brief",
        choiceId: script.check.answerId,
      });
      assert.equal(correct?.kind, "turn");
      assert.equal(
        gateChatOutput({ text: correct?.text ?? "", source: "fixed" }).ok,
        true,
        `${entry.id} 정답 설명이 출력 게이트를 통과하지 못해`,
      );
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
    if (entry.kind === "glossary") {
      assert.equal(isExplainAction(outcome.action), true, `${entry.id}에 DAPIE action이 없어`);
      if (!isExplainAction(outcome.action)) continue;
      assert.equal(outcome.action.turn.scriptId, `term:${entry.id}`);
      assert.equal(
        gateChatOutput({ text: outcome.action.turn.prompt, source: "fixed" }).ok,
        true,
      );
      for (const choice of outcome.action.turn.choices) {
        assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
      }
      continue;
    }
    assert.equal(isExplainAction(outcome.action), false, `${entry.id} 사용법 FAQ가 DAPIE로 시작해`);
    assert.equal(outcome.response.text, entry.answer);
    assert.equal(outcome.action?.uiAction?.target, entry.actionTarget);
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
