import { LLM_MODEL, LLM_REASONING_EFFORT, getLlmClient } from "../../../shared/llm/client";
import type { TermKind } from "./routing";

/**
 * SPEC §6.1.5의 9개 복합 금융 개념(term) 서브타입을 감지하는 결정적 키워드
 * 조합(`findTermKind`)이 표현 변형("오르면"·"뛰면"·"확 오르면" 등)을 다 못 잡을 때
 * 쓰는 보조 분류기다. 문장을 새로 쓰지 않고 이미 답변 문구가 있는 9개 중
 * 하나를 고르기만 한다 — 화면에 나가는 텍스트는 여전히 `termReply`의 승인된
 * 고정 문장이다. `routed.route === "fallback"`일 때만 호출하며, 안전 게이트
 * (T1~T2)를 이미 통과한 입력에만 닿는다.
 */
const TERM_KINDS = [
  "marketBasics",
  "profitLoss",
  "valuation",
  "orderConcept",
  "industryConcept",
  "causality",
  "profileStatistics",
  "reasonTag",
  "riskStrategy",
  "none",
] as const satisfies readonly (TermKind | "none")[];

export type ClassifiedTermKind = (typeof TERM_KINDS)[number];

const CLASSIFY_INSTRUCTIONS = `너는 어린이 투자교육 챗봇의 질문을 분류한다.
아래 9개 범주 중 하나에 해당하면 그 값을, 아니면 "none"을 리턴한다.
- marketBasics: 주가·차트·현재가·등락률 같은 화면 표시 기초 개념
- profitLoss: 수익률·손익·평가손익의 계산이나 뜻
- valuation: PER·PBR 같은 가치평가 지표의 해석·비교(오르면/낮으면/업종평균 등 방향 무관)
- orderConcept: 시장가·지정가·손절 같은 주문 방식·매매 용어
- industryConcept: 예대마진·칩과 메모리·IPO 같은 산업 금융 개념
- causality: 뉴스·유가 등 외부 요인과 가격의 인과관계
- profileStatistics: 성향 5축·표준편차·평균/중앙값 같은 통계·성향 산식
- reasonTag: 투자 근거 태그가 무엇을 뜻하는지
- riskStrategy: 분산투자·레버리지 개념
- none: 위 어디에도 안 맞음

분류만 한다. 답을 새로 만들지 않는다.`;

export async function classifyTermKind(
  message: string,
  signal: AbortSignal,
): Promise<ClassifiedTermKind> {
  const client = getLlmClient();

  const response = await client.responses.create(
    {
      model: LLM_MODEL,
      instructions: CLASSIFY_INSTRUCTIONS,
      input: [{ role: "user", content: message }],
      reasoning: { effort: LLM_REASONING_EFFORT },
      max_output_tokens: 2_000,
      text: {
        format: {
          type: "json_schema",
          name: "term_kind",
          schema: {
            type: "object",
            properties: {
              kind: { type: "string", enum: [...TERM_KINDS] },
            },
            required: ["kind"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    },
    { signal },
  );

  const parsed: unknown = JSON.parse(response.output_text);
  const kind = (parsed as { kind?: unknown } | null)?.kind;
  if (typeof kind !== "string" || !(TERM_KINDS as readonly string[]).includes(kind)) {
    throw new Error("term classifier returned an unexpected shape");
  }

  return kind as ClassifiedTermKind;
}
