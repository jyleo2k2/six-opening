import { findChatbotKnowledge } from "../../../shared/data/chatbot-knowledge";

export type ChatRoute =
  | "faq"
  | "context"
  | "refusal"
  | "safety"
  | "outOfScope"
  | "fallback";

export type ChatContext = {
  screen: "home" | "stock" | "order" | "archive";
  stockName?: string;
  quantity?: number;
  unitPrice?: number;
};

export type ChatReply = {
  route: ChatRoute;
  text: string;
  steps: readonly string[];
};

const RECOMMENDATION_PATTERNS = [
  "종목사",
  "뭐사",
  "추천",
  "매수해",
  "매도해",
  "오를까",
  "내릴까",
  "목표가",
  "손절가",
  "수익률전망",
  "언제사",
  "언제팔",
];

const PERSONAL_INFO_PATTERNS = ["주민번호", "비밀번호", "전화번호", "주소", "계좌번호"];
const CRISIS_PATTERNS = ["자해", "죽고싶", "죽고 싶", "해치고싶", "해치고 싶"];
const HARMFUL_PATTERNS = ["욕", "협박", "때리고", "죽여"];
const OUT_OF_SCOPE_PATTERNS = ["숙제", "게임", "날씨", "노래", "영화"];

function normalize(input: string) {
  return input.trim().replaceAll(" ", "").toLowerCase();
}

function reply(route: ChatRoute, text: string, steps: readonly string[] = []) {
  return { route, text, steps };
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function getContextReply(message: string, context: ChatContext): ChatReply | null {
  if (context.screen === "order" && context.quantity && context.unitPrice) {
    if (["예상금액", "얼마", "계산", "몇주", "수량"].some((word) => message.includes(word))) {
      const total = context.quantity * context.unitPrice;
      return reply(
        "context",
        `지금 화면의 ${context.quantity}주와 1주 ${formatWon(context.unitPrice)}을 곱하면 예상 금액은 ${formatWon(total)}이야. 실제 주문 전에는 화면의 최종 금액을 한 번 더 확인해 줘.`,
        ["현재 주문 수량 확인", "표시 가격으로 계산"],
      );
    }
  }

  if (context.screen === "stock" && ["이회사", "무슨회사", "회사뭐", "이종목"].some((word) => message.includes(word))) {
    return reply(
      "context",
      `${context.stockName ?? "이 종목"} 상세 화면에는 회사가 하는 일과 공개된 과거 정보가 있어. 미래에 오를지보다 회사 설명과 최근 공개 자료를 먼저 살펴보면 좋아.`,
      ["현재 종목 확인", "종목 설명 카드 안내"],
    );
  }

  return null;
}

export function routeMessage(input: string, context: ChatContext): ChatReply {
  const message = normalize(input);

  if (CRISIS_PATTERNS.some((pattern) => message.includes(pattern))) {
    return reply(
      "safety",
      "지금 혼자 견디지 않아도 돼. 가까운 보호자나 믿을 수 있는 어른에게 바로 알려 줘. 급하게 위험하다고 느껴지면 112나 119에 도움을 요청해 줘.",
      ["안전 안내"],
    );
  }

  if (PERSONAL_INFO_PATTERNS.some((pattern) => message.includes(pattern))) {
    return reply(
      "safety",
      "개인정보는 채팅에 입력하지 않아도 돼. 계좌나 비밀번호처럼 중요한 정보는 보호자와 함께 앱의 공식 화면에서만 확인해 줘.",
      ["개인정보 보호 안내"],
    );
  }

  if (HARMFUL_PATTERNS.some((pattern) => message.includes(pattern))) {
    return reply("safety", "서로 다치게 하는 말은 여기서 다루기 어려워. 투자 화면이나 금융 기초가 궁금하면 다시 물어봐 줘.", ["안전 안내"]);
  }

  if (RECOMMENDATION_PATTERNS.some((pattern) => message.includes(pattern))) {
    return reply(
      "refusal",
      "특정 종목을 고르거나 사고팔 시점을 정해 줄 수는 없어. 대신 회사가 하는 일, 위험, 그리고 네가 확인할 기준은 함께 볼 수 있어. 🐻",
      ["투자 권유 차단", "학습 기준 안내"],
    );
  }

  if (OUT_OF_SCOPE_PATTERNS.some((pattern) => message.includes(pattern))) {
    return reply("outOfScope", "나는 이 서비스의 사용법과 투자 기초 이야기만 도와줄 수 있어. 화면이나 금융 용어가 궁금하면 물어봐 줘. 🐻", ["도메인 안내"]);
  }

  const contextReply = getContextReply(message, context);
  if (contextReply) return contextReply;

  const knowledge = findChatbotKnowledge(message);
  if (knowledge) {
    return reply("faq", knowledge.answer, [knowledge.kind === "glossary" ? "용어 사전 확인" : "사용법 FAQ 확인"]);
  }

  return reply(
    "fallback",
    "나는 투자 기초와 서비스 사용법을 도와줄 수 있어. 예를 들어 ‘PER이 뭐야?’, ‘주문 전에 뭘 확인해?’처럼 물어봐 줘. 🐻",
    ["질문 범위 확인"],
  );
}

export type ProactiveSignal = "switch" | "dwell" | "lossRevisit";

export type CancelledOrder = { side: "buy" | "sell"; at: number };
export type StockDetailEntry = { symbol: string; at: number };

export type AnxietySignalInput = {
  now: number;
  currentScreen: ChatContext["screen"];
  screenEnteredAt?: number;
  cancelledOrders: readonly CancelledOrder[];
  realizedLoss?: { symbol: string; soldAt: number; rate: number };
  stockDetailEntries: readonly StockDetailEntry[];
};

const FIVE_MINUTES = 5 * 60 * 1000;

function hasAlternatingCancellationTriplet(cancelledOrders: readonly CancelledOrder[]) {
  const recent = cancelledOrders.slice(-3);
  return recent.length === 3 && recent[0].side !== recent[1].side && recent[1].side !== recent[2].side;
}

export function detectAnxietySignals(input: AnxietySignalInput): ProactiveSignal[] {
  const signals: ProactiveSignal[] = [];

  if (hasAlternatingCancellationTriplet(input.cancelledOrders)) signals.push("switch");

  if (
    (input.currentScreen === "order" || input.currentScreen === "stock") &&
    input.screenEnteredAt !== undefined &&
    input.now - input.screenEnteredAt > FIVE_MINUTES
  ) {
    signals.push("dwell");
  }

  const loss = input.realizedLoss;
  if (loss && loss.rate <= -10 && input.now >= loss.soldAt && input.now - loss.soldAt <= FIVE_MINUTES) {
    const revisitCount = input.stockDetailEntries.filter(
      (entry) => entry.symbol === loss.symbol && entry.at >= loss.soldAt && entry.at <= input.now,
    ).length;
    if (revisitCount >= 4) signals.push("lossRevisit");
  }

  return signals;
}

export const PROACTIVE_SCRIPTS: Record<
  ProactiveSignal,
  { label: string; text: string }
> = {
  switch: {
    label: "매수·매도 취소 반복",
    text: "매수와 매도 차이가 헷갈려?",
  },
  dwell: {
    label: "주문·상세 화면 5분 초과 체류",
    text: "어디에서 막혔는지 같이 볼까?",
  },
  lossRevisit: {
    label: "손실 실현 종목 반복 조회",
    text: "방금 본 종목이 계속 신경 쓰여?",
  },
};
