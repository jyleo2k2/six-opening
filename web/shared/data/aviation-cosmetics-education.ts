export type AviationCosmeticsEducationSource = {
  title: string;
  url: string;
  checkedAt: string;
};

export type AviationCosmeticsEducation = {
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
  sources: readonly AviationCosmeticsEducationSource[];
  status: "reviewed";
};

const checkedAt = "2026-08-12";

export const AVIATION_AND_COSMETICS_EDUCATION: readonly AviationCosmeticsEducation[] = [
  {
    stockId: "KRX:003490",
    companySummary: "대한항공은 사람과 화물을 비행기로 국내외에 옮기는 항공운송 회사예요.",
    businessModel: "여객 항공권, 화물 운송, 항공기 정비와 관련 서비스의 대가를 받아요.",
    industryRole: "공항, 항공기, 승무원, 정비 인력, 여행객과 물건을 연결해 하늘길이 움직이도록 하는 역할을 해요.",
    elementaryExplanation: "대한항공은 사람들이 멀리 갈 때 타는 비행기와 물건을 실어 나르는 비행기를 운영해요.",
    middleSchoolExplanation: "대한항공은 여객과 화물을 운송하고, 항공기 정비와 공항 서비스가 함께 맞물리도록 운영하는 항공운송 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 16조 1,166억 원, 영업이익은 1조 9,446억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 16116600, operatingProfitKrwMillion: 1944600 },
    sources: [
      { title: "대한항공 2024년 연간 잠정실적", url: "https://news.koreanair.com/%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-2024%EB%85%84-4%EB%B6%84%EA%B8%B0-%EB%B0%8F-2024%EB%85%84-%EC%97%B0%EA%B0%84-%EC%9E%A0%EC%A0%95%EC%8B%A4%EC%A0%81-%EB%B0%9C%ED%91%9C/", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:020560",
    companySummary: "아시아나항공은 사람과 화물을 비행기로 옮기고 여행과 연결된 서비스를 제공하는 항공사예요.",
    businessModel: "여객 항공권, 항공화물 운송, 항공·여행 관련 서비스의 대가를 받아요.",
    industryRole: "여객과 화물을 목적지까지 안전하게 연결하며 공항, 정비, 승무, 운항이 함께 일하도록 해요.",
    elementaryExplanation: "아시아나항공은 여행하는 사람과 상자에 담긴 물건을 비행기로 다른 곳에 데려가요.",
    middleSchoolExplanation: "아시아나항공은 여객과 화물 운송을 중심으로 운항, 정비, 공항 서비스가 함께 돌아가게 하는 항공사예요.",
    financialSummary: "2024년 별도 기준 매출은 7조 592억 원, 영업이익은 622억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 7059200, operatingProfitKrwMillion: 62200 },
    sources: [
      { title: "아시아나항공 회사 개요", url: "https://flyasiana.com/C/PH/EN/contents/overview", checkedAt },
      { title: "아시아나항공 2024년 잠정실적 공시 보도", url: "https://www.cargopress.co.kr/korean/news_view.php?nd=5486", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:180640",
    companySummary: "한진칼은 한진그룹의 지주회사로, 관계 회사의 지분을 보유하고 경영을 지원하는 회사예요.",
    businessModel: "관계 회사 지분에서 생기는 배당과 자체 사업에서 나오는 수익으로 운영돼요.",
    industryRole: "항공·관광·호텔 등 여러 관계 회사가 각자의 일을 잘할 수 있도록 묶고 지원하는 역할을 해요.",
    elementaryExplanation: "한진칼은 비행기를 직접 띄우는 회사라기보다, 여러 회사가 함께 일하도록 돕는 큰 우산 같은 회사예요.",
    middleSchoolExplanation: "한진칼은 관계 회사의 지분을 보유하고 경영을 지원하는 지주회사이며, 항공·관광·호텔 관련 사업들과 연결돼 있어요.",
    financialSummary: "2024년 한진칼 별도 기준 영업수익은 1,356억 원, 영업이익은 1,111억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 135574, operatingProfitKrwMillion: 111076 },
    sources: [
      { title: "한진칼 회사 분할 및 지주회사 설명", url: "https://hp-api.hanjinkal.co.kr/boardAttachment/file/202507/18/705e779d-7ae1-42c8-bd3f-7cb8c3a2867f.pdf/%ED%95%9C%EC%A7%84%EC%B9%BC_%EC%A3%BC%EC%A3%BC%EC%B4%9D%ED%9A%8C%EC%86%8C%EC%A7%91%EA%B3%B5%EA%B3%A0_2023.02.21.pdf", checkedAt },
      { title: "한진칼 2024년 별도 재무제표", url: "https://hp-api.hanjinkal.co.kr/boardAttachment/file/202602/25/97256469-cdae-45fd-abb9-76b237f79726.pdf/%5B%ED%95%9C%EC%A7%84%EC%B9%BC%5D%EC%A3%BC%EC%A3%BC%EC%B4%9D%ED%9A%8C%EC%86%8C%EC%A7%91%EA%B3%B5%EA%B3%A0%282026.02.25%29.pdf", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:278470",
    companySummary: "에이피알은 화장품과 뷰티 디바이스를 기획·판매하는 뷰티테크 회사예요.",
    businessModel: "자체 브랜드의 화장품과 뷰티 디바이스를 온라인·오프라인 채널에서 판매해 대가를 받아요.",
    industryRole: "제품 기획, 연구개발, 제조 협력, 유통과 고객 서비스를 이어 화장품·뷰티 제품이 소비자에게 닿게 해요.",
    elementaryExplanation: "에이피알은 피부를 돌보는 화장품과 집에서 쓰는 뷰티 기기를 만들어 판매해요.",
    middleSchoolExplanation: "에이피알은 화장품과 뷰티 디바이스 브랜드를 운영하며, 제품 기획부터 유통과 고객 지원까지 연결하는 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 7,228억 원, 영업이익은 1,227억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 722800, operatingProfitKrwMillion: 122700 },
    sources: [
      { title: "에이피알 2024년 4분기 IR 자료", url: "https://www.apr-in.com/en/ir.php?year=2024", checkedAt },
      { title: "에이피알 2024년 잠정실적 공시 보도", url: "https://www.mk.co.kr/news/business/11237358", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:090430",
    companySummary: "아모레퍼시픽은 화장품과 생활용품을 만들고 판매하는 회사예요.",
    businessModel: "여러 브랜드의 화장품과 생활용품을 국내외 매장과 온라인 채널에서 판매해 대가를 받아요.",
    industryRole: "연구, 제품 기획, 제조, 브랜드 운영, 유통을 연결해 화장품과 생활용품이 소비자에게 닿게 해요.",
    elementaryExplanation: "아모레퍼시픽은 세안·화장·생활에 쓰는 여러 제품을 만들고 사람들에게 소개해요.",
    middleSchoolExplanation: "아모레퍼시픽은 화장품과 생활용품을 연구·제조·판매하며, 브랜드와 국내외 유통 채널을 함께 운영하는 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 3조 8,851억 원, 영업이익은 2,205억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 3885100, operatingProfitKrwMillion: 220500 },
    sources: [
      { title: "아모레퍼시픽 요약 재무제표", url: "https://prd-ko-int.apgroup.com/int/ko/investors/amorepacific-corporation/financial-information/summary-financial-statements/summary-financial-statements.html", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:483650",
    companySummary: "달바글로벌은 d'Alba 브랜드를 중심으로 화장품을 기획하고 판매하는 회사예요.",
    businessModel: "브랜드 화장품을 기획하고 제조 협력·국내외 유통을 거쳐 판매해 대가를 받아요.",
    industryRole: "제품 기획, 제조 협력, 브랜드 운영, 온라인·오프라인 유통을 이어 화장품이 소비자에게 닿게 해요.",
    elementaryExplanation: "달바글로벌은 d'Alba라는 이름의 화장품을 기획하고 여러 나라의 사람들에게 판매해요.",
    middleSchoolExplanation: "달바글로벌은 화장품 브랜드를 운영하며 제품 기획, 제조 협력, 국내외 유통을 연결하는 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 3,091억 원, 영업이익은 598억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 309100, operatingProfitKrwMillion: 59800 },
    sources: [
      { title: "달바글로벌 2024년 사업보고서", url: "https://www.dalbaglobal.com/main/ir_material_detail.php?b_idx=1&cd=&page=2", checkedAt },
      { title: "달바글로벌 IR 자료", url: "https://dalbaglobal.com/_upload_files/20250530163546_Op.pdf", checkedAt },
    ],
    status: "reviewed",
  },
  {
    stockId: "KRX:051900",
    companySummary: "LG생활건강은 화장품, 생활용품, 음료를 만들고 판매하는 회사예요.",
    businessModel: "뷰티·생활용품·음료 브랜드 제품을 여러 유통 채널에서 판매해 대가를 받아요.",
    industryRole: "제품 기획과 제조, 브랜드 운영, 매장·온라인 유통을 연결해 생활 속 제품이 소비자에게 닿게 해요.",
    elementaryExplanation: "LG생활건강은 화장품, 샴푸 같은 생활용품, 음료처럼 우리 생활에서 만나는 제품을 만들어요.",
    middleSchoolExplanation: "LG생활건강은 뷰티·생활용품·음료 사업을 함께 운영하며, 제품 제조와 브랜드·유통을 연결하는 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 6조 8,119억 원, 영업이익은 4,590억 원이에요.",
    financialSnapshot: { period: "2024", revenueKrwMillion: 6811900, operatingProfitKrwMillion: 459000 },
    sources: [
      { title: "LG생활건강 2024년 연간 실적", url: "https://www.newswire.co.kr/newsRead.php?no=1005237&picno=566656", checkedAt },
    ],
    status: "reviewed",
  },
];

export function findAviationAndCosmeticsEducation(stockId: string) {
  return AVIATION_AND_COSMETICS_EDUCATION.find((education) => education.stockId === stockId);
}
