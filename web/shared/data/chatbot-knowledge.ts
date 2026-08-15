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
    brief: "주식은 회사를 잘게 나눈 작은 조각이에요. 주식을 가지면 회사의 일부를 함께 가진 주주가 돼요.",
    check: {
      question: "주식 한 주는 무엇을 뜻할까요?",
      choices: [
        { id: "company-piece", label: "회사의 작은 조각" },
        { id: "employee-name", label: "직원의 이름" },
        { id: "order-paper", label: "주문서 한 장" },
      ],
      answerId: "company-piece",
    },
    adjust: {
      explanation: "회사를 피자처럼 여러 조각으로 나눈 것이 주식이에요. 그래서 조각 하나를 가진 사람은 회사의 일부를 가진 거예요.",
      question: "주식 한 조각을 가진 사람은 회사의 일부를 가진 걸까요?",
      choices: [
        { id: "yes", label: "회사의 일부를 가져요" },
        { id: "no", label: "회사와 관계없어요" },
      ],
      answerId: "yes",
    },
    detail: "회사는 필요한 돈을 모으려고 주식을 만들어요. 사람들은 그 주식을 사고팔 수 있고, 가진 사람을 주주라고 불러요.",
    example: "피자 한 판을 여러 조각으로 나눈 모습을 떠올려 봐요. 주식 한 주는 그중 한 조각처럼 회사의 일부를 나타내요.",
  }),
  shareholder: termScript("shareholder", {
    brief: "주주는 회사의 주식을 가진 사람이에요. 회사에서 일하지 않아도 주식만 있으면 주주예요.",
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
        { id: "receipt", label: "그 회사의 영수증" },
      ],
      answerId: "stock",
    },
    detail: "주주는 가진 주식 수만큼 회사의 일부를 함께 가진 사람이에요. 직원이나 손님이라는 이유만으로 주주가 되는 것은 아니에요.",
    example: "피자 조각을 가진 사람이 그 조각의 주인인 것과 비슷해요. 회사의 주식 조각을 가진 사람이 주주예요.",
  }),
  "stock-item": termScript("stock-item", {
    brief: "종목은 거래 화면에서 구분하는 회사나 상품 하나를 말해요. 여기서는 회사마다 주식이 하나의 종목이에요.",
    check: {
      question: "거래 화면에서 종목 하나는 무엇을 가리킬까요?",
      choices: [
        { id: "one-company", label: "회사나 상품 하나" },
        { id: "all-market", label: "주식시장 전체" },
        { id: "one-button", label: "주문 버튼 하나" },
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
    detail: "종목에는 구분을 위한 이름과 코드가 있어요. 같은 시장에서도 회사나 상품이 다르면 서로 다른 종목이에요.",
    example: "도서관에서 책마다 제목과 번호가 있는 것과 비슷해요. 거래 화면도 종목 이름과 코드로 회사를 구분해요.",
  }),
  buy: termScript("buy", {
    brief: "매수는 주식을 사는 거래예요. 주문이 체결되면 산 만큼 내 보유 주식이 늘어나요.",
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
        { id: "no", label: "가지고 있던 것도 없어져요" },
      ],
      answerId: "yes",
    },
    detail: "매수 주문을 냈다고 바로 주식을 가진 것은 아니에요. 사고파는 조건이 맞아 체결되어야 보유 수량이 늘어나요.",
    example: "가게에서 물건을 사겠다고 말한 것은 주문이고, 돈을 내고 물건을 받은 때가 체결이에요. 주식 매수도 체결 뒤에 보유 목록에 들어와요.",
  }),
  sell: termScript("sell", {
    brief: "매도는 가지고 있던 주식을 파는 거래예요. 주문이 체결되면 판 만큼 보유 주식이 줄어들어요.",
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
    detail: "매도도 주문만으로 끝나지 않고 체결되어야 해요. 체결된 수량만큼 보유 주식이 줄고 거래 결과가 기록돼요.",
    example: "가지고 있던 카드를 친구에게 팔면 내 카드 수가 줄어드는 것과 비슷해요. 주식도 매도가 체결된 만큼 줄어들어요.",
  }),
  order: termScript("order", {
    brief: "주문은 주식을 사고팔겠다는 뜻을 거래소에 알리는 과정이에요. 주문을 넣었다고 거래가 바로 끝나는 것은 아니에요.",
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
    detail: "주문에는 매수인지 매도인지, 수량과 가격 조건이 담겨요. 조건이 맞아 체결되어야 실제 보유 수량이 바뀌어요.",
    example: "식당에서 음식을 부탁한 순간이 주문이고, 음식이 나온 순간이 완료에 가까워요. 주식도 주문과 체결은 다른 단계예요.",
  }),
  execution: termScript("execution", {
    brief: "체결은 매수와 매도 조건이 맞아 거래가 완료된 상태예요. 체결이 되어야 보유 수량이 실제로 바뀌어요.",
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
        { id: "search", label: "검색" },
      ],
      answerId: "execution",
    },
    detail: "사려는 가격과 팔려는 조건이 맞으면 주문이 체결돼요. 체결 뒤에는 매수·매도 수량이 실제 기록에 반영돼요.",
    example: "중고 장터에서 사고 싶은 사람과 팔고 싶은 사람이 조건에 동의한 순간과 비슷해요. 약속이 맞아 거래가 끝난 상태가 체결이에요.",
  }),
  "current-price": termScript("current-price", {
    brief: "현재가는 지금 화면에 표시된 최근 거래 가격이에요. 새 거래가 생기면 달라질 수 있어요.",
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
    detail: "현재가는 새 거래가 생길 때 달라질 수 있어요. 미래 가격을 미리 정해 둔 숫자가 아니라 최근 거래 기록이에요.",
    example: "운동 경기의 현재 점수가 경기 중에 계속 바뀌는 것과 비슷해요. 화면을 본 시각에 따라 표시된 값이 다를 수 있어요.",
  }),
  quantity: termScript("quantity", {
    brief: "수량은 사고팔 주식의 개수예요. 가격이 아니라 몇 주인지 세는 숫자예요.",
    check: {
      question: "주식 수량은 무엇을 세는 숫자일까요?",
      choices: [
        { id: "share-count", label: "사고팔 주식의 개수" },
        { id: "company-age", label: "회사의 나이" },
        { id: "price-change", label: "가격이 변한 폭" },
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
    detail: "수량과 한 주 가격을 함께 보면 대략 필요한 금액을 계산할 수 있어요. 수량은 돈의 크기가 아니라 주식 개수예요.",
    example: "연필을 몇 자루 살지 정하는 것과 비슷해요. 연필 수가 수량이고, 한 자루 값은 가격이에요.",
  }),
  "estimated-amount": termScript("estimated-amount", {
    brief: "예상 금액은 주문 수량과 가격으로 미리 계산해 본 돈이에요. 주문을 확정하기 전에 확인하는 값이에요.",
    check: {
      question: "예상 금액을 계산할 때 무엇이 필요할까요?",
      choices: [
        { id: "quantity-price", label: "수량과 주문 가격" },
        { id: "company-age", label: "회사의 나이" },
        { id: "employee-count", label: "직원 수" },
      ],
      answerId: "quantity-price",
    },
    adjust: {
      explanation: "한 개의 가격과 몇 개를 살지 알면 전체 금액을 미리 계산할 수 있어요. 주식도 한 주 가격과 수량을 곱해 예상 금액을 구해요.",
      question: "전체 금액을 알려면 개수와 무엇이 필요할까요?",
      choices: [
        { id: "unit-price", label: "한 개의 가격" },
        { id: "company-name", label: "회사 이름의 길이" },
      ],
      answerId: "unit-price",
    },
    detail: "예상 금액은 주문을 확정하기 전에 필요한 돈을 살펴보는 값이에요. 시장가처럼 체결 가격이 달라질 수 있는 주문은 실제 결과와 차이가 날 수 있어요.",
    example: "연필 한 자루 값에 살 자루 수를 곱해 미리 필요한 돈을 보는 것과 같아요. 주식도 수량과 가격으로 예상 금액을 계산해요.",
  }),
  "evaluation-amount": termScript("evaluation-amount", {
    brief: "평가금액은 가진 주식을 현재 가격으로 계산한 금액이에요. 가격이 움직이면 함께 달라질 수 있어요.",
    check: {
      question: "평가금액은 무엇을 현재 가격으로 계산할까요?",
      choices: [
        { id: "holding", label: "지금 가진 주식" },
        { id: "future-order", label: "내일 넣을 주문" },
        { id: "employee", label: "회사의 직원 수" },
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
    detail: "평가금액은 보유 수량과 현재가로 계산해요. 아직 팔지 않은 주식의 현재 값이라 가격이 움직이면 함께 바뀔 수 있어요.",
    example: "가지고 있는 카드들을 오늘의 카드 값으로 다시 계산하는 것과 비슷해요. 카드 값이 바뀌면 전체 평가금액도 달라져요.",
  }),
  return: termScript("return", {
    brief: "수익률은 처음 금액에 비해 지금 금액이 얼마나 달라졌는지 비율로 보는 값이에요. 기준은 항상 처음 출발한 금액이에요.",
    check: {
      question: "수익률은 무엇을 비교할까요?",
      choices: [
        { id: "start-now", label: "처음 금액과 지금 금액" },
        { id: "staff-store", label: "직원 수와 가게 수" },
        { id: "name-length", label: "회사 이름의 길이" },
      ],
      answerId: "start-now",
    },
    adjust: {
      explanation: "수익률의 기준은 처음 출발한 금액이에요. 지금 금액이 처음 금액에서 얼마나 달라졌는지를 비율로 나타내요.",
      question: "수익률은 지금 금액을 무엇과 비교할까요?",
      choices: [
        { id: "compare", label: "처음 금액과 비교해요" },
        { id: "not-compare", label: "처음 금액은 보지 않아요" },
      ],
      answerId: "compare",
    },
    detail: "수익률은 서로 다른 크기의 투자 결과를 비율로 살펴볼 때 사용해요. 지난 변화를 보여줄 뿐 앞으로의 결과를 알려주지는 않아요.",
    example: "서로 다른 길이의 달리기에서 출발점부터 얼마나 이동했는지 비율로 비교하는 것과 비슷해요. 출발한 금액이 기준이 돼요.",
  }),
  "average-price": termScript("average-price", {
    brief: "평균 매수가는 같은 종목을 여러 번 샀을 때 한 주당 평균으로 낸 가격이에요. 지금 시장의 현재가와는 다른 값이에요.",
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
        { id: "volume", label: "거래량" },
      ],
      answerId: "average-price",
    },
    detail: "평균 매수가는 같은 종목에 쓴 전체 금액을 산 주식 수로 나누어 계산해요. 현재가와는 다른 값이에요.",
    example: "같은 연필을 다른 날 서로 다른 값에 샀다고 해 봐요. 산 연필 전체의 한 자루당 평균값이 평균 매수가와 비슷해요.",
  }),
  sector: termScript("sector", {
    brief: "업종은 비슷한 일을 하는 회사들을 묶은 이름이에요. 게임 회사끼리, 식품 회사끼리 묶는 식이에요.",
    check: {
      question: "같은 업종의 회사들은 무엇이 비슷할까요?",
      choices: [
        { id: "business", label: "주로 하는 일" },
        { id: "name-length", label: "회사 이름의 길이" },
        { id: "logo-color", label: "로고 색깔" },
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
    detail: "업종을 보면 회사가 어떤 산업에서 활동하는지 알 수 있어요. 같은 업종이라도 회사마다 사업 내용과 결과는 다를 수 있어요.",
    example: "도서관에서 과학책과 역사책을 분야별로 묶는 것과 비슷해요. 회사도 하는 일이 비슷하면 같은 업종으로 묶어요.",
  }),
  "market-cap": termScript("market-cap", {
    brief: "시가총액은 회사의 모든 주식을 현재 가격으로 계산한 전체 크기예요. 현재가에 전체 주식 수를 곱해 구해요.",
    check: {
      question: "시가총액을 계산할 때 무엇을 함께 볼까요?",
      choices: [
        { id: "price-shares", label: "현재가와 전체 주식 수" },
        { id: "staff-age", label: "직원 수와 회사 나이" },
        { id: "stores-logo", label: "가게 수와 로고 색" },
      ],
      answerId: "price-shares",
    },
    adjust: {
      explanation: "주식 한 조각의 현재 값에 전체 조각 수를 곱하면 조각 전체의 값이 나와요. 그 값이 시장에서 본 회사의 전체 크기예요.",
      question: "모든 조각의 현재 값을 합치면 무엇을 볼 수 있을까요?",
      choices: [
        { id: "company-size", label: "시장에서 본 회사의 전체 크기" },
        { id: "employee-pay", label: "직원 한 명의 월급" },
      ],
      answerId: "company-size",
    },
    detail: "시가총액은 현재가에 전체 주식 수를 곱해 계산해요. 시장에서 본 회사의 크기를 나타내지만 회사의 모든 장점과 단점을 말해 주지는 않아요.",
    example: "퍼즐 한 조각의 현재 값에 전체 조각 수를 곱해 퍼즐 전체 값을 보는 것과 비슷해요. 주식 조각 전체의 값이 시가총액이에요.",
  }),
  revenue: termScript("revenue", {
    brief: "매출은 회사가 물건이나 서비스를 팔아 받은 돈의 전체 규모예요. 아직 비용을 빼기 전의 값이에요.",
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
      question: "매출은 어느 쪽을 먼저 셀까요?",
      choices: [
        { id: "sales-money", label: "팔아서 들어온 돈" },
        { id: "remaining-profit", label: "비용을 빼고 남은 돈만" },
      ],
      answerId: "sales-money",
    },
    detail: "매출은 판매로 들어온 돈을 먼저 모아 본 값이에요. 재료비나 월급 같은 비용을 빼기 전이라 매출과 이익은 달라요.",
    example: "학교 장터에서 물건을 팔아 받은 돈을 모두 더한 것이 매출과 비슷해요. 재료를 산 돈을 빼기 전의 값이에요.",
  }),
  "operating-profit": termScript("operating-profit", {
    brief: "영업이익은 회사가 본업으로 번 돈에서 본업에 든 비용을 뺀 결과예요. 본업의 성적을 보는 값이에요.",
    check: {
      question: "영업이익을 볼 때 매출에서 무엇을 뺄까요?",
      choices: [
        { id: "business-cost", label: "본업에 든 비용" },
        { id: "stock-count", label: "전체 주식 수" },
        { id: "company-age", label: "회사의 나이" },
      ],
      answerId: "business-cost",
    },
    adjust: {
      explanation: "물건을 팔아 받은 돈에서 재료비와 월급처럼 본업에 쓴 돈을 빼 봐요. 그렇게 남은 본업의 결과가 영업이익이에요.",
      question: "본업으로 번 돈에서 본업 비용을 빼고 남은 결과는 무엇일까요?",
      choices: [
        { id: "operating-profit", label: "영업이익" },
        { id: "volume", label: "거래량" },
      ],
      answerId: "operating-profit",
    },
    detail: "영업이익은 회사의 본업이 지난 기간에 어떤 결과를 냈는지 보는 값이에요. 회사의 모든 돈 흐름이나 미래 결과를 뜻하지는 않아요.",
    example: "주스 가게의 판매금에서 과일값과 가게 운영비를 뺀 결과와 비슷해요. 본업을 운영하고 남은 돈을 보는 거예요.",
  }),
  dividend: termScript("dividend", {
    brief: "배당은 회사가 이익의 일부를 주주에게 나누어 주는 일이에요. 주식을 가진 사람만 받을 수 있어요.",
    check: {
      question: "배당을 받는 대상은 누구일까요?",
      choices: [
        { id: "shareholder", label: "회사의 주주" },
        { id: "all-customer", label: "물건을 산 모든 손님" },
        { id: "all-people", label: "세상의 모든 사람" },
      ],
      answerId: "shareholder",
    },
    adjust: {
      explanation: "회사가 이익의 일부를 나눠 주는 일을 배당이라고 해요. 받는 사람은 그 회사의 주식을 가진 주주예요.",
      question: "회사가 이익 일부를 주주에게 나누어 주는 일을 무엇이라고 할까요?",
      choices: [
        { id: "dividend", label: "배당" },
        { id: "order", label: "주문" },
      ],
      answerId: "dividend",
    },
    detail: "회사는 정해진 절차를 거쳐 배당 여부와 규모를 결정해요. 모든 회사가 언제나 배당하는 것은 아니에요.",
    example: "동아리 활동으로 남은 돈 일부를 구성원에게 나누는 모습과 비슷해요. 회사는 이익 일부를 주주에게 나눌 수 있어요.",
  }),
  etf: termScript("etf", {
    brief: "ETF는 여러 회사의 주식 같은 자산을 한 바구니에 담아 거래하는 상품이에요. 하나만 사도 여러 자산에 나눠 담는 효과가 있어요.",
    check: {
      question: "ETF 한 상품 안에는 무엇이 담길 수 있을까요?",
      choices: [
        { id: "many-assets", label: "여러 주식이나 자산" },
        { id: "employee-list", label: "회사 직원 명단" },
        { id: "future-price", label: "미래 가격의 정답" },
      ],
      answerId: "many-assets",
    },
    adjust: {
      explanation: "ETF는 여러 종류의 자산을 한 상자에 모아 둔 묶음 상품이에요. 물건 하나가 아니라 여러 자산이 함께 들어 있어요.",
      question: "ETF는 하나만 담은 물건일까요, 여러 자산을 묶은 상품일까요?",
      choices: [
        { id: "bundle", label: "여러 자산을 묶은 상품" },
        { id: "one-employee", label: "직원 한 명" },
      ],
      answerId: "bundle",
    },
    detail: "ETF는 정해진 기준에 따라 여러 자산을 담고 주식처럼 거래돼요. 어떤 자산이 얼마나 담겼는지는 상품 설명에서 확인해야 해요.",
    example: "여러 맛 과자가 함께 든 묶음 상자와 비슷해요. 상자마다 들어 있는 과자의 종류와 비율이 다를 수 있어요.",
  }),
  index: termScript("index", {
    brief: "지수는 여러 주식의 가격 움직임을 한눈에 보려고 만든 숫자예요. 시장 전체나 업종의 흐름을 볼 때 써요.",
    check: {
      question: "주가지수는 보통 무엇의 움직임을 묶어 보여줄까요?",
      choices: [
        { id: "stock-group", label: "여러 주식의 가격" },
        { id: "one-person", label: "한 사람의 수익률" },
        { id: "employee-age", label: "직원의 나이" },
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
    detail: "지수는 시장 전체나 특정 업종에 속한 여러 종목의 움직임을 요약해요. 한 회사의 값이나 미래 방향을 정해 주는 숫자는 아니에요.",
    example: "반 친구들의 기록을 모아 반 평균을 보는 것과 비슷해요. 한 친구가 아니라 여러 주식의 흐름을 묶어 보여줘요.",
  }),
  chart: termScript("chart", {
    brief: "차트는 시간이 지나며 가격이 어떻게 움직였는지 그림으로 보여주는 기록이에요. 지나간 기록이지 미래의 정답은 아니에요.",
    check: {
      question: "주가 차트가 직접 보여주는 것은 무엇일까요?",
      choices: [
        { id: "past-movement", label: "지나간 가격 움직임" },
        { id: "future-answer", label: "미래 가격의 정답" },
        { id: "company-rule", label: "회사의 사내 규칙" },
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
    detail: "차트의 가로축은 시간, 세로축은 가격처럼 변화를 읽는 기준을 보여줘요. 과거 기록을 살펴보는 도구이지 미래를 보장하는 그림은 아니에요.",
    example: "지난날의 기온을 선으로 그린 날씨 기록과 비슷해요. 지나간 변화는 볼 수 있지만 다음 날 기온의 정답은 아니에요.",
  }),
  volume: termScript("volume", {
    brief: "거래량은 일정한 동안 얼마나 많은 주식이 사고팔렸는지 나타내는 숫자예요. 많이 거래될수록 커져요.",
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
    detail: "거래량은 시장에서 거래가 얼마나 활발했는지 살펴보는 기록이에요. 거래량이 많다는 사실만으로 가격 방향을 알 수는 없어요.",
    example: "장터에서 하루 동안 주인이 바뀐 카드 수를 세는 것과 비슷해요. 많이 오가면 거래량은 크지만 카드 값의 다음 방향은 따로 알 수 없어요.",
  }),
  volatility: termScript("volatility", {
    brief: "변동성은 가격이 오르내리는 폭이 얼마나 큰지 나타내는 말이에요. 폭이 크면 변동성이 크다고 해요.",
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
    detail: "변동성이 크면 짧은 동안에도 가격이 크게 달라질 수 있어요. 변동성은 움직임의 폭을 말할 뿐 오를지 내릴지를 알려주지는 않아요.",
    example: "잔잔한 산책길과 높낮이가 큰 놀이기구를 비교해 봐요. 오르내림의 폭이 큰 쪽이 변동성이 큰 모습과 비슷해요.",
  }),
  risk: termScript("risk", {
    brief: "투자에서 위험은 생각한 것과 다른 결과가 생길 수 있다는 뜻이에요. 결과가 미리 정해져 있지 않다는 말이에요.",
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
        { id: "execution", label: "체결" },
      ],
      answerId: "risk",
    },
    detail: "투자에는 값이 줄거나 원하는 때 거래되지 않는 등 여러 위험이 있어요. 위험이 없다고 단정하지 않고 무엇이 달라질 수 있는지 살펴보면 돼요.",
    example: "소풍날 비가 올 수도 있는 것처럼 결과가 계획과 달라질 가능성이 있어요. 가능성을 미리 알고 살펴보는 것이 위험을 이해하는 출발점이에요.",
  }),
} satisfies Record<string, ExplainScript>;

// 8월 14일에 추가한 화면 용어도 용어별 DAPIE 흐름으로 설명한다.
function screenTermScript(id: string, brief: string): ExplainScript {
  return termScript(id, {
    brief,
    check: {
      question: "이 말은 화면의 무엇을 확인하는 데 쓰일까요?",
      choices: [
        { id: "screen-meaning", label: "화면에 보이는 뜻" },
        { id: "price-prediction", label: "앞으로의 가격" },
        { id: "trade-advice", label: "사고파는 답" },
      ],
      answerId: "screen-meaning",
    },
    adjust: {
      explanation: "이건 맞히는 시험이 아니에요. 화면에 적힌 이 말이 어떤 정보를 가리키는지 함께 확인하는 거예요.",
      question: "이 용어를 볼 때 먼저 확인할 것은 무엇일까요?",
      choices: [
        { id: "meaning", label: "그 말이 가리키는 화면 정보" },
        { id: "prediction", label: "미래 가격을 맞히는 법" },
      ],
      answerId: "meaning",
    },
    detail: brief,
    example: "화면에서 이 말을 발견하면, 그 숫자나 기록이 무엇을 보여주는지 차례로 읽어 보면 돼요.",
  });
}

const CHART_EXPLAIN_SCRIPTS: Record<string, ExplainScript> = {
  "line-chart": termScript("line-chart", { brief: "선차트는 정해 둔 시간마다의 가격을 선으로 이어 보여주는 차트예요.", check: { question: "선차트에서 이어지는 것은 무엇일까요?", choices: [{ id: "price", label: "가격의 흐름" }, { id: "company", label: "회사 이름" }, { id: "news", label: "뉴스 제목" }], answerId: "price" }, adjust: { explanation: "선차트는 시간마다의 가격 점을 선으로 이은 그림이에요. 선을 따라가면 가격이 어떻게 움직였는지 흐름을 읽기 쉬워요.", question: "선차트의 선은 무엇의 흐름을 보여줄까요?", choices: [{ id: "price", label: "가격" }, { id: "advice", label: "매수 조언" }], answerId: "price" }, detail: "선차트는 가격이 어떻게 움직였는지 보기 위한 그림이에요. 다음 가격을 알려 주는 그림은 아니에요.", example: "점들을 연필로 이어 그린 선처럼, 시간마다의 가격 점을 연결한 모습이에요." }),
  "candle-chart": termScript("candle-chart", { brief: "캔들차트는 한 기간의 시작값, 끝값, 가장 높고 낮은 값을 막대로 보여주는 차트예요.", check: { question: "캔들 하나는 무엇을 함께 보여줄까요?", choices: [{ id: "four-prices", label: "시작·끝·높음·낮음" }, { id: "future", label: "미래 가격" }, { id: "company", label: "회사 소개" }], answerId: "four-prices" }, adjust: { explanation: "캔들 하나에는 한 기간 안에서 가격이 어디서 시작해 어디까지 움직였는지 담겨요. 그 기간의 가격 움직임을 막대 하나로 보는 거예요.", question: "캔들 하나가 담는 것은 무엇일까요?", choices: [{ id: "range", label: "그 기간의 가격 움직임" }, { id: "recommendation", label: "매매 추천" }], answerId: "range" }, detail: "캔들의 몸통과 꼬리는 과거 한 기간 안의 가격 범위를 보여줘요. 다음 가격을 알려 주지는 않아요.", example: "하루 동안 가장 높았던 곳과 낮았던 곳을 표시한 막대라고 보면 돼요." }),
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
    detail: "주가는 사고팔려는 사람들의 주문이 만나 정해져요. 그래서 하루에도 여러 번 바뀌어요.",
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
    detail: "언제 파는지는 사람마다 다르고 정해진 답이 없어요. 저는 파는 때를 정해 줄 수 없어요.",
    example: "놀이에서 더 지기 전에 판을 접는 것과 비슷해요. 다만 언제 접을지는 스스로 정해요.",
  }),
  "net-interest-margin": termScript("net-interest-margin", {
    brief: "예대마진은 은행이 받은 이자와 준 이자의 차이예요.",
    check: {
      question: "예대마진은 무엇의 차이일까요?",
      choices: [
        { id: "interest", label: "받은 이자와 준 이자" },
        { id: "staff", label: "직원 수와 지점 수" },
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
    detail: "예대마진은 은행이 돈을 버는 방법 가운데 하나예요. 수익 구성은 은행마다 달라요.",
    example: "연필을 빌리며 사탕 하나를 주고, 다른 친구에게 빌려주며 사탕 둘을 받으면 그 차이가 남는 몫이에요.",
  }),
  "reason-tag": termScript("reason-tag", {
    brief: "투자 근거는 그 회사를 고른 이유를 골라 두는 기록이에요.",
    check: {
      question: "투자 근거는 무엇을 남기는 걸까요?",
      // 오답 보기에도 금지표현 규칙이 걸린다. "오를 가능성"은 예측 패턴이라 쓸 수 없다.
      choices: [
        { id: "why", label: "고른 이유" },
        { id: "name", label: "회사 이름" },
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
    detail: "뉴스·차트·회사 이해처럼 지금 이유에 가까운 것을 고르면 돼요. 나중에 아카이브에서 그때 생각을 다시 볼 수 있어요.",
    example: "일기에 왜 그렇게 했는지 한 줄 적어 두는 것과 비슷해요. 나중에 읽으면 그때 마음이 보여요.",
  }),
};

const DAPIE_SCREEN_TERM_IDS = new Set([
  "mock-investing", "total-assets", "available-cash", "holdings", "pending-order", "order-cancel", "sell-proceeds", "goal-price", "holding-period", "buy-day-record", "plan-badge", "line-chart", "candle-chart", "minute-chart", "daily-chart", "weekly-chart", "delayed-price", "child-news", "season", "trade-lock", "ranking", "family-feed", "profile-abilities", "profile-definition", "profile-status", "profile-character", "season-record",
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
          question: "시장가 주문은 값을 누가 정할까요?",
          choices: [
            { id: "market", label: "지금 시장" },
            { id: "me", label: "내가 직접" },
            { id: "bear", label: "키웅이" },
          ],
          answerId: "market",
        },
        adjust: {
          explanation: "시장가 주문에서는 값을 내가 적지 않아요. 지금 시장에서 거래되는 값을 그대로 받아서 주문해요.",
          question: "그럼 시장가 주문의 값은 누가 정할까요?",
          choices: [
            { id: "market", label: "지금 시장" },
            { id: "me", label: "내가 직접" },
          ],
          answerId: "market",
        },
        detail:
          "시장가는 내가 값을 정하지 않고 지금 시장에 나와 있는 값을 그대로 받아요. 그래서 주문을 넣는 순간과 조금 달라질 수 있어요.",
        example:
          "가게에 붙은 값표를 그대로 보고 고르는 것과 비슷해요. 값을 깎지 않는 대신 기다리지 않아도 돼요.",
      },
    status: reviewed },
  { id: "limit-order", kind: "glossary", category: "order", termLabel: "지정가", triggers: ["지정가", "내가 정한 가격에"], answer: "지정가는 내가 정한 가격에만 주문이 되도록 하는 방법이에요. 그 가격에 거래 상대가 없으면 바로 체결되지 않을 수 있어요.",
    explainScript: {
        id: "term:limit-order",
        brief: "지정가는 내가 정한 값에만 주문이 되도록 하는 방법이에요.",
        check: {
          question: "지정가 주문은 값을 누가 정할까요?",
          choices: [
            { id: "me", label: "내가 직접" },
            { id: "market", label: "지금 시장" },
            { id: "company", label: "회사" },
          ],
          answerId: "me",
        },
        adjust: {
          explanation: "지정가 주문에서는 원하는 값을 내가 직접 적어 두어요. 시장이 아니라 주문한 사람이 값을 정하는 방식이에요.",
          question: "지정가 주문에서 값을 적는 사람은 누구일까요?",
          choices: [
            { id: "me", label: "나" },
            { id: "market", label: "지금 시장" },
          ],
          answerId: "me",
        },
        detail:
          "지정가는 내가 원하는 값을 미리 적어 두는 방법이에요. 그 값에 거래할 상대가 없으면 주문이 바로 끝나지 않아요.",
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
          "평가손익은 지금 가진 주식을 오늘 값으로 계산한 결과예요. 아직 거래가 끝나지 않아서 숫자가 계속 바뀌어요.",
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
          "실현손익은 거래가 이미 끝나서 더 이상 바뀌지 않아요. 평가손익과 달리 지나간 기록이에요.",
        example:
          "친구와 카드를 바꾸고 나서 적어 둔 결과표와 비슷해요. 바꾼 뒤에는 숫자가 그대로 남아요.",
      },
    status: reviewed },
  { id: "return", kind: "glossary", category: "profit", termLabel: "수익률", triggers: ["수익률", "손실률"], answer: "수익률은 처음 금액과 지금 금액이 얼마나 달라졌는지 비율로 보는 방법이에요. 숫자뿐 아니라 왜 골랐는지도 같이 돌아보면 좋아요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.return, status: reviewed },
  { id: "average-price", kind: "glossary", category: "profit", termLabel: "평균 매수가", triggers: ["평균 매수가", "평균매수가", "평균"], answer: "평균 매수가는 같은 종목을 여러 번 샀을 때 한 주당 평균으로 얼마에 샀는지 보여주는 가격이에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["average-price"], status: reviewed },
  { id: "sector", kind: "glossary", category: "basics", termLabel: "업종", triggers: ["업종", "섹터"], answer: "업종은 비슷한 일을 하는 회사들을 묶은 이름이에요. 예를 들어 게임 회사나 식품 회사처럼 나눌 수 있어요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS.sector, status: reviewed },
  { id: "market-cap", kind: "glossary", category: "indicator", termLabel: "시가총액", triggers: ["시가총액"], answer: "시가총액은 회사의 주식 전체를 현재 가격으로 계산한 크기예요. 회사가 하는 일이나 성적을 모두 보여주는 숫자는 아니에요.", explainScript: GLOSSARY_EXPLAIN_SCRIPTS["market-cap"], status: reviewed },
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
          { id: "employee-count", label: "회사의 직원 수와 주가" },
        ],
        answerId: "profit-and-price",
      },
      adjust: {
        explanation: "PER이 비교하는 것은 딱 두 가지, 회사가 번 이익과 주가예요. 직원 수 같은 다른 숫자는 PER 계산에 들어가지 않아요.",
        question: "그럼 직원 수는 PER 비교에 들어갈까요?",
        choices: [
          { id: "no", label: "들어가지 않아요" },
          { id: "yes", label: "들어가요" },
        ],
        answerId: "no",
      },
      detail: "PER은 회사가 번 이익과 주가, 두 가지만 비교하는 숫자예요. 같은 업종 회사끼리 함께 보면 이익에 비해 주가가 어떻게 보이는지 비교할 수 있어요.",
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
            { id: "staff", label: "직원 수" },
            { id: "age", label: "회사 나이" },
          ],
          answerId: "asset",
        },
        adjust: {
          explanation: "회사가 가진 건물, 기계, 남은 돈을 한 묶음으로 모아 봐요. 이 묶음을 회사가 가진 재산이라고 불러요.",
          question: "건물과 기계, 남은 돈을 모은 이 묶음은 무엇일까요?",
          choices: [
            { id: "asset", label: "회사가 가진 재산" },
            { id: "staff", label: "직원 수" },
          ],
          answerId: "asset",
        },
        detail:
          "PBR은 회사 전체 값을 회사가 가진 재산으로 나눈 값이에요. 재산에는 건물과 기계, 남아 있는 돈이 함께 들어가요.",
        example:
          "가진 물건이 똑같은 가게가 두 곳 있다고 해 봐요. 한 곳이 세 배 비싸면 그 가게의 PBR이 더 커요.",
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
            { id: "staff", label: "직원 수" },
            { id: "stores", label: "가게 수" },
          ],
          answerId: "shares",
        },
        adjust: {
          explanation: "EPS는 회사가 번 돈을 주식 조각마다 얼마씩인지 나눈 값이에요. 나누려면 전체 주식 수가 필요해요.",
          question: "번 돈을 조각마다 나눌 때 무엇의 수가 필요할까요?",
          choices: [
            { id: "shares", label: "전체 주식 수" },
            { id: "stores", label: "가게 수" },
          ],
          answerId: "shares",
        },
        detail:
          "회사가 한 해에 번 돈을 전체 주식 수로 나누면 EPS가 나와요. 조각 하나가 얼마씩 벌었는지 보는 숫자예요.",
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
          "여러 곳에 나눠 두면 한 곳이 나빠져도 전체가 한꺼번에 흔들리지 않아요. 대신 한 곳이 아주 잘돼도 전체는 그만큼 크게 달라지지 않아요.",
        example:
          "달걀을 한 바구니에 다 담지 않는 것과 같아요. 바구니 하나를 떨어뜨려도 남은 달걀은 무사해요.",
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
  { id: "profile-abilities", kind: "faq", category: "profile", termLabel: "성향 축", triggers: ["정확력", "근거력", "집중력", "분산력", "직관력"], answer: "근거력·직관력은 매수 전 자료를 살펴본 기록을, 집중력·분산력은 보유 섹터와 현금 비중을, 정확력은 거래 뒤 5거래일의 가격 방향을 바탕으로 보여줘요. 어느 방향이 더 좋다는 뜻은 아니에요.", actionTarget: "archive", status: reviewed },
  { id: "profile-definition", kind: "faq", category: "profile", termLabel: "성향", triggers: ["성향이 뭐", "성향 뜻", "능력치 오각형"], answer: "성향은 이번 시즌 행동 기록을 몇 가지 특징으로 나눠 보여주는 결과예요. 실력이나 성격 검사가 아니며 기록이 쌓이면 바뀔 수 있어요.", actionTarget: "archive", status: reviewed },
  { id: "profile-status", kind: "faq", category: "profile", termLabel: "관찰 초기", triggers: ["관찰 초기", "별 판정 중", "5거래일"], answer: "관찰 초기에는 아직 성향 캐릭터를 정할 만큼 체결 매수 기록이 부족해요. 별 판정 중은 거래 뒤 5거래일이 지나지 않아 정확력 등급을 아직 계산하지 못한 상태예요.", actionTarget: "archive", status: reviewed },
  { id: "profile-character", kind: "faq", category: "profile", termLabel: "성향 캐릭터", triggers: ["저격수", "전략가", "승부사", "탐험가", "성향 캐릭터"], answer: "성향 캐릭터는 근거·직관과 집중·분산의 조합으로 이번 시즌 행동을 표현한 것이에요. 시즌마다 달라질 수 있고, 네 모습 중 어느 것이 더 좋다는 뜻은 아니에요.", actionTarget: "archive", status: reviewed },
  { id: "season-record", kind: "faq", category: "profile", termLabel: "시즌 기록", triggers: ["시즌 기록이 뭐야", "기록 카드"], answer: "시즌 기록은 이번 시즌의 매수·매도·메모·상세 열람 건수를 모아 보여줘요. 기록 카드는 시즌이 끝난 뒤 받는 요약이며, 현재는 4주차까지 잠겨 있어요.", actionTarget: "archive", status: reviewed },
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

export function findChatbotKnowledge(query: string) {
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
          .filter((trigger) => normalized.includes(trigger))
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
