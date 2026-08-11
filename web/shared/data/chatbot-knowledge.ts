export type ChatbotKnowledgeKind = "glossary" | "faq";

export type ChatbotKnowledgeEntry = {
  id: string;
  kind: ChatbotKnowledgeKind;
  triggers: readonly string[];
  answer: string;
  status: "draft" | "reviewed";
};

const reviewed = "reviewed" as const;

export const CHATBOT_KNOWLEDGE: readonly ChatbotKnowledgeEntry[] = [
  { id: "stock", kind: "glossary", triggers: ["주식"], answer: "주식은 회사의 작은 조각이라고 생각하면 돼. 주식을 가진 사람은 그 회사의 주주가 돼.", status: reviewed },
  { id: "shareholder", kind: "glossary", triggers: ["주주"], answer: "주주는 회사의 주식을 가진 사람이야. 회사의 작은 조각을 함께 가진 사람이라고 생각하면 돼.", status: reviewed },
  { id: "stock-item", kind: "glossary", triggers: ["종목"], answer: "종목은 거래 화면에서 구분하는 회사나 상품 하나를 말해. 여기서는 각 회사의 주식이 하나의 종목이야.", status: reviewed },
  { id: "buy", kind: "glossary", triggers: ["매수", "주식 사기"], answer: "매수는 주식을 사는 거래야. 주문 전에 수량과 예상 금액, 그리고 네 생각을 확인하면 돼.", status: reviewed },
  { id: "sell", kind: "glossary", triggers: ["매도", "팔기"], answer: "매도는 가지고 있던 주식을 파는 거래야. 팔고 나면 그 거래의 결과가 실현손익으로 기록돼.", status: reviewed },
  { id: "order", kind: "glossary", triggers: ["주문"], answer: "주문은 주식을 사고팔겠다고 거래소에 알리는 과정이야. 주문을 넣었다고 바로 거래가 끝나는 것은 아니야.", status: reviewed },
  { id: "execution", kind: "glossary", triggers: ["체결"], answer: "체결은 사고 싶은 사람과 팔고 싶은 사람이 만나 거래가 완료된 상태야. 체결된 뒤에 보유 수량이 바뀌어.", status: reviewed },
  { id: "current-price", kind: "glossary", triggers: ["현재가"], answer: "현재가는 지금 화면에 표시된 최근 거래 가격이야. 시간이 지나면 달라질 수 있어.", status: reviewed },
  { id: "market-order", kind: "glossary", triggers: ["시장가"], answer: "시장가는 지금 시장에서 거래되는 가격으로 주문하는 방법이야. 주문을 넣는 순간의 가격과 조금 달라질 수 있어.", status: reviewed },
  { id: "limit-order", kind: "glossary", triggers: ["지정가"], answer: "지정가는 내가 정한 가격에만 주문이 되도록 하는 방법이야. 그 가격에 거래 상대가 없으면 바로 체결되지 않을 수 있어.", status: reviewed },
  { id: "quantity", kind: "glossary", triggers: ["수량", "몇 주"], answer: "수량은 사고팔 주식의 개수야. 한 주 가격과 곱하면 대략의 거래 금액을 확인할 수 있어.", status: reviewed },
  { id: "estimated-amount", kind: "glossary", triggers: ["예상 금액"], answer: "예상 금액은 주문 수량과 가격으로 계산한 돈이야. 주문을 확정하기 전 최종 금액을 다시 확인해 줘.", status: reviewed },
  { id: "evaluation-amount", kind: "glossary", triggers: ["평가금액"], answer: "평가금액은 지금 가지고 있는 주식이 현재 가격으로 얼마인지 보여주는 금액이야. 아직 팔지 않았다면 가격에 따라 바뀔 수 있어.", status: reviewed },
  { id: "unrealized-profit", kind: "glossary", triggers: ["평가손익"], answer: "평가손익은 아직 가진 주식의 값이 산 뒤보다 얼마나 달라졌는지 보여줘. 아직 팔지 않은 변화라서 계속 바뀔 수 있어.", status: reviewed },
  { id: "realized-profit", kind: "glossary", triggers: ["실현손익"], answer: "실현손익은 주식을 팔아 거래가 끝난 뒤 기록되는 결과야. 평가손익과 달리 이미 끝난 거래의 기록이야.", status: reviewed },
  { id: "return", kind: "glossary", triggers: ["수익률"], answer: "수익률은 처음 금액과 지금 금액이 얼마나 달라졌는지 비율로 보는 방법이야. 숫자뿐 아니라 왜 골랐는지도 같이 돌아보면 좋아.", status: reviewed },
  { id: "average-price", kind: "glossary", triggers: ["평균 매수가", "평균매수가"], answer: "평균 매수가는 같은 종목을 여러 번 샀을 때 한 주당 평균으로 얼마에 샀는지 보여주는 가격이야.", status: reviewed },
  { id: "sector", kind: "glossary", triggers: ["업종"], answer: "업종은 비슷한 일을 하는 회사들을 묶은 이름이야. 예를 들어 게임 회사나 식품 회사처럼 나눌 수 있어.", status: reviewed },
  { id: "market-cap", kind: "glossary", triggers: ["시가총액"], answer: "시가총액은 회사의 주식 전체를 현재 가격으로 계산한 크기야. 회사가 하는 일이나 성적을 모두 보여주는 숫자는 아니야.", status: reviewed },
  { id: "revenue", kind: "glossary", triggers: ["매출"], answer: "매출은 회사가 물건이나 서비스를 팔아 받은 돈의 규모야. 매출이 모두 회사의 이익은 아니야.", status: reviewed },
  { id: "operating-profit", kind: "glossary", triggers: ["영업이익"], answer: "영업이익은 회사가 본업으로 번 돈에서 본업에 든 비용을 뺀 결과야. 회사의 공개된 과거 성적을 볼 때 쓰는 말이야.", status: reviewed },
  { id: "dividend", kind: "glossary", triggers: ["배당"], answer: "배당은 회사가 번 이익 일부를 주주에게 나누어 주는 것을 말해. 모든 회사가 배당하는 것은 아니야.", status: reviewed },
  { id: "per", kind: "glossary", triggers: ["per", "주가수익비율"], answer: "PER은 회사가 번 이익과 주가를 비교해 보는 숫자야. 같은 업종 회사끼리 함께 보면 이해하기 쉬워.", status: reviewed },
  { id: "pbr", kind: "glossary", triggers: ["pbr", "주가순자산비율"], answer: "PBR은 회사가 가진 자산과 주가를 비교해 보는 숫자야. 이 숫자 하나만으로 좋고 나쁜 회사를 정할 수는 없어.", status: reviewed },
  { id: "eps", kind: "glossary", triggers: ["eps", "주당순이익"], answer: "EPS는 회사가 번 이익을 주식 한 주당으로 나누어 본 숫자야. 회사의 과거 성적을 읽을 때 쓰는 비교용 숫자야.", status: reviewed },
  { id: "etf", kind: "glossary", triggers: ["etf"], answer: "ETF는 여러 회사의 주식을 한 바구니에 담아 둔 상품이야. 어떤 회사들이 담겼는지는 상품 설명에서 확인할 수 있어.", status: reviewed },
  { id: "index", kind: "glossary", triggers: ["지수"], answer: "지수는 여러 주식의 가격 움직임을 한눈에 보기 위해 만든 숫자야. 시장 전체나 특정 업종의 흐름을 살펴볼 때 써.", status: reviewed },
  { id: "diversification", kind: "glossary", triggers: ["분산투자", "분산 투자"], answer: "분산투자는 한 곳에만 담지 않고 여러 곳에 나누어 보는 방법이야. 결과를 보장하지는 않지만 한 종목에만 의존하는 정도는 줄일 수 있어.", status: reviewed },
  { id: "chart", kind: "glossary", triggers: ["차트"], answer: "차트는 과거 가격 변화를 그림으로 보여줘. 과거 기록을 보는 도구이지, 미래 가격을 알려주는 그림은 아니야.", status: reviewed },
  { id: "volume", kind: "glossary", triggers: ["거래량"], answer: "거래량은 얼마나 많은 주식이 사고팔렸는지 나타내는 숫자야. 거래량이 많다고 앞으로 가격이 어떻게 될지는 알 수 없어.", status: reviewed },
  { id: "volatility", kind: "glossary", triggers: ["변동성"], answer: "변동성은 가격이 오르내리는 폭이 얼마나 큰지 말해. 가격은 늘 움직일 수 있다는 점을 기억하면 돼.", status: reviewed },
  { id: "risk", kind: "glossary", triggers: ["위험"], answer: "투자에서 위험은 생각한 것과 다른 결과가 생길 수 있다는 뜻이야. 그래서 이유를 기록하고 여러 정보를 함께 보는 연습이 중요해.", status: reviewed },
  { id: "reason", kind: "faq", triggers: ["투자 근거", "고른 이유", "기록"], answer: "기록에서는 고른 이유와 확신도를 남길 수 있어. 정답을 맞히는 시험이 아니라, 나중에 내 생각을 돌아보기 위한 거야.", status: reviewed },
  { id: "confidence", kind: "faq", triggers: ["확신도", "확신"], answer: "확신도는 내 생각이 얼마나 또렷한지 표시하는 방법이야. 정답은 없고, 나중에 행동과 생각을 돌아보기 위한 기록이야.", status: reviewed },
  { id: "archive", kind: "faq", triggers: ["아카이브"], answer: "아카이브에서는 네가 남긴 거래와 생각을 다시 볼 수 있어. 점수표가 아니라 네 투자 스타일을 관찰하는 기록이야.", status: reviewed },
];

function normalize(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

export function findChatbotKnowledge(query: string) {
  const normalized = normalize(query);
  return CHATBOT_KNOWLEDGE.find(
    (entry) => entry.status === "reviewed" && entry.triggers.some((trigger) => normalized.includes(normalize(trigger))),
  );
}
