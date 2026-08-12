export type SectorEducationSource = { title: string; url: string; checkedAt: string };
export type SectorEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; revenueKrwMillion: number; operatingProfitKrwMillion: number }; sources: readonly SectorEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const LOGISTICS_AND_SEMICONDUCTOR_EDUCATION: readonly SectorEducation[] = [
  {
    stockId: "KRX:000120", companySummary: "CJ대한통운은 물건을 가게와 집까지 옮기는 택배·물류 회사예요.", businessModel: "상품을 보관하고 분류하고 운송하는 서비스를 제공하고 대가를 받아요.", industryRole: "생산된 물건이 창고와 가게, 집으로 이동하도록 연결하는 종합 물류 회사예요.",
    elementaryExplanation: "CJ대한통운은 온라인에서 산 물건이 우리 집에 오도록 상자와 물건을 옮겨 줘요.", middleSchoolExplanation: "CJ대한통운은 택배뿐 아니라 창고 운영, 국내외 운송을 맡아 생산자와 판매자, 소비자를 연결해요.",
    financialSummary: "2024년 연결 기준 매출은 12조 1,168억원, 영업이익은 5,307억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 12116800, operatingProfitKrwMillion: 530700 },
    sources: [{ title: "CJ대한통운 2024년 실적 발표", url: "https://www.cjlogistics.com/ko/newsroom/news/NR_00001222", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:011200", companySummary: "HMM은 큰 컨테이너선으로 나라와 나라 사이의 물건을 나르는 해운 회사예요.", businessModel: "화주가 맡긴 컨테이너를 바닷길로 운송하고 운임을 받아요.", industryRole: "수출입 물건이 바다를 건너도록 선박과 항로를 운영하는 해상 물류 회사예요.",
    elementaryExplanation: "HMM은 아주 큰 배에 컨테이너를 싣고 다른 나라까지 물건을 옮겨 줘요.", middleSchoolExplanation: "HMM은 정해진 항로에서 컨테이너 화물을 운송하며, 우리나라와 다른 나라의 수출입을 잇는 해운 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 11조 7,002억원, 영업이익은 3조 5,128억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 11700224, operatingProfitKrwMillion: 3512847 },
    sources: [{ title: "HMM 2024년 연간 실적", url: "https://www.hmm21.com/company/newsDetail.do?cateCd=C001002000000&page=1&seq=3003102", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:086280", companySummary: "현대글로비스는 자동차와 여러 상품의 운송·보관·유통을 맡는 물류 회사예요.", businessModel: "차량과 화물을 운송하고 창고와 유통 서비스를 제공해 대가를 받아요.", industryRole: "자동차가 만들어진 뒤 판매되는 곳까지 이동하도록 돕고, 다양한 화물의 물류도 맡는 회사예요.",
    elementaryExplanation: "현대글로비스는 새 자동차와 여러 물건이 필요한 곳에 가도록 옮기고 보관해요.", middleSchoolExplanation: "현대글로비스는 완성차 운송과 부품 물류, 해상 운송, 중고차 유통처럼 물건의 이동과 유통을 연결해요.",
    financialSummary: "2024년 연결 기준 매출은 28조 4,074억원, 영업이익은 1조 7,529억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 28407374, operatingProfitKrwMillion: 1752867 },
    sources: [{ title: "Hyundai Glovis 2024 consolidated financial statements", url: "https://ir.glovis.net/upload/files/2025/06/6756d7a0-b5c2-48d7-a89d-66c9204108cb.pdf", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:005930", companySummary: "삼성전자는 메모리 칩과 시스템 반도체, 스마트폰, TV, 가전을 만드는 전자 회사예요.", businessModel: "반도체 부품과 전자제품을 기업과 소비자에게 판매해 돈을 벌어요.", industryRole: "전자기기에 들어가는 메모리·시스템 반도체를 만들고, 그 칩을 쓰는 완성 전자제품도 만드는 회사예요.",
    elementaryExplanation: "삼성전자는 휴대폰과 TV를 만들고, 그 안에서 일을 하는 아주 작은 전자 칩도 만들어요.", middleSchoolExplanation: "삼성전자는 메모리와 시스템 반도체를 생산하고, 스마트폰·TV·가전처럼 그 부품을 쓰는 전자제품도 개발·판매해요.",
    financialSummary: "2024년 연결 기준 매출은 300조 9,000억원, 영업이익은 32조 7,000억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 300900000, operatingProfitKrwMillion: 32700000 },
    sources: [{ title: "삼성전자 2024년 4분기 및 연간 실적", url: "https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-2024%EB%85%84-4%EB%B6%84%EA%B8%B0-%EC%8B%A4%EC%A0%81-%EB%B0%9C%ED%91%9C", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:000660", companySummary: "SK하이닉스는 컴퓨터와 휴대폰, 서버에 들어가는 메모리 반도체를 만드는 회사예요.", businessModel: "메모리 칩을 전자기기와 서버를 만드는 기업에 판매해 돈을 벌어요.", industryRole: "데이터를 잠시 기억하거나 오래 저장하는 D램·낸드와 고대역폭 메모리를 만드는 반도체 회사예요.",
    elementaryExplanation: "SK하이닉스는 컴퓨터와 휴대폰이 사진과 정보를 기억하도록 돕는 작은 칩을 만들어요.", middleSchoolExplanation: "SK하이닉스는 D램·낸드·HBM 같은 메모리 반도체를 만들어 컴퓨터, 스마트폰, 데이터센터에 공급해요.",
    financialSummary: "2024년 연결 기준 매출은 66조 1,930억원, 영업이익은 23조 4,673억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 66193000, operatingProfitKrwMillion: 23467300 },
    sources: [{ title: "SK하이닉스 2024년 경영실적", url: "https://news.skhynix.co.kr/business-results-2024/", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:066570", companySummary: "LG전자는 가전·TV·노트북·자동차부품 등 전자제품을 만드는 회사예요.", businessModel: "생활가전과 TV, 자동차부품 등 전자제품과 관련 서비스를 판매해 돈을 벌어요.", industryRole: "반도체를 부품으로 사용하는 완성 전자제품과 자동차 전자부품을 개발·제조하는 전자 회사예요.",
    elementaryExplanation: "LG전자는 냉장고와 세탁기, TV처럼 집에서 쓰는 전자제품을 만들어요.", middleSchoolExplanation: "LG전자는 생활가전·TV·IT기기·자동차 전자부품을 만들며, 반도체는 이런 전자제품 안에서 작동을 돕는 부품이에요.",
    financialSummary: "2024년 연결 기준 매출은 87조 7,282억원, 영업이익은 3조 4,197억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 87728200, operatingProfitKrwMillion: 3419700 },
    sources: [{ title: "LG전자 2024년 확정 실적", url: "https://www.lge.co.kr/story/newsroom/229269", checkedAt }], status: "reviewed",
  },
];
export function findLogisticsAndSemiconductorEducation(stockId: string) {
  return LOGISTICS_AND_SEMICONDUCTOR_EDUCATION.find((education) => education.stockId === stockId);
}

