import { LLM_MODEL, LLM_REASONING_EFFORT, getLlmClient } from "../../../shared/llm/client";
import { gateChatOutput } from "../../../shared/llm/filter";
import type { BehaviorCharacter, BehaviorProfileSnapshot } from "../../../shared/types/behavior-profile";

export const CHARACTER_LABEL: Record<BehaviorCharacter, string> = {
  sniper: "저격수",
  strategist: "전략가",
  challenger: "승부사",
  explorer: "탐험가",
};

export type ProfileNarration = {
  text: string;
  source: "luna" | "fallback";
};

/** 룰 기반 고정 폴백. Luna 실패·미사용 시 그대로 노출되므로 숫자 없는 해요체 2~3문장으로 유지한다. */
export function fallbackNarration(snapshot: BehaviorProfileSnapshot): string {
  const { observation, character, scores, samples } = snapshot.cumulative;
  if (observation === "none") {
    return "아직 산 기록이 없어요. 한 번 사고 나면 여기에 투자 스타일이 채워질 거예요.";
  }
  if (observation === "low") {
    return "아직 관찰 초기예요. 매수 기록이 더 쌓이면 투자 스타일을 알려 드릴게요.";
  }
  if (character === null) {
    // 두 축이 팽팽하면 어느 쪽이라고 단정하지 않는다 (엔진 TIE_BAND).
    return "지금은 두 가지 스타일이 비슷하게 나와요. 조금 더 기록이 쌓이면 어느 쪽이 더 편한지 보일 거예요.";
  }
  const first =
    scores.evidence > scores.intuition
      ? "사기 전에 이것저것 찾아보고 정하는 편이에요."
      : "마음이 끌리는 쪽을 빠르게 고르는 편이에요.";
  const second =
    scores.focus > scores.diversification
      ? "확신이 드는 곳에 모아 담는 스타일이에요."
      : "여러 곳에 조금씩 나눠 담는 스타일이에요.";
  if (samples.pending > 0) {
    return `${first} ${second} 아직 채점 전인 거래는 점수에 들어가지 않았어요.`;
  }
  return `${first} ${second}`;
}

/** 모델이 언급해도 되는 숫자 — 엔진 산출값과 산식 상수뿐이다. */
function allowedNumbers(snapshot: BehaviorProfileSnapshot): (string | number)[] {
  const { scores, level, samples } = snapshot.cumulative;
  const axes = [scores.evidence, scores.intuition, scores.focus, scores.diversification, scores.accuracy];
  return [
    ...axes,
    // 모델이 소수점을 떼고 말해도 통과시킨다
    ...axes.map((value) => Math.round(value)),
    ...(level === null ? [] : [level]),
    samples.buys,
    samples.sells,
    samples.graded,
    samples.pending,
    samples.hits,
    10,
    5,
    3,
    2,
  ];
}

const NARRATION_INSTRUCTIONS = `너는 아이의 모의투자 기록을 관찰해 설명하는 도우미다.
입력 JSON의 능력치·캐릭터·레벨은 엔진이 계산한 확정값이다. 숫자와 라벨을 바꾸거나 새 수치를 만들지 않는다.
관찰 톤의 쉬운 한국어 해요체로 정확히 2~3문장만 쓴다. 잘한 점 1~2개를 먼저, 아쉬운 점은 1개 이내로 담되 훈계하지 않는다.
종목 추천, 매수·매도 시점, 목표가, 수익률 전망은 절대 말하지 않는다.
캐릭터에는 우열이 없다 — 다른 캐릭터나 가족과 비교해 낫다·못하다고 말하지 않는다.
말끝은 "~예요", "~해요"처럼 다정하게 맺고 "~합니다"체와 "~하세요" 지시체는 쓰지 않는다.`;

/** 엔진 산출 JSON만 모델에 전달한다. 원시 거래 로그·가족 기록은 넣지 않는다 (SPEC §7). */
function narrationInput(snapshot: BehaviorProfileSnapshot): string {
  const { scores, character, level, samples } = snapshot.cumulative;
  const summary = {
    abilities: scores,
    character,
    characterLabel: character ? CHARACTER_LABEL[character] : null,
    level,
    samples,
    reasonDistribution: snapshot.reasonDistribution,
  };
  return `다섯 축은 모두 10점 만점이고 5가 중립이다. 근거력+직관력=10, 집중력+분산력=10 이다. 정확력은 체결 2거래일 뒤 종가로 채점한 결과이고 레벨은 1~3 이다. 기록이 적으면 점수가 5에 가깝게 나온다.\n\n엔진 산출:\n${JSON.stringify(summary)}`;
}

export async function generateProfileNarration(
  snapshot: BehaviorProfileSnapshot,
): Promise<ProfileNarration> {
  if (snapshot.cumulative.observation !== "ready") {
    return { text: fallbackNarration(snapshot), source: "fallback" };
  }
  try {
    const client = getLlmClient();
    const response = await client.responses.create({
      model: LLM_MODEL,
      reasoning: { effort: LLM_REASONING_EFFORT },
      max_output_tokens: 800,
      instructions: NARRATION_INSTRUCTIONS,
      input: [{ role: "user", content: narrationInput(snapshot) }],
    });
    const text = (response.output_text ?? "").trim();
    const gate = gateChatOutput({ text, source: "model", allowedNumbers: allowedNumbers(snapshot) });
    if (gate.ok) return { text: gate.text, source: "luna" };
    return { text: fallbackNarration(snapshot), source: "fallback" };
  } catch {
    return { text: fallbackNarration(snapshot), source: "fallback" };
  }
}
