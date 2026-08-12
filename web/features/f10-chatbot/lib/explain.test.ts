import assert from "node:assert/strict";
import { gateChatOutput } from "../../../shared/llm/filter";
import type { ExplainScript } from "../../../shared/types/chatbot";
import { advanceExplain, reaskExplain, resolveTextReply, startExplain } from "./explain";

const per: ExplainScript = {
  id: "term:per",
  brief: "PER은 회사 가격이 버는 돈에 비해 비싼지 보는 숫자야.",
  check: {
    question: "PER이 높으면 회사 가격은 버는 돈에 비해 어떤 걸까?",
    choices: [
      { id: "expensive", label: "비싼 편이야" },
      { id: "cheap", label: "싼 편이야" },
      { id: "same", label: "똑같아" },
    ],
    answerId: "expensive",
  },
  detail:
    "PER은 회사 가격을 한 해에 버는 돈으로 나눈 값이야. 그래서 숫자가 클수록 버는 돈에 비해 값이 높다는 뜻이야.",
  example:
    "똑같이 한 해에 1000원을 버는 가게가 두 곳 있다고 해 보자. 한 곳은 1만원, 다른 곳은 2만원에 판다면 두 번째 가게의 PER이 더 높아.",
};

// ① 시작하면 1줄 설명과 이해 확인 질문이 함께 나온다.
const first = startExplain(per);
assert.equal(first.kind, "turn");
assert.equal(first.text, per.brief);
assert.deepEqual(first.kind === "turn" ? first.turn : null, {
  scriptId: "term:per",
  stage: "brief",
  prompt: per.check.question,
  choices: per.check.choices,
});

// ② 정답이면 칭찬하고 끝낸다.
const correct = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "expensive",
});
assert.deepEqual(correct, { kind: "end", text: "맞았어! 바로 그거야." });

// ③ 오답이면 추가 설명과 확인 질문으로 내려간다.
const wrong = advanceExplain(per, {
  scriptId: "term:per",
  stage: "brief",
  choiceId: "cheap",
});
assert.equal(wrong?.kind, "turn");
assert.equal(wrong?.text, `음, 그건 아니야. ${per.detail}`);
assert.deepEqual(wrong?.kind === "turn" ? wrong.turn.choices : null, [
  { id: "yes", label: "알겠어" },
  { id: "no", label: "모르겠어" },
]);
assert.equal(wrong?.kind === "turn" ? wrong.turn.stage : null, "detail");

// ④ "알겠어"면 끝, "모르겠어"면 예시를 주고 끝낸다.
assert.deepEqual(
  advanceExplain(per, { scriptId: "term:per", stage: "detail", choiceId: "yes" }),
  { kind: "end", text: "좋아, 이제 알겠네!" },
);
const example = advanceExplain(per, {
  scriptId: "term:per",
  stage: "detail",
  choiceId: "no",
});
assert.deepEqual(example, {
  kind: "end",
  text: `그럼 예를 들어볼게. ${per.example}`,
});

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
for (const step of [first, correct, wrong, example]) {
  const gate = gateChatOutput({ text: step!.text, source: "fixed" });
  assert.equal(gate.ok, true, `게이트 실패: ${step!.text}`);
}

// 선택지 라벨과 되묻는 질문도 게이트를 통과해야 한다 (text 경로를 타지 않으므로).
for (const turn of [first, wrong].map((step) =>
  step?.kind === "turn" ? step.turn : null,
)) {
  assert.ok(turn);
  assert.equal(gateChatOutput({ text: turn.prompt, source: "fixed" }).ok, true);
  for (const choice of turn.choices) {
    assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
  }
}

// 타이핑 응답 해석 — 확인 단계는 구어체를 받는다.
assert.equal(resolveTextReply(per, "detail", "ㅇㅇ"), "yes");
assert.equal(resolveTextReply(per, "detail", "웅"), "yes");
assert.equal(resolveTextReply(per, "detail", "몰라"), "no");
assert.equal(resolveTextReply(per, "detail", "알겠어"), "yes");
assert.equal(resolveTextReply(per, "detail", "모르겠어"), "no");
assert.equal(resolveTextReply(per, "detail", "냠냠"), null);
// 새 질문은 응답으로 삼지 않는다.
assert.equal(resolveTextReply(per, "detail", "PBR은 뭐야?"), null);
// 이해 확인 단계는 선택지 라벨이 정확히 맞을 때만 받는다.
assert.equal(resolveTextReply(per, "brief", "비싼 편이야"), "expensive");
assert.equal(resolveTextReply(per, "brief", "ㅇㅇ"), null);

// 되묻기는 단계를 유지하고 선택지를 그대로 다시 준다.
const reask = reaskExplain(per, "detail");
assert.equal(reask.kind, "turn");
assert.equal(reask.kind === "turn" ? reask.turn.stage : null, "detail");
assert.deepEqual(reask.kind === "turn" ? reask.turn.choices : null, [
  { id: "yes", label: "알겠어" },
  { id: "no", label: "모르겠어" },
]);

console.log("explain ok");
