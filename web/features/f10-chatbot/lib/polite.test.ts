import assert from "node:assert/strict";
import { SECTORS } from "../../../shared/data/sectors";
import { STOCKS } from "../../../shared/data/stocks";
import { isHaeyoKorean, toPoliteKorean, withoutSecondPerson } from "./polite";
import { createSectorExploreTurn } from "./sector-explore";
import { advanceStockExplore, createStockExploreTurn } from "./stock-explore";
import type { StockFactTopic } from "../../../shared/types/chatbot";

const converted = toPoliteKorean(
  "나는 AI 도우미야. 혼자 결정하지 않아도 돼. 화면을 다시 봐. 궁금하면 물어봐.",
);

assert.equal(
  converted,
  "나는 AI 도우미예요. 혼자 결정하지 않아도 돼요. 화면을 다시 봐요. 궁금하면 물어봐요.",
);
assert.equal(toPoliteKorean("다른 종목도 알아볼까?"), "다른 종목도 알아볼까요?");
assert.equal(isHaeyoKorean(converted), true);
assert.equal(isHaeyoKorean("나는 AI 도우미야."), false);
assert.equal(isHaeyoKorean("답변을 준비했어요. 🐻"), true);
// "~죠"는 "~지요"의 준말이라 해요체다. 반말로 오판하면 정상 답변이 폐기된다.
assert.equal(isHaeyoKorean("한 조각 몫이 정해지죠."), true);
// 물음표 뒤에서는 "줘"를 바꾸지 않는다. 질문이 "~하세요" 지시체로 바뀌면 안 된다.
assert.equal(toPoliteKorean("뭘 도와줘?"), "뭘 도와줘?");
assert.equal(toPoliteKorean("이것 좀 알려 줘."), "이것 좀 알려 주세요.");

// ── 2인칭 대명사는 해요체와 섞이면 반말로 읽힌다. 주어를 지운다.
assert.equal(
  withoutSecondPerson("대신 네가 남긴 거래 이유는 같이 볼 수 있어요."),
  "대신 남긴 거래 이유는 같이 볼 수 있어요.",
);
assert.equal(
  withoutSecondPerson("점수로 너를 평가하는 기능은 아니에요."),
  "점수로 평가하는 기능은 아니에요.",
);
// 수사 "네"(네 가지)는 대명사가 아니라 그대로 둔다.
assert.equal(
  withoutSecondPerson("근거·직관과 집중·분산으로 네 가지 캐릭터를 만들어요."),
  "근거·직관과 집중·분산으로 네 가지 캐릭터를 만들어요.",
);
// 앞에 한글이 붙은 "너가"·"너는"은 다른 낱말의 일부다.
assert.equal(
  withoutSecondPerson("디자이너가 만든 화면이에요."),
  "디자이너가 만든 화면이에요.",
);
// 고정 응답에 2인칭이 다시 새어 들어오지 않는지 소스 문구로 확인한다.
for (const sample of [
  "언제 사고팔거나 계속 보유할지는 대신 정해 줄 수 없어요. 대신 그동안 남긴 거래 이유와 주문 전 확인 항목은 같이 볼 수 있어요. 🐻",
  "예상 금액과 이유를 본 뒤 마지막 주문 확인은 직접 해야 해요.",
]) {
  assert.equal(withoutSecondPerson(sample), sample, `2인칭이 남아 있음: ${sample}`);
}

// ── 🤖 챗봇이 던지는 확인 질문(prompt)은 저장 문구가 이미 해요체여야 한다 (SPEC §3.3.2).
// 오케스트레이터가 prompt 를 변환하지 않고 게이트로 검사만 하므로, 반말이 남아 있으면
// 그 답변 전체가 폴백으로 대체된다.
const TOPICS: StockFactTopic[] = ["company", "business", "industry", "financial"];
const sampleStock = STOCKS[0].id as `KRX:${string}`;
const explorePrompts: string[] = [];
for (let shown = 0; shown <= TOPICS.length; shown += 1) {
  const turn = createStockExploreTurn(sampleStock, TOPICS.slice(0, shown));
  if (turn) explorePrompts.push(turn.prompt);
}
for (const sector of SECTORS) explorePrompts.push(createSectorExploreTurn(sector.key).prompt);
for (const prompt of explorePrompts) {
  assert.ok(isHaeyoKorean(prompt), `탐색 질문이 해요체가 아님: ${prompt}`);
  assert.equal(toPoliteKorean(prompt), prompt, `탐색 질문이 런타임 변환에 기댐: ${prompt}`);
}

// 탐색 종료 문장도 챗봇 발화다.
for (const choiceId of ["done", "ask-other"] as const) {
  const step = advanceStockExplore({ stockId: sampleStock, shownTopics: TOPICS, choiceId });
  if (step?.kind !== "end") continue;
  assert.ok(isHaeyoKorean(step.text), `탐색 종료 문장이 해요체가 아님: ${step.text}`);
  assert.equal(toPoliteKorean(step.text), step.text, `탐색 종료 문장이 변환에 기댐: ${step.text}`);
}

console.log("chatbot polite tests passed");
