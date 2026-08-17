import assert from "node:assert/strict";
import {
  CHATBOT_KNOWLEDGE,
  findChatbotKnowledge,
  findChatbotQuestionForm,
} from "./chatbot-knowledge";

assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary").length >= 30);
assert.ok(CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "faq").length >= 15);
assert.equal(new Set(CHATBOT_KNOWLEDGE.map((entry) => entry.id)).size, CHATBOT_KNOWLEDGE.length);
assert.ok(CHATBOT_KNOWLEDGE.every((entry) => entry.answer.split(/[.!?]/).filter(Boolean).length <= 3));
assert.ok(
  CHATBOT_KNOWLEDGE.filter((entry) => entry.kind === "glossary").every(
    (entry) => entry.explainScript?.id === `term:${entry.id}`,
  ),
);
const DAPIE_SCREEN_TERM_IDS = [
  "mock-investing", "total-assets", "available-cash", "holdings", "pending-order", "order-cancel", "sell-proceeds", "goal-price", "holding-period", "buy-day-record", "plan-badge", "line-chart", "candle-chart", "minute-chart", "daily-chart", "weekly-chart", "delayed-price", "child-news", "season", "trade-lock", "ranking", "family-feed", "profile-abilities", "profile-definition", "profile-status", "profile-character", "season-record",
];
for (const id of DAPIE_SCREEN_TERM_IDS) {
  assert.equal(
    CHATBOT_KNOWLEDGE.find((entry) => entry.id === id)?.explainScript?.id,
    `term:${id}`,
  );
}

// ── 설명 문장 예산 (SPEC §3.4.4) ────────────────────────────────────────────
//
// T5 게이트(shared/llm/filter.ts)의 최대 3문장은 **상한**이라 초과 0건인 채로
// 평균이 상한에 붙어 있었다(brief 2.73 · detail 2.98문장). 상한을 내리면 term
// 9종·업종·meta·rule 고정 응답까지 함께 막히므로 게이트는 그대로 두고 승인
// 데이터에 예산을 여기서 건다. 이 검사가 없으면 문구가 조용히 다시 길어진다.
//
// 세는 방식은 게이트와 같다.
function countSentences(text: string) {
  return text
    .split(/[.!?]+|\n+/)
    .map((part) => part.trim())
    .filter((part) => /[\p{L}\p{N}]/u.test(part)).length;
}

const SCRIPTED = CHATBOT_KNOWLEDGE.filter((entry) => entry.explainScript);

for (const entry of SCRIPTED) {
  const script = entry.explainScript!;
  const where = `${entry.id}`;

  // 전 카테고리 상한 — 지금보다 길어지는 것을 막는다.
  assert.ok(countSentences(script.brief) <= 2, `${where}: brief 2문장 초과`);
  assert.ok(countSentences(script.detail) <= 2, `${where}: detail 2문장 초과`);
  assert.ok(countSentences(script.example) <= 2, `${where}: example 2문장 초과`);
  if (script.adjust) {
    assert.ok(
      countSentences(script.adjust.explanation) <= 2,
      `${where}: adjust.explanation 2문장 초과`,
    );
  }

  // detail 은 brief 에 덧붙는 새 내용이어야 한다. 되풀이하면 퀴즈를 맞힌 아이가
  // 방금 읽은 문장을 다시 읽는다 — screenTermScript 의 `detail: brief` 가 그랬다.
  assert.notEqual(
    script.detail.replaceAll(/\s/g, ""),
    script.brief.replaceAll(/\s/g, ""),
    `${where}: detail 이 brief 와 같다`,
  );

  // example 은 조정 설명에서 이미 쓴 비유를 되풀이하지 않는다. example 까지 온
  // 아이는 두 번 틀린 아이인데, 방금 실패한 그림을 그대로 다시 내밀면 새로 쥘
  // 것이 없다. term:stock(피자)·term:index(반 평균)·term:diversification(달걀
  // 바구니)이 그랬다.
  if (script.adjust) {
    assert.notEqual(
      script.example.replaceAll(/\s/g, ""),
      script.adjust.explanation.replaceAll(/\s/g, ""),
      `${where}: example 이 adjust.explanation 과 같다`,
    );
  }
}

// detail·example 은 용어마다 달라야 한다 (SPEC §3.4.4).
//
// 화면 용어 22종이 `screenTermScript` 에서 공용 한 문장을 함께 받던 자리다
// ("화면에 이미 있는 값을 가리키는 말이라…"). `detail` 은 **정답 경로**라 맞힌
// 아이가 거의 모두 지나가는데 용어가 무엇이든 같은 말이 나왔고, 모의투자·시즌·
// 주문 잠금처럼 화면의 값이 아닌 용어에는 사실도 어긋났다. 겹치면 그 용어를
// 설명하지 않고 있다는 뜻이므로 여기서 막는다.
for (const field of ["detail", "example"] as const) {
  const texts = SCRIPTED.map((entry) => entry.explainScript![field]);
  const seen = new Map<string, string>();
  for (const [i, text] of texts.entries()) {
    const key = text.replaceAll(/\s/g, "");
    const owner = seen.get(key);
    assert.equal(
      owner,
      undefined,
      `${field} 이 겹친다: ${owner} 와 ${SCRIPTED[i]!.id}`,
    );
    seen.set(key, SCRIPTED[i]!.id);
  }
}

// 정답 id 는 실제 선택지를 가리켜야 하고 선택지 id 는 서로 달라야 한다.
// 어긋나면 아이가 정답을 골라도 오답 경로로 빠지는데, 화면에서는 그냥 "틀렸다"로
// 보여 조용히 넘어간다.
for (const entry of SCRIPTED) {
  const script = entry.explainScript!;
  for (const [where, choices, answerId, question] of [
    ["check", script.check.choices, script.check.answerId, script.check.question],
    ...(script.adjust
      ? [
          [
            "adjust",
            script.adjust.choices,
            script.adjust.answerId,
            script.adjust.question,
          ] as const,
        ]
      : []),
  ] as const) {
    const ids = choices.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, `${entry.id}.${where}: 선택지 id 가 겹친다`);
    assert.ok(ids.includes(answerId), `${entry.id}.${where}: answerId 가 선택지에 없다`);

    // 명사를 묻는 질문에 예/아니오 선택지가 붙으면 아이는 답할 수가 없다.
    //
    // `term:per` 의 조정이 그랬다 — "그럼 PER 은 주가를 무엇과 견줄까요?" 에 선택지가
    // "들어가요 / 들어가지 않아요" 였다. 질문만 새로 쓰고 선택지와 answerId 를 옛
    // 예/아니오 그대로 둔 흔적이다. 질문과 선택지는 따로 떨어진 자리에 있어 눈으로는
    // 잘 안 보이고, 화면에서는 그냥 이상한 질문으로만 보인다.
    if (/무엇|뭐|어느|누구|누가|어디|언제|얼마|몇/.test(question)) {
      assert.notDeepEqual(
        [...ids].sort(),
        ["no", "yes"],
        `${entry.id}.${where}: 명사를 묻는데 선택지가 예/아니오다`,
      );
    }
  }
}

// 진단 질문은 용어마다 달라야 한다 (SPEC §3.4).
//
// 화면 용어 22종이 `screenTermScript` 하나에서 똑같은 껍데기 질문을 받던 자리다
// ("이 말은 화면의 무엇을 확인하는 데 쓰일까요?"). 용어가 무엇이든 질문이 같아
// "전체 자산이 뭐야?" 에 그 메타 질문으로 되물었다. 질문이 겹치면 그 용어를
// 묻지 않고 있다는 뜻이므로 여기서 막는다.
const questions = SCRIPTED.map((entry) => entry.explainScript!.check.question);
assert.equal(new Set(questions).size, questions.length, "check.question 이 서로 겹친다");

const adjustQuestions = SCRIPTED.filter((e) => e.explainScript!.adjust).map(
  (e) => e.explainScript!.adjust!.question,
);
assert.equal(
  new Set(adjustQuestions).size,
  adjustQuestions.length,
  "adjust.question 이 서로 겹친다",
);

// 조정 설명은 정답 근거를 담아야 한다 (SPEC §3.4). 예전 화면 용어의 조정 설명은
// "이건 맞히는 시험이 아니에요" 라 근거가 하나도 없었다.
for (const entry of SCRIPTED) {
  const adjust = entry.explainScript!.adjust;
  if (!adjust) continue;
  assert.ok(
    !adjust.explanation.includes("맞히는 시험이 아니에요"),
    `${entry.id}: 조정 설명에 정답 근거가 없다`,
  );
}

// 직접 쓴 용어 스크립트는 전부 1문장 예산을 지킨다 (SPEC §3.4.4).
//
// 화면 용어(kind === "faq")만 제외한다. 그 brief 는 screenTermScript 가 `answer`
// 를 그대로 쓴 것이라 FAQ 단답을 겸하는데, 둘째 문장이 "이미 체결된 주문은
// 취소할 수 없어요" 처럼 실제 정보를 나른다. 1문장으로 깎으면 길이 대신 정보를
// 잃는다.
const GLOSSARY_SCRIPTED = SCRIPTED.filter((entry) => entry.kind === "glossary");
assert.ok(GLOSSARY_SCRIPTED.length >= 36);
for (const entry of GLOSSARY_SCRIPTED) {
  const script = entry.explainScript!;
  assert.equal(countSentences(script.brief), 1, `${entry.id}: brief 는 1문장이다`);
  assert.equal(countSentences(script.detail), 1, `${entry.id}: detail 은 1문장이다`);
}
assert.equal(findChatbotKnowledge("PER이 뭐야?")?.id, "per");
assert.equal(findChatbotKnowledge("이 회사 비싼지 어떻게 알아?")?.id, "per");
assert.equal(findChatbotKnowledge("평가 손익이 뭐야?")?.id, "unrealized-profit");
assert.equal(findChatbotKnowledge("차트는 미래를 알려줘?")?.id, "chart");
assert.equal(findChatbotKnowledge("매수 어떻게 해?")?.id, "buy-flow");
assert.equal(findChatbotKnowledge("가족 비교는 어디서 해?")?.actionTarget, "archive");
assert.equal(findChatbotKnowledge("너랑 한 얘기 엄마도 봐?")?.id, "privacy-chat");
assert.equal(findChatbotKnowledge("내가 뭐 샀는지 엄마도 봐?")?.id, "privacy-trade");
assert.equal(findChatbotKnowledge("종목 고를 때 뭘 확인해?")?.id, "stock-pick-criteria");
assert.equal(findChatbotKnowledge("주문 전에 뭘 확인해?")?.id, "order-check");
assert.equal(findChatbotKnowledge("지금 가격이 뭐야?")?.id, "current-price");
assert.equal(findChatbotKnowledge("지금 값어치가 뭐야?")?.id, "evaluation-amount");
assert.equal(findChatbotKnowledge("번 돈이 뭐야?")?.id, "unrealized-profit");
assert.equal(findChatbotKnowledge("기다리는 주문이 뭐야?")?.id, "pending-order");
assert.equal(findChatbotKnowledge("15분 지연 시세가 뭐야?")?.id, "delayed-price");
assert.equal(findChatbotKnowledge("학교 시간엔 매매 쉬기가 뭐야?")?.id, "trade-lock");
assert.equal(findChatbotKnowledge("근거력이 뭐야?")?.id, "profile-abilities");
assert.equal(findChatbotKnowledge("관찰 초기면 무슨 뜻이야?")?.id, "profile-status");
assert.equal(findChatbotKnowledge("전략가는 뭐야?")?.id, "profile-character");
assert.equal(findChatbotKnowledge("목표 가격이 뭐야?")?.id, "goal-price");
assert.equal(findChatbotKnowledge("사던 날의 나가 뭐야?")?.id, "buy-day-record");
assert.equal(findChatbotKnowledge("성향이 뭐야?")?.id, "profile-definition");
assert.equal(findChatbotKnowledge("시즌 기록이 뭐야?")?.id, "season-record");

assert.equal(findChatbotKnowledge("선차트가 뭐야")?.id, "line-chart");
assert.equal(findChatbotKnowledge("캔들차트가 뭐야")?.id, "candle-chart");
assert.equal(findChatbotKnowledge("분봉이 뭐야")?.id, "minute-chart");
assert.equal(findChatbotKnowledge("일봉이 뭐야")?.id, "daily-chart");
assert.equal(findChatbotKnowledge("주봉이 뭐야")?.id, "weekly-chart");
assert.notEqual(
  findChatbotKnowledge("분봉이 뭐야")?.explainScript?.check.question,
  findChatbotKnowledge("주봉이 뭐야")?.explainScript?.check.question,
);

const buyQuestionForms = [
  ["매수가 뭐임", "definition", "buy"],
  ["매수는 어떻게 하나요?", "procedure", "buy-flow"],
] as const;
for (const [question, questionForm, knowledgeId] of buyQuestionForms) {
  assert.equal(findChatbotQuestionForm(question), questionForm, question);
  assert.equal(findChatbotKnowledge(question)?.id, knowledgeId, question);
}
for (const [question, questionForm] of [
  ["매수는 어디서 해?", "location"],
  ["매수는 왜 해?", "reason"],
  ["매수는 언제 해?", "time"],
  ["매수는 몇 주 해?", "quantity"],
  ["매수해도 돼?", "confirmation"],
] as const) {
  assert.equal(findChatbotQuestionForm(question), questionForm, question);
}

// 차트도 매수와 같은 짝을 갖는다 — 뜻은 chart, 보는 방법은 chart-read.
// 짝이 없어서 "차트는 어떻게 봐요?" 에 차트의 **정의**가 나가던 자리다.
const chartQuestionForms = [
  ["차트가 뭐야?", "definition", "chart"],
  ["차트는 어떻게 봐요?", "procedure", "chart-read"],
  ["차트 보는 법 알려줘", "procedure", "chart-read"],
  ["차트 어디서 봐요?", "location", "chart-read"],
] as const;
for (const [question, questionForm, knowledgeId] of chartQuestionForms) {
  assert.equal(findChatbotQuestionForm(question), questionForm, question);
  assert.equal(findChatbotKnowledge(question)?.id, knowledgeId, question);
}

// 형태가 잡히지 않은 입력(낱말만 던진 것)은 정의형으로 본다. 예전에는 형태가 null 이면
// `questionForms` 선언을 통째로 무시해서, 선언이 있어도 아무 질문에나 답할 수 있었다.
assert.equal(findChatbotQuestionForm("차트"), null);
assert.equal(findChatbotKnowledge("차트")?.id, "chart");

// 절차 표현은 `어떻게`·`하는법` 만이 아니다. 여기서 놓치면 형태가 null 이 되고,
// null 은 위 정의형 폴백을 타서 절차 질문이 정의 답으로 샌다.
for (const question of [
  "차트 보는 법 알려줘",
  "차트 읽는 법 알려줘",
  "차트 보려면요",
]) {
  assert.equal(findChatbotQuestionForm(question), "procedure", question);
}

// 이 서비스에 없는 화면은 형태와 무관하게 "없다"를 먼저 말한다.
// `매수호가`·`매도호가`는 낱말 `호가`만으로는 용어 사전(`매수`·`매도`)에 트리거 길이가
// 밀려 "매수는 주식을 사는 거래예요" 가 나가던 자리다.
for (const question of [
  "호가창이 뭐야?",
  "호가창은 어떻게 봐요?",
  "호가창 어디서 봐요?",
  "호가가 뭐야?",
  "매수호가 보여줘",
  "매도호가 보여줘",
]) {
  assert.equal(findChatbotKnowledge(question)?.id, "orderbook-unsupported", question);
}

// 발행된 어린이 뉴스가 실제로 풀어 쓴 말을 사전이 받는다(§9.1 — 3차 추가).
// 근거는 뉴스 101건의 `term_treatments` 전수 집계다.
for (const [question, id] of [
  ["계약이 뭐야?", "contract"],
  ["공장이 뭐야?", "factory"],
  ["지분이 뭐야?", "stake"],
  ["공시가 뭐야?", "disclosure"],
  ["연결 기준이 뭐야?", "consolidated-basis"],
  ["매각이 뭐야?", "divestiture"],
  ["인수가 뭐야?", "acquisition"],
  ["공급망이 뭐야?", "supply-chain"],
  ["수익성이 뭐야?", "profitability"],
  ["자사주 소각이 뭐야?", "share-cancellation"],
  ["최고경영자가 뭐야?", "chief-executive"],
  // 표기가 흔들리는 말은 항목을 늘리지 않고 트리거만 붙인다.
  ["전년 동기 대비가 뭐야?", "year-over-year"],
  ["전년비가 뭐야?", "year-over-year"],
  // 조사가 빠진 꼴도 받는다. 예전에는 이 형태만 LLM 으로 흘렀다.
  ["실적 뭐야?", "earnings"],
] as const) {
  assert.equal(findChatbotKnowledge(question)?.id, id, question);
}

// 두 글자 트리거는 남의 낱말을 가운데서 자르지 않는다.
//
// 공백을 지우고 부분 문자열로 찾으면 `공[시가]` 가 `시가`(그날 첫 가격), `수주잔[고가]`
// 가 `고가`(그날 최고가)로 걸려 **엉뚱한 답이 나갔다**(실측 2026-08-16). 사전이 커질수록
// 두 글자 항목이 늘어 이 사고도 함께 늘어난다.
for (const [question, id] of [
  ["공시가 뭐야?", "disclosure"],
  ["수주잔고가 뭐야?", "order-received"],
  ["오늘 시가가 뭐야?", "open-price"],
  ["시가가 뭐야?", "open-price"],
  ["고가가 뭐야?", "high-price"],
] as const) {
  assert.equal(findChatbotKnowledge(question)?.id, id, question);
}
for (const question of ["출시가 뭐야?", "자체 결제 시스템이 뭐야?", "운임지수가 뭐야?"]) {
  assert.equal(findChatbotKnowledge(question), undefined, question);
}

// 라우터는 공백을 지운 문자열로 조회하므로 원문을 함께 넘긴다. 원문이 없으면 경계를
// 볼 수 없어 `공시가` 가 다시 `시가` 로 걸린다 — 그 연결이 끊기면 이 검사가 실패한다.
assert.equal(findChatbotKnowledge("공시가뭐야", "공시가 뭐야?")?.id, "disclosure");
assert.equal(findChatbotKnowledge("오늘시가가뭐야", "오늘 시가가 뭐야?")?.id, "open-price");

// 답변을 선언한 형태 밖으로 내보내지 않는다.
for (const entry of CHATBOT_KNOWLEDGE) {
  if (!entry.questionForms) continue;
  assert.ok(entry.questionForms.length > 0, `${entry.id} 의 questionForms 가 비었다`);
}

// 이 서비스가 다루지 않는 상품·방법은 **뜻과 함께 그 경계를 말한다.**
//
// 아이는 뉴스와 영상에서 공매도·선물을 듣고 와서 묻는다. 모른 척하면 다른 데서 답을
// 찾고, 뜻만 알려 주면 여기서도 되는 줄 안다. 우리는 51종 국내 주식을 가상 현금
// 안에서만 사고파는 모의투자다(§4). 그 경계 문장이 빠지면 이 검사가 실패한다.
for (const id of ["short-selling", "futures", "derivatives", "margin-trading", "ipo-share"]) {
  const entry = CHATBOT_KNOWLEDGE.find((item) => item.id === id);
  assert.ok(entry, `${id} 가 사전에 없다`);
  assert.ok(
    ["하지 않아요", "다루지 않아요", "주식만 다뤄요", "가상 현금으로만"].some((phrase) =>
      entry.answer.includes(phrase),
    ),
    `${id} 의 답에 서비스 경계가 없다: ${entry.answer}`,
  );
}

// 실제 거래에는 붙지만 이 모의투자는 계산하지 않는 것도 같은 이유로 밝힌다(§4).
for (const id of ["tax", "fee"]) {
  const entry = CHATBOT_KNOWLEDGE.find((item) => item.id === id);
  assert.ok(entry, `${id} 가 사전에 없다`);
  assert.ok(entry.answer.includes("계산하지 않아요"), `${id} 가 계산 안 함을 밝히지 않는다`);
}

console.log("chatbot knowledge tests passed");
