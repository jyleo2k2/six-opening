import { LLM_MODEL, LLM_REASONING_EFFORT, getLlmClient } from "../../../shared/llm/client";
import type { ChatContext } from "./routing";

function describeContext(context: ChatContext) {
  const values = [
    `현재 화면: ${context.screen}`,
    context.stockName ? `표시 종목: ${context.stockName}` : null,
    context.quantity ? `표시 수량: ${context.quantity}주` : null,
    context.unitPrice ? `표시 단가: ${context.unitPrice}원` : null,
  ].filter(Boolean);

  return values.join("\n");
}

export async function streamChatAnswer(message: string, context: ChatContext) {
  const client = getLlmClient();

  return client.responses.create({
    model: LLM_MODEL,
    stream: true,
    reasoning: { effort: LLM_REASONING_EFFORT },
    max_output_tokens: 800,
    instructions: `너는 키웅이, 초등 고학년부터 중학생을 위한 모의투자 앱 도우미다.
답변 범위는 투자 기초 개념, 앱 사용법, 제공된 화면 맥락과 종목의 사실 설명뿐이다.
특정 종목 추천, 매수·매도 시점, 목표가·손절가, 가격 또는 수익률 전망, 훈계는 절대 하지 않는다.
제공되지 않은 시세·보유 수치·회사 사실을 만들지 않는다. 모르면 확인할 화면이나 자료를 안내한다.
쉬운 한국어 반말로 최대 3문장만 답하고, 필요하면 이모지 하나만 사용한다.`,
    input: `사용자 질문: ${message}\n\n화면 맥락:\n${describeContext(context)}`,
  });
}
