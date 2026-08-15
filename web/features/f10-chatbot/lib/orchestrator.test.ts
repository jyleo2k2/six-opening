import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import { STOCKS } from "../../../shared/data/stocks";
import { gateChatOutput, SAFE_REFUSAL } from "../../../shared/llm/filter";
import { isExplainAction, isSectorExploreAction, isStockExploreAction } from "./contracts";
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
  assert.equal(faq.response.text.startsWith("궁금한 걸 잘 짚었어요 —"), true);
  if (!isExplainAction(faq.action)) throw new Error("explain action missing");

  const outOfScope = await createChatOutcome(
    { message: "라면 어떻게 끓임", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(outOfScope.route, "outOfScope");
  assert.equal(outOfScope.source, "fixed");
  assert.equal(modelCalls, 0, "범위 밖 생활 질문은 모델을 호출하면 안 돼");

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
  assert.equal(continued.response.text.includes("PER이 비교하는 것은 딱 두 가지"), true);
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
  assert.equal(forgedTransition.response.text.includes("이어 갈 수 없어요"), true);
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
  assert.equal(typedYes.response.text.includes("맞아요, 그 단서를 잘 연결했어요."), true);
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
  assert.equal(typedNo.response.text.startsWith("그럼 예를 들어볼게요."), true);

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

  const ruleExamples = [
    "한 종목 최대 얼마까지 살 수 있어?",
    "모의투자 수수료도 주문 금액에서 빠져?",
    "가족 리그 꼭 참여해야 돼?",
    "시즌 끝나면 내 기록도 없어져?",
    "마지막 주에도 주문할 수 있어?",
    "가족 순위에 거래 횟수도 들어가?",
    "내가 산 종목이 친구한테 공개돼?",
    "같은 가족 팀이면 투자금이 합쳐져?",
    "주문은 어느 가격으로 체결돼?",
    "친구 추천을 이유로 적으면 규칙 위반이야?",
  ] as const;
  for (const message of ruleExamples) {
    const ruleOutcome = await createChatOutcome(
      { message, context },
      session,
      { generateAnswer: noModel },
    );
    assert.equal(ruleOutcome.route, "faq", `규칙 경로를 놓쳤어: ${message}`);
    assert.equal(ruleOutcome.intent, "service_help", `규칙 응답 목적이 달라: ${message}`);
    assert.equal(ruleOutcome.source, "fixed");
    assert.equal(ruleOutcome.gate, "passed");
    assert.equal(ruleOutcome.response.suggestedQuestions?.length, 2);
    assert.equal(isExplainAction(ruleOutcome.action), false);
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
  assert.equal(isExplainAction(ownRecords.action), false);
  assert.equal(ownRecords.action?.uiAction?.target, "archive");

  // ── 2단: 지시어 후속 질문 되살리기 (SPEC §3.5) ───────────────────────────
  // "수익률이 뭐야?" 뒤의 "그럼 이게 높으면 좋은거야?" 는 그 문장만으로는 어떤
  // 허용 목적도 판정되지 않아 범위 밖으로 끝난다. 다시 써서 같은 라우터에 넣는다.
  let rewriteCalls = 0;
  const rewriteTo = (result: string | null) => async () => {
    rewriteCalls += 1;
    return result;
  };

  const followUp = await createChatOutcome(
    {
      message: "그럼 낮으면 좋은거야?",
      context,
      lastAnswer: "PER은 회사가 번 이익과 주가를 비교해 보는 숫자예요.",
      lastTopicId: "term:per",
    },
    session,
    { generateAnswer: noModel, rewriteQuestion: rewriteTo("PER이 낮으면 좋은 건가요?") },
  );
  assert.equal(rewriteCalls, 1);
  assert.equal(followUp.rewritten, true);
  assert.equal(followUp.source, "fixed");
  assert.equal(modelCalls, 0, "2단에서 풀리면 답변 모델을 부르지 않는다");
  assert.equal(followUp.response.text.includes("PER이 낮다는 사실만으로"), true);

  // 재작성이 직전과 같은 용어 정의로 흡수되면 아이가 물은 각도를 놓친다 → 3단.
  let generated = "";
  const followUpToModel = await createChatOutcome(
    {
      message: "그거는 언제 써?",
      context,
      lastAnswer: "시장가는 지금 시장에 나와 있는 값으로 바로 주문하는 방법이에요.",
      lastTopicId: "term:market-order",
    },
    session,
    {
      rewriteQuestion: rewriteTo("시장가는 언제 쓰나요?"),
      generateAnswer: async (message: string) => {
        generated = message;
        return "시장가는 지금 바로 사고 싶을 때 골라요.";
      },
      judgeOutput: async () => ({ violation: false, rule: 0 }),
    },
  );
  assert.equal(followUpToModel.source, "model");
  assert.equal(generated, "시장가는 언제 쓰나요?", "모델은 지시어가 풀린 질문을 받는다");

  // 1단이 이미 잡은 입력은 재작성을 타지 않는다 — 차단 우회로가 생기면 안 된다.
  rewriteCalls = 0;
  const blockedFollowUp = await createChatOutcome(
    {
      message: "그거 사도 돼?",
      context,
      lastAnswer: "삼성전자는 반도체와 가전을 만드는 회사예요.",
    },
    session,
    { generateAnswer: noModel, rewriteQuestion: rewriteTo("삼성전자를 사도 되나요?") },
  );
  assert.equal(rewriteCalls, 0, "추천 차단은 1단에서 끝난다");
  assert.equal(blockedFollowUp.route, "refusal");

  // 재작성 실패는 1단 결과를 그대로 쓴다. 답변 경로를 넓히지 않는다.
  const rewriteFailed = await createChatOutcome(
    { message: "그럼 이게 높으면 좋은거야?", context, lastAnswer: "수익률은 비율로 보는 값이에요." },
    session,
    {
      generateAnswer: noModel,
      rewriteQuestion: async () => {
        throw new Error("rewrite down");
      },
    },
  );
  assert.equal(rewriteFailed.route, "outOfScope");
  assert.equal(rewriteFailed.rewritten, undefined);
  assert.equal(modelCalls, 0);

  // 직전 답변이 없으면 재작성 자체를 시도하지 않는다.
  rewriteCalls = 0;
  await createChatOutcome({ message: "그럼 이게 높으면 좋은거야?", context }, session, {
    generateAnswer: noModel,
    rewriteQuestion: rewriteTo("수익률이 높으면 좋은 건가요?"),
  });
  assert.equal(rewriteCalls, 0);

  // 성향·시즌 기록은 화면으로 보내는 안내다. 이해 확인 전이를 붙이지 않고
  // 이동 버튼과 후속 질문만 준다.
  const ownProfile = await createChatOutcome(
    { message: "현재 내 성향 뭐야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(ownProfile.source, "tool");
  assert.equal(isExplainAction(ownProfile.action), false);
  assert.equal(ownProfile.action?.uiAction?.target, "archive");
  assert.equal(ownProfile.action?.uiAction?.archiveTab, "report");
  assert.equal(ownProfile.action?.suggestedQuestions?.length, 2);
  assert.equal(ownProfile.response.text.startsWith("내 성향 결과는"), true);

  const ownArchive = await createChatOutcome(
    { message: "내 지난 시즌 기록 보여줘", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(isExplainAction(ownArchive.action), false);
  assert.equal(ownArchive.action?.uiAction?.archiveTab, "return");

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
  assert.equal(stockFacts.response.text.startsWith("궁금한 회사를 잘 짚었어요. —"), true);

  const sector = await createChatOutcome(
    { message: "반도체 섹터는 뭐 하는 곳이야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(sector.response.text.includes("전자기기"), true);
  assert.equal(isSectorExploreAction(sector.action), true);
  if (!isSectorExploreAction(sector.action)) throw new Error("sector explore action missing");
  assert.equal(sector.action.turn.sectorId, "semiconductor");

  const sectorYes = await createChatOutcome(
    {
      message: "응",
      context,
      sectorExplore: { sectorId: sector.action.turn.sectorId, choiceId: "yes" },
    },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(sectorYes.response.text.includes("삼성전자"), true);
  assert.equal(sectorYes.action?.uiAction?.sectorId, "semiconductor");

  const mentionedKrafton = await createChatOutcome(
    { message: "크래프톤 뭐 하는 회사야?", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(mentionedKrafton.action?.uiAction?.stockId, "KRX:259960");

  const unresolvedCompany = await createChatOutcome(
    { message: "아무개회사 뭐하는데", context },
    session,
    { generateAnswer: noModel },
  );
  assert.equal(unresolvedCompany.source, "fixed");
  assert.equal(unresolvedCompany.response.text.includes("회사 이름을 찾지 못했어요"), true);
  assert.equal(unresolvedCompany.action?.uiAction?.target, "stock");
  assert.equal(isExplainAction(unresolvedCompany.action), false);
  assert.equal(modelCalls, 0);

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
      assert.equal(outcome.action?.uiAction?.stockId, stock.id, `${stock.name} 관련 화면 ID가 달라`);
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

  const simplerModelCallsBefore = modelCalls;
  const simpler = await createChatOutcome(
    {
      message: "더 쉽게 볼래",
      context,
      explain: {
        scriptId: "flow:guided",
        stage: "brief",
        choiceId: "simpler",
        previousAnswer: "주식은 회사의 작은 조각이라고 생각하면 돼요.",
      },
    },
    session,
    {
      generateAnswer: async (message) => {
        modelCalls += 1;
        assert.equal(message.includes("초등학교 4학년"), true);
        assert.equal(message.includes("주식은 회사의 작은 조각"), true);
        return "주식은 회사를 작게 나눈 조각이에요. 그 조각을 가지면 회사의 일부를 가진 거예요.";
      },
      judgeOutput: async () => ({ violation: false, rule: 0 }),
    },
  );
  assert.equal(simpler.response.text.includes("회사를 작게 나눈 조각"), true);
  assert.equal(simpler.source, "model");
  assert.equal(modelCalls, simplerModelCallsBefore + 1);
  assert.equal(isExplainAction(simpler.action), true);
  if (isExplainAction(simpler.action)) {
    assert.equal(simpler.action.turn.stage, "detail");
  }

  const simplerBlocked = await createChatOutcome(
    {
      message: "더 쉽게 볼래",
      context,
      explain: {
        scriptId: "flow:guided",
        stage: "brief",
        choiceId: "simpler",
        previousAnswer: "회사가 하는 일을 살펴보는 방법이에요.",
      },
    },
    session,
    { generateAnswer: async () => "지금 이 종목을 사는 게 좋아요." },
  );
  assert.equal(simplerBlocked.response.text.includes("헷갈린 단어나 문장"), true);
  assert.equal(isExplainAction(simplerBlocked.action), true);

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
      judgeOutput: async () => ({ violation: false, rule: 0 }),
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

  // "직접 물어볼게요" 선택과 새 질문을 함께 보내면 선택 문구가 아니라 새 질문을 처리한다.
  const askWithQuestion = await createChatOutcome(
    {
      message: "물타기가 뭐야?",
      context,
      explain: { scriptId: "flow:guided", stage: "detail", choiceId: "ask" },
    },
    session,
    {
      generateAnswer: async () => "물타기는 같은 주식을 더 사서 평균 매수가를 바꾸는 행동이에요.",
      judgeOutput: async () => ({ violation: false, rule: 0 }),
    },
  );
  assert.equal(askWithQuestion.source, "model");
  assert.equal(askWithQuestion.response.text.includes("평균 매수가"), true);
  assert.equal(askWithQuestion.response.text.includes("헷갈린 말을 그대로"), false);

  const privacyModelCallsBefore = modelCalls;
  for (const [message, expected] of [
    ["너랑 나눈 얘기 엄마도 봐?", "우리가 나눈 얘기는 엄마한테 안 보여요."],
    ["내가 뭐 샀는지 엄마도 봐?", "거래 기록은 가족끼리 볼 수 있어요."],
    ["엄마한테 말 안 하면 안 돼?", "우리가 나눈 얘기는 엄마한테 안 보여요."],
  ] as const) {
    const privacy = await createChatOutcome(
      { message, context },
      session,
      { generateAnswer: noModel },
    );
    assert.equal(privacy.response.text, expected);
    assert.equal(isExplainAction(privacy.action), false);
  }
  assert.equal(modelCalls, privacyModelCallsBefore);

  // 사전의 모든 승인 용어는 전용 DAPIE, 서비스 FAQ는 직답을 제공한다.
  for (const entry of CHATBOT_KNOWLEDGE) {
    if (entry.explainScript) {
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
    if (entry.explainScript) {
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

  let judgeCalls = 0;
  const passJudge = async () => {
    judgeCalls += 1;
    return { violation: false, rule: 0 };
  };

  const model = await createChatOutcome(
    {
      message: "주가와 회사 이익은 어떻게 달라?",
      context: { screen: "home" },
    },
    session,
    {
      generateAnswer: async () => "주가는 시장에서 거래된 가격이야. 회사 이익은 회사가 번 돈을 계산한 결과야.",
      judgeOutput: passJudge,
    },
  );
  assert.equal(model.gate, "passed");
  assert.equal(model.source, "model");
  assert.equal(isExplainAction(model.action), true);
  assert.equal(judgeCalls, 1, "모델 생성 답변은 T5b 판정을 거쳐야 해");

  // 고정 응답은 승인된 정적 텍스트라 T5b 를 호출하지 않는다 (SPEC §6.0.2).
  judgeCalls = 0;
  await createChatOutcome({ message: "PER이 뭐야?", context }, session, {
    generateAnswer: noModel,
    judgeOutput: passJudge,
  });
  assert.equal(judgeCalls, 0, "고정 응답에 T5b 를 호출하면 안 돼");

  // 룰을 통과한 재표현 추천은 T5b 가 잡는다.
  const judgeBlocked = await createChatOutcome(
    { message: "주가와 회사 이익은 어떻게 달라?", context: { screen: "home" } },
    session,
    {
      generateAnswer: async () => "장기적으로 보면 유망한 회사예요.",
      judgeOutput: async () => ({ violation: true, rule: 5 }),
    },
  );
  assert.equal(judgeBlocked.gate, "replaced");
  assert.equal(judgeBlocked.gateReason, "judge_violation");
  assert.equal(judgeBlocked.response.text, SAFE_REFUSAL);
  assert.equal(judgeBlocked.response.text.includes("유망"), false);

  // 판정 실패는 닫힌 실패다. 검사하지 못한 생성문을 내보내지 않는다.
  const judgeDown = await createChatOutcome(
    { message: "주가와 회사 이익은 어떻게 달라?", context: { screen: "home" } },
    session,
    {
      generateAnswer: async () => "회사는 반도체를 만들어요.",
      judgeOutput: async () => {
        throw new Error("judge offline");
      },
    },
  );
  assert.equal(judgeDown.gate, "replaced");
  assert.equal(judgeDown.gateReason, "judge_unavailable");
  assert.equal(judgeDown.response.text, CHAT_FALLBACK);

  const judgeTimedOut = await createChatOutcome(
    { message: "주가와 회사 이익은 어떻게 달라?", context: { screen: "home" } },
    session,
    {
      generateAnswer: async () => "회사는 반도체를 만들어요.",
      judgeTimeoutMs: 5,
      judgeOutput: () => new Promise(() => undefined),
    },
  );
  assert.equal(judgeTimedOut.gateReason, "judge_unavailable");
  assert.equal(judgeTimedOut.response.text, CHAT_FALLBACK);

  // 사용자가 질문에 적은 숫자는 되짚어 말할 수 있다 (SPEC §6.1.5).
  const quotedNumber = await createChatOutcome(
    { message: "3% 오르면 20만원은 얼마 늘어?", context: { screen: "home" } },
    session,
    {
      generateAnswer: async () => "3% 오르면 처음 넣은 금액의 3% 만큼 늘어난 것으로 보여요.",
      judgeOutput: passJudge,
    },
  );
  assert.equal(quotedNumber.gate, "passed");

  const blocked = await createChatOutcome(
    { message: "주가와 회사 이익을 조금 더 설명해 줘", context },
    session,
    { generateAnswer: async () => "회사를 먼저 살펴봐. 지금 이 종목을 사는 게 좋아." },
  );
  assert.equal(blocked.gate, "replaced");
  assert.equal(blocked.gateReason, "prohibited");
  assert.equal(blocked.response.text, SAFE_REFUSAL);
  assert.equal(blocked.response.text.includes("회사를 먼저"), false);

  const unverifiedNumber = await createChatOutcome(
    { message: "주가와 회사 이익을 숫자로 알려줘", context },
    session,
    { generateAnswer: async () => "수익률은 12%야." },
  );
  assert.equal(unverifiedNumber.response.text, CHAT_FALLBACK);

  const timedOut = await createChatOutcome(
    { message: "주가와 회사 이익을 길게 설명해 줘", context },
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
