import { LLM_MODEL, getLlmClient } from "../../../shared/llm/client";

/**
 * 지시어 후속 질문을 혼자서도 이해되는 단독 질문으로 다시 쓴다.
 *
 * "수익률이 뭐야?" 다음에 아이가 "그럼 이게 높으면 좋은거야?" 라고 치면 그 문장
 * 만으로는 어떤 허용 목적에도 걸리지 않아 범위 밖 안내로 끝난다. 주제를 되살린
 * 뒤 같은 라우터에 다시 넣으면 이미 승인된 답변에 닿는다.
 *
 * 모델은 **다시 쓰기만 한다**. 답을 만들지 않으므로 이 호출의 출력은 사용자에게
 * 직접 노출되지 않고, 재작성문은 입력 게이트를 처음부터 다시 통과한다.
 */
const REWRITE_INSTRUCTIONS = `너는 어린이 투자교육 챗봇의 질문 정리기다.
직전 답변과 아이가 방금 한 말을 보고, 방금 한 말을 혼자서도 이해되는 질문 하나로 다시 써라.

규칙:
- 질문에 답하지 마라. 다시 쓰기만 한다.
- 직전 답변이 다룬 대상을 "이거"·"그거"·"이게"·"거기" 자리에 넣어라.
- 아이가 묻는 각도를 바꾸지 마라. "언제 써?"는 "언제 쓰나요?"로 남긴다.
- 없는 조건이나 종목을 새로 넣지 마라.
- 이미 혼자 이해되는 말이면 그대로 돌려줘라.
- 직전 답변과 이어지지 않는 새 질문이면 그대로 돌려줘라.
- 한 문장, 40자 이내, 물음표로 끝낸다.
- 질문 문장만 출력한다. 설명이나 따옴표를 붙이지 마라.`;

const MAX_REWRITTEN_LENGTH = 120;

/** 모델이 규칙을 어기고 문단을 뱉으면 쓰지 않는다. 첫 줄만 보고 길이로 자른다. */
function sanitizeRewritten(raw: string, original: string) {
  const first = raw.trim().split("\n")[0]?.trim() ?? "";
  const stripped = first.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  if (!stripped || stripped.length > MAX_REWRITTEN_LENGTH) return null;
  if (stripped === original.trim()) return null;
  return stripped;
}

export async function rewriteFollowUp(
  message: string,
  lastAnswer: string,
  signal: AbortSignal,
): Promise<string | null> {
  const client = getLlmClient();

  const response = await client.responses.create(
    {
      model: LLM_MODEL,
      instructions: REWRITE_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: `직전 답변: ${lastAnswer}\n\n아이가 방금 한 말: ${message}`,
        },
      ],
      // 지시어 해소는 추론이 필요 없는 작업이다. 무대 지연을 위해 끈다.
      reasoning: { effort: "none" },
      max_output_tokens: 200,
    },
    { signal },
  );

  return sanitizeRewritten(response.output_text ?? "", message);
}
