import assert from "node:assert/strict";
import { CHATBOT_KNOWLEDGE } from "../../../shared/data/chatbot-knowledge";
import { gateChatOutput } from "../../../shared/llm/filter";
import type { ExplainScript } from "../../../shared/types/chatbot";
import {
  advanceExplain,
  findCommonExplainScript,
  reaskExplain,
  relatedTermChoices,
  resolveTextReply,
  startExplain,
  startGuidedExplain,
} from "./explain";
import { isHaeyoKorean, toPoliteKorean } from "./polite";

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
  // 🤖 prompt 와 🧒 선택지 라벨은 승인 데이터를 그대로 내보낸다(SPEC §3.3.2).
  prompt: per.check.question,
  choices: [...per.check.choices, { id: "unsure", label: "잘 모르겠어요" }],
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
assert.deepEqual(wrong?.kind === "turn" ? wrong.turn.choices : null, per.adjust?.choices);
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
// 예시 재질문 턴에는 되묻기 횟수가 실린다 — 클라이언트가 다음 응답에 돌려보낸다.
assert.equal(example?.kind === "turn" ? example.turn.reaskCount : null, 1);

// ④-1 예시 뒤에도 또 틀리면 같은 질문을 무한 반복하지 않는다 — 정답 설명을
// 주고 followup으로 넘긴다.
const revealed = advanceExplain(per, {
  scriptId: "term:per",
  stage: "detail",
  choiceId: "yes",
  reaskCount: 1,
});
assert.equal(revealed?.kind, "turn");
assert.equal(
  revealed?.text,
  toPoliteKorean(`그럼 답을 같이 확인해 볼게요. ${per.detail}`),
);
assert.equal(revealed?.kind === "turn" ? revealed.turn.stage : null, "followup");

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
assert.deepEqual(reask.kind === "turn" ? reask.turn.choices : null, per.adjust?.choices);
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

// 승인 데이터 전 스크립트 검사 — 도달 가능한 모든 단계 문장이 해요체이고
// 게이트를 통과한다. 데이터는 처음부터 해요체로 저장하며 런타임 변환(toPoliteKorean)에
// 기대지 않는다 (SPEC §3.4).
for (const entry of CHATBOT_KNOWLEDGE) {
  const script = entry.explainScript;
  if (!script || script.check.kind === "guiding") continue;

  const wrongCheck = script.check.choices.find(
    (choice) => choice.id !== script.check.answerId,
  )!;
  const steps = [
    startExplain(script),
    advanceExplain(script, {
      scriptId: script.id,
      stage: "brief",
      choiceId: script.check.answerId,
    }),
    advanceExplain(script, {
      scriptId: script.id,
      stage: "brief",
      choiceId: wrongCheck.id,
    }),
    advanceExplain(script, {
      scriptId: script.id,
      stage: "brief",
      choiceId: "unsure",
    }),
  ];
  if (script.adjust) {
    const wrongAdjust = script.adjust.choices.find(
      (choice) => choice.id !== script.adjust!.answerId,
    )!;
    steps.push(
      advanceExplain(script, {
        scriptId: script.id,
        stage: "detail",
        choiceId: script.adjust.answerId,
      }),
      advanceExplain(script, {
        scriptId: script.id,
        stage: "detail",
        choiceId: wrongAdjust.id,
      }),
      advanceExplain(script, {
        scriptId: script.id,
        stage: "detail",
        choiceId: wrongAdjust.id,
        reaskCount: 1,
      }),
    );
    // 조정 설명은 2문장 이내로 정답 근거를 직접 담는다 (SPEC §3.4).
    assert.ok(
      script.adjust.explanation.split(/[.!?]/).filter((s) => s.trim()).length <= 2,
      `${entry.id} 조정 설명이 2문장을 넘음: ${script.adjust.explanation}`,
    );
  }

  for (const step of steps) {
    assert.ok(step, `${entry.id} 전이 실패`);
    assert.equal(isHaeyoKorean(step.text), true, `${entry.id} 해요체 아님: ${step.text}`);
    assert.equal(
      gateChatOutput({ text: step.text, source: "fixed" }).ok,
      true,
      `${entry.id} 게이트 실패: ${step.text}`,
    );
    if (step.kind !== "turn") continue;
    assert.equal(
      isHaeyoKorean(step.turn.prompt),
      true,
      `${entry.id} 질문이 해요체 아님: ${step.turn.prompt}`,
    );
    assert.equal(gateChatOutput({ text: step.turn.prompt, source: "fixed" }).ok, true);
    for (const choice of step.turn.choices) {
      assert.equal(gateChatOutput({ text: choice.label, source: "fixed" }).ok, true);
      assert.equal(
        toPoliteKorean(choice.label),
        choice.label,
        `${entry.id} 라벨이 변환에 기댐: ${choice.label}`,
      );
    }
  }

  // 저장 문구 자체가 이미 해요체라 변환이 아무것도 바꾸지 않아야 한다.
  const sentenceFields = [
    script.brief,
    script.check.question,
    script.detail,
    script.example,
    ...(script.adjust ? [script.adjust.explanation, script.adjust.question] : []),
  ];
  for (const text of sentenceFields) {
    assert.equal(toPoliteKorean(text), text, `${entry.id} 변환 의존: ${text}`);
  }
}

// ── 비슷한 용어 추천 카드 (SPEC §3.4.1) ────────────────────────────────────
// 세 번 틀린 뒤 대화가 끊기지 않도록, followup 에 같은 범주의 다음 용어를 카드로 낸다.
const scripted = CHATBOT_KNOWLEDGE.filter((entry) => entry.explainScript && entry.category);
assert.ok(scripted.length >= 55, `범주가 붙은 용어가 너무 적다: ${scripted.length}`);

for (const entry of scripted) {
  const cards = relatedTermChoices(entry.explainScript!.id, 2);
  assert.ok(cards.length > 0, `${entry.id} 에 추천 카드가 없다`);
  for (const card of cards) {
    assert.notEqual(card.id, entry.explainScript!.id, `${entry.id} 가 자기를 추천한다`);
    const target = CHATBOT_KNOWLEDGE.find((other) => other.explainScript?.id === card.id);
    assert.equal(target?.category, entry.category, `${entry.id} 추천이 다른 범주다: ${card.id}`);
    // 카드도 화면에 나가는 문구라 출력 게이트를 통과해야 한다. "목표 가격 볼래요"가
    // 금지표현 `목표가` 에 걸렸던 적이 있다.
    assert.equal(
      gateChatOutput({ text: card.label, source: "fixed" }).ok,
      true,
      `${entry.id} 추천 카드가 게이트에 막힘: ${card.label}`,
    );
  }
}

// followup 선택지에 카드가 실리고, 카드를 고르면 그 용어 설명이 시작된다.
const perScript = CHATBOT_KNOWLEDGE.find((entry) => entry.id === "per")!.explainScript!;
const followup = advanceExplain(perScript, {
  scriptId: perScript.id,
  stage: "detail",
  choiceId: perScript.adjust!.choices.find((c) => c.id !== perScript.adjust!.answerId)!.id,
  reaskCount: 1,
});
assert.equal(followup?.kind, "turn");
const followupCards =
  followup?.kind === "turn" ? followup.turn.choices.filter((c) => c.id.startsWith("term:")) : [];
assert.ok(followupCards.length >= 1, "오답 뒤 followup 에 추천 카드가 없다");

const picked = advanceExplain(perScript, {
  scriptId: perScript.id,
  stage: "followup",
  choiceId: followupCards[0].id,
});
assert.equal(picked?.kind, "turn", "추천 카드를 골라도 설명이 시작되지 않는다");
assert.equal(picked?.kind === "turn" ? picked.turn.scriptId : null, followupCards[0].id);
assert.equal(picked?.kind === "turn" ? picked.turn.stage : null, "brief");

// 등록되지 않은 카드로 위조한 전이는 거부한다.
assert.equal(
  advanceExplain(perScript, { scriptId: perScript.id, stage: "followup", choiceId: "term:season" }),
  null,
  "다른 범주 용어로 위조한 전이가 통과했다",
);

// "다른 것도 물어볼래요"가 대화를 끊지 않고 카드를 더 펼친다.
const asked = advanceExplain(perScript, {
  scriptId: perScript.id,
  stage: "followup",
  choiceId: "ask",
});
assert.equal(asked?.kind, "turn", "'다른 것도 물어볼래요'가 여전히 대화를 끊는다");

console.log("explain ok");
