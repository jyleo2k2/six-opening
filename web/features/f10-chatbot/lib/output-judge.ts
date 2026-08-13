import { LLM_MODEL, LLM_REASONING_EFFORT, getLlmClient } from "../../../shared/llm/client";

/**
 * SPEC §6.0.2 T5b. 결정적 룰(`shared/llm/filter`)이 잡지 못하는 "표현만 바꾼"
 * 추천·전망을 Luna로 한 번 더 판정한다. 룰만으로는 실측 0/12 차단이었고 룰을
 * 늘려도 같은 뜻을 다른 낱말로 쓰면 다시 새어 나간다.
 *
 * 판정은 답변을 고쳐 쓰지 않는다. 위반이면 호출부가 고정 응답으로 대체한다.
 */
const JUDGE_INSTRUCTIONS = `너는 어린이 투자교육 챗봇의 출력 검사기다.
검사 대상 문장이 다음 중 하나라도 해당하면 violation 은 true 다.
1) 특정 종목의 추천·비추천, 매수·매도·보유 제안
2) 종목이나 업종 사이의 우열 판단
3) 미래의 가격·수익률·실적 방향이나 그 가능성 언급
4) 목표가·손절가 제시
5) 안전하다·유망하다·싸다·괜찮다처럼 투자 매력도를 단정하는 평가

다음은 violation 이 false 다.
- 금융 용어와 지표의 정의, 계산 방법
- 회사가 만드는 제품·서비스의 사실 설명
- 화면 사용법, 주문 절차, 서비스 규칙 안내
- 과거에 일어난 일을 예측 없이 서술한 문장

판정만 한다. 문장을 다시 쓰지 않는다.`;

export type OutputJudgeVerdict = {
  violation: boolean;
  /** 위반한 규칙 번호(1~5). 위반이 아니면 0. 로깅용이며 사용자에게 보이지 않는다. */
  rule: number;
};

export async function judgeChatOutput(
  text: string,
  signal: AbortSignal,
): Promise<OutputJudgeVerdict> {
  const client = getLlmClient();

  const response = await client.responses.create(
    {
      model: LLM_MODEL,
      instructions: JUDGE_INSTRUCTIONS,
      input: [{ role: "user", content: text }],
      reasoning: { effort: LLM_REASONING_EFFORT },
      max_output_tokens: 2_000,
      text: {
        format: {
          type: "json_schema",
          name: "verdict",
          schema: {
            type: "object",
            properties: {
              violation: { type: "boolean" },
              rule: { type: "integer" },
            },
            required: ["violation", "rule"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
    { signal },
  );

  // 스키마를 벗어난 응답은 통과로 해석하지 않는다. 호출부가 닫힌 실패로 처리한다.
  const parsed: unknown = JSON.parse(response.output_text);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as OutputJudgeVerdict).violation !== "boolean"
  ) {
    throw new Error("output judge returned an unexpected shape");
  }

  const verdict = parsed as OutputJudgeVerdict;
  return {
    violation: verdict.violation,
    rule: Number.isInteger(verdict.rule) ? verdict.rule : 0,
  };
}
