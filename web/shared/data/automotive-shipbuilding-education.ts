export type AutomotiveShipbuildingEducationSource = { title: string; url: string; checkedAt: string };
export type AutomotiveShipbuildingEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; revenueKrwMillion: number; operatingProfitKrwMillion: number }; sources: readonly AutomotiveShipbuildingEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const AUTOMOTIVE_AND_SHIPBUILDING_EDUCATION: readonly AutomotiveShipbuildingEducation[] = [
  {
    stockId: "KRX:000270", companySummary: "기아는 승용차·SUV·상용차 등 자동차를 설계·제조·판매하는 회사야.", businessModel: "자동차와 부품, 관련 서비스를 고객과 기업에 판매해 대가를 받아.", industryRole: "완성차를 설계·생산해 부품회사·판매점·고객을 연결하는 자동차 회사야.",
    elementaryExplanation: "기아는 사람들이 타는 승용차와 가족이 함께 타는 큰 차, 짐을 나르는 차를 만들어.", middleSchoolExplanation: "기아는 자동차를 설계·생산하고 판매·서비스망을 통해 고객에게 전달하는 완성차 회사야.",
    financialSummary: "2024년 연결 기준 매출은 107조 4,488억원, 영업이익은 12조 6,671억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 107448800, operatingProfitKrwMillion: 12667100 },
    sources: [{ title: "기아 2024년 경영실적", url: "https://www.hyundaimotorgroup.com/ko/amp/CONT0000000000167224", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:005380", companySummary: "현대차는 승용차·SUV·상용차 등 자동차를 설계·제조·판매하는 회사야.", businessModel: "자동차와 부품, 관련 서비스를 고객과 기업에 판매해 대가를 받아.", industryRole: "완성차를 설계·생산해 부품회사·판매점·고객을 연결하는 자동차 회사야.",
    elementaryExplanation: "현대차는 사람들이 타는 승용차와 가족이 함께 타는 큰 차, 짐을 나르는 차를 만들어.", middleSchoolExplanation: "현대차는 자동차를 설계·생산하고 판매·서비스망을 통해 고객에게 전달하는 완성차 회사야.",
    financialSummary: "2024년 연결 기준 매출은 175조 2,312억원, 영업이익은 14조 2,396억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 175231200, operatingProfitKrwMillion: 14239600 },
    sources: [{ title: "현대차 2024년 4분기 및 연간 실적", url: "https://www.newswire.co.kr/newsRead.php?no=1004885", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:089860", companySummary: "롯데렌탈은 자동차와 생활·사업 장비를 빌려 주고 관리·중고차 유통 서비스를 제공하는 회사야.", businessModel: "차량과 장비를 일정 기간 빌려 주고 관리하며, 중고차 유통 서비스로 대가를 받아.", industryRole: "자동차 제조사가 만든 차량을 이용자와 기업이 필요할 때 이용하도록 연결하는 렌털 회사야.",
    elementaryExplanation: "롯데렌탈은 차를 사지 않아도 필요한 기간 동안 빌려 탈 수 있게 하고 관리도 도와줘.", middleSchoolExplanation: "롯데렌탈은 장기·단기 차량 대여와 장비 렌털, 중고차 유통을 통해 이용자와 차량·장비를 연결해.",
    financialSummary: "2024년 연결 기준 영업수익은 2조 7,924억원, 영업이익은 2,848억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 2792400, operatingProfitKrwMillion: 284800 },
    sources: [{ title: "롯데렌탈 2024년 재무정보", url: "https://m.lotterental.com/ir/financeInfo.do?lang=ko", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:012330", companySummary: "현대모비스는 자동차에 들어가는 핵심 부품을 만들고 정비용 부품을 공급하는 회사야.", businessModel: "자동차 부품을 완성차 회사에 공급하고, 정비용 부품과 서비스를 판매해 대가를 받아.", industryRole: "완성차 회사와 부품회사, 정비망을 연결하는 자동차 부품 회사야.",
    elementaryExplanation: "현대모비스는 자동차가 달리고 멈추고 전기를 쓰도록 돕는 여러 부품을 만들어.", middleSchoolExplanation: "현대모비스는 전동화·제동·조향 같은 자동차 핵심 부품을 만들고 정비용 부품도 공급해.",
    financialSummary: "2024년 연결 기준 매출은 57조 2,370억원, 영업이익은 약 3조 1,000억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 57237000, operatingProfitKrwMillion: 3100000 },
    sources: [{ title: "현대모비스 2024년 경영실적", url: "https://www.hyundai-mobis.com/kr/ir/financial-information", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:329180", companySummary: "HD현대중공업은 큰 배와 해양 설비를 설계·건조하고 엔진·기계를 만드는 회사야.", businessModel: "선박·해양 설비·엔진을 설계·제조해 선주와 기업에 공급하고 정비 서비스를 제공해 대가를 받아.", industryRole: "배를 설계하고 건조하는 조선소로서 부품회사·선주·운항회사를 연결하는 회사야.",
    elementaryExplanation: "HD현대중공업은 바다를 다니는 아주 큰 배를 설계하고 만들어.", middleSchoolExplanation: "HD현대중공업은 선박과 해양 설비를 설계·건조하고 선박용 엔진·기계도 만드는 조선 회사야.",
    financialSummary: "2024년 연결 기준 매출은 14조 4,865억원, 영업이익은 7,052억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 14486500, operatingProfitKrwMillion: 705200 },
    sources: [{ title: "HD현대중공업 2024년 실적", url: "https://www.hd.com/kr/newsroom/media-hub/press/view?detailsKey=3428", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:009540", companySummary: "HD한국조선해양은 조선·해양 사업 회사들을 거느리고 선박과 해양 설비 사업을 관리하는 회사야.", businessModel: "자회사들이 선박·해양 설비·엔진을 설계·제조해 얻는 성과를 연결해 보여 줘.", industryRole: "여러 조선소와 해양 사업 회사를 연결해 선박·해양 설비의 설계·건조 사업을 관리하는 회사야.",
    elementaryExplanation: "HD한국조선해양은 큰 배를 만드는 여러 회사가 함께 일하도록 연결하고 관리해.", middleSchoolExplanation: "HD한국조선해양은 조선·해양 사업 자회사를 통해 선박·해양 설비·엔진 사업을 연결하는 중간 지주회사야.",
    financialSummary: "2024년 연결 기준 매출은 25조 5,386억원, 영업이익은 1조 4,341억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 25538600, operatingProfitKrwMillion: 1434100 },
    sources: [{ title: "HD한국조선해양 2024년 실적", url: "https://www.hd.com/kr/newsroom/media-hub/press/view?detailsKey=3428", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:042660", companySummary: "한화오션은 큰 배와 해양 설비를 설계·건조하고 관련 서비스를 제공하는 회사야.", businessModel: "선박과 해양 설비를 설계·제조해 선주와 기업에 공급하고 정비 서비스를 제공해 대가를 받아.", industryRole: "배를 설계하고 건조하는 조선소로서 부품회사·선주·운항회사를 연결하는 회사야.",
    elementaryExplanation: "한화오션은 바다를 다니는 큰 배를 설계하고 만들며, 배를 오래 쓸 수 있도록 돕는 일을 해.", middleSchoolExplanation: "한화오션은 선박과 해양 설비를 설계·건조하고 관련 정비·서비스를 제공하는 조선 회사야.",
    financialSummary: "2024년 연결 기준 매출은 10조 7,760억원, 영업이익은 2,379억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 10776000, operatingProfitKrwMillion: 237900 },
    sources: [{ title: "한화오션 2024년 영업실적", url: "https://www.maritimepress.co.kr/news/articleView.html?idxno=324329", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:010140", companySummary: "삼성중공업은 큰 배와 해양 설비를 설계·건조하는 회사야.", businessModel: "선박과 해양 설비를 설계·제조해 선주와 기업에 공급하고 관련 서비스를 제공해 대가를 받아.", industryRole: "배를 설계하고 건조하는 조선소로서 부품회사·선주·운항회사를 연결하는 회사야.",
    elementaryExplanation: "삼성중공업은 바다를 다니는 아주 큰 배를 설계하고 만들어.", middleSchoolExplanation: "삼성중공업은 선박과 해양 설비를 설계·건조하고 관련 서비스를 제공하는 조선 회사야.",
    financialSummary: "2024년 연결 기준 매출은 9조 9,031억원, 영업이익은 5,027억원이야.", financialSnapshot: { period: "2024", revenueKrwMillion: 9903100, operatingProfitKrwMillion: 502700 },
    sources: [{ title: "삼성중공업 2024년 연간 실적", url: "https://www.inthenews.co.kr/news/article.html?no=69074", checkedAt }], status: "reviewed",
  },
];
export function findAutomotiveAndShipbuildingEducation(stockId: string) {
  return AUTOMOTIVE_AND_SHIPBUILDING_EDUCATION.find((education) => education.stockId === stockId);
}

