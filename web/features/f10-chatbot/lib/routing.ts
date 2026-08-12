import { findChatbotKnowledge } from "../../../shared/data/chatbot-knowledge";
import type {
  ChatContext,
  ExplainScript,
  ChatUiAction,
  ProactiveSignal,
  ReadOnlyChatToolName,
} from "../../../shared/types/chatbot";

export type { ChatContext, ProactiveSignal } from "../../../shared/types/chatbot";

export type ChatRoute =
  | "faq"
  | "context"
  | "tool"
  | "refusal"
  | "safety"
  | "outOfScope"
  | "fallback";

export type ChatIntent =
  | "financial_concept"
  | "service_help"
  | "stock_facts"
  | "own_records"
  | "own_profile"
  | "own_archive"
  | "safety"
  | "general_allowed";

export type ChatReply = {
  route: ChatRoute;
  intent: ChatIntent;
  text: string;
  steps: readonly string[];
  suggestedQuestions?: string[];
  uiAction?: ChatUiAction;
  tool?: ReadOnlyChatToolName;
  explainScript?: ExplainScript;
};

const RECOMMENDATION_PATTERNS = [
  "종목사",
  "무슨종목",
  "무슨주식",
  "뭐사",
  "뭘사",
  "추천",
  "사도돼",
  "사야돼",
  "팔아야",
  "매수해",
  "매도해",
  "오를까",
  "오를것",
  "내릴까",
  "떨어질까",
  "목표가",
  "손절가",
  "수익률전망",
  "언제사",
  "언제팔",
  "매수타이밍",
  "매도타이밍",
  "사는게좋",
  "파는게좋",
  "살까",
  "팔까",
  "유망",
  "좋은종목",
  "보유할까",
];
const PERSONAL_INFO_PATTERNS = [
  "주민번호",
  "비밀번호",
  "전화번호",
  "주소",
  "계좌번호",
  "생년월일",
  "학교이름",
  "이메일",
];
const CRISIS_PATTERNS = [
  "자해",
  "죽고싶",
  "살기싫",
  "사라지고싶",
  "해치고싶",
  "끝내고싶",
];
const HARMFUL_PATTERNS = ["협박", "때리고", "죽여", "해킹", "시스템지시무시", "프롬프트보여"];
const OUT_OF_SCOPE_PATTERNS = ["숙제", "게임공략", "날씨", "노래", "영화"];
const RECORD_PATTERNS = ["내기록", "내거래", "지난거래", "왜골랐", "거래이유", "내보유기간"];
const PROFILE_PATTERNS = ["내성향", "투자성향", "성향분석", "나는어떤투자"];
const ARCHIVE_PATTERNS = ["내아카이브", "지난시즌", "시즌기록", "시즌변화", "예전기록"];
const STOCK_PATTERNS = ["이회사", "무슨회사", "회사뭐", "이종목", "무엇을만들", "어떤일을해"];

export function normalizeChatInput(input: string) {
  return input.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, "");
}

function includesAny(message: string, patterns: readonly string[]) {
  return patterns.some((pattern) => message.includes(pattern));
}

function reply(
  route: ChatRoute,
  intent: ChatIntent,
  text: string,
  steps: readonly string[] = [],
  extras: Partial<Pick<ChatReply, "suggestedQuestions" | "tool" | "uiAction" | "explainScript">> = {},
): ChatReply {
  return { route, intent, text, steps, ...extras };
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function getContextReply(message: string, context: ChatContext): ChatReply | null {
  if (
    context.screen === "order" &&
    context.quantity !== undefined &&
    context.unitPrice !== undefined &&
    includesAny(message, ["예상금액", "얼마", "계산", "몇주", "수량"])
  ) {
    const total = context.quantity * context.unitPrice;
    return reply(
      "context",
      "service_help",
      `지금 화면의 ${context.quantity}주와 1주 ${formatWon(context.unitPrice)}을 곱하면 예상 금액은 ${formatWon(total)}이야. 실제 주문 전에는 화면의 최종 금액을 한 번 더 확인해 줘.`,
      ["현재 주문 수량 확인", "표시 가격으로 계산"],
      { uiAction: { type: "open_screen", target: "order" } },
    );
  }

  return null;
}

export function routeMessage(input: string, context: ChatContext): ChatReply {
  const message = normalizeChatInput(input);

  if (includesAny(message, CRISIS_PATTERNS)) {
    return reply(
      "safety",
      "safety",
      "지금 혼자 견디지 않아도 돼. 가까운 보호자나 믿을 수 있는 어른에게 바로 알려 줘. 급하게 위험하다고 느껴지면 112나 119에 도움을 요청해 줘.",
      ["안전 안내"],
    );
  }

  if (includesAny(message, PERSONAL_INFO_PATTERNS)) {
    return reply(
      "safety",
      "safety",
      "개인정보는 채팅에 입력하지 않아도 돼. 계좌나 비밀번호처럼 중요한 정보는 보호자와 함께 앱의 공식 화면에서만 확인해 줘.",
      ["개인정보 보호 안내"],
    );
  }

  if (includesAny(message, HARMFUL_PATTERNS)) {
    return reply(
      "safety",
      "safety",
      "그 요청은 여기서 도와줄 수 없어. 투자 화면이나 금융 기초가 궁금하면 다시 물어봐 줘.",
      ["안전 안내"],
    );
  }

  if (includesAny(message, RECOMMENDATION_PATTERNS)) {
    return reply(
      "refusal",
      "safety",
      "특정 종목을 고르거나 사고팔 시점을 정해 줄 수는 없어. 대신 회사가 하는 일과 네가 확인할 기준은 함께 볼 수 있어. 🐻",
      ["투자 권유 차단", "학습 기준 안내"],
      { suggestedQuestions: ["PER이 뭐야?", "분산투자가 뭐야?"] },
    );
  }

  if (includesAny(message, OUT_OF_SCOPE_PATTERNS)) {
    return reply(
      "outOfScope",
      "safety",
      "나는 이 서비스의 사용법과 투자 기초 이야기만 도와줄 수 있어. 화면이나 금융 용어가 궁금하면 물어봐 줘. 🐻",
      ["도메인 안내"],
    );
  }

  const contextReply = getContextReply(message, context);
  if (contextReply) return contextReply;

  if (includesAny(message, RECORD_PATTERNS)) {
    return reply("tool", "own_records", "", ["본인 투자 기록 조회"], {
      tool: "own_trade_records",
    });
  }
  if (includesAny(message, PROFILE_PATTERNS)) {
    return reply("tool", "own_profile", "", ["본인 성향 결과 조회"], {
      tool: "own_behavior_profile",
    });
  }
  if (includesAny(message, ARCHIVE_PATTERNS)) {
    return reply("tool", "own_archive", "", ["본인 시즌 기록 조회"], {
      tool: "own_archive",
    });
  }
  if (context.screen === "stock" && includesAny(message, STOCK_PATTERNS)) {
    return reply("tool", "stock_facts", "", ["승인 종목 사실 조회"], {
      tool: "approved_stock_facts",
    });
  }

  const knowledge = findChatbotKnowledge(message);
  if (knowledge) {
    return reply(
      "faq",
      knowledge.kind === "glossary" ? "financial_concept" : "service_help",
      knowledge.answer,
      [knowledge.kind === "glossary" ? "용어 사전 확인" : "사용법 FAQ 확인"],
      {
        ...(knowledge.actionTarget
          ? { uiAction: { type: "open_screen", target: knowledge.actionTarget } }
          : {}),
        ...(knowledge.explainScript ? { explainScript: knowledge.explainScript } : {}),
      },
    );
  }

  return reply(
    "fallback",
    "general_allowed",
    "나는 투자 기초와 서비스 사용법을 도와줄 수 있어. 예를 들어 ‘PER이 뭐야?’, ‘주문 전에 뭘 확인해?’처럼 물어봐 줘. 🐻",
    ["허용 질문 확인"],
  );
}

export const PROACTIVE_SCRIPTS: Record<
  ProactiveSignal,
  { label: string; text: string }
> = {
  switch: {
    label: "매수·매도 취소 반복",
    text: "매수와 매도가 헷갈려?",
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
