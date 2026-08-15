import assert from "node:assert/strict";
import { gateChatOutput } from "../../../shared/llm/filter";
import type { ExplainScript } from "../../../shared/types/chatbot";
import {
  advanceExplain,
  findCommonExplainScript,
  reaskExplain,
  resolveTextReply,
  startExplain,
  startGuidedExplain,
} from "./explain";
import { toPoliteKorean } from "./polite";

const per: ExplainScript = {
  id: "term:per",
  brief: "PER은 회사 가격이 버는 돈에 비해 비싼지 보는 숫자야.",
  check: {
    question: "PER이 높으면 회사 가격은 버는 돈에 비해 어떤 걸까?",
    choices: [
      { id: "expensive", label: "비싼 편이에요" },
      { id: "cheap", label: "싼 편이에요" },
      { id: "same", label: "똑같아" },
    ],
    answerId: "expensive",
  },
  adjust: {
    explanation: "PER에는 회사가 번 돈과 주가가 함께 들어가.",
    question: "직원 수는 PER 비교에 들어갈까?",
    choices: [
      { id: "no", label: "들어가지 않아" },
      { id: "yes", label: "들어가" },
    ],
    answerId: "no",
  },
  detail:
    "PER은 회사 가격을 한 해에 버는 돈으로 나눈 값이야. 그래서 숫자가 클수록 버는 돈에 비해 값이 높다는 뜻이야.",
  example:
    "똑같이 한 해에 1000원을 버는 가게가 두 곳 있다고 해 보자. 한 곳은 1만원, 다른 곳은 2만원에 판다면 두 번째 가게의 PER이 더 높아.",
};

// ① 시작하면 피드백·1줄 설명·이해 확인 질문이 함께 나온다. brief 선택지에는
// "잘 모르겠어요"가 항상 따라붙는다(guiding 아닌 진단형 스크립트).
const first = startExplain(per);
assert.equal(first.kind, "turn");
assert.equal(first.text, toPoliteKorean(`궁금한 걸 잘 짚었어요 — ${per.brief}`));
assert.deepEqual(first.kind === "turn" ? first.turn : null, {
  scriptId: "term:per",
  stage: "brief",
  prompt: toPoliteKorean(per.check.question),
  choices: [
    ...per.check.choices.map((choice) => ({ ...choice, label: toPoliteKorean(choice.label) })),
    { id: "unsure", label: toPoliteKorean("잘 모르겠어요") },
  ],
});

// ② 정답이면 구체적으로 피드백하고 다음 행동을 묻는다.
const correct = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "expensive",
});
assert.equal(correct?.kind, "turn");
assert.equal(correct?.text, toPoliteKorean(`맞아요, 그 단서를 잘 연결했어요. ${per.detail}`));
assert.equal(correct?.kind === "turn" ? correct.turn.stage : null, "followup");

// ③ 오답이면 추가 설명과 확인 질문으로 내려간다.
const wrong = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "cheap",
});
assert.equal(wrong?.kind, "turn");
assert.equal(wrong?.text, toPoliteKorean(`그렇게 생각할 수 있어요. ${per.adjust?.explanation}`));
assert.deepEqual(
  wrong?.kind === "turn" ? wrong.turn.choices : null,
  per.adjust?.choices.map((choice) => ({ ...choice, label: toPoliteKorean(choice.label) })),
);
assert.equal(wrong?.kind === "turn" ? wrong.turn.stage : null, "detail");

// ④ 작은 질문의 정답이면 개념을 연결하고, 오답이면 예시 뒤 같은 작은 질문으로 돌아간다.
const understood = advanceExplain(per, {
  scriptId: "term:per",
  stage: "detail",
  choiceId: "no",
});
assert.equal(understood?.kind, "turn");
assert.equal(understood?.kind === "turn" ? understood.turn.stage : null, "followup");
assert.equal(understood?.text.includes(toPoliteKorean(per.detail)), true);
const example = advanceExplain(per, {
  scriptId: "term:per",
  stage: "detail",
  choiceId: "yes",
});
assert.equal(example?.kind, "turn");
assert.equal(example?.text, toPoliteKorean(`그럼 예를 들어볼게요. ${per.example}`));
assert.equal(example?.kind === "turn" ? example.turn.stage : null, "detail");

// 후속 질문은 직접 질문 또는 명시적 종료만 허용한다.
assert.deepEqual(
  advanceExplain(per, {
    scriptId: "term:per",
    stage: "followup",
    choiceId: "done",
  }),
  { kind: "end", text: "좋아요, 궁금한 게 생기면 다시 불러 주세요." },
);

// 위조 차단 — 다른 스크립트, 없는 선택지, 응답할 수 없는 단계.
assert.equal(
  advanceExplain(per, {
    scriptId: "term:pbr",
    stage: "brief",
    choiceId: "expensive",
  }),
  null,
);
assert.equal(
  advanceExplain(per, { scriptId: "term:per", stage: "brief", choiceId: "yes" }),
  null,
);
assert.equal(
  advanceExplain(per, {
    scriptId: "term:per",
    stage: "detail",
    choiceId: "expensive",
  }),
  null,
);
assert.equal(
  advanceExplain(per, {
    scriptId: "term:per",
    stage: "example" as "brief",
    choiceId: "yes",
  }),
  null,
);

// 모든 단계의 text가 출력 게이트(3문장·금지 표현)를 통과한다.
for (const step of [first, correct, wrong, understood, example]) {
  const gate = gateChatOutput({ text: step!.text, source: "fixed" });
  assert.equal(gate.ok, true, `게이트 실패: ${step!.text}`);
}

// 선택지 라벨과 되묻는 질문도 게이트를 통과해야 한다 (text 경로를 타지 않으므로).
for (const turn of [first, correct, wrong, understood, example].map((step) =>
  step?.kind === "turn" ? step.turn : null,
)) {
  assert.ok(turn);
  assert.equal(gateChatOutput({ text: turn.prompt, source: "fixed" }).ok, true);
  for (const choice of turn.choices) {
    assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
  }
}

// 타이핑 응답 해석 — 작은 질문은 정확한 라벨과 "모르겠어"만 받는다.
assert.equal(resolveTextReply(per, "detail", "들어가지 않아"), "no");
assert.equal(resolveTextReply(per, "detail", "ㅇㅇ"), null);
assert.equal(resolveTextReply(per, "detail", "몰라"), "unsure");
assert.equal(resolveTextReply(per, "detail", "모르겠어"), "unsure");
assert.equal(resolveTextReply(per, "detail", "냠냠"), null);
// 라벨이 해요체여도 아이가 반말로 치면 알아듣는다 (그 반대도).
const politePer: ExplainScript = {
  ...per,
  adjust: {
    ...per.adjust!,
    choices: [
      { id: "no", label: "들어가지 않아요" },
      { id: "yes", label: "들어가요" },
    ],
  },
};
assert.equal(resolveTextReply(politePer, "detail", "들어가지 않아"), "no");
assert.equal(resolveTextReply(politePer, "detail", "들어가지 않아요"), "no");
assert.equal(resolveTextReply(politePer, "detail", "들어가요"), "yes");
// 새 질문은 응답으로 삼지 않는다.
assert.equal(resolveTextReply(per, "detail", "PBR은 뭐야?"), null);
// 이해 확인 단계는 선택지 라벨이 정확히 맞을 때만 받는다 — 단 "몰라요" 계열은
// 예외로, brief에서도 추측 없이 바로 unsure로 받는다.
assert.equal(resolveTextReply(per, "brief", "비싼 편이야"), "expensive");
assert.equal(resolveTextReply(per, "brief", "ㅇㅇ"), null);
assert.equal(resolveTextReply(per, "brief", "몰라요"), "unsure");
assert.equal(resolveTextReply(per, "brief", "잘 모르겠어"), "unsure");

// brief에서 unsure면 "틀렸다"고 하지 않고 unsure 전용 피드백으로 adjust
// 스캐폴딩(작은 질문)으로 곧장 내려간다.
const unsureAtBrief = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "unsure",
});
assert.equal(unsureAtBrief?.kind, "turn");
assert.equal(
  unsureAtBrief?.text,
  toPoliteKorean(`괜찮아요, 같이 찾아봐요. ${per.adjust?.explanation}`),
);
assert.equal(unsureAtBrief?.kind === "turn" ? unsureAtBrief.turn.stage : null, "detail");
assert.equal(gateChatOutput({ text: unsureAtBrief!.text, source: "fixed" }).ok, true);

// 되묻기는 단계를 유지하고 선택지를 그대로 다시 준다.
const reask = reaskExplain(per, "detail");
assert.equal(reask.kind, "turn");
assert.equal(reask.kind === "turn" ? reask.turn.stage : null, "detail");
assert.deepEqual(reask.kind === "turn" ? reask.turn.choices : null, [
  { id: "no", label: "들어가지 않아요" },
  { id: "yes", label: "들어가" },
]);
// 되물을 때마다 turn에 횟수를 실어 보낸다 — 클라이언트가 다음 요청에 그대로
// 돌려보내야 상한을 셀 수 있다.
assert.equal(reask.kind === "turn" ? reask.turn.reaskCount : null, 1);

// 같은 단계에서 최대 횟수만큼 되물었으면 더 안 묻고 정답 설명을 바로 주고
// followup으로 넘긴다 — 어떤 입력이든 무한 루프가 되지 않는다.
const gaveUp = reaskExplain(per, "detail", 2);
assert.equal(gaveUp.kind, "turn");
assert.equal(gaveUp.text, toPoliteKorean(`그럼 답을 같이 확인해 볼게요. ${per.detail}`));
assert.equal(gaveUp.kind === "turn" ? gaveUp.turn.stage : null, "followup");
assert.equal(gateChatOutput({ text: gaveUp.text, source: "fixed" }).ok, true);

// 전용 스크립트가 없는 답변도 공통 유도형 DAPIE 턴을 사용한다.
const guided = startGuidedExplain("주식은 회사의 작은 조각이야.");
assert.equal(guided.kind, "turn");
assert.equal(guided.text.includes("궁금한 지점을 잘 짚었어요"), true);
assert.equal(guided.kind === "turn" ? guided.turn.scriptId : null, "flow:guided");
const guidedScript = findCommonExplainScript("flow:guided");
assert.ok(guidedScript);
const simpler = advanceExplain(guidedScript, {
  scriptId: "flow:guided",
  stage: "brief",
  choiceId: "simpler",
});
assert.equal(simpler?.kind, "turn");
assert.equal(simpler?.kind === "turn" ? simpler.turn.stage : null, "detail");
assert.equal(simpler?.text.includes("헷갈린 단어"), true);

console.log("explain ok");
