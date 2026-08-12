export type GuidedTopicId = "per" | "etf" | "diversification";
export type GuidedOptionId = "simpler" | "example" | "detail" | "understood";

export type ExplanationOption = {
  id: GuidedOptionId;
  label: string;
  targetNodeId: string | null;
};

export type ExplanationNode = {
  id: string;
  topicId: GuidedTopicId;
  kind: "main" | "simpler" | "example" | "detail";
  factIds: string[];
  text: string;
  options: ExplanationOption[];
};

const DONE: ExplanationOption = {
  id: "understood",
  label: "이해했어",
  targetNodeId: null,
};

const GRAPH: Record<GuidedTopicId, Record<string, ExplanationNode>> = {
  per: {
    "per-main": {
      id: "per-main",
      topicId: "per",
      kind: "main",
      factIds: ["per"],
      text: "PER은 회사가 번 이익에 비해 주가가 몇 배인지 보여 주는 숫자야. 이 숫자 하나만으로 회사를 좋다거나 나쁘다고 정할 수는 없어. 어떤 설명이 더 필요해?",
      options: [
        { id: "simpler", label: "더 쉽게", targetNodeId: "per-simpler" },
        { id: "example", label: "예시 보기", targetNodeId: "per-example" },
        { id: "detail", label: "조금 더 자세히", targetNodeId: "per-detail" },
        DONE,
      ],
    },
    "per-simpler": {
      id: "per-simpler",
      topicId: "per",
      kind: "simpler",
      factIds: ["per"],
      text: "PER은 회사의 가격표와 한 해 이익을 나란히 보는 방법이라고 생각하면 쉬워. 같은 숫자라도 회사가 속한 업종과 상황에 따라 뜻이 달라질 수 있어. 다음에는 무엇을 볼까?",
      options: [
        { id: "example", label: "예시 보기", targetNodeId: "per-example" },
        { id: "detail", label: "조금 더 자세히", targetNodeId: "per-detail" },
        DONE,
      ],
    },
    "per-example": {
      id: "per-example",
      topicId: "per",
      kind: "example",
      factIds: ["per"],
      text: "예를 들어 주가가 10,000원이고 주당 이익이 1,000원이면 PER은 10배야. 이 값은 계산 예시일 뿐, 매수나 매도를 뜻하지 않아. 더 자세한 기준도 볼까?",
      options: [
        { id: "detail", label: "조금 더 자세히", targetNodeId: "per-detail" },
        DONE,
      ],
    },
    "per-detail": {
      id: "per-detail",
      topicId: "per",
      kind: "detail",
      factIds: ["per"],
      text: "PER을 비교할 때는 비슷한 일을 하는 회사인지, 이익을 같은 기준으로 계산했는지 함께 확인해야 해. 이익이 아주 작거나 적자라면 PER만으로 살피기 어려울 수도 있어. 여기까지 이해했으면 대화를 마칠 수 있어.",
      options: [DONE],
    },
  },
  etf: {
    "etf-main": {
      id: "etf-main",
      topicId: "etf",
      kind: "main",
      factIds: ["etf"],
      text: "ETF는 여러 자산을 한 바구니처럼 묶어 거래소에서 주식처럼 사고팔 수 있게 만든 상품이야. 어떤 자산이 담겼는지는 ETF마다 달라. 어떤 설명이 더 필요해?",
      options: [
        { id: "simpler", label: "더 쉽게", targetNodeId: "etf-simpler" },
        { id: "example", label: "예시 보기", targetNodeId: "etf-example" },
        { id: "detail", label: "조금 더 자세히", targetNodeId: "etf-detail" },
        DONE,
      ],
    },
    "etf-simpler": {
      id: "etf-simpler",
      topicId: "etf",
      kind: "simpler",
      factIds: ["etf"],
      text: "ETF는 여러 재료가 담긴 도시락 한 개를 고르는 모습과 비슷해. 도시락마다 들어 있는 재료와 만드는 규칙이 달라. 다음에는 무엇을 볼까?",
      options: [
        { id: "example", label: "예시 보기", targetNodeId: "etf-example" },
        { id: "detail", label: "조금 더 자세히", targetNodeId: "etf-detail" },
        DONE,
      ],
    },
    "etf-example": {
      id: "etf-example",
      topicId: "etf",
      kind: "example",
      factIds: ["etf"],
      text: "예를 들어 어떤 ETF는 여러 회사의 주식을 정해진 비율로 담을 수 있어. 한 회사의 주식만 가진 것과 구성 방식이 다르다는 뜻이야. 더 자세한 기준도 볼까?",
      options: [
        { id: "detail", label: "조금 더 자세히", targetNodeId: "etf-detail" },
        DONE,
      ],
    },
    "etf-detail": {
      id: "etf-detail",
      topicId: "etf",
      kind: "detail",
      factIds: ["etf"],
      text: "ETF를 이해할 때는 어떤 지수나 자산을 따라가는지, 무엇이 얼마나 담겼는지, 비용은 얼마인지 확인해. 여러 자산을 담아도 가격이 움직이거나 손실이 날 수 있어. 여기까지 이해했으면 대화를 마칠 수 있어.",
      options: [DONE],
    },
  },
  diversification: {
    "diversification-main": {
      id: "diversification-main",
      topicId: "diversification",
      kind: "main",
      factIds: ["diversification"],
      text: "분산투자는 돈을 한 곳에만 두지 않고 여러 자산이나 분야에 나누는 생각이야. 한 곳의 변화가 전체에 미치는 영향을 줄이려는 방법이지만 손실을 없애 주지는 않아. 어떤 설명이 더 필요해?",
      options: [
        { id: "simpler", label: "더 쉽게", targetNodeId: "diversification-simpler" },
        { id: "example", label: "예시 보기", targetNodeId: "diversification-example" },
        { id: "detail", label: "조금 더 자세히", targetNodeId: "diversification-detail" },
        DONE,
      ],
    },
    "diversification-simpler": {
      id: "diversification-simpler",
      topicId: "diversification",
      kind: "simpler",
      factIds: ["diversification"],
      text: "달걀을 한 바구니에만 담지 않는 모습으로 생각하면 쉬워. 바구니 하나가 흔들려도 모든 달걀이 함께 영향을 받지 않게 나누는 거야. 다음에는 무엇을 볼까?",
      options: [
        { id: "example", label: "예시 보기", targetNodeId: "diversification-example" },
        { id: "detail", label: "조금 더 자세히", targetNodeId: "diversification-detail" },
        DONE,
      ],
    },
    "diversification-example": {
      id: "diversification-example",
      topicId: "diversification",
      kind: "example",
      factIds: ["diversification"],
      text: "예를 들어 서로 다른 분야의 자산을 나누어 살펴보는 것이 분산의 한 모습이야. 이름만 여러 개라고 충분히 분산된 것은 아니고, 비슷하게 움직이는지도 함께 봐야 해. 더 자세한 기준도 볼까?",
      options: [
        { id: "detail", label: "조금 더 자세히", targetNodeId: "diversification-detail" },
        DONE,
      ],
    },
    "diversification-detail": {
      id: "diversification-detail",
      topicId: "diversification",
      kind: "detail",
      factIds: ["diversification"],
      text: "분산을 살필 때는 자산의 종류, 업종, 움직임이 얼마나 다른지 확인할 수 있어. 여러 곳에 나눠도 모두 함께 떨어질 수 있으므로 위험이 사라지는 것은 아니야. 여기까지 이해했으면 대화를 마칠 수 있어.",
      options: [DONE],
    },
  },
};

export const GUIDED_TOPIC_STARTS: Record<GuidedTopicId, string> = {
  per: "per-main",
  etf: "etf-main",
  diversification: "diversification-main",
};

export function getExplanationNode(topicId: GuidedTopicId, nodeId: string) {
  return GRAPH[topicId][nodeId] ?? null;
}
