export type GameEducationSource = {
  title: string;
  url: string;
  checkedAt: string;
};

export type GameEducation = {
  stockId: `KRX:${string}`;
  companySummary: string;
  businessModel: string;
  industryRole: string;
  elementaryExplanation: string;
  middleSchoolExplanation: string;
  financialSummary: string;
  financialSnapshot: {
    period: "2024";
    revenueKrwMillion: number;
    operatingProfitKrwMillion: number;
  };
  sources: readonly GameEducationSource[];
  /** 사람 검수를 마친 항목만 reviewed다. draft는 사실은 맞지만 아동 적합성 판단이 남았다. */
  status: "draft" | "reviewed";
};

const checkedAt = "2026-08-12";

export const GAME_EDUCATION: readonly GameEducation[] = [
  {
    stockId: "KRX:259960",
    companySummary: "크래프톤은 PC·모바일·콘솔에서 즐기는 게임을 만들고 서비스하는 회사예요.",
    businessModel: "게임 판매와 게임 안에서 선택하는 디지털 상품·서비스로 돈을 벌어요.",
    industryRole: "게임을 직접 만들고 여러 나라 이용자에게 서비스하는 개발·퍼블리싱 회사예요.",
    elementaryExplanation: "크래프톤은 친구들이 컴퓨터나 휴대폰으로 즐기는 게임을 만들고 오래 운영해요.",
   middleSchoolExplanation: "크래프톤은 게임 IP를 바탕으로 PC·모바일·콘솔 게임을 개발·서비스하며 게임 판매와 게임 안 디지털 상품·서비스에서 수입을 얻어요.",
    financialSummary: "2024년 연결 기준 매출은 2조 7,098억원, 영업이익은 1조 1,825억원이에요.",
   financialSnapshot: { period: "2024", revenueKrwMillion: 2709800, operatingProfitKrwMillion: 1182500 },
    sources: [
      { title: "KRAFTON 2024 consolidated financial statements", url: "https://www.krafton.com/wp-content/uploads/2025/05/2024_Consolidated_Financial_Statements_KRAFTON.pdf", checkedAt },
      { title: "KRAFTON 2024 annual earnings release", url: "https://press.krafton.com/en-GB/KRAFTON-RECORDS-ALL-TIME-HIGHS-IN-SALES-27098T-KRW-AND-OPERATING-PROFI", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:036570",
    companySummary: "엔씨소프트는 PC와 모바일에서 즐기는 게임을 개발하고 서비스하는 회사예요.",
    businessModel: "PC·모바일 게임 서비스와 다른 회사가 게임 안 콘텐츠를 쓰도록 허락하고 받는 사용료로 돈을 벌어요.",
    industryRole: "게임을 만들고 운영하면서 일부 게임은 다른 회사와 함께 서비스하는 개발·퍼블리싱 회사예요.",
    elementaryExplanation: "엔씨소프트는 컴퓨터와 휴대폰으로 즐기는 게임을 만들고 친구들이 계속 즐길 수 있게 운영해요.",
   middleSchoolExplanation: "엔씨소프트는 PC·모바일 게임을 개발·서비스하고 게임 서비스 매출과 게임 콘텐츠 이용 허락에 따른 사용료를 통해 수입을 얻어요.",
    financialSummary: "2024년 연결 기준 매출은 1조 5,800억원, 영업손실은 1,092억원이에요.",
   financialSnapshot: { period: "2024", revenueKrwMillion: 1580000, operatingProfitKrwMillion: -109200 },
    sources: [
      { title: "NCSOFT Announces Annual Financial Results for 2024", url: "https://about.ncsoft.com/en/news/article/news-update-250212", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:251270",
    companySummary: "넷마블은 모바일을 중심으로 여러 게임을 개발하고 서비스하는 회사예요.",
    businessModel: "여러 나라에 게임을 서비스하고 게임 이용과 게임 안 디지털 상품·서비스에서 돈을 벌어요.",
    industryRole: "게임을 직접 개발하거나 다른 개발사가 만든 게임을 이용자에게 서비스하는 개발·퍼블리싱 회사예요.",
    elementaryExplanation: "넷마블은 휴대폰으로 즐기는 게임을 만들거나 소개하고, 친구들이 게임을 즐길 수 있게 운영해요.",
   middleSchoolExplanation: "넷마블은 다양한 종류의 게임을 개발·퍼블리싱하고, 세계 여러 지역의 게임 서비스와 게임 안 디지털 상품·서비스로 수입을 얻어요.",
    financialSummary: "2024년 연결 기준 매출은 2조 6,638억원, 영업이익은 2,156억원이에요.",
   financialSnapshot: { period: "2024", revenueKrwMillion: 2663800, operatingProfitKrwMillion: 215600 },
    sources: [
      { title: "NETMARBLE REVEALS FOURTH QUARTER AND YEAR-END FINANCIAL RESULTS FOR 2024", url: "https://ch.netmarble.com/Eng/Newsroom/Detail?bbs_code=1020&post_seq=5532", checkedAt },
    ],
    status: "reviewed",
  },
  {
    // ⚠ 더블유게임즈는 소셜 카지노 게임 회사다. 아래 문구는 사실대로 적었을 뿐
    // 아동용으로 검수된 것이 아니다. status를 draft로 두었고, 화이트리스트
    // 적합성과 접점등급 5 배정을 사람이 판단하기 전까지 reviewed로 올리지 않는다.
    stockId: "KRX:192080",
    companySummary: "더블유게임즈는 스마트폰으로 하는 카지노 게임을 만들어 여러 나라에 서비스하는 회사예요.",
    businessModel: "게임 안에서 쓰는 디지털 아이템을 팔아서 돈을 벌어요.",
    industryRole: "직접 만든 게임을 자회사와 함께 해외 이용자에게 서비스하는 게임 개발·퍼블리싱 회사예요.",
    elementaryExplanation: "더블유게임즈는 어른들이 즐기는 카드·슬롯 같은 카지노 게임을 휴대폰 앱으로 만들어요.",
    middleSchoolExplanation: "더블유게임즈는 소셜 카지노 장르의 모바일 게임을 개발·서비스하고, 게임 안 디지털 아이템 판매로 수입을 얻어요. 매출의 대부분이 해외에서 나와요.",
    financialSummary: "2024년 연결 기준 매출은 6,241억원, 영업이익은 2,072억원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 624100, operatingProfitKrwMillion: 207200 },
    sources: [
      { title: "더블유게임즈 2024 사업보고서", url: "https://dart.fss.or.kr/dsab007/main.do?option=corp&textCrpNm=더블유게임즈", checkedAt },
    ],
    status: "draft",
  },
  {
    stockId: "KRX:263750",
    companySummary: "펄어비스는 PC·모바일·콘솔에서 즐기는 게임을 개발하고 서비스하는 회사예요.",
    businessModel: "게임 서비스와 게임 이용, 게임 안 디지털 상품·서비스에서 돈을 벌어요.",
    industryRole: "자체 게임 IP를 만들고 여러 플랫폼과 지역에 서비스하는 게임 개발·퍼블리싱 회사예요.",
    elementaryExplanation: "펄어비스는 컴퓨터와 휴대폰 등 게임기로 즐기는 게임을 만들고 운영해요.",
    middleSchoolExplanation: "펄어비스는 자체 게임 IP를 바탕으로 PC·모바일·콘솔 게임을 개발·서비스하며 게임 서비스와 게임 안 디지털 상품·서비스에서 수입을 얻어요.",
    financialSummary: "2024년 연결 기준 매출은 3,424억원, 영업손실은 1,227억원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 342400, operatingProfitKrwMillion: -122700 },
    sources: [
      { title: "Pearl Abyss 4Q24 Earnings Presentation", url: "https://www.pearlabyss.com/en-US/IR/Data/Performance", checkedAt },
      { title: "Pearl Abyss Q4 2024 and Annual Earnings Presentation", url: "https://www.pearlabyss.com/en-US/Board/Detail?_boardNo=14093", checkedAt },
    ],
    status: "reviewed",
  },
];

export function findGameEducation(stockId: string) {
  return GAME_EDUCATION.find((education) => education.stockId === stockId);
}

