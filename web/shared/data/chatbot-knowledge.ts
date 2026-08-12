import type { ExplainScript } from "../types/chatbot";

export type ChatbotKnowledgeKind = "glossary" | "faq";

export type ChatbotKnowledgeEntry = {
  id: string;
  kind: ChatbotKnowledgeKind;
  triggers: readonly string[];
  answer: string;
  explainScript?: ExplainScript;
  actionTarget?: "home" | "stock" | "order" | "archive";
  status: "draft" | "reviewed";
};

const reviewed = "reviewed" as const;

export const CHATBOT_KNOWLEDGE: readonly ChatbotKnowledgeEntry[] = [
  { id: "stock", kind: "glossary", triggers: ["주식"], answer: "주식은 회사의 작은 조각이라고 생각하면 돼요. 주식을 가진 사람은 그 회사의 주주가 돼요.", status: reviewed },
  { id: "shareholder", kind: "glossary", triggers: ["주주"], answer: "주주는 회사의 주식을 가진 사람이에요. 회사의 작은 조각을 함께 가진 사람이라고 생각하면 돼요.", status: reviewed },
  { id: "stock-item", kind: "glossary", triggers: ["종목"], answer: "종목은 거래 화면에서 구분하는 회사나 상품 하나를 말해요. 여기서는 각 회사의 주식이 하나의 종목이에요.", status: reviewed },
  { id: "buy", kind: "glossary", triggers: ["매수", "주식 사기"], answer: "매수는 주식을 사는 거래예요. 주문 전에 수량과 예상 금액, 그리고 고른 이유를 확인하면 돼요.", status: reviewed },
  { id: "sell", kind: "glossary", triggers: ["매도", "팔기"], answer: "매도는 가지고 있던 주식을 파는 거래예요. 팔고 나면 그 거래의 결과가 실현손익으로 기록돼요.", status: reviewed },
  { id: "order", kind: "glossary", triggers: ["주문"], answer: "주문은 주식을 사고팔겠다고 거래소에 알리는 과정이에요. 주문을 넣었다고 바로 거래가 끝나는 것은 아니에요.", status: reviewed },
  { id: "execution", kind: "glossary", triggers: ["체결"], answer: "체결은 사고 싶은 사람과 팔고 싶은 사람이 만나 거래가 완료된 상태예요. 체결된 뒤에 보유 수량이 바뀌어요.", status: reviewed },
  { id: "current-price", kind: "glossary", triggers: ["현재가"], answer: "현재가는 지금 화면에 표시된 최근 거래 가격이에요. 시간이 지나면 달라질 수 있어요.", status: reviewed },
  { id: "market-order", kind: "glossary", triggers: ["시장가"], answer: "시장가는 지금 시장에서 거래되는 가격으로 주문하는 방법이에요. 주문을 넣는 순간의 가격과 조금 달라질 수 있어요.",
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
          explanation: "값을 내가 적지 않는 주문부터 생각해 봐요.",
          question: "그럼 주문 값은 누가 정할까요?",
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
  { id: "limit-order", kind: "glossary", triggers: ["지정가"], answer: "지정가는 내가 정한 가격에만 주문이 되도록 하는 방법이에요. 그 가격에 거래 상대가 없으면 바로 체결되지 않을 수 있어요.",
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
          explanation: "주문할 때 원하는 값을 직접 적어 두는 모습을 떠올려 봐요.",
          question: "그 값을 적는 사람은 누구일까요?",
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
  { id: "quantity", kind: "glossary", triggers: ["수량", "몇 주"], answer: "수량은 사고팔 주식의 개수예요. 한 주 가격과 곱하면 대략의 거래 금액을 확인할 수 있어요.", status: reviewed },
  { id: "estimated-amount", kind: "glossary", triggers: ["예상 금액"], answer: "예상 금액은 주문 수량과 가격으로 계산한 돈이에요. 주문을 확정하기 전 최종 금액을 다시 확인해 주세요.", status: reviewed },
  { id: "evaluation-amount", kind: "glossary", triggers: ["평가금액"], answer: "평가금액은 지금 가지고 있는 주식이 현재 가격으로 얼마인지 보여주는 금액이에요. 아직 팔지 않았다면 가격에 따라 바뀔 수 있어요.", status: reviewed },
  { id: "unrealized-profit", kind: "glossary", triggers: ["평가손익"], answer: "평가손익은 아직 가진 주식의 값이 산 뒤보다 얼마나 달라졌는지 보여줘요. 아직 팔지 않은 변화라서 계속 바뀔 수 있어요.",
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
          explanation: "거래가 아직 끝나지 않은 상태부터 생각해 봐요.",
          question: "주식을 아직 가지고 있다면 결과는 어떤 상태일까요?",
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
  { id: "realized-profit", kind: "glossary", triggers: ["실현손익"], answer: "실현손익은 주식을 팔아 거래가 끝난 뒤 기록되는 결과예요. 평가손익과 달리 이미 끝난 거래의 기록이에요.",
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
          explanation: "주식을 팔아 거래가 끝난 장면부터 생각해 봐요.",
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
  { id: "return", kind: "glossary", triggers: ["수익률"], answer: "수익률은 처음 금액과 지금 금액이 얼마나 달라졌는지 비율로 보는 방법이에요. 숫자뿐 아니라 왜 골랐는지도 같이 돌아보면 좋아요.", status: reviewed },
  { id: "average-price", kind: "glossary", triggers: ["평균 매수가", "평균매수가"], answer: "평균 매수가는 같은 종목을 여러 번 샀을 때 한 주당 평균으로 얼마에 샀는지 보여주는 가격이에요.", status: reviewed },
  { id: "sector", kind: "glossary", triggers: ["업종"], answer: "업종은 비슷한 일을 하는 회사들을 묶은 이름이에요. 예를 들어 게임 회사나 식품 회사처럼 나눌 수 있어요.", status: reviewed },
  { id: "market-cap", kind: "glossary", triggers: ["시가총액"], answer: "시가총액은 회사의 주식 전체를 현재 가격으로 계산한 크기예요. 회사가 하는 일이나 성적을 모두 보여주는 숫자는 아니에요.", status: reviewed },
  { id: "revenue", kind: "glossary", triggers: ["매출"], answer: "매출은 회사가 물건이나 서비스를 팔아 받은 돈의 규모예요. 매출이 모두 회사의 이익은 아니에요.", status: reviewed },
  { id: "operating-profit", kind: "glossary", triggers: ["영업이익"], answer: "영업이익은 회사가 본업으로 번 돈에서 본업에 든 비용을 뺀 결과예요. 회사의 공개된 과거 성적을 볼 때 쓰는 말이에요.", status: reviewed },
  { id: "dividend", kind: "glossary", triggers: ["배당"], answer: "배당은 회사가 번 이익 일부를 주주에게 나누어 주는 것을 말해요. 모든 회사가 배당하는 것은 아니에요.", status: reviewed },
  {
    id: "per",
    kind: "glossary",
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
        explanation: "PER에는 회사가 번 돈과 시장에서 정해진 주가가 함께 들어가요.",
        question: "그럼 직원 수는 PER 비교에 들어갈까요?",
        choices: [
          { id: "no", label: "들어가지 않아요" },
          { id: "yes", label: "들어가요" },
        ],
        answerId: "no",
      },
      detail: "같은 업종의 회사끼리 PER을 함께 보면 이익에 비해 주가가 어떻게 보이는지 비교하는 데 도움이 돼요.",
      example: "같은 업종의 두 회사가 비슷한 이익을 냈는데 한 회사의 주가가 더 높다면 PER도 다르게 보일 수 있어요.",
    },
    status: reviewed,
  },
  { id: "pbr", kind: "glossary", triggers: ["pbr", "주가순자산비율"], answer: "PBR은 회사가 가진 자산과 주가를 비교해 보는 숫자예요. 이 숫자 하나만으로 좋고 나쁜 회사를 정할 수는 없어요.",
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
          explanation: "회사의 건물·기계·남은 돈을 한 묶음으로 생각해 봐요.",
          question: "이 묶음은 무엇을 뜻할까요?",
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
  { id: "eps", kind: "glossary", triggers: ["eps", "주당순이익"], answer: "EPS는 회사가 번 이익을 주식 한 주당으로 나누어 본 숫자예요. 회사의 과거 성적을 읽을 때 쓰는 비교용 숫자예요.",
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
          explanation: "회사가 번 돈을 주식 조각마다 나눈다고 생각해 봐요.",
          question: "돈을 나눌 때 무엇의 수가 필요할까요?",
          choices: [
            { id: "shares", label: "전체 주식 수" },
            { id: "stores", label: "가게 수" },
          ],
          answerId: "shares",
        },
        detail:
          "회사가 한 해에 번 돈을 전체 주식 수로 나누면 EPS가 나와요. 조각 하나가 얼마씩 벌었는지 보는 숫자예요.",
        example:
          "피자 한 판을 여덟 조각으로 나누면 한 조각 몫이 정해지죠. EPS도 번 돈을 조각 수로 나눈 몫이에요.",
      },
    status: reviewed },
  { id: "etf", kind: "glossary", triggers: ["etf"], answer: "ETF는 여러 회사의 주식을 한 바구니에 담아 둔 상품이에요. 어떤 회사들이 담겼는지는 상품 설명에서 확인할 수 있어요.", status: reviewed },
  { id: "index", kind: "glossary", triggers: ["지수"], answer: "지수는 여러 주식의 가격 움직임을 한눈에 보기 위해 만든 숫자예요. 시장 전체나 특정 업종의 흐름을 살펴볼 때 써요.", status: reviewed },
  { id: "diversification", kind: "glossary", triggers: ["분산투자", "분산 투자"], answer: "분산투자는 한 곳에만 담지 않고 여러 곳에 나누어 보는 방법이에요. 결과를 보장하지는 않지만 한 종목에만 의존하는 정도는 줄일 수 있어요.",
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
          explanation: "달걀을 여러 바구니에 나눠 담은 모습을 떠올려 봐요.",
          question: "바구니 하나를 떨어뜨려도 나머지 달걀은 남을까요?",
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
  { id: "chart", kind: "glossary", triggers: ["차트"], answer: "차트는 과거 가격 변화를 그림으로 보여줘요. 과거 기록을 보는 도구이지, 미래 가격을 알려주는 그림은 아니에요.", status: reviewed },
  { id: "volume", kind: "glossary", triggers: ["거래량"], answer: "거래량은 얼마나 많은 주식이 사고팔렸는지 나타내는 숫자예요. 거래량이 많다고 앞으로 가격이 어떻게 될지는 알 수 없어요.", status: reviewed },
  { id: "volatility", kind: "glossary", triggers: ["변동성"], answer: "변동성은 가격이 오르내리는 폭이 얼마나 큰지 말해요. 가격은 늘 움직일 수 있다는 점을 기억하면 돼요.", status: reviewed },
  { id: "risk", kind: "glossary", triggers: ["위험"], answer: "투자에서 위험은 생각한 것과 다른 결과가 생길 수 있다는 뜻이에요. 그래서 이유를 기록하고 여러 정보를 함께 보는 연습이 중요해요.", status: reviewed },
  { id: "reason", kind: "faq", triggers: ["투자 근거", "고른 이유", "기록"], answer: "기록에서는 고른 이유와 확신도를 남길 수 있어요. 정답을 맞히는 시험이 아니라, 나중에 내 생각을 돌아보기 위한 거예요.", status: reviewed },
  { id: "confidence", kind: "faq", triggers: ["확신도", "확신"], answer: "확신도는 내 생각이 얼마나 또렷한지 표시하는 방법이에요. 정답은 없고, 나중에 행동과 생각을 돌아보기 위한 기록이에요.", status: reviewed },
  { id: "archive", kind: "faq", triggers: ["아카이브"], answer: "아카이브에서는 남긴 거래와 생각을 다시 볼 수 있어요. 점수표가 아니라 투자 스타일을 관찰하는 기록이에요.", actionTarget: "archive", status: reviewed },
  { id: "stock-search", kind: "faq", triggers: ["종목 검색", "회사 찾기", "종목 찾기"], answer: "종목 화면의 검색창에 회사 이름을 입력하거나 업종 칩을 눌러 찾아볼 수 있어요. 이 서비스가 제공하는 종목 안에서만 검색돼요.", actionTarget: "stock", status: reviewed },
  { id: "buy-flow", kind: "faq", triggers: ["매수 어떻게", "사는 방법", "매수 방법"], answer: "종목 상세에서 매수를 누르고 수량과 예상 금액을 확인해요. 고른 이유·확신도·예상 보유기간을 기록한 뒤 주문 확인을 누르면 돼요.", actionTarget: "order", status: reviewed },
  { id: "sell-flow", kind: "faq", triggers: ["매도 어떻게", "파는 방법", "매도 방법"], answer: "보유 종목에서 매도를 누르고 수량과 파는 이유를 확인해요. 주문 내용을 마지막으로 확인한 뒤 체결하면 기록에 남아요.", actionTarget: "order", status: reviewed },
  { id: "order-check", kind: "faq", triggers: ["주문 전에", "주문 확인", "뭘 확인"], answer: "주문 전에는 종목 이름, 매수·매도 구분, 수량과 예상 금액을 확인해요. 남긴 이유도 맞는지 한 번 더 보면 돼요.", actionTarget: "order", status: reviewed },
  { id: "portfolio", kind: "faq", triggers: ["포트폴리오", "보유 종목", "내가 가진 주식"], answer: "홈의 포트폴리오에서 가진 종목과 남은 모의투자 금액을 볼 수 있어요. 화면의 수치는 가격에 따라 달라질 수 있어요.", actionTarget: "home", status: reviewed },
  { id: "family-comparison", kind: "faq", triggers: ["가족 비교", "부모 비교", "엄마랑 비교", "아빠랑 비교"], answer: "아카이브의 가족 비교에서는 서로 동의한 경우에만 투자 스타일을 나란히 볼 수 있어요. 누가 더 잘했는지 점수를 매기는 기능은 아니에요.", actionTarget: "archive", status: reviewed },
  { id: "league-rule", kind: "faq", triggers: ["리그 규칙", "가족 리그", "모의투자 리그"], answer: "가족 리그에서는 각자 받은 모의투자금으로 투자하고 기록을 남겨요. 실제 돈을 주문하는 서비스가 아니에요.", actionTarget: "home", status: reviewed },
  { id: "stock-universe", kind: "faq", triggers: ["지원 종목", "종목 목록", "몇 개 종목"], answer: "이 데모에서는 정해진 국내 종목 51개만 살펴볼 수 있어요. 종목 화면에서 이름이나 업종으로 찾아봐요.", actionTarget: "stock", status: reviewed },
  { id: "trade-history", kind: "faq", triggers: ["거래 내역", "지난 주문", "체결 내역", "지난 기록"], answer: "지난 거래와 그때 남긴 생각은 아카이브에서 다시 볼 수 있어요. 다른 가족의 원문 기록은 볼 수 없어요.", actionTarget: "archive", status: reviewed },
  { id: "price-location", kind: "faq", triggers: ["현재가 어디", "가격 어디", "주가 어디"], answer: "종목 상세 화면에서 현재가와 가격 변화를 볼 수 있어요. 현재가는 계속 바뀔 수 있으니 화면에 표시된 시각도 함께 확인해요.", actionTarget: "stock", status: reviewed },
  { id: "cash-balance", kind: "faq", triggers: ["남은 돈", "잔액", "모의투자금"], answer: "홈의 포트폴리오에서 남은 모의투자금을 확인할 수 있어요. 가족이 함께 쓰는 돈이 아니라 계정마다 따로 관리돼요.", actionTarget: "home", status: reviewed },
  { id: "chatbot-role", kind: "faq", triggers: ["키웅이가 뭘", "챗봇이 뭘", "뭘 도와줘"], answer: "저는 금융 기초, 화면 사용법, 검수된 회사 정보와 기록을 쉽게 설명해 줘요. 종목을 골라 주거나 언제 사고팔지 정해 주지는 않아요. 🐻", status: reviewed },
];

function normalize(value: string) {
  return value.replaceAll(" ", "").toLowerCase();
}

export function findChatbotKnowledge(query: string) {
  const normalized = normalize(query);
  return CHATBOT_KNOWLEDGE.filter((entry) => entry.status === "reviewed")
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
