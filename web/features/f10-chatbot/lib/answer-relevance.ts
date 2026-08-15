import { LLM_MODEL, getLlmClient } from "../../../shared/llm/client";
import type { ChatIntent, ChatRoute } from "./routing";

/**
 * 답변 적합성 검사 — "이 답이 이 질문에 실제로 답하나".
 *
 * 규칙 라우터는 낱말이 겹치면 승인된 카드를 낸다. 그래서 나가는 문장 자체는
 * 늘 안전하지만 **묻지 않은 것에 답하는** 경우가 남는다. 600문항 실측에서
 * 고정 답변 262건 중 59건이 `partial`("주제는 맞는데 물은 지점을 비껴감"),
 * 4건이 `off` 였다 — 합쳐 24%.
 *
 * 이건 문장 형태로 구분되지 않는다. 질문과 답을 **함께** 읽어야 판정되므로
 * 정규식·형태 게이트로는 못 잡는다(그 시도는 측정 후 폐기했다 — routing.ts).
 *
 * 비용을 아끼려고 **약한 구간에만** 돌린다. 실측 정확도가 term 98%,
 * company 96%, meta 93% 인 반면 howto 89%, rule 81%, mydata 23% 였다.
 */
const VERDICTS = ["on", "off"] as const;
export type RelevanceVerdict = (typeof VERDICTS)[number];

/** 실측에서 오답이 몰린 의도. 나머지는 이미 정확해서 검사하지 않는다. */
const RISK_INTENTS: readonly ChatIntent[] = [
  "service_help",
  "own_records",
  "own_profile",
  "own_archive",
];

/**
 * 검사 대상인지. 거절·안전·범위 밖은 **일부러** 질문에 답하지 않는 응답이라
 * 검사하면 안 된다 — 전부 `off` 로 판정돼 안전 응답이 생성으로 바뀐다.
 */
export function shouldCheckRelevance(options: {
  route: ChatRoute;
  intent: ChatIntent;
  source: string;
}): boolean {
  if (options.source !== "fixed") return false;
  if (options.route !== "faq" && options.route !== "context") return false;
  return RISK_INTENTS.includes(options.intent);
}

const CHECK_INSTRUCTIONS = `너는 어린이 투자교육 챗봇의 답변 검사자다.
아이의 질문과 챗봇이 내보내려는 답변을 함께 읽고, 그 답변이 질문에 실제로
답하는지만 판정한다.

- "on"  : 질문이 물은 것에 답한다. 짧거나 화면으로 안내해도 물은 지점을 다루면 on.
- "off" : 주제만 겹치고 물은 지점을 비껴갔거나, 아예 다른 이야기를 한다.

예)
Q "나 지금 수익률 몇퍼야?" / A "수익률은 처음 금액과 지금 금액을 비교한 비율이에요" -> off
Q "한 주만 사도 돼?" / A "주문 화면은 금액을 고르면 수량을 계산해요" -> off
Q "내 수익률 어디서 봐?" / A "내 자산 화면에 함께 나와요" -> on

문장이 안전한지, 표현이 예쁜지는 보지 않는다. 답을 새로 만들지 않는다.`;

export async function checkAnswerRelevance(
  question: string,
  answer: string,
  signal: AbortSignal,
): Promise<RelevanceVerdict> {
  const client = getLlmClient();

  const response = await client.responses.create(
    {
      model: LLM_MODEL,
      instructions: CHECK_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: JSON.stringify({ question, answer: answer.slice(0, 600) }),
        },
      ],
      reasoning: { effort: "low" },
      max_output_tokens: 2_000,
      text: {
        format: {
          type: "json_schema",
          name: "answer_relevance",
          schema: {
            type: "object",
            properties: { verdict: { type: "string", enum: [...VERDICTS] } },
            required: ["verdict"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
    { signal },
  );

  const parsed: unknown = JSON.parse(response.output_text);
  const verdict = (parsed as { verdict?: unknown } | null)?.verdict;
  if (typeof verdict !== "string" || !(VERDICTS as readonly string[]).includes(verdict)) {
    throw new Error("relevance checker returned an unexpected shape");
  }
  return verdict as RelevanceVerdict;
}
