export type EntertainmentRetailEducationSource = { title: string; url: string; checkedAt: string };
export type EntertainmentRetailEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; revenueKrwMillion: number; operatingProfitKrwMillion: number }; sources: readonly EntertainmentRetailEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const ENTERTAINMENT_AND_RETAIL_EDUCATION: readonly EntertainmentRetailEducation[] = [
  {
    stockId: "KRX:352820", companySummary: "하이브는 음악과 영상 콘텐츠를 기획·제작하고, 공연·상품·팬 플랫폼 서비스를 운영하는 회사예요.", businessModel: "음원·앨범·공연·상품·디지털 플랫폼 서비스를 제공하고 대가를 받아요.", industryRole: "콘텐츠 제작부터 유통·공연·팬 서비스까지 연결하는 엔터테인먼트 회사예요.",
    elementaryExplanation: "하이브는 음악과 영상을 만들고 공연과 상품, 팬들이 만나는 온라인 서비스를 운영해요.", middleSchoolExplanation: "하이브는 콘텐츠를 기획·제작하고 음원·앨범·공연·상품·디지털 플랫폼으로 팬에게 전달해요.",
    financialSummary: "2024년 연결 기준 매출은 약 2조 2,500억원, 영업이익은 1,848억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 2254500, operatingProfitKrwMillion: 184800 },
    sources: [{ title: "HYBE 2024년 실적", url: "https://hybecorp.com/eng/ir/financial-information", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:041510", companySummary: "에스엠은 음악·영상 콘텐츠를 기획·제작하고 공연과 디지털 서비스를 운영하는 회사예요.", businessModel: "음원·앨범·공연·콘텐츠와 관련 상품·서비스를 제공하고 대가를 받아요.", industryRole: "콘텐츠의 기획·제작·유통과 공연·디지털 서비스를 연결하는 엔터테인먼트 회사예요.",
    elementaryExplanation: "에스엠은 음악과 영상을 만들고 공연과 온라인 콘텐츠로 팬들을 만나요.", middleSchoolExplanation: "에스엠은 음악·영상 콘텐츠를 기획·제작하고 음원·앨범·공연·디지털 서비스로 유통해요.",
    financialSummary: "2024년 연결 기준 매출은 9,897억원, 영업이익은 873억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 989700, operatingProfitKrwMillion: 87300 },
    sources: [{ title: "SM 2024년 4분기 실적 발표", url: "https://www.smentertainment.com/ja/newsroom/sm-4%EB%B6%84%EA%B8%B0-%EC%97%B0%EA%B2%B0-%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5-339%EC%96%B5-%EC%9B%90-%EC%A0%84%EB%85%84-%EB%8F%99%EA%B8%B0-%EB%8C%80%EB%B9%84-275-6%E2%86%91/", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:035900", companySummary: "JYP Ent.는 음악·영상 콘텐츠를 기획·제작하고 공연과 디지털 서비스를 운영하는 회사예요.", businessModel: "음원·앨범·공연·콘텐츠와 관련 상품·서비스를 제공하고 대가를 받아요.", industryRole: "콘텐츠 제작과 유통, 공연·디지털 서비스를 연결하는 엔터테인먼트 회사예요.",
    elementaryExplanation: "JYP Ent.는 음악과 영상을 만들고 공연과 온라인 콘텐츠로 팬들을 만나요.", middleSchoolExplanation: "JYP Ent.는 콘텐츠를 기획·제작하고 음원·앨범·공연·디지털 서비스로 유통해요.",
    financialSummary: "2024년 연결 기준 매출은 약 5,667억원, 영업이익은 약 1,027억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 566700, operatingProfitKrwMillion: 102700 },
    sources: [{ title: "JYP Ent. 2024년 4분기 실적", url: "https://www.jype.com/Board/Detail?gubun=irdata&jbst_sq=29", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:122870", companySummary: "와이지엔터테인먼트는 음악·영상 콘텐츠를 기획·제작하고 공연·상품·디지털 서비스를 운영하는 회사예요.", businessModel: "음원·앨범·공연·콘텐츠와 관련 상품·서비스를 제공하고 대가를 받아요.", industryRole: "콘텐츠 제작·유통과 공연·상품·디지털 서비스를 연결하는 엔터테인먼트 회사예요.",
    elementaryExplanation: "와이지엔터테인먼트는 음악과 영상을 만들고 공연과 상품, 온라인 콘텐츠를 통해 팬들을 만나요.", middleSchoolExplanation: "와이지엔터테인먼트는 콘텐츠를 기획·제작하고 음원·앨범·공연·상품·디지털 서비스로 유통해요.",
    financialSummary: "2024년 연결 기준 매출은 3,649억원, 영업손실은 206억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 364949, operatingProfitKrwMillion: -20558 },
    sources: [{ title: "YG 재무정보", url: "https://ygfamily.com/en/ir/finance", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:021240", companySummary: "코웨이는 정수기·공기청정기·비데 등 생활 환경가전을 판매하고 렌털·관리 서비스를 제공하는 회사예요.", businessModel: "생활가전을 판매하거나 빌려 주고, 정기 점검·필터 교체 같은 관리 서비스를 제공해 대가를 받아요.", industryRole: "생활가전의 제조·판매와 렌털 뒤 관리 서비스를 연결하는 회사예요.",
    elementaryExplanation: "코웨이는 정수기와 공기청정기를 빌려 주고, 깨끗하게 쓸 수 있도록 관리해 줘요.", middleSchoolExplanation: "코웨이는 생활가전을 판매·렌털하고 정기 점검과 소모품 교체 같은 관리 서비스를 제공해요.",
    financialSummary: "2024년 연결 기준 매출은 4조 3,101억원, 영업이익은 7,954억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 4310100, operatingProfitKrwMillion: 795400 },
    sources: [{ title: "코웨이 2024년 연간 경영실적", url: "https://company.coway.com/newsroom/press/729", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:004170", companySummary: "신세계는 백화점과 면세점 등을 운영하며 여러 상품과 서비스를 판매하는 유통 회사예요.", businessModel: "상품을 고르고 매장·면세점·온라인 채널에서 판매해 고객에게 서비스를 제공하고 대가를 받아요.", industryRole: "브랜드와 고객을 매장·면세점·온라인 채널로 연결하는 유통 회사예요.",
    elementaryExplanation: "신세계는 백화점과 면세점에서 옷, 식품, 생활용품처럼 여러 상품을 만날 수 있게 해요.", middleSchoolExplanation: "신세계는 상품을 고르고 매장·면세점·온라인 채널로 판매하며 브랜드와 고객을 연결해요.",
    financialSummary: "2024년 연결 기준 매출은 약 6조 5,700억원, 영업이익은 약 4,795억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 6570000, operatingProfitKrwMillion: 479500 },
    sources: [{ title: "신세계 IR 자료", url: "https://www.shinsegae.com/ir/financial", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:282330", companySummary: "BGF리테일은 CU 편의점을 운영하며 식품·생활용품 등 여러 상품을 판매하는 회사예요.", businessModel: "편의점 매장을 운영하고 상품을 고른 뒤 물류·가맹점과 연결해 판매 대가를 받아요.", industryRole: "상품 공급자와 동네 매장, 고객을 연결하는 편의점 유통 회사예요.",
    elementaryExplanation: "BGF리테일은 동네 CU에서 간식과 음료, 생활용품을 살 수 있게 매장을 운영해요.", middleSchoolExplanation: "BGF리테일은 상품을 고르고 물류·가맹점과 연결해 편의점 매장에서 고객에게 판매해요.",
    financialSummary: "2024년 연결 기준 매출은 8조 6,988억원, 영업이익은 2,516억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 8698800, operatingProfitKrwMillion: 251600 },
    sources: [{ title: "BGF리테일 2024년 실적 보도", url: "https://m.dnews.co.kr/uhtml/view.jsp?idxno=202502111558170050139", checkedAt }], status: "reviewed",
  },
];
export function findEntertainmentAndRetailEducation(stockId: string) {
  return ENTERTAINMENT_AND_RETAIL_EDUCATION.find((education) => education.stockId === stockId);
}

