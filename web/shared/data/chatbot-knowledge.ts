import type { ExplainScript, TermCategory } from "../types/chatbot";

export type ChatbotKnowledgeKind = "glossary" | "faq";

export type ChatbotQuestionForm =
  | "definition"
  | "procedure"
  | "location"
  | "reason"
  | "time"
  | "quantity"
  | "confirmation";

export type ChatbotKnowledgeEntry = {
  id: string;
  kind: ChatbotKnowledgeKind;
  /** 설명이 끝난 뒤 비슷한 용어를 추천할 때 쓰는 묶음. DAPIE 스크립트가 있는 용어만 갖는다. */
  category?: TermCategory;
  /** 추천 카드 버튼에 쓰는 짧은 이름. 트리거가 문장인 용어도 있어 따로 둔다. */
  termLabel?: string;
  triggers: readonly string[];
  questionForms?: readonly ChatbotQuestionForm[];
  answer: string;
  explainScript?: ExplainScript;
  actionTarget?: "home" | "stock" | "order" | "archive";
  status: "draft" | "reviewed";
};

const reviewed = "reviewed" as const;

export const CHAT_PRIVACY_ANSWER =
  "우리가 나눈 얘기는 엄마한테 안 보여요.";
export const TRADE_VISIBILITY_ANSWER =
  "거래 기록은 가족끼리 볼 수 있어요.";

function termScript(
  id: string,
  script: Omit<ExplainScript, "id">,
): ExplainScript {
  return { id: `term:${id}`, ...script };
}

const GLOSSARY_EXPLAIN_SCRIPTS = {
  stock: termScript("stock", {
    brief: "주식은 회사를 잘게 나눈 작은 조각이에요.",
    check: {
      question: "주식 한 주는 무엇을 뜻할까요?",
      choices: [
        { id: "company-piece", label: "회사의 작은 조각" },
        { id: "loan", label: "회사에 빌려준 돈" },
        { id: "product", label: "회사가 파는 물건" },
      ],
      answerId: "company-piece",
    },
    adjust: {
      explanation: "회사를 피자처럼 여러 조각으로 나눈 것이 주식이에요. 그래서 조각 하나를 가진 사람은 회사의 일부를 가진 거예요.",
      question: "주식 한 조각을 가진 사람은 회사의 일부를 가진 걸까요?",
      choices: [
        { id: "yes", label: "회사의 일부를 가져요" },
        { id: "no", label: "회사에 돈을 빌려준 거예요" },
      ],
      answerId: "yes",
    },
    detail: "회사는 필요한 돈을 모으려고 주식을 만들고, 그 조각을 가진 사람을 주주라고 불러요.",
    example: "반 친구 스무 명이 돈을 모아 축구공 하나를 샀다고 해 봐요. 돈을 낸 사람마다 그 공의 일부를 가진 셈이에요.",
  }),
  shareholder: termScript("shareholder", {
    brief: "주주는 그 회사의 주식을 가진 사람이에요.",
    check: {
      question: "누구를 주주라고 부를까요?",
      choices: [
        { id: "stock-owner", label: "회사의 주식을 가진 사람" },
        { id: "employee", label: "회사에서 일하는 모든 사람" },
        { id: "customer", label: "물건을 산 모든 손님" },
      ],
      answerId: "stock-owner",
    },
    adjust: {
      explanation: "주주가 되는 조건은 딱 하나, 그 회사의 주식을 가지는 거예요. 회사에서 일하거나 물건을 샀다고 주주가 되는 것은 아니에요.",
      question: "주주가 되려면 무엇을 가지고 있어야 할까요?",
      choices: [
        { id: "stock", label: "그 회사의 주식" },
        { id: "receipt", label: "그 회사에서 일한 경력" },
      ],
      answerId: "stock",
    },
    detail: "직원이나 손님이라는 이유만으로 주주가 되지는 않아요.",
    example: "피자 조각을 가진 사람이 그 조각의 주인인 것과 비슷해요. 회사의 주식 조각을 가진 사람이 주주예요.",
  }),
  "stock-item": termScript("stock-item", {
    brief: "종목은 거래 화면에서 구분하는 회사나 상품 하나예요.",
    check: {
      question: "거래 화면에서 종목 하나는 무엇을 가리킬까요?",
      choices: [
        { id: "one-company", label: "회사나 상품 하나" },
        { id: "all-market", label: "주식시장 전체" },
        { id: "one-sector", label: "같은 업종 묶음" },
      ],
      answerId: "one-company",
    },
    adjust: {
      explanation: "검색 결과에는 회사 이름이 한 줄씩 나뉘어 나와요. 그 한 줄 한 줄이 회사나 상품 하나, 곧 종목 하나예요.",
      question: "검색 결과의 한 줄은 무엇을 구분할까요?",
      choices: [
        { id: "one-item", label: "회사나 상품 하나" },
        { id: "all-items", label: "모든 회사를 한꺼번에" },
      ],
      answerId: "one-item",
    },
    detail: "종목마다 구분하는 이름과 코드가 따로 있어요.",
    example: "도서관에서 책마다 제목과 번호가 있는 것과 비슷해요. 거래 화면도 종목 이름과 코드로 회사를 구분해요.",
  }),
  buy: termScript("buy", {
    brief: "매수는 주식을 사서 보유 주식이 늘어나는 거래예요.",
    check: {
      question: "매수 주문이 체결되면 가진 주식은 어떻게 될까요?",
      choices: [
        { id: "increase", label: "주식 수가 늘어나요" },
        { id: "decrease", label: "주식 수가 줄어들어요" },
        { id: "disappear", label: "종목이 사라져요" },
      ],
      answerId: "increase",
    },
    adjust: {
      explanation: "매수는 물건을 사서 내 것으로 만드는 것과 같은 방향이에요. 그래서 매수가 체결되면 그 주식이 내 보유 목록에 들어와요.",
      question: "주식을 사면 내 보유 목록에 들어올까요?",
      choices: [
        { id: "yes", label: "체결되면 들어와요" },
        { id: "no", label: "주문을 넣는 순간 바로 들어와요" },
      ],
      answerId: "yes",
    },
    detail: "주문을 냈다고 바로 늘어나지는 않고 조건이 맞아 체결되어야 해요.",
    example: "가게에서 물건을 사겠다고 말한 것은 주문이고, 돈을 내고 물건을 받은 때가 체결이에요. 주식 매수도 체결 뒤에 보유 목록에 들어와요.",
  }),
  sell: termScript("sell", {
    brief: "매도는 가지고 있던 주식을 팔아 보유 주식이 줄어드는 거래예요.",
    check: {
      question: "매도 주문이 체결되면 가진 주식은 어떻게 될까요?",
      choices: [
        { id: "decrease", label: "주식 수가 줄어들어요" },
        { id: "increase", label: "주식 수가 늘어나요" },
        { id: "same", label: "언제나 그대로예요" },
      ],
      answerId: "decrease",
    },
    adjust: {
      explanation: "매도는 내가 가진 것을 다른 사람에게 파는 방향이에요. 그래서 매도가 체결되면 판 만큼 보유 목록에서 빠져나가요.",
      question: "가지고 있던 주식을 팔면 내 보유 목록은 어떻게 될까요?",
      choices: [
        { id: "less", label: "체결된 만큼 줄어들어요" },
        { id: "more", label: "체결된 만큼 늘어나요" },
      ],
      answerId: "less",
    },
    detail: "체결된 수량만큼 줄어들고 그 거래 결과가 실현손익으로 기록돼요.",
    example: "가지고 있던 카드를 친구에게 팔면 내 카드 수가 줄어드는 것과 비슷해요. 주식도 매도가 체결된 만큼 줄어들어요.",
  }),
  order: termScript("order", {
    brief: "주문은 주식을 사고팔겠다고 거래소에 알리는 요청이에요.",
    check: {
      question: "주문을 넣으면 거래가 언제나 바로 끝날까요?",
      choices: [
        { id: "not-always", label: "조건이 맞아야 끝나요" },
        { id: "always", label: "언제나 바로 끝나요" },
        { id: "never", label: "절대 끝나지 않아요" },
      ],
      answerId: "not-always",
    },
    adjust: {
      explanation: "주문은 사거나 팔고 싶다고 알리는 요청이에요. 사고 싶은 사람과 팔고 싶은 사람의 조건이 맞아야 거래가 끝나요.",
      question: "주문은 거래 완료일까요, 거래 요청일까요?",
      choices: [
        { id: "request", label: "거래 요청" },
        { id: "complete", label: "거래 완료" },
      ],
      answerId: "request",
    },
    detail: "주문에 담은 수량과 가격 조건이 맞아야 거래가 체결돼요.",
    example: "식당에서 음식을 부탁한 순간이 주문이고, 음식이 나온 순간이 완료에 가까워요. 주식도 주문과 체결은 다른 단계예요.",
  }),
  execution: termScript("execution", {
    brief: "체결은 조건이 맞아 거래가 끝나고 보유 수량이 바뀌는 순간이에요.",
    check: {
      question: "보유 수량은 보통 언제 바뀔까요?",
      choices: [
        { id: "executed", label: "주문이 체결됐을 때" },
        { id: "typed", label: "검색어를 적었을 때" },
        { id: "opened", label: "화면을 열었을 때" },
      ],
      answerId: "executed",
    },
    adjust: {
      explanation: "주문은 사고팔겠다는 요청이고, 체결은 조건이 맞아 거래가 실제로 끝난 순간이에요. 거래가 끝난 상태를 부르는 말이 체결이에요.",
      question: "사고파는 거래가 실제로 끝난 상태를 무엇이라고 할까요?",
      choices: [
        { id: "execution", label: "체결" },
        { id: "order", label: "주문" },
      ],
      answerId: "execution",
    },
    detail: "체결되기 전까지 주문은 기다리는 상태로 남아 있어요.",
    example: "중고 장터에서 사고 싶은 사람과 팔고 싶은 사람이 조건에 동의한 순간과 비슷해요. 약속이 맞아 거래가 끝난 상태가 체결이에요.",
  }),
  "current-price": termScript("current-price", {
    brief: "현재가는 화면에 표시된 가장 최근 거래 가격이에요.",
    check: {
      question: "현재가는 무엇을 보여줄까요?",
      choices: [
        { id: "recent-price", label: "최근 거래된 가격" },
        { id: "future-price", label: "내일 정해질 가격" },
        { id: "fixed-price", label: "절대 바뀌지 않는 가격" },
      ],
      answerId: "recent-price",
    },
    adjust: {
      explanation: "현재가는 가장 최근에 거래가 이루어진 값이에요. 그래서 새 거래가 생길 때마다 값이 달라질 수 있어요.",
      question: "새 거래가 생기면 현재가는 달라질 수 있을까요?",
      choices: [
        { id: "can-change", label: "달라질 수 있어요" },
        { id: "never-change", label: "바뀌지 않아요" },
      ],
      answerId: "can-change",
    },
    detail: "새 거래가 생길 때마다 달라지는 기록이라 미리 정해 둔 값이 아니에요.",
    example: "운동 경기의 현재 점수가 경기 중에 계속 바뀌는 것과 비슷해요. 화면을 본 시각에 따라 표시된 값이 다를 수 있어요.",
  }),
  quantity: termScript("quantity", {
    brief: "수량은 가격이 아니라 사고팔 주식의 개수를 세는 숫자예요.",
    check: {
      question: "주식 수량은 무엇을 세는 숫자일까요?",
      choices: [
        { id: "share-count", label: "사고팔 주식의 개수" },
        { id: "unit-price", label: "한 주의 가격" },
        { id: "total-amount", label: "전체 주문 금액" },
      ],
      answerId: "share-count",
    },
    adjust: {
      explanation: "주문할 때는 몇 주를 사고팔지 적는 칸이 있어요. 그 칸에 적는 숫자는 가격이 아니라 주식의 개수예요.",
      question: "주문 칸에 적는 수량은 가격일까요, 개수일까요?",
      choices: [
        { id: "count", label: "주식의 개수" },
        { id: "price", label: "한 주의 가격" },
      ],
      answerId: "count",
    },
    detail: "수량에 한 주 가격을 곱하면 대략 필요한 금액을 볼 수 있어요.",
    example: "연필을 몇 자루 살지 정하는 것과 비슷해요. 연필 수가 수량이고, 한 자루 값은 가격이에요.",
  }),
  "estimated-amount": termScript("estimated-amount", {
    brief: "예상 금액은 주문 수량과 가격을 곱해 미리 계산해 본 돈이에요.",
    check: {
      question: "예상 금액을 계산할 때 무엇이 필요할까요?",
      choices: [
        { id: "quantity-price", label: "수량과 주문 가격" },
        { id: "quantity-only", label: "수량만" },
        { id: "cash", label: "쓸 수 있는 현금" },
      ],
      answerId: "quantity-price",
    },
    adjust: {
      explanation: "한 개의 가격과 몇 개를 살지 알면 전체 금액을 미리 계산할 수 있어요. 주식도 한 주 가격과 수량을 곱해 예상 금액을 구해요.",
      question: "전체 금액을 알려면 개수와 무엇이 필요할까요?",
      choices: [
        { id: "unit-price", label: "한 개의 가격" },
        { id: "cash", label: "쓸 수 있는 현금" },
      ],
      answerId: "unit-price",
    },
    detail: "시장가처럼 체결 값이 달라지는 주문은 실제 금액과 차이가 날 수 있어요.",
    example: "연필 한 자루 값에 살 자루 수를 곱해 미리 필요한 돈을 보는 것과 같아요. 주식도 수량과 가격으로 예상 금액을 계산해요.",
  }),
  "evaluation-amount": termScript("evaluation-amount", {
    brief: "평가금액은 지금 가진 주식을 현재 가격으로 계산한 금액이에요.",
    check: {
      question: "평가금액은 무엇을 현재 가격으로 계산할까요?",
      choices: [
        { id: "holding", label: "지금 가진 주식" },
        { id: "future-order", label: "내일 넣을 주문" },
        { id: "cash", label: "쓸 수 있는 현금" },
      ],
      answerId: "holding",
    },
    adjust: {
      explanation: "평가금액은 보유 수량에 지금의 한 주 가격을 곱해 계산해요. 그래서 현재가가 바뀌면 평가금액도 함께 바뀔 수 있어요.",
      question: "현재가가 바뀌면 평가금액도 바뀔 수 있을까요?",
      choices: [
        { id: "can-change", label: "함께 바뀔 수 있어요" },
        { id: "fixed", label: "언제나 그대로예요" },
      ],
      answerId: "can-change",
    },
    detail: "보유 수량에 현재가를 곱해 내므로 가격이 움직이면 함께 바뀌어요.",
    example: "가지고 있는 카드들을 오늘의 카드 값으로 다시 계산하는 것과 비슷해요. 카드 값이 바뀌면 전체 평가금액도 달라져요.",
  }),
  return: termScript("return", {
    brief: "수익률은 처음 금액에 비해 지금 금액이 얼마나 달라졌는지 비율로 보는 값이에요.",
    check: {
      question: "수익률은 무엇을 비교할까요?",
      choices: [
        { id: "start-now", label: "처음 금액과 지금 금액" },
        { id: "cash-now", label: "지금 금액과 남은 현금" },
        { id: "buy-sell", label: "산 주식 수와 판 주식 수" },
      ],
      answerId: "start-now",
    },
    adjust: {
      explanation: "수익률의 기준은 처음 출발한 금액이에요. 지금 금액이 처음 금액에서 얼마나 달라졌는지를 비율로 나타내요.",
      question: "수익률은 지금 금액을 무엇과 비교할까요?",
      choices: [
        { id: "start", label: "처음 출발한 금액" },
        { id: "cash", label: "지갑에 남은 현금" },
      ],
      answerId: "start",
    },
    detail: "크기가 다른 투자도 비율로 견줄 수 있지만 앞으로의 결과를 알려주지는 않아요.",
    example: "서로 다른 길이의 달리기에서 출발점부터 얼마나 이동했는지 비율로 비교하는 것과 비슷해요. 출발한 금액이 기준이 돼요.",
  }),
  "average-price": termScript("average-price", {
    brief: "평균 매수가는 같은 종목을 여러 번 샀을 때 한 주당 평균으로 낸 가격이에요.",
    check: {
      question: "평균 매수가는 무엇을 보여줄까요?",
      choices: [
        { id: "average-cost", label: "한 주당 평균으로 산 가격" },
        { id: "current-price", label: "지금 시장의 현재가" },
        { id: "sell-count", label: "팔린 주식의 개수" },
      ],
      answerId: "average-cost",
    },
    adjust: {
      explanation: "같은 종목을 서로 다른 가격에 여러 번 살 수 있어요. 그때 쓴 돈 전체를 산 주식 수로 나눠 한 주당 평균을 낸 값이 평균 매수가예요.",
      question: "여러 번 산 가격을 한 주당 평균으로 나타낸 값은 무엇일까요?",
      choices: [
        { id: "average-price", label: "평균 매수가" },
        { id: "current", label: "지금의 현재가" },
      ],
      answerId: "average-price",
    },
    detail: "그 종목에 쓴 전체 금액을 산 주식 수로 나눠 구하고, 지금의 현재가와는 달라요.",
    example: "같은 연필을 다른 날 서로 다른 값에 샀다고 해 봐요. 산 연필 전체의 한 자루당 평균값이 평균 매수가와 비슷해요.",
  }),
  sector: termScript("sector", {
    brief: "업종은 주로 하는 일이 비슷한 회사들을 묶은 이름이에요.",
    check: {
      question: "같은 업종의 회사들은 무엇이 비슷할까요?",
      choices: [
        { id: "business", label: "주로 하는 일" },
        { id: "size", label: "회사의 크기" },
        { id: "price-level", label: "주가의 높낮이" },
      ],
      answerId: "business",
    },
    adjust: {
      explanation: "업종은 회사가 하는 일에 따라 묶어요. 게임을 만드는 회사는 게임 업종, 음식을 만드는 회사는 식품 업종이 되는 식이에요.",
      question: "업종은 회사를 무엇으로 나눌까요?",
      choices: [
        { id: "work", label: "하는 일" },
        { id: "alphabet", label: "이름의 첫 글자" },
      ],
      answerId: "work",
    },
    detail: "같은 업종이라도 회사마다 사업 내용과 결과는 다를 수 있어요.",
    example: "도서관에서 과학책과 역사책을 분야별로 묶는 것과 비슷해요. 회사도 하는 일이 비슷하면 같은 업종으로 묶어요.",
  }),
  "market-cap": termScript("market-cap", {
    brief: "시가총액은 현재가에 전체 주식 수를 곱해 낸 회사의 전체 크기예요.",
    check: {
      question: "시가총액을 계산할 때 무엇을 함께 볼까요?",
      choices: [
        { id: "price-shares", label: "현재가와 전체 주식 수" },
        { id: "price-volume", label: "현재가와 거래량" },
        { id: "revenue-staff", label: "매출과 직원 수" },
      ],
      answerId: "price-shares",
    },
    adjust: {
      explanation: "주식 한 조각의 현재 값에 전체 조각 수를 곱하면 조각 전체의 값이 나와요. 그 값이 시장에서 본 회사의 전체 크기예요.",
      question: "모든 조각의 현재 값을 합치면 무엇을 볼 수 있을까요?",
      choices: [
        { id: "company-size", label: "시장에서 본 회사의 전체 크기" },
        { id: "one-share", label: "주식 한 주의 값" },
      ],
      answerId: "company-size",
    },
    detail: "시장에서 본 크기일 뿐 회사의 장점과 단점을 다 말해 주지는 않아요.",
    example: "퍼즐 한 조각의 현재 값에 전체 조각 수를 곱해 퍼즐 전체 값을 보는 것과 비슷해요. 주식 조각 전체의 값이 시가총액이에요.",
  }),
  revenue: termScript("revenue", {
    brief: "매출은 물건이나 서비스를 팔아 받은 돈을 비용 빼기 전에 모두 더한 값이에요.",
    check: {
      question: "매출에서 비용은 이미 모두 빠졌을까요?",
      choices: [
        { id: "not-yet", label: "아직 비용을 빼기 전이에요" },
        { id: "all-removed", label: "모든 비용을 뺀 뒤예요" },
        { id: "no-sales", label: "판매와 관계없어요" },
      ],
      answerId: "not-yet",
    },
    adjust: {
      explanation: "매출은 물건을 팔아 들어온 돈을 먼저 모두 더한 값이에요. 재료비나 월급 같은 비용은 아직 빼지 않은 상태예요.",
      question: "매출은 둘 중 무엇을 가리킬까요?",
      choices: [
        { id: "sales-money", label: "팔아서 들어온 돈 전체" },
        { id: "remaining-profit", label: "비용을 빼고 남은 돈" },
      ],
      answerId: "sales-money",
    },
    detail: "재료비나 월급을 아직 빼지 않아서 매출과 이익은 서로 달라요.",
    example: "학교 장터에서 물건을 팔아 받은 돈을 모두 더한 것이 매출과 비슷해요. 재료를 산 돈을 빼기 전의 값이에요.",
  }),
  "operating-profit": termScript("operating-profit", {
    brief: "영업이익은 회사가 원래 하는 일, 곧 본업으로 번 돈에서 그 일에 든 비용을 뺀 결과예요.",
    check: {
      question: "영업이익을 볼 때 매출에서 무엇을 뺄까요?",
      choices: [
        { id: "business-cost", label: "본업에 든 비용" },
        { id: "stock-count", label: "전체 주식 수" },
        { id: "sold-count", label: "판 물건의 개수" },
      ],
      answerId: "business-cost",
    },
    adjust: {
      explanation: "물건을 팔아 받은 돈에서 재료비와 월급처럼 본업에 쓴 돈을 빼 봐요. 그렇게 남은 본업의 결과가 영업이익이에요.",
      question: "본업으로 번 돈에서 본업 비용을 빼고 남은 결과는 무엇일까요?",
      choices: [
        { id: "operating-profit", label: "영업이익" },
        { id: "revenue", label: "매출" },
      ],
      answerId: "operating-profit",
    },
    detail: "본업의 지난 성적을 보는 값이라 회사의 모든 돈 흐름을 뜻하지는 않아요.",
    example: "주스 가게의 판매금에서 과일값과 가게 운영비를 뺀 결과와 비슷해요. 본업을 운영하고 남은 돈을 보는 거예요.",
  }),
  dividend: termScript("dividend", {
    brief: "배당은 회사가 이익의 일부를 주주에게 나누어 주는 일이에요.",
    check: {
      question: "배당을 받는 대상은 누구일까요?",
      choices: [
        { id: "shareholder", label: "회사의 주주" },
        { id: "all-customer", label: "물건을 산 모든 손님" },
        { id: "worker", label: "회사에서 일하는 사람" },
      ],
      answerId: "shareholder",
    },
    adjust: {
      explanation: "회사가 이익의 일부를 나눠 주는 일을 배당이라고 해요. 받는 사람은 그 회사의 주식을 가진 주주예요.",
      question: "회사가 이익 일부를 주주에게 나누어 주는 일을 무엇이라고 할까요?",
      choices: [
        { id: "dividend", label: "배당" },
        { id: "revenue", label: "매출" },
      ],
      answerId: "dividend",
    },
    detail: "정해진 절차를 거쳐 정하기 때문에 모든 회사가 언제나 배당하지는 않아요.",
    example: "동아리 활동으로 남은 돈 일부를 구성원에게 나누는 모습과 비슷해요. 회사는 이익 일부를 주주에게 나눌 수 있어요.",
  }),
  etf: termScript("etf", {
    brief: "ETF는 여러 회사의 주식 같은 자산을 한 바구니에 담아 거래하는 상품이에요.",
    check: {
      question: "ETF 한 상품 안에는 무엇이 담길 수 있을까요?",
      choices: [
        { id: "many-assets", label: "여러 주식이나 자산" },
        { id: "one-stock", label: "한 회사의 주식만" },
        { id: "future-price", label: "미래 가격의 정답" },
      ],
      answerId: "many-assets",
    },
    adjust: {
      explanation: "ETF는 여러 종류의 자산을 한 상자에 모아 둔 묶음 상품이에요. 물건 하나가 아니라 여러 자산이 함께 들어 있어요.",
      question: "ETF는 하나만 담은 물건일까요, 여러 자산을 묶은 상품일까요?",
      choices: [
        { id: "bundle", label: "여러 자산을 묶은 상품" },
        { id: "one-stock", label: "한 회사의 주식" },
      ],
      answerId: "bundle",
    },
    detail: "여기서 자산은 주식이나 금처럼 값을 매길 수 있는 것을 뜻하고, 무엇이 얼마나 담겼는지는 상품 설명에서 확인해요.",
    example: "여러 맛 과자가 함께 든 묶음 상자와 비슷해요. 상자마다 들어 있는 과자의 종류와 비율이 다를 수 있어요.",
  }),
  index: termScript("index", {
    brief: "지수는 여러 주식의 가격 움직임을 한눈에 보려고 만든 숫자예요.",
    check: {
      question: "주가지수는 보통 무엇의 움직임을 묶어 보여줄까요?",
      choices: [
        { id: "stock-group", label: "여러 주식의 가격" },
        { id: "one-person", label: "한 사람의 수익률" },
        { id: "one-price", label: "한 종목의 가격" },
      ],
      answerId: "stock-group",
    },
    adjust: {
      explanation: "지수는 한 종목이 아니라 여러 종목의 움직임을 묶어 하나의 숫자로 나타내요. 반 친구들의 기록을 모아 반 평균을 내는 것과 같은 방식이에요.",
      question: "지수는 한 종목만 볼까요, 여러 종목을 묶어 볼까요?",
      choices: [
        { id: "many", label: "여러 종목을 묶어 봐요" },
        { id: "one", label: "한 종목만 봐요" },
      ],
      answerId: "many",
    },
    detail: "시장이나 업종의 흐름을 요약할 뿐 한 회사의 값이나 방향을 정해 주지는 않아요.",
    example: "여러 과일의 값을 한 숫자로 묶어 이번 달 과일값이 올랐는지 보는 것과 비슷해요. 사과 한 알의 값이 얼마인지는 따로 봐야 해요.",
  }),
  chart: termScript("chart", {
    brief: "차트는 가격이 어떻게 움직였는지 그림으로 보여주는 지나간 기록이에요.",
    check: {
      question: "주가 차트가 직접 보여주는 것은 무엇일까요?",
      choices: [
        { id: "past-movement", label: "지나간 가격 움직임" },
        { id: "future-answer", label: "미래 가격의 정답" },
        { id: "earnings", label: "회사가 번 돈" },
      ],
      answerId: "past-movement",
    },
    adjust: {
      explanation: "차트에는 이미 지나간 시각과 그때의 가격이 점과 선으로 남아요. 지나간 기록이라서 미래 가격까지 알려 주지는 못해요.",
      question: "지나간 기록만으로 미래 가격을 확정할 수 있을까요?",
      choices: [
        { id: "cannot", label: "확정할 수 없어요" },
        { id: "can", label: "언제나 맞힐 수 있어요" },
      ],
      answerId: "cannot",
    },
    detail: "가로축은 시간, 세로축은 가격이지만 지나간 기록이라 미래를 보장하지는 않아요.",
    example: "지난날의 기온을 선으로 그린 날씨 기록과 비슷해요. 지나간 변화는 볼 수 있지만 다음 날 기온의 정답은 아니에요.",
  }),
  volume: termScript("volume", {
    brief: "거래량은 일정한 동안 사고팔린 주식 수를 나타내는 숫자예요.",
    check: {
      question: "거래량은 무엇을 셀까요?",
      choices: [
        { id: "traded-shares", label: "사고팔린 주식 수" },
        { id: "company-profit", label: "회사가 번 이익" },
        { id: "future-price", label: "앞으로의 주가" },
      ],
      answerId: "traded-shares",
    },
    adjust: {
      explanation: "거래량은 사고팔린 주식 수를 모두 더한 값이에요. 그래서 주식이 많이 거래될수록 거래량은 커져요.",
      question: "많은 주식이 거래되면 거래량은 어떻게 될까요?",
      choices: [
        { id: "larger", label: "거래량이 커져요" },
        { id: "smaller", label: "거래량이 작아져요" },
      ],
      answerId: "larger",
    },
    detail: "거래가 얼마나 활발했는지 알려 줄 뿐 가격 방향까지 알려주지는 않아요.",
    example: "장터에서 하루 동안 주인이 바뀐 카드 수를 세는 것과 비슷해요. 많이 오가면 거래량은 크지만 카드 값의 다음 방향은 따로 알 수 없어요.",
  }),
  volatility: termScript("volatility", {
    brief: "변동성은 가격이 오르내리는 폭이 얼마나 큰지 나타내는 말이에요.",
    check: {
      question: "가격이 크게 오르내리면 변동성은 어떻게 보일까요?",
      choices: [
        { id: "large", label: "변동성이 커 보여요" },
        { id: "small", label: "변동성이 작아 보여요" },
        { id: "none", label: "변동성이 사라져요" },
      ],
      answerId: "large",
    },
    adjust: {
      explanation: "변동성은 가격이 움직인 폭의 크기예요. 폭이 크면 변동성이 크고, 폭이 작으면 변동성도 작아요.",
      question: "가격 변화 폭이 작으면 변동성은 어떨까요?",
      choices: [
        { id: "yes", label: "작아 보여요" },
        { id: "no", label: "더 커 보여요" },
      ],
      answerId: "yes",
    },
    detail: "움직임의 폭을 말할 뿐 오를지 내릴지를 알려주지는 않아요.",
    example: "잔잔한 산책길과 높낮이가 큰 놀이기구를 비교해 봐요. 오르내림의 폭이 큰 쪽이 변동성이 큰 모습과 비슷해요.",
  }),
  risk: termScript("risk", {
    brief: "투자에서 위험은 생각한 것과 다른 결과가 생길 수 있다는 뜻이에요.",
    check: {
      question: "투자 위험은 무엇을 뜻할까요?",
      choices: [
        { id: "uncertain-result", label: "예상과 다른 결과 가능성" },
        { id: "certain-profit", label: "이익이 확정됐다는 뜻" },
        { id: "fixed-price", label: "가격이 고정됐다는 뜻" },
      ],
      answerId: "uncertain-result",
    },
    adjust: {
      explanation: "투자 결과는 미리 확정되지 않고 가격이나 회사 상황에 따라 달라질 수 있어요. 이렇게 생각과 다른 결과가 생길 가능성을 위험이라고 불러요.",
      question: "생각과 다른 결과가 생길 가능성을 무엇이라고 할까요?",
      choices: [
        { id: "risk", label: "위험" },
        { id: "return", label: "수익률" },
      ],
      answerId: "risk",
    },
    detail: "값이 줄거나 원하는 때 거래되지 않는 것처럼 무엇이 달라질 수 있는지 살펴보면 돼요.",
    example: "소풍날 비가 올 수도 있는 것처럼 결과가 계획과 달라질 가능성이 있어요. 가능성을 미리 알고 살펴보는 것이 위험을 이해하는 출발점이에요.",
  }),
} satisfies Record<string, ExplainScript>;

/**
 * 화면 용어의 진단 퀴즈 (SPEC §3.4).
 *
 * 예전에는 22개 용어가 `screenTermScript` 하나에서 **똑같은 껍데기 질문**을 받았다
 * ("이 말은 화면의 무엇을 확인하는 데 쓰일까요?"). 용어가 무엇이든 질문이 같아
 * "전체 자산이 뭐야?" 에 그 메타 질문으로 되물었고, 조정 설명은 "이건 맞히는
 * 시험이 아니에요" 라 **정답 근거가 하나도 없었다**(§3.4가 요구하는 것과 정반대).
 *
 * 각 용어의 `brief` 는 대부분 "A 이지 B 는 아니다" 꼴이라 그 대조가 곧 진단
 * 질문이다. 오답 선택지는 아이가 실제로 할 만한 오해로 채운다.
 */
type ScreenTermQuiz = ExplainScript["check"] & {
  adjust: NonNullable<ExplainScript["adjust"]>;
  /**
   * 정답을 맞힌 아이가 받는 한 문장. 22개 용어가 "화면에 이미 있는 값을 가리키는
   * 말이라…" 하나를 함께 쓰던 자리다. `detail` 은 **정답 경로**라 거의 모든 아이가
   * 지나가는데, 용어가 무엇이든 같은 말이 나오니 맞힌 보상이 남의 이야기가 됐다.
   * 모의투자·시즌·주문 잠금·어린이 뉴스·성향처럼 "화면의 값"이 아닌 용어에는
   * 사실도 맞지 않았다. 용어마다 `brief` 에 **덧붙는 새 내용**을 쓴다.
   */
  detail: string;
  /**
   * 두 번 틀린 아이가 마지막에 받는 비유. 조정 설명에서 이미 쓴 비유를 되풀이하지
   * 않는다 — 가장 헤맨 아이에게 방금 실패한 그림을 다시 내미는 셈이 된다.
   */
  example: string;
};

const SCREEN_TERM_QUIZZES: Record<string, ScreenTermQuiz> = {
  "mock-investing": {
    question: "모의투자에서는 어떤 돈을 쓸까요?",
    choices: [
      { id: "virtual", label: "연습용 가상 돈" },
      { id: "real", label: "내 통장의 진짜 돈" },
      { id: "prize", label: "받은 상금" },
    ],
    answerId: "virtual",
    adjust: {
      explanation: "모의투자는 연습이라 실제 돈이 빠져나가지 않아요. 화면에 보이는 금액은 모두 연습용 가상 돈이에요.",
      question: "모의투자로 산 주식은 실제로 갖게 될까요?",
      choices: [
        { id: "no", label: "실제로는 갖지 않아요" },
        { id: "yes", label: "실제로 갖게 돼요" },
      ],
      answerId: "no",
    },
    detail: "돈은 연습용이지만 사고판 기록은 그대로 남아서 나중에 내가 어떻게 했는지 다시 볼 수 있어요.",
    example: "체육 시간에 진짜 경기 전에 연습 경기를 해 보는 것과 비슷해요. 점수는 남지만 진짜 대회 기록이 되지는 않아요.",
  },
  "total-assets": {
    question: "전체 자산에는 무엇이 함께 들어갈까요?",
    choices: [
      { id: "both", label: "현금과 주식 값어치를 합친 값" },
      { id: "cash", label: "쓸 수 있는 현금만" },
      { id: "stock", label: "가진 주식만" },
    ],
    answerId: "both",
    adjust: {
      explanation: "전체 자산은 쓸 수 있는 현금과 가진 주식의 값어치, 기다리는 주문에 맡겨 둔 금액을 모두 더한 값이에요. 한 가지만 보는 값이 아니에요.",
      question: "전체 자산은 한 가지만 볼까요, 모두 더할까요?",
      choices: [
        { id: "sum", label: "모두 더해요" },
        { id: "one", label: "현금만 봐요" },
      ],
      answerId: "sum",
    },
    detail: "주식을 사고팔지 않아도 가진 주식의 값이 움직이면 이 숫자는 달라져요.",
    example: "저금통에 든 동전과 서랍에 넣어 둔 지폐를 함께 세어 보는 것과 비슷해요. 한쪽만 세면 실제보다 적어 보여요.",
  },
  "available-cash": {
    question: "기다리는 주문에 맡겨 둔 돈도 쓸 수 있는 돈에 들어 있을까요?",
    choices: [
      { id: "excluded", label: "빠져 있어요" },
      { id: "included", label: "그대로 들어 있어요" },
      { id: "double", label: "두 번 들어가요" },
    ],
    answerId: "excluded",
    adjust: {
      explanation: "기다리는 주문에 맡긴 돈은 체결되거나 취소되기 전까지 잠겨 있어요. 그래서 지금 쓸 수 있는 돈에서는 빠져 있어요.",
      question: "그 주문을 취소하면 맡긴 돈은 어떻게 될까요?",
      choices: [
        { id: "back", label: "다시 쓸 수 있게 돌아와요" },
        { id: "gone", label: "그대로 없어져요" },
      ],
      answerId: "back",
    },
    detail: "그래서 전체 자산보다 작을 수 있고, 새 주문을 넣을 수 있는지는 이 숫자로 확인해요.",
    example: "용돈 중에 이미 친구와 쓰기로 약속한 몫을 빼고 남은 돈만 오늘 쓸 수 있는 것과 비슷해요.",
  },
  holdings: {
    question: "아직 체결되지 않은 주문도 가진 회사에 들어갈까요?",
    choices: [
      { id: "no", label: "들어가지 않아요" },
      { id: "yes", label: "들어가요" },
      { id: "half", label: "절반만 들어가요" },
    ],
    answerId: "no",
    adjust: {
      explanation: "가진 회사는 체결이 끝나 실제로 주식을 갖게 된 회사만 세요. 기다리는 주문은 아직 체결 전이라 여기에 없어요.",
      question: "가진 회사에 들어가려면 무엇이 끝나야 할까요?",
      choices: [
        { id: "filled", label: "주문이 체결되어야 해요" },
        { id: "placed", label: "주문만 넣으면 돼요" },
      ],
      answerId: "filled",
    },
    detail: "같은 회사를 여러 번 나눠 사도 가진 회사에는 하나로 모여서 보여요.",
    example: "택배를 주문한 것과 상자가 집에 도착한 것은 달라요. 지금 열어 볼 수 있는 것은 도착한 상자뿐이에요.",
  },
  "pending-order": {
    question: "기다리는 주문은 어떤 상태일까요?",
    choices: [
      { id: "waiting", label: "아직 체결되지 않은 상태" },
      { id: "done", label: "이미 체결이 끝난 상태" },
      { id: "cancelled", label: "취소가 끝난 상태" },
    ],
    answerId: "waiting",
    adjust: {
      explanation: "기다리는 주문은 정한 조건이 아직 맞지 않아 체결되지 않았어요. 기다리는 동안 금액이나 수량이 잠시 예약돼요.",
      question: "기다리는 동안 그 금액이나 수량은 어떻게 될까요?",
      choices: [
        { id: "reserved", label: "잠시 예약돼요" },
        { id: "gone", label: "그냥 없어져요" },
      ],
      answerId: "reserved",
    },
    detail: "정한 값에 거래할 상대가 나타나지 않으면 계속 기다리는 상태로 남아 있어요.",
    example: "빈자리가 날 때까지 이름을 적어 두고 기다리는 것과 비슷해요. 차례가 와야 자리에 앉을 수 있어요.",
  },
  "order-cancel": {
    question: "이미 체결된 주문도 취소할 수 있을까요?",
    choices: [
      { id: "no", label: "취소할 수 없어요" },
      { id: "yes", label: "언제든 취소할 수 있어요" },
      { id: "later", label: "다음 날 취소돼요" },
    ],
    answerId: "no",
    adjust: {
      explanation: "체결은 거래가 이미 끝난 상태라 되돌릴 수 없어요. 취소는 아직 기다리는 주문에만 할 수 있어요.",
      question: "그럼 취소할 수 있는 주문은 어떤 것일까요?",
      choices: [
        { id: "pending", label: "아직 기다리는 주문" },
        { id: "filled", label: "이미 체결된 주문" },
      ],
      answerId: "pending",
    },
    detail: "취소는 기다리는 주문 목록에서 하고, 돌아온 돈은 다시 쓸 수 있는 돈에 더해져요.",
    example: "아직 안 보낸 메시지는 지울 수 있지만 이미 보낸 메시지는 되돌릴 수 없는 것과 비슷해요.",
  },
  "sell-proceeds": {
    question: "받게 되는 돈은 무엇을 곱해 계산할까요?",
    choices: [
      { id: "qty-price", label: "팔 수량과 예상 체결 가격" },
      { id: "cash-count", label: "남은 현금과 가진 회사 수" },
      { id: "buy-now", label: "처음 산 가격과 지금 가격" },
    ],
    answerId: "qty-price",
    adjust: {
      explanation: "받게 되는 돈은 몇 주를 얼마에 파는지로 계산해요. 그래서 팔 수량과 예상 체결 가격이 함께 필요해요.",
      question: "계산에 꼭 필요한 두 가지는 무엇일까요?",
      choices: [
        { id: "qty-price", label: "팔 수량과 가격" },
        { id: "buy-now", label: "처음 산 가격과 지금 가격" },
      ],
      answerId: "qty-price",
    },
    detail: "예상해 본 값이라 실제로 체결된 가격이 다르면 받는 돈도 달라져요.",
    example: "붕어빵 몇 개에 얼마인지 곱해서 낼 돈을 미리 세어 보는 것과 비슷해요. 가게에 가면 값이 올라 있기도 해요.",
  },
  "goal-price": {
    question: "이 값을 적어 두면 그 값이 됐을 때 자동으로 팔릴까요?",
    choices: [
      { id: "no", label: "자동으로 팔리지 않아요" },
      { id: "yes", label: "그 값이 되면 자동으로 팔려요" },
      { id: "now", label: "적는 순간 바로 팔려요" },
    ],
    answerId: "no",
    adjust: {
      explanation: "이 값은 나중에 다시 보려고 스스로 적어 두는 기록이에요. 주문이 아니라서 저절로 거래되지 않아요.",
      question: "그럼 이 값은 주문일까요, 나를 위한 기록일까요?",
      choices: [
        { id: "note", label: "나를 위한 기록" },
        { id: "order", label: "저절로 도는 주문" },
      ],
      answerId: "note",
    },
    detail: "적어 둔 값은 가족 기록에도 함께 보이고, 그 값이 되어도 알림이 오거나 주문이 나가지 않아요.",
    example: "공책에 '여기까지 오면 다시 생각해 보자'고 적어 두는 것과 비슷해요. 적었다고 저절로 무슨 일이 생기지는 않아요.",
  },
  "holding-period": {
    question: "적어 둔 보유 기간이 지나면 자동으로 팔릴까요?",
    choices: [
      { id: "no", label: "자동으로 팔리지 않아요" },
      { id: "yes", label: "그날 자동으로 팔려요" },
      { id: "cancel", label: "주문이 취소돼요" },
    ],
    answerId: "no",
    adjust: {
      explanation: "보유 기간은 얼마나 오래 가질지 스스로 생각해 둔 계획이에요. 꼭 지켜야 하는 약속도, 자동으로 파는 조건도 아니에요.",
      question: "그럼 보유 기간은 약속일까요, 내 계획일까요?",
      choices: [
        { id: "plan", label: "내 계획" },
        { id: "promise", label: "꼭 지켜야 하는 약속" },
      ],
      answerId: "plan",
    },
    detail: "기간이 지나도 알림이 오지 않고, 생각이 바뀌면 언제든 다시 정할 수 있어요.",
    example: "방학 계획표에 며칠 동안 무엇을 할지 적어 두는 것과 비슷해요. 계획이라서 바꿔도 괜찮아요.",
  },
  "buy-day-record": {
    question: "사던 날의 나는 무엇을 다시 보여줄까요?",
    choices: [
      { id: "my-note", label: "처음 주문할 때 남긴 내 기록" },
      { id: "future", label: "앞으로의 가격" },
      { id: "others", label: "다른 사람의 기록" },
    ],
    answerId: "my-note",
    adjust: {
      explanation: "사던 날의 나는 처음 주문할 때 남긴 이유와 보유기간을 그대로 다시 보여줘요. 지금 생각과 무엇이 달라졌는지 돌아보는 화면이에요.",
      question: "여기 보이는 것은 누구의 기록일까요?",
      choices: [
        { id: "mine", label: "처음 주문할 때의 내 기록" },
        { id: "others", label: "다른 사람의 기록" },
      ],
      answerId: "mine",
    },
    detail: "그때 적은 내용은 고쳐 쓰지 않고 그대로 두기 때문에 지금 생각과 나란히 견줄 수 있어요.",
    example: "학기 초에 쓴 목표 쪽지를 학기 말에 다시 꺼내 읽는 것과 비슷해요. 그때와 지금이 얼마나 달라졌는지 보여요.",
  },
  "plan-badge": {
    question: "계획 실천 배지는 무엇을 보고 줄까요?",
    choices: [
      { id: "plan", label: "처음 계획대로 팔았는지" },
      { id: "profit", label: "얼마나 많이 벌었는지" },
      { id: "speed", label: "얼마나 빨리 팔았는지" },
    ],
    answerId: "plan",
    adjust: {
      explanation: "이 배지는 처음 남긴 매도 계획과 맞게 팔았는지만 봐요. 얼마를 벌었는지는 배지와 상관없어요.",
      question: "그럼 많이 벌면 배지를 받을 수 있을까요?",
      choices: [
        { id: "plan", label: "계획대로 팔아야 받아요" },
        { id: "profit", label: "많이 벌면 받아요" },
      ],
      answerId: "plan",
    },
    detail: "손해가 난 거래여도 처음 계획대로 팔았다면 이 배지를 받을 수 있어요.",
    example: "정해 둔 시간에 맞춰 숙제를 끝냈는지만 확인하는 표와 비슷해요. 몇 점을 받았는지는 따로예요.",
  },
  "delayed-price": {
    question: "화면에 보이는 값은 지금 시장 값과 같을까요?",
    choices: [
      { id: "late", label: "약 15분 늦어서 다를 수 있어요" },
      { id: "same", label: "언제나 똑같아요" },
      { id: "early", label: "15분 빨라요" },
    ],
    answerId: "late",
    adjust: {
      explanation: "화면의 값은 실제 시장보다 약 15분 늦게 도착해요. 그래서 지금 시장에서 거래되는 값과 다를 수 있어요.",
      question: "그럼 화면의 값은 시장보다 빠를까요, 늦을까요?",
      choices: [
        { id: "late", label: "약 15분 늦어요" },
        { id: "early", label: "약 15분 빨라요" },
      ],
      answerId: "late",
    },
    detail: "그래서 화면을 새로 고쳐도 방금 시장에서 정해진 값이 바로 보이지는 않아요.",
    example: "멀리서 오는 편지처럼 소식이 도착하는 데 시간이 걸리는 것과 비슷해요. 읽는 순간에는 이미 조금 지난 이야기예요.",
  },
  "child-news": {
    question: "어린이 뉴스는 무엇을 알려 줄까요?",
    choices: [
      { id: "events", label: "회사와 시장에서 있었던 일" },
      { id: "price", label: "앞으로의 가격" },
      { id: "advice", label: "사고파는 답" },
    ],
    answerId: "events",
    adjust: {
      explanation: "어린이 뉴스는 있었던 일을 쉽게 풀어 요약한 내용이에요. 원문 보기에서 참고한 자료도 직접 확인할 수 있어요.",
      question: "뉴스에서 확인할 수 있는 것은 무엇일까요?",
      choices: [
        { id: "events", label: "있었던 일과 참고한 자료" },
        { id: "advice", label: "사고파는 답" },
      ],
      answerId: "events",
    },
    detail: "같은 일이라도 뉴스마다 다루는 부분이 달라서 원문까지 보면 더 자세히 알 수 있어요.",
    example: "학교 소식지가 지난주에 있었던 행사를 알려 주는 것과 비슷해요. 무엇을 할지까지 정해 주지는 않아요.",
  },
  season: {
    question: "지금 한 시즌은 얼마 동안일까요?",
    choices: [
      { id: "four-weeks", label: "4주" },
      { id: "one-day", label: "하루" },
      { id: "one-year", label: "1년" },
    ],
    answerId: "four-weeks",
    adjust: {
      explanation: "지금 한 시즌은 4주 동안 이어져요. 남은 기간은 홈의 시즌 진행 표시에서 볼 수 있어요.",
      question: "남은 기간은 어디에서 볼 수 있을까요?",
      choices: [
        { id: "home", label: "홈의 시즌 진행 표시" },
        { id: "order", label: "주문 화면" },
      ],
      answerId: "home",
    },
    detail: "시즌이 끝나면 그동안 쌓인 기록을 모아 한 번에 다시 볼 수 있어요.",
    example: "한 학기처럼 시작과 끝이 정해진 기간과 비슷해요. 그 사이의 기록이 모여 하나로 남아요.",
  },
  "trade-lock": {
    question: "주문 잠금 동안에도 할 수 있는 것은 무엇일까요?",
    choices: [
      { id: "browse", label: "회사와 차트, 뉴스 보기" },
      { id: "order", label: "새 주문 넣기" },
      { id: "nothing", label: "아무것도 못 해요" },
    ],
    answerId: "browse",
    adjust: {
      explanation: "주문 잠금은 정해진 시간 동안 새 주문만 잠시 막아요. 회사와 차트, 뉴스를 보는 것은 그대로 할 수 있어요.",
      question: "그럼 주문 잠금이 막는 것은 무엇일까요?",
      choices: [
        { id: "order", label: "새 주문" },
        { id: "all", label: "화면 보기 전부" },
      ],
      answerId: "order",
    },
    detail: "정한 시간이 지나면 잠금이 풀리고 새 주문을 다시 넣을 수 있어요.",
    example: "도서관에서 책은 계속 읽을 수 있지만 대출 창구만 잠시 닫아 두는 것과 비슷해요.",
  },
  ranking: {
    question: "랭킹에서 높은 순위는 무엇을 뜻할까요?",
    choices: [
      { id: "return", label: "그 기간 수익률이 높았다는 것" },
      { id: "habit", label: "더 좋은 투자 습관" },
      { id: "profile", label: "더 좋은 성향" },
    ],
    answerId: "return",
    adjust: {
      explanation: "랭킹은 그 기간의 수익률을 순서대로 늘어놓은 것뿐이에요. 순위가 높다고 습관이나 성향이 더 좋다는 뜻은 아니에요.",
      question: "그럼 순위가 높으면 습관도 더 좋은 걸까요?",
      choices: [
        { id: "no", label: "그런 뜻은 아니에요" },
        { id: "yes", label: "습관도 더 좋아요" },
      ],
      answerId: "no",
    },
    detail: "보는 기간을 바꾸면 순서도 달라져서 한 번의 순위가 끝을 뜻하지 않아요.",
    example: "달리기 한 번의 등수와 비슷해요. 그날의 결과일 뿐 다음에는 달라질 수 있어요.",
  },
  "family-feed": {
    question: "가족 기록에 보이는 거래 가격은 무엇일까요?",
    choices: [
      { id: "per-share", label: "주식 한 주당 가격" },
      { id: "total", label: "전체 거래 금액" },
      { id: "cash", label: "남은 현금" },
    ],
    answerId: "per-share",
    adjust: {
      explanation: "가족 기록의 거래 가격은 한 주에 얼마였는지를 보여줘요. 수량까지 곱한 전체 거래 금액과는 다른 값이에요.",
      question: "그럼 그 값은 한 주 값일까요, 전체 금액일까요?",
      choices: [
        { id: "per-share", label: "한 주 값" },
        { id: "total", label: "전체 금액" },
      ],
      answerId: "per-share",
    },
    detail: "가격만이 아니라 가족이 그때 남긴 생각도 함께 보여서 같은 회사를 왜 다르게 봤는지 알 수 있어요.",
    example: "같은 영화를 본 가족이 각자 감상을 적어 둔 공책과 비슷해요. 같은 것을 봐도 남긴 말은 서로 달라요.",
  },
  "profile-abilities": {
    question: "정확력은 무엇을 바탕으로 볼까요?",
    choices: [
      { id: "direction", label: "거래 뒤 가격이 간 방향" },
      { id: "profit", label: "번 돈의 크기" },
      { id: "count", label: "거래한 횟수" },
    ],
    answerId: "direction",
    adjust: {
      explanation: "정확력은 거래하고 장이 두 번 열린 뒤 가격이 어느 쪽으로 갔는지를 봐요. 얼마를 벌었는지로 매기는 값이 아니에요.",
      question: "그럼 정확력은 번 돈으로 정해질까요?",
      choices: [
        { id: "direction", label: "가격 방향으로 봐요" },
        { id: "profit", label: "번 돈으로 정해요" },
      ],
      answerId: "direction",
    },
    detail: "다섯 가지 모두 이번 시즌 기록으로만 계산해서, 기록이 없으면 5점이에요.",
    example: "운동회 기록표에 달리기·던지기를 따로 적어 두는 것과 비슷해요. 항목마다 보는 것이 달라서 하나로 합쳐 순위를 매기지 않아요.",
  },
  "profile-definition": {
    question: "성향은 실력을 재는 검사일까요?",
    choices: [
      { id: "record", label: "검사가 아니라 행동 기록이에요" },
      { id: "skill", label: "실력을 재는 검사예요" },
      { id: "personality", label: "성격을 재는 검사예요" },
    ],
    answerId: "record",
    adjust: {
      explanation: "성향은 이번 시즌에 어떻게 행동했는지를 몇 가지 특징으로 나눈 결과예요. 실력이나 성격을 채점하는 검사가 아니에요.",
      question: "그럼 기록이 더 쌓이면 성향은 어떻게 될까요?",
      choices: [
        { id: "change", label: "바뀔 수 있어요" },
        { id: "fixed", label: "한 번 정해지면 그대로예요" },
      ],
      answerId: "change",
    },
    detail: "다음 시즌에 다르게 움직이면 결과도 다르게 나와요.",
    example: "이번 달에 어떤 책을 많이 읽었는지 정리해 둔 표와 비슷해요. 다음 달에 다른 책을 읽으면 표도 달라져요.",
  },
  "profile-status": {
    question: "관찰 중은 어떤 상태를 뜻할까요?",
    choices: [
      { id: "few", label: "아직 매수 기록이 부족한 상태" },
      { id: "bad", label: "성향이 나쁘다는 뜻" },
      { id: "locked", label: "계정이 잠긴 상태" },
    ],
    answerId: "few",
    adjust: {
      explanation: "관찰 중은 성향을 정할 만큼 체결된 매수 기록이 아직 쌓이지 않았다는 뜻이에요. 잘못했다는 표시가 아니에요.",
      question: "그럼 관찰 중은 무엇이 부족하다는 뜻일까요?",
      choices: [
        { id: "record", label: "쌓인 기록" },
        { id: "skill", label: "투자 실력" },
      ],
      answerId: "record",
    },
    detail: "2거래일은 장이 열리는 날로 이틀이라는 뜻이라, 사이에 주말이나 쉬는 날이 끼면 더 걸려요.",
    example: "사진이 몇 장 모여야 앨범을 만들 수 있는 것과 비슷해요. 장수가 차면 앨범이 만들어져요.",
  },
  "profile-character": {
    question: "네 가지 성향 캐릭터 중에 더 좋은 것이 있을까요?",
    choices: [
      { id: "none", label: "더 좋은 것은 없어요" },
      { id: "last", label: "마지막 것이 가장 좋아요" },
      { id: "first", label: "첫 번째가 가장 좋아요" },
    ],
    answerId: "none",
    adjust: {
      explanation: "성향 캐릭터는 이번 시즌 행동을 근거·직관과 집중·분산의 조합으로 표현한 모습이에요. 네 모습 사이에 더 좋고 나쁨은 없어요.",
      question: "그럼 캐릭터는 시즌마다 어떻게 될까요?",
      choices: [
        { id: "change", label: "달라질 수 있어요" },
        { id: "fixed", label: "한 번 정해지면 그대로예요" },
      ],
      answerId: "change",
    },
    detail: "두 축을 각각 어느 쪽으로 많이 움직였는지에 따라 네 모습 가운데 하나가 정해져요.",
    example: "좋아하는 색과 좋아하는 계절을 짝지어 이름을 붙이는 것과 비슷해요. 짝이 다르면 이름이 다를 뿐 더 좋은 짝은 없어요.",
  },
};

// 8월 14일에 추가한 화면 용어도 용어별 DAPIE 흐름으로 설명한다.
function screenTermScript(id: string, brief: string): ExplainScript {
  const quiz = SCREEN_TERM_QUIZZES[id];
  // 퀴즈 없이 화면 용어를 늘리면 예전의 껍데기 질문으로 되돌아간다. 조용히
  // 넘기지 않고 조립 단계에서 멈춘다 — 정적 테스트가 이 목록을 함께 지킨다.
  if (!quiz) throw new Error(`screen term quiz missing: ${id}`);
  return termScript(id, {
    brief,
    check: { question: quiz.question, choices: quiz.choices, answerId: quiz.answerId },
    adjust: quiz.adjust,
    // 용어마다 따로 쓴다. 공용 한 문장을 두면 맞힌 아이가 받는 보상이 22개 용어에서
    // 같아지고, 화면의 값이 아닌 용어에는 사실도 어긋난다 (SPEC §3.4.4).
    detail: quiz.detail,
    example: quiz.example,
  });
}

const CHART_EXPLAIN_SCRIPTS: Record<string, ExplainScript> = {
  "line-chart": termScript("line-chart", { brief: "선차트는 정해 둔 시간마다의 가격을 선으로 이어 보여주는 차트예요.", check: { question: "선차트에서 이어지는 것은 무엇일까요?", choices: [{ id: "price", label: "가격의 흐름" }, { id: "volume", label: "거래량의 흐름" }, { id: "news", label: "뉴스가 나온 때" }], answerId: "price" }, adjust: { explanation: "선차트는 시간마다의 가격 점을 선으로 이은 그림이에요. 선을 따라가면 가격이 어떻게 움직였는지 흐름을 읽기 쉬워요.", question: "선차트의 선은 무엇의 흐름을 보여줄까요?", choices: [{ id: "price", label: "가격" }, { id: "volume", label: "거래량" }], answerId: "price" }, detail: "선차트는 가격이 어떻게 움직였는지 보기 위한 그림이에요. 다음 가격을 알려 주는 그림은 아니에요.", example: "점들을 연필로 이어 그린 선처럼, 시간마다의 가격 점을 연결한 모습이에요." }),
  "candle-chart": termScript("candle-chart", { brief: "캔들차트는 한 기간의 시작값, 끝값, 가장 높고 낮은 값을 막대로 보여주는 차트예요.", check: { question: "캔들 하나는 무엇을 함께 보여줄까요?", choices: [{ id: "four-prices", label: "시작·끝·높음·낮음" }, { id: "open-close", label: "시작값과 끝값만" }, { id: "volume", label: "그 기간의 거래량" }], answerId: "four-prices" }, adjust: { explanation: "캔들 하나에는 한 기간 안에서 가격이 어디서 시작해 어디까지 움직였는지 담겨요. 그 기간의 가격 움직임을 막대 하나로 보는 거예요.", question: "캔들 하나가 담는 것은 무엇일까요?", choices: [{ id: "range", label: "그 기간의 가격 움직임" }, { id: "volume", label: "그 기간의 거래량" }], answerId: "range" }, detail: "캔들의 몸통과 꼬리는 과거 한 기간 안의 가격 범위를 보여줘요. 다음 가격을 알려 주지는 않아요.", example: "하루 동안 가장 높았던 곳과 낮았던 곳을 표시한 막대라고 보면 돼요." }),
  "minute-chart": termScript("minute-chart", { brief: "분봉은 막대 하나가 몇 분 동안의 가격 움직임을 보여주는 차트예요.", check: { question: "분봉 한 개는 어느 기간을 나타낼까요?", choices: [{ id: "minutes", label: "몇 분" }, { id: "day", label: "하루" }, { id: "week", label: "한 주" }], answerId: "minutes" }, adjust: { explanation: "분봉의 '분'은 시계의 분처럼 짧은 시간을 뜻해요. 그래서 분봉은 시간을 짧은 몇 분 단위로 나눠서 봐요.", question: "분봉은 시간을 어떻게 나눌까요?", choices: [{ id: "short", label: "짧은 몇 분" }, { id: "long", label: "몇 달" }], answerId: "short" }, detail: "몇 분으로 나누는 방법만 다를 뿐, 과거 가격을 보는 차트라는 점은 같아요.", example: "수업 시간을 몇 분 단위로 나눠 보는 시간표와 비슷해요." }),
  "daily-chart": termScript("daily-chart", { brief: "일봉은 막대 하나가 하루 동안의 가격 움직임을 보여주는 차트예요.", check: { question: "일봉 한 개는 어느 기간을 나타낼까요?", choices: [{ id: "day", label: "하루" }, { id: "minutes", label: "몇 분" }, { id: "week", label: "한 주" }], answerId: "day" }, adjust: { explanation: "일봉의 '일'은 하루를 뜻해요. 그래서 일봉은 하루의 가격 움직임을 막대 하나로 묶어서 봐요.", question: "일봉은 무엇을 한 묶음으로 볼까요?", choices: [{ id: "day", label: "하루" }, { id: "month", label: "한 달" }], answerId: "day" }, detail: "하루 안의 시작값과 끝값, 높고 낮은 값을 한 막대에 담아요. 지나간 하루의 흐름을 보는 그림이에요.", example: "하루 일기를 한 장으로 정리하듯, 하루 가격 움직임을 막대 하나로 보는 거예요." }),
  "weekly-chart": termScript("weekly-chart", { brief: "주봉은 막대 하나가 한 주 동안의 가격 움직임을 보여주는 차트예요.", check: { question: "주봉 한 개는 어느 기간을 나타낼까요?", choices: [{ id: "week", label: "한 주" }, { id: "day", label: "하루" }, { id: "minutes", label: "몇 분" }], answerId: "week" }, adjust: { explanation: "주봉의 '주'는 한 주를 뜻해요. 그래서 주봉은 한 주의 가격 움직임을 막대 하나로 묶어서 봐요.", question: "주봉은 무엇을 한 묶음으로 볼까요?", choices: [{ id: "week", label: "한 주" }, { id: "hour", label: "한 시간" }], answerId: "week" }, detail: "한 주의 가격 움직임을 한 막대에 담아요. 더 긴 과거 흐름을 살펴볼 때 써요.", example: "한 주 동안의 기록을 한 칸에 모아 보는 달력과 비슷해요." }),
};

/**
 * 아이 질문 시뮬레이션 600건에서 사전이 못 잡던 단일 용어들 (2026-08-15 보강).
 * 규칙·계산·비교를 묻는 복합 질문은 SPEC §3.4대로 고정 응답이 맡고, 여기에는
 * "그 말이 무슨 뜻이야?"로 답할 수 있는 것만 넣는다.
 */
const ADDED_TERM_SCRIPTS: Record<string, ExplainScript> = {
  "stock-price": termScript("stock-price", {
    brief: "주가는 주식 한 주에 붙은 지금 가격이에요.",
    check: {
      question: "주가는 무엇의 가격일까요?",
      choices: [
        { id: "one-share", label: "주식 한 주" },
        { id: "building", label: "회사 건물" },
        { id: "product", label: "회사가 파는 물건" },
      ],
      answerId: "one-share",
    },
    adjust: {
      explanation: "주가는 회사 전체 값이 아니라 주식 한 주에 붙은 값이에요.",
      question: "그럼 주가는 한 주에 붙는 값일까요?",
      choices: [
        { id: "yes", label: "한 주에 붙어요" },
        { id: "no", label: "회사 전체 값이에요" },
      ],
      answerId: "yes",
    },
    detail: "사고팔려는 주문이 만나 정해지기 때문에 하루에도 여러 번 바뀌어요.",
    example: "문구점에서 같은 공책 값이 날마다 달라진다고 생각해 봐요. 주가도 그날의 거래에 따라 달라져요.",
  }),
  "stop-loss": termScript("stop-loss", {
    brief: "손절은 손해를 더 키우지 않으려고 파는 것을 부르는 말이에요.",
    check: {
      question: "손절은 어떤 상황을 부르는 말일까요?",
      choices: [
        { id: "cut", label: "손해를 줄이려고 파는 것" },
        { id: "profit", label: "이익이 나서 파는 것" },
        { id: "hold", label: "그대로 갖고 있는 것" },
      ],
      answerId: "cut",
    },
    adjust: {
      explanation: "손절은 산 값보다 값이 내려갔을 때 파는 쪽을 가리키는 말이에요.",
      question: "그럼 손절은 값이 내려갔을 때 쓰는 말일까요?",
      choices: [
        { id: "yes", label: "내려갔을 때예요" },
        { id: "no", label: "올랐을 때예요" },
      ],
      answerId: "yes",
    },
    detail: "언제 파는지는 사람마다 달라서 저는 파는 때를 정해 줄 수 없어요.",
    example: "놀이에서 더 지기 전에 판을 접는 것과 비슷해요. 다만 언제 접을지는 스스로 정해요.",
  }),
  "net-interest-margin": termScript("net-interest-margin", {
    brief: "예대마진은 은행이 받은 이자와 준 이자의 차이예요.",
    check: {
      question: "예대마진은 무엇의 차이일까요?",
      choices: [
        { id: "interest", label: "받은 이자와 준 이자" },
        { id: "total-earn", label: "은행이 번 돈 전체" },
        { id: "amount", label: "예금과 대출의 크기" },
      ],
      answerId: "interest",
    },
    adjust: {
      explanation: "은행은 맡아 준 돈에 이자를 주고, 빌려준 돈에서 이자를 받아요. 그 두 이자의 차이가 예대마진이에요.",
      question: "그럼 예대마진은 이자끼리의 차이일까요?",
      choices: [
        { id: "yes", label: "이자끼리의 차이예요" },
        { id: "no", label: "돈의 크기 차이예요" },
      ],
      answerId: "yes",
    },
    detail: "은행이 돈을 버는 방법 가운데 하나이고 수익 구성은 은행마다 달라요.",
    example: "연필을 빌리며 사탕 하나를 주고, 다른 친구에게 빌려주며 사탕 둘을 받으면 그 차이가 남는 몫이에요.",
  }),
  "reason-tag": termScript("reason-tag", {
    brief: "투자 근거는 그 회사를 고른 이유를 골라 두는 기록이에요.",
    check: {
      question: "투자 근거는 무엇을 남기는 걸까요?",
      // 오답 보기에도 금지표현 규칙이 걸린다. "오를 가능성"은 예측 패턴이라 쓸 수 없다.
      choices: [
        { id: "why", label: "고른 이유" },
        { id: "future", label: "앞으로의 가격" },
        { id: "date", label: "산 날짜" },
      ],
      answerId: "why",
    },
    adjust: {
      explanation: "투자 근거는 정답을 맞히는 칸이 아니라 그때 생각을 적어 두는 칸이에요.",
      question: "그럼 투자 근거는 점수를 매기는 걸까요?",
      choices: [
        { id: "no", label: "점수가 아니에요" },
        { id: "yes", label: "점수를 매겨요" },
      ],
      answerId: "no",
    },
    detail: "나중에 아카이브에서 그때 생각을 다시 볼 수 있어요.",
    example: "일기에 왜 그렇게 했는지 한 줄 적어 두는 것과 비슷해요. 나중에 읽으면 그때 마음이 보여요.",
  }),
};

// `season-record` 는 여기 없다. 매수·매도·메모·열람 건수를 모아 보여주는 화면이
// 앱에 없어서 용어를 설명하면 있는 줄 안다 — `orderbook-unsupported` 와 같은
// 이유로 "없다"를 말하는 단답만 남겼다(§3.3.1).
const DAPIE_SCREEN_TERM_IDS = new Set([
  "mock-investing", "total-assets", "available-cash", "holdings", "pending-order", "order-cancel", "sell-proceeds", "goal-price", "holding-period", "buy-day-record", "plan-badge", "line-chart", "candle-chart", "minute-chart", "daily-chart", "weekly-chart", "delayed-price", "child-news", "season", "trade-lock", "ranking", "family-feed", "profile-abilities", "profile-definition", "profile-status", "profile-character",
]);

export const CHATBOT_KNOWLEDGE: readonly ChatbotKnowledgeEntry[] = ([
  { id: "stock", kind: "glossary", category: "basics", termLabel: "주식", triggers: ["주식"], answer: "주식은 회사의 작은 조각이라고 생각하면 돼요. 주식을 가진 사람은 그 회사의 주주가 돼요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.stock, status: reviewed },
  { id: "shareholder", kind: "glossary", category: "basics", termLabel: "주주", triggers: ["주주"], answer: "주주는 회사의 주식을 가진 사람이에요. 회사의 작은 조각을 함께 가진 사람이라고 생각하면 돼요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.shareholder, status: reviewed },
  { id: "stock-item", kind: "glossary", category: "basics", termLabel: "종목", triggers: ["종목"], answer: "종목은 거래 화면에서 구분하는 회사나 상품 하나를 말해요. 여기서는 각 회사의 주식이 하나의 종목이에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["stock-item"], status: reviewed },
  { id: "buy", kind: "glossary", category: "order", termLabel: "매수", triggers: ["매수", "주식 사기"], questionForms: ["definition"], answer: "매수는 주식을 사는 거래예요. 주문 전에 수량과 예상 금액, 그리고 고른 이유를 확인하면 돼요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.buy, status: reviewed },
  { id: "sell", kind: "glossary", category: "order", termLabel: "매도", triggers: ["매도", "팔기"], answer: "매도는 가지고 있던 주식을 파는 거래예요. 팔고 나면 그 거래의 결과가 실현손익으로 기록돼요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.sell, status: reviewed },
  { id: "order", kind: "glossary", category: "order", termLabel: "주문", triggers: ["주문"], answer: "주문은 주식을 사고팔겠다고 거래소에 알리는 과정이에요. 주문을 넣었다고 바로 거래가 끝나는 것은 아니에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.order, status: reviewed },
  { id: "execution", kind: "glossary", category: "order", termLabel: "체결", triggers: ["체결"], answer: "체결은 사고 싶은 사람과 팔고 싶은 사람이 만나 거래가 완료된 상태예요. 체결된 뒤에 보유 수량이 바뀌어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.execution, status: reviewed },
  { id: "current-price", kind: "glossary", category: "chart", termLabel: "현재가", triggers: ["현재가", "지금 가격"], answer: "현재가는 지금 화면에 표시된 최근 거래 가격이에요. 시간이 지나면 달라질 수 있어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["current-price"], status: reviewed },
  // "주가" 한 낱말은 "주가 차트", "주가가 내려가면"처럼 아무 문장에나 들어가 다른 용어를
  // 가로챈다. 뜻을 묻는 표현으로 좁힌다.
  { id: "stock-price", kind: "glossary", category: "chart", termLabel: "주가", triggers: ["주가가 뭐", "주가 뜻", "주가라는 말", "주가가 무엇"], answer: "주가는 주식 한 주에 붙은 지금 가격이에요. 사고팔려는 주문이 만나 정해지고 하루에도 여러 번 바뀌어요.", explainScript: ADDED_TERM_SCRIPTS["stock-price"], status: reviewed },
  { id: "market-order", kind: "glossary", category: "order", termLabel: "시장가", triggers: ["시장가", "지금 가격에 바로"], answer: "시장가는 지금 시장에서 거래되는 가격으로 주문하는 방법이에요. 주문을 넣는 순간의 가격과 조금 달라질 수 있어요.",
    explainScript: {
        id: "term:market-order",
        brief: "시장가는 지금 시장에 나와 있는 값으로 바로 주문하는 방법이에요.",
        check: {
          question: "시장가로 주문하면 값은 어떻게 정해질까요?",
          choices: [
            { id: "market", label: "지금 시장에 있는 값으로" },
            { id: "me", label: "내가 적어 낸 값으로" },
            { id: "company", label: "회사가 정해 준 값으로" },
          ],
          answerId: "market",
        },
        adjust: {
          explanation: "지정가는 내가 값을 적어 두지만, 시장가는 그 자리에서 시장에 나와 있는 값을 그대로 받아요.",
          question: "그럼 시장가는 어느 값을 받을까요?",
          choices: [
            { id: "market", label: "시장에 나와 있는 값" },
            { id: "me", label: "내가 적어 둔 값" },
          ],
          answerId: "market",
        },
        detail:
          "값을 그대로 받는 대신 주문을 넣는 순간과 조금 달라질 수 있어요.",
        example:
          "가게에 붙은 값표를 그대로 보고 고르는 것과 비슷해요. 값을 깎지 않는 대신 기다리지 않아도 돼요.",
      },
    status: reviewed },
  { id: "limit-order", kind: "glossary", category: "order", termLabel: "지정가", triggers: ["지정가", "내가 정한 가격에"], answer: "지정가는 내가 정한 가격에만 주문이 되도록 하는 방법이에요. 그 가격에 거래 상대가 없으면 바로 체결되지 않을 수 있어요.",
    explainScript: {
        id: "term:limit-order",
        brief: "지정가는 내가 정한 값에만 주문이 되도록 하는 방법이에요.",
        check: {
          question: "지정가로 주문하면 값은 어떻게 정해질까요?",
          choices: [
            { id: "me", label: "내가 적어 낸 값으로" },
            { id: "market", label: "지금 시장에 있는 값으로" },
            { id: "company", label: "회사가 정해 준 값으로" },
          ],
          answerId: "me",
        },
        adjust: {
          explanation: "시장가는 시장에 나와 있는 값을 그대로 받지만, 지정가는 내가 적어 둔 값에만 거래돼요.",
          question: "그럼 지정가는 어느 값에 거래될까요?",
          choices: [
            { id: "me", label: "내가 적어 둔 값" },
            { id: "market", label: "시장에 나와 있는 값" },
          ],
          answerId: "me",
        },
        detail:
          "그 값에 거래할 상대가 없으면 주문이 바로 끝나지 않아요.",
        example:
          "친구에게 이만큼이면 바꾸겠다고 미리 말해 두는 것과 비슷해요. 친구가 동의해야 바꿀 수 있어요.",
      },
    status: reviewed },
  { id: "quantity", kind: "glossary", category: "order", termLabel: "수량", triggers: ["수량", "몇 주", "주 수"], answer: "수량은 사고팔 주식의 개수예요. 한 주 가격과 곱하면 대략의 거래 금액을 확인할 수 있어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.quantity, status: reviewed },
  { id: "estimated-amount", kind: "glossary", category: "order", termLabel: "예상 금액", triggers: ["예상 금액", "주문 금액"], answer: "예상 금액은 주문 수량과 가격으로 계산한 돈이에요. 주문을 확정하기 전 최종 금액을 다시 확인해 주세요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["estimated-amount"], status: reviewed },
  { id: "evaluation-amount", kind: "glossary", category: "profit", termLabel: "평가금액", triggers: ["평가금액", "지금 값어치"], answer: "평가금액은 지금 가지고 있는 주식이 현재 가격으로 얼마인지 보여주는 금액이에요. 아직 팔지 않았다면 가격에 따라 바뀔 수 있어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["evaluation-amount"], status: reviewed },
  { id: "unrealized-profit", kind: "glossary", category: "profit", termLabel: "평가손익", triggers: ["평가손익", "번 돈"], answer: "평가손익은 아직 가진 주식의 값이 산 뒤보다 얼마나 달라졌는지 보여줘요. 아직 팔지 않은 변화라서 계속 바뀔 수 있어요.",
    explainScript: {
        id: "term:unrealized-profit",
        brief: "평가손익은 아직 팔지 않은 주식의 값이 얼마나 달라졌는지 보여줘요.",
        check: {
          question: "평가손익은 언제 볼 수 있을까요?",
          choices: [
            { id: "holding", label: "아직 가지고 있을 때" },
            { id: "after", label: "팔고 난 뒤에" },
            { id: "first", label: "처음 살 때만" },
          ],
          answerId: "holding",
        },
        adjust: {
          explanation: "평가손익은 아직 팔지 않고 가지고 있는 주식의 값 변화예요. 거래가 끝나지 않아서 숫자가 계속 움직여요.",
          question: "아직 가지고 있는 주식의 평가손익은 어떤 상태일까요?",
          choices: [
            { id: "moving", label: "계속 움직이는 중" },
            { id: "finished", label: "이미 끝난 상태" },
          ],
          answerId: "moving",
        },
        detail:
          "아직 거래가 끝나지 않아서 숫자가 계속 바뀌어요.",
        example:
          "서랍에 넣어 둔 카드의 요즘 값을 적어 둔 쪽지와 비슷해요. 아직 바꾸지 않았으니 숫자는 계속 달라져요.",
      },
    status: reviewed },
  { id: "realized-profit", kind: "glossary", category: "profit", termLabel: "실현손익", triggers: ["실현손익"], answer: "실현손익은 주식을 팔아 거래가 끝난 뒤 기록되는 결과예요. 평가손익과 달리 이미 끝난 거래의 기록이에요.",
    explainScript: {
        id: "term:realized-profit",
        brief: "실현손익은 주식을 팔아서 거래가 끝난 뒤에 남는 결과예요.",
        check: {
          question: "실현손익은 언제 정해질까요?",
          choices: [
            { id: "after", label: "팔고 난 뒤에" },
            { id: "holding", label: "아직 가지고 있을 때" },
            { id: "order", label: "주문을 넣을 때" },
          ],
          answerId: "after",
        },
        adjust: {
          explanation: "실현손익은 주식을 팔아서 거래가 끝난 뒤에 남는 결과예요. 거래가 이미 끝났기 때문에 숫자가 그대로 기록으로 남아요.",
          question: "끝난 거래의 결과는 어떻게 남을까요?",
          choices: [
            { id: "fixed", label: "그대로 기록돼요" },
            { id: "moving", label: "계속 바뀌어요" },
          ],
          answerId: "fixed",
        },
        detail:
          "거래가 이미 끝나 더는 바뀌지 않는 지나간 기록이에요.",
        example:
          "친구와 카드를 바꾸고 나서 적어 둔 결과표와 비슷해요. 바꾼 뒤에는 숫자가 그대로 남아요.",
      },
    status: reviewed },
  { id: "return", kind: "glossary", category: "profit", termLabel: "수익률", triggers: ["수익률", "손실률"], answer: "수익률은 처음 금액과 지금 금액이 얼마나 달라졌는지 비율로 보는 방법이에요. 숫자뿐 아니라 왜 골랐는지도 같이 돌아보면 좋아요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.return, status: reviewed },
  { id: "average-price", kind: "glossary", category: "profit", termLabel: "평균 매수가", triggers: ["평균 매수가", "평균매수가", "평균"], answer: "평균 매수가는 같은 종목을 여러 번 샀을 때 한 주당 평균으로 얼마에 샀는지 보여주는 가격이에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["average-price"], status: reviewed },
  { id: "sector", kind: "glossary", category: "basics", termLabel: "업종", triggers: ["업종", "섹터"], answer: "업종은 비슷한 일을 하는 회사들을 묶은 이름이에요. 예를 들어 게임 회사나 식품 회사처럼 나눌 수 있어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.sector, status: reviewed },
  { id: "market-cap", kind: "glossary", category: "indicator", termLabel: "시가총액", triggers: ["시가총액", "시총"], answer: "시가총액은 회사의 주식 전체를 현재 가격으로 계산한 크기예요. 회사가 하는 일이나 성적을 모두 보여주는 숫자는 아니에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["market-cap"], status: reviewed },
  { id: "revenue", kind: "glossary", category: "indicator", termLabel: "매출", triggers: ["매출"], answer: "매출은 회사가 물건이나 서비스를 팔아 받은 돈의 규모예요. 매출이 모두 회사의 이익은 아니에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.revenue, status: reviewed },
  { id: "operating-profit", kind: "glossary", category: "indicator", termLabel: "영업이익", triggers: ["영업이익"], answer: "영업이익은 회사가 본업으로 번 돈에서 본업에 든 비용을 뺀 결과예요. 회사의 공개된 과거 성적을 볼 때 쓰는 말이에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["operating-profit"], status: reviewed },
  { id: "dividend", kind: "glossary", category: "indicator", termLabel: "배당", triggers: ["배당"], answer: "배당은 회사가 번 이익 일부를 주주에게 나누어 주는 것을 말해요. 모든 회사가 배당하는 것은 아니에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.dividend, status: reviewed },
  { id: "net-interest-margin", kind: "glossary", category: "indicator", termLabel: "예대마진", triggers: ["예대마진"], answer: "예대마진은 은행이 빌려주고 받은 이자와, 맡아 주고 준 이자의 차이예요. 은행이 돈을 버는 방법 가운데 하나예요.", explainScript: ADDED_TERM_SCRIPTS["net-interest-margin"], status: reviewed },
  {
    id: "per",
    kind: "glossary",
    category: "indicator", termLabel: "PER",
    triggers: ["per", "퍼", "주가수익비율", "비싼지", "싼지", "비싼회사"],
    answer: "PER은 회사가 번 이익과 주가를 비교해 보는 숫자예요. 같은 업종 회사끼리 함께 보면 이해하기 쉬워요.",
    explainScript: {
      id: "term:per",
      brief: "PER은 회사가 번 이익과 주가를 비교해 보는 숫자예요.",
      check: {
        question: "PER은 무엇을 비교하는 숫자일까요?",
        choices: [
          { id: "profit-and-price", label: "회사가 번 이익과 주가" },
          { id: "assets-and-price", label: "회사가 가진 재산과 주가" },
          { id: "employee-count", label: "회사의 직원 수와 주가" },
        ],
        answerId: "profit-and-price",
      },
      adjust: {
        explanation: "PER이 비교하는 것은 딱 두 가지, 회사가 번 이익과 주가예요. 가진 재산을 주가와 견주는 것은 PBR 이라 서로 다른 숫자예요.",
        question: "그럼 PER 은 주가를 무엇과 견줄까요?",
        choices: [
          { id: "profit", label: "회사가 번 이익" },
          { id: "assets", label: "회사가 가진 재산" },
        ],
        answerId: "profit",
      },
      detail: "같은 업종 회사끼리 함께 보면 이익에 비해 주가가 어떻게 보이는지 견줄 수 있어요.",
      example: "같은 업종의 두 회사가 비슷한 이익을 냈다고 해 봐요. 한 회사의 주가가 더 높다면 두 회사의 PER은 다르게 보여요.",
    },
    status: reviewed,
  },
  { id: "pbr", kind: "glossary", category: "indicator", termLabel: "PBR", triggers: ["pbr", "주가순자산비율"], answer: "PBR은 회사가 가진 자산과 주가를 비교해 보는 숫자예요. 이 숫자 하나만으로 좋고 나쁜 회사를 정할 수는 없어요.",
    explainScript: {
        id: "term:pbr",
        brief: "PBR은 회사 값이 회사가 가진 재산에 비해 높은지 보는 숫자예요.",
        check: {
          question: "PBR은 회사 값을 무엇과 비교할까요?",
          choices: [
            { id: "asset", label: "회사가 가진 재산" },
            { id: "earnings", label: "회사가 번 이익" },
            { id: "staff", label: "회사의 직원 수" },
          ],
          answerId: "asset",
        },
        adjust: {
          explanation: "회사가 가진 건물과 기계, 남은 돈을 모두 모은 것이 회사의 재산이에요. PBR은 회사 값을 이 재산과 견주는 숫자예요.",
          question: "그럼 PBR은 회사 값을 무엇과 견줄까요?",
          choices: [
            { id: "asset", label: "회사가 가진 재산" },
            { id: "earnings", label: "회사가 번 이익" },
          ],
          answerId: "asset",
        },
        detail:
          "회사 값이 재산보다 크면 PBR은 1보다 커지고, 재산보다 작으면 1보다 작아져요.",
        example:
          "가진 물건이 똑같은 가게가 두 곳 있는데 한 곳의 값이 세 배라고 해 봐요. 값이 비싼 쪽의 PBR이 더 커요.",
      },
    status: reviewed },
  { id: "eps", kind: "glossary", category: "indicator", termLabel: "EPS", triggers: ["eps", "주당순이익"], answer: "EPS는 회사가 번 이익을 주식 한 주당으로 나누어 본 숫자예요. 회사의 과거 성적을 읽을 때 쓰는 비교용 숫자예요.",
    explainScript: {
        id: "term:eps",
        brief: "EPS는 회사가 번 돈을 주식 한 조각 몫으로 나눈 값이에요.",
        check: {
          question: "EPS는 회사가 번 돈을 무엇으로 나눌까요?",
          choices: [
            { id: "shares", label: "전체 주식 수" },
            { id: "holders", label: "주주의 수" },
            { id: "staff", label: "회사의 직원 수" },
          ],
          answerId: "shares",
        },
        adjust: {
          explanation: "EPS는 회사가 번 돈을 주식 조각마다 얼마씩인지 나눈 값이에요. 나누려면 전체 주식 수가 필요해요.",
          question: "번 돈을 조각마다 나눌 때 무엇의 수가 필요할까요?",
          choices: [
            { id: "shares", label: "전체 주식 수" },
            { id: "holders", label: "주주의 수" },
          ],
          answerId: "shares",
        },
        detail:
          "주식 조각 하나가 얼마씩 벌었는지 보는 숫자예요.",
        example:
          "피자 한 판을 여덟 조각으로 나누면 한 조각 몫이 정해져요. EPS도 번 돈을 조각 수로 나눈 몫이에요.",
      },
    status: reviewed },
  { id: "etf", kind: "glossary", category: "basics", termLabel: "ETF", triggers: ["etf"], answer: "ETF는 여러 회사의 주식을 한 바구니에 담아 둔 상품이에요. 어떤 회사들이 담겼는지는 상품 설명에서 확인할 수 있어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.etf, status: reviewed },
  { id: "index", kind: "glossary", category: "basics", termLabel: "지수", triggers: ["지수"], answer: "지수는 여러 주식의 가격 움직임을 한눈에 보기 위해 만든 숫자예요. 시장 전체나 특정 업종의 흐름을 살펴볼 때 써요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.index, status: reviewed },
  { id: "diversification", kind: "glossary", category: "risk", termLabel: "분산투자", triggers: ["분산투자", "분산 투자"], answer: "분산투자는 한 곳에만 담지 않고 여러 곳에 나누어 보는 방법이에요. 결과를 보장하지는 않지만 한 종목에만 의존하는 정도는 줄일 수 있어요.",
    explainScript: {
        id: "term:diversification",
        brief: "분산투자는 한 곳에 몰아 두지 않고 여러 곳에 나눠 두는 방법이에요.",
        check: {
          question: "여러 곳에 나눠 두면 무엇이 달라질까요?",
          choices: [
            { id: "steady", label: "한 곳이 나빠져도 덜 흔들려요" },
            { id: "always", label: "언제나 돈이 늘어나요" },
            { id: "free", label: "수수료가 사라져요" },
          ],
          answerId: "steady",
        },
        adjust: {
          explanation: "달걀을 여러 바구니에 나눠 담았다고 생각해 봐요. 바구니 하나를 떨어뜨려도 다른 바구니의 달걀은 남아 있어요.",
          question: "바구니 하나를 떨어뜨리면 나머지 달걀은 어떻게 될까요?",
          choices: [
            { id: "remain", label: "나머지는 남아요" },
            { id: "all", label: "모두 깨져요" },
          ],
          answerId: "remain",
        },
        detail:
          "대신 한 곳이 아주 잘돼도 전체는 그만큼 크게 달라지지 않아요.",
        example:
          "소풍 갈 때 간식을 가방 한 칸에만 넣지 않고 여러 칸에 나눠 담는 것과 비슷해요. 한 칸이 젖어도 다른 칸은 남아요.",
      },
    status: reviewed },
  // "차트는 어떻게 봐요?"(절차)에 이 정의 항목이 답하고 정의형 DAPIE 퀴즈까지 열던 자리다.
  // 뜻을 묻는 질문만 맡고, 보는 방법은 아래 chart-read 가 맡는다 (SPEC §3.4.1).
  { id: "chart", kind: "glossary", category: "chart", termLabel: "차트", triggers: ["차트"], questionForms: ["definition"], answer: "차트는 과거 가격 변화를 그림으로 보여줘요. 과거 기록을 보는 도구이지, 미래 가격을 알려주는 그림은 아니에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.chart, status: reviewed },
  { id: "volume", kind: "glossary", category: "indicator", termLabel: "거래량", triggers: ["거래량"], answer: "거래량은 얼마나 많은 주식이 사고팔렸는지 나타내는 숫자예요. 거래량이 많다고 앞으로 가격이 어떻게 될지는 알 수 없어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.volume, status: reviewed },
  { id: "volatility", kind: "glossary", category: "risk", termLabel: "변동성", triggers: ["변동성"], answer: "변동성은 가격이 오르내리는 폭이 얼마나 큰지 말해요. 가격은 늘 움직일 수 있다는 점을 기억하면 돼요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.volatility, status: reviewed },
  { id: "stop-loss", kind: "glossary", category: "risk", termLabel: "손절", triggers: ["손절"], answer: "손절은 손해를 더 키우지 않으려고 파는 것을 부르는 말이에요. 언제 파는지는 사람마다 다르고 제가 정해 줄 수는 없어요.", explainScript: ADDED_TERM_SCRIPTS["stop-loss"], status: reviewed },
  { id: "risk", kind: "glossary", category: "risk", termLabel: "위험", triggers: ["위험"], answer: "투자에서 위험은 생각한 것과 다른 결과가 생길 수 있다는 뜻이에요. 그래서 이유를 기록하고 여러 정보를 함께 보는 연습이 중요해요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.risk, status: reviewed },
  { id: "mock-investing", kind: "faq", category: "service", termLabel: "모의투자", triggers: ["모의투자"], answer: "모의투자는 실제 돈 대신 가상 돈으로 주식 거래를 연습하는 활동이에요. 실제 주식을 가지거나 실제 돈이 출금되지는 않아요.", actionTarget: "home", status: reviewed },
  { id: "total-assets", kind: "faq", category: "profit", termLabel: "전체 자산", triggers: ["내 지갑 전체", "전체 자산", "지금 내 돈 전부"], answer: "전체 자산은 쓸 수 있는 가상 현금과 가진 주식의 현재 값어치, 기다리는 주문에 맡겨 둔 금액을 합친 값이에요. 가격이 움직이면 달라질 수 있어요.", actionTarget: "home", status: reviewed },
  { id: "available-cash", kind: "faq", category: "profit", termLabel: "쓸 수 있는 돈", triggers: ["쓸 수 있는 돈", "남은 지갑", "현금"], answer: "쓸 수 있는 돈은 지금 새 주문에 사용할 수 있는 가상 돈이에요. 기다리는 주문에 맡겨 둔 돈은 취소되기 전까지 여기서 빠져 있어요.", actionTarget: "home", status: reviewed },
  { id: "holdings", kind: "faq", category: "profit", termLabel: "보유 종목", triggers: ["가진 회사", "보유 종목"], answer: "가진 회사는 지금 내 계좌에 주식을 가지고 있는 회사를 뜻해요. 아직 체결되지 않은 기다리는 주문은 보유 종목이 아니에요.", actionTarget: "home", status: reviewed },
  { id: "pending-order", kind: "faq", category: "order", termLabel: "기다리는 주문", triggers: ["기다리는 주문"], answer: "기다리는 주문은 아직 체결되지 않은 지정가 주문이에요. 매수 주문의 금액이나 매도 주문의 수량은 체결되거나 취소될 때까지 잠시 예약돼요.", actionTarget: "home", status: reviewed },
  { id: "order-cancel", kind: "faq", category: "order", termLabel: "주문 취소", triggers: ["주문 취소", "주문취소"], answer: "기다리는 주문을 취소하면 예약된 가상 돈이나 주식은 돌아와요. 이미 체결된 주문은 취소할 수 없어요.", actionTarget: "order", status: reviewed },
  { id: "sell-proceeds", kind: "faq", category: "order", termLabel: "받게 되는 돈", triggers: ["받게 되는 돈"], answer: "받게 되는 돈은 팔 수량과 예상 체결 가격을 곱해 계산한 금액이에요. 현재 데모는 세금과 수수료를 따로 계산하지 않아요.", actionTarget: "order", status: reviewed },
  // termLabel 에 "목표 가격"을 쓰면 추천 카드가 금지표현 필터의 `목표가` 패턴에 걸린다.
  // 필터는 안전 하한선이라 그대로 두고, 뜻이 같은 다른 이름을 쓴다.
  { id: "goal-price", kind: "faq", category: "service", termLabel: "내가 적어 둔 가격", triggers: ["목표 가격"], answer: "이 값은 나중에 확인하려고 사용자가 스스로 적어 둔 가격이에요. 지정가 주문이나 자동 매도 예약과는 달라요.", actionTarget: "order", status: reviewed },
  { id: "holding-period", kind: "faq", category: "service", termLabel: "예상 보유기간", triggers: ["예상 보유기간", "보유 기간", "언제까지 가질 생각"], answer: "보유 기간은 주식을 얼마나 오래 가지고 있을지 생각해 본 기간이에요. 꼭 지켜야 하는 약속이나 자동 매도 조건은 아니에요.", actionTarget: "order", status: reviewed },
  { id: "buy-day-record", kind: "faq", category: "service", termLabel: "사던 날의 나", triggers: ["사던 날의 나"], answer: "사던 날의 나는 처음 주문할 때 남긴 이유와 보유기간, 처음 정한 가격을 다시 보여주는 화면이에요. 지금 생각과 어떻게 달라졌는지 돌아보게 도와줘요.", actionTarget: "order", status: reviewed },
  { id: "plan-badge", kind: "faq", category: "service", termLabel: "계획 실천 배지", triggers: ["계획 실천 배지"], answer: "계획 실천 배지는 처음 남긴 매도 계획과 맞게 팔았을 때 받는 기록용 배지예요. 수익이나 투자 실력을 평가하는 상은 아니에요.", actionTarget: "archive", status: reviewed },
  // 차트를 **보는 방법**. 뜻을 묻는 chart 와 짝을 이루며, 트리거에 낱말 `차트`를 함께 두고
  // 형태로 갈라진다 — 매수(정의)와 buy-flow(절차)가 나뉘는 방식과 같다.
  // 답은 실제 차트 화면(기간 분·일·주 드롭다운, 선차트·캔들차트 토글)만 가리킨다.
  { id: "chart-read", kind: "faq", triggers: ["차트 보는 법", "차트 읽는 법", "차트 어떻게", "차트"], questionForms: ["procedure", "location"], answer: "종목 상세에서 차트를 열면 위에 지금 가격이, 아래에 기간을 고르는 버튼과 선차트·캔들차트 버튼이 있어요. 분·일·주 중 하나를 고르면 막대나 선 하나가 담는 시간이 바뀌고, 가로는 시간 세로는 가격이라 오른쪽으로 갈수록 최근 기록이에요. 지나간 기록을 보는 화면이라 다음 가격을 알려 주지는 않아요.", actionTarget: "stock", status: reviewed },
  { id: "line-chart", kind: "faq", category: "chart", termLabel: "선차트", triggers: ["선차트"], answer: "선차트는 정해 둔 시간마다의 가격을 선으로 이어 보여주는 차트예요. 과거 가격의 흐름을 보는 그림이지 다음 가격을 알려 주지는 않아요.", actionTarget: "stock", status: reviewed },
  { id: "candle-chart", kind: "faq", category: "chart", termLabel: "캔들차트", triggers: ["캔들차트", "캔들"], answer: "캔들차트는 한 기간의 시작값, 끝값, 가장 높고 낮은 값을 막대로 보여주는 차트예요. 막대 하나가 담는 시간은 분봉·일봉·주봉으로 따로 고를 수 있어요.", actionTarget: "stock", status: reviewed },
  { id: "minute-chart", kind: "faq", category: "chart", termLabel: "분봉", triggers: ["분봉"], answer: "분봉은 막대 하나가 몇 분 동안의 가격 움직임을 보여주는 차트예요. 짧은 시간 단위로 과거 가격을 살펴볼 때 써요.", actionTarget: "stock", status: reviewed },
  { id: "daily-chart", kind: "faq", category: "chart", termLabel: "일봉", triggers: ["일봉"], answer: "일봉은 막대 하나가 하루 동안의 가격 움직임을 보여주는 차트예요. 하루의 시작값과 끝값, 높고 낮은 값을 함께 볼 수 있어요.", actionTarget: "stock", status: reviewed },
  { id: "weekly-chart", kind: "faq", category: "chart", termLabel: "주봉", triggers: ["주봉"], answer: "주봉은 막대 하나가 한 주 동안의 가격 움직임을 보여주는 차트예요. 여러 날의 과거 흐름을 한 묶음으로 살펴볼 수 있어요.", actionTarget: "stock", status: reviewed },
  { id: "delayed-price", kind: "faq", category: "chart", termLabel: "15분 지연 시세", triggers: ["15분 지연 시세"], answer: "15분 지연 시세는 실제 시장 가격이 화면에 약 15분 늦게 표시된다는 뜻이에요. 지금 시장에서 거래되는 가격과 다를 수 있어요.", actionTarget: "stock", status: reviewed },
  // 이 서비스에 없는 화면(SPEC §3.3.1 "미지원 요청은 그 사실을 먼저 밝힌다").
  // 없는 것을 물으면 어디에도 안 걸려 "저는 …도와주는 챗봇이에요" 범위 안내로 끝났고,
  // 아이는 왜 안 되는지 모른 채 화면에서 호가창을 계속 찾는다. 대안은 실제로 있는
  // 화면만 가리킨다 — 없는 화면을 지어내면 찾다가 또 막힌다.
  // `매수호가`·`매도호가`를 따로 적는 이유: 낱말 `호가`만 두면 트리거 길이가 `매수`·`매도`와
  // 같아 앞선 용어 사전이 이겨서 "매수는 주식을 사는 거래예요" 가 나갔다.
  { id: "orderbook-unsupported", kind: "faq", triggers: ["호가창", "매수호가", "매도호가", "호가"], answer: "이 서비스는 모의투자라서 호가창은 제공하지 않아요. 종목 상세에서 15분 늦게 표시되는 지금 가격과 차트로 가격이 어떻게 움직였는지 볼 수 있어요.", actionTarget: "stock", status: reviewed },
  { id: "child-news", kind: "faq", category: "service", termLabel: "어린이 뉴스", triggers: ["어린이 뉴스", "오늘 국내 시황", "원문 보기"], answer: "어린이 뉴스는 회사나 시장에서 있었던 일을 쉽게 풀어 요약한 내용이에요. 원문 보기에서 참고한 기사나 자료를 직접 확인할 수 있고, 뉴스는 매수·매도 답을 주지 않아요.", actionTarget: "stock", status: reviewed },
  { id: "season", kind: "faq", category: "service", termLabel: "시즌", triggers: ["시즌 진행", "남은 시즌", "시즌"], answer: "시즌은 가족이 같은 기간 동안 모의투자하고 기록을 쌓는 활동 기간이에요. 현재 한 시즌은 4주이고, 남은 기간은 홈의 시즌 진행 표시에서 확인할 수 있어요.", actionTarget: "home", status: reviewed },
  { id: "trade-lock", kind: "faq", category: "service", termLabel: "주문 잠금", triggers: ["학교 시간엔 매매 쉬기", "주문 잠금"], answer: "주문 잠금은 보호자가 정한 시간 동안 자녀 계정의 주문만 잠시 막는 기능이에요. 회사·차트·뉴스를 보는 것은 계속할 수 있어요.", actionTarget: "home", status: reviewed },
  { id: "ranking", kind: "faq", category: "service", termLabel: "랭킹", triggers: ["랭킹", "이번 주", "시즌 전체"], answer: "랭킹은 가족들의 기간별 수익률을 순서로 보여주는 화면이에요. 높은 순위가 더 좋은 투자 습관이나 성향을 뜻하지는 않아요.", actionTarget: "home", status: reviewed },
  { id: "family-feed", kind: "faq", category: "service", termLabel: "가족 기록", triggers: ["가족 기록", "거래 가격", "차트에서 이 지점 보기"], answer: "가족 기록은 가족의 거래와 생각을 함께 보는 화면이에요. 현재 거래 가격은 한 주당 가격이고, 차트에서 이 지점 보기는 해당 종목 상세 화면을 열어요.", status: reviewed },
  { id: "profile-abilities", kind: "faq", category: "profile", termLabel: "성향 축", triggers: ["정확력", "근거력", "집중력", "분산력", "직관력"], answer: "근거력·직관력은 살 회사를 정하기 전에 자료를 얼마나 살펴봤는지, 집중력·분산력은 어떤 업종에 나눠 담고 현금을 얼마나 남겼는지 보여줘요. 정확력은 거래한 뒤 장이 두 번 열리는 동안 가격이 어느 쪽으로 갔는지 보며, 어느 방향이 더 좋다는 뜻은 아니에요.", actionTarget: "archive", status: reviewed },
  { id: "profile-definition", kind: "faq", category: "profile", termLabel: "성향", triggers: ["성향이 뭐", "성향 뜻", "능력치 오각형"], answer: "성향은 이번 시즌 행동 기록을 몇 가지 특징으로 나눠 보여주는 결과예요. 실력이나 성격 검사가 아니며 기록이 쌓이면 바뀔 수 있어요.", actionTarget: "archive", status: reviewed },
  { id: "profile-status", kind: "faq", category: "profile", termLabel: "관찰 중", triggers: ["관찰 중", "관찰 초기", "2거래일"], answer: "관찰 중은 아직 성향 캐릭터를 정할 만큼 체결 매수 기록이 부족한 상태예요. 정확력은 거래 뒤 2거래일이 지나야 계산돼서 그전에는 LV 표기가 붙지 않아요.", actionTarget: "archive", status: reviewed },
  { id: "profile-character", kind: "faq", category: "profile", termLabel: "성향 캐릭터", triggers: ["저격수", "전략가", "승부사", "탐험가", "성향 캐릭터"], answer: "성향 캐릭터는 근거·직관과 집중·분산의 조합으로 이번 시즌 행동을 표현한 것이에요. 시즌마다 달라질 수 있고, 네 모습 중 어느 것이 더 좋다는 뜻은 아니에요.", actionTarget: "archive", status: reviewed },
  // 없는 화면이라 `termLabel`·`category`·DAPIE 를 붙이지 않는다. 매수·매도·메모·열람
  // 건수를 세어 주는 자리가 아카이브에 없는데 용어로 설명하면 아이가 화면에서 그것을
  // 계속 찾는다. `orderbook-unsupported` 와 같은 모양으로 "없다"를 말하고 실제로 있는
  // 자리(주차별 성향 카드·지난 시즌 리포트)로 보낸다.
  { id: "season-record", kind: "faq", triggers: ["시즌 기록이 뭐야", "기록 카드"], answer: "매수·매도와 메모를 몇 번 했는지 세어 주는 화면은 아직 없어요. 대신 아카이브에서 주차별 성향 카드와 지난 시즌 리포트를 볼 수 있어요.", actionTarget: "archive", status: reviewed },
  // "기록"은 "기록 어디서 봄?" 같은 위치 질문까지 잡으므로 DAPIE 를 붙이지 않는다.
  // 용어 뜻을 묻는 "투자 근거"·"근거 태그"는 아래 reason-tag 가 맡는다. 더 긴 트리거가
  // 먼저 매칭되므로 둘이 섞이지 않는다 (SPEC §3.4 — DAPIE 는 용어 설명에만 연다).
  { id: "reason", kind: "faq", triggers: ["기록"], answer: "기록에서는 고른 이유를 남길 수 있어요. 정답을 맞히는 시험이 아니라, 나중에 내 생각을 돌아보기 위한 거예요.", status: reviewed },
  { id: "reason-tag", kind: "glossary", category: "service", termLabel: "투자 근거", triggers: ["투자 근거", "고른 이유", "근거 태그"], answer: "투자 근거는 그 회사를 고른 이유를 골라 두는 기록이에요. 정답을 맞히는 시험이 아니라 나중에 생각을 돌아보기 위한 거예요.", explainScript: ADDED_TERM_SCRIPTS["reason-tag"], status: reviewed },
  { id: "archive", kind: "faq", triggers: ["아카이브"], answer: "아카이브에서는 남긴 거래와 생각을 다시 볼 수 있어요. 점수표가 아니라 투자 스타일을 관찰하는 기록이에요.", actionTarget: "archive", status: reviewed },
  { id: "stock-search", kind: "faq", triggers: ["종목 검색", "회사 찾기", "종목 찾기"], answer: "종목 화면의 검색창에 회사 이름을 입력하거나 업종 칩을 눌러 찾아볼 수 있어요. 이 서비스가 제공하는 종목 안에서만 검색돼요.", actionTarget: "stock", status: reviewed },
  { id: "buy-flow", kind: "faq", triggers: ["매수 어떻게", "사는 방법", "매수 방법", "매수"], questionForms: ["procedure"], answer: "종목 상세에서 매수를 누르고 수량과 예상 금액을 확인해요. 고른 이유·예상 보유기간을 기록한 뒤 주문 확인을 누르면 돼요.", actionTarget: "order", status: reviewed },
  { id: "sell-flow", kind: "faq", triggers: ["매도 어떻게", "파는 방법", "매도 방법"], answer: "보유 종목에서 매도를 누르고 수량과 파는 이유를 확인해요. 주문 내용을 마지막으로 확인한 뒤 체결하면 기록에 남아요.", actionTarget: "order", status: reviewed },
  { id: "order-check", kind: "faq", triggers: ["주문 전에", "주문 확인", "주문 전 확인"], answer: "주문 전에는 종목 이름, 매수·매도 구분, 수량과 예상 금액을 확인해요. 남긴 이유도 맞는지 한 번 더 보면 돼요.", actionTarget: "order", status: reviewed },
  { id: "stock-pick-criteria", kind: "faq", triggers: ["종목 고를 때", "주식 고를 때", "회사 고를 때", "투자 기준"], answer: "회사가 무슨 일을 하는지, 어떻게 돈을 버는지, 최근에 무슨 일이 있었는지를 봐요.", actionTarget: "stock", status: reviewed },
  { id: "portfolio", kind: "faq", triggers: ["포트폴리오", "보유 종목", "내가 가진 주식"], answer: "홈의 포트폴리오에서 가진 종목과 남은 모의투자 금액을 볼 수 있어요. 화면의 수치는 가격에 따라 달라질 수 있어요.", actionTarget: "home", status: reviewed },
  { id: "family-comparison", kind: "faq", triggers: ["가족 비교", "부모 비교", "엄마랑 비교", "아빠랑 비교"], answer: "아카이브의 가족 비교에서는 서로 동의한 경우에만 투자 스타일을 나란히 볼 수 있어요. 누가 더 잘했는지 점수를 매기는 기능은 아니에요.", actionTarget: "archive", status: reviewed },
  { id: "privacy-chat", kind: "faq", triggers: ["너랑 한 얘기 엄마", "너랑 나눈 얘기 엄마", "키웅이랑 한 채팅", "채팅을 볼 수", "대화 엄마", "엄마한테 말"], answer: CHAT_PRIVACY_ANSWER, status: reviewed },
  { id: "privacy-trade", kind: "faq", triggers: ["내가 뭐 샀는지 엄마", "내가 산 주식을 확인", "내 거래 기록 엄마", "내 거래 내역 가족", "내 매수 기록 부모"], answer: TRADE_VISIBILITY_ANSWER, status: reviewed },
  { id: "league-rule", kind: "faq", triggers: ["리그 규칙", "가족 리그", "모의투자 리그"], answer: "가족 리그에서는 각자 받은 모의투자금으로 투자하고 기록을 남겨요. 실제 돈을 주문하는 서비스가 아니에요.", actionTarget: "home", status: reviewed },
  { id: "stock-universe", kind: "faq", triggers: ["지원 종목", "종목 목록", "몇 개 종목"], answer: "이 데모에서는 정해진 국내 종목 51개만 살펴볼 수 있어요. 종목 화면에서 이름이나 업종으로 찾아봐요.", actionTarget: "stock", status: reviewed },
  { id: "trade-history", kind: "faq", triggers: ["거래 내역", "지난 주문", "체결 내역", "지난 기록"], answer: "지난 거래와 그때 남긴 생각은 아카이브에서 다시 볼 수 있어요. 다른 가족의 원문 기록은 볼 수 없어요.", actionTarget: "archive", status: reviewed },
  { id: "price-location", kind: "faq", triggers: ["현재가 어디", "가격 어디", "주가 어디"], answer: "종목 상세 화면에서 현재가와 가격 변화를 볼 수 있어요. 현재가는 계속 바뀔 수 있으니 화면에 표시된 시각도 함께 확인해요.", actionTarget: "stock", status: reviewed },
  { id: "cash-balance", kind: "faq", triggers: ["남은 돈", "잔액", "모의투자금"], answer: "홈의 포트폴리오에서 남은 모의투자금을 확인할 수 있어요. 가족이 함께 쓰는 돈이 아니라 계정마다 따로 관리돼요.", actionTarget: "home", status: reviewed },
  { id: "chatbot-role", kind: "faq", triggers: ["키웅이가 뭘", "키웅이는 무엇을", "챗봇이 뭘", "뭘 도와줘", "무엇을 도와주"], answer: "저는 금융 기초, 화면 사용법, 검수된 회사 정보와 기록을 쉽게 설명해 줘요. 종목을 골라 주거나 언제 사고팔지 정해 주지는 않아요. 🐻", status: reviewed },
  // SPEC §3.2 — 플로팅 버튼을 삭제 타깃으로 숨긴 뒤 되살리는 길은 홈 화면 버튼뿐이다.
  // 아이가 실수로 숨기면 다시 부를 방법을 물을 곳이 챗봇밖에 없는데, 그 답이 없어
  // 범위 안내로 끝나고 있었다.
  { id: "chatbot-restore", kind: "faq", triggers: ["챗봇 다시", "키웅이 다시", "챗봇 없앴", "키웅이 없앴", "챗봇 사라졌", "키웅이 사라졌", "챗봇 숨겼", "키웅이 숨겼", "챗봇 안 보여", "키웅이 안 보여", "챗봇 어떻게 켜", "플로팅 챗봇"], answer: "플로팅 키웅이를 숨겼다면 홈 화면의 키웅이 버튼을 눌러 다시 부를 수 있어요. 숨긴 동안에도 기록은 그대로 남아 있어요. 🐻", actionTarget: "home", status: reviewed },

  // ── T2 정의 항목 [2026-08-16 일괄 추가] ────────────────────────────────
  //
  // 위쪽 용어는 전부 `explainScript`(DAPIE)를 갖는다. 그건 **행동에 직접 붙는 말**이라
  // 대화형 확인이 값을 한다. 아래 40개는 정의 한 줄만 둔다 — 화면과 뉴스에 나오지만
  // 아이가 그 낱말로 결정을 내리지는 않는 말이다. 스크립트가 없으므로 `explain.ts`의
  // "비슷한 용어" 추천 카드에도 오르지 않는다(그쪽이 `explainScript` 있는 항목만 고른다).
  //
  // 넣을 말을 고른 기준은 하나다 — **앱 화면이나 어린이 뉴스에 실제로 나오는 낱말.**
  // 실측이 근거다. 사전 밖 후보 57개 중 보유가 4개(7%)였고, `시가`·`종가`는 차트
  // 화면에 떠 있는 글자인데 물으면 범위 밖이라고 답했다. 뉴스 쪽 근거는
  // `f2-trade/prototypes/child-news-role-pipeline/term-frequency.ts` 가 집계한다
  // (상반기 11회·순이익 8회가 사전에 없었다).
  //
  // **우리가 다루지 않는 상품은 정의와 함께 그 경계를 적는다.** 아이는 뉴스와 유튜브에서
  // 공매도·레버리지를 듣고 와서 묻는다. 모른 척하면 다른 데서 답을 찾고, 그냥 설명만
  // 하면 여기서도 되는 줄 안다. 그래서 "무엇인지"와 "여기서는 하지 않는다"를 함께 준다.
  //
  // [검수 필요] 이 40개는 한 번에 들어왔고 사람이 아직 통독하지 않았다. 문장이 틀렸거나
  // 톤이 어긋나면 그 항목만 `status: "draft"` 로 바꾸면 즉시 응답에서 빠진다.

  // 가격 표기 — 차트와 종목 상세에 그대로 떠 있는 글자다.
  { id: "open-price", kind: "faq", triggers: ["시가"], answer: "시가는 그날 거래가 시작될 때 처음 정해진 가격이에요. 차트에서 하루를 나타내는 막대의 시작점이에요.", status: reviewed },
  { id: "close-price", kind: "faq", triggers: ["종가"], answer: "종가는 그날 거래가 끝날 때 마지막으로 정해진 가격이에요. 다음 날 거래가 시작되면 가격은 또 달라져요.", status: reviewed },
  { id: "high-price", kind: "faq", triggers: ["고가"], answer: "고가는 그날 거래된 가격 중에서 가장 높았던 가격이에요.", status: reviewed },
  { id: "low-price", kind: "faq", triggers: ["저가"], answer: "저가는 그날 거래된 가격 중에서 가장 낮았던 가격이에요.", status: reviewed },
  { id: "upper-limit", kind: "faq", triggers: ["상한가"], answer: "상한가는 하루에 오를 수 있는 가장 높은 가격이에요. 국내 주식은 하루에 30%까지만 오르내릴 수 있게 정해져 있어요.", status: reviewed },
  { id: "lower-limit", kind: "faq", triggers: ["하한가"], answer: "하한가는 하루에 내릴 수 있는 가장 낮은 가격이에요. 상한가와 똑같이 하루 30% 한도가 정해져 있어요.", status: reviewed },
  // `호가` 는 넣지 않는다. 이미 `orderbook-unsupported` 가 "이 서비스는 모의투자라서
  // 호가창은 제공하지 않아요" 로 답한다 — **없는 화면의 용어를 설명하면 있는 줄 안다.**

  // 시장 구조 — 뉴스와 랭킹 화면에서 계속 마주친다.
  { id: "kospi", kind: "faq", triggers: ["코스피"], answer: "코스피는 국내를 대표하는 주식시장이에요. 그 시장 전체가 어떻게 움직이는지 보여 주는 숫자를 뜻하기도 해요.", status: reviewed },
  { id: "kosdaq", kind: "faq", triggers: ["코스닥"], answer: "코스닥은 코스피보다 작거나 새로 자라는 회사들이 모여 있는 주식시장이에요.", status: reviewed },
  { id: "listing", kind: "faq", triggers: ["상장"], answer: "상장은 회사의 주식을 시장에서 누구나 사고팔 수 있게 되는 것을 말해요.", status: reviewed },
  { id: "delisting", kind: "faq", triggers: ["상장폐지"], answer: "상장폐지는 회사의 주식을 더 이상 시장에서 사고팔 수 없게 되는 것이에요. 시장이 정한 조건을 지키지 못했을 때 일어나요.", status: reviewed },
  { id: "ipo-share", kind: "faq", triggers: ["공모주"], answer: "공모주는 회사가 상장할 때 처음으로 사람들에게 파는 주식이에요. 이 모의투자에서는 공모주를 다루지 않아요.", status: reviewed },
  { id: "trading-halt", kind: "faq", triggers: ["거래정지"], answer: "거래정지는 어떤 이유로 그 종목을 잠시 사고팔 수 없게 막아 둔 상태예요. 풀릴 때까지 주문이 들어가지 않아요.", status: reviewed },

  // 거래 시간 — 주문이 왜 안 되는지 묻는 자리다.
  { id: "market-close", kind: "faq", triggers: ["장마감", "장 마감"], answer: "장마감은 그날의 주식 거래가 끝나는 것이에요. 국내 주식시장은 평일 오후 3시 30분에 마감해요.", status: reviewed },
  { id: "market-holiday", kind: "faq", triggers: ["휴장"], answer: "휴장은 주식시장이 문을 열지 않는 날이에요. 주말과 공휴일에는 거래가 없어요.", status: reviewed },

  // 재무·뉴스 — 어린이 뉴스가 실제로 풀어 쓰는 말이다(term-frequency.ts 집계).
  { id: "net-income", kind: "faq", triggers: ["순이익"], answer: "순이익은 회사가 번 돈에서 쓴 돈과 세금까지 모두 빼고 마지막에 남은 돈이에요.", status: reviewed },
  { id: "deficit", kind: "faq", triggers: ["적자"], answer: "적자는 번 돈보다 쓴 돈이 많아서 남은 것이 마이너스인 상태를 말해요.", status: reviewed },
  { id: "surplus", kind: "faq", triggers: ["흑자"], answer: "흑자는 번 돈이 쓴 돈보다 많아서 이익이 남은 상태를 말해요.", status: reviewed },
  { id: "first-half", kind: "faq", triggers: ["상반기"], answer: "상반기는 한 해를 둘로 나눈 앞쪽 여섯 달, 1월부터 6월까지예요. 뒤쪽 여섯 달은 하반기라고 해요.", status: reviewed },
  { id: "quarter", kind: "faq", triggers: ["분기"], answer: "분기는 한 해를 넷으로 나눈 석 달이에요. 1분기는 1월부터 3월까지이고, 회사는 보통 분기마다 실적을 알려요.", status: reviewed },
  { id: "subsidiary", kind: "faq", triggers: ["자회사"], answer: "자회사는 어떤 회사가 주식을 많이 가지고 있어서 그 회사에 속하게 된 다른 회사예요.", status: reviewed },
  { id: "order-received", kind: "faq", triggers: ["수주"], answer: "수주는 만들어 달라거나 해 달라는 주문을 받는 것이에요. 배나 공장 설비처럼 큰 물건에서 자주 쓰는 말이에요.", status: reviewed },

  // 돈의 기초 — 금융교육에서 주식보다 먼저 나오는 말인데 사전에 하나도 없었다.
  { id: "principal", kind: "faq", triggers: ["원금"], answer: "원금은 처음에 넣은 돈이에요. 여기에 이익이 더해지거나 손해가 빠져요.", status: reviewed },
  { id: "interest", kind: "faq", triggers: ["이자"], answer: "이자는 돈을 맡기거나 빌릴 때 원금에 더 붙는 돈이에요.", status: reviewed },
  { id: "compound-interest", kind: "faq", triggers: ["복리"], answer: "복리는 이자에 다시 이자가 붙는 방식이에요. 맡겨 두는 기간이 길수록 차이가 커져요.", status: reviewed },
  { id: "deposit", kind: "faq", triggers: ["예금"], answer: "예금은 은행에 돈을 맡겨 두고 이자를 받는 거예요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },
  { id: "installment-savings", kind: "faq", triggers: ["적금"], answer: "적금은 정해진 기간 동안 매달 조금씩 모아서 맡기는 거예요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },
  { id: "tax", kind: "faq", triggers: ["세금"], answer: "세금은 나라에 내는 돈이에요. 실제 주식 거래에는 세금이 붙지만 이 모의투자에서는 계산하지 않아요.", status: reviewed },
  { id: "fee", kind: "faq", triggers: ["수수료"], answer: "수수료는 거래를 도와주는 곳에 내는 값이에요. 실제 거래에는 수수료가 붙지만 이 모의투자에서는 계산하지 않아요.", status: reviewed },

  // 돈의 세상 — 뉴스의 배경에 계속 나오는 말이다.
  { id: "interest-rate", kind: "faq", triggers: ["금리"], answer: "금리는 돈을 맡기거나 빌릴 때 붙는 이자의 비율이에요. 뉴스에서 금리가 오르내린다는 말이 자주 나와요.", status: reviewed },
  { id: "exchange-rate", kind: "faq", triggers: ["환율"], answer: "환율은 우리나라 돈과 다른 나라 돈을 바꾸는 비율이에요.", status: reviewed },
  { id: "price-level", kind: "faq", triggers: ["물가"], answer: "물가는 물건과 서비스의 값이 전체적으로 어느 정도인지를 말해요.", status: reviewed },
  { id: "inflation", kind: "faq", triggers: ["인플레이션"], answer: "인플레이션은 물가가 계속 올라서 같은 돈으로 살 수 있는 것이 줄어드는 것이에요.", status: reviewed },

  // 다른 금융 상품 — 여기서 다루지 않는다는 경계를 함께 적는다.
  { id: "bond", kind: "faq", triggers: ["채권"], answer: "채권은 돈을 빌려주고 정해진 날에 이자와 함께 돌려받기로 한 증서예요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },
  { id: "fund", kind: "faq", triggers: ["펀드"], answer: "펀드는 여러 사람의 돈을 모아 전문가가 대신 굴리는 상품이에요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },

  // ── 2차 추가 [2026-08-16] ──────────────────────────────────────────────
  // 화면에 떠 있는 글자, 어린이 뉴스가 반복해서 쓰는 말, 그 뉴스의 배경이 되는 말.
  // 기준은 1차와 같다 — **앱 화면이나 어린이 뉴스에 실제로 나오는 낱말.**

  // 앱 화면 — 종목 상세·차트·주문에 그대로 떠 있다.
  { id: "change-rate", kind: "faq", triggers: ["등락률"], answer: "등락률은 어제 마지막 가격에 견줘 오늘 가격이 몇 퍼센트 오르거나 내렸는지 나타내요.", status: reviewed },
  { id: "vs-yesterday", kind: "faq", triggers: ["전일대비"], answer: "전일대비는 어제 마지막 가격과 견준 차이예요. 화면에서 빨간색은 오른 것, 파란색은 내린 것을 뜻해요.", status: reviewed },
  { id: "trading-value", kind: "faq", triggers: ["거래대금"], answer: "거래대금은 하루 동안 그 종목이 사고팔린 금액을 모두 더한 값이에요.", status: reviewed },
  { id: "regular-session", kind: "faq", triggers: ["정규장"], answer: "정규장은 평일 오전 9시부터 오후 3시 30분까지 주식을 사고팔 수 있는 시간이에요.", status: reviewed },
  // 장외 설명은 우리 주문 규칙(§5.1)과 같은 말을 해야 한다. 아이가 이 시간에 주문을
  // 넣으면 실제로 다음 거래일 시가로 예약된다.
  { id: "after-hours", kind: "faq", triggers: ["장외"], answer: "장외는 정규장 시간이 아닐 때를 말해요. 이때 넣은 시장가 주문은 다음 거래일 첫 가격으로 예약돼요.", status: reviewed },

  // 어린이 뉴스가 반복해서 쓰는 말.
  // 트리거를 `실적` 홑낱말로 두면 **`2024년 실적 알려줘` 를 가로챈다** — 그건 승인 종목
  // 사실 Tool 의 네 주제 중 하나다(§8). `questionForms` 로는 못 막는다. 형태가 안 잡힌
  // 입력을 정의형으로 보기 때문이다. 그래서 뜻을 묻는 꼴만 트리거로 잡는다.
  { id: "earnings", kind: "faq", triggers: ["실적이 뭐", "실적 뭐", "실적 뜻", "실적이란", "실적은 뭐"], answer: "실적은 회사가 정해진 기간 동안 얼마를 벌고 얼마가 남았는지 정리한 결과예요.", status: reviewed },
  { id: "treasury-stock", kind: "faq", triggers: ["자사주"], answer: "자사주는 회사가 자기 회사의 주식을 사서 가지고 있는 것을 말해요.", status: reviewed },
  // 뉴스가 실제로 쓰는 표기는 `전년 동기 대비` 쪽이 더 많다(발행 101건에서 7회 대 2회).
  // 같은 뜻이므로 항목을 늘리지 않고 트리거만 붙인다.
  { id: "year-over-year", kind: "faq", triggers: ["전년비", "전년 대비", "전년 동기 대비", "전년동기 대비", "전년 동기", "전년동기"], answer: "전년비는 작년 같은 기간과 견줘 얼마나 늘거나 줄었는지 나타내요.", status: reviewed },
  { id: "merger", kind: "faq", triggers: ["인수합병", "합병"], answer: "인수합병은 한 회사가 다른 회사를 사거나, 두 회사가 하나로 합치는 것이에요.", status: reviewed },
  { id: "new-product", kind: "faq", triggers: ["신제품"], answer: "신제품은 회사가 새로 만들어 내놓은 물건이나 서비스예요.", status: reviewed },
  { id: "recall", kind: "faq", triggers: ["리콜"], answer: "리콜은 팔았던 물건에 문제가 있어서 회사가 다시 거둬들여 고쳐 주는 것이에요.", status: reviewed },
  { id: "bonus-issue", kind: "faq", triggers: ["무상증자"], answer: "무상증자는 회사가 주주에게 돈을 받지 않고 주식을 더 나눠 주는 것이에요.", status: reviewed },
  { id: "rights-issue", kind: "faq", triggers: ["유상증자"], answer: "유상증자는 회사가 새 주식을 만들어 팔아서 필요한 돈을 모으는 것이에요.", status: reviewed },
  { id: "affiliate", kind: "faq", triggers: ["계열사"], answer: "계열사는 같은 그룹에 속해 서로 이어져 있는 회사들을 말해요.", status: reviewed },
  { id: "operating-loss", kind: "faq", triggers: ["영업손실"], answer: "영업손실은 회사가 본업으로 번 돈보다 쓴 돈이 많아서 남은 것이 마이너스인 상태예요.", status: reviewed },

  // 뉴스의 배경 — 금리·환율·물가와 짝이 되는 말.
  // `경기` 는 넣지 않는다. 축구 경기·경기 결과가 같은 낱말이라 스포츠 질문을 가로챈다.
  { id: "export", kind: "faq", triggers: ["수출"], answer: "수출은 우리나라에서 만든 물건을 다른 나라에 파는 것이에요.", status: reviewed },
  { id: "tariff", kind: "faq", triggers: ["관세"], answer: "관세는 다른 나라에서 들어오는 물건에 매기는 세금이에요.", status: reviewed },
  { id: "trade", kind: "faq", triggers: ["무역"], answer: "무역은 나라와 나라 사이에 물건을 사고파는 것이에요.", status: reviewed },
  { id: "boom-bust", kind: "faq", triggers: ["호황", "불황"], answer: "호황은 경제가 활발해서 물건이 잘 팔리는 때예요. 반대로 잘 안 팔리는 때는 불황이라고 해요.", status: reviewed },

  // 이 서비스가 다루지 않는 방법 — 뉴스·영상에서 듣고 와서 묻는 말이다.
  // 뜻을 알려 주되 **여기서는 하지 않는다**를 같은 답에 둔다. 하는 방법은 설명하지 않는다.
  { id: "short-selling", kind: "faq", triggers: ["공매도"], answer: "공매도는 주식을 빌려서 먼저 팔고 나중에 다시 사서 갚는 방법이에요. 이 모의투자에서는 하지 않아요.", status: reviewed },
  // `레버리지` 는 넣지 않는다. term 9종의 `riskStrategy` 가 몰빵과 함께 이미 답한다.
  { id: "futures", kind: "faq", triggers: ["선물거래", "선물 거래"], answer: "선물거래는 나중 날짜의 가격을 미리 정해 두고 사고파는 방법이에요. 이 모의투자에서는 회사 주식만 다뤄요.", status: reviewed },
  { id: "derivatives", kind: "faq", triggers: ["파생상품"], answer: "파생상품은 주식이나 환율 같은 것의 값에 따라 값이 정해지는 상품이에요. 이 모의투자에서는 다루지 않아요.", status: reviewed },
  { id: "margin-trading", kind: "faq", triggers: ["신용거래"], answer: "신용거래는 증권사에서 돈을 빌려 주식을 사는 것이에요. 이 모의투자에서는 빌리지 않고 가진 가상 현금으로만 주문해요.", status: reviewed },
  { id: "crypto-asset", kind: "faq", triggers: ["가상자산", "비트코인"], answer: "가상자산은 비트코인처럼 인터넷에서만 오가는 자산이에요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },
  { id: "pension", kind: "faq", triggers: ["연금"], answer: "연금은 일을 그만둔 뒤에 받을 돈을 미리 조금씩 모아 두는 것이에요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },
  { id: "insurance", kind: "faq", triggers: ["보험"], answer: "보험은 여럿이 조금씩 돈을 모아 두었다가 누가 사고를 당하면 도와주는 것이에요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },

  // ── 3차 추가 [2026-08-16] ──────────────────────────────────────────────
  // 근거는 추측이 아니라 **발행된 뉴스 101건의 `term_treatments` 전수 집계**다(§9.1).
  // 용어 230종 중 사전에 없던 160종을 세어, 2회 이상 반복되거나 기업 활동을 읽는 데
  // 계속 걸리는 말만 골랐다. 기사 고유명사(세포라)와 생활·연예 낱말(편의점·월드투어)은
  // 넣지 않는다 — 그 낱말의 답은 그 기사에 붙은 쉬운 말 풀이지 사전 문장이 아니다.
  // 재집계: `npx tsx features/f2-trade/prototypes/child-news-role-pipeline/term-frequency.ts --missing`

  // 기업이 하는 일 — 실적·공시 기사의 뼈대가 되는 말이다.
  { id: "contract", kind: "faq", triggers: ["계약"], answer: "계약은 무엇을 언제까지 해 주기로 서로 약속하고 문서로 남기는 것이에요. 회사끼리 맺은 계약은 정해진 기간 동안 지켜야 해요.", status: reviewed },
  { id: "factory", kind: "faq", triggers: ["공장"], answer: "공장은 물건을 많이 만들어 내는 큰 건물이에요. 공장을 새로 지으면 만들 수 있는 양이 늘어나요.", status: reviewed },
  { id: "stake", kind: "faq", triggers: ["지분"], answer: "지분은 회사 전체 주식 가운데 어떤 사람이나 회사가 가진 몫이에요. 지분이 많을수록 회사 일을 정할 때 낼 수 있는 목소리도 커져요.", status: reviewed },
  { id: "disclosure", kind: "faq", triggers: ["공시"], answer: "공시는 회사가 투자자에게 알려야 할 중요한 일을 공개하는 것이에요. 실적이나 큰 계약이 정해지면 정해진 곳에 올려 누구나 볼 수 있게 해요.", status: reviewed },
  { id: "acquisition", kind: "faq", triggers: ["인수"], answer: "인수는 다른 회사나 사업을 사서 넘겨받는 것이에요.", status: reviewed },
  { id: "divestiture", kind: "faq", triggers: ["매각"], answer: "매각은 가지고 있던 회사나 사업, 재산을 파는 것이에요.", status: reviewed },
  { id: "board-of-directors", kind: "faq", triggers: ["이사회"], answer: "이사회는 회사의 중요한 일을 모여서 정하는 모임이에요.", status: reviewed },
  { id: "holding-company", kind: "faq", triggers: ["지주사", "지주회사"], answer: "지주사는 다른 회사들의 주식을 가지고 그 회사들을 거느리는 회사예요.", status: reviewed },
  { id: "corporation", kind: "faq", triggers: ["법인"], answer: "법인은 사람처럼 계약을 맺고 재산을 가질 수 있게 만든 회사나 단체예요.", status: reviewed },
  { id: "share-cancellation", kind: "faq", triggers: ["자사주 소각", "주식 소각", "소각"], answer: "소각은 회사가 사 둔 자기 주식을 아예 없애는 것이에요. 없앤 만큼 남은 주식 수가 줄어들어요.", status: reviewed },

  // 실적 기사를 읽을 때 걸리는 말 — 숫자 옆에 늘 붙어 있다.
  { id: "consolidated-basis", kind: "faq", triggers: ["연결 기준", "연결기준", "연결 실적"], answer: "연결 기준은 본사와 본사가 거느린 회사들의 실적을 하나로 합쳐 계산하는 방법이에요. 본사만 따로 계산한 것은 별도 기준이라고 해요.", status: reviewed },
  { id: "profitability", kind: "faq", triggers: ["수익성"], answer: "수익성은 번 돈에서 비용을 빼고 얼마나 남는지를 보여주는 정도예요.", status: reviewed },
  { id: "growth-rate", kind: "faq", triggers: ["성장률"], answer: "성장률은 매출이나 이익이 지난 기간보다 얼마나 늘었는지 비율로 나타낸 값이에요.", status: reviewed },
  { id: "rebound", kind: "faq", triggers: ["반등"], answer: "반등은 내려가던 값이 다시 올라간 것을 뒤에서 부르는 말이에요.", status: reviewed },
  { id: "supply-chain", kind: "faq", triggers: ["공급망"], answer: "공급망은 재료를 구해 물건을 만들고 파는 곳까지 이어진 회사와 과정이에요.", status: reviewed },
  { id: "fuel-cost", kind: "faq", triggers: ["연료비"], answer: "연료비는 배나 자동차, 발전소를 움직이는 연료에 드는 돈이에요.", status: reviewed },
  { id: "funding", kind: "faq", triggers: ["조달"], answer: "조달은 사업에 필요한 돈이나 재료를 마련하는 것이에요.", status: reviewed },

  // 사람과 돈을 모으는 곳 — 뉴스에 이름만 나오고 뜻은 안 나온다.
  { id: "chief-executive", kind: "faq", triggers: ["최고경영자", "ceo"], answer: "최고경영자는 회사의 일을 가장 크게 책임지고 결정하는 사람이에요. 영어 약자로 CEO라고 불러요.", status: reviewed },
  { id: "private-equity", kind: "faq", triggers: ["사모펀드", "pef"], answer: "사모펀드는 정해진 소수의 투자자에게만 돈을 모아 굴리는 펀드예요. 이 서비스에서는 주식만 다뤄요.", status: reviewed },
] satisfies readonly ChatbotKnowledgeEntry[]).map((entry) =>
  entry.kind === "faq" && DAPIE_SCREEN_TERM_IDS.has(entry.id)
    ? {
        ...entry,
        explainScript:
          CHART_EXPLAIN_SCRIPTS[entry.id] ?? screenTermScript(entry.id, entry.answer),
      }
    : entry,
);

function normalize(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

export function findChatbotQuestionForm(query: string): ChatbotQuestionForm | null {
  const normalized = normalize(query);
  // "왜 ... 뭐야?" is still a reason question.  Decide the question act
  // before the conversational filler "뭐" can turn it into a definition.
  if (["\uC65C", "\uC774\uC720", "\uAE4C\uB2ED"].some((word) => normalized.includes(word))) return "reason";
  if (["뭐", "무엇", "무슨뜻", "뜻", "의미"].some((word) => normalized.includes(word))) return "definition";
  if (["어디", "어느화면", "어떤버튼"].some((word) => normalized.includes(word))) return "location";
  // "차트 보는 법 알려줘"는 `어떻게`·`하는법` 어디에도 걸리지 않아 형태가 null 로 떨어졌고,
  // null 은 아래 조회에서 형태 필터를 통째로 비활성화한다 — 절차 질문이 정의 답으로 새던 자리다.
  if (
    ["어떻게", "어케", "방법", "순서", "하는법", "보는법", "읽는법", "보려면", "읽으려면"].some(
      (word) => normalized.includes(word),
    )
  ) {
    return "procedure";
  }
  if (["왜", "이유", "까닭"].some((word) => normalized.includes(word))) return "reason";
  if (["언제", "몇시", "며칠", "몇일"].some((word) => normalized.includes(word))) return "time";
  if (["얼마", "몇개", "몇주", "몇원", "수량"].some((word) => normalized.includes(word))) return "quantity";
  if (["돼", "되", "가능", "맞아"].some((word) => normalized.includes(word))) return "confirmation";
  return null;
}

/**
 * 형태를 선언한 항목은 **그 형태의 질문에만** 답한다.
 *
 * 형태가 잡히지 않은 입력(`예대마진` 처럼 낱말만 던진 것)은 정의형으로 본다.
 * 예전에는 `questionForm === null` 이면 필터를 통째로 건너뛰어, 선언이 있어도
 * 형태를 못 읽은 질문에는 아무 항목이나 답할 수 있었다.
 */
function answersQuestionForm(
  entry: ChatbotKnowledgeEntry,
  questionForm: ChatbotQuestionForm | null,
) {
  if (!entry.questionForms) return true;
  return entry.questionForms.includes(questionForm ?? "definition");
}

/**
 * 공백을 지운 문자열에서 트리거를 찾되, **원문의 낱말 경계는 기억한다.**
 *
 * `normalize` 가 공백을 지우는 순간 낱말 경계도 함께 사라진다. 그래서 두 글자
 * 트리거가 남의 낱말 가운데에 걸렸다 — `공[시가] 뭐야?` 는 `시가`(그날 첫 가격),
 * `수주잔[고가] 뭐야?` 는 `고가`(그날 가장 높은 가격) 로 답이 나갔다(실측 2026-08-16).
 * 사전이 커질수록 두 글자 항목이 늘어 이 사고도 같이 늘어난다.
 *
 * 두 글자 트리거는 **원문에서 바로 앞 글자가 한글이면 버린다.** 세 글자 이상은
 * 우연히 겹칠 확률이 낮고, 겹쳐도 길이 정렬이 긴 쪽을 고른다.
 * 공백은 경계로 남으므로 `오늘 시가가 뭐야?` 의 `시가` 는 그대로 걸린다.
 */
const WORD_BOUNDARY_TRIGGER_LENGTH = 2;

/**
 * 두 글자 트리거가 **원문에서 낱말 첫머리에 있었는지**. 앞 글자가 한글이면 남의 낱말을
 * 가운데서 자른 것이라 버린다. 공백은 경계로 남으므로 `오늘 시가가` 의 `시가` 는 살아남는다.
 *
 * 라우터는 공백을 지운 문자열로 조회하므로(`normalizeChatInput`) 원문을 따로 받는다.
 * 원문에 그 낱말이 통째로 없으면(띄어 쓴 두 글자 등) 경계를 확인할 수 없어 버린다 —
 * 두 글자 낱말을 굳이 쪼개 쓰는 입력은 없고, 놓치는 쪽이 엉뚱한 답보다 낫다.
 */
function startsWordIn(rawQuery: string, trigger: string) {
  const source = rawQuery.toLowerCase();
  // 트리거는 공백을 지운 꼴이라 원문에서는 사이가 벌어져 있을 수 있다(`번 돈`).
  const spaced = new RegExp(
    [...trigger].map((letter) => letter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*"),
    "gu",
  );
  for (const match of source.matchAll(spaced)) {
    const before = source[match.index - 1];
    if (before === undefined || !/[가-힣]/u.test(before)) return true;
  }
  return false;
}

export function findChatbotKnowledge(query: string, rawQuery: string = query) {
  const normalized = normalize(query);
  const questionForm = findChatbotQuestionForm(query);
  return CHATBOT_KNOWLEDGE.filter((entry) => entry.status === "reviewed")
    .filter((entry) => answersQuestionForm(entry, questionForm))
    .map((entry) => ({
      entry,
      matchLength: Math.max(
        0,
        ...entry.triggers
          .map(normalize)
          .filter(
            (trigger) =>
              normalized.includes(trigger) &&
              (trigger.length > WORD_BOUNDARY_TRIGGER_LENGTH || startsWordIn(rawQuery, trigger)),
          )
          .map((trigger) => trigger.length),
      ),
    }))
    .filter(({ matchLength }) => matchLength > 0)
    .sort((left, right) => right.matchLength - left.matchLength)[0]?.entry;
}

export function findExplainScript(id: string) {
  return CHATBOT_KNOWLEDGE.find(
    (entry) => entry.status === "reviewed" && entry.explainScript?.id === id,
  )?.explainScript;
}
