export type DefenseEducationSource = { title: string; url: string; checkedAt: string };
export type DefenseEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; revenueKrwMillion: number; operatingProfitKrwMillion: number }; sources: readonly DefenseEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const DEFENSE_EDUCATION: readonly DefenseEducation[] = [
  {
    stockId: "KRX:064350", companySummary: "현대로템은 철도차량과 국방용 지상 장비, 플랜트 설비를 만드는 회사예요.", businessModel: "철도차량과 국방용 지상 장비를 설계·제조하고, 납품 뒤 정비 서비스를 제공해 대가를 받아요.", industryRole: "국방 분야에서는 지상 장비의 개발·제조·정비를 맡고, 철도 분야에서도 차량을 만드는 회사예요.",
    elementaryExplanation: "현대로템은 기차를 만들고, 나라를 지키는 데 쓰이는 큰 지상 장비도 만들고 고쳐요.", middleSchoolExplanation: "현대로템은 철도차량과 국방용 지상 장비를 설계·생산하며, 장비를 오래 쓸 수 있도록 정비도 맡아요.",
    financialSummary: "2024년 연결 기준 매출은 4조 3,766억원, 영업이익은 4,566억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 4376600, operatingProfitKrwMillion: 456600 },
    sources: [{ title: "현대로템 재무 요약정보", url: "https://www.hyundai-rotem.co.kr/ko/invest/finance/summary/content.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:012450", companySummary: "한화에어로스페이스는 국방·항공 장비와 항공기 엔진 부품을 개발·제조하는 회사예요.", businessModel: "국방과 항공 분야의 장비·부품을 개발하고 제조해 정부와 기업 고객에게 공급해요.", industryRole: "지상·항공 분야의 국방 장비와 항공 엔진·부품을 만드는 항공우주·방산 회사예요.",
    elementaryExplanation: "한화에어로스페이스는 하늘을 나는 기계와 나라를 지키는 데 쓰이는 장비의 부품을 만들고 고쳐요.", middleSchoolExplanation: "한화에어로스페이스는 국방 장비와 항공 엔진·부품을 개발·제조하며, 항공우주와 방산 분야의 공급망을 이루는 회사예요.",
    financialSummary: "2024년 연결 기준 매출은 11조 2,462억원, 영업이익은 1조 7,247억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 11246200, operatingProfitKrwMillion: 1724700 },
    sources: [{ title: "한화에어로스페이스 2024년 실적 발표", url: "https://m.hanwhaaerospace.com/kor/ir/financial-info/finance02.do", checkedAt }], status: "reviewed",
  },
  {
    // 회사 이름 표기는 화면과 같은 "LIG D&A"로 맞춘다. 아래 출처 제목은 실제 문서 이름이라 옛 이름 그대로 둔다.
    stockId: "KRX:079550", companySummary: "LIG D&A는 국방·항공·전자 분야의 시스템과 장비를 개발·제조하는 회사예요.", businessModel: "국방과 항공 분야에 필요한 전자·통신·감시 장비와 시스템을 개발하고 공급해 대가를 받아요.", industryRole: "여러 장비가 함께 작동하도록 돕는 국방 전자·통신 시스템을 개발·제조하는 회사예요.",
    elementaryExplanation: "LIG D&A는 나라를 지키는 데 쓰이는 여러 전자 장비가 함께 잘 움직이도록 만드는 일을 해요.", middleSchoolExplanation: "LIG D&A는 통신·감시·전자 기술을 바탕으로 국방과 항공 분야의 시스템을 개발하고 제조해요.",
    financialSummary: "2024년 연결 기준 매출은 3조 2,773억원, 영업이익은 2,309억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 3277300, operatingProfitKrwMillion: 230900 },
    sources: [{ title: "2024년 LIG넥스원 영업보고서", url: "https://www.lignex1.co.kr/ir/salesReportView.do?bbs_no=7082", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:047810", companySummary: "한국항공우주는 항공기·헬리콥터·위성·우주 발사체 관련 장비를 개발·제조하는 회사예요.", businessModel: "항공기와 부품, 위성·우주 장비를 설계·제조하고 정비 서비스를 제공해 대가를 받아요.", industryRole: "항공기 개발부터 생산·정비, 우주 발사체와 위성 분야까지 연결하는 항공우주 시스템 회사예요.",
    elementaryExplanation: "한국항공우주는 비행기와 헬리콥터를 만들고, 우주로 가는 장비와 위성 관련 일을 해요.", middleSchoolExplanation: "한국항공우주는 항공기·헬리콥터·항공 부품을 개발하고 만들며, 정비와 위성·우주 장비 사업도 수행해요.",
    financialSummary: "2024년 연결 기준 매출은 3조 6,337억원, 영업이익은 2,407억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 3633700, operatingProfitKrwMillion: 240700 },
    sources: [{ title: "KAI 2024 지속가능경영보고서", url: "https://www.koreaaero.com/EN/data_file/2024_KAI_Sustainability_Report.pdf", checkedAt }], status: "reviewed",
  },
];
export function findDefenseEducation(stockId: string) {
  return DEFENSE_EDUCATION.find((education) => education.stockId === stockId);
}

